import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import Table from '../components/Table';
import ModalAdicionar from '../components/ModalAdicionar';
import { Search, Filter, Download, Plus, RotateCcw } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

function Home() {
  const [dados, setDados] = useState([]);
  const [filtrados, setFiltrados] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [showModal, setShowModal] = useState(false);
  
  // Novos estados para o sistema de filtros redesenhado
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTribunal, setFilterTribunal] = useState('');
  const [filterHC, setFilterHC] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const exportarParaExcel = () => {
    const dadosExportados = filtrados.map((item) => {
      return {
        'Criado em': item.created_at
          ? new Date(item.created_at).toLocaleDateString('pt-BR')
          : '',
        'GAP': item.gap || '',
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

    // Busca os processos
    const { data: processos, error: errorProcessos } = await supabase
      .from('processos')
      .select('*');

    if (errorProcessos) {
      console.error('Erro ao carregar processos:', errorProcessos);
      setCarregando(false);
      return;
    }

    // Para cada processo, busca a movimentação mais recente da tabela pesquisas
    const processosComMovimentacao = await Promise.all(
      processos.map(async (processo) => {
        const { data: pesquisas, error: errorPesquisas } = await supabase
          .from('pesquisas')
          .select('movimentacao, decisao, data')
          .eq('tjsp', processo.tjsp)
          .order('data', { ascending: false })
          .limit(1);

        // Se encontrou pesquisas, usa a movimentação mais recente
        if (!errorPesquisas && pesquisas && pesquisas.length > 0) {
          return {
            ...processo,
            movimentacao: pesquisas[0].movimentacao,
            decisao: pesquisas[0].decisao,
            data_ultima_movimentacao: pesquisas[0].data
          };
        }

        // Caso contrário, mantém os dados originais do processo
        return processo;
      })
    );

    setDados(processosComMovimentacao);
    setFiltrados(processosComMovimentacao);
    setCarregando(false);
  };

  useEffect(() => {
    carregarDados();
  }, []);

  // Nova lógica de filtros unificada
  useEffect(() => {
    let resultado = [...dados];

    // Filtro de busca unificada
    if (searchTerm) {
      resultado = resultado.filter(item =>
        item.gap?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.reu?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.tjsp?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.superior?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtros avançados
    if (filterStatus) {
      resultado = resultado.filter(item => item.situacao === filterStatus);
    }

    if (filterTribunal) {
      resultado = resultado.filter(item => item.tribunal === filterTribunal);
    }

    // Filtro de Habeas Corpus
    if (filterHC === 'sim') {
      resultado = resultado.filter(item => item.superior === 'Habeas Corpus');
    } else if (filterHC === 'nao') {
      resultado = resultado.filter(item => item.superior !== 'Habeas Corpus');
    }

    setFiltrados(resultado);
  }, [dados, searchTerm, filterStatus, filterTribunal, filterHC]);
  
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

      // Checagem de link: verificar se está vazio ou incompatível com o tribunal
      const linkPadraoSTJ = 'https://www.stj.jus.br/sites/portalp/Processos/Consulta-Processual';
      const linkPadraoSTF = 'https://portal.stf.jus.br/';

      if (item.tribunal === 'STJ') {
        // Se link vazio ou não contém "stj", atualizar para link padrão
        if (!item.link || !item.link.toLowerCase().includes('stj')) {
          atualizacoes.link = linkPadraoSTJ;
        }
      } else if (item.tribunal === 'STF') {
        // Se link vazio ou não contém "stf", atualizar para link padrão
        if (!item.link || !item.link.toLowerCase().includes('stf')) {
          atualizacoes.link = linkPadraoSTF;
        }
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

  const clearAllFilters = () => {
    setSearchTerm('');
    setFilterStatus('');
    setFilterTribunal('');
    setFilterHC('');
  };

  const hasActiveFilters = searchTerm || filterStatus || filterTribunal || filterHC;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900">Monitor de Processos</h1>
              <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {filtrados.length} processos
              </span>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={exportarParaExcel}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Download size={16} className="mr-2" />
                Exportar
              </button>
              
              <button
                onClick={forcarAtualizacaoSituacoes}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <RotateCcw size={16} className="mr-2" />
                Atualizar
              </button>
              
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus size={16} className="mr-2" />
                Adicionar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por GAP, réu, TJSP ou superior..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            {/* Filter Toggle */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`inline-flex items-center px-3 py-2 border rounded-md text-sm font-medium transition-colors ${
                  showAdvancedFilters || filterStatus || filterTribunal || filterHC
                    ? 'border-blue-300 text-blue-700 bg-blue-50'
                    : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                }`}
              >
                <Filter size={16} className="mr-2" />
                Filtros
              </button>
              
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>
          
          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="">Todas as situações</option>
                  <option value="Em trâmite">Em trâmite</option>
                  <option value="Recebido">Recebido</option>
                  <option value="Baixa">Baixa</option>
                  <option value="Trânsito">Trânsito</option>
                </select>

                <select
                  value={filterTribunal}
                  onChange={(e) => setFilterTribunal(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="">Todos os tribunais</option>
                  <option value="STJ">STJ</option>
                  <option value="STF">STF</option>
                </select>

                <select
                  value={filterHC}
                  onChange={(e) => setFilterHC(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="">Habeas Corpus (Todos)</option>
                  <option value="sim">Apenas HC</option>
                  <option value="nao">Excluir HC</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Table */}
        <Table 
          dados={filtrados} 
          carregando={carregando} 
          onRefresh={carregarDados}
        />

        {/* Modal */}
        {showModal && (
          <ModalAdicionar
            onClose={() => setShowModal(false)}
            onRefresh={carregarDados}
          />
        )}
      </div>
    </div>
  );
}

export default Home;