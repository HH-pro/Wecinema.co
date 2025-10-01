import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MarketplaceLayout from '../../components/Layout';
import { FiUpload, FiDollarSign, FiType, FiFolder, FiTag, FiArrowLeft } from 'react-icons/fi';

interface ListingFormData {
  title: string;
  description: string;
  price: number;
  type: string;
  category: string;
  tags: string[];
  mediaFiles: File[];
}

const CreateListing: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(false);
  const [formData, setFormData] = useState<ListingFormData>({
    title: '',
    description: '',
    price: 0,
    type: 'for_sale',
    category: '',
    tags: [],
    mediaFiles: []
  });
  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validation
    const newErrors: { [key: string]: string } = {};
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (formData.price <= 0) newErrors.price = 'Price must be greater than 0';
    if (!formData.type) newErrors.type = 'Please select a listing type';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setLoading(false);
      return;
    }

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('price', formData.price.toString());
      formDataToSend.append('type', formData.type);
      formDataToSend.append('category', formData.category);
      formData.tags.forEach(tag => formDataToSend.append('tags', tag));
      formData.mediaFiles.forEach(file => formDataToSend.append('media', file));

      const response = await fetch('http://localhost:3000/api/marketplace/marketplace/create-listing', {
        method: 'POST',
        body: formDataToSend,
      });

      if (response.ok) {
        navigate('/marketplace');
      } else {
        console.error('Failed to create listing');
      }
    } catch (error) {
      console.error('Error creating listing:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFormData(prev => ({
        ...prev,
        mediaFiles: Array.from(e.target.files!)
      }));
    }
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

  return (
    <MarketplaceLayout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header with Back Navigation */}
          <div className="mb-8">
            <button
              onClick={() => navigate('/marketplace')}
              className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors duration-200"
            >
              <FiArrowLeft className="mr-2" size={20} />
              Back to Marketplace
            </button>
            
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Create New Listing
                </h1>
                <p className="text-gray-600 text-lg">
                  Sell your digital content to the community
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Basic Information Section */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                    <FiType className="mr-3 text-blue-600" size={24} />
                    Basic Information
                  </h3>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
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
                        <p className="text-red-600 text-sm mt-1">{errors.title}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
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
                        {formData.description.length}/1000 characters
                      </p>
                    </div>
                  </div>
                </div>

                {/* Pricing & Type Section */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                    <FiDollarSign className="mr-3 text-green-600" size={24} />
                    Pricing & Type
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
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

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
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

                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                </div>

                {/* Tags Section */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                    <FiTag className="mr-3 text-purple-600" size={24} />
                    Tags & Keywords
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="flex gap-2">
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
                        className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Add
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
                              className="hover:text-blue-900 focus:outline-none ml-1"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    
                    <p className="text-gray-500 text-sm">
                      Add tags to help buyers find your listing (e.g., video, animation, script, etc.)
                    </p>
                  </div>
                </div>

                {/* Media Files Section */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                    <FiUpload className="mr-3 text-orange-600" size={24} />
                    Media Files
                  </h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Upload Preview Images/Videos
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors duration-200">
                      <FiUpload className="mx-auto text-gray-400 mb-4" size={48} />
                      <p className="text-gray-600 mb-2">
                        Drag and drop files here, or click to browse
                      </p>
                      <input
                        type="file"
                        multiple
                        accept="image/*,video/*"
                        onChange={handleFileChange}
                        className="hidden"
                        id="media-upload"
                      />
                      <label
                        htmlFor="media-upload"
                        className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 cursor-pointer"
                      >
                        Choose Files
                      </label>
                      <p className="text-gray-500 text-sm mt-2">
                        Supported formats: JPG, PNG, GIF, MP4, MOV. Max 10 files.
                      </p>
                    </div>
                    
                    {formData.mediaFiles.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">
                          Selected files ({formData.mediaFiles.length}):
                        </p>
                        <div className="space-y-2">
                          {formData.mediaFiles.map((file, index) => (
                            <div key={index} className="flex items-center justify-between bg-white px-4 py-2 rounded-lg border">
                              <span className="text-sm text-gray-700">{file.name}</span>
                              <span className="text-xs text-gray-500">
                                {(file.size / (1024 * 1024)).toFixed(2)} MB
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex flex-col sm:flex-row gap-4 justify-end pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => navigate('/marketplace')}
                    disabled={loading}
                    className="px-8 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors duration-200 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Creating Listing...
                      </>
                    ) : (
                      <>
                        <FiUpload size={18} />
                        Create Listing
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </MarketplaceLayout>
  );
};

export default CreateListing;