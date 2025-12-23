// src/components/marketplace/seller/EditListingModal.tsx
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

interface Listing {
  _id: string;
  title: string;
  description: string;
  price: number;
  type: string;
  category: string;
  tags: string[];
  mediaUrls: string[];
  status: string;
}

interface EditListingModalProps {
  listing: Listing | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const EditListingModal: React.FC<EditListingModalProps> = ({
  listing,
  isOpen,
  onClose,
  onUpdate
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    listType: '',
    category: '',
    tags: '',
  });
  
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [existingMediaUrls, setExistingMediaUrls] = useState<string[]>([]);
  const [mediaToRemove, setMediaToRemove] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Environment variables with fallbacks
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  const CLOUDINARY_CLOUD_NAME = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME || 'your-cloud-name';
  const CLOUDINARY_UPLOAD_PRESET = process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET || 'your_upload_preset';

  // Listing types as per requirement
  const listingTypes = [
    { value: 'for-sale', label: 'For Sale' },
    { value: 'licensing', label: 'Licensing' },
    { value: 'adoption-rights', label: 'Adoption Rights' },
    { value: 'commission', label: 'Commission' }
  ];

  // Categories
  const categories = [
    'Music',
    'Art',
    'Photography',
    'Video Content',
    'Writing',
    'Software',
    'Design',
    'Fashion',
    'Home Decor',
    'Electronics',
    'Vehicles',
    'Real Estate',
    'Services',
    'Jobs',
    'Events',
    'Education',
    'Health & Wellness',
    'Sports Equipment',
    'Collectibles',
    'Other'
  ];

  useEffect(() => {
    if (listing) {
      setFormData({
        title: listing.title || '',
        description: listing.description || '',
        price: listing.price ? listing.price.toString() : '',
        listType: listing.type || '',
        category: listing.category || '',
        tags: listing.tags ? listing.tags.join(', ') : '',
      });
      setExistingMediaUrls(listing.mediaUrls || []);
      setMediaFiles([]);
      setMediaToRemove([]);
      setErrors({});
      setUploadProgress(0);
    }
  }, [listing]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    // Title validation
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.trim().length < 3) {
      newErrors.title = 'Title must be at least 3 characters';
    }
    
    // Description validation
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }
    
    // Price validation
    if (!formData.price) {
      newErrors.price = 'Price is required';
    } else {
      const priceNum = parseFloat(formData.price);
      if (isNaN(priceNum)) {
        newErrors.price = 'Price must be a valid number';
      } else if (priceNum <= 0) {
        newErrors.price = 'Price must be greater than 0';
      }
    }
    
    // Listing Type validation
    if (!formData.listType) {
      newErrors.listType = 'Listing type is required';
    }
    
    // Category validation
    if (!formData.category) {
      newErrors.category = 'Category is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles = Array.from(files);
    
    // Validate file types
    const validFiles = newFiles.filter(file => {
      const validTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 
        'image/webp', 'image/svg+xml', 'video/mp4', 'video/mpeg',
        'video/quicktime', 'video/x-msvideo', 'video/x-matroska',
        'video/webm'
      ];
      
      if (!validTypes.includes(file.type)) {
        toast.error(`${file.name}: Invalid file type. Only images and videos are allowed.`);
        return false;
      }
      
      // Validate file size (max 50MB)
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSize) {
        toast.error(`${file.name}: File size must be less than 50MB`);
        return false;
      }
      
      return true;
    });

    setMediaFiles(prev => [...prev, ...validFiles]);
    
    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeNewFile = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingMedia = (url: string) => {
    setExistingMediaUrls(prev => prev.filter(u => u !== url));
    setMediaToRemove(prev => [...prev, url]);
  };

  const restoreExistingMedia = (url: string) => {
    setExistingMediaUrls(prev => [...prev, url]);
    setMediaToRemove(prev => prev.filter(u => u !== url));
  };

  const uploadFilesToCloudinary = async (files: File[]): Promise<string[]> => {
    if (files.length === 0) return [];
    
    const uploadedUrls: string[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formData.append('folder', 'marketplace-listings');

      try {
        // Check if Cloudinary credentials are available
        if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
          toast.error('Cloudinary configuration is missing. Please contact administrator.');
          throw new Error('Cloudinary configuration missing');
        }

        const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`;
        
        console.log('Uploading to Cloudinary:', {
          cloudName: CLOUDINARY_CLOUD_NAME,
          uploadPreset: CLOUDINARY_UPLOAD_PRESET,
          file: file.name,
          size: file.size
        });

        const response = await axios.post(
          cloudinaryUrl,
          formData,
          {
            onUploadProgress: (progressEvent) => {
              if (progressEvent.total) {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                setUploadProgress(percentCompleted);
              }
            },
            headers: {
              'Content-Type': 'multipart/form-data'
            },
            timeout: 300000 // 5 minutes timeout for large files
          }
        );
        
        if (response.data.secure_url) {
          uploadedUrls.push(response.data.secure_url);
          toast.success(`Uploaded ${file.name} (${i + 1}/${files.length})`);
        } else {
          throw new Error('No secure URL returned from Cloudinary');
        }
      } catch (error: any) {
        console.error(`Error uploading ${file.name}:`, error);
        
        if (error.response) {
          // Server responded with error
          toast.error(`${file.name}: Upload failed - ${error.response.data?.error?.message || 'Server error'}`);
        } else if (error.request) {
          // No response received
          toast.error(`${file.name}: Network error - No response from server`);
        } else {
          // Other errors
          toast.error(`${file.name}: Upload failed - ${error.message}`);
        }
        
        throw error;
      }
    }
    
    return uploadedUrls;
  };

  const uploadFilesToServer = async (files: File[]): Promise<string[]> => {
    // Alternative: Upload to your own server if Cloudinary not available
    const uploadedUrls: string[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append('media', file);
      
      try {
        const response = await axios.post(
          `${API_URL}/api/marketplace/upload-media`,
          formData,
          {
            onUploadProgress: (progressEvent) => {
              if (progressEvent.total) {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                setUploadProgress(percentCompleted);
              }
            },
            headers: {
              'Content-Type': 'multipart/form-data',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }
        );
        
        if (response.data.url) {
          uploadedUrls.push(response.data.url);
          toast.success(`Uploaded ${file.name}`);
        }
      } catch (error) {
        console.error('Error uploading to server:', error);
        toast.error(`Failed to upload ${file.name}`);
        throw error;
      }
    }
    
    return uploadedUrls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !listing) {
      return;
    }
    
    setLoading(true);
    setUploadProgress(0);
    
    try {
      let newMediaUrls: string[] = [];
      
      // Upload new media files if any
      if (mediaFiles.length > 0) {
        toast.info(`Uploading ${mediaFiles.length} media file(s)...`);
        
        try {
          // Try Cloudinary first if configured
          if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_UPLOAD_PRESET) {
            newMediaUrls = await uploadFilesToCloudinary(mediaFiles);
          } else {
            // Fallback to server upload
            newMediaUrls = await uploadFilesToServer(mediaFiles);
          }
        } catch (uploadError) {
          console.error('Media upload failed:', uploadError);
          toast.error('Media upload failed. Please try again or upload smaller files.');
          setLoading(false);
          return;
        }
      }
      
      // Combine existing media (excluding removed ones) with new media
      const finalMediaUrls = [
        ...existingMediaUrls,
        ...newMediaUrls
      ];
      
      // Prepare data for API
      const token = localStorage.getItem('token');
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        price: parseFloat(formData.price),
        type: formData.listType,
        category: formData.category,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        mediaUrls: finalMediaUrls,
        mediaToRemove: mediaToRemove // Optional: for backend to delete from storage
      };
      
      console.log('Updating listing with:', payload);
      
      const response = await axios.put(
        `${API_URL}/api/marketplace/listing/${listing._id}`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        toast.success('Listing updated successfully!');
        onUpdate();
        onClose();
      } else {
        throw new Error(response.data.error || 'Failed to update listing');
      }
    } catch (error: any) {
      console.error('Error updating listing:', error);
      
      if (error.response?.data?.details) {
        const serverErrors = error.response.data.details;
        if (typeof serverErrors === 'object') {
          setErrors(serverErrors);
        } else if (Array.isArray(serverErrors)) {
          toast.error(serverErrors.join(', '));
        } else {
          toast.error(error.response.data.error || 'Failed to update listing');
        }
      } else if (error.response?.data?.error) {
        toast.error(error.response.data.error);
      } else if (error.message) {
        toast.error(error.message);
      } else {
        toast.error('Failed to update listing');
      }
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const isImageFile = (url: string | File): boolean => {
    const urlString = typeof url === 'string' ? url.toLowerCase() : url.name.toLowerCase();
    return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(urlString);
  };

  const isVideoFile = (url: string | File): boolean => {
    const urlString = typeof url === 'string' ? url.toLowerCase() : url.name.toLowerCase();
    return /\.(mp4|mov|avi|wmv|flv|mkv|webm|mpeg|mpg)$/i.test(urlString);
  };

  if (!isOpen || !listing) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75" onClick={onClose}></div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        {/* Modal panel */}
        <div className="inline-block w-full max-w-3xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
          <div className="px-6 pt-5 pb-4 bg-gradient-to-r from-purple-50 to-blue-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Edit Listing</h3>
                <p className="text-sm text-gray-600 mt-1">Update your listing information</p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 transition-colors"
                disabled={loading}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="px-6 py-5 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Title */}
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  disabled={loading}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:outline-none transition-all ${
                    errors.title 
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                  } ${loading ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  placeholder="Enter listing title"
                />
                {errors.title && (
                  <p className="mt-2 text-sm text-red-600">{errors.title}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  disabled={loading}
                  rows={4}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:outline-none transition-all ${
                    errors.description 
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                  } ${loading ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  placeholder="Describe your listing in detail"
                />
                {errors.description && (
                  <p className="mt-2 text-sm text-red-600">{errors.description}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Price */}
                <div>
                  <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
                    Price (₹) *
                  </label>
                  <input
                    type="number"
                    id="price"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    disabled={loading}
                    step="0.01"
                    min="0"
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:outline-none transition-all ${
                      errors.price 
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                        : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                    } ${loading ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    placeholder="0.00"
                  />
                  {errors.price && (
                    <p className="mt-2 text-sm text-red-600">{errors.price}</p>
                  )}
                </div>

                {/* Listing Type */}
                <div>
                  <label htmlFor="listType" className="block text-sm font-medium text-gray-700 mb-2">
                    Listing Type *
                  </label>
                  <select
                    id="listType"
                    name="listType"
                    value={formData.listType}
                    onChange={handleInputChange}
                    disabled={loading}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:outline-none transition-all ${
                      errors.listType 
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                        : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                    } ${loading ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  >
                    <option value="">Select Listing Type</option>
                    {listingTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  {errors.listType && (
                    <p className="mt-2 text-sm text-red-600">{errors.listType}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Category */}
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    disabled={loading}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:outline-none transition-all ${
                      errors.category 
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                        : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                    } ${loading ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  >
                    <option value="">Select Category</option>
                    {categories.map(category => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                  {errors.category && (
                    <p className="mt-2 text-sm text-red-600">{errors.category}</p>
                  )}
                </div>

                {/* Tags/Keywords */}
                <div>
                  <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
                    Tags / Keywords
                  </label>
                  <input
                    type="text"
                    id="tags"
                    name="tags"
                    value={formData.tags}
                    onChange={handleInputChange}
                    disabled={loading}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:outline-none transition-all border-gray-300 focus:ring-blue-500 focus:border-blue-500 ${
                      loading ? 'bg-gray-100 cursor-not-allowed' : ''
                    }`}
                    placeholder="music, art, digital, creative, etc."
                  />
                  <p className="mt-2 text-xs text-gray-500">Separate tags with commas</p>
                </div>
              </div>

              {/* Media Upload Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">
                    Media Files
                  </label>
                  <span className="text-xs text-gray-500">
                    Upload images or videos (max 50MB each)
                  </span>
                </div>

                {/* Upload Progress */}
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="space-y-2">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-600 text-center">
                      Uploading: {uploadProgress}%
                    </p>
                  </div>
                )}

                {/* File Upload Button */}
                <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  loading ? 'border-gray-200 bg-gray-50' : 'border-gray-300 hover:border-blue-500'
                }`}>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    multiple
                    accept="image/*,video/*"
                    className="hidden"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading}
                    className={`inline-flex items-center px-4 py-2 font-medium rounded-lg transition-all ${
                      loading 
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                        : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800'
                    }`}
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    {loading ? 'Please wait...' : 'Select Files'}
                  </button>
                  <p className="text-sm text-gray-500 mt-2">
                    Drag & drop images or videos, or click to browse
                  </p>
                </div>

                {/* Preview New Media Files */}
                {mediaFiles.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      New Media to Upload ({mediaFiles.length})
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {mediaFiles.map((file, index) => (
                        <div key={index} className="relative group">
                          <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                            {isImageFile(file) ? (
                              <img
                                src={URL.createObjectURL(file)}
                                alt={file.name}
                                className="w-full h-full object-cover"
                              />
                            ) : isVideoFile(file) ? (
                              <div className="w-full h-full flex items-center justify-center bg-gray-800">
                                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              </div>
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <span className="text-xs text-gray-500">{file.name}</span>
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeNewFile(index)}
                            disabled={loading}
                            className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                          <p className="text-xs text-gray-600 mt-1 truncate" title={file.name}>
                            {file.name.length > 15 ? `${file.name.substring(0, 15)}...` : file.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(file.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Existing Media Preview */}
                {existingMediaUrls.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Existing Media ({existingMediaUrls.length})
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {existingMediaUrls.map((url, index) => {
                        const isRemoved = mediaToRemove.includes(url);
                        return (
                          <div key={index} className={`relative group ${isRemoved ? 'opacity-50' : ''}`}>
                            <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                              {isImageFile(url) ? (
                                <img
                                  src={url}
                                  alt={`Media ${index + 1}`}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=Image+Error';
                                  }}
                                />
                              ) : isVideoFile(url) ? (
                                <div className="w-full h-full flex items-center justify-center bg-gray-800">
                                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z" />
                                  </svg>
                                </div>
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <span className="text-xs text-gray-500">Media {index + 1}</span>
                                </div>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => isRemoved ? restoreExistingMedia(url) : removeExistingMedia(url)}
                              disabled={loading}
                              className={`absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ${
                                isRemoved ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                              } disabled:opacity-50`}
                            >
                              {isRemoved ? (
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              )}
                            </button>
                            <p className="text-xs text-gray-600 mt-1 truncate">
                              {isRemoved ? 'Click to restore' : 'Click to remove'}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
              <div className="text-sm text-gray-500">
                * Required fields
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg hover:from-purple-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      {uploadProgress > 0 ? `Uploading... ${uploadProgress}%` : 'Updating...'}
                    </span>
                  ) : (
                    'Update Listing'
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditListingModal;