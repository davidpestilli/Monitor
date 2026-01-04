"""
Teste focado apenas na digitação do número do processo
"""
import sys
import os
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.browser_handler import BrowserHandler
from src.scraper import STFScraper
from src.utils import get_logger

logger = get_logger(__name__)

def testar_digitacao():
    """Testa apenas a digitação do número"""
    
    # Número de teste (TJSP)
    processo = "1008605-93.2022.8.26.0050"
    
    browser = None
    try:
        logger.info(f"Testando digitação com processo: {processo}")
        
        # Inicializa browser
        browser = BrowserHandler()
        if not browser.start():
            logger.error("Falha ao iniciar navegador")
            return
        
        if not browser.navigate_to_stf():
            logger.error("Falha ao navegar para o STF")
            return
        
        # Inicializa scraper
        scraper = STFScraper(browser)
        
        # Seleciona tipo de pesquisa
        logger.info("Selecionando tipo de pesquisa...")
        if not scraper.selecionar_tipo_pesquisa():
            logger.error("Falha ao selecionar tipo")
            return
        
        # Remove formatação do número
        numero_limpo = processo.replace('-', '').replace('.', '')
        logger.info(f"Número limpo: {numero_limpo}")
        
        # Digita número
        logger.info("Digitando número...")
        if scraper.digitar_numero_processo(numero_limpo):
            logger.info("✅ SUCESSO! Número digitado corretamente")
            
            # Aguarda para observar
            input("\nVerifique o campo no navegador. Pressione ENTER para continuar...")
            
            # Tenta pesquisar
            logger.info("Clicando em Pesquisar...")
            scraper.clicar_pesquisar()
            
            # Aguarda resultado
            time.sleep(3)
            input("\nVerifique o resultado. Pressione ENTER para finalizar...")
        else:
            logger.error("❌ FALHA na digitação")
            input("\nPressione ENTER para finalizar...")
        
    except KeyboardInterrupt:
        logger.info("Teste interrompido")
    except Exception as e:
        logger.error(f"Erro: {e}", exc_info=True)
    finally:
        if browser:
            browser.close()

if __name__ == "__main__":
    testar_digitacao()
