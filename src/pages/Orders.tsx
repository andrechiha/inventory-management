import { useEffect, useState } from 'react';
import { useOrderStore } from '@/store/orderStore';
import type { OrderWithItems, OrderStatus } from '@/types';
import './Orders.css';

const STATUS_OPTIONS: OrderStatus[] = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

export default function Orders() {
  const { orders, loading, error, fetchAllOrders, updateStatus } = useOrderStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    fetchAllOrders();
  }, [fetchAllOrders]);

  const toggle = (id: string) =>
    setExpandedId((prev) => (prev === id ? null : id));

  const handleStatusChange = async (orderId: string, status: OrderStatus) => {
    setUpdatingId(orderId);
    const ok = await updateStatus(orderId, status);
    setUpdatingId(null);

    if (ok) {
      setToast({ type: 'success', msg: `Status updated to "${status}" and saved.` });
    } else {
      setToast({ type: 'error', msg: 'Failed to save status. Please try again.' });
    }
    setTimeout(() => setToast(null), 3000);
  };

  const filtered = orders.filter((o) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (o.client_name ?? '').toLowerCase().includes(q) ||
      (o.client_email ?? '').toLowerCase().includes(q) ||
      o.status.toLowerCase().includes(q) ||
      o.shipping_address.toLowerCase().includes(q) ||
      o.items.some((i) => i.item_name.toLowerCase().includes(q)) ||
      o.id.toLowerCase().includes(q)
    );
  });

  if (loading && orders.length === 0) {
    return (
      <div className="orders-page">
        <div className="route-loading"><span>Loading orders…</span></div>
      </div>
    );
  }

  return (
    <div className="orders-page">
      <h1 className="page-title">Orders</h1>
      <p className="page-description">View and manage all customer orders.</p>

      <div className="orders-search-wrap">
        <input
          type="text"
          className="orders-search"
          placeholder="Search by client, status, address, item name, order ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {toast && (
        <div className={`orders-toast orders-toast--${toast.type}`}>{toast.msg}</div>
      )}

      {error && <div className="orders-error">{error}</div>}

      {filtered.length === 0 && !loading ? (
        <div className="orders-empty">
          <p>{orders.length === 0 ? 'No orders yet.' : 'No orders match your search.'}</p>
        </div>
      ) : (
        <div className="orders-list">
          {filtered.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              expanded={expandedId === order.id}
              updating={updatingId === order.id}
              onToggle={() => toggle(order.id)}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function OrderCard({ order, expanded, updating, onToggle, onStatusChange }: {
  order: OrderWithItems;
  expanded: boolean;
  updating: boolean;
  onToggle: () => void;
  onStatusChange: (id: string, status: OrderStatus) => void;
}) {
  const dateStr = new Date(order.created_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
  const timeStr = new Date(order.created_at).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit',
  });
  const totalQty = order.items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className={`order-card ${expanded ? 'order-card--expanded' : ''}`}>
      <div className="order-card-header" onClick={onToggle}>
        <div className="order-card-left">
          <span className="order-card-date">{dateStr} at {timeStr}</span>
          <span className="order-card-client">{order.client_name ?? 'Unknown client'}</span>
        </div>
        <div className="order-card-right">
          <select
            className={`status-select status-${order.status}`}
            value={order.status}
            disabled={updating}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => onStatusChange(order.id, e.target.value as OrderStatus)}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <span className="order-card-total">${order.total_amount.toFixed(2)}</span>
          <span className="order-card-qty">{totalQty} unit{totalQty !== 1 ? 's' : ''}</span>
          <span className="order-card-expand">{expanded ? '▾' : '▸'}</span>
        </div>
      </div>

      {expanded && (
        <div className="order-card-body">
          <div className="order-info-grid">
            <div className="order-info-item">
              <span className="info-label">Order ID</span>
              <span className="info-value info-mono">{order.id.slice(0, 8)}…</span>
            </div>
            <div className="order-info-item">
              <span className="info-label">Client</span>
              <span className="info-value">{order.client_name ?? '—'}</span>
            </div>
            <div className="order-info-item">
              <span className="info-label">Email</span>
              <span className="info-value">{order.client_email ?? '—'}</span>
            </div>
            <div className="order-info-item">
              <span className="info-label">Placed on</span>
              <span className="info-value">{dateStr} at {timeStr}</span>
            </div>
            <div className="order-info-item order-info-item--wide">
              <span className="info-label">Shipping Address</span>
              <span className="info-value">{order.shipping_address || '—'}</span>
            </div>
          </div>

          <h4 className="detail-section-title">Items to prepare</h4>
          <table className="order-items-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Item</th>
                <th className="col-num">Qty</th>
                <th className="col-num">Unit Price</th>
                <th className="col-num">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, idx) => (
                <tr key={item.id}>
                  <td className="cell-row-num">{idx + 1}</td>
                  <td className="cell-item-name">{item.item_name}</td>
                  <td className="col-num">{item.quantity}</td>
                  <td className="col-num">${item.unit_price.toFixed(2)}</td>
                  <td className="col-num">${(item.unit_price * item.quantity).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2} className="total-label">Total</td>
                <td className="col-num total-value">{totalQty}</td>
                <td></td>
                <td className="col-num total-value">${order.total_amount.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
