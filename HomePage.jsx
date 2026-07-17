import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext.jsx';
import { HeroSection } from '../components/HeroSection.jsx';
import { Footer } from '../components/Footer.jsx';
import { getUtenteConsultas } from '../services/utentes.jsx';
import { getAreasClinicas } from '../services/consultas.jsx';
import { Activity, HeartPulse, MicFill, Egg, HospitalFill } from 'react-bootstrap-icons';
import '../styles/home.css';

const AREA_CONFIG = {
  fisioterapia: { icon: Activity,     desc: 'Reabilitação física e tratamento de lesões musculoesqueléticas.' },
  psicologia:   { icon: HeartPulse,   desc: 'Apoio psicológico, avaliação e intervenção clínica.' },
  nutricao:     { icon: Egg,          desc: 'Aconselhamento nutricional e planos alimentares personalizados.' },
  fala:         { icon: MicFill,      desc: 'Avaliação e reabilitação de perturbações da comunicação.' },
};

function getAreaConfig(nome) {
  const key = (nome || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
  const match = Object.keys(AREA_CONFIG).find(k => key.includes(k));
  return AREA_CONFIG[match] || { icon: HospitalFill, desc: 'Cuidados de saúde especializados.' };
}

export function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [consultas, setConsultas] = useState([]);
  const [especialidades, setEspecialidades] = useState([]);
  const [loading, setLoading] = useState(true);

  // Redirecionar terapeuta sem area_clinica para completar perfil
  useEffect(() => {
    if (user?.role === 'terapeuta' && !user?.area_clinica_id) {
      navigate('/completar-perfil', { replace: true });
    }
  }, [user?.role, user?.area_clinica_id, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const e = await getAreasClinicas();
        setEspecialidades(e || []);
      } catch {}

      try {
        if (user?.id) {
          const consultasData = await getUtenteConsultas(user.id);
          setConsultas(consultasData?.slice(0, 5) || []);
        }
      } catch {}

      setLoading(false);
    };

    fetchData();
  }, [user?.id]);


  return (
    <section className="page home-page">
      {/* Hero Section */}
      <HeroSection
        logo={{
          url: '/images/ufp-logo.png',
          alt: 'Logo UAAPS',
          text: 'UAAPS',
        }}
        slogan={t('hero.slogan')}
        title={
          <>
            {t('hero.titleLine1')}<br />
            <span style={{ color: 'var(--ufp-primary)' }}>{t('hero.titleLine2')}</span>
          </>
        }
        subtitle={t('hero.subtitle')}
        callToAction={{
          text: t('hero.cta'),
          href: "/consultas",
        }}
        backgroundImage="https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1200&auto=format&fit=crop&q=80"
        contactInfo={{
          website: "ess.fernandopessoa.pt",
          phone: "+351 22 1234 567",
          address: "Porto, Portugal",
        }}
      />

      {/* Welcome Section */}
      {user && (
        <section className="welcome-section">
          <div className="container">
            <h2>{t('home.welcomeUser', { name: user?.name ?? t('home.user') })}</h2>
            <p>{t('home.role')}: <strong>{user?.role ?? '-'}</strong></p>
          </div>
        </section>
      )}

      {/* Próximas Consultas */}
      {user && (
        <section className="proximas-consultas-section">
          <div className="container">
            <h2>{t('home.upcomingConsultations')}</h2>
            {loading ? (
              <p>{t('home.loading')}</p>
            ) : consultas.length === 0 ? (
              <p className="empty-state">{t('home.noAppointments')}</p>
            ) : (
              <div className="home-consultas-list">
                {consultas.map((consulta) => (
                  <div key={consulta.id} className="home-consulta-item">
                    <div className="home-consulta-info">
                      <p className="home-consulta-terapeuta">{consulta.terapeuta_nome}</p>
                      <small>{consulta.data_inicio}</small>
                    </div>
                    <span className={`status ${consulta.estado?.toLowerCase() || 'agendada'}`}>
                      {consulta.estado || t('home.appointmentStatus')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Especialidades */}
      <section className="especialidades-section" id="especialidades">
        <div className="container">
          <h2>{t('home.specialties')}</h2>
          <div className="especialidades-grid">
            {especialidades.map((esp) => {
              const { icon: Icon, desc } = getAreaConfig(esp.nome);
              return (
                <div key={esp.id} className="especialidade-card">
                  <div className="especialidade-icon"><Icon size={36} /></div>
                  <h3>{esp.nome}</h3>
                  <p>{desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Contactos */}
      <section className="contactos-section" id="contactos">
        <div className="container">
          <h2>{t('home.contacts')}</h2>
          <div className="contactos-grid">
            <a
              href="https://www.google.com/maps/place/Escola+Superior+de+Sa%C3%BAde+Fernando+Pessoa/@41.1729392,-8.6110556,18.17z/data=!4m14!1m7!3m6!1s0xd24644e96bfbb8d:0x1b56312fb4975696!2sUniversidade+Fernando+Pessoa!8m2!3d41.1728847!4d-8.6111563!16s%2Fm%2F02z11pb!3m5!1s0xd246592f310e125:0xd30720c344524d36!8m2!3d41.173248!4d-8.6097179!16s%2Fg%2F11smrcgq9b?entry=ttu&g_ep=EgoyMDI2MDUxMy4wIKXMDSoASAFQAw%3D%3D"
              target="_blank"
              rel="noopener noreferrer"
              className="contacto-card"
              style={{ cursor: 'pointer' }}
            >
              <h3>{t('home.location')}</h3>
              <p>UAAPS<br />Porto, Portugal</p>
            </a>
            <div className="contacto-card">
              <h3>{t('home.phone')}</h3>
              <p>+351 22 1234 567</p>
            </div>
            <div className="contacto-card">
              <h3>{t('home.email')}</h3>
              <p>uaaps@ufp.pt</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </section>
  );
}
