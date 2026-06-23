package controllers

import (
	"bytefeed-backend/config"
	"bytefeed-backend/models"
	"encoding/json"
	"fmt"
	"net/http"
	"sort"

	"github.com/gorilla/mux"
)

// ── Voice Channel Token ─────────────────────────────────────────────────────

// GetVoiceToken generates a LiveKit join token for a voice channel.
// The caller must be a member of the community that owns the channel,
// and the channel must have is_voice = true.
//
// GET /api/channels/{id}/voice-token
func GetVoiceToken(w http.ResponseWriter, r *http.Request) {
	callerID := getUserIDFromCtx(r)
	channelID := mux.Vars(r)["id"]

	// ── Look up channel ──────────────────────────────────────────────────
	var channel models.Channel
	if err := config.DB.First(&channel, channelID).Error; err != nil {
		http.Error(w, "Channel not found", http.StatusNotFound)
		return
	}
	if !channel.IsVoice {
		http.Error(w, "This is not a voice channel", http.StatusBadRequest)
		return
	}

	// ── Caller must be a community member ────────────────────────────────
	if !isCommunityMember(channel.CommunityID, callerID) {
		http.Error(w, "Join the community to access this voice channel", http.StatusForbidden)
		return
	}

	// ── Fetch caller info for display name ───────────────────────────────
	var user models.User
	if err := config.DB.First(&user, callerID).Error; err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	// Room name is deterministic: "channel_<id>"
	roomName := fmt.Sprintf("channel_%d", channel.ID)
	identity := fmt.Sprintf("user_%d", callerID)

	token, err := config.GenerateJoinToken(roomName, identity, user.Username)
	if err != nil {
		http.Error(w, "Failed to generate voice token: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"token":    token,
		"room":     roomName,
		"wsUrl":    config.LiveKitHost,
		"identity": identity,
	})
}

// ── DM Call Token ────────────────────────────────────────────────────────────

// GetDMCallToken generates a LiveKit join token for a 1-on-1 DM call.
// Both users must be friends. The room name is deterministic so both
// participants always land in the same room regardless of who initiates.
//
// GET /api/dm/{userId}/call-token
func GetDMCallToken(w http.ResponseWriter, r *http.Request) {
	callerID := getUserIDFromCtx(r)
	otherUserID := mux.Vars(r)["userId"]

	// ── Verify the other user exists ─────────────────────────────────────
	var otherUser models.User
	if err := config.DB.First(&otherUser, otherUserID).Error; err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}
	if otherUser.ID == callerID {
		http.Error(w, "Cannot call yourself", http.StatusBadRequest)
		return
	}

	// ── Verify they are friends ──────────────────────────────────────────
	var friendship models.Friendship
	if err := config.DB.Where("user_id = ? AND friend_id = ?", callerID, otherUser.ID).
		First(&friendship).Error; err != nil {
		http.Error(w, "You must be friends to start a call", http.StatusForbidden)
		return
	}

	// ── Fetch caller info ────────────────────────────────────────────────
	var caller models.User
	if err := config.DB.First(&caller, callerID).Error; err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	// Deterministic room name: sorted user IDs so both sides get the same room
	ids := []uint{callerID, otherUser.ID}
	sort.Slice(ids, func(i, j int) bool { return ids[i] < ids[j] })
	roomName := fmt.Sprintf("dm_%d_%d", ids[0], ids[1])
	identity := fmt.Sprintf("user_%d", callerID)

	token, err := config.GenerateJoinToken(roomName, identity, caller.Username)
	if err != nil {
		http.Error(w, "Failed to generate call token: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"token":    token,
		"room":     roomName,
		"wsUrl":    config.LiveKitHost,
		"identity": identity,
	})
}
