import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext.jsx';
import { loginRequest, loginWithGoogle, resendVerificationRequest, verifyEmailRequest } from '../services/auth.jsx';
import { GoogleLogin } from '@react-oauth/google';
import { Eye, EyeSlash, PersonBadgeFill, PersonFill } from 'react-bootstrap-icons';
import '../styles/login.css';

export function LoginPage() {
  const { t } = useTranslation();
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

      const msg = err?.response?.data?.error || err.message || t('login.loginError');
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
      setError(err?.response?.data?.error || t('login.resendError'));
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
      setError(err?.response?.data?.error || err.message || t('login.invalidCode'));
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
      setError(err?.response?.data?.error || err.message || t('login.loginGoogleError'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError(t('login.googleLoginError'));
  };

  return (
    <div className="login-page">
      <Link to="/" className="login-home-btn">
        <img src="/images/ufp-logo.png" alt={t('login.homeAlt')} />
      </Link>
      <div className="login-container">
        <div className="login-content">
          <div className="login-form-wrapper">
            <div className="login-header">
              <div className="login-logo">
                <img src="/images/ufp-logo.png" alt={t('login.logoAlt')} />
              </div>
              <h1>{t('login.welcome')}</h1>
              <p>{t('login.access')}</p>
            </div>

            {selectedRole === null && (
              <div className="login-role-picker">
                <button
                  className="login-role-card"
                  onClick={() => setSelectedRole('staff')}
                >
                  <PersonBadgeFill size={36} color="#059669" />
                  <strong>{t('login.staffTitle')}</strong>
                  <span>{t('login.staffDescription')}</span>
                </button>
                <button
                  className="login-role-card"
                  onClick={() => setSelectedRole('utente')}
                >
                  <PersonFill size={36} color="#059669" />
                  <strong>{t('login.patientTitle')}</strong>
                  <span>{t('login.patientDescription')}</span>
                </button>
              </div>
            )}

            {/* Vista Staff */}
            {selectedRole === 'staff' && (
              <>
                <button className="login-back-btn" onClick={goBack}>
                  {t('login.back')}
                </button>
                <p style={{ textAlign: 'center', fontSize: '14px', color: '#374151', marginBottom: '20px' }}>
                  {t('login.googleStaffInstruction')}
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
                  {t('login.back')}
                </button>

                {!showVerification ? (
                  <>
                    <form className="login-form" onSubmit={handleSubmit}>
                      <label>
                        {t('login.emailLabel')}
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => { setEmail(e.target.value); setShowResend(false); }}
                          placeholder={t('login.emailPlaceholder')}
                          required
                        />
                      </label>

                      <label>
                        {t('login.passwordLabel')}
                        <div style={{ position: 'relative', display: 'block' }}>
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder={t('login.passwordPlaceholder')}
                            required
                            style={{ paddingRight: 40, width: '100%', boxSizing: 'border-box' }}
                          />
                          <button type="button" onClick={() => setShowPassword(p => !p)} tabIndex={-1}
                            aria-label={showPassword ? t('login.passwordToggleHide') : t('login.passwordToggleShow')}
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
                          {loading ? t('login.verifying') : t('login.resendVerification')}
                        </button>
                      )}

                      <button type="submit" className="login-button" disabled={loading}>
                        {loading ? t('login.verifying') : t('login.login')}
                      </button>

                      <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '14px', color: '#666' }}>
                        {t('login.noAccount')}
                        <Link
                          to="/criar-conta"
                          style={{ marginLeft: '5px', color: '#059669', textDecoration: 'none', fontWeight: '600' }}
                        >
                          {t('login.createAccount')}
                        </Link>
                      </div>
                      <div style={{ marginTop: '10px', textAlign: 'center', fontSize: '14px', color: '#666' }}>
                        {t('login.activationPrompt')}
                        <Link
                          to="/ativar-conta"
                          style={{ marginLeft: '5px', color: '#059669', textDecoration: 'none', fontWeight: '600' }}
                        >
                          {t('login.activateHere')}
                        </Link>
                      </div>
                    </form>

                    <div className="login-divider">
                      <span className="login-divider-text">{t('login.continueWith')}</span>
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
                      {t('login.verificationPrompt', { email })}
                    </p>
                    <label>
                      {t('login.verificationCodeLabel')}
                      <input
                        type="text"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        placeholder={t('login.verificationCodePlaceholder')}
                        maxLength="6"
                        required
                        autoFocus
                      />
                    </label>

                    {error && <p className="login-error">{error}</p>}

                    <button type="submit" className="login-button" disabled={loading}>
                      {loading ? t('login.verifying') : t('login.verifyAndLogin')}
                    </button>

                    <button
                      type="button"
                      style={{ marginTop: '8px', background: 'none', border: 'none', color: '#059669', cursor: 'pointer', fontSize: '14px', width: '100%' }}
                      onClick={() => { setShowVerification(false); setError(''); setVerificationCode(''); }}
                    >
                      {t('login.backToLogin')}
                    </button>
                  </form>
                )}
              </>
            )}
          </div>
        </div>

        <div
          className="login-image"
          style={{
            backgroundImage: `linear-gradient(135deg, rgba(0, 84, 63, 0.8), rgba(45, 155, 109, 0.8)), url('https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&auto=format&fit=crop&q=80')`,
          }}
        >
          <div className="login-image-content">
            <h2>{t('login.loginImageTitle')}</h2>
            <p>{t('login.loginImageDescription')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}