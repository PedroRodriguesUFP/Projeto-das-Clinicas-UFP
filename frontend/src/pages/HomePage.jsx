import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
        slogan="CUIDADOS DE SAÚDE ESPECIALIZADOS"
        title={
          <>
            Bem-vindo à<br />
            <span style={{ color: 'var(--ufp-primary)' }}>Unidade Académica de Aprendizagem e Prática em Saúde</span>
          </>
        }
        subtitle="Acesso a profissionais especializados em Fisioterapia, Psicologia, Nutrição e Terapia da Fala. Cuidados de saúde personalizados para o seu bem-estar."
        callToAction={{
          text: "MARCAR CONSULTA",
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
            <h2>Bem-vindo, {user?.name ?? 'utilizador'}!</h2>
            <p>Função: <strong>{user?.role ?? '-'}</strong></p>
          </div>
        </section>
      )}

      {/* Próximas Consultas */}
      {user && (
        <section className="proximas-consultas-section">
          <div className="container">
            <h2>Próximas Consultas</h2>
            {loading ? (
              <p>A carregar...</p>
            ) : consultas.length === 0 ? (
              <p className="empty-state">Nenhuma consulta agendada</p>
            ) : (
              <div className="home-consultas-list">
                {consultas.map((consulta) => (
                  <div key={consulta.id} className="home-consulta-item">
                    <div className="home-consulta-info">
                      <p className="home-consulta-terapeuta">{consulta.terapeuta_nome}</p>
                      <small>{consulta.data_inicio}</small>
                    </div>
                    <span className={`status ${consulta.estado?.toLowerCase() || 'agendada'}`}>
                      {consulta.estado || 'Agendada'}
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
          <h2>Especialidades</h2>
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
          <h2>Contactos</h2>
          <div className="contactos-grid">
            <a
              href="https://www.google.com/maps/place/Escola+Superior+de+Sa%C3%BAde+Fernando+Pessoa/@41.1729392,-8.6110556,18.17z/data=!4m14!1m7!3m6!1s0xd24644e96bfbb8d:0x1b56312fb4975696!2sUniversidade+Fernando+Pessoa!8m2!3d41.1728847!4d-8.6111563!16s%2Fm%2F02z11pb!3m5!1s0xd246592f310e125:0xd30720c344524d36!8m2!3d41.173248!4d-8.6097179!16s%2Fg%2F11smrcgq9b?entry=ttu&g_ep=EgoyMDI2MDUxMy4wIKXMDSoASAFQAw%3D%3D"
              target="_blank"
              rel="noopener noreferrer"
              className="contacto-card"
              style={{ cursor: 'pointer' }}
            >
              <h3>Localização</h3>
              <p>UAAPS<br />Porto, Portugal</p>
            </a>
            <div className="contacto-card">
              <h3>Telefone</h3>
              <p>+351 22 1234 567</p>
            </div>
            <div className="contacto-card">
              <h3>Email</h3>
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
