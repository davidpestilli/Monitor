import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { toast } from 'sonner';

function ModalPesquisas({ tjsp, onClose }) {
  const [dados, setDados] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [pagina, setPagina] = useState(1);
  const porPagina = 5;

  const [modalEdicao, setModalEdicao] = useState(null); // { id, campo, valor }

  useEffect(() => {
    if (tjsp) buscarPesquisas();
  }, [tjsp]);

  const buscarPesquisas = async () => {
    setCarregando(true);
    const { data, error } = await supabase
      .from('pesquisas')
      .select('*')
      .eq('tjsp', tjsp)
      .order('data', { ascending: false });

    if (!error) setDados(data);
    setCarregando(false);
  };

  const salvarCampo = async (id, campo, valor) => {
    const { error } = await supabase
      .from('pesquisas')
      .update({ [campo]: valor })
      .eq('id', id);

    if (error) {
      toast.error('Erro ao salvar edição.');
    } else {
      toast.success('Campo atualizado com sucesso.');
      setModalEdicao(null);
      buscarPesquisas();
    }
  };

  const paginados = dados.slice((pagina - 1) * porPagina, pagina * porPagina);
  const totalPaginas = Math.ceil(dados.length / porPagina);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-3xl max-h-[90vh] overflow-auto relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-sm text-gray-600 hover:text-black"
        >
          Fechar ✕
        </button>

        <h2 className="text-xl font-bold mb-4">Pesquisas – {tjsp || '(processo indefinido)'}</h2>

        {carregando ? (
          <p>Carregando...</p>
        ) : dados.length === 0 ? (
          <p className="text-gray-500 italic">Nenhum registro encontrado.</p>
        ) : (
          <table className="w-full text-sm text-left border">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2">Seq</th>
                <th className="p-2">Data</th>
                <th className="p-2">Decisão</th>
                <th className="p-2">Movimentação</th>
              </tr>
            </thead>
            <tbody>
              {paginados.map((item, index) => (
                <tr key={item.id} className="border-t">
                  <td className="p-2">{(pagina - 1) * porPagina + index + 1}</td>
                  <td className="p-2">{item.data}</td>
                  <td
                    className="p-2 cursor-pointer hover:bg-blue-50"
                    onClick={() => setModalEdicao({ id: item.id, campo: 'decisao', valor: item.decisao })}
                  >
                    {item.decisao || <span className="text-gray-400 italic">(vazio)</span>}
                  </td>
                  <td
                    className="p-2 cursor-pointer hover:bg-blue-50"
                    onClick={() => setModalEdicao({ id: item.id, campo: 'movimentacao', valor: item.movimentacao })}
                  >
                    {item.movimentacao || <span className="text-gray-400 italic">(vazio)</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {totalPaginas > 1 && (
          <div className="flex justify-between items-center mt-4 text-sm">
            <button
              disabled={pagina === 1}
              onClick={() => setPagina(p => p - 1)}
              className="text-blue-600 disabled:text-gray-400"
            >
              Página anterior
            </button>
            <span>Página {pagina} de {totalPaginas}</span>
            <button
              disabled={pagina === totalPaginas}
              onClick={() => setPagina(p => p + 1)}
              className="text-blue-600 disabled:text-gray-400"
            >
              Próxima página
            </button>
          </div>
        )}

        {/* Modal de edição */}
        {modalEdicao && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white p-4 rounded shadow w-full max-w-lg">
              <h3 className="text-lg font-semibold mb-2">Editar {modalEdicao.campo}</h3>
              <textarea
                rows={5}
                className="w-full border rounded p-2 mb-4"
                value={modalEdicao.valor}
                onChange={(e) =>
                  setModalEdicao({ ...modalEdicao, valor: e.target.value })
                }
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setModalEdicao(null)}
                  className="px-3 py-1 text-sm border rounded"
                >
                  Cancelar
                </button>
                <button
                  onClick={() =>
                    salvarCampo(modalEdicao.id, modalEdicao.campo, modalEdicao.valor)
                  }
                  className="px-4 py-1 text-sm bg-green-600 text-white rounded"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ModalPesquisas;
