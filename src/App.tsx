
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import Index from "@/pages/Index";
import Auth from "@/pages/Auth";
import NotFound from "@/pages/NotFound";
import PlatformSelection from "@/pages/PlatformSelection";
import Confirmation from "@/pages/Confirmation";
import ComparisonResults from "@/pages/ComparisonResults";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/platform-selection" element={<PlatformSelection />} />
        <Route path="/confirmation" element={<Confirmation />} />
        <Route path="/comparison-results" element={<ComparisonResults />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster />
    </Router>
  );
}

export default App;
