import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchProperties, deleteProperty } from '../store/slices/propertySlice';
import apiClient from '../config/api';
import Swal from 'sweetalert2';
import {
  MapPinIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export default function Properties() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { properties, isLoading, error, pagination } = useAppSelector((state) => state.property);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filterStatusId, setFilterStatusId] = useState<string>('');
  const [filterPropertyTypeId, setFilterPropertyTypeId] = useState<string>('');
  const [propertyStatuses, setPropertyStatuses] = useState<Array<{ id: string; name: string }>>([]);
  const [propertyTypes, setPropertyTypes] = useState<Array<{ id: string; name: string }>>([]);
  const [pageSize, setPageSize] = useState(20);

  const isPropertyApproved = (property: any) => {
    const name = getNestedProperty(getNestedProperty(property, 'Status', 'status'), 'Name', 'name');
    return (name || '').toLowerCase() === 'approved';
  };

  const handleDeleteClick = async (property: any) => {
    if (isPropertyApproved(property)) return;
    const result = await Swal.fire({
      title: 'Delete property?',
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete',
    });
    if (!result.isConfirmed) return;
    setDeletingId(property.id);
    try {
      await dispatch(deleteProperty(property.id)).unwrap();
      await Swal.fire({ icon: 'success', title: 'Deleted', text: 'Property has been deleted.', timer: 2000 });
    } catch (err: any) {
      await Swal.fire({ icon: 'error', title: 'Error', text: err?.message || 'Failed to delete property' });
    } finally {
      setDeletingId(null);
    }
  };

  const loadProperties = (page: number, size: number, statusId: string, typeId: string, search: string) => {
    const params: { page: number; pageSize: number; statusId?: string; propertyTypeId?: string; ownerName?: string; plateNumber?: string } = {
      page,
      pageSize: size,
    };
    if (statusId) params.statusId = statusId;
    if (typeId) params.propertyTypeId = typeId;
    if (search.trim()) params.ownerName = search.trim();
    dispatch(fetchProperties(params));
  };

  useEffect(() => {
    apiClient.get('/properties/statuses').then((r) => {
      const list = Array.isArray(r.data) ? r.data : [];
      setPropertyStatuses(list.map((s: any) => ({ id: s.id ?? s.Id ?? '', name: s.name ?? s.Name ?? '' })));
    }).catch(() => setPropertyStatuses([]));
    apiClient.get('/propertytypes').then((r) => {
      const list = Array.isArray(r.data) ? r.data : [];
      setPropertyTypes(list.map((t: any) => ({ id: t.id ?? t.Id ?? '', name: t.name ?? t.Name ?? '' })));
    }).catch(() => setPropertyTypes([]));
  }, []);

  useEffect(() => {
    loadProperties(1, pageSize, filterStatusId, filterPropertyTypeId, searchQuery);
  }, [dispatch]);

  // Debug: Log properties when they change
  useEffect(() => {
    if (properties.length > 0) {
      console.log('Properties loaded:', properties);
      console.log('First property PropertyType:', getNestedProperty(properties[0], 'PropertyType', 'propertyType'));
    }
  }, [properties]);

  // Helper function to safely access nested properties with fallback for different casing
  const getNestedProperty = (obj: any, ...keys: string[]) => {
    for (const key of keys) {
      if (obj && (obj[key] !== undefined && obj[key] !== null)) {
        return obj[key];
      }
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Properties</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage and track all registered properties
          </p>
        </div>
        <button 
          onClick={() => navigate('/properties/new')}
          className="btn-primary px-6 py-3"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Register New Property
        </button>
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
                placeholder="Search properties by address, owner, or ID..."
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
                  {propertyStatuses.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Property Type
                </label>
                <select
                  className="input py-2.5 w-full"
                  value={filterPropertyTypeId}
                  onChange={(e) => setFilterPropertyTypeId(e.target.value)}
                >
                  <option value="">All Types</option>
                  {propertyTypes.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-3 flex items-end">
                <button
                  type="button"
                  onClick={() => loadProperties(1, pageSize, filterStatusId, filterPropertyTypeId, searchQuery)}
                  className="btn-primary px-4 py-2.5"
                >
                  Apply filters
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Properties List */}
      <div className="card">
        <div className="card-header">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h3 className="text-lg font-semibold text-gray-900">
              All Properties
            </h3>
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-sm text-gray-500">
                {pagination.totalCount} {pagination.totalCount === 1 ? 'property' : 'properties'}
              </span>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                Per page
                <select
                  className="input py-1.5 pl-2 pr-8 text-sm"
                  value={pagination.pageSize}
                  onChange={(e) => {
                    const size = Number(e.target.value);
                    setPageSize(size);
                    loadProperties(1, size, filterStatusId, filterPropertyTypeId, searchQuery);
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
              <p className="mt-4 text-sm text-gray-500">Loading properties...</p>
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-danger-100 mb-4">
                <MapPinIcon className="h-8 w-8 text-danger-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Error loading properties
              </h3>
              <p className="text-sm text-gray-500 mb-6">{error}</p>
              <button 
                onClick={() => loadProperties(1, pageSize, filterStatusId, filterPropertyTypeId, searchQuery)}
                className="btn-secondary px-6 py-3"
              >
                Try Again
              </button>
            </div>
          ) : properties.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                <MapPinIcon className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No properties found
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                Get started by registering your first property
              </p>
              <button 
                onClick={() => navigate('/properties/new')}
                className="btn-primary px-6 py-3"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Register Property
              </button>
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
                      Owner
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Registered
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {properties.map((property: any) => (
                    <tr key={property.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-primary-100 rounded-lg flex items-center justify-center">
                            <MapPinIcon className="h-5 w-5 text-primary-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {property.streetAddress || 'N/A'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {getNestedProperty(property, 'CityNavigation', 'cityNavigation') 
                                ? (getNestedProperty(getNestedProperty(property, 'CityNavigation', 'cityNavigation'), 'Name', 'name') || property.city || '')
                                : (property.city || '')}
                              {(() => {
                                const regionName = getNestedProperty(getNestedProperty(property, 'Region', 'region'), 'Name', 'name');
                                return regionName ? `, ${regionName}` : (property.state ? `, ${property.state}` : '');
                              })()}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {property.ownerName 
                            || getNestedProperty(getNestedProperty(property, 'Owner', 'owner'), 'Name', 'name') 
                            || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {property.ownerEmail 
                            || getNestedProperty(getNestedProperty(property, 'Owner', 'owner'), 'Email', 'email') 
                            || ''}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {getNestedProperty(property, 'PropertyType', 'propertyType') 
                            ? (getNestedProperty(getNestedProperty(property, 'PropertyType', 'propertyType'), 'Name', 'name') || 'N/A')
                            : 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          (() => {
                            const statusName = getNestedProperty(getNestedProperty(property, 'Status', 'status'), 'Name', 'name');
                            if (statusName === 'Approved') return 'bg-success-100 text-success-800';
                            if (statusName === 'Pending') return 'bg-warning-100 text-warning-800';
                            if (statusName === 'Rejected') return 'bg-danger-100 text-danger-800';
                            return 'bg-gray-100 text-gray-800';
                          })()
                        }`}>
                          {getNestedProperty(getNestedProperty(property, 'Status', 'status'), 'Name', 'name') || 'Draft'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {property.createdAt ? new Date(property.createdAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button 
                            onClick={() => navigate(`/properties/${property.id}`)}
                            className="text-primary-600 hover:text-primary-900 p-1 rounded"
                            title="View"
                          >
                            <EyeIcon className="h-5 w-5" />
                          </button>
                          <button 
                            onClick={() => navigate(`/properties/${property.id}/edit`)}
                            className="text-gray-600 hover:text-gray-900 p-1 rounded"
                            title="Edit"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          {!isPropertyApproved(property) && (
                            <button
                              onClick={() => handleDeleteClick(property)}
                              disabled={deletingId === property.id}
                              className="text-danger-600 hover:text-danger-900 p-1 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Delete"
                            >
                              {deletingId === property.id ? (
                                <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-danger-600 border-t-transparent" />
                              ) : (
                                <TrashIcon className="h-5 w-5" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
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
            Showing {(pagination.page - 1) * pagination.pageSize + 1} to {Math.min(pagination.page * pagination.pageSize, pagination.totalCount)} of {pagination.totalCount} properties
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadProperties(pagination.page - 1, pagination.pageSize, filterStatusId, filterPropertyTypeId, searchQuery)}
              disabled={pagination.page <= 1}
              className="btn-secondary px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600 px-2">
              Page {pagination.page} of {Math.max(1, pagination.totalPages)}
            </span>
            <button
              onClick={() => loadProperties(pagination.page + 1, pagination.pageSize, filterStatusId, filterPropertyTypeId, searchQuery)}
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
