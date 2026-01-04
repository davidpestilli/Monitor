"""
Script para inspecionar a estrutura HTML da página de múltiplos processos
"""
from src.browser_handler import BrowserHandler
from src.scraper import STJScraper
from src.utils import get_logger

logger = get_logger(__name__)

def inspect_page():
    browser = None
    try:
        browser = BrowserHandler()
        browser.start()
        browser.navigate_to_stj()
        
        scraper = STJScraper(browser)
        processo = "0110007-21.2014.8.26.0050"
        
        logger.info("Pesquisando processo...")
        scraper.search_process(processo)
        
        # Extrai estrutura da página
        page_info = browser.execute_script("""
            var info = {
                titulo: document.title,
                temTabela: !!document.querySelector('table'),
                tabelaClasses: [],
                linhas: 0,
                primeiraLinha: '',
                botoes: []
            };
            
            var tabelas = document.querySelectorAll('table');
            tabelas.forEach(function(t, i) {
                info.tabelaClasses.push('Tabela ' + i + ': ' + (t.className || 'sem classe'));
            });
            
            var tabela = document.querySelector('table');
            if (tabela) {
                var linhas = tabela.querySelectorAll('tbody tr');
                info.linhas = linhas.length;
                
                if (linhas.length > 0) {
                    var primeira = linhas[0];
                    var colunas = primeira.querySelectorAll('td, th');
                    
                    var textos = [];
                    colunas.forEach(function(col) {
                        textos.push(col.innerText.substring(0, 50));
                    });
                    
                    info.primeiraLinha = textos.join(' | ');
                    
                    // Procura botões
                    linhas.forEach(function(linha, idx) {
                        var botao = linha.querySelector('button, a');
                        if (botao) {
                            info.botoes.push({
                                linha: idx,
                                tag: botao.tagName,
                                texto: botao.innerText.substring(0, 20),
                                onclick: botao.getAttribute('onclick') ? 'sim' : 'não'
                            });
                        }
                    });
                }
            }
            
            return info;
        """)
        
        print("\n=== INFORMAÇÕES DA PÁGINA ===")
        print(f"Título: {page_info['titulo']}")
        print(f"Tem tabela: {page_info['temTabela']}")
        print(f"Classes de tabelas: {page_info['tabelaClasses']}")
        print(f"Número de linhas: {page_info['linhas']}")
        print(f"Primeira linha: {page_info['primeiraLinha']}")
        print(f"\nBotões encontrados ({len(page_info['botoes'])}):")
        for botao in page_info['botoes']:
            print(f"  - Linha {botao['linha']}: <{botao['tag']}> '{botao['texto']}' (onclick={botao['onclick']})")
        
        import time
        time.sleep(10)  # Espera para você ver o browser
        
    finally:
        if browser:
            browser.close()

if __name__ == "__main__":
    inspect_page()
