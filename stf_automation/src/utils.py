"""
Funções utilitárias
"""
import logging
from pathlib import Path
from datetime import datetime
from typing import Optional

from .config import LOGS_DIR, SCREENSHOTS_DIR


def get_logger(name: str) -> logging.Logger:
    """
    Cria e configura um logger
    
    Args:
        name: Nome do logger
        
    Returns:
        Logger configurado
    """
    logger = logging.getLogger(name)
    
    if not logger.handlers:
        logger.setLevel(logging.INFO)
        
        # Handler para arquivo
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        log_file = LOGS_DIR / f"stf_automation_{timestamp}.log"
        
        file_handler = logging.FileHandler(log_file, encoding='utf-8')
        file_handler.setLevel(logging.DEBUG)
        
        # Handler para console
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.INFO)
        
        # Formato
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        
        file_handler.setFormatter(formatter)
        console_handler.setFormatter(formatter)
        
        logger.addHandler(file_handler)
        logger.addHandler(console_handler)
    
    return logger


def take_screenshot(driver, name: str) -> Optional[str]:
    """
    Captura screenshot do navegador
    
    Args:
        driver: Instância do Selenium WebDriver
        name: Nome do arquivo (sem extensão)
        
    Returns:
        Caminho do arquivo salvo ou None se erro
    """
    try:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{name}_{timestamp}.png"
        filepath = SCREENSHOTS_DIR / filename
        
        driver.save_screenshot(str(filepath))
        return str(filepath)
        
    except Exception as e:
        logger = get_logger(__name__)
        logger.error(f"Erro ao capturar screenshot: {e}")
        return None


def format_processo_number(numero: str) -> str:
    """
    Formata número do processo removendo caracteres especiais
    
    Args:
        numero: Número do processo
        
    Returns:
        Número formatado (apenas dígitos)
    """
    return ''.join(filter(str.isdigit, numero))


def escape_json_string(text: str) -> str:
    """
    Escapa string para formato JSON válido
    
    Args:
        text: Texto original
        
    Returns:
        Texto escapado
    """
    if not text:
        return ""
    
    # Substitui quebras de linha e caracteres especiais
    text = text.replace('\n', ' ')
    text = text.replace('\r', ' ')
    text = text.replace('\\', ' ')
    text = text.replace('"', '\\"')
    
    # Remove espaços múltiplos
    text = ' '.join(text.split())
    
    return text
