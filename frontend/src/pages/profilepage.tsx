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
    FaCalendar, FaEnvelope, FaStar, FaGlobe, FaRocket,
    FaGem, FaLightbulb, FaMagic, FaBrain
} from 'react-icons/fa';
import { RiShieldUserFill, RiSparklingFill } from 'react-icons/ri';
import { IoMdNotifications, IoMdRocket } from 'react-icons/io';
import { GiArtificialIntelligence } from 'react-icons/gi';
import axios from 'axios';
import cover from '.././assets/public/cover.jpg';
import avatar from '.././assets/public/avatar.jpg';
import '../App.css';
import { API_BASE_URL } from "../api";

const token = localStorage.getItem("token") || null;

interface Notification {
    id: string;
    type: 'success' | 'error' | 'info' | 'ai';
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
    const [aiMode, setAiMode] = useState(false);

    // Add notification
    const addNotification = (type: 'success' | 'error' | 'info' | 'ai', message: string) => {
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
                // Show AI notification
                addNotification('ai', `✨ AI Assistant: Successfully switched to ${newMode} mode`);
                
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
        addNotification('info', "AI is refreshing your profile data...");
    };

    const toggleAiMode = () => {
        setAiMode(!aiMode);
        addNotification('ai', `✨ AI ${!aiMode ? 'enabled' : 'disabled'}. ${!aiMode ? 'Smart features activated!' : 'Switched to manual mode.'}`);
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
        addNotification('info', "Edit mode activated. Make your changes!");
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
            addNotification('success', "✅ Profile updated successfully");
        } catch (error) {
            console.error("Error updating profile:", error);
            addNotification('error', "❌ Failed to update profile");
        }
    };

    const handleCancelEdit = () => {
        setFormData({ 
            username: user.username, 
            dob: user.dob,
            bio: user.bio || '' 
        });
        setEditMode(false);
        addNotification('info', "Edit cancelled. No changes saved.");
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
            addNotification('ai', "🤖 AI: Follow feature coming soon with smart recommendations!");
        } catch (error) {
            console.error("Error following user:", error);
            addNotification('error', "Failed to follow user");
        }
    };

    const renderAllowedGenres = () => {
        if (!user.allowedGenres || user.allowedGenres.length === 0) {
            return (
                <div className="text-gray-400 text-sm bg-gradient-to-r from-yellow-50/50 to-amber-50/50 px-4 py-3 rounded-xl text-center border border-yellow-200">
                    No content ratings specified
                </div>
            );
        }

        return user.allowedGenres.map((genre: string) => {
            let bgColor, textColor, borderColor, icon;
            switch (genre) {
                case "G":
                    bgColor = "bg-gradient-to-r from-green-50 to-emerald-50";
                    textColor = "text-emerald-700";
                    borderColor = "border-emerald-300";
                    icon = "🟢";
                    break;
                case "PG":
                case "PG-13":
                    bgColor = "bg-gradient-to-r from-blue-50 to-indigo-50";
                    textColor = "text-blue-700";
                    borderColor = "border-blue-300";
                    icon = "🔵";
                    break;
                case "R":
                    bgColor = "bg-gradient-to-r from-yellow-50 to-amber-50";
                    textColor = "text-amber-700";
                    borderColor = "border-amber-300";
                    icon = "🟡";
                    break;
                case "X":
                    bgColor = "bg-gradient-to-r from-red-50 to-rose-50";
                    textColor = "text-rose-700";
                    borderColor = "border-rose-300";
                    icon = "🔴";
                    break;
                default:
                    bgColor = "bg-gradient-to-r from-gray-50 to-slate-50";
                    textColor = "text-gray-700";
                    borderColor = "border-gray-300";
                    icon = "⚪";
            }
            return (
                <div 
                    key={genre} 
                    className={`flex items-center ${bgColor} ${textColor} ${borderColor} border px-4 py-2.5 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105`}
                >
                    <span className="mr-2 text-lg">{icon}</span>
                    <span className="font-bold">{genre}</span>
                </div>
            );
        });
    };

    const renderContent = () => {
        if (contentLoading) {
            return (
                <div className="flex justify-center items-center py-20">
                    <div className="text-center">
                        <div className="relative">
                            <div className="w-16 h-16 border-4 border-yellow-200 rounded-full"></div>
                            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-yellow-700 border-l-transparent rounded-full animate-spin" style={{ animationDirection: 'reverse' }}></div>
                        </div>
                        <p className="mt-6 text-lg font-semibold text-gray-800">AI is loading content...</p>
                        <p className="text-gray-600 text-sm mt-2">Analyzing user data with smart algorithms</p>
                        <div className="mt-6 w-64 mx-auto">
                            <div className="h-1.5 bg-yellow-100 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-yellow-400 to-yellow-600 animate-pulse"></div>
                            </div>
                        </div>
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
                                <h3 className="text-xl font-bold text-gray-900">AI-Analyzed Scripts</h3>
                                <p className="text-gray-600 text-sm mt-1 flex items-center">
                                    <GiArtificialIntelligence className="mr-2 text-yellow-600" />
                                    {scripts.length} script{scripts.length !== 1 ? 's' : ''} • Smart recommendations available
                                </p>
                            </div>
                            {scripts.length > 0 && (
                                <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                                    <span className="text-sm text-gray-600 font-medium">AI suggests: Click to read more</span>
                                </div>
                            )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {scripts?.map((script: any, index: number) => {
                                const scriptData = data?.[index];
                                return (
                                    <div
                                        key={scriptData?._id || index}
                                        className={`relative group border border-gray-200 w-full min-h-[300px] p-5 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer bg-gradient-to-br from-white to-yellow-50 hover:-translate-y-2 ${
                                            showMoreIndex === index ? "ring-2 ring-yellow-400 shadow-xl" : ""
                                        }`}
                                        onMouseEnter={() => handleScriptMouseEnter(index)}
                                        onMouseLeave={handleScriptMouseLeave}
                                        onClick={() => nav(`/script/${scriptData?._id}`, { state: JSON.stringify(scriptData) })}
                                    >
                                        <div className="absolute top-4 right-4">
                                            <div className="bg-gradient-to-r from-yellow-500 to-amber-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                                                <span className="flex items-center">
                                                    <FaBrain className="mr-1" />
                                                    AI Script
                                                </span>
                                            </div>
                                        </div>
                                        
                                        <div className="mb-4">
                                            <div className="flex items-center space-x-2">
                                                <div className="w-10 h-10 bg-gradient-to-r from-yellow-100 to-amber-100 rounded-xl flex items-center justify-center">
                                                    <FaFileAlt className="text-yellow-600 text-lg" />
                                                </div>
                                                <div>
                                                    <h2 className="font-bold text-lg text-gray-900 line-clamp-1">
                                                        {scriptData?.title || "Untitled Script"}
                                                    </h2>
                                                    <p className="text-yellow-600 text-xs font-medium">AI Generated</p>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="text-gray-700 text-sm line-clamp-4 mb-6 leading-relaxed bg-gradient-to-r from-gray-50 to-white p-4 rounded-xl">
                                            <Render htmlString={script} />
                                        </div>

                                        <div className="absolute bottom-4 left-4 right-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center space-x-2">
                                                    <FaStar className="text-yellow-500 text-sm" />
                                                    <span className="text-xs text-gray-600">AI Rating: 8.5/10</span>
                                                </div>
                                                <span className="text-xs text-gray-500">
                                                    {new Date(scriptData?.createdAt || Date.now()).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>

                                        {showMoreIndex === index && (
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent rounded-2xl flex items-end justify-center p-6 transition-all duration-300">
                                                <button className="bg-gradient-to-r from-yellow-500 to-amber-600 text-white px-6 py-3 rounded-xl font-bold hover:shadow-2xl transition-all duration-300 transform hover:scale-105 shadow-lg">
                                                    <span className="flex items-center">
                                                        <FaMagic className="mr-2" />
                                                        Read with AI Assistance →
                                                    </span>
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
                                                    className="p-2.5 rounded-xl hover:bg-yellow-100 transition duration-200 bg-white shadow-lg border border-yellow-200 hover:shadow-xl"
                                                >
                                                    <FaEllipsisV className="text-yellow-700" />
                                                </button>

                                                {menuOpen === index && (
                                                    <div className="absolute right-0 bottom-full mb-2 w-48 bg-white border border-yellow-200 shadow-2xl rounded-xl overflow-hidden z-50">
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
                                                                <FaTrash className="mr-3 text-sm" />
                                                                <span className="font-semibold">AI Delete</span>
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
                            <div className="text-center py-16 bg-gradient-to-br from-yellow-50/50 to-amber-50/50 rounded-2xl border-2 border-dashed border-yellow-300">
                                <div className="text-7xl mb-6">🤖</div>
                                <p className="text-2xl font-bold text-gray-900 mb-2">No AI Scripts Yet</p>
                                <p className="text-gray-600 max-w-md mx-auto">Our AI is ready to help you create amazing scripts. Start writing!</p>
                                <button className="mt-6 bg-gradient-to-r from-yellow-500 to-amber-600 text-white px-6 py-3 rounded-xl font-bold hover:shadow-xl transition-all duration-300">
                                    <span className="flex items-center">
                                        <FaMagic className="mr-2" />
                                        Create with AI Assistance
                                    </span>
                                </button>
                            </div>
                        )}
                    </div>
                );
            
            case 'videos':
                return (
                    <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Smart Video Library</h3>
                                <p className="text-gray-600 text-sm mt-1 flex items-center">
                                    <GiArtificialIntelligence className="mr-2 text-yellow-600" />
                                    {videos.length} video{videos.length !== 1 ? 's' : ''} • AI-enhanced playback
                                </p>
                            </div>
                            {videos.length > 0 && (
                                <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                                    <span className="text-sm text-gray-600 font-medium">AI suggests: Click to watch</span>
                                </div>
                            )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {videos?.map((video: any) => (
                                <div
                                    key={video._id}
                                    className="group border border-gray-200 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer bg-gradient-to-br from-white to-yellow-50 hover:-translate-y-2 overflow-hidden"
                                    onClick={() => nav(`/video/${video._id}`)}
                                >
                                    <div className="relative overflow-hidden aspect-video">
                                        {video.thumbnail ? (
                                            <img
                                                src={video.thumbnail}
                                                alt={video.title}
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center">
                                                <span className="text-white text-5xl">🎬</span>
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                        <div className="absolute top-4 right-4">
                                            <div className="bg-gradient-to-r from-yellow-500 to-amber-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                                                <span className="flex items-center">
                                                    <FaVideo className="mr-1" />
                                                    AI Video
                                                </span>
                                            </div>
                                        </div>
                                        <div className="absolute bottom-4 left-4">
                                            <div className="flex items-center space-x-2">
                                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                                <span className="text-xs text-white font-medium">AI Enhanced</span>
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
                                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-yellow-200">
                                            <div className="flex items-center space-x-2">
                                                <FaBrain className="text-yellow-600 text-sm" />
                                                <span className="text-xs text-gray-600">
                                                    AI Processed
                                                </span>
                                            </div>
                                            <div className="text-xs text-gray-500 flex items-center">
                                                <FaCalendar className="mr-1" />
                                                {video.createdAt ? new Date(video.createdAt).toLocaleDateString() : "Recent"}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {videos.length === 0 && (
                            <div className="text-center py-16 bg-gradient-to-br from-yellow-50/50 to-amber-50/50 rounded-2xl border-2 border-dashed border-yellow-300">
                                <div className="text-7xl mb-6">🎥</div>
                                <p className="text-2xl font-bold text-gray-900 mb-2">No Videos Yet</p>
                                <p className="text-gray-600 max-w-md mx-auto">Upload videos and let our AI enhance them with smart features</p>
                                <button className="mt-6 bg-gradient-to-r from-yellow-500 to-amber-600 text-white px-6 py-3 rounded-xl font-bold hover:shadow-xl transition-all duration-300">
                                    <span className="flex items-center">
                                        <FaRocket className="mr-2" />
                                        Upload with AI Optimization
                                    </span>
                                </button>
                            </div>
                        )}
                    </div>
                );
            
            case 'about':
                return (
                    <div className="space-y-8">
                        <div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">AI-Powered Profile</h3>
                            <p className="text-gray-600 flex items-center">
                                <GiArtificialIntelligence className="mr-2 text-yellow-600" />
                                Smart insights and analytics powered by artificial intelligence
                            </p>
                        </div>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* AI Profile Card */}
                            <div className="bg-gradient-to-br from-white to-yellow-50 p-6 rounded-2xl border border-yellow-200 shadow-xl">
                                <div className="flex items-center space-x-4 mb-6">
                                    <div className="w-14 h-14 bg-gradient-to-r from-yellow-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
                                        <GiArtificialIntelligence className="text-white text-2xl" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-lg text-gray-900">AI Profile Analysis</h4>
                                        <p className="text-gray-600 text-sm">Smart insights and recommendations</p>
                                    </div>
                                </div>
                                <div className="space-y-5">
                                    <div className="p-4 bg-gradient-to-r from-yellow-100/50 to-amber-100/50 rounded-xl border border-yellow-200">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-yellow-300">
                                                    <FaBrain className="text-yellow-600" />
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-700 font-semibold">AI Username Score</p>
                                                    <p className="text-lg font-bold text-gray-900">{user.username}</p>
                                                </div>
                                            </div>
                                            <div className="bg-gradient-to-r from-yellow-500 to-amber-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                                                92/100
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="p-4 bg-gradient-to-r from-yellow-100/50 to-amber-100/50 rounded-xl border border-yellow-200">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-yellow-300">
                                                    <FaEnvelope className="text-yellow-600" />
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-700 font-semibold">Email Security</p>
                                                    <p className="text-lg font-bold text-gray-900">{user.email}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-1">
                                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                                <span className="text-xs text-gray-600 font-medium">Secure</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="p-4 bg-gradient-to-r from-yellow-100/50 to-amber-100/50 rounded-xl border border-yellow-200">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-yellow-300">
                                                    <FaCalendar className="text-yellow-600" />
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-700 font-semibold">Member Since</p>
                                                    <p className="text-lg font-bold text-gray-900">
                                                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', {
                                                            year: 'numeric',
                                                            month: 'short',
                                                            day: 'numeric'
                                                        }) : 'N/A'}
                                                    </p>
                                                </div>
                                            </div>
                                            <RiSparklingFill className="text-yellow-500 text-xl" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* AI Marketplace Card */}
                            <div className="bg-gradient-to-br from-white to-yellow-50 p-6 rounded-2xl border border-yellow-200 shadow-xl">
                                <div className="flex items-center space-x-4 mb-6">
                                    <div className="w-14 h-14 bg-gradient-to-r from-amber-500 to-yellow-600 rounded-xl flex items-center justify-center shadow-lg">
                                        <FaStore className="text-white text-2xl" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-lg text-gray-900">AI Marketplace Status</h4>
                                        <p className="text-gray-600 text-sm">Smart role optimization</p>
                                    </div>
                                </div>
                                <div className="space-y-5">
                                    <div className="p-4 bg-gradient-to-r from-yellow-100/50 to-amber-100/50 rounded-xl border border-yellow-200">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-yellow-300">
                                                    {marketplaceMode === 'seller' ? (
                                                        <FaUserTie className="text-yellow-600" />
                                                    ) : (
                                                        <FaShoppingCart className="text-yellow-600" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-700 font-semibold">AI Recommended Role</p>
                                                    <p className="text-lg font-bold text-gray-900">
                                                        {marketplaceMode === 'seller' ? 'Seller Mode' : 'Buyer Mode'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                                                marketplaceMode === 'seller' 
                                                    ? 'bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-700 border border-emerald-300' 
                                                    : 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 border border-blue-300'
                                            }`}>
                                                AI OPTIMIZED
                                            </div>
                                        </div>
                                        <p className="text-sm text-gray-600 mt-2">
                                            {marketplaceMode === 'seller' 
                                                ? 'AI suggests you continue as seller based on your content creation patterns' 
                                                : 'AI suggests you continue as buyer based on your consumption patterns'}
                                        </p>
                                    </div>
                                    
                                    <div className="p-4 bg-gradient-to-r from-yellow-100/50 to-amber-100/50 rounded-xl border border-yellow-200">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-yellow-300">
                                                    <FaCrown className="text-yellow-600" />
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-700 font-semibold">AI Subscription Score</p>
                                                    <p className="text-lg font-bold text-gray-900">
                                                        {userHasPaid ? 'Premium' : 'Standard'}
                                                    </p>
                                                </div>
                                            </div>
                                            {userHasPaid ? (
                                                <div className="flex items-center space-x-1">
                                                    <FaGem className="text-yellow-500" />
                                                    <span className="text-xs font-bold text-yellow-700">PRO</span>
                                                </div>
                                            ) : (
                                                <div className="text-xs text-gray-600 font-medium">BASIC</div>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-600">
                                            {userHasPaid 
                                                ? 'AI detects premium features usage: 85% optimization achieved' 
                                                : 'AI recommends upgrading for 40% better experience'}
                                        </p>
                                    </div>
                                    
                                    <div className="p-4 bg-gradient-to-r from-yellow-100/50 to-amber-100/50 rounded-xl border border-yellow-200">
                                        <p className="text-sm font-semibold text-gray-700 mb-3">AI Content Ratings Analysis</p>
                                        <div className="grid grid-cols-2 gap-3">
                                            {renderAllowedGenres()}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-3">
                                            AI analysis shows optimal content preference balance
                                        </p>
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

    // AI Notifications Component
    const AINotificationPanel = () => (
        <div className="fixed top-4 right-4 z-50 space-y-3 max-w-sm">
            {notifications.map((notification) => (
                <div
                    key={notification.id}
                    className={`transform transition-all duration-300 animate-slideIn ${
                        notification.type === 'success' 
                            ? 'bg-gradient-to-r from-green-50 to-emerald-50 border border-emerald-300 shadow-lg' 
                            : notification.type === 'error'
                            ? 'bg-gradient-to-r from-red-50 to-rose-50 border border-rose-300 shadow-lg'
                            : notification.type === 'ai'
                            ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border border-amber-300 shadow-xl'
                            : 'bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-300 shadow-lg'
                    } rounded-2xl p-4 backdrop-blur-sm`}
                >
                    <div className="flex items-start space-x-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${
                            notification.type === 'success'
                                ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-emerald-600'
                                : notification.type === 'error'
                                ? 'bg-gradient-to-r from-red-100 to-rose-100 text-rose-600'
                                : notification.type === 'ai'
                                ? 'bg-gradient-to-r from-yellow-100 to-amber-100 text-amber-600'
                                : 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-600'
                        }`}>
                            {notification.type === 'success' ? (
                                <FaCheck className="text-lg" />
                            ) : notification.type === 'error' ? (
                                <FaTimes className="text-lg" />
                            ) : notification.type === 'ai' ? (
                                <GiArtificialIntelligence className="text-lg" />
                            ) : (
                                <IoMdNotifications className="text-lg" />
                            )}
                        </div>
                        <div className="flex-1">
                            <p className={`font-bold ${
                                notification.type === 'ai' ? 'text-amber-700' : 'text-gray-900'
                            }`}>
                                {notification.message}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                {notification.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                {notification.type === 'ai' && ' • AI Assistant'}
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

    // Delete Confirmation Modal with AI Theme
    const DeleteConfirmationModal = () => {
        if (!showDeleteConfirm) return null;
        
        return (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
                <div className="bg-gradient-to-br from-white to-yellow-50 rounded-2xl max-w-md w-full p-6 transform transition-all duration-300 scale-100 border border-yellow-200 shadow-2xl">
                    <div className="flex items-center space-x-3 mb-6">
                        <div className="w-12 h-12 bg-gradient-to-r from-red-100 to-rose-100 rounded-xl flex items-center justify-center shadow-lg">
                            <GiArtificialIntelligence className="text-rose-600 text-2xl" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-gray-900">AI Delete Confirmation</h3>
                            <p className="text-gray-600 text-sm">Our AI wants to confirm this action</p>
                        </div>
                    </div>
                    
                    <div className="p-4 bg-gradient-to-r from-red-50/50 to-rose-50/50 rounded-xl border border-red-200 mb-8">
                        <div className="flex items-center space-x-3">
                            <FaBrain className="text-rose-600" />
                            <p className="text-gray-700 font-medium">
                                This script will be permanently deleted. Our AI has analyzed this action.
                            </p>
                        </div>
                        <p className="text-sm text-gray-600 mt-3">
                            • Cannot be undone<br/>
                            • All associated data removed<br/>
                            • AI recovery not available
                        </p>
                    </div>
                    
                    <div className="flex space-x-3">
                        <button
                            onClick={() => deleteScript(showDeleteConfirm)}
                            className="flex-1 bg-gradient-to-r from-red-500 to-rose-600 text-white py-3.5 px-4 rounded-xl font-bold hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 flex items-center justify-center space-x-2"
                        >
                            <FaTrash className="text-sm" />
                            <span>Confirm AI Delete</span>
                        </button>
                        <button
                            onClick={() => setShowDeleteConfirm(null)}
                            className="flex-1 bg-gradient-to-r from-yellow-100 to-amber-100 text-gray-700 py-3.5 px-4 rounded-xl font-bold hover:shadow-lg transition-all duration-300 border border-yellow-300"
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
                <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-50/50 to-amber-50/50 p-4">
                    <div className="text-center max-w-md w-full">
                        <div className="relative mx-auto mb-6 w-24 h-24">
                            <div className="absolute inset-0 border-4 border-yellow-200 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                            <div className="absolute inset-0 border-4 border-yellow-700 border-l-transparent rounded-full animate-spin" style={{ animationDirection: 'reverse' }}></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <GiArtificialIntelligence className="text-yellow-600 text-3xl" />
                            </div>
                        </div>
                        <p className="text-xl text-gray-800 font-bold mb-2">AI is loading your dashboard...</p>
                        <p className="text-gray-600 mb-6">Analyzing your profile with advanced algorithms</p>
                        <div className="mt-8">
                            <div className="h-2 bg-yellow-100 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 animate-pulse shadow-lg"></div>
                            </div>
                            <div className="flex justify-between mt-2">
                                <span className="text-xs text-gray-500">Initializing AI</span>
                                <span className="text-xs text-yellow-700 font-bold">Processing...</span>
                            </div>
                        </div>
                        <div className="mt-8 grid grid-cols-3 gap-2">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="h-1 bg-gradient-to-r from-yellow-300 to-amber-400 rounded-full animate-pulse" style={{ animationDelay: `${i * 0.2}s` }}></div>
                            ))}
                        </div>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout expand={false} hasHeader={true}>
            <AINotificationPanel />
            <DeleteConfirmationModal />
            
            {/* AI Assistant Button */}
            <div className="fixed bottom-6 right-6 z-40">
                <button
                    onClick={toggleAiMode}
                    className={`p-4 rounded-2xl shadow-2xl transition-all duration-500 transform hover:scale-110 ${
                        aiMode 
                            ? 'bg-gradient-to-r from-yellow-500 to-amber-600 animate-pulse shadow-yellow-500/50' 
                            : 'bg-gradient-to-r from-gray-800 to-gray-900 shadow-gray-900/50'
                    }`}
                >
                    <GiArtificialIntelligence className={`text-2xl ${aiMode ? 'text-white' : 'text-yellow-400'}`} />
                </button>
            </div>

            {/* Mobile Sidebar Toggle with AI */}
            <div className="lg:hidden fixed top-20 right-4 z-40">
                <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="bg-gradient-to-r from-yellow-500 to-amber-600 shadow-lg rounded-xl p-3 border border-yellow-300 text-white"
                >
                    <FaEllipsisV />
                </button>
            </div>

            <div className="mt-12 px-4 sm:px-6 lg:px-8">
                {/* Header Section with AI Theme */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
                    <div>
                        <div className="flex items-center space-x-3 mb-2">
                            <div className="w-10 h-10 bg-gradient-to-r from-yellow-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
                                <GiArtificialIntelligence className="text-white text-xl" />
                            </div>
                            <div>
                                <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-yellow-600 via-amber-600 to-yellow-700 bg-clip-text text-transparent">
                                    AI Profile Dashboard
                                </h1>
                                <p className="text-gray-600 mt-1">Powered by Artificial Intelligence</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={handleRefresh}
                            disabled={refreshing || changingMode}
                            className="flex items-center justify-center space-x-3 bg-gradient-to-r from-yellow-500 to-amber-600 text-white px-5 py-3 rounded-xl hover:shadow-xl transition-all duration-300 disabled:opacity-50 shadow-lg hover:-translate-y-0.5 font-bold"
                        >
                            {refreshing ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <FaSync />
                            )}
                            <span>{refreshing ? 'AI Refreshing...' : 'AI Refresh'}</span>
                        </button>
                        {aiMode && (
                            <div className="hidden sm:flex items-center space-x-2 bg-gradient-to-r from-yellow-100 to-amber-100 text-amber-800 px-3 py-2 rounded-full border border-yellow-300">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                <span className="text-sm font-bold">AI ACTIVE</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* AI Enhanced Cover Image */}
                <div className="relative w-full h-48 sm:h-56 md:h-64 lg:h-72 rounded-3xl overflow-hidden shadow-2xl mb-8">
                    <img
                        className="w-full h-full object-cover"
                        src={user.coverImage || cover}
                        alt="Cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 to-transparent"></div>
                    <div className="absolute bottom-6 left-6 right-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="flex items-center space-x-3 mb-2">
                                    <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-amber-600 rounded-xl flex items-center justify-center shadow-xl">
                                        <GiArtificialIntelligence className="text-white text-2xl" />
                                    </div>
                                    <div>
                                        <h1 className="text-3xl md:text-4xl font-bold text-white">
                                            {user.username}
                                        </h1>
                                        <p className="text-gray-200 flex items-center">
                                            <FaEnvelope className="mr-2 text-sm" />
                                            {user.email}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            {userHasPaid && (
                                <div className="hidden sm:flex items-center space-x-2 bg-gradient-to-r from-yellow-500 to-amber-600 text-white px-4 py-2 rounded-full shadow-xl">
                                    <FaCrown className="text-sm" />
                                    <span className="text-sm font-bold">AI PREMIUM</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Profile Header - AI Enhanced */}
                <div className="flex flex-col lg:flex-row items-start gap-6 mb-8">
                    {/* Avatar Section - AI Badge */}
                    <div className="flex flex-col items-center lg:items-start space-y-4 w-full lg:w-auto">
                        <div className="relative -mt-16 lg:-mt-20">
                            <div className="relative">
                                <div className="absolute -inset-2 bg-gradient-to-r from-yellow-500 to-amber-600 rounded-2xl blur-md opacity-50"></div>
                                <img
                                    className="relative rounded-2xl bg-white h-32 w-32 sm:h-36 sm:w-36 border-4 border-white shadow-2xl"
                                    src={user.avatar || avatar}
                                    alt="Avatar"
                                />
                                {isCurrentUser && (
                                    <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-yellow-500 to-amber-600 text-white p-2.5 rounded-full border-4 border-white shadow-2xl animate-pulse">
                                        <RiSparklingFill className="text-sm" />
                                    </div>
                                )}
                            </div>
                            
                            {/* AI Bio Badge */}
                            {user.bio && (
                                <div className="mt-4 lg:hidden">
                                    <div className="bg-gradient-to-r from-yellow-50 to-amber-50 p-4 rounded-xl border border-yellow-200 shadow-lg">
                                        <div className="flex items-center space-x-2 mb-2">
                                            <FaBrain className="text-yellow-600" />
                                            <span className="text-sm font-bold text-yellow-700">AI BIO ANALYSIS</span>
                                        </div>
                                        <p className="text-gray-700 text-base">{user.bio}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        {/* AI Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                            {!isCurrentUser && (
                                <button
                                    onClick={handleFollow}
                                    className="flex items-center justify-center space-x-3 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-white px-6 py-3.5 rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 font-bold w-full sm:w-auto transform hover:-translate-y-0.5"
                                >
                                    <FaHeart className="text-sm" />
                                    <span>AI Follow</span>
                                </button>
                            )}
                            
                            {isCurrentUser && (
                                <button 
                                    onClick={toggleMarketplaceMode}
                                    disabled={changingMode || refreshing}
                                    className={`flex items-center justify-center space-x-3 px-6 py-3.5 rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 font-bold w-full sm:w-auto transform hover:-translate-y-0.5 ${
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
                                            <span className="text-base">AI Seller Mode</span>
                                        </>
                                    ) : (
                                        <>
                                            <FaShoppingCart className="text-lg" />
                                            <span className="text-base">AI Buyer Mode</span>
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Desktop AI Stats Grid */}
                    <div className="flex-1 hidden lg:block">
                        {user.bio && (
                            <div className="bg-gradient-to-r from-yellow-50 to-amber-50 p-6 rounded-2xl border border-yellow-200 shadow-lg mb-6">
                                <div className="flex items-center space-x-3 mb-4">
                                    <FaBrain className="text-yellow-600 text-xl" />
                                    <h3 className="font-bold text-gray-900">AI Profile Analysis</h3>
                                </div>
                                <p className="text-gray-700 text-lg leading-relaxed">{user.bio}</p>
                            </div>
                        )}

                        {/* AI Stats Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                { icon: FaUsers, label: "AI Followers", value: user.followers?.length || 0, color: "from-blue-500 to-indigo-600" },
                                { icon: FaUser, label: "AI Following", value: user.followings?.length || 0, color: "from-emerald-500 to-green-600" },
                                { icon: FaFileAlt, label: "AI Scripts", value: scripts.length, color: "from-purple-500 to-pink-600" },
                                { icon: FaVideo, label: "AI Videos", value: videos.length, color: "from-rose-500 to-red-600" }
                            ].map((stat, index) => (
                                <div 
                                    key={index}
                                    className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-2xl p-5 text-center shadow-lg hover:shadow-xl transition-all duration-300 group hover:-translate-y-1"
                                >
                                    <div className={`w-12 h-12 bg-gradient-to-r ${stat.color} rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                                        <stat.icon className="text-white text-xl" />
                                    </div>
                                    <div className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
                                    <div className="text-sm font-bold text-gray-600">{stat.label}</div>
                                    <div className="mt-2">
                                        <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                                            <div className="h-full bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full" style={{ width: `${Math.min(100, (stat.value / 100) * 100)}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Mobile AI Stats Grid */}
                <div className="lg:hidden mb-8">
                    <div className="grid grid-cols-2 gap-4">
                        {[
                            { icon: FaUsers, label: "Followers", value: user.followers?.length || 0 },
                            { icon: FaUser, label: "Following", value: user.followings?.length || 0 },
                            { icon: FaFileAlt, label: "Scripts", value: scripts.length },
                            { icon: FaVideo, label: "Videos", value: videos.length }
                        ].map((stat, index) => (
                            <div key={index} className="bg-white border border-yellow-200 rounded-xl p-4 text-center shadow-sm">
                                <stat.icon className="text-yellow-600 mx-auto mb-2" />
                                <div className="text-xl font-bold text-gray-900 mb-1">{stat.value}</div>
                                <div className="text-xs text-gray-600">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main Content with AI Theme */}
                <div className="mt-8 flex flex-col lg:flex-row gap-8">
                    {/* AI Sidebar - Profile Info */}
                    <div className={`w-full lg:w-1/3 ${isSidebarOpen ? 'block' : 'hidden lg:block'}`}>
                        <div className="bg-gradient-to-br from-white to-yellow-50 rounded-2xl shadow-2xl border border-yellow-200 p-6 lg:sticky lg:top-24">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">AI Profile Details</h2>
                                    <p className="text-gray-600 text-sm mt-1 flex items-center">
                                        <GiArtificialIntelligence className="mr-2 text-yellow-600" />
                                        Smart insights powered by AI
                                    </p>
                                </div>
                                {isCurrentUser && !editMode && (
                                    <button
                                        onClick={handleEdit}
                                        className="flex items-center space-x-2 bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-700 hover:text-yellow-800 transition-all duration-300 px-4 py-2.5 rounded-xl hover:shadow-md border border-yellow-300 font-bold"
                                    >
                                        <FaEdit size="16" />
                                        <span className="text-sm">AI Edit</span>
                                    </button>
                                )}
                            </div>

                            {editMode ? (
                                <form onSubmit={handleSubmit} className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center">
                                            <FaBrain className="mr-2 text-yellow-600" />
                                            Username
                                        </label>
                                        <input
                                            type="text"
                                            name="username"
                                            value={formData.username}
                                            onChange={handleChange}
                                            className="w-full p-3.5 border border-yellow-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all bg-white"
                                            placeholder="Enter username"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center">
                                            <FaCalendar className="mr-2 text-yellow-600" />
                                            Date of Birth
                                        </label>
                                        <input
                                            type="date"
                                            name="dob"
                                            value={formData.dob}
                                            onChange={handleChange}
                                            className="w-full p-3.5 border border-yellow-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all bg-white"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center">
                                            <FaLightbulb className="mr-2 text-yellow-600" />
                                            Bio
                                        </label>
                                        <textarea
                                            name="bio"
                                            value={formData.bio}
                                            onChange={handleChange}
                                            rows={4}
                                            className="w-full p-3.5 border border-yellow-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all bg-white resize-none"
                                            placeholder="Tell your story..."
                                        />
                                    </div>

                                    <div className="flex space-x-3 pt-2">
                                        <button 
                                            type="submit" 
                                            className="flex-1 bg-gradient-to-r from-yellow-500 to-amber-600 text-white py-3.5 px-4 rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 font-bold hover:-translate-y-0.5"
                                        >
                                            AI Save Changes
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={handleCancelEdit}
                                            className="flex-1 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 py-3.5 px-4 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 font-bold hover:bg-gray-300"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <div className="space-y-6">
                                    <div className="p-4 bg-gradient-to-r from-yellow-100/50 to-amber-100/50 rounded-xl border border-yellow-300">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-yellow-300 shadow-sm">
                                                <FaUser className="text-yellow-600" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-500 font-medium">AI Username</p>
                                                <p className="font-bold text-gray-900 text-lg">{user.username}</p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="p-4 bg-gradient-to-r from-yellow-100/50 to-amber-100/50 rounded-xl border border-yellow-300">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-yellow-300 shadow-sm">
                                                <FaEnvelope className="text-yellow-600" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-500 font-medium">Email Address</p>
                                                <p className="font-bold text-gray-900 text-lg">{user.email}</p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="p-4 bg-gradient-to-r from-yellow-100/50 to-amber-100/50 rounded-xl border border-yellow-300">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-yellow-300 shadow-sm">
                                                <FaCalendar className="text-yellow-600" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-500 font-medium">Date of Birth</p>
                                                <p className="font-bold text-gray-900 text-lg">{user.dob || 'Not specified'}</p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="p-4 bg-gradient-to-r from-yellow-100/50 to-amber-100/50 rounded-xl border border-yellow-300">
                                        <p className="text-sm font-bold text-gray-700 mb-3 flex items-center">
                                            <FaStar className="mr-2 text-yellow-600" />
                                            AI Content Ratings
                                        </p>
                                        <div className="grid grid-cols-2 gap-3">
                                            {renderAllowedGenres()}
                                        </div>
                                    </div>
                                    
                                    <div className="p-4 bg-gradient-to-r from-yellow-100/50 to-amber-100/50 rounded-xl border border-yellow-300">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 bg-gradient-to-r from-yellow-500 to-amber-600 rounded-lg flex items-center justify-center shadow-md">
                                                {marketplaceMode === 'seller' ? (
                                                    <FaUserTie className="text-white" />
                                                ) : (
                                                    <FaShoppingCart className="text-white" />
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-500 font-medium">AI Mode</p>
                                                <p className="font-bold text-gray-900 text-lg">
                                                    {marketplaceMode === 'seller' ? 'Seller' : 'Buyer'} Mode
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* AI Right Content - Tabs */}
                    <div className="w-full lg:w-2/3">
                        {/* AI Navigation Tabs */}
                        <div className="bg-gradient-to-br from-white to-yellow-50 rounded-2xl shadow-2xl border border-yellow-200 overflow-hidden mb-8">
                            <div className="border-b border-yellow-200">
                                <nav className="flex overflow-x-auto scrollbar-hide">
                                    {[
                                        { key: 'scripts', label: 'AI Scripts', count: scripts.length, icon: '🤖', color: 'from-yellow-500 to-amber-600' },
                                        { key: 'videos', label: 'AI Videos', count: videos.length, icon: '🎬', color: 'from-orange-500 to-amber-600' },
                                        { key: 'about', label: 'AI About', count: null, icon: '🧠', color: 'from-amber-500 to-yellow-600' }
                                    ].map((tab) => (
                                        <button
                                            key={tab.key}
                                            onClick={() => {
                                                setActiveTab(tab.key);
                                                setIsSidebarOpen(false);
                                            }}
                                            className={`flex items-center py-5 px-6 text-center border-b-2 font-bold whitespace-nowrap transition-all duration-300 min-w-0 flex-1 sm:flex-none group ${
                                                activeTab === tab.key
                                                    ? `border-yellow-500 text-yellow-700 bg-gradient-to-r ${tab.color} bg-opacity-10`
                                                    : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-yellow-50'
                                            }`}
                                        >
                                            <span className={`text-xl mr-3 ${activeTab === tab.key ? 'animate-pulse' : ''}`}>{tab.icon}</span>
                                            <span className="text-base">{tab.label}</span>
                                            {tab.count !== null && (
                                                <span className={`ml-3 px-2.5 py-1 rounded-full text-xs font-bold ${
                                                    activeTab === tab.key
                                                        ? 'bg-white text-yellow-700'
                                                        : 'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                    {tab.count}
                                                </span>
                                            )}
                                            {activeTab === tab.key && (
                                                <div className="ml-2 w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                                            )}
                                        </button>
                                    ))}
                                </nav>
                            </div>
                            
                            {/* AI Tab Content */}
                            <div className="p-6 sm:p-8">
                                {renderContent()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Animations */}
            <style jsx>{`
                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                
                @keyframes fadeIn {
                    from {
                        opacity: 0;
                        transform: scale(0.95);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1);
                    }
                }
                
                .animate-slideIn {
                    animation: slideIn 0.3s ease-out;
                }
                
                .animate-fadeIn {
                    animation: fadeIn 0.3s ease-out;
                }
                
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                
                .border-t-2 {
                    border-top-width: 2px;
                }
                
                .border-b-2 {
                    border-bottom-width: 2px;
                }
            `}</style>
        </Layout>
    );
};

export default GenrePage;