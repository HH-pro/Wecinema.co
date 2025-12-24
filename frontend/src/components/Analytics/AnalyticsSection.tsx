import React, { useState } from "react";
import Charts from "./Charts";
import "./Analytics.css";

interface AnalyticsSectionProps {
  title?: string;
}

const AnalyticsSection: React.FC<AnalyticsSectionProps> = ({ 
  title = "Platform Analytics" 
}) => {
  const [showGraphs, setShowGraphs] = useState(true);

  return (
    <div className="analytics-section">
      <div className="analytics-header">
        <h2>{title}</h2>
        <div className="analytics-actions">
          <button 
            className="toggle-graphs-btn"
            onClick={() => setShowGraphs(!showGraphs)}
          >
            {showGraphs ? 'Hide Graphs' : 'Show Graphs'}
          </button>
        </div>
      </div>
      
      {showGraphs && (
        <>
          <div className="charts-container">
            <Charts />
          </div>
          
          <div className="analytics-footer">
            <div className="chart-legend">
              <span className="legend-item">
                <span className="legend-color" style={{ backgroundColor: '#3b82f6' }}></span>
                Genres Popularity
              </span>
              <span className="legend-item">
                <span className="legend-color" style={{ backgroundColor: '#10b981' }}></span>
                Themes Popularity
              </span>
              <span className="legend-item">
                <span className="legend-color" style={{ backgroundColor: '#f59e0b' }}></span>
                Ratings Trend
              </span>
            </div>
            <div className="time-range">Data for last 330 days</div>
          </div>
        </>
      )}
    </div>
  );
};

export default AnalyticsSection;