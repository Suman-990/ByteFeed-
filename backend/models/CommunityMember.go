package models

import "time"

// CommunityMember is the junction table tracking who belongs to which community.
// Role: "member" | "moderator" | "admin"
type CommunityMember struct {
	CommunityID uint      `gorm:"primaryKey;index" json:"communityId"`
	UserID      uint      `gorm:"primaryKey;index" json:"userId"`
	Role        string    `gorm:"default:'member';not null" json:"role"`
	JoinedAt    time.Time `json:"joinedAt"`
}
