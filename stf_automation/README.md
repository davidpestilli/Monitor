# Automação STF - Portal Supremo Tribunal Federal

Robô de automação para pesquisa e atualização de processos no Portal do STF.

## Estrutura do Projeto

```
stf_automation/
├── src/
│   ├── __init__.py
│   ├── main.py           # Classe principal STFAutomation
│   ├── browser_handler.py # Gerenciamento do navegador
│   ├── scraper.py        # Extração de dados do portal
│   ├── supabase_client.py # Cliente Supabase
│   ├── config.py         # Configurações
│   └── utils.py          # Utilitários
├── tests/
│   ├── __init__.py
│   └── test_simple.py    # Testes básicos
├── logs/                 # Arquivos de log
├── screenshots/          # Capturas de tela (debug)
├── .env                  # Variáveis de ambiente (não versionado)
├── .env.example          # Exemplo de configuração
├── .gitignore
├── requirements.txt
├── README.md
└── run.py               # Script principal

## Funcionalidades

- Busca processos do banco com situação "Em trâmite" e tribunal "STF"
- Pesquisa no Portal STF (https://portal.stf.jus.br/)
- Extrai informações:
  - Partes do processo (JavaScript extraction)
  - Número superior
  - Decisão
  - Última movimentação
  - Link do processo
- Atualiza tabela `processos` com dados extraídos
- Registra histórico na tabela `pesquisas`
- Tratamento especial para processos não encontrados
- Relatório gerencial ao final da execução

## Instalação

1. Clone o repositório e navegue até a pasta:
```bash
cd Monitor/stf_automation
```

2. Crie ambiente virtual:
```bash
python -m venv venv
```

3. Ative o ambiente virtual:
```bash
# Windows
venv\Scripts\activate
```

4. Instale dependências:
```bash
pip install -r requirements.txt
playwright install chromium
```

5. Configure variáveis de ambiente:
```bash
cp .env.example .env
# Edite .env com suas credenciais Supabase
```

## Uso

Execute o robô:
```bash
python run.py
```

## Observações Importantes

- **Tabela de origem**: `processos_stf` (filtro: situacao='Em trâmite')
- **Portal**: https://portal.stf.jus.br/
- **Tipo de pesquisa**: Número único (terceira opção do dropdown)
- **Processo não encontrado**: Registra "Não há movimentação no STF"
- **Extração de partes**: Utiliza JavaScript para extrair div#partes-resumidas
- **Formatação**: Substitui \n, \r, \ por espaços para JSON válido

## Diferenças em relação ao STJ

- Portal diferente: STF usa interface própria
- Campo de busca requer digitação caractere por caractere
- Extração de partes via JavaScript (formato específico STF)
- Tabela origem: processos_stf (vs processos para STJ)
- Não há tratamento de "múltiplos processos" (específico do STJ)

## Logs

Os logs são salvos em `logs/` com timestamp no nome do arquivo.

## Suporte

Para dúvidas ou problemas, consulte a documentação do projeto.
