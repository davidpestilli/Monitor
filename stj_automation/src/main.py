"""
Automação STJ - Entrada principal
Consulta processos no portal do STJ e atualiza banco Supabase
"""
import sys
import time
from datetime import datetime
from typing import List, Dict

from .browser_handler import BrowserHandler
from .scraper import STJScraper
from .supabase_client import SupabaseClient
from .utils import get_logger, is_hc_process, take_screenshot
from .config import MAX_RETRIES
from .progress_window import ProgressWindow

logger = get_logger(__name__)


class STJAutomation:
    """Classe principal da automação"""
    
    def __init__(self):
        self.browser = BrowserHandler()
        self.scraper = None
        self.supabase = SupabaseClient()
        self.progress_window = None  # Janela de progresso flutuante
        self.stats = {
            "total": 0,
            "sucesso": 0,
            "erro": 0,
            "nao_encontrado": 0,
            "multiplos_processos": 0,
            "hc_count": 0,
            "processos_com_mudanca_status": 0,
            "status_detectados": {
                "Recebido": 0,
                "Baixa": 0,
                "Trânsito": 0,
                "Em trâmite": 0
            },
            "tempo_inicio": None,
            "tempo_fim": None
        }
    
    def setup(self) -> bool:
        """
        Inicializa componentes
        
        Returns:
            True se sucesso
        """
        try:
            self.stats["tempo_inicio"] = datetime.now()
            
            logger.info("=" * 60)
            logger.info("INICIANDO AUTOMAÇÃO STJ")
            logger.info(f"Data/Hora: {self.stats['tempo_inicio'].strftime('%d/%m/%Y %H:%M:%S')}")
            logger.info("=" * 60)
            
            # Inicia navegador
            logger.info("Iniciando navegador...")
            if not self.browser.start():
                logger.error("Falha ao iniciar navegador")
                return False
            logger.info("Navegador iniciado com sucesso")
            
            # Navega para STJ
            logger.info("Navegando para portal STJ...")
            if not self.browser.navigate_to_stj():
                logger.error("Falha ao acessar portal STJ")
                logger.info("\nEncerrando navegador...")
                self.browser.close()
                return False
            logger.info("Portal STJ acessado com sucesso")
            
            # Inicializa scraper
            self.scraper = STJScraper(self.browser)
            
            logger.info("Setup concluído com sucesso")
            return True
            
        except Exception as e:
            logger.error(f"Erro no setup: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return False
    
    def process_single(self, processo: Dict) -> bool:
        """
        Processa um único processo
        
        Args:
            processo: Dict com dados do processo
            
        Returns:
            True se processou com sucesso
        """
        try:
            tjsp = processo.get("tjsp", "")
            if not tjsp:
                logger.warning("Processo sem número TJSP, pulando")
                return False
            
            # Remove % do início/fim se houver (do Power Automate)
            tjsp = tjsp.strip('%')
            
            logger.info(f"\n{'='*60}")
            logger.info(f"PROCESSANDO: {tjsp}")
            logger.info(f"{'='*60}")
            
            # Atualiza janela de progresso
            if self.progress_window:
                self.progress_window.update(current=tjsp, action="Pesquisando no portal...")
            
            # 1. Pesquisa processo
            if not self.scraper.search_process(tjsp):
                logger.error(f"Falha ao pesquisar processo {tjsp}")
                self.stats["erro"] += 1
                return False
            
            # 2. Verifica situação do resultado
            if self.progress_window:
                self.progress_window.update(action="Verificando resultado...")
            encontrou, tipo = self.scraper.verify_situation()
            
            # 3. Trata resultado não encontrado
            if not encontrou or tipo == "nao_encontrado":
                logger.info(f"Processo {tjsp} não cadastrado no STJ")
                if self.progress_window:
                    self.progress_window.update(action="Processo não encontrado no STJ")
                self._handle_not_found(tjsp)
                self.stats["nao_encontrado"] += 1
                return True
            
            # 4. Trata múltiplos processos (2 ou mais)
            if tipo == "multiplos_processos":
                self.stats["multiplos_processos"] += 1
                if self.progress_window:
                    self.progress_window.update(action="Selecionando processo mais recente...")
                if not self.scraper.handle_two_processes():
                    logger.error("Falha ao selecionar processo mais recente")
                    self.stats["erro"] += 1
                    return False
                time.sleep(2)
            
            # 5. Extrai dados
            if self.progress_window:
                self.progress_window.update(action="Extraindo dados do processo...")
            dados = self.scraper.extract_data()
            
            if not dados.get("movimentacao"):
                logger.warning("Não conseguiu extrair movimentação")
                dados["movimentacao"] = "Dados não disponíveis"
            
            # 6. Detecta mudanças de status baseado nas palavras-chave
            is_hc = is_hc_process(tjsp)
            novo_status = self._detectar_novo_status(dados["movimentacao"], processo.get("situacao", "Em trâmite"))
            
            if novo_status != processo.get("situacao", "Em trâmite"):
                self.stats["processos_com_mudanca_status"] += 1
                self.stats["status_detectados"][novo_status] += 1
                logger.info(f"🔄 Mudança de status detectada: {processo.get('situacao', 'Em trâmite')} → {novo_status}")
            
            if is_hc:
                self.stats["hc_count"] += 1
            
            # 7. Atualiza Supabase
            if self.progress_window:
                self.progress_window.update(action="Atualizando banco de dados...")
            success = self.supabase.update_processo_stj(
                tjsp=tjsp,
                reu=dados["reu"],
                superior=dados["superior"] if not is_hc else None,
                movimentacao=dados["movimentacao"],
                link=dados["link"],
                is_hc=is_hc
            )
            
            if success:
                logger.info(f"[OK] Processo {tjsp} atualizado com sucesso")
                self.stats["sucesso"] += 1
                return True
            else:
                logger.error(f"Falha ao atualizar banco para {tjsp}")
                self.stats["erro"] += 1
                return False
            
        except Exception as e:
            logger.error(f"Erro ao processar {tjsp}: {e}")
            take_screenshot(self.browser.driver, f"erro_{tjsp}")
            self.stats["erro"] += 1
            return False
        finally:
            # Sempre clica em Nova Consulta para próximo processo
            self.scraper.click_new_search()
            time.sleep(1)
    
    def _detectar_novo_status(self, movimentacao: str, status_atual: str) -> str:
        """
        Detecta novo status baseado em palavras-chave na movimentação.
        Implementa a mesma lógica do botão "Atualizar" do frontend.
        
        Args:
            movimentacao: Texto da última movimentação
            status_atual: Status atual do processo
            
        Returns:
            Novo status detectado
        """
        if not movimentacao:
            return status_atual
        
        texto = movimentacao.lower()
        
        # Palavras excludentes para "recebido"
        excludentes_recebido = ['supremo', 'federal', 'stf', 'coordenadoria', 'classificação', 'distribuição']
        tem_excludente = any(palavra in texto for palavra in excludentes_recebido)
        
        # Verifica se contém "são paulo"
        contem_sao_paulo = 'são paulo' in texto or 'sao paulo' in texto
        
        # Lógica de detecção (mesma do frontend)
        if 'recebido' in texto and not tem_excludente and contem_sao_paulo:
            return 'Recebido'
        elif 'baixa' in texto:
            return 'Baixa'
        elif 'trânsito' in texto or 'transito' in texto:
            return 'Trânsito'
        else:
            return 'Em trâmite'
    
    def _handle_not_found(self, tjsp: str):
        """Trata processo não encontrado"""
        # Clica em Nova Consulta
        self.scraper.click_new_search()
        
        # Atualiza com movimentação vazia
        self.supabase.update_processo_stj(
            tjsp=tjsp,
            reu="",
            superior="",
            movimentacao="Não há movimentação no STJ",
            link="",
            is_hc=is_hc_process(tjsp)
        )
    
    def _load_final_stats(self):
        """Busca estatísticas finais do banco de dados após processamento"""
        try:
            # Busca contagem de processos por status no STJ
            response = self.supabase.supabase.table('processos').select('situacao').eq('tribunal', 'STJ').execute()
            
            if response.data:
                status_count = {}
                for item in response.data:
                    status = item.get('situacao', 'Em trâmite')
                    status_count[status] = status_count.get(status, 0) + 1
                
                self.stats["status_atuais_banco"] = status_count
                
        except Exception as e:
            logger.warning(f"Não foi possível carregar estatísticas finais do banco: {e}")
    
    def run(self) -> bool:
        """
        Executa automação completa
        
        Returns:
            True se sucesso
        """
        try:
            # Inicia janela de progresso flutuante
            self.progress_window = ProgressWindow("STJ")
            self.progress_window.start()
            self.progress_window.update(status="Inicializando...")
            
            # 1. Setup
            if not self.setup():
                if self.progress_window:
                    self.progress_window.complete(success=False)
                    time.sleep(3)
                    self.progress_window.close()
                return False
            
            self.progress_window.update(status="Buscando processos...")
            
            # 2. Busca processos
            logger.info("\nBuscando processos no Supabase...")
            processos = self.supabase.get_processos_em_tramite()
            
            if not processos:
                logger.warning("Nenhum processo encontrado para processar")
                if self.progress_window:
                    self.progress_window.update(status="Nenhum processo encontrado")
                    self.progress_window.complete(success=True)
                    time.sleep(3)
                    self.progress_window.close()
                return True
            
            self.stats["total"] = len(processos)
            logger.info(f"Encontrados {len(processos)} processos para processar\n")
            
            # Atualiza janela de progresso com total
            self.progress_window.update(
                total=len(processos),
                processed=0,
                status="Em execução..."
            )
            
            # 3. Processa cada processo
            for i, processo in enumerate(processos, 1):
                tjsp = processo.get('tjsp', 'N/A')
                
                # Atualiza progresso
                self.progress_window.update(
                    processed=i,
                    current=tjsp,
                    action="Iniciando pesquisa..."
                )
                
                logger.info(f"\n[{i}/{len(processos)}] Processando...")
                self.process_single(processo)
                
                # Pequeno delay entre processos
                if i < len(processos):
                    time.sleep(1)
            
            # 4. Registra tempo de fim
            self.stats["tempo_fim"] = datetime.now()
            
            # 5. Busca estatísticas finais do banco e exibe relatório
            self._load_final_stats()
            self._print_stats()
            
            # Finaliza janela de progresso
            if self.progress_window:
                self.progress_window.complete(success=True)
                time.sleep(5)  # Mantém visível por 5 segundos
                self.progress_window.close()
            
            return True
            
        except KeyboardInterrupt:
            logger.warning("\n\nAutomação interrompida pelo usuário")
            if self.progress_window:
                self.progress_window.update(status="Interrompido pelo usuário")
                self.progress_window.complete(success=False)
                time.sleep(2)
                self.progress_window.close()
            return False
        except Exception as e:
            logger.error(f"Erro fatal na automação: {e}")
            if self.progress_window:
                self.progress_window.update(status=f"Erro: {str(e)[:50]}")
                self.progress_window.complete(success=False)
                time.sleep(3)
                self.progress_window.close()
            return False
        finally:
            # Sempre fecha navegador
            logger.info("\nEncerrando navegador...")
            self.browser.close()
    
    def _print_stats(self):
        """Exibe relatório gerencial completo da execução"""
        
        # Calcula duração
        if self.stats.get("tempo_inicio") and self.stats.get("tempo_fim"):
            duracao = self.stats["tempo_fim"] - self.stats["tempo_inicio"]
            duracao_str = str(duracao).split('.')[0]  # Remove microsegundos
        else:
            duracao_str = "N/A"
        
        # Calcula taxa de sucesso
        taxa_sucesso = (self.stats['sucesso'] / self.stats['total'] * 100) if self.stats['total'] > 0 else 0
        
        # Imprime relatório
        print("\n" + "=" * 80)
        print("                    RELATÓRIO GERENCIAL - AUTOMAÇÃO STJ")
        print("=" * 80)
        
        # Informações gerais
        print("\n📊 RESUMO DA EXECUÇÃO")
        print("-" * 80)
        print(f"  Data/Hora Início:          {self.stats.get('tempo_inicio', 'N/A').strftime('%d/%m/%Y %H:%M:%S') if self.stats.get('tempo_inicio') else 'N/A'}")
        print(f"  Data/Hora Fim:             {self.stats.get('tempo_fim', 'N/A').strftime('%d/%m/%Y %H:%M:%S') if self.stats.get('tempo_fim') else 'N/A'}")
        print(f"  Duração Total:             {duracao_str}")
        print(f"  Total de Processos:        {self.stats['total']}")
        print(f"  Taxa de Sucesso:           {taxa_sucesso:.1f}%")
        
        # Resultados
        print("\n✅ RESULTADOS")
        print("-" * 80)
        print(f"  ✓ Processados com Sucesso: {self.stats['sucesso']} ({self.stats['sucesso']/self.stats['total']*100:.1f}%)" if self.stats['total'] > 0 else "  ✓ Processados com Sucesso: 0")
        print(f"  ⚠ Múltiplos Processos:     {self.stats['multiplos_processos']}")
        print(f"  ⚡ Habeas Corpus:           {self.stats['hc_count']}")
        print(f"  ⚠ Não Encontrados:         {self.stats['nao_encontrado']}")
        print(f"  ✗ Erros:                   {self.stats['erro']}")
        
        # Mudanças de status detectadas
        print("\n🔄 MUDANÇAS DE STATUS DETECTADAS")
        print("-" * 80)
        print(f"  Total de Processos com Mudança: {self.stats['processos_com_mudanca_status']}")
        
        if self.stats['processos_com_mudanca_status'] > 0:
            print("\n  Novos Status Detectados (serão aplicados ao clicar em 'Atualizar'):")
            for status, count in self.stats['status_detectados'].items():
                if count > 0:
                    print(f"    • {status:20s}: {count} processo(s)")
        else:
            print("  Nenhuma mudança de status detectada nesta execução.")
        
        # Distribuição atual por status no banco
        if self.stats.get("status_atuais_banco"):
            print("\n📈 DISTRIBUIÇÃO ATUAL DE STATUS (STJ) - APÓS EXECUÇÃO")
            print("-" * 80)
            total_stj = sum(self.stats["status_atuais_banco"].values())
            print(f"  Total de processos STJ no banco: {total_stj}")
            print("\n  Distribuição por status:")
            
            # Ordena por quantidade (decrescente)
            status_ordenados = sorted(self.stats["status_atuais_banco"].items(), key=lambda x: x[1], reverse=True)
            
            for status, count in status_ordenados:
                percentual = (count / total_stj * 100) if total_stj > 0 else 0
                barra = "█" * int(percentual / 2)  # Barra de progresso visual
                print(f"    • {status:20s}: {count:3d} ({percentual:5.1f}%) {barra}")
        
        # Observações importantes
        print("\n💡 OBSERVAÇÕES IMPORTANTES")
        print("-" * 80)
        print("  • As mudanças de status detectadas NÃO foram aplicadas automaticamente.")
        print("  • Para aplicar as mudanças, clique no botão 'Atualizar' no sistema web.")
        print("  • A lógica de detecção segue as palavras-chave: 'recebido', 'baixa', 'trânsito'.")
        print("  • Status 'Recebido' requer: 'recebido' + 'são paulo' (sem palavras excludentes).")
        print("  • Palavras excludentes: supremo, federal, stf, coordenadoria, classificação, distribuição.")
        
        print("\n" + "=" * 80)
        print("                          RELATÓRIO CONCLUÍDO")
        print("=" * 80 + "\n")


def main():
    """Função principal"""
    try:
        automation = STJAutomation()
        success = automation.run()
        
        sys.exit(0 if success else 1)
        
    except Exception as e:
        logger.error(f"Erro fatal: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
