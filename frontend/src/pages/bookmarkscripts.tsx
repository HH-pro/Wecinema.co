import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Layout } from "../components";
import { getUserScriptBookmarks, unbookmarkScript, getCurrentUserFromToken } from "../api";
import { FaTrash, FaEye, FaClock, FaExclamationTriangle, FaArrowLeft } from "react-icons/fa";

interface ScriptBookmark {
  scriptId: string;
  title: string;
  genre?: string | string[];
  author?: {
    _id: string;
    username: string;
    avatar?: string;
  };
  bookmarkedAt: string;
  deleted: boolean;
  deletedAt?: string;
  status: "active" | "deleted";
}

const BookmarkScripts: React.FC = () => {
  const nav = useNavigate();
  const [bookmarks, setBookmarks] = useState<ScriptBookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "deleted">("all");

  useEffect(() => {
    // Get current user ID from token
    const currentUser = getCurrentUserFromToken();
    if (currentUser?.userId || currentUser?.id) {
      const id = currentUser.userId || currentUser.id;
      setUserId(id);
      fetchBookmarks(id);
    } else {
      toast.error("Please login to view bookmarks");
      nav("/");
    }
  }, [nav]);

  const fetchBookmarks = async (uid: string) => {
    try {
      setLoading(true);
      const result = await getUserScriptBookmarks(uid);
      
      if (result?.bookmarks) {
        setBookmarks(result.bookmarks);
      } else {
        setBookmarks([]);
      }
    } catch (error) {
      console.error("Error fetching bookmarks:", error);
      toast.error("Failed to load bookmarks");
      setBookmarks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveBookmark = async (scriptId: string) => {
    if (!userId) return;

    if (!window.confirm("Remove this bookmark?")) {
      return;
    }

    try {
      setDeleting(scriptId);
      await unbookmarkScript(scriptId, userId, setDeleting as any);
      
      // Remove from local state
      setBookmarks(prev => prev.filter(b => b.scriptId !== scriptId));
      toast.success("Bookmark removed successfully");
    } catch (error) {
      console.error("Error removing bookmark:", error);
      toast.error("Failed to remove bookmark");
    } finally {
      setDeleting(null);
    }
  };

  const filteredBookmarks = bookmarks.filter(bookmark => {
    if (activeFilter === "all") return true;
    if (activeFilter === "active") return !bookmark.deleted;
    if (activeFilter === "deleted") return bookmark.deleted;
    return true;
  });

  const activeCount = bookmarks.filter(b => !b.deleted).length;
  const deletedCount = bookmarks.filter(b => b.deleted).length;

  const getGenreDisplay = (genre: string | string[] | undefined): string => {
    if (!genre) return "N/A";
    if (Array.isArray(genre)) {
      return genre.slice(0, 2).join(", ");
    }
    return genre;
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => nav(-1)}
              className="flex items-center text-blue-600 hover:text-blue-700 mb-4 transition-colors"
            >
              <FaArrowLeft className="mr-2" />
              Back
            </button>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Bookmarked Scripts</h1>
            <p className="text-gray-600">Your saved scripts collection</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <div className="text-3xl font-bold text-gray-900 mb-1">{bookmarks.length}</div>
              <div className="text-sm text-gray-600">Total Bookmarks</div>
            </div>
            <div className="bg-white rounded-lg border border-emerald-200 p-4 shadow-sm">
              <div className="text-3xl font-bold text-emerald-600 mb-1">{activeCount}</div>
              <div className="text-sm text-gray-600">Available Scripts</div>
            </div>
            <div className="bg-white rounded-lg border border-red-200 p-4 shadow-sm">
              <div className="text-3xl font-bold text-red-600 mb-1">{deletedCount}</div>
              <div className="text-sm text-gray-600">Deleted Scripts</div>
            </div>
          </div>

          {/* Filter Tabs */}
          {bookmarks.length > 0 && (
            <div className="flex space-x-2 mb-8 overflow-x-auto">
              {[
                { key: "all", label: `All (${bookmarks.length})` },
                { key: "active", label: `Active (${activeCount})` },
                { key: "deleted", label: `Deleted (${deletedCount})` }
              ].map(filter => (
                <button
                  key={filter.key}
                  onClick={() => setActiveFilter(filter.key as "all" | "active" | "deleted")}
                  className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                    activeFilter === filter.key
                      ? "bg-blue-500 text-white shadow-md"
                      : "bg-white text-gray-700 border border-gray-200 hover:border-blue-300"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          )}

          {/* Content Area */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
              <p className="text-gray-600">Loading bookmarks...</p>
            </div>
          ) : filteredBookmarks.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
              <div className="text-5xl mb-4">📝</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {bookmarks.length === 0 ? "No Bookmarks Yet" : "No scripts in this filter"}
              </h3>
              <p className="text-gray-600 mb-6">
                {bookmarks.length === 0
                  ? "Start bookmarking scripts to save them for later"
                  : "Try adjusting your filters"}
              </p>
              {bookmarks.length === 0 && (
                <button
                  onClick={() => nav("/home")}
                  className="inline-block bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Explore Scripts
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBookmarks.map(bookmark => (
                <div
                  key={bookmark.scriptId}
                  className={`group relative bg-white rounded-lg overflow-hidden border transition-all duration-300 ${
                    bookmark.deleted
                      ? "border-red-200 opacity-75 hover:border-red-300"
                      : "border-gray-200 hover:border-blue-300 hover:shadow-lg"
                  }`}
                >
                  {/* Deleted Badge */}
                  {bookmark.deleted && (
                    <div className="absolute top-0 left-0 right-0 bg-red-100 border-b border-red-300 px-3 py-2 flex items-center justify-between z-10">
                      <div className="flex items-center text-red-700 text-xs font-medium">
                        <FaExclamationTriangle className="mr-1.5" />
                        Deleted
                      </div>
                      <span className="text-xs text-red-600">
                        {bookmark.deletedAt
                          ? new Date(bookmark.deletedAt).toLocaleDateString()
                          : "Recently"}
                      </span>
                    </div>
                  )}

                  {/* Header */}
                  <div className={`relative bg-gradient-to-br from-blue-100 to-indigo-100 p-6 text-center ${bookmark.deleted ? "pt-16" : ""}`}>
                    <div className="text-4xl mb-3">📝</div>
                    <h3 className="font-bold text-gray-900 text-lg line-clamp-2">
                      {bookmark.title || "Untitled Script"}
                    </h3>
                    {!bookmark.deleted && (
                      <div className="absolute bottom-2 right-2 bg-blue-500 text-white px-2 py-1 rounded text-xs font-medium">
                        Script
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    {/* Genre */}
                    {bookmark.genre && (
                      <div className="mb-3 pb-3 border-b border-gray-100">
                        <span className="inline-block bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-medium">
                          {getGenreDisplay(bookmark.genre)}
                        </span>
                      </div>
                    )}

                    {/* Author Info */}
                    {bookmark.author && (
                      <div className="flex items-center space-x-2 mb-4">
                        {bookmark.author.avatar && (
                          <img
                            src={bookmark.author.avatar}
                            alt={bookmark.author.username}
                            className="w-7 h-7 rounded-full"
                          />
                        )}
                        <div>
                          <p className="text-xs text-gray-600">By</p>
                          <p className="text-sm font-medium text-gray-900">
                            {bookmark.author.username}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="flex items-center justify-between mb-4 text-gray-500 text-xs">
                      <div className="flex items-center">
                        <FaClock className="mr-1.5" />
                        {new Date(bookmark.bookmarkedAt).toLocaleDateString()}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex space-x-2">
                      {!bookmark.deleted && (
                        <button
                          onClick={() => nav(`/script/${bookmark.scriptId}`)}
                          className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg font-medium text-sm transition-colors flex items-center justify-center"
                        >
                          <FaEye className="mr-2" />
                          View
                        </button>
                      )}
                      <button
                        onClick={() => handleRemoveBookmark(bookmark.scriptId)}
                        disabled={deleting === bookmark.scriptId}
                        className={`p-2 rounded-lg transition-colors ${
                          deleting === bookmark.scriptId
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                            : "bg-red-50 text-red-600 hover:bg-red-100"
                        }`}
                        title="Remove bookmark"
                      >
                        <FaTrash />
                      </button>
                    </div>

                    {bookmark.deleted && (
                      <p className="text-xs text-red-600 mt-3 p-2 bg-red-50 rounded text-center">
                        This script has been deleted by the creator
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default BookmarkScripts;
