# 📊 Relatório Gerencial - Automação STJ

## ✨ Funcionalidades Implementadas

### 1. **Análise da Lógica do Botão "Atualizar"**

Identificamos a lógica existente no frontend ([src/pages/Home.jsx](../src/pages/Home.jsx#L144-L171)) que altera o status dos processos baseado em palavras-chave:

#### Palavras-chave detectadas:
- **"recebido"** → Status: `Recebido`
  - Requer: palavra "são paulo" presente
  - Não pode conter: supremo, federal, stf, coordenadoria, classificação, distribuição
- **"baixa"** → Status: `Baixa`
- **"trânsito"** → Status: `Trânsito`
- **Padrão** → Status: `Em trâmite`

### 2. **Sistema de Coleta de Estatísticas**

Implementamos um sistema robusto de coleta de métricas durante a execução:

```python
self.stats = {
    "total": 0,
    "sucesso": 0,
    "erro": 0,
    "nao_encontrado": 0,
    "multiplos_processos": 0,
    "hc_count": 0,
    "processos_com_mudanca_status": 0,
    "status_detectados": {
        "Recebido": 0,
        "Baixa": 0,
        "Trânsito": 0,
        "Em trâmite": 0
    },
    "tempo_inicio": None,
    "tempo_fim": None
}
```

### 3. **Método de Detecção de Mudanças de Status**

Criamos o método `_detectar_novo_status()` que:
- Analisa a movimentação do processo
- Aplica as mesmas regras do botão "Atualizar" do frontend
- Identifica se haverá mudança de status
- Contabiliza quantos processos terão mudança

### 4. **Busca de Estatísticas do Banco**

Implementamos `_load_final_stats()` que:
- Busca todos os processos STJ do banco após a execução
- Conta quantos processos existem em cada status
- Fornece visão geral da distribuição atual

### 5. **Relatório Gerencial Completo**

O relatório exibe no CMD ao final da execução:

#### 📊 RESUMO DA EXECUÇÃO
- Data/Hora de início e fim
- Duração total da execução
- Total de processos pesquisados
- Taxa de sucesso

#### ✅ RESULTADOS
- Processos com sucesso
- Múltiplos processos detectados
- Habeas Corpus processados
- Processos não encontrados
- Erros ocorridos

#### 🔄 MUDANÇAS DE STATUS DETECTADAS
- **Total de processos com mudança de status**
- Quantidade para cada novo status:
  - Recebido
  - Baixa
  - Trânsito
  - Em trâmite

#### 📈 DISTRIBUIÇÃO ATUAL DE STATUS (STJ)
- Total de processos STJ no banco
- Distribuição por status com:
  - Quantidade absoluta
  - Percentual
  - Barra de progresso visual

#### 💡 OBSERVAÇÕES IMPORTANTES
- Explicação sobre como aplicar as mudanças
- Lógica das palavras-chave
- Palavras excludentes

## 🚀 Como Usar

### Executar a automação completa:
```bash
cd stj_automation
python run.py
```

### Testar apenas o relatório:
```bash
python -m tests.test_relatorio
```

## 📋 Exemplo de Relatório

```
================================================================================
                    RELATÓRIO GERENCIAL - AUTOMAÇÃO STJ
================================================================================

📊 RESUMO DA EXECUÇÃO
--------------------------------------------------------------------------------
  Data/Hora Início:          04/01/2026 10:00:00
  Data/Hora Fim:             04/01/2026 10:45:30
  Duração Total:             0:45:30
  Total de Processos:        77
  Taxa de Sucesso:           93.5%

✅ RESULTADOS
--------------------------------------------------------------------------------
  ✓ Processados com Sucesso: 72 (93.5%)
  ⚠ Múltiplos Processos:     5
  ⚡ Habeas Corpus:           12
  ⚠ Não Encontrados:         3
  ✗ Erros:                   2

🔄 MUDANÇAS DE STATUS DETECTADAS
--------------------------------------------------------------------------------
  Total de Processos com Mudança: 8

  Novos Status Detectados (serão aplicados ao clicar em 'Atualizar'):
    • Recebido            : 3 processo(s)
    • Baixa               : 2 processo(s)
    • Trânsito            : 1 processo(s)
    • Em trâmite          : 2 processo(s)

📈 DISTRIBUIÇÃO ATUAL DE STATUS (STJ) - APÓS EXECUÇÃO
--------------------------------------------------------------------------------
  Total de processos STJ no banco: 77

  Distribuição por status:
    • Em trâmite          :  45 ( 58.4%) █████████████████████████████
    • Recebido            :  18 ( 23.4%) ███████████
    • Baixa               :   8 ( 10.4%) █████
    • Trânsito            :   6 (  7.8%) ███

💡 OBSERVAÇÕES IMPORTANTES
--------------------------------------------------------------------------------
  • As mudanças de status detectadas NÃO foram aplicadas automaticamente.
  • Para aplicar as mudanças, clique no botão 'Atualizar' no sistema web.
  • A lógica de detecção segue as palavras-chave: 'recebido', 'baixa', 'trânsito'.
  • Status 'Recebido' requer: 'recebido' + 'são paulo' (sem palavras excludentes).
  • Palavras excludentes: supremo, federal, stf, coordenadoria, classificação, distribuição.

================================================================================
                          RELATÓRIO CONCLUÍDO
================================================================================
```

## 🎯 Benefícios

1. **Visibilidade Total**: Saiba exatamente o que aconteceu na execução
2. **Detecção Antecipada**: Veja quantos processos terão mudança antes de clicar em "Atualizar"
3. **Métricas Gerenciais**: Acompanhe distribuição de status e tendências
4. **Diagnóstico Rápido**: Identifique problemas (erros, não encontrados)
5. **Profissionalismo**: Relatório formatado e fácil de ler

## 📝 Arquivos Modificados

- `src/main.py` - Lógica principal com detecção e relatório
- `tests/test_relatorio.py` - Teste do relatório gerencial

## ✅ Status

✅ **Implementação Completa e Testada**

O sistema está pronto para uso em produção!
