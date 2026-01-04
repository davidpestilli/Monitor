"""
Classe principal para automação STF
"""
from datetime import datetime
from typing import Dict, Any, Optional

from .browser_handler import BrowserHandler
from .scraper import STFScraper
from .supabase_client import SupabaseClient
from .utils import get_logger, format_processo_number

logger = get_logger(__name__)


class STFAutomation:
    """Automação de consulta de processos no STF"""
    
    def __init__(self):
        """Inicializa automação"""
        self.browser = BrowserHandler()
        self.scraper: Optional[STFScraper] = None
        self.supabase = SupabaseClient()
        
        # Estatísticas
        self.stats = {
            "total": 0,
            "sucesso": 0,
            "erro": 0,
            "nao_encontrado": 0,
            "tempo_inicio": None,
            "tempo_fim": None
        }
    
    def run(self):
        """Executa automação completa"""
        try:
            logger.info("=" * 80)
            logger.info("INICIANDO AUTOMAÇÃO STF")
            logger.info("=" * 80)
            
            self.stats["tempo_inicio"] = datetime.now()
            
            # Inicia navegador
            if not self.browser.start():
                logger.error("Falha ao iniciar navegador")
                return
            
            # Inicializa scraper
            self.scraper = STFScraper(self.browser)
            
            # Navega para página do STF
            if not self.browser.navigate_to_stf():
                logger.error("Falha ao acessar portal STF")
                self.browser.close()
                return
            
            # Busca processos pendentes
            processos = self.supabase.get_processos_stf_pendentes()
            
            if not processos:
                logger.info("Nenhum processo pendente encontrado")
                self.browser.close()
                return
            
            self.stats["total"] = len(processos)
            logger.info(f"Total de processos a processar: {self.stats['total']}")
            
            # Processa cada processo
            for idx, processo in enumerate(processos, 1):
                tjsp = processo.get("tjsp")
                
                logger.info("-" * 80)
                logger.info(f"Processando {idx}/{self.stats['total']}: {tjsp}")
                logger.info("-" * 80)
                
                self.process_single(tjsp)
            
            # Fecha navegador
            self.browser.close()
            
            # Finaliza
            self.stats["tempo_fim"] = datetime.now()
            self._print_stats()
            
            logger.info("=" * 80)
            logger.info("AUTOMAÇÃO STF FINALIZADA")
            logger.info("=" * 80)
            
        except Exception as e:
            logger.error(f"Erro na execução da automação: {e}")
            if self.browser:
                self.browser.close()
    
    def process_single(self, tjsp: str):
        """
        Processa um único processo
        
        Args:
            tjsp: Número TJSP do processo
        """
        try:
            # Formata número (remove caracteres especiais)
            numero = format_processo_number(tjsp)
            
            # Seleciona tipo de pesquisa (Número único)
            if not self.scraper.selecionar_tipo_pesquisa():
                self._registrar_erro(tjsp)
                return
            
            # Digita número
            if not self.scraper.digitar_numero_processo(numero):
                self._registrar_erro(tjsp)
                return
            
            # Clica em Pesquisar
            if not self.scraper.clicar_pesquisar():
                self._registrar_erro(tjsp)
                return
            
            # Verifica se processo foi encontrado
            encontrado = self.scraper.verificar_processo_encontrado()
            
            if not encontrado:
                self._processar_nao_encontrado(tjsp)
            else:
                self._processar_encontrado(tjsp)
            
            # Volta para página inicial
            self.scraper.voltar_pagina_inicial()
            
        except Exception as e:
            logger.error(f"Erro ao processar {tjsp}: {e}")
            self._registrar_erro(tjsp)
            # Tenta voltar à página inicial
            try:
                self.scraper.voltar_pagina_inicial()
            except:
                pass
    
    def _processar_encontrado(self, tjsp: str):
        """
        Processa um processo encontrado
        
        Args:
            tjsp: Número TJSP
        """
        try:
            logger.info(f"Extraindo dados do processo {tjsp}...")
            
            # Extrai dados
            partes = self.scraper.extrair_partes()
            numero_superior = self.scraper.extrair_numero_superior()
            decisao = self.scraper.extrair_decisao()
            movimentacao = self.scraper.extrair_movimentacao()
            link = self.scraper.obter_link_atual()
            
            # Prepara dados para atualização
            dados_processo = {
                "reu": partes,
                "superior": numero_superior,
                "decisao": decisao,
                "movimentacao": movimentacao,
                "link": link,
                "pesquisa_stf": datetime.now().isoformat()
            }
            
            # Atualiza no banco
            if self.supabase.update_processo(tjsp, dados_processo):
                logger.info(f"Processo {tjsp} atualizado com sucesso")
                self.stats["sucesso"] += 1
            else:
                self._registrar_erro(tjsp)
                
        except Exception as e:
            logger.error(f"Erro ao processar dados de {tjsp}: {e}")
            self._registrar_erro(tjsp)
    
    def _processar_nao_encontrado(self, tjsp: str):
        """
        Processa um processo não encontrado
        
        Args:
            tjsp: Número TJSP
        """
        try:
            logger.warning(f"Processo {tjsp} não encontrado no STF")
            
            # Define mensagem padrão
            movimentacao = "Não há movimentação no STF"
            
            # Atualiza no banco
            dados_processo = {
                "reu": "-",
                "superior": "-",
                "decisao": "-",
                "movimentacao": movimentacao,
                "link": "-",
                "pesquisa_stf": datetime.now().isoformat()
            }
            
            if self.supabase.update_processo(tjsp, dados_processo):
                logger.info(f"Processo {tjsp} marcado como não encontrado")
                self.stats["nao_encontrado"] += 1
            else:
                self._registrar_erro(tjsp)
                
        except Exception as e:
            logger.error(f"Erro ao processar não encontrado {tjsp}: {e}")
            self._registrar_erro(tjsp)
    
    def _registrar_erro(self, tjsp: str):
        """
        Registra erro no processamento
        
        Args:
            tjsp: Número TJSP
        """
        self.stats["erro"] += 1
        logger.error(f"Erro registrado para {tjsp}")
    
    def _print_stats(self):
        """Imprime estatísticas da execução"""
        logger.info("")
        logger.info("=" * 80)
        logger.info("ESTATÍSTICAS DA EXECUÇÃO")
        logger.info("=" * 80)
        
        if self.stats["tempo_inicio"] and self.stats["tempo_fim"]:
            duracao = self.stats["tempo_fim"] - self.stats["tempo_inicio"]
            logger.info(f"Início: {self.stats['tempo_inicio'].strftime('%d/%m/%Y %H:%M:%S')}")
            logger.info(f"Fim: {self.stats['tempo_fim'].strftime('%d/%m/%Y %H:%M:%S')}")
            logger.info(f"Duração: {duracao}")
        
        logger.info("")
        logger.info(f"Total de processos: {self.stats['total']}")
        logger.info(f"✓ Sucesso: {self.stats['sucesso']}")
        logger.info(f"⚠ Não encontrados: {self.stats['nao_encontrado']}")
        logger.info(f"✗ Erros: {self.stats['erro']}")
        
        if self.stats["total"] > 0:
            taxa_sucesso = ((self.stats["sucesso"] + self.stats["nao_encontrado"]) / self.stats["total"]) * 100
            logger.info(f"Taxa de sucesso: {taxa_sucesso:.1f}%")
        
        logger.info("=" * 80)
