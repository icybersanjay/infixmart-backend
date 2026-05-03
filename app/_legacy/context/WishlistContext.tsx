"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import toast from 'react-hot-toast';
import { getData, postData, deleteData } from '../utils/api';

interface WishlistItem {
  id: number;
  productId: number;
  productTitle?: string;
  image?: string;
  rating?: number;
  price?: number;
  oldPrice?: number;
  discount?: number;
  brand?: string;
}

interface ProductForWishlist {
  id: number | string;
  name?: string;
  images?: string[];
  rating?: number;
  price?: number;
  oldprice?: number;
  discount?: number;
  brand?: string;
}

interface WishlistContextValue {
  wishlistItems: WishlistItem[];
  wishlistCount: number;
  isWishlisted: (productId: number) => boolean;
  toggleWishlist: (product: ProductForWishlist) => Promise<void>;
  clearWishlist: () => void;
}

const WishlistContext = createContext<WishlistContextValue | undefined>(undefined);

interface WishlistResponse {
  error?: boolean;
  data?: WishlistItem[];
  message?: string;
}

export const WishlistProvider = ({ children, enabled = true }: { children: ReactNode; enabled?: boolean }) => {
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);

  const fetchWishlist = async () => {
    const res = (await getData<WishlistResponse>('/api/mylist')) as WishlistResponse;
    if (res && !res.error) setWishlistItems(res.data || []);
    else setWishlistItems([]);
  };

  const clearWishlist = () => setWishlistItems([]);

  useEffect(() => {
    if (!enabled) {
      clearWishlist();
      return;
    }

    fetchWishlist();
  }, [enabled]);

  const wishlistCount = wishlistItems.length;

  const isWishlisted = (productId: number): boolean =>
    wishlistItems.some((i) => i.productId === productId);

  const toggleWishlist = async (product: ProductForWishlist): Promise<void> => {
    const existing = wishlistItems.find((i) => i.productId === Number(product.id));
    if (existing) {
      const res = (await deleteData<WishlistResponse>(`/api/mylist/remove/${existing.id}`)) as WishlistResponse;
      if (res && !res.error) {
        setWishlistItems((prev) => prev.filter((i) => i.id !== existing.id));
        toast('Removed from wishlist', { duration: 1500 });
      } else {
        toast.error(res?.message === 'Unauthorized' ? 'Please login to save items' : (res?.message || 'Could not update wishlist'));
      }
    } else {
      const res = (await postData<WishlistResponse>('/api/mylist/add', {
        productId: product.id,
        productTitle: product.name,
        image: product.images?.[0] || '',
        rating: product.rating || 0,
        price: product.price || 0,
        oldPrice: product.oldprice || 0,
        discount: product.discount || 0,
        brand: product.brand || '',
      })) as WishlistResponse;
      if (res && !res.error) {
        fetchWishlist();
        toast.success('Added to wishlist!', { duration: 1500 });
      } else {
        toast.error(res?.message === 'Unauthorized' ? 'Please login to save items' : (res?.message || 'Could not update wishlist'));
      }
    }
  };

  return (
    <WishlistContext.Provider value={{ wishlistItems, wishlistCount, isWishlisted, toggleWishlist, clearWishlist }}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = (): WishlistContextValue => {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider');
  return ctx;
};
export default WishlistContext;
