import { useEffect, useState } from 'react';
import { useInventoryStore } from '@/store/inventoryStore';
import type { InventoryItem } from '@/types';
import './ManageInventory.css';

type FormData = Omit<InventoryItem, 'id'>;

const EMPTY_FORM: FormData = {
  name: '',
  description: '',
  category: '',
  quantity: 0,
  price: 0,
  minimum_stock_threshold: 0,
};

export default function ManageInventory() {
  const { items, loading, error, fetch, add, update, remove } = useInventoryStore();

  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch();
  }, [fetch]);

  const openAdd = () => {
    setEditItem(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (item: InventoryItem) => {
    setEditItem(item);
    setForm({
      name: item.name,
      description: item.description,
      category: item.category,
      quantity: item.quantity,
      price: item.price,
      minimum_stock_threshold: item.minimum_stock_threshold,
    });
    setFormError('');
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditItem(null);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setFormError('Name is required.');
      return;
    }
    if (!form.category.trim()) {
      setFormError('Category is required.');
      return;
    }
    if (form.price < 0) {
      setFormError('Price cannot be negative.');
      return;
    }
    if (form.quantity < 0) {
      setFormError('Quantity cannot be negative.');
      return;
    }

    setSaving(true);
    let ok: boolean;

    if (editItem) {
      ok = await update(editItem.id, form);
    } else {
      ok = await add(form);
    }

    setSaving(false);

    if (ok) {
      closeForm();
    } else {
      setFormError(useInventoryStore.getState().error ?? 'Save failed.');
    }
  };

  const handleDelete = async (item: InventoryItem) => {
    if (!window.confirm(`Delete "${item.name}"? This action cannot be undone.`)) return;
    await remove(item.id);
  };

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

  return (
    <div className="manage-page">
      <header className="inventory-header">
        <div>
          <h1 className="page-title">Inventory Management</h1>
          <p className="page-description">Add, edit, and remove inventory items.</p>
        </div>
        <button className="btn-primary" onClick={openAdd}>
          + Add Item
        </button>
      </header>

      <div className="inv-search-wrap">
        <input
          type="text"
          className="inv-search"
          placeholder="Search by name, description, or category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && !showForm && <div className="inv-error">{error}</div>}

      {showForm && (
        <div className="item-form-card">
          <h2 className="form-card-title">
            {editItem ? 'Edit Item' : 'New Item'}
          </h2>

          {formError && <div className="form-error">{formError}</div>}

          <div className="form-grid">
            <label className="form-field">
              Name
              <input
                className="form-input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label className="form-field form-field--wide">
              Description
              <input
                className="form-input"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </label>
            <label className="form-field">
              Category
              <input
                className="form-input"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            </label>
            <label className="form-field">
              Quantity
              <input
                type="number"
                className="form-input"
                value={form.quantity}
                min={0}
                onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
              />
            </label>
            <label className="form-field">
              Price
              <input
                type="number"
                className="form-input"
                value={form.price}
                min={0}
                step={0.01}
                onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
              />
            </label>
            <label className="form-field">
              Min Stock Threshold
              <input
                type="number"
                className="form-input"
                value={form.minimum_stock_threshold}
                min={0}
                onChange={(e) => setForm({ ...form, minimum_stock_threshold: Number(e.target.value) })}
              />
            </label>
          </div>

          <div className="form-actions">
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : editItem ? 'Save Changes' : 'Add Item'}
            </button>
            <button className="btn-secondary" onClick={closeForm}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading && items.length === 0 ? (
        <div className="route-loading"><span>Loading inventory…</span></div>
      ) : (
        <div className="table-wrap">
          <table className="inv-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Category</th>
                <th className="col-num">Qty</th>
                <th className="col-num">Price</th>
                <th className="col-num">Min Stock</th>
                <th className="col-action">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className={isLow(item) ? 'row-low' : ''}>
                  <td>{item.name}</td>
                  <td className="cell-desc">{item.description}</td>
                  <td>{item.category}</td>
                  <td className="col-num">
                    <span className={isLow(item) ? 'qty-low' : ''}>
                      {item.quantity}
                    </span>
                  </td>
                  <td className="col-num">${item.price.toFixed(2)}</td>
                  <td className="col-num">{item.minimum_stock_threshold}</td>
                  <td className="col-action">
                    <span className="action-btns">
                      <button className="btn-sm btn-edit" onClick={() => openEdit(item)}>
                        Edit
                      </button>
                      <button className="btn-sm btn-delete" onClick={() => handleDelete(item)}>
                        Delete
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="empty-state">
                    {items.length === 0 ? 'No items yet. Click "+ Add Item" to create one.' : 'No items match your search.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
