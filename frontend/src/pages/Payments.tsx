import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchPayments, fetchPaymentStatuses } from '../store/slices/paymentSlice';
import {
  CurrencyDollarIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export default function Payments() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { payments, isLoading, error, pagination } = useAppSelector((state) => state.payment);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  type PaymentStatusOption = { id?: string; name?: string; colorCode?: string };
  const [paymentStatuses, setPaymentStatuses] = useState<PaymentStatusOption[]>([] as PaymentStatusOption[]);
  const [filterStatusId, setFilterStatusId] = useState<string>('');
  const [filterIsExempt, setFilterIsExempt] = useState<string>('');
  const [pageSize, setPageSize] = useState(20);

  const loadPayments = (page: number, size: number, statusId: string, isExempt: string) => {
    const params: { page: number; pageSize: number; statusId?: string; isExempt?: boolean } = {
      page,
      pageSize: size,
    };
    if (statusId) params.statusId = statusId;
    if (isExempt === 'true') params.isExempt = true;
    if (isExempt === 'false') params.isExempt = false;
    dispatch(fetchPayments(params));
  };

  useEffect(() => {
    dispatch(fetchPaymentStatuses()).then((result: any) => {
      if (result.payload) {
        setPaymentStatuses(result.payload);
      }
    });
  }, [dispatch]);

  useEffect(() => {
    loadPayments(1, pageSize, filterStatusId, filterIsExempt);
  }, []);

  // Debug: Log payments when they change
  useEffect(() => {
    if (payments.length > 0) {
      console.log('Payments loaded:', payments);
    } else {
      console.log('No payments found. Check if any properties are approved.');
    }
  }, [payments]);

  // Helper function to safely access nested properties
  const getNestedProperty = (obj: any, ...keys: string[]) => {
    for (const key of keys) {
      if (obj && (obj[key] !== undefined && obj[key] !== null)) {
        return obj[key];
      }
    }
    return null;
  };

  type StatusNameLike = string | { name?: string; Name?: string } | null | undefined;
  const getStatusColor = (statusName: StatusNameLike) => {
    const name = typeof statusName === 'string' ? statusName : (statusName && typeof statusName === 'object' ? (statusName.name || statusName.Name || 'Pending') : 'Pending');
    const status = paymentStatuses.find(s => s.name?.toLowerCase() === name?.toLowerCase());
    if (status?.colorCode) {
      return status.colorCode;
    }
    
    // Fallback colors
    const lowerName = typeof name === 'string' ? name.toLowerCase() : 'pending';
    if (lowerName === 'completed') return '#4CAF50';
    if (lowerName === 'pending') return '#FFC107';
    if (lowerName === 'failed') return '#F44336';
    return '#9E9E9E';
  };

  const getStatusIcon = (statusName: StatusNameLike) => {
    const name = typeof statusName === 'string' ? statusName : (statusName && typeof statusName === 'object' ? (statusName.name || statusName.Name || 'Pending') : 'Pending');
    const lowerName = typeof name === 'string' ? name.toLowerCase() : 'pending';
    if (lowerName === 'completed') return CheckCircleIcon;
    if (lowerName === 'pending') return ClockIcon;
    if (lowerName === 'failed') return XCircleIcon;
    return ClockIcon;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payments</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage and track all property payments
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card">
        <div className="card-body">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search payments by transaction reference, property address..."
                className="input pl-10 py-2.5 w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`btn-secondary px-4 py-2.5 ${showFilters ? 'bg-gray-300' : ''}`}
            >
              <FunnelIcon className="h-5 w-5 mr-2" />
              Filters
            </button>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  className="input py-2.5 w-full"
                  value={filterStatusId}
                  onChange={(e) => setFilterStatusId(e.target.value)}
                >
                  <option value="">All Statuses</option>
                  {paymentStatuses.map(status => (
                    <option key={status.id} value={status.id ?? ''}>{status.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Exemption
                </label>
                <select
                  className="input py-2.5 w-full"
                  value={filterIsExempt}
                  onChange={(e) => setFilterIsExempt(e.target.value)}
                >
                  <option value="">All</option>
                  <option value="true">Exempted</option>
                  <option value="false">Not Exempted</option>
                </select>
              </div>
              <div className="sm:col-span-3 flex items-end">
                <button
                  type="button"
                  onClick={() => loadPayments(1, pageSize, filterStatusId, filterIsExempt)}
                  className="btn-primary px-4 py-2.5"
                >
                  Apply filters
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Payments List */}
      <div className="card">
        <div className="card-header">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h3 className="text-lg font-semibold text-gray-900">
              All Payments
            </h3>
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-sm text-gray-500">
                {pagination.totalCount} {pagination.totalCount === 1 ? 'payment' : 'payments'}
              </span>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                Per page
                <select
                  className="input py-1.5 pl-2 pr-8 text-sm"
                  value={pagination.pageSize}
                  onChange={(e) => {
                    const size = Number(e.target.value);
                    setPageSize(size);
                    loadPayments(1, size, filterStatusId, filterIsExempt);
                  }}
                >
                  {PAGE_SIZE_OPTIONS.map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </div>
        <div className="card-body p-0">
          {isLoading ? (
            <div className="text-center py-16">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <p className="mt-4 text-sm text-gray-500">Loading payments...</p>
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-danger-100 mb-4">
                <CurrencyDollarIcon className="h-8 w-8 text-danger-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Error loading payments
              </h3>
              <p className="text-sm text-gray-500 mb-6">{error}</p>
              <button 
                onClick={() => loadPayments(1, pageSize, filterStatusId, filterIsExempt)}
                className="btn-secondary px-6 py-3"
              >
                Try Again
              </button>
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                <CurrencyDollarIcon className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No payments found
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                Payments will appear here automatically when properties are approved.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Property
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transaction Ref
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Collector
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payments.map((payment: any) => {
                    const statusObj = getNestedProperty(payment, 'Status', 'status');
                    const statusName = statusObj?.Name || statusObj?.name || (typeof statusObj === 'string' ? statusObj : 'Pending');
                    const StatusIcon = getStatusIcon(statusName);
                    const statusColor = getStatusColor(statusName);
                    
                    return (
                      <tr 
                        key={payment.id} 
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/payments/${payment.id}`)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 bg-primary-100 rounded-lg flex items-center justify-center">
                              <CurrencyDollarIcon className="h-5 w-5 text-primary-600" />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {(() => {
                                  const property = getNestedProperty(payment, 'Property', 'property');
                                  return property?.StreetAddress || property?.streetAddress || 'N/A';
                                })()}
                              </div>
                              <div className="text-sm text-gray-500">
                                {(() => {
                                  const property = getNestedProperty(payment, 'Property', 'property');
                                  const city = property?.City || property?.city || '';
                                  const propertyType = getNestedProperty(property, 'PropertyType', 'propertyType');
                                  const typeName = propertyType?.Name || propertyType?.name || '';
                                  return city + (typeName ? ` • ${typeName}` : '');
                                })()}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {payment.currency || 'USD'} {payment.amount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                          </div>
                          {payment.isExempt && (
                            <div className="text-xs text-warning-600 font-medium">Exempted</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 font-mono">
                            {payment.transactionReference || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {(() => {
                            const collector = getNestedProperty(payment, 'Collector', 'collector');
                            if (collector) {
                              const firstName = collector.FirstName || collector.firstName || '';
                              const lastName = collector.LastName || collector.lastName || '';
                              return (
                                <div className="text-sm text-gray-900">
                                  {firstName} {lastName}
                                </div>
                              );
                            }
                            return <span className="text-sm text-gray-400">Not assigned</span>;
                          })()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span 
                            className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full text-white"
                            style={{ backgroundColor: statusColor }}
                          >
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusName}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString() : 'N/A'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      {!isLoading && !error && pagination.totalCount > 0 && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
          <div className="text-sm text-gray-500">
            Showing {(pagination.page - 1) * pagination.pageSize + 1} to {Math.min(pagination.page * pagination.pageSize, pagination.totalCount)} of {pagination.totalCount} payments
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadPayments(pagination.page - 1, pagination.pageSize, filterStatusId, filterIsExempt)}
              disabled={pagination.page <= 1}
              className="btn-secondary px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600 px-2">
              Page {pagination.page} of {Math.max(1, pagination.totalPages)}
            </span>
            <button
              onClick={() => loadPayments(pagination.page + 1, pagination.pageSize, filterStatusId, filterIsExempt)}
              disabled={pagination.page >= pagination.totalPages}
              className="btn-secondary px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
