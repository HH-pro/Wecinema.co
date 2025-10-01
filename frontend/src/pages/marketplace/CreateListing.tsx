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
        {/* Browser-style header */}
        <div className="browser-header">
          <div className="browser-controls">
            <div className="control close"></div>
            <div className="control minimize"></div>
            <div className="control maximize"></div>
          </div>
          <div className="browser-url">
            <span>marketplace://create-listing</span>
          </div>
        </div>

        {/* Content area with browser styling */}
        <div className="browser-content">
          <div className="page-header">
            <h1>Create New Listing</h1>
            <p>Sell your digital content to the community</p>
          </div>

          <form onSubmit={handleSubmit} className="listing-form">
            <div className="form-section">
              <div className="section-header">
                <h3>Basic Information</h3>
                <div className="section-divider"></div>
              </div>
              
              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  required
                  placeholder="Enter a descriptive title"
                  className="browser-input"
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  placeholder="Describe your content in detail..."
                  className="browser-textarea"
                />
              </div>
            </div>

            <div className="form-section">
              <div className="section-header">
                <h3>Pricing & Type</h3>
                <div className="section-divider"></div>
              </div>
              
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
                    className="browser-input"
                  />
                </div>

                <div className="form-group">
                  <label>Listing Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                    className="browser-select"
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
                  className="browser-input"
                />
              </div>
            </div>

            <div className="form-section">
              <div className="section-header">
                <h3>Media Files</h3>
                <div className="section-divider"></div>
              </div>
              <div className="form-group">
                <label>Upload Images/Videos</label>
                <div className="file-upload-area">
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={handleFileChange}
                    className="browser-file-input"
                  />
                  <div className="upload-placeholder">
                    <span>📁 Drag & drop files or click to browse</span>
                    <small>Supports images and videos</small>
                  </div>
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button 
                type="button" 
                onClick={() => navigate('/marketplace')}
                className="btn btn-secondary browser-btn"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={loading}
                className="btn btn-primary browser-btn"
              >
                {loading ? 'Creating...' : 'Create Listing'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <style jsx>{`
        .create-listing-page {
          background: #f5f5f5;
          min-height: 100vh;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .browser-header {
          background: #e8e8e8;
          border-bottom: 1px solid #d0d0d0;
          padding: 12px 16px;
          display: flex;
          align-items: center;
          gap: 16px;
          border-radius: 8px 8px 0 0;
        }

        .browser-controls {
          display: flex;
          gap: 8px;
        }

        .control {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          cursor: pointer;
        }

        .control.close {
          background: #ff5f57;
        }

        .control.minimize {
          background: #ffbd2e;
        }

        .control.maximize {
          background: #28ca42;
        }

        .browser-url {
          flex: 1;
          background: white;
          padding: 4px 12px;
          border-radius: 4px;
          border: 1px solid #d0d0d0;
          font-size: 12px;
          color: #666;
        }

        .browser-content {
          background: white;
          margin: 0;
          padding: 24px;
          border-radius: 0 0 8px 8px;
          border: 1px solid #d0d0d0;
          border-top: none;
        }

        .page-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .page-header h1 {
          font-size: 28px;
          font-weight: 600;
          color: #1a1a1a;
          margin: 0 0 8px 0;
        }

        .page-header p {
          color: #666;
          margin: 0;
          font-size: 16px;
        }

        .listing-form {
          max-width: 600px;
          margin: 0 auto;
        }

        .form-section {
          background: #fafafa;
          border: 1px solid #e1e1e1;
          border-radius: 6px;
          padding: 20px;
          margin-bottom: 24px;
        }

        .section-header {
          margin-bottom: 20px;
        }

        .section-header h3 {
          font-size: 18px;
          font-weight: 600;
          color: #333;
          margin: 0 0 8px 0;
        }

        .section-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent 0%, #e1e1e1 50%, transparent 100%);
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        label {
          display: block;
          font-weight: 500;
          color: #333;
          margin-bottom: 6px;
          font-size: 14px;
        }

        .browser-input,
        .browser-textarea,
        .browser-select {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #d0d0d0;
          border-radius: 4px;
          font-size: 14px;
          background: white;
          transition: all 0.2s ease;
        }

        .browser-input:focus,
        .browser-textarea:focus,
        .browser-select:focus {
          outline: none;
          border-color: #007acc;
          box-shadow: 0 0 0 2px rgba(0, 122, 204, 0.2);
        }

        .browser-textarea {
          resize: vertical;
          min-height: 80px;
          font-family: inherit;
        }

        .browser-select {
          cursor: pointer;
        }

        .file-upload-area {
          position: relative;
          border: 2px dashed #d0d0d0;
          border-radius: 6px;
          padding: 32px;
          text-align: center;
          transition: all 0.2s ease;
        }

        .file-upload-area:hover {
          border-color: #007acc;
          background: #f8fbff;
        }

        .browser-file-input {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          opacity: 0;
          cursor: pointer;
        }

        .upload-placeholder {
          pointer-events: none;
        }

        .upload-placeholder span {
          display: block;
          font-size: 16px;
          color: #666;
          margin-bottom: 8px;
        }

        .upload-placeholder small {
          color: #999;
          font-size: 12px;
        }

        .form-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          padding-top: 24px;
          border-top: 1px solid #e1e1e1;
        }

        .browser-btn {
          padding: 10px 20px;
          border: 1px solid #d0d0d0;
          border-radius: 4px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-secondary {
          background: #f5f5f5;
          color: #333;
        }

        .btn-secondary:hover {
          background: #e8e8e8;
          border-color: #b0b0b0;
        }

        .btn-primary {
          background: #007acc;
          color: white;
          border-color: #007acc;
        }

        .btn-primary:hover:not(:disabled) {
          background: #005a9e;
          border-color: #005a9e;
        }

        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .browser-content {
            padding: 16px;
          }

          .form-row {
            grid-template-columns: 1fr;
          }

          .form-actions {
            flex-direction: column;
          }

          .browser-btn {
            width: 100%;
          }
        }
      `}</style>
    </MarketplaceLayout>
  );
};

export default CreateListing;