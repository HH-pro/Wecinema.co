// src/components/marketplace/seller/EarningsTab.tsx
import React, { useState, useEffect } from 'react';
import marketplaceApi from '../../../api/marketplaceApi';

interface EarningsTabProps {
  earningsBalance: any;
  monthlyEarnings: any[];
  earningsHistory: any[];
  onWithdrawRequest: (amountInDollars: number) => Promise<void>;
  loading: boolean;
  onRefresh: () => Promise<void>;
  formatCurrency?: (amountInCents: number) => string;
  formatCurrencyShort?: (amountInCents: number) => string;
  dollarsToCents?: (dollars: number) => number;
  centsToDollars?: (cents: number) => number;
}

const EarningsTab: React.FC<EarningsTabProps> = ({
  earningsBalance,
  monthlyEarnings,
  earningsHistory,
  onWithdrawRequest,
  loading,
  onRefresh,
  formatCurrency = marketplaceApi.formatCurrency,
  formatCurrencyShort = marketplaceApi.formatCurrencyShort,
  dollarsToCents = (dollars: number) => Math.round(dollars * 100),
  centsToDollars = (cents: number) => cents / 100
}) => {
  // ... باقی کوڈ ...
  
  // ✅ ڈالر میں فارمیٹ کرنے کے لیے نئے فنکشنز
  const formatInDollars = (amountInCents: number) => {
    const amountInDollars = centsToDollars(amountInCents);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amountInDollars);
  };

  const formatInDollarsShort = (amountInCents: number) => {
    const amountInDollars = centsToDollars(amountInCents);
    
    if (amountInDollars >= 1000) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(amountInDollars);
    }
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amountInDollars);
  };

  // ✅ Demo data کو ڈالر میں اپڈیٹ کریں
  const demoBalanceData = {
    availableBalance: 150000, // $1,500.00 in cents
    pendingBalance: 50000,    // $500.00 in cents
    totalEarnings: 250000,    // $2,500.00 in cents
    totalWithdrawn: 100000,   // $1,000.00 in cents
    walletBalance: 150000,
    lastWithdrawal: {
      amount: 50000,
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'completed'
    },
    nextPayoutDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    currency: 'usd', // یہاں 'usd' کریں
    thisMonthEarnings: 75000,
    completedOrdersCount: 5,
    pendingOrdersCount: 2
  };

  // ... باقی کوڈ ...

  return (
    <div className="space-y-6">
      {/* ... باقی JSX ... */}
      
      {/* Earnings Overview Cards - Updated to show $ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Available Balance Card */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-100 border border-green-200 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-800">Available Balance</p>
              <p className="text-3xl font-bold text-green-900 mt-2">
                {formatInDollars(availableBalanceInCents)}
              </p>
              <p className="text-sm text-green-700 mt-2">
                Ready to withdraw
              </p>
            </div>
            <div className="text-4xl text-green-600">💰</div>
          </div>
        </div>

        {/* Pending Balance Card */}
        <div className="bg-gradient-to-r from-blue-50 to-cyan-100 border border-blue-200 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-800">Pending Balance</p>
              <p className="text-3xl font-bold text-blue-900 mt-2">
                {formatInDollars(balanceData?.pendingBalance || 0)}
              </p>
              <p className="text-sm text-blue-700 mt-2">
                From active orders
              </p>
            </div>
            <div className="text-4xl text-blue-600">⏳</div>
          </div>
        </div>

        {/* Total Earnings Card */}
        <div className="bg-gradient-to-r from-purple-50 to-violet-100 border border-purple-200 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-800">Total Earnings</p>
              <p className="text-3xl font-bold text-purple-900 mt-2">
                {formatInDollars(balanceData?.totalEarnings || 0)}
              </p>
              <p className="text-sm text-purple-700 mt-2">
                All-time earnings
              </p>
            </div>
            <div className="text-4xl text-purple-600">📈</div>
          </div>
        </div>

        {/* Monthly Growth Card */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-100 border border-amber-200 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-amber-800">Monthly Growth</p>
              <p className={`text-3xl font-bold ${growth.percent >= 0 ? 'text-green-900' : 'text-red-900'} mt-2`}>
                {growth.percent >= 0 ? '+' : ''}{growth.percent}%
              </p>
              <p className="text-sm text-amber-700 mt-2">
                {growth.amount >= 0 ? '+' : ''}{formatInDollars(Math.abs(growth.amount))}
              </p>
            </div>
            <div className="text-4xl text-amber-600">
              {growth.percent >= 0 ? '📈' : '📉'}
            </div>
          </div>
        </div>
      </div>

      {/* Chart Section - Updated */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        {/* ... باقی JSX ... */}
        
        {activeChart === 'monthly' ? (
          <div className="space-y-4">
            {monthlyData && monthlyData.length > 0 ? (
              <>
                <div className="h-64 flex items-end space-x-2 md:space-x-4">
                  {monthlyData.map((monthData, index) => {
                    const earnings = monthData.earnings || monthData.total || 0;
                    const maxEarnings = Math.max(...monthlyData.map(m => m.earnings || m.total || 0), 1);
                    const height = (earnings / maxEarnings) * 100;
                    
                    return (
                      <div key={index} className="flex flex-col items-center flex-1">
                        <div className="w-full max-w-20 mx-auto">
                          <div 
                            className="bg-gradient-to-t from-yellow-400 to-yellow-500 rounded-t-lg transition-all duration-300"
                            style={{ height: `${Math.max(10, height)}%` }}
                          />
                        </div>
                        <div className="mt-2 text-center">
                          <p className="text-xs font-medium text-gray-700">
                            {getMonthName(monthData._id?.month || monthData.month)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatInDollarsShort(earnings)}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {monthData.orders || 0} orders
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-center pt-4 border-t border-gray-100">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-gradient-to-t from-yellow-400 to-yellow-500 rounded mr-2"></div>
                    <span className="text-sm text-gray-600">Monthly Earnings in USD</span>
                  </div>
                </div>
              </>
            ) : (
              // ... باقی کوڈ ...
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center">
                  <div className="bg-green-100 p-2 rounded-lg mr-3">
                    <span className="text-green-600">💰</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-green-800">Completed Earnings</p>
                    <p className="text-xl font-bold text-green-900 mt-1">
                      {formatInDollars(balanceData?.totalEarnings || 0)}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center">
                  <div className="bg-blue-100 p-2 rounded-lg mr-3">
                    <span className="text-blue-600">⏳</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-800">Pending Earnings</p>
                    <p className="text-xl font-bold text-blue-900 mt-1">
                      {formatInDollars(balanceData?.pendingBalance || 0)}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                <div className="flex items-center">
                  <div className="bg-purple-100 p-2 rounded-lg mr-3">
                    <span className="text-purple-600">💸</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-purple-800">Total Withdrawn</p>
                    <p className="text-xl font-bold text-purple-900 mt-1">
                      {formatInDollars(balanceData?.totalWithdrawn || 0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Withdrawal Section - Updated */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        {/* ... باقی JSX ... */}
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Withdrawal Amount (USD)
            </label>
            <div className="flex gap-3">
              <div className="flex-1">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">$</span>
                  </div>
                  <input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => {
                      setWithdrawAmount(e.target.value);
                      setError('');
                    }}
                    placeholder="Enter amount in USD"
                    className="pl-10 pr-4 py-3 w-full border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    min="1"
                    step="0.01"
                  />
                </div>
              </div>
              <button
                onClick={handleWithdraw}
                disabled={!withdrawAmount || withdrawing || loading || availableBalanceInCents < 100}
                className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white font-medium rounded-xl hover:from-yellow-600 hover:to-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow"
              >
                {withdrawing ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </div>
                ) : (
                  'Withdraw'
                )}
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Available: {formatInDollars(availableBalanceInCents)} • Minimum: $1.00
            </p>
          </div>
          
          {/* Quick Amount Buttons */}
          <div className="flex flex-wrap gap-2">
            {[5, 10, 25, 50, 100].map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => setWithdrawAmount(amount.toString())}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 transition-colors duration-200"
              >
                ${amount}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setWithdrawAmount(availableBalanceInDollars.toFixed(2));
              }}
              className="px-4 py-2 bg-yellow-100 hover:bg-yellow-200 border border-yellow-300 rounded-lg text-sm font-medium text-yellow-700 transition-colors duration-200"
            >
              Withdraw All
            </button>
          </div>
        </div>
      </div>

      {/* Transactions History - Updated */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        {/* ... باقی JSX ... */}
        
        {transactions.length > 0 ? (
          <div className="space-y-4">
            {transactions.slice(0, 10).map((transaction, index) => (
              <div key={transaction._id || `transaction-${index}`} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50">
                <div className="flex items-center flex-1">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xl">
                      {getTransactionIcon(transaction.type)}
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="font-medium text-gray-900">
                      {transaction.description || 'Transaction'}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {formatDate(transaction.date)}
                    </p>
                  </div>
                </div>
                <div className={`text-lg font-semibold ${getTransactionColor(transaction.type)}`}>
                  {getTransactionSign(transaction.type)}
                  {formatInDollars(Math.abs(transaction.amount || 0))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // ... باقی کوڈ ...
        )}
      </div>
    </div>
  );
};

export default EarningsTab;