package config

import (
	"fmt"
	"log"
	"os"
	"time"

	"github.com/livekit/protocol/auth"
)

// LiveKit credentials loaded from environment.
var (
	LiveKitAPIKey    string
	LiveKitAPISecret string
	LiveKitHost      string // e.g. "wss://your-project.livekit.cloud"
)

// ConnectLiveKit loads LiveKit credentials from env vars.
// Unlike DB/Cloudinary this doesn't open a persistent connection — it just
// validates that the required credentials are present.
func ConnectLiveKit() {
	LiveKitAPIKey = os.Getenv("LIVEKIT_API_KEY")
	LiveKitAPISecret = os.Getenv("LIVEKIT_API_SECRET")
	LiveKitHost = os.Getenv("LIVEKIT_HOST")

	if LiveKitAPIKey == "" || LiveKitAPISecret == "" || LiveKitHost == "" {
		log.Println("⚠️  LiveKit credentials not set — voice/call features will be disabled")
		return
	}
	fmt.Println("✅ LiveKit configured")
}

// GenerateJoinToken creates a LiveKit access token that allows the given
// identity (user) to join the specified room with audio/video permissions.
func GenerateJoinToken(room string, identity string, name string) (string, error) {
	if LiveKitAPIKey == "" || LiveKitAPISecret == "" {
		return "", fmt.Errorf("livekit is not configured — check env vars")
	}

	at := auth.NewAccessToken(LiveKitAPIKey, LiveKitAPISecret)

	grant := &auth.VideoGrant{
		RoomJoin: true,
		Room:     room,
	}

	at.SetVideoGrant(grant).
		SetIdentity(identity).
		SetName(name).
		SetValidFor(6 * time.Hour) // tokens valid for 6 hours

	return at.ToJWT()
}
