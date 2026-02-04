import { useState, useEffect } from 'react';
import apiClient from '../config/api';
import {
  DocumentChartBarIcon,
  ArrowDownTrayIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  ReceiptRefundIcon,
  UserGroupIcon,
  SparklesIcon,
  FunnelIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';
import { ChartBarIcon as ChartBarIconSolid } from '@heroicons/react/24/solid';
import * as XLSX from 'xlsx';

export default function Reports() {
  const [reportData, setReportData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [paymentStatuses, setPaymentStatuses] = useState<any[]>([]);
  const [collectors, setCollectors] = useState<any[]>([]);

  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    statusId: '',
    collectorId: '',
    isExempt: '' as '' | 'true' | 'false',
  });

  const [settlementDate, setSettlementDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [settlement, setSettlement] = useState<{
    date: string;
    totalCollected: number;
    currency: string;
    paymentCount: number;
    commissionRatePercent: number;
    commissionAmount: number;
    netAfterCommission: number;
    split: { companySharePercent: number; municipalitySharePercent: number; companyShare: number; municipalityShare: number };
  } | null>(null);
  const [settlementLoading, setSettlementLoading] = useState(false);
  const [revenueSplitPolicy, setRevenueSplitPolicy] = useState<{ companySharePercent: number; municipalitySharePercent: number } | null>(null);

  const loadDailySettlement = async () => {
    setSettlementLoading(true);
    try {
      const res = await apiClient.get('/revenuesplit/daily-settlement', { params: { date: settlementDate } });
      setSettlement(res.data);
    } catch {
      setSettlement(null);
    } finally {
      setSettlementLoading(false);
    }
  };

  useEffect(() => {
    apiClient.get('/payments/statuses').then((res) => setPaymentStatuses(res.data || []));
    apiClient.get('/revenuesplit').then((res) => {
      const cp = res.data?.companySharePercent ?? res.data?.CompanySharePercent;
      const mp = res.data?.municipalitySharePercent ?? res.data?.MunicipalitySharePercent;
      if (cp != null && mp != null) setRevenueSplitPolicy({ companySharePercent: Number(cp), municipalitySharePercent: Number(mp) });
    }).catch(() => setRevenueSplitPolicy(null));
    apiClient.get('/users/lookups/roles').then((rolesRes) => {
      const roles = rolesRes.data || [];
      const collectorRole = roles.find((r: any) => (r.code || r.Code || '').toUpperCase() === 'COLLECTOR');
      if (collectorRole?.id) {
        apiClient.get(`/users?roleId=${collectorRole.id}&pageSize=500`).then((usersRes) => {
          const data = usersRes.data?.data ?? usersRes.data;
          setCollectors(Array.isArray(data) ? data : []);
        }).catch(() => setCollectors([]));
      }
    }).catch(() => setCollectors([]));
  }, []);

  const loadReport = async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = {
        page: '1',
        pageSize: '10000',
      };
      if (filters.startDate) params.startDate = new Date(filters.startDate).toISOString();
      if (filters.endDate) params.endDate = new Date(filters.endDate).toISOString();
      if (filters.statusId) params.statusId = filters.statusId;
      if (filters.collectorId) params.collectorId = filters.collectorId;
      if (filters.isExempt !== '') params.isExempt = filters.isExempt;

      const qs = new URLSearchParams(params).toString();
      const res = await apiClient.get(`/payments?${qs}`);
      setReportData(res.data?.data || []);
    } catch (e) {
      console.error(e);
      setReportData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const exportToExcel = () => {
    const rows = reportData.map((p: any) => {
      const prop = p.property || p.Property;
      const owner = prop?.owner || prop?.Owner;
      const collector = p.collector || p.Collector;
      const status = p.status || p.Status;
      return {
        'Transaction Reference': p.transactionReference || p.TransactionReference || '',
        'Payment Date': p.paymentDate ? new Date(p.paymentDate).toLocaleDateString() : '',
        'Property Address': prop?.streetAddress || prop?.StreetAddress || '',
        'Plate Number': prop?.plateNumber || prop?.PlateNumber || '',
        'Owner': owner?.name || owner?.Name || '',
        'Amount': p.amount ?? p.Amount ?? 0,
        'Currency': p.currency || p.Currency || 'USD',
        'Discount Amount': p.discountAmount ?? p.DiscountAmount ?? 0,
        'Discount Reason': p.discountReason || p.DiscountReason || '',
        'Exempt': p.isExempt ?? p.IsExempt ? 'Yes' : 'No',
        'Exemption Reason': p.exemptionReason || p.ExemptionReason || '',
        'Status': status?.name || status?.Name || '',
        'Collector': collector ? `${collector.firstName || collector.FirstName || ''} ${collector.lastName || collector.LastName || ''}`.trim() : '',
        'Notes': p.notes || p.Notes || '',
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Payment Report');
    const filename = `payment-report-${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  const getStatusColor = (name: string) => {
    const s = paymentStatuses.find((x: any) => (x.name || '').toLowerCase() === (name || '').toLowerCase());
    return s?.colorCode || '#94a3b8';
  };

  const totalAmount = reportData.reduce((sum, p) => sum + (p.amount ?? p.Amount ?? 0), 0);
  const totalDiscount = reportData.reduce((sum, p) => sum + (p.discountAmount ?? p.DiscountAmount ?? 0), 0);
  const exemptCount = reportData.filter((p) => p.isExempt ?? p.IsExempt).length;
  const totalExemptAmount = reportData
    .filter((p) => p.isExempt ?? p.IsExempt)
    .reduce((sum, p) => sum + (p.amount ?? p.Amount ?? 0), 0);
  const currency = reportData[0]?.currency || reportData[0]?.Currency || 'USD';

  // Report revenue split: company % on gross only; discounts and exemptions do not affect the company.
  // Net collected = gross - discount - exempt amounts; municipality gets remainder after company share.
  const reportNetCollected = totalAmount - totalDiscount - totalExemptAmount;
  const reportCompanyPercent = revenueSplitPolicy?.companySharePercent ?? 0;
  const reportCompanyShare = reportData.length > 0 ? (reportCompanyPercent / 100) * totalAmount : 0;
  const reportMunicipalityShare = reportData.length > 0 ? Math.max(0, reportNetCollected - reportCompanyShare) : 0;

  const summaryCards = reportData.length > 0
    ? [
        { label: 'Payments', value: reportData.length.toLocaleString(), icon: ChartBarIconSolid, gradient: 'from-primary-500 to-primary-600', iconBg: 'bg-primary-100', iconColor: 'text-primary-600' },
        { label: 'Total amount', value: `${currency} ${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, icon: CurrencyDollarIcon, gradient: 'from-emerald-500 to-emerald-600', iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600' },
        { label: 'Total discount', value: `${currency} ${totalDiscount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, icon: ReceiptRefundIcon, gradient: 'from-amber-500 to-amber-600', iconBg: 'bg-amber-100', iconColor: 'text-amber-600' },
        { label: 'Exempt', value: exemptCount.toLocaleString(), icon: UserGroupIcon, gradient: 'from-violet-500 to-violet-600', iconBg: 'bg-violet-100', iconColor: 'text-violet-600' },
      ]
    : [];

  return (
    <div className="space-y-8">
      {/* Page header - modern hero style */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 px-6 py-8 shadow-medium sm:px-8 sm:py-10">
        <div className="relative z-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Reports
              </h1>
              <p className="mt-1.5 max-w-xl text-sm text-primary-100">
                Filter payments by date, status, and collector. Generate reports and export to Excel.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-white/10 backdrop-blur px-3 py-2 text-sm text-white">
              <SparklesIcon className="h-5 w-5 text-primary-200" />
              <span>Payment analytics</span>
            </div>
          </div>
        </div>
        <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-white/5 to-transparent pointer-events-none" />
      </div>

      {/* Daily settlement (xisaab xir) */}
      <div className="rounded-2xl border border-gray-200/80 bg-white shadow-soft overflow-hidden">
        <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50/80 px-5 py-3 sm:px-6">
          <CalendarDaysIcon className="h-5 w-5 text-primary-500" />
          <h2 className="text-base font-semibold text-gray-900">Daily settlement (xisaab xir)</h2>
        </div>
        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="settlement-date" className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">Date</label>
              <input
                id="settlement-date"
                type="date"
                value={settlementDate}
                onChange={(e) => setSettlementDate(e.target.value)}
                className="input w-full rounded-lg border-gray-200 py-2.5 text-sm"
              />
            </div>
            <button
              type="button"
              onClick={loadDailySettlement}
              disabled={settlementLoading}
              className="rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {settlementLoading ? 'Loading…' : 'View settlement'}
            </button>
          </div>
          {settlement && (
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Collected</p>
                <p className="mt-1 text-xl font-bold text-gray-900">{settlement.currency} {(settlement.totalCollected || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                <p className="text-xs text-gray-500">{settlement.paymentCount} payment(s)</p>
              </div>
              <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Commission ({settlement.commissionRatePercent}%)</p>
                <p className="mt-1 text-xl font-bold text-amber-800">{settlement.currency} {(settlement.commissionAmount || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
              </div>
              <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Company ({settlement.split.companySharePercent}%)</p>
                <p className="mt-1 text-xl font-bold text-blue-800">{settlement.currency} {(settlement.split.companyShare || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
              </div>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Dowlada Hoose ({settlement.split.municipalitySharePercent}%)</p>
                <p className="mt-1 text-xl font-bold text-emerald-800">{settlement.currency} {(settlement.split.municipalityShare || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
              </div>
            </div>
          )}
          {settlement && settlement.split.companySharePercent === 0 && settlement.split.municipalitySharePercent === 0 && (
            <p className="mt-3 text-sm text-amber-700">
              Revenue split not configured. Set company and Dowlada Hoose % in Settings → Revenue split.
            </p>
          )}
        </div>
      </div>

      {/* Filters - compact modern bar */}
      <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-soft sm:p-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex items-center gap-2 text-gray-700">
            <FunnelIcon className="h-5 w-5 text-primary-500" />
            <span className="text-sm font-medium">Filters</span>
          </div>
          <div className="flex-1 grid grid-cols-1 gap-4 min-w-0 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label htmlFor="report-date-from" className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">
                From
              </label>
              <input
                id="report-date-from"
                type="date"
                className="input w-full rounded-lg border-gray-200 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500/20"
                value={filters.startDate}
                onChange={(e) => setFilters((f) => ({ ...f, startDate: e.target.value }))}
              />
            </div>
            <div>
              <label htmlFor="report-date-to" className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">
                To
              </label>
              <input
                id="report-date-to"
                type="date"
                className="input w-full rounded-lg border-gray-200 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500/20"
                value={filters.endDate}
                onChange={(e) => setFilters((f) => ({ ...f, endDate: e.target.value }))}
              />
            </div>
            <div>
              <label htmlFor="report-status" className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">
                Status
              </label>
              <select
                id="report-status"
                className="input w-full rounded-lg border-gray-200 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500/20"
                value={filters.statusId}
                onChange={(e) => setFilters((f) => ({ ...f, statusId: e.target.value }))}
              >
                <option value="">All</option>
                {paymentStatuses.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="report-collector" className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">
                Collector
              </label>
              <select
                id="report-collector"
                className="input w-full rounded-lg border-gray-200 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500/20"
                value={filters.collectorId}
                onChange={(e) => setFilters((f) => ({ ...f, collectorId: e.target.value }))}
              >
                <option value="">All</option>
                {collectors.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.firstName || c.FirstName} {c.lastName || c.LastName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="report-exempt" className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">
                Exemption
              </label>
              <select
                id="report-exempt"
                className="input w-full rounded-lg border-gray-200 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500/20"
                value={filters.isExempt}
                onChange={(e) => setFilters((f) => ({ ...f, isExempt: e.target.value as '' | 'true' | 'false' }))}
              >
                <option value="">All</option>
                <option value="true">Exempt only</option>
                <option value="false">Not exempt</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={loadReport}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <DocumentChartBarIcon className="h-5 w-5" />
                  Generate report
                </>
              )}
            </button>
            <button
              type="button"
              onClick={exportToExcel}
              disabled={reportData.length === 0}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowDownTrayIcon className="h-5 w-5" />
              Export Excel
            </button>
          </div>
        </div>
      </div>

      {/* Summary stats - modern metric cards */}
      {summaryCards.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-soft transition hover:shadow-medium">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-gray-500">{card.label}</p>
                    <p className="mt-2 text-2xl font-bold tabular-nums text-gray-900">{card.value}</p>
                  </div>
                  <div className={`rounded-xl p-2.5 ${card.iconBg}`}>
                    <Icon className={`h-6 w-6 ${card.iconColor}`} />
                  </div>
                </div>
                <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${card.gradient} opacity-80`} />
              </div>
            );
          })}
        </div>
      )}

      {/* Report revenue split: company % on gross; discounts not counted on company */}
      {reportData.length > 0 && revenueSplitPolicy && (reportCompanyPercent > 0 || revenueSplitPolicy.municipalitySharePercent > 0) && (
        <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-soft">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Report revenue split</h3>
          <p className="text-xs text-gray-500 mb-4">Company share is based on gross amount only. Discounts and exemptions do not reduce the company share.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Gross (total amount)</p>
              <p className="mt-1 text-lg font-bold text-gray-900">{currency} {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Net collected (after discount &amp; exemption)</p>
              <p className="mt-1 text-lg font-bold text-gray-900">{currency} {reportNetCollected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-blue-700">Company ({reportCompanyPercent}% of gross)</p>
              <p className="mt-1 text-lg font-bold text-blue-800">{currency} {reportCompanyShare.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              <p className="mt-0.5 text-xs text-blue-600">Discounts and exemptions not applied to company</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-emerald-700">Dowlada Hoose (remainder of net)</p>
              <p className="mt-1 text-lg font-bold text-emerald-800">{currency} {reportMunicipalityShare.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>
      )}

      {/* Data table - modern card table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 px-5 py-4 sm:px-6">
          <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <DocumentChartBarIcon className="h-5 w-5 text-primary-500" />
            Payment report
          </h2>
          {reportData.length > 0 && (
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
              {reportData.length} payment{reportData.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="h-10 w-10 rounded-full border-2 border-primary-200 border-t-primary-600 animate-spin" />
              <p className="mt-4 text-sm font-medium text-gray-500">Loading report…</p>
            </div>
          ) : reportData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="rounded-2xl bg-gray-100 p-4">
                <ChartBarIcon className="h-12 w-12 text-gray-400" />
              </div>
              <p className="mt-4 text-sm font-semibold text-gray-700">No data yet</p>
              <p className="mt-1 max-w-sm text-sm text-gray-500">Set your filters and click Generate report to load payment data.</p>
            </div>
          ) : (
            <table className="min-w-full" role="grid">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80">
                  <th scope="col" className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Ref
                  </th>
                  <th scope="col" className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Date
                  </th>
                  <th scope="col" className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Property
                  </th>
                  <th scope="col" className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Amount
                  </th>
                  <th scope="col" className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Discount
                  </th>
                  <th scope="col" className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Exempt
                  </th>
                  <th scope="col" className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th scope="col" className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Collector
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reportData.map((p: any) => {
                  const prop = p.property || p.Property;
                  const collector = p.collector || p.Collector;
                  const status = p.status || p.Status;
                  const statusName = status?.name || status?.Name || '—';
                  return (
                    <tr
                      key={p.id}
                      className="transition-colors hover:bg-gray-50/80"
                    >
                      <td className="whitespace-nowrap px-5 py-3.5 text-sm font-mono text-gray-900">
                        {p.transactionReference || p.TransactionReference || '—'}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-sm text-gray-600">
                        {p.paymentDate ? new Date(p.paymentDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-900">
                        <span className="block truncate max-w-[200px]" title={prop?.streetAddress || prop?.StreetAddress || ''}>
                          {prop?.streetAddress || prop?.StreetAddress || '—'}
                        </span>
                        {prop?.plateNumber || prop?.PlateNumber ? (
                          <span className="text-xs text-gray-500">({prop.plateNumber || prop.PlateNumber})</span>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-right text-sm font-semibold text-gray-900 tabular-nums">
                        {(p.amount ?? p.Amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-right text-sm text-amber-700 tabular-nums">
                        {(p.discountAmount ?? p.DiscountAmount ?? 0) > 0
                          ? (p.discountAmount ?? p.DiscountAmount).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
                          : '—'}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5">
                        {p.isExempt ?? p.IsExempt ? (
                          <span className="inline-flex rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700">Yes</span>
                        ) : (
                          <span className="text-gray-400">No</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5">
                        <span
                          className="inline-flex rounded-full px-2.5 py-1 text-xs font-medium text-white shadow-sm"
                          style={{ backgroundColor: getStatusColor(statusName) }}
                        >
                          {statusName}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-sm text-gray-600">
                        {collector ? `${collector.firstName || collector.FirstName || ''} ${collector.lastName || collector.LastName || ''}`.trim() : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
