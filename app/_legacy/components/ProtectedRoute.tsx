"use client";

import { useContext, useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { MyContext } from '../LegacyProviders';

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isLogin, authLoading } = useContext(MyContext) as { isLogin: boolean; authLoading: boolean };
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !isLogin) {
      router.replace('/login');
    }
  }, [authLoading, isLogin, router]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-10 h-10 border-4 border-[#ff5252] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return isLogin ? <>{children}</> : null;
};

export default ProtectedRoute;
