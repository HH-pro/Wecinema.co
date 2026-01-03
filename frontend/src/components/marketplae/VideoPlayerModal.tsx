import React, { useRef, useState, useEffect } from 'react';
import { FiX, FiPlay, FiPause, FiVolume2, FiVolumeX, FiMaximize, FiMinimize, FiDownload, FiInfo, FiClock } from 'react-icons/fi';
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
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showControls, setShowControls] = useState(true);
  const [videoSrc, setVideoSrc] = useState<string>('');
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (show && videoUrl) {
      // Lock body scroll
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
      document.body.style.top = '0';
      document.body.style.left = '0';
      
      // Reset and load video
      setIsLoading(true);
      setError('');
      setVideoSrc(videoUrl);
      
      // Focus modal for keyboard shortcuts
      setTimeout(() => {
        modalRef.current?.focus();
      }, 100);

      return () => {
        // Cleanup styles
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
        document.body.style.height = '';
        document.body.style.top = '';
        document.body.style.left = '';
      };
    }
  }, [show, videoUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoSrc) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setIsLoading(false);
    };
    const handleEnded = () => setIsPlaying(false);
    const handleVolumeChange = () => {
      setIsMuted(video.muted);
      setVolume(video.volume);
    };
    const handleError = () => {
      setError('Unable to play video. Please try another video or check the URL.');
      setIsLoading(false);
    };
    const handleCanPlay = () => setIsLoading(false);

    // Add event listeners
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('volumechange', handleVolumeChange);
    video.addEventListener('error', handleError);
    video.addEventListener('canplay', handleCanPlay);

    return () => {
      // Remove event listeners
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('volumechange', handleVolumeChange);
      video.removeEventListener('error', handleError);
      video.removeEventListener('canplay', handleCanPlay);
    };
  }, [videoSrc]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Auto-hide controls
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
        case 'Spacebar':
          e.preventDefault();
          handlePlayPause();
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
          video.currentTime = Math.max(0, video.currentTime - 10);
          break;
        case 'ArrowRight':
          e.preventDefault();
          video.currentTime = Math.min(video.duration, video.currentTime + 10);
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
    if (isNaN(seconds)) return '0:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;
    
    try {
      if (video.paused || video.ended) {
        video.play().then(() => {
          setIsPlaying(true);
        }).catch(err => {
          console.error('Play failed:', err);
        });
      } else {
        video.pause();
        setIsPlaying(false);
      }
    } catch (error) {
      console.error('Play/Pause error:', error);
    }
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
    showControlsTemporarily();
  };

  const handleFullscreen = () => {
    const element = modalRef.current;
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
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      window.open(videoUrl, '_blank');
    }
  };

  const isVideoUrl = (url: string): boolean => {
    if (!url) return false;
    
    const videoExtensions = /\.(mp4|mov|avi|wmv|flv|mkv|webm|m4v|ogg|ogv|3gp|3g2|mpg|mpeg)$/i;
    return videoExtensions.test(url);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleModalClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div 
      ref={modalRef}
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/95 backdrop-blur-md p-4"
      onClick={handleBackdropClick}
      onMouseMove={showControlsTemporarily}
      tabIndex={-1}
      style={{ zIndex: 10000 }}
    >
      {/* Modal Container */}
      <div 
        className="relative w-full max-w-6xl max-h-[90vh] bg-gradient-to-br from-gray-900 to-black rounded-2xl overflow-hidden shadow-2xl border border-gray-800"
        onClick={handleModalClick}
        style={{ zIndex: 10001 }}
      >
        {/* Header - IMPROVED VISIBILITY */}
        <div 
          className={`absolute top-0 left-0 right-0 z-30 bg-gradient-to-b from-black/95 to-black/70 backdrop-blur-sm p-4 border-b border-gray-700/50 transition-all duration-300 ${
            showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <div className="flex items-center gap-2 bg-gray-800/60 px-3 py-1 rounded-lg">
                  <FiClock className="text-yellow-400" size={14} />
                  <span className="text-sm font-medium text-white">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>
                {playbackRate !== 1 && (
                  <div className="bg-blue-500/20 px-2 py-1 rounded text-xs font-medium text-blue-300">
                    {playbackRate}x
                  </div>
                )}
              </div>
              
              <h3 className="text-lg font-bold text-white truncate flex items-center gap-2">
                <HiOutlineInformationCircle className="text-yellow-400 flex-shrink-0" size={20} />
                <span className="truncate">{videoTitle || 'Untitled Video'}</span>
              </h3>
              
              <div className="flex items-center gap-3 mt-1">
                <div className="text-sm text-gray-300 truncate flex items-center gap-2 max-w-md">
                  <span className="text-yellow-400">●</span>
                  <span className="truncate">{videoUrl}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 ml-4">
              {/* Download Button */}
              <button
                onClick={handleDownload}
                className="text-white hover:text-white p-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 transition-all duration-200 group"
                title="Download Video"
              >
                <FiDownload size={18} className="group-hover:scale-110 transition-transform" />
              </button>
              
              {/* Fullscreen Button */}
              <button
                onClick={handleFullscreen}
                className="text-white hover:text-white p-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 transition-all duration-200 group"
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? 
                  <FiMinimize size={18} className="group-hover:scale-110 transition-transform" /> : 
                  <FiMaximize size={18} className="group-hover:scale-110 transition-transform" />
                }
              </button>
              
              {/* Close Button - IMPROVED VISIBILITY */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="text-white hover:text-white p-2.5 rounded-lg bg-red-500 hover:bg-red-600 border border-red-600 transition-all duration-200 group shadow-lg"
                title="Close Player"
              >
                <FiX size={22} className="group-hover:rotate-90 transition-transform duration-300" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Video Player Area */}
        <div className="relative w-full h-[75vh] bg-black flex items-center justify-center">
          {error ? (
            <div className="flex flex-col items-center justify-center h-full text-white p-8 text-center max-w-md">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-red-500/20 to-red-600/10 flex items-center justify-center mb-6 border border-red-500/30">
                <FiX className="text-red-400" size={48} />
              </div>
              <h4 className="text-2xl font-bold text-white mb-3">Playback Error</h4>
              <p className="text-gray-300 mb-6 text-lg">{error}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setError('');
                    setIsLoading(true);
                    setVideoSrc(videoUrl);
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Retry Video
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg transition-all duration-200 border border-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Loading Overlay */}
              {isLoading && (
                <div className="absolute inset-0 bg-gradient-to-br from-black to-gray-900 flex items-center justify-center z-20">
                  <div className="text-center">
                    <div className="relative inline-block mb-6">
                      <div className="absolute inset-0 animate-pulse bg-yellow-500/20 rounded-full blur-xl"></div>
                      <div className="relative animate-spin rounded-full h-20 w-20 border-4 border-transparent border-t-yellow-500 border-r-amber-500 border-b-yellow-400 mx-auto"></div>
                    </div>
                    <p className="text-white font-semibold text-lg mb-1">Loading Video...</p>
                    <p className="text-gray-400 text-sm">Please wait while we prepare your video</p>
                    <div className="mt-4 w-48 h-1.5 bg-gray-800 rounded-full overflow-hidden mx-auto">
                      <div className="h-full bg-gradient-to-r from-yellow-500 to-amber-500 animate-pulse"></div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Video Thumbnail */}
              {videoThumbnail && !isPlaying && !isLoading && (
                <div 
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ 
                    backgroundImage: `url(${videoThumbnail})`,
                    filter: 'blur(20px) brightness(0.3)'
                  }}
                />
              )}
              
              {/* Video Element */}
              {isVideoUrl(videoUrl) && videoSrc ? (
                <video
                  ref={videoRef}
                  src={videoSrc}
                  className="w-full h-full object-contain cursor-pointer"
                  onClick={handlePlayPause}
                  poster={videoThumbnail}
                  preload="auto"
                  playsInline
                  controls={false}
                  crossOrigin="anonymous"
                  style={{ zIndex: 10 }}
                >
                  <source src={videoSrc} type="video/mp4" />
                  <source src={videoSrc} type="video/webm" />
                  <source src={videoSrc} type="video/ogg" />
                  Your browser does not support the video tag.
                </video>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-white p-8 text-center max-w-md">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center mb-6 border border-gray-700">
                    <FiInfo className="text-gray-400" size={48} />
                  </div>
                  <h4 className="text-2xl font-bold text-white mb-3">Invalid Video Source</h4>
                  <p className="text-gray-300 mb-6 text-lg">The video URL is not valid or accessible.</p>
                  <button
                    onClick={onClose}
                    className="px-6 py-3 bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-900 hover:to-black text-white font-semibold rounded-lg transition-all duration-200 border border-gray-700"
                  >
                    Close Player
                  </button>
                </div>
              )}
              
              {/* Center Play Button - IMPROVED DESIGN */}
              {!isPlaying && !isLoading && !error && (
                <button
                  onClick={handlePlayPause}
                  className="absolute z-30 transform -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2 w-24 h-24 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110 group"
                  style={{ zIndex: 30 }}
                >
                  <BsFillPlayFill className="text-white ml-2" size={36} />
                  <div className="absolute inset-0 border-4 border-yellow-400/30 rounded-full animate-ping"></div>
                  <div className="absolute inset-0 border-4 border-yellow-300/20 rounded-full animate-ping animation-delay-300"></div>
                </button>
              )}
              
              {/* Video Controls - IMPROVED DESIGN */}
              <div 
                className={`absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black/95 via-black/80 to-transparent p-4 border-t border-gray-700/50 transition-all duration-300 ${
                  showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                }`}
                onClick={(e) => e.stopPropagation()}
                style={{ zIndex: 30 }}
              >
                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-300 mb-2">
                    <span className="font-medium">{formatTime(currentTime)}</span>
                    <span className="font-medium">{formatTime(duration)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={duration || 100}
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer 
                      [&::-webkit-slider-thumb]:appearance-none 
                      [&::-webkit-slider-thumb]:h-5 
                      [&::-webkit-slider-thumb]:w-5 
                      [&::-webkit-slider-thumb]:rounded-full 
                      [&::-webkit-slider-thumb]:bg-gradient-to-r 
                      [&::-webkit-slider-thumb]:from-yellow-500 
                      [&::-webkit-slider-thumb]:to-amber-500
                      [&::-webkit-slider-thumb]:border-2
                      [&::-webkit-slider-thumb]:border-white
                      [&::-webkit-slider-thumb]:shadow-lg"
                  />
                </div>
                
                {/* Control Buttons */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Play/Pause */}
                    <button
                      onClick={handlePlayPause}
                      className="text-white hover:text-white p-3 rounded-full bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 border border-gray-700 transition-all duration-200 shadow-lg group"
                      title={isPlaying ? "Pause" : "Play"}
                    >
                      {isPlaying ? 
                        <BsFillPauseFill size={22} className="group-hover:scale-110 transition-transform" /> : 
                        <BsFillPlayFill size={22} className="group-hover:scale-110 transition-transform" />
                      }
                    </button>
                    
                    {/* Volume Control */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={toggleMute}
                        className="text-white hover:text-white p-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 transition-all duration-200 group"
                        title={isMuted ? "Unmute" : "Mute"}
                      >
                        {isMuted || volume === 0 ? 
                          <FiVolumeX size={18} className="group-hover:scale-110 transition-transform" /> : 
                          <FiVolume2 size={18} className="group-hover:scale-110 transition-transform" />
                        }
                      </button>
                      <div className="flex items-center gap-2 w-32">
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={volume}
                          onChange={handleVolumeChange}
                          className="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer 
                            [&::-webkit-slider-thumb]:appearance-none 
                            [&::-webkit-slider-thumb]:h-4 
                            [&::-webkit-slider-thumb]:w-4 
                            [&::-webkit-slider-thumb]:rounded-full 
                            [&::-webkit-slider-thumb]:bg-yellow-500
                            [&::-webkit-slider-thumb]:border
                            [&::-webkit-slider-thumb]:border-white/50"
                        />
                        <span className="text-xs text-gray-400 w-8 text-center">
                          {Math.round(volume * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {/* Playback Speed */}
                    <div className="relative group">
                      <button className="text-sm text-white font-medium px-4 py-2.5 bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 rounded-lg border border-gray-700 transition-all duration-200 flex items-center gap-2 shadow-lg">
                        <span>{playbackRate}x</span>
                        <span className="text-yellow-400">▼</span>
                      </button>
                      <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block animate-fadeIn">
                        <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-700 rounded-lg shadow-2xl p-2 min-w-[140px] backdrop-blur-sm">
                          {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                            <button
                              key={rate}
                              onClick={() => changePlaybackRate(rate)}
                              className={`block w-full text-left px-4 py-2.5 text-sm rounded-lg transition-all duration-200 my-0.5 ${
                                playbackRate === rate 
                                  ? 'bg-gradient-to-r from-yellow-500/20 to-amber-500/10 text-yellow-400 border border-yellow-500/30' 
                                  : 'text-gray-300 hover:bg-gray-800/50 hover:text-white'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span>{rate}x Speed</span>
                                {playbackRate === rate && (
                                  <span className="text-yellow-400">✓</span>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
        
        {/* Keyboard Shortcuts Info */}
        <div className={`absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-black/90 to-gray-900/90 backdrop-blur-sm text-white text-xs rounded-xl p-3 border border-gray-700 transition-all duration-300 ${
          showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2">
              <kbd className="px-2.5 py-1 bg-gray-800 rounded font-mono text-xs border border-gray-700">Space</kbd>
              <span className="text-gray-300">Play/Pause</span>
            </span>
            <span className="flex items-center gap-2">
              <kbd className="px-2.5 py-1 bg-gray-800 rounded font-mono text-xs border border-gray-700">F</kbd>
              <span className="text-gray-300">Fullscreen</span>
            </span>
            <span className="flex items-center gap-2">
              <kbd className="px-2.5 py-1 bg-gray-800 rounded font-mono text-xs border border-gray-700">M</kbd>
              <span className="text-gray-300">Mute</span>
            </span>
            <span className="flex items-center gap-2">
              <kbd className="px-2.5 py-1 bg-gray-800 rounded font-mono text-xs border border-gray-700">ESC</kbd>
              <span className="text-gray-300">Close</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayerModal;