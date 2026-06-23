package models

import "gorm.io/gorm"

// Vote tracks one vote per user per post or comment (prevents double voting).
// TargetType is either "post" or "comment".
// Value: 1 = upvote, -1 = downvote.
type Vote struct {
	gorm.Model
	UserID     uint   `gorm:"not null;uniqueIndex:idx_unique_vote" json:"userId"`
	TargetID   uint   `gorm:"not null;uniqueIndex:idx_unique_vote" json:"targetId"`
	TargetType string `gorm:"not null;uniqueIndex:idx_unique_vote" json:"targetType"`
	Value      int    `gorm:"not null" json:"value"`
}
