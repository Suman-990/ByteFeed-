package ws

import (
	"bytefeed-backend/config"
	"bytefeed-backend/models"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/golang-jwt/jwt/v5"
	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin:     func(r *http.Request) bool { return true },
}

func parseTokenFromRequest(r *http.Request) (userId uint, ok bool) {
	tokenStr := r.URL.Query().Get("token")
	if tokenStr == "" {
		header := r.Header.Get("Authorization")
		parts := strings.SplitN(header, " ", 2)
		if len(parts) == 2 && strings.EqualFold(parts[0], "bearer") {
			tokenStr = parts[1]
		}
	}
	if tokenStr == "" {
		return 0, false
	}
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "vro-i-swear-i-didnt-vibe-code-dev-only"
	}
	token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrSignatureInvalid
		}
		return []byte(secret), nil
	})

	if err != nil || !token.Valid {
		return 0, false
	}
	claims, ok := token.Claims.(jwt.MapClaims)

	if !ok {
		return 0, false
	}
	idFloat, ok := claims["user_id"].(float64)

	if !ok {
		return 0, false
	}
	return uint(idFloat), true
}

func HandleChannelWS(w http.ResponseWriter, r *http.Request) {
	userID, ok := parseTokenFromRequest(r)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	channelID := mux.Vars(r)["id"]

	var channel models.Channel

	if err := config.DB.First(&channel, channelID).Error; err != nil {
		http.Error(w, "Channel doesnt exists", http.StatusNotFound)
		return
	}
	if channel.IsVoice {
		http.Error(w, "cannot connect a voice channel via text socket", http.StatusBadRequest)
		return
	}
	var member models.CommunityMember
	if err := config.DB.Where("community_id = ? AND user_id = ?", channel.CommunityID, userID).
		First(&member).Error; err != nil {
		http.Error(w, "Join community to access this channel", http.StatusUnauthorized)
		return
	}
	var user models.User
	config.DB.First(&user, userID)

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("ws: upgrade error for channel %s: %v", channelID, err)
		return
	}
	roomID := ChannelRoomID(channel.ID)
	room := GlobalHub.GetOrCreateRoom(roomID)

	client := newClient(conn, user.ID, user.Username, user.PfpUrl, room)
	room.register <- client

	client.sendJSON(OutboundMessage{
		Type: "connected",
		Data: ConnectedPayload{
			RoomID:  roomID,
			Message: "Connected to #" + channel.Name,
		},
	})

	log.Printf("ws: user %d (%s) connected to channel room %s", userID, user.Username, roomID)
}

func HandleDMWS(w http.ResponseWriter, r *http.Request) {
	callerID, ok := parseTokenFromRequest(r)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	targetParam := mux.Vars(r)["userId"]
	var targetUser models.User
	if err := config.DB.First(&targetUser, targetParam).Error; err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}
	if targetUser.ID == callerID {
		http.Error(w, "Cannot open a dm with yourself", http.StatusBadRequest)
		return
	}

	var friendship models.Friendship
	if err := config.DB.Where("user_id = ? AND friend_id = ?", callerID, targetUser.ID).
		First(&friendship).Error; err != nil {
		http.Error(w, "You must be friends to open a DM", http.StatusForbidden)
		return
	}
	var caller models.User
	config.DB.First(&caller, callerID)

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("ws: upgrade error for DM %d<->%d: %v", callerID, targetUser.ID, err)
		return
	}

	roomID := DMRoomID(callerID, targetUser.ID)
	room := GlobalHub.GetOrCreateRoom(roomID)

	client := newClient(conn, caller.ID, caller.Username, caller.PfpUrl, room)
	room.register <- client

	client.sendJSON(OutboundMessage{
		Type: "connected",
		Data: ConnectedPayload{
			RoomID:  roomID,
			Message: "Connected to DM with @" + targetUser.Username,
		},
	})
	log.Printf("ws: user %d (%s) connected to DM room %s", callerID, caller.Username, roomID)

}
