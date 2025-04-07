import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import Table from '../components/Table';
import ModalAdicionar from '../components/ModalAdicionar';
import Filters from '../components/Filters';

function Home() {
  const [dados, setDados] = useState([]);
  const [filtrados, setFiltrados] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const carregarDados = async () => {
    setCarregando(true);
    const { data, error } = await supabase.from('processos').select('*');
    if (!error) {
      setDados(data);
      setFiltrados(data);
    }
    setCarregando(false);
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const aplicarFiltro = ({ gap, tribunal, situacao }) => {
    let resultado = [...dados];
    if (gap) resultado = resultado.filter((d) => d.gap === gap);
    if (tribunal) resultado = resultado.filter((d) => d.tribunal === tribunal);
    if (situacao) resultado = resultado.filter((d) => d.situacao === situacao);
    setFiltrados(resultado);
  };

  return (
    <div className="w-full px-4">
      <div className="flex flex-wrap items-center justify-between mb-4 gap-4">
        <Filters dados={dados} onFiltro={aplicarFiltro} />
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
        >
          Adicionar Processos
        </button>
      </div>

      <Table dados={filtrados} carregando={carregando} />

      {showModal && (
        <ModalAdicionar
          onClose={() => setShowModal(false)}
          onRefresh={carregarDados}
        />
      )}
    </div>
  );
}

export default Home;