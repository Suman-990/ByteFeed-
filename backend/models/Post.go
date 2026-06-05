package models

import (
	"time"

	"gorm.io/gorm"
)

type Post struct {
	gorm.Model
	Id        uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	Author    uint      `json:"author"`
	Title     string    `json:"title"`
	Content   string    `json:"content"`
	CreatedAt time.Time `json:"createdAt"`
	ImageUrl  string    `json:"imageUrl"`
	UpVotes   int       `json:"upVotes"`
	DownVotes int       `json:"downVotes"`
	Comments  []int     `json:"comments"`
	Saves     int       `json:"saves"`
}
