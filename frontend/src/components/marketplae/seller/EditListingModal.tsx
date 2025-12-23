// src/components/marketplace/seller/EditListingModal.tsx
import React, { useState, useEffect } from 'react';
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
    type: '',
    category: '',
    tags: '',
    mediaUrls: '',
  });
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const listingTypes = ['product', 'service', 'rental', 'event', 'job', 'other'];
  const categories = [
    'electronics',
    'fashion',
    'home & garden',
    'vehicles',
    'real estate',
    'services',
    'jobs',
    'events',
    'education',
    'health',
    'sports',
    'hobbies',
    'other'
  ];

  useEffect(() => {
    if (listing) {
      setFormData({
        title: listing.title || '',
        description: listing.description || '',
        price: listing.price ? listing.price.toString() : '',
        type: listing.type || '',
        category: listing.category || '',
        tags: listing.tags ? listing.tags.join(', ') : '',
        mediaUrls: listing.mediaUrls ? listing.mediaUrls.join(', ') : '',
      });
      setErrors({});
    }
  }, [listing]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    // Title validation (required)
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    // Description validation (required)
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }
    
    // Price validation (required)
    if (!formData.price) {
      newErrors.price = 'Price is required';
    } else {
      const priceNum = parseFloat(formData.price);
      if (isNaN(priceNum) || priceNum <= 0) {
        newErrors.price = 'Price must be a positive number';
      }
    }
    
    // Type validation (required)
    if (!formData.type) {
      newErrors.type = 'Type is required';
    }
    
    // Category validation (required)
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
    
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !listing) {
      return;
    }
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${process.env.REACT_APP_API_URL}/api/marketplace/listing/${listing._id}`,
        {
          title: formData.title.trim(),
          description: formData.description.trim(),
          price: parseFloat(formData.price),
          type: formData.type,
          category: formData.category,
          tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
          mediaUrls: formData.mediaUrls.split(',').map(url => url.trim()).filter(url => url),
        },
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
        // Handle server validation errors
        const serverErrors = error.response.data.details;
        if (typeof serverErrors === 'object') {
          setErrors(serverErrors);
        } else if (Array.isArray(serverErrors)) {
          toast.error(serverErrors.join(', '));
        } else {
          toast.error(error.response.data.error || 'Failed to update listing');
        }
      } else {
        toast.error(error.message || 'Failed to update listing');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !listing) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>

        {/* Modal panel */}
        <div className="inline-block w-full max-w-2xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
          <div className="px-6 pt-5 pb-4 bg-gradient-to-r from-blue-50 to-white border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Edit Listing</h3>
                <p className="text-sm text-gray-600 mt-1">Update your listing details</p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="px-6 py-5 space-y-6">
              {/* Title Field */}
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
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:outline-none transition-all ${
                    errors.title 
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                  placeholder="Enter listing title"
                />
                {errors.title && (
                  <p className="mt-2 text-sm text-red-600">{errors.title}</p>
                )}
              </div>

              {/* Description Field */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:outline-none transition-all ${
                    errors.description 
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                  placeholder="Describe your listing in detail"
                />
                {errors.description && (
                  <p className="mt-2 text-sm text-red-600">{errors.description}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Price Field */}
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
                    step="0.01"
                    min="0"
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:outline-none transition-all ${
                      errors.price 
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                        : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                    }`}
                    placeholder="0.00"
                  />
                  {errors.price && (
                    <p className="mt-2 text-sm text-red-600">{errors.price}</p>
                  )}
                </div>

                {/* Type Field */}
                <div>
                  <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
                    Type *
                  </label>
                  <select
                    id="type"
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:outline-none transition-all ${
                      errors.type 
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                        : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                    }`}
                  >
                    <option value="">Select Type</option>
                    {listingTypes.map(type => (
                      <option key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </option>
                    ))}
                  </select>
                  {errors.type && (
                    <p className="mt-2 text-sm text-red-600">{errors.type}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Category Field */}
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:outline-none transition-all ${
                      errors.category 
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                        : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                    }`}
                  >
                    <option value="">Select Category</option>
                    {categories.map(category => (
                      <option key={category} value={category}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </option>
                    ))}
                  </select>
                  {errors.category && (
                    <p className="mt-2 text-sm text-red-600">{errors.category}</p>
                  )}
                </div>

                {/* Tags Field */}
                <div>
                  <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
                    Tags
                  </label>
                  <input
                    type="text"
                    id="tags"
                    name="tags"
                    value={formData.tags}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all"
                    placeholder="tag1, tag2, tag3"
                  />
                  <p className="mt-2 text-xs text-gray-500">Separate tags with commas</p>
                </div>
              </div>

              {/* Media URLs Field */}
              <div>
                <label htmlFor="mediaUrls" className="block text-sm font-medium text-gray-700 mb-2">
                  Media URLs
                </label>
                <input
                  type="text"
                  id="mediaUrls"
                  name="mediaUrls"
                  value={formData.mediaUrls}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all"
                  placeholder="https://example.com/image1.jpg, https://example.com/video.mp4"
                />
                <p className="mt-2 text-xs text-gray-500">
                  Enter comma-separated URLs for images or videos. First image/video will be shown as thumbnail.
                </p>
              </div>

              {/* Current Media Preview */}
              {listing.mediaUrls && listing.mediaUrls.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Media ({listing.mediaUrls.length})
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {listing.mediaUrls.slice(0, 4).map((url, index) => (
                      <div key={index} className="relative h-20 rounded-lg overflow-hidden">
                        {url.toLowerCase().endsWith('.mp4') || 
                         url.toLowerCase().endsWith('.mov') ? (
                          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                            <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </div>
                        ) : (
                          <img
                            src={url}
                            alt={`Media ${index + 1}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150';
                            }}
                          />
                        )}
                      </div>
                    ))}
                    {listing.mediaUrls.length > 4 && (
                      <div className="h-20 bg-gray-100 rounded-lg flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-600">
                          +{listing.mediaUrls.length - 4} more
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
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
                className="px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="w-4 h-4 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Updating...
                  </span>
                ) : (
                  'Update Listing'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditListingModal;