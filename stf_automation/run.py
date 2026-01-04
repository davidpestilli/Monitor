"""
Script principal para execução da automação STF
"""
import sys
from src.main import STFAutomation
from src.utils import get_logger

logger = get_logger(__name__)


def main():
    """Função principal"""
    try:
        # Cria instância e executa
        automation = STFAutomation()
        automation.run()
        
        return 0
        
    except KeyboardInterrupt:
        logger.info("Automação interrompida pelo usuário")
        return 1
    except Exception as e:
        logger.error(f"Erro fatal: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
