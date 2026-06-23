package models

import "gorm.io/gorm"

type Comment struct {
	gorm.Model
	Content   string   `gorm:"not null" json:"content"`
	UserID    uint     `gorm:"not null;index" json:"userId"`
	User      User     `gorm:"foreignKey:UserID" json:"user,omitempty"`
	PostID    uint     `gorm:"not null;index" json:"postId"`
	ParentID  *uint    `gorm:"index" json:"parentId"` // nil = top-level comment; set = reply
	UpVotes   int      `gorm:"default:0" json:"upVotes"`
	DownVotes int      `gorm:"default:0" json:"downVotes"`
}
