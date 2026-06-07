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

// CreateCommunity godoc
// POST /api/communities
func CreateCommunity(w http.ResponseWriter, r *http.Request) {
	adminID := getUserIDFromCtx(r)

	var req struct {
		Name      string   `json:"name"`
		About     string   `json:"about"`
		Topics    []string `json:"topics"`
		IsPrivate bool     `json:"isPrivate"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Name == "" {
		http.Error(w, "Name is required", http.StatusBadRequest)
		return
	}

	// Check uniqueness
	var existing models.Community
	if config.DB.Where("name = ?", req.Name).First(&existing).Error == nil {
		http.Error(w, "Community name already taken", http.StatusConflict)
		return
	}

	community := models.Community{
		Name:      req.Name,
		AdminID:   adminID,
		About:     req.About,
		Topics:    req.Topics,
		IsPrivate: req.IsPrivate,
	}
	if err := config.DB.Create(&community).Error; err != nil {
		http.Error(w, "Failed to create community", http.StatusInternalServerError)
		return
	}

	// Auto-join creator as admin member
	config.DB.Create(&models.CommunityMember{
		CommunityID: community.ID,
		UserID:      adminID,
		Role:        "admin",
		JoinedAt:    time.Now(),
	})

	// Create a default #general text channel
	config.DB.Create(&models.Channel{
		Name:        "general",
		Description: "General discussion",
		CommunityID: community.ID,
		IsVoice:     false,
		Position:    0,
	})

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(community)
}

// GetCommunity godoc
// GET /api/communities/{id}
func GetCommunity(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	var community models.Community
	if err := config.DB.First(&community, id).Error; err != nil {
		http.Error(w, "Community not found", http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(community)
}

// SearchCommunities godoc
// GET /api/communities/search?q=golang&page=1
func SearchCommunities(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query().Get("q")
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	var communities []models.Community
	config.DB.Where("name ILIKE ? OR about ILIKE ?", "%"+q+"%", "%"+q+"%").
		Order("member_count DESC").Limit(20).Offset((page - 1) * 20).Find(&communities)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(communities)
}

// UpdateCommunity godoc
// PUT /api/communities/{id}
func UpdateCommunity(w http.ResponseWriter, r *http.Request) {
	callerID := getUserIDFromCtx(r)
	id := mux.Vars(r)["id"]

	var community models.Community
	if err := config.DB.First(&community, id).Error; err != nil {
		http.Error(w, "Community not found", http.StatusNotFound)
		return
	}
	if community.AdminID != callerID {
		http.Error(w, "Only the admin can update this community", http.StatusForbidden)
		return
	}

	var req struct {
		About     string   `json:"about"`
		Topics    []string `json:"topics"`
		IsPrivate *bool    `json:"isPrivate"`
	}
	json.NewDecoder(r.Body).Decode(&req)

	updates := map[string]interface{}{}
	if req.About != "" {
		updates["about"] = req.About
	}
	if req.Topics != nil {
		updates["topics"] = req.Topics
	}
	if req.IsPrivate != nil {
		updates["is_private"] = *req.IsPrivate
	}

	config.DB.Model(&community).Updates(updates)
	config.DB.First(&community, id)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(community)
}

// DeleteCommunity godoc
// DELETE /api/communities/{id}
func DeleteCommunity(w http.ResponseWriter, r *http.Request) {
	callerID := getUserIDFromCtx(r)
	id := mux.Vars(r)["id"]

	var community models.Community
	if err := config.DB.First(&community, id).Error; err != nil {
		http.Error(w, "Community not found", http.StatusNotFound)
		return
	}
	if community.AdminID != callerID {
		http.Error(w, "Only the admin can delete this community", http.StatusForbidden)
		return
	}

	config.DB.Where("community_id = ?", community.ID).Delete(&models.CommunityMember{})
	config.DB.Where("community_id = ?", community.ID).Delete(&models.Channel{})
	config.DB.Delete(&community)
	w.WriteHeader(http.StatusNoContent)
}

// JoinCommunity godoc
// POST /api/communities/{id}/join
func JoinCommunity(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)
	id := mux.Vars(r)["id"]

	var community models.Community
	if err := config.DB.First(&community, id).Error; err != nil {
		http.Error(w, "Community not found", http.StatusNotFound)
		return
	}

	var existing models.CommunityMember
	if config.DB.Where("community_id = ? AND user_id = ?", community.ID, userID).First(&existing).Error == nil {
		http.Error(w, "Already a member", http.StatusConflict)
		return
	}

	config.DB.Create(&models.CommunityMember{
		CommunityID: community.ID,
		UserID:      userID,
		Role:        "member",
		JoinedAt:    time.Now(),
	})
	config.DB.Model(&community).Update("member_count", community.MemberCount+1)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"status": "joined"})
}

// LeaveCommunity godoc
// DELETE /api/communities/{id}/leave
func LeaveCommunity(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)
	id := mux.Vars(r)["id"]

	var community models.Community
	if err := config.DB.First(&community, id).Error; err != nil {
		http.Error(w, "Community not found", http.StatusNotFound)
		return
	}
	if community.AdminID == userID {
		http.Error(w, "Admin cannot leave — transfer admin role first", http.StatusBadRequest)
		return
	}

	result := config.DB.Where("community_id = ? AND user_id = ?", community.ID, userID).
		Delete(&models.CommunityMember{})
	if result.RowsAffected == 0 {
		http.Error(w, "Not a member", http.StatusBadRequest)
		return
	}
	if community.MemberCount > 0 {
		config.DB.Model(&community).Update("member_count", community.MemberCount-1)
	}
	w.WriteHeader(http.StatusNoContent)
}

// GetMembers godoc
// GET /api/communities/{id}/members
func GetMembers(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	var members []models.CommunityMember
	config.DB.Where("community_id = ?", id).Find(&members)

	userIDs := make([]uint, len(members))
	for i, m := range members {
		userIDs[i] = m.UserID
	}

	type MemberWithRole struct {
		models.User
		Role     string    `json:"role"`
		JoinedAt time.Time `json:"joinedAt"`
	}

	var users []models.User
	if len(userIDs) > 0 {
		config.DB.Where("id IN ?", userIDs).Find(&users)
	}

	result := make([]MemberWithRole, 0, len(users))
	roleMap := map[uint]models.CommunityMember{}
	for _, m := range members {
		roleMap[m.UserID] = m
	}
	for _, u := range users {
		result = append(result, MemberWithRole{User: u, Role: roleMap[u.ID].Role, JoinedAt: roleMap[u.ID].JoinedAt})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// GetCommunityPosts godoc
// GET /api/communities/{id}/posts?page=1
func GetCommunityPosts(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}

	var community models.Community
	if err := config.DB.First(&community, id).Error; err != nil {
		http.Error(w, "Community not found", http.StatusNotFound)
		return
	}

	var posts []models.Post
	config.DB.Preload("Author").Where("community_id = ?", id).
		Order("created_at DESC").Limit(20).Offset((page - 1) * 20).Find(&posts)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(posts)
}

// UploadCommunityIcon godoc
// POST /api/communities/{id}/icon   multipart/form-data key: "file"
func UploadCommunityIcon(w http.ResponseWriter, r *http.Request) {
	callerID := getUserIDFromCtx(r)
	id := mux.Vars(r)["id"]

	var community models.Community
	if err := config.DB.First(&community, id).Error; err != nil {
		http.Error(w, "Community not found", http.StatusNotFound)
		return
	}
	if community.AdminID != callerID {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	r.ParseMultipartForm(5 << 20)
	file, _, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "Missing file", http.StatusBadRequest)
		return
	}
	defer file.Close()

	result, err := config.UploadFile(file, "community_icons")
	if err != nil {
		http.Error(w, "Upload failed: "+err.Error(), http.StatusInternalServerError)
		return
	}

	config.DB.Model(&community).Update("icon_url", result.URL)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// UploadCommunityBanner godoc
// POST /api/communities/{id}/banner   multipart/form-data key: "file"
func UploadCommunityBanner(w http.ResponseWriter, r *http.Request) {
	callerID := getUserIDFromCtx(r)
	id := mux.Vars(r)["id"]

	var community models.Community
	if err := config.DB.First(&community, id).Error; err != nil {
		http.Error(w, "Community not found", http.StatusNotFound)
		return
	}
	if community.AdminID != callerID {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	r.ParseMultipartForm(10 << 20)
	file, _, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "Missing file", http.StatusBadRequest)
		return
	}
	defer file.Close()

	result, err := config.UploadFile(file, "community_banners")
	if err != nil {
		http.Error(w, "Upload failed: "+err.Error(), http.StatusInternalServerError)
		return
	}

	config.DB.Model(&community).Update("banner_url", result.URL)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}
