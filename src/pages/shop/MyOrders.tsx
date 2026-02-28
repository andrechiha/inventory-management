import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useOrderStore } from '@/store/orderStore';
import type { OrderWithItems } from '@/types';
import './MyOrders.css';

export default function MyOrders() {
  const user = useAuthStore((s) => s.user);
  const { orders, loading, error, fetchMyOrders } = useOrderStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (user) fetchMyOrders(user.id);
  }, [user, fetchMyOrders]);

  const toggle = (id: string) =>
    setExpandedId((prev) => (prev === id ? null : id));

  if (loading && orders.length === 0) {
    return (
      <div className="myorders-page">
        <div className="route-loading"><span>Loading orders…</span></div>
      </div>
    );
  }

  return (
    <div className="myorders-page">
      <h1 className="page-title">My Orders</h1>
      <p className="page-description">Track the status of your orders.</p>

      {error && <div className="orders-error">{error}</div>}

      {orders.length === 0 && !loading ? (
        <div className="orders-empty">
          <p>You haven't placed any orders yet.</p>
          <Link to="/shop" className="btn-back-shop">Browse Shop</Link>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              expanded={expandedId === order.id}
              onToggle={() => toggle(order.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function OrderCard({ order, expanded, onToggle }: {
  order: OrderWithItems;
  expanded: boolean;
  onToggle: () => void;
}) {
  const date = new Date(order.created_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  return (
    <div className="order-card">
      <div className="order-card-header" onClick={onToggle}>
        <div className="order-meta">
          <span className="order-date">{date}</span>
          <span className={`status-badge status-${order.status}`}>{order.status}</span>
        </div>
        <div className="order-summary">
          <span className="order-total">${order.total_amount.toFixed(2)}</span>
          <span className="order-item-count">{order.items.length} item{order.items.length !== 1 ? 's' : ''}</span>
        </div>
        <span className="order-expand">{expanded ? '▾' : '▸'}</span>
      </div>

      {expanded && (
        <div className="order-card-body">
          <div className="order-address">
            <strong>Ship to:</strong> {order.shipping_address}
          </div>
          <table className="order-items-table">
            <thead>
              <tr>
                <th>Item</th>
                <th className="col-num">Qty</th>
                <th className="col-num">Price</th>
                <th className="col-num">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td>{item.item_name}</td>
                  <td className="col-num">{item.quantity}</td>
                  <td className="col-num">${item.unit_price.toFixed(2)}</td>
                  <td className="col-num">${(item.unit_price * item.quantity).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
