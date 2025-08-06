// src/types.ts
export interface User {
    _id: string;
    username: string;
    email: string;
    avatar: string;
    dob: string;
  }
  
  export interface Video {
    _id: string;
    title: string;
    description: string;
    url: string;
    genre: string;
    duration: number;
  }
  
  export interface Transaction {
    _id: string;
    userId: string;
    amount: number;
    currency: string;
    status: string;
  }
  
  // Add other shared interfaces here