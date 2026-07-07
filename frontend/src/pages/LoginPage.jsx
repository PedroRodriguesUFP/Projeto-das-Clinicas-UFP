import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { loginRequest, loginWithGoogle, resendVerificationRequest, verifyEmailRequest } from '../services/auth.jsx';
import { GoogleLogin } from '@react-oauth/google';
import { Eye, EyeSlash, PersonBadgeFill, PersonFill } from 'react-bootstrap-icons';
import '../styles/login.css';

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [selectedRole, setSelectedRole] = useState(null); // null | 'staff' | 'utente'

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showResend, setShowResend] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [userId, setUserId] = useState(null);

  const goBack = () => {
    setSelectedRole(null);
    setShowVerification(false);
    setError('');
    setShowResend(false);
    setVerificationCode('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const session = await loginRequest({ email, password });
      login(session);
      navigate('/dashboard');
    } catch (err) {
      if (err?.response?.status === 206 || err?.response?.data?.needs_verification) {
        setUserId(err.response.data.user_id);
        setShowVerification(true);
        setError('');
        setShowResend(false);
        return;
      }

      const msg = err?.response?.data?.error || err.message || 'Falha no login';
      setError(msg);
      if (err?.response?.status === 403 && msg.toLowerCase().includes('verif')) {
        setShowResend(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setLoading(true);
    try {
      const data = await resendVerificationRequest({ email });
      setUserId(data.user_id);
      setShowResend(false);
      setShowVerification(true);
    } catch (err) {
      setError(err?.response?.data?.error || 'Erro ao reenviar código');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const session = await verifyEmailRequest({ user_id: userId, code: verificationCode });
      login(session);
      navigate('/dashboard');
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Código inválido');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    setLoading(true);

    try {
      const session = await loginWithGoogle(credentialResponse.credential);
      login(session);
      navigate('/dashboard');
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Falha no login Google');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Falha no login Google. Tenta novamente.');
  };

  return (
    <div className="login-page">
      <Link to="/" className="login-home-btn">
        <img src="/images/ufp-logo.png" alt="Página inicial" />
      </Link>
      <div className="login-container">
        <div className="login-content">
          <div className="login-form-wrapper">
            <div className="login-header">
              <div className="login-logo">
                <img src="/images/ufp-logo.png" alt="Logo UAAPS" />
              </div>
              <h1>Bem-vindo</h1>
              <p>Acesso à UAAPS</p>
            </div>

            {/* Seletor de perfil */}
            {!selectedRole && (
              <div className="login-role-picker">
                <button
                  className="login-role-card"
                  onClick={() => setSelectedRole('staff')}
                >
                  <PersonBadgeFill size={36} color="#059669" />
                  <strong>Membro UFP</strong>
                  <span>Acesso via conta Google UFP</span>
                </button>
                <button
                  className="login-role-card"
                  onClick={() => setSelectedRole('utente')}
                >
                  <PersonFill size={36} color="#059669" />
                  <strong>Utente</strong>
                  <span>Acesso com email e palavra-passe</span>
                </button>
              </div>
            )}

            {/* Vista Staff */}
            {selectedRole === 'staff' && (
              <>
                <button className="login-back-btn" onClick={goBack}>
                  ← Voltar
                </button>
                <p style={{ textAlign: 'center', fontSize: '14px', color: '#374151', marginBottom: '20px' }}>
                  Inicia sessão com a tua conta Google da Universidade Fernando Pessoa.
                </p>
                {error && <p className="login-error">{error}</p>}
                <div className="login-google-wrapper">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={handleGoogleError}
                    text="signin_with"
                    theme="outline"
                    size="large"
                  />
                </div>
              </>
            )}

            {/* Vista Utente */}
            {selectedRole === 'utente' && (
              <>
                <button className="login-back-btn" onClick={goBack}>
                  ← Voltar
                </button>

                {!showVerification ? (
                  <>
                  <form className="login-form" onSubmit={handleSubmit}>
                    <label>
                      Email
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setShowResend(false); }}
                        placeholder="example@email.pt"
                        required
                      />
                    </label>

                    <label>
                      Palavra-passe
                      <div style={{ position: 'relative', display: 'block' }}>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Insira sua palavra-passe"
                          required
                          style={{ paddingRight: 40, width: '100%', boxSizing: 'border-box' }}
                        />
                        <button type="button" onClick={() => setShowPassword(p => !p)} tabIndex={-1}
                          aria-label={showPassword ? 'Ocultar password' : 'Mostrar password'}
                          style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 0 }}>
                          {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </label>

                    {error && <p className="login-error">{error}</p>}

                    {showResend && (
                      <button
                        type="button"
                        className="login-button"
                        style={{ background: '#f59e0b', marginTop: '4px' }}
                        onClick={handleResend}
                        disabled={loading}
                      >
                        {loading ? 'A enviar...' : 'Reenviar código de verificação'}
                      </button>
                    )}

                    <button type="submit" className="login-button" disabled={loading}>
                      {loading ? 'A entrar...' : 'Entrar'}
                    </button>

                    <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '14px', color: '#666' }}>
                      Não tem conta?
                      <Link
                        to="/criar-conta"
                        style={{ marginLeft: '5px', color: '#059669', textDecoration: 'none', fontWeight: '600' }}
                      >
                        Criar conta aqui
                      </Link>
                    </div>
                    <div style={{ marginTop: '10px', textAlign: 'center', fontSize: '14px', color: '#666' }}>
                      Conta criada por profissional de saúde?
                      <Link
                        to="/ativar-conta"
                        style={{ marginLeft: '5px', color: '#059669', textDecoration: 'none', fontWeight: '600' }}
                      >
                        Ativar aqui
                      </Link>
                    </div>
                  </form>

                  <div className="login-divider">
                    <span className="login-divider-text">Ou continue com</span>
                  </div>
                  <div className="login-google-wrapper">
                    <GoogleLogin
                      onSuccess={handleGoogleSuccess}
                      onError={handleGoogleError}
                      text="signin_with"
                      theme="outline"
                      size="large"
                    />
                  </div>
                  </>
                ) : (
                  <form className="login-form" onSubmit={handleVerify}>
                    <p style={{ fontSize: '14px', color: '#374151', marginBottom: '16px' }}>
                      Introduza o código de 6 dígitos enviado para <strong>{email}</strong>.
                    </p>
                    <label>
                      Código de Verificação
                      <input
                        type="text"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        placeholder="000000"
                        maxLength="6"
                        required
                        autoFocus
                      />
                    </label>

                    {error && <p className="login-error">{error}</p>}

                    <button type="submit" className="login-button" disabled={loading}>
                      {loading ? 'A verificar...' : 'Verificar e Entrar'}
                    </button>

                    <button
                      type="button"
                      style={{ marginTop: '8px', background: 'none', border: 'none', color: '#059669', cursor: 'pointer', fontSize: '14px', width: '100%' }}
                      onClick={() => { setShowVerification(false); setError(''); setVerificationCode(''); }}
                    >
                      ← Voltar ao login
                    </button>
                  </form>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right: Image with Gradient Overlay */}
        <div
          className="login-image"
          style={{
            backgroundImage: `linear-gradient(135deg, rgba(0, 84, 63, 0.8), rgba(45, 155, 109, 0.8)), url('https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&auto=format&fit=crop&q=80')`,
          }}
        >
          <div className="login-image-content">
            <h2>UAAPS</h2>
            <p>Cuidados de saúde especializados com profissionais qualificados</p>
          </div>
        </div>
      </div>
    </div>
  );
}
