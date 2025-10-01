import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface MarketplaceLayoutProps {
  children: React.ReactNode;
}

const MarketplaceLayout: React.FC<MarketplaceLayoutProps> = ({ children }) => {
  const location = useLocation();

  const navItems = [
    { path: '/marketplace', label: 'Browse', icon: '🔍' },
    { path: '/marketplace/create', label: 'Create Listing', icon: '➕' },
    { path: '/marketplace/dashboard', label: 'Seller Dashboard', icon: '📊' },
    { path: '/marketplace/orders', label: 'My Orders', icon: '📦' },
    { path: '/marketplace/messages', label: 'Messages', icon: '💬' },
  ];

  return (
    <div className="marketplace-layout">
      <aside className="marketplace-sidebar">
        <div className="sidebar-header">
          <h2>🎬 WeCinema Marketplace</h2>
        </div>
        
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      <main className="marketplace-main">
        <header className="marketplace-header">
          <h1>Digital Content Marketplace</h1>
          <p>Buy and sell videos, scripts, and creative content</p>
        </header>

        <div className="marketplace-content">
          {children}
        </div>
      </main>
    </div>
  );
};

export default MarketplaceLayout;