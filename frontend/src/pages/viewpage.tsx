import React, { useEffect, useState, useCallback, useMemo, memo } from "react";
import { Layout, Player } from "../components";
import { FaEye } from "react-icons/fa";
import VideoThumbnail from "react-video-thumbnail";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { decodeToken, formatDateAgo } from "../utilities/helperfFunction";
import { getRequest } from "../api";

const Viewpage: React.FC<any> = () => {
  const location = useLocation();
  const { slug } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem("token") || null;
  
  const [loading, setLoading] = useState(false);
  const [catVideos, setCatVideos] = useState<any[]>([]);
  const [loggedVideo, setLoggedVideo] = useState<any>(null);

  // Fetch video data from location or localStorage
  useEffect(() => {
    const getVideoData = () => {
      if (location.state) {
        setLoggedVideo(location.state);
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
        try {
          const result = await getRequest(`/video/${slug}`, setLoading);
          setLoggedVideo(result);
        } catch (error) {
          console.error("Error fetching video:", error);
        }
      }
    };
    fetchVideo();
  }, [loggedVideo, slug]);

  // Fetch related videos by genre
  useEffect(() => {
    const fetchRelatedVideos = async () => {
      if (!loggedVideo?.genre) return;
      try {
        const requests = loggedVideo.genre.map((genre: string) =>
          getRequest(`/video/category/${genre}`, setLoading)
        );
        const results = await Promise.all(requests);
        const allVideos = results.flat();
        const uniqueVideos = allVideos.filter(
          (video: any) =>
            video._id !== loggedVideo?._id &&
            !catVideos.some((v: any) => v._id === video._id)
        );
        setCatVideos(uniqueVideos.slice(0, 8));
      } catch (error) {
        console.error("Error fetching related videos:", error);
      }
    };
    fetchRelatedVideos();
  }, [loggedVideo]);

  const handleVideoClick = useCallback((video: any) => {
    localStorage.setItem("video", JSON.stringify(video));
    navigate(`/video/${video.slug}`);
  }, [navigate]);

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
                  <Player video={loggedVideo} tokenData={decodeToken(token)} />
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

           
          </div>

          {/* Right Section: Related Videos */}
          <div className="lg:col-span-3 lg:sticky lg:top-24 self-start h-fit">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
              <h3 className="font-bold text-xl p-4 bg-gradient-to-r from-yellow-600 to-yellow-500 text-white">
                Related Videos
              </h3>

              <div className="overflow-y-auto max-h-[calc(100vh-150px)]">
                {catVideos.length > 0 ? (
                  catVideos.map((video: any) => (
                    <div
                      key={video._id}
                      className="flex gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-all duration-300 border-b border-gray-100 dark:border-gray-700 last:border-0"
                      onClick={() => {
                        localStorage.setItem("video", JSON.stringify(video));
                        navigate(`/video/${video.slug}`);
                      }}
                    >
                      <div className="relative w-16 sm:w-28 md:w-32 flex-shrink-0 rounded-xl overflow-hidden">
                        <div className="aspect-w-16 aspect-h-9 bg-gray-200 dark:bg-gray-700">
                          <VideoThumbnail
                            videoUrl={video.file}
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
                          {video.uploader?.username || "Unknown"}
                        </div>
                        <div className="flex items-center text-[10px] sm:text-xs text-gray-500 dark:text-gray-500">
                          <FaEye className="mr-1" size={10} />
                          <span>{Math.floor(Math.random() * 50).toLocaleString()} views</span>
                          <span className="mx-1">•</span>
                          <span>{formatDateAgo(video.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center">
                    <div className="text-gray-500 dark:text-gray-400 mb-2">
                      No related videos found
                    </div>
                    <div className="text-sm text-gray-400">Try watching other content</div>
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
