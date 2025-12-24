import React, { useState } from "react";
import Charts from "./Charts";
import "./Analytics.css";

interface AnalyticsSectionProps {
  title?: string;
}

const AnalyticsSection: React.FC<AnalyticsSectionProps> = ({ 
  title = "Analytics" 
}) => {
  const [showGraphs, setShowGraphs] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleToggle = () => {
    setIsAnimating(true);
    setShowGraphs(!showGraphs);
    setTimeout(() => setIsAnimating(false), 400);
  };

  return (
    <div className={`analytics-wrapper ${showGraphs ? 'expanded' : 'collapsed'}`}>
      
      {/* Stylish Compact Bar (When Collapsed) */}
      {!showGraphs && (
        <div className="stylish-compact-bar">
          <div className="stylish-bar-content">
            <div className="stylish-bar-left">
              <div className="stylish-bar-icon">
                <div className="icon-wrapper">
                  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <div className="icon-glow"></div>
                </div>
              </div>
              <div className="stylish-bar-text">
                <span className="stylish-bar-title">
                  <span className="title-icon">📈</span>
                  Analytics Insights
                </span>
                <span className="stylish-bar-subtitle">Visualize trends & patterns</span>
              </div>
            </div>
            
            <button 
              className="stylish-toggle-btn"
              onClick={handleToggle}
              aria-label="Show analytics graphs"
              title="Show Analytics Dashboard"
            >
              <span className="toggle-content">
                <span className="toggle-text">Explore</span>
                <div className="arrow-animation">
                  <svg className="toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
              </span>
              <span className="btn-glow"></span>
            </button>
          </div>
          
          {/* Mini Stats Preview */}
          <div className="mini-preview">
            <div className="preview-item">
              <span className="preview-dot" style={{ backgroundColor: '#3b82f6' }}></span>
              <span className="preview-value">3 Charts</span>
            </div>
            <div className="preview-divider"></div>
            <div className="preview-item">
              <span className="preview-dot" style={{ backgroundColor: '#10b981' }}></span>
              <span className="preview-value">Live Data</span>
            </div>
            <div className="preview-divider"></div>
            <div className="preview-item">
              <span className="preview-dot" style={{ backgroundColor: '#f59e0b' }}></span>
              <span className="preview-value">Interactive</span>
            </div>
          </div>
          
          {/* Subtle Pulse Effect */}
          <div className="pulse-effect"></div>
        </div>
      )}

      {/* Stylish Expanded Section */}
      {showGraphs && (
        <div className={`stylish-analytics-section ${isAnimating ? 'animating' : ''}`}>
          
          {/* Elegant Header */}
          <div className="elegant-header">
            <div className="header-content">
              <div className="header-icon-title">
                <div className="elegant-icon">
                  <div className="icon-bg"></div>
                  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="header-text">
                  <h2 className="elegant-title">Analytics Dashboard</h2>
                  <p className="elegant-subtitle">Real-time insights & visualization</p>
                </div>
              </div>
              
              <button 
                className="elegant-close-btn"
                onClick={handleToggle}
                aria-label="Hide analytics graphs"
                title="Close Analytics"
              >
                <span className="close-content">
                  <span className="close-text">Collapse</span>
                  <svg className="close-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                  </svg>
                </span>
              </button>
            </div>
            
            {/* Header Gradient Line */}
            <div className="header-gradient"></div>
          </div>

          {/* Compact Charts Container */}
          <div className="compact-charts-wrapper">
            <div className="charts-intro">
              <h3 className="intro-title">Visual Analytics</h3>
              <p className="intro-subtitle">Interactive charts showing trends over time</p>
            </div>
            
            <Charts />
          </div>

          {/* Stylish Footer */}
          <div className="stylish-footer">
            <div className="footer-left">
              <div className="legend-container">
                <span className="legend-title">Legend</span>
                <div className="legend-dots">
                  <span className="legend-dot" style={{ backgroundColor: '#3b82f6' }}></span>
                  <span className="legend-dot" style={{ backgroundColor: '#10b981' }}></span>
                  <span className="legend-dot" style={{ backgroundColor: '#f59e0b' }}></span>
                  <span className="legend-dot" style={{ backgroundColor: '#8b5cf6' }}></span>
                </div>
              </div>
            </div>
            
            <div className="footer-right">
              <span className="data-info">
                <span className="info-icon">⏱️</span>
                <span className="info-text">Last 330 days</span>
              </span>
              <button className="refresh-mini-btn" title="Refresh data">
                <svg className="refresh-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsSection;