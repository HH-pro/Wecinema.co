import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getRequest, putRequest, deleteRequest } from "../../api";
import { formatDateAgo, truncateText, generateSlug } from "../../utilities/helperfFunction";
import { PencilIcon, TrashIcon, PlayIcon } from "@heroicons/react/24/outline";
import { motion } from "framer-motion";

interface Author {
  _id: string;
  username: string;
  avatar: string;
  followers: string[];
  followings: string[];
}

interface Video {
  _id: string;
  title: string;
  description: string;
  url: string;
  genre: string;
  duration: number;
  createdAt: string;
  author: Author;
}

interface GalleryProps {
  title?: string;
  type?: string;
  data?: string;
  category?: string;
  length?: number;
  isFirst?: boolean;
}

const Gallery: React.FC<GalleryProps> = ({ title, data, category }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [videos, setVideos] = useState<Video[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [videoToDelete, setVideoToDelete] = useState<string | null>(null);
  const [videoToEdit, setVideoToEdit] = useState<Video | null>(null);

  const fetchVideos = async () => {
    setLoading(true);
    try {
      const endpoint = data ? `video/all/${data}` : "video/all";
      const result = await getRequest<Video[]>(endpoint, setLoading);
      if (result) setVideos(result);
    } catch (err) {
      setError("Failed to fetch videos. Please try again later.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, [category, data]);

  const handleEditVideo = async () => {
    if (!videoToEdit) return;
    try {
      setLoading(true);
      await putRequest(`/video/edit/${videoToEdit._id}`, videoToEdit, setLoading, "Video updated successfully");
      await fetchVideos();
      setIsEditModalOpen(false);
    } catch (err) {
      setError("Failed to edit video.");
      console.error(err);
    }
  };

  const handleDeleteVideo = async () => {
    if (!videoToDelete) return;
    try {
      setLoading(true);
      await deleteRequest(`/video/delete/${videoToDelete}`, setLoading, "Video deleted successfully");
      await fetchVideos();
      setIsDeleteModalOpen(false);
    } catch (err) {
      setError("Failed to delete video.");
      console.error(err);
    }
  };

  if (loading) {
    return <div className="text-center text-white font-mono text-lg mt-10">Loading videos...</div>;
  }

  if (error) {
    return (
      <div className="text-center bg-red-500 text-white px-4 py-2 rounded-lg font-mono mt-10">
        {error}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gray-900 text-white py-10 px-4"
    >
      {title && <h2 className="text-3xl font-bold text-center mb-8 font-mono">{title}</h2>}

      <div className="max-w-7xl mx-auto overflow-x-auto">
        <table className="min-w-full bg-gray-800 rounded-xl border border-gray-700">
          <thead>
            <tr className="bg-purple-700 text-white text-sm uppercase font-semibold">
              <th className="px-4 py-3 text-left">Title</th>
              <th className="px-4 py-3 text-left">Author</th>
              <th className="px-4 py-3 text-left">Genre</th>
              <th className="px-4 py-3 text-left">Created</th>
              <th className="px-4 py-3 text-left">Watch</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {videos.map((video) => (
              <tr key={video._id} className="border-b border-gray-700 hover:bg-gray-700 transition-all">
                <td className="px-4 py-3">{truncateText(video.title, 50)}</td>
                <td className="px-4 py-3 flex items-center gap-2">
                  <img
                    src={video.author?.avatar || "/default-avatar.png"}
                    alt="avatar"
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <span>{video.author?.username || "Unknown"}</span>
                </td>
                <td className="px-4 py-3">{video.genre}</td>
                <td className="px-4 py-3">{formatDateAgo(video.createdAt)}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => navigate(`/video/${generateSlug(video.title)}`)}
                    className="flex items-center gap-1 text-purple-300 hover:text-purple-100 font-mono"
                  >
                    <PlayIcon className="w-4 h-4" />
                    Watch
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setVideoToEdit(video);
                        setIsEditModalOpen(true);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md flex items-center gap-1"
                    >
                      <PencilIcon className="w-4 h-4" /> Edit
                    </button>
                    <button
                      onClick={() => {
                        setVideoToDelete(video._id);
                        setIsDeleteModalOpen(true);
                      }}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md flex items-center gap-1"
                    >
                      <TrashIcon className="w-4 h-4" /> Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && videoToEdit && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-70 z-50">
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4 text-white">Edit Video</h3>
            <div className="space-y-3">
              <input type="text" className="w-full bg-gray-700 text-white p-2 rounded" value={videoToEdit.title} onChange={(e) => setVideoToEdit({ ...videoToEdit, title: e.target.value })} placeholder="Title" />
              <input type="text" className="w-full bg-gray-700 text-white p-2 rounded" value={videoToEdit.description} onChange={(e) => setVideoToEdit({ ...videoToEdit, description: e.target.value })} placeholder="Description" />
              <input type="text" className="w-full bg-gray-700 text-white p-2 rounded" value={videoToEdit.url} onChange={(e) => setVideoToEdit({ ...videoToEdit, url: e.target.value })} placeholder="Video URL" />
              <input type="text" className="w-full bg-gray-700 text-white p-2 rounded" value={videoToEdit.genre} onChange={(e) => setVideoToEdit({ ...videoToEdit, genre: e.target.value })} placeholder="Genre" />
              <input type="number" className="w-full bg-gray-700 text-white p-2 rounded" value={videoToEdit.duration} onChange={(e) => setVideoToEdit({ ...videoToEdit, duration: parseInt(e.target.value) })} placeholder="Duration (min)" />
            </div>
            <div className="flex justify-end mt-4 gap-2">
              <button onClick={() => setIsEditModalOpen(false)} className="bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded text-white">Cancel</button>
              <button onClick={handleEditVideo} className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded text-white">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-70 z-50">
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 text-white w-full max-w-sm">
            <h3 className="text-lg font-bold mb-2">Delete Video</h3>
            <p className="mb-4">Are you sure you want to delete this video?</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setIsDeleteModalOpen(false)} className="bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded">Cancel</button>
              <button onClick={handleDeleteVideo} className="bg-red-600 hover:bg-red-500 px-4 py-2 rounded">Delete</button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default Gallery;
