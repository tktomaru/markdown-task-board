package auth

import (
	"testing"
	"time"

	"github.com/tktomaru/taskai/taskai-server/internal/models"
)

func TestJWTManager_GenerateAndValidateToken(t *testing.T) {
	secret := "test-secret-key-for-jwt"
	manager := NewJWTManager(secret, 24*time.Hour)

	user := &models.User{
		ID:    "user123",
		Email: "test@example.com",
	}

	// Generate token
	token, err := manager.GenerateToken(user)
	if err != nil {
		t.Fatalf("GenerateToken() error: %v", err)
	}

	if token == "" {
		t.Error("GenerateToken() returned empty token")
	}

	// Validate token
	claims, err := manager.ValidateToken(token)
	if err != nil {
		t.Errorf("ValidateToken() error: %v", err)
	}

	if claims.UserID != user.ID {
		t.Errorf("ValidateToken() UserID = %v, want %v", claims.UserID, user.ID)
	}

	if claims.Email != user.Email {
		t.Errorf("ValidateToken() Email = %v, want %v", claims.Email, user.Email)
	}
}

func TestJWTManager_InvalidToken(t *testing.T) {
	secret := "test-secret-key-for-jwt"
	manager := NewJWTManager(secret, 24*time.Hour)

	tests := []struct {
		name  string
		token string
	}{
		{
			name:  "invalid token format",
			token: "invalid.token.here",
		},
		{
			name:  "empty token",
			token: "",
		},
		{
			name:  "malformed token",
			token: "not-a-jwt-token",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := manager.ValidateToken(tt.token)
			if err == nil {
				t.Error("ValidateToken() should fail for invalid token")
			}
		})
	}
}

func TestJWTManager_TokenExpiration(t *testing.T) {
	secret := "test-secret-key-for-jwt"
	shortExpiry := 1 * time.Millisecond
	manager := NewJWTManager(secret, shortExpiry)

	user := &models.User{
		ID:    "user123",
		Email: "test@example.com",
	}

	// Generate token with short expiry
	token, err := manager.GenerateToken(user)
	if err != nil {
		t.Fatalf("GenerateToken() error: %v", err)
	}

	// Wait for token to expire
	time.Sleep(10 * time.Millisecond)

	// Try to validate expired token
	_, err = manager.ValidateToken(token)
	if err == nil {
		t.Error("ValidateToken() should fail for expired token")
	}
}

func TestJWTManager_DifferentSecrets(t *testing.T) {
	secret1 := "secret-one"
	secret2 := "secret-two"

	manager1 := NewJWTManager(secret1, 24*time.Hour)
	manager2 := NewJWTManager(secret2, 24*time.Hour)

	user := &models.User{
		ID:    "user123",
		Email: "test@example.com",
	}

	// Generate token with first manager
	token, err := manager1.GenerateToken(user)
	if err != nil {
		t.Fatalf("GenerateToken() error: %v", err)
	}

	// Try to validate with second manager (different secret)
	_, err = manager2.ValidateToken(token)
	if err == nil {
		t.Error("ValidateToken() should fail when using different secret")
	}
}
