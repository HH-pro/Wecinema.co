import React, { useEffect, useState, useRef } from "react";
import { MdVerifiedUser } from "react-icons/md";
import { BsDot } from "react-icons/bs";
import { useNavigate } from "react-router-dom";
import VideoThumbnail from "react-video-thumbnail";
import { API } from "../../api"; // Updated import
import {
  formatDateAgo,
  generateSlug,
  truncateText,
} from "../../utilities/helperfFunction";
import { Skeleton } from "..";

interface GalleryProps {
  title?: string;
  type?: string;
  data?: any;
  category?: string;
  length?: number;
  isFirst?: boolean;
  className?: string;
  userId?: string; // For user-specific videos
}

interface Video {
  _id: string;
  title: string;
  description: string;
  file: string;
  slug: string;
  genre: string[];
  theme?: string[];
  rating?: string;
  author?: {
    _id: string;
    username: string;
    avatar?: string;
  };
  likes?: string[];
  dislikes?: string[];
  views?: number;
  comments?: any[];
  createdAt: string;
  updatedAt: string;
  isForSale?: boolean;
  hasPaid?: boolean;
  thumbnail?: string;
}

const Gallery: React.FC<GalleryProps> = ({
  title = "",
  isFirst = false,
  data = null,
  category = undefined,
  className = "",
  userId,
}) => {
  const nav = useNavigate();
  const [loading, setLoading] = useState<boolean>(false);
  const [videos, setVideos] = useState<Video[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Refs
  const galleryCanvasRef = useRef<HTMLDivElement>(null);
  const videoThumbnailRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Fetch videos based on props
  useEffect(() => {
    let isMounted = true;

    const fetchVideos = async () => {
      setLoading(true);
      setError(null);
      
      try {
        let result;
        
        if (data) {
          // If specific data is provided (like user ID)
          result = await API.video.getVideosByUser(data);
        } else if (category) {
          // If category is provided
          result = await API.video.getVideosByCategory(category);
        } else {
          // Get all videos
          result = await API.video.getAllVideos();
        }
        
        if (isMounted) {
          if (result.videos) {
            setVideos(result.videos);
          } else if (result.error) {
            setError(result.error);
            console.error("Error fetching videos:", result.error);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "Failed to fetch videos");
          console.error("Error in Gallery component:", err);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchVideos();

    return () => {
      isMounted = false;
    };
  }, [category, data, userId]);

  // Initialize ref array when videos change
  useEffect(() => {
    videoThumbnailRefs.current = videoThumbnailRefs.current.slice(0, videos.length);
  }, [videos]);

  // Filter videos by category if needed
  const filteredVideos = (category?: string) => {
    if (!category) return videos;
    
    return videos.filter((video: Video) => {
      if (!video.genre || !Array.isArray(video.genre)) return false;
      return video.genre.includes(category);
    });
  };

  // Handle video click
  const handleVideoClick = (video: Video) => {
    const slug = video.slug || generateSlug(video._id);
    nav(`/video/${slug}`, {
      state: video,
    });
    localStorage.setItem("video", JSON.stringify(video));
  };

  // Get author name
  const getAuthorName = (video: Video): string => {
    if (typeof video.author === 'object' && video.author?.username) {
      return video.author.username;
    }
    return "Unknown";
  };

  // Get author avatar
  const getAuthorAvatar = (video: Video): string => {
    if (typeof video.author === 'object' && video.author?.avatar) {
      return video.author.avatar;
    }
    return "https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg";
  };

  // Get view count
  const getViewCount = (video: Video): string => {
    return video.views ? video.views.toLocaleString() : "0";
  };

  // Handle view all click
  const handleViewAllClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (category) {
      nav(`/category/${category}`);
    } else {
      nav("/videos");
    }
  };

  // Loading skeleton
  if (loading) {
    return (
      <div
        className={`${
          isFirst ? "mt-5" : ""
        } z-1 relative p-2 flex flex-wrap border-b overflow-hidden border-blue-200 sm:mx-4 pb-4 ${className}`}
      >
        <div className="flex flex-wrap w-full">
          {Array.from({ length: 4 }).map((_, index: number) => (
            <div
              key={index}
              style={{ maxWidth: "25%" }}
              className="cursor-pointer gallery relative flex-wrap border-gray-200 w-full p-2"
            >
              <Skeleton
                width="100%"
                height="250px"
                className="rounded-lg"
              />
              <div className="mt-2">
                <Skeleton width="80%" height="20px" className="mb-2" />
                <div className="flex items-center">
                  <Skeleton
                    width="32px"
                    height="32px"
                    circle={true}
                    className="mr-2"
                  />
                  <div>
                    <Skeleton width="100px" height="16px" className="mb-1" />
                    <Skeleton width="80px" height="14px" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`p-4 text-center ${className}`}>
        <div className="text-red-500 mb-2">Error: {error}</div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  // No videos state
  if (videos.length === 0 && !loading) {
    return (
      <div className={`p-8 text-center ${className}`}>
        <div className="text-gray-500 text-lg mb-2">No videos found</div>
        {category && (
          <div className="text-gray-400">No videos in {category} category</div>
        )}
      </div>
    );
  }

  const displayVideos = filteredVideos(category);
  
  return (
    <div
      className={`${isFirst ? "mt-2" : ""} z-1 relative p-2 flex flex-wrap border-b border-blue-200 sm:mx-4 pb-4 ${className}`}
    >
      {/* Header */}
      <div className="mt-1 w-full sm:px-4 py-2 flex justify-between items-center">
        <h2 className="font-extrabold text-lg sm:text-xl text-gray-900 dark:text-white">
          {title || (category ? `${category} Videos` : "Latest Videos")}
        </h2>
        {displayVideos.length > 0 && (
          <button
            onClick={handleViewAllClick}
            className="hover:bg-green-700 hover:text-white hover:border-green-700 border border-green-700 py-1 rounded-xl px-4 cursor-pointer transition-colors duration-200 text-green-700"
          >
            View all ({displayVideos.length})
          </button>
        )}
      </div>
      
      {/* Videos Grid */}
      <div ref={galleryCanvasRef} className="flex flex-wrap w-full">
        {displayVideos.slice(0, 8).map((video: Video, index: number) => (
          <div
            key={video._id}
            style={{ maxWidth: "25%" }}
            className="cursor-pointer gallery relative flex-wrap border-gray-200 w-full p-2 hover:scale-[1.02] transition-transform duration-200"
            ref={el => videoThumbnailRefs.current[index] = el}
          >
            {/* Video Thumbnail */}
            <div
              onClick={() => handleVideoClick(video)}
              className="thumbnail relative overflow-hidden rounded-lg"
              style={{
                height: "250px",
                overflow: "hidden",
              }}
            >
              {video.file ? (
                <VideoThumbnail
                  videoUrl={video.file}
                  snapshotAtTime={1}
                  width={400}
                  height={250}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center rounded-lg">
                  <span className="text-gray-400">No video preview</span>
                </div>
              )}

              {/* Sale badge */}
              {video.isForSale && (
                <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-semibold py-1 px-2 rounded">
                  For Sale
                </span>
              )}

              {/* Paid badge */}
              {video.hasPaid && (
                <span className="absolute top-2 right-2 bg-green-500 text-white text-xs font-semibold py-1 px-2 rounded">
                  Premium
                </span>
              )}

              {/* Duration badge */}
              <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                10:25 {/* You might want to calculate actual duration */}
              </div>
            </div>

            {/* Video Info */}
            <div className="footer flex-1 block mt-3">
              <h3 
                onClick={() => handleVideoClick(video)}
                className="text-base font-semibold leading-5 mb-2 text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 line-clamp-2"
                title={video.title}
              >
                {truncateText(video.title, 60)}
              </h3>
              
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center w-full">
                  {/* Author Avatar */}
                  <div className="relative rounded-full w-8 h-8 flex-shrink-0 overflow-hidden">
                    <img
                      src={getAuthorAvatar(video)}
                      alt={getAuthorName(video)}
                      className="w-full h-full object-cover rounded-full"
                      onError={(e) => {
                        e.currentTarget.src = "https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg";
                      }}
                    />
                  </div>
                  
                  {/* Author Info */}
                  <div className="ml-3 flex-1 min-w-0">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                        {getAuthorName(video)}
                      </span>
                      <MdVerifiedUser
                        size="14"
                        className="text-green-500 flex-shrink-0 ml-1"
                      />
                    </div>
                    
                    <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <span>{formatDateAgo(video.createdAt)}</span>
                      <BsDot className="mx-1" />
                      <span>{getViewCount(video)} views</span>
                      
                      {/* Like count if available */}
                      {video.likes && (
                        <>
                          <BsDot className="mx-1" />
                          <span>{video.likes.length} likes</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Video Tags */}
              {video.genre && video.genre.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {video.genre.slice(0, 2).map((genre: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-full"
                    >
                      {genre}
                    </span>
                  ))}
                  {video.genre.length > 2 && (
                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-full">
                      +{video.genre.length - 2}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Gallery;