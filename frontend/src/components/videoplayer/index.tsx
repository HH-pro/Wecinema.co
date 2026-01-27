import React, { useEffect, useState, useCallback, useMemo } from "react";
import { BsDot } from "react-icons/bs";
import { MdPlayArrow, MdUpload, MdVerifiedUser } from "react-icons/md";
import { AiFillDislike, AiFillLike, AiOutlineDislike, AiOutlineLike } from "react-icons/ai";
import { formatDateAgo } from "../../utilities/helperfFunction";
import { getRequest, postRequest, putRequest, API_BASE_URL, bookmarkVideo, unbookmarkVideo, getUserVideoBookmarks } from "../../api";
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

        if (likeStatus) {
          setLikes({
            count: videoData.likes?.length || 0,
            isLiked: likeStatus.isLiked || false
          });
          setDislikes({
            count: videoData.dislikes?.length || 0,
            isDisliked: likeStatus.isDisliked || false
          });
        }

        // Fetch payment statuses in parallel
        const paymentPromises = [];
        if (video.author?._id) {
          paymentPromises.push(
            axios.get(`${API_BASE_URL}/user/payment-status/${video.author._id}`)
              .catch(err => console.error("Author payment status error:", err))
          );
        }
        if (tokenData?.userId) {
          paymentPromises.push(
            axios.get(`${API_BASE_URL}/user/payment-status/${tokenData.userId}`)
              .catch(err => console.error("User payment status error:", err))
          );
        }

        const paymentResults = await Promise.all(paymentPromises);
        if (paymentResults[0]) setUserHasPaid(paymentResults[0].data.hasPaid);
        if (paymentResults[1]) setCurrentUserHasPaid(paymentResults[1].data.hasPaid);
      } catch (error) {
        console.error("Error fetching video data:", error);
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
      const newIsLiked = !likes.isLiked;

      // Optimistic update
      setLikes(prev => ({
        isLiked: newIsLiked,
        count: newIsLiked ? prev.count + 1 : prev.count - 1
      }));

      if (dislikes.isDisliked) {
        setDislikes(prev => ({
          isDisliked: false,
          count: prev.count - 1
        }));
      }

      await postRequest(`/video/like/${video._id}`, {
        userId: tokenData.userId,
        action: newIsLiked ? 'like' : 'unlike'
      }, setLoading);
    } catch (error) {
      setLikes(prev => ({
        isLiked: !prev.isLiked,
        count: prev.isLiked ? prev.count - 1 : prev.count + 1
      }));
      toast.error("Error updating like");
      console.error("Like error:", error);
    } finally {
      setLoading(false);
    }
  }, [likes.isLiked, dislikes.isDisliked, tokenData?.userId, video._id]);

  const handleDislikeClick = useCallback(async () => {
    if (!tokenData?.userId) {
      toast.error("Please log in to dislike videos");
      return;
    }

    try {
      setLoading(true);
      const newIsDisliked = !dislikes.isDisliked;

      setDislikes(prev => ({
        isDisliked: newIsDisliked,
        count: newIsDisliked ? prev.count + 1 : prev.count - 1
      }));

      if (likes.isLiked) {
        setLikes(prev => ({
          isLiked: false,
          count: prev.count - 1
        }));
      }

      await postRequest(`/video/dislike/${video._id}`, {
        userId: tokenData.userId,
        action: newIsDisliked ? 'dislike' : 'undislike'
      }, setLoading);
    } catch (error) {
      setDislikes(prev => ({
        isDisliked: !prev.isDisliked,
        count: prev.isDisliked ? prev.count - 1 : prev.count + 1
      }));
      toast.error("Error updating dislike");
      console.error("Dislike error:", error);
    } finally {
      setLoading(false);
    }
  }, [dislikes.isDisliked, likes.isLiked, tokenData?.userId, video._id]);

  const handleFollowSubmit = useCallback(async () => {
    if (!tokenData?.userId) {
      toast.error("Please log in to subscribe");
      return;
    }

    try {
      setLoading(true);
      const action = isFollowing ? "unfollow" : "follow";
      setIsFollowing(!isFollowing);

      await putRequest(
        `/user/${video.author?._id}/follow`,
        { action, userId: tokenData.userId },
        setLoading
      );

      toast.success(`Successfully ${action === "follow" ? "subscribed" : "unsubscribed"}`);
    } catch (error) {
      setIsFollowing(prev => !prev);
      toast.error("Error updating subscription");
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
      toast.error(error.message || "Error posting comment");
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
      toast.error(error.message || "Error posting reply");
      console.error("Reply error:", error);
    } finally {
      setLoading(false);
    }
  }, [reply, tokenData?.userId, video._id]);

  const toggleBookmark = useCallback(async () => {
    try {
      setLoading(true);
      const action = isBookmarked ? "removeBookmark" : "addBookmark";
      const message = `Video ${isBookmarked ? "Unbookmarked" : "Bookmarked"}!`;
      await putRequest(
        `/video/${video._id}`,
        { action, userId: tokenData?.userId },
        setLoading
      );
      toast.success(message);
      setIsBookmarked(!isBookmarked);
    } catch (error) {
      toast.error("Error toggling bookmark");
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
      setViews(result.views);
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
              <a href="#" className="flex w-full overflow-hidden relative items-center">
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
              </a>
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
        <div className="button-container">
          <button
            disabled={loading}
            onClick={handleLikeClick}
            className={`button ${likes.isLiked ? "like" : "bookmark"}`}
            aria-label={`Like video (${likes.count} likes)`}
          >
            {likes.isLiked ? <AiFillLike size="20" /> : <AiOutlineLike size="20" />}
            {likes.count}
          </button>
          <button
            disabled={loading}
            onClick={handleDislikeClick}
            className={`button ${dislikes.isDisliked ? "dislike" : "bookmark"}`}
            aria-label={`Dislike video (${dislikes.count} dislikes)`}
          >
            {dislikes.isDisliked ? <AiFillDislike size="20" /> : <AiOutlineDislike size="20" />}
            {dislikes.count}
          </button>

          <button
            onClick={toggleBookmark}
            className={`button ${isBookmarked ? "like" : "bookmark"}`}
            aria-label={isBookmarked ? "Remove bookmark" : "Add bookmark"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {isBookmarked ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              )}
            </svg>
          </button>

          <button className="button share" aria-label="Share video">
            <MdUpload size="20" />
            Share
          </button>
        </div>
      </div>

      <hr />

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
          className="w-full p-3 border-0 rounded-lg outline-none resize-none"
          aria-label="Add comment"
        />

        <button
          disabled={loading || comment.trim().length < 2}
          className="bg-yellow-500 p-2 text-white absolute bottom-5 right-5 border-0 rounded-lg outline-none hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
        >
          Comment
        </button>
      </form>

      {/* Comments Display */}
      {memoizedComments.length > 0 ? (
        <div className="mt-4 sm:w-4/6 w-11/12 mx-auto mb-8">
          <h3 className="break-words sm:text-base text-sm mb-4 font-semibold">
            {memoizedComments.length} Comments
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
        <p className="mt-4 sm:w-4/6 w-11/12 mx-auto text-center text-gray-500">
          No comments yet. Be the first to comment!
        </p>
      )}
    </div>
  );
};

// ========== Subscription Modal Component ==========
interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SubscriptionModal: React.FC<SubscriptionModalProps> = React.memo(({ isOpen, onClose }) => (
  <Modal
    isOpen={isOpen}
    onRequestClose={onClose}
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
      onClick={onClose}
      style={{
        marginTop: '20px',
        padding: '10px 20px',
        background: '#fff',
        color: '#000',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontWeight: 'bold',
        transition: 'transform 0.2s'
      }}
    >
      Close
    </button>
  </Modal>
  )
);

SubscriptionModal.displayName = "SubscriptionModal";
interface ActionButtonsProps {
  likes: LikeState;
  dislikes: DislikeState;
  isBookmarked: boolean;
  loading: boolean;
  onLike: () => void;
  onDislike: () => void;
  onBookmark: () => void;
}

const ActionButtons = React.memo((props: ActionButtonsProps) => (
  <div className="button-container">
    <button
      disabled={props.loading}
      onClick={props.onLike}
      className={`button ${props.likes.isLiked ? "like" : "bookmark"}`}
      aria-label={`Like video (${props.likes.count} likes)`}
    >
      {props.likes.isLiked ? <AiFillLike size="20" /> : <AiOutlineLike size="20" />}
      {props.likes.count}
    </button>
    <button
      disabled={props.loading}
      onClick={props.onDislike}
      className={`button ${props.dislikes.isDisliked ? "dislike" : "bookmark"}`}
      aria-label={`Dislike video (${props.dislikes.count} dislikes)`}
    >
      {props.dislikes.isDisliked ? <AiFillDislike size="20" /> : <AiOutlineDislike size="20" />}
      {props.dislikes.count}
    </button>

    <button
      onClick={props.onBookmark}
      className={`button ${props.isBookmarked ? "like" : "bookmark"}`}
      aria-label={props.isBookmarked ? "Remove bookmark" : "Add bookmark"}
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        {props.isBookmarked ? (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        )}
      </svg>
    </button>

    <button className="button share" aria-label="Share video">
      <MdUpload size="20" />
      Share
    </button>
  </div>
));

ActionButtons.displayName = "ActionButtons";

// ========== Author Info Component ==========
interface AuthorInfoProps {
  author: Video["author"];
  title: string;
  createdAt: string;
  updatedAt: string;
  views: number;
  isFollowing: boolean;
  loading: boolean;
  onFollow: () => void;
}

const AuthorInfo = React.memo((props: AuthorInfoProps) => (
  <div className="sm:w-3/5 ml-4">
    <h1 className="md:text-2xl font-bold mb-2 text-xl">{props.title}</h1>

    <div className="flex sm:gap-10 gap-6 items-center">
      <address className="flex items-center justify-between mt-2">
        <a href="#" className="flex w-full overflow-hidden relative items-center">
          <div className="relative rounded-full w-8 h-8 flex-shrink-0">
            <div
              className="items-center rounded-full flex-shrink-0 justify-center bg-center bg-no-repeat bg-cover flex w-8 h-8"
              style={{ backgroundImage: `url(${props.author?.avatar})` }}
              title={props.author?.username}
            />
          </div>
          <div className="text-xs sm:text-sm w-full">
            <div className="flex items-center sm:ml-2 flex-grow">
              <span className="overflow-hidden truncate">{props.author?.username}</span>
              <MdVerifiedUser size="18" color="green" className="flex-shrink-0 sm:ml-2" />
            </div>
            <div className="sm:ml-2 w-full text-xs">
              <span>
                {formatDateAgo(props.createdAt ?? props.updatedAt)} <BsDot className="inline-flex items-center" /> {props.views} Views
              </span>
            </div>
          </div>
        </a>
      </address>
      <button
        onClick={props.onFollow}
        disabled={props.loading}
        className={`btn text-white cursor-pointer px-6 md:py-2 py-1 rounded-full transition-colors ${
          props.isFollowing ? "bg-gray-500 hover:bg-gray-600" : "bg-yellow-500 hover:bg-yellow-600"
        }`}
      >
        {props.loading ? "Processing..." : props.isFollowing ? "Unsubscribe" : "Subscribe"}
      </button>
    </div>
  </div>
));

AuthorInfo.displayName = "AuthorInfo";

// ========== Reply Item Component ==========
interface ReplyItemProps {
  reply: Comment;
  videoDate: string;
}

const ReplyItem = React.memo(({ reply, videoDate }: ReplyItemProps) => (
  <div className="flex gap-2 mb-3">
    <img
      src={reply.avatar}
      className="bg-white rounded-full w-6 h-6 flex-shrink-0 border border-gray-100"
      alt={`${reply.username} avatar`}
    />
    <div className="flex-1">
      <h5 className="text-sm font-semibold">{reply.username}</h5>
      <p className="text-sm break-words">{reply.text}</p>
      <span className="text-xs text-gray-500">
        {formatDateAgo(reply.chatedAt ?? videoDate)}
      </span>
    </div>
  </div>
));

ReplyItem.displayName = "ReplyItem";

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
          <h4 className="m-0 sm:text-base text-sm text-cyan-950 leading-4 font-semibold">
            {comment.username}
          </h4>
          <span className="m-0 italic sm:text-base text-sm text-gray-600 leading-4">
            {formatDateAgo(comment.chatedAt ?? videoDate)}
          </span>
        </div>
        <p className="break-words sm:text-base text-sm mb-2">{comment.text}</p>

        {/* Reply Button */}
        <button
          className="text-sm text-blue-500 hover:underline transition-colors"
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
              className="w-full p-2 border rounded-md outline-none resize-none"
              aria-label="Reply to comment"
            />
            <button
              disabled={loading || reply.trim().length < 2}
              className="bg-yellow-500 p-2 mt-2 text-white border-0 rounded-lg hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              Reply
            </button>
          </form>
        )}

        {/* Replies Display */}
        {(comment.replies && comment.replies.length > 0) && (
          <div className="ml-4 mt-3 border-l-2 border-gray-300 pl-3">
            {(comment.replies || []).map((replyItem: Comment) => (
              <ReplyItem
                key={replyItem._id}
                reply={replyItem}
                videoDate={videoDate}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
});

CommentItem.displayName = "CommentItem";

export default VideoPlayer;