import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Delete, Layout, Render } from "../components";
import { deleteRequest, getRequest, putRequest } from "../api";
import { decodeToken } from "../utilities/helperfFunction";
import '../components/header/drowpdown.css';
import { 
  FaEdit, FaStore, FaShoppingCart, FaUserTie, FaUser, 
  FaSync, FaHeart, FaUsers, FaVideo, FaFileAlt, 
  FaCalendar, FaEnvelope, FaStar, FaCheckCircle,
  FaCrown, FaBriefcase, FaPalette, FaGlobe
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
    const [stats, setStats] = useState({
        followers: 0,
        following: 0,
        scripts: 0,
        videos: 0
    });

    // Change user type without page refresh
    const changeUserType = async (userId: string, userType: string) => {
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
                    }
                }
            );

            // Update local state immediately
            setMarketplaceMode(userType);
            setUser(prev => ({ ...prev, userType }));
            localStorage.setItem('marketplaceMode', userType);
            
            return response.data;
        } catch (error: any) {
            console.error("Error changing user type:", error);
            throw error;
        } finally {
            setChangingMode(false);
        }
    };

    useEffect(() => {
        if (!id) {
            setLoading(false);
            return;
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

            // Fetch user content
            await fetchUserContent();

        } catch (error) {
            console.error("Error fetching data:", error);
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
                setStats(prev => ({ ...prev, scripts: scriptsResult.length }));
            } else {
                setScripts([]);
            }

            // Fetch videos
            const videosResult: any = await getRequest(`video/authors/${id}/videos`, setContentLoading);
            if (videosResult) {
                setVideos(videosResult);
                setStats(prev => ({ ...prev, videos: videosResult.length }));
            } else {
                setVideos([]);
            }

            // Update stats
            if (user.followers && user.followings) {
                setStats(prev => ({
                    ...prev,
                    followers: user.followers.length,
                    following: user.followings.length
                }));
            }

        } catch (error) {
            console.error("Error fetching user content:", error);
            setScripts([]);
            setVideos([]);
        }
    };

    const toggleMarketplaceMode = async () => {
        if (!id || !isCurrentUser) return;

        const newMode = marketplaceMode === 'buyer' ? 'seller' : 'buyer';
        
        try {
            await changeUserType(id, newMode);
            // State is already updated in changeUserType function
        } catch (error: any) {
            console.error("Error changing user type:", error);
            // Revert state on error
            setMarketplaceMode(marketplaceMode);
            setUser(prev => ({ ...prev, userType: marketplaceMode }));
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        fetchUserData();
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
                setStats(prev => ({ ...prev, scripts: prev.scripts - 1 }));
            }
        } catch (error) {
            console.error("Error deleting script:", error);
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
            toast.success("Profile updated successfully");
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
        if (!token) return;
        
        try {
            // Follow functionality
            toast.success(`Following ${user.username}`);
        } catch (error) {
            console.error("Error following user:", error);
        }
    };

    const renderAllowedGenres = () => {
        if (!user.allowedGenres || user.allowedGenres.length === 0) {
            return (
                <div className="text-gray-500 text-sm bg-gray-50 px-3 py-2 rounded-lg">
                    No content ratings specified
                </div>
            );
        }

        return (
            <div className="flex flex-wrap gap-2">
                {user.allowedGenres.map((genre: string) => (
                    <span 
                        key={genre} 
                        className="inline-flex items-center bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-sm font-medium"
                    >
                        <FaStar className="mr-1.5 text-xs" />
                        {genre}
                    </span>
                ))}
            </div>
        );
    };

    const renderContent = () => {
        if (contentLoading) {
            return (
                <div className="flex justify-center items-center py-12">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600 mx-auto mb-4"></div>
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
                                <h3 className="text-xl font-semibold text-gray-900">Scripts</h3>
                                <p className="text-gray-500 text-sm">Discover creative scripts</p>
                            </div>
                            {scripts.length > 0 && (
                                <span className="text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                                    {scripts.length} {scripts.length === 1 ? 'Script' : 'Scripts'}
                                </span>
                            )}
                        </div>
                        
                        {scripts.length === 0 ? (
                            <div className="text-center py-16 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                                <div className="text-6xl mb-6">📝</div>
                                <p className="text-lg font-medium text-gray-800 mb-2">No scripts yet</p>
                                <p className="text-gray-600 max-w-md mx-auto">This user hasn't created any scripts.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {scripts?.map((script: any, index: number) => {
                                    const scriptData = data?.[index];
                                    return (
                                        <div
                                            key={scriptData?._id || index}
                                            className="group relative bg-white rounded-xl border border-gray-200 hover:shadow-lg transition-all duration-300 overflow-hidden"
                                            onMouseEnter={() => handleScriptMouseEnter(index)}
                                            onMouseLeave={handleScriptMouseLeave}
                                            onClick={() => nav(`/script/${scriptData?._id}`, { state: JSON.stringify(scriptData) })}
                                        >
                                            <div className="p-5">
                                                <div className="flex justify-between items-start mb-3">
                                                    <h3 className="font-medium text-gray-900 text-base line-clamp-2 pr-2">
                                                        {scriptData?.title || "Untitled Script"}
                                                    </h3>
                                                    {isCurrentUser && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setMenuOpen(menuOpen === index ? null : index);
                                                            }}
                                                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                                                        >
                                                            <BsThreeDotsVertical className="text-gray-400" />
                                                        </button>
                                                    )}
                                                </div>
                                                
                                                <div className="text-gray-600 text-sm line-clamp-3 mb-4">
                                                    <Render htmlString={script} />
                                                </div>
                                                
                                                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                                    <span className="text-xs text-gray-500">
                                                        {scriptData?.createdAt ? new Date(scriptData.createdAt).toLocaleDateString() : 'Recent'}
                                                    </span>
                                                    <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                                        Script
                                                    </span>
                                                </div>
                                            </div>

                                            {showMoreIndex === index && (
                                                <div className="absolute inset-0 bg-black/80 flex items-center justify-center transition-all duration-300 p-5">
                                                    <div className="text-center text-white">
                                                        <p className="font-medium mb-1">Read Full Script</p>
                                                        <p className="text-sm opacity-90">Click to explore</p>
                                                    </div>
                                                </div>
                                            )}

                                            {menuOpen === index && (
                                                <div className="absolute right-2 top-12 w-36 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-20">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (scriptData?._id) {
                                                                deleteScript(scriptData._id);
                                                                setMenuOpen(null);
                                                            }
                                                        }}
                                                        className="w-full text-left px-4 py-2.5 text-red-600 hover:bg-red-50 transition-colors flex items-center text-sm"
                                                    >
                                                        <span className="mr-2">🗑️</span>
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
                                <h3 className="text-xl font-semibold text-gray-900">Videos</h3>
                                <p className="text-gray-500 text-sm">Watch visual stories</p>
                            </div>
                            {videos.length > 0 && (
                                <span className="text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                                    {videos.length} {videos.length === 1 ? 'Video' : 'Videos'}
                                </span>
                            )}
                        </div>
                        
                        {videos.length === 0 ? (
                            <div className="text-center py-16 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                                <div className="text-6xl mb-6">🎬</div>
                                <p className="text-lg font-medium text-gray-800 mb-2">No videos yet</p>
                                <p className="text-gray-600 max-w-md mx-auto">This user hasn't uploaded any videos.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {videos?.map((video: any) => (
                                    <div
                                        key={video._id}
                                        className="group bg-white rounded-xl border border-gray-200 hover:shadow-lg transition-all duration-300 overflow-hidden"
                                        onClick={() => nav(`/video/${video._id}`)}
                                    >
                                        <div className="relative overflow-hidden">
                                            {video.thumbnail ? (
                                                <img
                                                    src={video.thumbnail}
                                                    alt={video.title}
                                                    className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300"
                                                />
                                            ) : (
                                                <div className="w-full h-40 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                                                    <span className="text-gray-400 text-4xl">🎥</span>
                                                </div>
                                            )}
                                            <div className="absolute top-2 right-2">
                                                <span className="bg-black/70 text-white px-2 py-1 rounded text-xs">
                                                    Video
                                                </span>
                                            </div>
                                        </div>
                                        
                                        <div className="p-4">
                                            <h3 className="font-medium text-gray-900 text-base mb-2 line-clamp-2">
                                                {video.title || "Untitled Video"}
                                            </h3>
                                            <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                                                {video.description || "No description available"}
                                            </p>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-gray-500">
                                                    {video.duration || 'N/A'}
                                                </span>
                                                <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                                                    Watch →
                                                </button>
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
                    <div className="space-y-8">
                        <div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">About {user.username}</h3>
                            <p className="text-gray-600">Get to know more about this creator</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white rounded-xl border border-gray-200 p-5">
                                <div className="flex items-center space-x-3 mb-5">
                                    <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                                        <FaUser className="text-blue-600 text-lg" />
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-gray-900">Profile Details</h4>
                                        <p className="text-gray-500 text-sm">Personal information</p>
                                    </div>
                                </div>
                                
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-sm text-gray-500 mb-1">Joined Date</p>
                                        <p className="font-medium text-gray-900">
                                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            }) : 'Unknown'}
                                        </p>
                                    </div>
                                    
                                    <div>
                                        <p className="text-sm text-gray-500 mb-1">Bio</p>
                                        <p className="text-gray-700">
                                            {user.bio || "No bio provided yet."}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-xl border border-gray-200 p-5">
                                <div className="flex items-center space-x-3 mb-5">
                                    <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                                        <FaBriefcase className="text-blue-600 text-lg" />
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-gray-900">Marketplace Status</h4>
                                        <p className="text-gray-500 text-sm">Role & subscription</p>
                                    </div>
                                </div>
                                
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-sm text-gray-500 mb-2">Current Role</p>
                                        <div className={`inline-flex items-center px-3 py-1.5 rounded-full font-medium ${
                                            user.userType === 'seller' 
                                                ? 'bg-green-100 text-green-800' 
                                                : 'bg-blue-100 text-blue-800'
                                        }`}>
                                            {user.userType === 'seller' ? (
                                                <>
                                                    <FaUserTie className="mr-2 text-sm" /> Seller
                                                </>
                                            ) : (
                                                <>
                                                    <FaShoppingCart className="mr-2 text-sm" /> Buyer
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <p className="text-sm text-gray-500 mb-2">Subscription</p>
                                        <div className={`inline-flex items-center px-3 py-1.5 rounded-full ${
                                            userHasPaid 
                                                ? 'bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-800' 
                                                : 'bg-gray-100 text-gray-600'
                                        }`}>
                                            {userHasPaid ? (
                                                <>
                                                    <FaCrown className="mr-2 text-sm" /> Premium
                                                </>
                                            ) : (
                                                'Basic Account'
                                            )}
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

    if (loading) {
        return (
            <Layout expand={false} hasHeader={true}>
                <div className="min-h-screen flex items-center justify-center bg-white p-4">
                    <div className="text-center max-w-md w-full">
                        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-600 mx-auto mb-6"></div>
                        <p className="text-lg text-gray-800 font-medium mb-2">Loading profile...</p>
                        <p className="text-gray-600 text-sm">Please wait a moment</p>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout expand={false} hasHeader={true}>
            <div className="min-h-screen bg-gray-50">
                {/* Cover Section */}
                <div className="relative bg-gradient-to-r from-blue-600 to-blue-800 h-40 md:h-48">
                    <div className="absolute inset-0 bg-black/20"></div>
                    <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-end pb-6">
                        <div className="flex items-center space-x-4">
                            <div className="relative">
                                <img
                                    className="rounded-xl bg-white h-20 w-20 md:h-24 md:w-24 border-4 border-white shadow-lg"
                                    src={user.avatar || avatar}
                                    alt="Avatar"
                                />
                                {isCurrentUser && (
                                    <div className="absolute -bottom-1 -right-1 bg-green-500 text-white p-1 rounded-full border-2 border-white">
                                        <FaCheckCircle className="text-xs" />
                                    </div>
                                )}
                            </div>
                            <div className="text-white">
                                <h1 className="text-2xl md:text-3xl font-bold mb-1">
                                    {user.username}
                                </h1>
                                <p className="text-blue-100">{user.email}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 md:-mt-12">
                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                                    <FaUsers className="text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-gray-900">{stats.followers}</p>
                                    <p className="text-sm text-gray-500">Followers</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                                    <FaUser className="text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-gray-900">{stats.following}</p>
                                    <p className="text-sm text-gray-500">Following</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                                    <FaFileAlt className="text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-gray-900">{stats.scripts}</p>
                                    <p className="text-sm text-gray-500">Scripts</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                                    <FaVideo className="text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-gray-900">{stats.videos}</p>
                                    <p className="text-sm text-gray-500">Videos</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Left Sidebar */}
                        <div className="lg:col-span-1">
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-lg font-semibold text-gray-900">Profile Info</h2>
                                    {isCurrentUser && !editMode && (
                                        <button
                                            onClick={handleEdit}
                                            className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                                        >
                                            <FaEdit size="14" />
                                            <span>Edit</span>
                                        </button>
                                    )}
                                </div>

                                {editMode ? (
                                    <form onSubmit={handleSubmit} className="space-y-5">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Username
                                            </label>
                                            <input
                                                type="text"
                                                name="username"
                                                value={formData.username}
                                                onChange={handleChange}
                                                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                placeholder="Enter username"
                                            />
                                        </div>
                                        
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Date of Birth
                                            </label>
                                            <input
                                                type="date"
                                                name="dob"
                                                value={formData.dob}
                                                onChange={handleChange}
                                                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                        </div>
                                        
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Bio
                                            </label>
                                            <textarea
                                                name="bio"
                                                value={formData.bio}
                                                onChange={handleChange}
                                                rows={3}
                                                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                                placeholder="Tell your story..."
                                            />
                                        </div>

                                        <div className="flex space-x-3">
                                            <button 
                                                type="submit" 
                                                className="flex-1 bg-blue-600 text-white py-2.5 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                                            >
                                                Save
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={handleCancelEdit}
                                                className="flex-1 bg-gray-100 text-gray-700 py-2.5 px-4 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </form>
                                ) : (
                                    <div className="space-y-6">
                                        <div className="space-y-4">
                                            <div className="flex items-center space-x-3">
                                                <FaCalendar className="text-gray-400" />
                                                <div>
                                                    <p className="text-sm text-gray-500">Date of Birth</p>
                                                    <p className="font-medium text-gray-900">{user.dob || 'Not specified'}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-3">
                                                <FaGlobe className="text-gray-400" />
                                                <div>
                                                    <p className="text-sm text-gray-500">Allowed Ratings</p>
                                                    <div className="mt-1">
                                                        {renderAllowedGenres()}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* User Mode Toggle */}
                                        {isCurrentUser && (
                                            <div className="pt-6 border-t border-gray-200">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div>
                                                        <h3 className="font-medium text-gray-900">Marketplace Mode</h3>
                                                        <p className="text-sm text-gray-500">Switch between roles</p>
                                                    </div>
                                                    <div className="relative">
                                                        <button 
                                                            onClick={toggleMarketplaceMode}
                                                            disabled={changingMode}
                                                            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                                                                marketplaceMode === 'buyer' 
                                                                    ? 'bg-blue-100' 
                                                                    : 'bg-green-100'
                                                            } ${changingMode ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                        >
                                                            <span className={`absolute left-1 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow transition-all ${
                                                                marketplaceMode === 'seller' ? 'translate-x-6' : ''
                                                            }`}>
                                                                {changingMode ? (
                                                                    <div className="h-3 w-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                                                ) : marketplaceMode === 'seller' ? (
                                                                    <FaUserTie className="text-green-600 text-xs" />
                                                                ) : (
                                                                    <FaShoppingCart className="text-blue-600 text-xs" />
                                                                )}
                                                            </span>
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className={`font-medium ${marketplaceMode === 'buyer' ? 'text-blue-600' : 'text-gray-500'}`}>
                                                        Buyer
                                                    </span>
                                                    <span className={`font-medium ${marketplaceMode === 'seller' ? 'text-green-600' : 'text-gray-500'}`}>
                                                        Seller
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Action Buttons */}
                                        <div className="pt-6 border-t border-gray-200 space-y-3">
                                            <button
                                                onClick={handleRefresh}
                                                disabled={refreshing}
                                                className="w-full flex items-center justify-center space-x-2 bg-gray-100 text-gray-700 py-2.5 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                                            >
                                                <FaSync className={`${refreshing ? 'animate-spin' : ''}`} />
                                                <span className="font-medium">{refreshing ? 'Refreshing...' : 'Refresh Profile'}</span>
                                            </button>
                                            
                                            {!isCurrentUser && (
                                                <button
                                                    onClick={handleFollow}
                                                    className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                                                >
                                                    <FaHeart />
                                                    <span>Follow User</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right Content Area */}
                        <div className="lg:col-span-2">
                            {/* Tabs Navigation */}
                            <div className="mb-6">
                                <div className="flex space-x-1 bg-white rounded-lg border border-gray-200 p-1">
                                    {[
                                        { key: 'scripts', label: 'Scripts', icon: <FaFileAlt />, count: scripts.length },
                                        { key: 'videos', label: 'Videos', icon: <FaVideo />, count: videos.length },
                                        { key: 'about', label: 'About', icon: <FaUser />, count: null }
                                    ].map((tab) => (
                                        <button
                                            key={tab.key}
                                            onClick={() => setActiveTab(tab.key)}
                                            className={`flex-1 flex items-center justify-center py-3 px-2 rounded-md transition-colors ${
                                                activeTab === tab.key
                                                    ? 'bg-blue-50 text-blue-600'
                                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                            }`}
                                        >
                                            <span className="mr-2">{tab.icon}</span>
                                            <span className="font-medium">{tab.label}</span>
                                            {tab.count !== null && (
                                                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                                                    activeTab === tab.key
                                                        ? 'bg-blue-100 text-blue-700'
                                                        : 'bg-gray-100 text-gray-600'
                                                }`}>
                                                    {tab.count}
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Tab Content */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                {renderContent()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default UserProfilePage;