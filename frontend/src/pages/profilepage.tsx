import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Delete, Layout, Render } from "../components";
import { deleteRequest, getRequest, putRequest } from "../api";
import { decodeToken } from "../utilities/helperfFunction";
import '../components/header/drowpdown.css';
import { FaEdit } from 'react-icons/fa';
import axios from 'axios';
import cover from '.././assets/public/cover.jpg';
import avatar from '.././assets/public/avatar.jpg';
import '../App.css'; // Import the CSS file for additional styling

import { FaEllipsisV } from "react-icons/fa"; // Three dots icon
let token = localStorage.getItem("token") || null;

const GenrePage: React.FC = () => {
    const { id } = useParams();
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState<any>({});
    const [menuOpen, setMenuOpen] = useState<number | null>(null);
    const [editMode, setEditMode] = useState(false);
    const [formData, setFormData] = useState({ username: "", dob: "" });
    const [userHasPaid, setUserHasPaid] = useState(false);
    const [currentUserHasPaid, setCurrentUserHasPaid] = useState(false);
    const [data, setData] = useState<any>([]);
    const [showMoreIndex, setShowMoreIndex] = useState<number | null>(null);
    const nav = useNavigate();
    const [scripts, setScripts] = useState<any>([]);
    useEffect(() => {
        let isMounted = true;

        if (!id) {
            toast.error("Please login first");
            return;
        }

        const fetchData = async () => {
            try {
                const result: any = await getRequest("/user/" + id, setLoading);
                setUser(result);
                const response = await axios.get(`https://wecinema.co/api/user/payment-status/${id}`);
                setUserHasPaid(response.data.hasPaid);
                const tokenData = decodeToken(token);
                if (tokenData) {
                    const currentUserResponse = await axios.get(`https://wecinema.co/api/user/payment-status/${tokenData.userId}`);
                    setCurrentUserHasPaid(currentUserResponse.data.hasPaid);
                }
                setFormData({ username: result.username, dob: result.dob });
                setLoading(true);
            } catch (error) {
                // console.error("Error fetching data:", error);
            }
        };

        fetchData();
    }, [id]);
    useEffect(() => {
        const fetchScripts = async () => {
          try {
            const result: any = await getRequest(`video/authors/${id}/scripts`, setLoading);
            if (result) {
              setScripts(result.map((res: any) => res.script));
              
              setData(result);
            }
          } catch (error) {
            // console.error("Error fetching scripts:", error);
          }
        };
      
        if (id) {
          fetchScripts(); // Run only when `id` changes
        }
      }, [id]); // Dependency array ensures it runs only when `id` changes
       useEffect(() => {
        const fetchScripts = async () => {
          try {
            const result: any = await getRequest(`video/authors/${id}/scripts`, setLoading);
            if (result) {
              setScripts(result.map((res: any) => res.script));
              
              setData(result);
            }
          } catch (error) {
            // console.error("Error fetching scripts:", error);
          }
        };
      
        if (id) {
          fetchScripts(); // Run only when `id` changes
        }
      }, [id]); // Dependency array ensures it runs only when `id` changes
       // Delete script function
       const deleteScript = async (scriptId: string) => {
        // console.log("Deleting script with ID:", scriptId); // Debugging check

        try {
          const result: any = await deleteRequest(`video/scripts/${scriptId}`, setLoading);
      
          if (result) {
            alert(result.message || "Script deleted successfully");
            window.location.reload(); // Refresh the page after deletion

      
            // Remove deleted script from state
            setScripts(prevScripts => prevScripts.filter(script => script._id !== scriptId));
          }
        } catch (error) {
          // console.error("Error deleting script:", error);
          alert("Error deleting script");
        }
      };
      
    
    useEffect(() => {
        if (userHasPaid && !currentUserHasPaid) {
            // Logic for userHasPaid and currentUserHasPaid
        }
    }, [userHasPaid, currentUserHasPaid]);

    const renderAllowedGenres = () => {
        if (!user.allowedGenres) return null;

        return user.allowedGenres.map((genre: string) => {
            let bgColor, marginLeft;
            switch (genre) {
                case "G":
                    bgColor = "bg-green-500";
                    marginLeft = "ml-12";
                    break;
                case "PG":
                case "PG-13":
                    bgColor = "bg-blue-500";
                    marginLeft = "ml-4";
                    break;
                case "R":
                    bgColor = "bg-yellow-500";
                    marginLeft = "ml-4";
                    break;
                case "X":
                    bgColor = "bg-red-500";
                    marginLeft = "ml-12";
                    break;
                default:
                    bgColor = "bg-gray-500";
                    marginLeft = "ml-4";
            }
            return (
                <button key={genre} className={`mb-1 ${marginLeft} text-sm sm:text-xl ${bgColor} text-white py-2 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-300`}>
                    {genre}
                </button>
            );
        });
    };

    const handleEdit = () => {
        setEditMode(true);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prevData) => ({ ...prevData, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const result = await putRequest("/user/edit/" + id, formData, setLoading);
            setUser(result);
            setEditMode(false);
            window.location.reload();
        } catch (error) {
            // console.error("Error updating profile:", error);
            toast.error("Failed to update profile");
        }
    }

    const handleScriptMouseEnter = (index: number) => {
        setShowMoreIndex(index);
    };

    const handleScriptMouseLeave = () => {
        setShowMoreIndex(null);
    };
    
    return (
        <Layout expand={false} hasHeader={false}>
            <div className="mt-12 px-4 sm:px-6 lg:px-8">
                {/* Cover Image */}
                <div className="flex justify-center w-full items-start my-0 mx-auto h-52 sm:h-80 relative overflow-hidden rounded-lg shadow-lg">
                    <img
                        className="w-full h-full object-cover"
                        src={cover}
                        alt="Cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                </div>
 
            
                
                {/* Avatar and Stats */}
                <div className="flex flex-col sm:flex-row items-center mt-4">
                    <div className="w-full sm:w-auto sm:mr-4 -mt-16 sm:-mt-20">
                        <img
                            className="rounded-full bg-white h-24 w-24 sm:h-36 sm:w-36 border-4 border-white shadow-lg transition-transform transform hover:scale-105"
                            src={avatar}
                            alt="Avatar"
                        />
                    </div>
                    <div className="flex flex-wrap justify-center sm:justify-start items-center mt-4 sm:mt-0 space-x-2">
                        <button className="mb-1 text-sm sm:text-xl bg-white text-black py-2 px-4 rounded-lg border border-gray-200 shadow-md hover:shadow-lg transition-all duration-300">
                            {user?.followers?.length} Followers
                        </button>
                        <button className="mb-1 text-sm sm:text-xl bg-white text-black py-2 px-4 rounded-lg border border-gray-200 shadow-md hover:shadow-lg transition-all duration-300">
                            {scripts.length} Videos
                        </button>
                        <button className="mb-1 text-sm sm:text-xl bg-white text-black py-2 px-4 rounded-lg border border-gray-200 shadow-md hover:shadow-lg transition-all duration-300">
                            {scripts.length} Scripts
                        </button>
                        <button className="mb-1 text-sm sm:text-xl bg-white text-black py-2 px-4 rounded-lg border border-gray-200 shadow-md hover:shadow-lg transition-all duration-300">
                            {user?.followers?.length} Likes
                        </button>
                        <button className="mb-1 text-sm sm:text-xl bg-white text-black py-2 px-4 rounded-lg border border-gray-200 shadow-md hover:shadow-lg transition-all duration-300">
                            {user?.bookmarks?.length} Bookmarks
                        </button>
                        {userHasPaid && (
                            <a href="/hypemodeprofile">
                                <button className="mb-1 text-sm sm:text-xl bg-yellow-500 text-white py-2 px-4 rounded-lg border border-yellow-600 shadow-md hover:shadow-lg transition-all duration-300">
                                    Hypemode
                                </button>
                            </a>
                        )}
                    </div>
                </div>

                {/* Profile Details */}
                <div className="mt-6 flex flex-col sm:flex-row">
                    <div className="w-full sm:w-1/2">
                        <div className="flex flex-col px-4">
                            {editMode ? (
                                <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
                                    <input
                                        type="text"
                                        name="username"
                                        value={formData.username}
                                        onChange={handleChange}
                                        className="mb-2 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <input
                                        type="date"
                                        name="dob"
                                        value={formData.dob}
                                        onChange={handleChange}
                                        className="mb-2 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <button type="submit" className="bg-blue-500 text-white py-2 px-4 rounded-lg shadow-md hover:bg-blue-600 transition-all duration-300">
                                        Save
                                    </button>
                                </form>
                            ) : (
                                <>
                                    <div className="overflow-hidden text-ellipsis font-extrabold text-2xl sm:text-3xl mb-2">
                                        {user.username}
                                    </div>
                                    <div className="overflow-hidden text-ellipsis font-normal text-base mb-2 text-gray-600">
                                        {user.email}
                                    </div>
                                    <div className="overflow-hidden text-ellipsis font-normal text-base mb-2 text-gray-600">
                                        Date of Birth: {user.dob}
                                    </div>
                                    <button onClick={handleEdit} className="text-blue-500 hover:text-blue-600 transition-all duration-300">
                                        <FaEdit size="20" />
                                    </button>
                                </>
                            )}
                            <hr className="border-t border-gray-200 w-full my-5" />
                            <div>
                                <h1 className="text-lg sm:text-xl font-bold mb-2">Allowed Ratings</h1>
                                {renderAllowedGenres()}
                            </div>
                        </div>
                    </div>

                    {/* Scripts Section */}
                    <div className="w-full sm:w-2/3 mt-4 sm:mt-0">
                        <Delete category="" length={1} data={id} />
                   

<div className="mt-4 pb-8">
  {<h2 className="text-lg sm:text-xl ml-4 font-extrabold mb-4">Scripts</h2>}

  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-2">
    {scripts?.map((script: any, index: number) => {
      const scriptData = data?.[index]; // Ensure corresponding data exists

      return (
        <div
          key={scriptData?._id || index}
          className={`relative border border-gray-200 w-full max-h-64 p-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 ${
            showMoreIndex === index ? "bg-black text-white bg-opacity-50" : "bg-white text-black"
          }`}
          onMouseEnter={() => handleScriptMouseEnter(index)}
          onMouseLeave={handleScriptMouseLeave}
          onClick={() => nav(`/script/${scriptData?._id}`, { state: JSON.stringify(scriptData) })}
        >
          {/* Script Title */}
          <h2 className="font-semibold text-lg">{scriptData?.title}</h2>

          {/* Script Content Preview */}
          <Render htmlString={script} />

          {/* Read More Button */}
          {showMoreIndex === index && (
            <button
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-600 transition-all duration-300"
              onClick={(e) => {
                e.stopPropagation();
                // console.log("Read more clicked");
              }}
            >
              Read More
            </button>
          )}

          {/* Three-Dots Menu */}
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

            {/* Dropdown Menu */}
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
        </div>
      );
    })}
  </div>
</div>

                          

                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default GenrePage;