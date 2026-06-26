package models

import "gorm.io/gorm"

type Post struct {
	gorm.Model
	AuthorID    uint       `gorm:"not null;index" json:"authorId"`
	Author      User       `gorm:"foreignKey:AuthorID" json:"author"`
	Title       string     `json:"title"`
	Content     string     `json:"content"`
	ImageUrls   []string   `gorm:"serializer:json" json:"imageUrls"`
	Tags        []string   `gorm:"serializer:json" json:"tags"` // used for interest-based feed
	CommunityID *uint      `gorm:"index" json:"communityId"`    // nil = standalone feed post
	Community   *Community `gorm:"foreignKey:CommunityID" json:"community,omitempty"`
	UpVotes     int        `gorm:"default:0" json:"upVotes"`
	DownVotes   int        `gorm:"default:0" json:"downVotes"`
	Saves       int        `gorm:"default:0" json:"saves"`
}
