import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import EpisodeViewer from "../visualization/pages/episode-viewer";
import { getEpisodeDataSafe } from "../visualization/pages/fetch-data";

type RouteParams = {
  robotid?: string;
  datasetid?: string;
};

const VisualizationPage = () => {
  const { robotid, datasetid } = useParams<RouteParams>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<any>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  const episodeId = useMemo(() => {
    const raw = searchParams.get("episode");
    const parsed = raw ? Number(raw) : 0;
    return Number.isFinite(parsed) ? parsed : 0;
  }, [searchParams]);

  // Ensure episode param is present
  useEffect(() => {
    if (!searchParams.get("episode")) {
      const next = new URLSearchParams(searchParams.toString());
      next.set("episode", episodeId.toString());
      setSearchParams(next, { replace: true });
    }
  }, [episodeId, searchParams, setSearchParams]);

  useEffect(() => {
    const org = robotid;
    const dataset = datasetid;
    if (!org || !dataset) {
      setError("Missing robot or dataset id in URL");
      return;
    }
    setLoading(true);
    setError(undefined);
    setData(undefined);
    getEpisodeDataSafe(org, dataset, episodeId)
      .then((res) => {
        if (res.error) {
          setError(res.error);
        } else {
          setData(res.data);
        }
      })
      .catch((err) => setError(err?.message || "Failed to load episode"))
      .finally(() => setLoading(false));
  }, [robotid, datasetid, episodeId]);

  if (!robotid || !datasetid) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-red-400">
        <div className="max-w-xl p-8 rounded bg-slate-900 border border-red-500 shadow-lg">
          <h2 className="text-2xl font-bold mb-4">Invalid URL</h2>
          <p className="font-mono">Expected /visualization/&lt;robotid&gt;/&lt;datasetid&gt;</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-red-400">
        <div className="max-w-xl p-8 rounded bg-slate-900 border border-red-500 shadow-lg">
          <h2 className="text-2xl font-bold mb-4">
            Failed to load {robotid}/{datasetid}
          </h2>
          <p className="font-mono whitespace-pre-wrap">{error}</p>
        </div>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-gray-200">
        Loading dataset {robotid}/{datasetid}...
      </div>
    );
  }

  return (
    <EpisodeViewer
      data={data}
      error={error}
      org={robotid}
      dataset={datasetid}
    />
  );
};

export default VisualizationPage;
