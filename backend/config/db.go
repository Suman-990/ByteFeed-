package config

import (
	"bytefeed-backend/models"
	"fmt"
	"log"
	"os"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func ConnectDB() {
	dsn := os.Getenv("DB_URL")
	if dsn == "" {
		log.Fatal("DB_URL not set in environment")
	}

	// Bug fix: was using := which created a local variable shadowing the package-level DB
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	DB = db // assign to the package-level variable

	err = DB.AutoMigrate(
		&models.User{},
		&models.Post{},
		&models.Community{},
		&models.Channel{},
		&models.Comment{},
		&models.Message{},
		&models.Vote{},
		&models.FriendRequest{},
		&models.Friendship{},
		&models.CommunityMember{},
		&models.SavedPost{},
	)
	if err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	fmt.Println("✅ Database connected and migrated successfully")
}
