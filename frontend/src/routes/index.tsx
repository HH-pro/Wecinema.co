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
  // ChatbotPage,
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

const Router: React.FC = () => {
  return (
    <BrowserRouter>
        <Routes>
          {/* ========== EXISTING ROUTES ========== */}
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
          <Route path="/payment" element={<PaymentComponent />} />
          <Route path="/hypemodeprofile" element={<HypeModeProfile />} />
          <Route path="/chat/:chatId" element={<ChatPage />} />
          <Route path="/videoeditor" element={<VideoEditorPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/chatbot" element={<ChatbotPage />} />
          <Route path="/customersupport" element={<CustomerSupportPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
          <Route path="/about" element={<About />} />

          <Route path="/admin" element={<Signin />} />

          {/* ========== 🆕 MARKETPLACE ROUTES ========== */}
          <Route path="/marketplace" element={<Browse />} />
          <Route path="/marketplace/create" element={<CreateListing />} />
          <Route path="/marketplace/dashboard" element={<SellerDashboard />} />
    <Route path="/marketplace/buyer-dashboard" element={<BuyerDashboard />} />
      <Route path="/marketplace/orders/:orderId" element={<OrderDetailsPage />} />

          <Route path="/marketplace/my-orders" element={<MyOrders />} />
          <Route path="/marketplace/orders/:orderId" element={<OrderDetails />} />
          <Route path="/marketplace/messages" element={<Messages />} />
          <Route path="/marketplace/messages/:orderId" element={<Messages />} />
          <Route path="/marketplace/my-orders" element={<MyOrders />} />
          <Route path="/marketplace/orders/:orderId" element={<OrderDetails />} />
      <Route path="/marketplace/orders/stats/buyer" element={<BuyerStatsPage />} />
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
                    
                    {/* 🆕 Optional: Add marketplace admin routes later */}
                    {/* <Route path="marketplace-listings" element={<MarketplaceListings />} /> */}
                    {/* <Route path="marketplace-orders" element={<MarketplaceOrders />} /> */}
                  </Routes>
                </Layout>
              }
            />
          </Route>
        </Routes>
    </BrowserRouter>
  );
};

export default Router;