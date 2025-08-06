import React, { useEffect, useState } from "react";
import { getRequest, deleteRequest, putRequest } from "../../api";
import { 
  DocumentTextIcon,
  PencilIcon,
  TrashIcon,
  UserCircleIcon,
  CalendarIcon,
  XMarkIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { motion } from "framer-motion";

interface Author {
  _id: string;
  username: string;
  avatar: string;
  followers: string[];
  followings: string[];
}

interface Script {
  _id: string;
  title: string;
  script: string;
  author: Author;
  createdAt: string;
}

const ScriptsPage: React.FC = () => {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [scriptToEdit, setScriptToEdit] = useState<Script | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [scriptToDelete, setScriptToDelete] = useState<string | null>(null);

  const fetchScripts = async () => {
    setLoading(true);
    try {
      const scriptsResult = await getRequest("/video/author/scripts", setLoading);
      if (scriptsResult) {
        setScripts(scriptsResult);
      }
    } catch (err) {
      setError("Failed to fetch scripts. Please try again later.");
      console.error("Error fetching scripts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScripts();
  }, []);

  const handleEditScript = async () => {
    if (!scriptToEdit) return;

    try {
      setLoading(true);
      await putRequest(
        `/video/scripts/${scriptToEdit._id}`,
        scriptToEdit,
        setLoading,
        "Script updated successfully"
      );
      await fetchScripts();
      setIsEditModalOpen(false);
    } catch (err) {
      setError("Failed to edit script. Please try again later.");
      console.error("Error editing script:", err);
    }
  };

  const handleDeleteScript = async () => {
    if (!scriptToDelete) return;

    try {
      setLoading(true);
      await deleteRequest(
        `/video/scripts/${scriptToDelete}`,
        setLoading,
        "Script deleted successfully"
      );
      await fetchScripts();
      setIsDeleteModalOpen(false);
    } catch (err) {
      setError("Failed to delete script. Please try again later.");
      console.error("Error deleting script:", err);
    }
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
          <XMarkIcon className="h-6 w-6" />
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
          <DocumentTextIcon className="w-8 h-8 text-purple-400" />
          <h1 className="text-3xl font-bold text-white font-mono">Scripts</h1>
          <span className="ml-auto text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded-full font-mono">
            {scripts.length} SCRIPTS
          </span>
        </motion.div>

        <div className="overflow-x-auto">
          <table className="min-w-full bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
            <thead className="bg-gray-700">
              <tr>
                <th className="py-3 px-4 text-left text-gray-300 font-mono">Title</th>
                <th className="py-3 px-4 text-left text-gray-300 font-mono">Script</th>
                <th className="py-3 px-4 text-left text-gray-300 font-mono">Author</th>
                <th className="py-3 px-4 text-left text-gray-300 font-mono">Created</th>
                <th className="py-3 px-4 text-left text-gray-300 font-mono">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {scripts.map((script) => (
                <motion.tr 
                  key={script._id}
                  whileHover={{ backgroundColor: 'rgba(55, 65, 81, 0.5)' }}
                  className="text-gray-300"
                >
                  <td className="py-3 px-4 font-mono">{script.title}</td>
                  <td className="py-3 px-4 font-mono max-w-xs truncate">{script.script}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center">
                      <img
                        src={script.author?.avatar || "https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg"}
                        alt={script.author?.username || "Unknown Author"}
                        className="w-8 h-8 rounded-full object-cover border border-gray-600"
                      />
                      <span className="ml-2 font-mono">{script.author?.username || "Unknown"}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono flex items-center gap-1">
                    <CalendarIcon className="w-4 h-4 text-gray-400" />
                    {new Date(script.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setScriptToEdit(script);
                          setIsEditModalOpen(true);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg font-mono flex items-center gap-1 transition-colors"
                      >
                        <PencilIcon className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          setScriptToDelete(script._id);
                          setIsDeleteModalOpen(true);
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg font-mono flex items-center gap-1 transition-colors"
                      >
                        <TrashIcon className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Edit Script Modal */}
        {isEditModalOpen && scriptToEdit && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-70 z-50">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-gray-800 border border-gray-700 p-6 rounded-xl shadow-xl w-full max-w-md"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-white font-mono">Edit Script</h2>
                <button 
                  onClick={() => setIsEditModalOpen(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1 font-mono">Title</label>
                  <input
                    type="text"
                    placeholder="Title"
                    value={scriptToEdit.title}
                    onChange={(e) => setScriptToEdit({ ...scriptToEdit, title: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-1 font-mono">Script</label>
                  <textarea
                    placeholder="Script"
                    value={scriptToEdit.script}
                    onChange={(e) => setScriptToEdit({ ...scriptToEdit, script: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    rows={6}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 mt-6">
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-mono transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditScript}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-mono flex items-center gap-1 transition-colors"
                >
                  <CheckIcon className="w-5 h-5" />
                  Save
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Delete Script Modal */}
        {isDeleteModalOpen && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-70 z-50">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-gray-800 border border-gray-700 p-6 rounded-xl shadow-xl w-full max-w-md"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-white font-mono">Confirm Deletion</h2>
                <button 
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
              
              <p className="text-gray-400 mb-6 font-mono">Are you sure you want to delete this script?</p>
              
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-mono transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteScript}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-mono flex items-center gap-1 transition-colors"
                >
                  <TrashIcon className="w-5 h-5" />
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ScriptsPage;