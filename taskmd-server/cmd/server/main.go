package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/tktomaru/taskai/taskai-server/internal/api"
	"github.com/tktomaru/taskai/taskai-server/internal/config"
	"github.com/tktomaru/taskai/taskai-server/internal/database"
	"github.com/tktomaru/taskai/taskai-server/internal/search"
	"github.com/tktomaru/taskai/taskai-server/internal/websocket"
)

const banner = `
████████╗ █████╗ ███████╗██╗  ██╗███╗   ███╗██████╗
╚══██╔══╝██╔══██╗██╔════╝██║ ██╔╝████╗ ████║██╔══██╗
   ██║   ███████║███████╗█████╔╝ ██╔████╔██║██║  ██║
   ██║   ██╔══██║╚════██║██╔═██╗ ██║╚██╔╝██║██║  ██║
   ██║   ██║  ██║███████║██║  ██╗██║ ╚═╝ ██║██████╔╝
   ╚═╝   ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝╚═════╝

   TaskMD Server - Markdown-first Task Management
   Version: 0.1.0 (MVP)`

func main() {
	// Print banner
	fmt.Println(banner)

	// Load configuration
	log.Println("Loading configuration...")
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}
	log.Printf("Configuration loaded successfully")
	log.Printf("Server: %s:%d", cfg.Server.Host, cfg.Server.Port)
	log.Printf("Database: %s@%s:%d/%s", cfg.Database.User, cfg.Database.Host, cfg.Database.Port, cfg.Database.DBName)

	// Connect to database
	log.Println("Connecting to database...")
	db, err := database.New(&cfg.Database)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()
	log.Println("Database connection established")

	// Connect to Meilisearch (optional)
	var meili *search.MeilisearchClient
	meilisearchHost := os.Getenv("MEILISEARCH_HOST")
	if meilisearchHost != "" {
		log.Println("Connecting to Meilisearch...")
		meilisearchKey := os.Getenv("MEILISEARCH_KEY")
		var err error
		meili, err = search.NewMeilisearchClient(meilisearchHost, meilisearchKey, "tasks")
		if err != nil {
			log.Printf("WARNING: Failed to connect to Meilisearch: %v", err)
			log.Println("Continuing without Meilisearch...")
		} else {
			log.Println("Meilisearch connection established")
		}
	} else {
		log.Println("Meilisearch not configured, using PostgreSQL full-text search")
	}

	// Initialize WebSocket hub
	log.Println("Initializing WebSocket hub...")
	wsHub := websocket.NewHub()
	go wsHub.Run()
	log.Println("WebSocket hub started")

	// Create HTTP server
	log.Println("Initializing HTTP server...")
	apiServer := api.NewServer(cfg, db, meili, wsHub)

	addr := fmt.Sprintf("%s:%d", cfg.Server.Host, cfg.Server.Port)
	server := &http.Server{
		Addr:         addr,
		Handler:      apiServer.Router(),
		ReadTimeout:  cfg.Server.ReadTimeout,
		WriteTimeout: cfg.Server.WriteTimeout,
	}

	// Start server in a goroutine
	go func() {
		log.Printf("Starting HTTP server on %s", addr)
		log.Printf("Health check: http://%s/healthz", addr)
		log.Printf("API base URL: http://%s/api/v1", addr)

		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")

	// Graceful shutdown
	ctx, cancel := context.WithTimeout(context.Background(), cfg.Server.ShutdownTimeout)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Printf("Server forced to shutdown: %v", err)
	}

	// Wait for any remaining tasks
	time.Sleep(time.Second)

	log.Println("Server stopped gracefully")
}
