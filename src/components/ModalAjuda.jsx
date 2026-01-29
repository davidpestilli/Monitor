import { useState, useEffect } from 'react';
import { X, HelpCircle, ChevronRight, Bot, Database, Filter, Download, Plus, Settings, Terminal, AlertTriangle } from 'lucide-react';

const sections = [
  {
    id: 'overview',
    title: 'Visão Geral',
    icon: HelpCircle,
    content: `O **Monitor de Processos** é um sistema para acompanhamento de processos judiciais nos tribunais superiores (STF e STJ).

O sistema permite:
- Visualizar e filtrar processos cadastrados
- Adicionar novos processos manualmente
- Exportar dados para Excel
- Executar robôs de automação para atualizar informações

**Importante:** O banco de dados é hospedado no Supabase e funciona em qualquer ambiente. Já os robôs de automação só funcionam localmente.`
  },
  {
    id: 'filters',
    title: 'Filtros e Busca',
    icon: Filter,
    content: `**Busca Unificada**
Use a barra de busca para encontrar processos por:
- Número GAP
- Nome do réu
- Número TJSP
- Número do processo superior

**Filtros Avançados**
Clique no botão "Filtros" para acessar opções adicionais:
- **Situação:** Em trâmite, Recebido, Baixa, Trânsito
- **Tribunal:** STJ ou STF
- **Habeas Corpus:** Filtrar apenas HC ou excluir HC

**Dica:** Clique em "Limpar" para remover todos os filtros ativos.`
  },
  {
    id: 'add',
    title: 'Adicionar Processos',
    icon: Plus,
    content: `Para adicionar novos processos:

1. Clique no botão **"Adicionar"** no cabeçalho
2. Selecione o **Tribunal** (STJ ou STF)
3. Escolha o tipo:
   - **Processo normal:** Cole textos contendo números no formato \`0000000-00.0000.0.00.0000\`
   - **Habeas Corpus:** Marque a opção HC e cole números no formato \`HC 123456\` ou \`HC 1.234.567\`

4. Clique em "Adicionar Processos"

**Dica:** Você pode colar textos longos - o sistema extrai automaticamente todos os números de processo encontrados.`
  },
  {
    id: 'export',
    title: 'Exportar Dados',
    icon: Download,
    content: `Para exportar os dados para Excel:

1. Aplique os filtros desejados (opcional)
2. Clique no botão **"Exportar"**
3. Um arquivo \`.xlsx\` será baixado automaticamente

O arquivo exportado contém:
- Data de criação
- GAP
- Parte Ré + Advogado
- Número TJSP
- Número Superior
- Tribunal
- Situação
- Última Decisão
- Resumo
- Última Movimentação
- Link do Processo`
  },
  {
    id: 'robots',
    title: 'Robôs de Automação',
    icon: Bot,
    content: `Os robôs automatizam a consulta de processos nos portais do STF e STJ.

**⚠️ IMPORTANTE:** Os robôs só funcionam em **ambiente local** (localhost).

**Como usar:**
1. Certifique-se de que está rodando o sistema localmente
2. Inicie o servidor com \`npm run server\`
3. Use os botões "Robô STF" ou "Robô STJ" para executar

**O que os robôs fazem:**
- Acessam os portais dos tribunais
- Buscam cada processo pelo número TJSP
- Extraem: número do processo no tribunal, última decisão e movimentação
- Atualizam automaticamente o banco de dados

**Janela de Progresso Flutuante:**
Quando um robô é executado, aparece uma **janela nativa do sistema** que fica **sempre visível acima de todas as outras janelas** (inclusive do navegador do robô). Esta janela mostra em tempo real:
- Qual robô está executando (STF ou STJ)
- Quantos processos já foram pesquisados
- Quantos processos faltam
- Qual processo está sendo pesquisado no momento
- Qual ação está sendo executada (pesquisando, extraindo dados, etc.)
- Tempo decorrido desde o início

A janela pode ser **fechada** clicando no X, mas isso não para a execução do robô.

**Requisitos:**
- Python 3.8+ instalado
- Google Chrome instalado
- Conexão com internet`
  },
  {
    id: 'requirements',
    title: 'Instalação de Requisitos',
    icon: Terminal,
    content: `Para rodar os robôs pela primeira vez, é necessário instalar as dependências Python.

**⚠️ IMPORTANTE:** Funciona apenas em **ambiente local**.

**Verificação Automática:**
O sistema **verifica automaticamente** se os requisitos Python estão instalados. Se já estiverem instalados, o botão de instalação não aparece. Se faltar alguma dependência, o botão "Instalar Requisitos Python" será exibido na seção de robôs.

**Pré-requisitos:**
1. Python 3.8 ou superior
2. pip (gerenciador de pacotes Python)
3. Google Chrome instalado

**Como instalar:**
1. Clique no botão **"Instalar Requisitos"** na seção de Robôs (se disponível)
2. Aguarde a instalação das bibliotecas:
   - selenium
   - webdriver-manager
   - python-dotenv
   - supabase
   - requests

**Instalação manual (se preferir):**
\`\`\`bash
cd stf_automation
pip install -r requirements.txt

cd ../stj_automation
pip install -r requirements.txt
\`\`\``
  },
  {
    id: 'setup',
    title: 'Configuração Inicial',
    icon: Settings,
    content: `**Primeira instalação no Windows:**

**1. Instalar Node.js**
- Baixe em: \`https://nodejs.org\`
- Instale a versão LTS (recomendada)
- Durante a instalação, marque "Add to PATH"

**2. Instalar Python 3.8+**
- Baixe em: \`https://www.python.org/downloads/\`
- ⚠️ IMPORTANTE: Marque "Add Python to PATH" no instalador
- Verifique instalação: \`python --version\`

**3. Instalar Google Chrome**
- Baixe em: \`https://www.google.com/chrome/\`
- Necessário para os robôs de automação

**4. Clonar o projeto**
\`\`\`bash
git clone https://github.com/davidpestilli/Monitor.git
cd Monitor
\`\`\`

**5. Instalar dependências do projeto**
\`\`\`bash
# Instalar módulos Node.js
npm install

# Instalar módulos Python do robô STF
cd stf_automation
pip install -r requirements.txt
cd ..

# Instalar módulos Python do robô STJ
cd stj_automation
pip install -r requirements.txt
cd ..
\`\`\`

**6. Rodar o projeto**
\`\`\`bash
# Terminal 1 - Frontend
npm run dev

# Terminal 2 - Servidor (necessário para robôs)
npm start
\`\`\`

O frontend estará em \`http://localhost:5173\` e o servidor em \`http://localhost:3001\`.`
  },
  {
    id: 'path',
    title: 'Configurar PATH do Windows',
    icon: Terminal,
    content: `**O que é o PATH?**
O PATH é uma variável de ambiente que indica onde o Windows deve procurar por executáveis.

**Como adicionar ao PATH manualmente:**

**1. Abrir Variáveis de Ambiente**
- Pressione \`Win + R\`
- Digite: \`sysdm.cpl\`
- Clique em "Variáveis de Ambiente"

**2. Editar a variável PATH**
- Na seção "Variáveis do sistema", encontre \`Path\`
- Clique em "Editar"
- Clique em "Novo"

**3. Adicionar caminhos necessários:**

**Python:**
- \`C:\\Users\\<seu-usuario>\\AppData\\Local\\Programs\\Python\\Python3XX\`
- \`C:\\Users\\<seu-usuario>\\AppData\\Local\\Programs\\Python\\Python3XX\\Scripts\`

**Node.js (geralmente adicionado automaticamente):**
- \`C:\\Program Files\\nodejs\`

**pip (geralmente adicionado com Python):**
- \`C:\\Users\\<seu-usuario>\\AppData\\Local\\Programs\\Python\\Python3XX\\Scripts\`

**4. Verificar instalação**
Abra um novo terminal (PowerShell ou CMD) e execute:
\`\`\`bash
python --version
node --version
npm --version
pip --version
\`\`\`

**⚠️ IMPORTANTE:** Após adicionar ao PATH, feche e reabra o terminal para as mudanças terem efeito.

**Encontrar caminhos de instalação:**
\`\`\`bash
# Ver onde o Python está instalado
where python

# Ver onde o Node está instalado
where node

# Ver onde o pip está instalado
where pip
\`\`\``
  },
  {
    id: 'local',
    title: 'Ambiente Local vs Produção',
    icon: AlertTriangle,
    content: `**Ambiente de Produção (GitHub Pages):**
- ✅ Visualização de processos
- ✅ Filtros e busca
- ✅ Adicionar processos
- ✅ Exportar para Excel
- ❌ Execução de robôs
- ❌ Instalação de requisitos

**Ambiente Local (localhost):**
- ✅ Todas as funcionalidades de produção
- ✅ Execução de robôs STF/STJ
- ✅ Instalação de requisitos

**Como rodar localmente:**
\`\`\`bash
# 1. Certifique-se de ter instalado as dependências (veja seção "Configuração Inicial")

# 2. Inicie o frontend
npm run dev

# 3. Em outro terminal, inicie o servidor
npm start
\`\`\`

O frontend estará em \`http://localhost:5173\` e o servidor em \`http://localhost:3001\`.`
  },
  {
    id: 'database',
    title: 'Banco de Dados',
    icon: Database,
    content: `O sistema utiliza o **Supabase** como banco de dados.

**Tabelas principais:**
- **processos:** Armazena todos os processos cadastrados
- **pesquisas:** Histórico de atualizações feitas pelos robôs

**Campos de um processo:**
- \`id\`: Identificador único
- \`created_at\`: Data de criação
- \`gap\`: Número GAP interno
- \`tjsp\`: Número do processo no TJSP
- \`tribunal\`: STJ ou STF
- \`superior\`: Número no tribunal superior
- \`reu\`: Nome do réu e advogado
- \`situacao\`: Status atual
- \`decisao\`: Última decisão
- \`movimentacao\`: Última movimentação
- \`resumo\`: Resumo do processo
- \`link\`: Link para consulta

**Nota:** O banco de dados funciona em qualquer ambiente, pois é hospedado na nuvem.`
  }
];

function ModalAjuda({ onClose }) {
  const [activeSection, setActiveSection] = useState('overview');

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const currentSection = sections.find(s => s.id === activeSection);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-4 max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700">
          <div className="flex items-center space-x-3">
            <HelpCircle size={24} className="text-white" />
            <h2 className="text-xl font-bold text-white">Central de Ajuda</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-64 border-r border-gray-200 bg-gray-50 overflow-y-auto">
            <nav className="p-3">
              {sections.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left text-sm font-medium transition-all mb-1 ${
                      isActive
                        ? 'bg-blue-100 text-blue-700 shadow-sm'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <Icon size={18} className={isActive ? 'text-blue-600' : 'text-gray-400'} />
                      <span>{section.title}</span>
                    </div>
                    {isActive && <ChevronRight size={16} className="text-blue-500" />}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {currentSection && (
              <div className="prose prose-sm max-w-none">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <currentSection.icon size={24} className="text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 m-0">{currentSection.title}</h3>
                </div>
                <div className="text-gray-700 leading-relaxed whitespace-pre-line">
                  {currentSection.content.split('\n').map((line, idx) => {
                    // Handle bold text
                    if (line.includes('**')) {
                      const parts = line.split(/\*\*(.*?)\*\*/g);
                      return (
                        <p key={idx} className="mb-2">
                          {parts.map((part, i) => 
                            i % 2 === 1 ? <strong key={i}>{part}</strong> : part
                          )}
                        </p>
                      );
                    }
                    // Handle code blocks
                    if (line.startsWith('```')) {
                      return null;
                    }
                    if (line.includes('`')) {
                      const parts = line.split(/`(.*?)`/g);
                      return (
                        <p key={idx} className="mb-2">
                          {parts.map((part, i) => 
                            i % 2 === 1 ? (
                              <code key={i} className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-blue-600">{part}</code>
                            ) : part
                          )}
                        </p>
                      );
                    }
                    // Handle lists
                    if (line.startsWith('- ')) {
                      return (
                        <li key={idx} className="ml-4 mb-1 list-disc">{line.substring(2)}</li>
                      );
                    }
                    // Handle numbered lists
                    if (/^\d+\.\s/.test(line)) {
                      return (
                        <li key={idx} className="ml-4 mb-1 list-decimal">{line.replace(/^\d+\.\s/, '')}</li>
                      );
                    }
                    // Handle emojis/icons
                    if (line.includes('✅') || line.includes('❌') || line.includes('⚠️')) {
                      return (
                        <p key={idx} className="mb-1 flex items-center">
                          {line}
                        </p>
                      );
                    }
                    // Regular paragraph
                    if (line.trim()) {
                      return <p key={idx} className="mb-2">{line}</p>;
                    }
                    return <br key={idx} />;
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-between items-center">
          <p className="text-sm text-gray-500">
            Pressione <kbd className="px-2 py-1 bg-gray-200 rounded text-xs font-mono">ESC</kbd> para fechar
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
}

export default ModalAjuda;
