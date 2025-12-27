package api

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/tktomaru/taskai/taskai-server/internal/repository"
	"github.com/tktomaru/taskai/taskai-server/internal/service"
)

// handleLogin handles POST /api/v1/auth/login
func (s *Server) handleLogin(c *gin.Context) {
	var req service.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid_request",
			"message": "Invalid request body",
			"details": err.Error(),
		})
		return
	}

	authService := service.NewAuthService(
		repository.NewUserRepository(s.db.DB),
		s.cfg.Auth.JWTSecret,
		s.cfg.Auth.JWTExpiresIn,
	)

	response, err := authService.Login(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "authentication_failed",
			"message": err.Error(),
		})
		return
	}

	// Set cookie
	c.SetCookie(
		"token",
		response.Token,
		int(s.cfg.Auth.JWTExpiresIn.Seconds()),
		"/",
		"",
		false, // secure (set to true in production with HTTPS)
		true,  // httpOnly
	)

	c.JSON(http.StatusOK, gin.H{
		"data": response,
	})
}

// handleLogout handles POST /api/v1/auth/logout
func (s *Server) handleLogout(c *gin.Context) {
	// Clear cookie
	c.SetCookie(
		"token",
		"",
		-1,
		"/",
		"",
		false,
		true,
	)

	c.JSON(http.StatusOK, gin.H{
		"message": "Logged out successfully",
	})
}

// handleGetCurrentUser handles GET /api/v1/auth/me
func (s *Server) handleGetCurrentUser(c *gin.Context) {
	// Get user from context (set by auth middleware)
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "unauthorized",
			"message": "Authentication required",
		})
		return
	}

	authService := service.NewAuthService(
		repository.NewUserRepository(s.db.DB),
		s.cfg.Auth.JWTSecret,
		s.cfg.Auth.JWTExpiresIn,
	)

	user, err := authService.GetUserByID(c.Request.Context(), userID.(string))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "user_not_found",
			"message": "User not found",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": user,
	})
}

// handleRegister handles POST /api/v1/auth/register
func (s *Server) handleRegister(c *gin.Context) {
	var req service.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid_request",
			"message": "Invalid request body",
			"details": err.Error(),
		})
		return
	}

	authService := service.NewAuthService(
		repository.NewUserRepository(s.db.DB),
		s.cfg.Auth.JWTSecret,
		s.cfg.Auth.JWTExpiresIn,
	)

	response, err := authService.Register(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "registration_failed",
			"message": err.Error(),
		})
		return
	}

	// Set cookie
	c.SetCookie(
		"token",
		response.Token,
		int(s.cfg.Auth.JWTExpiresIn.Seconds()),
		"/",
		"",
		false, // secure
		true,  // httpOnly
	)

	c.JSON(http.StatusCreated, gin.H{
		"data": response,
	})
}

// AuthMiddleware validates JWT tokens
func (s *Server) AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Try to get token from cookie first
		token, err := c.Cookie("token")

		// If not in cookie, try Authorization header
		if err != nil || token == "" {
			authHeader := c.GetHeader("Authorization")
			if authHeader == "" {
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
					"error":   "unauthorized",
					"message": "Authentication required",
				})
				return
			}

			// Extract Bearer token
			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) != 2 || parts[0] != "Bearer" {
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
					"error":   "unauthorized",
					"message": "Invalid authorization header format",
				})
				return
			}

			token = parts[1]
		}

		// Validate token
		authService := service.NewAuthService(
			repository.NewUserRepository(s.db.DB),
			s.cfg.Auth.JWTSecret,
			s.cfg.Auth.JWTExpiresIn,
		)

		user, err := authService.ValidateToken(token)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error":   "unauthorized",
				"message": "Invalid or expired token",
			})
			return
		}

		// Set user in context
		c.Set("user_id", user.ID)
		c.Set("user_email", user.Email)
		c.Set("user", user)

		c.Next()
	}
}

// OptionalAuthMiddleware validates JWT tokens but doesn't require them
func (s *Server) OptionalAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Try to get token
		token, _ := c.Cookie("token")

		if token == "" {
			authHeader := c.GetHeader("Authorization")
			if authHeader != "" {
				parts := strings.SplitN(authHeader, " ", 2)
				if len(parts) == 2 && parts[0] == "Bearer" {
					token = parts[1]
				}
			}
		}

		// If token exists, validate it
		if token != "" {
			authService := service.NewAuthService(
				repository.NewUserRepository(s.db.DB),
				s.cfg.Auth.JWTSecret,
				s.cfg.Auth.JWTExpiresIn,
			)

			user, err := authService.ValidateToken(token)
			if err == nil {
				c.Set("user_id", user.ID)
				c.Set("user_email", user.Email)
				c.Set("user", user)
			}
		}

		c.Next()
	}
}
