import React, { useEffect, useState } from "react";
import { getRequest } from "../../api";
import { 
  UserIcon, 
  CreditCardIcon, 
  CurrencyDollarIcon, 
  ClockIcon, 
  MagnifyingGlassIcon, 
  SparklesIcon,
  ArrowRightIcon, // Alternative to ArrowsRightLeftIcon
  ArrowLeftIcon,
  SwitchHorizontalIcon // This is the correct icon for bidirectional arrows
} from '@heroicons/react/24/outline';
import { motion } from "framer-motion";

const Transactions: React.FC = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredUsers, setFilteredUsers] = useState([]);

  useEffect(() => {
    let isMounted = true;

    const fetchUsers = async () => {
      setLoading(true);
      try {
        const usersResult = await getRequest("/user", setLoading);

        if (isMounted && usersResult) {
          const usersWithTransactions = await Promise.all(
            usersResult.map(async (user: any) => {
              const transactions = await getRequest(
                `/user/transactions/${user._id}`,
                setLoading
              );
              return { ...user, transactions };
            })
          );
          setUsers(usersWithTransactions);
          setFilteredUsers(usersWithTransactions);
        }
      } catch (err) {
        if (isMounted) {
          setError("Failed to fetch data. Please try again later.");
          console.error("Error fetching data:", err);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchUsers();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredUsers(users);
    } else {
      const lowercasedSearch = searchTerm.toLowerCase();
      const filtered = users.filter((user) => {
        if (
          user.username.toLowerCase().includes(lowercasedSearch) ||
          user.email.toLowerCase().includes(lowercasedSearch)
        ) {
          return true;
        }

        if (user.transactions?.length > 0) {
          const matchingTransactions = user.transactions.filter(
            (transaction) =>
              transaction._id.toLowerCase().includes(lowercasedSearch) ||
              transaction.orderId.toLowerCase().includes(lowercasedSearch) ||
              transaction.userId.toLowerCase().includes(lowercasedSearch) ||
              transaction.payerId.toLowerCase().includes(lowercasedSearch) ||
              transaction.amount.toString().includes(lowercasedSearch) ||
              transaction.currency.toLowerCase().includes(lowercasedSearch) ||
              transaction.timestamp.toLowerCase().includes(lowercasedSearch)
          );
          return matchingTransactions.length > 0;
        }

        return false;
      });
      setFilteredUsers(filtered);
    }
  }, [searchTerm, users]);

  if (loading) {
    return (
      <div className="p-6 bg-gray-800 rounded-xl border border-gray-700 animate-pulse">
        <div className="h-6 bg-gray-700 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-4 bg-gray-700 rounded w-full"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-gray-800 rounded-xl border border-gray-700 text-center">
        <div className="text-red-400 font-mono flex items-center justify-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {error}
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gray-900 p-6"
    >
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          className="flex items-center gap-3 mb-8"
        >
          <CreditCardIcon className="w-8 h-8 text-purple-400" />
          <h1 className="text-3xl font-bold text-white font-mono">Users & Transactions</h1>
          <span className="ml-auto text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded-full font-mono flex items-center gap-1">
            <SparklesIcon className="w-3 h-3" />
            LIVE DATA
          </span>
        </motion.div>

        {/* Search Input */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="max-w-4xl mx-auto mb-8"
        >
          <div className="relative group">
            <input
              type="text"
              placeholder="Search users or transactions..."
              className="w-full p-4 pl-12 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 text-white font-mono placeholder-gray-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <MagnifyingGlassIcon className="absolute left-4 top-4 h-5 w-5 text-gray-400 group-focus-within:text-purple-400" />
          </div>
        </motion.div>

        <div className="max-w-4xl mx-auto">
          {filteredUsers.length === 0 ? (
            <motion.div 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="text-center py-10 bg-gray-800 rounded-xl border border-gray-700"
            >
              <p className="text-gray-400 font-mono">No users or transactions found matching your search.</p>
            </motion.div>
          ) : (
            <ul className="space-y-6">
              {filteredUsers.map((user) => (
                <motion.li 
                  key={user._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 100 }}
                  className="p-6 rounded-xl bg-gray-800 border border-gray-700 shadow-lg hover:shadow-xl transition-all"
                >
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <UserIcon className="w-6 h-6 text-blue-400" />
                      <div>
                        <h2 className="text-xl font-semibold text-white font-mono">{user.username}</h2>
                        <p className="text-sm text-gray-400 font-mono">{user.email}</p>
                      </div>
                      <div className="ml-auto text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded-full font-mono">
                        {user.transactions?.length || 0} TXNS
                      </div>
                    </div>

                    <h3 className="text-lg font-semibold mt-4 text-white font-mono flex items-center gap-2">
                      <ArrowRightIcon className="w-5 h-5 text-purple-400" />
                      Transactions
                    </h3>
                    
                    {user.transactions?.length > 0 ? (
                      <ul className="mt-4 space-y-4">
                        {user.transactions.map((transaction) => (
                          <motion.li 
                            key={transaction._id}
                            whileHover={{ scale: 1.02 }}
                            className="p-4 rounded-lg bg-gray-700 border border-gray-600 shadow"
                          >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs text-gray-400 font-mono mb-1">TRANSACTION ID</p>
                                <p className="text-sm text-white font-mono break-all">{transaction._id}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-400 font-mono mb-1">ORDER ID</p>
                                <p className="text-sm text-white font-mono break-all">{transaction.orderId}</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                              <div>
                                <p className="text-xs text-gray-400 font-mono mb-1">AMOUNT</p>
                                <div className="flex items-center gap-2">
                                  <CurrencyDollarIcon className="w-4 h-4 text-green-400" />
                                  <p className="text-sm text-white font-mono">
                                    {transaction.amount} {transaction.currency}
                                  </p>
                                </div>
                              </div>
                              <div>
                                <p className="text-xs text-gray-400 font-mono mb-1">TIMESTAMP</p>
                                <div className="flex items-center gap-2">
                                  <ClockIcon className="w-4 h-4 text-yellow-400" />
                                  <p className="text-sm text-white font-mono">{transaction.timestamp}</p>
                                </div>
                              </div>
                              <div>
                                <p className="text-xs text-gray-400 font-mono mb-1">STATUS</p>
                                <span className="inline-block px-2 py-1 text-xs rounded-full bg-green-900 text-green-400 font-mono">
                                  Completed
                                </span>
                              </div>
                            </div>
                          </motion.li>
                        ))}
                      </ul>
                    ) : (
                      <div className="mt-4 p-4 bg-gray-700 rounded-lg border border-gray-600">
                        <p className="text-sm text-gray-400 font-mono text-center">
                          This user has no transactions yet.
                        </p>
                      </div>
                    )}
                  </div>
                </motion.li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default Transactions;