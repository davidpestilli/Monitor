import { useState } from 'react';
import { supabase } from '../services/supabase';
import { toast } from 'sonner';

// Importação correta dos ícones
import { 
  ExternalLink, 
  FileText, 
  Calendar, 
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

function Table({ dados, carregando, onRefresh }) {
  const [selecionados, setSelecionados] = useState([]);
  
  // Estados para edição
  const [editandoGap, setEditandoGap] = useState(null);
  const [resumoModal, setResumoModal] = useState(null);
  const [ultimasPesquisas, setUltimasPesquisas] = useState({});
  
  // Estado para ordenação por número do processo
  const [ordenacaoProcesso, setOrdenacaoProcesso] = useState(null); // null, 'asc', 'desc'

  // Função para extrair número do processo para ordenação
  const extrairNumeroProcesso = (tjsp) => {
    if (!tjsp) return 0;
    // Remove pontos e traços para obter apenas números
    const numeros = tjsp.replace(/[^0-9]/g, '');
    return parseInt(numeros, 10) || 0;
  };

  // Função para ordenar dados
  const dadosOrdenados = () => {
    if (!ordenacaoProcesso || !dados) return dados;
    
    return [...dados].sort((a, b) => {
      const numA = extrairNumeroProcesso(a.tjsp);
      const numB = extrairNumeroProcesso(b.tjsp);
      
      if (ordenacaoProcesso === 'asc') {
        return numA - numB;
      } else {
        return numB - numA;
      }
    });
  };

  // Função para alternar ordenação
  const toggleOrdenacaoProcesso = () => {
    if (ordenacaoProcesso === null) {
      setOrdenacaoProcesso('asc');
    } else if (ordenacaoProcesso === 'asc') {
      setOrdenacaoProcesso('desc');
    } else {
      setOrdenacaoProcesso(null);
    }
  };

  const StatusBadge = ({ status }) => {
    const styles = {
      'Em trâmite': 'bg-yellow-100 text-yellow-800',
      'Recebido': 'bg-green-100 text-green-800',
      'Baixa': 'bg-gray-100 text-gray-800',
      'Trânsito': 'bg-purple-100 text-purple-800'
    };
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  const TribunalBadge = ({ tribunal }) => {
    const color = tribunal === 'STF' ? 'bg-red-600' : 'bg-blue-600';
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium text-white ${color}`}>
        {tribunal}
      </span>
    );
  };

  const salvarGap = async (id, novoGap) => {
    const { error } = await supabase.from('processos').update({ gap: novoGap }).eq('id', id);

    if (error) {
      toast.error('Erro ao salvar GAP.');
    } else {
      toast.success('GAP atualizado com sucesso.');
      if (onRefresh) onRefresh();
    }
    setEditandoGap(null);
  };

  const salvarResumo = async (id, novoResumo) => {
    const { error } = await supabase.from('processos').update({ resumo: novoResumo }).eq('id', id);

    if (error) {
      toast.error('Erro ao salvar resumo.');
    } else {
      toast.success('Resumo atualizado com sucesso.');
      if (onRefresh) onRefresh();
    }
    setResumoModal(null);
  };

  const toggleSelecionado = (id) => {
    setSelecionados((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleTodosSelecionados = () => {
    if (selecionados.length === dados.length) {
      setSelecionados([]);
    } else {
      setSelecionados(dados.map((item) => item.id));
    }
  };

  const excluirSelecionados = async () => {
    if (confirm(`Deseja realmente excluir ${selecionados.length} processo(s)?`)) {
      const processosSelecionados = dados.filter((item) => selecionados.includes(item.id));

      // Exclui os registros da tabela "pesquisas" para cada processo (filtrando por tjsp E tribunal)
      const exclusoesPesquisas = await Promise.all(
        processosSelecionados.map((processo) =>
          supabase
            .from('pesquisas')
            .delete()
            .eq('tjsp', processo.tjsp)
            .eq('tribunal', processo.tribunal)
        )
      );

      // Verifica se houve erros na exclusão de pesquisas
      const errosPesquisas = exclusoesPesquisas.filter((result) => result.error);
      if (errosPesquisas.length > 0) {
        toast.error('Erro ao excluir pesquisas.');
        return;
      }

      // Exclui os registros da tabela "processos"
      const { error: errorProcessos } = await supabase.from('processos').delete().in('id', selecionados);
      if (errorProcessos) {
        toast.error('Erro ao excluir processos.');
      } else {
        toast.success(`${selecionados.length} processo(s) e pesquisas relacionadas excluídos com sucesso.`);
        setSelecionados([]);
        if (onRefresh) onRefresh();
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Nunca';
    
    // Forçar horário meio-dia para evitar problemas de fuso horário
    // Isso evita que a conversão UTC→Local mude o dia
    const date = new Date(dateString + 'T12:00:00.000Z');
    return date.toLocaleDateString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric'
    });
  };

  const getDaysAgo = (dateString) => {
    if (!dateString) return '';
    
    // Usar a mesma lógica para calcular dias
    const date = new Date(dateString + 'T12:00:00.000Z');
    const today = new Date();
    const diffTime = today - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays === 0 ? 'hoje' : `${diffDays}d atrás`;
  };

  // Função para determinar a mensagem da decisão baseada na movimentação
  const getDecisaoMessage = (item) => {
    const movimentacao = item.movimentacao?.toLowerCase() || '';
    
    // Se a movimentação indica que não há movimentação no tribunal
    if (movimentacao.includes('não há movimentação no stj') || 
        movimentacao.includes('não há movimentação no stf')) {
      return "Não há decisão";
    }
    
    // Se há decisão, mostra ela
    if (item.decisao) {
      // Se a decisão contém "veja coluna link", substitui pela nova mensagem
      if (item.decisao.toLowerCase().includes('veja coluna link')) {
        return "Veja o link para a decisão";
      }
      return item.decisao;
    }
    
    // Caso padrão quando não há decisão
    return "Não há Despacho ou Acórdão registrado";
  };

  // Função para buscar e cachear a data da última pesquisa
  const buscarUltimaPesquisa = async (tjsp, tribunal) => {
    // Cria uma chave única combinando tjsp e tribunal
    const cacheKey = `${tjsp}_${tribunal}`;

    // Se já temos a data em cache, retorna ela
    if (ultimasPesquisas[cacheKey]) {
      return ultimasPesquisas[cacheKey];
    }

    // Busca diretamente no banco de dados para ter dados atualizados
    const campoData = tribunal === 'STJ' ? 'pesquisa_stj' : 'pesquisa_stf';
    
    const { data: processoAtualizado, error } = await supabase
      .from('processos')
      .select(`${campoData}, created_at`)
      .eq('tjsp', tjsp)
      .eq('tribunal', tribunal)
      .single();
    
    let resultado;
    if (!error && processoAtualizado && processoAtualizado[campoData]) {
      resultado = {
        data: processoAtualizado[campoData],
        tipo: 'pesquisa'
      };
    } else {
      // Fallback para created_at
      resultado = {
        data: processoAtualizado?.created_at || dados.find(item => item.tjsp === tjsp)?.created_at,
        tipo: 'criacao'
      };
    }
    
    // Armazena no cache
    setUltimasPesquisas(prev => ({
      ...prev,
      [cacheKey]: resultado
    }));
    
    return resultado;
  };

  return (
    <>
      {/* Ações em lote */}
      {selecionados.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-800">
              {selecionados.length} processo(s) selecionado(s)
            </span>
            <div className="flex items-center space-x-3">
              <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                Exportar selecionados
              </button>
              <button 
                onClick={excluirSelecionados}
                className="text-sm text-red-600 hover:text-red-800 font-medium"
              >
                Excluir selecionados
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabela */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed" style={{ minWidth: '1400px' }}>
            <colgroup>
              <col style={{ width: '40px' }} />
              <col style={{ width: '200px' }} />
              <col style={{ width: '200px' }} />
              <col style={{ width: '150px' }} />
              <col style={{ width: '300px' }} />
              <col style={{ width: '400px' }} />
              <col style={{ width: '160px' }} />
            </colgroup>
            <thead className="bg-gray-50">
              <tr>
                <th className="w-8 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selecionados.length === dados.length && dados.length > 0}
                    onChange={toggleTodosSelecionados}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={toggleOrdenacaoProcesso}
                    className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                    title={ordenacaoProcesso === null ? 'Ordenar por número' : ordenacaoProcesso === 'asc' ? 'Menor para maior' : 'Maior para menor'}
                  >
                    Processo
                    {ordenacaoProcesso === null && <ArrowUpDown size={14} className="text-gray-400" />}
                    {ordenacaoProcesso === 'asc' && <ArrowUp size={14} className="text-blue-600" />}
                    {ordenacaoProcesso === 'desc' && <ArrowDown size={14} className="text-blue-600" />}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Réu
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tribunal/Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Resumo
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Última Movimentação
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '160px' }}>
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {carregando ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    Carregando...
                  </td>
                </tr>
              ) : dados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <svg className="w-12 h-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-lg font-medium text-gray-900 mb-1">Nenhum processo encontrado</p>
                      <p className="text-sm text-gray-500">Tente ajustar os filtros ou adicionar novos processos</p>
                    </div>
                  </td>
                </tr>
              ) : (
                dadosOrdenados().map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selecionados.includes(item.id)}
                        onChange={() => toggleSelecionado(item.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    
                    {/* Coluna Processo: GAP + TJSP + Superior */}
                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        {/* GAP editável */}
                        <div className="font-medium text-gray-900 text-sm">
                          {editandoGap?.id === item.id ? (
                            <input
                              type="text"
                              value={editandoGap.value}
                              onChange={(e) => setEditandoGap({...editandoGap, value: e.target.value})}
                              onBlur={() => salvarGap(item.id, editandoGap.value)}
                              onKeyDown={(e) => e.key === 'Enter' && salvarGap(item.id, editandoGap.value)}
                              className="border border-blue-300 rounded px-2 py-1 text-sm w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              autoFocus
                            />
                          ) : (
                            <span
                              onClick={() => setEditandoGap({ id: item.id, value: item.gap })}
                              className="cursor-pointer hover:bg-blue-50 px-1 py-0.5 rounded"
                            >
                              GAP: {item.gap}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-blue-600 font-mono">{item.tjsp}</div>
                        {item.superior && (
                          <div className="text-xs text-gray-500 font-mono">
                            {item.superior === 'Habeas Corpus' ? (
                              <span className="text-purple-600 font-semibold">Habeas Corpus</span>
                            ) : (
                              item.superior
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    
                    {/* Coluna Réu */}
                    <td className="px-4 py-4">
                      <div className="text-sm font-medium text-gray-900 max-w-xs truncate" title={item.reu}>
                        {item.reu}
                      </div>
                    </td>
                    
                    {/* Coluna Tribunal/Status */}
                    <td className="px-4 py-4">
                      <div className="space-y-2">
                        <TribunalBadge tribunal={item.tribunal} />
                        <StatusBadge status={item.situacao} />
                      </div>
                    </td>
                    
                    {/* Coluna Resumo */}
                    <td className="px-4 py-4">
                      <div 
                        className="text-sm text-gray-900 max-w-xs cursor-pointer hover:bg-blue-50 p-2 rounded transition-colors"
                        onClick={() => setResumoModal({ id: item.id, value: item.resumo })}
                        title={item.resumo || "Clique para adicionar resumo"}
                      >
                        {item.resumo ? (
                          <div className="truncate">
                            {item.resumo.length > 80 ? `${item.resumo.substring(0, 80)}...` : item.resumo}
                          </div>
                        ) : (
                          <div className="text-gray-400 italic text-xs">
                            Clique para adicionar resumo
                          </div>
                        )}
                      </div>
                    </td>
                    
                    {/* Coluna Última Movimentação */}
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-900 max-w-md">
                        <div className="truncate font-medium" title={item.movimentacao}>
                          {item.movimentacao}
                        </div>
                        <div className="text-xs text-gray-500 mt-1 truncate" title={getDecisaoMessage(item)}>
                          {getDecisaoMessage(item)}
                        </div>
                      </div>
                    </td>
                    
                    {/* Coluna Ações */}
                    <td className="px-2 py-4" style={{ width: '96px' }}>
                      <div className="flex items-center justify-center" style={{ gap: '8px', minWidth: '96px' }}>
                        {/* Abrir processo externo */}
                        <button
                          onClick={() => window.open(item.link, '_blank')}
                          className="flex items-center justify-center w-8 h-8 rounded text-green-600 hover:bg-green-50 transition-colors"
                          title="Abrir processo no tribunal"
                          style={{ minWidth: '32px', minHeight: '32px' }}
                        >
                          <ExternalLink size={16} />
                        </button>
                        
                        {/* Data da última pesquisa */}
                        <div className="relative group">
                          <button
                            onMouseEnter={async () => {
                              // Busca e cacheia a data no hover
                              await buscarUltimaPesquisa(item.tjsp, item.tribunal);
                            }}
                            onClick={async () => {
                              const resultado = await buscarUltimaPesquisa(item.tjsp, item.tribunal);
                              
                              let mensagem;
                              if (resultado.tipo === 'pesquisa') {
                                mensagem = `Última pesquisa: ${formatDate(resultado.data)} (${getDaysAgo(resultado.data)})`;
                              } else {
                                mensagem = `Processo criado em: ${formatDate(resultado.data)} (${getDaysAgo(resultado.data)}) - Sem pesquisas registradas`;
                              }
                              
                              toast.info(mensagem);
                            }}
                            className="flex items-center justify-center w-8 h-8 rounded text-orange-600 hover:bg-orange-50 transition-colors"
                            style={{ minWidth: '32px', minHeight: '32px' }}
                          >
                            <Calendar size={16} />
                          </button>
                          
                          {/* Tooltip customizado */}
                          {ultimasPesquisas[`${item.tjsp}_${item.tribunal}`] && (
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-xs text-white bg-gray-900 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                              {ultimasPesquisas[`${item.tjsp}_${item.tribunal}`].tipo === 'pesquisa' ? (
                                <>
                                  <div className="font-semibold">Última pesquisa:</div>
                                  <div>{formatDate(ultimasPesquisas[`${item.tjsp}_${item.tribunal}`].data)}</div>
                                  <div className="text-gray-300">({getDaysAgo(ultimasPesquisas[`${item.tjsp}_${item.tribunal}`].data)})</div>
                                </>
                              ) : (
                                <>
                                  <div className="font-semibold">Processo criado:</div>
                                  <div>{formatDate(ultimasPesquisas[`${item.tjsp}_${item.tribunal}`].data)}</div>
                                  <div className="text-gray-300">Sem pesquisas registradas</div>
                                </>
                              )}
                              {/* Seta do tooltip */}
                              <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal do Resumo */}
      {resumoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-1/3 max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Resumo do Processo</h3>
              <button
                onClick={() => setResumoModal(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex-1 p-6">
              <textarea
                rows={12}
                className="w-full border border-gray-300 rounded-md p-3 text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={resumoModal.value || ''}
                onChange={(e) => setResumoModal({...resumoModal, value: e.target.value})}
                placeholder="Digite o resumo do processo..."
              />
            </div>
            
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <button 
                onClick={() => setResumoModal(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button 
                onClick={() => salvarResumo(resumoModal.id, resumoModal.value)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Table;