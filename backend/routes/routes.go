package routes

import (
	"bytefeed-backend/controllers"
	"bytefeed-backend/middleware"
	"bytefeed-backend/ws"
	"net/http"

	"github.com/gorilla/mux"
)

// RegisterRoutes sets up all API routes on the given mux router.
func RegisterRoutes(r *mux.Router) {
	api := r.PathPrefix("/api").Subrouter()

	// Auth (public)
	auth := api.PathPrefix("/auth").Subrouter()
	auth.HandleFunc("/register", controllers.Register).Methods(http.MethodPost)
	auth.HandleFunc("/login", controllers.Login).Methods(http.MethodPost)

	// Protected routes (require JWT)
	protected := api.NewRoute().Subrouter()
	protected.Use(middleware.AuthMiddleware)

	// Users
	protected.HandleFunc("/users/me", controllers.GetMe).Methods(http.MethodGet)
	protected.HandleFunc("/users/me/avatar", controllers.UploadAvatar).Methods(http.MethodPost)
	protected.HandleFunc("/users/me/banner", controllers.UploadBanner).Methods(http.MethodPost)
	protected.HandleFunc("/users/me/saved", controllers.GetSavedPosts).Methods(http.MethodGet)
	protected.HandleFunc("/users/me/friend-requests", controllers.GetFriendRequests).Methods(http.MethodGet)
	protected.HandleFunc("/users/me/communities", controllers.GetMyCommunities).Methods(http.MethodGet)
	protected.HandleFunc("/users/me/friends", controllers.GetMyFriends).Methods(http.MethodGet)
	protected.HandleFunc("/users/search", controllers.SearchUsers).Methods(http.MethodGet)
	protected.HandleFunc("/users/{id}", controllers.GetUser).Methods(http.MethodGet)
	protected.HandleFunc("/users/{id}", controllers.UpdateUser).Methods(http.MethodPut)
	protected.HandleFunc("/users/{id}", controllers.DeleteUser).Methods(http.MethodDelete)
	protected.HandleFunc("/users/{id}/posts", controllers.GetUserPosts).Methods(http.MethodGet)
	protected.HandleFunc("/users/{id}/friends", controllers.GetFriends).Methods(http.MethodGet)
	protected.HandleFunc("/users/{id}/friends/{friendId}", controllers.RemoveFriend).Methods(http.MethodDelete)
	protected.HandleFunc("/users/{id}/friend-request", controllers.SendFriendRequest).Methods(http.MethodPost)

	// Friend requests
	protected.HandleFunc("/friend-requests/{id}", controllers.RespondFriendRequest).Methods(http.MethodPut)

	// Posts
	protected.HandleFunc("/posts/feed", controllers.GetFeed).Methods(http.MethodGet)
	protected.HandleFunc("/posts", controllers.CreatePost).Methods(http.MethodPost)
	protected.HandleFunc("/posts/{id}", controllers.GetPost).Methods(http.MethodGet)
	protected.HandleFunc("/posts/{id}", controllers.UpdatePost).Methods(http.MethodPut)
	protected.HandleFunc("/posts/{id}", controllers.DeletePost).Methods(http.MethodDelete)
	protected.HandleFunc("/posts/{id}/vote", controllers.VotePost).Methods(http.MethodPost)
	protected.HandleFunc("/posts/{id}/save", controllers.SavePost).Methods(http.MethodPost)
	protected.HandleFunc("/posts/{id}/image", controllers.UploadPostImage).Methods(http.MethodPost)
	protected.HandleFunc("/posts/{id}/comments", controllers.GetComments).Methods(http.MethodGet)
	protected.HandleFunc("/posts/{id}/comments", controllers.CreateComment).Methods(http.MethodPost)

	// Comments
	protected.HandleFunc("/comments/{id}", controllers.UpdateComment).Methods(http.MethodPut)
	protected.HandleFunc("/comments/{id}", controllers.DeleteComment).Methods(http.MethodDelete)
	protected.HandleFunc("/comments/{id}/vote", controllers.VoteComment).Methods(http.MethodPost)

	// Communities
	protected.HandleFunc("/communities/search", controllers.SearchCommunities).Methods(http.MethodGet)
	protected.HandleFunc("/communities", controllers.CreateCommunity).Methods(http.MethodPost)
	protected.HandleFunc("/communities/{id}", controllers.GetCommunity).Methods(http.MethodGet)
	protected.HandleFunc("/communities/{id}", controllers.UpdateCommunity).Methods(http.MethodPut)
	protected.HandleFunc("/communities/{id}", controllers.DeleteCommunity).Methods(http.MethodDelete)
	protected.HandleFunc("/communities/{id}/join", controllers.JoinCommunity).Methods(http.MethodPost)
	protected.HandleFunc("/communities/{id}/leave", controllers.LeaveCommunity).Methods(http.MethodDelete)
	protected.HandleFunc("/communities/{id}/members", controllers.GetMembers).Methods(http.MethodGet)
	protected.HandleFunc("/communities/{id}/posts", controllers.GetCommunityPosts).Methods(http.MethodGet)
	protected.HandleFunc("/communities/{id}/icon", controllers.UploadCommunityIcon).Methods(http.MethodPost)
	protected.HandleFunc("/communities/{id}/banner", controllers.UploadCommunityBanner).Methods(http.MethodPost)
	protected.HandleFunc("/communities/{id}/channels", controllers.GetCommunityChannels).Methods(http.MethodGet)
	protected.HandleFunc("/communities/{id}/channels", controllers.CreateChannel).Methods(http.MethodPost)

	// Channels
	protected.HandleFunc("/channels/{id}", controllers.GetChannel).Methods(http.MethodGet)
	protected.HandleFunc("/channels/{id}", controllers.UpdateChannel).Methods(http.MethodPut)
	protected.HandleFunc("/channels/{id}", controllers.DeleteChannel).Methods(http.MethodDelete)
	protected.HandleFunc("/channels/{id}/messages", controllers.GetChannelMessages).Methods(http.MethodGet)
	protected.HandleFunc("/channels/{id}/voice-token", controllers.GetVoiceToken).Methods(http.MethodGet)

	// Messages
	protected.HandleFunc("/messages", controllers.SendMessage).Methods(http.MethodPost)
	protected.HandleFunc("/messages/upload", controllers.UploadMessageMedia).Methods(http.MethodPost)
	protected.HandleFunc("/messages/{id}", controllers.EditMessage).Methods(http.MethodPut)
	protected.HandleFunc("/messages/{id}", controllers.DeleteMessage).Methods(http.MethodDelete)
	protected.HandleFunc("/dm/{userId}", controllers.GetDMHistory).Methods(http.MethodGet)
	protected.HandleFunc("/dm", controllers.GetDMList).Methods(http.MethodGet)
	protected.HandleFunc("/dm/{userId}/call-token", controllers.GetDMCallToken).Methods(http.MethodGet)

	// ── WebSocket (auth handled inside handler via ?token=<jwt>) ──────────────
	// WS routes are on the root router (not the /api subrouter) and do NOT go
	// through AuthMiddleware — WS handshakes can't carry custom headers reliably.
	r.HandleFunc("/ws/channel/{id}", ws.HandleChannelWS)
	r.HandleFunc("/ws/dm/{userId}", ws.HandleDMWS)
}
