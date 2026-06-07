package config

import (
	"context"
	"fmt"
	"log"
	"mime/multipart"
	"os"

	"github.com/cloudinary/cloudinary-go/v2"
	"github.com/cloudinary/cloudinary-go/v2/api/uploader"
)

var Cld *cloudinary.Cloudinary

// ConnectCloudinary initialises the Cloudinary client from env vars.
func ConnectCloudinary() {
	name := os.Getenv("CLOUDINARY_CLOUD_NAME")
	key := os.Getenv("CLOUDINARY_API_KEY")
	secret := os.Getenv("CLOUDINARY_API_SECRET")

	if name == "" || key == "" || secret == "" {
		log.Println("⚠️  Cloudinary credentials not set — file uploads will be disabled")
		return
	}

	cld, err := cloudinary.NewFromParams(name, key, secret)
	if err != nil {
		log.Fatalf("Failed to initialize Cloudinary: %v", err)
	}
	Cld = cld
	fmt.Println("✅ Cloudinary connected")
}

type UploadResult struct {
	URL      string `json:"url"`
	PublicID string `json:"publicId"`
}

// UploadFile uploads a multipart file to a specific Cloudinary folder.
func UploadFile(file multipart.File, folder string) (*UploadResult, error) {
	if Cld == nil {
		return nil, fmt.Errorf("cloudinary is not initialised — check env vars")
	}
	ctx := context.Background()
	resp, err := Cld.Upload.Upload(ctx, file, uploader.UploadParams{
		Folder: "bytefeed/" + folder,
	})
	if err != nil {
		return nil, err
	}
	return &UploadResult{
		URL:      resp.SecureURL,
		PublicID: resp.PublicID,
	}, nil
}
