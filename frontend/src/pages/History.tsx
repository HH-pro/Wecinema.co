import React, { useState, useEffect } from "react";
import axios from "axios";
import { Layout } from "../components";
import { decodeToken, generateSlug } from "../utilities/helperfFunction"; // Import generateSlug
import VideoThumbnail from "react-video-thumbnail";
import { useNavigate } from "react-router-dom";

const HistoryView = () => {
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState(null);
  const nav = useNavigate(); // Initialize navigation

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return setError("User not authenticated.");

    const decoded = decodeToken(token);
    if (!decoded || !decoded.userId) return setError("Invalid or expired token.");

    setUserId(decoded.userId);
  }, []);

  useEffect(() => {
    if (!userId) return;

    const fetchHistory = async () => {
      try {
        const response = await axios.get(`https://wecinema.co/api/video/history/${userId}`);

        console.log("Fetched history data:", response.data);

        setHistory(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error("Error fetching user history:", error);
        setError("Failed to load history.");
      }
    };

    fetchHistory();
  }, [userId]);

  const handleVideoClick = (video:any) => {
  
    nav(video.slug ?? "/video/" + generateSlug(video._id), {
        state: video,
    });
    localStorage.setItem("video", JSON.stringify(video));

  };

  return (
    <Layout expand={false} hasHeader={false}>
      <div className="p-4">
        <h2 className="text-xl font-bold mb-4">Watch History</h2>
        {error ? (
          <p className="text-red-500">{error}</p>
        ) : history.length === 0 ? (
          <p className="text-gray-500">Loading or no history found...</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {history.map((entry) => (
              <div
                key={entry._id}
                className="cursor-pointer bg-white shadow rounded-lg overflow-hidden"
                onClick={() => handleVideoClick(entry.videoId)}
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
                  <p className="text-xs text-gray-500">
                    Watched: {new Date(entry.watchedAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default HistoryView;
