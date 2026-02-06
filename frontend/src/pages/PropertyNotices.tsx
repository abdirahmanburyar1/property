import { useState, useEffect } from 'react';
import apiClient from '../config/api';
import PropertyTaxNoticeContent from '../components/PropertyTaxNoticeContent';
import {
  FunnelIcon,
  PrinterIcon,
  DocumentTextIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

function getNested(obj: any, ...keys: string[]): any {
  if (obj == null) return undefined;
  for (const k of keys) {
    const next = obj[k];
    if (next !== undefined && next !== null) return next;
  }
  return null;
}

export default function PropertyNotices() {
  const [properties, setProperties] = useState<any[]>([]);
  const [sections, setSections] = useState<Array<{ id: string; name: string }>>([]);
  const [subSections, setSubSections] = useState<Array<{ id: string; name: string; sectionId?: string }>>([]);
  const [collectors, setCollectors] = useState<Array<{ id: string; firstName: string; lastName: string }>>([]);
  const [sectionId, setSectionId] = useState<string>('');
  const [subSectionId, setSubSectionId] = useState<string>('');
  const [kontontriyeId, setKontontriyeId] = useState<string>('');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [noticeModal, setNoticeModal] = useState<{ property: any } | null>(null);

  useEffect(() => {
    apiClient.get('/sections').then((r) => setSections(r.data || [])).catch(() => setSections([]));
    apiClient.get('/users/lookups/roles').then((rolesRes) => {
      const roles = rolesRes.data || [];
      const collectorRole = roles.find((r: any) => (r.code || r.Code || r.name || r.Name || '').toLowerCase().includes('collector'));
      if (collectorRole) {
        const id = collectorRole.id ?? collectorRole.Id;
        return apiClient.get(`/users?roleId=${id}&pageSize=500`).then((usersRes) => {
          const data = usersRes.data?.data ?? usersRes.data;
          setCollectors(Array.isArray(data) ? data : []);
        });
      }
      setCollectors([]);
    }).catch(() => setCollectors([]));
  }, []);

  useEffect(() => {
    if (sectionId) {
      apiClient.get(`/subsections?sectionId=${sectionId}`).then((r) => setSubSections(r.data || [])).catch(() => setSubSections([]));
      setSubSectionId('');
    } else {
      setSubSections([]);
      setSubSectionId('');
    }
  }, [sectionId]);

  const loadNotices = () => {
    setLoading(true);
    const params: Record<string, string | number> = {
      hasOutstandingOnly: 'true',
      page: 1,
      pageSize: 500,
    };
    if (sectionId) params.sectionId = sectionId;
    if (subSectionId) params.subSectionId = subSectionId;
    if (kontontriyeId) params.kontontriyeId = kontontriyeId;
    apiClient.get('/properties', { params })
      .then((r) => {
        const data = r.data?.data ?? r.data ?? [];
        setProperties(Array.isArray(data) ? data : []);
      })
      .catch(() => setProperties([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadNotices();
  }, []);

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    loadNotices();
  };

  const ownerName = (p: any) => getNested(p, 'owner', 'Owner')?.name ?? getNested(p, 'owner', 'Owner')?.Name ?? p.ownerName ?? '—';
  const expected = (p: any) => {
    const pt = getNested(p, 'propertyType', 'PropertyType');
    const price = pt?.price ?? pt?.Price ?? 0;
    const area = p.areaSize ?? p.AreaSize ?? 0;
    return price * area;
  };
  const paid = (p: any) => (p.paidAmount ?? p.PaidAmount ?? 0) as number;
  const amountDue = (p: any) => Math.max(0, expected(p) - paid(p));
  const currency = (p: any) => p.currency || 'USD';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Property tax notices</h1>
        <p className="mt-1 text-sm text-gray-600">
          Only properties with outstanding amount are listed. Notices are recurring yearly.
        </p>
      </div>

      <form onSubmit={handleApplyFilters} className="card">
        <div className="card-body">
          <div className="flex items-center gap-2 mb-4">
            <FunnelIcon className="h-5 w-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
              <select
                className="input w-full"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              >
                {[year, year - 1, year - 2].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
              <select
                className="input w-full"
                value={sectionId}
                onChange={(e) => setSectionId(e.target.value)}
              >
                <option value="">All sections</option>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subsection</label>
              <select
                className="input w-full"
                value={subSectionId}
                onChange={(e) => setSubSectionId(e.target.value)}
                disabled={!sectionId}
              >
                <option value="">All subsections</option>
                {subSections.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Collector (Kontontriye)</label>
              <select
                className="input w-full"
                value={kontontriyeId}
                onChange={(e) => setKontontriyeId(e.target.value)}
              >
                <option value="">All collectors</option>
                {collectors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {[c.firstName ?? c.FirstName, c.lastName ?? c.LastName].filter(Boolean).join(' ') || c.email ?? c.Email ?? c.id}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4">
            <button type="submit" className="btn-primary">
              Apply filters
            </button>
          </div>
        </div>
      </form>

      <div className="card">
        <div className="card-body">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-600 border-t-transparent" />
            </div>
          ) : properties.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <DocumentTextIcon className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p>No properties with outstanding amount match the filters.</p>
              <p className="mt-1 text-sm">Notices are only generated for properties that have an amount due.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 font-semibold text-gray-900">Plate</th>
                    <th className="text-left py-3 px-2 font-semibold text-gray-900">Address</th>
                    <th className="text-left py-3 px-2 font-semibold text-gray-900">Owner</th>
                    <th className="text-right py-3 px-2 font-semibold text-gray-900">Amount due</th>
                    <th className="text-right py-3 px-2 font-semibold text-gray-900">Notice</th>
                  </tr>
                </thead>
                <tbody>
                  {properties.map((p) => (
                    <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-2 font-medium">{p.plateNumber ?? p.PlateNumber ?? '—'}</td>
                      <td className="py-3 px-2">{p.streetAddress ?? p.StreetAddress ?? '—'}</td>
                      <td className="py-3 px-2">{ownerName(p)}</td>
                      <td className="py-3 px-2 text-right font-semibold text-amber-800">
                        {currency(p)} {amountDue(p).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-2 text-right">
                        <button
                          type="button"
                          onClick={() => setNoticeModal({ property: p })}
                          className="inline-flex items-center gap-1 rounded-lg bg-amber-100 px-3 py-1.5 text-sm font-semibold text-amber-800 hover:bg-amber-200"
                        >
                          <PrinterIcon className="h-4 w-4" />
                          View / Print
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Notice modal (printable) */}
      {noticeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <style>{`
            @media print {
              body * { visibility: hidden !important; }
              #property-notice-modal-print,
              #property-notice-modal-print * { visibility: visible !important; }
              #property-notice-modal-print { position: fixed !important; left: 0 !important; top: 0 !important; right: 0 !important; bottom: 0 !important; background: white !important; padding: 0 !important; overflow: visible !important; }
              .property-notice-no-print { display: none !important; }
            }
          `}</style>
          <div id="property-notice-modal-print" className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="property-notice-no-print flex items-center justify-between gap-3 p-4 border-b border-gray-200 shrink-0">
              <h3 className="text-lg font-semibold text-gray-900">Property tax notice — {year}</h3>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">
                  <PrinterIcon className="h-5 w-5" />
                  Print
                </button>
                <button type="button" onClick={() => setNoticeModal(null)} className="rounded-lg border border-gray-300 bg-white p-2 text-gray-700 hover:bg-gray-50" aria-label="Close">
                  <XCircleIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="overflow-y-auto p-4">
              <PropertyTaxNoticeContent property={noticeModal.property} year={year} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
