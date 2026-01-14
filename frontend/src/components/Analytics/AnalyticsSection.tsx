import React, { useState, useEffect, useRef } from "react";
import Charts from "./Charts";
import "./Analytics.css";

interface AnalyticsSectionProps {
  title?: string;
}

const AnalyticsSection: React.FC<AnalyticsSectionProps> = ({ 
  title = "Analytics Dashboard" 
}) => {
  const [showGraphs, setShowGraphs] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  // Check screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Check localStorage for user preference
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
    
    // Save user preference to localStorage
    localStorage.setItem('analyticsGraphsVisible', newState.toString());
    
    setTimeout(() => setIsAnimating(false), 400);
  };

  return (
    <div 
      className={`analytics-wrapper ${showGraphs ? 'expanded' : 'collapsed'}`}
      ref={sectionRef}
    >
      
      {/* Yellow Theme Compact Bar (When Graphs Hidden) */}
      {!showGraphs && (
        <div className="yellow-compact-bar" onClick={handleToggle}>
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
                  {isMobile ? "Analytics" : "Analytics Dashboard"}
                </span>
                <span className="yellow-bar-subtitle">
                  {isMobile ? "Tap to show insights" : "Hidden - Click to show insights"}
                </span>
              </div>
            </div>
            
            <button 
              className="yellow-toggle-btn"
              onClick={handleToggle}
              aria-label="Show analytics graphs"
              title="Show Analytics Dashboard"
            >
              <span className="yellow-toggle-content">
                <span className="yellow-toggle-text">
                  {isMobile ? "Show" : "Show Graphs"}
                </span>
                <div className="yellow-arrow-animation">
                  <svg className="yellow-toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
              </span>
              <span className="yellow-btn-glow"></span>
            </button>
          </div>
          
          {/* Quick Stats Preview */}
          <div className="yellow-preview">
            <div className="yellow-preview-item">
              <div className="yellow-preview-icon">📊</div>
              <div className="yellow-preview-text">
                <span className="yellow-preview-label">3 Charts Available</span>
                <span className="yellow-preview-value">
                  {isMobile ? "Tap to view" : "Interactive & Real-time"}
                </span>
              </div>
            </div>
          </div>
          
          {/* Sun Rays Effect */}
          <div className="sun-ray ray-1"></div>
          <div className="sun-ray ray-2"></div>
          <div className="sun-ray ray-3"></div>
        </div>
      )}

      {/* Yellow Theme Expanded Section (Initially Visible) */}
      {showGraphs && (
        <div className={`yellow-analytics-section ${isAnimating ? 'animating' : ''}`}>
          
          {/* Yellow Header */}
          <div className="yellow-header">
            <div className="yellow-header-content">
              <div className="yellow-header-left">
                <div className="yellow-header-icon">
                  <div className="yellow-header-icon-bg"></div>
                  <svg className="yellow-header-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="yellow-header-text">
                  <h2 className="yellow-header-title">
                    {isMobile ? "Analytics" : "Analytics Dashboard"}
                  </h2>
                  <p className="yellow-header-subtitle">
                    {isMobile ? "Real-time insights" : "Real-time insights & visualization"}
                  </p>
                </div>
              </div>
              
              <button 
                className="yellow-close-btn"
                onClick={handleToggle}
                aria-label="Hide analytics graphs"
                title="Hide Analytics"
              >
                <span className="yellow-close-content">
                  <span className="yellow-close-text">
                    {isMobile ? "Hide" : "Hide Dashboard"}
                  </span>
                  <svg className="yellow-close-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                  </svg>
                </span>
              </button>
            </div>
            
            {/* Yellow Header Gradient Line */}
            <div className="yellow-header-gradient"></div>
          </div>

          {/* Charts Container */}
          <div className="yellow-charts-container">
            <div className="yellow-charts-intro">
              <h3 className="yellow-intro-title">
                {isMobile ? "Charts" : "Visual Analytics"}
              </h3>
              <p className="yellow-intro-subtitle">
                {isMobile ? "Interactive trends" : "Interactive charts showing trends over time"}
              </p>
            </div>
            
            <Charts isMobile={isMobile} />
          </div>

          {/* Yellow Footer */}
          <div className="yellow-footer">
            <div className="yellow-footer-left">
              <div className="yellow-legend">
                <span className="yellow-legend-title">
                  {isMobile ? "Live" : "Live Data"}
                </span>
                <div className="yellow-legend-dots">
                  <span className="yellow-legend-dot" style={{ backgroundColor: '#f59e0b' }}></span>
                  <span className="yellow-legend-dot" style={{ backgroundColor: '#fbbf24' }}></span>
                  <span className="yellow-legend-dot" style={{ backgroundColor: '#d97706' }}></span>
                </div>
              </div>
            </div>
            
            <div className="yellow-footer-right">
              <span className="yellow-data-info">
                <span className="yellow-info-icon">⏱️</span>
                <span className="yellow-info-text">
                  {isMobile ? "330 days" : "Last 330 days"}
                </span>
              </span>
              <button className="yellow-refresh-btn" title="Refresh data">
                <svg className="yellow-refresh-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
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