import { InputTracker } from "@/components/InputTracker";
import { TrainingInterface } from "@/components/TrainingInterface";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { useModeContext } from "@/hooks/useModeContext";
import { useWebRTCSession } from "@/hooks/useWebRTCSession";
import { fetchSignalingConfig } from "@/lib/api";
import { cloudConfig } from "@/lib/config";
import { ArrowLeft } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function TrainPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { getModeLabel } = useModeContext();
  const params = useMemo(
    () => new URLSearchParams(location.search),
    [location.search]
  );
  // Get session data from URL params or from session storage
  const sessionData = (() => {
    try {
      const storedData = sessionStorage.getItem("sessionData");
      return storedData ? JSON.parse(storedData) : null;
    } catch (e) {
      console.error("Failed to parse session data", e);
      return null;
    }
  })();

  // Prioritize URL params over session storage for better user experience
  const selectedRobot = params.get("robot") || sessionData?.robot || null;
  const selectedControl =
    params.get("controller") || sessionData?.controller || null;

  const session = useWebRTCSession(selectedRobot);

  // On mount: validate URL params and test connectivity; fail -> toast + redirect home
  useEffect(() => {
    let disposed = false;

    const trimTrailingSlash = (value: string): string =>
      value.replace(/\/+$/, "");

    const parseUrl = (value: string | null | undefined): URL | null => {
      if (!value || typeof value !== "string") {
        return null;
      }
      const candidate = value.trim();
      if (!candidate) {
        return null;
      }
      try {
        if (!/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(candidate)) {
          return new URL(`http://${candidate}`);
        }
        return new URL(candidate);
      } catch {
        return null;
      }
    };

    const defaultApiUrl = (() => {
      try {
        return new URL(cloudConfig.apiBaseUrl);
      } catch {
        const apiUrl = import.meta.env.VITE_CLOUD_API_BASE_URL;

        return apiUrl ? new URL(apiUrl) : new URL("http://127.0.0.1:8100");
      }
    })();

    const defaultHost =
      defaultApiUrl.hostname === "localhost"
        ? "127.0.0.1"
        : defaultApiUrl.hostname;
    const defaultPort =
      defaultApiUrl.port ||
      (defaultApiUrl.protocol === "https:" ? "443" : "8100");
    const buildUrl = (
      protocol: "http" | "https" | "ws" | "wss",
      host: string,
      port: string,
      path: string
    ) => {
      const normalizedPath = path.startsWith("/") ? path : `/${path}`;
      const portSegment = port ? `:${port}` : "";
      return `${protocol}://${host}${portSegment}${normalizedPath}`;
    };

    const toHttpBase = (value: string | null | undefined): string => {
      const parsed = parseUrl(value);
      const protocol =
        parsed && parsed.protocol === "https:" ? "https" : "http";
      const host = parsed
        ? parsed.hostname === "localhost"
          ? "127.0.0.1"
          : parsed.hostname
        : defaultHost;
      const port = parsed && parsed.port ? parsed.port : defaultPort;
      return buildUrl(protocol, host, port, "/signaling");
    };

    const toWebSocketUrl = (value: string | null | undefined): string => {
      const parsed = parseUrl(value);
      const secure = parsed
        ? parsed.protocol === "https:" || parsed.protocol === "wss:"
        : defaultApiUrl.protocol === "https:";
      const protocol = secure ? "wss" : "ws";
      const host = parsed
        ? parsed.hostname === "localhost"
          ? "127.0.0.1"
          : parsed.hostname
        : defaultHost;
      const port = parsed && parsed.port ? parsed.port : defaultPort;
      return buildUrl(protocol, host, port, "/signaling/ws");
    };

    const parseStoredConfig = (): { baseUrl: string; wsUrl: string } | null => {
      const stored = sessionStorage.getItem("signalingConfig");
      if (!stored) {
        return null;
      }
      try {
        const parsed = JSON.parse(stored);
        if (!parsed || typeof parsed !== "object") {
          return null;
        }
        const record = parsed as Record<string, unknown>;
        const baseCandidate =
          typeof record.webrtc_base_url === "string"
            ? record.webrtc_base_url
            : typeof record.signaling_base_url === "string"
            ? record.signaling_base_url
            : null;
        const wsCandidate =
          typeof record.signaling_ws_url === "string"
            ? record.signaling_ws_url
            : null;
        if (!baseCandidate && !wsCandidate) {
          return null;
        }
        const baseUrl = toHttpBase(baseCandidate);
        const wsUrl = trimTrailingSlash(
          wsCandidate ? toWebSocketUrl(wsCandidate) : toWebSocketUrl(baseUrl)
        );
        return { baseUrl, wsUrl };
      } catch (error) {
        console.warn("Failed to parse stored signaling config", error);
        return null;
      }
    };

    const persistConfig = (config: { baseUrl: string; wsUrl: string }) => {
      sessionStorage.setItem(
        "signalingConfig",
        JSON.stringify({
          signaling_base_url: config.baseUrl,
          webrtc_base_url: config.baseUrl,
          signaling_ws_url: config.wsUrl,
        })
      );
      sessionStorage.setItem("connection_ready", "1");
    };

    const ensureSignalingConfig = async (): Promise<{
      baseUrl: string;
      wsUrl: string;
    }> => {
      const fromStorage = parseStoredConfig();
      if (fromStorage) {
        sessionStorage.setItem("connection_ready", "1");
        return fromStorage;
      }

      const discovered = await fetchSignalingConfig();
      const baseUrl = toHttpBase(discovered?.baseUrl);
      const wsUrl = trimTrailingSlash(
        discovered?.wsUrl ? discovered.wsUrl : toWebSocketUrl(baseUrl)
      );
      const normalized = { baseUrl, wsUrl };
      persistConfig(normalized);
      return normalized;
    };

    const failAndRedirect = (title: string, description: string) => {
      if (disposed) {
        return;
      }
      toast({ title, description, variant: "destructive" });
      navigate("/");
    };

    (async () => {
      if (!selectedRobot || !selectedControl) {
        failAndRedirect(
          "Missing info",
          "Robot or controller missing. Please choose from home."
        );
        return;
      }

      // Support legacy components with individual session storage items
      // while maintaining our new structured approach
      try {
        // Update session storage with current values for backward compatibility
        if (sessionData) {
          console.log("Storing session data for training session", sessionData);
          Object.entries(sessionData).forEach(([key, value]) => {
            if (typeof value === "string") {
              sessionStorage.setItem(key, value);
            }
          });
        }

        // Fallback for direct session storage access in legacy components
        sessionStorage.setItem("selectedRobot", selectedRobot);
        sessionStorage.setItem("selectedControl", selectedControl);

        const config = await ensureSignalingConfig();
        if (disposed) {
          return;
        }
        console.info(
          "Training session initialized with signaling endpoints",
          config
        );
      } catch (e) {
        console.error("Error initializing session data", e);
        failAndRedirect(
          "Session initialization failed",
          "Could not initialize session data. Please try again."
        );
      }
    })();

    return () => {
      disposed = true;
    };
  }, [selectedRobot, selectedControl, sessionData, navigate]);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Transparent overlay header */}
      <header className="fixed top-0 left-0 right-0 z-50">
        <div className="container mx-auto py-3 px-4">
          <div className="flex items-center justify-center">
            <div className="bg-black/30 backdrop-blur-sm py-1.5 px-4 rounded-full flex items-center">
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-400 hover:text-white mr-2 h-7 w-7"
                onClick={() => navigate("/")}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>

              <h1 className="text-lg font-semibold text-purple-300 mr-2">
                {getModeLabel()}
              </h1>
              <p className="text-xs text-gray-300">
                {selectedRobot ? `${selectedRobot}` : ""}
                {selectedControl ? ` · ${selectedControl}` : ""}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main content takes full height */}
      <main className="h-full">
        <TrainingInterface
          robotId={selectedRobot}
          controllerId={selectedControl}
          session={session}
        />
      </main>

      {/* Input tracker overlay */}
      <InputTracker controlType={selectedControl} session={session} />
    </div>
  );
}
