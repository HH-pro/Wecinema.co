import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { Listing, Order, Offer, User } from '../types/marketplace';
import marketplaceApi from '../api/marketplaceApi';

interface MarketplaceState {
  listings: Listing[];
  myListings: Listing[];
  orders: Order[];
  sellerOrders: Order[];
  offers: Offer[];
  loading: boolean;
  error: string | null;
  user: User | null;
}

type MarketplaceAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_LISTINGS'; payload: Listing[] }
  | { type: 'SET_MY_LISTINGS'; payload: Listing[] }
  | { type: 'SET_ORDERS'; payload: Order[] }
  | { type: 'SET_SELLER_ORDERS'; payload: Order[] }
  | { type: 'SET_OFFERS'; payload: Offer[] }
  | { type: 'ADD_LISTING'; payload: Listing }
  | { type: 'UPDATE_LISTING'; payload: Listing }
  | { type: 'DELETE_LISTING'; payload: string }
  | { type: 'ADD_ORDER'; payload: Order }
  | { type: 'UPDATE_ORDER'; payload: Order }
  | { type: 'SET_USER'; payload: User | null };

const initialState: MarketplaceState = {
  listings: [],
  myListings: [],
  orders: [],
  sellerOrders: [],
  offers: [],
  loading: false,
  error: null,
  user: null,
};

const marketplaceReducer = (state: MarketplaceState, action: MarketplaceAction): MarketplaceState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'SET_LISTINGS':
      return { ...state, listings: action.payload };
    case 'SET_MY_LISTINGS':
      return { ...state, myListings: action.payload };
    case 'SET_ORDERS':
      return { ...state, orders: action.payload };
    case 'SET_SELLER_ORDERS':
      return { ...state, sellerOrders: action.payload };
    case 'SET_OFFERS':
      return { ...state, offers: action.payload };
    case 'ADD_LISTING':
      return { ...state, listings: [action.payload, ...state.listings], myListings: [action.payload, ...state.myListings] };
    case 'UPDATE_LISTING':
      return {
        ...state,
        listings: state.listings.map(l => l._id === action.payload._id ? action.payload : l),
        myListings: state.myListings.map(l => l._id === action.payload._id ? action.payload : l),
      };
    case 'DELETE_LISTING':
      return {
        ...state,
        listings: state.listings.filter(l => l._id !== action.payload),
        myListings: state.myListings.filter(l => l._id !== action.payload),
      };
    case 'ADD_ORDER':
      return { ...state, orders: [action.payload, ...state.orders] };
    case 'UPDATE_ORDER':
      return {
        ...state,
        orders: state.orders.map(o => o._id === action.payload._id ? action.payload : o),
        sellerOrders: state.sellerOrders.map(o => o._id === action.payload._id ? action.payload : o),
      };
    case 'SET_USER':
      return { ...state, user: action.payload };
    default:
      return state;
  }
};

interface MarketplaceContextType extends MarketplaceState {
  // Listings
  fetchListings: (filters?: any) => Promise<void>;
  fetchMyListings: () => Promise<void>;
  createListing: (listingData: any) => Promise<Listing>;
  updateListing: (id: string, data: Partial<Listing>) => Promise<Listing>;
  deleteListing: (id: string) => Promise<void>;
  
  // Orders
  fetchMyOrders: () => Promise<void>;
  fetchSellerOrders: () => Promise<void>;
  createOrder: (orderData: any) => Promise<Order>;
  updateOrderStatus: (orderId: string, status: string) => Promise<Order>;
  deliverOrder: (orderId: string, deliveryData: any) => Promise<Order>;
  getOrderDetails: (orderId: string) => Promise<any>;
  
  // Offers
  fetchOffers: () => Promise<void>;
  fetchReceivedOffers: () => Promise<void>;
  fetchMyOffers: () => Promise<void>;
  makeOffer: (offerData: any) => Promise<any>;
  acceptOffer: (offerId: string) => Promise<any>;
  rejectOffer: (offerId: string, rejectionReason?: string) => Promise<any>;
  cancelOffer: (offerId: string) => Promise<any>;
  
  // Payments
  createPaymentIntent: (data: any) => Promise<any>;
  confirmPayment: (data: any) => Promise<any>;
  
  // Stripe
  getStripeAccountStatus: () => Promise<any>;
  startStripeOnboarding: () => Promise<any>;
  continueStripeOnboarding: () => Promise<any>;
  
  // User
  setUser: (user: User | null) => void;
  clearError: () => void;
}

const MarketplaceContext = createContext<MarketplaceContextType | undefined>(undefined);

// Define props interface for MarketplaceProvider
interface MarketplaceProviderProps {
  children: React.ReactNode;
}

export const MarketplaceProvider: React.FC<MarketplaceProviderProps> = ({ 
  children 
}) => {
  const [state, dispatch] = useReducer(marketplaceReducer, initialState);

  const setLoading = useCallback((loading: boolean) => 
    dispatch({ type: 'SET_LOADING', payload: loading }), []);

  const setError = useCallback((error: string | null) => 
    dispatch({ type: 'SET_ERROR', payload: error }), []);

  // Listings
  const fetchListings = useCallback(async (filters?: any) => {
    try {
      setLoading(true);
      const response = await marketplaceApi.listings.getAllListings(filters);
      
      if (response.success && response.data) {
        dispatch({ type: 'SET_LISTINGS', payload: response.data.listings || [] });
      } else {
        setError(response.error || 'Failed to fetch listings');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch listings');
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError]);

  const fetchMyListings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await marketplaceApi.listings.getMyListings();
      
      if (response.success && response.data) {
        dispatch({ type: 'SET_MY_LISTINGS', payload: response.data.listings || [] });
      } else {
        setError(response.error || 'Failed to fetch your listings');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch your listings');
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError]);

  const createListing = useCallback(async (listingData: any) => {
    try {
      setLoading(true);
      const response = await marketplaceApi.listings.createListing(listingData);
      
      if (response.success && response.data) {
        const newListing = response.data.listing;
        dispatch({ type: 'ADD_LISTING', payload: newListing });
        return newListing;
      } else {
        throw new Error(response.error || 'Failed to create listing');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create listing');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError]);

  const updateListing = useCallback(async (id: string, data: Partial<Listing>) => {
    try {
      setLoading(true);
      const response = await marketplaceApi.listings.editListing(id, data);
      
      if (response.success && response.data) {
        const updatedListing = response.data.listing;
        dispatch({ type: 'UPDATE_LISTING', payload: updatedListing });
        return updatedListing;
      } else {
        throw new Error(response.error || 'Failed to update listing');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update listing');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError]);

  const deleteListing = useCallback(async (id: string) => {
    try {
      setLoading(true);
      const response = await marketplaceApi.listings.deleteListing(id);
      
      if (response.success) {
        dispatch({ type: 'DELETE_LISTING', payload: id });
      } else {
        throw new Error(response.error || 'Failed to delete listing');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete listing');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError]);

  // Orders
  const fetchMyOrders = useCallback(async () => {
    try {
      setLoading(true);
      const response = await marketplaceApi.orders.getMyOrders();
      
      if (response.success && response.data) {
        dispatch({ type: 'SET_ORDERS', payload: response.data.orders || [] });
      } else {
        setError(response.error || 'Failed to fetch orders');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError]);

  const fetchSellerOrders = useCallback(async () => {
    try {
      setLoading(true);
      const response = await marketplaceApi.orders.getMySales();
      
      if (response.success && response.data) {
        dispatch({ type: 'SET_SELLER_ORDERS', payload: response.data.sales || [] });
      } else {
        setError(response.error || 'Failed to fetch seller orders');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch seller orders');
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError]);

  const createOrder = useCallback(async (orderData: any) => {
    try {
      setLoading(true);
      const response = await marketplaceApi.orders.createOrder(orderData);
      
      if (response.success && response.data) {
        const newOrder = response.data.order;
        dispatch({ type: 'ADD_ORDER', payload: newOrder });
        return newOrder;
      } else {
        throw new Error(response.error || 'Failed to create order');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create order');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError]);

  const updateOrderStatus = useCallback(async (orderId: string, status: string) => {
    try {
      setLoading(true);
      const response = await marketplaceApi.orders.updateOrderStatus(orderId, status);
      
      if (response.success && response.data) {
        const updatedOrder = response.data.order;
        dispatch({ type: 'UPDATE_ORDER', payload: updatedOrder });
        return updatedOrder;
      } else {
        throw new Error(response.error || 'Failed to update order status');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update order status');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError]);

  const deliverOrder = useCallback(async (orderId: string, deliveryData: any) => {
    try {
      setLoading(true);
      const response = await marketplaceApi.orders.deliverOrder(orderId, deliveryData);
      
      if (response.success && response.data) {
        const updatedOrder = response.data.order;
        dispatch({ type: 'UPDATE_ORDER', payload: updatedOrder });
        return updatedOrder;
      } else {
        throw new Error(response.error || 'Failed to deliver order');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to deliver order');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError]);

  const getOrderDetails = useCallback(async (orderId: string) => {
    try {
      setLoading(true);
      const response = await marketplaceApi.orders.getOrderDetails(orderId);
      
      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to fetch order details');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch order details');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError]);

  // Offers
  const fetchOffers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await marketplaceApi.offers.getReceivedOffers();
      
      if (response.success && response.data) {
        dispatch({ type: 'SET_OFFERS', payload: response.data.offers || [] });
      } else {
        setError(response.error || 'Failed to fetch offers');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch offers');
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError]);

  const fetchReceivedOffers = useCallback(async () => {
    return fetchOffers();
  }, [fetchOffers]);

  const fetchMyOffers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await marketplaceApi.offers.getMyOffers();
      
      if (response.success && response.data) {
        dispatch({ type: 'SET_OFFERS', payload: response.data.offers || [] });
      } else {
        setError(response.error || 'Failed to fetch your offers');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch your offers');
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError]);

  const makeOffer = useCallback(async (offerData: any) => {
    try {
      setLoading(true);
      const response = await marketplaceApi.offers.makeOffer(offerData);
      
      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to make offer');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to make offer');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError]);

  const acceptOffer = useCallback(async (offerId: string) => {
    try {
      setLoading(true);
      const response = await marketplaceApi.offers.acceptOffer(offerId);
      
      if (response.success && response.data) {
        // Refresh offers after acceptance
        await fetchOffers();
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to accept offer');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to accept offer');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, fetchOffers]);

  const rejectOffer = useCallback(async (offerId: string, rejectionReason?: string) => {
    try {
      setLoading(true);
      const response = await marketplaceApi.offers.rejectOffer(offerId, rejectionReason);
      
      if (response.success && response.data) {
        // Refresh offers after rejection
        await fetchOffers();
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to reject offer');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to reject offer');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, fetchOffers]);

  const cancelOffer = useCallback(async (offerId: string) => {
    try {
      setLoading(true);
      const response = await marketplaceApi.offers.cancelOffer(offerId);
      
      if (response.success && response.data) {
        // Refresh offers after cancellation
        await fetchMyOffers();
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to cancel offer');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to cancel offer');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, fetchMyOffers]);

  // Payments
  const createPaymentIntent = useCallback(async (data: any) => {
    try {
      setLoading(true);
      const response = await marketplaceApi.payments.createPaymentIntent(data);
      
      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to create payment intent');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create payment intent');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError]);

  const confirmPayment = useCallback(async (data: any) => {
    try {
      setLoading(true);
      const response = await marketplaceApi.payments.confirmPayment(data);
      
      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to confirm payment');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to confirm payment');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError]);

  // Stripe
  const getStripeAccountStatus = useCallback(async () => {
    try {
      setLoading(true);
      const response = await marketplaceApi.stripe.getStripeAccountStatus();
      
      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to get Stripe account status');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to get Stripe account status');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError]);

  const startStripeOnboarding = useCallback(async () => {
    try {
      setLoading(true);
      const response = await marketplaceApi.stripe.startStripeOnboarding();
      
      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to start Stripe onboarding');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to start Stripe onboarding');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError]);

  const continueStripeOnboarding = useCallback(async () => {
    try {
      setLoading(true);
      const response = await marketplaceApi.stripe.continueStripeOnboarding();
      
      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to continue Stripe onboarding');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to continue Stripe onboarding');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError]);

  // User
  const setUser = useCallback((user: User | null) => {
    dispatch({ type: 'SET_USER', payload: user });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: null });
  }, []);

  // Initialize
  useEffect(() => {
    fetchListings();
    // You can add user initialization here if needed
  }, [fetchListings]);

  const contextValue: MarketplaceContextType = {
    ...state,
    fetchListings,
    fetchMyListings,
    createListing,
    updateListing,
    deleteListing,
    fetchMyOrders,
    fetchSellerOrders,
    createOrder,
    updateOrderStatus,
    deliverOrder,
    getOrderDetails,
    fetchOffers,
    fetchReceivedOffers,
    fetchMyOffers,
    makeOffer,
    acceptOffer,
    rejectOffer,
    cancelOffer,
    createPaymentIntent,
    confirmPayment,
    getStripeAccountStatus,
    startStripeOnboarding,
    continueStripeOnboarding,
    setUser,
    clearError,
  };

  return (
    <MarketplaceContext.Provider value={contextValue}>
      {children}
    </MarketplaceContext.Provider>
  );
};

export const useMarketplace = (): MarketplaceContextType => {
  const context = useContext(MarketplaceContext);
  if (context === undefined) {
    throw new Error('useMarketplace must be used within a MarketplaceProvider');
  }
  return context;
};