import React, { useRef, useState, useEffect } from 'react';
import { FiX, FiPlay, FiPause, FiVolume2, FiVolumeX, FiMaximize, FiAlertCircle, FiLoader } from 'react-icons/fi';

interface VideoPlayerModalProps {
  show: boolean;
  videoUrl: string;
  videoTitle: string;
  videoThumbnail?: string;
  onClose: () => void;
}

const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  show,
  videoUrl,
  videoTitle,
  videoThumbnail,
  onClose
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showThumbnail, setShowThumbnail] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (show) {
      setShowThumbnail(true);
      setIsPlaying(false);
      setIsLoading(true);
      setHasError(false);
      setIsMuted(false);
    }
  }, [show, videoUrl]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const isVideoUrl = (url: string): boolean => {
    if (!url) return false;
    
    const videoExtensions = /\.(mp4|mov|avi|wmv|flv|mkv|webm|m4v|ogg|ogv|3gp|3g2)$/i;
    if (videoExtensions.test(url)) {
      return true;
    }
    
    const videoDomains = [
      'youtube.com',
      'youtu.be',
      'vimeo.com',
      'dailymotion.com',
      'twitch.tv',
      'streamable.com',
      'cloudinary.com',
      'vidyard.com',
      'wistia.com'
    ];
    
    return videoDomains.some(domain => url.includes(domain));
  };

  const generateThumbnailUrl = (url: string): string => {
    // Use provided thumbnail if available
    if (videoThumbnail) return videoThumbnail;
    
    // YouTube thumbnail generation
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1];
      if (videoId) {
        return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      }
    }
    
    // Vimeo thumbnail generation
    if (url.includes('vimeo.com')) {
      const videoId = url.match(/vimeo\.com\/(\d+)/)?.[1];
      if (videoId) {
        return `https://vumbnail.com/${videoId}_large.jpg`;
      }
    }
    
    // Dailymotion thumbnail generation
    if (url.includes('dailymotion.com') || url.includes('dai.ly')) {
      const videoId = url.match(/(?:dailymotion\.com\/video\/|dai\.ly\/)([^_]+)/)?.[1];
      if (videoId) {
        return `https://www.dailymotion.com/thumbnail/video/${videoId}`;
      }
    }
    
    // Custom SVG placeholder with video icon
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="1280" height="720" viewBox="0 0 1280 720" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="1280" height="720" fill="#1a1a1a"/>
        <rect x="160" y="90" width="960" height="540" rx="12" fill="#2a2a2a"/>
        <circle cx="640" cy="360" r="60" fill="#4f46e5" opacity="0.8"/>
        <path d="M590 320L690 360L590 400V320Z" fill="white"/>
        <text x="640" y="620" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="#9ca3af">${videoTitle}</text>
        <text x="640" y="650" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#6b7280">Click to play</text>
      </svg>
    `)}`;
  };

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
        setShowThumbnail(false);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const handleMuteToggle = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(!isMuted);
    }
  };

  const handleFullscreen = () => {
    if (!videoRef.current) return;
    
    if (isFullscreen) {
      document.exitFullscreen();
    } else {
      videoRef.current.requestFullscreen();
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      setDuration(videoRef.current.duration || 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleVideoLoadStart = () => {
    setIsLoading(true);
  };

  const handleVideoCanPlay = () => {
    setIsLoading(false);
  };

  const handleVideoError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  const handleThumbnailClick = () => {
    if (videoRef.current) {
      videoRef.current.play();
      setIsPlaying(true);
      setShowThumbnail(false);
    }
  };

  if (!show || !videoUrl) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-fadeIn">
      <div className={`relative w-full max-w-6xl ${isFullscreen ? 'h-screen' : 'max-h-[90vh]'} bg-gray-900 rounded-xl overflow-hidden shadow-2xl transition-all duration-300`}>
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-30 bg-gradient-to-b from-black/90 to-transparent p-4 md:p-6 flex justify-between items-center">
          <div className="text-white max-w-[70%]">
            <h3 className="text-lg md:text-xl font-bold truncate">{videoTitle}</h3>
            <p className="text-xs md:text-sm text-gray-300 truncate mt-1">
              {videoUrl.replace(/^https?:\/\//, '')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-red-400 p-2 rounded-full hover:bg-white/10 transition-all duration-200 flex-shrink-0 ml-4"
            aria-label="Close video player"
          >
            <FiX size={24} />
          </button>
        </div>
        
        {/* Video Player Container */}
        <div className="relative w-full h-[70vh] bg-black">
          {isVideoUrl(videoUrl) && !hasError ? (
            <>
              {/* Thumbnail Overlay */}
              {showThumbnail && (
                <div 
                  className="absolute inset-0 z-10 bg-cover bg-center cursor-pointer group"
                  style={{
                    backgroundImage: `url('${generateThumbnailUrl(videoUrl)}')`,
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center'
                  }}
                  onClick={handleThumbnailClick}
                >
                  {/* Thumbnail Overlay Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/60 flex items-center justify-center">
                    {/* Play Button */}
                    <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-all duration-300 shadow-2xl">
                      <FiPlay size={36} className="text-white ml-1" />
                    </div>
                    
                    {/* Loading Indicator on Thumbnail */}
                    {isLoading && (
                      <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Video Element */}
              <video
                ref={videoRef}
                src={videoUrl}
                controls={false}
                autoPlay={false}
                muted={isMuted}
                className="w-full h-full object-contain"
                onPlay={() => {
                  setIsPlaying(true);
                  setShowThumbnail(false);
                }}
                onPause={() => setIsPlaying(false)}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleTimeUpdate}
                onLoadStart={handleVideoLoadStart}
                onCanPlay={handleVideoCanPlay}
                onError={handleVideoError}
                onEnded={() => setIsPlaying(false)}
              >
                Your browser does not support the video tag.
              </video>
              
              {/* Loading Overlay */}
              {isLoading && !showThumbnail && (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-20">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white mx-auto mb-4"></div>
                    <p className="text-white text-lg font-medium">Loading video...</p>
                  </div>
                </div>
              )}
              
              {/* Custom Video Controls */}
              {!showThumbnail && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-4 pt-12 z-20">
                  {/* Progress Bar */}
                  <div className="mb-4">
                    <input
                      type="range"
                      min="0"
                      max={duration || 100}
                      value={currentTime}
                      onChange={handleSeek}
                      className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                    />
                    <div className="flex justify-between text-xs text-gray-300 mt-1">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>
                  
                  {/* Control Buttons */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={handlePlayPause}
                        className="text-white hover:text-blue-400 p-2 rounded-full hover:bg-white/10 transition-colors"
                        aria-label={isPlaying ? "Pause" : "Play"}
                      >
                        {isPlaying ? <FiPause size={22} /> : <FiPlay size={22} />}
                      </button>
                      <button
                        onClick={handleMuteToggle}
                        className="text-white hover:text-blue-400 p-2 rounded-full hover:bg-white/10 transition-colors"
                        aria-label={isMuted ? "Unmute" : "Mute"}
                      >
                        {isMuted ? <FiVolumeX size={22} /> : <FiVolume2 size={22} />}
                      </button>
                      <span className="text-sm text-gray-300">
                        {formatTime(currentTime)} / {formatTime(duration)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <button
                        onClick={handleFullscreen}
                        className="text-white hover:text-blue-400 p-2 rounded-full hover:bg-white/10 transition-colors"
                        aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                      >
                        <FiMaximize size={22} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Error State */
            <div className="flex flex-col items-center justify-center h-full text-white p-8 text-center">
              <div className="bg-red-900/20 p-6 rounded-full mb-6">
                <FiAlertCircle className="text-red-500" size={64} />
              </div>
              <h4 className="text-2xl font-bold mb-3">Unable to Play Video</h4>
              <p className="text-gray-300 mb-6 max-w-md">
                {hasError 
                  ? "There was an error loading the video. Please check the URL or try another video."
                  : "The provided URL is not a valid video source."
                }
              </p>
              <div className="bg-gray-800/50 rounded-lg p-4 max-w-lg w-full">
                <p className="text-sm font-mono text-gray-400 break-all">{videoUrl}</p>
              </div>
              <button
                onClick={onClose}
                className="mt-8 px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Close Player
              </button>
            </div>
          )}
        </div>
        
        {/* Keyboard Shortcuts Info */}
        {!showThumbnail && (
          <div className="absolute top-1/2 right-4 transform -translate-y-1/2 z-10 bg-black/70 backdrop-blur-sm rounded-lg p-3 hidden lg:block">
            <div className="text-xs text-gray-300 space-y-1">
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-gray-800 rounded">Space</kbd>
                <span>Play/Pause</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-gray-800 rounded">M</kbd>
                <span>Mute/Unmute</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-gray-800 rounded">F</kbd>
                <span>Fullscreen</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-gray-800 rounded">ESC</kbd>
                <span>Close</span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Background Overlay Click to Close */}
      <div 
        className="absolute inset-0 -z-10"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Global Styles for Custom Scrollbar */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #ffffff;
          cursor: pointer;
          border: 2px solid #4f46e5;
        }
        input[type="range"]::-moz-range-thumb {
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #ffffff;
          cursor: pointer;
          border: 2px solid #4f46e5;
        }
      `}</style>
    </div>
  );
};

export default VideoPlayerModal;