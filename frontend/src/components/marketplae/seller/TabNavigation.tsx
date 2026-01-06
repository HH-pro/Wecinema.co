// src/components/marketplae/seller/TabNavigation.tsx
import React from 'react';

interface Tab {
  id: string;
  label: string;
  icon: string;
  badge?: number;
}

interface TabNavigationProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

const TabNavigation: React.FC<TabNavigationProps> = ({ tabs, activeTab, onTabChange }) => {
  return (
    <div className="mb-8">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1">
        <nav className="flex space-x-1" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                relative flex-1 py-3 px-4 font-medium text-sm rounded-lg
                transition-all duration-200 flex items-center justify-center
                ${activeTab === tab.id
                  ? 'bg-gradient-to-r from-yellow-50 to-yellow-100 text-yellow-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }
              `}
            >
              <span className="mr-2 text-lg">{tab.icon}</span>
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={`
                  ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                  ${activeTab === tab.id 
                    ? 'bg-yellow-100 text-yellow-800' 
                    : 'bg-gray-100 text-gray-800'
                  }
                `}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default TabNavigation;