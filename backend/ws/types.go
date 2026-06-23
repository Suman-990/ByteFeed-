package ws

type InboundMessage struct {
	Type     string `json:"type"`
	Content  string `json:"content"`
	MediaUrl string `json:"mediaUrl"`
}
type OutboundMessage struct {
	Type string `json:"type"`
	Data any    `json:"data"`
}

type MessagePayload struct {
	ID         uint   `json:"id"`
	SenderID   uint   `json:"senderId"`
	SenderName string `json:"senderName"`
	SenderPfp  string `json:"senderPfp"`
	Content    string `json:"content"`
	MediaUrl   string `json:"mediaUrl"`
	RoomID     string `json:"roomId"`
	IsEdited   bool   `json:"isEdited"`
	CreatedAt  string `json:"createdAt"`
}

type TypingPayload struct {
	UserID   uint   `json:"userId"`
	Username string `json:"username"`
	RoomID   string `json:"roomId"`
}

type ErrorPayload struct {
	Message string `json:"message"`
}

type ConnectedPayload struct {
	RoomID  string `json:"roomId"`
	Message string `json:"message"`
}
