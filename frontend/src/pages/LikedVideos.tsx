import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { Layout } from "../components";
import { decodeToken, generateSlug } from "../utilities/helperfFunction";
import VideoThumbnail from "react-video-thumbnail";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../api";

interface LikedVideo {
  _id: string;
  title: string;
  file: string;
  slug?: string;
  likedAt: string;
}

interface TokenPayload {
  userId: string;
}

const LikedVideos = () => {
  const [likedVideos, setLikedVideos] = useState<LikedVideo[]>([]);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  // Initialize user and fetch liked videos in one effect
  useEffect(() => {
    const controller = new AbortController();

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

        // Fetch liked videos directly
        const response = await axios.get(
          `${API_BASE_URL}/video/like/${decoded.userId}`,
          { timeout: 10000, signal: controller.signal }
        );

        setLikedVideos(Array.isArray(response.data) ? response.data : []);
        setError("");
      } catch (err) {
        if (axios.isCancel(err)) return;
        const message = axios.isAxiosError(err)
          ? err.response?.status === 404
            ? "No liked videos found."
            : "Failed to load liked videos."
          : "An unexpected error occurred.";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    initializeAndFetch();
    return () => controller.abort();
  }, []);
  const handleVideoClick = useCallback(
    (video: LikedVideo) => {
      const slug = video.slug ?? generateSlug(video._id);
      const navigationPath = `/video/${slug}`;
      navigate(navigationPath, { state: video });
      localStorage.setItem("video", JSON.stringify(video));
    },
    [navigate]
  );
  const memoizedVideos = useMemo(() => likedVideos, [likedVideos]);

  if (loading) {
    return (
      <Layout hasHeader={true}>
        <div className="p-4 flex items-center justify-center min-h-screen">
          <p className="text-gray-400">Loading liked videos...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout hasHeader={true}>
      <div className="p-4">
        <h2 className="text-xl font-bold mb-4">Liked Videos</h2>
        {error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        ) : memoizedVideos.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No liked videos found.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {memoizedVideos.map((video) => (
              <VideoCard
                key={video._id}
                video={video}
                onVideoClick={() => handleVideoClick(video)}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

interface VideoCardProps {
  video: LikedVideo;
  onVideoClick: () => void;
}

const VideoCard = React.memo(({ video, onVideoClick }: VideoCardProps) => {
  const formattedDate = useMemo(
    () => new Date(video.likedAt).toLocaleString(),
    [video.likedAt]
  );

  return (
    <div
      className="cursor-pointer bg-white shadow rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
      onClick={onVideoClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onVideoClick();
        }
      }}    >
      <div className="relative w-full h-40 overflow-hidden">
        {video.file ? (
          <VideoThumbnail
            videoUrl={video.file}
            width="100%"
            height="100%"
          />
        ) : (
          <div className="w-full h-full bg-gray-300 flex items-center justify-center">
            <span className="text-gray-500">No preview</span>
          </div>
        )}
      </div>
      <div className="p-2">
        <h3 className="text-sm font-semibold truncate">
          {video.title || "No Title"}
        </h3>
        <p className="text-xs text-gray-500">Liked on: {formattedDate}</p>
      </div>
    </div>
  );
});

VideoCard.displayName = "VideoCard";

export default LikedVideos;