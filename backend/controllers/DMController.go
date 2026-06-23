package controllers

import (
    "bytefeed-backend/config"
    "bytefeed-backend/models"
    "encoding/json"
    "net/http"
    "sort"
)

// GetDMList returns a list of users the caller has direct‑message history with.
// GET /api/dm
func GetDMList(w http.ResponseWriter, r *http.Request) {
    callerID := getUserIDFromCtx(r)

    // Find all messages where the caller is either sender or receiver.
    var sent []models.Message
    var received []models.Message
    config.DB.Where("sender_id = ?", callerID).Find(&sent)
    config.DB.Where("receiver_id = ?", callerID).Find(&received)

    partnerSet := make(map[uint]struct{})
    for _, m := range sent {
        if m.ReceiverID != nil && *m.ReceiverID != 0 {
            partnerSet[*m.ReceiverID] = struct{}{}
        }
    }
    for _, m := range received {
        if m.SenderID != 0 {
            partnerSet[m.SenderID] = struct{}{}
        }
    }

    // Load user records for each partner.
    var partners []models.User
    for id := range partnerSet {
        var u models.User
        if err := config.DB.First(&u, id).Error; err == nil {
            partners = append(partners, u)
        }
    }

    // Deterministic order.
    sort.Slice(partners, func(i, j int) bool { return partners[i].ID < partners[j].ID })

    // Shape the response.
    type resp struct {
        UserID   uint   `json:"userId"`
        Username string `json:"username"`
        Avatar   string `json:"avatarUrl,omitempty"`
    }
    out := make([]resp, 0, len(partners))
    for _, u := range partners {
        out = append(out, resp{UserID: u.ID, Username: u.Username, Avatar: u.PfpUrl})
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(out)
}
