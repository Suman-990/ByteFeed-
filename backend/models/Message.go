package models

import "gorm.io/gorm"

// Message is used for both channel chat and DMs.
// For channel messages: ChannelID is set, ReceiverID is nil.
// For DMs: ReceiverID is set, ChannelID is nil.
type Message struct {
	gorm.Model
	SenderID   uint   `gorm:"not null;index" json:"senderId"`
	Sender     User   `gorm:"foreignKey:SenderID" json:"sender,omitempty"`
	Content    string `json:"content"`
	MediaUrl   string `json:"mediaUrl"`
	ChannelID  *uint  `gorm:"index" json:"channelId"`  // nil for DMs
	ReceiverID *uint  `gorm:"index" json:"receiverId"` // nil for channel messages
	IsEdited   bool   `gorm:"default:false" json:"isEdited"`
}
