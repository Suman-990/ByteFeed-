package models

import (
	"time"

	"gorm.io/gorm"
)

type community struct {
	gorm.Model
	Id        uint      `gorm:"primarykey;autoincrement" json:"id"`
	Admin     uint      `json:"admin"`
	Name      string    `json:"name"`
	CreatedAt time.Time `json:"createdAt"`
	About     string    `json:"about"`
	Topics    []string  `json:"topics"`
	Icon      string    `json:"icon"`
	Members   []uint    `json:"members"`
}
