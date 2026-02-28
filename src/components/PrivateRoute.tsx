import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

export default function PrivateRoute() {
  const loading = useAuthStore((s) => s.loading);
  const user = useAuthStore((s) => s.user);

  if (loading) {
    return (
      <div className="route-loading">
        <span>Loading…</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
