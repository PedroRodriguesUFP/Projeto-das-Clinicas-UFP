import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { DateInput } from '../components/DateInput.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { claimUtenteAccount } from '../services/auth.jsx';
import { validateEmail } from '../utils/emailValidation.js';
import { validatePassword } from '../utils/passwordValidation.js';
import { Eye, EyeSlash } from 'react-bootstrap-icons';

export function AtivarContaPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({
    numero_processo: '',
    data_nascimento: '',
    email: '',
    password: '',
    confirm_password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const pwVal = validatePassword(form.password);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.numero_processo.trim()) { setError('Número de processo obrigatório'); return; }
    if (!form.data_nascimento) { setError('Data de nascimento obrigatória'); return; }
    const emailVal = validateEmail(form.email);
    if (!emailVal.isValid) { setError(emailVal.error); return; }
    if (!pwVal.isValid) { setError(pwVal.error); return; }
    if (form.password !== form.confirm_password) { setError('As passwords não coincidem'); return; }

    setLoading(true);
    try {
      const data = await claimUtenteAccount({
        numero_processo: form.numero_processo.trim(),
        data_nascimento: form.data_nascimento,
        email: form.email.trim(),
        password: form.password,
      });
      login(data);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err?.response?.data?.error || 'Erro ao ativar conta. Verifique os dados.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-left">
          <div className="auth-logo">
            <img src="/images/ufp-logo.png" alt="Logo UAAPS" className="logo-img" />
            <h2>UAAPS</h2>
          </div>
          <div className="auth-left-content">
            <h3>Ativar conta de utente</h3>
            <p>Se é familiar de um utente cuja conta foi criada pela nossa clínica, pode ativá-la aqui para marcar consultas em seu nome.</p>
            <p>Precisa do <strong>número de processo clínico</strong> e da <strong>data de nascimento</strong> do utente.</p>
          </div>
        </div>

        <div className="auth-right">
          <div className="auth-form-container">
            <h1>Ativar conta</h1>
            <p className="auth-subtitle">Preencha os dados do utente e defina as suas credenciais de acesso</p>

            {error && <div className="alert alert-error">{error}</div>}

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-section-title" style={{ marginBottom: '8px', marginTop: '4px', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ufp-primary)' }}>
                Dados do utente
              </div>

              <div className="form-group">
                <label>Número de processo clínico</label>
                <input
                  type="text"
                  name="numero_processo"
                  value={form.numero_processo}
                  onChange={handleChange}
                  placeholder="Ex: PROC-2024-001"
                  maxLength={50}
                  autoComplete="off"
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label>Data de nascimento</label>
                <DateInput
                  name="data_nascimento"
                  value={form.data_nascimento}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>

              <div className="form-section-title" style={{ marginBottom: '8px', marginTop: '16px', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ufp-primary)' }}>
                Credenciais de acesso
              </div>

              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="email@exemplo.com"
                  maxLength={100}
                  autoComplete="email"
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label>Password</label>
                <div style={{ position: 'relative', display: 'block' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Mínimo 15 caracteres"
                    maxLength={72}
                    autoComplete="new-password"
                    spellCheck="false"
                    disabled={loading}
                    style={{ paddingRight: 40, width: '100%', boxSizing: 'border-box' }}
                  />
                  <button type="button" onClick={() => setShowPassword(p => !p)} tabIndex={-1}
                    aria-label={showPassword ? 'Ocultar password' : 'Mostrar password'}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 0 }}>
                    {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {form.password && (
                  <div style={{ marginTop: '6px', fontSize: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                      <span>Força da palavra-passe:</span>
                      <span style={{ color: pwVal.color, fontWeight: '600' }}>{pwVal.label}</span>
                    </div>
                    <div style={{ height: '5px', width: '100%', backgroundColor: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pwVal.score}%`, backgroundColor: pwVal.color, transition: 'all 0.3s ease' }} />
                    </div>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Confirmar password</label>
                <div style={{ position: 'relative', display: 'block' }}>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirm_password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Repetir password"
                    maxLength={72}
                    autoComplete="new-password"
                    spellCheck="false"
                    disabled={loading}
                    style={{ paddingRight: 40, width: '100%', boxSizing: 'border-box' }}
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(p => !p)} tabIndex={-1}
                    aria-label={showConfirmPassword ? 'Ocultar password' : 'Mostrar password'}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 0 }}>
                    {showConfirmPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button type="submit" className="btn-primary btn-full" disabled={loading}>
                {loading ? 'A ativar...' : 'Ativar conta'}
              </button>
            </form>

            <div className="auth-links">
              <Link to="/login">Voltar ao login</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
