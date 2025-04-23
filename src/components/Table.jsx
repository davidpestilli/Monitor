import { useState, useEffect } from 'react';
import ModalPesquisas from './ModalPesquisas';
import { Info, Trash2, ExternalLink } from 'lucide-react';
import { supabase } from '../services/supabase';
import { toast } from 'sonner';

function Table({ dados, carregando }) {
  const [tjspSelecionado, setTjspSelecionado] = useState(null);
  const [editandoCampo, setEditandoCampo] = useState(null);
  const [selecionados, setSelecionados] = useState([]);

  const definirSituacao = (movimentacao) => {
    if (!movimentacao) return 'Em trâmite';
  
    const texto = movimentacao.toLowerCase();
  
    if (texto.includes('recebido')) return 'Recebido';
    if (texto.includes('baixa')) return 'Baixa';
    if (texto.includes('trânsito')) return 'Trânsito';
  
    return 'Em trâmite';
  };
  

  const getBadgeColor = (situacao) => {
    switch (situacao?.toLowerCase()) {
      case 'baixa':
      case 'trânsito':
      case 'recebido':
        return 'bg-green-200 text-green-900';
      case 'em trâmite':
        return 'bg-yellow-200 text-yellow-900';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };
  

  const renderTooltip = (texto, children) => (
    <div className="relative group w-full">
      <div className="truncate max-w-[180px]">{children}</div>
      <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block bg-black text-white text-xs rounded py-1 px-2 z-50 whitespace-pre-wrap max-w-xs shadow">
        {texto}
      </div>
    </div>
  );

  const atualizarSituacao = async (id, movimentacao) => {
    const novaSituacao = definirSituacao(movimentacao);
    const { error } = await supabase
      .from('processos')
      .update({ situacao: novaSituacao })
      .eq('id', id);
  
    if (error) {
      toast.error('Erro ao atualizar a situação.');
    }
  };


const salvarCampo = async (id, campo, valor) => {
  const { error } = await supabase.from('processos').update({ [campo]: valor }).eq('id', id);

  if (error) {
    toast.error('Erro ao salvar alteração.');
  } else {
    toast.success('Campo atualizado com sucesso.');

    // Se o campo alterado foi a movimentação, atualiza também a situação
    if (campo === 'movimentacao') {
      atualizarSituacao(id, valor);
    }

    setEditandoCampo(null);
  }
};


  
  const renderModalEditavel = (item, campo) => (
    renderTooltip(item[campo], (
      <span
        onClick={() => setEditandoCampo({ id: item.id, campo, valor: item[campo] || '' })}
        className="cursor-pointer hover:underline"
      >
        {item[campo] || <em className="text-gray-400">(vazio)</em>}
      </span>
    ))
  );

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
      // Obtem os tjsps relacionados aos processos selecionados
      const processosSelecionados = dados.filter((item) => selecionados.includes(item.id));
      const tjsps = processosSelecionados.map((item) => item.tjsp);
  
      // Exclui os registros da tabela "pesquisas"
      const { error: errorPesquisas } = await supabase.from('pesquisas').delete().in('tjsp', tjsps);
      if (errorPesquisas) {
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
        window.location.reload();
      }
    }
  };
  

  return (
    <>


<div className="mb-4 flex flex-wrap justify-between items-center gap-2">
  {selecionados.length > 0 && (
    <button
      onClick={excluirSelecionados}
      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
    >
      Excluir selecionados ({selecionados.length})
    </button>
  )}

</div>



      <div className="overflow-auto rounded-lg shadow bg-white">
        <table className="min-w-full text-sm text-left border-separate border-spacing-y-1">
          <thead className="bg-slate-50 text-xs uppercase text-slate-600 border-b">
            <tr>
              <th className="px-4 py-2">#</th>
              <th className="px-4 py-2">Gap</th>
              <th className="px-4 py-2">Réu</th>
              <th className="px-4 py-2">TJSP</th>
              <th className="px-4 py-2">Superior</th>
              <th className="px-4 py-2">Tribunal</th>
              <th className="px-4 py-2">Situação</th>
              <th className="px-4 py-2">Decisão</th>
              <th className="px-4 py-2">Resumo</th>
              <th className="px-4 py-2">Movimentação</th>
              <th className="px-4 py-2 text-center">Link</th>
              <th className="px-4 py-2 text-center">
                <input
                  type="checkbox"
                  checked={selecionados.length === dados.length && dados.length > 0}
                  onChange={toggleTodosSelecionados}
                />
              </th>
            </tr>
          </thead>
          <tbody>
            {carregando ? (
              <tr>
                <td colSpan={12} className="px-4 py-3 text-center">Carregando...</td>
              </tr>
            ) : dados.length === 0 ? (
              <tr>
                <td colSpan={12} className="px-4 py-3 text-center text-gray-500 italic">Nenhum dado encontrado.</td>
              </tr>
            ) : (
              dados.map((item, index) => (
                <tr key={item.id} className="bg-white hover:bg-blue-50 border border-slate-200 rounded-md shadow-sm">
                  <td className="px-4 py-2 font-semibold text-slate-600">{index + 1}</td>

                  <td className="px-4 py-2">
                    {editandoCampo?.id === item.id && editandoCampo?.campo === 'gap' ? (
                      <input
                        type="text"
                        value={editandoCampo.valor}
                        autoFocus
                        onChange={(e) => setEditandoCampo({ ...editandoCampo, valor: e.target.value })}
                        onBlur={() => salvarCampo(item.id, 'gap', editandoCampo.valor)}
                        onKeyDown={(e) => e.key === 'Enter' && salvarCampo(item.id, 'gap', editandoCampo.valor)}
                        className="border px-2 py-1 rounded w-full text-sm"
                      />
                    ) : (
                      <span
                        onClick={() => setEditandoCampo({ id: item.id, campo: 'gap', valor: item.gap || '' })}
                        className="cursor-pointer hover:underline"
                      >
                        {item.gap || <em className="text-gray-400">(vazio)</em>}
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-2">{renderModalEditavel(item, 'reu')}</td>

                  <td
                    className="px-4 py-2 text-blue-600 underline cursor-pointer"
                    onClick={() => setTjspSelecionado(item.tjsp)}
                  >
                    {item.tjsp}
                  </td>

                  <td className="px-4 py-2">
                    {editandoCampo?.id === item.id && editandoCampo?.campo === 'superior' ? (
                      <input
                        type="text"
                        value={editandoCampo.valor}
                        autoFocus
                        onChange={(e) => setEditandoCampo({ ...editandoCampo, valor: e.target.value })}
                        onBlur={() => salvarCampo(item.id, 'superior', editandoCampo.valor)}
                        onKeyDown={(e) => e.key === 'Enter' && salvarCampo(item.id, 'superior', editandoCampo.valor)}
                        className="border px-2 py-1 rounded w-full text-sm"
                      />
                    ) : (
                      <span
                        onClick={() => setEditandoCampo({ id: item.id, campo: 'superior', valor: item.superior || '' })}
                        className="cursor-pointer hover:underline"
                      >
                        {item.superior || <em className="text-gray-400">(vazio)</em>}
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-2">{item.tribunal}</td>
                  <td className="px-4 py-2">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${getBadgeColor(item.situacao)}`}>{item.situacao}</span>
                  </td>
                  <td className={`px-4 py-2 ${item.link?.includes('processo.stj.jus.br/processo/pesquisa/') ? 'bg-yellow-100' : ''}`}>
                    {renderModalEditavel(item, 'decisao')}
                  </td>
                  <td className="px-4 py-2">{renderModalEditavel(item, 'resumo')}</td>
                  <td className={`px-4 py-2 ${item.movimentacao === 'Não há movimentação no STJ' ? 'bg-yellow-100' : ''}`}>
                    {renderModalEditavel(item, 'movimentacao')}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <a href={item.link} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center w-6 h-6 text-blue-600 hover:text-blue-800">
                      <ExternalLink size={16} />
                    </a>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={selecionados.includes(item.id)}
                      onChange={() => toggleSelecionado(item.id)}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {tjspSelecionado && (
        <ModalPesquisas tjsp={tjspSelecionado} onClose={() => setTjspSelecionado(null)} />
      )}

      {editandoCampo && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded shadow w-full max-w-lg">
            <h3 className="text-lg font-semibold mb-2">Editar {editandoCampo.campo}</h3>
            <textarea
              rows={5}
              className="w-full border rounded p-2 mb-4"
              value={editandoCampo.valor}
              onChange={(e) => setEditandoCampo({ ...editandoCampo, valor: e.target.value })}
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditandoCampo(null)} className="px-3 py-1 text-sm border rounded">Cancelar</button>
              <button onClick={() => salvarCampo(editandoCampo.id, editandoCampo.campo, editandoCampo.valor)} className="px-4 py-1 text-sm bg-green-600 text-white rounded">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Table;
