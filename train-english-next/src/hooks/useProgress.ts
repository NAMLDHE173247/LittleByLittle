import useSWR from 'swr';
import { useAuth } from '@/AuthContext';

export function useProgress() {
  const { authHeaders, user } = useAuth();
  
  const fetcher = async (url: string) => {
    const res = await fetch(url, {
      headers: authHeaders(),
    });
    const json = await res.json();
    if (!json.success) {
      throw new Error(json.message || 'Lỗi lấy dữ liệu progress');
    }
    return json.data;
  };

  const { data, error, isLoading, mutate } = useSWR(
    user ? `${process.env.NEXT_PUBLIC_API_URL || ''}/api/progress/stats` : null,
    fetcher
  );

  return {
    progressData: data,
    isLoading,
    isError: error,
    mutate
  };
}
