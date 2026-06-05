package config

import (
	"bytefeed-backend/models"
	"fmt"
	"log"
	"os"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func connectDB() {
	dsn := os.Getenv("DB_URL")
	if dsn == "" {
		log.Fatal("db url not found")
	}
	DB, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal(err)
	}
	err := DB.AutoMigrate(&models.User{})

	if err != nil {
		log.Fatal("error while migrating db")
	}
	fmt.Println("Database connected")
}
