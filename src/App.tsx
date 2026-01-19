import { EpisodeViewerProvider } from "@/components/training/EpisodeViewerContext";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BridgeProvider } from "@/context/BridgeContext";
import { ModeProvider } from "@/context/ModeContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Deploy from "./pages/Deploy";
import Home from "./pages/Home";
import Index from "./pages/Index"; // Keep as legacy entry point
import NotFound from "./pages/NotFound";
import Test from "./pages/Test";
import Train from "./pages/Train";
import VisualizationPage from "./pages/Visualization";
import WebRTCDebug from "./pages/WebRTCDebug";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ModeProvider>
      <BridgeProvider>
        <EpisodeViewerProvider>
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
                <Route path="/webrtc-debug" element={<WebRTCDebug />} />
                <Route
                  path="/visualization/:robotid/:datasetid"
                  element={<VisualizationPage />}
                />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </EpisodeViewerProvider>
      </BridgeProvider>
    </ModeProvider>
  </QueryClientProvider>
);

export default App;
