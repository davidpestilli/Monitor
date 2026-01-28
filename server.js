import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { spawn, exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// Carrega variáveis de ambiente do arquivo .env
dotenv.config();

// Obter __dirname em ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Estado global para controle dos robôs
let robotProcess = null;
let robotStatus = {
  status: 'idle', // idle, running, completed, error
  robot: null,    // 'stf' ou 'stj'
  processed: 0,
  total: 0,
  current: null,
  message: null,
  logs: []
};

const app = express();

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY; // Usar service key, não anon key

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('SUPABASE_URL e SUPABASE_SERVICE_KEY são obrigatórios');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Middlewares
app.use(cors());

// Middleware customizado para limpar o JSON antes do parsing
app.use('/api/atualizar_processos', (req, res, next) => {
  let rawData = '';
  req.on('data', chunk => {
    rawData += chunk;
  });
  
  req.on('end', () => {
    try {
      // Remove caracteres de controle problemáticos
      const cleanedData = rawData
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ') // Remove caracteres de controle
        .replace(/[\r\n\t]+/g, ' ') // Replace quebras de linha e tabs com espaços
        .trim();
      
      console.log('Raw data recebida:', rawData);
      console.log('Data limpa:', cleanedData);
      
      // Parse manual do JSON limpo
      req.body = JSON.parse(cleanedData);
      next();
    } catch (error) {
      console.error('Erro ao fazer parse do JSON:', error);
      console.error('Dados recebidos:', rawData);
      res.status(400).json({ 
        error: 'JSON inválido', 
        details: error.message,
        receivedData: rawData.substring(0, 200) + '...' // Primeiros 200 chars para debug
      });
    }
  });
});

// Middleware padrão para outras rotas
app.use(express.json());

// Endpoint para atualizar processos (substituindo a edge function)
app.post('/api/atualizar_processos', async (req, res) => {
  try {
    const { tjsp, tribunal, reu, superior, decisao, movimentacao, link } = req.body;

    if (!tjsp || !tribunal) {
      return res.status(400).json({ error: 'Campos tjsp e tribunal são obrigatórios' });
    }

    // 1. Atualiza tabela processos
    const { error: updateError } = await supabase
      .from('processos')
      .update({ reu, superior, decisao, movimentacao, link })
      .eq('tjsp', tjsp)
      .eq('tribunal', tribunal);

    if (updateError) {
      console.error('Erro ao atualizar processos:', updateError);
      return res.status(500).json({ error: updateError.message });
    }

    // 2. Insere nova linha em pesquisas com timestamp atual
    const { error: insertError } = await supabase
      .from('pesquisas')
      .insert({
        tjsp,
        tribunal,
        decisao,
        movimentacao,
        data: new Date().toISOString() // Adiciona timestamp atual
      });

    if (insertError) {
      console.error('Erro ao inserir pesquisa:', insertError);
      return res.status(500).json({ error: insertError.message });
    }

    console.log(`Processo ${tjsp} atualizado com sucesso`);
    res.json({ status: 'ok', tjsp });

  } catch (error) {
    console.error('Erro interno:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor', 
      details: error.message 
    });
  }
});

// Endpoint de health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ==========================================================
// ENDPOINTS PARA ROBÔS DE AUTOMAÇÃO
// ==========================================================

// Função auxiliar para executar robô
const runRobot = (robotType) => {
  return new Promise((resolve, reject) => {
    if (robotProcess) {
      reject(new Error('Já existe um robô em execução'));
      return;
    }

    const robotDir = robotType === 'stf' ? 'stf_automation' : 'stj_automation';
    const robotPath = path.join(__dirname, robotDir);
    
    robotStatus = {
      status: 'running',
      robot: robotType,
      processed: 0,
      total: 0,
      current: null,
      message: `Iniciando robô ${robotType.toUpperCase()}...`,
      logs: []
    };

    console.log(`Iniciando robô ${robotType.toUpperCase()} em: ${robotPath}`);

    // Executa o script Python
    robotProcess = spawn('python', ['run.py'], {
      cwd: robotPath,
      shell: true
    });

    robotProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`[${robotType.toUpperCase()}] ${output}`);
      
      robotStatus.logs.push(output);
      
      // Tenta extrair progresso dos logs - formato [1/77] ou Processando 1/77
      const progressMatch = output.match(/\[(\d+)\/(\d+)\]/) || output.match(/Processando (\d+)\/(\d+)/);
      if (progressMatch) {
        robotStatus.processed = parseInt(progressMatch[1]);
        robotStatus.total = parseInt(progressMatch[2]);
      }
      
      // Extrai total de processos encontrados
      const totalMatch = output.match(/Encontrados? (\d+) processos?/i);
      if (totalMatch) {
        robotStatus.total = parseInt(totalMatch[1]);
      }
      
      // Extrai processo atual
      const currentMatch = output.match(/PROCESSANDO:\s*(.+?)(?:\s*$|=)/i);
      if (currentMatch) {
        robotStatus.current = currentMatch[1].trim();
      }
      
      // Atualiza mensagem com última ação relevante
      if (output.includes('Pesquisa realizada')) {
        robotStatus.message = 'Realizando pesquisa no portal...';
      } else if (output.includes('Extraindo dados')) {
        robotStatus.message = 'Extraindo dados do processo...';
      } else if (output.includes('atualizado com sucesso')) {
        robotStatus.message = 'Atualizando banco de dados...';
      } else if (output.includes('Navegando') || output.includes('acessando')) {
        robotStatus.message = 'Navegando no portal...';
      } else if (output.includes('Iniciando')) {
        robotStatus.message = 'Inicializando navegador...';
      }
    });

    robotProcess.stderr.on('data', (data) => {
      const output = data.toString();
      // Python logging usa stderr por padrão, então verificamos se é realmente um erro
      const isActualError = output.includes('ERROR') || 
                           output.includes('Exception') || 
                           output.includes('Traceback') ||
                           output.includes('Error:');
      
      if (isActualError) {
        console.error(`[${robotType.toUpperCase()} ERROR] ${output}`);
        robotStatus.logs.push(`[ERROR] ${output}`);
      } else {
        // É apenas log INFO/DEBUG que foi para stderr
        console.log(`[${robotType.toUpperCase()}] ${output}`);
        robotStatus.logs.push(output);
        
        // Também extrai progresso dos logs stderr (Python logging usa stderr)
        const progressMatch = output.match(/\[(\d+)\/(\d+)\]/) || output.match(/Processando (\d+)\/(\d+)/);
        if (progressMatch) {
          robotStatus.processed = parseInt(progressMatch[1]);
          robotStatus.total = parseInt(progressMatch[2]);
        }
        
        // Extrai total de processos
        const totalMatch = output.match(/Encontrados? (\d+) processos?/i);
        if (totalMatch) {
          robotStatus.total = parseInt(totalMatch[1]);
        }
        
        // Extrai processo atual
        const currentMatch = output.match(/PROCESSANDO:\s*(.+?)(?:\s*$|=)/i);
        if (currentMatch) {
          robotStatus.current = currentMatch[1].trim();
        }
        
        // Atualiza mensagem com última ação relevante
        if (output.includes('Pesquisa realizada')) {
          robotStatus.message = 'Realizando pesquisa no portal...';
        } else if (output.includes('Extraindo dados')) {
          robotStatus.message = 'Extraindo dados do processo...';
        } else if (output.includes('atualizado com sucesso')) {
          robotStatus.message = 'Atualizando banco de dados...';
        } else if (output.includes('Navegando') || output.includes('acessando')) {
          robotStatus.message = 'Navegando no portal...';
        } else if (output.includes('Iniciando')) {
          robotStatus.message = 'Inicializando navegador...';
        }
      }
    });

    robotProcess.on('close', (code) => {
      console.log(`Robô ${robotType.toUpperCase()} finalizado com código: ${code}`);
      
      robotStatus.status = code === 0 ? 'completed' : 'error';
      robotStatus.message = code === 0 
        ? `Robô ${robotType.toUpperCase()} finalizado com sucesso`
        : `Robô ${robotType.toUpperCase()} finalizado com erros`;
      
      robotProcess = null;
    });

    robotProcess.on('error', (err) => {
      console.error(`Erro ao executar robô: ${err.message}`);
      robotStatus.status = 'error';
      robotStatus.message = err.message;
      robotProcess = null;
      reject(err);
    });

    resolve({ status: 'started', robot: robotType });
  });
};

// Executar robô STF
app.post('/api/robot/stf', async (req, res) => {
  try {
    const result = await runRobot('stf');
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Executar robô STJ
app.post('/api/robot/stj', async (req, res) => {
  try {
    const result = await runRobot('stj');
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Status do robô
app.get('/api/robot/status', (req, res) => {
  res.json({
    ...robotStatus,
    log: robotStatus.logs.length > 0 ? robotStatus.logs[robotStatus.logs.length - 1] : null
  });
});

// Resetar status do robô
app.post('/api/robot/reset', (req, res) => {
  robotStatus = {
    status: 'idle',
    robot: null,
    processed: 0,
    total: 0,
    current: null,
    message: null,
    logs: []
  };
  res.json({ status: 'ok', message: 'Status resetado' });
});

// Parar robô
app.post('/api/robot/stop', (req, res) => {
  if (!robotProcess) {
    return res.status(400).json({ error: 'Nenhum robô em execução' });
  }

  try {
    robotProcess.kill('SIGTERM');
    robotStatus.status = 'stopped';
    robotStatus.message = 'Robô interrompido pelo usuário';
    robotProcess = null;
    res.json({ status: 'stopped' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verificar se requisitos Python estão instalados
app.get('/api/robot/check-requirements', async (req, res) => {
  const checkPackages = () => {
    return new Promise((resolve) => {
      exec('pip list --format=json', (error, stdout, stderr) => {
        if (error) {
          resolve({ installed: false, packages: [], error: 'pip não encontrado' });
          return;
        }
        
        try {
          const packages = JSON.parse(stdout);
          const packageNames = packages.map(p => p.name.toLowerCase());
          
          // Requisitos principais
          const requiredPackages = ['selenium', 'webdriver-manager', 'python-dotenv', 'supabase', 'requests'];
          const missingPackages = requiredPackages.filter(p => !packageNames.includes(p));
          
          resolve({
            installed: missingPackages.length === 0,
            packages: packageNames.filter(p => requiredPackages.includes(p)),
            missing: missingPackages
          });
        } catch (e) {
          resolve({ installed: false, packages: [], error: 'Erro ao verificar pacotes' });
        }
      });
    });
  };
  
  try {
    const result = await checkPackages();
    res.json(result);
  } catch (error) {
    res.status(500).json({ installed: false, error: error.message });
  }
});

// Instalar requisitos Python
app.post('/api/robot/install-requirements', async (req, res) => {
  const { robot } = req.body; // 'stf', 'stj', ou 'all'
  
  const installDir = async (dir) => {
    return new Promise((resolve, reject) => {
      const reqPath = path.join(__dirname, dir, 'requirements.txt');
      console.log(`Instalando requisitos de: ${reqPath}`);
      
      exec(`pip install -r "${reqPath}"`, (error, stdout, stderr) => {
        if (error) {
          console.error(`Erro ao instalar ${dir}:`, stderr);
          reject(new Error(`Erro ao instalar ${dir}: ${stderr}`));
          return;
        }
        console.log(`Requisitos de ${dir} instalados:`, stdout);
        resolve(stdout);
      });
    });
  };

  try {
    const results = [];
    
    if (robot === 'stf' || robot === 'all') {
      results.push(await installDir('stf_automation'));
    }
    
    if (robot === 'stj' || robot === 'all') {
      results.push(await installDir('stj_automation'));
    }
    
    res.json({ status: 'ok', message: 'Requisitos instalados com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Endpoint disponível em: http://localhost:${PORT}/api/atualizar_processos`);
  console.log(`Endpoints de robôs disponíveis em: http://localhost:${PORT}/api/robot/*`);
});