import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import './Transactions.css';

interface Transaction {
  id: string;
  client_id: string;
  status: string;
  total_amount: number;
  shipping_address: string;
  created_at: string;
  client_name: string;
  client_email: string;
  items: { item_name: string; quantity: number; unit_price: number }[];
}

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    setError('');

    const { data: orders, error: ordersErr } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (ordersErr) {
      setError(ordersErr.message);
      setLoading(false);
      return;
    }

    if (!orders || orders.length === 0) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    const orderIds = orders.map((o) => o.id);
    const clientIds = [...new Set(orders.map((o) => o.client_id))];

    const [{ data: orderItems }, { data: profiles }, { data: inventoryItems }] = await Promise.all([
      supabase.from('order_items').select('*').in('order_id', orderIds),
      supabase.from('profiles').select('id, full_name, email').in('id', clientIds),
      supabase.from('inventory_items').select('id, name'),
    ]);

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
    const itemNameMap = new Map((inventoryItems ?? []).map((i) => [i.id, i.name]));

    const result: Transaction[] = orders.map((o) => {
      const profile = profileMap.get(o.client_id);
      const items = (orderItems ?? [])
        .filter((oi) => oi.order_id === o.id)
        .map((oi) => ({
          item_name: itemNameMap.get(oi.item_id) ?? 'Unknown',
          quantity: oi.quantity,
          unit_price: oi.unit_price,
        }));

      return {
        ...o,
        client_name: (profile?.full_name && profile.full_name.trim()) ? profile.full_name : profile?.email || 'Unknown client',
        client_email: profile?.email || '',
        items,
      };
    });

    setTransactions(result);
    setLoading(false);
  };

  const filtered = transactions.filter((t) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      t.client_name.toLowerCase().includes(q) ||
      t.client_email.toLowerCase().includes(q) ||
      t.status.toLowerCase().includes(q) ||
      t.items.some((i) => i.item_name.toLowerCase().includes(q)) ||
      t.id.toLowerCase().includes(q)
    );
  });

  const totalRevenue = transactions.reduce((sum, t) => sum + t.total_amount, 0);
  const completedRevenue = transactions
    .filter((t) => t.status === 'delivered')
    .reduce((sum, t) => sum + t.total_amount, 0);

  if (loading) {
    return (
      <div className="tx-page">
        <div className="route-loading"><span>Loading transactions…</span></div>
      </div>
    );
  }

  return (
    <div className="tx-page">
      <h1 className="page-title">Transactions</h1>
      <p className="page-description">Complete financial overview of all orders.</p>

      <div className="tx-stats">
        <div className="tx-stat">
          <span className="tx-stat-label">Total Orders</span>
          <span className="tx-stat-value">{transactions.length}</span>
        </div>
        <div className="tx-stat">
          <span className="tx-stat-label">Total Revenue</span>
          <span className="tx-stat-value">${totalRevenue.toFixed(2)}</span>
        </div>
        <div className="tx-stat">
          <span className="tx-stat-label">Delivered Revenue</span>
          <span className="tx-stat-value">${completedRevenue.toFixed(2)}</span>
        </div>
        <div className="tx-stat">
          <span className="tx-stat-label">Pending</span>
          <span className="tx-stat-value">
            {transactions.filter((t) => t.status === 'pending').length}
          </span>
        </div>
      </div>

      <div className="tx-search-wrap">
        <input
          type="text"
          className="tx-search"
          placeholder="Search by client, status, item name, order ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && <div className="tx-error">{error}</div>}

      {filtered.length === 0 ? (
        <div className="tx-empty">
          {transactions.length === 0 ? 'No transactions yet.' : 'No transactions match your search.'}
        </div>
      ) : (
        <div className="tx-table-wrap">
          <table className="tx-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Client</th>
                <th>Items</th>
                <th>Status</th>
                <th className="col-num">Amount</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id}>
                  <td className="cell-date">
                    {new Date(t.created_at).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
                    })}
                  </td>
                  <td>
                    <span className="tx-client-name">{t.client_name}</span>
                    <span className="tx-client-email">{t.client_email}</span>
                  </td>
                  <td>
                    {t.items.map((item, idx) => (
                      <div key={idx} className="tx-item-line">
                        {item.item_name} x{item.quantity}
                        <span className="tx-item-price"> ${(item.unit_price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </td>
                  <td>
                    <span className={`tx-status tx-status--${t.status}`}>{t.status}</span>
                  </td>
                  <td className="col-num tx-amount">${t.total_amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
