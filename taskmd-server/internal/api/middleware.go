package api

import (
	"fmt"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/tktomaru/taskai/taskai-server/internal/config"
)

// LoggerMiddleware logs HTTP requests
func LoggerMiddleware(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		query := c.Request.URL.RawQuery

		c.Next()

		latency := time.Since(start)
		statusCode := c.Writer.Status()
		method := c.Request.Method
		clientIP := c.ClientIP()

		if query != "" {
			path = path + "?" + query
		}

		// Simple logging (replace with structured logger in production)
		if cfg.Logging.Format == "json" {
			fmt.Printf(`{"time":"%s","status":%d,"latency":"%s","ip":"%s","method":"%s","path":"%s"}%s`,
				time.Now().Format(time.RFC3339),
				statusCode,
				latency,
				clientIP,
				method,
				path,
				"\n",
			)
		} else {
			fmt.Printf("[%s] %d | %13v | %15s | %-7s %s\n",
				time.Now().Format("2006/01/02 15:04:05"),
				statusCode,
				latency,
				clientIP,
				method,
				path,
			)
		}
	}
}

// CORSMiddleware handles Cross-Origin Resource Sharing
func CORSMiddleware(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")

		// Check if origin is allowed
		allowed := false
		for _, allowedOrigin := range cfg.Server.CORSOrigins {
			if allowedOrigin == "*" || allowedOrigin == origin {
				allowed = true
				break
			}
		}

		if allowed {
			if origin != "" {
				c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
			} else if len(cfg.Server.CORSOrigins) > 0 {
				c.Writer.Header().Set("Access-Control-Allow-Origin", cfg.Server.CORSOrigins[0])
			}

			c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
			c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
			c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE, PATCH")
			c.Writer.Header().Set("Access-Control-Max-Age", "86400")
		}

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}

// AuthMiddleware validates JWT tokens (placeholder)
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// TODO: Implement JWT validation
		// For now, just pass through
		c.Next()
	}
}

// RateLimitMiddleware implements rate limiting (placeholder)
func RateLimitMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// TODO: Implement rate limiting using Redis or in-memory store
		c.Next()
	}
}
