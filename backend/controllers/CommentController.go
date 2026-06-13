package controllers

import (
	"bytefeed-backend/config"
	"bytefeed-backend/models"
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
)

// POST /api/posts/{id}/comments
func CreateComment(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)
	postID := mux.Vars(r)["id"]

	var post models.Post
	if err := config.DB.First(&post, postID).Error; err != nil {
		http.Error(w, "Post not found", http.StatusNotFound)
		return
	}

	var req struct {
		Content  string `json:"content"`
		ParentID *uint  `json:"parentId"` // nil = top-level, set = reply
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Content == "" {
		http.Error(w, "Content is required", http.StatusBadRequest)
		return
	}

	// If reply, verify parent comment exists and belongs to same post
	if req.ParentID != nil {
		var parent models.Comment
		if err := config.DB.First(&parent, *req.ParentID).Error; err != nil || parent.PostID != post.ID {
			http.Error(w, "Parent comment not found in this post", http.StatusBadRequest)
			return
		}
	}

	comment := models.Comment{
		Content:  req.Content,
		UserID:   userID,
		PostID:   post.ID,
		ParentID: req.ParentID,
	}
	if err := config.DB.Create(&comment).Error; err != nil {
		http.Error(w, "Failed to create comment", http.StatusInternalServerError)
		return
	}

	config.DB.Preload("User").First(&comment, comment.ID)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(comment)
}

// GetComments godoc
// GET /api/posts/{id}/comments?page=1
// Returns top-level comments; replies are nested under "replies" field.
func GetComments(w http.ResponseWriter, r *http.Request) {
	postID := mux.Vars(r)["id"]
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}

	type CommentWithReplies struct {
		models.Comment
		Replies []models.Comment `json:"replies"`
	}

	// Fetch all comments for this post in one query
	var allComments []models.Comment
	config.DB.Preload("User").Where("post_id = ?", postID).
		Order("created_at ASC").Find(&allComments)

	// Separate top-level and replies
	replyMap := map[uint][]models.Comment{}
	var topLevel []models.Comment
	for _, c := range allComments {
		if c.ParentID == nil {
			topLevel = append(topLevel, c)
		} else {
			replyMap[*c.ParentID] = append(replyMap[*c.ParentID], c)
		}
	}

	// Paginate top-level
	start := (page - 1) * 20
	end := start + 20
	if start >= len(topLevel) {
		topLevel = []models.Comment{}
	} else if end > len(topLevel) {
		topLevel = topLevel[start:]
	} else {
		topLevel = topLevel[start:end]
	}

	result := make([]CommentWithReplies, 0, len(topLevel))
	for _, c := range topLevel {
		replies := replyMap[c.ID]
		if replies == nil {
			replies = []models.Comment{}
		}
		result = append(result, CommentWithReplies{Comment: c, Replies: replies})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// UpdateComment godoc
// PUT /api/comments/{id}
func UpdateComment(w http.ResponseWriter, r *http.Request) {
	callerID := getUserIDFromCtx(r)
	id := mux.Vars(r)["id"]

	var comment models.Comment
	if err := config.DB.First(&comment, id).Error; err != nil {
		http.Error(w, "Comment not found", http.StatusNotFound)
		return
	}
	if comment.UserID != callerID {
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

	config.DB.Model(&comment).Update("content", req.Content)
	config.DB.Preload("User").First(&comment, id)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(comment)
}

// DeleteComment godoc
// DELETE /api/comments/{id}
func DeleteComment(w http.ResponseWriter, r *http.Request) {
	callerID := getUserIDFromCtx(r)
	id := mux.Vars(r)["id"]

	var comment models.Comment
	if err := config.DB.First(&comment, id).Error; err != nil {
		http.Error(w, "Comment not found", http.StatusNotFound)
		return
	}
	if comment.UserID != callerID {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	// Soft-delete replies too
	config.DB.Where("parent_id = ?", comment.ID).Delete(&models.Comment{})
	config.DB.Delete(&comment)
	w.WriteHeader(http.StatusNoContent)
}

// VoteComment godoc
// POST /api/comments/{id}/vote   body: {"value": 1} or {"value": -1}
func VoteComment(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromCtx(r)
	commentID := mux.Vars(r)["id"]

	var comment models.Comment
	if err := config.DB.First(&comment, commentID).Error; err != nil {
		http.Error(w, "Comment not found", http.StatusNotFound)
		return
	}

	var body struct {
		Value int `json:"value"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || (body.Value != 1 && body.Value != -1) {
		http.Error(w, "Value must be 1 or -1", http.StatusBadRequest)
		return
	}

	var vote models.Vote
	err := config.DB.Where("user_id = ? AND target_id = ? AND target_type = 'comment'", userID, comment.ID).
		First(&vote).Error

	if err == nil {
		if vote.Value == body.Value {
			// Remove vote (toggle off)
			if vote.Value == 1 {
				config.DB.Model(&comment).Update("up_votes", comment.UpVotes-1)
			} else {
				config.DB.Model(&comment).Update("down_votes", comment.DownVotes-1)
			}
			config.DB.Delete(&vote)
			w.WriteHeader(http.StatusNoContent)
			return
		}
		// Switch direction
		oldVal := vote.Value
		config.DB.Model(&vote).Update("value", body.Value)
		if oldVal == 1 {
			config.DB.Model(&comment).Updates(map[string]interface{}{
				"up_votes":   comment.UpVotes - 1,
				"down_votes": comment.DownVotes + 1,
			})
		} else {
			config.DB.Model(&comment).Updates(map[string]interface{}{
				"up_votes":   comment.UpVotes + 1,
				"down_votes": comment.DownVotes - 1,
			})
		}
	} else {
		config.DB.Create(&models.Vote{
			UserID:     userID,
			TargetID:   comment.ID,
			TargetType: "comment",
			Value:      body.Value,
		})
		if body.Value == 1 {
			config.DB.Model(&comment).Update("up_votes", comment.UpVotes+1)
		} else {
			config.DB.Model(&comment).Update("down_votes", comment.DownVotes+1)
		}
	}

	config.DB.First(&comment, comment.ID)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(comment)
}
