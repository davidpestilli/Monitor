"""
Teste simples do scraper STJ
"""
import logging
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
import time

# Configura logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def main():
    """Teste simples do navegador"""
    
    logger.info("Iniciando teste simples...")
    
    # Configurações Chrome sem perfil
    options = Options()
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_experimental_option("excludeSwitches", ["enable-automation"])
    options.add_experimental_option("useAutomationExtension", False)
    options.add_argument("--window-size=1920,1080")
    
    # Inicia navegador
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=options)
    
    try:
        # Navega para STJ
        logger.info("Navegando para portal STJ...")
        driver.get("https://processo.stj.jus.br/processo/pesquisa/")
        
        logger.info("Aguardando 5 segundos...")
        time.sleep(5)
        
        # Verifica se página carregou
        logger.info(f"Título da página: {driver.title}")
        
        # Tenta preencher o campo
        logger.info("Tentando preencher campo NUP...")
        script = """
            var el = document.querySelector('#idNumeroUnico');
            if (el) {
                el.value = '1101411-63.2023.8.26.0002';
                el.dispatchEvent(new Event('input', {bubbles: true}));
                return 'OK';
            }
            return 'Campo não encontrado';
        """
        result = driver.execute_script(script)
        logger.info(f"Resultado: {result}")
        
        logger.info("Aguardando 3 segundos...")
        time.sleep(3)
        
        # Clica no botão consultar
        logger.info("Clicando em consultar...")
        script_click = """
            if (typeof quandoClicaConsultar === "function") {
                quandoClicaConsultar();
                return "OK";
            }
            return "Função não encontrada";
        """
        result = driver.execute_script(script_click)
        logger.info(f"Resultado do clique: {result}")
        
        logger.info("Aguardando 5 segundos para ver resultado...")
        time.sleep(5)
        
        logger.info("Teste concluído com sucesso!")
        
    except Exception as e:
        logger.error(f"Erro: {e}")
        
    finally:
        logger.info("Fechando navegador...")
        driver.quit()

if __name__ == "__main__":
    main()
