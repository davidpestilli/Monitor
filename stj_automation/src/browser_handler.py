"""
Gerenciamento do navegador Chrome via Selenium
"""
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, WebDriverException
from webdriver_manager.chrome import ChromeDriverManager
from typing import Optional, List
from pathlib import Path
import time

from .config import (
    HEADLESS, BROWSER_TIMEOUT, USER_AGENT, 
    CHROME_PROFILE_DIR, STJ_URL, MAX_RETRIES
)
from .utils import get_logger, take_screenshot

logger = get_logger(__name__)


class BrowserHandler:
    """Gerenciador do navegador Chrome"""
    
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
            
            # Configurações para evitar detecção de automação
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
            
            # Instala/atualiza ChromeDriver automaticamente
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
    
    def navigate_to_stj(self) -> bool:
        """
        Navega para página de consulta do STJ
        
        Returns:
            True se sucesso
        """
        try:
            logger.info(f"Navegando para {STJ_URL}")
            self.driver.get(STJ_URL)
            
            # Aguarda página carregar
            self.wait.until(
                EC.presence_of_element_located((By.TAG_NAME, "body"))
            )
            
            # Verifica se chegou na página correta
            if "Consulta Processual" in self.driver.title:
                logger.info("Página STJ carregada com sucesso")
                return True
            else:
                logger.warning(f"Título inesperado: {self.driver.title}")
                return False
                
        except Exception as e:
            logger.error(f"Erro ao navegar para STJ: {e}")
            take_screenshot(self.driver, "erro_navegacao")
            return False
    
    def wait_for_element(
        self, 
        by: By, 
        value: str, 
        timeout: Optional[int] = None
    ) -> Optional[any]:
        """
        Aguarda elemento aparecer na página
        
        Args:
            by: Tipo de seletor (By.ID, By.CSS_SELECTOR, etc)
            value: Valor do seletor
            timeout: Timeout customizado (usa padrão se None)
            
        Returns:
            Elemento encontrado ou None
        """
        try:
            timeout = timeout or self.timeout
            element = WebDriverWait(self.driver, timeout).until(
                EC.presence_of_element_located((by, value))
            )
            return element
        except TimeoutException:
            logger.warning(f"Timeout aguardando elemento: {value}")
            return None
    
    def execute_script(self, script: str) -> any:
        """
        Executa JavaScript no contexto da página
        
        Args:
            script: Código JavaScript
            
        Returns:
            Resultado da execução
        """
        try:
            return self.driver.execute_script(script)
        except Exception as e:
            logger.error(f"Erro ao executar script: {e}")
            return None
    
    def click_element(self, by: By, value: str, retries: int = MAX_RETRIES) -> bool:
        """
        Clica em elemento com retry
        
        Args:
            by: Tipo de seletor
            value: Valor do seletor
            retries: Número de tentativas
            
        Returns:
            True se sucesso
        """
        for attempt in range(retries):
            try:
                element = self.wait_for_element(by, value)
                if element:
                    element.click()
                    logger.debug(f"Clicou em: {value}")
                    return True
            except Exception as e:
                logger.warning(f"Tentativa {attempt + 1} falhou ao clicar em {value}: {e}")
                time.sleep(1)
        
        return False
    
    def type_text(self, by: By, value: str, text: str) -> bool:
        """
        Digita texto em campo
        
        Args:
            by: Tipo de seletor
            value: Valor do seletor
            text: Texto para digitar
            
        Returns:
            True se sucesso
        """
        try:
            element = self.wait_for_element(by, value)
            if element:
                element.clear()
                element.send_keys(text)
                logger.debug(f"Digitou em {value}: {text}")
                return True
            return False
        except Exception as e:
            logger.error(f"Erro ao digitar em {value}: {e}")
            return False
    
    def page_contains_text(self, text: str) -> bool:
        """
        Verifica se página contém texto
        
        Args:
            text: Texto a buscar
            
        Returns:
            True se encontrar
        """
        try:
            page_source = self.driver.page_source
            return text in page_source
        except Exception as e:
            logger.error(f"Erro ao verificar texto na página: {e}")
            return False
    
    def wait_for_text_to_disappear(self, text: str, timeout: int = 10) -> bool:
        """
        Aguarda texto desaparecer da página
        
        Args:
            text: Texto que deve desaparecer
            timeout: Timeout em segundos
            
        Returns:
            True se desapareceu
        """
        try:
            end_time = time.time() + timeout
            while time.time() < end_time:
                if not self.page_contains_text(text):
                    return True
                time.sleep(0.5)
            return False
        except Exception as e:
            logger.error(f"Erro ao aguardar texto desaparecer: {e}")
            return False
    
    def close(self):
        """Fecha o navegador"""
        try:
            if self.driver:
                self.driver.quit()
                logger.info("Navegador fechado")
        except Exception as e:
            logger.error(f"Erro ao fechar navegador: {e}")
