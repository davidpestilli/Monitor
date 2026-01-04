"""
Script para verificar dados de um processo no Supabase
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.supabase_client import SupabaseClient
from src.utils import get_logger
import json

logger = get_logger(__name__)

def verificar_processo(tjsp: str):
    """Verifica os dados de um processo específico no banco"""
    try:
        client = SupabaseClient()
        
        logger.info(f"Buscando dados do processo {tjsp}...")
        
        # Busca o processo
        response = client.client.table("processos")\
            .select("*")\
            .eq("tjsp", tjsp)\
            .eq("tribunal", "STF")\
            .execute()
        
        if response.data:
            processo = response.data[0]
            logger.info(f"Processo encontrado no banco:")
            logger.info("-" * 80)
            
            # Campos importantes
            campos = ["tjsp", "tribunal", "reu", "superior", "decisao", "movimentacao", "link", "pesquisa_stf", "situacao"]
            
            for campo in campos:
                valor = processo.get(campo, "N/A")
                # Trunca valores longos
                if isinstance(valor, str) and len(valor) > 100:
                    valor_exibir = valor[:100] + "..."
                else:
                    valor_exibir = valor
                logger.info(f"{campo:15}: {valor_exibir}")
            
            logger.info("-" * 80)
            
            # Verifica se há problemas
            problemas = []
            
            if not processo.get("reu") or processo.get("reu") == "-":
                problemas.append("REU vazio ou com valor padrão")
            
            if not processo.get("movimentacao") or processo.get("movimentacao") in ["-", "Não há movimentação no STF"]:
                problemas.append("MOVIMENTAÇÃO vazia ou com valor padrão")
            
            if not processo.get("link") or processo.get("link") == "-":
                problemas.append("LINK vazio ou com valor padrão")
            
            if not processo.get("pesquisa_stf"):
                problemas.append("DATA DE PESQUISA não registrada")
            
            if problemas:
                logger.warning("⚠️  PROBLEMAS IDENTIFICADOS:")
                for problema in problemas:
                    logger.warning(f"  - {problema}")
            else:
                logger.info("✅ Processo sem problemas aparentes")
            
        else:
            logger.warning(f"❌ Processo {tjsp} não encontrado no banco!")
        
    except Exception as e:
        logger.error(f"Erro ao verificar processo: {e}", exc_info=True)

if __name__ == "__main__":
    # Processo reportado com problema
    processo_problema = "1008605-93.2022.8.26.0050"
    
    logger.info("=" * 80)
    logger.info("VERIFICAÇÃO DE DADOS NO SUPABASE")
    logger.info("=" * 80)
    
    verificar_processo(processo_problema)
