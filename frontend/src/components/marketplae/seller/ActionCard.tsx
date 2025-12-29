// src/components/marketplae/seller/ActionCard.tsx - UPDATED
import React from 'react';

interface Action {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

interface ActionCardProps {
  title?: string;
  description?: string;
  icon?: string;
  iconBg?: string;
  bgGradient?: string;
  borderColor?: string;
  actions?: Action[];
}

// ✅ JavaScript default parameters का use करें
const ActionCard: React.FC<ActionCardProps> = ({
  title = 'Untitled Card',
  description = 'No description provided',
  icon = '📊',
  iconBg = 'from-blue-500 to-blue-600',
  bgGradient = 'from-blue-50 to-indigo-50',
  borderColor = 'border-blue-200',
  actions = []
}) => {
  // Safe handler for actions
  const handleActionClick = (action: Action) => {
    if (action && typeof action.onClick === 'function') {
      action.onClick();
    }
  };

  // Check if we have valid actions
  const hasActions = Array.isArray(actions) && actions.length > 0;

  return (
    <div className={`bg-gradient-to-br ${bgGradient} rounded-2xl p-6 border ${borderColor}`}>
      <div className="flex items-start gap-4 mb-4">
        <div className={`p-3 bg-gradient-to-br ${iconBg} rounded-xl`}>
          <span className="text-2xl text-white">{icon}</span>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="text-gray-600 text-sm mt-1">{description}</p>
        </div>
      </div>
      
      {hasActions ? (
        <div className="flex gap-3">
          {actions.map((action, index) => {
            // Validate action object
            if (!action || typeof action !== 'object') {
              return null;
            }

            const buttonClass = action.variant === 'primary'
              ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white hover:from-yellow-600 hover:to-yellow-700'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300';

            return (
              <button
                key={index}
                onClick={() => handleActionClick(action)}
                className={`flex-1 px-4 py-2.5 font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow ${buttonClass}`}
              >
                {action.label || 'Action'}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-2 text-gray-500 text-sm">
          No actions available
        </div>
      )}
    </div>
  );
};

// ❌ Remove defaultProps - use JavaScript default parameters instead
// ActionCard.defaultProps = {
//   title: 'Untitled Card',
//   description: 'No description provided',
//   icon: '📊',
//   iconBg: 'from-blue-500 to-blue-600',
//   bgGradient: 'from-blue-50 to-indigo-50',
//   borderColor: 'border-blue-200',
//   actions: []
// };

export default ActionCard;