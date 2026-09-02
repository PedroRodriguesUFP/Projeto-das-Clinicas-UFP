import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { MiniCalendar } from '../components/MiniCalendar.jsx';
import { getMinhaDisponibilidade, setMinhaDisponibilidade } from '../services/disponibilidade.jsx';
import { useNavigate } from 'react-router-dom';
import '../styles/disponibilidade.css';

const HORAS = Array.from({ length: 12 }, (_, i) => 8 + i); // 8h às 19h

function hojeStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function DisponibilidadeTerapeuta() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [dataSelecionada, setDataSelecionada] = useState(hojeStr());
  const [blocosDoMes, setBlocosDoMes] = useState([]);
  const [selecionados, setSelecionados] = useState(new Set());
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState('');

  const [ano, mes] = dataSelecionada.split('-').map(Number);

  useEffect(() => {
    getMinhaDisponibilidade(token, ano, mes).then((blocos) => {
      setBlocosDoMes(blocos || []);
    });
  }, [token, ano, mes]);

  useEffect(() => {
    const doDia = blocosDoMes.filter((b) => b.data === dataSelecionada);
    const novoSet = new Set();
    doDia.forEach((b) => {
      const horaInicio = parseInt(b.hora_inicio.split(':')[0], 10);
      const horaFim = parseInt(b.hora_fim.split(':')[0], 10);
      for (let h = horaInicio; h < horaFim; h++) novoSet.add(h);
    });
    setSelecionados(novoSet);
    setMensagem('');
  }, [dataSelecionada, blocosDoMes]);

  const toggle = (hora) => {
    setSelecionados((prev) => {
      const novo = new Set(prev);
      novo.has(hora) ? novo.delete(hora) : novo.add(hora);
      return novo;
    });
  };

  const guardar = async () => {
    setSalvando(true);
    const horasOrdenadas = Array.from(selecionados).sort((a, b) => a - b);
    const blocos = [];
    let inicioBloco = null;
    for (let h = 8; h <= 19; h++) {
      const marcado = horasOrdenadas.includes(h);
      if (marcado && inicioBloco === null) inicioBloco = h;
      if (!marcado && inicioBloco !== null) {
        blocos.push({ hora_inicio: `${String(inicioBloco).padStart(2, '0')}:00:00`, hora_fim: `${String(h).padStart(2, '0')}:00:00` });
        inicioBloco = null;
      }
    }
    if (inicioBloco !== null) {
      blocos.push({ hora_inicio: `${String(inicioBloco).padStart(2, '0')}:00:00`, hora_fim: '20:00:00' });
    }

    await setMinhaDisponibilidade(dataSelecionada, blocos, token);
    setBlocosDoMes((prev) => [
      ...prev.filter((b) => b.data !== dataSelecionada),
      ...blocos.map((b) => ({ data: dataSelecionada, ...b })),
    ]);
    setSalvando(false);
    setMensagem('Disponibilidade deste dia guardada!');
  };

  return (
    <div className="disponibilidade-container">
      <div className="disponibilidade-header">
        <button className="btn-voltar" onClick={() => navigate('/dashboard')}>
        ← Voltar ao Dashboard
        </button>
        <h1>A minha disponibilidade</h1>
        <p className="disponibilidade-subtitle">
          Escolhe um dia no calendário e assinala as horas em que estás disponível — a alteração aplica-se só a esse dia.
        </p>
      </div>

      <div className="disponibilidade-layout">
        <MiniCalendar value={dataSelecionada} onChange={setDataSelecionada} />

        <div className="disponibilidade-dia">
          <h3>
            {new Date(dataSelecionada + 'T00:00:00').toLocaleDateString('pt-PT', {
              weekday: 'long', day: 'numeric', month: 'long',
            })}
          </h3>

          <div className="disponibilidade-horas-grid">
            {HORAS.map((hora) => {
              const ativo = selecionados.has(hora);
              return (
                <button
                  key={hora}
                  type="button"
                  className={`hora-toggle ${ativo ? 'ativo' : ''}`}
                  onClick={() => toggle(hora)}
                  aria-pressed={ativo}
                >
                  {hora}:00
                </button>
              );
            })}
          </div>

          <button className="btn-guardar" onClick={guardar} disabled={salvando}>
            {salvando ? 'A guardar...' : 'Guardar este dia'}
          </button>
          {mensagem && <p className="disponibilidade-mensagem">{mensagem}</p>}
        </div>
      </div>
    </div>
  );
}