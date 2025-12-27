package websocket

import (
	"encoding/json"
	"testing"
	"time"
)

func TestNewHub(t *testing.T) {
	hub := NewHub()

	if hub == nil {
		t.Fatal("NewHub() returned nil")
	}

	if hub.clients == nil {
		t.Error("Hub clients map not initialized")
	}

	if hub.Register == nil {
		t.Error("Hub Register channel not initialized")
	}

	if hub.Unregister == nil {
		t.Error("Hub Unregister channel not initialized")
	}

	if hub.broadcast == nil {
		t.Error("Hub broadcast channel not initialized")
	}
}

func TestHub_RegisterClient(t *testing.T) {
	hub := NewHub()

	// Create a mock client
	client := &Client{
		ProjectID: "test-project",
		UserID:    "test-user",
		send:      make(chan []byte, 256),
	}

	// Register the client
	hub.registerClient(client)

	// Check if client is registered
	if hub.clients["test-project"] == nil {
		t.Error("Project not created in clients map")
	}

	if !hub.clients["test-project"][client] {
		t.Error("Client not registered")
	}

	// Check client count
	if hub.GetClientCount("test-project") != 1 {
		t.Errorf("GetClientCount() = %d, want 1", hub.GetClientCount("test-project"))
	}
}

func TestHub_UnregisterClient(t *testing.T) {
	hub := NewHub()

	client := &Client{
		ProjectID: "test-project",
		UserID:    "test-user",
		send:      make(chan []byte, 256),
	}

	// Register then unregister
	hub.registerClient(client)
	hub.unregisterClient(client)

	// Check if client is unregistered
	if hub.clients["test-project"] != nil {
		if hub.clients["test-project"][client] {
			t.Error("Client still registered after unregister")
		}
	}

	// Check client count
	if hub.GetClientCount("test-project") != 0 {
		t.Errorf("GetClientCount() = %d, want 0", hub.GetClientCount("test-project"))
	}
}

func TestHub_BroadcastMessage(t *testing.T) {
	hub := NewHub()

	// Create two clients for the same project
	client1 := &Client{
		ProjectID: "test-project",
		UserID:    "user1",
		send:      make(chan []byte, 256),
	}

	client2 := &Client{
		ProjectID: "test-project",
		UserID:    "user2",
		send:      make(chan []byte, 256),
	}

	// Register both clients
	hub.registerClient(client1)
	hub.registerClient(client2)

	// Create a message
	message := &Message{
		Type:      EventTaskCreated,
		ProjectID: "test-project",
		TaskID:    "TASK-001",
		Data:      map[string]interface{}{"title": "Test Task"},
	}

	// Broadcast the message
	hub.broadcastMessage(message)

	// Check if both clients received the message
	timeout := time.After(100 * time.Millisecond)

	select {
	case msg := <-client1.send:
		var received Message
		if err := json.Unmarshal(msg, &received); err != nil {
			t.Errorf("Failed to unmarshal message: %v", err)
		}
		if received.Type != EventTaskCreated {
			t.Errorf("Client1 received wrong event type: %v", received.Type)
		}
	case <-timeout:
		t.Error("Client1 did not receive message")
	}

	select {
	case msg := <-client2.send:
		var received Message
		if err := json.Unmarshal(msg, &received); err != nil {
			t.Errorf("Failed to unmarshal message: %v", err)
		}
		if received.Type != EventTaskCreated {
			t.Errorf("Client2 received wrong event type: %v", received.Type)
		}
	case <-timeout:
		t.Error("Client2 did not receive message")
	}
}

func TestHub_BroadcastToSpecificProject(t *testing.T) {
	hub := NewHub()

	// Create clients for different projects
	client1 := &Client{
		ProjectID: "project-1",
		UserID:    "user1",
		send:      make(chan []byte, 256),
	}

	client2 := &Client{
		ProjectID: "project-2",
		UserID:    "user2",
		send:      make(chan []byte, 256),
	}

	hub.registerClient(client1)
	hub.registerClient(client2)

	// Broadcast to project-1 only
	message := &Message{
		Type:      EventTaskCreated,
		ProjectID: "project-1",
		TaskID:    "TASK-001",
		Data:      map[string]interface{}{"title": "Test Task"},
	}

	hub.broadcastMessage(message)

	// Check client1 received the message
	timeout := time.After(100 * time.Millisecond)

	select {
	case <-client1.send:
		// Success
	case <-timeout:
		t.Error("Client1 did not receive message for their project")
	}

	// Check client2 did NOT receive the message
	select {
	case <-client2.send:
		t.Error("Client2 received message for different project")
	case <-time.After(50 * time.Millisecond):
		// Success - no message received
	}
}

func TestHub_Broadcast(t *testing.T) {
	hub := NewHub()

	client := &Client{
		ProjectID: "test-project",
		UserID:    "test-user",
		send:      make(chan []byte, 256),
	}

	hub.registerClient(client)

	// Use the public Broadcast method
	hub.Broadcast(EventTaskUpdated, "test-project", "TASK-001", map[string]string{
		"status": "done",
	})

	// Start hub in background
	go hub.Run()
	defer func() {
		// Cleanup - close channels
	}()

	// Wait for broadcast to be processed
	timeout := time.After(200 * time.Millisecond)

	select {
	case msg := <-client.send:
		var received Message
		if err := json.Unmarshal(msg, &received); err != nil {
			t.Errorf("Failed to unmarshal message: %v", err)
		}
		if received.Type != EventTaskUpdated {
			t.Errorf("Received wrong event type: %v", received.Type)
		}
		if received.TaskID != "TASK-001" {
			t.Errorf("Received wrong task ID: %v", received.TaskID)
		}
	case <-timeout:
		t.Error("Client did not receive broadcast message")
	}
}

func TestHub_GetClientCount(t *testing.T) {
	hub := NewHub()

	// Initially zero
	if count := hub.GetClientCount("test-project"); count != 0 {
		t.Errorf("GetClientCount() = %d, want 0", count)
	}

	// Add clients
	for i := 0; i < 5; i++ {
		client := &Client{
			ProjectID: "test-project",
			send:      make(chan []byte, 256),
		}
		hub.registerClient(client)
	}

	if count := hub.GetClientCount("test-project"); count != 5 {
		t.Errorf("GetClientCount() = %d, want 5", count)
	}

	// Different project should be zero
	if count := hub.GetClientCount("other-project"); count != 0 {
		t.Errorf("GetClientCount() = %d, want 0", count)
	}
}

func TestHub_ConcurrentRegistration(t *testing.T) {
	hub := NewHub()

	// Start hub
	go hub.Run()

	done := make(chan bool)
	clientCount := 10

	// Register multiple clients concurrently
	for i := 0; i < clientCount; i++ {
		go func() {
			client := &Client{
				ProjectID: "test-project",
				send:      make(chan []byte, 256),
			}
			hub.Register <- client
			done <- true
		}()
	}

	// Wait for all registrations
	for i := 0; i < clientCount; i++ {
		<-done
	}

	// Give hub time to process
	time.Sleep(100 * time.Millisecond)

	// Check all clients are registered
	if count := hub.GetClientCount("test-project"); count != clientCount {
		t.Errorf("GetClientCount() = %d, want %d", count, clientCount)
	}
}
