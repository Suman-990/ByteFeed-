package models

import (
	"gorm.io/gorm"
)

type User struct {
	gorm.Model
	Id          uint     `gorm:"primaryKey;autoIncrement" json:"id"`
	Username    string   `json:"username"`
	Email       string   `json:"email"`
	Password    string   `json:"password"`
	About       string   `json:"about"`
	PfpUrl      string   `json:"pfpUrl"`
	BannerUrl   string   `json:"bannerUrl"`
	Interests   []string `json:"interests"`
	Friends     []int    `json:"friends"`
	Posts       []int    `json:"posts"`
	Rating      int      `json:"rating"`
	Communities []int    `json:"communities"`
}
