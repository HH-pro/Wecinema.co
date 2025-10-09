import React, { useEffect, useState } from "react";
import { getMyListings } from "../../api";
import { motion } from "framer-motion";
import { FaBox, FaClipboardList, FaHandshake, FaChartLine } from "react-icons/fa";

interface Listing {
  _id: string;
  title: string;
  category: string;
  price: number;
  status: string;
  createdAt: string;
}

interface Order {
  _id: string;
  buyer: string;
  item: string;
  total: number;
  status: string;
}

interface Offer {
  _id: string;
  buyer: string;
  item: string;
  offerAmount: number;
  status: string;
}

const SellerDashboard: React.FC = () => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const listingsData = await getMyListings();
        setListings(listingsData);

        // Mock Data for Orders & Offers
        setOrders([
          { _id: "1", buyer: "Ali", item: "Product A", total: 1200, status: "Shipped" },
          { _id: "2", buyer: "Sara", item: "Product B", total: 800, status: "Pending" },
        ]);
        setOffers([
          { _id: "1", buyer: "Usman", item: "Product C", offerAmount: 900, status: "Accepted" },
          { _id: "2", buyer: "Zara", item: "Product D", offerAmount: 700, status: "Pending" },
        ]);
      } catch (error) {
        console.error("Error fetching seller dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const stats = [
    { title: "Total Listings", value: listings.length, icon: <FaBox className="text-blue-500" /> },
    { title: "Total Orders", value: orders.length, icon: <FaClipboardList className="text-green-500" /> },
    { title: "Total Offers", value: offers.length, icon: <FaHandshake className="text-yellow-500" /> },
    { title: "Active Listings", value: listings.filter(l => l.status === "active").length, icon: <FaChartLine className="text-purple-500" /> },
  ];

  const handleViewListingDetails = (id: string) => {
    alert(`View details for listing ID: ${id}`);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Seller Dashboard</h1>

      {/* Stats Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <motion.div
            key={index}
            whileHover={{ scale: 1.05 }}
            className="bg-white rounded-2xl p-5 shadow hover:shadow-lg transition flex items-center gap-4"
          >
            <div className="text-3xl">{stat.icon}</div>
            <div>
              <p className="text-gray-600 text-sm">{stat.title}</p>
              <p className="text-2xl font-semibold text-gray-800">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Listings Section */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">Your Listings</h2>
        {loading ? (
          <p className="text-gray-500">Loading listings...</p>
        ) : listings.length === 0 ? (
          <p className="text-gray-500">No listings available.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing) => (
              <motion.div
                key={listing._id}
                whileHover={{ scale: 1.03 }}
                className="bg-white rounded-2xl p-5 shadow hover:shadow-lg transition"
              >
                <h3 className="text-lg font-semibold text-gray-800 mb-1">{listing.title}</h3>
                <p className="text-sm text-gray-600 mb-2">{listing.category}</p>
                <p className="text-gray-700 font-medium mb-2">Rs. {listing.price}</p>
                <p
                  className={`text-sm font-medium ${
                    listing.status === "active" ? "text-green-600" : "text-gray-500"
                  }`}
                >
                  Status: {listing.status}
                </p>
                <button
                  onClick={() => handleViewListingDetails(listing._id)}
                  className="mt-3 w-full text-sm py-2 rounded bg-blue-100 text-blue-700 hover:bg-blue-200"
                >
                  View Details
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Orders Section */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">Orders</h2>
        {orders.length === 0 ? (
          <p className="text-gray-500">No orders yet.</p>
        ) : (
          <div className="overflow-x-auto bg-white shadow rounded-2xl">
            <table className="min-w-full text-sm text-left">
              <thead className="bg-gray-100 text-gray-700 uppercase text-xs">
                <tr>
                  <th className="px-4 py-2">Buyer</th>
                  <th className="px-4 py-2">Item</th>
                  <th className="px-4 py-2">Total</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order._id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2">{order.buyer}</td>
                    <td className="px-4 py-2">{order.item}</td>
                    <td className="px-4 py-2">Rs. {order.total}</td>
                    <td className="px-4 py-2 text-green-600 font-medium">{order.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Offers Section */}
      <section>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">Offers</h2>
        {offers.length === 0 ? (
          <p className="text-gray-500">No offers yet.</p>
        ) : (
          <div className="overflow-x-auto bg-white shadow rounded-2xl">
            <table className="min-w-full text-sm text-left">
              <thead className="bg-gray-100 text-gray-700 uppercase text-xs">
                <tr>
                  <th className="px-4 py-2">Buyer</th>
                  <th className="px-4 py-2">Item</th>
                  <th className="px-4 py-2">Offer Amount</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {offers.map((offer) => (
                  <tr key={offer._id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2">{offer.buyer}</td>
                    <td className="px-4 py-2">{offer.item}</td>
                    <td className="px-4 py-2">Rs. {offer.offerAmount}</td>
                    <td className="px-4 py-2 text-yellow-600 font-medium">{offer.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default SellerDashboard;
