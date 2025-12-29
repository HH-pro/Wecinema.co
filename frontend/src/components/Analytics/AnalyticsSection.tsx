import React, { useState, useEffect } from "react";
import Charts from "./Charts";
import "./Analytics.css";

interface AnalyticsSectionProps {
  title?: string;
}

const AnalyticsSection: React.FC<AnalyticsSectionProps> = ({ 
  title = "Analytics" 
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
    setTimeout(() => setIsAnimating(false), 300);
  };

  return (
    <div className={`analytics-wrapper ${showGraphs ? 'expanded' : 'collapsed'}`}>
      
      {/* Compact Bar (When Hidden) */}
      {!showGraphs && (
        <div className="compact-bar">
          <div className="compact-bar-content">
            <div className="compact-bar-left">
              <div className="compact-bar-icon">
                <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="compact-bar-text">
                <span className="compact-bar-title">Analytics</span>
                <span className="compact-bar-subtitle">Click to show charts</span>
              </div>
            </div>
            
            <button 
              className="compact-toggle-btn"
              onClick={handleToggle}
              aria-label="Show analytics graphs"
            >
              <span>Show</span>
              <svg className="toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Compact Expanded Section */}
      {showGraphs && (
        <div className={`compact-analytics-section ${isAnimating ? 'animating' : ''}`}>
          
          {/* Minimal Header */}
          <div className="compact-header">
            <div className="compact-header-left">
              <svg className="compact-header-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <div>
                <h2 className="compact-header-title">Analytics</h2>
                <p className="compact-header-subtitle">Quick insights</p>
              </div>
            </div>
            
            <button 
              className="compact-close-btn"
              onClick={handleToggle}
              aria-label="Hide analytics graphs"
            >
              <span>Hide</span>
              <svg className="close-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
          </div>

          {/* Compact Charts */}
          <div className="compact-charts-wrapper">
            <Charts />
          </div>

          {/* Minimal Footer */}
          <div className="compact-footer">
            <span className="compact-time">330 days data</span>
            <span className="compact-status">Live</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsSection;