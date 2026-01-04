"""
Script para inspecionar estrutura após expandir múltiplos processos
"""
import os
os.environ["HEADLESS"] = "False"

from src.browser_handler import BrowserHandler
from src.scraper import STJScraper
from src.utils import get_logger
import time

logger = get_logger(__name__)

def inspect_expanded():
    """Inspeciona estrutura após expandir"""
    browser = None
    try:
        browser = BrowserHandler()
        browser.start()
        browser.navigate_to_stj()
        
        time.sleep(2)
        
        scraper = STJScraper(browser)
        processo = "0110007-21.2014.8.26.0050"
        
        logger.info(f"Pesquisando: {processo}")
        scraper.search_process(processo)
        time.sleep(2)
        
        encontrou, tipo = scraper.verify_situation()
        logger.info(f"Tipo: {tipo}")
        
        if tipo == "multiplos_processos":
            # Expande o processo mais recente
            logger.info("Expandindo processo...")
            
            # Script para expandir E extrair estrutura
            expand_and_inspect_script = """
                try {
                    var containers = document.querySelectorAll('div.clsListaProcessoFormatoVerticalBlocoExterno');
                    var container = containers[1];  // Índice do mais recente
                    
                    if (!container) {
                        return {erro: 'Container não encontrado'};
                    }
                    
                    var botao = container.querySelector('input.listaProcessosPartesBotoes');
                    if (botao) {
                        botao.click();
                    }
                    
                    // Aguarda um pouco
                    return {sucesso: true, esperando: true};
                    
                } catch(e) {
                    return {erro: e.toString()};
                }
            """
            
            result = browser.execute_script(expand_and_inspect_script)
            logger.info(f"Expandiu: {result}")
            
            time.sleep(2)  # Aguarda expansão
            
            # Agora inspeciona a estrutura expandida
            inspect_script = """
                try {
                    var containers = document.querySelectorAll('div.clsListaProcessoFormatoVerticalBlocoExterno');
                    var container = containers[1];
                    
                    if (!container) {
                        return {erro: 'Container não encontrado após expansão'};
                    }
                    
                    // Encontra todos os links no container
                    var links = container.querySelectorAll('a');
                    var linksInfo = [];
                    
                    links.forEach(function(link, i) {
                        linksInfo.push({
                            index: i,
                            href: link.href,
                            text: link.textContent.trim().substring(0, 50),
                            className: link.className,
                            id: link.id
                        });
                    });
                    
                    return {
                        totalLinks: links.length,
                        links: linksInfo,
                        containerHTML: container.innerHTML.substring(0, 500)
                    };
                    
                } catch(e) {
                    return {erro: e.toString()};
                }
            """
            
            estrutura = browser.execute_script(inspect_script)
            
            logger.info("\n" + "="*60)
            logger.info("ESTRUTURA APÓS EXPANSÃO:")
            logger.info("="*60)
            logger.info(f"Total de links: {estrutura.get('totalLinks', 0)}")
            
            if 'links' in estrutura:
                for link in estrutura['links']:
                    logger.info(f"\nLink {link['index']}:")
                    logger.info(f"  Classe: {link['className']}")
                    logger.info(f"  ID: {link['id']}")
                    logger.info(f"  Texto: {link['text']}")
                    logger.info(f"  HREF: {link['href']}")
            
            logger.info("\nAguardando 10 segundos para inspeção visual...")
            time.sleep(10)
            
    except Exception as e:
        logger.error(f"Erro: {e}", exc_info=True)
    finally:
        if browser:
            browser.close()

if __name__ == "__main__":
    inspect_expanded()
