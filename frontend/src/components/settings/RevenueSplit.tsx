import { useState, useEffect } from 'react';
import apiClient from '../../config/api';
import { BanknotesIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

export default function RevenueSplit() {
  const [companyPercent, setCompanyPercent] = useState<string>('');
  const [municipalityPercent, setMunicipalityPercent] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadPolicy();
  }, []);

  const loadPolicy = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/revenuesplit');
      const data = res.data;
      setCompanyPercent(String(data.companySharePercent ?? ''));
      setMunicipalityPercent(String(data.municipalitySharePercent ?? ''));
      setDescription(data.description ?? '');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load revenue split policy');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const company = parseFloat(companyPercent);
    const municipality = parseFloat(municipalityPercent);
    if (Number.isNaN(company) || company < 0 || company > 100 ||
        Number.isNaN(municipality) || municipality < 0 || municipality > 100) {
      setError('Shares must be between 0 and 100.');
      return;
    }
    if (Math.abs(company + municipality - 100) > 0.01) {
      setError('Company and municipality shares must sum to 100.');
      return;
    }
    setIsSaving(true);
    try {
      await apiClient.put('/revenuesplit', {
        companySharePercent: company,
        municipalitySharePercent: municipality,
        description: description || undefined,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update revenue split policy');
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
          Revenue split (xisaab xir)
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Daily collected amount (after collector commission) is split between the company and Dowlada Hoose ee Gaalkacyo. Percentages must sum to 100.
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
            Revenue split policy updated.
          </div>
        )}
        {companyPercent === '' && municipalityPercent === '' && !error && (
          <p className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-2 text-sm text-amber-800">
            No revenue split configured yet. Percentages are dynamic — set company and Dowlada Hoose shares below (must sum to 100).
          </p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label htmlFor="company-percent" className="block text-sm font-medium text-gray-700 mb-1.5">
              Company share (%)
            </label>
            <input
              id="company-percent"
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={companyPercent}
              onChange={(e) => setCompanyPercent(e.target.value)}
              className="input w-full rounded-lg border-gray-200 py-2.5"
              placeholder="e.g. 40"
            />
          </div>
          <div>
            <label htmlFor="municipality-percent" className="block text-sm font-medium text-gray-700 mb-1.5">
              Dowlada Hoose (%)
            </label>
            <input
              id="municipality-percent"
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={municipalityPercent}
              onChange={(e) => setMunicipalityPercent(e.target.value)}
              className="input w-full rounded-lg border-gray-200 py-2.5"
              placeholder="e.g. 60"
            />
          </div>
        </div>
        <p className="text-xs text-gray-500">Sum must equal 100%.</p>
        <div>
          <label htmlFor="split-desc" className="block text-sm font-medium text-gray-700 mb-1.5">
            Description (optional)
          </label>
          <input
            id="split-desc"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input w-full max-w-md rounded-lg border-gray-200 py-2.5"
            placeholder="e.g. 50/50 split"
          />
        </div>
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-50"
        >
          {isSaving ? 'Saving…' : 'Save revenue split'}
        </button>
      </form>
    </div>
  );
}
