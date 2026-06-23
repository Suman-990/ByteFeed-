package ws

import (
	"bytefeed-backend/config"
	"bytefeed-backend/models"
	"encoding/json"
	"log"
	"time"
)

type roomInbound struct {
	client *Client
	data   []byte
}

type Room struct {
	ID         string
	clients    map[*Client]bool
	register   chan *Client
	unregister chan *Client
	inbound    chan roomInbound
	done       chan struct{}
}

func newRoom(id string) *Room {
	return &Room{
		ID:         id,
		clients:    make(map[*Client]bool),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		inbound:    make(chan roomInbound, 256),
		done:       make(chan struct{}),
	}
}

func (r *Room) run() {
	defer close(r.done)
	for {
		select {
		case c := <-r.register:
			r.clients[c] = true
			log.Printf("ws: user %d joined room %s (%d total)", c.UserID, r.ID, len(r.clients))

		case c := <-r.unregister:
			if _, ok := r.clients[c]; ok {
				delete(r.clients, c)
				close(c.send)
				log.Printf("ws: user %d left room %s (%d remaining)", c.UserID, r.ID, len(r.clients))
			}
			if len(r.clients) == 0 {
				GlobalHub.removeRoom(r.ID)
				return
			}

		case msg := <-r.inbound:
			r.handleInbound(msg)
		}
	}
}
func (r *Room) handleInbound(msg roomInbound) {
	var in InboundMessage
	if err := json.Unmarshal(msg.data, &in); err != nil {
		msg.client.sendJSON(OutboundMessage{
			Type: "error",
			Data: ErrorPayload{Message: "Invalid msg format"},
		})
		return
	}

	switch in.Type {

	case "message":
		if in.Content == "" && in.MediaUrl == "" {
			msg.client.sendJSON(OutboundMessage{
				Type: "error",
				Data: ErrorPayload{Message: "Message must have content or media"},
			})
			return
		}
		r.persistAndBroadcast(msg.client, in)

	case "typing":
		r.broadcastToOthers(msg.client, OutboundMessage{
			Type: "typing",
			Data: TypingPayload{
				UserID:   msg.client.UserID,
				Username: msg.client.Username,
				RoomID:   r.ID,
			},
		})

	case "stop_typing":
		r.broadcastToOthers(msg.client, OutboundMessage{
			Type: "stop_typing",
			Data: TypingPayload{
				UserID:   msg.client.UserID,
				Username: msg.client.Username,
				RoomID:   r.ID,
			},
		})

	default:
		msg.client.sendJSON(OutboundMessage{
			Type: "error",
			Data: ErrorPayload{Message: "Unknown message type: " + in.Type},
		})
	}

}
func (r *Room) persistAndBroadcast(sender *Client, in InboundMessage) {
	m := models.Message{
		SenderID: sender.UserID,
		Content:  in.Content,
		MediaUrl: in.MediaUrl,
	}

	if channelID, _ := parseRoomID(r.ID); channelID != 0 {
		m.ChannelID = uint2ptr(channelID)
	} else if a, b, ok := ParseDMUserIDs(r.ID); ok {
		if a == sender.UserID {
			m.ReceiverID = uint2ptr(b)
		} else {
			m.ReceiverID = uint2ptr(a)
		}
	}

	if err := config.DB.Create(&m).Error; err != nil {
		log.Printf("ws: failed to persist message in room %s: %v", r.ID, err)
		sender.sendJSON(OutboundMessage{
			Type: "error",
			Data: ErrorPayload{Message: "Failed to save message"},
		})
		return
	}

	payload := OutboundMessage{
		Type: "message",
		Data: MessagePayload{
			ID:         m.ID,
			SenderID:   sender.UserID,
			SenderName: sender.Username,
			SenderPfp:  sender.PfpUrl,
			Content:    m.Content,
			MediaUrl:   m.MediaUrl,
			RoomID:     r.ID,
			IsEdited:   false,
			CreatedAt:  m.CreatedAt.Format(time.RFC3339),
		},
	}
	r.broadcastToAll(payload)
}

func (r *Room) broadcastToAll(v any) {
	b, err := json.Marshal(v)
	if err != nil {
		return
	}
	for c := range r.clients {
		select {
		case c.send <- b:
		default:
			close(c.send)
			delete(r.clients, c)
		}
	}
}

func (r *Room) broadcastToOthers(sender *Client, v any) {
	b, err := json.Marshal(v)
	if err != nil {
		return
	}
	for c := range r.clients {
		if c == sender {
			continue
		}
		select {
		case c.send <- b:
		default:
			close(c.send)
			delete(r.clients, c)
		}
	}
}

func uint2ptr(v uint) *uint { return &v }
