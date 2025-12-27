package websocket

import (
	"encoding/json"
	"log"
	"sync"
)

// EventType represents the type of WebSocket event
type EventType string

const (
	EventTaskCreated EventType = "task.created"
	EventTaskUpdated EventType = "task.updated"
	EventTaskDeleted EventType = "task.deleted"
	EventProjectUpdated EventType = "project.updated"
)

// Message represents a WebSocket message
type Message struct {
	Type      EventType   `json:"type"`
	ProjectID string      `json:"project_id,omitempty"`
	TaskID    string      `json:"task_id,omitempty"`
	Data      interface{} `json:"data,omitempty"`
}

// Hub maintains the set of active clients and broadcasts messages to them
type Hub struct {
	// Registered clients by project ID
	clients map[string]map[*Client]bool

	// Register requests from clients
	Register chan *Client

	// Unregister requests from clients
	Unregister chan *Client

	// Broadcast messages to clients (internal use)
	broadcast chan *Message

	// Mutex for thread-safe access
	mu sync.RWMutex
}

// NewHub creates a new WebSocket hub
func NewHub() *Hub {
	return &Hub{
		clients:    make(map[string]map[*Client]bool),
		Register:   make(chan *Client),
		Unregister: make(chan *Client),
		broadcast:  make(chan *Message, 256),
	}
}

// Run starts the hub's main loop
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.Register:
			h.registerClient(client)

		case client := <-h.Unregister:
			h.unregisterClient(client)

		case message := <-h.broadcast:
			h.broadcastMessage(message)
		}
	}
}

// registerClient registers a new client
func (h *Hub) registerClient(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if h.clients[client.ProjectID] == nil {
		h.clients[client.ProjectID] = make(map[*Client]bool)
	}
	h.clients[client.ProjectID][client] = true

	log.Printf("Client registered for project %s (total: %d)", client.ProjectID, len(h.clients[client.ProjectID]))
}

// unregisterClient unregisters a client
func (h *Hub) unregisterClient(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if clients, ok := h.clients[client.ProjectID]; ok {
		if _, ok := clients[client]; ok {
			delete(clients, client)
			close(client.send)

			if len(clients) == 0 {
				delete(h.clients, client.ProjectID)
			}

			log.Printf("Client unregistered from project %s (remaining: %d)", client.ProjectID, len(clients))
		}
	}
}

// broadcastMessage broadcasts a message to all clients in the project
func (h *Hub) broadcastMessage(message *Message) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	projectClients := h.clients[message.ProjectID]
	if projectClients == nil {
		return
	}

	// Convert message to JSON once
	data, err := json.Marshal(message)
	if err != nil {
		log.Printf("Error marshaling message: %v", err)
		return
	}

	// Send to all clients in the project
	for client := range projectClients {
		select {
		case client.send <- data:
		default:
			// Client's send channel is full, close it
			close(client.send)
			delete(projectClients, client)
		}
	}

	if len(projectClients) == 0 {
		delete(h.clients, message.ProjectID)
	}
}

// Broadcast sends a message to all clients in a project
func (h *Hub) Broadcast(eventType EventType, projectID string, taskID string, data interface{}) {
	message := &Message{
		Type:      eventType,
		ProjectID: projectID,
		TaskID:    taskID,
		Data:      data,
	}

	select {
	case h.broadcast <- message:
	default:
		log.Printf("Broadcast channel full, dropping message")
	}
}

// GetClientCount returns the number of connected clients for a project
func (h *Hub) GetClientCount(projectID string) int {
	h.mu.RLock()
	defer h.mu.RUnlock()

	if clients, ok := h.clients[projectID]; ok {
		return len(clients)
	}
	return 0
}
