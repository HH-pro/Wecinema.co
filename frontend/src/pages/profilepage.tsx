import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Delete, Layout, Render } from "../components";
import { deleteRequest, getRequest, putRequest } from "../api";
import { decodeToken } from "../utilities/helperfFunction";
import '../components/header/drowpdown.css';
import { FaEdit, FaStore, FaShoppingCart, FaUserTie, FaUser, FaSync, FaHeart, FaUsers, FaVideo, FaFileAlt } from 'react-icons/fa';
import axios from 'axios';
import cover from '.././assets/public/cover.jpg';
import avatar from '.././assets/public/avatar.jpg';
import '../App.css';
import { FaEllipsisV } from "react-icons/fa";

const token = localStorage.getItem("token") || null;

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

    // Direct API call for changing user type
    const changeUserTypeDirect = async (userId: string, userType: string) => {
        try {
            setChangingMode(true);
            const token = localStorage.getItem("token");
            
            const response = await axios.put(
                `http://localhost:3000/user/change-type/${userId}`,
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

            // Fetch payment status for profile user
            try {
                const paymentResponse = await axios.get(`https://wecinema.co/api/user/payment-status/${id}`);
                setUserHasPaid(paymentResponse.data.hasPaid);
            } catch (error) {
                console.error("Error fetching payment status:", error);
                setUserHasPaid(false);
            }

            // Fetch payment status for current logged-in user
            if (tokenData) {
                try {
                    const currentUserResponse = await axios.get(`https://wecinema.co/api/user/payment-status/${tokenData.userId}`);
                    setCurrentUserHasPaid(currentUserResponse.data.hasPaid);
                } catch (error) {
                    console.error("Error fetching current user payment status:", error);
                }
            }

            // Fetch user scripts and videos
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
                // Update local state immediately for smooth UX
                setMarketplaceMode(newMode);
                setUser(prev => ({ ...prev, userType: newMode }));
                localStorage.setItem('marketplaceMode', newMode);
                
              
            }
        } catch (error: any) {
            console.error("Error changing user type:", error);
            toast.error(`❌ ${error.message}`);
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
                toast.success("🗑️ Script deleted successfully");
                setScripts(prevScripts => prevScripts.filter((script, index) => data[index]?._id !== scriptId));
                setData(prevData => prevData.filter((item: any) => item._id !== scriptId));
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
            toast.success("✅ Profile updated successfully!");
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
            // Implement follow functionality here
            toast.info("👥 Follow functionality coming soon!");
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
            let bgColor, textColor, borderColor;
            switch (genre) {
                case "G":
                    bgColor = "bg-green-50";
                    textColor = "text-green-700";
                    borderColor = "border-green-200";
                    break;
                case "PG":
                case "PG-13":
                    bgColor = "bg-blue-50";
                    textColor = "text-blue-700";
                    borderColor = "border-blue-200";
                    break;
                case "R":
                    bgColor = "bg-yellow-50";
                    textColor = "text-yellow-700";
                    borderColor = "border-yellow-200";
                    break;
                case "X":
                    bgColor = "bg-red-50";
                    textColor = "text-red-700";
                    borderColor = "border-red-200";
                    break;
                default:
                    bgColor = "bg-gray-50";
                    textColor = "text-gray-700";
                    borderColor = "border-gray-200";
            }
            return (
                <span 
                    key={genre} 
                    className={`inline-block ${bgColor} ${textColor} ${borderColor} border text-sm font-medium px-3 py-1.5 rounded-lg mr-2 mb-2 transition-all duration-200 hover:scale-105 hover:shadow-sm`}
                >
                    {genre}
                </span>
            );
        });
    };

    const renderContent = () => {
        if (contentLoading) {
            return (
                <div className="flex justify-center items-center py-20">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading content...</p>
                    </div>
                </div>
            );
        }

        switch (activeTab) {
            case 'scripts':
                return (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-gray-800">Scripts ({scripts.length})</h3>
                            {scripts.length > 0 && (
                                <span className="text-sm text-gray-500">Click to read more</span>
                            )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {scripts?.map((script: any, index: number) => {
                                const scriptData = data?.[index];
                                return (
                                    <div
                                        key={scriptData?._id || index}
                                        className={`relative border border-gray-200 w-full max-h-64 p-4 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer bg-white ${
                                            showMoreIndex === index ? "ring-2 ring-blue-200" : ""
                                        }`}
                                        onMouseEnter={() => handleScriptMouseEnter(index)}
                                        onMouseLeave={handleScriptMouseLeave}
                                        onClick={() => nav(`/script/${scriptData?._id}`, { state: JSON.stringify(scriptData) })}
                                    >
                                        <h2 className="font-semibold text-lg mb-2 text-gray-800 line-clamp-2">
                                            {scriptData?.title || "Untitled Script"}
                                        </h2>
                                        <div className="text-gray-600 text-sm line-clamp-3">
                                            <Render htmlString={script} />
                                        </div>

                                        {showMoreIndex === index && (
                                            <div className="absolute inset-0 bg-black bg-opacity-80 rounded-xl flex items-center justify-center transition-all duration-300">
                                                <button className="bg-white text-gray-800 px-6 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors shadow-lg">
                                                    Read More
                                                </button>
                                            </div>
                                        )}

                                        {isCurrentUser && (
                                            <div className="absolute top-3 right-3">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setMenuOpen(menuOpen === index ? null : index);
                                                    }}
                                                    className="p-2 rounded-lg hover:bg-gray-100 transition duration-200 bg-white shadow-sm border border-gray-200"
                                                >
                                                    <FaEllipsisV className="text-gray-600 text-sm" />
                                                </button>

                                                {menuOpen === index && (
                                                    <div className="absolute right-0 mt-1 w-32 bg-white border border-gray-200 shadow-lg rounded-lg overflow-hidden z-10">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (scriptData?._id) {
                                                                    deleteScript(scriptData._id);
                                                                    setMenuOpen(null);
                                                                }
                                                            }}
                                                            className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 transition-colors text-sm flex items-center"
                                                        >
                                                            <span className="mr-2">🗑️</span>
                                                            Delete
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
                            <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                                <div className="text-6xl mb-4">📝</div>
                                <p className="text-lg text-gray-600 font-medium">No scripts yet</p>
                                <p className="text-gray-400 mt-2">This user hasn't created any scripts</p>
                            </div>
                        )}
                    </div>
                );
            
            case 'videos':
                return (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-gray-800">Videos ({videos.length})</h3>
                            {videos.length > 0 && (
                                <span className="text-sm text-gray-500">Click to watch</span>
                            )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {videos?.map((video: any) => (
                                <div
                                    key={video._id}
                                    className="border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer bg-white overflow-hidden group"
                                    onClick={() => nav(`/video/${video._id}`)}
                                >
                                    {video.thumbnail ? (
                                        <div className="relative overflow-hidden">
                                            <img
                                                src={video.thumbnail}
                                                alt={video.title}
                                                className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                                            />
                                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-300"></div>
                                        </div>
                                    ) : (
                                        <div className="w-full h-48 bg-gradient-to-br from-blue-400 to-purple-500 rounded-t-xl flex items-center justify-center">
                                            <span className="text-white text-4xl">🎬</span>
                                        </div>
                                    )}
                                    <div className="p-4">
                                        <h3 className="font-semibold text-lg mb-2 text-gray-800 line-clamp-2">
                                            {video.title || "Untitled Video"}
                                        </h3>
                                        <p className="text-gray-600 text-sm line-clamp-2">
                                            {video.description || "No description available"}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {videos.length === 0 && (
                            <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                                <div className="text-6xl mb-4">🎥</div>
                                <p className="text-lg text-gray-600 font-medium">No videos yet</p>
                                <p className="text-gray-400 mt-2">This user hasn't uploaded any videos</p>
                            </div>
                        )}
                    </div>
                );
            
            case 'about':
                return (
                    <div className="space-y-6">
                        <h3 className="text-lg font-semibold text-gray-800">About {user.username}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                <div className="flex items-center space-x-3 mb-4">
                                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                        <FaUser className="text-blue-600 text-lg" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-700">Profile</h4>
                                        <p className="text-gray-600 text-sm">Basic information</p>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-sm text-gray-500">Bio</p>
                                        <p className="text-gray-700">
                                            {user.bio || "No bio provided yet."}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Joined</p>
                                        <p className="text-gray-700">
                                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            }) : 'Unknown'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                <div className="flex items-center space-x-3 mb-4">
                                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                        <FaStore className="text-green-600 text-lg" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-700">Marketplace</h4>
                                        <p className="text-gray-600 text-sm">User role & status</p>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-sm text-gray-500">Role</p>
                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                            user.userType === 'seller' 
                                                ? 'bg-green-100 text-green-800 border border-green-200' 
                                                : 'bg-blue-100 text-blue-800 border border-blue-200'
                                        }`}>
                                            {user.userType === 'seller' ? (
                                                <>
                                                    <FaUserTie className="mr-1 text-xs" />
                                                    Seller
                                                </>
                                            ) : (
                                                <>
                                                    <FaShoppingCart className="mr-1 text-xs" />
                                                    Buyer
                                                </>
                                            )}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Subscription</p>
                                        <p className="text-gray-700">
                                            {userHasPaid ? (
                                                <span className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-full text-sm font-semibold">
                                                    🚀 Premium
                                                </span>
                                            ) : (
                                                <span className="text-gray-600 bg-gray-100 px-3 py-1 rounded-full text-sm">
                                                    Free Account
                                                </span>
                                            )}
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

    if (loading) {
        return (
            <Layout expand={false} hasHeader={true}>
                <div className="mt-12 px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-center items-center min-h-[60vh]">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-500 mx-auto mb-4"></div>
                            <p className="text-gray-600 text-lg">Loading profile...</p>
                            <p className="text-gray-400 text-sm mt-2">Please wait a moment</p>
                        </div>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout expand={false} hasHeader={false}>
            <div className="mt-12 px-4 sm:px-6 lg:px-8">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">User Profile</h1>
                        <p className="text-gray-600 mt-1">View and manage user information</p>
                    </div>
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="flex items-center justify-center space-x-2 bg-white border border-gray-300 px-4 py-2.5 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 w-full sm:w-auto"
                    >
                        <FaSync className={`text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
                        <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
                    </button>
                </div>

                {/* Cover Image */}
                <div className="relative w-full h-48 sm:h-64 rounded-2xl overflow-hidden shadow-lg mb-8">
                    <img
                        className="w-full h-full object-cover"
                        src={user.coverImage || cover}
                        alt="Cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
                </div>

                {/* Profile Header */}
                <div className="flex flex-col lg:flex-row items-start gap-6 mb-8">
                    {/* Avatar Section */}
                    <div className="flex flex-col items-center lg:items-start space-y-4">
                        <div className="relative">
                            <img
                                className="rounded-2xl bg-white h-28 w-28 sm:h-32 sm:w-32 border-4 border-white shadow-xl"
                                src={user.avatar || avatar}
                                alt="Avatar"
                            />
                            {isCurrentUser && (
                                <div className="absolute -bottom-2 -right-2 bg-green-500 text-white p-2 rounded-full border-2 border-white shadow-lg">
                                    <FaUser className="text-xs" />
                                </div>
                            )}
                        </div>
                        
                        {/* Action Buttons - Better Alignment */}
                        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                            {!isCurrentUser && (
                                <button
                                    onClick={handleFollow}
                                    className="flex items-center justify-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 font-semibold w-full sm:w-auto"
                                >
                                    <FaHeart className="text-sm" />
                                    <span>Follow</span>
                                </button>
                            )}
                            
                            {isCurrentUser && (
                                <button 
                                    onClick={toggleMarketplaceMode}
                                    disabled={changingMode}
                                    className={`flex items-center justify-center space-x-3 px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 font-semibold w-full sm:w-auto ${
                                        marketplaceMode === 'buyer' 
                                            ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                                            : 'bg-green-500 hover:bg-green-600 text-white'
                                    } ${changingMode ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {changingMode ? (
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    ) : marketplaceMode === 'seller' ? (
                                        <FaUserTie className="text-lg" />
                                    ) : (
                                        <FaShoppingCart className="text-lg" />
                                    )}
                                    <span className="text-base">
                                        {changingMode ? 'Switching...' : `${marketplaceMode === 'buyer' ? 'Buyer' : 'Seller'} Mode`}
                                    </span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* User Info */}
                    <div className="flex-1 text-center lg:text-left">
                        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
                            {user.username}
                        </h1>
                        <p className="text-gray-600 text-lg mb-4">{user.email}</p>
                        {user.bio && (
                            <p className="text-gray-700 text-base max-w-2xl leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-200">
                                {user.bio}
                            </p>
                        )}

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                            <div className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm hover:shadow-md transition-shadow duration-300">
                                <div className="flex items-center justify-center space-x-2 mb-2">
                                    <FaUsers className="text-blue-500 text-lg" />
                                    <div className="text-2xl font-bold text-gray-900">{user.followers?.length || 0}</div>
                                </div>
                                <div className="text-sm text-gray-600 font-medium">Followers</div>
                            </div>
                            <div className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm hover:shadow-md transition-shadow duration-300">
                                <div className="flex items-center justify-center space-x-2 mb-2">
                                    <FaUser className="text-green-500 text-lg" />
                                    <div className="text-2xl font-bold text-gray-900">{user.followings?.length || 0}</div>
                                </div>
                                <div className="text-sm text-gray-600 font-medium">Following</div>
                            </div>
                            <div className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm hover:shadow-md transition-shadow duration-300">
                                <div className="flex items-center justify-center space-x-2 mb-2">
                                    <FaFileAlt className="text-purple-500 text-lg" />
                                    <div className="text-2xl font-bold text-gray-900">{scripts.length}</div>
                                </div>
                                <div className="text-sm text-gray-600 font-medium">Scripts</div>
                            </div>
                            <div className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm hover:shadow-md transition-shadow duration-300">
                                <div className="flex items-center justify-center space-x-2 mb-2">
                                    <FaVideo className="text-red-500 text-lg" />
                                    <div className="text-2xl font-bold text-gray-900">{videos.length}</div>
                                </div>
                                <div className="text-sm text-gray-600 font-medium">Videos</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="mt-8 flex flex-col lg:flex-row gap-8">
                    {/* Left Sidebar - Profile Info */}
                    <div className="w-full lg:w-1/3">
                        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sticky top-24">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-gray-900">Profile Information</h2>
                                {isCurrentUser && !editMode && (
                                    <button
                                        onClick={handleEdit}
                                        className="flex items-center space-x-2 text-blue-500 hover:text-blue-600 transition-colors bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-lg"
                                    >
                                        <FaEdit size="16" />
                                        <span className="text-sm font-medium">Edit</span>
                                    </button>
                                )}
                            </div>

                            {editMode ? (
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Username
                                        </label>
                                        <input
                                            type="text"
                                            name="username"
                                            value={formData.username}
                                            onChange={handleChange}
                                            className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
                                            className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
                                            rows={4}
                                            className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                                            placeholder="Tell your story..."
                                        />
                                    </div>

                                    <div className="flex space-x-3 pt-2">
                                        <button 
                                            type="submit" 
                                            className="flex-1 bg-blue-500 text-white py-3 px-4 rounded-xl shadow-md hover:bg-blue-600 transition-all duration-300 font-semibold"
                                        >
                                            Save Changes
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={handleCancelEdit}
                                            className="flex-1 bg-gray-500 text-white py-3 px-4 rounded-xl shadow-md hover:bg-gray-600 transition-all duration-300 font-semibold"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <div className="space-y-5">
                                    <div>
                                        <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-1">Username</h3>
                                        <p className="text-gray-900 text-lg">{user.username}</p>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-1">Email</h3>
                                        <p className="text-gray-900 text-lg">{user.email}</p>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-1">Date of Birth</h3>
                                        <p className="text-gray-900 text-lg">{user.dob}</p>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-3">Allowed Ratings</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {renderAllowedGenres()}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Content - Tabs */}
                    <div className="w-full lg:w-2/3">
                        {/* Navigation Tabs */}
                        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-6">
                            <div className="border-b border-gray-200">
                                <nav className="flex overflow-x-auto">
                                    {[
                                        { key: 'scripts', label: 'Scripts', count: scripts.length, icon: '📝' },
                                        { key: 'videos', label: 'Videos', count: videos.length, icon: '🎥' },
                                        { key: 'about', label: 'About', count: null, icon: '👤' }
                                    ].map((tab) => (
                                        <button
                                            key={tab.key}
                                            onClick={() => setActiveTab(tab.key)}
                                            className={`flex items-center py-4 px-6 text-center border-b-2 font-medium text-sm whitespace-nowrap transition-all duration-300 min-w-0 ${
                                                activeTab === tab.key
                                                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                            }`}
                                        >
                                            <span className="mr-2 text-base">{tab.icon}</span>
                                            <span className="font-semibold">{tab.label}</span>
                                            {tab.count !== null && (
                                                <span className="ml-2 bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-xs font-medium">
                                                    {tab.count}
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </nav>
                            </div>
                            
                            {/* Tab Content */}
                            <div className="p-6">
                                {renderContent()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default GenrePage;