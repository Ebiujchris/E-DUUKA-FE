import { useEffect, useState } from 'react';
import PageShell from '../components/PageShell';
import { API_URL, authHeader } from '../lib/api';

interface ActivityItem {
  id: string;
  action: string;
  entityType: string;
  message: string;
  actorName?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

const formatDate = (value: string) => new Date(value).toLocaleString('en-UG', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export default function ActivityPage() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/activity`, { headers: authHeader() });
        if (!res.ok) throw new Error('Failed to load activity');
        const data = await res.json();
        setItems(Array.isArray(data) ? data : []);
      } catch (err: any) {
        setError(err.message || 'Unable to load activity');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return (
    <PageShell title="Activity" description="Recent actions across your shop.">
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        {loading ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-500">Loading activity…</div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error}</div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-500">
            No activity yet.
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
                      {item.entityType} · {item.action}
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-800">{item.message}</p>
                  </div>
                  <span className="shrink-0 text-[11px] text-slate-400">{formatDate(item.createdAt)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                  <span>{item.actorName || 'System'}</span>
                  {item.metadata && Object.keys(item.metadata).length > 0 && (
                    <span>{JSON.stringify(item.metadata)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
