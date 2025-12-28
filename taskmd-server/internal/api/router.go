package api

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/tktomaru/taskai/taskai-server/internal/config"
	"github.com/tktomaru/taskai/taskai-server/internal/database"
	"github.com/tktomaru/taskai/taskai-server/internal/search"
	"github.com/tktomaru/taskai/taskai-server/internal/websocket"
)

// Server represents the HTTP server
type Server struct {
	cfg    *config.Config
	db     *database.DB
	meili  *search.MeilisearchClient
	wsHub  *websocket.Hub
	router *gin.Engine
}

// NewServer creates a new HTTP server
func NewServer(cfg *config.Config, db *database.DB, meili *search.MeilisearchClient, wsHub *websocket.Hub) *Server {
	// Set Gin mode based on log level
	if cfg.Logging.Level == "debug" {
		gin.SetMode(gin.DebugMode)
	} else {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()

	// Middleware
	router.Use(gin.Recovery())
	router.Use(LoggerMiddleware(cfg))
	router.Use(CORSMiddleware(cfg))

	s := &Server{
		cfg:    cfg,
		db:     db,
		meili:  meili,
		wsHub:  wsHub,
		router: router,
	}

	s.setupRoutes()

	return s
}

// setupRoutes configures all API routes
func (s *Server) setupRoutes() {
	// Health check
	s.router.GET("/healthz", s.handleHealthCheck)
	s.router.GET("/readyz", s.handleReadyCheck)

	// API v1 routes
	v1 := s.router.Group("/api/v1")
	{
		// Public auth endpoints
		auth := v1.Group("/auth")
		{
			auth.POST("/register", s.handleRegister)
			auth.POST("/login", s.handleLogin)
			auth.POST("/logout", s.handleLogout)
			auth.GET("/me", s.AuthMiddleware(), s.handleGetCurrentUser)
		}

		// Protected routes (require authentication)
		protected := v1.Group("")
		protected.Use(s.OptionalAuthMiddleware()) // Optional for now, can be changed to AuthMiddleware() for strict auth
		{
			// Projects
			projects := protected.Group("/projects")
			{
				projects.GET("", s.handleListProjects)
				projects.POST("", s.handleCreateProject)
				projects.GET("/:projectId", s.handleGetProject)
				projects.PUT("/:projectId", s.handleUpdateProject)
				projects.DELETE("/:projectId", s.handleDeleteProject)

				// Tasks
				tasks := projects.Group("/:projectId/tasks")
				{
					tasks.GET("", s.handleListTasks)
					tasks.POST("", s.handleCreateTask)
					tasks.GET("/:taskId", s.handleGetTask)
					tasks.PUT("/:taskId", s.handleUpdateTask)
					tasks.DELETE("/:taskId", s.handleDeleteTask)

					// Task Revisions
					tasks.GET("/:taskId/revisions", s.handleGetTaskRevisions)
					tasks.GET("/:taskId/revisions/:revId/compare", s.handleCompareWithCurrent)
				}

				// Saved Views
				views := projects.Group("/:projectId/views")
				{
					views.GET("", s.handleListViews)
					views.POST("", s.handleCreateView)
					views.GET("/:viewId", s.handleGetView)
					views.PUT("/:viewId", s.handleUpdateView)
					views.DELETE("/:viewId", s.handleDeleteView)
					views.POST("/:viewId/execute", s.handleExecuteView)
				}
			}

			// Task Packs (AI handoff)
			protected.POST("/task-packs", s.handleGenerateTaskPack)

			// Search
			protected.POST("/search", s.handleSearch)

			// Reindex
			protected.POST("/projects/:projectId/reindex", s.handleReindexProject)

			// Revisions (standalone)
			revisions := protected.Group("/revisions")
			{
				revisions.GET("/:revId", s.handleGetRevision)
				revisions.GET("/compare", s.handleCompareRevisions)
			}

			// WebSocket
			protected.GET("/ws/stats", s.handleWebSocketStats)
		}

		// WebSocket endpoint (per project)
		v1.GET("/projects/:projectId/ws", s.OptionalAuthMiddleware(), s.handleWebSocket)
	}
}

// Router returns the gin.Engine
func (s *Server) Router() *gin.Engine {
	return s.router
}

// Health check handlers

func (s *Server) handleHealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status": "ok",
		"time":   time.Now().UTC(),
	})
}

func (s *Server) handleReadyCheck(c *gin.Context) {
	// Check database connectivity
	if err := s.db.HealthCheck(c.Request.Context()); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"status": "unavailable",
			"error":  "database not ready",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "ready",
		"time":   time.Now().UTC(),
	})
}
