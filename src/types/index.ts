export interface Listing {
  id: string;
  title: string;
  description: string;
  category: string;
  condition: string;
  location: string;
  shipping: string;
  timeLeft: string;
  buyNowPrice: number;
  currentBid: number;
  image: string;
  seller: string;
  watchers: number;
  bids: number;
  sold: boolean;
  createdAt: string;
}

export interface BidRequest {
  amount: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
