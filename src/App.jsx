import Home from './pages/Home';
import { Toaster } from 'sonner';

function App() {
  return (
    <div className="min-h-screen p-4">
      <Home />
      <Toaster richColors position="top-center" />
    </div>
  );
}

export default App;
