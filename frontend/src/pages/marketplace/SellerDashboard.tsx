// Updated SellerDashboard.tsx (simplified version)
import React, { useState, useEffect } from 'react';
import MarketplaceLayout from '../../components/Layout';
import { getCurrentUserId } from '../../utilities/helperfFunction';
import { formatCurrency } from '../../api';

// Import new components
import DashboardHeader from '../../components/marketplae/seller/DashboardHeader';
import AlertMessage from '../../components/marketplae/seller/AlertMessage';
import TabNavigation from '../../components/marketplae/seller/TabNavigation';
import StatsGrid from '../../components/marketplae/seller/StatsGrid';
import WelcomeCard from '../../components/marketplae/seller/WelcomeCard';
import RecentOrders from '../../components/marketplae/seller/RecentOrders';
import ActionCard from '../../components/marketplae/seller/ActionCard';
import OrderWorkflowGuide from '../../components/marketplae/seller/OrderWorkflowGuide';

// Import tab components
import OffersTab from '../../components/marketplae/seller/OffersTab';
import ListingsTab from '../../components/marketplae/seller/ListingsTab';
import OrdersTab from '../../components/marketplae/seller/OrdersTab';

// Import modals
import StripeSetupModal from '../../components/marketplae/seller/StripeSetupModal';
import OrderDetailsModal from '../../components/marketplae/seller/OrderDetailsModal';
// ... other modal imports

const SellerDashboard: React.FC = () => {
  // State management (same as before but organized)
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  // ... other states

  // Tab configuration
  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊', badge: null },
    { id: 'offers', label: 'Offers', icon: '💼', badge: pendingOffers },
    { id: 'listings', label: 'My Listings', icon: '🏠', badge: totalListings },
    { id: 'orders', label: 'My Orders', icon: '📦', badge: orderStats.activeOrders }
  ];

  // Action cards data
  const actionCards = [
    {
      title: 'Need Help with an Order?',
      description: 'Learn how to manage orders step by step',
      icon: '❓',
      iconBg: 'from-yellow-500 to-yellow-600',
      bgGradient: 'from-yellow-50 to-amber-50',
      borderColor: 'border-yellow-200',
      actions: [
        { label: 'View Tutorial', onClick: () => window.open('/help/orders', '_blank'), variant: 'secondary' },
        { label: 'Contact Support', onClick: () => window.open('/help/support', '_blank'), variant: 'primary' }
      ]
    },
    {
      title: 'Boost Your Sales',
      description: 'Tips to get more orders and grow your business',
      icon: '🚀',
      iconBg: 'from-green-500 to-green-600',
      bgGradient: 'from-green-50 to-emerald-50',
      borderColor: 'border-green-200',
      actions: [
        { label: 'Optimize Listings', onClick: () => window.open('/help/optimize', '_blank'), variant: 'secondary' },
        { label: 'View Analytics', onClick: () => setActiveTab('listings'), variant: 'primary' }
      ]
    }
  ];

  return (
    <MarketplaceLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <DashboardHeader
            title="Seller Dashboard"
            subtitle="Manage orders, track earnings, and grow your business"
            earnings={formatCurrency(orderStats.totalRevenue)}
            onRefresh={handleRefresh}
            refreshing={refreshing}
            showStripeButton={!(stripeStatus?.connected && stripeStatus?.chargesEnabled)}
            onStripeSetup={() => setShowStripeSetup(true)}
          />

          {/* Alerts */}
          <div className="mb-8 space-y-4">
            {successMessage && (
              <AlertMessage type="success" message={successMessage} />
            )}
            {error && (
              <AlertMessage type="error" message={error} />
            )}
          </div>

          {/* Navigation */}
          <TabNavigation
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Welcome Card */}
              <WelcomeCard
                title="Welcome back, Seller! 👋"
                subtitle="Manage your business efficiently with real-time insights and quick actions."
                primaryAction={{
                  label: '+ Create New Listing',
                  onClick: () => window.open('/create-listing', '_blank')
                }}
                secondaryAction={{
                  label: '💰 Setup Payments',
                  onClick: () => setShowStripeSetup(true),
                  visible: !(stripeStatus?.connected && stripeStatus?.chargesEnabled)
                }}
              />

              {/* Stats Grid */}
              <StatsGrid
                stats={{
                  totalRevenue: orderStats.totalRevenue,
                  totalOrders: orderStats.totalOrders,
                  activeOrders: orderStats.activeOrders,
                  pendingOffers: pendingOffers,
                  totalListings: totalListings,
                  activeListings: activeListings
                }}
                onTabChange={setActiveTab}
              />

              {/* Order Workflow Guide */}
              <OrderWorkflowGuide />

              {/* Recent Orders */}
              <RecentOrders
                orders={orders.slice(0, 5)}
                onViewOrderDetails={handleViewOrderDetails}
                onStartProcessing={handleSimpleStartProcessing}
                onStartWork={handleSimpleStartWork}
                onDeliver={handleSimpleDeliver}
                onCancel={handleSimpleCancel}
                onCompleteRevision={handleSimpleCompleteRevision}
                onViewAll={() => setActiveTab('orders')}
                onCreateListing={() => window.open('/create-listing', '_blank')}
                orderActionLoading={orderActionLoading}
              />

              {/* Action Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {actionCards.map((card, index) => (
                  <ActionCard key={index} {...card} />
                ))}
              </div>
            </div>
          )}

          {/* Other Tabs */}
          {activeTab === 'offers' && (
            <OffersTab
              offers={offers}
              loading={loading}
              onOfferAction={handleOfferAction}
              onPlayVideo={handlePlayVideo}
              onRefresh={handleRefresh}
            />
          )}

          {activeTab === 'listings' && (
            <ListingsTab
              listingsData={listingsData}
              loading={loading && activeTab === 'listings'}
              // ... other props
            />
          )}

          {activeTab === 'orders' && (
            <OrdersTab
              orders={orders}
              loading={loading}
              // ... other props
            />
          )}

          {/* Modals (same as before) */}
          {showStripeSetup && (
            <StripeSetupModal
              show={showStripeSetup}
              onClose={() => setShowStripeSetup(false)}
              onSuccess={handleStripeSetupSuccess}
            />
          )}
          {/* ... other modals */}
        </div>
      </div>
    </MarketplaceLayout>
  );
};

export default SellerDashboard;