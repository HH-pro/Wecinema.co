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
  FaCalendar, FaEnvelope, FaStar, FaCheckCircle 
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

            toast.success(`✅ Switched to ${userType} mode successfully`);
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
            toast.error("Please login first");
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
            toast.error("Failed to load user profile");
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
                // No page refresh needed - state updates immediately
            }
        } catch (error: any) {
            console.error("Error changing user type:", error);
            toast.error(`❌ ${error.message}`);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        fetchUserData();
        toast.info("🔄 Refreshing profile...");
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
                toast.success("✅ Script deleted successfully");
            }
        } catch (error) {
            console.error("Error deleting script:", error);
            toast.error("❌ Error deleting script");
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
            toast.success("✅ Profile updated successfully");
        } catch (error) {
            console.error("Error updating profile:", error);
            toast.error("❌ Failed to update profile");
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
            // Follow functionality implementation
            toast.success(`👤 Following ${user.username}`);
        } catch (error) {
            console.error("Error following user:", error);
            toast.error("❌ Failed to follow user");
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
                                <p className="text-gray-500 text-sm">Discover creative scripts</p>
                            </div>
                            {scripts.length > 0 && (
                                <span className="text-sm text-yellow-600 bg-yellow-50 px-3 py-1 rounded-full">
                                    {scripts.length} {scripts.length === 1 ? 'Script' : 'Scripts'}
                                </span>
                            )}
                        </div>
                        
                        {scripts.length === 0 ? (
                            <div className="text-center py-16 bg-gradient-to-br from-yellow-50 to-amber-50 rounded-2xl border-2 border-dashed border-yellow-200">
                                <div className="text-7xl mb-6">📝</div>
                                <p className="text-xl font-semibold text-gray-800 mb-2">No scripts yet</p>
                                <p className="text-gray-600 max-w-md mx-auto">This user hasn't created any scripts. Check back later!</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {scripts?.map((script: any, index: number) => {
                                    const scriptData = data?.[index];
                                    return (
                                        <div
                                            key={scriptData?._id || index}
                                            className="group relative bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden"
                                            onMouseEnter={() => handleScriptMouseEnter(index)}
                                            onMouseLeave={handleScriptMouseLeave}
                                            onClick={() => nav(`/script/${scriptData?._id}`, { state: JSON.stringify(scriptData) })}
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/5 to-amber-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                            
                                            <div className="p-5">
                                                <div className="flex justify-between items-start mb-4">
                                                    <h3 className="font-bold text-gray-900 text-lg line-clamp-2 pr-2">
                                                        {scriptData?.title || "Untitled Script"}
                                                    </h3>
                                                    {isCurrentUser && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setMenuOpen(menuOpen === index ? null : index);
                                                            }}
                                                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                                        >
                                                            <BsThreeDotsVertical className="text-gray-400" />
                                                        </button>
                                                    )}
                                                </div>
                                                
                                                <div className="text-gray-600 text-sm line-clamp-3 mb-4">
                                                    <Render htmlString={script} />
                                                </div>
                                                
                                                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                                    <span className="text-xs text-gray-500">
                                                        {scriptData?.createdAt ? new Date(scriptData.createdAt).toLocaleDateString() : 'Recent'}
                                                    </span>
                                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                        <FaFileAlt className="mr-1" /> Script
                                                    </span>
                                                </div>
                                            </div>

                                            {showMoreIndex === index && (
                                                <div className="absolute inset-0 bg-gradient-to-t from-yellow-500/90 to-yellow-600/90 flex items-center justify-center transition-all duration-300 p-5">
                                                    <div className="text-center text-white">
                                                        <div className="text-2xl mb-2">📖</div>
                                                        <p className="font-bold text-lg mb-1">Read Full Script</p>
                                                        <p className="text-sm opacity-90">Click to explore this creative work</p>
                                                    </div>
                                                </div>
                                            )}

                                            {menuOpen === index && (
                                                <div className="absolute right-2 top-12 w-40 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-20">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (scriptData?._id) {
                                                                deleteScript(scriptData._id);
                                                                setMenuOpen(null);
                                                            }
                                                        }}
                                                        className="w-full text-left px-4 py-3 text-red-600 hover:bg-red-50 transition-colors flex items-center"
                                                    >
                                                        <span className="mr-3">🗑️</span>
                                                        Delete Script
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
                                <p className="text-gray-500 text-sm">Watch visual stories</p>
                            </div>
                            {videos.length > 0 && (
                                <span className="text-sm text-yellow-600 bg-yellow-50 px-3 py-1 rounded-full">
                                    {videos.length} {videos.length === 1 ? 'Video' : 'Videos'}
                                </span>
                            )}
                        </div>
                        
                        {videos.length === 0 ? (
                            <div className="text-center py-16 bg-gradient-to-br from-yellow-50 to-amber-50 rounded-2xl border-2 border-dashed border-yellow-200">
                                <div className="text-7xl mb-6">🎬</div>
                                <p className="text-xl font-semibold text-gray-800 mb-2">No videos yet</p>
                                <p className="text-gray-600 max-w-md mx-auto">This user hasn't uploaded any videos. Check back later!</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {videos?.map((video: any) => (
                                    <div
                                        key={video._id}
                                        className="group bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden"
                                        onClick={() => nav(`/video/${video._id}`)}
                                    >
                                        <div className="relative overflow-hidden">
                                            {video.thumbnail ? (
                                                <img
                                                    src={video.thumbnail}
                                                    alt={video.title}
                                                    className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-700"
                                                />
                                            ) : (
                                                <div className="w-full h-48 bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center">
                                                    <span className="text-white text-5xl">🎥</span>
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                            <div className="absolute top-3 right-3">
                                                <span className="bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                                                    Video
                                                </span>
                                            </div>
                                        </div>
                                        
                                        <div className="p-5">
                                            <h3 className="font-bold text-gray-900 text-lg mb-2 line-clamp-2">
                                                {video.title || "Untitled Video"}
                                            </h3>
                                            <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                                                {video.description || "No description available"}
                                            </p>
                                            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                                <span className="text-xs text-gray-500">
                                                    {video.duration || 'N/A'}
                                                </span>
                                                <button className="inline-flex items-center text-yellow-600 hover:text-yellow-700 font-medium text-sm">
                                                    Watch Now <span className="ml-1">→</span>
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
                            <h3 className="text-xl font-bold text-gray-900 mb-2">About {user.username}</h3>
                            <p className="text-gray-600">Get to know more about this creator</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                                <div className="flex items-center space-x-4 mb-6">
                                    <div className="w-14 h-14 bg-gradient-to-br from-yellow-100 to-amber-100 rounded-xl flex items-center justify-center">
                                        <FaUser className="text-yellow-600 text-2xl" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 text-lg">Profile Details</h4>
                                        <p className="text-gray-500 text-sm">Personal information</p>
                                    </div>
                                </div>
                                
                                <div className="space-y-4">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-8 h-8 bg-yellow-50 rounded-lg flex items-center justify-center">
                                            <FaCalendar className="text-yellow-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500">Joined Date</p>
                                            <p className="font-medium text-gray-900">
                                                {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                }) : 'Unknown'}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center space-x-3">
                                        <div className="w-8 h-8 bg-yellow-50 rounded-lg flex items-center justify-center">
                                            <FaEnvelope className="text-yellow-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500">Email</p>
                                            <p className="font-medium text-gray-900">{user.email}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                                <div className="flex items-center space-x-4 mb-6">
                                    <div className="w-14 h-14 bg-gradient-to-br from-yellow-100 to-amber-100 rounded-xl flex items-center justify-center">
                                        <FaStore className="text-yellow-600 text-2xl" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 text-lg">Marketplace Status</h4>
                                        <p className="text-gray-500 text-sm">Role & subscription</p>
                                    </div>
                                </div>
                                
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-sm text-gray-500 mb-2">Current Role</p>
                                        <div className={`inline-flex items-center px-4 py-2 rounded-full font-bold ${
                                            user.userType === 'seller' 
                                                ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-white' 
                                                : 'bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800'
                                        }`}>
                                            {user.userType === 'seller' ? (
                                                <>
                                                    <FaUserTie className="mr-2" /> Seller
                                                </>
                                            ) : (
                                                <>
                                                    <FaShoppingCart className="mr-2" /> Buyer
                                                </>
                                            )}
                                            {isCurrentUser && <FaCheckCircle className="ml-2 text-sm" />}
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <p className="text-sm text-gray-500 mb-2">Subscription Status</p>
                                        <div className={`inline-flex items-center px-4 py-2 rounded-full ${
                                            userHasPaid 
                                                ? 'bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-700' 
                                                : 'bg-gray-100 text-gray-600'
                                        }`}>
                                            <span className="font-medium">
                                                {userHasPaid ? '🚀 Premium Account' : 'Basic Account'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {user.bio && (
                            <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-2xl border border-yellow-100 p-6">
                                <h4 className="font-bold text-gray-900 text-lg mb-3">Bio</h4>
                                <p className="text-gray-700 leading-relaxed">{user.bio}</p>
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
            <Layout expand={false} hasHeader={true}>
                <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
                    <div className="text-center max-w-md w-full">
                        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-yellow-500 mx-auto mb-6"></div>
                        <p className="text-lg text-gray-800 font-medium mb-2">Loading your dashboard...</p>
                        <p className="text-gray-600 text-sm">This may take a few moments</p>
                        <div className="mt-6">
                            <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                                <div className="h-full bg-yellow-500 animate-pulse"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout expand={false} hasHeader={true}>
            <div className="mt-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
                {/* Cover Section with Gradient Overlay */}
                <div className="relative w-full h-48 sm:h-56 md:h-64 rounded-3xl overflow-hidden shadow-2xl mb-8">
                    <img
                        className="w-full h-full object-cover"
                        src={user.coverImage || cover}
                        alt="Cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-yellow-900/60 via-yellow-800/30 to-transparent"></div>
                    <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row sm:items-end justify-between">
                        <div className="flex items-center space-x-4">
                            <div className="relative">
                                <img
                                    className="rounded-2xl bg-white h-20 w-20 sm:h-24 sm:w-24 md:h-28 md:w-28 border-4 border-white shadow-xl"
                                    src={user.avatar || avatar}
                                    alt="Avatar"
                                />
                                {isCurrentUser && (
                                    <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-yellow-500 to-amber-500 text-white p-2 rounded-full border-2 border-white shadow-lg">
                                        <FaCheckCircle className="text-xs" />
                                    </div>
                                )}
                            </div>
                            <div>
                                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-1">
                                    {user.username}
                                </h1>
                                <p className="text-yellow-100 text-sm sm:text-base">{user.email}</p>
                            </div>
                        </div>
                        
                        <div className="mt-4 sm:mt-0 flex space-x-3">
                            <button
                                onClick={handleRefresh}
                                disabled={refreshing}
                                className="inline-flex items-center justify-center space-x-2 bg-white/20 backdrop-blur-sm text-white px-4 py-2.5 rounded-xl hover:bg-white/30 transition-all duration-300 disabled:opacity-50"
                            >
                                <FaSync className={`${refreshing ? 'animate-spin' : ''}`} />
                                <span className="font-medium">{refreshing ? 'Refreshing...' : 'Refresh'}</span>
                            </button>
                            
                            {!isCurrentUser && (
                                <button
                                    onClick={handleFollow}
                                    className="inline-flex items-center justify-center space-x-2 bg-gradient-to-r from-yellow-500 to-amber-500 text-white px-5 py-2.5 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 font-semibold"
                                >
                                    <FaHeart />
                                    <span>Follow</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Sidebar - Profile Info */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 sticky top-24">
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-2xl font-bold text-gray-900">Profile Info</h2>
                                {isCurrentUser && !editMode && (
                                    <button
                                        onClick={handleEdit}
                                        className="inline-flex items-center space-x-2 bg-gradient-to-r from-yellow-500 to-amber-500 text-white px-4 py-2.5 rounded-xl hover:shadow-lg transition-all duration-300 font-medium"
                                    >
                                        <FaEdit size="16" />
                                        <span>Edit</span>
                                    </button>
                                )}
                            </div>

                            {editMode ? (
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Username
                                        </label>
                                        <input
                                            type="text"
                                            name="username"
                                            value={formData.username}
                                            onChange={handleChange}
                                            className="w-full p-3.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all"
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
                                            className="w-full p-3.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all"
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
                                            className="w-full p-3.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all resize-none"
                                            placeholder="Tell your story..."
                                        />
                                    </div>

                                    <div className="flex space-x-4 pt-4">
                                        <button 
                                            type="submit" 
                                            className="flex-1 bg-gradient-to-r from-yellow-500 to-amber-500 text-white py-3.5 px-4 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 font-semibold"
                                        >
                                            Save Changes
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={handleCancelEdit}
                                            className="flex-1 bg-gray-100 text-gray-700 py-3.5 px-4 rounded-xl hover:bg-gray-200 transition-all duration-300 font-semibold"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <div className="space-y-8">
                                    <div className="space-y-6">
                                        <div>
                                            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Contact Info</h3>
                                            <div className="space-y-4">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center">
                                                        <FaUser className="text-yellow-600" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-gray-500">Username</p>
                                                        <p className="font-semibold text-gray-900">{user.username}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center">
                                                        <FaEnvelope className="text-yellow-600" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-gray-500">Email</p>
                                                        <p className="font-semibold text-gray-900">{user.email}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Allowed Ratings</h3>
                                            <div className="flex flex-wrap gap-2">
                                                {renderAllowedGenres()}
                                            </div>
                                        </div>
                                    </div>

                                    {/* User Mode Toggle */}
                                    {isCurrentUser && (
                                        <div className="pt-6 border-t border-gray-100">
                                            <div className="flex items-center justify-between mb-4">
                                                <div>
                                                    <h3 className="font-semibold text-gray-900">Marketplace Mode</h3>
                                                    <p className="text-sm text-gray-500">Switch between buyer and seller</p>
                                                </div>
                                                <div className="relative">
                                                    <button 
                                                        onClick={toggleMarketplaceMode}
                                                        disabled={changingMode}
                                                        className={`relative inline-flex h-12 w-24 items-center rounded-full transition-all duration-500 ${
                                                            marketplaceMode === 'buyer' 
                                                                ? 'bg-gradient-to-r from-yellow-100 to-amber-100' 
                                                                : 'bg-gradient-to-r from-yellow-500 to-amber-500'
                                                        } ${changingMode ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    >
                                                        <span className={`absolute left-2 flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-lg transition-all duration-500 ${
                                                            marketplaceMode === 'seller' ? 'translate-x-12' : ''
                                                        }`}>
                                                            {changingMode ? (
                                                                <div className="h-4 w-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                                                            ) : marketplaceMode === 'seller' ? (
                                                                <FaUserTie className="text-yellow-600 text-sm" />
                                                            ) : (
                                                                <FaShoppingCart className="text-yellow-600 text-sm" />
                                                            )}
                                                        </span>
                                                        <span className="sr-only">Toggle mode</span>
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className={`text-sm font-medium ${marketplaceMode === 'buyer' ? 'text-yellow-600' : 'text-gray-500'}`}>
                                                    <FaShoppingCart className="inline mr-1.5" /> Buyer
                                                </span>
                                                <span className={`text-sm font-medium ${marketplaceMode === 'seller' ? 'text-yellow-600' : 'text-gray-500'}`}>
                                                    <FaUserTie className="inline mr-1.5" /> Seller
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Stats */}
                                    <div className="grid grid-cols-2 gap-4 pt-6 border-t border-gray-100">
                                        <div className="text-center">
                                            <div className="text-3xl font-bold text-gray-900">{user.followers?.length || 0}</div>
                                            <div className="text-sm text-gray-500">Followers</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-3xl font-bold text-gray-900">{user.followings?.length || 0}</div>
                                            <div className="text-sm text-gray-500">Following</div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Content Area */}
                    <div className="lg:col-span-2">
                        {/* Tabs Navigation */}
                        <div className="mb-8">
                            <div className="flex space-x-1 bg-white rounded-2xl shadow-lg border border-gray-100 p-1.5">
                                {[
                                    { key: 'scripts', label: 'Scripts', icon: '📝', count: scripts.length },
                                    { key: 'videos', label: 'Videos', icon: '🎬', count: videos.length },
                                    { key: 'about', label: 'About', icon: '👤', count: null }
                                ].map((tab) => (
                                    <button
                                        key={tab.key}
                                        onClick={() => setActiveTab(tab.key)}
                                        className={`flex-1 flex items-center justify-center py-4 px-2 rounded-xl transition-all duration-300 ${
                                            activeTab === tab.key
                                                ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-white shadow-lg'
                                                : 'text-gray-600 hover:text-yellow-600 hover:bg-yellow-50'
                                        }`}
                                    >
                                        <span className="text-xl mr-3">{tab.icon}</span>
                                        <span className="font-semibold">{tab.label}</span>
                                        {tab.count !== null && (
                                            <span className={`ml-2 px-2 py-1 rounded-full text-xs font-bold ${
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
                        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 md:p-8">
                            {renderContent()}
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default UserProfilePage;