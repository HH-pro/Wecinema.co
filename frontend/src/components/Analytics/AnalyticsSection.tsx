import React, { useState } from "react";
import Charts from "./Charts";
import "./Analytics.css";

interface AnalyticsSectionProps {
  title?: string;
}

const AnalyticsSection: React.FC<AnalyticsSectionProps> = ({ 
  title = "Platform Analytics" 
}) => {
  const [showGraphs, setShowGraphs] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleToggle = () => {
    setIsAnimating(true);
    setShowGraphs(!showGraphs);
    setTimeout(() => setIsAnimating(false), 500);
  };

  return (
    <div className={`analytics-section ${showGraphs ? 'expanded' : 'collapsed'} ${isAnimating ? 'animating' : ''}`}>
      
      {/* Modern Header with Glass Morphism */}
      <div className="analytics-header-glass">
        <div className="header-content">
          <div className="title-group">
            <h2 className="section-title">
              <span className="title-icon">📈</span>
              {title}
            </h2>
            <p className="section-subtitle">Interactive insights & trends visualization</p>
          </div>
          
          {/* Enhanced Toggle Button */}
          <button 
            className={`toggle-graphs-btn ${showGraphs ? 'active' : ''}`}
            onClick={handleToggle}
            aria-label={showGraphs ? "Hide analytics graphs" : "Show analytics graphs"}
          >
            <span className="btn-icon">
              {showGraphs ? (
                <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              ) : (
                <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </span>
            <span className="btn-text">
              {showGraphs ? 'Hide Analytics' : 'Show Analytics'}
            </span>
            <span className="btn-badge">3 Graphs</span>
          </button>
        </div>

        {/* Quick Stats Preview (Only when collapsed) */}
        {!showGraphs && (
          <div className="stats-preview">
            <div className="preview-item">
              <span className="preview-label">Trending</span>
              <span className="preview-value">Action, Drama</span>
            </div>
            <div className="preview-item">
              <span className="preview-label">Rating</span>
              <span className="preview-value">4.7/5 ⭐</span>
            </div>
            <div className="preview-item">
              <span className="preview-label">Updated</span>
              <span className="preview-value">Just now</span>
            </div>
          </div>
        )}
      </div>

      {/* Animated Graphs Container */}
      <div className={`graphs-container ${showGraphs ? 'visible' : 'hidden'}`}>
        {showGraphs && (
          <>
            {/* Graphs Header */}
            <div className="graphs-header">
              <div className="graphs-title-group">
                <h3 className="graphs-title">Visual Insights</h3>
                <p className="graphs-description">Real-time data visualization for better decisions</p>
              </div>
              <div className="graphs-controls">
                <span className="data-info">
                  <span className="info-icon">🔄</span>
                  Auto-refresh enabled
                </span>
              </div>
            </div>

            {/* Charts Grid */}
            <div className="charts-grid-wrapper">
              <Charts />
            </div>

            {/* Graphs Footer */}
            <div className="graphs-footer">
              <div className="footer-left">
                <div className="legend-container">
                  <span className="legend-title">Legend:</span>
                  <div className="legend-items">
                    <span className="legend-item">
                      <span className="legend-dot" style={{ backgroundColor: '#3b82f6' }}></span>
                      <span className="legend-text">Genres</span>
                    </span>
                    <span className="legend-item">
                      <span className="legend-dot" style={{ backgroundColor: '#10b981' }}></span>
                      <span className="legend-text">Themes</span>
                    </span>
                    <span className="legend-item">
                      <span className="legend-dot" style={{ backgroundColor: '#f59e0b' }}></span>
                      <span className="legend-text">Ratings</span>
                    </span>
                  </div>
                </div>
              </div>
              <div className="footer-right">
                <div className="time-range-selector">
                  <span className="time-icon">⏱️</span>
                  <span className="time-text">Last 330 days</span>
                  <button className="time-change-btn" title="Change time range">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="change-icon">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14m7-7H5" />
                    </svg>
                  </button>
                </div>
                <button className="export-btn" title="Export data">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="export-icon">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Collapsed State Indicator */}
      {!showGraphs && (
        <div className="collapsed-hint">
          <span className="hint-text">Click "Show Analytics" to reveal insights</span>
          <span className="hint-arrow">👇</span>
        </div>
      )}
    </div>
  );
};

export default AnalyticsSection;