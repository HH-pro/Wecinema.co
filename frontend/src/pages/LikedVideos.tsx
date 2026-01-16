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

// Different possible response structures
interface LikedVideosResponse {
  likedVideos?: Video[] | Array<{ video: Video; likedAt: string }>;
  videos?: Video[];
  data?: Video[];
  totalLikedVideos?: number;
  totalVideos?: number;
  currentPage?: number;
  totalPages?: number;
  success?: boolean;
  userId?: string;
}

const LikedVideos = () => {
  const [videos, setVideos] = useState<Video[]>([]);
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

      const decoded = decodeToken(token) as any;
      if (!decoded?.userId) {
        setError("Invalid or expired token. Please log in again.");
        setLoading(false);
        return;
      }

      console.log("Fetching liked videos for user:", decoded.userId);

      // Try different endpoints in sequence
      const endpoints = [
        `${API_BASE_URL}/video/user/liked`,
        `${API_BASE_URL}/video/user/liked/${decoded.userId}`,
        `${API_BASE_URL}/video/likes/user/${decoded.userId}`,
        `${API_BASE_URL}/video/user/likes`,
      ];

      let response;
      let lastError;

      for (const endpoint of endpoints) {
        try {
          console.log("Trying endpoint:", endpoint);
          response = await axios.get<LikedVideosResponse>(
            endpoint,
            {
              params: { page, limit: 20 },
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            }
          );
          console.log("Success with endpoint:", endpoint);
          break;
        } catch (err) {
          lastError = err;
          continue;
        }
      }

      if (!response) {
        throw lastError || new Error("All endpoints failed");
      }

      const data = response.data;
      console.log("API Response:", data);

      // Parse response data
      let extractedVideos: Video[] = [];
      let extractedTotal = 0;
      let extractedCurrentPage = 1;
      let extractedTotalPages = 1;

      if (Array.isArray(data)) {
        // Direct array response
        extractedVideos = data.filter(video => video?._id);
        extractedTotal = extractedVideos.length;
      } else if (data && typeof data === 'object') {
        // Object response
        if (Array.isArray(data.likedVideos)) {
          // Check if likedVideos contains nested objects
          if (data.likedVideos.length > 0 && data.likedVideos[0]?.video) {
            // Nested structure: { likedVideos: [{ video: {...}, likedAt: '...' }] }
            extractedVideos = data.likedVideos
              .filter((item: any) => item?.video?._id)
              .map((item: any) => ({
                ...item.video,
                likedAt: item.likedAt // Keep likedAt if needed
              }));
          } else {
            // Flat structure: { likedVideos: [video1, video2, ...] }
            extractedVideos = data.likedVideos.filter((video: any) => video?._id);
          }
        } 
        else if (Array.isArray(data.videos)) {
          extractedVideos = data.videos.filter((video: any) => video?._id);
        }
        else if (Array.isArray(data.data)) {
          extractedVideos = data.data.filter((video: any) => video?._id);
        }

        // Get totals
        extractedTotal = data.totalLikedVideos || data.totalVideos || extractedVideos.length;
        extractedCurrentPage = data.currentPage || 1;
        extractedTotalPages = data.totalPages || 1;
      }

      console.log("Extracted videos:", extractedVideos);

      // Validate video URLs and add fallback thumbnails
      const validatedVideos = extractedVideos.map(video => ({
        ...video,
        // Ensure file URL is valid
        file: video.file?.startsWith('http') ? video.file : `${API_BASE_URL}${video.file}`,
        // Use thumbnail if available, otherwise generate from video
        thumbnail: video.thumbnail || video.file
      }));

      setVideos(validatedVideos);
      setCurrentPage(extractedCurrentPage);
      setTotalPages(extractedTotalPages);
      setTotalVideos(extractedTotal);
      
      if (validatedVideos.length === 0) {
        setError(extractedTotal > 0 
          ? "Could not parse video data. Check console for details." 
          : "No liked videos found.");
      } else {
        setError("");
      }
    } catch (err: any) {
      console.error("Error fetching liked videos:", err);
      
      if (err.response?.status === 401) {
        setError("Your session has expired. Please log in again.");
        localStorage.removeItem("token");
        setTimeout(() => navigate("/login"), 2000);
      } else if (err.response?.status === 404) {
        setError("Liked videos feature not available yet.");
      } else {
        setError("Failed to load liked videos. Please try again.");
      }
      setVideos([]);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchLikedVideos(1);
  }, [fetchLikedVideos]);

  const handleVideoClick = useCallback(
    (video: Video) => {
      if (!video?._id) {
        console.error("Invalid video:", video);
        return;
      }
      
      console.log("Opening video:", video);
      
      // Check if video exists in localStorage first
      const existingVideo = localStorage.getItem(`video_${video._id}`);
      if (!existingVideo) {
        localStorage.setItem(`video_${video._id}`, JSON.stringify(video));
      }
      
      // Navigate to video page
      const videoSlug = video.slug || video._id;
      navigate(`/video/${videoSlug}`);
    },
    [navigate]
  );

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      fetchLikedVideos(newPage);
    }
  };

  const validVideos = useMemo(() => 
    videos.filter(video => video?._id && video?.file),
    [videos]
  );

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
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Liked Videos</h1>
          <div className="flex items-center justify-between">
            <p className="text-gray-600">
              {totalVideos > 0 
                ? `You have liked ${totalVideos} video${totalVideos !== 1 ? 's' : ''}`
                : "You haven't liked any videos yet"}
            </p>
            {totalVideos > 0 && totalPages > 1 && (
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span>Page {currentPage} of {totalPages}</span>
              </div>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Videos Grid */}
        {validVideos.length === 0 && !loading ? (
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
              {validVideos.map((video) => (
                <VideoCard
                  key={video._id}
                  video={video}
                  onVideoClick={() => handleVideoClick(video)}
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
  video: Video;
  onVideoClick: () => void;
}

const VideoCard = React.memo(({ video, onVideoClick }: VideoCardProps) => {
  const [thumbnailError, setThumbnailError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  if (!video || !video._id) {
    console.error("Invalid video in VideoCard:", video);
    return null;
  }

  // Safe defaults
  const safeVideo = {
    _id: video._id || 'unknown-id',
    title: video.title || 'Untitled Video',
    file: video.file || '',
    thumbnail: video.thumbnail || video.file,
    views: video.views || 0,
    likes: video.likes || [],
    author: video.author || { 
      _id: 'unknown', 
      username: 'Unknown', 
      avatar: '', 
      followers: [] 
    },
    ...video
  };

  return (
    <div
      className="cursor-pointer group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
      onClick={onVideoClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
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
        {safeVideo.file && !thumbnailError ? (
          <div className="w-full h-full">
            <div className="relative w-full h-full">
              <VideoThumbnail
                videoUrl={safeVideo.file}
                width="100%"
                height="100%"
                snapshotAtTime={1}
                className="w-full h-full object-cover"
              />
              {/* Video duration - optional */}
              <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                5:30 {/* You can calculate actual duration if available */}
              </div>
            </div>
            
            {/* Play button overlay on hover */}
            {isHovered && (
              <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center transition-opacity duration-300">
                <div className="bg-white bg-opacity-90 rounded-full p-4 transform scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8 text-gray-900" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            )}
          </div>
        ) : (
          // Fallback thumbnail
          <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
            <div className="text-center">
              <svg className="w-16 h-16 text-gray-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <p className="text-gray-500 text-sm">Video Preview</p>
            </div>
          </div>
        )}
        
        {/* Like badge */}
        <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center">
          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
          </svg>
          Liked
        </div>
      </div>

      {/* Video Info */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 line-clamp-2 mb-3 group-hover:text-blue-600 transition-colors text-sm md:text-base">
          {safeVideo.title}
        </h3>
        
        {/* Author info */}
        <div className="flex items-center mb-3">
          {safeVideo.author?.avatar ? (
            <img
              src={safeVideo.author.avatar}
              alt={safeVideo.author.username}
              className="w-8 h-8 rounded-full mr-2 object-cover border border-gray-200"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(safeVideo.author.username)}&background=random`;
              }}
            />
          ) : (
            <div className="w-8 h-8 rounded-full mr-2 bg-gray-200 flex items-center justify-center">
              <span className="text-xs font-semibold text-gray-600">
                {safeVideo.author.username?.charAt(0) || 'U'}
              </span>
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-gray-900 truncate">
              {safeVideo.author?.username || "Unknown"}
            </p>
            <p className="text-xs text-gray-500">
              {safeVideo.views?.toLocaleString() || 0} views
            </p>
          </div>
        </div>
        
        {/* Action buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <button 
            className="flex items-center text-xs text-gray-500 hover:text-blue-600 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              // Handle like action
            }}
          >
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
            </svg>
            {safeVideo.likes?.length || 0}
          </button>
          
          <button 
            className="flex items-center text-xs text-gray-500 hover:text-blue-600 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              // Handle share action
            }}
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Share
          </button>
        </div>
      </div>
    </div>
  );
});

VideoCard.displayName = "VideoCard";

export default LikedVideos;