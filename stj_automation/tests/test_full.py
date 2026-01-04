"""
Script para testar o scraper STJ completo
"""
import logging
from src.scraper import STJScraper
from src.supabase_client import SupabaseClient

# Configura logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def main():
    """Executa teste completo do scraper"""
    
    # Conecta ao Supabase
    logger.info("Conectando ao Supabase...")
    db = SupabaseClient()
    
    # Busca processos para testar
    logger.info("Buscando processos para testar...")
    processos = db.get_processos_em_tramite()[:5]  # Pega os 5 primeiros
    
    if not processos:
        logger.warning("Nenhum processo encontrado")
        return
    
    logger.info(f"Encontrados {len(processos)} processos para testar")
    
    # Inicia browser e scraper
    from browser_handler import BrowserHandler
    browser = BrowserHandler()
    
    if not browser.start():
        logger.error("Erro ao iniciar navegador")
        return
    
    scraper = STJScraper(browser)
    
    try:
        success_count = 0
        error_count = 0
        not_found_count = 0
        
        for i, processo in enumerate(processos, 1):
            tjsp = processo.get('tjsp')
            tribunal = processo.get('tribunal', 'STJ')
            situacao_atual = processo.get('situacao')
            
            logger.info(f"\n{'='*60}")
            logger.info(f"Processo {i}/{len(processos)}: {tjsp}")
            logger.info(f"Tribunal: {tribunal}")
            logger.info(f"Situação atual: {situacao_atual}")
            logger.info('='*60)
            
            # Pesquisa no STJ
            registro_stj = scraper.search_process(tjsp)
            
            if not registro_stj:
                logger.warning(f"❌ Processo {tjsp} não encontrado no STJ")
                not_found_count += 1
                continue
            
            logger.info(f"✅ Registro STJ encontrado: {registro_stj}")
            
            # Extrai dados
            dados = scraper.extract_data()
            
            if dados:
                logger.info("✅ Dados extraídos com sucesso!")
                logger.info(f"   Superior: {dados.get('superior', 'N/A')}")
                logger.info(f"   Movimentação: {dados.get('movimentacao', 'N/A')[:100]}...")
                logger.info(f"   Link PDF: {dados.get('link_pdf', 'N/A')}")
                
                # Atualiza no banco
                logger.info("Atualizando banco de dados...")
                db.update_processo(
                    tjsp=tjsp,
                    tribunal='STJ',
                    dados={
                        'numero_registro': registro_stj,
                        'situacao': dados.get('superior', 'Em trâmite'),
                        'ultima_movimentacao': dados.get('movimentacao'),
                        'link_inteiro_teor': dados.get('link_pdf')
                    }
                )
                
                logger.info("✅ Banco de dados atualizado!")
                success_count += 1
            else:
                logger.error(f"❌ Erro ao extrair dados do processo {tjsp}")
                error_count += 1
        
        # Resumo
        logger.info(f"\n{'='*60}")
        logger.info("RESUMO DA EXECUÇÃO")
        logger.info('='*60)
        logger.info(f"Total de processos: {len(processos)}")
        logger.info(f"✅ Sucesso: {success_count}")
        logger.info(f"❌ Erros: {error_count}")
        logger.info(f"⚠️  Não encontrados: {not_found_count}")
        logger.info('='*60)
        
    finally:
        browser.close()
        logger.info("Scraper finalizado")

if __name__ == "__main__":
    main()
