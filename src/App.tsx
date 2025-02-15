
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import Index from '@/pages/Index';
import Auth from '@/pages/Auth';
import Confirmation from '@/pages/Confirmation';
import PlatformSelection from '@/pages/PlatformSelection';
import NotFound from '@/pages/NotFound';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/confirmation" element={<Confirmation />} />
        <Route path="/platform-selection" element={<PlatformSelection />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster />
    </Router>
  );
}

export default App;
