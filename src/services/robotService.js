/**
 * Serviço para execução dos robôs de automação STF e STJ
 * IMPORTANTE: Funciona apenas em ambiente local (localhost)
 */

const LOCAL_SERVER_URL = 'http://localhost:3001';

/**
 * Verifica se está rodando em ambiente local
 */
export const isLocalEnvironment = () => {
  const hostname = window.location.hostname;
  return hostname === 'localhost' || hostname === '127.0.0.1';
};

/**
 * Verifica se o servidor local está disponível
 */
export const checkLocalServer = async () => {
  if (!isLocalEnvironment()) {
    return { available: false, reason: 'not_local' };
  }

  try {
    const response = await fetch(`${LOCAL_SERVER_URL}/health`, {
      method: 'GET',
      timeout: 3000
    });
    
    if (response.ok) {
      return { available: true };
    }
    return { available: false, reason: 'server_error' };
  } catch (error) {
    return { available: false, reason: 'server_offline' };
  }
};

/**
 * Executa o robô STF
 */
export const runSTFRobot = async () => {
  if (!isLocalEnvironment()) {
    throw new Error('Esta função só está disponível em ambiente local');
  }

  const response = await fetch(`${LOCAL_SERVER_URL}/api/robot/stf`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao executar robô STF');
  }

  return await response.json();
};

/**
 * Executa o robô STJ
 */
export const runSTJRobot = async () => {
  if (!isLocalEnvironment()) {
    throw new Error('Esta função só está disponível em ambiente local');
  }

  const response = await fetch(`${LOCAL_SERVER_URL}/api/robot/stj`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao executar robô STJ');
  }

  return await response.json();
};

/**
 * Verifica o status de um robô em execução
 */
export const getRobotStatus = async () => {
  if (!isLocalEnvironment()) {
    throw new Error('Esta função só está disponível em ambiente local');
  }

  const response = await fetch(`${LOCAL_SERVER_URL}/api/robot/status`, {
    method: 'GET'
  });

  if (!response.ok) {
    throw new Error('Erro ao verificar status do robô');
  }

  return await response.json();
};

/**
 * Para a execução do robô
 */
export const stopRobot = async () => {
  if (!isLocalEnvironment()) {
    throw new Error('Esta função só está disponível em ambiente local');
  }

  const response = await fetch(`${LOCAL_SERVER_URL}/api/robot/stop`, {
    method: 'POST'
  });

  if (!response.ok) {
    throw new Error('Erro ao parar robô');
  }

  return await response.json();
};

/**
 * Reseta o status do robô
 */
export const resetRobotStatus = async () => {
  if (!isLocalEnvironment()) {
    throw new Error('Esta função só está disponível em ambiente local');
  }

  const response = await fetch(`${LOCAL_SERVER_URL}/api/robot/reset`, {
    method: 'POST'
  });

  if (!response.ok) {
    throw new Error('Erro ao resetar status');
  }

  return await response.json();
};

/**
 * Verifica se os requisitos Python estão instalados
 */
export const checkRequirements = async () => {
  if (!isLocalEnvironment()) {
    return { installed: false, reason: 'not_local' };
  }

  try {
    const response = await fetch(`${LOCAL_SERVER_URL}/api/robot/check-requirements`, {
      method: 'GET',
      timeout: 5000
    });

    if (!response.ok) {
      return { installed: false, error: 'Erro ao verificar' };
    }

    return await response.json();
  } catch (error) {
    return { installed: false, error: error.message };
  }
};

/**
 * Instala os requisitos Python necessários
 */
export const installRequirements = async (robot) => {
  if (!isLocalEnvironment()) {
    throw new Error('Esta função só está disponível em ambiente local');
  }

  const response = await fetch(`${LOCAL_SERVER_URL}/api/robot/install-requirements`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ robot }) // 'stf', 'stj', ou 'all'
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao instalar requisitos');
  }

  return await response.json();
};
