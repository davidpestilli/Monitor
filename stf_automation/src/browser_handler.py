"""
Gerenciamento do navegador Chrome via Selenium para STF
"""
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException
from webdriver_manager.chrome import ChromeDriverManager
from typing import Optional
import time

from .config import HEADLESS, BROWSER_TIMEOUT, USER_AGENT, STF_URL
from .utils import get_logger, take_screenshot

logger = get_logger(__name__)


class BrowserHandler:
    """Gerenciador do navegador Chrome para portal STF"""
    
    def __init__(self):
        self.driver: Optional[webdriver.Chrome] = None
        self.wait: Optional[WebDriverWait] = None
        self.timeout = BROWSER_TIMEOUT
    
    def start(self) -> bool:
        """
        Inicia o navegador Chrome
        
        Returns:
            True se sucesso
        """
        try:
            logger.info("Iniciando navegador Chrome...")
            
            options = Options()
            
            # Configurações para evitar detecção
            options.add_argument(f"user-agent={USER_AGENT}")
            options.add_argument("--disable-blink-features=AutomationControlled")
            options.add_experimental_option("excludeSwitches", ["enable-automation"])
            options.add_experimental_option("useAutomationExtension", False)
            
            # Outras configurações
            options.add_argument("--disable-gpu")
            options.add_argument("--no-sandbox")
            options.add_argument("--disable-dev-shm-usage")
            options.add_argument("--window-size=1920,1080")
            options.add_argument("--start-maximized")
            
            if HEADLESS:
                options.add_argument("--headless=new")
                logger.info("Modo headless ativado")
            
            service = Service(ChromeDriverManager().install())
            self.driver = webdriver.Chrome(service=service, options=options)
            self.wait = WebDriverWait(self.driver, self.timeout)
            
            # Remove flags de automação
            self.driver.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument", {
                "source": """
                    Object.defineProperty(navigator, 'webdriver', {
                        get: () => undefined
                    })
                """
            })
            
            logger.info("Navegador iniciado com sucesso")
            return True
            
        except Exception as e:
            logger.error(f"Erro ao iniciar navegador: {e}")
            return False
    
    def navigate_to_stf(self) -> bool:
        """
        Navega para página principal do STF
        
        Returns:
            True se sucesso
        """
        try:
            logger.info(f"Navegando para {STF_URL}")
            self.driver.get(STF_URL)
            
            # Aguarda página carregar
            self.wait.until(
                EC.presence_of_element_located((By.TAG_NAME, "body"))
            )
            
            time.sleep(2)  # Aguarda estabilização
            
            # Verifica se está na página correta
            if "stf.jus.br" in self.driver.current_url:
                logger.info("Página do STF carregada com sucesso")
                return True
            else:
                logger.error(f"URL inesperada: {self.driver.current_url}")
                return False
                
        except TimeoutException:
            logger.error("Timeout ao carregar página do STF")
            take_screenshot(self.driver, "timeout_stf")
            return False
        except Exception as e:
            logger.error(f"Erro ao navegar para STF: {e}")
            return False
    
    def wait_for_element(self, by: By, value: str, timeout: Optional[int] = None) -> bool:
        """
        Aguarda elemento aparecer na página
        
        Args:
            by: Tipo de busca (By.ID, By.XPATH, etc)
            value: Valor do seletor
            timeout: Timeout personalizado (opcional)
            
        Returns:
            True se elemento encontrado
        """
        try:
            wait_time = timeout or self.timeout
            wait = WebDriverWait(self.driver, wait_time)
            wait.until(EC.presence_of_element_located((by, value)))
            return True
        except TimeoutException:
            logger.warning(f"Elemento não encontrado: {value}")
            return False
    
    def close(self):
        """Fecha o navegador"""
        try:
            if self.driver:
                logger.info("Fechando navegador...")
                self.driver.quit()
                self.driver = None
                logger.info("Navegador fechado")
        except Exception as e:
            logger.error(f"Erro ao fechar navegador: {e}")
