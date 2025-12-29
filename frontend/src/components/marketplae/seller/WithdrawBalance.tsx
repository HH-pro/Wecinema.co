// components/marketplace/seller/WithdrawBalance.tsx
import React, { useState } from 'react';
import { formatCurrency } from '../../../api/marketplaceApi';

interface StripeStatus {
  connected?: boolean;
  chargesEnabled?: boolean;
  availableBalance?: number;
  pendingBalance?: number;
}

interface WithdrawBalanceProps {
  stripeStatus: StripeStatus;
  availableBalance: number;
  pendingBalance: number;
  onWithdrawSuccess: (amount: number) => void;
}

const WithdrawBalance: React.FC<WithdrawBalanceProps> = ({
  stripeStatus,
  availableBalance,
  pendingBalance,
  onWithdrawSuccess
}) => {
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  const canWithdraw = stripeStatus?.connected && stripeStatus?.chargesEnabled;

  const handleWithdrawClick = () => {
    if (!canWithdraw) {
      alert('Please complete your Stripe verification to withdraw funds.');
      return;
    }
    setShowWithdrawForm(true);
  };

  const handleSubmitWithdrawal = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) {
      alert('Please enter a valid amount.');
      return;
    }

    if (amount > availableBalance / 100) {
      alert(`Cannot withdraw more than ${formatCurrency(availableBalance)}`);
      return;
    }

    if (amount < 5) {
      alert('Minimum withdrawal amount is $5.00');
      return;
    }

    if (window.confirm(`Withdraw $${amount.toFixed(2)} to your bank account?`)) {
      setIsProcessing(true);
      try {
        await onWithdrawSuccess(amount);
        setWithdrawAmount('');
        setShowWithdrawForm(false);
      } catch (error) {
        console.error('Withdrawal failed:', error);
        alert('Withdrawal failed. Please try again.');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  if (!availableBalance || availableBalance <= 0) {
    return null;
  }

  return (
    <div className="mb-6 bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-xl p-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center">
          <div className="bg-gradient-to-r from-emerald-500 to-green-500 p-3 rounded-xl mr-4 shadow-sm">
            <span className="text-xl text-white">💰</span>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Withdraw Your Earnings</h3>
            <div className="flex items-baseline gap-4 mt-2">
              <div>
                <p className="text-sm text-gray-600">Available to withdraw</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(availableBalance)}
                </p>
              </div>
              {pendingBalance > 0 && (
                <div className="border-l border-emerald-200 pl-4">
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-lg font-semibold text-yellow-600">
                    {formatCurrency(pendingBalance)}
                  </p>
                </div>
              )}
            </div>
            {!canWithdraw && (
              <p className="text-sm text-amber-600 mt-2">
                Complete Stripe verification to withdraw funds
              </p>
            )}
          </div>
        </div>
        
        <div className="flex gap-3">
          {showWithdrawForm ? (
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500">$</span>
                </div>
                <input
                  type="number"
                  min="5"
                  max={availableBalance / 100}
                  step="0.01"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="0.00"
                  className="pl-8 pr-4 py-2 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none w-32"
                />
              </div>
              <button
                onClick={handleSubmitWithdrawal}
                disabled={!withdrawAmount || isProcessing || parseFloat(withdrawAmount) < 5}
                className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200 disabled:opacity-50 flex items-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Processing...
                  </>
                ) : (
                  'Withdraw'
                )}
              </button>
              <button
                onClick={() => {
                  setShowWithdrawForm(false);
                  setWithdrawAmount('');
                }}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition duration-200"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={handleWithdrawClick}
              disabled={!canWithdraw}
              className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-medium py-3 px-6 rounded-xl transition duration-200 shadow-md hover:shadow disabled:opacity-50"
            >
              Withdraw Funds
            </button>
          )}
        </div>
      </div>
      
      {showWithdrawForm && (
        <div className="mt-4 pt-4 border-t border-emerald-200">
          <p className="text-sm text-gray-600">
            Minimum withdrawal: $5.00 • Processing time: 2-3 business days
          </p>
        </div>
      )}
    </div>
  );
};

export default WithdrawBalance;