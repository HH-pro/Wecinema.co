import React, { useState } from 'react';
import { FiX, FiTag, FiDollarSign, FiType, FiFolder, FiPlus, FiHash } from 'react-icons/fi';

interface CreateListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (listingData: ListingFormData) => void;
  loading?: boolean;
}

export interface ListingFormData {
  title: string;
  description: string;
  price: number;
  type: string;
  category: string;
  tags: string[];
}

const CreateListingModal: React.FC<CreateListingModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  loading = false
}) => {
  const [formData, setFormData] = useState<ListingFormData>({
    title: '',
    description: '',
    price: 0,
    type: 'for_sale',
    category: '',
    tags: []
  });

  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const newErrors: { [key: string]: string } = {};
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (formData.price <= 0) newErrors.price = 'Price must be greater than 0';
    if (!formData.type) newErrors.type = 'Please select a listing type';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    onSubmit(formData);
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  const clearError = (field: string) => {
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl transform transition-all">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Create New Listing</h2>
              <p className="text-gray-600 mt-1">Sell your digital content to the community</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              disabled={loading}
            >
              <FiX size={24} className="text-gray-500" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            {/* Title */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <FiType className="mr-2" size={16} />
                Listing Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, title: e.target.value }));
                  clearError('title');
                }}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 ${
                  errors.title ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter a compelling title for your listing..."
                required
              />
              {errors.title && (
                <p className="text-red-600 text-sm mt-1 flex items-center">
                  {errors.title}
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <FiFolder className="mr-2" size={16} />
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 resize-none"
                placeholder="Describe your content in detail. What makes it unique? What can buyers expect?"
              />
              <p className="text-gray-500 text-sm mt-1">
                {formData.description.length}/500 characters
              </p>
            </div>

            {/* Price & Type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Price */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <FiDollarSign className="mr-2" size={16} />
                  Price ($) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    value={formData.price || ''}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, price: Number(e.target.value) }));
                      clearError('price');
                    }}
                    min="0"
                    step="0.01"
                    className={`w-full pl-8 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 ${
                      errors.price ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="0.00"
                    required
                  />
                </div>
                {errors.price && (
                  <p className="text-red-600 text-sm mt-1">{errors.price}</p>
                )}
              </div>

              {/* Type */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <FiType className="mr-2" size={16} />
                  Listing Type *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, type: e.target.value }));
                    clearError('type');
                  }}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 ${
                    errors.type ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="for_sale">For Sale</option>
                  <option value="licensing">Licensing</option>
                  <option value="adaptation_rights">Adaptation Rights</option>
                  <option value="commission">Commission</option>
                </select>
                {errors.type && (
                  <p className="text-red-600 text-sm mt-1">{errors.type}</p>
                )}
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <FiFolder className="mr-2" size={16} />
                Category
              </label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                placeholder="e.g., Video Production, Script Writing, Music Composition"
              />
            </div>

            {/* Tags */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <FiHash className="mr-2" size={16} />
                Tags
              </label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={handleTagKeyPress}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                  placeholder="Add relevant tags (press Enter to add)"
                />
                <button
                  type="button"
                  onClick={addTag}
                  disabled={!tagInput.trim()}
                  className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiPlus size={18} />
                </button>
              </div>
              
              {/* Tags List */}
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                    >
                      <FiTag size={12} />
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="hover:text-blue-900 focus:outline-none"
                      >
                        <FiX size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              
              <p className="text-gray-500 text-sm mt-2">
                Add tags to help buyers find your listing (e.g., video, animation, script, etc.)
              </p>
            </div>
          </form>

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors duration-200 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Creating...
                </>
              ) : (
                <>
                  <FiPlus size={18} />
                  Create Listing
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateListingModal;