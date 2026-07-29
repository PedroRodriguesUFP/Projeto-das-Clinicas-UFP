package utils

import (
	"errors"
	"net"
	"testing"
)

func TestHasValidMX(t *testing.T) {
	oldLookupMX := LookupMXFunc
	defer func() { LookupMXFunc = oldLookupMX }()

	tests := []struct {
		name       string
		email      string
		mockMX     []*net.MX
		mockErr    error
		expectedOk bool
	}{
		{
			name:       "Invalid email format without @",
			email:      "invalidemail",
			mockMX:     nil,
			mockErr:    nil,
			expectedOk: false,
		},
		{
			name:       "Empty domain",
			email:      "user@",
			mockMX:     nil,
			mockErr:    nil,
			expectedOk: false,
		},
		{
			name:       "Domain not in allowed list (e.g. @cona.com)",
			email:      "user@cona.com",
			mockMX:     nil,
			mockErr:    nil,
			expectedOk: false,
		},
		{
			name:  "Valid allowed domain (gmail.com)",
			email: "user@gmail.com",
			mockMX: []*net.MX{
				{Host: "gmail-smtp-in.l.google.com.", Pref: 5},
			},
			mockErr:    nil,
			expectedOk: true,
		},
		{
			name:  "Valid allowed domain (ufp.edu.pt)",
			email: "aluno@ufp.edu.pt",
			mockMX: []*net.MX{
				{Host: "mail.ufp.edu.pt.", Pref: 10},
			},
			mockErr:    nil,
			expectedOk: true,
		},
		{
			name:       "Allowed domain with transient DNS error (fail-open)",
			email:      "user@gmail.com",
			mockMX:     nil,
			mockErr:    &net.DNSError{Err: "i/o timeout", IsTimeout: true},
			expectedOk: true,
		},
		{
			name:       "Allowed domain with generic network error (fail-open)",
			email:      "user@outlook.com",
			mockMX:     nil,
			mockErr:    errors.New("network unreachable"),
			expectedOk: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			LookupMXFunc = func(domain string) ([]*net.MX, error) {
				return tt.mockMX, tt.mockErr
			}

			got := HasValidMX(tt.email)
			if got != tt.expectedOk {
				t.Errorf("HasValidMX(%q) = %v; expected %v", tt.email, got, tt.expectedOk)
			}
		})
	}
}

func TestIsDisposableEmail(t *testing.T) {
	tests := []struct {
		email      string
		disposable bool
	}{
		{"user@mailinator.com", true},
		{"USER@GUERRILLAMAIL.COM", true},
		{"test@10minutemail.com", true},
		{"user@cona.com", true},
		{"user@gmail.com", false},
		{"aluno@ufp.edu.pt", false},
		{"user@outlook.pt", false},
		{"user@sapo.pt", false},
		{"invalidemail", true},
	}

	for _, tt := range tests {
		got := IsDisposableEmail(tt.email)
		if got != tt.disposable {
			t.Errorf("IsDisposableEmail(%q) = %v; expected %v", tt.email, got, tt.disposable)
		}
	}
}
