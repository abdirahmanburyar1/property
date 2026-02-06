import { useState, useEffect } from 'react';
import apiClient from '../config/api';
import PropertyTaxNoticeContent from '../components/PropertyTaxNoticeContent';
import {
  FunnelIcon,
  PrinterIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';

function getNested(obj: any, ...keys: string[]): any {
  if (obj == null) return undefined;
  for (const k of keys) {
    const next = obj[k];
    if (next !== undefined && next !== null) return next;
  }
  return null;
}

function collectorId(c: any): string {
  const id = c?.id ?? c?.Id;
  return id != null ? String(id) : '';
}

function collectorLabel(c: any): string {
  const first = c?.firstName ?? c?.FirstName ?? '';
  const last = c?.lastName ?? c?.LastName ?? '';
  const name = [first, last].filter(Boolean).join(' ');
  return name || (c?.email ?? c?.Email ?? '') || '—';
}

export default function PropertyNotices() {
  const [properties, setProperties] = useState<any[]>([]);
  const [sections, setSections] = useState<Array<{ id: string; name: string }>>([]);
  const [subSections, setSubSections] = useState<Array<{ id: string; name: string; sectionId?: string }>>([]);
  const [collectors, setCollectors] = useState<any[]>([]);
  const [sectionId, setSectionId] = useState<string>('');
  const [subSectionId, setSubSectionId] = useState<string>('');
  const [kontontriyeId, setKontontriyeId] = useState<string>('');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [loading, setLoading] = useState(false);

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

  const loadNotices = (filters?: { sectionId: string; subSectionId: string; kontontriyeId: string }) => {
    setLoading(true);
    const section = filters?.sectionId ?? sectionId;
    const sub = filters?.subSectionId ?? subSectionId;
    const collector = filters?.kontontriyeId ?? kontontriyeId;
    const params: Record<string, string | number | boolean> = {
      hasOutstandingOnly: true,
      page: 1,
      pageSize: 500,
    };
    if (section) params.sectionId = section;
    if (sub) params.subSectionId = sub;
    if (collector) {
      params.kontontriyeId = collector;
    }
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

  const handleApplyFilters = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const sectionVal = (form.elements.namedItem('sectionId') as HTMLSelectElement | null)?.value ?? '';
    const subVal = (form.elements.namedItem('subSectionId') as HTMLSelectElement | null)?.value ?? '';
    const collectorVal = (form.elements.namedItem('kontontriyeId') as HTMLSelectElement | null)?.value ?? '';
    setSectionId(sectionVal);
    setSubSectionId(subVal);
    setKontontriyeId(collectorVal);
    loadNotices({ sectionId: sectionVal, subSectionId: subVal, kontontriyeId: collectorVal });
  };

  return (
    <div className="space-y-6">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #property-notices-print-root,
          #property-notices-print-root * { visibility: visible !important; }
          #property-notices-print-root { position: absolute !important; left: 0 !important; top: 0 !important; right: 0 !important; background: white !important; padding: 0 !important; }
          .no-print { display: none !important; }
          .notice-row { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>

      <div className="no-print">
        <h1 className="text-3xl font-bold text-gray-900">Property tax notices</h1>
        <p className="mt-1 text-sm text-gray-600">
          Only properties with outstanding amount are listed. Notices are recurring yearly.
        </p>
      </div>

      <form onSubmit={handleApplyFilters} className="card no-print">
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
                name="sectionId"
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
                name="subSectionId"
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
                name="kontontriyeId"
                className="input w-full"
                value={kontontriyeId}
                onChange={(e) => setKontontriyeId(e.target.value)}
              >
                <option value="">All collectors</option>
                {collectors.map((c) => {
                  const id = collectorId(c);
                  return (
                    <option key={id || `collector-${collectors.indexOf(c)}`} value={id}>
                      {collectorLabel(c)}
                    </option>
                  );
                })}
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

      <div className="no-print flex items-center justify-between gap-4">
        <p className="text-sm text-gray-600">
          {loading ? 'Loading…' : properties.length === 0 ? 'No properties match the filters.' : `${properties.length} notice(s).`}
        </p>
        {properties.length > 0 && (
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
          >
            <PrinterIcon className="h-5 w-5" />
            Print all notices
          </button>
        )}
      </div>

      <div id="property-notices-print-root">
        {loading ? (
          <div className="flex justify-center py-12 no-print">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-600 border-t-transparent" />
          </div>
        ) : properties.length === 0 ? (
          <div className="text-center py-12 text-gray-500 no-print">
            <DocumentTextIcon className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p>No properties with outstanding amount match the filters.</p>
            <p className="mt-1 text-sm">Notices are only generated for properties that have an amount due.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <tbody>
              {properties.map((p) => (
                <tr key={p.id ?? p.Id} className="notice-row align-top">
                  <td className="py-2 px-0 w-full">
                    <PropertyTaxNoticeContent property={p} year={year} compact />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
