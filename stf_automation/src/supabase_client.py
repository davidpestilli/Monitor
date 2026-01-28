"""
Cliente para interação com Supabase
"""
from supabase import create_client, Client
from typing import Optional, List, Dict, Any

from .config import SUPABASE_URL, SUPABASE_KEY
from .utils import get_logger

logger = get_logger(__name__)


class SupabaseClient:
    """Cliente para comunicação com Supabase"""
    
    def __init__(self):
        """Inicializa cliente Supabase"""
        if not SUPABASE_URL or not SUPABASE_KEY:
            raise ValueError("SUPABASE_URL e SUPABASE_KEY devem estar configurados no .env")
        
        self.client: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        logger.info("Cliente Supabase inicializado")
    
    def get_processos_stf_pendentes(self) -> List[Dict[str, Any]]:
        """
        Busca processos STF com situação 'Em trâmite'
        
        Returns:
            Lista de processos
        """
        try:
            logger.info("Buscando processos STF pendentes...")
            
            response = self.client.table("processos")\
                .select("tjsp, tribunal, situacao")\
                .eq("tribunal", "STF")\
                .eq("situacao", "Em trâmite")\
                .execute()
            
            processos = response.data if response.data else []
            logger.info(f"Encontrados {len(processos)} processos STF pendentes")
            
            return processos
            
        except Exception as e:
            logger.error(f"Erro ao buscar processos: {e}")
            return []
    
    def update_processo(self, tjsp: str, dados: Dict[str, Any]) -> bool:
        """
        Atualiza dados de um processo na tabela processos
        
        Args:
            tjsp: Número TJSP do processo
            dados: Dicionário com campos a atualizar
            
        Returns:
            True se sucesso
        """
        try:
            logger.info(f"Atualizando processo {tjsp}...")
            
            response = self.client.table("processos")\
                .update(dados)\
                .eq("tjsp", tjsp)\
                .eq("tribunal", "STF")\
                .execute()
            
            logger.info(f"Processo {tjsp} atualizado com sucesso")
            return True
            
        except Exception as e:
            logger.error(f"Erro ao atualizar processo {tjsp}: {e}")
            return False
    
    def insert_pesquisa(self, dados: Dict[str, Any]) -> bool:
        """
        Insere registro de pesquisa na tabela pesquisas
        
        Args:
            dados: Dicionário com dados da pesquisa
            
        Returns:
            True se sucesso
        """
        try:
            # Adiciona tribunal se não estiver presente
            if "tribunal" not in dados:
                dados["tribunal"] = "STF"
            
            response = self.client.table("pesquisas")\
                .insert(dados)\
                .execute()
            
            logger.debug(f"Pesquisa registrada para processo {dados.get('tjsp', 'N/A')}")
            return True
            
        except Exception as e:
            logger.error(f"Erro ao registrar pesquisa: {e}")
            return False
