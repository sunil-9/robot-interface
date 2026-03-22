import { EpisodeViewerProvider } from "@/components/training/EpisodeViewerContext";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BridgeProvider } from "@/context/BridgeContext";
import { EpisodeControlProvider } from "@/context/EpisodeControlContext";
import { ModeProvider } from "@/context/ModeContext";
import { AuthSessionProvider } from "@/context/AuthSessionContext";
import { useModeContext } from "@/hooks/useModeContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
// import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import Test from "./pages/Test";
import Train from "./pages/Train";
import VisualizationPage from "./pages/Visualization";
import WebRTCDebug from "./pages/WebRTCDebug";

const queryClient = new QueryClient();

// Wrapper to connect EpisodeControlProvider with ModeContext
function EpisodeControlWithMode({ children }: { children: ReactNode }) {
  const { setMode } = useModeContext();
  return (
    <EpisodeControlProvider setMode={setMode}>
      {children}
    </EpisodeControlProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ModeProvider>
      <AuthSessionProvider>
        <BridgeProvider>
          <EpisodeControlWithMode>
            <EpisodeViewerProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <Routes>
                    <Route path="/" element={<Train />} />
                    {/* <Route path="/" element={<Home />} /> */}
                    <Route path="/train" element={<Train />} />
                    <Route path="/test" element={<Test />} />

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
          </EpisodeControlWithMode>
        </BridgeProvider>
      </AuthSessionProvider>
    </ModeProvider>
  </QueryClientProvider>
);

export default App;
