// mainapi.ts - Updated with video and script routes
import axios from 'axios';

// Define base URL for your API
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Define interfaces for TypeScript
interface User {
  _id: string;
  username: string;
  email: string;
  avatar?: string;
  dob?: string;
  userType?: 'buyer' | 'seller';
  isAdmin?: boolean;
  isSubAdmin?: boolean;
  hasPaid?: boolean;
  lastPayment?: Date;
  followers?: string[];
  followings?: string[];
  isVerified?: boolean;
  authProvider?: 'email' | 'google';
  status?: boolean;
}

interface Video {
  _id: string;
  title: string;
  description: string;
  url?: string;
  file?: string;
  genre: string | string[];
  theme?: string | string[];
  rating?: string | string[];
  duration?: number;
  author?: User | string;
  slug?: string;
  status?: boolean;
  hidden?: boolean;
  likes?: string[];
  dislikes?: string[];
  bookmarks?: string[];
  comments?: Comment[];
  views?: number;
  isForSale?: boolean;
  hasPaid?: boolean;
  users?: string[];
  createdAt?: Date;
  updatedAt?: Date;
  genreCounts?: Record<string, number>;
  themeCounts?: Record<string, number>;
  ratingCounts?: Record<string, number>;
}

interface Script {
  _id: string;
  title: string;
  genre: string;
  script: string;
  author: User | string;
  isForSale?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface Comment {
  _id?: string;
  avatar?: string;
  username: string;
  text: string;
  chatedAt?: Date;
  replies?: Comment[];
}

interface History {
  _id: string;
  userId: string;
  videoId: Video | string;
  watchedAt: Date;
}

interface Transaction {
  _id: string;
  userId: string;
  username: string;
  email: string;
  orderId: string;
  payerId: string;
  amount: number;
  currency: string;
  createdAt: Date;
}

interface ContactMessage {
  _id: string;
  name: string;
  email: string;
  message: string;
  createdAt: Date;
}

interface Subscription {
  _id: string;
  userId: string;
  subscriptionType: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
}

interface AuthResponse {
  token: string;
  user: User;
  isVerified?: boolean;
}

interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
  count?: number;
  users?: User[];
  hasPaid?: boolean;
  isSubscribed?: boolean;
  video?: Video;
  videos?: Video[];
  scripts?: Script[];
  likesCount?: number;
  likes?: string[];
  isLiked?: boolean;
  isDisliked?: boolean;
  views?: number;
  history?: History[];
  chartData?: any;
  averageRating?: number;
  totalRatings?: number;
}

// Video and Script API service
export const videoApi = {
  // ==================== VIDEO CRUD OPERATIONS ====================
  
  // Create a video
  createVideo: async (videoData: {
    title: string;
    description: string;
    genre: string;
    theme?: string;
    rating?: string;
    isForSale?: boolean;
    file?: string;
    author?: string;
    role?: string;
    slug?: string;
    status?: boolean;
    users?: string[];
    hasPaid?: boolean;
  }): Promise<ApiResponse> => {
    try {
      const response = await api.post('/user/create', videoData);
      return response.data;
    } catch (error: any) {
      return { error: error.response?.data?.error || 'Failed to create video' };
    }
  },

  // Get all videos
  getAllVideos: async (): Promise<ApiResponse<Video[]>> => {
    try {
      const response = await api.get('/user/all');
      return { videos: response.data };
    } catch (error: any) {
      return { error: error.response?.data?.error || 'Failed to fetch videos' };
    }
  },

  // Get videos by user
  getVideosByUser: async (userId: string): Promise<ApiResponse<Video[]>> => {
    try {
      const response = await api.get(`/user/all/${userId}`);
      return { videos: response.data };
    } catch (error: any) {
      return { error: error.response?.data?.error || 'Failed to fetch user videos' };
    }
  },

  // Get video by ID or slug
  getVideoById: async (id: string): Promise<ApiResponse<Video>> => {
    try {
      const response = await api.get(`/user/${id}`);
      return { video: response.data };
    } catch (error: any) {
      return { error: error.response?.data?.error || 'Failed to fetch video' };
    }
  },

  // Edit video
  editVideo: async (videoId: string, videoData: {
    title?: string;
    description?: string;
    genre?: string;
    file?: string;
    thumbnail?: string;
    author?: string;
    slug?: string;
  }): Promise<ApiResponse> => {
    try {
      const response = await api.put(`/user/edit/${videoId}`, videoData);
      return response.data;
    } catch (error: any) {
      return { error: error.response?.data?.error || 'Failed to edit video' };
    }
  },

  // Delete video
  deleteVideo: async (videoId: string): Promise<ApiResponse> => {
    try {
      const response = await api.delete(`/user/delete/${videoId}`);
      return response.data;
    } catch (error: any) {
      return { error: error.response?.data?.error || 'Failed to delete video' };
    }
  },

  // ==================== VIDEO PUBLISHING/HIDING ====================
  
  // Publish video
  publishVideo: async (videoId: string): Promise<ApiResponse<Video>> => {
    try {
      const response = await api.patch(`/user/publish/${videoId}`);
      return response.data;
    } catch (error: any) {
      return { error: error.response?.data?.error || 'Failed to publish video' };
    }
  },

  // Unpublish video
  unpublishVideo: async (videoId: string): Promise<ApiResponse<Video>> => {
    try {
      const response = await api.patch(`/user/unpublish/${videoId}`);
      return response.data;
    } catch (error: any) {
      return { error: error.response?.data?.error || 'Failed to unpublish video' };
    }
  },

  // Hide video
  hideVideo: async (videoId: string): Promise<ApiResponse<Video>> => {
    try {
      const response = await api.patch(`/user/hide/${videoId}`);
      return response.data;
    } catch (error: any) {
      return { error: error.response?.data?.error || 'Failed to hide video' };
    }
  },

  // Unhide video
  unhideVideo: async (videoId: string): Promise<ApiResponse<Video>> => {
    try {
      const response = await api.patch(`/user/unhide/${videoId}`);
      return response.data;
    } catch (error: any) {
      return { error: error.response?.data?.error || 'Failed to unhide video' };
    }
  },

  // ==================== VIDEO INTERACTIONS ====================
  
  // Like/Dislike video
  likeVideo: async (videoId: string, action: 'like' | 'dislike', userId: string): Promise<ApiResponse> => {
    try {
      const response = await api.post(`/user/like/${videoId}`, { action, userId });
      return response.data;
    } catch (error: any) {
      return { error: error.response?.data?.error || 'Failed to process like/dislike' };
    }
  },

  // Get likes for video
  getLikes: async (videoId: string): Promise<ApiResponse<{ videoId: string, likesCount: number, likes: string[] }>> => {
    try {
      const response = await api.get(`/user/likes/${videoId}`);
      return response.data;
    } catch (error: any) {
      return { error: error.response?.data?.error || 'Failed to fetch likes' };
    }
  },

  // Dislike video
  dislikeVideo: async (videoId: string, userId: string): Promise<ApiResponse> => {
    try {
      const response = await api.post(`/user/dislike/${videoId}`, { userId });
      return response.data;
    } catch (error: any) {
      return { error: error.response?.data?.error || 'Failed to dislike video' };
    }
  },

  // Get dislikes for video
  getDislikes: async (videoId: string): Promise<ApiResponse<{ videoId: string, likesCount: number, likes: string[] }>> => {
    try {
      const response = await api.get(`/user/dislike/${videoId}`);
      return response.data;
    } catch (error: any) {
      return { error: error.response?.data?.error || 'Failed to fetch dislikes' };
    }
  },

  // Check like status
  getLikeStatus: async (videoId: string, userId: string): Promise<ApiResponse<{ isLiked: boolean, isDisliked: boolean }>> => {
    try {
      const response = await api.get(`/user/${videoId}/like-status/${userId}`);
      return response.data;
    } catch (error: any) {
      return { error: error.response?.data?.error || 'Failed to fetch like status' };
    }
  },

  // Bookmark video
  bookmarkVideo: async (videoId: string, userId: string): Promise<ApiResponse<Video>> => {
    try {
      const response = await api.post(`/user/${videoId}/bookmark`, { userId });
      return response.data;
    } catch (error: any) {
      return { error: error.response?.data?.error || 'Failed to bookmark video' };
    }
  },

  // Remove bookmark
  removeBookmark: async (videoId: string, userId: string): Promise<ApiResponse<Video>> => {
    try {
      const response = await api.delete(`/user/${videoId}/bookmark`, { data: { userId } });
      return response.data;
    } catch (error: any) {
      return { error: error.response?.data?.error || 'Failed to remove bookmark' };
    }
  },

  // ==================== VIDEO COMMENTS ====================
  
  // Add comment to video
  addComment: async (videoId: string, commentData: {
    userId: string;
    text: string;
  }): Promise<ApiResponse<Video>> => {
    try {
      const response = await api.post(`/user/${videoId}/comment`, commentData);
      return response.data;
    } catch (error: any) {
      return { error: error.response?.data?.error || 'Failed to add comment' };
    }
  },

  // Reply to comment
  replyToComment: async (videoId: string, commentId: string, replyData: {
    userId: string;
    text: string;
  }): Promise<ApiResponse> => {
    try {
      const response = await api.post(`/user/${videoId}/comment/${commentId}`, replyData);
      return response.data;
    } catch (error: any) {
      return { error: error.response?.data?.error || 'Failed to add reply' };
    }
  },

  // ==================== VIDEO FILTERS & SEARCH ====================
  
  // Get videos by rating
  getVideosByRating: async (rating: string): Promise<ApiResponse<Video[]>> => {
    try {
      const response = await api.get(`/user/ratings/${rating}`);
      return { videos: response.data };
    } catch (error: any) {
      return { error: error.response?.data?.error || 'Failed to fetch videos by rating' };
    }
  },

  // Get videos by theme
  getVideosByTheme: async (theme: string): Promise<ApiResponse<Video[]>> => {
    try {
      const response = await api.get(`/user/themes/${theme}`);
      return { videos: response.data };
    } catch (error: any) {
      return { error: error.response?.data?.error || 'Failed to fetch videos by theme' };
    }
  },

  // Search videos by genre
  searchVideosByGenre: async (genre: string): Promise<ApiResponse<Video[]>> => {
    try {
      const response = await api.get(`/user/search/${genre}`);
      return { videos: response.data };
    } catch (error: any) {
      return { error: error.response?.data?.error || 'Failed to search videos by genre' };
    }
  },

  // Get videos by category/genre
  getVideosByCategory: async (genre: string): Promise<ApiResponse<Video[]>> => {
    try {
      const response = await api.get(`/user/category/${genre}`);
      return { videos: response.data };
    } catch (error: any) {
      return { error: error.response?.data?.error || 'Failed to fetch videos by category' };
    }
  },

  // ==================== VIDEO ANALYTICS ====================
  
  // Get genre analytics graph
  getGenreGraph: async (from?: string, to?: string): Promise<ApiResponse<any>> => {
    try {
      const params: any = {};
      if (from) params.from = from;
      if (to) params.to = to;
      
      const response = await api.get('/user/genres/graph', { params });
      return { chartData: response.data };
    } catch (error: any) {
      return { error: error.response?.data?.error || 'Failed to fetch genre analytics' };
    }
  },

  // Get theme analytics graph
  getThemeGraph: async (from?: string, to?: string): Promise<ApiResponse<any>> => {
    try {
      const params: any = {};
      if (from) params.from = from;
      if (to) params.to = to;
      
      const response = await api.get('/user/themes/graph', { params });
      return { chartData: response.data };
    } catch (error: any) {
      return { error: error.response?.data?.error || 'Failed to fetch theme analytics' };
    }
  },

  // Get rating analytics graph
  getRatingGraph: async (from?: string, to?: string): Promise<ApiResponse<any>> => {
    try {
      const params: any = {};
      if (from) params.from = from;
      if (to) params.to = to;
      
      const response = await api.get('/user/ratings/graph', { params });
      return { chartData: response.data };
    } catch (error: any) {
      return { error: error.response?.data?.error || 'Failed to fetch rating analytics' };
    }
  },

  // Get video views
  getVideoViews: async (videoId: string): Promise<ApiResponse<{ views: number }>> => {
    try {
      const response = await api.get(`/user/views/${videoId}`);
      return response.data;
    } catch (error: any) {
      return { error: error.response?.data?.error || 'Failed to fetch video views' };
    }
  },

  // Increment video views
  incrementVideoView: async (videoId: string, userId: string): Promise<ApiResponse<{ views: number }>> => {
    try {
      const response = await api.put(`/user/view/${videoId}`, { userId });
      return response.data;
    } catch (error: any) {
      return { error: error.response?.data?.error || 'Failed to increment video view' };
    }
  },

  // ==================== VIDEO HISTORY ====================
  
  // Get user watch history
  getWatchHistory: async (userId: string): Promise<ApiResponse<History[]>> => {
    try {
      const response = await api.get(`/user/history/${userId}`);
      return { history: response.data };
    } catch (error: any) {
      return { error: error.response?.data?.error || 'Failed to fetch watch history' };
    }
  },

  // ==================== VIDEO STATUS MANAGEMENT ====================
  
  // Change all videos status
  changeAllVideosStatus: async (): Promise<ApiResponse> => {
    try {
      const response = await api.patch('/user/change-video-status');
      return response.data;
    } catch (error: any) {
      return { error: error.response?.data?.error || 'Failed to change all videos status' };
    }
  },

  // Change specific video status
  changeVideoStatus: async (videoId: string, status: boolean): Promise<ApiResponse<Video>> => {
    try {
      const response = await api.post('/user/change-video-status', { videoId, status });
      return response.data;
    } catch (error: any) {
      return { error: error.response?.data?.error || 'Failed to change video status' };
    }
  },

  // ==================== SCRIPT OPERATIONS ====================
  
  // Create script
  createScript: async (scriptData: {
    title: string;
    genre: string;
    script: string;
    author: string;
    isForSale?: boolean;
  }): Promise<ApiResponse<Script>> => {
    try {
      const response = await api.post('/user/scripts', scriptData);
      return response.data;
    } catch (error: any) {
      return { error: error.response?.data?.error || 'Failed to create script' };
    }
  },

  // Get all scripts
  getAllScripts: async (): Promise<ApiResponse<Script[]>> => {
    try {
      const response = await api.get('/user/author/scripts');
      return { scripts: response.data };
    } catch (error: any) {
      return { error: error.response?.data?.error || 'Failed to fetch scripts' };
    }
  },

  // Get scripts by author
  getScriptsByAuthor: async (authorId: string): Promise<ApiResponse<Script[]>> => {
    try {
      const response = await api.get(`/user/authors/${authorId}/scripts`);
      return { scripts: response.data };
    } catch (error: any) {
      return { error: error.response?.data?.error || 'Failed to fetch author scripts' };
    }
  },

  // Update script
  updateScript: async (scriptId: string, scriptData: {
    title?: string;
    genre?: string;
    script?: string;
    author?: string;
  }): Promise<ApiResponse<Script>> => {
    try {
      const response = await api.put(`/user/scripts/${scriptId}`, scriptData);
      return response.data;
    } catch (error: any) {
      return { error: error.response?.data?.error || 'Failed to update script' };
    }
  },

  // Delete script
  deleteScript: async (scriptId: string): Promise<ApiResponse> => {
    try {
      const response = await api.delete(`/user/scripts/${scriptId}`);
      return response.data;
    } catch (error: any) {
      return { error: error.response?.data?.error || 'Failed to delete script' };
    }
  },
};

// Main User API service with /user/ prefix
export const userApi = {
  // ... (Previous userApi functions remain the same)
  // Add all the user-related functions from previous file
  // ==================== AUTHENTICATION ROUTES ====================
  
  verifyEmail: async (email: string): Promise<ApiResponse> => {
    try {
      const response = await api.get('/user/verify-email', { params: { email } });
      return { message: response.data };
    } catch (error: any) {
      return { error: error.response?.data?.error || 'Email verification failed' };
    }
  },

  register: async (userData: {
    username: string;
    email: string;
    password: string;
    avatar?: string;
    dob?: string;
  }): Promise<ApiResponse> => {
    try {
      const response = await api.post('/user/register', userData);
      return response.data;
    } catch (error: any) {
      return { error: error.response?.data?.error || 'Registration failed' };
    }
  },

  login: async (email: string, password: string): Promise<ApiResponse<AuthResponse>> => {
    try {
      const response = await api.post('/user/login', { email, password });
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
      }
      return response.data;
    } catch (error: any) {
      return { error: error.response?.data?.error || 'Login failed' };
    }
  },

  signup: async (userData: {
    username: string;
    email: string;
    password?: string;
    avatar?: string;
    dob?: string;
    userType?: 'buyer' | 'seller';
    isGoogleAuth?: boolean;
  }): Promise<ApiResponse<AuthResponse>> => {
    try {
      const response = await api.post('/user/signup', userData);
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
      }
      return response.data;
    } catch (error: any) {
      return { error: error.response?.data?.error || 'Signup failed' };
    }
  },

  signin: async (credentials: {
    email: string;
    password?: string;
    isGoogleAuth?: boolean;
  }): Promise<ApiResponse<AuthResponse>> => {
    try {
      const response = await api.post('/user/signin', credentials);
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
      }
      return response.data;
    } catch (error: any) {
      return { error: error.response?.data?.error || 'Signin failed' };
    }
  },

  changePassword: async (data: {
    email: string;
    currentPassword: string;
    newPassword: string;
  }): Promise<ApiResponse> => {
    try {
      const response = await api.put('/user/change-password', data);
      return response.data;
    } catch (error: any) {
      return { error: error.response?.data?.error || 'Password change failed' };
    }
  },

  // ==================== USER MANAGEMENT ROUTES ====================
  
  getAllUsers: async (): Promise<ApiResponse<User[]>> => {
    try {
      const response = await api.get('/user/');
      return { data: response.data };
    } catch (error: any) {
      return { error: error.response?.data?.error || 'Failed to fetch users' };
    }
  },

  getUserById: async (userId: string): Promise<ApiResponse<User & { allowedGenres: string[] }>> => {
    try {
      const response = await api.get(`/user/${userId}`);
      return response.data;
    } catch (error: any) {
      return { error: error.response?.data?.error || 'Failed to fetch user' };
    }
  },

  getPaidUsers: async (): Promise<ApiResponse<User[]>> => {
    try {
      const response = await api.get('/user/paid-users');
      return { data: response.data };
    } catch (error: any) {
      return { error: error.response?.data?.error || 'Failed to fetch paid users' };
    }
  },

  getPaymentUser: async (userId: string): Promise<ApiResponse<User & { allowedGenres: string[] }>> => {
    try {
      const response = await api.get(`/user/payment/user/${userId}`);
      return response.data;
    } catch (error: any) {
      return { error: error.response?.data?.error || 'Failed to fetch user for payment' };
    }
  },

  followUser: async (targetUserId: string, action: 'follow' | 'unfollow', userId: string): Promise<ApiResponse<User>> => {
    try {
      const response = await api.put(`/user/${targetUserId}/follow`, { action, userId });
      return { data: response.data };
    } catch (error: any) {
      return { error: error.response?.data?.error || 'Follow action failed' };
    }
  },

  editUser: async (userId: string, userData: {
    username?: string;
    email?: string;
    password?: string;
    avatar?: string;
    dob?: string;
  }): Promise<ApiResponse<User>> => {
    try {
      const response = await api.put(`/user/edit/${userId}`, userData);
      return response.data;
    } catch (error: any) {
      return { error: error.response?.data?.error || 'Failed to update user' };
    }
  },

  changeUserType: async (userId: string, userType: 'buyer' | 'seller'): Promise<ApiResponse<User>> => {
    try {
      const response = await api.put(`/user/change-type/${userId}`, { userType });
      return response.data;
    } catch (error: any) {
      return { error: error.response?.data?.error || 'Failed to change user type' };
    }
  },

  deleteUser: async (userId: string): Promise<ApiResponse> => {
    try {
      const response = await api.delete(`/user/delete/${userId}`);
      return response.data;
    } catch (error: any) {
      return { error: error.response?.data?.error || 'Failed to delete user' };
    }
  },

  // ==================== PAYMENT & SUBSCRIPTION ROUTES ====================
  
  getPaymentStatus: async (userId: string): Promise<ApiResponse<{ hasPaid: boolean, lastPayment?: Date }>> => {
    try {
      const response = await api.get(`/user/payment-status/${userId}`);
      return response.data;
    } catch (error: any) {
      return { error: error.response?.data?.error || 'Failed to fetch payment status' };
    }
  },

  getSubscriptionStatus: async (userId: string): Promise<ApiResponse<{ isSubscribed: boolean, subscription?: Subscription }>> => {
    try {
      const response = await api.get(`/user/status/${userId}`);
      return response.data;
    } catch (error: any) {
      return { error: error.response?.data?.error || 'Failed to fetch subscription status' };
    }
  },

  saveTransaction: async (transactionData: {
    userId: string;
    username: string;
    email: string;
    orderId: string;
    payerId: string;
    amount: number;
    currency: string;
    subscriptionType: string;
  }): Promise<ApiResponse> => {
    try {
      const response = await api.post('/user/save-transaction', transactionData);
      return response.data;
    } catch (error: any) {
      return { error: error.response?.data?.error || 'Failed to save transaction' };
    }
  },

  updatePaymentStatus: async (userId: string, hasPaid: boolean): Promise<ApiResponse> => {
    try {
      const response = await api.post('/user/update-payment-status', { userId, hasPaid });
      return response.data;
    } catch (error: any) {
      return { error: error.response?.data?.error || 'Failed to update payment status' };
    }
  },

  // ==================== CONTACT & ORDERS ====================
  
  submitContact: async (contactData: {
    name: string;
    email: string;
    message: string;
  }): Promise<ApiResponse> => {
    try {
      const response = await api.post('/user/contact', contactData);
      return response.data;
    } catch (error: any) {
      return { error: error.response?.data?.error || 'Failed to submit contact form' };
    }
  },

  createOrder: async (orderData: {
    chatId: string;
    description: string;
    price: number;
    createdBy: string;
  }): Promise<ApiResponse<{ orderId: string }>> => {
    try {
      const response = await api.post('/user/orders', orderData);
      return response.data;
    } catch (error: any) {
      return { error: error.response?.data?.error || 'Failed to create order' };
    }
  },

  // ==================== ADMIN SPECIFIC ROUTES ====================
  
  getTransactions: async (): Promise<ApiResponse<Transaction[]>> => {
    try {
      const response = await api.get('/user/transactions');
      return { data: response.data };
    } catch (error: any) {
      return { error: error.response?.data?.error || 'Failed to fetch transactions' };
    }
  },

  getUserTransactions: async (userId: string): Promise<ApiResponse<Transaction[]>> => {
    try {
      const response = await api.get(`/user/transactions/${userId}`);
      return { data: response.data };
    } catch (error: any) {
      return { error: error.response?.data?.error || 'Failed to fetch user transactions' };
    }
  },

  // ==================== STATUS MANAGEMENT ====================
  
  changeAllUsersStatus: async (): Promise<ApiResponse> => {
    try {
      const response = await api.put('/user/change-user-status');
      return response.data;
    } catch (error: any) {
      return { error: error.response?.data?.error || 'Failed to change all users status' };
    }
  },

  changeUserStatus: async (userId: string, status: boolean): Promise<ApiResponse<User>> => {
    try {
      const response = await api.post('/user/change-user-status', { userId, status });
      return response.data;
    } catch (error: any) {
      return { error: error.response?.data?.error || 'Failed to change user status' };
    }
  },

  // ==================== UTILITY FUNCTIONS ====================
  
  verifyToken: async (token: string): Promise<ApiResponse<any>> => {
    try {
      const response = await api.post('/user/verify-token', { token });
      return { data: response.data };
    } catch (error: any) {
      return { error: error.response?.data?.error || 'Token verification failed' };
    }
  },

  logout: (): void => {
    localStorage.removeItem('token');
  },

  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('token');
  },

  getToken: (): string | null => {
    return localStorage.getItem('token');
  },

  setToken: (token: string): void => {
    localStorage.setItem('token', token);
  },
};

// Separate admin API for routes that don't have /user/ prefix
export const adminApi = {
  // ... (Previous adminApi functions remain the same)
  register: async (userData: {
    email: string;
    password: string;
    username: string;
    dob: string;
    isAdmin: boolean;
    isSubAdmin: boolean;
  }): Promise<ApiResponse<User>> => {
    try {
      const response = await api.post('/admin/register', userData);
      return response.data;
    } catch (error: any) {
      return { error: error.response?.data?.error || 'Registration failed' };
    }
  },

  login: async (email: string, password: string): Promise<ApiResponse<AuthResponse>> => {
    try {
      const response = await api.post('/admin/login', { email, password });
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
      }
      return response.data;
    } catch (error: any) {
      return { error: error.response?.data?.error || 'Login failed' };
    }
  },

  getPrivilegedUsers: async (role?: 'admin' | 'subadmin' | 'both'): Promise<ApiResponse<{ users: User[], count: number }>> => {
    try {
      const params = role ? { role } : {};
      const response = await api.get('/admin/users', { params });
      return response.data;
    } catch (error: any) {
      return { error: error.response?.data?.error || 'Failed to fetch users' };
    }
  },

  addAdminPrivileges: async (email: string): Promise<ApiResponse<User>> => {
    try {
      const response = await api.put('/admin/add', { email });
      return response.data;
    } catch (error: any) {
      return { error: error.response?.data?.error || 'Failed to add admin privileges' };
    }
  },

  removePrivileges: async (userId: string, options?: {
    removeAll?: boolean;
    removeAdmin?: boolean;
    removeSubAdmin?: boolean;
  }): Promise<ApiResponse<User>> => {
    try {
      const response = await api.put(`/admin/remove/${userId}`, options);
      return response.data;
    } catch (error: any) {
      return { error: error.response?.data?.error || 'Failed to remove privileges' };
    }
  },
};

// Export default api instance
export default api;

// Usage examples:
/*
import { videoApi, userApi, adminApi } from './mainapi';

// Video operations
const fetchVideos = async () => {
  const result = await videoApi.getAllVideos();
  if (result.videos) {
    console.log('Videos:', result.videos);
  }
};

// Like a video
const likeVideo = async (videoId: string, userId: string) => {
  const result = await videoApi.likeVideo(videoId, 'like', userId);
  if (result.error) {
    console.error(result.error);
  } else {
    console.log('Video liked');
  }
};

// Create script
const createScript = async () => {
  const result = await videoApi.createScript({
    title: 'My Script',
    genre: 'Drama',
    script: 'Script content here',
    author: 'userId123',
    isForSale: true
  });
  
  if (result.error) {
    console.error(result.error);
  } else {
    console.log('Script created:', result.data);
  }
};

// Get watch history
const getHistory = async (userId: string) => {
  const result = await videoApi.getWatchHistory(userId);
  if (result.history) {
    console.log('Watch history:', result.history);
  }
};
*/