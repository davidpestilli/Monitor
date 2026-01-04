# 🤖 Automação STJ

Robô Python para consulta automatizada de processos no portal do STJ (Superior Tribunal de Justiça).

## 🎯 Funcionalidades

- ✅ Consulta automática de processos no STJ
- ✅ Extração de dados processuais (partes, movimentações, decisões)
- ✅ Atualização automática no Supabase
- ✅ Logs detalhados de execução
- ✅ Screenshots em caso de erro
- ✅ Retry automático em falhas
- ✅ **Independente de usuário do Windows** (perfil próprio do Chrome)
- ✅ Waits inteligentes (não depende de tempos fixos)

## 📋 Pré-requisitos

- Python 3.10+
- Google Chrome instalado
- Acesso à internet

## 🚀 Instalação

1. **Clone/copie o projeto**
   ```bash
   cd c:\Users\david\Monitor\stj_automation
   ```

2. **Crie ambiente virtual**
   ```powershell
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   ```

3. **Instale dependências**
   ```powershell
   pip install -r requirements.txt
   ```

4. **Configure variáveis de ambiente**
   ```powershell
   # Copie o arquivo de exemplo
   cp .env.example .env
   
   # Edite .env com suas credenciais (já vem preenchido)
   notepad .env
   ```

## ▶️ Uso

### Execução básica (recomendada)
```powershell
python run.py
```

**OU**

```powershell
python -m src.main
```

### Testes
```powershell
# Teste simples do navegador
python -m tests.test_simple

# Teste completo com 5 processos
python -m tests.test_full

# Teste de múltiplos processos
python -m tests.test_multiplos
```

### Scripts auxiliares
```powershell
# Extrair HTML de página
python -m scripts.extract_html

# Inspecionar estrutura da página
python -m scripts.inspect_page
```

### Modo headless (sem interface gráfica)
```powershell
# Edite .env e mude HEADLESS=True
python -m src.main
```

### Logs
Os logs são salvos em `logs/stj_automation_YYYYMMDD.log`

### Screenshots
Screenshots de erro são salvos em `screenshots/`

## 📂 Estrutura

```
stj_automation/
├── src/                    # Código-fonte principal
│   ├── __init__.py
│   ├── main.py            # Entry point - orquestrador principal
│   ├── browser_handler.py # Gerenciamento Chrome/Selenium
│   ├── scraper.py         # Lógica de scraping do STJ
│   ├── supabase_client.py # Cliente API Supabase
│   ├── config.py          # Configurações e seletores CSS
│   └── utils.py           # Funções auxiliares
├── tests/                 # Scripts de teste
│   ├── test_simple.py     # Teste básico do navegador
│   ├── test_full.py       # Teste completo com Supabase
│   └── test_multiplos.py  # Teste de processos múltiplos
├── scripts/               # Scripts utilitários
│   ├── extract_html.py    # Extração de HTML
│   └── inspect_page.py    # Inspeção de estrutura
├── logs/                  # Logs de execução
├── screenshots/           # Screenshots de erro
├── venv/                  # Ambiente virtual Python
├── .env                   # Variáveis de ambiente
├── .env.example           # Template de variáveis
├── requirements.txt       # Dependências
└── README.md              # Esta documentação
```
├── logs/                  # Logs de execução
├── screenshots/           # Screenshots de erros
└── chrome_profile/        # Perfil Chrome isolado
```

## 🔧 Configurações Avançadas

### Timeout customizado
```env
BROWSER_TIMEOUT=60  # Aumenta timeout para 60s
```

### Número de retries
```env
MAX_RETRIES=5  # Tenta 5 vezes antes de falhar
```

### Nível de log
```env
LOG_LEVEL=DEBUG  # Mais detalhes (INFO, WARNING, ERROR)
```

## ⚡ Melhorias vs Power Automate

| Aspecto | Power Automate | Este Robô Python |
|---------|---------------|------------------|
| Dependência de usuário | ✗ Trava se mudar usuário | ✅ Perfil próprio independente |
| Timeouts | ✗ Fixos (WAIT 1, WAIT 2) | ✅ Waits inteligentes dinâmicos |
| Tratamento de erros | ✗ Básico | ✅ Retry + screenshots + logs |
| Manutenção | ✗ Interface visual confusa | ✅ Código Python modular |
| Logs | ✗ Limitados | ✅ Logs completos rastreáveis |
| Performance | ✗ Lento | ✅ Otimizado |

## 🐛 Troubleshooting

### Erro: ChromeDriver não encontrado
```powershell
# O webdriver-manager baixa automaticamente
# Se falhar, baixe manualmente em: https://chromedriver.chromium.org/
```

### Erro: Timeout aguardando elemento
- Aumente `BROWSER_TIMEOUT` no .env
- Verifique se o site do STJ está acessível
- Execute em modo não-headless para ver o que está acontecendo

### Processo não encontrado mas existe
- Verifique formato do número do processo no banco
- Veja logs em `logs/` para detalhes
- Screenshot em `screenshots/` mostra estado da página

## 📊 Monitoramento

A execução exibe estatísticas ao final:
```
ESTATÍSTICAS DA EXECUÇÃO
Total de processos: 50
✓ Sucesso: 45
⚠ Não encontrados: 3
✗ Erros: 2
Taxa de sucesso: 90.0%
```

## 🤝 Contribuindo

Para melhorias:
1. Adicione logs detalhados
2. Use try/except com contexto
3. Documente funções complexas
4. Mantenha modularidade

## 📝 Licença

Uso interno

---

**Desenvolvido por:** David  
**Data:** Janeiro 2026  
**Versão:** 1.0.0
