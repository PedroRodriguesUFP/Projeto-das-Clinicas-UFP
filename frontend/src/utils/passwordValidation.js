/**
 * Avalia a força e conformidade da palavra-passe de acordo com os requisitos de segurança.
 * Requisito estrito do backend: Mínimo 15 caracteres, Máximo 72 caracteres.
 *
 * @param {string} password
 * @returns {{ isValid: boolean, score: number, strengthKey: string, color: string, errorKey?: string }}
 */
export function validatePassword(password) {
  if (!password) {
    return {
      isValid: false,
      score: 0,
      strengthKey: 'criarConta.passwordStrengthVeryWeak',
      color: '#e53e3e',
      errorKey: 'criarConta.erroPasswordObrigatoria',
    };
  }

  if (password.length < 15) {
    return {
      isValid: false,
      score: Math.min(30, Math.floor((password.length / 15) * 30)),
      strengthKey: 'criarConta.passwordStrengthTooShort',
      color: '#e53e3e',
      errorKey: 'criarConta.erroPasswordCurta',
    };
  }

  if (password.length > 72) {
    return {
      isValid: false,
      score: 100,
      strengthKey: 'criarConta.passwordStrengthTooLong',
      color: '#e53e3e',
      errorKey: 'criarConta.erroPasswordLonga',
    };
  }

  let score = 40;

  if (/[A-Z]/.test(password)) score += 15;
  if (/[a-z]/.test(password)) score += 15;
  if (/[0-9]/.test(password)) score += 15;
  if (/[^A-Za-z0-9]/.test(password)) score += 15;

  let strengthKey = 'criarConta.passwordStrengthExcellent';
  let color = '#38a169';

  if (score < 60) {
    strengthKey = 'criarConta.passwordStrengthFair';
    color = '#dd6b20';
  } else if (score < 80) {
    strengthKey = 'criarConta.passwordStrengthGood';
    color = '#319795';
  }

  return {
    isValid: true,
    score: Math.min(score, 100),
    strengthKey,
    color,
  };
}
