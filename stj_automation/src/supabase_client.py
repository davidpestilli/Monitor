"""
Cliente para interação com Supabase
"""
import requests
from typing import List, Dict, Optional
from datetime import date
from .config import SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY
from .utils import get_logger

logger = get_logger(__name__)


class SupabaseClient:
    """Cliente para operações no Supabase"""
    
    def __init__(self):
        self.base_url = SUPABASE_URL
        self.anon_key = SUPABASE_ANON_KEY
        self.service_key = SUPABASE_SERVICE_KEY
        self.headers_read = {
            "apikey": self.anon_key,
            "Authorization": f"Bearer {self.anon_key}",
            "Content-Type": "application/json"
        }
        self.headers_write = {
            "apikey": self.service_key,
            "Authorization": f"Bearer {self.service_key}",
            "Content-Type": "application/json"
        }
    
    def get_processos_em_tramite(self) -> List[Dict]:
        """
        Busca processos STJ com situação 'Em trâmite'
        
        Returns:
            Lista de processos
        """
        try:
            url = f"{self.base_url}/rest/v1/processos_stj"
            params = {
                "select": "tjsp,tribunal,situacao",
                "situacao": "eq.Em trâmite"
            }
            
            response = requests.get(url, headers=self.headers_read, params=params, timeout=30)
            response.raise_for_status()
            
            processos = response.json()
            logger.info(f"Encontrados {len(processos)} processos em trâmite")
            return processos
            
        except Exception as e:
            logger.error(f"Erro ao buscar processos: {e}")
            return []
    
    def update_processo(self, tjsp: str, tribunal: str, dados: Dict) -> bool:
        """
        Atualiza informações do processo
        
        Args:
            tjsp: Número do processo TJSP
            tribunal: Tribunal (STJ)
            dados: Dados para atualizar
            
        Returns:
            True se sucesso
        """
        try:
            url = f"{self.base_url}/rest/v1/processos"
            params = {
                "tjsp": f"eq.{tjsp}",
                "tribunal": f"eq.{tribunal}"
            }
            
            response = requests.patch(
                url,
                headers=self.headers_write,
                params=params,
                json=dados,
                timeout=30
            )
            response.raise_for_status()
            
            logger.info(f"Processo {tjsp} atualizado com sucesso")
            return True
            
        except Exception as e:
            logger.error(f"Erro ao atualizar processo {tjsp}: {e}")
            return False
    
    def update_processo_stj(
        self,
        tjsp: str,
        reu: str,
        superior: Optional[str],
        movimentacao: str,
        link: str,
        is_hc: bool = False
    ) -> bool:
        """
        Atualiza processo com dados extraídos do STJ
        
        Args:
            tjsp: Número do processo
            reu: Partes/Advogados
            superior: Classe do processo (None para HC)
            movimentacao: Última movimentação
            link: Link do PDF
            is_hc: Se é Habeas Corpus
            
        Returns:
            True se sucesso
        """
        from datetime import date
        
        dados = {
            "reu": reu,
            "decisao": "Veja a coluna Link",
            "movimentacao": movimentacao,
            "link": link,
            "pesquisa_stj": date.today().isoformat()
        }
        
        # HC não tem campo "superior"
        if not is_hc and superior:
            dados["superior"] = superior
        
        return self.update_processo(tjsp, "STJ", dados)
