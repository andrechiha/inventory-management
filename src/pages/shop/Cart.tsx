import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCartStore } from '@/store/cartStore';
import { useOrderStore } from '@/store/orderStore';
import { useAuthStore } from '@/store/authStore';
import './Cart.css';

export default function Cart() {
  const { items, shippingAddress, updateQty, removeItem, setShippingAddress, clearCart, totalAmount, totalCount } = useCartStore();
  const { placeOrder, error: orderError } = useOrderStore();
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const total = totalAmount();
  const count = totalCount();
  const error = localError || orderError;

  const handleCheckout = () => {
    setLocalError('');

    if (items.length === 0) {
      setLocalError('Your cart is empty.');
      return;
    }

    if (!shippingAddress.trim()) {
      setLocalError('Please enter a shipping address.');
      return;
    }

    if (!user) {
      setLocalError('You must be signed in.');
      return;
    }

    setShowConfirm(true);
  };

  const handleConfirmOrder = async () => {
    if (!user) return;
    setShowConfirm(false);
    setSubmitting(true);
    const ok = await placeOrder(items, shippingAddress.trim(), user.id);
    setSubmitting(false);

    if (ok) {
      clearCart();
      navigate('/my-orders', { replace: true });
    }
  };

  if (items.length === 0) {
    return (
      <div className="cart-page">
        <h1 className="page-title">Cart</h1>
        <div className="cart-empty">
          <p>Your cart is empty.</p>
          <Link to="/shop" className="btn-back-shop">Browse Shop</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <h1 className="page-title">Cart</h1>
      <p className="page-description">Review your items and place your order.</p>

      {error && <div className="cart-error">{error}</div>}

      <div className="cart-table-wrap">
        <table className="cart-table">
          <thead>
            <tr>
              <th>Product</th>
              <th className="col-num">Price</th>
              <th className="col-num">Qty</th>
              <th className="col-num">Subtotal</th>
              <th className="col-action"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.item.id}>
                <td>
                  <span className="cart-item-name">{c.item.name}</span>
                  <span className="cart-item-cat">{c.item.category}</span>
                </td>
                <td className="col-num">${c.item.price.toFixed(2)}</td>
                <td className="col-num">
                  <input
                    type="number"
                    className="cart-qty-input"
                    value={c.quantity}
                    min={1}
                    max={c.item.quantity}
                    onChange={(e) => updateQty(c.item.id, Number(e.target.value))}
                  />
                </td>
                <td className="col-num">${(c.item.price * c.quantity).toFixed(2)}</td>
                <td className="col-action">
                  <button className="btn-remove" onClick={() => removeItem(c.item.id)}>
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="cart-checkout">
        <div className="checkout-address">
          <label className="checkout-label">
            Shipping Address
            <textarea
              className="checkout-textarea"
              rows={3}
              placeholder="Enter your full shipping address..."
              value={shippingAddress}
              onChange={(e) => setShippingAddress(e.target.value)}
            />
          </label>
        </div>

        <div className="checkout-summary">
          <div className="checkout-line">
            <span>Items</span>
            <span>{count}</span>
          </div>
          <div className="checkout-total">
            <span>Total</span>
            <span className="checkout-total-amount">${total.toFixed(2)}</span>
          </div>
          <button
            className="btn-place-order"
            onClick={handleCheckout}
            disabled={submitting}
          >
            {submitting ? 'Placing order...' : 'Place Order'}
          </button>
        </div>
      </div>

      {showConfirm && (
        <div className="confirm-overlay" onClick={() => setShowConfirm(false)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <h3 className="confirm-title">Confirm Order</h3>
            <p className="confirm-text">
              You are about to place an order for <strong>{count} item{count !== 1 ? 's' : ''}</strong> totaling <strong>${total.toFixed(2)}</strong>.
            </p>
            <p className="confirm-address">
              Shipping to: <em>{shippingAddress}</em>
            </p>
            <div className="confirm-actions">
              <button className="btn-confirm" onClick={handleConfirmOrder}>
                Confirm & Pay
              </button>
              <button className="btn-cancel" onClick={() => setShowConfirm(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
