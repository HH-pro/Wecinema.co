import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Delete, Layout, Render } from "../components";
import { deleteRequest, getRequest, putRequest } from "../api";
import { decodeToken } from "../utilities/helperfFunction";
import '../components/header/drowpdown.css';
import { 
    FaEdit, FaStore, FaShoppingCart, FaUserTie, FaUser, 
    FaSync, FaHeart, FaUsers, FaVideo, FaFileAlt, 
    FaEllipsisV, FaTrash, FaCheck, FaTimes, FaCrown,
    FaCalendar, FaEnvelope, FaStar, FaGlobe
} from 'react-icons/fa';
import { RiShieldUserFill } from 'react-icons/ri';
import { IoMdNotifications } from 'react-icons/io';
import axios from 'axios';
import cover from '.././assets/public/cover.jpg';
import avatar from '.././assets/public/avatar.jpg';
import '../App.css';
import { API_BASE_URL } from "../api";

const token = localStorage.getItem("token") || null;

interface Notification {
    id: string;
    type: 'success' | 'error' | 'info';
    message: string;
    timestamp: Date;
}

const GenrePage: React.FC = () => {
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
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Add notification
    const addNotification = (type: 'success' | 'error' | 'info', message: string) => {
        const id = Date.now().toString();
        const newNotification: Notification = {
            id,
            type,
            message,
            timestamp: new Date()
        };
        
        setNotifications(prev => [newNotification, ...prev]);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id));
        }, 5000);
    };

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

            return response.data;
        } catch (error: any) {
            console.error("Error changing user type:", error);
            throw new Error(error.response?.data?.error || "Failed to change user type");
        } finally {
            setChangingMode(false);
        }
    };

    useEffect(() => {
        if (!id) {
            addNotification('error', "Please login first");
            setLoading(false);
            return;
        }

        fetchUserData();
    }, [id]);

    // Listen for marketplace mode changes
    useEffect(() => {
        if (user.userType && user.userType !== marketplaceMode) {
            setMarketplaceMode(user.userType);
        }
    }, [user.userType]);

    const fetchUserData = async () => {
        try {
            setLoading(true);
            setContentLoading(true);
            
            // Fetch user data
            const result: any = await getRequest("/user/" + id, setLoading);
            if (!result) {
                throw new Error("User not found");
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

            // Fetch payment status
            try {
                const paymentResponse = await axios.get(`${API_BASE_URL}/user/payment-status/${id}`);
                setUserHasPaid(paymentResponse.data.hasPaid);
            } catch (error) {
                console.error("Error fetching payment status:", error);
                setUserHasPaid(false);
            }

            // Fetch current user payment status
            if (tokenData) {
                try {
                    const currentUserResponse = await axios.get(`${API_BASE_URL}/user/payment-status/${tokenData.userId}`);
                    setCurrentUserHasPaid(currentUserResponse.data.hasPaid);
                } catch (error) {
                    console.error("Error fetching current user payment status:", error);
                }
            }

            // Fetch user scripts and videos
            await fetchUserContent();

        } catch (error) {
            console.error("Error fetching data:", error);
            addNotification('error', "Failed to load user profile");
        } finally {
            setLoading(false);
            setRefreshing(false);
            setContentLoading(false);
        }
    };

    const fetchUserContent = async () => {
        try {
            // Fetch scripts
            const scriptsResult: any = await getRequest(`video/authors/${id}/scripts`, setContentLoading);
            if (scriptsResult) {
                setScripts(scriptsResult.map((res: any) => res.script));
                setData(scriptsResult);
            } else {
                setScripts([]);
            }

            // Fetch videos
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
            addNotification('error', "User not found");
            return;
        }

        if (!isCurrentUser) {
            addNotification('error', "You can only change your own mode");
            return;
        }

        const newMode = marketplaceMode === 'buyer' ? 'seller' : 'buyer';
        
        try {
            const result = await changeUserTypeDirect(id, newMode);
            
            if (result) {
                // Show success notification
                addNotification('success', `Successfully switched to ${newMode} mode`);
                
                // Refresh user data
                await fetchUserData();
                
                // Update local state
                setMarketplaceMode(newMode);
                setUser(prev => ({ ...prev, userType: newMode }));
                localStorage.setItem('marketplaceMode', newMode);
            }
        } catch (error: any) {
            console.error("Error changing user type:", error);
            addNotification('error', error.message);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        fetchUserData();
    };

    const deleteScript = async (scriptId: string) => {
        try {
            const result: any = await deleteRequest(`video/scripts/${scriptId}`, setContentLoading);
            if (result) {
                setScripts(prevScripts => prevScripts.filter((script, index) => data[index]?._id !== scriptId));
                setData(prevData => prevData.filter((item: any) => item._id !== scriptId));
                addNotification('success', "Script deleted successfully");
                setShowDeleteConfirm(null);
            }
        } catch (error) {
            console.error("Error deleting script:", error);
            addNotification('error', "Failed to delete script");
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
            addNotification('success', "Profile updated successfully");
        } catch (error) {
            console.error("Error updating profile:", error);
            addNotification('error', "Failed to update profile");
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
            addNotification('error', "Please login to follow users");
            return;
        }

        try {
            addNotification('info', "Follow functionality coming soon!");
        } catch (error) {
            console.error("Error following user:", error);
            addNotification('error', "Failed to follow user");
        }
    };

    const renderAllowedGenres = () => {
        if (!user.allowedGenres || user.allowedGenres.length === 0) {
            return (
                <div className="text-gray-400 text-sm bg-gray-50/50 px-4 py-3 rounded-xl text-center border border-gray-100">
                    No content ratings specified
                </div>
            );
        }

        return user.allowedGenres.map((genre: string) => {
            let bgColor, textColor, borderColor, icon;
            switch (genre) {
                case "G":
                    bgColor = "bg-emerald-50";
                    textColor = "text-emerald-700";
                    borderColor = "border-emerald-200";
                    icon = "🟢";
                    break;
                case "PG":
                case "PG-13":
                    bgColor = "bg-blue-50";
                    textColor = "text-blue-700";
                    borderColor = "border-blue-200";
                    icon = "🔵";
                    break;
                case "R":
                    bgColor = "bg-amber-50";
                    textColor = "text-amber-700";
                    borderColor = "border-amber-200";
                    icon = "🟡";
                    break;
                case "X":
                    bgColor = "bg-rose-50";
                    textColor = "text-rose-700";
                    borderColor = "border-rose-200";
                    icon = "🔴";
                    break;
                default:
                    bgColor = "bg-gray-50";
                    textColor = "text-gray-700";
                    borderColor = "border-gray-200";
                    icon = "⚪";
            }
            return (
                <div 
                    key={genre} 
                    className={`flex items-center ${bgColor} ${textColor} ${borderColor} border px-4 py-2.5 rounded-xl shadow-sm hover:shadow-md transition-all duration-200`}
                >
                    <span className="mr-2 text-lg">{icon}</span>
                    <span className="font-semibold">{genre}</span>
                </div>
            );
        });
    };

    const renderContent = () => {
        if (contentLoading) {
            return (
                <div className="flex justify-center items-center py-20">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-14 w-14 border-3 border-indigo-500 border-t-transparent mx-auto mb-4"></div>
                        <p className="text-gray-600 font-medium">Loading content...</p>
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
                                <p className="text-gray-500 text-sm mt-1">{scripts.length} script{scripts.length !== 1 ? 's' : ''} available</p>
                            </div>
                            {scripts.length > 0 && (
                                <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                    <span className="text-sm text-gray-500">Click to read more</span>
                                </div>
                            )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {scripts?.map((script: any, index: number) => {
                                const scriptData = data?.[index];
                                return (
                                    <div
                                        key={scriptData?._id || index}
                                        className={`relative group border border-gray-100 w-full min-h-[280px] p-5 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer bg-white hover:-translate-y-1 ${
                                            showMoreIndex === index ? "ring-2 ring-indigo-100" : ""
                                        }`}
                                        onMouseEnter={() => handleScriptMouseEnter(index)}
                                        onMouseLeave={handleScriptMouseLeave}
                                        onClick={() => nav(`/script/${scriptData?._id}`, { state: JSON.stringify(scriptData) })}
                                    >
                                        <div className="absolute top-4 right-4">
                                            <div className="bg-indigo-500 text-white text-xs font-semibold px-3 py-1.5 rounded-full">
                                                Script
                                            </div>
                                        </div>
                                        
                                        <h2 className="font-bold text-lg mb-3 text-gray-900 line-clamp-2 pr-12">
                                            {scriptData?.title || "Untitled Script"}
                                        </h2>
                                        <div className="text-gray-600 text-sm line-clamp-4 mb-4 leading-relaxed">
                                            <Render htmlString={script} />
                                        </div>

                                        {showMoreIndex === index && (
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent rounded-2xl flex items-end justify-center p-6 transition-all duration-300">
                                                <button className="bg-white text-gray-900 px-6 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-colors shadow-2xl transform hover:scale-105 duration-200">
                                                    Read Full Script →
                                                </button>
                                            </div>
                                        )}

                                        {isCurrentUser && (
                                            <div className="absolute bottom-5 right-5">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setMenuOpen(menuOpen === index ? null : index);
                                                    }}
                                                    className="p-2.5 rounded-xl hover:bg-gray-100 transition duration-200 bg-white shadow-lg border border-gray-200 hover:shadow-xl"
                                                >
                                                    <FaEllipsisV className="text-gray-700" />
                                                </button>

                                                {menuOpen === index && (
                                                    <div className="absolute right-0 bottom-full mb-2 w-48 bg-white border border-gray-200 shadow-2xl rounded-xl overflow-hidden z-50">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (scriptData?._id) {
                                                                    setShowDeleteConfirm(scriptData._id);
                                                                    setMenuOpen(null);
                                                                }
                                                            }}
                                                            className="w-full text-left px-5 py-3.5 text-rose-600 hover:bg-rose-50 transition-colors text-sm flex items-center justify-between group"
                                                        >
                                                            <div className="flex items-center">
                                                                <FaTrash className="mr-3 text-sm opacity-70" />
                                                                <span className="font-medium">Delete Script</span>
                                                            </div>
                                                            <span className="text-rose-400 group-hover:text-rose-600">→</span>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        {scripts.length === 0 && (
                            <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-2xl border-2 border-dashed border-gray-300">
                                <div className="text-7xl mb-6">📝</div>
                                <p className="text-xl text-gray-700 font-semibold">No scripts yet</p>
                                <p className="text-gray-500 mt-2 max-w-md mx-auto">This user hasn't created any scripts. Check back later!</p>
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
                                <p className="text-gray-500 text-sm mt-1">{videos.length} video{videos.length !== 1 ? 's' : ''} uploaded</p>
                            </div>
                            {videos.length > 0 && (
                                <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                    <span className="text-sm text-gray-500">Click to watch</span>
                                </div>
                            )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {videos?.map((video: any) => (
                                <div
                                    key={video._id}
                                    className="group border border-gray-100 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer bg-white hover:-translate-y-1 overflow-hidden"
                                    onClick={() => nav(`/video/${video._id}`)}
                                >
                                    <div className="relative overflow-hidden aspect-video">
                                        {video.thumbnail ? (
                                            <img
                                                src={video.thumbnail}
                                                alt={video.title}
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                                <span className="text-white text-5xl">🎬</span>
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                        <div className="absolute top-4 right-4">
                                            <div className="bg-blue-500 text-white text-xs font-semibold px-3 py-1.5 rounded-full">
                                                Video
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-5">
                                        <h3 className="font-bold text-lg mb-2 text-gray-900 line-clamp-2">
                                            {video.title || "Untitled Video"}
                                        </h3>
                                        <p className="text-gray-600 text-sm line-clamp-2 leading-relaxed">
                                            {video.description || "No description available"}
                                        </p>
                                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                                            <div className="flex items-center space-x-2">
                                                <FaVideo className="text-gray-400 text-sm" />
                                                <span className="text-xs text-gray-500">
                                                    {video.duration || "N/A"}
                                                </span>
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {video.createdAt ? new Date(video.createdAt).toLocaleDateString() : "Recent"}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {videos.length === 0 && (
                            <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-2xl border-2 border-dashed border-gray-300">
                                <div className="text-7xl mb-6">🎥</div>
                                <p className="text-xl text-gray-700 font-semibold">No videos yet</p>
                                <p className="text-gray-500 mt-2 max-w-md mx-auto">This user hasn't uploaded any videos. Check back later!</p>
                            </div>
                        )}
                    </div>
                );
            
            case 'about':
                return (
                    <div className="space-y-8">
                        <div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">About {user.username}</h3>
                            <p className="text-gray-600">Professional profile and activity overview</p>
                        </div>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Profile Card */}
                            <div className="bg-gradient-to-br from-white to-gray-50 p-6 rounded-2xl border border-gray-100 shadow-lg">
                                <div className="flex items-center space-x-4 mb-6">
                                    <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                                        <FaUser className="text-white text-xl" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-lg text-gray-900">Profile Information</h4>
                                        <p className="text-gray-500 text-sm">Personal details and preferences</p>
                                    </div>
                                </div>
                                <div className="space-y-5">
                                    <div className="flex items-center justify-between p-3 bg-gray-50/50 rounded-xl">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                                <FaGlobe className="text-blue-600" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-500">Username</p>
                                                <p className="font-semibold text-gray-900">{user.username}</p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center justify-between p-3 bg-gray-50/50 rounded-xl">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                                <FaEnvelope className="text-green-600" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-500">Email Address</p>
                                                <p className="font-semibold text-gray-900">{user.email}</p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center justify-between p-3 bg-gray-50/50 rounded-xl">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                                <FaCalendar className="text-purple-600" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-500">Member Since</p>
                                                <p className="font-semibold text-gray-900">
                                                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', {
                                                        year: 'numeric',
                                                        month: 'long',
                                                        day: 'numeric'
                                                    }) : 'N/A'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Marketplace Card */}
                            <div className="bg-gradient-to-br from-white to-gray-50 p-6 rounded-2xl border border-gray-100 shadow-lg">
                                <div className="flex items-center space-x-4 mb-6">
                                    <div className="w-14 h-14 bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                                        <FaStore className="text-white text-xl" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-lg text-gray-900">Marketplace Status</h4>
                                        <p className="text-gray-500 text-sm">Role, subscription, and permissions</p>
                                    </div>
                                </div>
                                <div className="space-y-5">
                                    <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-xl">
                                        <div className="flex items-center justify-between mb-3">
                                            <p className="text-sm font-semibold text-gray-700">Current Role</p>
                                            <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                                                marketplaceMode === 'seller' 
                                                    ? 'bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-700 border border-emerald-200' 
                                                    : 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 border border-blue-200'
                                            }`}>
                                                {marketplaceMode === 'seller' ? 'SELLER' : 'BUYER'}
                                            </div>
                                        </div>
                                        <p className="text-sm text-gray-600">
                                            {marketplaceMode === 'seller' 
                                                ? 'You can sell scripts and videos to other users' 
                                                : 'You can purchase scripts and videos from sellers'}
                                        </p>
                                    </div>
                                    
                                    <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-xl">
                                        <div className="flex items-center justify-between mb-3">
                                            <p className="text-sm font-semibold text-gray-700">Subscription Level</p>
                                            {userHasPaid ? (
                                                <div className="flex items-center space-x-2">
                                                    <FaCrown className="text-amber-500 text-lg" />
                                                    <span className="text-xs font-bold bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-700 px-2 py-1 rounded-full">
                                                        PREMIUM
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                                                    STANDARD
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-600">
                                            {userHasPaid 
                                                ? 'Premium membership with all features unlocked' 
                                                : 'Standard membership with basic features'}
                                        </p>
                                    </div>
                                    
                                    <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-xl">
                                        <p className="text-sm font-semibold text-gray-700 mb-3">Content Ratings</p>
                                        <div className="flex flex-wrap gap-2">
                                            {renderAllowedGenres()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            
            default:
                return null;
        }
    };

    // Notifications Component
    const NotificationPanel = () => (
        <div className="fixed top-4 right-4 z-50 space-y-3 max-w-sm">
            {notifications.map((notification) => (
                <div
                    key={notification.id}
                    className={`transform transition-all duration-300 ${
                        notification.type === 'success' 
                            ? 'bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200' 
                            : notification.type === 'error'
                            ? 'bg-gradient-to-r from-rose-50 to-red-50 border border-rose-200'
                            : 'bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200'
                    } rounded-xl shadow-2xl p-4 backdrop-blur-sm`}
                >
                    <div className="flex items-start space-x-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            notification.type === 'success'
                                ? 'bg-emerald-100 text-emerald-600'
                                : notification.type === 'error'
                                ? 'bg-rose-100 text-rose-600'
                                : 'bg-blue-100 text-blue-600'
                        }`}>
                            {notification.type === 'success' ? (
                                <FaCheck className="text-lg" />
                            ) : notification.type === 'error' ? (
                                <FaTimes className="text-lg" />
                            ) : (
                                <IoMdNotifications className="text-lg" />
                            )}
                        </div>
                        <div className="flex-1">
                            <p className="font-semibold text-gray-900">{notification.message}</p>
                            <p className="text-xs text-gray-500 mt-1">
                                {notification.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                        <button
                            onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <FaTimes />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );

    // Delete Confirmation Modal
    const DeleteConfirmationModal = () => {
        if (!showDeleteConfirm) return null;
        
        return (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl max-w-md w-full p-6 transform transition-all duration-300 scale-100">
                    <div className="flex items-center space-x-3 mb-6">
                        <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center">
                            <FaTrash className="text-rose-600 text-xl" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-gray-900">Delete Script</h3>
                            <p className="text-gray-600 text-sm">This action cannot be undone</p>
                        </div>
                    </div>
                    
                    <p className="text-gray-700 mb-8">
                        Are you sure you want to delete this script? All associated data will be permanently removed.
                    </p>
                    
                    <div className="flex space-x-3">
                        <button
                            onClick={() => deleteScript(showDeleteConfirm)}
                            className="flex-1 bg-gradient-to-r from-rose-500 to-red-600 text-white py-3 px-4 rounded-xl font-semibold hover:shadow-lg transition-all duration-300"
                        >
                            Delete Script
                        </button>
                        <button
                            onClick={() => setShowDeleteConfirm(null)}
                            className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-xl font-semibold hover:bg-gray-200 transition-all duration-300"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <Layout expand={false} hasHeader={true}>
                <div className="mt-12 px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-center items-center min-h-[60vh]">
                        <div className="text-center">
                            <div className="relative">
                                <div className="w-20 h-20 border-4 border-gray-200 rounded-full"></div>
                                <div className="absolute top-0 left-0 w-20 h-20 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                            <p className="mt-6 text-lg font-semibold text-gray-700">Loading profile...</p>
                            <p className="text-gray-500 text-sm mt-2">Fetching user information</p>
                        </div>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout expand={false} hasHeader={true}>
            <NotificationPanel />
            <DeleteConfirmationModal />
            
            {/* Mobile Sidebar Toggle */}
            <div className="lg:hidden fixed top-20 right-4 z-40">
                <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="bg-white shadow-lg rounded-xl p-3 border border-gray-200"
                >
                    <FaEllipsisV className="text-gray-700" />
                </button>
            </div>

            <div className="mt-12 px-4 sm:px-6 lg:px-8">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                            User Profile
                        </h1>
                        <p className="text-gray-600 mt-2">Professional dashboard and management</p>
                    </div>
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing || changingMode}
                        className="flex items-center justify-center space-x-3 bg-white border border-gray-200 px-5 py-3 rounded-xl hover:bg-gray-50 transition-all duration-300 disabled:opacity-50 w-full sm:w-auto shadow-sm hover:shadow-md"
                    >
                        <FaSync className={`text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
                        <span className="font-medium">{refreshing ? 'Refreshing...' : 'Refresh Data'}</span>
                    </button>
                </div>

                {/* Cover Image */}
                <div className="relative w-full h-48 sm:h-56 md:h-64 lg:h-72 rounded-3xl overflow-hidden shadow-2xl mb-8">
                    <img
                        className="w-full h-full object-cover"
                        src={user.coverImage || cover}
                        alt="Cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
                    <div className="absolute bottom-6 left-6 right-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                                    {user.username}
                                </h1>
                                <p className="text-gray-200">{user.email}</p>
                            </div>
                            {userHasPaid && (
                                <div className="hidden sm:flex items-center space-x-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white px-4 py-2 rounded-full">
                                    <FaCrown className="text-sm" />
                                    <span className="text-sm font-semibold">Premium</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Profile Header - Mobile Optimized */}
                <div className="flex flex-col lg:flex-row items-start gap-6 mb-8">
                    {/* Avatar Section - Mobile First */}
                    <div className="flex flex-col items-center lg:items-start space-y-4 w-full lg:w-auto">
                        <div className="relative -mt-16 lg:-mt-20">
                            <div className="relative">
                                <img
                                    className="rounded-2xl bg-white h-32 w-32 sm:h-36 sm:w-36 border-4 border-white shadow-2xl"
                                    src={user.avatar || avatar}
                                    alt="Avatar"
                                />
                                {isCurrentUser && (
                                    <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white p-2.5 rounded-full border-4 border-white shadow-xl">
                                        <RiShieldUserFill className="text-sm" />
                                    </div>
                                )}
                            </div>
                            
                            {/* Mobile Bio */}
                            <div className="mt-4 lg:hidden text-center">
                                {user.bio && (
                                    <p className="text-gray-700 text-base bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                                        {user.bio}
                                    </p>
                                )}
                            </div>
                        </div>
                        
                        {/* Action Buttons - Responsive */}
                        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                            {!isCurrentUser && (
                                <button
                                    onClick={handleFollow}
                                    className="flex items-center justify-center space-x-3 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white px-6 py-3.5 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 font-semibold w-full sm:w-auto transform hover:-translate-y-0.5"
                                >
                                    <FaHeart className="text-sm" />
                                    <span>Follow User</span>
                                </button>
                            )}
                            
                            {isCurrentUser && (
                                <button 
                                    onClick={toggleMarketplaceMode}
                                    disabled={changingMode || refreshing}
                                    className={`flex items-center justify-center space-x-3 px-6 py-3.5 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 font-semibold w-full sm:w-auto transform hover:-translate-y-0.5 ${
                                        marketplaceMode === 'buyer' 
                                            ? 'bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white' 
                                            : 'bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-700 hover:to-green-800 text-white'
                                    } ${changingMode ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {changingMode ? (
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    ) : marketplaceMode === 'seller' ? (
                                        <>
                                            <FaUserTie className="text-lg" />
                                            <span className="text-base">Seller Mode</span>
                                        </>
                                    ) : (
                                        <>
                                            <FaShoppingCart className="text-lg" />
                                            <span className="text-base">Buyer Mode</span>
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* User Info - Desktop */}
                    <div className="flex-1 hidden lg:block">
                        {user.bio && (
                            <p className="text-gray-700 text-lg leading-relaxed bg-white p-6 rounded-2xl border border-gray-200 shadow-sm mb-6">
                                {user.bio}
                            </p>
                        )}

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-2xl p-5 text-center shadow-sm hover:shadow-lg transition-shadow duration-300 group">
                                <div className="flex items-center justify-center space-x-3 mb-3">
                                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                        <FaUsers className="text-blue-600 text-xl" />
                                    </div>
                                </div>
                                <div className="text-3xl font-bold text-gray-900 mb-2">{user.followers?.length || 0}</div>
                                <div className="text-sm font-medium text-gray-600">Followers</div>
                            </div>
                            <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-2xl p-5 text-center shadow-sm hover:shadow-lg transition-shadow duration-300 group">
                                <div className="flex items-center justify-center space-x-3 mb-3">
                                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                        <FaUser className="text-green-600 text-xl" />
                                    </div>
                                </div>
                                <div className="text-3xl font-bold text-gray-900 mb-2">{user.followings?.length || 0}</div>
                                <div className="text-sm font-medium text-gray-600">Following</div>
                            </div>
                            <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-2xl p-5 text-center shadow-sm hover:shadow-lg transition-shadow duration-300 group">
                                <div className="flex items-center justify-center space-x-3 mb-3">
                                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                        <FaFileAlt className="text-purple-600 text-xl" />
                                    </div>
                                </div>
                                <div className="text-3xl font-bold text-gray-900 mb-2">{scripts.length}</div>
                                <div className="text-sm font-medium text-gray-600">Scripts</div>
                            </div>
                            <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-2xl p-5 text-center shadow-sm hover:shadow-lg transition-shadow duration-300 group">
                                <div className="flex items-center justify-center space-x-3 mb-3">
                                    <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                        <FaVideo className="text-rose-600 text-xl" />
                                    </div>
                                </div>
                                <div className="text-3xl font-bold text-gray-900 mb-2">{videos.length}</div>
                                <div className="text-sm font-medium text-gray-600">Videos</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mobile Stats Grid */}
                <div className="lg:hidden mb-8">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm">
                            <div className="text-2xl font-bold text-gray-900 mb-1">{user.followers?.length || 0}</div>
                            <div className="text-xs text-gray-600">Followers</div>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm">
                            <div className="text-2xl font-bold text-gray-900 mb-1">{user.followings?.length || 0}</div>
                            <div className="text-xs text-gray-600">Following</div>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm">
                            <div className="text-2xl font-bold text-gray-900 mb-1">{scripts.length}</div>
                            <div className="text-xs text-gray-600">Scripts</div>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm">
                            <div className="text-2xl font-bold text-gray-900 mb-1">{videos.length}</div>
                            <div className="text-xs text-gray-600">Videos</div>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="mt-8 flex flex-col lg:flex-row gap-8">
                    {/* Left Sidebar - Profile Info */}
                    <div className={`w-full lg:w-1/3 ${isSidebarOpen ? 'block' : 'hidden lg:block'}`}>
                        <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl border border-gray-200 p-6 lg:sticky lg:top-24">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">Profile Details</h2>
                                    <p className="text-gray-500 text-sm mt-1">Personal information</p>
                                </div>
                                {isCurrentUser && !editMode && (
                                    <button
                                        onClick={handleEdit}
                                        className="flex items-center space-x-2 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-600 hover:text-blue-700 transition-all duration-300 px-4 py-2.5 rounded-xl hover:shadow-md border border-blue-200"
                                    >
                                        <FaEdit size="16" />
                                        <span className="text-sm font-semibold">Edit</span>
                                    </button>
                                )}
                            </div>

                            {editMode ? (
                                <form onSubmit={handleSubmit} className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Username
                                        </label>
                                        <input
                                            type="text"
                                            name="username"
                                            value={formData.username}
                                            onChange={handleChange}
                                            className="w-full p-3.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                                            placeholder="Enter username"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Date of Birth
                                        </label>
                                        <input
                                            type="date"
                                            name="dob"
                                            value={formData.dob}
                                            onChange={handleChange}
                                            className="w-full p-3.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Bio
                                        </label>
                                        <textarea
                                            name="bio"
                                            value={formData.bio}
                                            onChange={handleChange}
                                            rows={4}
                                            className="w-full p-3.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white resize-none"
                                            placeholder="Tell your story..."
                                        />
                                    </div>

                                    <div className="flex space-x-3 pt-2">
                                        <button 
                                            type="submit" 
                                            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-3.5 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 font-semibold hover:-translate-y-0.5"
                                        >
                                            Save Changes
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={handleCancelEdit}
                                            className="flex-1 bg-gray-100 text-gray-700 py-3.5 px-4 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 font-semibold hover:bg-gray-200"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <div className="space-y-6">
                                    <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-xl">
                                        <div className="flex items-center space-x-3 mb-3">
                                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                                <FaUser className="text-blue-600" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-500">Username</p>
                                                <p className="font-semibold text-gray-900 text-lg">{user.username}</p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-xl">
                                        <div className="flex items-center space-x-3 mb-3">
                                            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                                <FaEnvelope className="text-green-600" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-500">Email Address</p>
                                                <p className="font-semibold text-gray-900 text-lg">{user.email}</p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-xl">
                                        <div className="flex items-center space-x-3 mb-3">
                                            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                                <FaCalendar className="text-purple-600" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-500">Date of Birth</p>
                                                <p className="font-semibold text-gray-900 text-lg">{user.dob || 'Not specified'}</p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-xl">
                                        <p className="text-sm font-semibold text-gray-700 mb-3">Content Ratings</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            {renderAllowedGenres()}
                                        </div>
                                    </div>
                                    
                                    <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-xl">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-lg flex items-center justify-center">
                                                {marketplaceMode === 'seller' ? (
                                                    <FaUserTie className="text-indigo-600" />
                                                ) : (
                                                    <FaShoppingCart className="text-indigo-600" />
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-500">Current Mode</p>
                                                <p className="font-semibold text-gray-900 text-lg">
                                                    {marketplaceMode === 'seller' ? 'Seller' : 'Buyer'} Mode
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Content - Tabs */}
                    <div className="w-full lg:w-2/3">
                        {/* Navigation Tabs - Modern Design */}
                        <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl border border-gray-200 overflow-hidden mb-8">
                            <div className="border-b border-gray-200">
                                <nav className="flex overflow-x-auto scrollbar-hide">
                                    {[
                                        { key: 'scripts', label: 'Scripts', count: scripts.length, icon: '📝', color: 'indigo' },
                                        { key: 'videos', label: 'Videos', count: videos.length, icon: '🎥', color: 'blue' },
                                        { key: 'about', label: 'About', count: null, icon: '👤', color: 'emerald' }
                                    ].map((tab) => (
                                        <button
                                            key={tab.key}
                                            onClick={() => {
                                                setActiveTab(tab.key);
                                                setIsSidebarOpen(false);
                                            }}
                                            className={`flex items-center py-5 px-6 text-center border-b-2 font-medium whitespace-nowrap transition-all duration-300 min-w-0 flex-1 sm:flex-none ${
                                                activeTab === tab.key
                                                    ? `border-${tab.color}-500 text-${tab.color}-600 bg-${tab.color}-50/50`
                                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                            }`}
                                        >
                                            <span className="text-xl mr-3">{tab.icon}</span>
                                            <span className="font-semibold text-base">{tab.label}</span>
                                            {tab.count !== null && (
                                                <span className={`ml-3 px-2 py-1 rounded-full text-xs font-bold ${
                                                    activeTab === tab.key
                                                        ? `bg-${tab.color}-100 text-${tab.color}-700`
                                                        : 'bg-gray-200 text-gray-700'
                                                }`}>
                                                    {tab.count}
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </nav>
                            </div>
                            
                            {/* Tab Content */}
                            <div className="p-6 sm:p-8">
                                {renderContent()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add this CSS for scrollbar hiding */}
            <style jsx>{`
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </Layout>
    );
};

export default GenrePage;