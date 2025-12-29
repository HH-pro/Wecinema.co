import React, { useState, useEffect } from "react";
import Charts from "./Charts";
import "./Analytics.css";

interface AnalyticsSectionProps {
  title?: string;
}

const AnalyticsSection: React.FC<AnalyticsSectionProps> = ({ 
  title = "Analytics Insights" 
}) => {
  const [showGraphs, setShowGraphs] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const userPreference = localStorage.getItem('analyticsGraphsVisible');
    if (userPreference !== null) {
      setShowGraphs(userPreference === 'true');
    }
  }, []);

  const handleToggle = () => {
    setIsAnimating(true);
    const newState = !showGraphs;
    setShowGraphs(newState);
    localStorage.setItem('analyticsGraphsVisible', newState.toString());
    setTimeout(() => setIsAnimating(false), 400);
  };

  return (
    <div className={`analytics-wrapper ${showGraphs ? 'expanded' : 'collapsed'}`}>
      
      {/* Stylish Yellow Bar (When Hidden) */}
      {!showGraphs && (
        <div className="stylish-yellow-bar">
          <div className="yellow-bar-content">
            <div className="yellow-bar-left">
              <div className="yellow-bar-icon">
                <div className="yellow-icon-wrapper">
                  <svg className="yellow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <div className="yellow-icon-glow"></div>
                </div>
              </div>
              <div className="yellow-bar-text">
                <span className="yellow-bar-title">
                  <span className="yellow-title-icon">📈</span>
                  Analytics Dashboard
                </span>
                <span className="yellow-bar-subtitle">Click to view insights & trends</span>
              </div>
            </div>
            
            <button 
              className="yellow-toggle-btn"
              onClick={handleToggle}
              aria-label="Show analytics graphs"
              title="Show Analytics"
            >
              <span className="yellow-toggle-content">
                <span className="yellow-toggle-text">Show Graphs</span>
                <svg className="yellow-toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </button>
          </div>
          
          {/* Mini Preview Stats */}
          <div className="yellow-preview">
            <div className="preview-item">
              <span className="preview-dot" style={{ backgroundColor: '#f59e0b' }}></span>
              <span className="preview-text">3 Charts</span>
            </div>
            <div className="preview-divider"></div>
            <div className="preview-item">
              <span className="preview-dot" style={{ backgroundColor: '#fbbf24' }}></span>
              <span className="preview-text">Live Data</span>
            </div>
            <div className="preview-divider"></div>
            <div className="preview-item">
              <span className="preview-dot" style={{ backgroundColor: '#d97706' }}></span>
              <span className="preview-text">Interactive</span>
            </div>
          </div>
        </div>
      )}

      {/* Beautiful Expanded Section (Initially Visible) */}
      {showGraphs && (
        <div className={`beautiful-analytics-section ${isAnimating ? 'animating' : ''}`}>
          
          {/* Beautiful Header */}
          <div className="beautiful-header">
            <div className="beautiful-header-content">
              <div className="beautiful-header-left">
                <div className="beautiful-header-icon">
                  <svg className="beautiful-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="beautiful-header-text">
                  <h2 className="beautiful-title">Analytics Dashboard</h2>
                  <p className="beautiful-subtitle">Visual insights & trends</p>
                </div>
              </div>
              
              <button 
                className="beautiful-close-btn"
                onClick={handleToggle}
                aria-label="Hide analytics graphs"
                title="Hide Analytics"
              >
                <span className="beautiful-close-text">Hide</span>
                <svg className="beautiful-close-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                </svg>
              </button>
            </div>
            
            {/* Gradient Line */}
            <div className="header-gradient-line"></div>
          </div>

          {/* Charts Container */}
          <div className="beautiful-charts-container">
            <Charts />
          </div>

          {/* Beautiful Footer */}
          <div className="beautiful-footer">
            <div className="footer-legend">
              <span className="legend-title">Legend</span>
              <div className="legend-dots">
                <span className="legend-dot" style={{ backgroundColor: '#f59e0b' }}></span>
                <span className="legend-dot" style={{ backgroundColor: '#fbbf24' }}></span>
                <span className="legend-dot" style={{ backgroundColor: '#d97706' }}></span>
              </div>
            </div>
            <div className="footer-info">
              <span className="info-text">Last 330 days</span>
              <button className="refresh-btn" title="Refresh">
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