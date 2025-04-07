import { useState } from 'react';
import { supabase } from '../services/supabase';
import { toast } from 'sonner';

function ModalAdicionar({ onRefresh, onClose }) {
  const [tribunal, setTribunal] = useState('');
  const [texto, setTexto] = useState('');
  const [carregando, setCarregando] = useState(false);

  const handleAdicionar = async () => {
    if (!tribunal) {
      toast.error('Selecione o tribunal (STJ ou STF)');
      return;
    }

    const regex = /\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/g;
    const numerosEncontrados = texto.match(regex);

    if (!numerosEncontrados || numerosEncontrados.length === 0) {
      toast.error('Nenhum número de processo válido foi encontrado.');
      return;
    }

    setCarregando(true);

    const registros = numerosEncontrados.map((numero) => ({
      tjsp: numero,
      tribunal: tribunal,
    }));

    const { error } = await supabase
      .from('processos')
      .insert(registros, { count: 'exact' });

    setCarregando(false);

    if (error) {
      console.error(error);
      toast.error('Erro ao adicionar processos.');
    } else {
      toast.success(`${registros.length} processo(s) adicionados com sucesso!`);
      setTexto('');
      setTribunal('');
      onClose();
      if (onRefresh) onRefresh();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">Adicionar Processos</h2>

        <textarea
          className="w-full border rounded p-2 text-sm mb-4"
          rows={4}
          placeholder="Cole aqui os números dos processos"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setTribunal('STJ')}
            className={`px-3 py-1 rounded border ${
              tribunal === 'STJ' ? 'bg-blue-500 text-white' : 'bg-white'
            }`}
          >
            STJ
          </button>
          <button
            onClick={() => setTribunal('STF')}
            className={`px-3 py-1 rounded border ${
              tribunal === 'STF' ? 'bg-blue-500 text-white' : 'bg-white'
            }`}
          >
            STF
          </button>
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1 text-sm rounded border border-gray-300"
            disabled={carregando}
          >
            Cancelar
          </button>
          <button
            onClick={handleAdicionar}
            className="px-4 py-1 text-sm bg-green-600 text-white rounded"
            disabled={carregando}
          >
            {carregando ? 'Adicionando...' : 'Adicionar'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ModalAdicionar;