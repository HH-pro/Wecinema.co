import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { Layout } from "../components";
import { decodeToken, generateSlug } from "../utilities/helperfFunction";
import VideoThumbnail from "react-video-thumbnail";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../api";

interface HistoryEntry {
  _id: string;
  videoId: {
    _id: string;
    title: string;
    file: string;
    slug?: string;
  };
  watchedAt: string;
}

interface TokenPayload {
  userId: string;
}

const HistoryView = () => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  // Initialize user and fetch history in one effect
  useEffect(() => {
    const initializeAndFetch = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setError("User not authenticated.");
          setLoading(false);
          return;
        }

        const decoded = decodeToken(token) as TokenPayload | null;
        if (!decoded?.userId) {
          setError("Invalid or expired token.");
          setLoading(false);
          return;
        }

        // Fetch history directly
        const response = await axios.get(
          `${API_BASE_URL}/video/history/${decoded.userId}`,
          { timeout: 10000 }
        );

        setHistory(Array.isArray(response.data) ? response.data : []);
        setError("");
      } catch (err) {
        const message = axios.isAxiosError(err)
          ? err.response?.status === 404
            ? "No history found."
            : "Failed to load history."
          : "An unexpected error occurred.";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    initializeAndFetch();
  }, []);

  const handleVideoClick = useCallback(
    (video: HistoryEntry["videoId"]) => {
      const navigationPath = video.slug ?? `/video/${generateSlug(video._id)}`;
      navigate(navigationPath, { state: video });
      localStorage.setItem("video", JSON.stringify(video));
    },
    [navigate]
  );

  const memoizedHistory = useMemo(() => history, [history]);

  if (loading) {
    return (
      <Layout hasHeader={true}>
        <div className="p-4 flex items-center justify-center min-h-screen">
          <p className="text-gray-400">Loading history...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout  hasHeader={true}>
      <div className="p-4">
        <h2 className="text-xl font-bold mb-4">Watch History</h2>
        {error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        ) : memoizedHistory.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No history found.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {memoizedHistory.map((entry) => (
              <HistoryCard
                key={entry._id}
                entry={entry}
                onVideoClick={() => handleVideoClick(entry.videoId)}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

interface HistoryCardProps {
  entry: HistoryEntry;
  onVideoClick: () => void;
}

const HistoryCard = React.memo(({ entry, onVideoClick }: HistoryCardProps) => {
  const formattedDate = useMemo(
    () => new Date(entry.watchedAt).toLocaleString(),
    [entry.watchedAt]
  );

  return (
    <div
      className="cursor-pointer bg-white shadow rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
      onClick={onVideoClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          onVideoClick();
        }
      }}
    >
      <div className="relative w-full h-40">
        <VideoThumbnail
          videoUrl={entry.videoId?.file}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="p-2">
        <h3 className="text-sm font-semibold truncate">
          {entry.videoId?.title || "No Title"}
        </h3>
        <p className="text-xs text-gray-500">Watched: {formattedDate}</p>
      </div>
    </div>
  );
});

HistoryCard.displayName = "HistoryCard";

export default HistoryView;