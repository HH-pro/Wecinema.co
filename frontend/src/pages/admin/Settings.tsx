import React, { useState, useEffect } from "react";
import { getRequest, putRequest, postRequest } from "../../api";
import { decodeToken } from "../../utilities/helperfFunction";
import { 
  UserIcon, 
  CogIcon, 
  LockClosedIcon, 
  ShieldCheckIcon, 
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { motion } from "framer-motion";

const token = localStorage.getItem("token") || null;

interface User {
  _id: string;
  username: string;
  email: string;
  avatar: string;
  dob: string;
  isAdmin?: boolean;
  isSubAdmin?: boolean;
}

interface AdminUser extends User {
  isAdmin: boolean;
  isSubAdmin: boolean;
}

interface AdminFormData {
  email: string;
  password: string;
  username: string;
  dob: string;
  confirmPassword: string;
  isAdmin: boolean;
  isSubAdmin: boolean;
}

interface AdminUsersResponse {
  count: number;
  users: AdminUser[];
}

const Settings: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Change Password State
  const [currentPassword, setCurrentPassword] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  // Admin Management State
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [adminFormData, setAdminFormData] = useState<AdminFormData>({
    email: "",
    password: "",
    username: "",
    dob: "",
    confirmPassword: "",
    isAdmin: false,
    isSubAdmin: false
  });
  const [adminError, setAdminError] = useState<string | null>(null);
  const [adminSuccess, setAdminSuccess] = useState<string | null>(null);

  // Fetch the current user details
  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        const tokenData = decodeToken(token);
        if (!tokenData.userId) {
          setError("User ID not found. Please log in again.");
          return;
        }

        // const result = await getRequest(`/user/${tokenData.userId}`, setLoading);
        if (result) {
          setUser(result);
          setUsername(result.username);
          setEmail(result.email);
          
          if (result.isAdmin) {
            fetchAdminUsers();
          }
        }
      } catch (err) {
        setError("Failed to fetch user details. Please try again later.");
        console.error("Error fetching user details:", err);
      } finally {
        setLoading(false);
      }
    };

    const fetchAdminUsers = async () => {
      try {
        const result = await getRequest<AdminUsersResponse>("/user/admin/users", setLoading);
        if (result) {
          if (Array.isArray(result)) {
            setAdminUsers(result);
          } else if (result.users && Array.isArray(result.users)) {
            setAdminUsers(result.users);
          } else {
            setAdminUsers([]);
          }
        }
      } catch (err) {
        console.error("Error fetching admin users:", err);
        setAdminUsers([]);
      }
    };

    fetchUser();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const updatedUser = await putRequest(
        `/user/edit/${user._id}`,
        { username, email },
        setLoading,
        "User updated successfully"
      );

      if (updatedUser) {
        setUser(updatedUser);
        setSuccess("User details updated successfully!");
      }
    } catch (err) {
      setError("Failed to update user details. Please try again later.");
      console.error("Error updating user details:", err);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
  
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirm password do not match.");
      return;
    }
  
    try {
      setLoading(true);
      setPasswordError(null);
      setPasswordSuccess(null);
  
      const response = await putRequest(
        "/user/change-password",
        { email: user?.email, currentPassword, newPassword },
        setLoading,
        "Password changed successfully"
      );
  
      if (response) {
        setPasswordSuccess("Password changed successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err) {
      if (err.response?.data?.error) {
        setPasswordError(err.response.data.error);
      } else {
        setPasswordError("Failed to change password. Please try again later.");
      }
      console.error("Error changing password:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (adminFormData.password !== adminFormData.confirmPassword) {
      setAdminError("Passwords do not match");
      return;
    }

    if (!adminFormData.isAdmin && !adminFormData.isSubAdmin) {
      setAdminError("Please select at least one role (Admin or SubAdmin)");
      return;
    }

    try {
      setLoading(true);
      setAdminError(null);
      setAdminSuccess(null);

      const response = await postRequest(
        "/user/admin/register",
        {
          email: adminFormData.email,
          password: adminFormData.password,
          username: adminFormData.username,
          dob: adminFormData.dob,
          isAdmin: adminFormData.isAdmin,
          isSubAdmin: adminFormData.isSubAdmin
        },
        setLoading,
        "User registered successfully"
      );

      if (response) {
        const result = await getRequest<AdminUsersResponse>("/user/admin/users", setLoading);
        if (result?.users) {
          setAdminUsers(result.users);
        }
        setAdminFormData({
          email: "",
          password: "",
          username: "",
          dob: "",
          confirmPassword: "",
          isAdmin: false,
          isSubAdmin: false
        });
        setAdminSuccess("New user registered successfully!");
      }
    } catch (err) {
      setAdminError(err.response?.data?.error || "Failed to register user");
      console.error("Error registering user:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAdmin = async (userId: string, options = {
    removeAdmin: true,
    removeSubAdmin: true
  }) => {
    try {
      setLoading(true);
      setAdminError(null);
      setAdminSuccess(null);
  
      const response = await putRequest(
        `/user/admin/remove/${userId}`,
        options,
        setLoading,
        "Privileges removed successfully"
      );
  
      if (response) {
        const result = await getRequest<AdminUsersResponse>("/user/admin/users", setLoading);
        if (result?.users) {
          setAdminUsers(result.users);
        }
        setAdminSuccess(response.message || "Privileges removed successfully!");
      }
    } catch (err) {
      setAdminError(err.response?.data?.error || "Failed to remove privileges.");
      console.error("Error removing privileges:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = (role: 'isAdmin' | 'isSubAdmin') => {
    setAdminFormData({
      ...adminFormData,
      [role]: !adminFormData[role]
    });
  };

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
          <XCircleIcon className="h-6 w-6" />
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
          <CogIcon className="w-8 h-8 text-purple-400" />
          <h1 className="text-3xl font-bold text-white font-mono">Settings</h1>
          <span className="ml-auto text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded-full font-mono flex items-center gap-1">
            <UserIcon className="w-3 h-3" />
            {user?.username}
          </span>
        </motion.div>

        <div className="max-w-4xl mx-auto space-y-6">
          {/* Update Profile Form */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="p-6 rounded-xl bg-gray-800 border border-gray-700 shadow-lg"
          >
            <div className="flex items-center gap-3 mb-6">
              <PencilIcon className="w-6 h-6 text-blue-400" />
              <h2 className="text-xl font-semibold text-white font-mono">Update Profile</h2>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-400 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  required
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  required
                />
              </div>

              {success && (
                <div className="p-3 bg-green-900/30 border border-green-700 rounded-lg text-green-400 font-mono flex items-center gap-2">
                  <CheckCircleIcon className="w-5 h-5" />
                  {success}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-mono transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </motion.div>

          {/* Change Password Form */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="p-6 rounded-xl bg-gray-800 border border-gray-700 shadow-lg"
          >
            <div className="flex items-center gap-3 mb-6">
              <LockClosedIcon className="w-6 h-6 text-purple-400" />
              <h2 className="text-xl font-semibold text-white font-mono">Change Password</h2>
            </div>
            <form onSubmit={handleChangePassword} className="space-y-6">
              <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-400 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  id="currentPassword"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  required
                />
              </div>

              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-400 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  required
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-400 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  required
                />
              </div>

              {passwordError && (
                <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 font-mono flex items-center gap-2">
                  <XCircleIcon className="w-5 h-5" />
                  {passwordError}
                </div>
              )}

              {passwordSuccess && (
                <div className="p-3 bg-green-900/30 border border-green-700 rounded-lg text-green-400 font-mono flex items-center gap-2">
                  <CheckCircleIcon className="w-5 h-5" />
                  {passwordSuccess}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-mono transition-colors"
                >
                  Change Password
                </button>
              </div>
            </form>
          </motion.div>

          {/* Admin Management Section */}
          {user?.isAdmin && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="p-6 rounded-xl bg-gray-800 border border-gray-700 shadow-lg"
            >
              <div className="flex items-center gap-3 mb-6">
                <ShieldCheckIcon className="w-6 h-6 text-cyan-400" />
                <h2 className="text-xl font-semibold text-white font-mono">User Management</h2>
              </div>
              
              {/* Add Admin Form */}
              <form onSubmit={handleAddAdmin} className="space-y-4 mb-6">
                <h3 className="text-lg font-medium text-gray-300 font-mono">Register New User</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="adminEmail" className="block text-sm font-medium text-gray-400 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      id="adminEmail"
                      value={adminFormData.email}
                      onChange={(e) => setAdminFormData({...adminFormData, email: e.target.value})}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="adminUsername" className="block text-sm font-medium text-gray-400 mb-1">
                      Username
                    </label>
                    <input
                      type="text"
                      id="adminUsername"
                      value={adminFormData.username}
                      onChange={(e) => setAdminFormData({...adminFormData, username: e.target.value})}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="adminDob" className="block text-sm font-medium text-gray-400 mb-1">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      id="adminDob"
                      value={adminFormData.dob}
                      onChange={(e) => setAdminFormData({...adminFormData, dob: e.target.value})}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="adminPassword" className="block text-sm font-medium text-gray-400 mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      id="adminPassword"
                      value={adminFormData.password}
                      onChange={(e) => setAdminFormData({...adminFormData, password: e.target.value})}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="adminConfirmPassword" className="block text-sm font-medium text-gray-400 mb-1">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      id="adminConfirmPassword"
                      value={adminFormData.confirmPassword}
                      onChange={(e) => setAdminFormData({...adminFormData, confirmPassword: e.target.value})}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      required
                    />
                  </div>
                </div>

                {/* Role Selection Checkboxes */}
                <div className="flex items-center space-x-6">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isAdmin"
                      checked={adminFormData.isAdmin}
                      onChange={() => handleRoleChange('isAdmin')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded bg-gray-700"
                    />
                    <label htmlFor="isAdmin" className="ml-2 block text-sm text-gray-300">
                      Admin
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isSubAdmin"
                      checked={adminFormData.isSubAdmin}
                      onChange={() => handleRoleChange('isSubAdmin')}
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-600 rounded bg-gray-700"
                    />
                    <label htmlFor="isSubAdmin" className="ml-2 block text-sm text-gray-300">
                      SubAdmin
                    </label>
                  </div>
                </div>

                {adminError && (
                  <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 font-mono flex items-center gap-2">
                    <XCircleIcon className="w-5 h-5" />
                    {adminError}
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-mono transition-colors"
                  >
                    Register User
                  </button>
                </div>
              </form>

              {/* Admin Users List */}
              <div>
                <h3 className="text-lg font-medium text-gray-300 mb-4 font-mono">
                  Current Users with Privileges ({adminUsers.length})
                </h3>
                {adminUsers.length > 0 ? (
                  <ul className="divide-y divide-gray-700">
                    {adminUsers.map((admin) => (
                      <motion.li 
                        key={admin._id} 
                        whileHover={{ scale: 1.01 }}
                        className="py-4 flex justify-between items-center"
                      >
                        <div>
                          <p className="text-sm font-medium text-white font-mono">{admin.username}</p>
                          <p className="text-sm text-gray-400 font-mono">{admin.email}</p>
                          <p className="text-xs text-gray-500 font-mono">
                            DOB: {new Date(admin.dob).toLocaleDateString()}
                          </p>
                          <div className="flex space-x-2 mt-1">
                            {admin.isAdmin && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-900/30 text-blue-400 border border-blue-700">
                                Admin
                              </span>
                            )}
                            {admin.isSubAdmin && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-900/30 text-purple-400 border border-purple-700">
                                SubAdmin
                              </span>
                            )}
                          </div>
                        </div>
                        {admin._id !== user._id && (
                          <button
                            onClick={() => handleRemoveAdmin(admin._id)}
                            className="text-sm bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg font-mono flex items-center gap-1 transition-colors"
                          >
                            <TrashIcon className="w-4 h-4" />
                            Remove
                          </button>
                        )}
                      </motion.li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 text-center py-4 font-mono">No privileged users found</p>
                )}
              </div>

              {adminSuccess && (
                <div className="mt-4 p-3 bg-green-900/30 border border-green-700 rounded-lg text-green-400 font-mono flex items-center gap-2">
                  <CheckCircleIcon className="w-5 h-5" />
                  {adminSuccess}
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default Settings;