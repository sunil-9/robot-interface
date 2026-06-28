import { Header } from "@/components/Header";
import { InputTracker } from "@/components/InputTracker";
import {
  RobotSelectionDialog,
  type ControlCenterTab,
} from "@/components/RobotSelectionDialog";
import { TrainingInterface } from "@/components/TrainingInterface";
import { OperatorOnboarding } from "@/components/onboarding/OperatorOnboarding";
import { toast } from "@/components/ui/use-toast";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useEpisodeControlContext } from "@/hooks/useEpisodeControl";
import { useModeContext } from "@/hooks/useModeContext";
import { useWebRTCSession } from "@/hooks/useWebRTCSession";
import { fetchSignalingConfig } from "@/lib/api";
import { cloudConfig } from "@/lib/config";
import {
  getSessionRobotData,
  getSignalingConfig,
  setConnectionReady,
  setSessionRobotData,
  setSignalingConfig,
} from "@/lib/sessionStore";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function TrainPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuthSession();
  const { resetAuthSessionState } = useEpisodeControlContext();
  const { getModeLabel } = useModeContext();
  const params = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );

  // State for robot selection dialog
  const [showSelectionDialog, setShowSelectionDialog] = useState(false);
  const [controlCenterTab, setControlCenterTab] =
    useState<ControlCenterTab>("account");
  const [currentRobot, setCurrentRobot] = useState<string | null>(null);
  const [currentControl, setCurrentControl] = useState<
    string | null | undefined
  >(undefined);
  const [pendingControl, setPendingControl] = useState<string | null>(null);
  const [connectionRequested, setConnectionRequested] = useState(false);

  // Get robot session data from URL params or from session storage
  const sessionRobotData = getSessionRobotData();

  // Prioritize URL params over session storage, then local state for better user experience
  const selectedRobot: string | null =
    currentRobot || params.get("robot") || sessionRobotData?.robot || null;
  const selectedControl: string | null =
    currentControl !== undefined
      ? currentControl
      : params.get("controller") || sessionRobotData?.controller || null;
  const canStartWebRTC = Boolean(
    connectionRequested && selectedRobot && selectedControl,
  );

  const session = useWebRTCSession({
    robotId: canStartWebRTC ? selectedRobot : null,
    controllerId: canStartWebRTC ? selectedControl : null,
  });
  const isConnected = session.connectionState === "connected";

  useEffect(() => {
    if (auth.isLoadingUser) {
      return;
    }

    if (auth.accessToken) {
      setShowSelectionDialog(false);
      return;
    }

    resetAuthSessionState();
    setCurrentRobot(null);
    setCurrentControl(null);
    setPendingControl(null);
    setConnectionRequested(false);
    setControlCenterTab("account");
    setShowSelectionDialog(true);

    const nextParams = new URLSearchParams(location.search);
    const hadRobot = nextParams.has("robot");
    const hadController = nextParams.has("controller");
    nextParams.delete("robot");
    nextParams.delete("controller");

    if (hadRobot || hadController) {
      const nextSearch = nextParams.toString();
      navigate(
        {
          pathname: "/",
          search: nextSearch ? `?${nextSearch}` : "",
        },
        { replace: true },
      );
    }
  }, [
    auth.accessToken,
    auth.isLoadingUser,
    location.search,
    navigate,
    resetAuthSessionState,
  ]);

  // Handle selection from dialog
  const handleSelectionConfirm = useCallback(
    (robotId: string, controllerId: string) => {
      setCurrentRobot(robotId);
      setCurrentControl(controllerId);
      setPendingControl(null);
      setConnectionRequested(true);

      // Update URL params without navigation
      const newParams = new URLSearchParams(location.search);
      newParams.set("robot", robotId);
      newParams.set("controller", controllerId);
      navigate(`/?${newParams.toString()}`, { replace: true });

      // Update session storage
      setSessionRobotData({
        robot: robotId,
        controller: controllerId,
        mode: "train",
      });

      toast({
        title: "Session started",
        description: `Training with robot and controller selected.`,
      });
    },
    [navigate, location.search],
  );

  const handleHeaderRobotChange = useCallback(
    (robotId: string) => {
      setConnectionRequested(false);
      setCurrentRobot(robotId);
      setCurrentControl(null);
      setPendingControl(null);

      const newParams = new URLSearchParams(location.search);
      newParams.set("robot", robotId);
      newParams.delete("controller");
      navigate(`/?${newParams.toString()}`, { replace: true });

      setSessionRobotData({
        robot: robotId,
        controller: null,
        mode: "train",
      });
    },
    [navigate, location.search],
  );

  const handleDisconnect = useCallback(() => {
    // Removing the active IDs runs the WebRTC effect cleanup, which sends the
    // signaling "leave" message before closing the socket and peer connection.
    setConnectionRequested(false);
  }, []);

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

    const resolveApiUrl = (): URL => {
      const candidates = [
        cloudConfig.apiBaseUrl,
        import.meta.env.VITE_CLOUD_API_BASE_URL as string | undefined,
      ];

      for (const candidate of candidates) {
        if (!candidate) {
          continue;
        }
        try {
          return new URL(candidate);
        } catch (error) {
          console.warn("Invalid API base URL candidate:", candidate, error);
        }
      }

      if (typeof window !== "undefined" && window.location?.origin) {
        return new URL(window.location.origin);
      }

      throw new Error("Failed to resolve API base URL");
    };

    const defaultApiUrl = resolveApiUrl();

    const defaultHost = defaultApiUrl.hostname;
    const defaultPort = defaultApiUrl.port || "";
    const buildUrl = (
      protocol: "http" | "https" | "ws" | "wss",
      host: string,
      port: string,
      path: string,
    ) => {
      const normalizedPath = path.startsWith("/") ? path : `/${path}`;
      const portSegment = port ? `:${port}` : "";
      return `${protocol}://${host}${portSegment}${normalizedPath}`;
    };

    const toHttpBase = (value: string | null | undefined): string => {
      const parsed = parseUrl(value);
      const protocol =
        parsed && parsed.protocol === "https:" ? "https" : "http";
      const host = parsed ? parsed.hostname : defaultHost;
      const port = parsed && parsed.port ? parsed.port : defaultPort;
      return buildUrl(protocol, host, port, "/signaling");
    };

    const toWebSocketUrl = (value: string | null | undefined): string => {
      const parsed = parseUrl(value);
      const secure = parsed
        ? parsed.protocol === "https:" || parsed.protocol === "wss:"
        : defaultApiUrl.protocol === "https:";
      const protocol = secure ? "wss" : "ws";
      const host = parsed ? parsed.hostname : defaultHost;
      const port = parsed && parsed.port ? parsed.port : defaultPort;
      return buildUrl(protocol, host, port, "/signaling/ws");
    };

    const parseStoredConfig = (): { baseUrl: string; wsUrl: string } | null => {
      const stored = getSignalingConfig();
      if (!stored) {
        return null;
      }
      const baseUrl = toHttpBase(stored.webrtc_base_url);
      const wsUrl = trimTrailingSlash(
        stored.signaling_ws_url
          ? toWebSocketUrl(stored.signaling_ws_url)
          : toWebSocketUrl(baseUrl),
      );
      return { baseUrl, wsUrl };
    };

    const persistConfig = (config: { baseUrl: string; wsUrl: string }) => {
      setSignalingConfig(config);
    };

    const ensureSignalingConfig = async (): Promise<{
      baseUrl: string;
      wsUrl: string;
    }> => {
      const fromStorage = parseStoredConfig();
      if (fromStorage) {
        setConnectionReady(true);
        return fromStorage;
      }

      const discovered = await fetchSignalingConfig();
      const baseUrl = toHttpBase(discovered?.baseUrl);
      const wsUrl = trimTrailingSlash(
        discovered?.wsUrl ? discovered.wsUrl : toWebSocketUrl(baseUrl),
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
      if (!auth.accessToken) {
        return;
      }

      // Show selection dialog if robot or controller is missing instead of redirecting
      if (!selectedRobot || !selectedControl) {
        return;
      }

      try {
        // Update session storage with current values
        setSessionRobotData({
          robot: selectedRobot,
          controller: selectedControl,
          mode: "train",
        });

        const config = await ensureSignalingConfig();
        if (disposed) {
          return;
        }
        // console.info(
        //   "Training session initialized with signaling endpoints",
        //   config,
        // );
      } catch (e) {
        console.error("Error initializing session data", e);
        failAndRedirect(
          "Session initialization failed",
          "Could not initialize session data. Please try again.",
        );
      }
    })();

    return () => {
      disposed = true;
    };
  }, [
    auth.accessToken,
    selectedRobot,
    selectedControl,
    sessionRobotData,
    navigate,
  ]);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      <RobotSelectionDialog
        open={showSelectionDialog}
        onOpenChange={setShowSelectionDialog}
        initialRobot={selectedRobot}
        initialController={selectedControl}
        initialTab={controlCenterTab}
        onConfirm={handleSelectionConfirm}
      />

      {/* Transparent overlay header */}
      <Header
        page={"train"}
        selectedRobot={selectedRobot || undefined}
        selectedControl={selectedControl || undefined}
        isConnected={isConnected}
        onOpenSettings={(tab = "account") => {
          setControlCenterTab(tab);
          setShowSelectionDialog(true);
        }}
        onRobotChange={handleHeaderRobotChange}
        onControlSelectionChange={setPendingControl}
        onSelectionStart={handleSelectionConfirm}
        onDisconnect={handleDisconnect}
      />

      {/* Main content takes full height */}
      <main className="flex-1 min-h-0 overflow-hidden">
        <TrainingInterface
          robotId={selectedRobot}
          controllerId={selectedControl}
          session={session}
        />
      </main>

      {/* Input tracker overlay */}
      <InputTracker controlType={selectedControl} session={session} />

      <OperatorOnboarding
        enabled={Boolean(auth.accessToken) && !auth.isLoadingUser}
      />
    </div>
  );
}
