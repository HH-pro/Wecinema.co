import React, { useRef } from 'react';
import { FiX, FiPlay, FiPause, FiVolume2, FiVolumeX, FiMaximize, FiAlertCircle } from 'react-icons/fi';

interface VideoPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  videoTitle: string;
}

const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({ 
  isOpen, 
  onClose, 
  videoUrl, 
  videoTitle 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  if (!isOpen) return null;

  const isVideoUrl = (url: string): boolean => {
    if (!url) return false;
    const videoExtensions = /\.(mp4|mov|avi|wmv|flv|mkv|webm|m4v|ogg|ogv|3gp|3g2)$/i;
    const videoDomains = [
      'youtube.com', 'youtu.be', 'vimeo.com', 'dailymotion.com',
      'twitch.tv', 'streamable.com', 'cloudinary.com'
    ];
    return videoExtensions.test(url) || videoDomains.some(domain => url.includes(domain));
  };

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    }
  };

  const handleMuteToggle = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
    }
  };

  const handleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        videoRef.current.requestFullscreen();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-black rounded-xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4 flex justify-between items-center">
          <div className="text-white truncate max-w-[80%]">
            <h3 className="text-lg font-semibold truncate">{videoTitle}</h3>
            <p className="text-sm text-gray-300 truncate">{videoUrl}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-300 p-2 rounded-full hover:bg-white/10 transition-colors flex-shrink-0"
          >
            <FiX size={24} />
          </button>
        </div>
        
        {/* Video Player */}
        <div className="relative w-full h-[70vh] bg-black flex items-center justify-center">
          {isVideoUrl(videoUrl) ? (
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              autoPlay
              className="w-full h-full object-contain bg-black"
              onError={(e) => {
                const videoElement = e.target as HTMLVideoElement;
                videoElement.controls = false;
                videoElement.innerHTML = `
                  <div class="flex flex-col items-center justify-center h-full text-white p-8 text-center">
                    <FiAlertCircle class="text-red-500 mb-4" size={48} />
                    <h4 class="text-xl font-semibold mb-2">Unable to Play Video</h4>
                    <p class="text-gray-300">The video format is not supported or the URL is invalid.</p>
                  </div>
                `;
              }}
            >
              Your browser does not support the video tag.
            </video>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-white p-8 text-center">
              <FiAlertCircle className="text-red-500 mb-4" size={48} />
              <h4 className="text-xl font-semibold mb-2">Invalid Video URL</h4>
              <p className="text-gray-300">The provided URL is not a valid video source.</p>
              <p className="text-sm text-gray-400 mt-2 break-all max-w-full">{videoUrl}</p>
            </div>
          )}
        </div>
        
        {/* Footer Actions */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          <div className="flex justify-center gap-4">
            <button
              onClick={handlePlayPause}
              className="text-white hover:text-yellow-400 p-3 rounded-full hover:bg-white/10 transition-colors"
              title="Play/Pause"
            >
              <FiPlay size={20} />
            </button>
            <button
              onClick={handleMuteToggle}
              className="text-white hover:text-yellow-400 p-3 rounded-full hover:bg-white/10 transition-colors"
              title="Mute/Unmute"
            >
              <FiVolume2 size={20} />
            </button>
            <button
              onClick={handleFullscreen}
              className="text-white hover:text-yellow-400 p-3 rounded-full hover:bg-white/10 transition-colors"
              title="Fullscreen"
            >
              <FiMaximize size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayerModal;