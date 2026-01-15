import React from 'react';
import { ResponsiveCharts, MobileSwipeCharts, AdvancedMobileCharts } from '@/components/Analytics';
import './AnalyticsDemo.css';

/**
 * Analytics Components Demo Page
 * Showcases all chart components and their features
 */

export default function AnalyticsDemo() {
  const [activeTab, setActiveTab] = React.useState<'responsive' | 'simple' | 'advanced'>('responsive');

  return (
    <div className="analytics-demo-page">
      {/* Header */}
      <header className="demo-header">
        <div className="demo-header-content">
          <h1>📊 Mobile Charts Demo</h1>
          <p>Swipe charts for mobile analytics</p>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="demo-tabs">
        <button
          className={`tab ${activeTab === 'responsive' ? 'active' : ''}`}
          onClick={() => setActiveTab('responsive')}
        >
          📱 Responsive (Recommended)
        </button>
        <button
          className={`tab ${activeTab === 'simple' ? 'active' : ''}`}
          onClick={() => setActiveTab('simple')}
        >
          💨 Simple
        </button>
        <button
          className={`tab ${activeTab === 'advanced' ? 'active' : ''}`}
          onClick={() => setActiveTab('advanced')}
        >
          ⚡ Advanced
        </button>
      </nav>

      {/* Content */}
      <main className="demo-content">
        {activeTab === 'responsive' && (
          <section className="demo-section">
            <h2>Responsive Charts</h2>
            <p>
              Automatically switches between desktop and mobile views based on screen size.
              Try resizing your window!
            </p>
            <div className="demo-component">
              <ResponsiveCharts breakpoint={768} />
            </div>
            <details className="demo-details">
              <summary>Code Example</summary>
              <pre>{`import { ResponsiveCharts } from '@/components/Analytics';

export default function Page() {
  return <ResponsiveCharts breakpoint={768} />;
}`}</pre>
            </details>
          </section>
        )}

        {activeTab === 'simple' && (
          <section className="demo-section">
            <h2>Simple Mobile Charts</h2>
            <p>
              Lightweight chart component with swipe navigation. Perfect for quick analytics.
              Try swiping left or right!
            </p>
            <div className="demo-component">
              <MobileSwipeCharts />
            </div>
            <details className="demo-details">
              <summary>Code Example</summary>
              <pre>{`import { MobileSwipeCharts } from '@/components/Analytics';

export default function Page() {
  return <MobileSwipeCharts />;
}`}</pre>
            </details>
            <div className="demo-features">
              <h3>Features:</h3>
              <ul>
                <li>✅ Swipe navigation</li>
                <li>✅ Animated bar charts</li>
                <li>✅ Quick statistics</li>
                <li>✅ Touch-friendly</li>
                <li>✅ Lightweight</li>
              </ul>
            </div>
          </section>
        )}

        {activeTab === 'advanced' && (
          <section className="demo-section">
            <h2>Advanced Charts</h2>
            <p>
              Feature-rich chart component with multiple chart types, advanced statistics,
              and auto-rotate capability.
            </p>
            <div className="demo-component">
              <AdvancedMobileCharts
                autoRotate={false}
                maxCharts={10}
                rotationInterval={5000}
              />
            </div>
            <details className="demo-details">
              <summary>Code Example</summary>
              <pre>{`import { AdvancedMobileCharts } from '@/components/Analytics';

export default function Page() {
  return (
    <AdvancedMobileCharts
      autoRotate={false}
      maxCharts={10}
      rotationInterval={5000}
    />
  );
}`}</pre>
            </details>
            <div className="demo-features">
              <h3>Features:</h3>
              <ul>
                <li>✅ Multiple chart types (Bar, Line, Area)</li>
                <li>✅ Toggle between types</li>
                <li>✅ Advanced statistics</li>
                <li>✅ Data list view</li>
                <li>✅ Auto-rotate option</li>
                <li>✅ Full featured</li>
              </ul>
            </div>
          </section>
        )}
      </main>

      {/* Info Section */}
      <section className="demo-info">
        <h2>🎯 Quick Start</h2>
        <div className="info-grid">
          <div className="info-card">
            <h3>1. Import</h3>
            <code>import &#123; ResponsiveCharts &#125; from '@/components/Analytics';</code>
          </div>
          <div className="info-card">
            <h3>2. Add</h3>
            <code>&lt;ResponsiveCharts /&gt;</code>
          </div>
          <div className="info-card">
            <h3>3. Done!</h3>
            <p>Everything works automatically</p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="demo-features-grid">
        <h2>✨ Features</h2>
        <div className="features">
          <div className="feature">
            <span className="feature-icon">📱</span>
            <h4>Mobile First</h4>
            <p>Optimized for all mobile devices</p>
          </div>
          <div className="feature">
            <span className="feature-icon">👆</span>
            <h4>Touch Gestures</h4>
            <p>Swipe to navigate between charts</p>
          </div>
          <div className="feature">
            <span className="feature-icon">📊</span>
            <h4>Multiple Charts</h4>
            <p>Bar, Line, and Area chart types</p>
          </div>
          <div className="feature">
            <span className="feature-icon">⚡</span>
            <h4>Fast</h4>
            <p>Lightweight and optimized</p>
          </div>
          <div className="feature">
            <span className="feature-icon">🎨</span>
            <h4>Customizable</h4>
            <p>Easy to customize colors and sizes</p>
          </div>
          <div className="feature">
            <span className="feature-icon">🔗</span>
            <h4>API Ready</h4>
            <p>Real-time data integration</p>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="demo-comparison">
        <h2>📋 Component Comparison</h2>
        <table>
          <thead>
            <tr>
              <th>Feature</th>
              <th>MobileSwipeCharts</th>
              <th>AdvancedMobileCharts</th>
              <th>ResponsiveCharts</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Swipe Navigation</td>
              <td>✅</td>
              <td>✅</td>
              <td>✅</td>
            </tr>
            <tr>
              <td>Bar Charts</td>
              <td>✅</td>
              <td>✅</td>
              <td>✅</td>
            </tr>
            <tr>
              <td>Line Charts</td>
              <td>❌</td>
              <td>✅</td>
              <td>✅</td>
            </tr>
            <tr>
              <td>Area Charts</td>
              <td>❌</td>
              <td>✅</td>
              <td>✅</td>
            </tr>
            <tr>
              <td>Statistics</td>
              <td>Basic</td>
              <td>Advanced</td>
              <td>Advanced</td>
            </tr>
            <tr>
              <td>Auto Rotate</td>
              <td>❌</td>
              <td>✅</td>
              <td>❌</td>
            </tr>
            <tr>
              <td>Responsive</td>
              <td>Mobile Only</td>
              <td>Mobile Only</td>
              <td>All Devices</td>
            </tr>
            <tr>
              <td>File Size</td>
              <td>8KB</td>
              <td>15KB</td>
              <td>1KB</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Guide Section */}
      <section className="demo-guide">
        <h2>📚 Documentation</h2>
        <div className="guide-links">
          <a href="#" className="guide-link">
            <span>📖</span>
            <h4>Implementation Guide</h4>
            <p>Complete setup and configuration</p>
          </a>
          <a href="#" className="guide-link">
            <span>⚙️</span>
            <h4>Quick Reference</h4>
            <p>API and common patterns</p>
          </a>
          <a href="#" className="guide-link">
            <span>🎯</span>
            <h4>Mobile Charts README</h4>
            <p>Features and capabilities</p>
          </a>
          <a href="#" className="guide-link">
            <span>🔧</span>
            <h4>Utilities</h4>
            <p>Helper functions and hooks</p>
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="demo-footer">
        <p>📊 Mobile Charts - Swipe Analytics for Your Apps</p>
        <p className="demo-version">Version 1.0.0 • January 2026</p>
      </footer>
    </div>
  );
}
