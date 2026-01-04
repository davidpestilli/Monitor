"""
Teste manual com processo válido do STF
Execute este script para testar manualmente a busca de um processo válido
"""
import sys
import os

# Adiciona o diretório raiz ao path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.browser_handler import BrowserHandler
from src.scraper import STFScraper
from src.utils import get_logger

logger = get_logger(__name__)

def testar_processo_valido():
    """
    Testa a busca de um processo válido do STF
    
    Use um número de processo REAL do STF para este teste.
    Exemplo: um recurso extraordinário ou agravo
    """
    # SUBSTITUA pelo número de um processo REAL do STF que você conhece
    processo = input("Digite o número do processo STF (formato: XXXXXXX-XX.XXXX.X.XX.XXXX): ")
    
    if not processo:
        logger.error("Nenhum processo foi informado!")
        return
    
    browser = None
    try:
        logger.info(f"Iniciando teste com processo: {processo}")
        
        # Inicializa browser
        browser = BrowserHandler()
        if not browser.start():
            logger.error("Falha ao iniciar navegador")
            return
        
        if not browser.navegar_stf():
            logger.error("Falha ao navegar para o STF")
            return
        
        # Inicializa scraper
        scraper = STFScraper(browser)
        
        # Pesquisa processo
        logger.info("Pesquisando processo...")
        encontrado = scraper.pesquisar_processo(processo)
        
        if encontrado:
            logger.info("✅ Processo encontrado! Extraindo movimentação...")
            
            # Extrai movimentação
            movimentacao = scraper.extrair_movimentacao()
            
            if movimentacao:
                logger.info(f"✅ Movimentação extraída com sucesso!")
                logger.info(f"Conteúdo (primeiros 500 caracteres):")
                logger.info("-" * 80)
                print(movimentacao[:500])
                logger.info("-" * 80)
            else:
                logger.warning("⚠️ Não foi possível extrair a movimentação")
        else:
            logger.warning("⚠️ Processo não encontrado no STF")
        
        # Aguarda para observar o resultado
        input("\nPressione ENTER para finalizar o teste...")
        
    except KeyboardInterrupt:
        logger.info("Teste interrompido pelo usuário")
    except Exception as e:
        logger.error(f"Erro durante o teste: {e}", exc_info=True)
    finally:
        if browser:
            browser.close()
            logger.info("Navegador fechado")

if __name__ == "__main__":
    testar_processo_valido()
