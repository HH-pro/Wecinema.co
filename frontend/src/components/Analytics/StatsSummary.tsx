import React from "react";
import "./Analytics.css";

const StatsSummary: React.FC = () => {
  const stats = [
    { label: "Total Views", value: "1.2M", change: "+12%" },
    { label: "Avg. Rating", value: "4.5", change: "+0.2" },
    { label: "Active Users", value: "45.8K", change: "+8%" },
    { label: "New Scripts", value: "1,234", change: "+15%" },
  ];

  return (
    <div className="stats-summary">
      <h3>Platform Overview</h3>
      <div className="stats-grid">
        {stats.map((stat, index) => (
          <div key={index} className="stat-item">
            <div className="stat-value">{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
            <div className={`stat-change ${stat.change.startsWith('+') ? 'positive' : 'negative'}`}>
              {stat.change}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StatsSummary;