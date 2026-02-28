import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useInventoryStore } from '@/store/inventoryStore';
import type { InventoryItem } from '@/types';
import './Inventory.css';

export default function Inventory() {
  const role = useAuthStore((s) => s.role);
  const { items, loading, error, fetch } = useInventoryStore();
  const isOwner = role === 'owner';
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch();
  }, [fetch]);

  const isLow = (item: InventoryItem) => item.quantity <= item.minimum_stock_threshold;

  const filtered = items.filter((item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    );
  });

  if (loading && items.length === 0) {
    return (
      <div className="inventory-page">
        <div className="route-loading"><span>Loading inventory…</span></div>
      </div>
    );
  }

  return (
    <div className="inventory-page">
      <header className="inventory-header">
        <div>
          <h1 className="page-title">Inventory</h1>
          <p className="page-description">
            {isOwner
              ? 'Full inventory overview. Manage items from Inventory Management.'
              : 'Browse current stock levels.'}
          </p>
        </div>
      </header>

      <div className="inv-search-wrap">
        <input
          type="text"
          className="inv-search"
          placeholder="Search by name, description, or category…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && <div className="inv-error">{error}</div>}

      <div className="table-wrap">
        <table className="inv-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Description</th>
              <th>Category</th>
              <th className="col-num">Quantity</th>
              {isOwner && <th className="col-num">Price</th>}
              {isOwner && <th className="col-num">Min Stock</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id} className={isLow(item) ? 'row-low' : ''}>
                <td className="cell-name">{item.name}</td>
                <td className="cell-desc">{item.description}</td>
                <td>{item.category}</td>
                <td className="col-num">
                  <span className={isLow(item) ? 'qty-low' : ''}>
                    {item.quantity}
                  </span>
                </td>
                {isOwner && (
                  <td className="col-num">${item.price.toFixed(2)}</td>
                )}
                {isOwner && (
                  <td className="col-num">{item.minimum_stock_threshold}</td>
                )}
              </tr>
            ))}
            {filtered.length === 0 && !loading && (
              <tr>
                <td colSpan={isOwner ? 6 : 4} className="empty-state">
                  {items.length === 0 ? 'No inventory items found.' : 'No items match your search.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
