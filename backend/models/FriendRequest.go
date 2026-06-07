package models

import "gorm.io/gorm"

// FriendRequest handles the mutual friend system (both users must accept, like Facebook).
// Status: "pending" | "accepted" | "rejected"
type FriendRequest struct {
	gorm.Model
	SenderID   uint   `gorm:"not null;uniqueIndex:idx_unique_request" json:"senderId"`
	ReceiverID uint   `gorm:"not null;uniqueIndex:idx_unique_request" json:"receiverId"`
	Status     string `gorm:"default:'pending';not null" json:"status"`
}
