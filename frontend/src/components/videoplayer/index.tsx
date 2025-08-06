import React, { useEffect, useState } from "react";
import { BsDot } from "react-icons/bs";
import { MdPlayArrow, MdUpload, MdVerifiedUser } from "react-icons/md";
import { AiFillDislike, AiFillLike, AiOutlineDislike, AiOutlineLike } from "react-icons/ai";
import { formatDateAgo, isUserIdInArray } from "../../utilities/helperfFunction";
import { getRequest, postRequest, putRequest } from "../../api";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import Modal from 'react-modal';
import axios from 'axios';
import '../videoplayer/index.css';

interface Video {
  _id: string;
  title: string;
  file: string;
  likes: string[];
  dislikes: string[];
  comments: any[];
  author: {
    _id: string;
    username: string;
    avatar: string;
    followers: string[];
  };
  createdAt: string;
  updatedAt: string;
}

interface TokenData {
  userId: string;
}

interface VideoPlayerProps {
  video: Video;
  tokenData?: TokenData;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ video, tokenData }) => {
  const [loading, setLoading] = useState(false);
  const [comment, setComment] = useState<string>("");
  const [commentData, setCommentData] = useState<any[]>(video?.comments ?? []);
  const [isBookmarked, setIsBookmarked] = useState<boolean>(false);
  const [views, setViews] = useState(0);
  const [reply, setReply] = useState<string>("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(
    video?.author?.followers?.includes(tokenData?.userId || "")
  );
  const [userHasPaid, setUserHasPaid] = useState(false);
  const [currentUserHasPaid, setCurrentUserHasPaid] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  // Consolidated like/dislike states
  const [likes, setLikes] = useState({
    count: video?.likes?.length ?? 0,
    isLiked: false
  });

  const [dislikes, setDislikes] = useState({
    count: video?.dislikes?.length ?? 0,
    isDisliked: false
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch all video data in parallel
        const [videoData, likeStatus, viewsData] = await Promise.all([
          getRequest("/video/" + video._id, setLoading),
          tokenData?.userId ? getRequest(`/video/${video._id}/like-status/${tokenData.userId}`, setLoading) 
                          : Promise.resolve({ isLiked: false, isDisliked: false }),
          getRequest(`/video/views/${video._id}`, setLoading)
        ]);

        setCommentData(videoData.comments || []);
        setViews(viewsData.views || 0);
        
        setLikes({
          count: videoData.likes?.length || 0,
          isLiked: likeStatus.isLiked || false
        });
        
        setDislikes({
          count: videoData.dislikes?.length || 0,
          isDisliked: likeStatus.isDisliked || false
        });

        setIsFollowing(videoData.author?.followers?.includes(tokenData?.userId));
        
      // Fetch payment status
const paymentPromises: Promise<any>[] = [];

if (video.author?._id) {
  paymentPromises.push(
    axios
      .get(`https://wecinema.co/api/user/payment-status/${video.author._id}`)
      .then((response) => setUserHasPaid(response.data.hasPaid))
  );
}

if (tokenData?.userId) {
  paymentPromises.push(
    axios
      .get(`https://wecinema.co/api/user/payment-status/${tokenData.userId}`)
      .then((response) => setCurrentUserHasPaid(response.data.hasPaid))
  );
}


        await Promise.all(paymentPromises);
        
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [video._id, tokenData?.userId]);

  useEffect(() => {
    if (userHasPaid && currentUserHasPaid) {
      setShowModal(true);
    }
  }, [userHasPaid, currentUserHasPaid]);

  const handleCloseModal = () => {
    setShowModal(false);
    navigate('/');
  };

  const handleLikeClick = async () => {
    try {
      if (!tokenData?.userId) {
        toast.error("Please log in to like videos");
        return;
      }

      setLoading(true);
      const newIsLiked = !likes.isLiked;
      
      // Optimistic update
      setLikes(prev => ({
        isLiked: newIsLiked,
        count: newIsLiked ? prev.count + 1 : prev.count - 1
      }));
      
      // If switching from dislike to like
      if (dislikes.isDisliked) {
        setDislikes(prev => ({
          isDisliked: false,
          count: prev.count - 1
        }));
      }

      const payload = {
        userId: tokenData.userId,
        action: newIsLiked ? 'like' : 'unlike'
      };

      await postRequest(`/video/${video._id}/like`, payload, setLoading);
      
    } catch (error) {
      // Revert on error
      setLikes(prev => ({
        isLiked: !prev.isLiked,
        count: prev.isLiked ? prev.count - 1 : prev.count + 1
      }));
      toast.error("Error updating like");
      console.error("Like error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDislikeClick = async () => {
    try {
      if (!tokenData?.userId) {
        toast.error("Please log in to dislike videos");
        return;
      }

      setLoading(true);
      const newIsDisliked = !dislikes.isDisliked;
      
      // Optimistic update
      setDislikes(prev => ({
        isDisliked: newIsDisliked,
        count: newIsDisliked ? prev.count + 1 : prev.count - 1
      }));
      
      // If switching from like to dislike
      if (likes.isLiked) {
        setLikes(prev => ({
          isLiked: false,
          count: prev.count - 1
        }));
      }

      const payload = {
        userId: tokenData.userId,
        action: newIsDisliked ? 'dislike' : 'undislike'
      };

      await postRequest(`/video/${video._id}/dislike`, payload, setLoading);
      
    } catch (error) {
      // Revert on error
      setDislikes(prev => ({
        isDisliked: !prev.isDisliked,
        count: prev.isDisliked ? prev.count - 1 : prev.count + 1
      }));
      toast.error("Error updating dislike");
      console.error("Dislike error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollowSubmit = async () => {
    if (!tokenData?.userId) {
      toast.error("Please log in to subscribe");
      return;
    }

    try {
      setLoading(true);
      const action = isFollowing ? "unfollow" : "follow";
      
      // Optimistic update
      setIsFollowing(!isFollowing);

      const payload = {
        action,
        userId: tokenData.userId,
      };

      await putRequest(
        `user/${video.author?._id}/follow`,
        payload,
        setLoading
      );

      toast.success(`Successfully ${action === "follow" ? "subscribed" : "unsubscribed"}`);
    } catch (error) {
      // Revert on error
      setIsFollowing(prev => !prev);
      toast.error("Error updating subscription");
      console.error("Subscription error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (comment.length > 1) {
      if (!tokenData?.userId) {
        toast.error("Log in first !!!");
        return;
      }
      try {
        setLoading(true);
        let payload = {
          userId: tokenData?.userId,
          text: comment,
        };
        const result: any = await postRequest(
          "video/" + video._id + "/comment",
          payload,
          setLoading,
          "Commented successfully"
        );
        setComment("");
        setCommentData(result?.comments);
      } catch (error: any) {
        setLoading(false);
        toast.error(error.message);
        console.error("Post error:", error);
      }
    }
  };

  const handleReplySubmit = async (e: React.FormEvent<HTMLFormElement>, commentId: string) => {
    e.preventDefault();

    if (reply.length > 1) {
      if (!tokenData?.userId) {
        toast.error("Log in first !!!");
        return;
      }
      try {
        setLoading(true);
        let payload = {
          userId: tokenData?.userId,
          text: reply,
        };
        const result: any = await postRequest(
          `video/${video._id}/comment/${commentId}`,
          payload,
          setLoading,
          "Replied successfully"
        );
        setReply("");
        setReplyingTo(null);
        setCommentData(result?.comments);
      } catch (error: any) {
        setLoading(false);
        toast.error(error.message);
        console.error("Reply error:", error);
      }
    }
  };

  const toggleBookmark = async () => {
    try {
      setLoading(true);
      const action = isBookmarked ? "removeBookmark" : "addBookmark";
      let payload = {
        action,
        userId: tokenData?.userId,
      };
      const result: any = await putRequest(
        "video/" + video._id,
        payload,
        setLoading,
        `Video ${isBookmarked ? "Unbookmarked" : "Bookmarked"}!`
      );
      setIsBookmarked(!isBookmarked);
      console.log("Bookmark status toggled:", result);
    } catch (error) {
      setLoading(false);
      console.error("Bookmark toggle error:", error);
    }
  };

  const handleVideoPlay = async () => {
    try {
      const userId = tokenData?.userId;
      const result = await putRequest(
        `/video/view/${video._id}`, 
        { userId },
        setLoading
      );
      setViews(result.views);
    } catch (error) {
      console.error("Error incrementing views:", error);
    }
  };

  if (showModal) {
    return (
      <Modal
        isOpen={showModal}
        onRequestClose={handleCloseModal}
        contentLabel="Subscribe Now"
        style={{
          overlay: {
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
          },
          content: {
            top: '50%',
            left: '50%',
            right: 'auto',
            bottom: 'auto',
            marginRight: '-50%',
            transform: 'translate(-50%, -50%)',
            background: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)',
            color: '#fff',
            padding: '20px',
            borderRadius: '10px',
            border: 'none',
          },
        }}
      >
        <h2 style={{ marginBottom: '20px' }}>Subscribe to Access This Profile</h2>
        <p>You need to subscribe to access this profile.</p>
        <button onClick={handleCloseModal} style={{ marginTop: '20px', padding: '10px 20px', background: '#fff', color: '#000', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
          Close
        </button>
      </Modal>
    );
  }

  return (
    <div className="">
      {/* Video Player */}
      <div
        className="relative w-[90%] sm:w-full min-w-0 sm:min-w-screen-xl bg-white max-w-3xl rounded-md mx-auto"
        style={{ marginTop: 17, marginLeft: 10, marginRight: 10 }}
      >
        {loading && <MdPlayArrow className="absolute inset-0 m-auto text-white text-5xl" />}
        
        <video
          className="w-full h-[220px] sm:h-[400px] rounded-lg"
          controls
          onPlay={handleVideoPlay}
        >
          <source src={video?.file} type="video/mp4" />
          <source src={video?.file} type="video/quicktime" />
          Your browser does not support the video tag.
        </video>
      </div>

      {/* Video Metadata and Actions */}
      <div className="mt-4 sm:flex justify-between items-center border-b pb-5 border-grey-200">
        {/* Video Information and Comments */}
        <div className="sm:w-3/5 ml-4">
          {/* Video Title */}
          <h1 className="md:text-2xl font-bold mb-2 text-xl">{video?.title}</h1>

          <div className="flex sm:gap-10 gap-6 items-center">
            <address className="flex items-center justify-between mt-8px">
              <a href="#" className="flex w-full overflow-hidden relative items-center">
                <div className="relative rounded-full w-32px box-border flex-shrink-0 block">
                  <div
                    className="items-center rounded-full flex-shrink-0 justify-center bg-center bg-no-repeat bg-cover flex"
                    style={{
                      width: 32,
                      height: 32,
                      backgroundImage: `url(${video?.author?.avatar})`,
                    }}
                    title={video?.author?.username}
                  ></div>
                </div>
                <div style={{ fontSize: 13 }} className="w-full">
                  <div className="flex items-center sm:ml-2 flex-grow">
                    <span className="overflow-hidden -webkit-box">
                      {video?.author?.username}
                    </span>
                    <MdVerifiedUser size="18" color="green" className="flex-shrink-0 sm:ml-2" />
                  </div>
                  <div className="sm:ml-2 w-full">
                    <span>
                      {formatDateAgo(video?.createdAt ?? video?.updatedAt)} <BsDot className="inline-flex items-center" /> {views} Views
                    </span>
                  </div>
                </div>
              </a>
            </address>
            <button
              onClick={handleFollowSubmit}
              disabled={loading}
              className={`btn text-white cursor-pointer px-6 md:py-2 py-1 rounded-full ${
                isFollowing ? "bg-gray-500" : "bg-yellow-500"
              }`}
            >
              {loading ? "Processing..." : isFollowing ? "Unsubscribe" : "Subscribe"}
            </button>
          </div>
        </div>

        {/* Like, Dislike, Bookmark, and Action Buttons */}
        <div className="button-container">
          <button
            disabled={loading}
            onClick={handleLikeClick}
            className={`button ${likes.isLiked ? "like" : "bookmark"}`}
          >
            {likes.isLiked ? <AiFillLike size="20" /> : <AiOutlineLike size="20" />}{" "}
            {likes.count}
          </button>
          <button 
            disabled={loading} 
            onClick={handleDislikeClick} 
            className={`button ${dislikes.isDisliked ? "dislike" : "bookmark"}`}
          >
            {dislikes.isDisliked ? <AiFillDislike size="20" /> : <AiOutlineDislike size="20" />}
            {dislikes.count}
          </button>

          <button onClick={toggleBookmark} className={`button ${isBookmarked ? "like" : "bookmark"}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {isBookmarked ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              )}
            </svg>
          </button>

          <button className="button share">
            <MdUpload size="20" />
            Share
          </button>
        </div>
      </div>

      <hr />

      {/* Comment Section */}
      <form
        onSubmit={handleCommentSubmit}
        className="sm:w-5/6 w-15/20 my-20 ml-25 relative m-auto bg-grey rounded-md"
      >
        <textarea
          name=""
          placeholder="Add comment..."
          id=""
          cols={30}
          value={comment}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            setComment(e.target.value)
          }
          rows={3}
          className="w-full p-3 border-0 rounded-lg outline-none"
        ></textarea>
        
        <button
          disabled={loading}
          className="bg-yellow-500 p-2 text-white absolute bottom-5 right-5 border-0 rounded-lg outline-none"
        >
          Comment
        </button>
      </form>

      {/* Display Comments */}
      {commentData.length > 0 ? (
        <div className="mt-1 sm:w-4/6 w-11/12 my-20 ml-20 relative m-auto bg-black-500">
          <h3 className="break-words sm:text-base text-sm mb-2">
            {commentData.length} Comments
          </h3>

          {commentData.map((comment: any, index: number) => (
            <section key={index} className="relative mb-5 gap-2 flex">
              <img
                src={comment.avatar}
                className="bg-white rounded-full w-8 h-8 flex-shrink-0 text-lg mr-1.5 block border border-gray-100"
                alt="User Avatar"
              />
              <div>
                <div className="flex gap-1 mb-3">
                  <div className="cursor-pointer">
                    <h4 className="m-0 sm:text-base text-sm text-cyan-950 leading-4 max-h-3.5">
                      {comment.username}
                    </h4>
                  </div>
                  <h4 className="m-0 italic sm:text-base text-sm text-cyan-950 leading-4 max-h-3.5">
                    {formatDateAgo(comment.chatedAt ?? video.updatedAt)}
                  </h4>
                </div>
                <p className="break-words sm:text-base text-sm">{comment.text}</p>

                {/* Reply Button */}
                <button
                  className="text-sm text-blue-500 hover:underline"
                  onClick={() =>
                    setReplyingTo(replyingTo === comment._id ? null : comment._id)
                  }
                >
                  {replyingTo === comment._id ? "Cancel" : "Reply"}
                </button>

                {/* Reply Input */}
                {replyingTo === comment._id && (
                  <form
                    onSubmit={(e) => handleReplySubmit(e, comment._id)}
                    className="mt-2"
                  >
                    <textarea
                      placeholder="Add a reply..."
                      value={reply}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setReply(e.target.value)
                      }
                      rows={2}
                      className="w-full p-2 border rounded-md outline-none"
                    ></textarea>
                    <button
                      disabled={loading}
                      className="bg-yellow-500 p-2 mt-1 text-white border-0 rounded-lg"
                    >
                      Reply
                    </button>
                  </form>
                )}

                {/* Replies Display */}
                {comment.replies?.length > 0 && (
                  <div className="ml-8 mt-3">
                    {comment.replies.map((reply: any, replyIndex: number) => (
                      <div key={replyIndex} className="flex gap-2 mb-2">
                        <img
                          src={reply.avatar}
                          className="bg-white rounded-full w-6 h-6 flex-shrink-0"
                          alt="Reply Avatar"
                        />
                        <div>
                          <h5 className="text-sm font-semibold">
                            {reply.username}
                          </h5>
                          <p className="text-sm">{reply.text}</p>
                          <span className="text-xs text-gray-500">
                            {formatDateAgo(reply.chatedAt ?? video.updatedAt)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <p className="mt-1 sm:w-5/6 w-11/12 my-20 ml-13 relative m-auto">
          No comments
        </p>
      )}
    </div>
  );
};

export default VideoPlayer;