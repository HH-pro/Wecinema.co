import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MarketplaceLayout from '../../components/Layout/MarketplaceLayout';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('price', formData.price.toString());
      formDataToSend.append('type', formData.type);
      formDataToSend.append('category', formData.category);
      formData.tags.forEach(tag => formDataToSend.append('tags', tag));
      formData.mediaFiles.forEach(file => formDataToSend.append('media', file));

      const response = await fetch('/api/marketplace/create-listing', {
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

  return (
    <MarketplaceLayout>
      <div className="create-listing-page">
        <div className="page-header">
          <h1>Create New Listing</h1>
          <p>Sell your digital content to the community</p>
        </div>

        <form onSubmit={handleSubmit} className="listing-form">
          <div className="form-section">
            <h3>Basic Information</h3>
            
            <div className="form-group">
              <label>Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                required
                placeholder="Enter a descriptive title"
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
                placeholder="Describe your content in detail..."
              />
            </div>
          </div>

          <div className="form-section">
            <h3>Pricing & Type</h3>
            
            <div className="form-row">
              <div className="form-group">
                <label>Price ($) *</label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: Number(e.target.value) }))}
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <div className="form-group">
                <label>Listing Type *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                >
                  <option value="for_sale">For Sale</option>
                  <option value="licensing">Licensing</option>
                  <option value="adaptation_rights">Adaptation Rights</option>
                  <option value="commission">Commission</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Category</label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                placeholder="e.g., Video, Script, Music, Animation"
              />
            </div>
          </div>

          <div className="form-section">
            <h3>Media Files</h3>
            <div className="form-group">
              <label>Upload Images/Videos</label>
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleFileChange}
              />
              <small>Upload preview images or video clips</small>
            </div>
          </div>

          <div className="form-actions">
            <button 
              type="button" 
              onClick={() => navigate('/marketplace')}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? 'Creating...' : 'Create Listing'}
            </button>
          </div>
        </form>
      </div>
    </MarketplaceLayout>
  );
};

export default CreateListing;