// src/components/marketplace/seller/OrderActionGuide.tsx
import React from 'react';

interface OrderActionGuideProps {
  currentFilter: string;
}

const OrderActionGuide: React.FC<OrderActionGuideProps> = ({ currentFilter }) => {
  const guides = {
    all: {
      title: 'All Orders Overview',
      steps: [
        'Paid orders need you to start processing',
        'Processing orders are being prepared',
        'In Progress orders are being worked on',
        'Delivered orders await buyer review',
        'Revision orders need your attention'
      ]
    },
    paid: {
      title: 'What to do with Paid Orders',
      steps: [
        'Review order requirements carefully',
        'Gather necessary materials or information',
        'Click "Start Processing" to begin',
        'Communicate with buyer if clarification needed',
        'Set realistic timeline for completion'
      ]
    },
    processing: {
      title: 'Processing Orders Guide',
      steps: [
        'Prepare all required materials',
        'Plan your workflow efficiently',
        'Click "Start Work" when ready to begin',
        'Keep buyer updated on progress',
        'Set aside dedicated time for this order'
      ]
    },
    in_progress: {
      title: 'Working on Orders',
      steps: [
        'Focus on quality and meeting requirements',
        'Save work frequently',
        'Test deliverables before sending',
        'Click "Deliver" when work is complete',
        'Add clear instructions for buyer'
      ]
    },
    delivered: {
      title: 'Orders with Buyer for Review',
      steps: [
        'Wait for buyer to review work',
        'Be available for questions',
        'Prepare for possible revision requests',
        'Respond promptly to feedback',
        'Payment released after buyer approval'
      ]
    },
    in_revision: {
      title: 'Handling Revision Requests',
      steps: [
        'Review buyer feedback carefully',
        'Make requested changes promptly',
        'Click "Complete Revision" when done',
        'Communicate changes made',
        'Resend updated deliverables'
      ]
    }
  };

  const guide = guides[currentFilter as keyof typeof guides] || guides.all;

  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl border border-blue-200 p-6">
      <div className="flex items-start mb-4">
        <div className="text-2xl mr-3">💡</div>
        <div>
          <h3 className="font-semibold text-gray-900">{guide.title}</h3>
          <p className="text-sm text-gray-600 mt-1">Follow these steps for best results</p>
        </div>
      </div>
      <ul className="space-y-2">
        {guide.steps.map((step, index) => (
          <li key={index} className="flex items-start">
            <span className="inline-flex items-center justify-center w-6 h-6 bg-white text-blue-600 rounded-full text-xs mr-2 mt-0.5 border border-blue-200">
              {index + 1}
            </span>
            <span className="text-gray-700">{step}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default OrderActionGuide;