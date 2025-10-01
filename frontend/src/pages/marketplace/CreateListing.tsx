import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import MarketplaceLayout from '../../components/Layout/MarketplaceLayout';
import '../../css/Creatinglisting.css';

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
  const location = useLocation();
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

  const ProfessionalHeader = () => (
    <header className="professional-header">
      <div className="header-content">
        <nav className="nav-container">
          <div className="logo-section">
            <Link to="/" className="logo">
              Market<span className="logo-accent">Hub</span>
            </Link>
          </div>
          
          <div className="nav-links">
            <Link 
              to="/marketplace" 
              className={`nav-link ${location.pathname === '/marketplace' ? 'active' : ''}`}
            >
              Browse
            </Link>
            <Link 
              to="/create-listing" 
              className={`nav-link ${location.pathname === '/create-listing' ? 'active' : ''}`}
            >
              Create Listing
            </Link>
            <Link 
              to="/my-listings" 
              className="nav-link"
            >
              My Listings
            </Link>
            <Link 
              to="/analytics" 
              className="nav-link"
            >
              Analytics
            </Link>
          </div>

          <div className="user-section">
            <div className="user-avatar">
              JD
            </div>
          </div>
        </nav>
      </div>
    </header>
  );

  const FilePreview = () => {
    if (formData.mediaFiles.length === 0) return null;

    return (
      <div className="file-preview">
        {formData.mediaFiles.map((file, index) => (
          <div key={index} className="file-item">
            <div className="file-icon">
              {file.type.startsWith('image/') ? '🖼️' : '🎥'}
            </div>
            <div className="file-info">
              <div className="file-name">{file.name}</div>
              <div className="file-size">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <MarketplaceLayout>
      <ProfessionalHeader />
      <div className="create-listing-page">
        <div className="main-content">
          <div className="page-header">
            <h1>Create New Listing</h1>
            <p>Sell your digital content to the community with our professional marketplace</p>
          </div>

          <form onSubmit={handleSubmit} className="listing-form">
            <div className="form-section">
              <div className="section-header">
                <h3>Basic Information</h3>
                <p className="section-description">
                  Provide essential details about your digital content
                </p>
              </div>
              
              <div className="form-group">
                <label className="required">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  required
                  placeholder="Enter a clear and descriptive title"
                  className="professional-input"
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  placeholder="Describe your content in detail, including features, specifications, and usage rights..."
                  className="professional-textarea"
                />
              </div>
            </div>

            <div className="form-section">
              <div className="section-header">
                <h3>Pricing & Type</h3>
                <p className="section-description">
                  Set your pricing and define the listing type
                </p>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label className="required">Price ($)</label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: Number(e.target.value) }))}
                    min="0"
                    step="0.01"
                    required
                    className="professional-input"
                  />
                </div>

                <div className="form-group">
                  <label className="required">Listing Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                    className="professional-select"
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
                  placeholder="e.g., Video Template, Music Track, Digital Art, 3D Model"
                  className="professional-input"
                />
              </div>
            </div>

            <div className="form-section">
              <div className="section-header">
                <h3>Media Files</h3>
                <p className="section-description">
                  Upload preview images or videos to showcase your content
                </p>
              </div>
              <div className="form-group">
                <label>Upload Preview Files</label>
                <div className="file-upload-area">
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={handleFileChange}
                    className="professional-file-input"
                  />
                  <div className="upload-placeholder">
                    <div className="upload-icon">📁</div>
                    <span>Drag & drop files or click to browse</span>
                    <small>Supports images (PNG, JPG) and videos (MP4, MOV) up to 100MB</small>
                  </div>
                </div>
                <FilePreview />
              </div>
            </div>

            <div className="form-actions">
              <button 
                type="button" 
                onClick={() => navigate('/marketplace')}
                className="professional-btn btn-secondary"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={loading}
                className="professional-btn btn-primary"
              >
                {loading ? (
                  <>
                    <div className="loading-spinner"></div>
                    Creating Listing...
                  </>
                ) : (
                  'Publish Listing'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </MarketplaceLayout>
  );
};

export default CreateListing;