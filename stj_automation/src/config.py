"""
Configurações da automação STJ
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Carrega variáveis de ambiente
load_dotenv()

# Diretórios
BASE_DIR = Path(__file__).parent
LOGS_DIR = BASE_DIR / "logs"
SCREENSHOTS_DIR = BASE_DIR / "screenshots"
CHROME_PROFILE_DIR = BASE_DIR / "chrome_profile"

# Cria diretórios se não existirem
LOGS_DIR.mkdir(exist_ok=True)
SCREENSHOTS_DIR.mkdir(exist_ok=True)
CHROME_PROFILE_DIR.mkdir(exist_ok=True)

# Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

# URLs STJ
STJ_URL = "https://processo.stj.jus.br/processo/pesquisa/?aplicacao=processos.ea"

# Configurações do navegador
HEADLESS = os.getenv("HEADLESS", "False").lower() == "true"
BROWSER_TIMEOUT = int(os.getenv("BROWSER_TIMEOUT", "30"))
MAX_RETRIES = int(os.getenv("MAX_RETRIES", "3"))

# Logging
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

# User Agent
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

# Seletores (CSS)
SELECTORS = {
    "campo_nup": "#idNumeroUnico",
    "campo_processo": "#idNumeroProcesso",
    "texto_consulta_processual": "STJ - Consulta Processual",
    "resultado_dois_processos": "Pesquisa resultou em 2",
    "detalhes_label": ".classSpanDetalhesLabel",
    "ultima_fase": "ÚLTIMA FASE",
    "partes_advogados": "#idDetalhesPartesAdvogadosProcuradores",
    "classe_descricao": "#idSpanClasseDescricao",
    "link_decisao": "a.clsDecisoesMonocraticasTopoLink",
    "botao_nova_consulta": "#idBotaoFormularioExtendidoNovaConsulta",
    "bloco_linhas_processo": "#idBlocoInternoLinhasProcesso",
}
