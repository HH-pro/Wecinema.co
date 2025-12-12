// src/components/marketplace/seller/OrderWorkflowGuide.tsx
import React from 'react';

const OrderWorkflowGuide: React.FC = () => {
  const steps = [
    { status: 'paid', icon: '💰', title: 'Payment Received', description: 'Buyer has paid, ready for you to start' },
    { status: 'processing', icon: '📦', title: 'Start Processing', description: 'Prepare materials and plan your work' },
    { status: 'in_progress', icon: '👨‍💻', title: 'Start Work', description: 'Begin working on the order' },
    { status: 'delivered', icon: '🚚', title: 'Deliver Work', description: 'Send completed work to buyer' },
    { status: 'completed', icon: '✅', title: 'Order Complete', description: 'Buyer approved, payment released' },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">How Orders Work</h3>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-4 md:space-y-0">
        {steps.map((step, index) => (
          <div key={step.status} className="flex items-center">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-2xl">{step.icon}</span>
              </div>
              <p className="text-sm font-medium text-gray-900">{step.title}</p>
              <p className="text-xs text-gray-500">{step.description}</p>
            </div>
            {index < steps.length - 1 && (
              <div className="hidden md:block mx-4">
                <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrderWorkflowGuide;