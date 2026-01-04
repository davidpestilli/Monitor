"""
Configurações globais da aplicação
"""
import os
from dotenv import load_dotenv
from pathlib import Path

# Carrega variáveis de ambiente
load_dotenv()

# Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Browser
HEADLESS = os.getenv("HEADLESS", "False").lower() == "true"
BROWSER_TIMEOUT = int(os.getenv("BROWSER_TIMEOUT", "60"))

# URLs
STF_URL = "https://portal.stf.jus.br/"

# Configurações gerais
MAX_RETRIES = 3
RETRY_DELAY = 2

# User Agent
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

# Diretórios
BASE_DIR = Path(__file__).parent.parent
LOGS_DIR = BASE_DIR / "logs"
SCREENSHOTS_DIR = BASE_DIR / "screenshots"

# Criar diretórios se não existirem
LOGS_DIR.mkdir(exist_ok=True)
SCREENSHOTS_DIR.mkdir(exist_ok=True)
