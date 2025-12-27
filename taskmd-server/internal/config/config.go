package config

import (
	"fmt"
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

// Config holds all configuration for the application
type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	Auth     AuthConfig
	Logging  LoggingConfig
}

// ServerConfig holds server configuration
type ServerConfig struct {
	Port            int
	Host            string
	ReadTimeout     time.Duration
	WriteTimeout    time.Duration
	ShutdownTimeout time.Duration
	CORSOrigins     []string
}

// DatabaseConfig holds database configuration
type DatabaseConfig struct {
	Host     string
	Port     int
	User     string
	Password string
	DBName   string
	SSLMode  string
	MaxConns int
	MinConns int
}

// AuthConfig holds authentication configuration
type AuthConfig struct {
	Mode         string // "oidc" or "password"
	JWTSecret    string
	JWTExpiresIn time.Duration

	// OIDC settings
	OIDCIssuer       string
	OIDCClientID     string
	OIDCClientSecret string
}

// LoggingConfig holds logging configuration
type LoggingConfig struct {
	Level  string
	Format string // "json" or "text"
}

// Load loads configuration from environment variables
func Load() (*Config, error) {
	// Load .env file if it exists (ignore error if file doesn't exist)
	_ = godotenv.Load()

	cfg := &Config{
		Server: ServerConfig{
			Port:            getEnvAsInt("PORT", 8080),
			Host:            getEnv("HOST", "0.0.0.0"),
			ReadTimeout:     getEnvAsDuration("READ_TIMEOUT", 15*time.Second),
			WriteTimeout:    getEnvAsDuration("WRITE_TIMEOUT", 15*time.Second),
			ShutdownTimeout: getEnvAsDuration("SHUTDOWN_TIMEOUT", 10*time.Second),
			CORSOrigins:     getEnvAsSlice("CORS_ORIGINS", []string{"http://localhost:5173"}),
		},
		Database: DatabaseConfig{
			Host:     getEnv("DB_HOST", "localhost"),
			Port:     getEnvAsInt("DB_PORT", 5432),
			User:     getEnv("DB_USER", "postgres"),
			Password: getEnv("DB_PASSWORD", ""),
			DBName:   getEnv("DB_NAME", "taskmd"),
			SSLMode:  getEnv("DB_SSLMODE", "disable"),
			MaxConns: getEnvAsInt("DB_MAX_CONNS", 25),
			MinConns: getEnvAsInt("DB_MIN_CONNS", 5),
		},
		Auth: AuthConfig{
			Mode:         getEnv("AUTH_MODE", "password"),
			JWTSecret:    getEnv("JWT_SECRET", "change-me-in-production"),
			JWTExpiresIn: getEnvAsDuration("JWT_EXPIRES_IN", 24*time.Hour),

			OIDCIssuer:       getEnv("OIDC_ISSUER", ""),
			OIDCClientID:     getEnv("OIDC_CLIENT_ID", ""),
			OIDCClientSecret: getEnv("OIDC_CLIENT_SECRET", ""),
		},
		Logging: LoggingConfig{
			Level:  getEnv("LOG_LEVEL", "info"),
			Format: getEnv("LOG_FORMAT", "json"),
		},
	}

	// Validate configuration
	if err := cfg.Validate(); err != nil {
		return nil, fmt.Errorf("invalid configuration: %w", err)
	}

	return cfg, nil
}

// Validate checks if the configuration is valid
func (c *Config) Validate() error {
	if c.Database.Password == "" {
		return fmt.Errorf("DB_PASSWORD is required")
	}

	if c.Auth.Mode == "oidc" {
		if c.Auth.OIDCIssuer == "" || c.Auth.OIDCClientID == "" || c.Auth.OIDCClientSecret == "" {
			return fmt.Errorf("OIDC configuration is incomplete")
		}
	}

	if c.Auth.JWTSecret == "change-me-in-production" {
		fmt.Println("WARNING: Using default JWT secret. Please set JWT_SECRET in production!")
	}

	return nil
}

// GetDSN returns the database connection string
func (c *DatabaseConfig) GetDSN() string {
	return fmt.Sprintf(
		"host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		c.Host, c.Port, c.User, c.Password, c.DBName, c.SSLMode,
	)
}

// Helper functions

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
	valueStr := os.Getenv(key)
	if valueStr == "" {
		return defaultValue
	}

	value, err := strconv.Atoi(valueStr)
	if err != nil {
		return defaultValue
	}

	return value
}

func getEnvAsDuration(key string, defaultValue time.Duration) time.Duration {
	valueStr := os.Getenv(key)
	if valueStr == "" {
		return defaultValue
	}

	value, err := time.ParseDuration(valueStr)
	if err != nil {
		return defaultValue
	}

	return value
}

func getEnvAsSlice(key string, defaultValue []string) []string {
	valueStr := os.Getenv(key)
	if valueStr == "" {
		return defaultValue
	}

	// Simple comma-separated parsing
	// For more complex parsing, use a proper CSV library
	var result []string
	for _, v := range splitByComma(valueStr) {
		if trimmed := trim(v); trimmed != "" {
			result = append(result, trimmed)
		}
	}

	if len(result) == 0 {
		return defaultValue
	}

	return result
}

// Simple helper functions to avoid external dependencies
func splitByComma(s string) []string {
	var result []string
	var current string

	for _, char := range s {
		if char == ',' {
			result = append(result, current)
			current = ""
		} else {
			current += string(char)
		}
	}

	if current != "" {
		result = append(result, current)
	}

	return result
}

func trim(s string) string {
	start := 0
	end := len(s)

	for start < end && (s[start] == ' ' || s[start] == '\t' || s[start] == '\n' || s[start] == '\r') {
		start++
	}

	for end > start && (s[end-1] == ' ' || s[end-1] == '\t' || s[end-1] == '\n' || s[end-1] == '\r') {
		end--
	}

	return s[start:end]
}
