// Alternative: src/components/marketplae/seller/TabNavigation.tsx - ICONS ONLY MOBILE
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
    <div className="mb-6 sm:mb-8">
      {/* Desktop Version (Full Labels) */}
      <div className="hidden sm:block">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1">
          <nav className="flex space-x-1" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`
                  relative flex-1 min-w-0 py-3 px-4 font-medium text-sm rounded-lg
                  transition-all duration-200 flex items-center justify-center
                  ${activeTab === tab.id
                    ? 'bg-gradient-to-r from-yellow-50 to-yellow-100 text-yellow-700 shadow-sm border border-yellow-200'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }
                `}
              >
                <span className="mr-2 text-lg flex-shrink-0">{tab.icon}</span>
                <span className="truncate">{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className={`
                    ml-2 flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
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

      {/* Mobile Version (Icons Only) */}
      <div className="block sm:hidden">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1">
          <nav className="flex justify-between" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`
                  relative flex-1 min-w-0 py-3 px-2 font-medium text-sm rounded-lg
                  transition-all duration-200 flex flex-col items-center justify-center
                  ${activeTab === tab.id
                    ? 'bg-gradient-to-r from-yellow-50 to-yellow-100 text-yellow-700 shadow-sm border border-yellow-200'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }
                `}
              >
                {/* Icon with Badge */}
                <div className="relative mb-1">
                  <span className="text-xl">{tab.icon}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className={`
                      absolute -top-1 -right-1 inline-flex items-center justify-center
                      w-5 h-5 rounded-full text-xs font-bold
                      ${activeTab === tab.id 
                        ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' 
                        : 'bg-gray-100 text-gray-800 border border-gray-300'
                      }
                    `}>
                      {tab.badge}
                    </span>
                  )}
                </div>
                
                {/* Short Label (First word or truncated) */}
                <span className="text-xs truncate w-full text-center">
                  {tab.label.split(' ')[0]}
                </span>
              </button>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
};

export default TabNavigation;