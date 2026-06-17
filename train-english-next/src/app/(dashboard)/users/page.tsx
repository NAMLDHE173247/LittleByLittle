"use client";
import React from 'react';
import { useAuth } from '@/AuthContext';
import { useGlobalData } from '@/components/providers/GlobalDataProvider';
import UserManagementPage from '@/components/features/UserManagement/UserManagementPage';

export default function UsersRoute() {
  const { user } = useAuth();
  const { darkMode } = useGlobalData();

  if (user?.role !== 'admin') {
    return <div className="p-8 text-center text-gray-500">Bạn không có quyền truy cập trang này.</div>;
  }

  return <UserManagementPage darkMode={darkMode} />;
}
