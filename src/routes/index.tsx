import { createBrowserRouter, Navigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import MainLayout from '@/layouts/MainLayout';
import PrivateRoute from '@/components/PrivateRoute';
import RoleRoute from '@/components/RoleRoute';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import ManageInventory from '@/pages/inventory/ManageInventory';
import Inventory from '@/pages/inventory/Inventory';
import Transactions from '@/pages/Transactions';
import Orders from '@/pages/Orders';
import Recommended from '@/pages/Recommended';
import Shop from '@/pages/shop/Shop';
import Cart from '@/pages/shop/Cart';
import MyOrders from '@/pages/shop/MyOrders';

function DefaultRedirect() {
  const role = useAuthStore((s) => s.role);
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={role === 'client' ? '/shop' : '/dashboard'} replace />;
}

function NotFound() {
  const role = useAuthStore((s) => s.role);
  const home = role === 'client' ? '/shop' : '/dashboard';
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '100vh', gap: '1rem',
      fontFamily: 'Inter, system-ui, sans-serif', color: '#111827',
    }}>
      <h1 style={{ fontSize: '4rem', fontWeight: 800, margin: 0, color: '#d1d5db' }}>404</h1>
      <p style={{ fontSize: '1rem', color: '#6b7280', margin: 0 }}>
        The page you're looking for doesn't exist.
      </p>
      <Link to={home} style={{
        marginTop: '0.5rem', padding: '0.5rem 1.25rem',
        background: '#2563eb', color: '#fff', borderRadius: '6px',
        fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none',
      }}>
        Go Home
      </Link>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    element: <PrivateRoute />,
    children: [
      {
        element: <MainLayout />,
        children: [
          { path: '/inventory', element: <Inventory /> },

          {
            element: <RoleRoute allowed={['owner', 'staff']} />,
            children: [
              { path: '/dashboard', element: <Dashboard /> },
              { path: '/orders', element: <Orders /> },
            ],
          },

          {
            element: <RoleRoute allowed={['owner']} />,
            children: [
              { path: '/inventory/manage', element: <ManageInventory /> },
              { path: '/transactions', element: <Transactions /> },
            ],
          },

          {
            element: <RoleRoute allowed={['owner', 'client']} />,
            children: [
              { path: '/recommended', element: <Recommended /> },
            ],
          },

          {
            element: <RoleRoute allowed={['client']} />,
            children: [
              { path: '/shop', element: <Shop /> },
              { path: '/cart', element: <Cart /> },
              { path: '/my-orders', element: <MyOrders /> },
            ],
          },
        ],
      },
    ],
  },
  {
    path: '/',
    element: <DefaultRedirect />,
  },
  {
    path: '*',
    element: <NotFound />,
  },
]);
