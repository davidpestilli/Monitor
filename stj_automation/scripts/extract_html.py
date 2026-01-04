"""
Extrai HTML completo da página para análise
"""
from src.browser_handler import BrowserHandler
from scraper import STJScraper
import time

browser = BrowserHandler()
browser.start()
browser.navigate_to_stj()

scraper = STJScraper(browser)
scraper.search_process("0110007-21.2014.8.26.0050")

time.sleep(2)

# Salva HTML completo
html = browser.driver.page_source
with open("c:/Users/david/Monitor/stj_automation/page_multiplos.html", "w", encoding="utf-8") as f:
    f.write(html)

print("HTML salvo em page_multiplos.html")

# Extrai info sobre botões
info = browser.execute_script("""
    var info = {
        botoes: [],
        textoCompleto: ''
    };
    
    // Procura todos os botões
    var todosBotoes = document.querySelectorAll('button');
    info.botoes.push('Total de botões: ' + todosBotoes.length);
    
    todosBotoes.forEach(function(b, i) {
        if (i < 10) {  // Primeiros 10 botões
            info.botoes.push('Botão ' + i + ': ' + b.innerText.substring(0, 30) + ' | onclick=' + (b.getAttribute('onclick') ? 'sim' : 'não'));
        }
    });
    
    // Procura texto "Pesquisa resultou em"
    info.textoCompleto = document.body.innerText.substring(0, 500);
    
    return info;
""")

print("\n=== BOTÕES ENCONTRADOS ===")
for b in info['botoes']:
    print(b)

print(f"\n=== INÍCIO DO TEXTO ===\n{info['textoCompleto']}")

time.sleep(2)
browser.close()
