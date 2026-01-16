import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { Layout } from "../components";
import { decodeToken } from "../utilities/helperfFunction";
import VideoThumbnail from "react-video-thumbnail";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../api";

interface Video {
  _id: string;
  title: string;
  description?: string;
  file: string;
  thumbnail?: string;
  views: number;
  likes: string[];
  dislikes: string[];
  comments: any[];
  author: {
    _id: string;
    username: string;
    avatar: string;
    followers: string[];
  };
  createdAt: string;
  slug?: string;
}

interface LikedVideoItem {
  video: Video;
  likedAt: string;
}

interface PaginationData {
  success: boolean;
  userId: string;
  totalLikedVideos: number;
  currentPage: number;
  totalPages: number;
  likedVideos: LikedVideoItem[];
}

interface TokenPayload {
  userId: string;
  role?: string;
  username?: string;
}

const LikedVideos = () => {
  const [likedVideos, setLikedVideos] = useState<LikedVideoItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalVideos, setTotalVideos] = useState<number>(0);
  const navigate = useNavigate();

  const fetchLikedVideos = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      
      if (!token) {
        setError("User not authenticated. Please log in.");
        setLoading(false);
        return;
      }

      const decoded = decodeToken(token) as TokenPayload | null;
      if (!decoded?.userId) {
        setError("Invalid or expired token. Please log in again.");
        setLoading(false);
        return;
      }

      const response = await axios.get<PaginationData>(
        `${API_BASE_URL}/video/user/liked`,
        {
          params: { page, limit: 20 },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        setLikedVideos(response.data.likedVideos || []);
        setCurrentPage(response.data.currentPage);
        setTotalPages(response.data.totalPages);
        setTotalVideos(response.data.totalLikedVideos);
        setError("");
      } else {
        setError("Failed to load liked videos.");
      }
    } catch (err: any) {
      console.error("Error fetching liked videos:", err);
      
      if (err.response?.status === 401) {
        setError("Your session has expired. Please log in again.");
        localStorage.removeItem("token");
        navigate("/login");
      } else if (err.response?.status === 404) {
        setError("No liked videos found.");
        setLikedVideos([]);
      } else {
        setError("Failed to load liked videos. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchLikedVideos(1);
  }, [fetchLikedVideos]);

  const handleVideoClick = useCallback(
    (videoItem: LikedVideoItem) => {
      const video = videoItem.video;
      // Use slug if available, otherwise use ID
      const slug = video.slug || video._id;
      navigate(`/video/${slug}`, { 
        state: { 
          video,
          likedAt: videoItem.likedAt 
        }
      });
    },
    [navigate]
  );

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      fetchLikedVideos(newPage);
    }
  };

  const memoizedVideos = useMemo(() => likedVideos, [likedVideos]);

  if (loading) {
    return (
      <Layout hasHeader={true}>
        <div className="p-4 flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-400">Loading liked videos...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout hasHeader={true}>
      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Liked Videos</h1>
          <div className="flex items-center justify-between">
            <p className="text-gray-600">
              {totalVideos > 0 
                ? `You have liked ${totalVideos} video${totalVideos !== 1 ? 's' : ''}`
                : "You haven't liked any videos yet"}
            </p>
            {totalVideos > 0 && (
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span>Page {currentPage} of {totalPages}</span>
              </div>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && !loading && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Videos Grid */}
        {memoizedVideos.length === 0 && !loading && !error ? (
          <div className="text-center py-16 bg-gray-50 rounded-lg">
            <div className="mx-auto w-24 h-24 mb-4 text-gray-300">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Liked Videos</h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Videos you like will appear here. Start exploring and like some videos!
            </p>
            <button
              onClick={() => navigate("/explore")}
              className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Explore Videos
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {memoizedVideos.map((videoItem) => (
                <VideoCard
                  key={videoItem.video._id}
                  videoItem={videoItem}
                  onVideoClick={() => handleVideoClick(videoItem)}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex justify-center">
                <nav className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`px-4 py-2 rounded-lg ${
                      currentPage === 1
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
                    }`}
                  >
                    Previous
                  </button>
                  
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-4 py-2 rounded-lg ${
                          currentPage === pageNum
                            ? "bg-blue-600 text-white"
                            : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`px-4 py-2 rounded-lg ${
                      currentPage === totalPages
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
                    }`}
                  >
                    Next
                  </button>
                </nav>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
};

interface VideoCardProps {
  videoItem: LikedVideoItem;
  onVideoClick: () => void;
}

const VideoCard = React.memo(({ videoItem, onVideoClick }: VideoCardProps) => {
  const { video, likedAt } = videoItem;
  const formattedDate = useMemo(
    () => new Date(likedAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    [likedAt]
  );

  return (
    <div
      className="cursor-pointer group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
      onClick={onVideoClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onVideoClick();
        }
      }}
    >
      {/* Thumbnail Container */}
      <div className="relative w-full aspect-video overflow-hidden bg-gray-900">
        {video.file ? (
          <div className="w-full h-full">
            <VideoThumbnail
              videoUrl={video.file}
              width="100%"
              height="100%"
              snapshotAtTime={2}
              className="w-full h-full object-cover"
            />
            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center">
              <div className="transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                <div className="bg-white bg-opacity-90 rounded-full p-3">
                  <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
            <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        
        {/* Like badge */}
        <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
          <svg className="w-3 h-3 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
          </svg>
          Liked
        </div>
        
        {/* Duration overlay - optional if you have duration data */}
        <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
          {/* You can add video duration here if available */}
        </div>
      </div>

      {/* Video Info */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 line-clamp-2 mb-2 group-hover:text-blue-600 transition-colors">
          {video.title || "Untitled Video"}
        </h3>
        
        {/* Author info */}
        <div className="flex items-center mb-3">
          {video.author?.avatar && (
            <img
              src={video.author.avatar}
              alt={video.author.username}
              className="w-6 h-6 rounded-full mr-2 object-cover"
            />
          )}
          <span className="text-sm text-gray-600 truncate">
            {video.author?.username || "Unknown"}
          </span>
        </div>
        
        {/* Stats and date */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-3">
            <span className="flex items-center">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
              </svg>
              {video.views?.toLocaleString() || 0} views
            </span>
            <span className="flex items-center">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
              </svg>
              {video.likes?.length || 0} likes
            </span>
          </div>
          <span className="text-gray-400" title={new Date(likedAt).toLocaleString()}>
            {formattedDate}
          </span>
        </div>
      </div>
    </div>
  );
});

VideoCard.displayName = "VideoCard";

export default LikedVideos;