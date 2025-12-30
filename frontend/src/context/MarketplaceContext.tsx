import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { Listing, Order, Offer, User } from '../types/marketplace';
import { marketplaceAPI } from '../api';

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
  createListing: (formData: FormData) => Promise<void>;
  updateListing: (id: string, data: Partial<Listing>) => Promise<void>;
  deleteListing: (id: string) => Promise<void>;
  
  // Orders
  fetchMyOrders: () => Promise<void>;
  fetchSellerOrders: () => Promise<void>;
  createOrder: (orderData: any) => Promise<void>;
  updateOrderStatus: (orderId: string, status: string) => Promise<void>;
  deliverOrder: (orderId: string, deliveryData: any) => Promise<void>;
  
  // Offers
  fetchOffers: () => Promise<void>;
  makeOffer: (offerData: any) => Promise<void>;
  acceptOffer: (offerId: string) => Promise<void>;
  rejectOffer: (offerId: string) => Promise<void>;
  
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
      const listings = await marketplaceAPI.listings.get(filters);
      dispatch({ type: 'SET_LISTINGS', payload: listings });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch listings');
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError]);

  const fetchMyListings = useCallback(async () => {
    try {
      setLoading(true);
      const listings = await marketplaceAPI.listings.getMy();
      dispatch({ type: 'SET_MY_LISTINGS', payload: listings });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch your listings');
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError]);

  const createListing = useCallback(async (formData: FormData) => {
    try {
      setLoading(true);
      const newListing = await marketplaceAPI.listings.create(formData, setLoading);
      dispatch({ type: 'ADD_LISTING', payload: newListing });
      return newListing;
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
      const updatedListing = await marketplaceAPI.listings.update(id, data, setLoading);
      dispatch({ type: 'UPDATE_LISTING', payload: updatedListing });
      return updatedListing;
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
      await marketplaceAPI.listings.delete(id, setLoading);
      dispatch({ type: 'DELETE_LISTING', payload: id });
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
      const orders = await marketplaceAPI.orders.getMy();
      dispatch({ type: 'SET_ORDERS', payload: orders });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError]);

  const fetchSellerOrders = useCallback(async () => {
    try {
      setLoading(true);
      const orders = await marketplaceAPI.orders.getSeller();
      dispatch({ type: 'SET_SELLER_ORDERS', payload: orders });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch seller orders');
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError]);

  const createOrder = useCallback(async (orderData: any) => {
    try {
      setLoading(true);
      const newOrder = await marketplaceAPI.orders.create(orderData, setLoading);
      dispatch({ type: 'ADD_ORDER', payload: newOrder });
      return newOrder;
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
      const updatedOrder = await marketplaceAPI.orders.updateStatus(orderId, status, setLoading);
      dispatch({ type: 'UPDATE_ORDER', payload: updatedOrder });
      return updatedOrder;
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
      const updatedOrder = await marketplaceAPI.orders.deliver(orderId, deliveryData, setLoading);
      dispatch({ type: 'UPDATE_ORDER', payload: updatedOrder });
      return updatedOrder;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to deliver order');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError]);

  // Offers
  const fetchOffers = useCallback(async () => {
    try {
      setLoading(true);
      const offers = await marketplaceAPI.offers.getReceived();
      dispatch({ type: 'SET_OFFERS', payload: offers });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch offers');
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError]);

  const makeOffer = useCallback(async (offerData: any) => {
    try {
      setLoading(true);
      const offer = await marketplaceAPI.offers.make(offerData, setLoading);
      return offer;
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
      const result = await marketplaceAPI.offers.accept(offerId, setLoading);
      // Refresh offers after acceptance
      await fetchOffers();
      return result;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to accept offer');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, fetchOffers]);

  const rejectOffer = useCallback(async (offerId: string) => {
    try {
      setLoading(true);
      const result = await marketplaceAPI.offers.reject(offerId, setLoading);
      // Refresh offers after rejection
      await fetchOffers();
      return result;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to reject offer');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, fetchOffers]);

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
    fetchOffers,
    makeOffer,
    acceptOffer,
    rejectOffer,
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