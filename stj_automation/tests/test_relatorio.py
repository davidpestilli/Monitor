"""
Teste do relatório gerencial
"""
import os
import sys
from datetime import datetime

# Adiciona o diretório raiz ao path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.main import STJAutomation

def test_relatorio():
    """Testa geração do relatório gerencial com dados simulados"""
    
    automation = STJAutomation()
    
    # Simula dados de execução
    automation.stats = {
        "total": 77,
        "sucesso": 72,
        "erro": 2,
        "nao_encontrado": 3,
        "multiplos_processos": 5,
        "hc_count": 12,
        "processos_com_mudanca_status": 8,
        "status_detectados": {
            "Recebido": 3,
            "Baixa": 2,
            "Trânsito": 1,
            "Em trâmite": 2
        },
        "tempo_inicio": datetime.now().replace(hour=10, minute=0, second=0),
        "tempo_fim": datetime.now().replace(hour=10, minute=45, second=30),
        "status_atuais_banco": {
            "Em trâmite": 45,
            "Recebido": 18,
            "Baixa": 8,
            "Trânsito": 6
        }
    }
    
    # Exibe relatório
    automation._print_stats()

if __name__ == "__main__":
    print("\n🎯 TESTE DO RELATÓRIO GERENCIAL\n")
    test_relatorio()
    print("\n✅ Teste concluído!")
