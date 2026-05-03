"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import toast from 'react-hot-toast';
import { getData, postData, putData, deleteData } from '../utils/api';

interface CartProductDetails {
  id?: number | string;
  _id?: number | string;
  name?: string;
  images?: string[];
  price?: number;
  oldPrice?: number;
  brand?: string;
}

interface CartItem {
  id: number | string;
  productId: CartProductDetails | number | string;
  quantity?: number;
  variantId?: number | null;
  [key: string]: unknown;
}

interface CartResponse {
  error?: boolean;
  cartItem?: CartItem[];
  message?: string;
  price?: number;
  name?: string;
}

interface CartContextValue {
  cartItems: CartItem[];
  cartCount: number;
  lastAddedAt: number;
  addToCart: (productId: number | string, variantId?: number | null) => Promise<CartResponse | undefined | void>;
  updateQty: (cartItemId: number | string, quantity: number) => Promise<CartResponse | void>;
  removeItem: (cartItemId: number | string) => Promise<CartResponse | void>;
  fetchCart: () => Promise<void>;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

const GUEST_KEY = 'infix_guest_cart';

function loadGuest(): CartItem[] {
  try {
    return JSON.parse(localStorage.getItem(GUEST_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveGuest(items: CartItem[]): void {
  try {
    localStorage.setItem(GUEST_KEY, JSON.stringify(items));
  } catch {}
}

function clearGuest(): void {
  try {
    localStorage.removeItem(GUEST_KEY);
  } catch {}
}

function getProductIdFromGuestItem(item: CartItem): number | string | undefined {
  const pid = item.productId;
  if (pid && typeof pid === 'object') return (pid as CartProductDetails).id;
  return pid as number | string | undefined;
}

export const CartProvider = ({ children, enabled = true }: { children: ReactNode; enabled?: boolean }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartCount, setCartCount] = useState(0);
  const [lastAddedAt, setLastAddedAt] = useState(0);
  const prevEnabled = useRef(enabled);

  const computeCount = (items: CartItem[]): number =>
    items.reduce((s, i) => s + (i.quantity || 1), 0);

  const fetchCart = useCallback(async () => {
    const res = (await getData<CartResponse>('/api/cart')) as CartResponse;
    if (res && !res.error) {
      const items = res.cartItem || [];
      setCartItems(items);
      setCartCount(computeCount(items));
    } else {
      setCartItems([]);
      setCartCount(0);
    }
  }, []);

  const loadGuestCart = useCallback(() => {
    const items = loadGuest();
    setCartItems(items);
    setCartCount(computeCount(items));
  }, []);

  const mergeGuestCart = useCallback(async () => {
    const guest = loadGuest();
    if (guest.length === 0) return;
    await Promise.all(
      guest.map((g) =>
        postData('/api/cart/add', {
          productId: getProductIdFromGuestItem(g),
          quantity: g.quantity || 1,
        }).catch(() => null)
      )
    );
    clearGuest();
  }, []);

  useEffect(() => {
    const wasEnabled = prevEnabled.current;
    prevEnabled.current = enabled;

    if (enabled) {
      if (!wasEnabled) {
        mergeGuestCart().then(() => fetchCart());
      } else {
        fetchCart();
      }
    } else {
      loadGuestCart();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  const addToCart = async (productId: number | string, variantId: number | null = null) => {
    if (enabled) {
      const payload = variantId ? { productId, variantId } : { productId };
      const res = (await postData<CartResponse>('/api/cart/add', payload)) as CartResponse;
      if (res && !res.error) {
        setLastAddedAt(Date.now());
        toast.success('Added to cart!', { duration: 2000 });
        try {
          const { trackAddToCart } = await import('../utils/analytics');
          trackAddToCart({ id: productId, price: res.price ?? 0, name: res.name }, 1);
        } catch {}
        try {
          const { breadcrumb } = await import('../../../lib/client/sentry-breadcrumb.js');
          breadcrumb('cart', 'add_to_cart_success', { productId, variantId, mode: 'logged_in' });
        } catch {}
        fetchCart();
      } else {
        toast.error(res?.message === 'Unauthorized' ? 'Please login to add items to cart' : (res?.message || 'Could not add to cart'));
        try {
          const { breadcrumb } = await import('../../../lib/client/sentry-breadcrumb.js');
          breadcrumb('cart', 'add_to_cart_failed', { productId, variantId, error: res?.message }, 'warning');
        } catch {}
      }
      return res;
    }

    // Guest mode: fetch product data, save to localStorage
    try {
      const res = (await getData<{ product?: CartProductDetails; error?: boolean }>(`/api/product/getproduct/${productId}`)) as { product?: CartProductDetails; error?: boolean };
      const product = res?.product || (res as unknown as CartProductDetails);
      if (!product || (product as { error?: boolean }).error) {
        toast.error('Could not add to cart');
        return;
      }

      const current = loadGuest();
      const existing = current.find((i) => getProductIdFromGuestItem(i) === productId);
      let updated: CartItem[];
      if (existing) {
        updated = current.map((i) =>
          getProductIdFromGuestItem(i) === productId
            ? { ...i, quantity: (i.quantity || 1) + 1 }
            : i
        );
      } else {
        updated = [...current, { id: `guest_${Date.now()}_${productId}`, productId: product, quantity: 1 }];
      }
      saveGuest(updated);
      setCartItems(updated);
      setCartCount(computeCount(updated));
      setLastAddedAt(Date.now());
      toast.success('Added to cart!', { duration: 2000 });
    } catch {
      toast.error('Could not add to cart');
    }
  };

  const updateQty = async (cartItemId: number | string, quantity: number) => {
    if (enabled) {
      const res = (await putData<CartResponse>('/api/cart/update-qty', { _id: cartItemId, quantity })) as CartResponse;
      if (res && !res.error) {
        setCartItems((prev) => prev.map((i) => (i.id === cartItemId ? { ...i, quantity } : i)));
        setCartCount((prev) => {
          const item = cartItems.find((i) => i.id === cartItemId);
          return Math.max(0, prev + quantity - (item?.quantity || 1));
        });
      }
      return res;
    }

    const updated = loadGuest().map((i) => (i.id === cartItemId ? { ...i, quantity } : i));
    saveGuest(updated);
    setCartItems(updated);
    setCartCount(computeCount(updated));
  };

  const removeItem = async (cartItemId: number | string) => {
    if (enabled) {
      const res = (await deleteData<CartResponse>('/api/cart/delete', { _id: cartItemId })) as CartResponse;
      if (res && !res.error) {
        const removed = cartItems.find((i) => i.id === cartItemId);
        setCartItems((prev) => prev.filter((i) => i.id !== cartItemId));
        setCartCount((prev) => Math.max(0, prev - (removed?.quantity || 1)));
        toast.success('Item removed from cart');
      }
      return res;
    }

    const removed = loadGuest().find((i) => i.id === cartItemId);
    const updated = loadGuest().filter((i) => i.id !== cartItemId);
    saveGuest(updated);
    setCartItems(updated);
    setCartCount((prev) => Math.max(0, prev - (removed?.quantity || 1)));
    toast.success('Item removed from cart');
  };

  const clearCart = () => {
    setCartItems([]);
    setCartCount(0);
  };

  return (
    <CartContext.Provider value={{ cartItems, cartCount, lastAddedAt, addToCart, updateQty, removeItem, fetchCart, clearCart }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextValue => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};
export default CartContext;
