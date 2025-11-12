import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Carrega variáveis de ambiente do arquivo .env
dotenv.config();

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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Endpoint disponível em: http://localhost:${PORT}/api/atualizar_processos`);
});