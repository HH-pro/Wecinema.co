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
    setTimeout(() => setIsAnimating(false), 500);
  };

  return (
    <div className={`analytics-wrapper ${showGraphs ? 'expanded' : 'collapsed'}`}>
      
      {/* Minimalist Bar (When Collapsed) */}
      {!showGraphs && (
        <div className="minimalist-bar">
          <div className="bar-content">
            <div className="bar-left">
              <div className="bar-icon">
                <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="bar-text">
                <span className="bar-title">Analytics</span>
                <span className="bar-subtitle">Click to view insights</span>
              </div>
            </div>
            
            <button 
              className="minimalist-toggle-btn"
              onClick={handleToggle}
              aria-label="Show analytics graphs"
              title="Show Analytics"
            >
              <span className="toggle-text">Show</span>
              <svg className="toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          
          {/* Progress Indicators (Mini preview) */}
          <div className="bar-indicators">
            <div className="indicator">
              <div className="indicator-bar" style={{ width: '75%' }}>
                <div className="indicator-fill"></div>
              </div>
              <span className="indicator-label">Genres</span>
            </div>
            <div className="indicator">
              <div className="indicator-bar" style={{ width: '60%' }}>
                <div className="indicator-fill"></div>
              </div>
              <span className="indicator-label">Themes</span>
            </div>
            <div className="indicator">
              <div className="indicator-bar" style={{ width: '85%' }}>
                <div className="indicator-fill"></div>
              </div>
              <span className="indicator-label">Ratings</span>
            </div>
          </div>
        </div>
      )}

      {/* Expanded Analytics Section */}
      {showGraphs && (
        <div className={`analytics-section ${isAnimating ? 'animating' : ''}`}>
          
          {/* Minimalist Header */}
          <div className="analytics-header-minimal">
            <div className="minimal-header-left">
              <div className="minimal-icon">
                <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h2 className="minimal-title">Analytics Dashboard</h2>
                <p className="minimal-subtitle">Data visualization & insights</p>
              </div>
            </div>
            
            <button 
              className="minimal-close-btn"
              onClick={handleToggle}
              aria-label="Hide analytics graphs"
              title="Hide Analytics"
            >
              <span className="close-text">Hide</span>
              <svg className="close-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
          </div>

          {/* Graphs Container */}
          <div className="graphs-container">
            <Charts />
          </div>

          {/* Minimalist Footer */}
          <div className="minimal-footer">
            <div className="footer-info">
              <span className="info-item">
                <span className="info-dot" style={{ backgroundColor: '#3b82f6' }}></span>
                Last updated: Just now
              </span>
              <span className="info-item">
                <span className="info-dot" style={{ backgroundColor: '#10b981' }}></span>
                330 days data
              </span>
            </div>
            <div className="footer-actions">
              <button className="export-mini-btn" title="Export data">
                <svg className="export-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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