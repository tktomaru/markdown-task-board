package service

import (
	"context"
	"fmt"
	"time"

	"github.com/tktomaru/taskai/taskai-server/internal/auth"
	"github.com/tktomaru/taskai/taskai-server/internal/models"
	"github.com/tktomaru/taskai/taskai-server/internal/repository"
)

// AuthService handles authentication business logic
type AuthService struct {
	userRepo       *repository.UserRepository
	passwordHasher *auth.PasswordHasher
	jwtManager     *auth.JWTManager
}

// NewAuthService creates a new auth service
func NewAuthService(userRepo *repository.UserRepository, jwtSecret string, jwtExpiresIn time.Duration) *AuthService {
	return &AuthService{
		userRepo:       userRepo,
		passwordHasher: auth.NewPasswordHasher(),
		jwtManager:     auth.NewJWTManager(jwtSecret, jwtExpiresIn),
	}
}

// RegisterRequest represents a user registration request
type RegisterRequest struct {
	ID       string `json:"id"`
	Email    string `json:"email"`
	Name     string `json:"name"`
	Password string `json:"password"`
}

// LoginRequest represents a login request
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// AuthResponse represents an authentication response
type AuthResponse struct {
	User  *models.User `json:"user"`
	Token string       `json:"token"`
}

// Register registers a new user
func (s *AuthService) Register(ctx context.Context, req *RegisterRequest) (*AuthResponse, error) {
	// Validate input
	if req.Email == "" {
		return nil, fmt.Errorf("email is required")
	}
	if req.Password == "" {
		return nil, fmt.Errorf("password is required")
	}
	if req.Name == "" {
		return nil, fmt.Errorf("name is required")
	}

	// Check if user already exists
	existingUser, _ := s.userRepo.GetByEmail(ctx, req.Email)
	if existingUser != nil {
		return nil, fmt.Errorf("user with this email already exists")
	}

	// Hash password
	passwordHash, err := s.passwordHasher.HashPassword(req.Password)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	// Create user
	user := &models.User{
		ID:           req.ID,
		Email:        req.Email,
		Name:         req.Name,
		PasswordHash: &passwordHash,
		Preferences:  make(models.JSONB),
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	if err := s.userRepo.Create(ctx, user); err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	// Generate JWT token
	token, err := s.jwtManager.GenerateToken(user)
	if err != nil {
		return nil, fmt.Errorf("failed to generate token: %w", err)
	}

	// Update last login
	_ = s.userRepo.UpdateLastLogin(ctx, user.ID)

	// Remove password hash from response
	user.PasswordHash = nil

	return &AuthResponse{
		User:  user,
		Token: token,
	}, nil
}

// Login authenticates a user
func (s *AuthService) Login(ctx context.Context, req *LoginRequest) (*AuthResponse, error) {
	// Get user by email
	user, err := s.userRepo.GetByEmail(ctx, req.Email)
	if err != nil {
		return nil, fmt.Errorf("invalid email or password")
	}

	// Verify password
	if user.PasswordHash == nil {
		return nil, fmt.Errorf("password authentication not enabled for this user")
	}

	valid, err := s.passwordHasher.VerifyPassword(req.Password, *user.PasswordHash)
	if err != nil {
		return nil, fmt.Errorf("failed to verify password: %w", err)
	}

	if !valid {
		return nil, fmt.Errorf("invalid email or password")
	}

	// Generate JWT token
	token, err := s.jwtManager.GenerateToken(user)
	if err != nil {
		return nil, fmt.Errorf("failed to generate token: %w", err)
	}

	// Update last login
	_ = s.userRepo.UpdateLastLogin(ctx, user.ID)

	// Remove password hash from response
	user.PasswordHash = nil

	return &AuthResponse{
		User:  user,
		Token: token,
	}, nil
}

// ValidateToken validates a JWT token and returns the user
func (s *AuthService) ValidateToken(tokenString string) (*models.User, error) {
	claims, err := s.jwtManager.ValidateToken(tokenString)
	if err != nil {
		return nil, err
	}

	user, err := s.userRepo.GetByID(context.Background(), claims.UserID)
	if err != nil {
		return nil, fmt.Errorf("user not found")
	}

	// Remove password hash
	user.PasswordHash = nil

	return user, nil
}

// GetUserByID retrieves a user by ID
func (s *AuthService) GetUserByID(ctx context.Context, userID string) (*models.User, error) {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	// Remove password hash
	user.PasswordHash = nil

	return user, nil
}
