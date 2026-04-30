import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import UeberUns from "./pages/UeberUns";
import Termine from "./pages/Termine";
import Galerie from "./pages/Galerie";
import Kontakt from "./pages/Kontakt";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import GalerieAlbum from "./pages/GalerieAlbum";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/ueber-uns" element={<UeberUns />} />
            <Route path="/termine" element={<Termine />} />
            <Route path="/galerie" element={<Galerie />} />
            <Route path="/kontakt" element={<Kontakt />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<NotFound />} />
            <Route path="/galerie/:albumId" element={<GalerieAlbum />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
