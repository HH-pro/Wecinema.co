// api.ts - Simplified and Modular Version
import axios, { AxiosResponse, AxiosError, Method } from "axios";
import { toast } from "react-toastify";

// Create an axios instance with default configurations
const api = axios.create({
  baseURL: "http://localhost:3000/",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor for adding token
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

// Core request functions
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
      throw new Error(
        `API Error: ${error.response?.status} - ${error.response?.data?.error || 'Unknown error'}`
      );
    }
    throw new Error('Network error occurred');
  } finally {
    setLoading?.(false);
  }
};

export const postRequest = async <T>(
  url: string,
  data: any,
  setLoading?: React.Dispatch<React.SetStateAction<boolean>>,
  successMessage?: string
): Promise<T> => {
  try {
    setLoading?.(true);
    const response = await api.post<T>(url, data);
    if (successMessage) {
      toast.success(successMessage);
    }
    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.error || error.message || 'Request failed';
    toast.error(errorMessage);
    throw new Error(errorMessage);
  } finally {
    setLoading?.(false);
  }
};

export const putRequest = async <T>(
  url: string,
  data: any,
  setLoading?: React.Dispatch<React.SetStateAction<boolean>>,
  successMessage?: string
): Promise<T> => {
  try {
    setLoading?.(true);
    const response = await api.put<T>(url, data);
    if (successMessage) {
      toast.success(successMessage);
    }
    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.error || error.message || 'Request failed';
    toast.error(errorMessage);
    throw new Error(errorMessage);
  } finally {
    setLoading?.(false);
  }
};

export const deleteRequest = async <T>(
  url: string,
  setLoading?: React.Dispatch<React.SetStateAction<boolean>>,
  successMessage?: string
): Promise<T> => {
  try {
    setLoading?.(true);
    const response = await api.delete<T>(url);
    if (successMessage) {
      toast.success(successMessage);
    }
    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.error || error.message || 'Request failed';
    toast.error(errorMessage);
    throw new Error(errorMessage);
  } finally {
    setLoading?.(false);
  }
};

// ========================
// AUTH APIs - Simple Export
// ========================
export const loginUser = (credentials: { email: string; password: string }, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
  postRequest("/api/auth/login", credentials, setLoading, "Login successful");

export const registerUser = (userData: { username: string; email: string; password: string }, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
  postRequest("/api/auth/register", userData, setLoading, "Registration successful");

export const getCurrentUser = (setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
  getRequest("/api/auth/me", setLoading);

// ========================
// MARKETPLACE APIs - Simple Export
// ========================

// Listing APIs
export const getListings = (setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
  getRequest("/marketplace/listings", setLoading);

export const getMyListings = (setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
  getRequest("/marketplace/listings/my-listings", setLoading);

export const getListingById = (listingId: string, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
  getRequest(`/marketplace/listings/${listingId}`, setLoading);

export const createListing = (listingData: any, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
  postRequest("/marketplace/listings/create-listing", listingData, setLoading, "Listing created successfully");

export const updateListing = (listingId: string, data: any, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
  putRequest(`/marketplace/listings/${listingId}`, data, setLoading, "Listing updated");

export const deleteListing = (listingId: string, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
  deleteRequest(`/marketplace/listings/${listingId}`, setLoading, "Listing deleted");

// Offer APIs
export const getMyOffers = (setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
  getRequest("/marketplace/offers/my-offers", setLoading);

export const getReceivedOffers = (setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
  getRequest("/marketplace/offers/seller-offers", setLoading);

export const makeOffer = (offerData: any, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
  postRequest("/marketplace/offers/make-offer", offerData, setLoading, "Offer sent successfully");

export const acceptOffer = (offerId: string, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
  putRequest(`/marketplace/offers/${offerId}/accept`, {}, setLoading, "Offer accepted");

export const rejectOffer = (offerId: string, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
  putRequest(`/marketplace/offers/${offerId}/reject`, {}, setLoading, "Offer rejected");

// Order APIs
export const getMyOrders = (setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
  getRequest("/marketplace/orders/my-orders", setLoading);

export const getSellerOrders = (setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
  getRequest("/marketplace/orders/seller-orders", setLoading);

export const createOrder = (orderData: any, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
  postRequest("/marketplace/orders/create-order", orderData, setLoading, "Order created successfully");

// ========================
// UTILITY FUNCTIONS
// ========================
export const isAuthenticated = () => !!localStorage.getItem("token");

export const getToken = () => localStorage.getItem("token");

export const logout = () => {
  localStorage.removeItem("token");
  window.location.href = '/login';
};

// Simple error handler
export const handleApiError = (error: any) => {
  const message = error.response?.data?.error || error.message || 'Something went wrong';
  toast.error(message);
  return message;
};

export default api;