import React, { useRef, useState, useEffect } from 'react';
import { 
  FiX, FiPlay, FiPause, FiVolume2, FiVolumeX, 
  FiMaximize, FiMinimize, FiAlertCircle 
} from 'react-icons/fi';

interface VideoPlayerModalProps {
  show: boolean;
  videoUrl: string;
  videoTitle: string;
  onClose: () => void;
}

const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  show,
  videoUrl,
  videoTitle,
  onClose
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [hasError, setHasError] = useState(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();

  // Initialize video settings
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Reset controls visibility when modal shows
  useEffect(() => {
    if (show) {
      setShowControls(true);
      resetControlsTimeout();
    }
  }, [show]);

  // Reset error state when URL changes
  useEffect(() => {
    setHasError(false);
  }, [videoUrl]);

  const resetControlsTimeout = () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  };

  const handleMouseMove = () => {
    setShowControls(true);
    resetControlsTimeout();
  };

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

  const handleFullscreen = () => {
    if (!containerRef.current) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen();
    }
  };

  const handlePlayPause = () => {
    if (!videoRef.current) return;

    if (videoRef.current.paused) {
      videoRef.current.play().catch(err => {
        console.error('Playback failed:', err);
        setHasError(true);
      });
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (newVolume > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
    if (!isMuted) {
      localStorage.setItem('lastVolume', volume.toString());
    } else {
      const lastVolume = localStorage.getItem('lastVolume');
      setVolume(lastVolume ? parseFloat(lastVolume) : 0.8);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleVideoEnd = () => {
    setIsPlaying(false);
  };

  const handleVideoClick = () => {
    handlePlayPause();
    resetControlsTimeout();
  };

  const handleVideoError = () => {
    setHasError(true);
  };

  if (!show || !videoUrl) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm p-2 sm:p-4"
      onClick={onClose}
      style={{ 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh'
      }}
    >
      <div 
        ref={containerRef}
        className="relative w-full max-w-5xl max-h-[90vh] bg-black rounded-lg sm:rounded-xl overflow-hidden shadow-2xl transition-all duration-300"
        onClick={(e) => e.stopPropagation()}
        onMouseMove={handleMouseMove}
        style={{
          display: 'flex',
          flexDirection: 'column',
          margin: 'auto'
        }}
      >
        {/* Header - Always visible */}
        <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/90 to-transparent p-3 sm:p-4 flex justify-between items-center">
          <div className="text-white truncate max-w-[70%] sm:max-w-[80%]">
            <h3 className="text-sm sm:text-base md:text-lg font-semibold truncate">{videoTitle}</h3>
            <p className="text-xs text-gray-300 truncate hidden sm:block">{videoUrl}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-red-400 p-2 rounded-full hover:bg-white/10 transition-all duration-200 flex-shrink-0"
            aria-label="Close"
          >
            <FiX className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>
        
        {/* Video Player Area */}
        <div className="relative w-full flex-1 min-h-[200px] bg-black flex items-center justify-center">
          {isVideoUrl(videoUrl) && !hasError ? (
            <>
              <video
                ref={videoRef}
                src={videoUrl}
                className="w-full h-full object-contain cursor-pointer"
                onClick={handleVideoClick}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={handleVideoEnd}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onError={handleVideoError}
                playsInline
              >
                Your browser does not support the video tag.
              </video>

              {/* Play/Pause Overlay Button */}
              <button
                onClick={handlePlayPause}
                className={`absolute inset-0 m-auto w-16 h-16 bg-black/50 rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-110 ${
                  showControls ? 'opacity-100' : 'opacity-0'
                } ${isPlaying ? 'invisible' : 'visible'}`}
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                <FiPlay className="w-10 h-10 text-white" />
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-white p-4 sm:p-6 text-center">
              <FiAlertCircle className="text-red-500 mb-3 sm:mb-4 w-12 h-12 sm:w-16 sm:h-16" />
              <h4 className="text-base sm:text-lg md:text-xl font-semibold mb-2">
                {hasError ? "Video Playback Error" : "Invalid Video URL"}
              </h4>
              <p className="text-sm sm:text-base text-gray-300 mb-3">
                {hasError ? "Unable to load the video" : "The provided URL is not a valid video source"}
              </p>
              <p className="text-xs sm:text-sm text-gray-400 break-all max-w-full px-4">
                {videoUrl}
              </p>
            </div>
          )}
        </div>
        
        {/* Video Controls - Always visible but with opacity changes */}
        <div 
          className={`bg-gradient-to-t from-black/95 via-black/80 to-transparent p-3 sm:p-4 transition-opacity duration-300 ${
            showControls ? 'opacity-100' : 'opacity-20 hover:opacity-100'
          }`}
        >
          {/* Progress Bar - Always visible */}
          <div className="mb-3 sm:mb-4">
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1.5 sm:h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-yellow-500 [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-yellow-500 [&::-moz-range-thumb]:cursor-pointer"
            />
            <div className="flex justify-between text-xs sm:text-sm text-gray-300 mt-1 px-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Control Buttons - Always visible */}
          <div className="flex items-center justify-between">
            {/* Left Controls */}
            <div className="flex items-center gap-3 sm:gap-4">
              <button
                onClick={handlePlayPause}
                className="text-white hover:text-yellow-400 p-2 rounded-full hover:bg-white/10 transition-all duration-200"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <FiPause className="w-5 h-5 sm:w-6 sm:h-6" />
                ) : (
                  <FiPlay className="w-5 h-5 sm:w-6 sm:h-6" />
                )}
              </button>

              {/* Volume Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleMuteToggle}
                  className="text-white hover:text-yellow-400 p-2 rounded-full hover:bg-white/10 transition-all duration-200"
                  aria-label={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted || volume === 0 ? (
                    <FiVolumeX className="w-5 h-5 sm:w-6 sm:h-6" />
                  ) : (
                    <FiVolume2 className="w-5 h-5 sm:w-6 sm:h-6" />
                  )}
                </button>
                
                {/* Volume Slider - Visible on all screens */}
                <div className="flex items-center w-20 sm:w-28 md:w-32">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:cursor-pointer"
                    aria-label="Volume"
                  />
                </div>
              </div>

              {/* Time Display - Mobile */}
              <div className="sm:hidden text-white text-xs font-medium">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>

            {/* Right Controls */}
            <div className="flex items-center">
              <button
                onClick={handleFullscreen}
                className="text-white hover:text-yellow-400 p-2 rounded-full hover:bg-white/10 transition-all duration-200"
                aria-label={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? (
                  <FiMinimize className="w-5 h-5 sm:w-6 sm:h-6" />
                ) : (
                  <FiMaximize className="w-5 h-5 sm:w-6 sm:h-6" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayerModal;