// src/components/marketplae/seller/EditListingModal.tsx
import React, { useState, useEffect } from 'react';

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
  listing: Listing;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (data: any) => void;
  loading: boolean;
}

const EditListingModal: React.FC<EditListingModalProps> = ({
  listing,
  isOpen,
  onClose,
  onUpdate,
  loading
}) => {
  const [formData, setFormData] = useState({
    title: listing.title,
    description: listing.description,
    price: listing.price,
    type: listing.type,
    category: listing.category,
    tags: listing.tags.join(', '),
    mediaUrls: listing.mediaUrls.join(', ')
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      setFormData({
        title: listing.title,
        description: listing.description,
        price: listing.price,
        type: listing.type,
        category: listing.category,
        tags: listing.tags.join(', '),
        mediaUrls: listing.mediaUrls.join(', ')
      });
      setErrors({});
    }
  }, [listing, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    
    if (!formData.price || formData.price <= 0) {
      newErrors.price = 'Price must be greater than 0';
    }
    
    if (!formData.type) {
      newErrors.type = 'Type is required';
    }
    
    if (!formData.category.trim()) {
      newErrors.category = 'Category is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    const updatedData = {
      ...formData,
      price: parseFloat(formData.price.toString()),
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
      mediaUrls: formData.mediaUrls.split(',').map(url => url.trim()).filter(url => url)
    };
    
    onUpdate(updatedData);
  };

  const listingTypes = ['product', 'service', 'rental'];
  const categories = [
    'electronics',
    'fashion',
    'home',
    'books',
    'sports',
    'automotive',
    'realestate',
    'services',
    'other'
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>
        
        <div className="inline-block w-full max-w-2xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white rounded-2xl shadow-xl">
          <div className="px-6 pt-6 pb-2">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold leading-6 text-gray-900">
                Edit Listing
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Update your listing information
            </p>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="px-6 py-4">
              <div className="space-y-5">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.title ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter listing title"
                  />
                  {errors.title && (
                    <p className="mt-1 text-sm text-red-600">{errors.title}</p>
                  )}
                </div>
                
                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description *
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={4}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.description ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Describe your listing in detail"
                  />
                  {errors.description && (
                    <p className="mt-1 text-sm text-red-600">{errors.description}</p>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Price */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price (₹) *
                    </label>
                    <input
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleChange}
                      step="0.01"
                      min="0"
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.price ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="0.00"
                    />
                    {errors.price && (
                      <p className="mt-1 text-sm text-red-600">{errors.price}</p>
                    )}
                  </div>
                  
                  {/* Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type *
                    </label>
                    <select
                      name="type"
                      value={formData.type}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.type ? 'border-red-500' : 'border-gray-300'
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
                      <p className="mt-1 text-sm text-red-600">{errors.type}</p>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category *
                    </label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.category ? 'border-red-500' : 'border-gray-300'
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
                      <p className="mt-1 text-sm text-red-600">{errors.category}</p>
                    )}
                  </div>
                  
                  {/* Tags */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tags (comma separated)
                    </label>
                    <input
                      type="text"
                      name="tags"
                      value={formData.tags}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="tag1, tag2, tag3"
                    />
                  </div>
                </div>
                
                {/* Media URLs */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Image URLs (comma separated)
                  </label>
                  <input
                    type="text"
                    name="mediaUrls"
                    value={formData.mediaUrls}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://example.com/image1.jpg, https://example.com/image2.jpg"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Separate multiple URLs with commas
                  </p>
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3 rounded-b-2xl">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading ? (
                  <>
                    <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Updating...
                  </>
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