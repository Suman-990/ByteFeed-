package models

import "time"

// Friendship is the junction table for accepted mutual friendships.
// When a FriendRequest is accepted, two rows are inserted: (A,B) and (B,A)
// so that querying "friends of user X" is a simple WHERE user_id = X.
type Friendship struct {
	UserID    uint      `gorm:"primaryKey;index" json:"userId"`
	FriendID  uint      `gorm:"primaryKey" json:"friendId"`
	CreatedAt time.Time `json:"createdAt"`
}
