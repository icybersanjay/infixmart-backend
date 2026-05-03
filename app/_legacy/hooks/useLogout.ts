"use client";

import { useContext } from 'react';
import { useRouter } from 'next/navigation';
import { MyContext } from '../LegacyProviders';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { postData } from '../utils/api';

interface LegacyContext {
  setIsLogin: (v: boolean) => void;
  setUserData: (u: unknown) => void;
}

const useLogout = () => {
  const context = useContext(MyContext) as LegacyContext;
  const { clearCart } = useCart() as { clearCart: () => void };
  const { clearWishlist } = useWishlist() as { clearWishlist: () => void };
  const router = useRouter();

  return async () => {
    // server-side logout clears httpOnly cookies
    await postData('/api/user/logout', {}).catch(() => {});
    context.setIsLogin(false);
    context.setUserData(null);
    clearCart();
    clearWishlist();
    router.push('/login');
  };
};

export default useLogout;
