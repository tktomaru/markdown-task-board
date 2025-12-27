package api

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	ws "github.com/tktomaru/taskai/taskai-server/internal/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		// Allow all origins for now
		// In production, this should check against allowed origins
		return true
	},
}

// handleWebSocket handles WebSocket connections for real-time updates
// GET /api/v1/projects/:projectId/ws
func (s *Server) handleWebSocket(c *gin.Context) {
	projectID := c.Param("projectId")
	if projectID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid_request",
			"message": "Project ID is required",
		})
		return
	}

	// Get user ID from context (set by auth middleware)
	userID := ""
	if userIDVal, exists := c.Get("user_id"); exists {
		userID = userIDVal.(string)
	}

	// Upgrade HTTP connection to WebSocket
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("Failed to upgrade WebSocket: %v", err)
		return
	}

	// Create and register client
	client := ws.NewClient(s.wsHub, conn, projectID, userID)
	s.wsHub.Register <- client

	// Start client goroutines
	client.Start()

	log.Printf("WebSocket connection established for project %s (user: %s)", projectID, userID)
}

// handleWebSocketStats returns WebSocket connection statistics
// GET /api/v1/ws/stats
func (s *Server) handleWebSocketStats(c *gin.Context) {
	projectID := c.Query("project_id")

	stats := gin.H{
		"status": "ok",
	}

	if projectID != "" {
		stats["project_id"] = projectID
		stats["client_count"] = s.wsHub.GetClientCount(projectID)
	}

	c.JSON(http.StatusOK, stats)
}
