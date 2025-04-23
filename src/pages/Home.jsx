import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import Table from '../components/Table';
import ModalAdicionar from '../components/ModalAdicionar';
import Filters from '../components/Filters';
import * as XLSX from 'xlsx';
import { toast } from 'sonner'

function Home() {
  const [dados, setDados] = useState([]);
  const [filtrados, setFiltrados] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const exportarParaExcel = () => {
    const dadosExportados = filtrados.map((item) => {
      return {
        'Criado em': item.created_at
          ? new Date(item.created_at).toLocaleDateString('pt-BR')
          : '',
        'Gap': item.gap || '',
        'Parte Ré + Advogado': item.reu || '',
        'Número TJSP': item.tjsp || '',
        'Número Superior': item.superior || '',
        'Tribunal': item.tribunal || '',
        'Situação': item.situacao || '',
        'Última Decisão': item.decisao || '',
        'Resumo': item.resumo || '',
        'Última Movimentação': item.movimentacao || '',
        'Link Processo': item.link
          ? { f: `HYPERLINK("${item.link}", "Ver processo")` }
          : '',
      };
    });


    // Ordena por Situação e Tribunal
    dadosExportados.sort((a, b) => {
      if (a.Situação < b.Situação) return -1;
      if (a.Situação > b.Situação) return 1;
      return a.Tribunal.localeCompare(b.Tribunal);
    });
  
    const ws = XLSX.utils.json_to_sheet(dadosExportados, { cellDates: true });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Registros');
  
    const hoje = new Date();
    const nomeArquivo = `registros_${hoje.getDate().toString().padStart(2, '0')}-${(hoje.getMonth() + 1)
      .toString()
      .padStart(2, '0')}-${hoje.getFullYear()}.xlsx`;
  
    XLSX.writeFile(wb, nomeArquivo);
  };  
  

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

  const aplicarFiltro = ({ gap, tribunal, situacao, reu, tjsp, superior }) => {
    let resultado = [...dados];
    if (gap) resultado = resultado.filter((d) => d.gap?.toLowerCase().includes(gap.toLowerCase()));
    if (tribunal) resultado = resultado.filter((d) => d.tribunal === tribunal);
    if (situacao) resultado = resultado.filter((d) => d.situacao === situacao);
    if (reu) resultado = resultado.filter((d) => d.reu?.toLowerCase().includes(reu.toLowerCase()));
    if (tjsp) resultado = resultado.filter((d) => d.tjsp?.toLowerCase().includes(tjsp.toLowerCase()));
    if (superior) resultado = resultado.filter((d) => d.superior?.toLowerCase().includes(superior.toLowerCase()));
    setFiltrados(resultado);
  };
  
  const forcarAtualizacaoSituacoes = async () => {
    let erros = 0;
  
    for (const item of filtrados) {
      const atualizacoes = {};
      const texto = item.movimentacao?.toLowerCase() || '';
  
      const novaSituacao = texto.includes('recebido')
        ? 'Recebido'
        : texto.includes('baixa')
        ? 'Baixa'
        : texto.includes('trânsito')
        ? 'Trânsito'
        : 'Em trâmite';
  
      if (item.situacao !== novaSituacao) {
        atualizacoes.situacao = novaSituacao;
      }
  
      if (item.link?.includes('processo.stj.jus.br/processo/pesquisa/')) {
        atualizacoes.decisao = 'Não há decisão';
      }
  
      if (item.movimentacao === 'Não há movimentação no STJ') {
        atualizacoes.movimentacao = item.movimentacao;
      }
  
      if (Object.keys(atualizacoes).length > 0) {
        const { error } = await supabase
          .from('processos')
          .update(atualizacoes)
          .eq('id', item.id);
  
        if (error) erros++;
      }
    }
  
    if (erros === 0) toast.success('Todas as situações foram atualizadas com sucesso!');
    else toast.error(`Houve ${erros} erro(s) na atualização.`);
  };  

  return (
    <div className="w-full px-4">
      <div className="flex flex-wrap items-center justify-between mb-4 gap-4">
        <Filters dados={dados} onFiltro={aplicarFiltro} />

        <button
          onClick={exportarParaExcel}
          className="px-4 py-2 bg-green-600 text-white text-base rounded hover:bg-green-700"
        >
          Exportar Para Excel
        </button>

        <button
          onClick={forcarAtualizacaoSituacoes}
          className="px-4 py-2 bg-yellow-500 text-white text-base rounded hover:bg-yellow-600"
        >
          Atualizar Situações
        </button>

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