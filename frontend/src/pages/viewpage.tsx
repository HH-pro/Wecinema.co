import React, { useEffect, useState } from "react";
import { Layout, Player } from "../components";
import { FaEye } from "react-icons/fa";
import VideoThumbnail from "react-video-thumbnail";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { decodeToken, formatDateAgo } from "../utilities/helperfFunction";
import { API } from "../api"; // Updated import

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
}

const Viewpage: React.FC = () => {
  const location = useLocation();
  const { slug } = useParams<{ slug: string }>();
  const [loading, setLoading] = useState(false);
  const [catVideos, setCatVideos] = useState<Video[]>([]);
  const [loggedVideo, setLoggedVideo] = useState<Video | null>(null);
  const navigate = useNavigate();
  const token = localStorage.getItem("token") || null;
  const [relatedLoading, setRelatedLoading] = useState(false);

  // Fetch video data from location or localStorage
  useEffect(() => {
    const getVideoData = async () => {
      if (location.state) {
        setLoggedVideo(location.state as Video);
      } else {
        const localStorageVideo = localStorage.getItem("video");
        if (localStorageVideo) {
          try {
            setLoggedVideo(JSON.parse(localStorageVideo));
          } catch (error) {
            console.error("Error parsing video data:", error);
          }
        }
      }
    };
    getVideoData();
  }, [location.state]);

  // Fetch video if not present
  useEffect(() => {
    const fetchVideo = async () => {
      if (!loggedVideo && slug) {
        setLoading(true);
        try {
          const result = await API.video.getVideoById(slug);
          if (result.video) {
            setLoggedVideo(result.video);
            localStorage.setItem("video", JSON.stringify(result.video));
          } else if (result.error) {
            console.error("Error fetching video:", result.error);
          }
        } catch (error) {
          console.error("Error fetching video:", error);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchVideo();
  }, [loggedVideo, slug]);

  // Fetch related videos by genre
  useEffect(() => {
    const fetchRelatedVideos = async () => {
      if (!loggedVideo?.genre || !loggedVideo.genre.length) return;
      
      setRelatedLoading(true);
      try {
        const allVideos: Video[] = [];
        
        // Fetch videos for each genre
        for (const genre of loggedVideo.genre) {
          const result = await API.video.getVideosByCategory(genre);
          if (result.videos) {
            allVideos.push(...result.videos);
          }
        }
        
        // Filter out current video and remove duplicates
        const uniqueVideos = allVideos.filter((video: Video, index: number, self: Video[]) => {
          return (
            video._id !== loggedVideo?._id &&
            index === self.findIndex((v: Video) => v._id === video._id)
          );
        });
        
        // Limit to 8 videos
        setCatVideos(uniqueVideos.slice(0, 8));
      } catch (error) {
        console.error("Error fetching related videos:", error);
      } finally {
        setRelatedLoading(false);
      }
    };
    
    if (loggedVideo) {
      fetchRelatedVideos();
    }
  }, [loggedVideo]);

  // Increment video view when component mounts
  useEffect(() => {
    const incrementView = async () => {
      if (loggedVideo?._id && token) {
        try {
          const decoded = decodeToken(token);
          if (decoded?.userId) {
            await API.video.incrementVideoView(loggedVideo._id, decoded.userId);
          }
        } catch (error) {
          console.error("Error incrementing view:", error);
        }
      }
    };
    
    incrementView();
  }, [loggedVideo, token]);

  // Handle video click
  const handleVideoClick = (video: Video) => {
    localStorage.setItem("video", JSON.stringify(video));
    navigate(`/video/${video.slug}`);
    setLoggedVideo(video);
    setCatVideos([]); // Clear related videos to trigger refetch
  };

  // Get video thumbnail URL
  const getVideoThumbnail = (video: Video) => {
    if (video.file) {
      return video.file;
    }
    return "https://via.placeholder.com/1920x1080?text=Video+Thumbnail";
  };

  // Get author name
  const getAuthorName = (video: Video) => {
    if (typeof video.author === 'object' && video.author?.username) {
      return video.author.username;
    }
    return "Unknown";
  };

  // Get view count
  const getViewCount = (video: Video) => {
    return video.views ? video.views.toLocaleString() : "0";
  };

  return (
    <Layout hideSidebar={true} expand={true}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
          {/* Left Section: Video Content */}
          <div className="lg:col-span-7 space-y-6">
            {/* Video Player */}
            <div className="bg-gradient-to-br rounded-2xl overflow-hidden shadow-2xl">
              {loggedVideo ? (
                <div className="aspect-w-16 aspect-h-9 w-full">
                  <Player 
                    video={loggedVideo} 
                    tokenData={decodeToken(token)} 
                    autoPlay={true}
                  />
                </div>
              ) : (
                <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl w-full h-[500px] flex items-center justify-center">
                  {loading ? (
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                      <span className="text-gray-300 text-lg">Loading video...</span>
                    </div>
                  ) : (
                    <div className="text-gray-500 text-xl">Video not available</div>
                  )}
                </div>
              )}
            </div>

            {/* Video Information */}
            {loggedVideo && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {loggedVideo.title}
                </h1>
                
                <div className="flex flex-wrap items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center text-gray-600 dark:text-gray-400">
                      <FaEye className="mr-2" />
                      <span>{getViewCount(loggedVideo)} views</span>
                    </div>
                    <div className="text-gray-600 dark:text-gray-400">
                      {formatDateAgo(loggedVideo.createdAt)}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    {loggedVideo.author && (
                      <div className="flex items-center">
                        {typeof loggedVideo.author === 'object' && loggedVideo.author.avatar && (
                          <img 
                            src={loggedVideo.author.avatar} 
                            alt={getAuthorName(loggedVideo)}
                            className="w-8 h-8 rounded-full mr-2"
                          />
                        )}
                        <span className="text-gray-700 dark:text-gray-300">
                          {getAuthorName(loggedVideo)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Video Description */}
                <div className="mt-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Description
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">
                    {loggedVideo.description || "No description available."}
                  </p>
                </div>
                
                {/* Video Tags */}
                {loggedVideo.genre && loggedVideo.genre.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Tags
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {loggedVideo.genre.map((genre: string, index: number) => (
                        <span 
                          key={index}
                          className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm"
                        >
                          {genre}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Section: Related Videos */}
          <div className="lg:col-span-3 lg:sticky lg:top-24 self-start h-fit">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
              <h3 className="font-bold text-xl p-4 bg-gradient-to-r from-yellow-600 to-yellow-500 text-white">
                Related Videos
                {relatedLoading && (
                  <span className="ml-2 text-sm font-normal">Loading...</span>
                )}
              </h3>

              <div className="overflow-y-auto max-h-[calc(100vh-150px)]">
                {catVideos.length > 0 ? (
                  catVideos.map((video: Video) => (
                    <div
                      key={video._id}
                      className="flex gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-all duration-300 border-b border-gray-100 dark:border-gray-700 last:border-0"
                      onClick={() => handleVideoClick(video)}
                    >
                      <div className="relative w-16 sm:w-28 md:w-32 flex-shrink-0 rounded-xl overflow-hidden">
                        <div className="aspect-w-16 aspect-h-9 bg-gray-200 dark:bg-gray-700">
                          <VideoThumbnail
                            videoUrl={getVideoThumbnail(video)}
                            snapshotAtTime={2}
                            width={128}
                            height={72}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] px-1 py-0.5 rounded">
                          10:25
                        </div>
                      </div>

                      <div className="flex-1 min-w-0 py-0.5">
                        <h4 className="font-medium text-gray-900 dark:text-white line-clamp-2 text-xs sm:text-sm mb-0.5">
                          {video.title}
                        </h4>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-0.5">
                          {getAuthorName(video)}
                        </div>
                        <div className="flex items-center text-[10px] sm:text-xs text-gray-500 dark:text-gray-500">
                          <FaEye className="mr-1" size={10} />
                          <span>{getViewCount(video)} views</span>
                          <span className="mx-1">•</span>
                          <span>{formatDateAgo(video.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center">
                    {relatedLoading ? (
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                        <div className="text-gray-500 dark:text-gray-400">Loading related videos...</div>
                      </div>
                    ) : (
                      <>
                        <div className="text-gray-500 dark:text-gray-400 mb-2">
                          No related videos found
                        </div>
                        <div className="text-sm text-gray-400">Try watching other content</div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Viewpage;