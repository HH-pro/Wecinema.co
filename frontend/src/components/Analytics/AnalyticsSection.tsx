import React, { useState } from "react";
import Charts from "./Charts";
import StatsSummary from "./StatsSummary";
import "./Analytics.css";

interface AnalyticsSectionProps {
  title?: string;
  showFull?: boolean;
}

const AnalyticsSection: React.FC<AnalyticsSectionProps> = ({ 
  title = "Analytics Dashboard", 
  showFull = false 
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`analytics-section ${expanded ? 'expanded' : ''}`}>
      <div className="analytics-header">
        <h2>{title}</h2>
        <div className="analytics-actions">
          <button 
            className="toggle-btn"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? 'Show Less' : 'Show More'}
          </button>
          <span className="last-updated">Updated: Just now</span>
        </div>
      </div>
      
      <StatsSummary />
      
      <div className="charts-container">
        <Charts showAll={showFull || expanded} />
      </div>
      
      <div className="analytics-footer">
        <div className="chart-legend">
          <span className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#3b82f6' }}></span>
            Genres
          </span>
          <span className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#10b981' }}></span>
            Themes
          </span>
          <span className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#f59e0b' }}></span>
            Ratings
          </span>
        </div>
        <div className="time-range">Last 330 days</div>
      </div>
    </div>
  );
};

export default AnalyticsSection;