import { useState, useEffect } from 'react';
import { Order, ApiResponse } from '../types/marketplace';

export const useOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch buyer's orders
  const fetchMyOrders = async (): Promise<Order[]> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/marketplace/my-orders');
      
      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }
      
      const data: Order[] = await response.json();
      setOrders(data);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch orders';
      setError(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Fetch seller's orders
  const fetchSellerOrders = async (): Promise<Order[]> => {
    try {
      const response = await fetch('/api/marketplace/seller-orders');
      const data: Order[] = await response.json();
      return data;
    } catch (err) {
      setError('Failed to fetch seller orders');
      return [];
    }
  };

  // Create new order
  const createOrder = async (orderData: any): Promise<ApiResponse<Order>> => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/marketplace/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      const result: ApiResponse<Order> = await response.json();
      return result;
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to create order'
      };
    } finally {
      setLoading(false);
    }
  };

  // Update order status
  const updateOrderStatus = async (orderId: string, status: string): Promise<ApiResponse<Order>> => {
    try {
      const response = await fetch(`/api/marketplace/order/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      return await response.json();
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to update order'
      };
    }
  };

  return {
    orders,
    loading,
    error,
    fetchMyOrders,
    fetchSellerOrders,
    createOrder,
    updateOrderStatus,
  };
};