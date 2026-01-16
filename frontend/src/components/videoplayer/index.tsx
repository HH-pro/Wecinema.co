import React, { useEffect, useState, useCallback, useMemo } from "react";
import { BsDot } from "react-icons/bs";
import { MdPlayArrow, MdUpload, MdVerifiedUser } from "react-icons/md";
import { AiFillDislike, AiFillLike, AiOutlineDislike, AiOutlineLike } from "react-icons/ai";
import { formatDateAgo } from "../../utilities/helperfFunction";
import { getRequest, postRequest, putRequest, API_BASE_URL } from "../../api";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import Modal from 'react-modal';
import axios from 'axios';
import '../videoplayer/index.css';

// Constants
const COMMENT_MIN_LENGTH = 2;

interface Video {
  _id: string;
  title: string;
  file: string;
  likes: string[];
  dislikes: string[];
  comments: Comment[];
  author: {
    _id: string;
    username: string;
    avatar: string;
    followers: string[];
  };
  createdAt: string;
  updatedAt: string;
}

interface Comment {
  _id: string;
  username: string;
  avatar: string;
  text: string;
  chatedAt?: string;
  replies?: Comment[];
}

interface TokenData {
  userId: string;
}

interface VideoPlayerProps {
  video: Video;
  tokenData?: TokenData;
}

interface LikeState {
  count: number;
  isLiked: boolean;
}

interface DislikeState {
  count: number;
  isDisliked: boolean;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ video, tokenData }) => {
  const [loading, setLoading] = useState(false);
  const [comment, setComment] = useState<string>("");
  const [commentData, setCommentData] = useState<Comment[]>(video?.comments ?? []);
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

  const [likes, setLikes] = useState<LikeState>({
    count: video?.likes?.length ?? 0,
    isLiked: false
  });

  const [dislikes, setDislikes] = useState<DislikeState>({
    count: video?.dislikes?.length ?? 0,
    isDisliked: false
  });

  // Fetch all video data on mount
  useEffect(() => {
    const fetchVideoData = async () => {
      try {
        setLoading(true);

        const promises = [
          getRequest(`/video/${video._id}`, setLoading),
          getRequest(`/video/views/${video._id}`, setLoading)
        ];

        if (tokenData?.userId) {
          promises.push(getRequest(`/video/${video._id}/like-status/${tokenData.userId}`, setLoading));
        }

        const [videoData, viewsData, likeStatus] = await Promise.all(promises);

        setCommentData(videoData.comments || []);
        setViews(viewsData.views || 0);
        setIsFollowing(videoData.author?.followers?.includes(tokenData?.userId));

        // Set initial like/dislike state
        if (likeStatus) {
          setLikes({
            count: videoData.likes?.length || 0,
            isLiked: likeStatus.isLiked || false
          });
          setDislikes({
            count: videoData.dislikes?.length || 0,
            isDisliked: likeStatus.isDisliked || false
          });
        } else {
          // Fallback: Check if user ID is in likes/dislikes arrays
          if (tokenData?.userId) {
            const isLiked = videoData.likes?.includes(tokenData.userId) || false;
            const isDisliked = videoData.dislikes?.includes(tokenData.userId) || false;
            
            setLikes({
              count: videoData.likes?.length || 0,
              isLiked
            });
            setDislikes({
              count: videoData.dislikes?.length || 0,
              isDisliked
            });
          }
        }

        // Fetch payment statuses in parallel
        const paymentPromises = [];
        if (video.author?._id) {
          paymentPromises.push(
            axios.get(`${API_BASE_URL}/user/payment-status/${video.author._id}`)
              .then(res => setUserHasPaid(res.data.hasPaid))
              .catch(err => console.error("Author payment status error:", err))
          );
        }
        if (tokenData?.userId) {
          paymentPromises.push(
            axios.get(`${API_BASE_URL}/user/payment-status/${tokenData.userId}`)
              .then(res => setCurrentUserHasPaid(res.data.hasPaid))
              .catch(err => console.error("User payment status error:", err))
          );
        }

        await Promise.all(paymentPromises);
      } catch (error) {
        console.error("Error fetching video data:", error);
        toast.error("Failed to load video data");
      } finally {
        setLoading(false);
      }
    };

    fetchVideoData();
  }, [video._id, tokenData?.userId]);

  useEffect(() => {
    if (userHasPaid && currentUserHasPaid) {
      setShowModal(true);
    }
  }, [userHasPaid, currentUserHasPaid]);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    navigate('/');
  }, [navigate]);

  const handleLikeClick = useCallback(async () => {
    if (!tokenData?.userId) {
      toast.error("Please log in to like videos");
      return;
    }

    try {
      setLoading(true);
      
      // Determine the action based on current state
      const newIsLiked = !likes.isLiked;
      const action = newIsLiked ? 'like' : 'unlike';

      // Optimistic update
      const newLikes = {
        isLiked: newIsLiked,
        count: newIsLiked ? likes.count + 1 : likes.count - 1
      };
      
      // If switching from dislike to like, remove dislike
      let newDislikes = { ...dislikes };
      if (dislikes.isDisliked && newIsLiked) {
        newDislikes = {
          isDisliked: false,
          count: dislikes.count - 1
        };
      }

      setLikes(newLikes);
      if (dislikes.isDisliked && newIsLiked) {
        setDislikes(newDislikes);
      }

      // Make API call
      const payload = {
        userId: tokenData.userId,
        action: action
      };

      console.log("Sending like request:", { videoId: video._id, payload });
      
      const response = await postRequest(`/video/like/${video._id}`, payload, setLoading);
      
      console.log("Like response:", response);
      
      if (response?.message) {
        toast.success(response.message);
      }
      
      // If unliking, also remove from likes count
      if (action === 'unlike' && response?.video?.likes) {
        setLikes({
          isLiked: false,
          count: response.video.likes.length
        });
      }
      
    } catch (error: any) {
      // Revert on error
      setLikes({
        isLiked: !likes.isLiked,
        count: likes.isLiked ? likes.count - 1 : likes.count + 1
      });
      
      const errorMessage = error.response?.data?.message || "Error updating like";
      toast.error(errorMessage);
      console.error("Like error:", error);
    } finally {
      setLoading(false);
    }
  }, [likes, dislikes, tokenData?.userId, video._id]);

  const handleDislikeClick = useCallback(async () => {
    if (!tokenData?.userId) {
      toast.error("Please log in to dislike videos");
      return;
    }

    try {
      setLoading(true);
      
      // Determine the action based on current state
      const newIsDisliked = !dislikes.isDisliked;
      const action = newIsDisliked ? 'dislike' : 'undislike';

      // Optimistic update
      const newDislikes = {
        isDisliked: newIsDisliked,
        count: newIsDisliked ? dislikes.count + 1 : dislikes.count - 1
      };
      
      // If switching from like to dislike, remove like
      let newLikes = { ...likes };
      if (likes.isLiked && newIsDisliked) {
        newLikes = {
          isLiked: false,
          count: likes.count - 1
        };
      }

      setDislikes(newDislikes);
      if (likes.isLiked && newIsDisliked) {
        setLikes(newLikes);
      }

      // Make API call
      const payload = {
        userId: tokenData.userId,
        action: action
      };

      console.log("Sending dislike request:", { videoId: video._id, payload });
      
      const response = await postRequest(`/video/dislike/${video._id}`, payload, setLoading);
      
      console.log("Dislike response:", response);
      
      if (response?.message) {
        toast.success(response.message);
      }
      
      // If undisliking, also remove from dislikes count
      if (action === 'undislike' && response?.video?.dislikes) {
        setDislikes({
          isDisliked: false,
          count: response.video.dislikes.length
        });
      }
      
    } catch (error: any) {
      // Revert on error
      setDislikes({
        isDisliked: !dislikes.isDisliked,
        count: dislikes.isDisliked ? dislikes.count - 1 : dislikes.count + 1
      });
      
      const errorMessage = error.response?.data?.message || "Error updating dislike";
      toast.error(errorMessage);
      console.error("Dislike error:", error);
    } finally {
      setLoading(false);
    }
  }, [dislikes, likes, tokenData?.userId, video._id]);

  const handleFollowSubmit = useCallback(async () => {
    if (!tokenData?.userId) {
      toast.error("Please log in to subscribe");
      return;
    }

    try {
      setLoading(true);
      const action = isFollowing ? "unfollow" : "follow";
      
      // Optimistic update
      setIsFollowing(!isFollowing);

      const response = await putRequest(
        `/user/${video.author?._id}/follow`,
        { action, userId: tokenData.userId },
        setLoading
      );

      if (response?.message) {
        toast.success(response.message);
      } else {
        toast.success(`Successfully ${action === "follow" ? "subscribed" : "unsubscribed"}`);
      }
    } catch (error: any) {
      // Revert on error
      setIsFollowing(prev => !prev);
      const errorMessage = error.response?.data?.message || "Error updating subscription";
      toast.error(errorMessage);
      console.error("Subscription error:", error);
    } finally {
      setLoading(false);
    }
  }, [isFollowing, tokenData?.userId, video.author?._id]);

  const handleCommentSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (comment.trim().length < COMMENT_MIN_LENGTH) {
      toast.error("Comment must be at least 2 characters");
      return;
    }

    if (!tokenData?.userId) {
      toast.error("Log in first !!!");
      return;
    }

    try {
      setLoading(true);
      const result: any = await postRequest(
        `/video/${video._id}/comment`,
        { userId: tokenData.userId, text: comment },
        setLoading
      );
      
      toast.success("Commented successfully");
      setComment("");
      setCommentData(result?.comments || []);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || "Error posting comment";
      toast.error(errorMessage);
      console.error("Post error:", error);
    } finally {
      setLoading(false);
    }
  }, [comment, tokenData?.userId, video._id]);

  const handleReplySubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>, commentId: string) => {
    e.preventDefault();

    if (reply.trim().length < COMMENT_MIN_LENGTH) {
      toast.error("Reply must be at least 2 characters");
      return;
    }

    if (!tokenData?.userId) {
      toast.error("Log in first !!!");
      return;
    }

    try {
      setLoading(true);
      const result: any = await postRequest(
        `/video/${video._id}/comment/${commentId}`,
        { userId: tokenData.userId, text: reply },
        setLoading
      );
      toast.success("Replied successfully");
      setReply("");
      setReplyingTo(null);
      setCommentData(result?.comments || []);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || "Error posting reply";
      toast.error(errorMessage);
      console.error("Reply error:", error);
    } finally {
      setLoading(false);
    }
  }, [reply, tokenData?.userId, video._id]);

  const toggleBookmark = useCallback(async () => {
    if (!tokenData?.userId) {
      toast.error("Please log in to bookmark videos");
      return;
    }

    try {
      setLoading(true);
      const action = isBookmarked ? "removeBookmark" : "addBookmark";
      const message = `Video ${isBookmarked ? "unbookmarked" : "bookmarked"}!`;
      
      const result = await putRequest(
        `/video/${video._id}/bookmark`,
        { action, userId: tokenData.userId },
        setLoading
      );
      
      if (result?.message) {
        toast.success(result.message);
      } else {
        toast.success(message);
      }
      
      setIsBookmarked(!isBookmarked);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || "Error toggling bookmark";
      toast.error(errorMessage);
      console.error("Bookmark toggle error:", error);
    } finally {
      setLoading(false);
    }
  }, [isBookmarked, tokenData?.userId, video._id]);

  const handleVideoPlay = useCallback(async () => {
    try {
      const result = await putRequest(
        `/video/view/${video._id}`,
        { userId: tokenData?.userId },
        setLoading
      );
      if (result?.views !== undefined) {
        setViews(result.views);
      }
    } catch (error) {
      console.error("Error incrementing views:", error);
    }
  }, [tokenData?.userId, video._id]);

  const memoizedComments = useMemo(() => commentData, [commentData]);
  const authorInfo = useMemo(() => video?.author, [video?.author]);

  if (showModal) {
    return (
      <Modal
        isOpen={showModal}
        onRequestClose={handleCloseModal}
        contentLabel="Subscribe Now"
        style={{
          overlay: { backgroundColor: 'rgba(0, 0, 0, 0.75)' },
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
        <button
          onClick={handleCloseModal}
          style={{
            marginTop: '20px',
            padding: '10px 20px',
            background: '#fff',
            color: '#000',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Close
        </button>
      </Modal>
    );
  }

  return (
    <div>
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
          Your browser does not support the video tag.
        </video>
      </div>

      {/* Video Metadata and Actions */}
      <div className="mt-4 sm:flex justify-between items-center border-b pb-5 border-grey-200">
        {/* Video Information */}
        <div className="sm:w-3/5 ml-4">
          <h1 className="md:text-2xl font-bold mb-2 text-xl">{video?.title}</h1>

          <div className="flex sm:gap-10 gap-6 items-center">
            <address className="flex items-center justify-between mt-2">
              <div className="flex w-full overflow-hidden relative items-center">
                <div className="relative rounded-full w-8 h-8 flex-shrink-0">
                  <div
                    className="items-center rounded-full flex-shrink-0 justify-center bg-center bg-no-repeat bg-cover flex w-8 h-8"
                    style={{ backgroundImage: `url(${authorInfo?.avatar})` }}
                    title={authorInfo?.username}
                  />
                </div>
                <div className="text-xs sm:text-sm w-full">
                  <div className="flex items-center sm:ml-2 flex-grow">
                    <span className="overflow-hidden truncate">{authorInfo?.username}</span>
                    <MdVerifiedUser size="18" color="green" className="flex-shrink-0 sm:ml-2" />
                  </div>
                  <div className="sm:ml-2 w-full text-xs">
                    <span>
                      {formatDateAgo(video?.createdAt ?? video?.updatedAt)} <BsDot className="inline-flex items-center" /> {views} Views
                    </span>
                  </div>
                </div>
              </div>
            </address>
            <button
              onClick={handleFollowSubmit}
              disabled={loading}
              className={`btn text-white cursor-pointer px-6 md:py-2 py-1 rounded-full transition-colors ${
                isFollowing ? "bg-gray-500 hover:bg-gray-600" : "bg-yellow-500 hover:bg-yellow-600"
              }`}
            >
              {loading ? "Processing..." : isFollowing ? "Unsubscribe" : "Subscribe"}
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="button-container mt-4 sm:mt-0">
          <button
            disabled={loading}
            onClick={handleLikeClick}
            className={`button flex items-center justify-center gap-2 ${likes.isLiked ? "like" : "bookmark"}`}
            aria-label={`Like video (${likes.count} likes)`}
          >
            {likes.isLiked ? (
              <>
                <AiFillLike size="20" />
                <span>Liked</span>
              </>
            ) : (
              <>
                <AiOutlineLike size="20" />
                <span>Like</span>
              </>
            )}
            <span className="font-semibold">({likes.count})</span>
          </button>
          
          <button
            disabled={loading}
            onClick={handleDislikeClick}
            className={`button flex items-center justify-center gap-2 ${dislikes.isDisliked ? "dislike" : "bookmark"}`}
            aria-label={`Dislike video (${dislikes.count} dislikes)`}
          >
            {dislikes.isDisliked ? (
              <>
                <AiFillDislike size="20" />
                <span>Disliked</span>
              </>
            ) : (
              <>
                <AiOutlineDislike size="20" />
                <span>Dislike</span>
              </>
            )}
            <span className="font-semibold">({dislikes.count})</span>
          </button>

          <button
            onClick={toggleBookmark}
            className={`button flex items-center justify-center gap-2 ${isBookmarked ? "like" : "bookmark"}`}
            aria-label={isBookmarked ? "Remove bookmark" : "Add bookmark"}
          >
            {isBookmarked ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                <span>Bookmarked</span>
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                <span>Bookmark</span>
              </>
            )}
          </button>

          <button 
            className="button share flex items-center justify-center gap-2"
            aria-label="Share video"
          >
            <MdUpload size="20" />
            <span>Share</span>
          </button>
        </div>
      </div>

      <hr className="my-4" />

      {/* Comment Section */}
      <form
        onSubmit={handleCommentSubmit}
        className="sm:w-5/6 w-11/12 my-20 mx-auto relative"
      >
        <textarea
          placeholder="Add comment..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          className="w-full p-3 border-0 rounded-lg outline-none resize-none bg-gray-50 focus:bg-white focus:ring-2 focus:ring-yellow-500"
          aria-label="Add comment"
        />

        <button
          disabled={loading || comment.trim().length < 2}
          className="bg-yellow-500 p-2 text-white absolute bottom-5 right-5 border-0 rounded-lg outline-none hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
        >
          {loading ? "Posting..." : "Comment"}
        </button>
      </form>

      {/* Comments Display */}
      {memoizedComments.length > 0 ? (
        <div className="mt-4 sm:w-4/6 w-11/12 mx-auto mb-8">
          <h3 className="break-words sm:text-base text-sm mb-4 font-semibold text-gray-800">
            {memoizedComments.length} Comment{memoizedComments.length !== 1 ? 's' : ''}
          </h3>

          {memoizedComments.map((comment) => (
            <CommentItem
              key={comment._id}
              comment={comment}
              videoDate={video.updatedAt}
              replyingTo={replyingTo}
              onReplyToggle={(commentId: string) => setReplyingTo(replyingTo === commentId ? null : commentId)}
              onReplySubmit={handleReplySubmit}
              reply={reply}
              onReplyChange={setReply}
              loading={loading}
            />
          ))}
        </div>
      ) : (
        <div className="mt-4 sm:w-4/6 w-11/12 mx-auto text-center py-8">
          <div className="text-gray-400 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <p className="text-gray-500 text-lg font-medium">No comments yet</p>
          <p className="text-gray-400 text-sm mt-1">Be the first to comment!</p>
        </div>
      )}
    </div>
  );
};

// ========== Comment Item Component ==========
interface CommentItemProps {
  comment: Comment;
  videoDate: string;
  replyingTo: string | null;
  onReplyToggle: (id: string) => void;
  onReplySubmit: (e: React.FormEvent<HTMLFormElement>, commentId: string) => Promise<void>;
  reply: string;
  onReplyChange: (reply: string) => void;
  loading: boolean;
}

const CommentItem = React.memo((
  {
    comment,
    videoDate,
    replyingTo,
    onReplyToggle,
    onReplySubmit,
    reply,
    onReplyChange,
    loading
  }: CommentItemProps
) => {
  return (
    <section className="relative mb-5 gap-2 flex">
      <img
        src={comment.avatar}
        className="bg-white rounded-full w-8 h-8 flex-shrink-0 text-lg mr-1.5 block border border-gray-100"
        alt={`${comment.username} avatar`}
      />
      <div className="flex-1">
        <div className="flex gap-1 mb-3">
          <h4 className="m-0 sm:text-base text-sm text-gray-900 leading-4 font-semibold">
            {comment.username}
          </h4>
          <span className="m-0 italic sm:text-base text-sm text-gray-600 leading-4">
            {formatDateAgo(comment.chatedAt ?? videoDate)}
          </span>
        </div>
        <p className="break-words sm:text-base text-sm mb-2 text-gray-800">{comment.text}</p>

        {/* Reply Button */}
        <button
          className="text-sm text-blue-500 hover:text-blue-700 hover:underline transition-colors"
          onClick={() => onReplyToggle(comment._id)}
        >
          {replyingTo === comment._id ? "Cancel" : "Reply"}
        </button>

        {/* Reply Input */}
        {replyingTo === comment._id && (
          <form onSubmit={(e) => onReplySubmit(e, comment._id)} className="mt-3">
            <textarea
              placeholder="Add a reply..."
              value={reply}
              onChange={(e) => onReplyChange(e.target.value)}
              rows={2}
              className="w-full p-2 border rounded-md outline-none resize-none focus:ring-2 focus:ring-yellow-500"
              aria-label="Reply to comment"
            />
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => onReplyToggle(comment._id)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={loading || reply.trim().length < 2}
                className="bg-yellow-500 px-4 py-2 text-white border-0 rounded-lg hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
              >
                {loading ? "Posting..." : "Reply"}
              </button>
            </div>
          </form>
        )}

        {/* Replies Display */}
        {(comment.replies && comment.replies.length > 0) && (
          <div className="ml-4 mt-3 border-l-2 border-gray-300 pl-3">
            {(comment.replies || []).map((replyItem: Comment) => (
              <div key={replyItem._id} className="flex gap-2 mb-3">
                <img
                  src={replyItem.avatar}
                  className="bg-white rounded-full w-6 h-6 flex-shrink-0 border border-gray-100"
                  alt={`${replyItem.username} avatar`}
                />
                <div className="flex-1">
                  <h5 className="text-sm font-semibold text-gray-900">{replyItem.username}</h5>
                  <p className="text-sm break-words text-gray-800">{replyItem.text}</p>
                  <span className="text-xs text-gray-500">
                    {formatDateAgo(replyItem.chatedAt ?? videoDate)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
});

CommentItem.displayName = "CommentItem";

export default VideoPlayer;