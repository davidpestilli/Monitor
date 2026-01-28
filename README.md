# Monitor de Processos Judiciais

Sistema web para monitoramento e automação de consultas de processos judiciais nos tribunais superiores (STF e STJ).

## 🚀 Funcionalidades

### Disponíveis em todos os ambientes
- ✅ Visualização de processos cadastrados
- ✅ Filtros avançados (situação, tribunal, Habeas Corpus)
- ✅ Busca por GAP, réu, número TJSP ou superior
- ✅ Adição manual de processos (individuais ou em lote)
- ✅ Exportação para Excel
- ✅ Atualização automática de situações

### Disponíveis apenas localmente
- 🤖 Execução de robôs de automação (STF/STJ)
- 📦 Instalação de requisitos Python
- 🔄 Acompanhamento em tempo real das execuções

## 📋 Pré-requisitos

### Para funcionalidades básicas
- Node.js 18+
- npm ou yarn

### Para robôs de automação
- Python 3.8+
- pip (gerenciador de pacotes Python)
- Google Chrome instalado

## 🛠️ Instalação

### 1. Clone o repositório
```bash
git clone https://github.com/davidpestilli/Monitor.git
cd Monitor
```

### 2. Instale dependências do Node.js
```bash
npm install
```

### 3. Configure variáveis de ambiente
Crie um arquivo `.env` na raiz do projeto:
```env
SUPABASE_URL=sua_url_supabase
SUPABASE_SERVICE_KEY=sua_service_key
```

### 4. Instale requisitos Python (para robôs)
Você pode fazer isso de duas formas:

**Via interface web (recomendado):**
1. Inicie o sistema localmente
2. Abra o painel de "Robôs de Automação"
3. Clique em "Instalar Requisitos Python"

**Via terminal:**
```bash
# Para STF
cd stf_automation
pip install -r requirements.txt

# Para STJ
cd ../stj_automation
pip install -r requirements.txt
```

## 🏃 Executando o Sistema

### Frontend (React + Vite)
```bash
npm run dev
```
O frontend estará disponível em `http://localhost:5173`

### Servidor Backend (necessário para robôs)
```bash
npm run server
```
O servidor estará disponível em `http://localhost:3001`

### Produção
```bash
npm run build
npm run preview
```

## 🤖 Usando os Robôs de Automação

1. Certifique-se de que o servidor está rodando (`npm run server`)
2. Acesse `http://localhost:5173`
3. No painel "Robôs de Automação", clique em:
   - **Executar Robô STF** - para processos no Supremo Tribunal Federal
   - **Executar Robô STJ** - para processos no Superior Tribunal de Justiça

### O que os robôs fazem:
- Acessam automaticamente os portais dos tribunais
- Buscam cada processo pelo número TJSP
- Extraem informações: número do processo no tribunal, última decisão, movimentação
- Atualizam automaticamente o banco de dados Supabase

## 📁 Estrutura do Projeto

```
Monitor/
├── src/                      # Frontend React
│   ├── components/           # Componentes reutilizáveis
│   │   ├── ModalAdicionar.jsx
│   │   ├── ModalAjuda.jsx    # Modal de ajuda
│   │   ├── RobotPanel.jsx    # Painel de robôs
│   │   └── Table.jsx
│   ├── pages/
│   │   └── Home.jsx          # Página principal
│   └── services/
│       ├── supabase.js       # Cliente Supabase
│       └── robotService.js   # Serviço de robôs
├── server.js                 # Servidor Express
├── stf_automation/           # Robô STF
│   ├── run.py
│   ├── requirements.txt
│   └── src/
└── stj_automation/           # Robô STJ
    ├── run.py
    ├── requirements.txt
    └── src/
```

## 🔒 Segurança

- Os robôs só podem ser executados em ambiente local (localhost)
- As credenciais do Supabase são armazenadas em variáveis de ambiente
- O servidor verifica a origem das requisições

## 📞 Suporte

Para dúvidas sobre o sistema, clique no botão **"Ajuda"** no canto superior direito da aplicação.

## 🛡️ Licença

Este projeto é privado e de uso interno.
