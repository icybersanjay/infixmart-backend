import { useContext } from 'react';
import { useRouter } from 'next/navigation';
import { MyContext } from '../LegacyProviders';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { postData } from '../utils/api';

const useLogout = () => {
  const context = useContext(MyContext);
  const { clearCart } = useCart();
  const { clearWishlist } = useWishlist();
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
