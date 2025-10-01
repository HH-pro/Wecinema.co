import { useState, useEffect } from 'react';
import { Listing, Order, Offer, ApiResponse } from '../types/marketplace';

export const useMarketplace = () => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all listings
  const fetchListings = async (filters = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      const queryParams = new URLSearchParams(filters as any).toString();
      const response = await fetch(`/api/marketplace/listings?${queryParams}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch listings');
      }
      
      const data: Listing[] = await response.json();
      setListings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Create new listing
  const createListing = async (listingData: FormData): Promise<ApiResponse<Listing>> => {
    try {
      setLoading(true);
      const response = await fetch('/api/marketplace/create-listing', {
        method: 'POST',
        body: listingData,
      });

      const result: ApiResponse<Listing> = await response.json();
      
      if (result.success && result.data) {
        // Refresh listings after creation
        fetchListings();
      }
      
      return result;
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to create listing'
      };
    } finally {
      setLoading(false);
    }
  };

  // Get user's listings
  const fetchMyListings = async (): Promise<Listing[]> => {
    try {
      const response = await fetch('/api/marketplace/my-listings');
      return await response.json();
    } catch (err) {
      setError('Failed to fetch your listings');
      return [];
    }
  };

  return {
    listings,
    loading,
    error,
    fetchListings,
    createListing,
    fetchMyListings,
  };
};