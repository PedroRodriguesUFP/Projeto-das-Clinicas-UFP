/**
 * Avalia a força e conformidade da palavra-passe de acordo com os requisitos de segurança
 * Novo Requisito: Mínimo 10 caracteres, Máximo 72 caracteres. Pelo menos 1 letra, 1 número e 1 símbolo.
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

  if (password.length < 10) {
    return {
      isValid: false,
      score: Math.min(30, Math.floor((password.length / 10) * 30)),
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

  // Verificar se tem pelo menos uma letra, um número e um símbolo
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);

  if (!hasLetter || !hasNumber || !hasSymbol) {
    return {
      isValid: false,
      score: 40,
      strengthKey: 'criarConta.passwordStrengthWeak',
      color: '#e53e3e',
      errorKey: 'criarConta.erroPasswordComplexidade', // A tua UI pode precisar desta chave de tradução
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