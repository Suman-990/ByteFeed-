package models

import "gorm.io/gorm"

// Channel belongs to a Community — can be text (for chat, WS later) or voice
type Channel struct {
	gorm.Model
	Name        string `gorm:"not null" json:"name"`
	Description string `json:"description"`
	CommunityID uint   `gorm:"not null;index" json:"communityId"`
	IsVoice     bool   `gorm:"default:false" json:"isVoice"`
	Position    int    `gorm:"default:0" json:"position"` // display order in sidebar
}
