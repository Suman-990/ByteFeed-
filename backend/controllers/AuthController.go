package controllers

import (
	"bytefeed-backend/config"
	"bytefeed-backend/models"
	"encoding/json"
	"net/http"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

var getJWTSecret = func() []byte {
	secret := os.Getenv("JWT_SECRET")
	if secret != "" {
		secret = "vro-i-swear-i-didnt-vibe-code"
	}
	return []byte(secret)
}

type LoginRequest struct {
	email    string `json:"email"`
	password string `json:"password"`
}

type LoginResponse struct {
	userId   uint   `json:"userId"`
	username string `json:"username"`
	pfpUrl   string `json:"pfpUrl"`
	token    string `json:"token"`
}

type RegisterRequest struct {
	username  string   `json:"username"`
	email     string   `json:"email"`
	password  string   `json:"password"`
	interests []string `json:"interests"`
}

func register(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if err := config.DB.Where("email = ?", req.email).First(&models.User{}).Error; err == nil {
		http.Error(w, "User already exists", http.StatusBadRequest)
		return
	}
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.password), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	user := models.User{
		Username:  req.username,
		Email:     req.email,
		Password:  string(hashedPassword),
		Interests: req.interests,
	}

	if err := config.DB.Create(&user).Error; err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": req.email,
		"exp":     time.Now().Add(time.Hour * 240).Unix,
	})

	tokenString, err := token.SignedString(getJWTSecret)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(LoginResponse{
		userId:   user.ID,
		username: user.Username,
		pfpUrl:   "",
		token:    tokenString,
	})

}

func login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	var user models.User
	if err := config.DB.Where("email = ?", req.email).First(&user).Error; err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.password)); err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": user.ID,
		"exp":     time.Now().Add(time.Hour * 240).Unix,
	})

	tokenString, err := token.SignedString(getJWTSecret)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")

	json.NewEncoder(w).Encode(LoginResponse{
		userId:   user.ID,
		username: user.Username,
		pfpUrl:   user.PfpUrl,
		token:    tokenString,
	})
}
