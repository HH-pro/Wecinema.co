import React, { useRef, useState, useEffect } from 'react';
import { FiX, FiPlay, FiPause, FiVolume2, FiVolumeX, FiMaximize, FiMinimize, FiDownload, FiInfo } from 'react-icons/fi';
import { BsFillPlayFill, BsFillPauseFill } from 'react-icons/bs';

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
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (show) {
      setIsLoading(true);
      setError('');
    }
  }, [show]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

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
      setError('Unable to load video. The file may be corrupted or unsupported.');
      setIsLoading(false);
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('volumechange', handleVolumeChange);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('volumechange', handleVolumeChange);
      video.removeEventListener('error', handleError);
    };
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const showControlsTemporarily = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
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
  }, [show, isPlaying]);

  if (!show || !videoUrl) return null;

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

  const formatTime = (seconds: number): string => {
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
    
    if (video.paused) {
      video.play();
    } else {
      video.pause();
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
    const video = videoRef.current;
    if (!video) return;
    
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      video.requestFullscreen();
    }
    showControlsTemporarily();
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = videoUrl;
    link.download = videoTitle || 'video.mp4';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 transition-all duration-300"
      onClick={() => setShowControls(true)}
      onMouseMove={showControlsTemporarily}
    >
      {/* Modal Container */}
      <div className="relative w-full max-w-6xl max-h-[90vh] bg-black/90 rounded-2xl overflow-hidden shadow-2xl border border-gray-800">
        {/* Header */}
        <div 
          className={`absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/90 via-black/70 to-transparent p-4 transition-all duration-300 ${
            showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-white truncate flex items-center gap-2">
                <FiInfo className="text-yellow-400 flex-shrink-0" size={18} />
                <span className="truncate">{videoTitle}</span>
              </h3>
              <div className="text-sm text-gray-400 truncate mt-1 flex items-center gap-2">
                <span className="px-2 py-0.5 bg-gray-800 rounded text-xs">{formatTime(duration)}</span>
                <span className="truncate">{videoUrl}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <button
                onClick={handleDownload}
                className="text-white hover:text-yellow-400 p-2 rounded-lg hover:bg-white/10 transition-all duration-200"
                title="Download"
              >
                <FiDownload size={20} />
              </button>
              <button
                onClick={handleFullscreen}
                className="text-white hover:text-yellow-400 p-2 rounded-lg hover:bg-white/10 transition-all duration-200"
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? <FiMinimize size={20} /> : <FiMaximize size={20} />}
              </button>
              <button
                onClick={onClose}
                className="text-white hover:text-red-400 p-2 rounded-lg hover:bg-red-500/10 transition-all duration-200"
                title="Close"
              >
                <FiX size={24} />
              </button>
            </div>
          </div>
        </div>
        
        {/* Video Player Area */}
        <div className="relative w-full h-[75vh] bg-black flex items-center justify-center">
          {error ? (
            <div className="flex flex-col items-center justify-center h-full text-white p-8 text-center max-w-md">
              <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mb-6">
                <FiX className="text-red-400" size={40} />
              </div>
              <h4 className="text-2xl font-semibold mb-3">Playback Error</h4>
              <p className="text-gray-300 mb-6">{error}</p>
              <button
                onClick={onClose}
                className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-all duration-200"
              >
                Close Player
              </button>
            </div>
          ) : (
            <>
              {/* Loading Overlay */}
              {isLoading && (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-10">
                  <div className="text-center">
                    <div className="relative inline-block mb-4">
                      <div className="absolute inset-0 animate-pulse bg-yellow-400 opacity-20 rounded-full blur-xl"></div>
                      <div className="relative animate-spin rounded-full h-16 w-16 border-4 border-transparent border-t-yellow-500 border-r-amber-500 mx-auto"></div>
                    </div>
                    <p className="text-white font-medium">Loading video...</p>
                    <p className="text-gray-400 text-sm mt-2">Please wait</p>
                  </div>
                </div>
              )}
              
              {/* Video Thumbnail */}
              {videoThumbnail && !isPlaying && (
                <div 
                  className="absolute inset-0 bg-cover bg-center opacity-40"
                  style={{ backgroundImage: `url(${videoThumbnail})` }}
                />
              )}
              
              {/* Video Element */}
              {isVideoUrl(videoUrl) ? (
                <video
                  ref={videoRef}
                  src={videoUrl}
                  className="w-full h-full object-contain cursor-pointer"
                  onClick={handlePlayPause}
                  poster={videoThumbnail}
                  preload="metadata"
                >
                  Your browser does not support the video tag.
                </video>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-white p-8 text-center max-w-md">
                  <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center mb-6">
                    <FiInfo className="text-gray-400" size={40} />
                  </div>
                  <h4 className="text-2xl font-semibold mb-3">Invalid Video Source</h4>
                  <p className="text-gray-300 mb-6">The provided URL is not a supported video format.</p>
                  <div className="bg-gray-900 rounded-lg p-4 w-full text-left">
                    <p className="text-sm text-gray-400 mb-1">URL:</p>
                    <p className="text-sm break-all">{videoUrl}</p>
                  </div>
                </div>
              )}
              
              {/* Center Play Button */}
              {!isPlaying && !isLoading && (
                <button
                  onClick={handlePlayPause}
                  className="absolute z-10 transform -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2 w-20 h-20 bg-yellow-500 hover:bg-yellow-600 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110 group"
                >
                  <BsFillPlayFill className="text-white ml-1" size={32} />
                  <div className="absolute inset-0 border-4 border-yellow-400 rounded-full animate-ping opacity-20"></div>
                </button>
              )}
              
              {/* Video Controls */}
              <div 
                className={`absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/90 via-black/80 to-transparent p-4 transition-all duration-300 ${
                  showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Progress Bar */}
                <div className="mb-4">
                  <input
                    type="range"
                    min="0"
                    max={duration || 100}
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-yellow-500"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>
                
                {/* Control Buttons */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Play/Pause */}
                    <button
                      onClick={handlePlayPause}
                      className="text-white hover:text-yellow-400 p-2 rounded-lg hover:bg-white/10 transition-all duration-200"
                      title={isPlaying ? "Pause" : "Play"}
                    >
                      {isPlaying ? <BsFillPauseFill size={24} /> : <BsFillPlayFill size={24} />}
                    </button>
                    
                    {/* Volume Control */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={toggleMute}
                        className="text-white hover:text-yellow-400 p-1.5 rounded-lg hover:bg-white/10 transition-all duration-200"
                        title={isMuted ? "Unmute" : "Mute"}
                      >
                        {isMuted || volume === 0 ? <FiVolumeX size={20} /> : <FiVolume2 size={20} />}
                      </button>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={volume}
                        onChange={handleVolumeChange}
                        className="w-24 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-yellow-500"
                      />
                    </div>
                    
                    {/* Time Display */}
                    <div className="text-sm font-mono text-gray-300 bg-black/50 px-3 py-1.5 rounded-lg">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {/* Playback Speed */}
                    <div className="relative group">
                      <button className="text-sm text-gray-300 hover:text-white px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg transition-all duration-200">
                        {playbackRate}x
                      </button>
                      <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block">
                        <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl p-2 min-w-[120px]">
                          {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                            <button
                              key={rate}
                              onClick={() => changePlaybackRate(rate)}
                              className={`block w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-800 transition-all duration-200 ${
                                playbackRate === rate ? 'text-yellow-400 bg-gray-800' : 'text-gray-300'
                              }`}
                            >
                              {rate}x Speed
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    {/* Video Info */}
                    <div className="text-xs text-gray-400 bg-black/50 px-3 py-1.5 rounded-lg">
                      {videoRef.current?.videoWidth}x{videoRef.current?.videoHeight}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
        
        {/* Keyboard Shortcuts Info */}
        <div className={`absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/80 backdrop-blur-sm text-white text-xs rounded-lg p-3 transition-all duration-300 ${
          showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}>
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1">
              <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">Space</kbd>
              <span className="text-gray-300">Play/Pause</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">F</kbd>
              <span className="text-gray-300">Fullscreen</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">M</kbd>
              <span className="text-gray-300">Mute</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">← →</kbd>
              <span className="text-gray-300">Seek</span>
            </span>
          </div>
        </div>
      </div>
      
      {/* Close on background click */}
      <div 
        className="absolute inset-0 -z-10"
        onClick={onClose}
      />
    </div>
  );
};

export default VideoPlayerModal;