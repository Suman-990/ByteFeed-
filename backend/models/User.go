package models

import "gorm.io/gorm"

type User struct {
	gorm.Model
	Username  string   `gorm:"uniqueIndex;not null" json:"username"`
	Email     string   `gorm:"uniqueIndex;not null" json:"email"`
	Password  string   `gorm:"not null" json:"-"` // never expose password in JSON
	About     string   `json:"about"`
	PfpUrl    string   `json:"pfpUrl"`
	BannerUrl string   `json:"bannerUrl"`
	Rating    int      `gorm:"default:0" json:"rating"`
	Interests []string `gorm:"serializer:json" json:"interests"`
}
