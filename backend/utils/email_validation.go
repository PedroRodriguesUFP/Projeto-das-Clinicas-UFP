package utils

import (
	"net"
	"strings"
)

// LookupMXFunc permite injetar/mockar a resolução de MX em testes unitários.
var LookupMXFunc = net.LookupMX

// IsAllowedDomain verifica através de um switch-case se o domínio pertence à lista de 15 provedores permitidos.
func IsAllowedDomain(domain string) bool {
	domain = strings.ToLower(strings.TrimSpace(domain))
	switch domain {
	case "ufp.edu.pt",
		"gmail.com",
		"hotmail.com",
		"outlook.com",
		"outlook.pt",
		"yahoo.com",
		"yahoo.es",
		"yahoo.fr",
		"icloud.com",
		"sapo.pt",
		"live.com.pt",
		"live.com",
		"aol.com",
		"protonmail.com",
		"proton.me":
		return true
	default:
		return false
	}
}

// HasValidMX confirma se o domínio do email pertence a um provedor permitido e tem registos MX válidos.
func HasValidMX(email string) bool {
	partes := strings.Split(email, "@")
	if len(partes) != 2 || partes[1] == "" {
		return false
	}

	domain := strings.ToLower(strings.TrimSpace(partes[1]))

	// 1. Verificar se é um dos domínios permitidos
	if !IsAllowedDomain(domain) {
		return false
	}

	// 2. Resolver MX
	mxRecords, err := LookupMXFunc(domain)
	if err != nil {
		if dnsErr, ok := err.(*net.DNSError); ok {
			errMsg := strings.ToLower(dnsErr.Error())
			if dnsErr.IsNotFound || strings.Contains(errMsg, "no such host") || strings.Contains(errMsg, "server failure") || strings.Contains(errMsg, "name does not exist") {
				return false
			}
		}
		// Se for erro transitório: fail-open para domínios permitidos
		return true
	}

	return len(mxRecords) > 0
}

// IsDisposableEmail verifica se o email é de um provedor não permitido ou descartável.
func IsDisposableEmail(email string) bool {
	partes := strings.Split(strings.ToLower(strings.TrimSpace(email)), "@")
	if len(partes) != 2 || partes[1] == "" {
		return true
	}

	domain := partes[1]
	return !IsAllowedDomain(domain)
}
