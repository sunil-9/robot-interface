import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Deploy from "./pages/Deploy";
import Home from "./pages/Home";
import Index from "./pages/Index"; // Keep as legacy entry point
import NotFound from "./pages/NotFound";
import Test from "./pages/Test";
import Train from "./pages/Train";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/legacy" element={<Index />} />
          <Route path="/train" element={<Train />} />
          <Route path="/test" element={<Test />} />
          <Route path="/deploy" element={<Deploy />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
