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
    <div className="mb-6">
      {/* DEBUG: Show current screen size */}
      <div className="fixed top-4 right-4 z-50 bg-red-500 text-white px-3 py-1 rounded text-xs font-bold">
        <div className="block sm:hidden">XS (Mobile)</div>
        <div className="hidden sm:block md:hidden">SM (Small)</div>
        <div className="hidden md:block lg:hidden">MD (Medium)</div>
        <div className="hidden lg:block xl:hidden">LG (Desktop)</div>
        <div className="hidden xl:block">XL (Large Desktop)</div>
      </div>
      
      {/* SIMPLE TEST - Always show desktop version */}
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
      
      {/* ORIGINAL CODE WITH ALL BREAKPOINTS */}
      <div className="mt-4 text-sm text-gray-600 border-t pt-2">
        <p>Responsive Test:</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mt-2">
          <div className="bg-blue-100 p-2 text-center">XS (col 1)</div>
          <div className="bg-green-100 p-2 text-center">SM (col 2)</div>
          <div className="bg-yellow-100 p-2 text-center">MD (col 3)</div>
          <div className="bg-red-100 p-2 text-center">LG (col 4)</div>
        </div>
      </div>
    </div>
  );
};

export default TabNavigation;