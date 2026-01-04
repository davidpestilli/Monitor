"""
Script para verificar dados em ambas as tabelas
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.supabase_client import SupabaseClient
from src.utils import get_logger

logger = get_logger(__name__)

def verificar_ambas_tabelas(tjsp: str):
    """Verifica os dados em ambas as tabelas"""
    try:
        client = SupabaseClient()
        
        logger.info(f"=" * 80)
        logger.info(f"Verificando processo {tjsp} em ambas as tabelas")
        logger.info(f"=" * 80)
        
        # Tabela processos
        logger.info("\n1. TABELA: processos (onde o robô SALVA)")
        logger.info("-" * 80)
        response1 = client.client.table("processos")\
            .select("tjsp, tribunal, reu, superior, decisao, movimentacao, link, pesquisa_stf")\
            .eq("tjsp", tjsp)\
            .eq("tribunal", "STF")\
            .execute()
        
        if response1.data:
            processo = response1.data[0]
            logger.info(f"✅ ENCONTRADO")
            logger.info(f"  REU: {processo.get('reu', 'N/A')[:80]}...")
            logger.info(f"  MOVIMENTAÇÃO: {processo.get('movimentacao', 'N/A')[:80]}...")
            logger.info(f"  LINK: {processo.get('link', 'N/A')}")
            logger.info(f"  PESQUISA_STF: {processo.get('pesquisa_stf', 'N/A')}")
        else:
            logger.warning(f"❌ NÃO ENCONTRADO")
        
        # Tabela processos_stf
        logger.info("\n2. TABELA: processos_stf (onde o frontend BUSCA)")
        logger.info("-" * 80)
        response2 = client.client.table("processos_stf")\
            .select("*")\
            .eq("tjsp", tjsp)\
            .execute()
        
        if response2.data:
            processo = response2.data[0]
            logger.info(f"✅ ENCONTRADO")
            logger.info(f"  Colunas disponíveis: {list(processo.keys())}")
            for key, value in processo.items():
                if isinstance(value, str) and len(value) > 80:
                    logger.info(f"  {key}: {value[:80]}...")
                else:
                    logger.info(f"  {key}: {value}")
        else:
            logger.warning(f"❌ NÃO ENCONTRADO")
        
        logger.info("\n" + "=" * 80)
        logger.info("CONCLUSÃO:")
        logger.info("=" * 80)
        
        if response1.data and response2.data:
            mov1 = response1.data[0].get('movimentacao', '')
            mov2 = response2.data[0].get('movimentacao', '')
            
            if mov1 != mov2:
                logger.warning("⚠️  AS MOVIMENTAÇÕES SÃO DIFERENTES!")
                logger.warning("  O robô está salvando na tabela 'processos'")
                logger.warning("  Mas o frontend está lendo da tabela 'processos_stf'")
                logger.warning("  SOLUÇÃO: O robô precisa atualizar AMBAS as tabelas!")
            else:
                logger.info("✅ Dados consistentes em ambas as tabelas")
        elif response1.data and not response2.data:
            logger.warning("⚠️  Processo existe apenas na tabela 'processos'")
            logger.warning("  O frontend não consegue ver os dados!")
        elif not response1.data and response2.data:
            logger.warning("⚠️  Processo existe apenas na tabela 'processos_stf'")
            logger.warning("  Os dados do robô não foram salvos!")
        
    except Exception as e:
        logger.error(f"Erro: {e}", exc_info=True)

if __name__ == "__main__":
    verificar_ambas_tabelas("1008605-93.2022.8.26.0050")
