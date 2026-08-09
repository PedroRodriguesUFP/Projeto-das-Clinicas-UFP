import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { registerRequest, verifyEmailRequest } from '../services/auth.jsx';
import { validateEmail } from '../utils/emailValidation.js';
import { validatePassword } from '../utils/passwordValidation.js';
import { Eye, EyeSlash } from 'react-bootstrap-icons';
import { useTranslation } from 'react-i18next';
import '../styles/login.css';

export function CriarContaPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useTranslation();

  const [formData, setFormData] = useState({
    nome_completo: '',
    email: '',
    password: '',
    confirm_password: '',
  });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showVerification, setShowVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [userId, setUserId] = useState(null);

  const pwVal = validatePassword(formData.password);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (!formData.nome_completo.trim()) {
        setError(t('criarConta.erroNome'));
        setLoading(false);
        return;
      }

      const emailVal = validateEmail(formData.email);
      if (!emailVal.isValid) {
        setError(t(emailVal.errorKey || 'criarConta.erroEmailInvalido'));
        setLoading(false);
        return;
      }

      if (!pwVal.isValid) {
        setError(t(pwVal.errorKey || 'criarConta.erroPasswordObrigatoria'));
        setLoading(false);
        return;
      }

      if (formData.password !== formData.confirm_password) {
        setError(t('criarConta.erroPasswords'));
        setLoading(false);
        return;
      }

      const session = await registerRequest({
        email: formData.email,
        password: formData.password,
        confirm_password: formData.confirm_password,
        nome_completo: formData.nome_completo,
      });

      setUserId(session.user_id);
      setShowVerification(true);
      setSuccess(t('criarConta.codigoEnviado'));

    } catch (err) {
      setError(err?.response?.data?.error || err.message || t('criarConta.erroCriarConta'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!verificationCode.trim()) {
        setError(t('criarConta.erroCodigo'));
        setLoading(false);
        return;
      }

      const session = await verifyEmailRequest({ user_id: userId, code: verificationCode });
      setSuccess(t('criarConta.sucessoEmailVerificado'));
      login(session);

      setTimeout(() => {
        navigate('/dashboard');
      }, 800);
    } catch (err) {
      setError(err?.message || t('criarConta.erroVerificacao'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        {/* Left: Form Content */}
        <div className="login-content">
          <div className="login-form-wrapper">
            <div className="login-header">
              <div className="login-logo">
                <img
                  src="/images/ufp-logo.png"
                  alt="Logo UAAPS"
                />
              </div>
              <h1>{t('criarConta.titulo')}</h1>
              <p>{t('criarConta.subtitulo')}</p>
            </div>

            <form className="login-form" onSubmit={showVerification ? handleVerifyCode : handleSubmit}>
              {!showVerification ? (
                <>
                  <label>
                    {t('criarConta.nomeCompleto')}
                    <input
                      type="text"
                      name="nome_completo"
                      value={formData.nome_completo}
                      onChange={handleChange}
                      placeholder={t('criarConta.nomePlaceholder')}
                      maxLength={100}
                      required
                      disabled={loading}
                    />
                  </label>

                  <label>
                    {t('criarConta.email')}
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder={t('criarConta.emailPlaceholder')}
                      maxLength={100}
                      autoComplete="email"
                      required
                      disabled={loading}
                    />
                  </label>

                  <label>
                    {t('criarConta.palavraPasse')}
                    <div style={{ position: 'relative', display: 'block' }}>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder={t('criarConta.ppPlaceholder')}
                        maxLength={72}
                        autoComplete="new-password"
                        spellCheck="false"
                        required
                        disabled={loading}
                        style={{ paddingRight: 40, width: '100%', boxSizing: 'border-box' }}
                      />
                      <button type="button" onClick={() => setShowPassword(p => !p)} tabIndex={-1}
                        aria-label={showPassword ? t('criarConta.ocultarPP') : t('criarConta.mostrarPP')}
                        style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 0 }}>
                        {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {formData.password && (
                      <div style={{ marginTop: '6px', fontSize: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                          <span>{t('criarConta.forcaPP')}</span>
                          <span style={{ color: pwVal.color, fontWeight: '600' }}>{t(pwVal.strengthKey)}</span>
                        </div>
                        <div style={{ height: '5px', width: '100%', backgroundColor: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pwVal.score}%`, backgroundColor: pwVal.color, transition: 'all 0.3s ease' }} />
                        </div>
                      </div>
                    )}
                  </label>

                  <label>
                    {t('criarConta.confirmarPP')}
                    <div style={{ position: 'relative', display: 'block' }}>
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="confirm_password"
                        value={formData.confirm_password}
                        onChange={handleChange}
                        placeholder={t('criarConta.confirmarPlaceholder')}
                        maxLength={72}
                        autoComplete="new-password"
                        spellCheck="false"
                        required
                        disabled={loading}
                        style={{ paddingRight: 40, width: '100%', boxSizing: 'border-box' }}
                      />
                      <button type="button" onClick={() => setShowConfirmPassword(p => !p)} tabIndex={-1}
                        aria-label={showConfirmPassword ? t('criarConta.ocultarPP') : t('criarConta.mostrarPP')}
                        style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 0 }}>
                        {showConfirmPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </label>
                </>
              ) : (
                <label>
                  {t('criarConta.codigoVerificacao')}
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder={t('criarConta.codigoPlaceholder')}
                    maxLength={6}
                    required
                    disabled={loading}
                  />
                </label>
              )}

              {error && <p className="login-error">{error}</p>}
              {success && <p style={{ color: '#10b981', fontSize: '14px', textAlign: 'center' }}>{success}</p>}

              <button type="submit" className="login-button" disabled={loading}>
                {loading ? (showVerification ? t('criarConta.aVerificar') : t('criarConta.aCriar')) : (showVerification ? t('criarConta.verificar') : t('criarConta.criar'))}
              </button>
            </form>

            <div className="login-divider">
              <span className="login-divider-text">{t('criarConta.jaTem')}</span>
            </div>

            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <Link to="/login" style={{ color: '#059669', textDecoration: 'none', fontWeight: '500' }}>
                {t('criarConta.entrar')}
              </Link>
            </div>

            <p style={{ textAlign: 'center', fontSize: '12px', color: '#9ca3af', marginTop: '20px' }}>
              {t('criarConta.notaUFP')}
            </p>
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
            <h2>{t('criarConta.uaapsTitulo')}</h2>
            <p>{t('criarConta.uaapsDescricao')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
