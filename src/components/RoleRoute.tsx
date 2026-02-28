import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import type { Role } from '@/types';

interface RoleRouteProps {
  allowed: Role[];
}

export default function RoleRoute({ allowed }: RoleRouteProps) {
  const role = useAuthStore((s) => s.role);
  const profileLoading = useAuthStore((s) => s.profileLoading);

  if (profileLoading) {
    return (
      <div className="route-loading">
        <span>Loading…</span>
      </div>
    );
  }

  if (!role || role === 'unknown' || !allowed.includes(role)) {
    const fallback = role === 'client' ? '/shop' : '/dashboard';
    return <Navigate to={fallback} replace />;
  }

  return <Outlet />;
}
