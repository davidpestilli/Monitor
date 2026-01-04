"""
Script para verificar os dados exatos como o frontend vê
"""
import os
import sys
from pathlib import Path
import logging

# Adiciona o diretório raiz ao path
root_dir = Path(__file__).parent
sys.path.insert(0, str(root_dir))

from src.supabase_client import SupabaseClient
from src.utils import get_logger

logger = get_logger(__name__)

def main():
    """Verifica dados como o frontend os vê"""
    
    # Inicializa cliente
    client = SupabaseClient()
    
    # Número do processo
    tjsp = "1008605-93.2022.8.26.0050"
    
    logger.info("="*80)
    logger.info(f"Verificando processo {tjsp} como o FRONTEND vê")
    logger.info("="*80)
    
    # Busca da tabela processos (como o frontend faz)
    logger.info("\n1. Dados da tabela PROCESSOS:")
    logger.info("-"*80)
    
    response = client.client.table("processos").select("*").eq("tjsp", tjsp).eq("tribunal", "STF").execute()
    
    if response.data and len(response.data) > 0:
        processo = response.data[0]
        logger.info(f"✅ ENCONTRADO")
        logger.info(f"  TJSP: {processo.get('tjsp')}")
        logger.info(f"  TRIBUNAL: {processo.get('tribunal')}")
        logger.info(f"  SITUACAO: {processo.get('situacao')}")
        logger.info(f"  REU: {processo.get('reu', 'N/A')}")
        logger.info(f"  MOVIMENTAÇÃO: {processo.get('movimentacao', 'N/A')}")
        logger.info(f"  DECISÃO: {processo.get('decisao', 'N/A')}")
        logger.info(f"  LINK: {processo.get('link', 'N/A')}")
        logger.info(f"  PESQUISA_STF: {processo.get('pesquisa_stf', 'N/A')}")
        
        # Busca da tabela pesquisas (como o frontend faz)
        logger.info("\n2. Dados da tabela PESQUISAS (movimentação mais recente):")
        logger.info("-"*80)
        
        response_pesquisas = client.client.table("pesquisas").select("*").eq("tjsp", tjsp).eq("tribunal", "STF").order("data", desc=True).limit(1).execute()
        
        if response_pesquisas.data and len(response_pesquisas.data) > 0:
            pesquisa = response_pesquisas.data[0]
            logger.info(f"✅ ENCONTRADO na tabela pesquisas")
            logger.info(f"  MOVIMENTAÇÃO: {pesquisa.get('movimentacao')}")
            logger.info(f"  DECISÃO: {pesquisa.get('decisao')}")
            logger.info(f"  DATA: {pesquisa.get('data')}")
            logger.warning("\n⚠️  FRONTEND USA: Movimentação da tabela PESQUISAS (sobrescreve processos)")
        else:
            logger.info("❌ NÃO ENCONTRADO na tabela pesquisas")
            logger.info("\n✅ FRONTEND USA: Movimentação da tabela PROCESSOS")
        
        logger.info("\n" + "="*80)
        logger.info("CONCLUSÃO:")
        logger.info("="*80)
        if response_pesquisas.data and len(response_pesquisas.data) > 0:
            logger.info("O frontend EXIBIRÁ os dados da tabela PESQUISAS")
        else:
            logger.info("O frontend EXIBIRÁ os dados da tabela PROCESSOS")
    else:
        logger.error(f"❌ Processo {tjsp} NÃO ENCONTRADO na tabela processos")

if __name__ == "__main__":
    main()
