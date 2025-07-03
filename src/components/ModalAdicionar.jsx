import { useState } from 'react';
import { supabase } from '../services/supabase';
import { toast } from 'sonner';
import { X, Plus, FileText } from 'lucide-react';

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
      gap: '', // Campo vazio para ser preenchido depois
      situacao: 'Em trâmite' // Status padrão
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
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Plus size={20} className="text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Adicionar Processos</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={carregando}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Textarea */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Números dos Processos
            </label>
            <div className="relative">
              <FileText size={16} className="absolute top-3 left-3 text-gray-400" />
              <textarea
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={4}
                placeholder="Cole aqui os números dos processos no formato: 1234567-12.2024.8.26.0100"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                disabled={carregando}
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Formato esperado: 0000000-00.0000.0.00.0000
            </p>
          </div>

          {/* Tribunal Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tribunal Superior
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => setTribunal('STJ')}
                disabled={carregando}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-md border transition-colors ${
                  tribunal === 'STJ'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                STJ
              </button>
              <button
                onClick={() => setTribunal('STF')}
                disabled={carregando}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-md border transition-colors ${
                  tribunal === 'STF'
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                STF
              </button>
            </div>
          </div>

          {/* Preview */}
          {texto && (
            <div className="bg-gray-50 rounded-md p-3">
              <p className="text-xs font-medium text-gray-700 mb-1">Preview:</p>
              <p className="text-xs text-gray-600">
                {texto.match(/\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/g)?.length || 0} processo(s) encontrado(s)
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            disabled={carregando}
          >
            Cancelar
          </button>
          <button
            onClick={handleAdicionar}
            disabled={carregando || !tribunal || !texto}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {carregando ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Adicionando...</span>
              </div>
            ) : (
              `Adicionar${texto.match(/\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/g)?.length ? ` (${texto.match(/\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/g).length})` : ''}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ModalAdicionar;