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

func getJWTSecret() []byte {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "vro-i-swear-i-didnt-vibe-code-dev-only"
	}
	return []byte(secret)
}

func generateToken(userID uint) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": userID,
		"exp":     time.Now().Add(time.Hour * 240).Unix(), // .Unix() — was missing ()
	})
	return token.SignedString(getJWTSecret()) // getJWTSecret() — was missing ()
}

type RegisterRequest struct {
	Username  string   `json:"username"`
	Email     string   `json:"email"`
	Password  string   `json:"password"`
	Interests []string `json:"interests"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type AuthResponse struct {
	UserID   uint   `json:"userId"`
	Username string `json:"username"`
	PfpUrl   string `json:"pfpUrl"`
	Token    string `json:"token"`
}

// POST /api/auth/register
func Register(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	if req.Username == "" || req.Email == "" || req.Password == "" {
		http.Error(w, "Username, email, and password are required", http.StatusBadRequest)
		return
	}

	// Check uniqueness
	var existing models.User
	if config.DB.Where("email = ? OR username = ?", req.Email, req.Username).First(&existing).Error == nil {
		http.Error(w, "Email or username already in use", http.StatusConflict)
		return
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, "Server error", http.StatusInternalServerError)
		return
	}

	user := models.User{
		Username:  req.Username,
		Email:     req.Email,
		Password:  string(hashed),
		Interests: req.Interests,
	}
	if err := config.DB.Create(&user).Error; err != nil {
		http.Error(w, "Failed to create user", http.StatusInternalServerError)
		return
	}

	tokenStr, err := generateToken(user.ID)
	if err != nil {
		http.Error(w, "Failed to generate token", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(AuthResponse{
		UserID:   user.ID,
		Username: user.Username,
		Token:    tokenStr,
	})
}

// POST /api/auth/login
func Login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	var user models.User
	if err := config.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		// Bug fix: original leaked whether the email exists — always return generic message
		http.Error(w, "Invalid credentials", http.StatusUnauthorized)
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		http.Error(w, "Invalid credentials", http.StatusUnauthorized)
		return
	}

	tokenStr, err := generateToken(user.ID)
	if err != nil {
		http.Error(w, "Failed to generate token", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(AuthResponse{
		UserID:   user.ID,
		Username: user.Username,
		PfpUrl:   user.PfpUrl,
		Token:    tokenStr,
	})
}
