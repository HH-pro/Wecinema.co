import React from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import {
  CategoryPage,
  Homepage,
  ProfilePage,
  ScriptViewPage,
  Viewpage,
  HypeModeProfile,
  HypeMode,
  VideoEditorPage,
  RatingPage,
  CustomerSupportPage,
  PaymentComponent,
  PrivacyPolicy,
  ChatPage,
  ThemePage,
  SearchPage,
  TermsAndConditions,
  HistoryPage,
  LikedVideoPage,
  ReportPage,
  ChatbotPage,
  Signin,
  ProtectedRoute,
  Domain,
  Dashboard,
  Users,
  Videos,
  Transactions,
  Settings,
  Scripts,
  OrderDetailsPage,
  About,
} from "../pages";
import {
  BuyerStatsPage,
} from '../components/marketplae/BuyerDashboard';
import Layout from "../components/admin/Layout";

// 🆕 IMPORT MARKETPLACE PAGES
import Browse from "../pages/marketplace/Browse";
import CreateListing from "../pages/marketplace/CreateListing";
import SellerDashboard from "../pages/marketplace/SellerDashboard";
import BuyerDashboard from "../components/marketplae/BuyerDashboard/BuyerDashboard";
import MyOrders from "../pages/marketplace/MyOrders";
import OrderDetails from "../pages/marketplace/OrderDetails";
import Messages from "../pages/marketplace/Messages";

// Import Auth components if needed
import { AuthCheck } from "../context/AuthContext"; // If you have this component

const Router: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* ========== PUBLIC ROUTES (No authentication required) ========== */}
        <Route path="/" element={<Homepage />} />
        <Route path="/video/:slug" element={<Viewpage />} />
        <Route path="/category/:slug" element={<CategoryPage />} />
        <Route path="/user/:id" element={<ProfilePage />} />
        <Route path="/script/:id" element={<ScriptViewPage />} />
        <Route path="/ratings/:slug" element={<RatingPage />} />
        <Route path="/themes/:slug" element={<ThemePage />} />
        <Route path="/search/:slug" element={<SearchPage />} />
        <Route path="/hypemode" element={<HypeMode />} />
        <Route path="/report" element={<ReportPage />} />
        <Route path="/likedvideos" element={<LikedVideoPage />} />
        <Route path="/chat/:chatId" element={<ChatPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/chatbot" element={<ChatbotPage />} />
        <Route path="/customersupport" element={<CustomerSupportPage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
        <Route path="/about" element={<About />} />
        <Route path="/admin" element={<Signin />} />
        
        {/* ========== MARKETPLACE PUBLIC ROUTES ========== */}
        <Route path="/marketplace" element={<Browse />} />

        {/* ========== PROTECTED ROUTES (Require authentication) ========== */}
        {/* HypeModeProfile - This is where users sign up/login and pay */}
        <Route path="/hypemodeprofile" element={<HypeModeProfile />} />
        
        {/* Payment route */}
        <Route path="/payment" element={<PaymentComponent />} />
        
        {/* Video Editor - Protected route */}
        <Route path="/videoeditor" element={
          <ProtectedRoute>
            <VideoEditorPage />
          </ProtectedRoute>
        } />

        {/* ========== 🆕 MARKETPLACE PROTECTED ROUTES ========== */}
        {/* Create Listing - Only authenticated users */}
        <Route path="/marketplace/create" element={
          <ProtectedRoute>
            <CreateListing />
          </ProtectedRoute>
        } />

        {/* Seller Dashboard - Only authenticated sellers */}
        <Route path="/marketplace/dashboard" element={
          <ProtectedRoute>
            <SellerDashboard />
          </ProtectedRoute>
        } />

        {/* Buyer Dashboard - Only authenticated buyers */}
        <Route path="/marketplace/buyer-dashboard" element={
          <ProtectedRoute>
            <BuyerDashboard />
          </ProtectedRoute>
        } />

        {/* Order Details - Protected */}
        <Route path="/marketplace/orders/:orderId" element={
          <ProtectedRoute>
            <OrderDetailsPage />
          </ProtectedRoute>
        } />

        {/* My Orders - Protected */}
        <Route path="/marketplace/my-orders" element={
          <ProtectedRoute>
            <MyOrders />
          </ProtectedRoute>
        } />

        {/* Alternate order details route - Protected */}
        <Route path="/marketplace/orders/:orderId/details" element={
          <ProtectedRoute>
            <OrderDetails />
          </ProtectedRoute>
        } />

        {/* Messages - Protected */}
        <Route path="/marketplace/messages" element={
          <ProtectedRoute>
            <Messages />
          </ProtectedRoute>
        } />

        {/* Messages with order ID - Protected */}
        <Route path="/marketplace/messages/:orderId" element={
          <ProtectedRoute>
            <Messages />
          </ProtectedRoute>
        } />

        {/* Buyer Stats - Protected */}
        <Route path="/marketplace/orders/stats/buyer" element={
          <ProtectedRoute>
            <BuyerStatsPage />
          </ProtectedRoute>
        } />

        {/* ========== ADMIN ROUTES ========== */}
        <Route element={<ProtectedRoute />}>
          <Route
            path="/admin/*"
            element={
              <Layout>
                <Routes>
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="users" element={<Users />} />
                  <Route path="domain" element={<Domain />} />
                  <Route path="videos" element={<Videos />} />
                  <Route path="transactions" element={<Transactions />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="script" element={<Scripts />} />
                </Routes>
              </Layout>
            }
          />
        </Route>

        {/* ========== CATCH-ALL 404 ROUTE ========== */}
        <Route path="*" element={
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            flexDirection: 'column'
          }}>
            <h1 style={{ fontSize: '48px', color: '#333' }}>404</h1>
            <p style={{ fontSize: '18px', color: '#666', marginTop: '10px' }}>
              Page not found
            </p>
            <a 
              href="/" 
              style={{
                marginTop: '20px',
                padding: '10px 20px',
                backgroundColor: '#fbbf24',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '5px',
                fontWeight: 'bold'
              }}
            >
              Go Home
            </a>
          </div>
        } />
      </Routes>
    </BrowserRouter>
  );
};

export default Router;