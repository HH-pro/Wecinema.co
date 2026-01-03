import React, { useRef, useState, useEffect } from 'react';
import { 
  FiX, FiPlay, FiPause, FiVolume2, FiVolumeX, 
  FiMaximize, FiMinimize, FiAlertCircle, FiSettings,
  FiSkipBack, FiSkipForward
} from 'react-icons/fi';
import { MdOutlinePictureInPictureAlt } from 'react-icons/md';

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
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSettings, setShowSettings] = useState(false);

  // Close settings when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showSettings && !(e.target as Element).closest('.settings-container')) {
        setShowSettings(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showSettings]);

  // Initialize video settings
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = isMuted;
      videoRef.current.playbackRate = playbackRate;
    }
  }, [volume, isMuted, playbackRate]);

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

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else {
          onClose();
        }
      }
      // Space bar for play/pause
      if (e.key === ' ' && videoRef.current) {
        e.preventDefault();
        handlePlayPause();
      }
    };

    if (show) {
      document.addEventListener('keydown', handleEscKey);
    }
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [show, onClose]);

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

  const handlePictureInPicture = async () => {
    if (videoRef.current && document.pictureInPictureEnabled) {
      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else {
          await videoRef.current.requestPictureInPicture();
        }
      } catch (error) {
        console.error('Picture-in-Picture failed:', error);
      }
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

  const handleSkipBackward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
    }
  };

  const handleSkipForward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(
        duration,
        videoRef.current.currentTime + 10
      );
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
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setIsLoading(false);
    }
  };

  const handleVideoEnd = () => {
    setIsPlaying(false);
  };

  const handleVideoClick = () => {
    handlePlayPause();
  };

  const handleVideoError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  const handlePlaybackRateChange = (rate: number) => {
    setPlaybackRate(rate);
    setShowSettings(false);
  };

  if (!show || !videoUrl) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-2 sm:p-4">
      <div 
        ref={containerRef}
        className="relative w-full max-w-5xl max-h-[90vh] bg-gray-900 rounded-2xl overflow-hidden shadow-2xl"
        style={{
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)',
        }}
      >
        {/* Header with Gradient */}
        <div className="absolute top-0 left-0 right-0 z-30 bg-gradient-to-b from-black/80 via-black/50 to-transparent p-4 flex justify-between items-center">
          <div className="flex-1 min-w-0">
            <h3 className="text-white text-lg font-semibold truncate pr-2">
              {videoTitle}
            </h3>
            <p className="text-gray-300 text-sm truncate hidden sm:block">
              {videoUrl}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 text-gray-300 hover:text-white p-2 rounded-full hover:bg-white/10 transition-all duration-200 ml-2"
            aria-label="Close"
          >
            <FiX className="w-6 h-6" />
          </button>
        </div>

        {/* Video Container */}
        <div className="relative w-full h-[calc(90vh-120px)] bg-black">
          {isLoading && isVideoUrl(videoUrl) && !hasError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
            </div>
          )}

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
                onLoadStart={() => setIsLoading(true)}
                onCanPlay={() => setIsLoading(false)}
                playsInline
              >
                Your browser does not support the video tag.
              </video>

              {/* Play/Pause Overlay */}
              {!isPlaying && (
                <button
                  onClick={handlePlayPause}
                  className="absolute inset-0 m-auto w-20 h-20 bg-black/60 rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-110 hover:bg-black/70 group"
                  aria-label="Play"
                >
                  <FiPlay className="w-12 h-12 text-white group-hover:text-yellow-400 ml-1" />
                </button>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-white p-8 text-center">
              <FiAlertCircle className="text-red-500 mb-4 w-16 h-16" />
              <h4 className="text-xl font-semibold mb-2">
                {hasError ? "Video Playback Error" : "Invalid Video URL"}
              </h4>
              <p className="text-gray-300 mb-4">
                {hasError 
                  ? "Unable to load or play the video file" 
                  : "The URL provided is not a valid video source"}
              </p>
              <p className="text-sm text-gray-400 break-words max-w-full">
                {videoUrl}
              </p>
            </div>
          )}
        </div>

        {/* Controls Container - Fixed at bottom */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-4 pt-8">
          {/* Progress Bar */}
          <div className="mb-4 px-2">
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none 
                [&::-webkit-slider-thumb]:h-4 
                [&::-webkit-slider-thumb]:w-4 
                [&::-webkit-slider-thumb]:rounded-full 
                [&::-webkit-slider-thumb]:bg-yellow-500 
                [&::-webkit-slider-thumb]:cursor-pointer
                [&::-webkit-slider-thumb]:hover:scale-125
                [&::-webkit-slider-thumb]:transition-transform"
            />
            <div className="flex justify-between text-sm text-gray-300 mt-2">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Main Controls */}
          <div className="flex items-center justify-between px-2">
            {/* Left Controls Group */}
            <div className="flex items-center space-x-4">
              {/* Skip Backward */}
              <button
                onClick={handleSkipBackward}
                className="text-gray-300 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
                aria-label="Skip backward 10 seconds"
              >
                <FiSkipBack className="w-5 h-5" />
              </button>

              {/* Play/Pause */}
              <button
                onClick={handlePlayPause}
                className="text-white bg-yellow-600 hover:bg-yellow-700 p-3 rounded-full transition-colors shadow-lg"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <FiPause className="w-6 h-6" />
                ) : (
                  <FiPlay className="w-6 h-6 ml-0.5" />
                )}
              </button>

              {/* Skip Forward */}
              <button
                onClick={handleSkipForward}
                className="text-gray-300 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
                aria-label="Skip forward 10 seconds"
              >
                <FiSkipForward className="w-5 h-5" />
              </button>
            </div>

            {/* Center Controls - Time Display for Mobile */}
            <div className="flex items-center space-x-4 sm:hidden">
              <span className="text-white text-sm font-medium">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            {/* Right Controls Group */}
            <div className="flex items-center space-x-3">
              {/* Volume Controls */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleMuteToggle}
                  className="text-gray-300 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
                  aria-label={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted || volume === 0 ? (
                    <FiVolumeX className="w-5 h-5" />
                  ) : (
                    <FiVolume2 className="w-5 h-5" />
                  )}
                </button>
                
                {/* Volume Slider */}
                <div className="w-24">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer
                      [&::-webkit-slider-thumb]:appearance-none 
                      [&::-webkit-slider-thumb]:h-3 
                      [&::-webkit-slider-thumb]:w-3 
                      [&::-webkit-slider-thumb]:rounded-full 
                      [&::-webkit-slider-thumb]:bg-white 
                      [&::-webkit-slider-thumb]:cursor-pointer"
                    aria-label="Volume"
                  />
                </div>
              </div>

              {/* Settings Dropdown */}
              <div className="relative settings-container">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="text-gray-300 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
                  aria-label="Settings"
                >
                  <FiSettings className="w-5 h-5" />
                </button>

                {showSettings && (
                  <div className="absolute bottom-full right-0 mb-2 w-48 bg-gray-800 rounded-lg shadow-xl border border-gray-700 overflow-hidden z-40">
                    <div className="p-2">
                      <div className="text-gray-300 text-xs font-medium px-3 py-2">
                        Playback Speed
                      </div>
                      {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((rate) => (
                        <button
                          key={rate}
                          onClick={() => handlePlaybackRateChange(rate)}
                          className={`w-full px-3 py-2 text-sm text-left hover:bg-gray-700 transition-colors ${
                            playbackRate === rate 
                              ? 'text-yellow-400 bg-gray-700/50' 
                              : 'text-gray-300'
                          }`}
                        >
                          {rate === 1 ? 'Normal' : rate + 'x'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Picture in Picture */}
              <button
                onClick={handlePictureInPicture}
                className="text-gray-300 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors hidden sm:block"
                aria-label="Picture in Picture"
              >
                <MdOutlinePictureInPictureAlt className="w-5 h-5" />
              </button>

              {/* Fullscreen */}
              <button
                onClick={handleFullscreen}
                className="text-gray-300 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
                aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              >
                {isFullscreen ? (
                  <FiMinimize className="w-5 h-5" />
                ) : (
                  <FiMaximize className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Keyboard Shortcuts Hint */}
        <div className="absolute bottom-24 right-4 bg-black/70 text-white text-xs rounded-lg px-3 py-2 hidden sm:block">
          <div className="flex items-center space-x-4">
            <span>Space: Play/Pause</span>
            <span>ESC: Close</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayerModal;