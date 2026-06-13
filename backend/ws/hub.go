package ws

import (
	"fmt"
	"strconv"
	"strings"
	"sync"
)

type Hub struct {
	rooms map[string]*Room
	mu    sync.RWMutex
}

var GlobalHub = &Hub{
	rooms: make(map[string]*Room),
}

func (h *Hub) GetOrCreateRoom(roomID string) *Room {
	h.mu.RLock()
	if room, ok := h.rooms[roomID]; ok {
		h.mu.RUnlock()
		return room
	}
	h.mu.RUnlock()

	h.mu.Lock()
	defer h.mu.Unlock()
	if room, ok := h.rooms[roomID]; ok {
		return room
	}
	room := newRoom(roomID)
	h.rooms[roomID] = room
	go room.run()
	return room
}

func (h *Hub) removeRoom(roomID string) {
	h.mu.Lock()
	delete(h.rooms, roomID)
	h.mu.Unlock()
}

func ChannelRoomID(channelID uint) string {
	return fmt.Sprintf("channel_%d", channelID)
}

func DMRoomID(userA, userB uint) string {
	lo, hi := userA, userB
	if lo > hi {
		lo, hi = hi, lo
	}
	return fmt.Sprintf("dm_%d_%d", lo, hi)
}

func parseRoomID(roomID string) (channelID uint, otherUserID uint) {
	if strings.HasPrefix(roomID, "channel_") {
		id, _ := strconv.ParseUint(strings.TrimPrefix(roomID, "channel_"), 10, 64)
		return uint(id), 0
	}
	if strings.HasPrefix(roomID, "dm_") {
		parts := strings.SplitN(strings.TrimPrefix(roomID, "dm_"), "_", 2)
		if len(parts) == 2 {
			a, _ := strconv.ParseUint(parts[0], 10, 64)
			b, _ := strconv.ParseUint(parts[1], 10, 64)

			return 0, uint(a + b)
		}
	}
	return 0, 0
}

func ParseDMUserIDs(roomID string) (uint, uint, bool) {
	if !strings.HasPrefix(roomID, "dm_") {
		return 0, 0, false
	}
	parts := strings.SplitN(strings.TrimPrefix(roomID, "dm_"), "_", 2)
	if len(parts) != 2 {
		return 0, 0, false
	}
	a, err1 := strconv.ParseUint(parts[0], 10, 64)
	b, err2 := strconv.ParseUint(parts[1], 10, 64)
	if err1 != nil || err2 != nil {
		return 0, 0, false
	}
	return uint(a), uint(b), true
}
