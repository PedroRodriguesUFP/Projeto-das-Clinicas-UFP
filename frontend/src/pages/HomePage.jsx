import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { HeroSection } from '../components/HeroSection.jsx';
import { Footer } from '../components/Footer.jsx';
import { getUtenteConsultas } from '../services/utentes.jsx';
import { getAreasClinicas } from '../services/consultas.jsx';
import { Activity, HeartPulse, MicFill, Egg, HospitalFill } from 'react-bootstrap-icons';
import '../styles/home.css';
import { useTranslation } from 'react-i18next';

const AREA_CONFIG = {
  fisioterapia: { icon: Activity },
  psicologia: { icon: HeartPulse },
  nutricao: { icon: Egg },
  fala: { icon: MicFill },
};

const AREA_LABELS = {
  fisioterapia: { pt: 'Fisioterapia', en: 'Physiotherapy', fr: 'Kinésithérapie' },
  psicologia: { pt: 'Psicologia', en: 'Psychology', fr: 'Psychologie' },
  nutricao: { pt: 'Nutrição', en: 'Nutrition', fr: 'Nutrition' },
  fala: { pt: 'Terapia da Fala', en: 'Speech Therapy', fr: 'Orthophonie' },
};

const AREA_DESCRIPTIONS = {
  fisioterapia: {
    pt: 'Reabilitação física e tratamento de lesões musculoesqueléticas.',
    en: 'Physical rehabilitation and treatment of musculoskeletal injuries.',
    fr: 'Rééducation physique et traitement des lésions musculo-squelettiques.',
  },
  psicologia: {
    pt: 'Apoio psicológico, avaliação e intervenção clínica.',
    en: 'Psychological support, assessment and clinical intervention.',
    fr: 'Soutien psychologique, évaluation et intervention clinique.',
  },
  nutricao: {
    pt: 'Aconselhamento nutricional e planos alimentares personalizados.',
    en: 'Nutritional counseling and personalized meal plans.',
    fr: 'Conseils nutritionnels et plans alimentaires personnalisés.',
  },
  fala: {
    pt: 'Avaliação e reabilitação de perturbações da comunicação.',
    en: 'Assessment and rehabilitation of communication disorders.',
    fr: 'Évaluation et rééducation des troubles de la communication.',
  },
};

// Inline SVG icons to avoid relying on package exports that may differ by version
const IconMapPin = ({ size = 22 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="contact-svg">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
    <circle cx="12" cy="10" r="3"></circle>
  </svg>
);

const IconTelephone = ({ size = 22 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="contact-svg">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
  </svg>
);

const IconEnvelope = ({ size = 22 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="contact-svg">
    <path d="M3 8.5v7A1.5 1.5 0 0 0 4.5 17h15a1.5 1.5 0 0 0 1.5-1.5v-7"></path>
    <polyline points="3 8.5 12 13.5 21 8.5"></polyline>
  </svg>
);

function getAreaConfig(nome, language = 'pt') {
  const key = (nome || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
  const match = Object.keys(AREA_CONFIG).find(k => key.includes(k));
  const label = AREA_LABELS[match]?.[language] || AREA_LABELS[match]?.pt || nome;
  const desc = AREA_DESCRIPTIONS[match]?.[language] || AREA_DESCRIPTIONS[match]?.pt || 'Cuidados de saúde especializados.';
  return {
    icon: AREA_CONFIG[match]?.icon || HospitalFill,
    desc,
    label,
  };
}

export function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
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
          href: '/consultas',
        }}
        backgroundImage="https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1200&auto=format&fit=crop&q=80"
        contactInfo={{
          website: t('home.website') || 'ess.fernandopessoa.pt',
          phone: t('home.phone') || '+351 22 1234 567',
          address: t('home.location') || 'Porto, Portugal',
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
              const language = i18n.resolvedLanguage?.startsWith('en') ? 'en' : i18n.resolvedLanguage?.startsWith('fr') ? 'fr' : 'pt';
              const { icon: Icon, desc, label } = getAreaConfig(esp.nome, language);
              return (
                <button
                  key={esp.id}
                  type="button"
                  className="especialidade-card"
                  onClick={() => navigate(`/consultas/nova?area=${encodeURIComponent(esp.id)}`)}
                  aria-label={t('home.agendarConsultaArea', { area: label })}
                >
                  <div className="especialidade-icon"><Icon size={36} /></div>
                  <h3>{label}</h3>
                  <p>{desc}</p>
                </button>
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
              href="https://maps.google.com/?q=Pra%C3%A7a+9+de+Abril+349+Porto"
              target="_blank"
              rel="noopener noreferrer"
              className="contacto-card"
            >
              <div className="contacto-card-header">
                <IconMapPin size={22} />
                <h3>{t('home.location')}</h3>
              </div>
              <p>Praça 9 de Abril, 349<br />Porto</p>
            </a>

            <a
              href="tel:+351225071300"
              className="contacto-card"
            >
              <div className="contacto-card-header">
                <IconTelephone size={22} />
                <h3>{t('home.phone')}</h3>
              </div>
              <p>+351 22 507 1300</p>
            </a>

            <a
              href="mailto:info@ufp.edu.pt"
              className="contacto-card"
            >
              <div className="contacto-card-header">
                <IconEnvelope size={22} />
                <h3>{t('home.email')}</h3>
              </div>
              <p>info@ufp.edu.pt</p>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </section>
  );
}
