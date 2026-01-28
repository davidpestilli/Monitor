"""
Janela de progresso flutuante que fica sempre no topo.
Usa tkinter para criar uma janela nativa do sistema operacional.
"""

import tkinter as tk
from tkinter import ttk
import threading
import queue
import time


class ProgressWindow:
    """
    Janela de progresso que fica sempre visível acima de todas as outras janelas.
    Thread-safe para uso com automação.
    """
    
    def __init__(self, robot_name="STJ"):
        self.robot_name = robot_name
        self.root = None
        self.queue = queue.Queue()
        self.running = False
        self.thread = None
        
        # Estado
        self.total = 0
        self.processed = 0
        self.current_process = ""
        self.current_action = ""
        self.start_time = None
        
    def start(self):
        """Inicia a janela em uma thread separada"""
        if self.running:
            return
            
        self.running = True
        self.start_time = time.time()
        self.thread = threading.Thread(target=self._run_window, daemon=True)
        self.thread.start()
        
    def _run_window(self):
        """Executa a janela tkinter"""
        self.root = tk.Tk()
        self.root.title(f"Robô {self.robot_name} - Progresso")
        
        # Configurações da janela
        self.root.attributes('-topmost', True)  # Sempre no topo
        self.root.resizable(False, False)
        
        # Tamanho e posição (canto inferior direito)
        window_width = 350
        window_height = 200
        screen_width = self.root.winfo_screenwidth()
        screen_height = self.root.winfo_screenheight()
        x = screen_width - window_width - 20
        y = screen_height - window_height - 60
        self.root.geometry(f"{window_width}x{window_height}+{x}+{y}")
        
        # Estilo
        self.root.configure(bg='#1e293b')
        
        # Frame principal
        main_frame = tk.Frame(self.root, bg='#1e293b', padx=15, pady=10)
        main_frame.pack(fill=tk.BOTH, expand=True)
        
        # Header
        header_frame = tk.Frame(main_frame, bg='#3b82f6', padx=10, pady=8)
        header_frame.pack(fill=tk.X, pady=(0, 10))
        
        self.header_label = tk.Label(
            header_frame, 
            text=f"🤖 Robô {self.robot_name}",
            font=('Segoe UI', 11, 'bold'),
            fg='white',
            bg='#3b82f6'
        )
        self.header_label.pack(side=tk.LEFT)
        
        self.time_label = tk.Label(
            header_frame,
            text="00:00",
            font=('Consolas', 10),
            fg='white',
            bg='#3b82f6'
        )
        self.time_label.pack(side=tk.RIGHT)
        
        # Status
        self.status_label = tk.Label(
            main_frame,
            text="Iniciando...",
            font=('Segoe UI', 9),
            fg='#94a3b8',
            bg='#1e293b',
            anchor='w'
        )
        self.status_label.pack(fill=tk.X)
        
        # Progresso numérico
        progress_frame = tk.Frame(main_frame, bg='#1e293b')
        progress_frame.pack(fill=tk.X, pady=(5, 5))
        
        self.progress_text = tk.Label(
            progress_frame,
            text="0 / 0",
            font=('Segoe UI', 10),
            fg='white',
            bg='#1e293b'
        )
        self.progress_text.pack(side=tk.LEFT)
        
        self.percent_label = tk.Label(
            progress_frame,
            text="0%",
            font=('Segoe UI', 12, 'bold'),
            fg='#3b82f6',
            bg='#1e293b'
        )
        self.percent_label.pack(side=tk.RIGHT)
        
        # Barra de progresso
        style = ttk.Style()
        style.theme_use('clam')
        style.configure(
            "Custom.Horizontal.TProgressbar",
            troughcolor='#334155',
            background='#3b82f6',
            thickness=12
        )
        
        self.progress_bar = ttk.Progressbar(
            main_frame,
            style="Custom.Horizontal.TProgressbar",
            orient=tk.HORIZONTAL,
            length=320,
            mode='determinate'
        )
        self.progress_bar.pack(fill=tk.X, pady=(5, 10))
        
        # Processo atual
        self.process_label = tk.Label(
            main_frame,
            text="",
            font=('Consolas', 8),
            fg='#64748b',
            bg='#1e293b',
            anchor='w',
            wraplength=320
        )
        self.process_label.pack(fill=tk.X)
        
        # Ação atual
        self.action_label = tk.Label(
            main_frame,
            text="",
            font=('Segoe UI', 8),
            fg='#94a3b8',
            bg='#1e293b',
            anchor='w'
        )
        self.action_label.pack(fill=tk.X)
        
        # Atualiza periodicamente
        self._update_display()
        self._update_timer()
        self._process_queue()
        
        # Inicia loop
        self.root.protocol("WM_DELETE_WINDOW", self._on_close)
        self.root.mainloop()
        
    def _update_timer(self):
        """Atualiza o timer"""
        if not self.running or not self.root:
            return
            
        if self.start_time:
            elapsed = int(time.time() - self.start_time)
            minutes = elapsed // 60
            seconds = elapsed % 60
            self.time_label.config(text=f"{minutes:02d}:{seconds:02d}")
            
        self.root.after(1000, self._update_timer)
        
    def _update_display(self):
        """Atualiza a exibição"""
        if not self.running or not self.root:
            return
            
        # Calcula porcentagem
        percent = (self.processed / self.total * 100) if self.total > 0 else 0
        
        # Atualiza widgets
        self.progress_text.config(text=f"{self.processed} / {self.total}")
        self.percent_label.config(text=f"{percent:.0f}%")
        self.progress_bar['value'] = percent
        
        if self.current_process:
            self.process_label.config(text=f"📋 {self.current_process}")
            
        if self.current_action:
            self.action_label.config(text=f"⚡ {self.current_action}")
            
        self.root.after(100, self._update_display)
        
    def _process_queue(self):
        """Processa mensagens da queue"""
        if not self.running or not self.root:
            return
            
        try:
            while True:
                msg = self.queue.get_nowait()
                if msg['type'] == 'update':
                    if 'total' in msg:
                        self.total = msg['total']
                    if 'processed' in msg:
                        self.processed = msg['processed']
                    if 'current' in msg:
                        self.current_process = msg['current']
                    if 'action' in msg:
                        self.current_action = msg['action']
                    if 'status' in msg:
                        self.status_label.config(text=msg['status'])
                elif msg['type'] == 'complete':
                    self._show_complete(msg.get('success', True))
                elif msg['type'] == 'close':
                    self._on_close()
        except queue.Empty:
            pass
            
        self.root.after(100, self._process_queue)
        
    def _show_complete(self, success=True):
        """Mostra estado de conclusão"""
        if success:
            self.header_label.config(text=f"✅ Robô {self.robot_name} - Concluído")
            self.status_label.config(text="Processamento finalizado com sucesso!", fg='#22c55e')
            if self.root:
                self.root.configure(bg='#14532d')
                for widget in self.root.winfo_children():
                    self._update_widget_bg(widget, '#14532d')
        else:
            self.header_label.config(text=f"❌ Robô {self.robot_name} - Erro")
            self.status_label.config(text="Processamento finalizado com erros", fg='#ef4444')
            
    def _update_widget_bg(self, widget, color):
        """Atualiza cor de fundo recursivamente"""
        try:
            if isinstance(widget, (tk.Frame, tk.Label)):
                widget.configure(bg=color)
            for child in widget.winfo_children():
                self._update_widget_bg(child, color)
        except:
            pass
            
    def _on_close(self):
        """Fecha a janela"""
        self.running = False
        if self.root:
            self.root.quit()
            self.root.destroy()
            self.root = None
            
    # Métodos públicos thread-safe
    def update(self, total=None, processed=None, current=None, action=None, status=None):
        """Atualiza o progresso (thread-safe)"""
        msg = {'type': 'update'}
        if total is not None:
            msg['total'] = total
        if processed is not None:
            msg['processed'] = processed
        if current is not None:
            msg['current'] = current
        if action is not None:
            msg['action'] = action
        if status is not None:
            msg['status'] = status
        self.queue.put(msg)
        
    def complete(self, success=True):
        """Marca como completo (thread-safe)"""
        self.queue.put({'type': 'complete', 'success': success})
        
    def close(self):
        """Fecha a janela (thread-safe)"""
        self.running = False
        self.queue.put({'type': 'close'})
        
    def wait_close(self, timeout=5):
        """Aguarda fechamento com timeout"""
        if self.thread:
            self.thread.join(timeout=timeout)


# Para teste direto
if __name__ == "__main__":
    import random
    
    progress = ProgressWindow("STJ")
    progress.start()
    
    time.sleep(1)
    progress.update(total=10, status="Em execução...")
    
    for i in range(1, 11):
        time.sleep(1)
        progress.update(
            processed=i,
            current=f"0000000-00.2024.8.26.{random.randint(1000, 9999)}",
            action=random.choice(["Pesquisando...", "Extraindo dados...", "Atualizando banco..."])
        )
    
    progress.complete(success=True)
    time.sleep(3)
    progress.close()
