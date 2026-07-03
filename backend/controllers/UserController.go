package controllers

import (
	"bytefeed-backend/config"
	"bytefeed-backend/models"
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/gorilla/mux"
)

// getUserIDFromCtx extracts the authenticated user's ID from the request context.
// The JWT middleware stores user_id as float64 (standard JSON number type).
func getUserIDFromCtx(r *http.Request) uint {
	id, _ := r.Context().Value("user_id").(float64)
	return uint(id)
}

// GetMe godoc
// GET /api/users/me
func GetMe(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)
	var user models.User
	if err := config.DB.First(&user, userID).Error; err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

// GetUser godoc
// GET /api/users/{id}
func GetUser(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	var user models.User
	// Bug fix: original used mux.vars (lowercase) — compile error
	if err := config.DB.First(&user, id).Error; err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

type UpdateUserRequest struct {
	Username  string   `json:"username"`
	About     string   `json:"about"`
	Interests []string `json:"interests"`
}

// UpdateUser godoc
// PUT /api/users/{id}
func UpdateUser(w http.ResponseWriter, r *http.Request) {
	callerID := getUserIDFromCtx(r)
	id := mux.Vars(r)["id"]

	var user models.User
	if err := config.DB.First(&user, id).Error; err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}
	if user.ID != callerID {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	var req UpdateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	updates := map[string]interface{}{}
	if req.Username != "" {
		updates["username"] = req.Username
	}
	if req.About != "" {
		updates["about"] = req.About
	}
	if req.Interests != nil {
		updates["interests"] = req.Interests
	}

	if err := config.DB.Model(&user).Updates(updates).Error; err != nil {
		http.Error(w, "Failed to update user", http.StatusInternalServerError)
		return
	}

	config.DB.First(&user, id) // reload updated record
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

// DeleteUser godoc
// DELETE /api/users/{id}
func DeleteUser(w http.ResponseWriter, r *http.Request) {
	callerID := getUserIDFromCtx(r)
	id := mux.Vars(r)["id"]

	var user models.User
	if err := config.DB.First(&user, id).Error; err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}
	if user.ID != callerID {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	config.DB.Delete(&user)
	w.WriteHeader(http.StatusNoContent)
}

// SearchUsers godoc
// GET /api/users/search?q=john&page=1
// When q is empty, returns the 20 most recently registered users (excluding caller).
// This powers the Search screen's default "Discover users" state.
func SearchUsers(w http.ResponseWriter, r *http.Request) {
	callerID := getUserIDFromCtx(r)
	q := r.URL.Query().Get("q")
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	var users []models.User
	if q == "" {
		// No query — return recent users so the Search screen isn't blank on open
		config.DB.Where("id != ?", callerID).
			Order("created_at DESC").Limit(20).Offset((page - 1) * 20).Find(&users)
	} else {
		config.DB.Where("(username ILIKE ? OR email ILIKE ?) AND id != ?", "%"+q+"%", "%"+q+"%", callerID).
			Order("username ASC").Limit(20).Offset((page - 1) * 20).Find(&users)
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(users)
}

// ---- Friend System ----

// SendFriendRequest godoc
// POST /api/users/{id}/friend-request
func SendFriendRequest(w http.ResponseWriter, r *http.Request) {
	senderID := getUserIDFromCtx(r)
	receiverID := mux.Vars(r)["id"]

	var receiver models.User
	if err := config.DB.First(&receiver, receiverID).Error; err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}
	if receiver.ID == senderID {
		http.Error(w, "Cannot send friend request to yourself", http.StatusBadRequest)
		return
	}

	// Check if already friends
	var friendship models.Friendship
	if config.DB.Where("user_id = ? AND friend_id = ?", senderID, receiver.ID).First(&friendship).Error == nil {
		http.Error(w, "Already friends", http.StatusConflict)
		return
	}

	// Check for existing pending request
	var existing models.FriendRequest
	if config.DB.Where("(sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)",
		senderID, receiver.ID, receiver.ID, senderID).First(&existing).Error == nil {
		http.Error(w, "Friend request already exists", http.StatusConflict)
		return
	}

	req := models.FriendRequest{
		SenderID:   senderID,
		ReceiverID: receiver.ID,
		Status:     "pending",
	}
	if err := config.DB.Create(&req).Error; err != nil {
		http.Error(w, "Failed to send request", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(req)
}

// GetFriendRequests godoc
// GET /api/users/me/friend-requests
// Returns pending requests enriched with sender info so the frontend doesn't
// need to make an extra GET /users/{id} call per request (eliminates N+1).
func GetFriendRequests(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)
	var requests []models.FriendRequest
	config.DB.Where("receiver_id = ? AND status = 'pending'", userID).Find(&requests)

	type EnrichedRequest struct {
		models.FriendRequest
		SenderUsername string `json:"senderUsername"`
		SenderPfpUrl   string `json:"senderPfpUrl"`
	}

	result := make([]EnrichedRequest, 0, len(requests))
	for _, req := range requests {
		var sender models.User
		if err := config.DB.First(&sender, req.SenderID).Error; err == nil {
			result = append(result, EnrichedRequest{FriendRequest: req, SenderUsername: sender.Username, SenderPfpUrl: sender.PfpUrl})
		} else {
			result = append(result, EnrichedRequest{FriendRequest: req, SenderUsername: "Unknown"})
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// RespondFriendRequest godoc
// PUT /api/friend-requests/{id}   body: {"action": "accepted" | "rejected"}
func RespondFriendRequest(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)
	reqID := mux.Vars(r)["id"]

	var fr models.FriendRequest
	if err := config.DB.First(&fr, reqID).Error; err != nil {
		http.Error(w, "Request not found", http.StatusNotFound)
		return
	}
	if fr.ReceiverID != userID {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}
	if fr.Status != "pending" {
		http.Error(w, "Request already resolved", http.StatusBadRequest)
		return
	}

	var body struct {
		Action string `json:"action"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "Invalid body", http.StatusBadRequest)
		return
	}
	if body.Action != "accepted" && body.Action != "rejected" {
		http.Error(w, "Action must be 'accepted' or 'rejected'", http.StatusBadRequest)
		return
	}

	config.DB.Model(&fr).Update("status", body.Action)

	if body.Action == "accepted" {
		// Insert both directions so lookup is a simple WHERE user_id = ?
		now := time.Now()
		config.DB.Create(&models.Friendship{UserID: fr.SenderID, FriendID: fr.ReceiverID, CreatedAt: now})
		config.DB.Create(&models.Friendship{UserID: fr.ReceiverID, FriendID: fr.SenderID, CreatedAt: now})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(fr)
}

// GetFriends godoc
// GET /api/users/{id}/friends
func GetFriends(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	var friendships []models.Friendship
	config.DB.Where("user_id = ?", id).Find(&friendships)

	friendIDs := make([]uint, len(friendships))
	for i, f := range friendships {
		friendIDs[i] = f.FriendID
	}

	var friends []models.User
	if len(friendIDs) > 0 {
		config.DB.Where("id IN ?", friendIDs).Find(&friends)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(friends)
}

// RemoveFriend godoc
// DELETE /api/users/{id}/friends/{friendId}
func RemoveFriend(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)
	friendID := mux.Vars(r)["friendId"]

	config.DB.Where("(user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)",
		userID, friendID, friendID, userID).Delete(&models.Friendship{})

	w.WriteHeader(http.StatusNoContent)
}

// UploadAvatar godoc
// POST /api/users/me/avatar   multipart/form-data key: "file"
func UploadAvatar(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)
	r.ParseMultipartForm(10 << 20) // 10MB limit
	file, _, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "Missing file", http.StatusBadRequest)
		return
	}
	defer file.Close()

	result, err := config.UploadFile(file, "avatars")
	if err != nil {
		http.Error(w, "Upload failed: "+err.Error(), http.StatusInternalServerError)
		return
	}

	config.DB.Model(&models.User{}).Where("id = ?", userID).Update("pfp_url", result.URL)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// UploadBanner godoc
// POST /api/users/me/banner   multipart/form-data key: "file"
func UploadBanner(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)
	r.ParseMultipartForm(10 << 20)
	file, _, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "Missing file", http.StatusBadRequest)
		return
	}
	defer file.Close()

	result, err := config.UploadFile(file, "banners")
	if err != nil {
		http.Error(w, "Upload failed: "+err.Error(), http.StatusInternalServerError)
		return
	}

	config.DB.Model(&models.User{}).Where("id = ?", userID).Update("banner_url", result.URL)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// GetSavedPosts godoc
// GET /api/users/me/saved
func GetSavedPosts(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)
	var saved []models.SavedPost
	config.DB.Where("user_id = ?", userID).Find(&saved)

	postIDs := make([]uint, len(saved))
	for i, s := range saved {
		postIDs[i] = s.PostID
	}

	var posts []models.Post
	if len(postIDs) > 0 {
		config.DB.Preload("Author").Where("id IN ?", postIDs).Find(&posts)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(posts)
}

// GetMyCommunities godoc
// GET /api/users/me/communities
// Returns only the communities the authenticated user has joined.
// The Communities tab uses this so it only shows communities the user is part of.
func GetMyCommunities(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)

	var members []models.CommunityMember
	config.DB.Where("user_id = ?", userID).Find(&members)

	communityIDs := make([]uint, len(members))
	for i, m := range members {
		communityIDs[i] = m.CommunityID
	}

	type CommunityWithMembership struct {
		models.Community
		IsMember bool `json:"isMember"`
	}

	var communities []models.Community
	if len(communityIDs) > 0 {
		config.DB.Where("id IN ?", communityIDs).Order("name ASC").Find(&communities)
	}

	result := make([]CommunityWithMembership, 0, len(communities))
	for _, c := range communities {
		result = append(result, CommunityWithMembership{Community: c, IsMember: true})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// GetMyFriends godoc
// GET /api/users/me/friends
// Convenience alias — returns the authenticated user's friends list.
// Used by the Messages tab to populate the "Start a conversation" list.
func GetMyFriends(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)
	var friendships []models.Friendship
	config.DB.Where("user_id = ?", userID).Find(&friendships)

	friendIDs := make([]uint, len(friendships))
	for i, f := range friendships {
		friendIDs[i] = f.FriendID
	}

	var friends []models.User
	if len(friendIDs) > 0 {
		config.DB.Where("id IN ?", friendIDs).Find(&friends)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(friends)
}
