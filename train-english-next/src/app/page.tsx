"use client";
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/AuthContext';
import { LoginPage } from '@/components/features/Auth/AuthPages';
import { LandingPage } from '@/components/features/Landing/LandingPage';
import { useRouter } from 'next/navigation';

export default function App() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace('/vocabulary');
    }
  }, [user, loading, router]);
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500 flex flex-col items-center">
          <svg className="animate-spin h-10 w-10 mb-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <div className="text-sm font-medium animate-pulse">Đang tải dữ liệu...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    if (!showAuth) {
      return <LandingPage darkMode={false} onLoginClick={() => setShowAuth(true)} />;
    }
    return <LoginPage darkMode={false} />;
  }

  return null; // Redirecting
}
