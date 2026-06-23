package controllers

import (
	"bytefeed-backend/config"
	"bytefeed-backend/models"
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
)

// CreatePost godoc
// POST /api/posts
func CreatePost(w http.ResponseWriter, r *http.Request) {
	authorID := getUserIDFromCtx(r)

	var req struct {
		Title       string   `json:"title"`
		Content     string   `json:"content"`
		Tags        []string `json:"tags"`
		CommunityID *uint    `json:"communityId"` // nil = standalone feed post
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	if req.Content == "" {
		http.Error(w, "Content is required", http.StatusBadRequest)
		return
	}

	// If posting to a community, verify membership
	if req.CommunityID != nil {
		var member models.CommunityMember
		if err := config.DB.Where("community_id = ? AND user_id = ?", *req.CommunityID, authorID).
			First(&member).Error; err != nil {
			http.Error(w, "You must be a member to post in this community", http.StatusForbidden)
			return
		}
	}

	post := models.Post{
		AuthorID:    authorID,
		Title:       req.Title,
		Content:     req.Content,
		Tags:        req.Tags,
		CommunityID: req.CommunityID,
	}
	if err := config.DB.Create(&post).Error; err != nil {
		http.Error(w, "Failed to create post", http.StatusInternalServerError)
		return
	}

	config.DB.Preload("Author").First(&post, post.ID)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(post)
}

// GetFeed godoc
// GET /api/posts/feed?filter=global|interests&page=1&limit=20
func GetFeed(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)
	filter := r.URL.Query().Get("filter") // "interests" or "global" (default)
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 50 {
		limit = 20
	}
	offset := (page - 1) * limit

	query := config.DB.Preload("Author").Where("community_id IS NULL").
		Order("created_at DESC").Limit(limit).Offset(offset)

	if filter == "interests" {
		var user models.User
		config.DB.First(&user, userID)
		if len(user.Interests) > 0 {
			// Find posts where any tag matches any user interest
			query = query.Where("tags::jsonb ?| array[?]", user.Interests)
		}
	}

	var posts []models.Post
	query.Find(&posts)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(posts)
}

// GetPost godoc
// GET /api/posts/{id}
func GetPost(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	var post models.Post
	if err := config.DB.Preload("Author").Preload("Community").First(&post, id).Error; err != nil {
		http.Error(w, "Post not found", http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(post)
}

// GetUserPosts godoc
// GET /api/users/{id}/posts
func GetUserPosts(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	var posts []models.Post
	config.DB.Preload("Author").Where("author_id = ?", id).
		Order("created_at DESC").Limit(20).Offset((page - 1) * 20).Find(&posts)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(posts)
}

// UpdatePost godoc
// PUT /api/posts/{id}
func UpdatePost(w http.ResponseWriter, r *http.Request) {
	callerID := getUserIDFromCtx(r)
	id := mux.Vars(r)["id"]

	var post models.Post
	if err := config.DB.First(&post, id).Error; err != nil {
		http.Error(w, "Post not found", http.StatusNotFound)
		return
	}
	if post.AuthorID != callerID {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	var req struct {
		Title   string   `json:"title"`
		Content string   `json:"content"`
		Tags    []string `json:"tags"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	updates := map[string]interface{}{}
	if req.Title != "" {
		updates["title"] = req.Title
	}
	if req.Content != "" {
		updates["content"] = req.Content
	}
	if req.Tags != nil {
		updates["tags"] = req.Tags
	}

	config.DB.Model(&post).Updates(updates)
	config.DB.Preload("Author").First(&post, id)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(post)
}

// DeletePost godoc
// DELETE /api/posts/{id}
func DeletePost(w http.ResponseWriter, r *http.Request) {
	callerID := getUserIDFromCtx(r)
	id := mux.Vars(r)["id"]

	var post models.Post
	if err := config.DB.First(&post, id).Error; err != nil {
		http.Error(w, "Post not found", http.StatusNotFound)
		return
	}
	if post.AuthorID != callerID {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	config.DB.Delete(&post)
	w.WriteHeader(http.StatusNoContent)
}

// VotePost godoc
// POST /api/posts/{id}/vote   body: {"value": 1} or {"value": -1}
func VotePost(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)
	postID := mux.Vars(r)["id"]

	var post models.Post
	if err := config.DB.First(&post, postID).Error; err != nil {
		http.Error(w, "Post not found", http.StatusNotFound)
		return
	}

	var body struct {
		Value int `json:"value"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || (body.Value != 1 && body.Value != -1) {
		http.Error(w, "Value must be 1 (upvote) or -1 (downvote)", http.StatusBadRequest)
		return
	}

	var vote models.Vote
	err := config.DB.Where("user_id = ? AND target_id = ? AND target_type = 'post'", userID, post.ID).
		First(&vote).Error

	if err == nil {
		// Existing vote — change or remove
		if vote.Value == body.Value {
			// Same vote again → remove vote
			if vote.Value == 1 {
				config.DB.Model(&post).Update("up_votes", post.UpVotes-1)
			} else {
				config.DB.Model(&post).Update("down_votes", post.DownVotes-1)
			}
			config.DB.Delete(&vote)
			w.WriteHeader(http.StatusNoContent)
			return
		}
		// Switching vote direction
		oldVal := vote.Value
		config.DB.Model(&vote).Update("value", body.Value)
		if oldVal == 1 {
			config.DB.Model(&post).Updates(map[string]interface{}{
				"up_votes":   post.UpVotes - 1,
				"down_votes": post.DownVotes + 1,
			})
		} else {
			config.DB.Model(&post).Updates(map[string]interface{}{
				"up_votes":   post.UpVotes + 1,
				"down_votes": post.DownVotes - 1,
			})
		}
	} else {
		// New vote
		config.DB.Create(&models.Vote{
			UserID:     userID,
			TargetID:   post.ID,
			TargetType: "post",
			Value:      body.Value,
		})
		if body.Value == 1 {
			config.DB.Model(&post).Update("up_votes", post.UpVotes+1)
		} else {
			config.DB.Model(&post).Update("down_votes", post.DownVotes+1)
		}
	}

	config.DB.First(&post, post.ID)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(post)
}

// SavePost godoc
// POST /api/posts/{id}/save   (toggle)
func SavePost(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)
	postID := mux.Vars(r)["id"]

	var post models.Post
	if err := config.DB.First(&post, postID).Error; err != nil {
		http.Error(w, "Post not found", http.StatusNotFound)
		return
	}

	var saved models.SavedPost
	err := config.DB.Where("user_id = ? AND post_id = ?", userID, post.ID).First(&saved).Error
	if err == nil {
		// Already saved → unsave
		config.DB.Delete(&saved)
		config.DB.Model(&post).Update("saves", post.Saves-1)
		w.WriteHeader(http.StatusNoContent)
		return
	}

	config.DB.Create(&models.SavedPost{UserID: userID, PostID: post.ID})
	config.DB.Model(&post).Update("saves", post.Saves+1)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"status": "saved"})
}

// UploadPostImage godoc
// POST /api/posts/{id}/image   multipart/form-data key: "file"
func UploadPostImage(w http.ResponseWriter, r *http.Request) {
	callerID := getUserIDFromCtx(r)
	id := mux.Vars(r)["id"]

	var post models.Post
	if err := config.DB.First(&post, id).Error; err != nil {
		http.Error(w, "Post not found", http.StatusNotFound)
		return
	}
	if post.AuthorID != callerID {
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

	result, err := config.UploadFile(file, "posts")
	if err != nil {
		http.Error(w, "Upload failed: "+err.Error(), http.StatusInternalServerError)
		return
	}

	newUrls := append(post.ImageUrls, result.URL)
	config.DB.Model(&post).Update("image_urls", newUrls)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}
