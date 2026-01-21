import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

export interface EpisodeViewerState {
  isOpen: boolean;
  robotId: string | null;
  datasetId: string | null;
  episodeIndex: number | null;
}

interface EpisodeViewerContextValue {
  viewerState: EpisodeViewerState;
  openViewer: (
    robotId: string,
    datasetId: string,
    episodeIndex: number,
  ) => void;
  closeViewer: () => void;
  changeEpisode: (episodeIndex: number) => void;
}

const EpisodeViewerContext = createContext<EpisodeViewerContextValue | null>(
  null,
);

const initialState: EpisodeViewerState = {
  isOpen: false,
  robotId: null,
  datasetId: null,
  episodeIndex: null,
};

export function EpisodeViewerProvider({ children }: { children: ReactNode }) {
  const [viewerState, setViewerState] =
    useState<EpisodeViewerState>(initialState);

  const openViewer = useCallback(
    (robotId: string, datasetId: string, episodeIndex: number) => {
      setViewerState({
        isOpen: true,
        robotId,
        datasetId,
        episodeIndex,
      });
    },
    [],
  );

  const closeViewer = useCallback(() => {
    setViewerState(initialState);
  }, []);

  const changeEpisode = useCallback((episodeIndex: number) => {
    setViewerState((prev) => ({
      ...prev,
      episodeIndex,
    }));
  }, []);

  return (
    <EpisodeViewerContext.Provider
      value={{
        viewerState,
        openViewer,
        closeViewer,
        changeEpisode,
      }}
    >
      {children}
    </EpisodeViewerContext.Provider>
  );
}

export function useEpisodeViewer() {
  const context = useContext(EpisodeViewerContext);
  if (!context) {
    throw new Error(
      "useEpisodeViewer must be used within an EpisodeViewerProvider",
    );
  }
  return context;
}
