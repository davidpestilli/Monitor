"""
Funções auxiliares
"""
import logging
import re
from datetime import datetime
from pathlib import Path
from typing import Optional
from selenium.webdriver.remote.webdriver import WebDriver
from .config import SCREENSHOTS_DIR, LOGS_DIR, LOG_LEVEL

# Configura logging
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(LOGS_DIR / f'stj_automation_{datetime.now().strftime("%Y%m%d")}.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)


def sanitize_text(text: str) -> str:
    """
    Remove caracteres especiais e normaliza texto para JSON
    
    Args:
        text: Texto para sanitizar
        
    Returns:
        Texto sanitizado
    """
    if not text:
        return ""
    
    # Remove quebras de linha e tabs
    text = re.sub(r'[\r\n\t]+', ' ', text)
    # Remove espaços múltiplos
    text = re.sub(r'\s+', ' ', text)
    # Remove aspas e barras que quebram JSON
    text = text.replace('"', '').replace("'", '').replace('\\', '')
    # Remove caracteres de controle
    text = re.sub(r'[\x00-\x1F\x7F-\x9F]', ' ', text)
    # Trim e limita tamanho
    text = text.strip()
    if len(text) > 2000:
        text = text[:2000] + "..."
    
    return text


def extract_digits_from_process(processo: str) -> list[str]:
    """
    Extrai apenas dígitos de um número de processo
    
    Args:
        processo: Número do processo
        
    Returns:
        Lista com cada dígito como string
    """
    # Extrai apenas números, hífens e pontos
    cleaned = re.findall(r'[\d.\-hHcC]+', processo)
    if not cleaned:
        return []
    
    # Retorna cada caractere individualmente
    return list(''.join(cleaned))


def is_hc_process(processo: str) -> bool:
    """
    Verifica se é processo de Habeas Corpus
    
    Args:
        processo: Número do processo
        
    Returns:
        True se for HC
    """
    return 'hc' in processo.lower()


def take_screenshot(driver: WebDriver, name: str) -> Optional[Path]:
    """
    Tira screenshot e salva com timestamp
    
    Args:
        driver: WebDriver do Selenium
        name: Nome descritivo do screenshot
        
    Returns:
        Path do arquivo salvo ou None em caso de erro
    """
    try:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{name}_{timestamp}.png"
        filepath = SCREENSHOTS_DIR / filename
        driver.save_screenshot(str(filepath))
        logger.info(f"Screenshot salvo: {filepath}")
        return filepath
    except Exception as e:
        logger.error(f"Erro ao salvar screenshot: {e}")
        return None


def format_processo_numero(processo: str) -> str:
    """
    Formata número do processo para exibição
    
    Args:
        processo: Número do processo
        
    Returns:
        Processo formatado
    """
    return processo.strip().upper()


def clean_url_for_pdf(url: str) -> str:
    """
    Garante que URL do PDF está completa
    
    Args:
        url: URL extraída
        
    Returns:
        URL completa com formato PDF
    """
    if not url:
        return ""
    
    if not url.startswith("http"):
        url = f"https://processo.stj.jus.br{url}"
    
    if "formato=PDF" not in url:
        separator = "&" if "?" in url else "?"
        url = f"{url}{separator}formato=PDF"
    
    return url


def get_logger(name: str) -> logging.Logger:
    """
    Retorna logger configurado
    
    Args:
        name: Nome do módulo
        
    Returns:
        Logger configurado
    """
    return logging.getLogger(name)
