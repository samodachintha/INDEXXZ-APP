import { Router, Request, Response } from 'express';
import { listings } from '../data/listings';
import { BidRequest, ApiResponse, Listing } from '../types';

export const listingsRouter = Router();

// GET /api/listings — search & filter
listingsRouter.get('/', (req: Request, res: Response) => {
  const query = ((req.query.q as string) || '').toLowerCase().trim();
  const category = ((req.query.category as string) || 'all').toLowerCase();
  const sort = (req.query.sort as string) || 'newest';
  const minPrice = Number(req.query.minPrice) || 0;
  const maxPrice = Number(req.query.maxPrice) || Infinity;

  let filtered = listings.filter((item) => {
    const matchesQuery =
      !query ||
      item.title.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query);
    const matchesCategory = category === 'all' || item.category.toLowerCase() === category;
    const matchesPrice = item.currentBid >= minPrice && item.currentBid <= maxPrice;
    return matchesQuery && matchesCategory && matchesPrice;
  });

  // Sort
  if (sort === 'price-asc') {
    filtered.sort((a, b) => a.currentBid - b.currentBid);
  } else if (sort === 'price-desc') {
    filtered.sort((a, b) => b.currentBid - a.currentBid);
  } else if (sort === 'ending') {
    filtered.sort((a, b) => a.timeLeft.localeCompare(b.timeLeft));
  } else {
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  const response: ApiResponse<{ listings: Listing[]; total: number }> = {
    success: true,
    data: { listings: filtered, total: filtered.length },
  };
  res.json(response);
});

// GET /api/listings/:id — single listing
listingsRouter.get('/:id', (req: Request, res: Response) => {
  const listing = listings.find((item) => item.id === req.params.id);
  if (!listing) {
    const response: ApiResponse = { success: false, error: 'Listing not found' };
    res.status(404).json(response);
    return;
  }
  const response: ApiResponse<Listing> = { success: true, data: listing };
  res.json(response);
});

// POST /api/listings/:id/bid
listingsRouter.post('/:id/bid', (req: Request, res: Response) => {
  const listing = listings.find((item) => item.id === req.params.id);
  if (!listing) {
    const response: ApiResponse = { success: false, error: 'Listing not found' };
    res.status(404).json(response);
    return;
  }
  if (listing.sold) {
    const response: ApiResponse = { success: false, error: 'This item has already been sold' };
    res.status(400).json(response);
    return;
  }

  const { amount } = req.body as BidRequest;
  if (!Number.isFinite(amount) || amount <= listing.currentBid) {
    const response: ApiResponse = {
      success: false,
      error: `Bid must be greater than $${listing.currentBid}`,
    };
    res.status(400).json(response);
    return;
  }
  if (amount >= listing.buyNowPrice) {
    const response: ApiResponse = { success: false, error: 'Use Buy Now for this amount' };
    res.status(400).json(response);
    return;
  }

  listing.currentBid = amount;
  listing.bids += 1;
  const response: ApiResponse<Listing> = {
    success: true,
    message: 'Bid placed successfully',
    data: listing,
  };
  res.json(response);
});

// POST /api/listings/:id/buy
listingsRouter.post('/:id/buy', (req: Request, res: Response) => {
  const listing = listings.find((item) => item.id === req.params.id);
  if (!listing) {
    const response: ApiResponse = { success: false, error: 'Listing not found' };
    res.status(404).json(response);
    return;
  }
  if (listing.sold) {
    const response: ApiResponse = { success: false, error: 'This item has already been sold' };
    res.status(400).json(response);
    return;
  }

  listing.sold = true;
  const response: ApiResponse<Listing> = {
    success: true,
    message: 'Purchase completed!',
    data: listing,
  };
  res.json(response);
});

// POST /api/listings/:id/watch
listingsRouter.post('/:id/watch', (req: Request, res: Response) => {
  const listing = listings.find((item) => item.id === req.params.id);
  if (!listing) {
    const response: ApiResponse = { success: false, error: 'Listing not found' };
    res.status(404).json(response);
    return;
  }

  listing.watchers += 1;
  const response: ApiResponse<Listing> = {
    success: true,
    message: 'Added to watchlist',
    data: listing,
  };
  res.json(response);
});
