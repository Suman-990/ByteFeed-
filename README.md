<div align="center">
  <h1>🌐 ByteFeed</h1>
  <p>A full-stack social media platform providing a Discord/Reddit-like experience with communities, channels, real-time messaging, and friend management.</p>

  <div>
    <img src="https://img.shields.io/badge/go-%2300ADD8.svg?style=for-the-badge&logo=go&logoColor=white" alt="Go" />
    <img src="https://img.shields.io/badge/postgres-%23316192.svg?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
    <img src="https://img.shields.io/badge/expo-1C1E24?style=for-the-badge&logo=expo&logoColor=#D04A37" alt="Expo" />
    <img src="https://img.shields.io/badge/react_native-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB" alt="React Native" />
    <img src="https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
    <img src="https://img.shields.io/badge/JWT-black?style=for-the-badge&logo=JSON%20web%20tokens" alt="JWT" />
    <img src="https://img.shields.io/badge/Cloudinary-3448C5?style=for-the-badge&logo=Cloudinary&logoColor=white" alt="Cloudinary" />
    <img src="https://img.shields.io/badge/LiveKit-FF5A1F?style=for-the-badge&logo=livekit&logoColor=white" alt="LiveKit" />
  </div>
</div>

---

## ✨ Features & Tech Stack

ByteFeed seamlessly integrates modern technologies to deliver a robust, scalable, and responsive user experience. 

*   **Mobile-First Frontend (Expo & React Native):** A smooth, cross-platform mobile application that provides native performance and a unified codebase.
*   **Beautiful UI (NativeWind & Tailwind CSS):** A custom, highly-responsive design system allowing for rapid UI iterations directly with utility classes.
*   **Scalable Backend API (Golang & Gorilla Mux):** The core REST API leverages Golang for high concurrency, memory safety, and lightning-fast request handling, routed efficiently by Gorilla Mux.
*   **Real-time Messaging (Gorilla WebSockets):** Live, seamless bidirectional communication for channel chats and direct messages (DMs) without persistent polling overhead.
*   **Relational Data Integrity (PostgreSQL & GORM):** A structured, strictly-typed SQL database manages complex entity relationships (users, communities, channels, posts, comments), abstracted through GORM for rapid development.
*   **Secure Authentication (JWT):** Stateless JSON Web Tokens handle all endpoint protections, user identity validation, and secure WebSocket handshakes.
*   **Media Management (Cloudinary):** Profile avatars, banners, and post image attachments are reliably uploaded, optimized, and served via Cloudinary's global CDN.
*   **Voice Channels & DM Calls (LiveKit):** Real-time voice communication powered by LiveKit's WebRTC infrastructure, enabling voice channels within communities and 1-on-1 DM calls between friends.
*   **Communities & Feeds:** Users can create topic-based communities with nested channels (text & voice), alongside a personalized global post feed with integrated upvoting/downvoting.
*   **Friend System:** Full social graph management, enabling users to send, accept, and manage friend connections securely.

---

## 📡 API Endpoints

### 🔐 Authentication
*   `POST /api/auth/register` - Register a new user
*   `POST /api/auth/login` - Authenticate user & receive JWT

### 👤 Users & Friend Requests
*   `GET /api/users/me` - Get current user profile
*   `POST /api/users/me/avatar` - Upload profile avatar
*   `POST /api/users/me/banner` - Upload profile banner
*   `GET /api/users/me/saved` - Get saved posts
*   `GET /api/users/me/friend-requests` - Get pending friend requests
*   `GET /api/users/{id}` - Get user profile by ID
*   `PUT /api/users/{id}` - Update user profile
*   `DELETE /api/users/{id}` - Delete user account
*   `GET /api/users/{id}/posts` - Get posts by user
*   `GET /api/users/{id}/friends` - Get user's friends
*   `DELETE /api/users/{id}/friends/{friendId}` - Remove a friend
*   `POST /api/users/{id}/friend-request` - Send a friend request
*   `PUT /api/friend-requests/{id}` - Accept/reject a friend request

### 📝 Posts & Comments
*   `GET /api/posts/feed` - Get personalized post feed
*   `POST /api/posts` - Create a new post
*   `GET /api/posts/{id}` - Get a specific post
*   `PUT /api/posts/{id}` - Update a post
*   `DELETE /api/posts/{id}` - Delete a post
*   `POST /api/posts/{id}/vote` - Upvote/downvote a post
*   `POST /api/posts/{id}/save` - Save/unsave a post
*   `POST /api/posts/{id}/image` - Upload an image to a post
*   `GET /api/posts/{id}/comments` - Get comments for a post
*   `POST /api/posts/{id}/comments` - Add a comment to a post
*   `PUT /api/comments/{id}` - Update a comment
*   `DELETE /api/comments/{id}` - Delete a comment
*   `POST /api/comments/{id}/vote` - Upvote/downvote a comment

### 🏙️ Communities & Channels
*   `GET /api/communities/search` - Search communities
*   `POST /api/communities` - Create a new community
*   `GET /api/communities/{id}` - Get community details
*   `PUT /api/communities/{id}` - Update a community
*   `DELETE /api/communities/{id}` - Delete a community
*   `POST /api/communities/{id}/join` - Join a community
*   `DELETE /api/communities/{id}/leave` - Leave a community
*   `GET /api/communities/{id}/members` - Get community members
*   `GET /api/communities/{id}/posts` - Get community posts
*   `POST /api/communities/{id}/icon` - Upload community icon
*   `POST /api/communities/{id}/banner` - Upload community banner
*   `GET /api/communities/{id}/channels` - Get channels in a community
*   `POST /api/communities/{id}/channels` - Create a channel in a community
*   `GET /api/channels/{id}` - Get channel details
*   `PUT /api/channels/{id}` - Update a channel
*   `DELETE /api/channels/{id}` - Delete a channel
*   `GET /api/channels/{id}/messages` - Get message history in a channel
*   `GET /api/channels/{id}/voice-token` - Get a LiveKit join token for a voice channel

### 📨 Messages & WebSockets (Real-time)
*   `POST /api/messages` - Send a message via REST
*   `POST /api/messages/upload` - Upload media for a message
*   `PUT /api/messages/{id}` - Edit a message
*   `DELETE /api/messages/{id}` - Delete a message
*   `GET /api/dm/{userId}` - Get DM history with a user
*   `GET /api/dm/{userId}/call-token` - Get a LiveKit join token for a DM voice call
*   `WS /ws/channel/{id}?token=<jwt>` - Connect to channel live chat
*   `WS /ws/dm/{userId}?token=<jwt>` - Connect to DM live chat

---

## 🚀 Getting Started

Follow these instructions to get the ByteFeed project up and running locally.

### Prerequisites
*   [Golang](https://go.dev/) (v1.25+)
*   [Node.js](https://nodejs.org/) (v18+)
*   [PostgreSQL](https://www.postgresql.org/)
*   [Expo CLI](https://docs.expo.dev/get-started/installation/)

### Backend Setup

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```
2. **Configure Environment Variables:**
   Create a `.env` file in the `backend` directory based on the `.env` requirements:
   ```env
   PORT=8080
   DB_URL=postgres://user:password@localhost:5432/bytefeed
   JWT_SECRET=your_jwt_secret
   CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>
   LIVEKIT_API_KEY=your-livekit-api-key
   LIVEKIT_API_SECRET=your-livekit-api-secret
   LIVEKIT_HOST=wss://your-project.livekit.cloud
   ```
3. **Install dependencies:**
   ```bash
   go mod tidy
   ```
4. **Run the server:**
   ```bash
   go run main.go
   ```
   *The backend should now be running on `http://localhost:8080`.*

### Frontend Setup

1. **Navigate to the frontend directory:**
   ```bash
   cd app-client/bytefeed
   ```
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Run the Expo development server:**
   ```bash
   npm start
   ```
   *This will open the Expo developer tools. You can press `a` to run on Android, `i` to run on iOS (macOS only), or scan the QR code with the Expo Go app on your physical device.*
