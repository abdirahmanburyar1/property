import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../config/api';
import { ArrowLeftIcon, PrinterIcon } from '@heroicons/react/24/outline';
import PropertyTaxNoticeContent from '../components/PropertyTaxNoticeContent';

export default function PropertyTaxNotice() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient.get(`/properties/${id}`);
        if (!cancelled) setProperty(res.data);
      } catch (e: any) {
        if (!cancelled) setError(e.response?.data?.message || 'Failed to load property');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-600 border-t-transparent" />
      </div>
    );
  }
  if (error || !property) {
    return (
      <div className="rounded-xl bg-red-50 border border-red-200 p-6 text-center">
        <p className="text-red-800 font-medium">{error || 'Property not found'}</p>
        <button
          type="button"
          onClick={() => navigate('/properties')}
          className="mt-4 text-primary-600 hover:underline"
        >
          Back to properties
        </button>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-notice-root,
          .print-notice-root * { visibility: visible; }
          .print-notice-root { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>
      <div className="print-notice-root">
        <div className="no-print mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(`/properties/${id}`)}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            Back to property
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
          >
            <PrinterIcon className="h-5 w-5" />
            Print notice
          </button>
        </div>
        <PropertyTaxNoticeContent property={property} year={new Date().getFullYear()} />
      </div>
    </>
  );
}
