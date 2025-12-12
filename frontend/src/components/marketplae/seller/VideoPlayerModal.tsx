// src/components/marketplae/seller/VideoPlayerModal.tsx
import React from 'react';

interface VideoPlayerModalProps {
  videoUrl: string;
  title: string;
  isOpen: boolean;
  onClose: () => void;
}

const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  videoUrl,
  title,
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  // Extract video extension for better format handling
  const getVideoType = (url: string): string => {
    if (url.includes('.mp4')) return 'video/mp4';
    if (url.includes('.webm')) return 'video/webm';
    if (url.includes('.ogg')) return 'video/ogg';
    return 'video/mp4'; // default
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Overlay */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-90" 
          onClick={onClose}
        ></div>
        
        {/* Modal Container */}
        <div className="inline-block w-full max-w-4xl my-8 overflow-hidden text-left align-middle transition-all transform">
          <div className="relative bg-gray-900 rounded-2xl overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="px-6 py-4 bg-gray-800 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white truncate">
                {title || 'Video Preview'}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white focus:outline-none transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Video Player */}
            <div className="aspect-video bg-black">
              <video
                key={videoUrl} // Force re-render on video change
                className="w-full h-full"
                controls
                autoPlay
                controlsList="nodownload"
                onContextMenu={(e) => e.preventDefault()}
              >
                <source src={videoUrl} type={getVideoType(videoUrl)} />
                Your browser does not support the video tag.
              </video>
            </div>
            
            {/* Controls */}
            <div className="px-6 py-4 bg-gray-800">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-400">
                  Click and drag on the video to seek
                </div>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => {
                      const video = document.querySelector('video');
                      if (video) {
                        if (video.paused) {
                          video.play();
                        } else {
                          video.pause();
                        }
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    Play/Pause
                  </button>
                  <button
                    onClick={() => {
                      const video = document.querySelector('video');
                      if (video) {
                        video.muted = !video.muted;
                      }
                    }}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors flex items-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                    Mute/Unmute
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayerModal;