package models

import (
	"time"

	"gorm.io/gorm"
)

type Comment struct {
	gorm.Model
	ID        uint      `gorm:"primarykey;autoIncrement" json:"id"`
	Content   string    `json:"content"`
	UserID    uint      `json:"userId"`
	PostID    uint      `json:"postId"`
	CreatedAt time.Time `json:"createdAt"`
}
