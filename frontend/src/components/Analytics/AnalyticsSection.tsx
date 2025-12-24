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
    setTimeout(() => setIsAnimating(false), 300);
  };

  return (
    <div className={`analytics-wrapper ${showGraphs ? 'expanded' : 'collapsed'}`}>
      
      {/* Compact Bar (When Collapsed) */}
      {!showGraphs && (
        <div className="compact-bar">
          <div className="compact-bar-content">
            <div className="compact-bar-left">
              <div className="compact-icon">
                <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="compact-text">
                <span className="compact-title">Analytics</span>
                <span className="compact-subtitle">Click to view insights</span>
              </div>
            </div>
            
            <button 
              className="compact-toggle-btn"
              onClick={handleToggle}
              aria-label="Show analytics graphs"
              title="Show Analytics"
            >
              <span className="toggle-text">View</span>
              <svg className="toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Professional Expanded Section */}
      {showGraphs && (
        <div className={`professional-analytics-section ${isAnimating ? 'animating' : ''}`}>
          
          {/* Professional Header */}
          <div className="professional-header">
            <div className="header-left">
              <div className="header-icon">
                <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h2 className="professional-title">Analytics Dashboard</h2>
                <p className="professional-subtitle">Performance metrics & trends</p>
              </div>
            </div>
            
            <button 
              className="professional-close-btn"
              onClick={handleToggle}
              aria-label="Hide analytics graphs"
              title="Hide Analytics"
            >
              <span className="close-text">Close</span>
              <svg className="close-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Compact Charts Container */}
          <div className="compact-charts-container">
            <Charts />
          </div>

          {/* Minimal Footer */}
          <div className="professional-footer">
            <div className="footer-stats">
              <span className="footer-stat">
                <span className="stat-dot"></span>
                <span className="stat-text">Real-time data</span>
              </span>
              <span className="footer-stat">
                <span className="stat-dot"></span>
                <span className="stat-text">Updated daily</span>
              </span>
            </div>
            <span className="time-range">Last 330 days</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsSection;