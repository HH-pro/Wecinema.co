import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Delete, Layout, Render } from "../components";
import { deleteRequest, getRequest, putRequest, bookmarkVideo, unbookmarkVideo, bookmarkScript, unbookmarkScript, getCurrentUserFromToken } from "../api";
import { decodeToken } from "../utilities/helperfFunction";
import '../components/header/drowpdown.css';
import { 
  FaEdit, FaStore, FaShoppingCart, FaUserTie, FaUser, 
  FaSync, FaHeart, FaUsers, FaVideo, FaFileAlt, 
  FaCalendar, FaEnvelope, FaStar, FaCheckCircle, FaEye, FaTrash, FaBookmark
} from 'react-icons/fa';
import { BsThreeDotsVertical } from 'react-icons/bs';
import axios from 'axios';
import cover from '.././assets/public/cover.jpg';
import avatar from '.././assets/public/avatar.jpg';
import '../App.css';
import { API_BASE_URL } from "../api";

const token = localStorage.getItem("token") || null;

const UserProfilePage: React.FC = () => {
    const { id } = useParams();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>({});
    const [menuOpen, setMenuOpen] = useState<number | null>(null);
    const [editMode, setEditMode] = useState(false);
    const [formData, setFormData] = useState({ username: "", dob: "", bio: "" });
    const [userHasPaid, setUserHasPaid] = useState(false);
    const [currentUserHasPaid, setCurrentUserHasPaid] = useState(false);
    const [data, setData] = useState<any>([]);
    const [showMoreIndex, setShowMoreIndex] = useState<number | null>(null);
    const [marketplaceMode, setMarketplaceMode] = useState<'buyer' | 'seller'>('buyer');
    const [changingMode, setChangingMode] = useState(false);
    const [activeTab, setActiveTab] = useState('scripts');
    const nav = useNavigate();
    const [scripts, setScripts] = useState<any>([]);
    const [videos, setVideos] = useState<any>([]);
    const [isCurrentUser, setIsCurrentUser] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [contentLoading, setContentLoading] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [videoBookmarks, setVideoBookmarks] = useState<Set<string>>(new Set());
    const [scriptBookmarks, setScriptBookmarks] = useState<Set<string>>(new Set());
    const [bookmarkingIds, setBookmarkingIds] = useState<Set<string>>(new Set());

    // Direct API call for changing user type
    const changeUserTypeDirect = async (userId: string, userType: string) => {
        try {
            setChangingMode(true);
            const token = localStorage.getItem("token");
            
            const response = await axios.put(
                `${API_BASE_URL}/user/change-type/${userId}`,
                { userType },
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                }
            );
            window.location.reload();
            // toast.success(`Switched to ${userType} mode`);
            return response.data;
        } catch (error: any) {
            console.error("Error changing user type:", error);
            toast.error(error.response?.data?.error || "Failed to change user type");
            throw error;
        } finally {
            setChangingMode(false);
        }
    };

    useEffect(() => {
        if (!id) {
            toast.error("User ID not found");
            setLoading(false);
            return;
        }

        // Get current user ID from token
        const currentUser = getCurrentUserFromToken();
        if (currentUser?.userId || currentUser?.id) {
            setCurrentUserId(currentUser.userId || currentUser.id);
        }

        fetchUserData();
    }, [id]);

    const fetchUserData = async () => {
        try {
            setLoading(true);
            setContentLoading(true);
            
            // Fetch user data
            const result: any = await getRequest("/user/" + id, setLoading);
            if (!result) {
                toast.error("User not found");
                return;
            }
            
            setUser(result);
            
            // Set marketplace mode from user data
            if (result.userType) {
                setMarketplaceMode(result.userType);
                localStorage.setItem('marketplaceMode', result.userType);
            }
            
            // Set form data
            setFormData({ 
                username: result.username, 
                dob: result.dob,
                bio: result.bio || '' 
            });

            // Check if current user is viewing their own profile
            const tokenData = decodeToken(token);
            if (tokenData && tokenData.userId === id) {
                setIsCurrentUser(true);
            }

            try {
                const paymentResponse = await axios.get(`${API_BASE_URL}/user/payment-status/${id}`);
                setUserHasPaid(paymentResponse.data.hasPaid);
            } catch (error) {
                console.error("Error fetching payment status:", error);
                setUserHasPaid(false);
            }

            if (tokenData) {
                try {
                    const currentUserResponse = await axios.get(`${API_BASE_URL}/user/payment-status/${tokenData.userId}`);
                    setCurrentUserHasPaid(currentUserResponse.data.hasPaid);
                } catch (error) {
                    console.error("Error fetching current user payment status:", error);
                }
            }

            await fetchUserContent();

        } catch (error) {
            console.error("Error fetching data:", error);
            toast.error("Failed to load profile data");
        } finally {
            setLoading(false);
            setRefreshing(false);
            setContentLoading(false);
        }
    };

    const fetchUserContent = async () => {
        try {
            const scriptsResult: any = await getRequest(`video/authors/${id}/scripts`, setContentLoading);
            if (scriptsResult) {
                setScripts(scriptsResult.map((res: any) => res.script));
                setData(scriptsResult);
            } else {
                setScripts([]);
            }

            const videosResult: any = await getRequest(`video/authors/${id}/videos`, setContentLoading);
            if (videosResult) {
                setVideos(videosResult);
            } else {
                setVideos([]);
            }
        } catch (error) {
            console.error("Error fetching user content:", error);
            setScripts([]);
            setVideos([]);
        }
    };

    const toggleMarketplaceMode = async () => {
        if (!id) {
            toast.error("User not found");
            return;
        }

        if (!isCurrentUser) {
            toast.error("You can only change your own mode");
            return;
        }

        const newMode = marketplaceMode === 'buyer' ? 'seller' : 'buyer';
        
        try {
            const result = await changeUserTypeDirect(id, newMode);
            
            if (result) {
                setMarketplaceMode(newMode);
                setUser(prev => ({ ...prev, userType: newMode }));
                localStorage.setItem('marketplaceMode', newMode);
            }
        } catch (error: any) {
            console.error("Error changing user type:", error);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        fetchUserData();
        toast.info("Refreshing profile...");
    };

    const deleteScript = async (scriptId: string) => {
        if (!window.confirm("Are you sure you want to delete this script?")) {
            return;
        }

        try {
            const result: any = await deleteRequest(`video/scripts/${scriptId}`, setContentLoading);
            if (result) {
                setScripts(prevScripts => prevScripts.filter((script, index) => data[index]?._id !== scriptId));
                setData(prevData => prevData.filter((item: any) => item._id !== scriptId));
                toast.success("Script deleted successfully");
            }
        } catch (error) {
            console.error("Error deleting script:", error);
            toast.error("Error deleting script");
        }
    };

    const handleBookmarkVideo = async (videoId: string) => {
        if (!currentUserId) {
            toast.error("Please login to bookmark videos");
            return;
        }

        try {
            setBookmarkingIds(prev => new Set([...prev, videoId]));
            
            if (videoBookmarks.has(videoId)) {
                // Remove bookmark
                await unbookmarkVideo(videoId, currentUserId);
                setVideoBookmarks(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(videoId);
                    return newSet;
                });
                toast.success("Bookmark removed");
            } else {
                // Add bookmark
                await bookmarkVideo(videoId, currentUserId);
                setVideoBookmarks(prev => new Set([...prev, videoId]));
                toast.success("Video bookmarked");
            }
        } catch (error) {
            console.error("Error bookmarking video:", error);
            toast.error("Failed to bookmark video");
        } finally {
            setBookmarkingIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(videoId);
                return newSet;
            });
        }
    };

    const handleBookmarkScript = async (scriptId: string) => {
        if (!currentUserId) {
            toast.error("Please login to bookmark scripts");
            return;
        }

        try {
            setBookmarkingIds(prev => new Set([...prev, scriptId]));
            
            if (scriptBookmarks.has(scriptId)) {
                // Remove bookmark
                await unbookmarkScript(scriptId, currentUserId);
                setScriptBookmarks(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(scriptId);
                    return newSet;
                });
                toast.success("Bookmark removed");
            } else {
                // Add bookmark
                await bookmarkScript(scriptId, currentUserId);
                setScriptBookmarks(prev => new Set([...prev, scriptId]));
                toast.success("Script bookmarked");
            }
        } catch (error) {
            console.error("Error bookmarking script:", error);
            toast.error("Failed to bookmark script");
        } finally {
            setBookmarkingIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(scriptId);
                return newSet;
            });
        }
    };

    const handleEdit = () => {
        setEditMode(true);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prevData) => ({ ...prevData, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const result = await putRequest("/user/edit/" + id, formData, setContentLoading);
            setUser(result.user);
            setEditMode(false);
            // toast.success("Profile updated successfully");
        } catch (error) {
            console.error("Error updating profile:", error);
            toast.error("Failed to update profile");
        }
    };

    const handleCancelEdit = () => {
        setFormData({ 
            username: user.username, 
            dob: user.dob,
            bio: user.bio || '' 
        });
        setEditMode(false);
    };

    const handleScriptMouseEnter = (index: number) => {
        setShowMoreIndex(index);
    };

    const handleScriptMouseLeave = () => {
        setShowMoreIndex(null);
    };

    const handleFollow = async () => {
        if (!token) {
            toast.error("Please login to follow users");
            return;
        }
        
        try {
            toast.success(`Following ${user.username}`);
        } catch (error) {
            console.error("Error following user:", error);
            toast.error("Failed to follow user");
        }
    };

    const renderAllowedGenres = () => {
        if (!user.allowedGenres || user.allowedGenres.length === 0) {
            return (
                <div className="text-gray-500 text-sm bg-gray-50 px-3 py-2 rounded-lg text-center">
                    No ratings specified
                </div>
            );
        }

        return user.allowedGenres.map((genre: string) => {
            let bgColor, textColor;
            switch (genre) {
                case "G":
                    bgColor = "bg-emerald-50";
                    textColor = "text-emerald-700";
                    break;
                case "PG":
                case "PG-13":
                    bgColor = "bg-blue-50";
                    textColor = "text-blue-700";
                    break;
                case "R":
                    bgColor = "bg-yellow-50";
                    textColor = "text-yellow-700";
                    break;
                case "X":
                    bgColor = "bg-red-50";
                    textColor = "text-red-700";
                    break;
                default:
                    bgColor = "bg-gray-50";
                    textColor = "text-gray-700";
            }
            return (
                <span 
                    key={genre} 
                    className={`inline-flex items-center ${bgColor} ${textColor} px-3 py-1.5 rounded-lg text-sm font-medium shadow-sm`}
                >
                    <FaStar className="mr-1.5 text-xs" />
                    {genre}
                </span>
            );
        });
    };

    const renderContent = () => {
        if (contentLoading) {
            return (
                <div className="flex justify-center items-center py-12">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-yellow-500 mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading content...</p>
                    </div>
                </div>
            );
        }

        switch (activeTab) {
            case 'scripts':
                return (
                    <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Scripts</h3>
                                <p className="text-gray-500 text-sm">Creative scripts by {user.username}</p>
                            </div>
                            {scripts.length > 0 && (
                                <span className="text-sm text-yellow-700 bg-yellow-50 px-3 py-1 rounded-full font-medium">
                                    {scripts.length} {scripts.length === 1 ? 'Script' : 'Scripts'}
                                </span>
                            )}
                        </div>
                        
                        {scripts.length === 0 ? (
                            <div className="text-center py-16 bg-yellow-50 rounded-2xl border border-yellow-100">
                                <div className="text-5xl mb-4">📝</div>
                                <p className="text-lg font-medium text-gray-800 mb-2">No scripts yet</p>
                                <p className="text-gray-600">This user hasn't created any scripts</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                {scripts?.map((script: any, index: number) => {
                                    const scriptData = data?.[index];
                                    return (
                                        <div
                                            key={scriptData?._id || index}
                                            className="group relative bg-white rounded-xl border border-gray-200 hover:border-yellow-300 transition-all duration-300 overflow-hidden"
                                            onMouseEnter={() => handleScriptMouseEnter(index)}
                                            onMouseLeave={handleScriptMouseLeave}
                                            onClick={() => nav(`/script/${scriptData?._id}`, { state: JSON.stringify(scriptData) })}
                                        >
                                            <div className="p-4">
                                                <div className="flex justify-between items-start mb-3">
                                                    <h3 className="font-semibold text-gray-900 text-md line-clamp-2 pr-2">
                                                        {scriptData?.title || "Untitled Script"}
                                                    </h3>
                                                    {isCurrentUser && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setMenuOpen(menuOpen === index ? null : index);
                                                            }}
                                                            className="p-1 hover:bg-gray-50 rounded transition-colors"
                                                        >
                                                            <BsThreeDotsVertical className="text-gray-400 text-sm" />
                                                        </button>
                                                    )}
                                                </div>
                                                
                                                <div className="text-gray-600 text-sm line-clamp-3 mb-3 min-h-[60px]">
                                                    <Render htmlString={script} />
                                                </div>
                                                
                                                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                                    <span className="text-xs text-gray-500">
                                                        {scriptData?.createdAt ? new Date(scriptData.createdAt).toLocaleDateString() : 'Recent'}
                                                    </span>
                                                    <span className="text-xs font-medium text-yellow-700">
                                                        Script
                                                    </span>
                                                </div>
                                            </div>

                                            {showMoreIndex === index && (
                                                <div className="absolute inset-0 bg-yellow-500/95 flex items-center justify-center transition-all duration-200 p-4">
                                                    <div className="text-center text-white">
                                                        <FaEye className="text-xl mx-auto mb-2" />
                                                        <p className="font-medium text-sm">View Script</p>
                                                    </div>
                                                </div>
                                            )}

                                            {menuOpen === index && (
                                                <div className="absolute right-2 top-10 w-36 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-20">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (scriptData?._id) {
                                                                deleteScript(scriptData._id);
                                                                setMenuOpen(null);
                                                            }
                                                        }}
                                                        className="w-full text-left px-3 py-2.5 text-red-600 hover:bg-red-50 transition-colors flex items-center text-sm"
                                                    >
                                                        <FaTrash className="mr-2 text-xs" />
                                                        Delete
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            
            case 'videos':
                return (
                    <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Videos</h3>
                                <p className="text-gray-500 text-sm">Visual content by {user.username}</p>
                            </div>
                            {videos.length > 0 && (
                                <span className="text-sm text-yellow-700 bg-yellow-50 px-3 py-1 rounded-full font-medium">
                                    {videos.length} {videos.length === 1 ? 'Video' : 'Videos'}
                                </span>
                            )}
                        </div>
                        
                        {videos.length === 0 ? (
                            <div className="text-center py-16 bg-yellow-50 rounded-2xl border border-yellow-100">
                                <div className="text-5xl mb-4">🎬</div>
                                <p className="text-lg font-medium text-gray-800 mb-2">No videos yet</p>
                                <p className="text-gray-600">This user hasn't uploaded any videos</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                {videos?.map((video: any) => (
                                    <div
                                        key={video._id}
                                        className="group bg-white rounded-xl border border-gray-200 hover:border-yellow-300 transition-all duration-300 overflow-hidden"
                                        onClick={() => nav(`/video/${video._id}`)}
                                    >
                                        <div className="relative overflow-hidden bg-gray-100">
                                            {video.thumbnail ? (
                                                <img
                                                    src={video.thumbnail}
                                                    alt={video.title}
                                                    className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-500"
                                                />
                                            ) : (
                                                <div className="w-full h-40 bg-gradient-to-br from-yellow-100 to-yellow-200 flex items-center justify-center">
                                                    <span className="text-4xl">🎥</span>
                                                </div>
                                            )}
                                            <div className="absolute bottom-2 right-2">
                                                <span className="bg-yellow-500 text-white px-2 py-1 rounded text-xs font-medium">
                                                    Video
                                                </span>
                                            </div>
                                        </div>
                                        
                                        <div className="p-4">
                                            <h3 className="font-semibold text-gray-900 text-md mb-2 line-clamp-2">
                                                {video.title || "Untitled Video"}
                                            </h3>
                                            <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                                                {video.description || "No description available"}
                                            </p>
                                            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                                <span className="text-xs text-gray-500">
                                                    {video.duration || 'N/A'}
                                                </span>
                                                <span className="text-xs font-medium text-yellow-700">
                                                    Watch →
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            
            case 'about':
                return (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-xl font-bold text-gray-900 mb-1">About {user.username}</h3>
                            <p className="text-gray-500 text-sm">Profile information</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="bg-white rounded-xl border border-gray-200 p-5">
                                <div className="flex items-center space-x-3 mb-4">
                                    <div className="w-12 h-12 bg-yellow-50 rounded-lg flex items-center justify-center">
                                        <FaUser className="text-yellow-600" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-900">Profile Details</h4>
                                        <p className="text-gray-500 text-xs">Personal information</p>
                                    </div>
                                </div>
                                
                                <div className="space-y-3">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-7 h-7 bg-yellow-50 rounded flex items-center justify-center">
                                            <FaCalendar className="text-yellow-600 text-xs" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Joined Date</p>
                                            <p className="font-medium text-gray-900 text-sm">
                                                {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center space-x-2">
                                        <div className="w-7 h-7 bg-yellow-50 rounded flex items-center justify-center">
                                            <FaEnvelope className="text-yellow-600 text-xs" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Email</p>
                                            <p className="font-medium text-gray-900 text-sm">{user.email}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-xl border border-gray-200 p-5">
                                <div className="flex items-center space-x-3 mb-4">
                                    <div className="w-12 h-12 bg-yellow-50 rounded-lg flex items-center justify-center">
                                        <FaStore className="text-yellow-600" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-900">Marketplace Status</h4>
                                        <p className="text-gray-500 text-xs">Role & subscription</p>
                                    </div>
                                </div>
                                
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Current Role</p>
                                        <div className={`inline-flex items-center px-3 py-1.5 rounded-full font-medium text-sm ${
                                            user.userType === 'seller' 
                                                ? 'bg-yellow-500 text-white' 
                                                : 'bg-yellow-50 text-yellow-700'
                                        }`}>
                                            {user.userType === 'seller' ? (
                                                <>
                                                    <FaUserTie className="mr-1.5 text-xs" /> Seller
                                                </>
                                            ) : (
                                                <>
                                                    <FaShoppingCart className="mr-1.5 text-xs" /> Buyer
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Subscription Status</p>
                                        <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm ${
                                            userHasPaid 
                                                ? 'bg-emerald-50 text-emerald-700' 
                                                : 'bg-gray-100 text-gray-600'
                                        }`}>
                                            <span className="font-medium">
                                                {userHasPaid ? 'Premium Account' : 'Basic Account'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {user.bio && (
                            <div className="bg-yellow-50 rounded-xl border border-yellow-100 p-5">
                                <h4 className="font-semibold text-gray-900 mb-2">Bio</h4>
                                <p className="text-gray-700 text-sm leading-relaxed">{user.bio}</p>
                            </div>
                        )}
                    </div>
                );
            
            default:
                return null;
        }
    };

    if (loading) {
        return (
            <Layout>
                <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500 mx-auto mb-4"></div>
                        <p className="text-gray-700">Loading profile...</p>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto py-6">
                {/* Cover Section */}
                <div className="relative w-full h-40 sm:h-48 md:h-56 rounded-xl overflow-hidden mb-6">
                    <img
                        className="w-full h-full object-cover"
                        src={user.coverImage || cover}
                        alt="Cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
                    <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="relative">
                                <img
                                    className="rounded-lg bg-white h-16 w-16 sm:h-20 sm:w-20 border-2 border-white shadow"
                                    src={user.avatar || avatar}
                                    alt="Avatar"
                                />
                                {isCurrentUser && (
                                    <div className="absolute -bottom-1 -right-1 bg-yellow-500 text-white p-1 rounded-full border border-white">
                                        <FaCheckCircle className="text-xs" />
                                    </div>
                                )}
                            </div>
                            <div>
                                <h1 className="text-xl sm:text-2xl font-bold text-white mb-0.5">
                                    {user.username}
                                </h1>
                                <p className="text-gray-200 text-sm">{user.email}</p>
                            </div>
                        </div>
                        
                        <div className="flex space-x-2">
                            <button
                                onClick={handleRefresh}
                                disabled={refreshing}
                                className="inline-flex items-center justify-center space-x-1.5 bg-white/20 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg hover:bg-white/30 transition-colors disabled:opacity-50 text-sm"
                            >
                                <FaSync className={`text-xs ${refreshing ? 'animate-spin' : ''}`} />
                                <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
                            </button>
                            
                            {!isCurrentUser && (
                                <button
                                    onClick={handleFollow}
                                    className="inline-flex items-center justify-center space-x-1.5 bg-yellow-500 text-white px-3 py-1.5 rounded-lg hover:bg-yellow-600 transition-colors font-medium text-sm"
                                >
                                    <FaHeart className="text-xs" />
                                    <span>Follow</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Sidebar - Profile Info */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-xl border border-gray-200 p-5 sticky top-24">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-bold text-gray-900">Profile Info</h2>
                                {isCurrentUser && !editMode && (
                                    <button
                                        onClick={handleEdit}
                                        className="inline-flex items-center space-x-1.5 bg-yellow-500 text-white px-3 py-1.5 rounded-lg hover:bg-yellow-600 transition-colors font-medium text-sm"
                                    >
                                        <FaEdit size="12" />
                                        <span>Edit</span>
                                    </button>
                                )}
                            </div>

                            {editMode ? (
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Username
                                        </label>
                                        <input
                                            type="text"
                                            name="username"
                                            value={formData.username}
                                            onChange={handleChange}
                                            className="w-full p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500 transition-all text-sm"
                                            placeholder="Enter username"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Date of Birth
                                        </label>
                                        <input
                                            type="date"
                                            name="dob"
                                            value={formData.dob}
                                            onChange={handleChange}
                                            className="w-full p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500 transition-all text-sm"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Bio
                                        </label>
                                        <textarea
                                            name="bio"
                                            value={formData.bio}
                                            onChange={handleChange}
                                            rows={3}
                                            className="w-full p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500 transition-all resize-none text-sm"
                                            placeholder="Tell your story..."
                                        />
                                    </div>

                                    <div className="flex space-x-3 pt-2">
                                        <button 
                                            type="submit" 
                                            className="flex-1 bg-yellow-500 text-white py-2 px-4 rounded-lg hover:bg-yellow-600 transition-colors font-medium text-sm"
                                        >
                                            Save Changes
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={handleCancelEdit}
                                            className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <div>
                                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Contact Info</h3>
                                            <div className="space-y-3">
                                                <div className="flex items-center space-x-2">
                                                    <div className="w-8 h-8 bg-yellow-50 rounded flex items-center justify-center">
                                                        <FaUser className="text-yellow-600 text-xs" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-500">Username</p>
                                                        <p className="font-medium text-gray-900 text-sm">{user.username}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <div className="w-8 h-8 bg-yellow-50 rounded flex items-center justify-center">
                                                        <FaEnvelope className="text-yellow-600 text-xs" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-500">Email</p>
                                                        <p className="font-medium text-gray-900 text-sm">{user.email}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Allowed Ratings</h3>
                                            <div className="flex flex-wrap gap-1.5">
                                                {renderAllowedGenres()}
                                            </div>
                                        </div>
                                    </div>

                                    {/* User Mode Toggle */}
                                    {isCurrentUser && (
                                        <div className="pt-4 border-t border-gray-100">
                                            <div className="flex items-center justify-between mb-3">
                                                <div>
                                                    <h3 className="font-medium text-gray-900 text-sm">Marketplace Mode</h3>
                                                    <p className="text-xs text-gray-500">Switch between buyer and seller</p>
                                                </div>
                                                <div className="relative">
                                                    <button 
                                                        onClick={toggleMarketplaceMode}
                                                        disabled={changingMode}
                                                        className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors ${
                                                            marketplaceMode === 'buyer' 
                                                                ? 'bg-yellow-100' 
                                                                : 'bg-yellow-500'
                                                        } ${changingMode ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    >
                                                        <span className={`absolute left-1 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow transition-all duration-200 ${
                                                            marketplaceMode === 'seller' ? 'translate-x-8' : ''
                                                        }`}>
                                                            {changingMode ? (
                                                                <div className="h-3 w-3 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                                                            ) : marketplaceMode === 'seller' ? (
                                                                <FaUserTie className="text-yellow-600 text-xs" />
                                                            ) : (
                                                                <FaShoppingCart className="text-yellow-600 text-xs" />
                                                            )}
                                                        </span>
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between text-xs">
                                                <span className={`font-medium ${marketplaceMode === 'buyer' ? 'text-yellow-600' : 'text-gray-500'}`}>
                                                    <FaShoppingCart className="inline mr-1" /> Buyer
                                                </span>
                                                <span className={`font-medium ${marketplaceMode === 'seller' ? 'text-yellow-600' : 'text-gray-500'}`}>
                                                    <FaUserTie className="inline mr-1" /> Seller
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Stats */}
                                    <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-100">
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-gray-900">{user.followers?.length || 0}</div>
                                            <div className="text-xs text-gray-500">Followers</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-gray-900">{user.followings?.length || 0}</div>
                                            <div className="text-xs text-gray-500">Following</div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Content Area */}
                    <div className="lg:col-span-2">
                        {/* Tabs Navigation */}
                        <div className="mb-6">
                            <div className="flex space-x-1 bg-white rounded-lg border border-gray-200 p-1 overflow-x-auto">
                                {[
                                    { key: 'scripts', label: 'Scripts', icon: '📝', count: scripts.length },
                                    { key: 'videos', label: 'Videos', icon: '🎬', count: videos.length },
                                    { key: 'likevideos', label: 'Like Videos', icon: '❤️', link: '/likedvideos' },
                                    { key: 'bookmark', label: 'Bookmark', icon: '🔖', link: '/bookmark' },
                                    { key: 'history', label: 'History', icon: '📜', link: '/history' },
                                    { key: 'about', label: 'About', icon: '👤', count: null }
                                ].map((tab) => (
                                    <button
                                        key={tab.key}
                                        onClick={() => {
                                            if (tab.link) {
                                                nav(tab.link);
                                            } else {
                                                setActiveTab(tab.key);
                                            }
                                        }}
                                        className={`flex-1 flex items-center justify-center py-2.5 px-2 rounded-md transition-colors text-sm whitespace-nowrap ${
                                            activeTab === tab.key
                                                ? 'bg-yellow-500 text-white'
                                                : 'text-gray-600 hover:text-yellow-600 hover:bg-yellow-50'
                                        }`}
                                    >
                                        <span className="mr-2">{tab.icon}</span>
                                        <span className="font-medium">{tab.label}</span>
                                        {tab.count !== null && !tab.link && (
                                            <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${
                                                activeTab === tab.key
                                                    ? 'bg-white text-yellow-600'
                                                    : 'bg-yellow-100 text-yellow-700'
                                            }`}>
                                                {tab.count}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Tab Content */}
                        <div className="bg-white rounded-xl border border-gray-200 p-5">
                            {renderContent()}
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default UserProfilePage;