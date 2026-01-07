import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Delete, Layout, Render } from "../components";
import { deleteRequest, getRequest, putRequest, changeUserType } from "../api";
import { decodeToken } from "../utilities/helperfFunction";
import '../components/header/drowpdown.css';
import { FaEdit, FaStore, FaShoppingCart, FaUserTie, FaUser } from 'react-icons/fa';
import axios from 'axios';
import cover from '.././assets/public/cover.jpg';
import avatar from '.././assets/public/avatar.jpg';
import '../App.css';
import { FaEllipsisV } from "react-icons/fa";

const token = localStorage.getItem("token") || null;

const GenrePage: React.FC = () => {
    const { id } = useParams();
    const [loading, setLoading] = useState(false);
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

    useEffect(() => {
        if (!id) {
            toast.error("Please login first");
            return;
        }

        const fetchData = async () => {
            try {
                setLoading(true);
                
                // Fetch user data
                const result: any = await getRequest("/user/" + id, setLoading);
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
                const paymentResponse = await axios.get(`https://wecinema-co.onrender.com/user/payment-status/${id}`);
                setUserHasPaid(paymentResponse.data.hasPaid);

                // Fetch payment status for current logged-in user
                if (tokenData) {
                    const currentUserResponse = await axios.get(`https://wecinema-co.onrender.com/user/payment-status/${tokenData.userId}`);
                    setCurrentUserHasPaid(currentUserResponse.data.hasPaid);
                }

                // Fetch user scripts and videos
                await fetchUserContent();

            } catch (error) {
                console.error("Error fetching data:", error);
                toast.error("Failed to load user profile");
            } finally {
                setLoading(false);
            }
        };

        const fetchUserContent = async () => {
            try {
                // Fetch scripts
                const scriptsResult: any = await getRequest(`video/authors/${id}/scripts`, setLoading);
                if (scriptsResult) {
                    setScripts(scriptsResult.map((res: any) => res.script));
                    setData(scriptsResult);
                }

                // Fetch videos
                const videosResult: any = await getRequest(`video/authors/${id}/videos`, setLoading);
                if (videosResult) {
                    setVideos(videosResult);
                }
            } catch (error) {
                console.error("Error fetching user content:", error);
            }
        };

        fetchData();
    }, [id]);

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
            setChangingMode(true);
            const result = await changeUserType(id, newMode, setChangingMode);
            
            if (result) {
                // Update local state
                setMarketplaceMode(newMode);
                setUser({ ...user, userType: newMode });
                localStorage.setItem('marketplaceMode', newMode);
                
                // Show success message
                toast.success(`Switched to ${newMode} mode successfully!`);
                
                // Refresh user data to ensure consistency
                const updatedUser: any = await getRequest("/user/" + id, setLoading);
                setUser(updatedUser);
            }
        } catch (error: any) {
            console.error("Error changing user type:", error);
            toast.error(error.message || "Failed to change mode");
        } finally {
            setChangingMode(false);
        }
    };

    // Rest of the component remains the same...
    const deleteScript = async (scriptId: string) => {
        if (!window.confirm("Are you sure you want to delete this script?")) {
            return;
        }

        try {
            const result: any = await deleteRequest(`video/scripts/${scriptId}`, setLoading);
            if (result) {
                toast.success("Script deleted successfully");
                setScripts(prevScripts => prevScripts.filter((script, index) => data[index]?._id !== scriptId));
                setData(prevData => prevData.filter((item: any) => item._id !== scriptId));
            }
        } catch (error) {
            console.error("Error deleting script:", error);
            toast.error("Error deleting script");
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
            const result = await putRequest("/user/edit/" + id, formData, setLoading);
            setUser(result.user);
            setEditMode(false);
            toast.success("Profile updated successfully!");
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
            // Implement follow functionality here
            toast.info("Follow functionality to be implemented");
        } catch (error) {
            console.error("Error following user:", error);
            toast.error("Failed to follow user");
        }
    };

    const renderAllowedGenres = () => {
        if (!user.allowedGenres || user.allowedGenres.length === 0) {
            return (
                <div className="text-gray-500 text-sm">No ratings specified</div>
            );
        }

        return user.allowedGenres.map((genre: string) => {
            let bgColor, textColor;
            switch (genre) {
                case "G":
                    bgColor = "bg-green-100";
                    textColor = "text-green-800";
                    break;
                case "PG":
                case "PG-13":
                    bgColor = "bg-blue-100";
                    textColor = "text-blue-800";
                    break;
                case "R":
                    bgColor = "bg-yellow-100";
                    textColor = "text-yellow-800";
                    break;
                case "X":
                    bgColor = "bg-red-100";
                    textColor = "text-red-800";
                    break;
                default:
                    bgColor = "bg-gray-100";
                    textColor = "text-gray-800";
            }
            return (
                <span key={genre} className={`inline-block ${bgColor} ${textColor} text-xs font-semibold px-3 py-1 rounded-full mr-2 mb-2`}>
                    {genre}
                </span>
            );
        });
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'scripts':
                return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                        {scripts?.map((script: any, index: number) => {
                            const scriptData = data?.[index];
                            return (
                                <div
                                    key={scriptData?._id || index}
                                    className={`relative border border-gray-200 w-full max-h-64 p-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer ${
                                        showMoreIndex === index ? "bg-black text-white bg-opacity-50" : "bg-white text-black"
                                    }`}
                                    onMouseEnter={() => handleScriptMouseEnter(index)}
                                    onMouseLeave={handleScriptMouseLeave}
                                    onClick={() => nav(`/script/${scriptData?._id}`, { state: JSON.stringify(scriptData) })}
                                >
                                    <h2 className="font-semibold text-lg mb-2">{scriptData?.title}</h2>
                                    <Render htmlString={script} />

                                    {showMoreIndex === index && (
                                        <button
                                            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-600 transition-all duration-300"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            Read More
                                        </button>
                                    )}

                                    {isCurrentUser && (
                                        <div className="absolute top-2 right-2">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setMenuOpen(menuOpen === index ? null : index);
                                                }}
                                                className="p-2 rounded-full hover:bg-gray-100 transition duration-200"
                                            >
                                                <FaEllipsisV className="text-gray-600" />
                                            </button>

                                            {menuOpen === index && (
                                                <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-300 shadow-md rounded-lg overflow-hidden z-10">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (scriptData?._id) {
                                                                deleteScript(scriptData._id);
                                                                setMenuOpen(null);
                                                            }
                                                        }}
                                                        className="w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        {scripts.length === 0 && (
                            <div className="col-span-full text-center py-8 text-gray-500">
                                No scripts found
                            </div>
                        )}
                    </div>
                );
            
            case 'videos':
                return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                        {videos?.map((video: any) => (
                            <div
                                key={video._id}
                                className="border border-gray-200 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer"
                                onClick={() => nav(`/video/${video._id}`)}
                            >
                                {video.thumbnail && (
                                    <img
                                        src={video.thumbnail}
                                        alt={video.title}
                                        className="w-full h-48 object-cover rounded-t-lg"
                                    />
                                )}
                                <div className="p-4">
                                    <h3 className="font-semibold text-lg mb-2">{video.title}</h3>
                                    <p className="text-gray-600 text-sm">{video.description}</p>
                                </div>
                            </div>
                        ))}
                        {videos.length === 0 && (
                            <div className="col-span-full text-center py-8 text-gray-500">
                                No videos found
                            </div>
                        )}
                    </div>
                );
            
            case 'about':
                return (
                    <div className="mt-4 p-6 bg-white rounded-lg shadow-md">
                        <h3 className="text-xl font-bold mb-4">About</h3>
                        <div className="space-y-4">
                            <div>
                                <h4 className="font-semibold text-gray-700">Bio</h4>
                                <p className="text-gray-600 mt-1">{user.bio || "No bio provided"}</p>
                            </div>
                            <div>
                                <h4 className="font-semibold text-gray-700">Joined</h4>
                                <p className="text-gray-600 mt-1">
                                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
                                </p>
                            </div>
                            <div>
                                <h4 className="font-semibold text-gray-700">Marketplace Role</h4>
                                <div className="flex items-center mt-1">
                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                        user.userType === 'seller' 
                                            ? 'bg-green-100 text-green-800' 
                                            : 'bg-blue-100 text-blue-800'
                                    }`}>
                                        {user.userType === 'seller' ? (
                                            <>
                                                <FaUserTie className="mr-1" />
                                                Seller
                                            </>
                                        ) : (
                                            <>
                                                <FaShoppingCart className="mr-1" />
                                                Buyer
                                            </>
                                        )}
                                    </span>
                                </div>
                            </div>
                            <div>
                                <h4 className="font-semibold text-gray-700">Subscription Status</h4>
                                <p className="text-gray-600 mt-1">
                                    {userHasPaid ? (
                                        <span className="text-green-600 font-semibold">Premium User</span>
                                    ) : (
                                        <span className="text-gray-600">Free User</span>
                                    )}
                                </p>
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
            <Layout expand={false} hasHeader={false}>
                <div className="mt-12 px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout expand={false} hasHeader={false}>
            <div className="mt-12 px-4 sm:px-6 lg:px-8">
                {/* Cover Image */}
                <div className="flex justify-center w-full items-start my-0 mx-auto h-52 sm:h-80 relative overflow-hidden rounded-lg shadow-lg">
                    <img
                        className="w-full h-full object-cover"
                        src={user.coverImage || cover}
                        alt="Cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                </div>

                {/* Avatar and Stats */}
                <div className="flex flex-col sm:flex-row items-start mt-4">
                    <div className="w-full sm:w-auto sm:mr-6 -mt-16 sm:-mt-20 flex-shrink-0">
                        <img
                            className="rounded-full bg-white h-24 w-24 sm:h-36 sm:w-36 border-4 border-white shadow-lg transition-transform transform hover:scale-105"
                            src={user.avatar || avatar}
                            alt="Avatar"
                        />
                    </div>
                    
                    <div className="flex-1 mt-4 sm:mt-0">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex-1">
                                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{user.username}</h1>
                                <p className="text-gray-600 mt-1">{user.email}</p>
                                {user.bio && (
                                    <p className="text-gray-700 mt-2 max-w-2xl">{user.bio}</p>
                                )}
                            </div>
                            
                            <div className="flex space-x-3 mt-4 sm:mt-0">
                                {!isCurrentUser && (
                                    <button
                                        onClick={handleFollow}
                                        className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg shadow-md transition-all duration-300"
                                    >
                                        Follow
                                    </button>
                                )}
                                
                                {isCurrentUser && (
                                    <button 
                                        onClick={toggleMarketplaceMode}
                                        disabled={changingMode}
                                        className={`px-6 py-2 rounded-lg border shadow-md hover:shadow-lg transition-all duration-300 flex items-center space-x-2 ${
                                            marketplaceMode === 'buyer' 
                                                ? 'bg-blue-500 text-white border-blue-600' 
                                                : 'bg-green-500 text-white border-green-600'
                                        } ${changingMode ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        {changingMode ? (
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        ) : marketplaceMode === 'seller' ? (
                                            <FaUserTie className="text-sm" />
                                        ) : (
                                            <FaShoppingCart className="text-sm" />
                                        )}
                                        <span>
                                            {changingMode ? 'Changing...' : `${marketplaceMode === 'buyer' ? 'Buyer' : 'Seller'} Mode`}
                                        </span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="flex flex-wrap gap-3 mt-6">
                            <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 text-center min-w-24 shadow-sm">
                                <div className="text-2xl font-bold text-gray-900">{user.followers?.length || 0}</div>
                                <div className="text-sm text-gray-600">Followers</div>
                            </div>
                            <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 text-center min-w-24 shadow-sm">
                                <div className="text-2xl font-bold text-gray-900">{user.followings?.length || 0}</div>
                                <div className="text-sm text-gray-600">Following</div>
                            </div>
                            <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 text-center min-w-24 shadow-sm">
                                <div className="text-2xl font-bold text-gray-900">{scripts.length}</div>
                                <div className="text-sm text-gray-600">Scripts</div>
                            </div>
                            <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 text-center min-w-24 shadow-sm">
                                <div className="text-2xl font-bold text-gray-900">{videos.length}</div>
                                <div className="text-sm text-gray-600">Videos</div>
                            </div>
                            {userHasPaid && (
                                <a href="/hypemodeprofile">
                                    <div className="bg-yellow-500 border border-yellow-600 rounded-lg px-4 py-3 text-center min-w-24 shadow-sm cursor-pointer hover:bg-yellow-600 transition-colors">
                                        <div className="text-2xl font-bold text-white">Hype</div>
                                        <div className="text-sm text-white">Mode</div>
                                    </div>
                                </a>
                            )}
                        </div>
                    </div>
                </div>

                {/* Profile Details and Content */}
                <div className="mt-8 flex flex-col lg:flex-row gap-8">
                    {/* Left Sidebar - Profile Info */}
                    <div className="w-full lg:w-1/3">
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold text-gray-900">Profile Information</h2>
                                {isCurrentUser && !editMode && (
                                    <button
                                        onClick={handleEdit}
                                        className="text-blue-500 hover:text-blue-600 transition-colors"
                                    >
                                        <FaEdit size="18" />
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
                                            className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                            className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                            className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="Tell us about yourself..."
                                        />
                                    </div>

                                    <div className="flex space-x-3">
                                        <button 
                                            type="submit" 
                                            className="bg-blue-500 text-white py-2 px-4 rounded-lg shadow-md hover:bg-blue-600 transition-all duration-300"
                                        >
                                            Save Changes
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={handleCancelEdit}
                                            className="bg-gray-500 text-white py-2 px-4 rounded-lg shadow-md hover:bg-gray-600 transition-all duration-300"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <div className="space-y-4">
                                    <div>
                                        <h3 className="font-semibold text-gray-700">Username</h3>
                                        <p className="text-gray-900">{user.username}</p>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-700">Email</h3>
                                        <p className="text-gray-900">{user.email}</p>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-700">Date of Birth</h3>
                                        <p className="text-gray-900">{user.dob}</p>
                                    </div>
                                    {user.bio && (
                                        <div>
                                            <h3 className="font-semibold text-gray-700">Bio</h3>
                                            <p className="text-gray-900">{user.bio}</p>
                                        </div>
                                    )}
                                    <div>
                                        <h3 className="font-semibold text-gray-700 mb-2">Allowed Ratings</h3>
                                        <div className="flex flex-wrap">
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
                        <div className="bg-white rounded-lg shadow-md">
                            <div className="border-b border-gray-200">
                                <nav className="flex -mb-px">
                                    <button
                                        onClick={() => setActiveTab('scripts')}
                                        className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                                            activeTab === 'scripts'
                                                ? 'border-blue-500 text-blue-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                    >
                                        Scripts ({scripts.length})
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('videos')}
                                        className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                                            activeTab === 'videos'
                                                ? 'border-blue-500 text-blue-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                    >
                                        Videos ({videos.length})
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('about')}
                                        className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                                            activeTab === 'about'
                                                ? 'border-blue-500 text-blue-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                    >
                                        About
                                    </button>
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