import { useState, useEffect } from 'react';
import apiClient from '../../config/api';
import { BanknotesIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

export default function Commission() {
  const [ratePercent, setRatePercent] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadCommission();
  }, []);

  const loadCommission = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/commission');
      const data = res.data;
      setRatePercent(String(data.ratePercent ?? ''));
      setDescription(data.description ?? '');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load commission policy');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const rate = parseFloat(ratePercent);
    if (Number.isNaN(rate) || rate < 0 || rate > 100) {
      setError('Rate must be a number between 0 and 100.');
      return;
    }
    setIsSaving(true);
    try {
      await apiClient.put('/commission', { ratePercent: rate, description: description || undefined });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update commission policy');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-soft">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-48 bg-gray-200 rounded" />
          <div className="h-10 w-full max-w-xs bg-gray-100 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-soft overflow-hidden">
      <div className="border-b border-gray-100 bg-gray-50/80 px-6 py-4">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <BanknotesIcon className="h-5 w-5 text-primary-500" />
          Collector Commission
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Set the commission rate (e.g. 2 for 2%) applied to amounts collected by collectors. This rate is shown on the collector app home screen.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700 flex items-center gap-2">
            <CheckCircleIcon className="h-5 w-5" />
            Commission policy updated.
          </div>
        )}
        {ratePercent === '' && !error && (
          <p className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-2 text-sm text-amber-800">
            No commission rate set yet. Percentages are dynamic — set the rate below.
          </p>
        )}
        <div>
          <label htmlFor="commission-rate" className="block text-sm font-medium text-gray-700 mb-1.5">
            Commission rate (%)
          </label>
          <input
            id="commission-rate"
            type="number"
            min={0}
            max={100}
            step={0.01}
            value={ratePercent}
            onChange={(e) => setRatePercent(e.target.value)}
            className="input w-full max-w-xs rounded-lg border-gray-200 py-2.5"
            placeholder="e.g. 2"
          />
          <p className="mt-1 text-xs text-gray-500">Percentage of collected amount given as commission (0–100).</p>
        </div>
        <div>
          <label htmlFor="commission-desc" className="block text-sm font-medium text-gray-700 mb-1.5">
            Description (optional)
          </label>
          <input
            id="commission-desc"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input w-full max-w-md rounded-lg border-gray-200 py-2.5"
            placeholder="e.g. Default collector commission"
          />
        </div>
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-50"
        >
          {isSaving ? 'Saving…' : 'Save commission policy'}
        </button>
      </form>
    </div>
  );
}
