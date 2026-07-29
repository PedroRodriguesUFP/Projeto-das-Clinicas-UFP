/**
 * Avalia a força e conformidade da palavra-passe de acordo com os requisitos de segurança.
 * Requisito estrito do backend: Mínimo 15 caracteres, Máximo 72 caracteres.
 *
 * @param {string} password
 * @returns {{ isValid: boolean, score: number, label: string, color: string, error?: string }}
 */
export function validatePassword(password) {
  if (!password) {
    return { isValid: false, score: 0, label: 'Muito fraca', color: '#e53e3e', error: 'A palavra-passe é obrigatória' };
  }

  if (password.length < 15) {
    return {
      isValid: false,
      score: Math.min(30, Math.floor((password.length / 15) * 30)),
      label: 'Demasiado curta (mín. 15 caracteres)',
      color: '#e53e3e',
      error: 'A palavra-passe deve ter pelo menos 15 caracteres',
    };
  }

  if (password.length > 72) {
    return {
      isValid: false,
      score: 100,
      label: 'Demasiado longa',
      color: '#e53e3e',
      error: 'A palavra-passe não pode ter mais de 72 caracteres',
    };
  }

  let score = 40; // Pontuação base por ter >= 15 caracteres

  if (/[A-Z]/.test(password)) score += 15;
  if (/[a-z]/.test(password)) score += 15;
  if (/[0-9]/.test(password)) score += 15;
  if (/[^A-Za-z0-9]/.test(password)) score += 15;

  let label = 'Forte';
  let color = '#38a169'; // verde

  if (score < 60) {
    label = 'Razoável';
    color = '#dd6b20'; // laranja
  } else if (score < 80) {
    label = 'Boa';
    color = '#319795'; // azul turquesa
  } else {
    label = 'Excelente';
    color = '#38a169'; // verde
  }

  return {
    isValid: true,
    score: Math.min(score, 100),
    label,
    color,
  };
}
