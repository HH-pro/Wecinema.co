// src/components/marketplae/seller/VideoManagementModal.tsx
import React, { useState } from 'react';
import { toast } from 'react-toastify';

interface MediaItem {
  _id: string;
  url: string;
  type: 'image' | 'video' | 'document' | 'audio';
  thumbnail?: string;
  duration?: number;
  fileSize?: number;
  filename?: string;
  mimeType?: string;
  resolution?: string;
  isActive?: boolean;
  isPrimary?: boolean;
  isPreview?: boolean;
  order?: number;
}

interface Listing {
  _id: string;
  title: string;
  mediaUrls: MediaItem[];
  isVideoListing: boolean;
  videoStatus?: 'active' | 'processing' | 'deactivated' | 'failed';
  primaryVideo?: {
    url: string;
    thumbnail: string;
    duration: number;
    quality: string;
  };
}

interface VideoManagementModalProps {
  listing: Listing;
  isOpen: boolean;
  onClose: () => void;
  onVideoStatusToggle: (listingId: string, status: 'activated' | 'deactivated') => void;
  onMediaDelete: (listingId: string, mediaId: string) => void;
}

const VideoManagementModal: React.FC<VideoManagementModalProps> = ({
  listing,
  isOpen,
  onClose,
  onVideoStatusToggle,
  onMediaDelete
}) => {
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<MediaItem | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [videoToDelete, setVideoToDelete] = useState<string | null>(null);

  const videoMedia = listing.mediaUrls.filter(media => media.type === 'video');
  const primaryVideo = videoMedia.find(media => media.isPrimary) || videoMedia[0];

  const handleToggleVideoStatus = async () => {
    try {
      setProcessing('toggling');
      const newStatus = listing.videoStatus === 'active' ? 'deactivated' : 'activated';
      await onVideoStatusToggle(listing._id, newStatus);
    } catch (error) {
      console.error('Error toggling video status:', error);
    } finally {
      setProcessing(null);
    }
  };

  const handleSetPrimaryVideo = async (mediaId: string) => {
    try {
      setProcessing(`setting-primary-${mediaId}`);
      // API call to set primary video would go here
      toast.success('Primary video set successfully!');
    } catch (error) {
      toast.error('Failed to set primary video');
    } finally {
      setProcessing(null);
    }
  };

  const handleDeleteVideo = (mediaId: string) => {
    setVideoToDelete(mediaId);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteVideo = async () => {
    if (!videoToDelete) return;
    
    try {
      setProcessing(`deleting-${videoToDelete}`);
      await onMediaDelete(listing._id, videoToDelete);
      setShowDeleteConfirm(false);
      setVideoToDelete(null);
    } catch (error) {
      console.error('Error deleting video:', error);
    } finally {
      setProcessing(null);
    }
  };

  const playVideo = (video: MediaItem) => {
    setSelectedVideo(video);
  };

  const handleUploadNewVideo = () => {
    // This would trigger a file input for video upload
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        // Handle video upload
        toast.info('Video upload functionality would be implemented here');
      }
    };
    input.click();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />

        {/* Modal panel */}
        <div className="inline-block w-full max-w-6xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white rounded-2xl shadow-xl">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Video Management</h3>
                <p className="mt-1 text-sm text-gray-600">{listing.title}</p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex items-center">
                  <span className="text-sm text-gray-600 mr-2">Video Status:</span>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                    listing.videoStatus === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {listing.videoStatus === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div className="flex h-[600px]">
            {/* Left sidebar - Video list */}
            <div className="w-1/3 border-r border-gray-200 bg-gray-50">
              <div className="p-4">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-medium text-gray-900">Videos ({videoMedia.length})</h4>
                  <button
                    onClick={handleUploadNewVideo}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Video
                  </button>
                </div>

                {/* Video Status Toggle */}
                <div className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-gray-900">All Videos</span>
                    <button
                      onClick={handleToggleVideoStatus}
                      disabled={processing === 'toggling'}
                      className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                        listing.videoStatus === 'active'
                          ? 'bg-red-50 text-red-700 hover:bg-red-100'
                          : 'bg-green-50 text-green-700 hover:bg-green-100'
                      } disabled:opacity-50`}
                    >
                      {processing === 'toggling' ? 'Processing...' : 
                       listing.videoStatus === 'active' ? 'Deactivate All' : 'Activate All'}
                    </button>
                  </div>
                  <p className="text-sm text-gray-600">
                    {listing.videoStatus === 'active' 
                      ? 'All videos are currently visible to buyers.'
                      : 'All videos are currently hidden from buyers.'}
                  </p>
                </div>

                {/* Video List */}
                <div className="space-y-3 overflow-y-auto max-h-[400px]">
                  {videoMedia.map(video => (
                    <div
                      key={video._id}
                      className={`p-3 bg-white rounded-lg border cursor-pointer transition-all hover:shadow-sm ${
                        selectedVideo?._id === video._id 
                          ? 'border-blue-500 ring-1 ring-blue-500' 
                          : 'border-gray-200'
                      }`}
                      onClick={() => playVideo(video)}
                    >
                      <div className="flex items-start">
                        {/* Thumbnail */}
                        <div className="w-20 h-12 bg-gray-200 rounded overflow-hidden flex-shrink-0">
                          {video.thumbnail ? (
                            <img
                              src={video.thumbnail}
                              alt="Video thumbnail"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-800">
                              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                              </svg>
                            </div>
                          )}
                        </div>

                        {/* Video Info */}
                        <div className="ml-3 flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {video.filename || 'Untitled Video'}
                            </p>
                            {video.isPrimary && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                Primary
                              </span>
                            )}
                          </div>
                          
                          <div className="mt-1 flex items-center text-xs text-gray-500">
                            {video.fileSize && (
                              <span>{formatBytes(video.fileSize)}</span>
                            )}
                          </div>

                          {/* Status Badge */}
                          <div className="mt-2 flex items-center justify-between">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${
                              video.isActive 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {video.isActive ? 'Active' : 'Inactive'}
                            </span>
                            
                            {/* Actions */}
                            <div className="flex space-x-2">
                              {!video.isPrimary && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSetPrimaryVideo(video._id);
                                  }}
                                  disabled={processing === `setting-primary-${video._id}`}
                                  className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
                                >
                                  {processing === `setting-primary-${video._id}` ? 'Setting...' : 'Set Primary'}
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteVideo(video._id);
                                }}
                                disabled={processing === `deleting-${video._id}`}
                                className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50"
                              >
                                {processing === `deleting-${video._id}` ? 'Deleting...' : 'Delete'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {videoMedia.length === 0 && (
                    <div className="text-center py-8">
                      <svg className="w-12 h-12 mx-auto text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      <p className="mt-2 text-sm text-gray-600">No videos uploaded yet</p>
                      <button
                        onClick={handleUploadNewVideo}
                        className="mt-3 text-sm text-blue-600 hover:text-blue-800"
                      >
                        Upload your first video
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right side - Video player and details */}
            <div className="w-2/3 p-6">
              {selectedVideo ? (
                <div className="space-y-6">
                  {/* Video Player */}
                  <div className="bg-black rounded-lg overflow-hidden">
                    <div className="aspect-video">
                      <video
                        key={selectedVideo.url}
                        controls
                        className="w-full h-full"
                        poster={selectedVideo.thumbnail}
                      >
                        <source src={selectedVideo.url} type={selectedVideo.mimeType || 'video/mp4'} />
                        Your browser does not support the video tag.
                      </video>
                    </div>
                  </div>

                  {/* Video Details */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h4 className="font-medium text-gray-900 mb-4">Video Details</h4>
                    
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Filename
                        </label>
                        <p className="text-sm text-gray-900">{selectedVideo.filename || 'N/A'}</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Status
                        </label>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          selectedVideo.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {selectedVideo.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Duration
                        </label>
                        <p className="text-sm text-gray-900">
                        </p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          File Size
                        </label>
                        <p className="text-sm text-gray-900">
                          {selectedVideo.fileSize ? formatBytes(selectedVideo.fileSize) : 'N/A'}
                        </p>
                      </div>
                      
                      {selectedVideo.resolution && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Resolution
                          </label>
                          <p className="text-sm text-gray-900">{selectedVideo.resolution}</p>
                        </div>
                      )}
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Primary Video
                        </label>
                        <p className="text-sm text-gray-900">
                          {selectedVideo.isPrimary ? 'Yes' : 'No'}
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-6 pt-6 border-t border-gray-200 flex space-x-3">
                      <button
                        onClick={() => {
                          const newStatus = selectedVideo.isActive ? 'deactivated' : 'activated';
                          // API call to toggle individual video status
                          toast.info(`Would toggle video status to ${newStatus}`);
                        }}
                        className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                          selectedVideo.isActive
                            ? 'bg-red-50 text-red-700 hover:bg-red-100'
                            : 'bg-green-50 text-green-700 hover:bg-green-100'
                        }`}
                      >
                        {selectedVideo.isActive ? 'Deactivate Video' : 'Activate Video'}
                      </button>
                      
                      {!selectedVideo.isPrimary && (
                        <button
                          onClick={() => handleSetPrimaryVideo(selectedVideo._id)}
                          disabled={processing === `setting-primary-${selectedVideo._id}`}
                          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                          {processing === `setting-primary-${selectedVideo._id}` ? 'Setting...' : 'Set as Primary'}
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleDeleteVideo(selectedVideo._id)}
                        disabled={processing === `deleting-${selectedVideo._id}`}
                        className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        {processing === `deleting-${selectedVideo._id}` ? 'Deleting...' : 'Delete Video'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center">
                  <svg className="w-16 h-16 text-gray-400 mb-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Select a Video</h4>
                  <p className="text-gray-600 text-center">
                    Choose a video from the list to view details and manage settings.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Total: {videoMedia.length} video{videoMedia.length !== 1 ? 's' : ''} • 
                Primary: {primaryVideo?.filename || 'Not set'} • 
                Status: {listing.videoStatus === 'active' ? 'All Active' : 'All Inactive'}
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="fixed inset-0 bg-black opacity-50" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Delete Video</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Are you sure you want to delete this video? This action cannot be undone.
                  </p>
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteVideo}
                  disabled={!!processing}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {processing ? 'Deleting...' : 'Delete Video'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoManagementModal;