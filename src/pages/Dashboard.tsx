import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useInventoryStore } from '@/store/inventoryStore';
import { supabase } from '@/lib/supabase';
import './Dashboard.css';

export default function Dashboard() {
  const profile = useAuthStore((s) => s.profile);
  const role = useAuthStore((s) => s.role);
  const { items, fetch } = useInventoryStore();
  const [orderStats, setOrderStats] = useState({ total: 0, pending: 0, revenue: 0 });

  useEffect(() => {
    if (role === 'owner' || role === 'staff') {
      fetch();
      fetchOrderStats();
    }
  }, [role, fetch]);

  const fetchOrderStats = async () => {
    const { data } = await supabase.from('orders').select('status, total_amount');
    if (data) {
      setOrderStats({
        total: data.length,
        pending: data.filter((o) => o.status === 'pending').length,
        revenue: data.reduce((sum, o) => sum + (o.total_amount ?? 0), 0),
      });
    }
  };

  const displayName = (profile?.full_name && profile.full_name.trim()) ? profile.full_name : profile?.email || 'User';

  const totalItems = items.length;
  const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);
  const lowStock = items.filter((i) => i.quantity <= i.minimum_stock_threshold).length;
  const outOfStock = items.filter((i) => i.quantity <= 0).length;
  const categories = new Set(items.map((i) => i.category)).size;
  const totalValue = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Dashboard</h1>
        <p className="dashboard-greeting">Welcome back, {displayName}</p>
      </header>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Products</span>
          <span className="stat-value">{totalItems}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Total Units</span>
          <span className="stat-value">{totalQuantity.toLocaleString()}</span>
        </div>
        <div className={`stat-card ${lowStock > 0 ? 'stat-card--warn' : ''}`}>
          <span className="stat-label">Low Stock</span>
          <span className="stat-value">{lowStock}</span>
          {outOfStock > 0 && (
            <span className="stat-hint">{outOfStock} out of stock</span>
          )}
        </div>
        {role === 'owner' && (
          <>
            <div className="stat-card">
              <span className="stat-label">Categories</span>
              <span className="stat-value">{categories}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Inventory Value</span>
              <span className="stat-value">${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Total Revenue</span>
              <span className="stat-value">${orderStats.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </>
        )}
        <div className="stat-card">
          <span className="stat-label">Total Orders</span>
          <span className="stat-value">{orderStats.total}</span>
        </div>
        {orderStats.pending > 0 && (
          <div className="stat-card stat-card--warn">
            <span className="stat-label">Pending Orders</span>
            <span className="stat-value">{orderStats.pending}</span>
            <span className="stat-hint">Needs attention</span>
          </div>
        )}
      </div>
    </div>
  );
}
