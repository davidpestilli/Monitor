"""
Lógica de scraping do STJ
"""
from typing import Optional, Dict, Tuple
from datetime import datetime
from selenium.webdriver.common.by import By
import time

from .browser_handler import BrowserHandler
from .config import SELECTORS, MAX_RETRIES
from .utils import (
    get_logger, sanitize_text, extract_digits_from_process,
    is_hc_process, take_screenshot, clean_url_for_pdf
)

logger = get_logger(__name__)


class STJScraper:
    """Scraper para portal do STJ"""
    
    def __init__(self, browser: BrowserHandler):
        self.browser = browser
    
    def search_process(self, processo: str) -> bool:
        """
        Pesquisa processo no portal STJ
        
        Args:
            processo: Número do processo
            
        Returns:
            True se sucesso
        """
        try:
            logger.info(f"Pesquisando processo: {processo}")
            
            # Verifica se é HC para escolher campo correto
            is_hc = is_hc_process(processo)
            campo_selector = SELECTORS["campo_processo"] if is_hc else SELECTORS["campo_nup"]
            
            # Clica no campo
            if not self.browser.click_element(By.CSS_SELECTOR, campo_selector):
                logger.error(f"Não encontrou campo de busca para: {processo}")
                return False
            
            time.sleep(1)
            
            # Digita número caractere por caractere (como Power Automate fazia)
            digits = extract_digits_from_process(processo)
            for digit in digits:
                # Usa JavaScript para garantir que chegue ao campo
                self.browser.execute_script(f"""
                    var el = document.querySelector('{campo_selector}');
                    if (el) {{
                        el.value += '{digit}';
                        el.dispatchEvent(new Event('input', {{ bubbles: true }}));
                    }}
                """)
                time.sleep(0.05)  # Pequeno delay entre caracteres
            
            logger.debug(f"Digitou processo: {''.join(digits)}")
            
            # Clica no botão de consultar via JavaScript
            time.sleep(1)
            result = self.browser.execute_script("""
                function ExecuteScript() {
                    if (typeof quandoClicaConsultar === "function") {
                        quandoClicaConsultar();
                        return "OK";
                    } else {
                        return "Função não encontrada";
                    }
                }
                return ExecuteScript();
            """)
            
            if result != "OK":
                logger.error("Função quandoClicaConsultar não encontrada")
                return False
            
            # Aguarda página carregar (desaparecer texto de ajuda)
            if not self.browser.wait_for_text_to_disappear("O que eu consigo ver aqui?", timeout=15):
                logger.debug("Texto de ajuda já desapareceu")
            
            time.sleep(0.5)
            logger.info("Pesquisa realizada com sucesso")
            return True
            
        except Exception as e:
            logger.error(f"Erro ao pesquisar processo {processo}: {e}")
            take_screenshot(self.browser.driver, f"erro_pesquisa_{processo}")
            return False
    
    def verify_situation(self) -> Tuple[bool, Optional[str]]:
        """
        Verifica situação do resultado da pesquisa
        
        Returns:
            (encontrou, tipo) onde tipo pode ser: 'detalhes', 'multiplos_processos', 'nao_encontrado'
        """
        try:
            page_source = self.browser.driver.page_source
            
            # 1. Verifica primeiro se é "Não Encontrado" (mais específico)
            # Usa seletores CSS específicos da página de erro
            nao_encontrado = self.browser.execute_script("""
                // Verifica presença do bloco de mensagem de erro
                var msgBloco = document.getElementById('idDivBlocoMensagem');
                if (msgBloco && msgBloco.classList.contains('clsMensagemBloco')) {
                    var msgLinha = msgBloco.querySelector('.clsMensagemLinha');
                    if (msgLinha) {
                        var texto = msgLinha.textContent.trim().toLowerCase();
                        // Verifica se contém mensagem de "não encontrado"
                        return texto.includes('nenhum registro') || 
                               texto.includes('não encontrado') ||
                               texto.includes('nao encontrado');
                    }
                }
                return false;
            """)
            
            if nao_encontrado:
                logger.info("Processo não cadastrado no STJ (mensagem explícita)")
                return False, "nao_encontrado"
            
            # 2. Verifica se retornou múltiplos processos (2 ou mais)
            if "Pesquisa resultou em" in page_source and "registro" in page_source:
                logger.info("Encontrou múltiplos processos - selecionando mais recente")
                return True, "multiplos_processos"
            
            # 3. Verifica se tem botão "Detalhes" (1 processo encontrado)
            time.sleep(0.3)
            page_source_lower = page_source.lower()
            
            if "detalhes" in page_source_lower or "idspanclassedescricao" in page_source_lower:
                logger.info("Processo encontrado - página de detalhes")
                return True, "detalhes"
            
            # 4. Fallback: verifica se voltou ao formulário sem mensagem clara
            formulario_visivel = self.browser.execute_script("""
                var formulario = document.getElementById('idDivLinhaFormulario');
                return formulario && formulario.style.display !== 'none';
            """)
            
            if formulario_visivel:
                logger.info("Processo não encontrado (voltou ao formulário)")
                return False, "nao_encontrado"
            
            # Se não se encaixou em nenhum caso
            logger.warning("Situação não identificada - salvando screenshot")
            take_screenshot(self.browser.driver, "situacao_nao_identificada")
            return False, "erro"
            
        except Exception as e:
            logger.error(f"Erro ao verificar situação: {e}")
            return False, "erro"
    
    def handle_two_processes(self) -> bool:
        """
        Quando há múltiplos processos (2 ou mais), seleciona o com autuação mais recente
        
        Returns:
            True se sucesso
        """
        try:
            logger.info("Identificando processo com autuação mais recente...")
            
            # Script para extrair todos os registros com suas datas de autuação
            extract_script = r"""
                var resultados = [];
                
                try {
                    // Procura pelos containers de cada processo
                    var containers = document.querySelectorAll('div.clsListaProcessoFormatoVerticalBlocoExterno');
                    
                    if (containers.length === 0) {
                        return {total: 0, registros: [], metodo: 'nenhum', erro: 'Containers não encontrados'};
                    }
                    
                    containers.forEach(function(container, index) {
                        try {
                            // Extrair data de autuação
                            var dataElement = container.querySelector('span.clsLinhaProcessosDataAutuacao');
                            if (!dataElement) {
                                return;
                            }
                            
                            var dataText = dataElement.textContent.trim();
                            
                            // Extrair botão "mais"
                            var botao = container.querySelector('input.listaProcessosPartesBotoes');
                            if (!botao) {
                                return;
                            }
                            
                            // Extrair número de registro do id do botão
                            var botaoId = botao.getAttribute('id') || '';
                            var match = botaoId.match(/idProcessosListaMaisMenosDetalhes(\d+)/);
                            if (!match) {
                                return;
                            }
                            
                            var numRegistro = match[1];
                            
                            resultados.push({
                                index: index,
                                data: dataText,
                                numRegistro: numRegistro,
                                botao: botao
                            });
                        } catch(e) {
                            console.log('Erro no container ' + index + ': ' + e.toString());
                        }
                    });
                    
                    return {
                        total: resultados.length,
                        registros: resultados,
                        metodo: 'lista_vertical'
                    };
                    
                } catch(e) {
                    return {total: 0, registros: [], metodo: 'erro', erro: e.toString()};
                }
            """
            
            resultado_extracao = self.browser.execute_script(extract_script)
            resultados = resultado_extracao.get('registros', [])
            metodo = resultado_extracao.get('metodo', 'desconhecido')
            
            if not resultados or len(resultados) == 0:
                logger.warning(f"Não conseguiu extrair registros da tabela (método: {metodo})")
                take_screenshot(self.browser.driver, "erro_extracao_multiplos")
                return False
            
            logger.info(f"Encontrados {len(resultados)} registros (método: {metodo})")
            
            # Encontra o registro com data mais recente
            mais_recente = None
            data_mais_recente = None
            
            for registro in resultados:
                try:
                    # Parsea data no formato DD/MM/YYYY
                    data_str = registro['data']
                    data = datetime.strptime(data_str, "%d/%m/%Y")
                    
                    if data_mais_recente is None or data > data_mais_recente:
                        data_mais_recente = data
                        mais_recente = registro
                        
                except ValueError as e:
                    logger.warning(f"Erro ao parsear data '{registro['data']}': {e}")
                    continue
            
            if not mais_recente:
                logger.warning("Não conseguiu determinar registro mais recente")
                return False
            
            logger.info(f"Selecionando registro com autuação: {mais_recente['data']} (índice: {mais_recente['index']})")
            
            # Clica diretamente no link do número do processo (não precisa expandir)
            click_link_script = f"""
                try {{
                    var containers = document.querySelectorAll('div.clsListaProcessoFormatoVerticalBlocoExterno');
                    var container = containers[{mais_recente['index']}];
                    
                    if (!container) {{
                        return {{sucesso: false, erro: 'Container não encontrado'}};
                    }}
                    
                    // Procura pelo primeiro link (é o link do número do processo)
                    var links = container.querySelectorAll('a');
                    var link = links[0];  // Primeiro link é sempre o número do processo
                    
                    if (!link) {{
                        return {{sucesso: false, erro: 'Link do processo não encontrado'}};
                    }}
                    
                    var href = link.href;
                    var texto = link.textContent.trim();
                    
                    // Clica no link para abrir página de detalhes
                    link.click();
                    
                    return {{sucesso: true, href: href, texto: texto}};
                    
                }} catch(e) {{
                    return {{sucesso: false, erro: e.toString()}};
                }}
            """
            
            resultado = self.browser.execute_script(click_link_script)
            
            if not resultado or not resultado.get('sucesso'):
                logger.warning(f"Erro ao clicar no link: {resultado.get('erro', 'desconhecido') if resultado else 'sem resultado'}")
                take_screenshot(self.browser.driver, "erro_click_link_multiplos")
                return False
            
            logger.info(f"Clicou no link do processo: {resultado.get('texto', 'sem texto')}")
            logger.info(f"Navegando para página de detalhes: {resultado.get('href', 'sem href')}")
            time.sleep(2.0)  # Aguarda carregar página de detalhes
            
            return True
                
        except Exception as e:
            logger.error(f"Erro ao tratar múltiplos processos: {e}")
            take_screenshot(self.browser.driver, "erro_multiplos_processos")
            return False
    
    def extract_data(self) -> Dict[str, str]:
        """
        Extrai dados da página de detalhes
        
        Returns:
            Dict com dados extraídos
        """
        try:
            logger.info("Extraindo dados do processo")
            
            dados = {
                "reu": "",
                "superior": "",
                "movimentacao": "",
                "link": ""
            }
            
            # 1. Extrai partes/advogados
            partes_script = """
                function ExecuteScript() {
                    var container = document.getElementById("idDetalhesPartesAdvogadosProcuradores");
                    if (!container) return "";
                    
                    var linhas = container.querySelectorAll(".classDivLinhaDetalhes");
                    var resultados = [];
                    
                    linhas.forEach(function(linha) {
                        var label = linha.querySelector(".classSpanDetalhesLabel");
                        var texto = linha.querySelector(".classSpanDetalhesTexto a");
                        
                        if (label && texto) {
                            var labelText = label.innerText.trim().replace(/\\s+/g, ' ');
                            var textoText = texto.innerText.trim().replace(/\\s+/g, ' ');
                            
                            if (labelText && textoText) {
                                resultados.push(labelText + " " + textoText);
                            }
                        }
                    });
                    
                    return resultados.join(" | ");
                }
                return ExecuteScript();
            """
            dados["reu"] = sanitize_text(self.browser.execute_script(partes_script) or "")
            
            # 2. Extrai classe
            classe_script = """
                var el = document.getElementById("idSpanClasseDescricao");
                return el ? el.innerText.trim() : "";
            """
            dados["superior"] = sanitize_text(self.browser.execute_script(classe_script) or "")
            
            # 3. Extrai última movimentação
            movimentacao_script = """
                function ExecuteScript() {
                    var linhas = document.querySelectorAll(".classDivLinhaDetalhes");
                    var movimentacao = "";
                    
                    linhas.forEach(function(linha) {
                        var label = linha.querySelector(".classSpanDetalhesLabel");
                        var texto = linha.querySelector(".classSpanDetalhesTexto");
                        
                        if (label && texto) {
                            var labelText = label.innerText.trim().toUpperCase();
                            if (labelText.includes("ÚLTIMA FASE") || labelText.includes("ULTIMA FASE")) {
                                movimentacao = texto.innerText || texto.textContent || "";
                            }
                        }
                    });
                    
                    return movimentacao.trim();
                }
                return ExecuteScript();
            """
            dados["movimentacao"] = sanitize_text(self.browser.execute_script(movimentacao_script) or "")
            
            # 4. Ativa aba de decisões
            decisoes_script = """
                if (typeof setVisibilidadeAbaDecisoes === "function") {
                    setVisibilidadeAbaDecisoes();
                    return "OK";
                }
                return "Função não encontrada";
            """
            self.browser.execute_script(decisoes_script)
            time.sleep(0.3)
            
            # 5. Extrai link do PDF
            link_script = """
                var el = document.querySelector("a.clsDecisoesMonocraticasTopoLink");
                if (el) {
                    var onclickAttr = el.getAttribute("onclick");
                    var match = onclickAttr.match(/\'([^\']*\\/processo\\/dj\\/documento\\/mediado\\/[^\']*)\'/);
                    if (match && match[1]) {
                        return "https://processo.stj.jus.br" + match[1];
                    }
                }
                return window.location.href;
            """
            link = self.browser.execute_script(link_script) or ""
            dados["link"] = clean_url_for_pdf(link)
            
            logger.info(f"Dados extraídos: movimentacao={dados['movimentacao'][:50]}...")
            return dados
            
        except Exception as e:
            logger.error(f"Erro ao extrair dados: {e}")
            take_screenshot(self.browser.driver, "erro_extracao")
            return {
                "reu": "",
                "superior": "",
                "movimentacao": "",
                "link": ""
            }
    
    def click_new_search(self) -> bool:
        """
        Clica no botão Nova Consulta
        
        Returns:
            True se sucesso
        """
        try:
            logger.debug("Clicando em Nova Consulta")
            
            script = """
                var botao = document.querySelector('#idBotaoFormularioExtendidoNovaConsulta');
                if (botao) {
                    botao.click();
                    return "OK";
                } else {
                    // Tenta via função JavaScript
                    if (typeof quandoClicaNovaConsulta === "function") {
                        quandoClicaNovaConsulta('idDivBlocoFormularioExtendido', 'idDivFoneticaBloco', 'idDivFormularioExtendidoLinhaBotaoNovaConsulta');
                        return "OK";
                    }
                    return "Botão não encontrado";
                }
            """
            
            result = self.browser.execute_script(script)
            time.sleep(0.5)
            
            return result == "OK"
            
        except Exception as e:
            logger.error(f"Erro ao clicar em Nova Consulta: {e}")
            return False
