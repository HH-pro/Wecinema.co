import React, { useEffect, useState } from "react";
import { MdVerifiedUser } from "react-icons/md";
import { BsDot } from "react-icons/bs";
import { useNavigate } from "react-router-dom";
import VideoThumbnail from "react-video-thumbnail";
import { getRequest, deleteRequest, patchRequest } from "../../api";
import {
    formatDateAgo,
    generateSlug,
    truncateText,
} from "../../utilities/helperfFunction";
import { FaEllipsisV } from "react-icons/fa";
interface DeleteProps {
    title?: string;
    type?: string;
    data?: any;
    category?: string;
    length?: number;
    isFirst?: boolean;
    isGalleryPage?: boolean; // New prop to indicate if it's a gallery page
}

const Delete: React.FC<DeleteProps> = ({
    title,
    isFirst,
    data,
    category,
    isGalleryPage = true, // Default to false if not provided
}) => {
    const nav = useNavigate();
    const [loading, setLoading] = useState<boolean>(false);
    const [videos, setVideos] = useState<any>([]);
    const [selectedVideos, setSelectedVideos] = useState<string[]>([]);
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState<boolean>(false);
    const [menuOpen, setMenuOpen] = useState<number | null>(null);
    const [videoToDelete, setVideoToDelete] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true; 

        (async () => {
            setLoading(true);
            const result = !data
                ? await getRequest("video/all", setLoading)
                : await getRequest("video/all/" + data, setLoading);

            if (isMounted && result) {
                setVideos(result);
                setLoading(false);
            }
        })();

        return () => {
            isMounted = false;
        };
    }, [category]);

    const filteredVideo = (category?: string) => {
        return videos.filter((v: any) =>
            category ? v.genre.includes(category) : v
        );
    };

    const handleVideoClick = (video: any) => {
        nav(video.slug ?? "/video/" + generateSlug(video._id), {
            state: video,
        });
        localStorage.setItem("video", JSON.stringify(video));
    };

    const handleSelectVideo = (videoId: string) => {
        setSelectedVideos((prevSelected) =>
            prevSelected.includes(videoId)
                ? prevSelected.filter((id) => id !== videoId)
                : [...prevSelected, videoId]
        );
    };

    const handleOpenDeleteConfirmation = () => {
        setShowDeleteConfirmation(true);
    };

    const handleDeleteSelectedVideos = async () => {
        handleOpenDeleteConfirmation();
    };
    const handlePublishVideo = async (videoId: string) => {
        try {
            setLoading(true);
            await patchRequest(`/video/publish/${videoId}`, setLoading,setLoading);
            setVideos((prevVideos:any) =>
                prevVideos.map((video: any) =>
                    video._id === videoId ? { ...video, status: true } : video
                )
            );
        } catch (error) {
            console.error("Error publishing video:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleUnpublishVideo = async (videoId: string) => {
        try {
            setLoading(true);
            await patchRequest(`/video/unpublish/${videoId}`, setLoading,setLoading);
            setVideos((prevVideos:any) =>
                prevVideos.map((video: any) =>
                    video._id === videoId ? { ...video, status: false } : video
                )
            );
        } catch (error) {
            console.error("Error unpublishing video:", error);
        } finally {
            setLoading(false);
        }
    };

  // Confirm Delete (Bulk or Single)
  const handleConfirmDelete = async () => {
    try {
      setLoading(true);
      if (videoToDelete) {
        // Delete single video
        await deleteRequest(`/video/delete/${videoToDelete}`, setLoading);
        setVideos((prevVideos: any) => prevVideos.filter((video: any) => video._id !== videoToDelete));
        setVideoToDelete(null);
      } else {
        // Delete multiple selected videos
        for (const videoId of selectedVideos) {
          await deleteRequest(`/video/delete/${videoId}`, setLoading);
        }
        setVideos((prevVideos: any) => prevVideos.filter((video: any) => !selectedVideos.includes(video._id)));
        setSelectedVideos([]);
      }
    } catch (error) {
      console.error("Error deleting videos:", error);
    } finally {
      setLoading(false);
      setShowDeleteConfirmation(false);
    }
  };

   
  return (
    <div className="mt-4 pb-8">
      {!loading && <h2 className="text-lg sm:text-xl ml-4 font-extrabold mb-4">My Videos</h2>}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-2">
        {filteredVideo(category)?.map((video: any, index: number) => (
          <div
            key={video._id || index}
            className="relative border border-gray-200 w-full max-h-64 p-4 pb-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 bg-white text-black"
          >
            {/* Video Thumbnail */}
            <div onClick={() => handleVideoClick(video)} className="relative overflow-hidden cursor-pointer">
              <VideoThumbnail videoUrl={video.file} className="border-gray-200 rounded-xl w-full" />
            </div>

            {/* Video Details */}
            <div className="footer flex-1 block mt-2">
              <h3 className="text-base font-semibold leading-5 my-2 truncate">{truncateText(video.title, 60)}</h3>

              {/* Author Info */}
              <address className="flex items-center justify-between mt-2">
                <div className="flex items-center">
                  <div
                    className="w-8 h-8 rounded-full bg-center bg-no-repeat bg-cover"
                    style={{ backgroundImage: `url(${video?.author?.avatar})` }}
                    title={video?.author?.username}
                  ></div>
                  <div className="ml-2">
                    <div className="flex items-center">
                      <span className="truncate">{video?.author?.username}</span>
                      <MdVerifiedUser size="12" color="green" className="ml-2" />
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatDateAgo(video.createdAt ?? video.updatedAt)}
                      <BsDot className="inline-flex items-center" />
                      {video.views} Views
                    </span>
                  </div>
                </div>
              </address>

              {/* Publish/Unpublish Buttons */}
              <div className="mt-2">
                {video.status ? (
                  <button onClick={() => handleUnpublishVideo(video._id)} className="bg-red-600 text-white py-1 px-2 rounded hover:bg-red-700 transition">
                    Unpublish
                  </button>
                ) : (
                  <button onClick={() => handlePublishVideo(video._id)} className="bg-green-600 text-white py-1 px-2 rounded hover:bg-green-700 transition">
                    Publish
                  </button>
                )}
              </div>

              {/* Three-Dots Menu */}
              <div className="absolute top-2 right-2">
                <button onClick={(e) => setMenuOpen(menuOpen === index ? null : index)} className="p-2 rounded-full hover:bg-gray-100 transition duration-200">
                  <FaEllipsisV className="text-gray-600" />
                </button>

                {menuOpen === index && (
                  <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-300 shadow-md rounded-lg overflow-hidden z-10">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setVideoToDelete(video._id);
                        handleOpenDeleteConfirmation();
                        setMenuOpen(null);
                      }}
                      className="w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmation && (
        <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center">
          <div className="relative w-80 bg-white p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Confirm Deletion</h3>
            <p>Are you sure you want to delete the selected video(s)?</p>
            <div className="mt-4 flex justify-end">
              <button onClick={() => setShowDeleteConfirmation(false)} className="text-gray-500 hover:text-gray-800 mr-4">
                Cancel
              </button>
              <button onClick={handleConfirmDelete} className="text-red-500 hover:text-red-800">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


export default Delete;