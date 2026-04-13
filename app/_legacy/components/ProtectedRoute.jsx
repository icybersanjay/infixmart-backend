"use client";

import React, { useContext, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MyContext } from '../LegacyProviders';

const ProtectedRoute = ({ children }) => {
  const { isLogin, authLoading } = useContext(MyContext);
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

  return isLogin ? children : null;
};

export default ProtectedRoute;
