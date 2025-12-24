import React, { useState } from "react";
import Charts from "./Charts";
import "./Analytics.css";

interface AnalyticsSectionProps {
  title?: string;
}

const AnalyticsSection: React.FC<AnalyticsSectionProps> = ({ 
  title = "Analytics Dashboard" 
}) => {
  const [showGraphs, setShowGraphs] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleToggle = () => {
    setIsAnimating(true);
    setShowGraphs(!showGraphs);
    setTimeout(() => setIsAnimating(false), 500);
  };

  return (
    <div className={`analytics-wrapper ${showGraphs ? 'expanded' : 'collapsed'}`}>
      
      {/* Minimalist Bar with Yellow Theme (When Collapsed) */}
      {!showGraphs && (
        <div className="minimalist-bar-yellow">
          <div className="bar-content">
            <div className="bar-left">
              <div className="bar-icon-yellow">
                <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="bar-text">
                <span className="bar-title-yellow">📊 Analytics Insights</span>
                <span className="bar-subtitle-yellow">Click to discover trends & patterns</span>
              </div>
            </div>
            
            <button 
              className="minimalist-toggle-btn-yellow"
              onClick={handleToggle}
              aria-label="Show analytics graphs"
              title="Show Analytics Dashboard"
            >
              <span className="toggle-text">Explore Data</span>
              <div className="arrow-container">
                <svg className="arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                </svg>
              </div>
            </button>
          </div>
          
          {/* Quick Stats Preview */}
          <div className="stats-preview-yellow">
            <div className="preview-item">
              <div className="preview-icon">🎬</div>
              <div>
                <span className="preview-label">Top Genre</span>
                <span className="preview-value">Action</span>
              </div>
            </div>
            <div className="preview-divider"></div>
            <div className="preview-item">
              <div className="preview-icon">🔥</div>
              <div>
                <span className="preview-label">Trending</span>
                <span className="preview-value">Drama +28%</span>
              </div>
            </div>
            <div className="preview-divider"></div>
            <div className="preview-item">
              <div className="preview-icon">⭐</div>
              <div>
                <span className="preview-label">Avg Rating</span>
                <span className="preview-value">4.7/5</span>
              </div>
            </div>
          </div>
          
          {/* Sparkle Effect */}
          <div className="sparkle sparkle-1">✨</div>
          <div className="sparkle sparkle-2">✨</div>
          <div className="sparkle sparkle-3">✨</div>
        </div>
      )}

      {/* Expanded Analytics Section */}
      {showGraphs && (
        <div className={`analytics-section ${isAnimating ? 'animating' : ''}`}>
          
          {/* Modern Header */}
          <div className="analytics-header-modern">
            <div className="header-left">
              <div className="header-icon-wrapper">
                <div className="header-icon">
                  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="pulse-ring"></div>
              </div>
              <div className="header-text">
                <h2 className="modern-title">Analytics Dashboard</h2>
                <p className="modern-subtitle">Real-time insights & data visualization</p>
              </div>
            </div>
            
            <div className="header-actions">
              <div className="header-badge">
                <span className="badge-dot"></span>
                <span className="badge-text">Live Data</span>
              </div>
              <button 
                className="modern-close-btn"
                onClick={handleToggle}
                aria-label="Hide analytics graphs"
                title="Hide Analytics"
              >
                <span className="close-text">Collapse</span>
                <svg className="close-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Graphs Container */}
          <div className="graphs-container-modern">
            <div className="graphs-intro">
              <h3 className="intro-title">Visual Insights</h3>
              <p className="intro-subtitle">Interactive charts showing trends over the last 330 days</p>
              <div className="intro-tags">
                <span className="tag">Real-time</span>
                <span className="tag">Interactive</span>
                <span className="tag">Filterable</span>
              </div>
            </div>
            
            <Charts />
          </div>

          {/* Modern Footer */}
          <div className="modern-footer">
            <div className="footer-stats">
              <div className="footer-stat">
                <span className="stat-number">3</span>
                <span className="stat-label">Charts</span>
              </div>
              <div className="footer-stat">
                <span className="stat-number">330</span>
                <span className="stat-label">Days Data</span>
              </div>
              <div className="footer-stat">
                <span className="stat-number">24/7</span>
                <span className="stat-label">Updated</span>
              </div>
            </div>
            
            <div className="footer-actions-modern">
              <button className="action-btn refresh-btn" title="Refresh data">
                <svg className="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
              <button className="action-btn export-btn-modern" title="Export data">
                <svg className="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsSection;