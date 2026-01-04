"""
Script de teste para verificar múltiplos processos
"""
import os
os.environ["HEADLESS"] = "False"  # Força modo visual

from src.browser_handler import BrowserHandler
from src.scraper import STJScraper
from src.utils import get_logger
import time

logger = get_logger(__name__)

def test_multiple_processes():
    """Testa com processo que retorna múltiplos resultados"""
    browser = None
    try:
        # Inicia browser
        logger.info("Iniciando navegador em modo VISUAL...")
        browser = BrowserHandler()
        browser.start()
        browser.navigate_to_stj()
        
        logger.info("Aguardando 2 segundos...")
        
        logger.info("Aguardando 2 segundos...")
        time.sleep(2)
        
        # Cria scraper
        scraper = STJScraper(browser)
        
        # Testa processo que retorna 2 registros
        processo = "0110007-21.2014.8.26.0050"
        
        logger.info(f"\n{'='*60}")
        logger.info(f"TESTANDO PROCESSO: {processo}")
        logger.info(f"{'='*60}\n")
        
        # Pesquisa
        logger.info("PASSO 1: Pesquisando processo...")
        if not scraper.search_process(processo):
            logger.error("Falha na pesquisa")
            return False
        
        logger.info("✓ Pesquisa realizada")
        time.sleep(2)
        
        # Verifica situação
        logger.info("\nPASSO 2: Verificando situação...")
        encontrou, tipo = scraper.verify_situation()
        logger.info(f"Resultado: encontrou={encontrou}, tipo={tipo}")
        
        if tipo == "multiplos_processos":
            logger.info("\nPASSO 3: Múltiplos processos detectados - selecionando mais recente...")
            
            # Primeiro, vamos inspecionar a estrutura
            logger.info("\nInspecionando estrutura da página...")
            inspect_script = """
                try {
                    var containers = document.querySelectorAll('div.clsListaProcessoFormatoVerticalBlocoExterno');
                    var info = [];
                    
                    containers.forEach(function(container, idx) {
                        var links = container.querySelectorAll('a');
                        var linkInfo = [];
                        
                        links.forEach(function(link, i) {
                            linkInfo.push({
                                index: i,
                                className: link.className,
                                text: link.textContent.trim().substring(0, 30),
                                href: link.href.substring(0, 80)
                            });
                        });
                        
                        info.push({
                            containerIndex: idx,
                            totalLinks: links.length,
                            links: linkInfo
                        });
                    });
                    
                    return {sucesso: true, containers: info};
                } catch(e) {
                    return {sucesso: false, erro: e.toString()};
                }
            """
            
            inspect_result = scraper.browser.execute_script(inspect_script)
            
            if inspect_result.get('sucesso'):
                logger.info(f"\nTotal de containers: {len(inspect_result['containers'])}")
                for cont in inspect_result['containers']:
                    logger.info(f"\n  Container {cont['containerIndex']} - {cont['totalLinks']} links:")
                    for link in cont['links']:
                        logger.info(f"    Link {link['index']}: classe='{link['className']}' texto='{link['text']}'")
            
            logger.info("\nAguardando 10 segundos para você verificar a página...")
            time.sleep(10)
            
            if scraper.handle_two_processes():
                logger.info("✓ Processo mais recente selecionado com sucesso!")
                
                logger.info("\nPASSO 4: Aguardando 3 segundos para página expandir...")
                time.sleep(3)
                
                # Tenta extrair dados
                logger.info("\nPASSO 5: Extraindo dados do processo...")
                dados = scraper.extract_data()
                
                logger.info(f"\n{'='*60}")
                logger.info("DADOS EXTRAÍDOS:")
                logger.info(f"{'='*60}")
                logger.info(f"  REU: {dados['reu'][:100] if dados['reu'] else 'N/A'}...")
                logger.info(f"  Superior: {dados['superior']}")
                logger.info(f"  Movimentação: {dados['movimentacao'][:100] if dados['movimentacao'] else 'N/A'}...")
                logger.info(f"  Link: {dados['link']}")
                logger.info(f"{'='*60}\n")
                
                logger.info("Aguardando 5 segundos para visualização...")
                time.sleep(5)
                
                return True
            else:
                logger.error("✗ Falha ao selecionar processo")
                return False
        else:
            logger.warning(f"Tipo diferente do esperado: {tipo}")
            return False
            
    except Exception as e:
        logger.error(f"Erro no teste: {e}", exc_info=True)
        return False
    finally:
        if browser:
            logger.info("\nFechando browser...")
            browser.close()

if __name__ == "__main__":
    success = test_multiple_processes()
    if success:
        logger.info("\n✓ TESTE PASSOU!")
    else:
        logger.error("\n✗ TESTE FALHOU!")
