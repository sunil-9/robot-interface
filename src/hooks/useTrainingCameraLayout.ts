import { useBridgeData } from "@/hooks/useBridgeData";
import {
  fetchRobotCameras,
  type RobotCameraConfig,
} from "@/lib/api";
import { type WebRTCSession } from "@/hooks/useWebRTCSession";
import { useCallback, useEffect, useMemo, useState } from "react";

export type CameraSlot = {
  key: string;
  title: string;
  position: "main" | "left" | "right" | "extra";
  stream: MediaStream | null;
  matchedLabel: string | null;
  config: RobotCameraConfig | null;
};

export function useTrainingCameraLayout(
  robotId: string | null,
  session: WebRTCSession,
) {
  const bridgeData = useBridgeData();
  const [cameraConfigs, setCameraConfigs] = useState<RobotCameraConfig[]>([]);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [promotedCameraKey, setPromotedCameraKey] = useState<string | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;

    if (!robotId) {
      setCameraConfigs([]);
      setCameraError("Select a robot to view cameras.");
      setCameraLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setCameraLoading(true);
    setCameraError(null);

    const loadCameras = async () => {
      try {
        const configs = await fetchRobotCameras(robotId);
        if (cancelled) {
          return;
        }
        setCameraConfigs(configs);
        setCameraError(
          configs.length === 0 ? "No cameras configured for this robot." : null,
        );
      } catch (error) {
        if (cancelled) {
          return;
        }
        setCameraConfigs([]);
        setCameraError(
          error instanceof Error
            ? error.message
            : "Failed to load camera configuration.",
        );
      } finally {
        if (!cancelled) {
          setCameraLoading(false);
        }
      }
    };

    void loadCameras();

    return () => {
      cancelled = true;
    };
  }, [robotId]);

  const cameraLayout = useMemo(() => {
    const normalize = (value: unknown): string | null => {
      if (!value || typeof value !== "string") {
        return null;
      }
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    };

    const classifyPosition = (
      value: unknown,
    ): "main" | "left" | "right" | "extra" => {
      const normalized = normalize(value);
      if (!normalized) {
        return "extra";
      }
      const lower = normalized.toLowerCase();
      if (lower === "main" || lower === "left" || lower === "right") {
        return lower as "main" | "left" | "right";
      }
      return "extra";
    };

    const available = session.remoteStreams.map((entry, index) => ({
      index,
      entry,
      normalized: normalize(entry.camera)?.toLowerCase() ?? null,
    }));

    const consumed = new Set<number>();

    const claimStream = (labels: Array<string | null | undefined>) => {
      for (const label of labels) {
        const normalizedLabel = normalize(label)?.toLowerCase();
        if (!normalizedLabel) {
          continue;
        }
        const candidate = available.find(
          (item) =>
            !consumed.has(item.index) && item.normalized === normalizedLabel,
        );
        if (candidate) {
          consumed.add(candidate.index);
          return candidate.entry;
        }
      }
      const fallback = available.find((item) => !consumed.has(item.index));
      if (fallback) {
        consumed.add(fallback.index);
        return fallback.entry;
      }
      return null;
    };

    const slots: CameraSlot[] = [];

    cameraConfigs.forEach((config, index) => {
      const position = classifyPosition(config.position);
      const rawName = normalize(config.name);
      const observationKey = normalize(
        typeof config.observation_key === "string"
          ? config.observation_key
          : undefined,
      );
      const remote = claimStream([config.position, rawName, observationKey]);

      const positionLabel =
        position !== "extra"
          ? `${position.charAt(0).toUpperCase()}${position.slice(1)} Camera`
          : `Camera ${index + 1}`;

      slots.push({
        key: `cfg-${index}-${rawName ?? position}`,
        title: rawName ?? positionLabel,
        position,
        stream: remote?.stream ?? null,
        matchedLabel: remote?.camera ?? null,
        config,
      });
    });

    available
      .filter((item) => !consumed.has(item.index))
      .forEach((item, order) => {
        slots.push({
          key: `extra-${item.entry.id ?? item.index}-${order}`,
          title: item.entry.camera ?? `Stream ${order + 1}`,
          position: "extra",
          stream: item.entry.stream,
          matchedLabel: item.entry.camera ?? null,
          config: null,
        });
      });

    const mainSlot = slots.find((slot) => slot.position === "main") ?? null;

    return {
      main: mainSlot,
      left: slots.filter((slot) => slot.position === "left"),
      right: slots.filter((slot) => slot.position === "right"),
      extras: slots.filter((slot) => slot.position === "extra"),
    };
  }, [cameraConfigs, session.remoteStreams]);

  const {
    main: mainSlot,
    left: leftSlots,
    right: rightSlots,
    extras: extraSlots,
  } = cameraLayout;

  const fixedLeftSlot = leftSlots[0] ?? null;
  const fixedRightSlot = rightSlots[0] ?? null;
  const sidebarSlots = extraSlots;
  const visibleCameraSlots = useMemo(
    () =>
      [mainSlot, fixedLeftSlot, fixedRightSlot, ...sidebarSlots].filter(
        (slot): slot is CameraSlot => Boolean(slot),
      ),
    [fixedLeftSlot, fixedRightSlot, mainSlot, sidebarSlots],
  );
  const promotedCameraSlot =
    visibleCameraSlots.find((slot) => slot.key === promotedCameraKey) ?? null;
  const displayMainSlot = promotedCameraSlot ?? mainSlot;
  const displacedMainSlot = promotedCameraSlot && mainSlot ? mainSlot : null;

  useEffect(() => {
    if (
      promotedCameraKey &&
      !visibleCameraSlots.some((slot) => slot.key === promotedCameraKey)
    ) {
      setPromotedCameraKey(null);
    }
  }, [promotedCameraKey, visibleCameraSlots]);

  const handleSwapCameraWithMain = useCallback((cameraKey: string) => {
    setPromotedCameraKey((current) =>
      current === cameraKey ? null : cameraKey,
    );
  }, []);

  const displaySlotForSecondarySlot = useCallback(
    (slot: CameraSlot) =>
      promotedCameraSlot?.key === slot.key ? displacedMainSlot : slot,
    [displacedMainSlot, promotedCameraSlot?.key],
  );

  const fallbackImageForPosition = useCallback(
    (position: "main" | "left" | "right" | "extra") => {
      switch (position) {
        case "main":
          return bridgeData.camera_head;
        case "left":
          return bridgeData.camera_left;
        case "right":
          return bridgeData.camera_right;
        default:
          return null;
      }
    },
    [bridgeData.camera_head, bridgeData.camera_left, bridgeData.camera_right],
  );

  return {
    cameraLoading,
    cameraError,
    mainSlot,
    fixedLeftSlot,
    fixedRightSlot,
    sidebarSlots,
    displayMainSlot,
    displaySlotForSecondarySlot,
    fallbackImageForPosition,
    handleSwapCameraWithMain,
  };
}
