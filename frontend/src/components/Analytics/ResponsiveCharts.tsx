import React, { useState, useEffect } from 'react';
import Charts from './Charts';
import MobileSwipeCharts from './MobileSwipeCharts';
import './ResponsiveCharts.css';

interface ResponsiveChartsProps {
  breakpoint?: number;
}

const ResponsiveCharts: React.FC<ResponsiveChartsProps> = ({ breakpoint = 768 }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < breakpoint);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [breakpoint]);

  return (
    <div className="responsive-charts-wrapper">
      {isMobile ? (
        <MobileSwipeCharts />
      ) : (
        <Charts isMobile={false} />
      )}
    </div>
  );
};

export default ResponsiveCharts;
