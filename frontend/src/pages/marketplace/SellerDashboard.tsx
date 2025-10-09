import React, { useEffect, useState } from "react";
import { getMyListings } from "../../api"; // ✅ only this API remains
import Layout from '../../components/Layout';

import { motion } from "framer-motion";

const SellerDashboard: React.FC = () => {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ Fetch listings from API
  useEffect(() => {
    const fetchListings = async () => {
      try {
        const res = await getMyListings();
        setListings(res.data || []);
      } catch (error) {
        console.error("Error fetching listings:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchListings();
  }, []);

  const handleViewListingDetails = (listingId: string) => {
    console.log("View details for listing:", listingId);
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Dashboard Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Seller Dashboard
          </h1>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow p-5"
          >
            <h3 className="text-sm text-gray-500">Active Listings</h3>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">
              {listings.filter((l) => l.status === "active").length}
            </p>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.05 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow p-5"
          >
            <h3 className="text-sm text-gray-500">Pending Listings</h3>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">
              {listings.filter((l) => l.status === "pending").length}
            </p>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.05 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow p-5"
          >
            <h3 className="text-sm text-gray-500">Total Views</h3>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">
              {listings.reduce((sum, l) => sum + (l.views || 0), 0)}
            </p>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.05 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow p-5"
          >
            <h3 className="text-sm text-gray-500">Total Listings</h3>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">
              {listings.length}
            </p>
          </motion.div>
        </div>

        {/* Listings Section */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            My Listings
          </h2>

          {loading ? (
            <p className="text-gray-500">Loading listings...</p>
          ) : listings.length === 0 ? (
            <p className="text-gray-500">No listings found.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {listings.map((listing) => (
                <motion.div
                  key={listing._id}
                  whileHover={{ scale: 1.02 }}
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4"
                >
                  <img
                    src={listing.thumbnail || "/placeholder.jpg"}
                    alt={listing.title}
                    className="w-full h-40 object-cover rounded-xl"
                  />
                  <h3 className="mt-3 text-lg font-medium text-gray-900 dark:text-white">
                    {listing.title}
                  </h3>
                  <p className="text-sm text-gray-500 line-clamp-2">
                    {listing.description}
                  </p>
                  <div className="flex justify-between items-center mt-3">
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded ${
                        listing.status === "active"
                          ? "bg-green-100 text-green-700"
                          : listing.status === "pending"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {listing.status || "N/A"}
                    </span>
                    <button
                      onClick={() => handleViewListingDetails(listing._id)}
                      className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
                    >
                      View Details
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default SellerDashboard;
