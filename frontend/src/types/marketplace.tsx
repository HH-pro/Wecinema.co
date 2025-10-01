// Marketplace Types
export interface User {
  _id: string;
  username: string;
  email: string;
  avatar?: string;
  sellerRating: number;
  isHypeModeUser: boolean;
  role: string;
}

export interface Listing {
  _id: string;
  title: string;
  description: string;
  price: number;
  type: 'for_sale' | 'licensing' | 'adaptation_rights' | 'commission';
  category: string;
  tags: string[];
  mediaUrls: string[];
  status: 'draft' | 'active' | 'sold' | 'inactive';
  sellerId: User;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  _id: string;
  buyerId: User;
  sellerId: User;
  listingId?: Listing;
  orderType: 'buy_now' | 'accepted_offer' | 'commission';
  amount: number;
  status: 'pending_payment' | 'paid' | 'in_progress' | 'delivered' | 'in_revision' | 'completed' | 'cancelled' | 'disputed';
  stripePaymentIntentId?: string;
  paymentReleased: boolean;
  releaseDate?: string;
  platformFee?: number;
  sellerAmount?: number;
  requirements?: string;
  deliveryMessage?: string;
  deliveryFiles: string[];
  revisions: number;
  maxRevisions: number;
  revisionNotes?: string;
  buyerNotes?: string;
  sellerNotes?: string;
  expectedDelivery?: string;
  paidAt?: string;
  deliveredAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Offer {
  _id: string;
  buyerId: User;
  listingId: Listing;
  amount: number;
  message?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  _id: string;
  orderId: string;
  senderId: User;
  receiverId: User;
  message: string;
  attachments: string[];
  read: boolean;
  createdAt: string;
}

// Form Data Types
export interface ListingFormData {
  title: string;
  description: string;
  price: number;
  type: string;
  category: string;
  tags: string[];
}

export interface OrderFormData {
  listingId: string;
  orderType: string;
  amount: number;
  requirements?: string;
  expectedDelivery?: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Filter Types
export interface ListingFilters {
  type: string;
  category: string;
  minPrice: string;
  maxPrice: string;
  tags: string[];
}

// Payment Types
export interface PaymentIntent {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
}