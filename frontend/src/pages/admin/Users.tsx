import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { getRequest, deleteRequest, postRequest, putRequest } from "../../api";
import { 
  UserIcon, 
  TrashIcon, 
  PencilIcon, 
  PlusIcon, 
  MagnifyingGlassIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

interface User {
  _id: string;
  username: string;
  email: string;
  dob: string;
  subscriptionType: string;
  lastPayment?: string;
  avatar?: string;
  isAdmin?: boolean;
}

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({ 
    username: "", 
    email: "", 
    password: "", 
    dob: "" 
  });
  const [userToEdit, setUserToEdit] = useState<User>({ 
    _id: "", 
    username: "", 
    email: "", 
    avatar: "", 
    dob: "" 
  });
  const [searchTerm, setSearchTerm] = useState("");

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const usersResult = await getRequest("/user", setLoading);
      if (usersResult) {
        const nonAdminUsers = usersResult.filter((user: User) => !user.isAdmin);
        setUsers(nonAdminUsers);
        setFilteredUsers(nonAdminUsers);
      }
    } catch (err) {
      setError("Failed to fetch users. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    const filtered = users.filter(
      (user) =>
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.dob && user.dob.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.subscriptionType && user.subscriptionType.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredUsers(filtered);
  }, [searchTerm, users]);

  const handleDeleteUser = async (userId: string) => {
    try {
      await deleteRequest(`/user/admin/users/${userId}`, setLoading, "User deleted successfully");
      await fetchUsers();
      closeDeleteModal();
    } catch (err) {
      setError("Failed to delete user. Please try again later.");
    }
  };

  const handleAddUser = async () => {
    try {
      setLoading(true);
      await postRequest("/user/register", newUser, setLoading, "User added successfully");
      await fetchUsers();
      closeAddUserModal();
    } catch (err) {
      setError("Failed to add user. Please try again later.");
    }
  };

  const handleEditUser = async () => {
    try {
      setLoading(true);
      await putRequest(
        `/user/admin/edit/${userToEdit._id}`,
        userToEdit,
        setLoading,
        "User updated successfully"
      );
      await fetchUsers();
      closeEditUserModal();
    } catch (err) {
      setError("Failed to edit user. Please try again later.");
    }
  };

  // Modal handlers
  const openDeleteModal = (userId: string) => {
    setUserToDelete(userId);
    setIsModalOpen(true);
  };

  const closeDeleteModal = () => {
    setUserToDelete(null);
    setIsModalOpen(false);
  };

  const closeAddUserModal = () => {
    setIsAddModalOpen(false);
    setNewUser({ username: "", email: "", password: "", dob: "" });
  };

  const openEditModal = (user: User) => {
    setUserToEdit(user);
    setIsEditModalOpen(true);
  };

  const closeEditUserModal = () => {
    setIsEditModalOpen(false);
    setUserToEdit({ _id: "", username: "", email: "", avatar: "", dob: "" });
  };

  if (loading) return (
    <div className="p-6 bg-gray-800 rounded-xl border border-gray-700 animate-pulse">
      <div className="h-8 bg-gray-700 rounded w-1/4 mb-6 mx-auto"></div>
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 bg-gray-700 rounded-xl"></div>
        ))}
      </div>
    </div>
  );

  if (error) return (
    <div className="p-6 bg-gray-800 rounded-xl border border-red-500 text-center text-red-400 font-mono">
      <SparklesIcon className="h-6 w-6 mx-auto mb-2" />
      {error}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-4 sm:p-10">
      <motion.h1 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl sm:text-3xl font-bold text-center text-white mb-6 font-mono"
      >
        USERS MANAGEMENT
      </motion.h1>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-5xl mx-auto bg-gray-800 shadow-xl rounded-xl p-4 sm:p-6 border border-gray-700"
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsAddModalOpen(true)}
            className="bg-gradient-to-r from-purple-600 to-blue-500 text-white px-6 py-3 rounded-xl hover:shadow-purple/30 hover:shadow-lg transition-all w-full sm:w-auto flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            Add User
          </motion.button>
          
          <div className="w-full sm:w-64 relative">
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full bg-gray-700 border border-gray-600 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-gray-300"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-700">
          <table className="min-w-full">
            <thead className="bg-gradient-to-r from-purple-600 to-blue-500">
              <tr>
                {['ID', 'Date Of Birth', 'Username', 'Email', 'Subscription', 'Last Payment', 'Actions'].map((header, idx) => (
                  <th key={idx} className="py-4 px-4 border-b border-gray-600 text-left text-sm font-semibold text-white font-mono">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-gray-800">
              {filteredUsers.map((user, index) => (
                <motion.tr
                  key={user._id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-gray-300 hover:bg-gray-700/50 transition-colors"
                >
                  <td className="py-3 px-4 border-b border-gray-700 font-mono">{index + 1}</td>
                  <td className="py-3 px-4 border-b border-gray-700">{user.dob}</td>
                  <td className="py-3 px-4 border-b border-gray-700 font-medium">{user.username}</td>
                  <td className="py-3 px-4 border-b border-gray-700">{user.email}</td>
                  <td className="py-3 px-4 border-b border-gray-700">
                    <span className="inline-block px-2 py-1 rounded-full bg-gray-700 text-xs font-mono">
                      {user.subscriptionType?.toUpperCase() || "BASIC"}
                    </span>
                  </td>
                  <td className="py-3 px-4 border-b border-gray-700">
                    {user.lastPayment || "N/A"}
                  </td>
                  <td className="py-3 px-4 border-b border-gray-700">
                    <div className="flex space-x-2">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => openEditModal(user)}
                        className="p-2 bg-gray-700 rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        <PencilIcon className="w-5 h-5 text-blue-400" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => openDeleteModal(user._id)}
                        className="p-2 bg-gray-700 rounded-lg hover:bg-red-600 transition-colors"
                      >
                        <TrashIcon className="w-5 h-5 text-red-400" />
                      </motion.button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          {filteredUsers.length === 0 && (
            <div className="p-6 text-center text-gray-400 font-mono">
              No users found matching your search.
            </div>
          )}
        </div>
      </motion.div>

      {/* Delete Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            className="bg-gray-800 p-6 rounded-xl border border-gray-700 w-full max-w-md"
          >
            <h2 className="text-xl font-semibold text-white mb-4 font-mono">Confirm Deletion</h2>
            <p className="text-gray-400 mb-6">Are you sure you want to delete this user?</p>
            <div className="flex justify-end space-x-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={closeDeleteModal}
                className="bg-gray-700 text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={() => userToDelete && handleDeleteUser(userToDelete)}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <TrashIcon className="w-5 h-5" />
                Delete
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Add User Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            className="bg-gray-800 p-6 rounded-xl border border-gray-700 w-full max-w-md relative"
          >
            <button
              onClick={closeAddUserModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              ✖
            </button>
            <h2 className="text-xl font-semibold text-white mb-6 font-mono">CREATE NEW USER</h2>
            <div className="space-y-4">
              {['username', 'email', 'password', 'dob'].map((field) => (
                <div key={field}>
                  <label className="block text-sm text-gray-400 mb-2 font-mono">
                    {field.charAt(0).toUpperCase() + field.slice(1)}
                  </label>
                  <input
                    type={field === 'password' ? 'password' : field === 'dob' ? 'date' : 'text'}
                    placeholder={`Enter ${field}`}
                    value={newUser[field as keyof typeof newUser]}
                    onChange={(e) => setNewUser({ ...newUser, [field]: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-purple-500 text-gray-300"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end space-x-4 mt-6">
              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={closeAddUserModal}
                className="bg-gray-700 text-gray-300 px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={handleAddUser}
                className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
              >
                <PlusIcon className="w-5 h-5" />
                Register
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
{isEditModalOpen && (
  <div className="fixed inset-0 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
    <motion.div
      initial={{ scale: 0.95 }}
      animate={{ scale: 1 }}
      className="bg-gray-800 p-6 rounded-xl border border-gray-700 w-full max-w-md relative flex flex-col max-h-[90vh]"
    >
      <button
        onClick={closeEditUserModal}
        className="absolute top-4 right-4 text-gray-400 hover:text-white"
      >
        ✖
      </button>
      <h2 className="text-xl font-semibold text-white mb-4 font-mono">EDIT USER</h2>

      <div className="overflow-y-auto max-h-[60vh] pb-4 space-y-4">
        {/* Username */}
        <div>
          <label className="flex text-sm text-gray-400 mb-2 font-mono">Username</label>
          <input
            type="text"
            value={userToEdit.username || ''}
            onChange={(e) => setUserToEdit({ ...userToEdit, username: e.target.value })}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-purple-500 text-gray-300"
          />
        </div>

        {/* Email */}
        <div>
          <label className="flex text-sm text-gray-400 mb-2 font-mono">Email</label>
          <input
            type="email"
            value={userToEdit.email || ''}
            onChange={(e) => setUserToEdit({ ...userToEdit, email: e.target.value })}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-purple-500 text-gray-300"
          />
        </div>

        {/* Date of Birth */}
        <div>
          <label className="flex text-sm text-gray-400 mb-2 font-mono">Date of Birth</label>
          <input
            type="date"
            value={userToEdit.dob || ''}
            onChange={(e) => setUserToEdit({ ...userToEdit, dob: e.target.value })}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-purple-500 text-gray-300"
          />
        </div>
      </div>

      <div className="flex justify-end space-x-4 mt-6 pt-4 border-t border-gray-700">
        <motion.button
          whileHover={{ scale: 1.05 }}
          onClick={closeEditUserModal}
          className="bg-gray-700 text-gray-300 px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors"
        >
          Cancel
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          onClick={handleEditUser}
          className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
        >
          <PencilIcon className="w-5 h-5" />
          Save Changes
        </motion.button>
      </div>
    </motion.div>
  </div>
)}

    </div>
  );
};

export default Users;