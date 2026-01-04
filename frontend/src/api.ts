// api.ts - Complete API service file
import axios from 'axios';

// Define base URL for your API
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 seconds timeout
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

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      // Redirect to login page if not already there
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ==================== INTERFACES ====================

export interface User {
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
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Video {
  _id: string;
  title: string;
  description: string;
  url?: string;
  file?: string;
  thumbnail?: string;
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
}

export interface Script {
  _id: string;
  title: string;
  genre: string;
  script: string;
  author: User | string;
  isForSale?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Comment {
  _id?: string;
  avatar?: string;
  username: string;
  text: string;
  chatedAt?: Date;
  replies?: Comment[];
}

export interface History {
  _id: string;
  userId: string;
  videoId: Video | string;
  watchedAt: Date;
}

export interface Transaction {
  _id: string;
  userId: string;
  username: string;
  email: string;
  orderId: string;
  payerId: string;
  amount: number;
  currency: string;
  subscriptionType?: string;
  createdAt: Date;
}

export interface ContactMessage {
  _id: string;
  name: string;
  email: string;
  message: string;
  createdAt: Date;
}

export interface Subscription {
  _id: string;
  userId: string;
  subscriptionType: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
  isVerified?: boolean;
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
  count?: number;
  hasPaid?: boolean;
  isSubscribed?: boolean;
  video?: Video;
  videos?: Video[];
  scripts?: Script[];
  users?: User[];
  transactions?: Transaction[];
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

// ==================== GENERIC REQUEST FUNCTIONS ====================

export const getRequest = async <T>(endpoint: string, params?: any): Promise<ApiResponse<T>> => {
  try {
    const response = await api.get(endpoint, { params });
    return response.data;
  } catch (error: any) {
    console.error(`GET ${endpoint} error:`, error);
    return { 
      error: error.response?.data?.error || error.message || 'Request failed' 
    };
  }
};

export const postRequest = async <T>(endpoint: string, data: any): Promise<ApiResponse<T>> => {
  try {
    const response = await api.post(endpoint, data);
    return response.data;
  } catch (error: any) {
    console.error(`POST ${endpoint} error:`, error);
    return { 
      error: error.response?.data?.error || error.message || 'Request failed' 
    };
  }
};

export const putRequest = async <T>(endpoint: string, data: any): Promise<ApiResponse<T>> => {
  try {
    const response = await api.put(endpoint, data);
    return response.data;
  } catch (error: any) {
    console.error(`PUT ${endpoint} error:`, error);
    return { 
      error: error.response?.data?.error || error.message || 'Request failed' 
    };
  }
};

export const patchRequest = async <T>(endpoint: string, data: any): Promise<ApiResponse<T>> => {
  try {
    const response = await api.patch(endpoint, data);
    return response.data;
  } catch (error: any) {
    console.error(`PATCH ${endpoint} error:`, error);
    return { 
      error: error.response?.data?.error || error.message || 'Request failed' 
    };
  }
};

export const deleteRequest = async <T>(endpoint: string, data?: any): Promise<ApiResponse<T>> => {
  try {
    const config = data ? { data } : {};
    const response = await api.delete(endpoint, config);
    return response.data;
  } catch (error: any) {
    console.error(`DELETE ${endpoint} error:`, error);
    return { 
      error: error.response?.data?.error || error.message || 'Request failed' 
    };
  }
};

// ==================== AUTHENTICATION API ====================

export const authApi = {
  // Admin registration
  adminRegister: async (userData: {
    email: string;
    password: string;
    username: string;
    dob: string;
    isAdmin: boolean;
    isSubAdmin: boolean;
  }): Promise<ApiResponse<User>> => {
    return postRequest<User>('/admin/register', userData);
  },

  // Admin login
  adminLogin: async (email: string, password: string): Promise<ApiResponse<AuthResponse>> => {
    const result = await postRequest<AuthResponse>('/admin/login', { email, password });
    if (result.token) {
      localStorage.setItem('token', result.token);
    }
    return result;
  },

  // User registration
  register: async (userData: {
    username: string;
    email: string;
    password: string;
    avatar?: string;
    dob?: string;
  }): Promise<ApiResponse> => {
    return postRequest('/user/register', userData);
  },

  // User login
  login: async (email: string, password: string): Promise<ApiResponse<AuthResponse>> => {
    const result = await postRequest<AuthResponse>('/user/login', { email, password });
    if (result.token) {
      localStorage.setItem('token', result.token);
    }
    return result;
  },

  // Signup (email or Google)
  signup: async (userData: {
    username: string;
    email: string;
    password?: string;
    avatar?: string;
    dob?: string;
    userType?: 'buyer' | 'seller';
    isGoogleAuth?: boolean;
  }): Promise<ApiResponse<AuthResponse>> => {
    const result = await postRequest<AuthResponse>('/user/signup', userData);
    if (result.token) {
      localStorage.setItem('token', result.token);
    }
    return result;
  },

  // Signin (email or Google)
  signin: async (credentials: {
    email: string;
    password?: string;
    isGoogleAuth?: boolean;
  }): Promise<ApiResponse<AuthResponse>> => {
    const result = await postRequest<AuthResponse>('/user/signin', credentials);
    if (result.token) {
      localStorage.setItem('token', result.token);
    }
    return result;
  },

  // Change password
  changePassword: async (data: {
    email: string;
    currentPassword: string;
    newPassword: string;
  }): Promise<ApiResponse> => {
    return putRequest('/user/change-password', data);
  },

  // Verify email
  verifyEmail: async (email: string): Promise<ApiResponse> => {
    return getRequest('/user/verify-email', { email });
  },

  // Verify token
  verifyToken: async (token: string): Promise<ApiResponse> => {
    return postRequest('/user/verify-token', { token });
  },

  // Logout
  logout: (): void => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  // Check authentication
  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('token');
  },

  // Get token
  getToken: (): string | null => {
    return localStorage.getItem('token');
  },

  // Set token
  setToken: (token: string): void => {
    localStorage.setItem('token', token);
  },

  // Get current user from localStorage
  getCurrentUser: (): User | null => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  // Set current user in localStorage
  setCurrentUser: (user: User): void => {
    localStorage.setItem('user', JSON.stringify(user));
  },

  // Clear auth data
  clearAuth: (): void => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
};

// ==================== USER API ====================

export const userApi = {
  // Get all users
  getAllUsers: async (): Promise<ApiResponse<User[]>> => {
    return getRequest<User[]>('/user/');
  },

  // Get user by ID
  getUserById: async (userId: string): Promise<ApiResponse<User & { allowedGenres: string[] }>> => {
    return getRequest(`/user/${userId}`);
  },

  // Get paid users
  getPaidUsers: async (): Promise<ApiResponse<User[]>> => {
    return getRequest<User[]>('/user/paid-users');
  },

  // Get payment user
  getPaymentUser: async (userId: string): Promise<ApiResponse<User & { allowedGenres: string[] }>> => {
    return getRequest(`/user/payment/user/${userId}`);
  },

  // Follow/Unfollow user
  followUser: async (targetUserId: string, action: 'follow' | 'unfollow', userId: string): Promise<ApiResponse<User>> => {
    return putRequest(`/user/${targetUserId}/follow`, { action, userId });
  },

  // Edit user profile
  editUser: async (userId: string, userData: {
    username?: string;
    email?: string;
    password?: string;
    avatar?: string;
    dob?: string;
  }): Promise<ApiResponse<User>> => {
    return putRequest(`/user/edit/${userId}`, userData);
  },

  // Change user type
  changeUserType: async (userId: string, userType: 'buyer' | 'seller'): Promise<ApiResponse<User>> => {
    return putRequest(`/user/change-type/${userId}`, { userType });
  },

  // Delete user
  deleteUser: async (userId: string): Promise<ApiResponse> => {
    return deleteRequest(`/user/delete/${userId}`);
  },

  // Get payment status
  getPaymentStatus: async (userId: string): Promise<ApiResponse<{ hasPaid: boolean, lastPayment?: Date }>> => {
    return getRequest(`/user/payment-status/${userId}`);
  },

  // Get subscription status
  getSubscriptionStatus: async (userId: string): Promise<ApiResponse<{ isSubscribed: boolean, subscription?: Subscription }>> => {
    return getRequest(`/user/status/${userId}`);
  },

  // Save transaction
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
    return postRequest('/user/save-transaction', transactionData);
  },

  // Update payment status
  updatePaymentStatus: async (userId: string, hasPaid: boolean): Promise<ApiResponse> => {
    return postRequest('/user/update-payment-status', { userId, hasPaid });
  },

  // Submit contact form
  submitContact: async (contactData: {
    name: string;
    email: string;
    message: string;
  }): Promise<ApiResponse> => {
    return postRequest('/user/contact', contactData);
  },

  // Create order
  createOrder: async (orderData: {
    chatId: string;
    description: string;
    price: number;
    createdBy: string;
  }): Promise<ApiResponse<{ orderId: string }>> => {
    return postRequest('/user/orders', orderData);
  },

  // Get all transactions (admin)
  getTransactions: async (): Promise<ApiResponse<Transaction[]>> => {
    return getRequest<Transaction[]>('/user/transactions');
  },

  // Get user transactions (admin)
  getUserTransactions: async (userId: string): Promise<ApiResponse<Transaction[]>> => {
    return getRequest<Transaction[]>(`/user/transactions/${userId}`);
  },

  // Change all users status
  changeAllUsersStatus: async (): Promise<ApiResponse> => {
    return putRequest('/user/change-user-status', {});
  },

  // Change user status
  changeUserStatus: async (userId: string, status: boolean): Promise<ApiResponse<User>> => {
    return postRequest('/user/change-user-status', { userId, status });
  },

  // Get user's followings
  getFollowings: async (userId: string): Promise<ApiResponse<User[]>> => {
    const user = await userApi.getUserById(userId);
    if (user.data?.followings) {
      // You might want to fetch detailed user info for each following
      return { data: [] as User[] }; // Implement based on your needs
    }
    return { data: [] };
  },

  // Get user's followers
  getFollowers: async (userId: string): Promise<ApiResponse<User[]>> => {
    const user = await userApi.getUserById(userId);
    if (user.data?.followers) {
      // You might want to fetch detailed user info for each follower
      return { data: [] as User[] }; // Implement based on your needs
    }
    return { data: [] };
  },
};

// ==================== VIDEO API ====================

export const videoApi = {
  // Create video
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
    return postRequest('/user/create', videoData);
  },

  // Get all videos
  getAllVideos: async (): Promise<ApiResponse<Video[]>> => {
    return getRequest<Video[]>('/user/all');
  },

  // Get videos by user
  getVideosByUser: async (userId: string): Promise<ApiResponse<Video[]>> => {
    return getRequest<Video[]>(`/user/all/${userId}`);
  },

  // Get video by ID or slug
  getVideoById: async (id: string): Promise<ApiResponse<Video>> => {
    return getRequest<Video>(`/user/${id}`);
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
    return putRequest(`/user/edit/${videoId}`, videoData);
  },

  // Delete video
  deleteVideo: async (videoId: string): Promise<ApiResponse> => {
    return deleteRequest(`/user/delete/${videoId}`);
  },

  // Like/Dislike video
  likeVideo: async (videoId: string, action: 'like' | 'dislike', userId: string): Promise<ApiResponse> => {
    return postRequest(`/user/like/${videoId}`, { action, userId });
  },

  // Get likes for a video
  getLikes: async (videoId: string): Promise<ApiResponse<{ videoId: string, likesCount: number, likes: string[] }>> => {
    return getRequest(`/user/likes/${videoId}`);
  },

  // Dislike video
  dislikeVideo: async (videoId: string, userId: string): Promise<ApiResponse> => {
    return postRequest(`/user/dislike/${videoId}`, { userId });
  },

  // Get dislikes for a video
  getDislikes: async (videoId: string): Promise<ApiResponse<{ videoId: string, likesCount: number, likes: string[] }>> => {
    return getRequest(`/user/dislike/${videoId}`);
  },

  // Get like/dislike status
  getLikeStatus: async (videoId: string, userId: string): Promise<ApiResponse<{ isLiked: boolean, isDisliked: boolean }>> => {
    return getRequest(`/user/${videoId}/like-status/${userId}`);
  },

  // Bookmark video
  bookmarkVideo: async (videoId: string, userId: string): Promise<ApiResponse<Video>> => {
    return postRequest(`/user/${videoId}/bookmark`, { userId });
  },

  // Remove bookmark
  removeBookmark: async (videoId: string, userId: string): Promise<ApiResponse<Video>> => {
    return deleteRequest(`/user/${videoId}/bookmark`, { data: { userId } });
  },

  // Add comment to video
  addComment: async (videoId: string, commentData: {
    userId: string;
    text: string;
  }): Promise<ApiResponse<Video>> => {
    return postRequest(`/user/${videoId}/comment`, commentData);
  },

  // Reply to comment
  replyToComment: async (videoId: string, commentId: string, replyData: {
    userId: string;
    text: string;
  }): Promise<ApiResponse> => {
    return postRequest(`/user/${videoId}/comment/${commentId}`, replyData);
  },

  // Get videos by rating
  getVideosByRating: async (rating: string): Promise<ApiResponse<Video[]>> => {
    return getRequest<Video[]>(`/user/ratings/${rating}`);
  },

  // Get videos by theme
  getVideosByTheme: async (theme: string): Promise<ApiResponse<Video[]>> => {
    return getRequest<Video[]>(`/user/themes/${theme}`);
  },

  // Search videos by genre
  searchVideosByGenre: async (genre: string): Promise<ApiResponse<Video[]>> => {
    return getRequest<Video[]>(`/user/search/${genre}`);
  },

  // Get videos by category
  getVideosByCategory: async (genre: string): Promise<ApiResponse<Video[]>> => {
    return getRequest<Video[]>(`/user/category/${genre}`);
  },

  // Get video views
  getVideoViews: async (videoId: string): Promise<ApiResponse<{ views: number }>> => {
    return getRequest(`/user/views/${videoId}`);
  },

  // Increment video view
  incrementVideoView: async (videoId: string, userId: string): Promise<ApiResponse<{ views: number }>> => {
    return putRequest(`/user/view/${videoId}`, { userId });
  },

  // Get watch history
  getWatchHistory: async (userId: string): Promise<ApiResponse<History[]>> => {
    return getRequest<History[]>(`/user/history/${userId}`);
  },

  // Publish video
  publishVideo: async (videoId: string): Promise<ApiResponse<Video>> => {
    return patchRequest(`/user/publish/${videoId}`, {});
  },

  // Unpublish video
  unpublishVideo: async (videoId: string): Promise<ApiResponse<Video>> => {
    return patchRequest(`/user/unpublish/${videoId}`, {});
  },

  // Hide video
  hideVideo: async (videoId: string): Promise<ApiResponse<Video>> => {
    return patchRequest(`/user/hide/${videoId}`, {});
  },

  // Unhide video
  unhideVideo: async (videoId: string): Promise<ApiResponse<Video>> => {
    return patchRequest(`/user/unhide/${videoId}`, {});
  },

  // Get genre analytics
  getGenreGraph: async (from?: string, to?: string): Promise<ApiResponse<any>> => {
    const params: any = {};
    if (from) params.from = from;
    if (to) params.to = to;
    return getRequest('/user/genres/graph', params);
  },

  // Get theme analytics
  getThemeGraph: async (from?: string, to?: string): Promise<ApiResponse<any>> => {
    const params: any = {};
    if (from) params.from = from;
    if (to) params.to = to;
    return getRequest('/user/themes/graph', params);
  },

  // Get rating analytics
  getRatingGraph: async (from?: string, to?: string): Promise<ApiResponse<any>> => {
    const params: any = {};
    if (from) params.from = from;
    if (to) params.to = to;
    return getRequest('/user/ratings/graph', params);
  },

  // Search videos by title or description
  searchVideos: async (query: string): Promise<ApiResponse<Video[]>> => {
    // This might need backend implementation
    return getRequest<Video[]>(`/user/search?q=${query}`);
  },

  // Get trending videos
  getTrendingVideos: async (limit = 10): Promise<ApiResponse<Video[]>> => {
    // This might need backend implementation
    return getRequest<Video[]>(`/user/trending?limit=${limit}`);
  },

  // Get recommended videos for user
  getRecommendedVideos: async (userId: string): Promise<ApiResponse<Video[]>> => {
    // This might need backend implementation
    return getRequest<Video[]>(`/user/recommended/${userId}`);
  },

  // Get videos bookmarked by user
  getBookmarkedVideos: async (userId: string): Promise<ApiResponse<Video[]>> => {
    // This might need backend implementation
    return getRequest<Video[]>(`/user/bookmarks/${userId}`);
  },

  // Get liked videos by user
  getLikedVideos: async (userId: string): Promise<ApiResponse<Video[]>> => {
    // This might need backend implementation
    return getRequest<Video[]>(`/user/liked/${userId}`);
  },
};

// ==================== SCRIPT API ====================

export const scriptApi = {
  // Create script
  createScript: async (scriptData: {
    title: string;
    genre: string;
    script: string;
    author: string;
    isForSale?: boolean;
  }): Promise<ApiResponse<Script>> => {
    return postRequest<Script>('/user/scripts', scriptData);
  },

  // Get all scripts
  getAllScripts: async (): Promise<ApiResponse<Script[]>> => {
    return getRequest<Script[]>('/user/author/scripts');
  },

  // Get scripts by author
  getScriptsByAuthor: async (authorId: string): Promise<ApiResponse<Script[]>> => {
    return getRequest<Script[]>(`/user/authors/${authorId}/scripts`);
  },

  // Update script
  updateScript: async (scriptId: string, scriptData: {
    title?: string;
    genre?: string;
    script?: string;
    author?: string;
  }): Promise<ApiResponse<Script>> => {
    return putRequest<Script>(`/user/scripts/${scriptId}`, scriptData);
  },

  // Delete script
  deleteScript: async (scriptId: string): Promise<ApiResponse> => {
    return deleteRequest(`/user/scripts/${scriptId}`);
  },

  // Get script by ID
  getScriptById: async (scriptId: string): Promise<ApiResponse<Script>> => {
    return getRequest<Script>(`/user/scripts/${scriptId}`);
  },

  // Search scripts
  searchScripts: async (query: string): Promise<ApiResponse<Script[]>> => {
    // This might need backend implementation
    return getRequest<Script[]>(`/user/scripts/search?q=${query}`);
  },

  // Get scripts by genre
  getScriptsByGenre: async (genre: string): Promise<ApiResponse<Script[]>> => {
    return getRequest<Script[]>(`/user/scripts/genre/${genre}`);
  },
};

// ==================== ADMIN API ====================

export const adminApi = {
  // Get privileged users
  getPrivilegedUsers: async (role?: 'admin' | 'subadmin' | 'both'): Promise<ApiResponse<{ users: User[], count: number }>> => {
    const params = role ? { role } : {};
    return getRequest('/admin/users', params);
  },

  // Add admin privileges
  addAdminPrivileges: async (email: string): Promise<ApiResponse<User>> => {
    return putRequest<User>('/admin/add', { email });
  },

  // Remove privileges
  removePrivileges: async (userId: string, options?: {
    removeAll?: boolean;
    removeAdmin?: boolean;
    removeSubAdmin?: boolean;
  }): Promise<ApiResponse<User>> => {
    return putRequest<User>(`/admin/remove/${userId}`, options);
  },

  // Get all transactions
  getAllTransactions: async (): Promise<ApiResponse<Transaction[]>> => {
    return getRequest<Transaction[]>('/user/transactions');
  },

  // Get user transactions
  getUserTransactions: async (userId: string): Promise<ApiResponse<Transaction[]>> => {
    return getRequest<Transaction[]>(`/user/transactions/${userId}`);
  },

  // Change all videos status
  changeAllVideosStatus: async (): Promise<ApiResponse> => {
    return patchRequest('/user/change-video-status', {});
  },

  // Change video status
  changeVideoStatus: async (videoId: string, status: boolean): Promise<ApiResponse<Video>> => {
    return postRequest('/user/change-video-status', { videoId, status });
  },

  // Get all contact messages
  getContactMessages: async (): Promise<ApiResponse<ContactMessage[]>> => {
    // This might need backend implementation
    return getRequest<ContactMessage[]>('/admin/contact');
  },

  // Get system statistics
  getSystemStats: async (): Promise<ApiResponse<any>> => {
    // This might need backend implementation
    return getRequest('/admin/stats');
  },

  // Get user analytics
  getUserAnalytics: async (): Promise<ApiResponse<any>> => {
    // This might need backend implementation
    return getRequest('/admin/analytics/users');
  },

  // Get video analytics
  getVideoAnalytics: async (): Promise<ApiResponse<any>> => {
    // This might need backend implementation
    return getRequest('/admin/analytics/videos');
  },
};

// ==================== UTILITY FUNCTIONS ====================

// Upload file function
export const uploadFile = async (file: File, type: 'video' | 'image' | 'script' = 'image'): Promise<ApiResponse<{ url: string }>> => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    const response = await api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  } catch (error: any) {
    console.error('Upload error:', error);
    return { 
      error: error.response?.data?.error || error.message || 'Upload failed' 
    };
  }
};

// Check if user is admin
export const isAdmin = (): boolean => {
  const user = authApi.getCurrentUser();
  return user?.isAdmin === true;
};

// Check if user is subadmin
export const isSubAdmin = (): boolean => {
  const user = authApi.getCurrentUser();
  return user?.isSubAdmin === true;
};

// Check if user has paid
export const hasPaid = (): boolean => {
  const user = authApi.getCurrentUser();
  return user?.hasPaid === true;
};

// Format date
export const formatDate = (date: Date | string): string => {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

// Format time
export const formatTime = (date: Date | string): string => {
  const d = new Date(date);
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Export default API instance
export default api;

// Export everything as a single object
export const API = {
  // Generic request methods
  get: getRequest,
  post: postRequest,
  put: putRequest,
  patch: patchRequest,
  delete: deleteRequest,
  
  // API modules
  auth: authApi,
  user: userApi,
  video: videoApi,
  script: scriptApi,
  admin: adminApi,
  
  // Utility functions
  uploadFile,
  isAdmin,
  isSubAdmin,
  hasPaid,
  formatDate,
  formatTime,
  
  // Axios instance
  instance: api,
};