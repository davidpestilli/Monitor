import { useState, useEffect } from 'react';
import { Bot, Play, Square, Terminal, Download, AlertCircle, CheckCircle, Loader2, X, Settings, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { 
  isLocalEnvironment, 
  checkLocalServer, 
  runSTFRobot, 
  runSTJRobot, 
  getRobotStatus, 
  stopRobot,
  resetRobotStatus,
  installRequirements,
  checkRequirements 
} from '../services/robotService';

function RobotPanel({ onRefresh }) {
  const [isLocal, setIsLocal] = useState(false);
  const [serverAvailable, setServerAvailable] = useState(false);
  const [robotRunning, setRobotRunning] = useState(null); // 'stf', 'stj', ou null
  const [robotStatus, setRobotStatus] = useState(null);
  const [showPanel, setShowPanel] = useState(false);
  const [loading, setLoading] = useState(false);
  const [installLoading, setInstallLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [requirementsInstalled, setRequirementsInstalled] = useState(null); // null = não verificado, true/false
  const [checkingRequirements, setCheckingRequirements] = useState(false);

  // Verifica ambiente ao montar
  useEffect(() => {
    const checkEnvironment = async () => {
      const local = isLocalEnvironment();
      setIsLocal(local);

      if (local) {
        const { available } = await checkLocalServer();
        setServerAvailable(available);
        
        // Busca status inicial se servidor disponível
        if (available) {
          try {
            const status = await getRobotStatus();
            setRobotStatus(status);
            if (status.status === 'running') {
              setRobotRunning(status.robot);
            }
            
            // Verifica requisitos apenas uma vez
            if (requirementsInstalled === null && !checkingRequirements) {
              setCheckingRequirements(true);
              const reqStatus = await checkRequirements();
              setRequirementsInstalled(reqStatus.installed);
              setCheckingRequirements(false);
            }
          } catch (e) {
            console.error('Erro ao buscar status inicial:', e);
          }
        }
      }
    };

    checkEnvironment();
    
    // Verifica periodicamente
    const interval = setInterval(checkEnvironment, 10000);
    return () => clearInterval(interval);
  }, []);

  // Polling do status quando robô está rodando
  useEffect(() => {
    let interval;
    if (robotRunning) {
      interval = setInterval(async () => {
        try {
          const status = await getRobotStatus();
          setRobotStatus(status);
          
          if (status.log) {
            setLogs(prev => [...prev.slice(-50), status.log]);
          }

          if (status.status === 'completed' || status.status === 'error') {
            setRobotRunning(null);
            if (status.status === 'completed') {
              toast.success('Robô finalizado com sucesso!');
              if (onRefresh) onRefresh();
            } else {
              toast.error(`Erro no robô: ${status.message}`);
            }
          }
        } catch (error) {
          console.error('Erro ao verificar status:', error);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [robotRunning, onRefresh]);

  const handleRunRobot = async (type) => {
    if (robotRunning) {
      toast.warning('Já existe um robô em execução');
      return;
    }

    setLoading(true);
    setLogs([]);
    
    try {
      const runFn = type === 'stf' ? runSTFRobot : runSTJRobot;
      const result = await runFn();
      
      setRobotRunning(type);
      toast.info(`Robô ${type.toUpperCase()} iniciado! Uma janela de progresso aparecerá.`);
      addLog(`Iniciando robô ${type.toUpperCase()}...`);
      
    } catch (error) {
      toast.error(error.message);
      addLog(`Erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStopRobot = async () => {
    try {
      await stopRobot();
      setRobotRunning(null);
      toast.info('Robô parado');
      addLog('Robô interrompido pelo usuário');
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleResetStatus = async () => {
    try {
      await resetRobotStatus();
      setRobotStatus(null);
      setRobotRunning(null);
      setLogs([]);
      toast.info('Status resetado');
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleInstallRequirements = async (robot = 'all') => {
    setInstallLoading(true);
    addLog(`Instalando requisitos para ${robot === 'all' ? 'todos os robôs' : robot.toUpperCase()}...`);
    
    try {
      const result = await installRequirements(robot);
      toast.success('Requisitos instalados com sucesso!');
      addLog('Instalação concluída com sucesso!');
      setRequirementsInstalled(true); // Marca como instalado após sucesso
    } catch (error) {
      toast.error(error.message);
      addLog(`Erro na instalação: ${error.message}`);
    } finally {
      setInstallLoading(false);
    }
  };

  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    setLogs(prev => [...prev.slice(-50), `[${timestamp}] ${message}`]);
  };

  // Se não for ambiente local, mostra mensagem simples
  if (!isLocal) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
        <div className="flex items-center space-x-3">
          <AlertCircle size={20} className="text-amber-600" />
          <div>
            <p className="font-medium text-amber-800">Funcionalidade não disponível</p>
            <p className="text-sm text-amber-600">
              Os robôs de automação só podem ser executados em ambiente local (localhost).
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
      {/* Header */}
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
        onClick={() => setShowPanel(!showPanel)}
      >
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${robotRunning ? 'bg-green-100' : 'bg-blue-100'}`}>
            <Bot size={20} className={robotRunning ? 'text-green-600' : 'text-blue-600'} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Robôs de Automação</h3>
            <p className="text-sm text-gray-500">
              {robotRunning 
                ? `Robô ${robotRunning.toUpperCase()} em execução...` 
                : serverAvailable 
                  ? 'Servidor local disponível' 
                  : 'Servidor local offline'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Status indicator */}
          <div className={`w-2 h-2 rounded-full ${
            robotRunning ? 'bg-green-500 animate-pulse' : 
            serverAvailable ? 'bg-green-500' : 'bg-red-500'
          }`} />
          
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${showPanel ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Panel Content */}
      {showPanel && (
        <div className="border-t border-gray-200 p-4">
          {!serverAvailable ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle size={20} className="text-red-600 mt-0.5" />
                <div>
                  <p className="font-medium text-red-800">Servidor local não está rodando</p>
                  <p className="text-sm text-red-600 mt-1">
                    Execute <code className="bg-red-100 px-1.5 py-0.5 rounded">npm run server</code> em outro terminal para iniciar o servidor.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Botões de execução */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => handleRunRobot('stf')}
                  disabled={loading || robotRunning}
                  className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                    robotRunning === 'stf'
                      ? 'bg-green-100 text-green-700 border-2 border-green-300'
                      : robotRunning
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {robotRunning === 'stf' ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Play size={18} />
                  )}
                  <span>Executar Robô STF</span>
                </button>

                <button
                  onClick={() => handleRunRobot('stj')}
                  disabled={loading || robotRunning}
                  className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                    robotRunning === 'stj'
                      ? 'bg-green-100 text-green-700 border-2 border-green-300'
                      : robotRunning
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-purple-600 text-white hover:bg-purple-700'
                  }`}
                >
                  {robotRunning === 'stj' ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Play size={18} />
                  )}
                  <span>Executar Robô STJ</span>
                </button>
              </div>

              {/* Botão de parar */}
              {robotRunning && (
                <button
                  onClick={handleStopRobot}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                >
                  <Square size={16} />
                  <span>Parar Execução</span>
                </button>
              )}

              {/* Botão de resetar quando há erro ou status anterior */}
              {robotStatus && robotStatus.status === 'error' && !robotRunning && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertCircle size={16} className="text-red-600" />
                    <span className="text-sm font-medium text-red-700">Último robô finalizou com erro</span>
                  </div>
                  <button
                    onClick={handleResetStatus}
                    className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-lg font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors text-sm"
                  >
                    <RotateCcw size={14} />
                    <span>Limpar Status e Tentar Novamente</span>
                  </button>
                </div>
              )}

              {/* Status atual */}
              {robotStatus && robotRunning && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Progresso</span>
                    <span className="text-sm text-gray-500">
                      {robotStatus.processed || 0} / {robotStatus.total || 0}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ 
                        width: `${robotStatus.total ? (robotStatus.processed / robotStatus.total) * 100 : 0}%` 
                      }}
                    />
                  </div>
                  {robotStatus.current && (
                    <p className="text-xs text-gray-500 mt-2">
                      Processando: {robotStatus.current}
                    </p>
                  )}
                </div>
              )}

              {/* Seção de instalação - só exibe se requisitos não estão instalados */}
              {requirementsInstalled === false && (
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                    <Settings size={16} className="mr-2" />
                    Configuração e Instalação
                  </h4>
                  
                  <button
                    onClick={() => handleInstallRequirements('all')}
                    disabled={installLoading || robotRunning}
                    className={`w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                      installLoading
                        ? 'bg-gray-100 text-gray-500'
                        : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                    }`}
                  >
                    {installLoading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Download size={16} />
                    )}
                    <span>
                      {installLoading ? 'Instalando...' : 'Instalar Requisitos Python'}
                    </span>
                  </button>
                  
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Instala selenium, webdriver-manager e outras dependências necessárias
                  </p>
                </div>
              )}

              {/* Indicador de requisitos instalados */}
              {requirementsInstalled === true && (
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <div className="flex items-center space-x-2 text-green-600 text-sm">
                    <CheckCircle size={16} />
                    <span>Requisitos Python instalados</span>
                  </div>
                </div>
              )}

              {/* Verificando requisitos */}
              {requirementsInstalled === null && checkingRequirements && (
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <div className="flex items-center space-x-2 text-gray-500 text-sm">
                    <Loader2 size={16} className="animate-spin" />
                    <span>Verificando requisitos...</span>
                  </div>
                </div>
              )}

              {/* Logs */}
              {logs.length > 0 && (
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-700 flex items-center">
                      <Terminal size={16} className="mr-2" />
                      Logs
                    </h4>
                    <button
                      onClick={() => setLogs([])}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      Limpar
                    </button>
                  </div>
                  <div className="bg-gray-900 rounded-lg p-3 max-h-40 overflow-y-auto font-mono text-xs">
                    {logs.map((log, idx) => (
                      <div key={idx} className="text-green-400">
                        {log}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default RobotPanel;
