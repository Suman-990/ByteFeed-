package models

import "time"

// SavedPost tracks posts bookmarked by a user.
type SavedPost struct {
	UserID  uint      `gorm:"primaryKey;index" json:"userId"`
	PostID  uint      `gorm:"primaryKey;index" json:"postId"`
	SavedAt time.Time `json:"savedAt"`
}
