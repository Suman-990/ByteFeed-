package controllers

import (
	"bytefeed-backend/config"
	"bytefeed-backend/models"
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
)

// GetChannelMessages godoc
// GET /api/channels/{id}/messages?page=1&limit=50
// Requires community membership. Ready for WebSocket to replace/augment later.
func GetChannelMessages(w http.ResponseWriter, r *http.Request) {
	callerID := getUserIDFromCtx(r)
	channelID := mux.Vars(r)["id"]

	var channel models.Channel
	if err := config.DB.First(&channel, channelID).Error; err != nil {
		http.Error(w, "Channel not found", http.StatusNotFound)
		return
	}
	if !isCommunityMember(channel.CommunityID, callerID) {
		http.Error(w, "Join the community to read messages", http.StatusForbidden)
		return
	}

	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 50
	}
	offset := (page - 1) * limit

	var messages []models.Message
	config.DB.Preload("Sender").
		Where("channel_id = ?", channel.ID).
		Order("created_at ASC").
		Limit(limit).Offset(offset).
		Find(&messages)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(messages)
}

// GetDMHistory godoc
// GET /api/dm/{userId}?page=1&limit=50
// Fetches direct message history between the caller and target user.
func GetDMHistory(w http.ResponseWriter, r *http.Request) {
	callerID := getUserIDFromCtx(r)
	targetID := mux.Vars(r)["userId"]

	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 50
	}
	offset := (page - 1) * limit

	var messages []models.Message
	config.DB.Preload("Sender").
		Where("channel_id IS NULL AND ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))",
			callerID, targetID, targetID, callerID).
		Order("created_at ASC").
		Limit(limit).Offset(offset).
		Find(&messages)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(messages)
}

// SendMessage godoc
// POST /api/messages
// REST fallback for sending messages (WebSocket will handle real-time later).
// For channel message: set channelId. For DM: set receiverId.
func SendMessage(w http.ResponseWriter, r *http.Request) {
	senderID := getUserIDFromCtx(r)

	var req struct {
		Content    string `json:"content"`
		MediaUrl   string `json:"mediaUrl"`
		ChannelID  *uint  `json:"channelId"`
		ReceiverID *uint  `json:"receiverId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	if req.Content == "" && req.MediaUrl == "" {
		http.Error(w, "Message must have content or media", http.StatusBadRequest)
		return
	}
	if req.ChannelID == nil && req.ReceiverID == nil {
		http.Error(w, "Must specify channelId or receiverId", http.StatusBadRequest)
		return
	}
	if req.ChannelID != nil && req.ReceiverID != nil {
		http.Error(w, "Cannot specify both channelId and receiverId", http.StatusBadRequest)
		return
	}

	// Channel message — verify membership
	if req.ChannelID != nil {
		var channel models.Channel
		if err := config.DB.First(&channel, *req.ChannelID).Error; err != nil {
			http.Error(w, "Channel not found", http.StatusNotFound)
			return
		}
		if channel.IsVoice {
			http.Error(w, "Cannot send text messages to a voice channel", http.StatusBadRequest)
			return
		}
		if !isCommunityMember(channel.CommunityID, senderID) {
			http.Error(w, "Join the community to send messages", http.StatusForbidden)
			return
		}
	}

	// DM — verify receiver exists
	if req.ReceiverID != nil {
		var receiver models.User
		if err := config.DB.First(&receiver, *req.ReceiverID).Error; err != nil {
			http.Error(w, "Receiver not found", http.StatusNotFound)
			return
		}
	}

	message := models.Message{
		SenderID:   senderID,
		Content:    req.Content,
		MediaUrl:   req.MediaUrl,
		ChannelID:  req.ChannelID,
		ReceiverID: req.ReceiverID,
	}
	if err := config.DB.Create(&message).Error; err != nil {
		http.Error(w, "Failed to send message", http.StatusInternalServerError)
		return
	}

	config.DB.Preload("Sender").First(&message, message.ID)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(message)
}

// EditMessage godoc
// PUT /api/messages/{id}
func EditMessage(w http.ResponseWriter, r *http.Request) {
	callerID := getUserIDFromCtx(r)
	id := mux.Vars(r)["id"]

	var message models.Message
	if err := config.DB.First(&message, id).Error; err != nil {
		http.Error(w, "Message not found", http.StatusNotFound)
		return
	}
	if message.SenderID != callerID {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	var req struct {
		Content string `json:"content"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Content == "" {
		http.Error(w, "Content is required", http.StatusBadRequest)
		return
	}

	config.DB.Model(&message).Updates(map[string]interface{}{
		"content":   req.Content,
		"is_edited": true,
	})
	config.DB.Preload("Sender").First(&message, id)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(message)
}

// DeleteMessage godoc
// DELETE /api/messages/{id}
func DeleteMessage(w http.ResponseWriter, r *http.Request) {
	callerID := getUserIDFromCtx(r)
	id := mux.Vars(r)["id"]

	var message models.Message
	if err := config.DB.First(&message, id).Error; err != nil {
		http.Error(w, "Message not found", http.StatusNotFound)
		return
	}

	// Allow sender OR community admin to delete
	canDelete := message.SenderID == callerID
	if !canDelete && message.ChannelID != nil {
		var channel models.Channel
		config.DB.First(&channel, *message.ChannelID)
		canDelete = isCommunityAdmin(channel.CommunityID, callerID)
	}
	if !canDelete {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	config.DB.Delete(&message)
	w.WriteHeader(http.StatusNoContent)
}

// UploadMessageMedia godoc
// POST /api/messages/upload   multipart/form-data key: "file"
// Returns the Cloudinary URL to embed in the message body.
func UploadMessageMedia(w http.ResponseWriter, r *http.Request) {
	r.ParseMultipartForm(20 << 20) // 20MB
	file, _, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "Missing file", http.StatusBadRequest)
		return
	}
	defer file.Close()

	result, err := config.UploadFile(file, "messages")
	if err != nil {
		http.Error(w, "Upload failed: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}
