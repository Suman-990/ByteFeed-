package controllers

import (
	"bytefeed-backend/config"
	"bytefeed-backend/models"
	"encoding/json"
	"net/http"

	"github.com/gorilla/mux"
)

// isCommunityMember checks if userID belongs to the given community.
func isCommunityMember(communityID uint, userID uint) bool {
	var m models.CommunityMember
	return config.DB.Where("community_id = ? AND user_id = ?", communityID, userID).First(&m).Error == nil
}

// isCommunityAdmin checks if userID is the admin of the given community.
func isCommunityAdmin(communityID uint, userID uint) bool {
	var c models.Community
	config.DB.First(&c, communityID)
	return c.AdminID == userID
}

// CreateChannel godoc
// POST /api/communities/{id}/channels
func CreateChannel(w http.ResponseWriter, r *http.Request) {
	callerID := getUserIDFromCtx(r)
	communityID := mux.Vars(r)["id"]

	var community models.Community
	if err := config.DB.First(&community, communityID).Error; err != nil {
		http.Error(w, "Community not found", http.StatusNotFound)
		return
	}
	if community.AdminID != callerID {
		// Also allow moderators
		var member models.CommunityMember
		config.DB.Where("community_id = ? AND user_id = ? AND role IN ('admin','moderator')",
			community.ID, callerID).First(&member)
		if member.UserID == 0 {
			http.Error(w, "Only admins and moderators can create channels", http.StatusForbidden)
			return
		}
	}

	var req struct {
		Name        string `json:"name"`
		Description string `json:"description"`
		IsVoice     bool   `json:"isVoice"`
		Position    int    `json:"position"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Name == "" {
		http.Error(w, "Name is required", http.StatusBadRequest)
		return
	}

	channel := models.Channel{
		Name:        req.Name,
		Description: req.Description,
		CommunityID: community.ID,
		IsVoice:     req.IsVoice,
		Position:    req.Position,
	}
	if err := config.DB.Create(&channel).Error; err != nil {
		http.Error(w, "Failed to create channel", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(channel)
}

// GetCommunityChannels godoc
// GET /api/communities/{id}/channels
func GetCommunityChannels(w http.ResponseWriter, r *http.Request) {
	callerID := getUserIDFromCtx(r)
	communityID := mux.Vars(r)["id"]

	var community models.Community
	if err := config.DB.First(&community, communityID).Error; err != nil {
		http.Error(w, "Community not found", http.StatusNotFound)
		return
	}

	// Channels require membership
	if !isCommunityMember(community.ID, callerID) {
		http.Error(w, "Join the community to access channels", http.StatusForbidden)
		return
	}

	var channels []models.Channel
	config.DB.Where("community_id = ?", communityID).Order("position ASC, created_at ASC").Find(&channels)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(channels)
}

// GetChannel godoc
// GET /api/channels/{id}
func GetChannel(w http.ResponseWriter, r *http.Request) {
	callerID := getUserIDFromCtx(r)
	id := mux.Vars(r)["id"]

	var channel models.Channel
	if err := config.DB.First(&channel, id).Error; err != nil {
		http.Error(w, "Channel not found", http.StatusNotFound)
		return
	}
	if !isCommunityMember(channel.CommunityID, callerID) {
		http.Error(w, "Join the community to access this channel", http.StatusForbidden)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(channel)
}

// UpdateChannel godoc
// PUT /api/channels/{id}
func UpdateChannel(w http.ResponseWriter, r *http.Request) {
	callerID := getUserIDFromCtx(r)
	id := mux.Vars(r)["id"]

	var channel models.Channel
	if err := config.DB.First(&channel, id).Error; err != nil {
		http.Error(w, "Channel not found", http.StatusNotFound)
		return
	}
	if !isCommunityAdmin(channel.CommunityID, callerID) {
		http.Error(w, "Only the community admin can edit channels", http.StatusForbidden)
		return
	}

	var req struct {
		Name        string `json:"name"`
		Description string `json:"description"`
		Position    *int   `json:"position"`
	}
	json.NewDecoder(r.Body).Decode(&req)

	updates := map[string]interface{}{}
	if req.Name != "" {
		updates["name"] = req.Name
	}
	if req.Description != "" {
		updates["description"] = req.Description
	}
	if req.Position != nil {
		updates["position"] = *req.Position
	}

	config.DB.Model(&channel).Updates(updates)
	config.DB.First(&channel, id)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(channel)
}

// DeleteChannel godoc
// DELETE /api/channels/{id}
func DeleteChannel(w http.ResponseWriter, r *http.Request) {
	callerID := getUserIDFromCtx(r)
	id := mux.Vars(r)["id"]

	var channel models.Channel
	if err := config.DB.First(&channel, id).Error; err != nil {
		http.Error(w, "Channel not found", http.StatusNotFound)
		return
	}
	if !isCommunityAdmin(channel.CommunityID, callerID) {
		http.Error(w, "Only the community admin can delete channels", http.StatusForbidden)
		return
	}

	config.DB.Where("channel_id = ?", channel.ID).Delete(&models.Message{})
	config.DB.Delete(&channel)
	w.WriteHeader(http.StatusNoContent)
}
