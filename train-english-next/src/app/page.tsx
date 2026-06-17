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
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-3">📚</div>
          <div>Đang tải...</div>
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
