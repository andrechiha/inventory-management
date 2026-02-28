import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import './Recommended.css';

interface ClientRec {
  item_name: string;
  item_id: string;
  reason: string;
  price: number;
}

interface OwnerRec {
  item_name: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  current_stock: number | null;
  type?: 'restock' | 'new_product';
}

export default function Recommended() {
  const { role, user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [clientRecs, setClientRecs] = useState<ClientRec[]>([]);
  const [ownerRecs, setOwnerRecs] = useState<OwnerRec[]>([]);
  const [fetched, setFetched] = useState(false);

  const fetchRecommendations = useCallback(async () => {
    if (!user || !role) return;
    setLoading(true);
    setError('');
    setClientRecs([]);
    setOwnerRecs([]);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'recommend-items',
        { body: { role, userId: user.id } },
      );

      if (fnError) {
        let detail = fnError.message || 'Unknown error';
        try {
          if ('context' in fnError && fnError.context instanceof Response) {
            const body = await fnError.context.json();
            detail = body?.error || JSON.stringify(body);
          }
        } catch { /* ignore parse errors */ }
        setError(detail);
        setLoading(false);
        return;
      }

      if (data?.error) {
        setError(data.error);
        setLoading(false);
        return;
      }

      const recs = data?.recommendations ?? [];

      if (role === 'client') {
        setClientRecs(recs);
      } else {
        setOwnerRecs(recs);
      }
      setFetched(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }, [user, role]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const isClient = role === 'client';

  return (
    <div className="rec-page">
      <header className="rec-header">
        <div>
          <h1 className="page-title">Recommended</h1>
          <p className="page-description">
            {isClient
              ? 'Personalized product suggestions based on your purchases.'
              : 'AI-powered restocking insights based on your sales data.'}
          </p>
        </div>
        <button
          className="btn-generate"
          onClick={fetchRecommendations}
          disabled={loading}
        >
          {loading
            ? 'Generating…'
            : fetched
              ? 'Refresh'
              : 'Get Recommendations'}
        </button>
      </header>

      {error && <div className="rec-error">{error}</div>}

      {loading && (
        <div className="rec-loading">
          <div className="rec-spinner" />
          <p>Analyzing {isClient ? 'your preferences' : 'sales data'}…</p>
        </div>
      )}

      {!loading && fetched && isClient && clientRecs.length === 0 && (
        <div className="rec-empty">No recommendations available. Try placing some orders first!</div>
      )}
      {!loading && fetched && !isClient && ownerRecs.length === 0 && (
        <div className="rec-empty">No recommendations available. More sales data is needed.</div>
      )}

      {!loading && isClient && clientRecs.length > 0 && (
        <div className="rec-grid">
          {clientRecs.map((rec, i) => (
            <div key={i} className="rec-card">
              <div className="rec-card-top">
                <h3 className="rec-card-name">{rec.item_name}</h3>
                <span className="rec-card-price">${rec.price.toFixed(2)}</span>
              </div>
              <p className="rec-card-reason">{rec.reason}</p>
              <Link to="/shop" className="rec-card-link">View in Shop</Link>
            </div>
          ))}
        </div>
      )}

      {!loading && !isClient && ownerRecs.length > 0 && (() => {
        const restockRecs = ownerRecs.filter((r) => r.type !== 'new_product');
        const newProductRecs = ownerRecs.filter((r) => r.type === 'new_product');
        return (
          <>
            {restockRecs.length > 0 && (
              <>
                <h2 className="rec-section-title">Restock Recommendations</h2>
                <div className="rec-list">
                  {restockRecs.map((rec, i) => (
                    <div key={i} className={`rec-row rec-row--${rec.priority}`}>
                      <div className="rec-row-header">
                        <span className={`rec-priority priority-${rec.priority}`}>{rec.priority}</span>
                        <h3 className="rec-row-name">{rec.item_name}</h3>
                        {rec.current_stock !== null && (
                          <span className="rec-row-stock">{rec.current_stock} in stock</span>
                        )}
                      </div>
                      <p className="rec-row-reason">{rec.reason}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
            {newProductRecs.length > 0 && (
              <>
                <h2 className="rec-section-title">New Product Ideas</h2>
                <div className="rec-list">
                  {newProductRecs.map((rec, i) => (
                    <div key={i} className="rec-row rec-row--new">
                      <div className="rec-row-header">
                        <span className="rec-badge-new">New Idea</span>
                        <h3 className="rec-row-name">{rec.item_name}</h3>
                      </div>
                      <p className="rec-row-reason">{rec.reason}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        );
      })()}
    </div>
  );
}
