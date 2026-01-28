import { useState, useEffect } from 'react';
import { Bot, X, Minimize2, Maximize2, Loader2, CheckCircle, AlertCircle, Clock } from 'lucide-react';

/**
 * Modal flutuante de progresso para acompanhamento dos robôs
 * Posicionado no canto inferior direito da tela
 */
function ProgressModal({ 
  isRunning, 
  robotType, 
  status, 
  onClose,
  onMinimize 
}) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState('00:00');

  // Controle de tempo de execução
  useEffect(() => {
    if (isRunning && !startTime) {
      setStartTime(Date.now());
    }
    
    if (!isRunning) {
      setStartTime(null);
    }
  }, [isRunning]);

  // Atualiza tempo decorrido
  useEffect(() => {
    if (!startTime || !isRunning) return;
    
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
      const seconds = (elapsed % 60).toString().padStart(2, '0');
      setElapsedTime(`${minutes}:${seconds}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, isRunning]);

  // Não exibir se não houver execução
  if (!isRunning && (!status || status.status === 'idle')) {
    return null;
  }

  const progress = status?.total > 0 
    ? Math.round((status.processed / status.total) * 100) 
    : 0;

  const getStatusIcon = () => {
    if (status?.status === 'completed') {
      return <CheckCircle className="text-green-500" size={18} />;
    }
    if (status?.status === 'error') {
      return <AlertCircle className="text-red-500" size={18} />;
    }
    return <Loader2 className="text-blue-500 animate-spin" size={18} />;
  };

  const getStatusText = () => {
    if (status?.status === 'completed') {
      return 'Finalizado com sucesso';
    }
    if (status?.status === 'error') {
      return 'Erro na execução';
    }
    return 'Em execução...';
  };

  const getActionText = () => {
    if (!status?.message) return null;
    
    const msg = status.message.toLowerCase();
    
    if (msg.includes('iniciando') || msg.includes('starting')) {
      return 'Inicializando navegador...';
    }
    if (msg.includes('pesquisa') || msg.includes('buscando')) {
      return 'Realizando pesquisa no portal...';
    }
    if (msg.includes('extraindo') || msg.includes('extrai')) {
      return 'Extraindo dados do processo...';
    }
    if (msg.includes('atualiz')) {
      return 'Atualizando banco de dados...';
    }
    if (msg.includes('navegando') || msg.includes('acessando')) {
      return 'Navegando no portal...';
    }
    
    return status.message.substring(0, 50) + (status.message.length > 50 ? '...' : '');
  };

  // Versão minimizada
  if (isMinimized) {
    return (
      <div 
        className="fixed bottom-4 right-4 z-50 bg-white rounded-full shadow-lg border border-gray-200 p-3 cursor-pointer hover:shadow-xl transition-shadow"
        onClick={() => setIsMinimized(false)}
      >
        <div className="flex items-center space-x-3">
          {getStatusIcon()}
          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 ${
                status?.status === 'error' ? 'bg-red-500' :
                status?.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-sm font-medium text-gray-700">{progress}%</span>
          <Maximize2 size={14} className="text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 ${
        status?.status === 'error' ? 'bg-red-500' :
        status?.status === 'completed' ? 'bg-green-500' : 'bg-blue-600'
      }`}>
        <div className="flex items-center space-x-2">
          <Bot size={18} className="text-white" />
          <span className="text-white font-semibold text-sm">
            Robô {robotType?.toUpperCase() || 'N/A'}
          </span>
        </div>
        <div className="flex items-center space-x-1">
          <button 
            onClick={() => setIsMinimized(true)}
            className="p-1 hover:bg-white/20 rounded transition-colors"
            title="Minimizar"
          >
            <Minimize2 size={14} className="text-white" />
          </button>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded transition-colors"
            title="Fechar"
          >
            <X size={14} className="text-white" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Status e tempo */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <span className="text-sm text-gray-700">{getStatusText()}</span>
          </div>
          <div className="flex items-center space-x-1 text-gray-500">
            <Clock size={14} />
            <span className="text-xs font-mono">{elapsedTime}</span>
          </div>
        </div>

        {/* Barra de progresso */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Progresso</span>
            <span className="font-medium text-gray-700">
              {status?.processed || 0} de {status?.total || 0}
            </span>
          </div>
          <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${
                status?.status === 'error' ? 'bg-red-500' :
                status?.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-center">
            <span className="text-lg font-bold text-gray-800">{progress}%</span>
          </div>
        </div>

        {/* Processo atual */}
        {status?.current && (
          <div className="bg-gray-50 rounded-lg p-3 space-y-1">
            <p className="text-xs text-gray-500 font-medium">Processo atual:</p>
            <p className="text-sm text-gray-800 font-mono truncate" title={status.current}>
              {status.current}
            </p>
          </div>
        )}

        {/* Ação atual */}
        {getActionText() && (
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <span>{getActionText()}</span>
          </div>
        )}

        {/* Estatísticas */}
        {status?.total > 0 && (
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100">
            <div className="text-center">
              <p className="text-lg font-bold text-blue-600">{status.processed}</p>
              <p className="text-xs text-gray-500">Processados</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-amber-600">{status.total - status.processed}</p>
              <p className="text-xs text-gray-500">Restantes</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-gray-600">{status.total}</p>
              <p className="text-xs text-gray-500">Total</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProgressModal;
