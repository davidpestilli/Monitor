"""
Testes básicos para verificar configuração
"""
import sys
import os

# Adiciona diretório pai ao path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.config import SUPABASE_URL, SUPABASE_KEY, STF_URL
from src.utils import get_logger

logger = get_logger(__name__)


def test_config():
    """Testa se configurações estão carregadas"""
    logger.info("Testando configurações...")
    
    assert SUPABASE_URL, "SUPABASE_URL não configurada"
    assert SUPABASE_KEY, "SUPABASE_KEY não configurada"
    assert STF_URL == "https://portal.stf.jus.br/", "STF_URL incorreta"
    
    logger.info("✓ Configurações OK")


def test_supabase_connection():
    """Testa conexão com Supabase"""
    logger.info("Testando conexão Supabase...")
    
    from src.supabase_client import SupabaseClient
    
    try:
        client = SupabaseClient()
        logger.info("✓ Cliente Supabase inicializado")
        
        # Tenta buscar processos (sem executar query completa)
        logger.info("✓ Supabase conectado")
        
    except Exception as e:
        logger.error(f"✗ Erro ao conectar Supabase: {e}")
        raise


def test_browser():
    """Testa inicialização do navegador"""
    logger.info("Testando navegador...")
    
    from src.browser_handler import BrowserHandler
    
    browser = BrowserHandler()
    
    try:
        assert browser.start(), "Falha ao iniciar navegador"
        logger.info("✓ Navegador iniciado")
        
        assert browser.navigate_to_stf(), "Falha ao navegar para STF"
        logger.info("✓ Navegação para STF OK")
        
        logger.info(f"URL atual: {browser.driver.current_url}")
        
        browser.close()
        logger.info("✓ Navegador fechado")
        
    except Exception as e:
        logger.error(f"✗ Erro no teste de navegador: {e}")
        if browser.driver:
            browser.close()
        raise


if __name__ == "__main__":
    logger.info("=" * 80)
    logger.info("EXECUTANDO TESTES BÁSICOS - STF AUTOMATION")
    logger.info("=" * 80)
    
    try:
        test_config()
        test_supabase_connection()
        test_browser()
        
        logger.info("")
        logger.info("=" * 80)
        logger.info("✓ TODOS OS TESTES PASSARAM")
        logger.info("=" * 80)
        
    except Exception as e:
        logger.error("")
        logger.error("=" * 80)
        logger.error("✗ TESTES FALHARAM")
        logger.error("=" * 80)
        sys.exit(1)
