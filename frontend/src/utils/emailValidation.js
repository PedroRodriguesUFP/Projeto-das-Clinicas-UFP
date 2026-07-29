/**
 * Valida se o email pertence a uma lista de provedores confiáveis/permitidos usando um switch case.
 * Provedores permitidos:
 * 1. ufp.edu.pt
 * 2. gmail.com
 * 3. hotmail.com
 * 4. outlook.com
 * 5. outlook.pt
 * 6. yahoo.com
 * 7. yahoo.es
 * 8. yahoo.fr
 * 9. icloud.com
 * 10. sapo.pt
 * 11. live.com.pt
 * 12. live.com
 * 13. aol.com
 * 14. protonmail.com
 * 15. proton.me
 *
 * @param {string} email
 * @returns {{ isValid: boolean, error?: string }}
 */
export function validateEmail(email) {
  if (!email || !email.trim()) {
    return { isValid: false, error: 'Email é obrigatório' };
  }

  const cleanEmail = email.trim().toLowerCase();
  const parts = cleanEmail.split('@');

  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return { isValid: false, error: 'Formato de email inválido (ex: utilizador@gmail.com)' };
  }

  const domain = parts[1];

  switch (domain) {
    case 'ufp.edu.pt':
    case 'gmail.com':
    case 'hotmail.com':
    case 'outlook.com':
    case 'outlook.pt':
    case 'yahoo.com':
    case 'yahoo.es':
    case 'yahoo.fr':
    case 'icloud.com':
    case 'sapo.pt':
    case 'live.com.pt':
    case 'live.com':
    case 'aol.com':
    case 'protonmail.com':
    case 'proton.me':
      return { isValid: true };
    default:
      return {
        isValid: false,
        error: 'Domínio de email não aceite. Por favor utilize um provedor válido (ex: @ufp.edu.pt, @gmail.com, @outlook.com, @sapo.pt, @hotmail.com, etc.)',
      };
  }
}
