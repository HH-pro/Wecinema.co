import React from 'react';

interface Order {
  stripePaymentIntentId?: string;
  paymentStatus?: string;
}

interface PaymentStatusBadgeProps {
  order: Order;
}

const PaymentStatusBadge: React.FC<PaymentStatusBadgeProps> = ({ order }) => {
  if (!order.stripePaymentIntentId) {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-300">
        Payment Pending
      </span>
    );
  }

  switch (order.paymentStatus) {
    case 'succeeded':
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
          Paid
        </span>
      );
    case 'processing':
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
          Processing
        </span>
      );
    case 'requires_payment_method':
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
          Payment Failed
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
          Payment Pending
        </span>
      );
  }
};

export default PaymentStatusBadge;