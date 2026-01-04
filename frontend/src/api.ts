// api.ts - COMPLETE API FILE WITH ALL ROUTES
import axios, { AxiosResponse, AxiosError, Method } from "axios";
import { toast } from "react-toastify";

// ========================
// CONFIGURATION & INTERCEPTORS
// ========================

// Create an axios instance with default configurations
const api = axios.create({
  baseURL: import.meta.env.DEV
    ? "http://localhost:3000/"
    : "https://wecinema-co.onrender.com/",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor for adding tokens
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ========================
// CORE REQUEST FUNCTIONS
// ========================

interface ApiResponse {
  success?: boolean;
  message?: string;
  error?: string;
  data?: any;
}

const handleSuccess = <T extends ApiResponse>(
  response: AxiosResponse<T>,
  method: Method,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  message?: string
): T => {
  setLoading(false);
  
  if (method !== "get" && response.data.message) {
    toast.success(response.data.message || message || "Successful");
  }
  
  return response.data;
};

const handleError = (
  error: AxiosError<ApiResponse>,
  method: Method,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
): Promise<string> => {
  setLoading(false);

  if (error.response) {
    const errorMessage =
      error.response.data.message ||
      error.response.data?.error ||
      "Something went wrong on the server.";

    if (method !== "get") {
      toast.error(errorMessage);
    }
    return Promise.reject(errorMessage);
  } else if (error.request) {
    toast.error("No response received from the server.");
    return Promise.reject("No response received from the server.");
  } else {
    toast.error(error.message || "An unexpected error occurred.");
    return Promise.reject(error.message || "An unexpected error occurred.");
  }
};

// CRUD operations
export const postRequest = <T>(
  url: string,
  data: any,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  message?: string
): Promise<T> =>
  api
    .post(url, data)
    .then((response) => handleSuccess(response, "post", setLoading, message))
    .catch((error) => handleError(error, "post", setLoading));

export const getRequest = async <T>(
  url: string,
  setLoading?: React.Dispatch<React.SetStateAction<boolean>>
): Promise<T> => {
  try {
    setLoading?.(true);
    const response = await api.get<T>(url);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorMsg = error.response?.data?.error || error.message;
      throw new Error(errorMsg);
    }
    throw new Error('Network error occurred');
  } finally {
    setLoading?.(false);
  }
};

export const putRequest = <T>(
  url: string,
  data: any,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  message?: string
): Promise<T> =>
  api
    .put(url, data)
    .then((response) => handleSuccess(response, "put", setLoading, message))
    .catch((error) => handleError(error, "put", setLoading));

export const patchRequest = <T>(
  url: string,
  data: any,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  message?: string
): Promise<T> =>
  api
    .patch(url, data)
    .then((response) => handleSuccess(response, "patch", setLoading, message))
    .catch((error) => handleError(error, "patch", setLoading));

export const deleteRequest = <T>(
  url: string,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  message?: string
): Promise<T> =>
  api
    .delete(url)
    .then((response) => handleSuccess(response, "delete", setLoading, message))
    .catch((error) => handleError(error, "delete", setLoading));

// ========================
// FILE UPLOAD FUNCTIONS
// ========================
export const uploadFiles = async (
  files: File[],
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
): Promise<Array<{
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  path: string;
}>> => {
  try {
    setLoading(true);
    const formData = new FormData();
    
    files.forEach((file) => {
      formData.append('files', file);
    });

    const token = localStorage.getItem("token");
    
    const response = await fetch('http://localhost:3000/marketplace/orders/upload/delivery', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Upload failed');
    }

    const data = await response.json();
    
    if (data.success) {
      toast.success(`Uploaded ${data.count} file(s) successfully`);
      return data.files;
    } else {
      throw new Error(data.error || 'Upload failed');
    }
  } catch (error: any) {
    console.error('Upload error:', error);
    toast.error(error.message || 'File upload failed');
    throw error;
  } finally {
    setLoading(false);
  }
};

export const getUploadedFile = (filename: string): string => {
  return `http://localhost:3000/marketplace/orders/upload/delivery/${filename}`;
};

export const ALLOWED_FILE_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'video/mp4', 'video/quicktime', 'video/x-msvideo',
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'audio/mpeg', 'audio/wav', 'audio/ogg',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

export const ALLOWED_FILE_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.gif', '.webp',
  '.mp4', '.mov', '.avi',
  '.pdf', '.zip', '.rar', '.7z', '.tar', '.gz', '.bz2',
  '.txt', '.doc', '.docx',
  '.mp3', '.wav', '.ogg',
  '.xls', '.xlsx'
];

export const validateFile = (file: File): string | null => {
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  
  if (ALLOWED_FILE_TYPES.includes(file.type)) {
    return null;
  }
  
  if (extension && ALLOWED_FILE_EXTENSIONS.includes(extension)) {
    return null;
  }
  
  return `File type not supported. Allowed: ${ALLOWED_FILE_EXTENSIONS.join(', ')}`;
};

// ========================
// UTILITY FUNCTIONS
// ========================

export const formatDate = (dateString: string): string => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

export const formatDateTime = (dateString: string): string => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// ========================
// AUTH APIs
// ========================

export const authAPI = {
  // Standard auth
  login: (credentials: { email: string; password: string }, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    postRequest("/api/auth/login", credentials, setLoading, "Login successful"),

  register: (userData: { username: string; email: string; password: string }, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    postRequest("/api/auth/register", userData, setLoading, "Registration successful"),

  getCurrentUser: (setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest("/api/auth/me", setLoading),

  updateProfile: (userData: any, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    putRequest("/api/auth/profile", userData, setLoading, "Profile updated"),

  logout: () => {
    localStorage.removeItem("token");
    window.location.href = '/';
  },

  isAuthenticated: () => !!localStorage.getItem("token"),
  getToken: () => localStorage.getItem("token"),

  // Google/Firebase auth
  signup: (userData: { username: string; email: string; password?: string; avatar?: string; dob?: string; userType?: string; isGoogleAuth?: boolean }, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    postRequest("/api/auth/signup", userData, setLoading, "Registration successful"),

  signin: (credentials: { email: string; password?: string; isGoogleAuth?: boolean }, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    postRequest("/api/auth/signin", credentials, setLoading, "Login successful"),

  verifyToken: (token: string, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    postRequest("/api/auth/verify-token", { token }, setLoading),

  verifyEmail: (email: string, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest(`/api/auth/verify-email?email=${email}`, setLoading),

  // Password management
  changePassword: (data: { email: string; currentPassword: string; newPassword: string }, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    putRequest("/api/auth/change-password", data, setLoading, "Password changed successfully"),
};

// ========================
// USER APIs
// ========================

export const userAPI = {
  // User CRUD operations
  getAllUsers: (setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest("/api/auth/", setLoading),

  getUserById: (id: string, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest(`/api/auth/${id}`, setLoading),

  getPaymentUserById: (id: string, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest(`/api/auth/payment/user/${id}`, setLoading),

  updateUser: (id: string, data: { username?: string; email?: string; password?: string; avatar?: string; dob?: string }, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    putRequest(`/api/auth/edit/${id}`, data, setLoading, "User updated successfully"),

  deleteUser: (id: string, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    deleteRequest(`/api/auth/delete/${id}`, setLoading, "User deleted successfully"),

  // User type management
  changeUserType: (id: string, userType: 'buyer' | 'seller', setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    putRequest(`/api/auth/change-type/${id}`, { userType }, setLoading, "User type updated"),

  // Follow/unfollow
  followUser: (targetUserId: string, userId: string, action: 'follow' | 'unfollow', setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    putRequest(`/api/auth/${targetUserId}/follow`, { action, userId }, setLoading, action === 'follow' ? "Followed successfully" : "Unfollowed successfully"),

  // Paid users
  getPaidUsers: (setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest("/api/auth/paid-users", setLoading),

  // Payment status
  getPaymentStatus: (userId: string, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest(`/api/auth/payment-status/${userId}`, setLoading),

  updatePaymentStatus: (data: { userId: string; hasPaid: boolean }, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    postRequest("/api/auth/update-payment-status", data, setLoading, "Payment status updated"),

  // User status management
  changeUserStatusAll: (setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    putRequest("/api/auth/change-user-status", {}, setLoading, "All user statuses updated"),

  changeUserStatus: (data: { userId: string; status: boolean }, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    postRequest("/api/auth/change-user-status", data, setLoading, "User status updated"),
};

// ========================
// ADMIN APIs
// ========================

export const adminAPI = {
  // Admin auth
  adminRegister: (data: { email: string; password: string; username: string; dob: string; isAdmin?: boolean; isSubAdmin?: boolean }, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    postRequest("/api/auth/admin/register", data, setLoading, "Admin registered successfully"),

  adminLogin: (credentials: { email: string; password: string }, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    postRequest("/api/auth/admin/login", credentials, setLoading, "Admin login successful"),

  // Admin user management
  getPrivilegedUsers: (role?: 'admin' | 'subadmin' | 'both', setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest(role ? `/api/auth/admin/users?role=${role}` : "/api/auth/admin/users", setLoading),

  addAdmin: (email: string, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    putRequest("/api/auth/admin/add", { email }, setLoading, "Admin privileges added"),

  removePrivileges: (userId: string, data: { removeAll?: boolean; removeAdmin?: boolean; removeSubAdmin?: boolean }, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    putRequest(`/api/auth/admin/remove/${userId}`, data, setLoading, "Privileges removed"),

  // Admin user operations
  getAllUsersAdmin: (setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest("/api/auth/admin/users", setLoading),

  deleteUserAdmin: (id: string, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    deleteRequest(`/api/auth/admin/users/${id}`, setLoading, "User deleted successfully"),

  updateUserAdmin: (id: string, data: { username?: string; email?: string; password?: string; avatar?: string; dob?: string }, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    putRequest(`/api/auth/admin/edit/${id}`, data, setLoading, "User updated successfully"),

  // Admin video management
  getAllVideos: (setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest("/api/auth/admin/videos", setLoading),

  addVideo: (data: { title: string; description: string; url: string; genre: string; duration: string }, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    postRequest("/api/auth/admin/videos", data, setLoading, "Video added successfully"),

  updateVideo: (id: string, data: { title?: string; description?: string; url?: string; genre?: string; duration?: string }, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    putRequest(`/api/user/admin/videos/${id}`, data, setLoading, "Video updated successfully"),

  deleteVideo: (id: string, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    deleteRequest(`/api/user/admin/videos/${id}`, setLoading, "Video deleted successfully"),

  createVideo: (data: { title: string; description: string; genre: string; theme: string; rating: string; isForSale: boolean; file: string; author: string; role: string; slug: string; status?: boolean; users?: string[]; hasPaid?: boolean }, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    postRequest("/api/auth/admin/create", data, setLoading, "Video created successfully"),
};

// ========================
// SUBSCRIPTION APIs
// ========================

export const subscriptionAPI = {
  getSubscriptionStatus: (userId: string, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest(`/api/auth/status/${userId}`, setLoading),

  saveTransaction: (data: { userId: string; username: string; email: string; orderId: string; payerId: string; amount: number; currency: string; subscriptionType: string }, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    postRequest("/api/auth/save-transaction", data, setLoading, "Transaction saved successfully"),

  getAllTransactions: (setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest("/api/auth/transactions", setLoading),

  getUserTransactions: (userId: string, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest(`/api/auth/transactions/${userId}`, setLoading),
};

// ========================
// CONTACT API
// ========================

export const contactAPI = {
  sendMessage: (data: { name: string; email: string; message: string }, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    postRequest("/api/auth/contact", data, setLoading, "Message sent successfully"),
};

// ========================
// ORDERS API (Firebase/Realtime Database)
// ========================

export const ordersAPI = {
  createOrder: (data: { chatId: string; description: string; price: number; createdBy: string }, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    postRequest("/api/auth/orders", data, setLoading, "Order created successfully"),
};

// ========================
// LEGACY INDIVIDUAL EXPORTS (for backward compatibility)
// ========================

// Auth exports
export const loginUser = authAPI.login;
export const registerUser = authAPI.register;
export const getCurrentUser = authAPI.getCurrentUser;
export const updateProfile = authAPI.updateProfile;

// User exports
export const getUserById = userAPI.getUserById;
export const updateUser = userAPI.updateUser;
export const deleteUser = userAPI.deleteUser;
export const getPaymentStatus = userAPI.getPaymentStatus;

// Admin exports
export const adminLogin = adminAPI.adminLogin;
export const adminRegister = adminAPI.adminRegister;
export const getAllVideos = adminAPI.getAllVideos;

// Subscription exports
export const saveTransaction = subscriptionAPI.saveTransaction;
export const getAllTransactions = subscriptionAPI.getAllTransactions;

// Contact export
export const sendContactMessage = contactAPI.sendMessage;

// ========================
// DEFAULT EXPORT
// ========================

export default api;