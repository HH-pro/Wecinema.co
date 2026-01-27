import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Layout } from "../components";
import { getUserVideoBookmarks, unbookmarkVideo, getCurrentUserFromToken } from "../api";
import { FaTrash, FaPlay, FaClock, FaExclamationTriangle, FaArrowLeft } from "react-icons/fa";

interface Bookmark {
  videoId: string;
  title: string;
  thumbnail?: string;
  author?: {
    _id: string;
    username: string;
    avatar?: string;
  };
  bookmarkedAt: string;
  deleted: boolean;
  deletedAt?: string;
  status: "active" | "deleted";
  description?: string;
}

const BookmarkVideos: React.FC = () => {
  const nav = useNavigate();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
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
      const result = await getUserVideoBookmarks(uid);
      
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

  const handleRemoveBookmark = async (videoId: string) => {
    if (!userId) return;

    if (!window.confirm("Remove this bookmark?")) {
      return;
    }

    try {
      setDeleting(videoId);
      await unbookmarkVideo(videoId, userId, setDeleting as any);
      
      // Remove from local state
      setBookmarks(prev => prev.filter(b => b.videoId !== videoId));
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

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50 p-4 md:p-8">
        <div className="max-w-7xl mx-auto mt-10">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => nav(-1)}
              className="flex items-center text-yellow-600 hover:text-yellow-700 mb-4 transition-colors"
            >
              <FaArrowLeft className="mr-2" />
              Back
            </button>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Bookmarked Videos</h1>
            <p className="text-gray-600">Your saved videos collection</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <div className="text-3xl font-bold text-gray-900 mb-1">{bookmarks.length}</div>
              <div className="text-sm text-gray-600">Total Bookmarks</div>
            </div>
            <div className="bg-white rounded-lg border border-emerald-200 p-4 shadow-sm">
              <div className="text-3xl font-bold text-emerald-600 mb-1">{activeCount}</div>
              <div className="text-sm text-gray-600">Available Videos</div>
            </div>
            <div className="bg-white rounded-lg border border-red-200 p-4 shadow-sm">
              <div className="text-3xl font-bold text-red-600 mb-1">{deletedCount}</div>
              <div className="text-sm text-gray-600">Deleted Videos</div>
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
                      ? "bg-yellow-500 text-white shadow-md"
                      : "bg-white text-gray-700 border border-gray-200 hover:border-yellow-300"
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
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500 mb-4"></div>
              <p className="text-gray-600">Loading bookmarks...</p>
            </div>
          ) : filteredBookmarks.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
              <div className="text-5xl mb-4">🔖</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {bookmarks.length === 0 ? "No Bookmarks Yet" : "No videos in this filter"}
              </h3>
              <p className="text-gray-600 mb-6">
                {bookmarks.length === 0
                  ? "Start bookmarking videos to save them for later"
                  : "Try adjusting your filters"}
              </p>
              {bookmarks.length === 0 && (
                <button
                  onClick={() => nav("/home")}
                  className="inline-block bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Explore Videos
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredBookmarks.map(bookmark => (
                <div
                  key={bookmark.videoId}
                  className={`group relative bg-white rounded-lg overflow-hidden border transition-all duration-300 ${
                    bookmark.deleted
                      ? "border-red-200 opacity-75 hover:border-red-300"
                      : "border-gray-200 hover:border-yellow-300 hover:shadow-lg"
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

                  {/* Thumbnail */}
                  <div className={`relative overflow-hidden bg-gray-200 ${bookmark.deleted ? "pt-10" : ""}`}>
                    {bookmark.thumbnail ? (
                      <img
                        src={bookmark.thumbnail}
                        alt={bookmark.title}
                        className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-40 bg-gradient-to-br from-yellow-100 to-yellow-200 flex items-center justify-center">
                        <span className="text-4xl">🎬</span>
                      </div>
                    )}

                    {/* Play Button Overlay */}
                    {!bookmark.deleted && (
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300 flex items-center justify-center">
                        <button
                          onClick={() => nav(`/video/${bookmark.videoId}`)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-yellow-500 hover:bg-yellow-600 text-white p-3 rounded-full transition-colors"
                        >
                          <FaPlay />
                        </button>
                      </div>
                    )}

                    {/* Badge */}
                    {!bookmark.deleted && (
                      <div className="absolute bottom-2 right-2 bg-yellow-500 text-white px-2 py-1 rounded text-xs font-medium">
                        Video
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 text-sm">
                      {bookmark.title || "Untitled Video"}
                    </h3>

                    {bookmark.description && (
                      <p className="text-gray-600 text-xs mb-3 line-clamp-2">
                        {bookmark.description}
                      </p>
                    )}

                    {/* Author Info */}
                    {bookmark.author && (
                      <div className="flex items-center space-x-2 mb-3 pb-3 border-b border-gray-100">
                        {bookmark.author.avatar && (
                          <img
                            src={bookmark.author.avatar}
                            alt={bookmark.author.username}
                            className="w-6 h-6 rounded-full"
                          />
                        )}
                        <span className="text-xs text-gray-600">
                          {bookmark.author.username}
                        </span>
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center text-gray-500 text-xs">
                        <FaClock className="mr-1.5" />
                        {new Date(bookmark.bookmarkedAt).toLocaleDateString()}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex space-x-2">
                      {!bookmark.deleted && (
                        <button
                          onClick={() => nav(`/video/${bookmark.videoId}`)}
                          className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white py-2 rounded-lg font-medium text-sm transition-colors"
                        >
                          Watch
                        </button>
                      )}
                      <button
                        onClick={() => handleRemoveBookmark(bookmark.videoId)}
                        disabled={deleting === bookmark.videoId}
                        className={`p-2 rounded-lg transition-colors ${
                          deleting === bookmark.videoId
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
                        This video has been deleted by the creator
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

export default BookmarkVideos;
