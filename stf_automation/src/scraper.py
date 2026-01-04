"""
Extração de dados do portal STF
"""
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from typing import Optional, Dict, Any
import time

from .utils import get_logger, take_screenshot, escape_json_string

logger = get_logger(__name__)


class STFScraper:
    """Extrator de dados do portal STF"""
    
    def __init__(self, browser_handler):
        """
        Inicializa scraper
        
        Args:
            browser_handler: Instância do BrowserHandler
        """
        self.browser = browser_handler
        self.driver = browser_handler.driver
        self.wait = browser_handler.wait
    
    def selecionar_tipo_pesquisa(self) -> bool:
        """
        Seleciona 'Número único' no dropdown (terceira opção)
        
        Returns:
            True se sucesso
        """
        try:
            logger.info("Selecionando tipo de pesquisa...")
            
            # Clica no combo box
            combo = self.wait.until(
                EC.element_to_be_clickable((By.ID, "tipo-pesquisa-processo"))
            )
            combo.click()
            time.sleep(0.5)
            
            # Pressiona Down 2 vezes para terceira opção
            combo.send_keys(Keys.DOWN)
            time.sleep(0.2)
            combo.send_keys(Keys.DOWN)
            time.sleep(0.2)
            combo.send_keys(Keys.ENTER)
            time.sleep(0.5)
            
            logger.info("Tipo de pesquisa selecionado")
            return True
            
        except Exception as e:
            logger.error(f"Erro ao selecionar tipo de pesquisa: {e}")
            take_screenshot(self.driver, "erro_selecao_tipo")
            return False
    
    def digitar_numero_processo(self, numero: str) -> bool:
        """
        Digita número do processo caractere por caractere com controle preciso
        
        Args:
            numero: Número do processo (apenas dígitos)
            
        Returns:
            True se sucesso
        """
        try:
            logger.info(f"Digitando número do processo: {numero}")
            
            # Localiza o campo
            campo = self.wait.until(
                EC.element_to_be_clickable((By.ID, "pesquisaPrincipalNumeroUnico"))
            )
            
            # Clica no campo para focá-lo
            campo.click()
            time.sleep(0.3)
            
            # Limpa completamente o campo usando várias técnicas
            campo.clear()
            time.sleep(0.2)
            
            # Usa JavaScript para garantir que o campo está vazio
            self.driver.execute_script("""
                arguments[0].value = '';
                arguments[0].focus();
            """, campo)
            time.sleep(0.3)
            
            # Envia CTRL+A + DELETE para garantir limpeza total
            campo.send_keys(Keys.CONTROL + "a")
            time.sleep(0.1)
            campo.send_keys(Keys.DELETE)
            time.sleep(0.3)
            
            # Agora digita caractere por caractere com delay adequado
            for i, char in enumerate(numero):
                campo.send_keys(char)
                time.sleep(0.12)  # Delay entre caracteres
                
                # Log de progresso a cada 5 caracteres
                if (i + 1) % 5 == 0:
                    logger.debug(f"Digitados {i + 1}/{len(numero)} caracteres")
            
            time.sleep(0.5)
            
            # Verifica se o valor foi definido corretamente
            # O site pode formatar automaticamente o número (adicionar hífens/pontos)
            valor_atual = campo.get_attribute('value')
            valor_atual_limpo = valor_atual.replace('-', '').replace('.', '')
            numero_limpo = numero.replace('-', '').replace('.', '')
            
            if valor_atual_limpo == numero_limpo:
                logger.info(f"Número digitado com sucesso: {valor_atual}")
                return True
            else:
                logger.warning(f"Valor no campo ({valor_atual}) diferente do esperado ({numero})")
                logger.warning(f"Esperado (limpo): {numero_limpo}, Obtido (limpo): {valor_atual_limpo}")
                return False
            
        except Exception as e:
            logger.error(f"Erro ao digitar número: {e}")
            take_screenshot(self.driver, "erro_digitacao")
            return False
    
    def clicar_pesquisar(self) -> bool:
        """
        Clica no botão Pesquisar
        
        Returns:
            True se sucesso
        """
        try:
            logger.info("Clicando em Pesquisar...")
            
            botao = self.wait.until(
                EC.element_to_be_clickable((By.ID, "btnPesquisar"))
            )
            botao.click()
            
            # Aguarda página processar
            time.sleep(3)
            
            logger.info("Pesquisa iniciada")
            return True
            
        except Exception as e:
            logger.error(f"Erro ao clicar em Pesquisar: {e}")
            return False
    
    def verificar_processo_encontrado(self) -> bool:
        """
        Verifica se o processo foi encontrado ou se retornou 'Processo não encontrado'
        
        Returns:
            True se processo encontrado, False se não encontrado
        """
        try:
            # Aguarda página carregar
            time.sleep(2)
            
            # Verifica se aparece mensagem de não encontrado
            try:
                body_text = self.driver.find_element(By.TAG_NAME, "body").text
                
                if "Processo não encontrado" in body_text:
                    logger.warning("Processo não encontrado no STF")
                    return False
                
                # Se não tem mensagem de erro, considera encontrado
                logger.info("Processo encontrado")
                return True
                
            except Exception:
                # Se não conseguiu verificar, assume encontrado
                return True
                
        except Exception as e:
            logger.error(f"Erro ao verificar se processo foi encontrado: {e}")
            return True  # Em caso de erro, assume encontrado para tentar extrair
    
    def extrair_partes(self) -> str:
        """
        Extrai partes do processo usando JavaScript
        
        Returns:
            String com partes formatadas ou "-"
        """
        try:
            logger.info("Extraindo partes do processo...")
            
            # JavaScript para extrair partes
            js_script = """
                const linhas = document.querySelectorAll("#partes-resumidas > div");
                let resultado = [];

                linhas.forEach(div => {
                    const sigla = div.children[0]?.innerText?.trim().replace(/\\(.*?\\)/g, '');
                    const nome = div.children[1]?.innerText?.trim();
                    if (sigla && nome) {
                        resultado.push(`${sigla} - ${nome}`);
                    }
                });

                return resultado.join(' • ');
            """
            
            partes = self.driver.execute_script(js_script)
            
            if partes:
                logger.info(f"Partes extraídas: {partes[:100]}...")
                return escape_json_string(partes)
            else:
                logger.warning("Nenhuma parte encontrada")
                return "-"
                
        except Exception as e:
            logger.error(f"Erro ao extrair partes: {e}")
            return "-"
    
    def extrair_numero_superior(self) -> str:
        """
        Extrai número do processo superior
        
        Returns:
            Número superior ou "-"
        """
        try:
            # Busca o número do processo no cabeçalho da página
            # Tenta primeiro pelo seletor mais específico
            try:
                elemento = self.driver.find_element(By.XPATH, "//section//div[@class='row']//div[@class='col-md-9']//h2")
                numero = elemento.text.strip()
            except:
                # Fallback: busca qualquer h2 na página de detalhe
                elemento = self.driver.find_element(By.XPATH, "//section//h2[contains(@class, '') or not(@class)]")
                numero = elemento.text.strip()
            
            # Extrai apenas primeiros 11 (ou 10) caracteres conforme lógica do PA
            if numero:
                if "ARE" in numero:
                    numero = numero[:11]
                else:
                    numero = numero[:10]
                
                logger.info(f"Número superior extraído: {numero}")
                return numero
            else:
                return "-"
                
        except Exception as e:
            logger.warning(f"Número superior não encontrado: {e}")
            return "-"
    
    def extrair_decisao(self) -> str:
        """
        Extrai última decisão
        
        Returns:
            Texto da decisão ou "-"
        """
        try:
            # Busca primeiro item da lista de decisões
            # O mesmo conteúdo da movimentação geralmente serve como decisão
            decisao = "-"
            
            # Como já temos a movimentação, podemos usar ela como decisão
            # ou buscar especificamente na aba Decisões
            try:
                elemento = self.driver.find_element(By.XPATH, "//ul[contains(@class, 'timeline')]//li[1]//div[@class='description']")
                decisao = elemento.text.strip()
            except:
                # Se não encontrar, usa a movimentação mesmo
                logger.debug("Usando movimentação como decisão")
                return "-"
            
            if decisao:
                logger.info(f"Decisão extraída: {decisao[:100]}...")
                return escape_json_string(decisao)
            else:
                return "-"
                
        except Exception as e:
            logger.warning(f"Decisão não encontrada: {e}")
            return "-"
    
    def clicar_aba_decisoes(self) -> bool:
        """
        Clica na aba 'Decisões' para expandir a seção
        
        Returns:
            True se sucesso
        """
        try:
            logger.info("Clicando na aba Decisões...")
            
            # Procura pelo link com texto "Decisões" dentro da li com classe li-decisoes
            # Tenta múltiplos seletores para maior robustez
            seletores = [
                "li.li-decisoes a[href='#decisoes']",
                "a[href='#decisoes']",
                "//a[contains(@href, '#decisoes')]//span[contains(text(), 'Decisões')]/..",
                "//span[text()='Decisões']/.."
            ]
            
            elemento = None
            for seletor in seletores:
                try:
                    if seletor.startswith("//"):
                        # XPath
                        elemento = self.wait.until(
                            EC.element_to_be_clickable((By.XPATH, seletor))
                        )
                    else:
                        # CSS Selector
                        elemento = self.wait.until(
                            EC.element_to_be_clickable((By.CSS_SELECTOR, seletor))
                        )
                    break
                except TimeoutException:
                    continue
            
            if elemento:
                elemento.click()
                time.sleep(1)
                logger.info("Aba Decisões clicada com sucesso")
                return True
            else:
                logger.warning("Não foi possível encontrar aba Decisões")
                return False
                
        except Exception as e:
            logger.error(f"Erro ao clicar na aba Decisões: {e}")
            take_screenshot(self.driver, "erro_aba_decisoes")
            return False
    
    def extrair_movimentacao(self) -> str:
        """
        Extrai última movimentação/decisão
        
        Returns:
            Texto da movimentação ou "-"
        """
        try:
            # Clica na aba Decisões (substitui os 40 TABs)
            if not self.clicar_aba_decisoes():
                logger.warning("Não foi possível abrir aba Decisões, tentando método alternativo...")
                # Fallback: usa o método antigo com TABs
                for _ in range(40):
                    self.driver.find_element(By.TAG_NAME, "body").send_keys(Keys.TAB)
                    time.sleep(0.02)
                
                time.sleep(0.3)
                self.driver.find_element(By.TAG_NAME, "body").send_keys(Keys.ENTER)
                time.sleep(1)
            
            # Extrai movimentação da aba de decisões
            # Tenta primeiro no conteúdo da aba decisoes
            seletores_decisao = [
                "#decisoes > div > div:first-child",
                "#decisoes ul li:first-child",
                "div[id='decisoes'] > div"
            ]
            
            movimentacao = None
            for seletor in seletores_decisao:
                try:
                    elemento = self.driver.find_element(By.CSS_SELECTOR, seletor)
                    movimentacao = elemento.text.strip()
                    if movimentacao:
                        break
                except:
                    continue
            
            # Se não encontrou, tenta o seletor original
            if not movimentacao:
                selector = "html > body > div:eq(0) > div:eq(1) > section > div > div > div > div > div > div > div:eq(1) > div:eq(3) > div:eq(3) > div > div:eq(0) > div"
                elemento = self.driver.find_element(By.CSS_SELECTOR, selector)
                movimentacao = elemento.text.strip()
            
            if movimentacao:
                logger.info(f"Movimentação extraída: {movimentacao[:100]}...")
                return escape_json_string(movimentacao)
            else:
                return "-"
                
        except Exception as e:
            logger.warning(f"Movimentação não encontrada: {e}")
            take_screenshot(self.driver, "erro_extracao_movimentacao")
            return "-"
    
    def obter_link_atual(self) -> str:
        """
        Obtém URL atual do processo
        
        Returns:
            URL ou "-"
        """
        try:
            url = self.driver.current_url
            logger.info(f"Link do processo: {url}")
            return url
        except Exception as e:
            logger.error(f"Erro ao obter link: {e}")
            return "-"
    
    def voltar_pagina_inicial(self) -> bool:
        """
        Volta para página inicial clicando no logo STF
        
        Returns:
            True se sucesso
        """
        try:
            logger.info("Voltando para página inicial...")
            
            # Clica no logo STF (image com alt "Supremo Tribunal Federal")
            logo = self.wait.until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, "img[alt='Supremo Tribunal Federal']"))
            )
            logo.click()
            
            time.sleep(2)
            logger.info("Retornou à página inicial")
            return True
            
        except Exception as e:
            logger.error(f"Erro ao voltar para página inicial: {e}")
            # Tenta navegação direta como fallback
            try:
                from .config import STF_URL
                self.driver.get(STF_URL)
                time.sleep(2)
                return True
            except:
                return False
