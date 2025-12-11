// src/components/marketplae/seller/EditListingModal.tsx
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { marketplaceAPI, validateListingData } from '../../../api';

interface MediaItem {
  _id: string;
  url: string;
  type: 'image' | 'video' | 'document' | 'audio';
  thumbnail?: string;
  filename?: string;
  isActive?: boolean;
  isPrimary?: boolean;
}

interface Listing {
  _id: string;
  title: string;
  description: string;
  shortDescription?: string;
  price: number;
  type: string;
  category: string;
  subcategory?: string;
  tags?: string[];
  brand?: string;
  color?: string;
  size?: string;
  stockQuantity?: number;
  shippingCost?: number;
  deliveryTime?: string;
  returnsAccepted?: boolean;
  warranty?: string;
  licenseType?: string;
  usageRights?: string;
  isDigital?: boolean;
  fileFormat?: string;
  fileSize?: string;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];
  status: 'draft' | 'active' | 'inactive' | 'sold' | 'pending_review';
  mediaUrls: MediaItem[];
}

interface EditListingModalProps {
  listing: Listing;
  isOpen: boolean;
  onClose: () => void;
  onListingUpdated: (updatedListing: Listing) => void;
}

const EditListingModal: React.FC<EditListingModalProps> = ({
  listing,
  isOpen,
  onClose,
  onListingUpdated
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Listing>(listing);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newTags, setNewTags] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [removedMediaIds, setRemovedMediaIds] = useState<string[]>([]);

  // Categories data (you can fetch this from API)
  const categories = [
    'Electronics', 'Clothing', 'Home & Garden', 'Books', 'Movies & Music',
    'Art & Collectibles', 'Services', 'Software', 'Courses', 'Other'
  ];

  const listingTypes = [
    'for_sale', 'licensing', 'adaptation_rights', 'commission', 'subscription', 'service'
  ];

  const licenseTypes = [
    'personal', 'commercial', 'exclusive', 'enterprise', 'custom'
  ];

  useEffect(() => {
    if (isOpen) {
      setFormData(listing);
      setErrors({});
      setNewTags('');
      setSelectedFiles([]);
      setRemovedMediaIds([]);
    }
  }, [isOpen, listing]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
    } else if (type === 'number') {
      setFormData(prev => ({
        ...prev,
        [name]: value === '' ? '' : parseFloat(value)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const fileArray = Array.from(files);
      const validFiles = fileArray.filter(file => {
        const maxSize = 100 * 1024 * 1024; // 100MB
        const allowedTypes = [
          'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
          'video/mp4', 'video/mov', 'video/avi', 'video/mkv', 'video/webm'
        ];
        
        if (!allowedTypes.includes(file.type)) {
          toast.error(`File type not supported: ${file.name}`);
          return false;
        }
        
        if (file.size > maxSize) {
          toast.error(`File too large (max 100MB): ${file.name}`);
          return false;
        }
        
        return true;
      });
      
      setSelectedFiles(prev => [...prev, ...validFiles]);
    }
  };

  const handleRemoveSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveMedia = (mediaId: string) => {
    setRemovedMediaIds(prev => [...prev, mediaId]);
  };

  const handleRestoreMedia = (mediaId: string) => {
    setRemovedMediaIds(prev => prev.filter(id => id !== mediaId));
  };

  const handleAddTag = () => {
    if (newTags.trim()) {
      const tagsArray = newTags.split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);
      
      setFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), ...tagsArray]
      }));
      setNewTags('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags?.filter(tag => tag !== tagToRemove) || []
    }));
  };

  const validateForm = (): boolean => {
    const validationErrors: Record<string, string> = {};
    
    if (!formData.title || formData.title.length < 5) {
      validationErrors.title = 'Title must be at least 5 characters';
    }
    
    if (!formData.description || formData.description.length < 20) {
      validationErrors.description = 'Description must be at least 20 characters';
    }
    
    if (!formData.price || formData.price <= 0) {
      validationErrors.price = 'Price must be greater than 0';
    }
    
    if (!formData.type) {
      validationErrors.type = 'Listing type is required';
    }
    
    if (!formData.category) {
      validationErrors.category = 'Category is required';
    }
    
    setErrors(validationErrors);
    return Object.keys(validationErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }
    
    try {
      setLoading(true);
      
      // Create FormData for file upload
      const formDataToSend = new FormData();
      
      // Add text fields
      Object.entries(formData).forEach(([key, value]) => {
        if (key === '_id' || key === 'mediaUrls') return;
        
        if (key === 'tags' && Array.isArray(value)) {
          value.forEach(tag => formDataToSend.append('tags', tag));
        } else if (value !== null && value !== undefined) {
          formDataToSend.append(key, value.toString());
        }
      });
      
      // Add files
      selectedFiles.forEach(file => {
        formDataToSend.append('media', file);
      });
      
      // Add media to keep (excluding removed ones)
      const mediaToKeep = formData.mediaUrls.filter(media => 
        !removedMediaIds.includes(media._id)
      );
      formDataToSend.append('mediaUrls', JSON.stringify(mediaToKeep.map(m => m.url)));
      
      // Update listing
      const response = await marketplaceAPI.listings.update(
        listing._id,
        formDataToSend,
        setLoading
      );
      
      if (response.success) {
        toast.success('Listing updated successfully!');
        onListingUpdated(response.data);
        onClose();
      }
    } catch (error: any) {
      console.error('Error updating listing:', error);
      toast.error(error.message || 'Failed to update listing');
    }
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
        <div className="inline-block w-full max-w-4xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white rounded-2xl shadow-xl">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Edit Listing</h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="mt-1 text-sm text-gray-600">Update your listing details</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
              <div className="space-y-6">
                {/* Basic Information */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Title *
                      </label>
                      <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          errors.title ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Enter listing title"
                      />
                      {errors.title && (
                        <p className="mt-1 text-sm text-red-600">{errors.title}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Price (INR) *
                      </label>
                      <input
                        type="number"
                        name="price"
                        value={formData.price}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          errors.price ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                      />
                      {errors.price && (
                        <p className="mt-1 text-sm text-red-600">{errors.price}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Listing Type *
                      </label>
                      <select
                        name="type"
                        value={formData.type}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          errors.type ? 'border-red-500' : 'border-gray-300'
                        }`}
                      >
                        <option value="">Select type</option>
                        {listingTypes.map(type => (
                          <option key={type} value={type}>
                            {type.replace('_', ' ').toUpperCase()}
                          </option>
                        ))}
                      </select>
                      {errors.type && (
                        <p className="mt-1 text-sm text-red-600">{errors.type}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Category *
                      </label>
                      <select
                        name="category"
                        value={formData.category}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          errors.category ? 'border-red-500' : 'border-gray-300'
                        }`}
                      >
                        <option value="">Select category</option>
                        {categories.map(category => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                      {errors.category && (
                        <p className="mt-1 text-sm text-red-600">{errors.category}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Subcategory
                      </label>
                      <input
                        type="text"
                        name="subcategory"
                        value={formData.subcategory || ''}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Optional"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Brand
                      </label>
                      <input
                        type="text"
                        name="brand"
                        value={formData.brand || ''}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Description</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Short Description
                      </label>
                      <textarea
                        name="shortDescription"
                        value={formData.shortDescription || ''}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows={2}
                        placeholder="Brief description (appears in search results)"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Description *
                      </label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          errors.description ? 'border-red-500' : 'border-gray-300'
                        }`}
                        rows={6}
                        placeholder="Detailed description of your listing"
                      />
                      {errors.description && (
                        <p className="mt-1 text-sm text-red-600">{errors.description}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Tags</h4>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newTags}
                        onChange={(e) => setNewTags(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Add tags (comma separated)"
                      />
                      <button
                        type="button"
                        onClick={handleAddTag}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Add
                      </button>
                    </div>
                    
                    {formData.tags && formData.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {formData.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() => handleRemoveTag(tag)}
                              className="ml-2 text-blue-600 hover:text-blue-800"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Media */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Media</h4>
                  
                  {/* Existing Media */}
                  {formData.mediaUrls.length > 0 && (
                    <div className="mb-6">
                      <h5 className="text-sm font-medium text-gray-700 mb-3">Existing Media</h5>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {formData.mediaUrls.map(media => {
                          const isRemoved = removedMediaIds.includes(media._id);
                          
                          return (
                            <div
                              key={media._id}
                              className={`relative border rounded-lg overflow-hidden ${
                                isRemoved ? 'opacity-50' : ''
                              }`}
                            >
                              {media.type === 'video' ? (
                                <div className="aspect-video bg-gray-200">
                                  {media.thumbnail ? (
                                    <img
                                      src={media.thumbnail}
                                      alt={media.filename || 'Video thumbnail'}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M8 5v14l11-7z" />
                                      </svg>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <img
                                  src={media.url}
                                  alt={media.filename || 'Image'}
                                  className="w-full h-32 object-cover"
                                />
                              )}
                              
                              <div className="p-2 bg-white">
                                <p className="text-xs text-gray-600 truncate">
                                  {media.filename || (media.type === 'video' ? 'Video' : 'Image')}
                                </p>
                                <div className="flex justify-between items-center mt-2">
                                  <span className="text-xs px-2 py-1 rounded bg-gray-100">
                                    {media.type}
                                  </span>
                                  {isRemoved ? (
                                    <button
                                      type="button"
                                      onClick={() => handleRestoreMedia(media._id)}
                                      className="text-xs text-green-600 hover:text-green-800"
                                    >
                                      Restore
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveMedia(media._id)}
                                      className="text-xs text-red-600 hover:text-red-800"
                                    >
                                      Remove
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Add New Media */}
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-3">Add New Media</h5>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <input
                        type="file"
                        id="media-upload"
                        multiple
                        accept="image/*,video/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <label htmlFor="media-upload" className="cursor-pointer">
                        <svg className="w-12 h-12 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="mt-2 text-sm text-gray-600">
                          Click to upload images or videos
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          PNG, JPG, GIF, MP4, MOV up to 100MB
                        </p>
                      </label>
                    </div>

                    {/* Selected Files Preview */}
                    {selectedFiles.length > 0 && (
                      <div className="mt-4">
                        <h6 className="text-sm font-medium text-gray-700 mb-2">Selected Files</h6>
                        <div className="space-y-2">
                          {selectedFiles.map((file, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                            >
                              <div className="flex items-center">
                                <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                </svg>
                                <div>
                                  <p className="text-sm font-medium text-gray-900 truncate max-w-xs">
                                    {file.name}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {(file.size / 1024 / 1024).toFixed(2)} MB
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveSelectedFile(index)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Additional Information */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Additional Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Stock Quantity
                      </label>
                      <input
                        type="number"
                        name="stockQuantity"
                        value={formData.stockQuantity || ''}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Unlimited"
                        min="0"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Shipping Cost (INR)
                      </label>
                      <input
                        type="number"
                        name="shippingCost"
                        value={formData.shippingCost || ''}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Delivery Time
                      </label>
                      <input
                        type="text"
                        name="deliveryTime"
                        value={formData.deliveryTime || ''}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="3-5 business days"
                      />
                    </div>

                    <div>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          name="returnsAccepted"
                          checked={formData.returnsAccepted || false}
                          onChange={handleInputChange}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">Returns Accepted</span>
                      </label>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        License Type
                      </label>
                      <select
                        name="licenseType"
                        value={formData.licenseType || ''}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select license type</option>
                        {licenseTypes.map(type => (
                          <option key={type} value={type}>
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          name="isDigital"
                          checked={formData.isDigital || false}
                          onChange={handleInputChange}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">Digital Product</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Warranty & Usage Rights */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Warranty
                    </label>
                    <input
                      type="text"
                      name="warranty"
                      value={formData.warranty || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., 1 year warranty"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Usage Rights
                    </label>
                    <input
                      type="text"
                      name="usageRights"
                      value={formData.usageRights || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Usage rights description"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Updating...
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