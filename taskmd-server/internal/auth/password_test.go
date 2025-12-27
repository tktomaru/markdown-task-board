package auth

import (
	"strings"
	"testing"
)

func TestPasswordHasher_HashPassword(t *testing.T) {
	hasher := NewPasswordHasher()

	tests := []struct {
		name     string
		password string
	}{
		{
			name:     "valid password",
			password: "SecurePassword123!",
		},
		{
			name:     "short password",
			password: "short",
		},
		{
			name:     "long password",
			password: strings.Repeat("a", 100),
		},
		{
			name:     "unicode password",
			password: "パスワード123",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			hash, err := hasher.HashPassword(tt.password)
			if err != nil {
				t.Errorf("HashPassword() error: %v", err)
				return
			}

			// Hash should not be empty
			if hash == "" {
				t.Error("HashPassword() returned empty hash")
			}

			// Hash should not be the same as password
			if hash == tt.password {
				t.Error("HashPassword() returned plaintext password")
			}

			// Hash should contain Argon2 identifier
			if !strings.Contains(hash, "$argon2") {
				t.Errorf("HashPassword() hash doesn't have Argon2 identifier: %s", hash)
			}
		})
	}
}

func TestPasswordHasher_VerifyPassword(t *testing.T) {
	hasher := NewPasswordHasher()
	password := "TestPassword123!"

	hash, err := hasher.HashPassword(password)
	if err != nil {
		t.Fatalf("HashPassword() error: %v", err)
	}

	tests := []struct {
		name     string
		password string
		wantErr  bool
	}{
		{
			name:     "correct password",
			password: password,
			wantErr:  false,
		},
		{
			name:     "incorrect password",
			password: "WrongPassword",
			wantErr:  true,
		},
		{
			name:     "empty password",
			password: "",
			wantErr:  true,
		},
		{
			name:     "case sensitive",
			password: strings.ToUpper(password),
			wantErr:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			match, err := hasher.VerifyPassword(tt.password, hash)

			if err != nil {
				t.Errorf("VerifyPassword() error: %v", err)
				return
			}

			if (match == false) != tt.wantErr {
				t.Errorf("VerifyPassword() match = %v, wantErr %v", match, tt.wantErr)
			}
		})
	}
}

func TestPasswordHasher_HashConsistency(t *testing.T) {
	hasher := NewPasswordHasher()
	password := "ConsistencyTest123"

	// Hash the same password multiple times
	hash1, err := hasher.HashPassword(password)
	if err != nil {
		t.Fatalf("First hash error: %v", err)
	}

	hash2, err := hasher.HashPassword(password)
	if err != nil {
		t.Fatalf("Second hash error: %v", err)
	}

	// Hashes should be different (due to random salt)
	if hash1 == hash2 {
		t.Error("HashPassword() generated identical hashes (salt not randomized)")
	}

	// But both should verify the same password
	match1, err := hasher.VerifyPassword(password, hash1)
	if err != nil || !match1 {
		t.Errorf("First hash failed to verify: %v", err)
	}

	match2, err := hasher.VerifyPassword(password, hash2)
	if err != nil || !match2 {
		t.Errorf("Second hash failed to verify: %v", err)
	}
}

func BenchmarkHashPassword(b *testing.B) {
	hasher := NewPasswordHasher()
	password := "BenchmarkPassword123!"

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := hasher.HashPassword(password)
		if err != nil {
			b.Fatalf("HashPassword error: %v", err)
		}
	}
}

func BenchmarkVerifyPassword(b *testing.B) {
	hasher := NewPasswordHasher()
	password := "BenchmarkPassword123!"

	hash, err := hasher.HashPassword(password)
	if err != nil {
		b.Fatalf("HashPassword error: %v", err)
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := hasher.VerifyPassword(password, hash)
		if err != nil {
			b.Fatalf("VerifyPassword error: %v", err)
		}
	}
}
