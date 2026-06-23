package models

import "gorm.io/gorm"

// Community is like a Discord server — has channels inside for chat/voice, and also supports posts
type Community struct {
	gorm.Model
	Name        string   `gorm:"uniqueIndex;not null" json:"name"`
	AdminID     uint     `gorm:"not null" json:"adminId"`
	About       string   `json:"about"`
	Topics      []string `gorm:"serializer:json" json:"topics"`
	IconUrl     string   `json:"iconUrl"`
	BannerUrl   string   `json:"bannerUrl"`
	MemberCount int      `gorm:"default:1" json:"memberCount"`
	IsPrivate   bool     `gorm:"default:false" json:"isPrivate"`
}
