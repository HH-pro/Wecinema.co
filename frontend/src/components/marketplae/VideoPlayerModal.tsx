import React, { useRef, useState, useEffect } from 'react';
import { 
  FiX, FiPlay, FiPause, FiVolume2, FiVolumeX, FiMaximize, 
  FiMinimize, FiDownload, FiInfo, FiClock, FiSkipBack, FiSkipForward,
  FiSettings, FiRotateCw, FiCornerUpRight
} from 'react-icons/fi';
import { BsFillPlayFill, BsFillPauseFill } from 'react-icons/bs';
import { HiOutlineInformationCircle } from 'react-icons/hi';

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
  videoThumbnail = '',
  onClose
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showControls, setShowControls] = useState(true);
  const [videoSrc, setVideoSrc] = useState<string>('');
  const [isVideoHovered, setIsVideoHovered] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();
  const lastClickTimeRef = useRef<number>(0);

  // Auto-play when modal opens
  useEffect(() => {
    if (show && videoUrl) {
      // Lock body scroll
      document.body.style.overflow = 'hidden';
      
      // Reset and load video
      setIsLoading(true);
      setError('');
      setVideoSrc(videoUrl);
      
      // Auto-play after a short delay
      const autoPlayTimer = setTimeout(() => {
        const video = videoRef.current;
        if (video && video.paused) {
          video.play().catch(err => {
            console.log('Auto-play blocked:', err);
            // Don't show error for autoplay block
          });
        }
      }, 300);

      return () => {
        clearTimeout(autoPlayTimer);
        document.body.style.overflow = '';
      };
    }
  }, [show, videoUrl]);

  // Video event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoSrc) return;

    const handlePlay = () => {
      setIsPlaying(true);
      setIsLoading(false);
    };
    
    const handlePause = () => {
      setIsPlaying(false);
    };
    
    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };
    
    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setIsLoading(false);
      video.volume = volume;
      video.muted = isMuted;
    };
    
    const handleEnded = () => {
      setIsPlaying(false);
      video.currentTime = 0;
    };
    
    const handleVolumeChange = () => {
      setIsMuted(video.muted);
      setVolume(video.volume);
    };
    
    const handleError = () => {
      setError('Unable to play video. Please check your connection.');
      setIsLoading(false);
    };
    
    const handleCanPlay = () => {
      setIsLoading(false);
    };

    // Add event listeners
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('volumechange', handleVolumeChange);
    video.addEventListener('error', handleError);
    video.addEventListener('canplay', handleCanPlay);

    // Initialize video
    video.volume = volume;
    video.muted = isMuted;

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('volumechange', handleVolumeChange);
      video.removeEventListener('error', handleError);
      video.removeEventListener('canplay', handleCanPlay);
    };
  }, [videoSrc, volume, isMuted]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Controls auto-hide
  const showControlsTemporarily = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !isLoading) {
        setShowControls(false);
      }
    }, 3000);
  };

  useEffect(() => {
    if (show) {
      showControlsTemporarily();
    }
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [show, isPlaying, isLoading]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!show) return;
      
      const video = videoRef.current;
      if (!video) return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          handleVideoClick();
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          handleFullscreen();
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          toggleMute();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          seekBackward();
          break;
        case 'ArrowRight':
          e.preventDefault();
          seekForward();
          break;
        case 'Escape':
          e.preventDefault();
          if (document.fullscreenElement) {
            document.exitFullscreen();
          } else {
            onClose();
          }
          break;
      }
    };

    if (show) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [show, onClose]);

  if (!show) return null;

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVideoClick = () => {
    const video = videoRef.current;
    if (!video) return;
    
    const now = Date.now();
    const DOUBLE_CLICK_THRESHOLD = 300;
    
    if (now - lastClickTimeRef.current < DOUBLE_CLICK_THRESHOLD) {
      handleFullscreen();
      lastClickTimeRef.current = 0;
      return;
    }
    
    lastClickTimeRef.current = now;
    
    try {
      if (video.paused || video.ended) {
        video.play();
      } else {
        video.pause();
      }
    } catch (error) {
      console.error('Video click error:', error);
    }
    
    showControlsTemporarily();
  };

  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;
    
    try {
      if (video.paused || video.ended) {
        video.play();
      } else {
        video.pause();
      }
    } catch (error) {
      console.error('Play/Pause error:', error);
    }
    showControlsTemporarily();
  };

  const seekBackward = () => {
    const video = videoRef.current;
    if (!video) return;
    
    video.currentTime = Math.max(0, video.currentTime - 10);
    showControlsTemporarily();
  };

  const seekForward = () => {
    const video = videoRef.current;
    if (!video) return;
    
    video.currentTime = Math.min(video.duration, video.currentTime + 10);
    showControlsTemporarily();
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    
    const time = parseFloat(e.target.value);
    video.currentTime = time;
    setCurrentTime(time);
    showControlsTemporarily();
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    
    const vol = parseFloat(e.target.value);
    video.volume = vol;
    video.muted = vol === 0;
    setVolume(vol);
    setIsMuted(vol === 0);
    showControlsTemporarily();
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    
    video.muted = !video.muted;
    setIsMuted(video.muted);
    if (!video.muted && volume === 0) {
      video.volume = 0.5;
      setVolume(0.5);
    }
    showControlsTemporarily();
  };

  const changePlaybackRate = (rate: number) => {
    const video = videoRef.current;
    if (!video) return;
    
    video.playbackRate = rate;
    setPlaybackRate(rate);
    setShowSpeedMenu(false);
    showControlsTemporarily();
  };

  const handleFullscreen = () => {
    const element = modalRef.current || videoContainerRef.current;
    if (!element) return;
    
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      element.requestFullscreen().catch(err => {
        console.error('Fullscreen error:', err);
      });
    }
    showControlsTemporarily();
  };

  const handleDownload = () => {
    try {
      const link = document.createElement('a');
      link.href = videoUrl;
      link.download = videoTitle || 'video.mp4';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      window.open(videoUrl, '_blank');
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleVideoMouseEnter = () => {
    setIsVideoHovered(true);
    showControlsTemporarily();
  };

  const handleVideoMouseLeave = () => {
    setIsVideoHovered(false);
  };

  const restartVideo = () => {
    const video = videoRef.current;
    if (!video) return;
    
    video.currentTime = 0;
    if (video.paused) {
      video.play();
    }
    showControlsTemporarily();
  };

  const isVideoUrl = (url: string): boolean => {
    if (!url) return false;
    const videoExtensions = /\.(mp4|mov|avi|wmv|flv|mkv|webm|m4v|ogg|ogv|3gp|3g2|mpg|mpeg)$/i;
    return videoExtensions.test(url);
  };

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showQualityMenu || showSpeedMenu) {
        setShowQualityMenu(false);
        setShowSpeedMenu(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showQualityMenu, showSpeedMenu]);

  return (
    <div 
      ref={modalRef}
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/95 backdrop-blur-sm p-2 sm:p-4"
      onClick={handleBackdropClick}
      onMouseMove={showControlsTemporarily}
    >
      {/* Modal Container */}
      <div 
        className="relative w-full max-w-6xl h-[90vh] sm:h-[85vh] bg-gradient-to-br from-gray-900 to-black rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl border border-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          className={`absolute top-0 left-0 right-0 z-30 bg-gradient-to-b from-black/95 to-transparent p-3 sm:p-4 transition-all duration-300 ${
            showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <div className="flex items-center gap-2 bg-gray-800/80 px-3 py-1.5 rounded-lg border border-gray-700">
                  <FiClock className="text-yellow-400" size={14} />
                  <span className="text-sm font-medium text-white">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>
                {playbackRate !== 1 && (
                  <div className="bg-yellow-500/20 px-2.5 py-1 rounded text-xs font-medium text-yellow-300 border border-yellow-500/30">
                    {playbackRate}x
                  </div>
                )}
              </div>
              
              <h3 className="text-base sm:text-lg font-bold text-white truncate flex items-center gap-2">
                <HiOutlineInformationCircle className="text-yellow-400 flex-shrink-0" size={18} />
                <span className="truncate">{videoTitle || 'Video Player'}</span>
              </h3>
            </div>
            
            <div className="flex items-center gap-1 sm:gap-2 ml-2">
              <button
                onClick={restartVideo}
                className="text-gray-300 hover:text-yellow-400 p-2 sm:p-2.5 rounded-lg hover:bg-white/10 transition-all duration-200 group"
                title="Restart Video"
              >
                <FiRotateCw size={16} className="sm:w-5 sm:h-5" />
              </button>
              
              <button
                onClick={handleDownload}
                className="text-gray-300 hover:text-yellow-400 p-2 sm:p-2.5 rounded-lg hover:bg-white/10 transition-all duration-200 group"
                title="Download"
              >
                <FiDownload size={16} className="sm:w-5 sm:h-5" />
              </button>
              
              <button
                onClick={handleFullscreen}
                className="text-gray-300 hover:text-yellow-400 p-2 sm:p-2.5 rounded-lg hover:bg-white/10 transition-all duration-200 group"
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? 
                  <FiMinimize size={16} className="sm:w-5 sm:h-5" /> : 
                  <FiMaximize size={16} className="sm:w-5 sm:h-5" />
                }
              </button>
              
              <button
                onClick={onClose}
                className="text-white hover:text-white p-2 sm:p-2.5 rounded-lg bg-red-500 hover:bg-red-600 transition-all duration-200 group shadow-lg"
                title="Close"
              >
                <FiX size={18} className="sm:w-6 sm:h-6" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Video Player Area */}
        <div 
          ref={videoContainerRef}
          className="relative w-full h-full bg-black flex items-center justify-center"
          onMouseEnter={handleVideoMouseEnter}
          onMouseLeave={handleVideoMouseLeave}
        >
          {error ? (
            <div className="flex flex-col items-center justify-center h-full text-white p-4 sm:p-8 text-center max-w-md">
              <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full bg-red-500/20 flex items-center justify-center mb-4 sm:mb-6 border border-red-500/30">
                <FiX className="text-red-400" size={32} />
              </div>
              <h4 className="text-xl sm:text-2xl font-bold text-white mb-2 sm:mb-3">Playback Error</h4>
              <p className="text-gray-300 mb-4 sm:mb-6 text-sm sm:text-lg">{error}</p>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  onClick={() => {
                    setError('');
                    setIsLoading(true);
                    setVideoSrc(videoUrl);
                  }}
                  className="px-4 sm:px-6 py-2 sm:py-3 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-lg transition-all duration-200"
                >
                  Retry
                </button>
                <button
                  onClick={onClose}
                  className="px-4 sm:px-6 py-2 sm:py-3 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg transition-all duration-200"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Loading Overlay */}
              {isLoading && (
                <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-20">
                  <div className="text-center">
                    <div className="relative inline-block mb-4 sm:mb-6">
                      <div className="absolute inset-0 animate-pulse bg-yellow-500/20 rounded-full blur-xl"></div>
                      <div className="relative animate-spin rounded-full h-12 w-12 sm:h-20 sm:w-20 border-4 border-transparent border-t-yellow-500 border-r-yellow-400 border-b-yellow-300 mx-auto"></div>
                    </div>
                    <p className="text-white font-semibold text-sm sm:text-lg mb-1">Loading Video...</p>
                    <p className="text-gray-400 text-xs sm:text-sm">Please wait</p>
                  </div>
                </div>
              )}
              
              {/* Video Element */}
              {isVideoUrl(videoUrl) && videoSrc ? (
                <div 
                  className="relative w-full h-full cursor-pointer"
                  onClick={handleVideoClick}
                >
                  <video
                    ref={videoRef}
                    src={videoSrc}
                    className="w-full h-full object-contain"
                    poster={videoThumbnail}
                    preload="auto"
                    playsInline
                    controls={false}
                    autoPlay
                  >
                    <source src={videoSrc} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-white p-4 sm:p-8 text-center max-w-md">
                  <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full bg-gray-800 flex items-center justify-center mb-4 sm:mb-6 border border-gray-700">
                    <FiInfo className="text-gray-400" size={32} />
                  </div>
                  <h4 className="text-xl sm:text-2xl font-bold text-white mb-2 sm:mb-3">Invalid Video</h4>
                  <p className="text-gray-300 mb-4 sm:mb-6 text-sm sm:text-lg">Video URL is not valid</p>
                  <button
                    onClick={onClose}
                    className="px-4 sm:px-6 py-2 sm:py-3 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg transition-all duration-200"
                  >
                    Close
                  </button>
                </div>
              )}
              
              {/* Center Play Button - YELLOW-500 */}
              {!isPlaying && !isLoading && !error && (
                <button
                  onClick={handlePlayPause}
                  className="absolute z-30 transform -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2 w-16 h-16 sm:w-24 sm:h-24 bg-yellow-500 hover:bg-yellow-600 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110 group"
                >
                  <BsFillPlayFill className="text-white ml-1 sm:ml-2" size={24} className="sm:w-9 sm:h-9" />
                  <div className="absolute inset-0 border-4 border-yellow-400/30 rounded-full animate-ping"></div>
                </button>
              )}
              
              {/* Video Controls - FIXED VISIBILITY */}
              <div 
                className={`absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black/95 via-black/80 to-transparent p-3 sm:p-4 transition-all duration-300 ${
                  showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Progress Bar */}
                <div className="mb-3 sm:mb-4">
                  <div className="flex justify-between text-xs sm:text-sm text-gray-300 mb-1 sm:mb-2">
                    <span className="font-medium">{formatTime(currentTime)}</span>
                    <span className="font-medium">{formatTime(duration)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={duration || 100}
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-1.5 sm:h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer 
                      [&::-webkit-slider-thumb]:appearance-none 
                      [&::-webkit-slider-thumb]:h-4 sm:h-5 
                      [&::-webkit-slider-thumb]:w-4 sm:w-5 
                      [&::-webkit-slider-thumb]:rounded-full 
                      [&::-webkit-slider-thumb]:bg-yellow-500
                      [&::-webkit-slider-thumb]:border-2
                      [&::-webkit-slider-thumb]:border-white
                      [&::-webkit-slider-thumb]:shadow-lg"
                  />
                </div>
                
                {/* Control Buttons with Labels */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center justify-between sm:justify-start sm:gap-4">
                    {/* Left Controls */}
                    <div className="flex items-center gap-2 sm:gap-3">
                      {/* Seek Backward with Label */}
                      <div className="flex flex-col items-center">
                        <button
                          onClick={seekBackward}
                          className="text-white hover:text-yellow-400 p-2 rounded-lg hover:bg-white/10 transition-all duration-200 group"
                          title="Back 10s"
                        >
                          <FiSkipBack size={18} className="sm:w-5 sm:h-5" />
                        </button>
                        <span className="text-[10px] sm:text-xs text-gray-400 mt-1 hidden sm:block">10s</span>
                      </div>
                      
                      {/* Play/Pause with Label */}
                      <div className="flex flex-col items-center">
                        <button
                          onClick={handlePlayPause}
                          className="text-white hover:text-white p-2.5 sm:p-3 rounded-full bg-yellow-500 hover:bg-yellow-600 border border-yellow-400 transition-all duration-200 shadow-lg group"
                          title={isPlaying ? "Pause" : "Play"}
                        >
                          {isPlaying ? 
                            <BsFillPauseFill size={18} className="sm:w-6 sm:h-6" /> : 
                            <BsFillPlayFill size={18} className="sm:w-6 sm:h-6" />
                          }
                        </button>
                        <span className="text-[10px] sm:text-xs text-gray-400 mt-1 hidden sm:block">
                          {isPlaying ? "Pause" : "Play"}
                        </span>
                      </div>
                      
                      {/* Seek Forward with Label */}
                      <div className="flex flex-col items-center">
                        <button
                          onClick={seekForward}
                          className="text-white hover:text-yellow-400 p-2 rounded-lg hover:bg-white/10 transition-all duration-200 group"
                          title="Forward 10s"
                        >
                          <FiSkipForward size={18} className="sm:w-5 sm:h-5" />
                        </button>
                        <span className="text-[10px] sm:text-xs text-gray-400 mt-1 hidden sm:block">10s</span>
                      </div>
                      
                      {/* Volume with Label */}
                      <div className="flex flex-col items-center">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={toggleMute}
                            className="text-white hover:text-yellow-400 p-2 rounded-lg hover:bg-white/10 transition-all duration-200 group"
                            title={isMuted ? "Unmute" : "Mute"}
                          >
                            {isMuted || volume === 0 ? 
                              <FiVolumeX size={18} className="sm:w-5 sm:h-5" /> : 
                              <FiVolume2 size={18} className="sm:w-5 sm:h-5" />
                            }
                          </button>
                          <div className="w-20 sm:w-24">
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.1"
                              value={volume}
                              onChange={handleVolumeChange}
                              className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer 
                                [&::-webkit-slider-thumb]:appearance-none 
                                [&::-webkit-slider-thumb]:h-3 sm:h-4 
                                [&::-webkit-slider-thumb]:w-3 sm:w-4 
                                [&::-webkit-slider-thumb]:rounded-full 
                                [&::-webkit-slider-thumb]:bg-yellow-500
                                [&::-webkit-slider-thumb]:border
                                [&::-webkit-slider-thumb]:border-white/50"
                            />
                          </div>
                        </div>
                        <span className="text-[10px] sm:text-xs text-gray-400 mt-1 hidden sm:block">
                          {Math.round(volume * 100)}%
                        </span>
                      </div>
                    </div>
                    
                    {/* Current Time Display - Mobile Only */}
                    <div className="sm:hidden text-xs text-gray-300 bg-black/50 px-2 py-1 rounded">
                      {formatTime(currentTime)}
                    </div>
                  </div>
                  
                  {/* Right Controls */}
                  <div className="flex items-center justify-between sm:justify-end sm:gap-3">
                    {/* Playback Speed with Label */}
                    <div className="relative flex flex-col items-center">
                      <button
                        onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                        className="text-gray-300 hover:text-yellow-400 px-3 py-1.5 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-all duration-200 flex items-center gap-1.5 group"
                        title="Playback Speed"
                      >
                        <FiCornerUpRight size={14} />
                        <span className="text-xs sm:text-sm font-medium">{playbackRate}x</span>
                      </button>
                      <span className="text-[10px] sm:text-xs text-gray-400 mt-1 hidden sm:block">Speed</span>
                      
                      {showSpeedMenu && (
                        <div className="absolute bottom-full right-0 mb-2 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl p-2 min-w-[120px] z-40">
                          {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                            <button
                              key={rate}
                              onClick={() => changePlaybackRate(rate)}
                              className={`block w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-800 transition-all duration-200 ${
                                playbackRate === rate 
                                  ? 'text-yellow-400 bg-gray-800' 
                                  : 'text-gray-300'
                              }`}
                            >
                              {rate}x Speed
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Quality Menu with Label */}
                    <div className="relative flex flex-col items-center">
                      <button
                        onClick={() => setShowQualityMenu(!showQualityMenu)}
                        className="text-gray-300 hover:text-yellow-400 px-3 py-1.5 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-all duration-200 flex items-center gap-1.5 group"
                        title="Quality Settings"
                      >
                        <FiSettings size={14} />
                        <span className="text-xs sm:text-sm font-medium">HD</span>
                      </button>
                      <span className="text-[10px] sm:text-xs text-gray-400 mt-1 hidden sm:block">Quality</span>
                      
                      {showQualityMenu && (
                        <div className="absolute bottom-full right-0 mb-2 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl p-2 min-w-[120px] z-40">
                          {['Auto', '360p', '480p', '720p HD', '1080p HD', '4K'].map((quality) => (
                            <button
                              key={quality}
                              onClick={() => setShowQualityMenu(false)}
                              className="block w-full text-left px-3 py-2 text-sm text-gray-300 rounded hover:bg-gray-800 hover:text-white transition-all duration-200"
                            >
                              {quality}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Fullscreen with Label */}
                    <div className="flex flex-col items-center">
                      <button
                        onClick={handleFullscreen}
                        className="text-gray-300 hover:text-yellow-400 p-2 rounded-lg hover:bg-white/10 transition-all duration-200 group"
                        title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                      >
                        {isFullscreen ? 
                          <FiMinimize size={18} className="sm:w-5 sm:h-5" /> : 
                          <FiMaximize size={18} className="sm:w-5 sm:h-5" />
                        }
                      </button>
                      <span className="text-[10px] sm:text-xs text-gray-400 mt-1 hidden sm:block">
                        {isFullscreen ? "Exit" : "Full"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
        
        {/* Keyboard Shortcuts - Mobile Hidden */}
        <div className={`absolute bottom-3 left-1/2 transform -translate-x-1/2 hidden sm:block bg-black/90 backdrop-blur-sm text-white text-xs rounded-lg p-2 transition-all duration-300 ${
          showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-2 py-1 bg-gray-800 rounded text-xs border border-gray-700">Space</kbd>
              <span className="text-gray-300 text-xs">Play/Pause</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-2 py-1 bg-gray-800 rounded text-xs border border-gray-700">F</kbd>
              <span className="text-gray-300 text-xs">Fullscreen</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-2 py-1 bg-gray-800 rounded text-xs border border-gray-700">← →</kbd>
              <span className="text-gray-300 text-xs">Seek</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayerModal;