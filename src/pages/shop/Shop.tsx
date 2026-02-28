import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useInventoryStore } from '@/store/inventoryStore';
import { useCartStore } from '@/store/cartStore';
import type { InventoryItem } from '@/types';
import './Shop.css';

export default function Shop() {
  const { items, loading, fetch } = useInventoryStore();
  const { addItem, totalCount } = useCartStore();
  const [search, setSearch] = useState('');
  const [addedId, setAddedId] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    fetch();
  }, [fetch]);

  const filtered = items.filter((item) => {
    const q = search.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    );
  });

  const getQty = (id: string) => quantities[id] ?? 1;

  const setQty = (id: string, val: number) => {
    setQuantities((prev) => ({ ...prev, [id]: val }));
  };

  const handleAdd = (item: InventoryItem) => {
    const qty = Math.min(getQty(item.id), item.quantity);
    if (qty < 1) return;
    addItem(item, qty);
    setAddedId(item.id);
    setQuantities((prev) => ({ ...prev, [item.id]: 1 }));
    setTimeout(() => setAddedId(null), 1200);
  };

  const cartCount = totalCount();

  if (loading && items.length === 0) {
    return (
      <div className="shop-page">
        <div className="route-loading"><span>Loading products…</span></div>
      </div>
    );
  }

  return (
    <div className="shop-page">
      <header className="shop-header">
        <div>
          <h1 className="page-title">Shop</h1>
          <p className="page-description">Browse products and add them to your cart.</p>
        </div>
        {cartCount > 0 && (
          <Link to="/cart" className="cart-badge">
            Cart ({cartCount})
          </Link>
        )}
      </header>

      <div className="shop-search-wrap">
        <input
          type="text"
          className="shop-search"
          placeholder="Search by name, description, or category…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="product-grid">
        {filtered.map((item) => {
          const soldOut = item.quantity <= 0;

          return (
            <div key={item.id} className={`product-card ${soldOut ? 'product-card--sold-out' : ''}`}>
              {soldOut && <div className="sold-out-overlay">Sold Out</div>}
              <div className="product-category">{item.category}</div>
              <h3 className="product-name">{item.name}</h3>
              <p className="product-desc">{item.description}</p>
              <div className="product-footer">
                <span className="product-price">${item.price.toFixed(2)}</span>
                {!soldOut && (
                  <div className="add-to-cart-group">
                    <div className="qty-stepper">
                      <button
                        type="button"
                        className="qty-btn"
                        onClick={() => setQty(item.id, Math.max(1, getQty(item.id) - 1))}
                        disabled={getQty(item.id) <= 1}
                      >−</button>
                      <span className="qty-value">{getQty(item.id)}</span>
                      <button
                        type="button"
                        className="qty-btn"
                        onClick={() => setQty(item.id, Math.min(item.quantity, getQty(item.id) + 1))}
                        disabled={getQty(item.id) >= item.quantity}
                      >+</button>
                    </div>
                    <button
                      className={`btn-add-cart ${addedId === item.id ? 'added' : ''}`}
                      onClick={() => handleAdd(item)}
                    >
                      {addedId === item.id ? 'Added!' : 'Add to Cart'}
                    </button>
                  </div>
                )}
              </div>
              <span className="product-stock">
                {soldOut ? '' : `${item.quantity} in stock`}
              </span>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="no-results">No products match your search.</p>
        )}
      </div>
    </div>
  );
}
