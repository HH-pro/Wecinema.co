// components/marketplace/seller/WithdrawTab.tsx
import React, { useState, useEffect } from 'react';

// Format currency function (amount in cents)
const formatCurrency = (amount: number) => {
  const amountInRupees = amount / 100;
  return `₹${amountInRupees.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

interface StripeStatus {
  connected: boolean;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  availableBalance?: number; // in cents
  pendingBalance?: number; // in cents
  accountId?: string;
}

interface Withdrawal {
  _id: string;
  amount: number; // in cents
  status: string;
  stripeTransferId?: string;
  stripePayoutId?: string;
  createdAt: string;
  completedAt?: string;
  failedAt?: string;
  failureReason?: string;
  destination?: string;
  description?: string;
}

interface WithdrawalHistory {
  withdrawals: Withdrawal[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

interface WithdrawTabProps {
  stripeStatus: StripeStatus | null;
  withdrawalHistory: WithdrawalHistory | null;
  loading: boolean;
  currentPage: number;
  onPageChange: (page: number) => void;
  onWithdrawRequest: (amount: number) => void; // amount in rupees
  onRefresh: () => void;
  totalRevenue?: number; // in cents
  thisMonthRevenue?: number; // in cents
  pendingRevenue?: number; // in cents
}

const WithdrawTab: React.FC<WithdrawTabProps> = ({
  stripeStatus,
  withdrawalHistory,
  loading,
  currentPage,
  onPageChange,
  onWithdrawRequest,
  onRefresh,
  totalRevenue = 0,
  thisMonthRevenue = 0,
  pendingRevenue = 0
}) => {
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [customAmount, setCustomAmount] = useState<string>('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // All amounts are in cents
  const availableBalance = stripeStatus?.availableBalance || 0; // in cents
  const pendingBalance = stripeStatus?.pendingBalance || 0; // in cents
  const canWithdraw = stripeStatus?.connected && stripeStatus?.chargesEnabled;
  const hasBalance = availableBalance > 0;

  // Convert cents to rupees for display and input
  const availableBalanceInRupees = availableBalance / 100;
  const pendingBalanceInRupees = pendingBalance / 100;

  // Preset amounts in rupees
  const presetAmounts = [
    { value: 500, label: '₹500' },
    { value: 1000, label: '₹1,000' },
    { value: 2500, label: '₹2,500' },
    { value: 5000, label: '₹5,000' },
    { value: 10000, label: '₹10,000' },
  ];

  // Handle preset amount selection
  const handlePresetSelect = (amountInRupees: number) => {
    if (amountInRupees <= availableBalanceInRupees) {
      setWithdrawAmount(amountInRupees.toString());
      setShowCustomInput(false);
    }
  };

  // Handle custom amount
  const handleCustomAmount = () => {
    setShowCustomInput(true);
    setWithdrawAmount('');
  };

  // Validate and submit withdrawal
  const handleSubmitWithdrawal = async () => {
    if (!canWithdraw) {
      alert('कृपया फंड निकालने के लिए अपना Stripe खाता कनेक्ट और वेरीफाई करें।');
      return;
    }

    const amountInRupees = parseFloat(withdrawAmount);
    if (!amountInRupees || amountInRupees <= 0) {
      alert('कृपया एक वैध राशि दर्ज करें।');
      return;
    }

    if (amountInRupees > availableBalanceInRupees) {
      alert(`आपके उपलब्ध बैलेंस ${formatCurrency(availableBalance)} से अधिक राशि नहीं निकाल सकते।`);
      return;
    }

    if (amountInRupees < 100) {
      alert('न्यूनतम निकासी राशि ₹100 है।');
      return;
    }

    if (window.confirm(`क्या आप वाकई ₹${amountInRupees.toLocaleString('en-IN')} निकालना चाहते हैं?`)) {
      setIsProcessing(true);
      try {
        await onWithdrawRequest(amountInRupees);
        setWithdrawAmount('');
        setCustomAmount('');
        setShowCustomInput(false);
      } catch (error) {
        console.error('Withdrawal failed:', error);
        alert('निकासी विफल। कृपया पुनः प्रयास करें।');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  // Format date in Indian format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return '✅';
      case 'pending':
        return '⏳';
      case 'failed':
        return '❌';
      default:
        return '📝';
    }
  };

  // Calculate total withdrawn amount
  const calculateTotalWithdrawn = () => {
    if (!withdrawalHistory?.withdrawals) return 0;
    
    return withdrawalHistory.withdrawals
      .filter(w => w.status === 'completed')
      .reduce((sum, w) => sum + w.amount, 0); // amount in cents
  };

  // Calculate success rate
  const calculateSuccessRate = () => {
    if (!withdrawalHistory?.withdrawals?.length) return 100;
    
    const total = withdrawalHistory.withdrawals.length;
    const successful = withdrawalHistory.withdrawals.filter(w => w.status === 'completed').length;
    
    return Math.round((successful / total) * 100);
  };

  const totalWithdrawn = calculateTotalWithdrawn();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p className="text-gray-600">निकासी इतिहास लोड हो रहा है...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">फंड निकालें</h1>
          <p className="text-gray-600 mt-1">अपनी कमाई को अपने बैंक खाते में ट्रांसफर करें</p>
        </div>
        <button
          onClick={onRefresh}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition duration-200 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          रिफ्रेश करें
        </button>
      </div>

      {/* Balance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Available Balance */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">उपलब्ध बैलेंस</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {formatCurrency(availableBalance)}
              </p>
              <p className="text-xs text-gray-500 mt-1">निकासी के लिए तैयार</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">💰</span>
            </div>
          </div>
        </div>

        {/* Pending Balance */}
        <div className="bg-gradient-to-br from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">लंबित बैलेंस</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {formatCurrency(pendingBalance)}
              </p>
              <p className="text-xs text-gray-500 mt-1">प्रोसेसिंग कमाई</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">⏳</span>
            </div>
          </div>
        </div>

        {/* Total Withdrawn */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">कुल निकासी</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {formatCurrency(totalWithdrawn)}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-gray-500">{withdrawalHistory?.withdrawals?.length || 0} लेनदेन</p>
                <span className="text-xs font-medium text-green-600">
                  {calculateSuccessRate()}% सफलता दर
                </span>
              </div>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">📊</span>
            </div>
          </div>
        </div>
      </div>

      {/* Earnings Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-lg text-purple-600">💰</span>
            </div>
            <div>
              <p className="text-sm text-gray-600">कुल कमाई</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(totalRevenue)}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-lg text-green-600">📈</span>
            </div>
            <div>
              <p className="text-sm text-gray-600">इस महीने की कमाई</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(thisMonthRevenue)}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <span className="text-lg text-yellow-600">⏳</span>
            </div>
            <div>
              <p className="text-sm text-gray-600">प्रोसेसिंग में</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(pendingRevenue)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Withdrawal Form */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">नई निकासी</h2>
        
        {!canWithdraw ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <div className="w-5 h-5 text-yellow-600 mr-3 mt-0.5">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.73 0L4.408 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-yellow-800">खाता सेटअप आवश्यक</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  कृपया फंड निकालने के लिए अपना Stripe खाता कनेक्ट और वेरीफाई करें।
                </p>
              </div>
            </div>
          </div>
        ) : !hasBalance ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="w-5 h-5 text-blue-600 mr-3">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-blue-800">
                  आपका उपलब्ध बैलेंस ₹0 है। अधिक ऑर्डर पूरा करके कमाई शुरू करें!
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Preset Amounts */}
            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-3">त्वरित राशि चुनें</p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {presetAmounts.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => handlePresetSelect(preset.value)}
                    disabled={preset.value > availableBalanceInRupees}
                    className={`px-4 py-3 rounded-lg border transition duration-200 ${
                      withdrawAmount === preset.value.toString()
                        ? 'bg-yellow-500 text-white border-yellow-500'
                        : preset.value > availableBalanceInRupees
                        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                        : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300'
                    }`}
                  >
                    <span className="font-medium">{preset.label}</span>
                  </button>
                ))}
                <button
                  onClick={handleCustomAmount}
                  className={`px-4 py-3 rounded-lg border transition duration-200 ${
                    showCustomInput
                      ? 'bg-yellow-500 text-white border-yellow-500'
                      : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300'
                  }`}
                >
                  <span className="font-medium">कस्टम</span>
                </button>
              </div>
            </div>

            {/* Custom Amount Input */}
            {showCustomInput && (
              <div className="mb-6">
                <label className="block text-sm text-gray-600 mb-2">
                  कस्टम राशि दर्ज करें (न्यूनतम: ₹100)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500">₹</span>
                  </div>
                  <input
                    type="number"
                    min="100"
                    max={availableBalanceInRupees}
                    step="100"
                    value={customAmount}
                    onChange={(e) => {
                      const value = e.target.value;
                      setCustomAmount(value);
                      setWithdrawAmount(value);
                    }}
                    placeholder="0"
                    className="block w-full pl-8 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none transition"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-500">INR</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  उपलब्ध: {formatCurrency(availableBalance)}
                </p>
              </div>
            )}

            {/* Selected Amount Display */}
            {withdrawAmount && (
              <div className="mb-6">
                <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl p-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <p className="text-sm text-gray-600">निकासी राशि</p>
                      <p className="text-3xl font-bold text-gray-900 mt-1">
                        ₹{parseFloat(withdrawAmount).toLocaleString('en-IN')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">निकासी के बाद बची राशि</p>
                      <p className="text-2xl font-bold text-green-700 mt-1">
                        {formatCurrency(availableBalance - (parseFloat(withdrawAmount) * 100))}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                onClick={handleSubmitWithdrawal}
                disabled={!withdrawAmount || isProcessing || parseFloat(withdrawAmount) <= 0}
                className="px-8 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white font-medium rounded-lg transition duration-200 shadow-md hover:shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    प्रोसेसिंग...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    निकासी अनुरोध करें
                  </>
                )}
              </button>
            </div>

            {/* Info Box */}
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <div className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-blue-800">निकासी जानकारी</h3>
                  <ul className="text-xs text-blue-700 mt-1 space-y-1">
                    <li>• न्यूनतम निकासी: ₹100</li>
                    <li>• प्रोसेसिंग समय: 2-3 व्यावसायिक दिन</li>
                    <li>• फंड आपके कनेक्टेड बैंक खाते में ट्रांसफर किए जाएंगे</li>
                    <li>• विक्रेताओं के लिए कोई निकासी शुल्क नहीं</li>
                    <li>• निकासी केवल सोमवार से शुक्रवार तक प्रोसेस की जाती है</li>
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Withdrawal History */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">निकासी इतिहास</h2>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">
              {withdrawalHistory?.withdrawals?.length || 0} लेनदेन
            </span>
            <div className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full">
              {calculateSuccessRate()}% सफल
            </div>
          </div>
        </div>

        {!withdrawalHistory?.withdrawals?.length ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-4 text-gray-300">💰</div>
            <h3 className="text-lg font-medium text-gray-900">अभी तक कोई निकासी नहीं</h3>
            <p className="text-gray-500 mt-2 mb-6">
              {hasBalance
                ? 'अपनी कमाई को बैंक खाते में ट्रांसफर करने के लिए अपनी पहली निकासी का अनुरोध करें।'
                : 'पैसा कमाने और निकासी करने के लिए ऑर्डर पूरा करें।'
              }
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      तारीख
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      राशि
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      स्थिति
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      गंतव्य
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ट्रांसफर ID
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {withdrawalHistory.withdrawals.map((withdrawal) => (
                    <tr key={withdrawal._id} className="hover:bg-gray-50 transition duration-150">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatDate(withdrawal.createdAt)}</div>
                        {withdrawal.completedAt && (
                          <div className="text-xs text-gray-500">
                            पूरा हुआ: {formatDate(withdrawal.completedAt)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className={`text-lg font-semibold ${
                          withdrawal.status === 'completed' ? 'text-green-700' : 'text-gray-900'
                        }`}>
                          {formatCurrency(withdrawal.amount)}
                        </div>
                        {withdrawal.description && (
                          <div className="text-xs text-gray-500">{withdrawal.description}</div>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-2">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(withdrawal.status)}`}>
                            <span className="mr-1">{getStatusIcon(withdrawal.status)}</span>
                            {withdrawal.status === 'completed' ? 'पूरा हुआ' :
                             withdrawal.status === 'pending' ? 'लंबित' :
                             withdrawal.status === 'failed' ? 'विफल' : withdrawal.status}
                          </span>
                          {withdrawal.failureReason && (
                            <div className="text-xs text-red-600">{withdrawal.failureReason}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {withdrawal.destination || 'बैंक खाता'}
                        </div>
                        {withdrawal.stripePayoutId && (
                          <div className="text-xs text-gray-500">Payout ID: {withdrawal.stripePayoutId}</div>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-xs text-gray-500 font-mono">
                          {withdrawal.stripeTransferId ? (
                            <span className="truncate max-w-[120px] inline-block bg-gray-100 px-2 py-1 rounded">
                              {withdrawal.stripeTransferId}
                            </span>
                          ) : (
                            'लंबित...'
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary Footer */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="text-sm text-gray-700">
                  <span className="font-medium">कुल निकासी:</span>{' '}
                  <span className="text-lg font-bold text-green-700 ml-2">
                    {formatCurrency(totalWithdrawn)}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span>पूरा हुआ: {withdrawalHistory.withdrawals.filter(w => w.status === 'completed').length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span>लंबित: {withdrawalHistory.withdrawals.filter(w => w.status === 'pending').length}</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Pagination */}
        {withdrawalHistory?.pagination && withdrawalHistory.pagination.pages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
            <div className="text-sm text-gray-700">
              पेज {currentPage} दिखाया जा रहा है, कुल {withdrawalHistory.pagination.pages} पेज
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                पिछला
              </button>
              <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === withdrawalHistory.pagination.pages}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                अगला
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WithdrawTab;