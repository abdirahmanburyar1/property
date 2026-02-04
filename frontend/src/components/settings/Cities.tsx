import { useState, useEffect } from 'react';
import apiClient from '../../config/api';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  BuildingOfficeIcon,
  CheckCircleIcon,
  XCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface Region {
  id: string;
  name: string;
}

interface City {
  id: string;
  regionId: string;
  regionName: string;
  name: string;
  code?: string;
  description?: string;
  isActive: boolean;
  propertyCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function Cities() {
  const [cities, setCities] = useState<City[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingCity, setEditingCity] = useState<City | null>(null);
  const [formData, setFormData] = useState({
    regionId: '',
    name: '',
    code: '',
    description: '',
    isActive: true,
  });

  useEffect(() => {
    loadRegions();
    loadCities();
  }, []);

  const loadRegions = async () => {
    try {
      const response = await apiClient.get('/regions');
      setRegions(response.data);
    } catch (err: any) {
      console.error('Failed to load regions:', err);
    }
  };

  const loadCities = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/cities');
      setCities(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load cities');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.regionId) {
      setError('Please select a region');
      return;
    }

    try {
      if (editingCity) {
        await apiClient.put(`/cities/${editingCity.id}`, formData);
      } else {
        await apiClient.post('/cities', formData);
      }
      setShowForm(false);
      setEditingCity(null);
      setFormData({ regionId: '', name: '', code: '', description: '', isActive: true });
      loadCities();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.response?.data?.error || 'Failed to save city';
      const errorDetails = err.response?.data?.details;
      setError(errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage);
      console.error('Error saving city:', err.response?.data || err);
    }
  };

  const handleEdit = (city: City) => {
    setEditingCity(city);
    setFormData({
      regionId: city.regionId,
      name: city.name,
      code: city.code || '',
      description: city.description || '',
      isActive: city.isActive,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await apiClient.delete(`/cities/${id}`);
      loadCities();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete city');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingCity(null);
    setFormData({ regionId: '', name: '', code: '', description: '', isActive: true });
    setError(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Cities</h2>
          <p className="mt-1 text-sm text-gray-600">
            Manage cities within regions
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary px-6 py-3"
          disabled={regions.length === 0}
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add City
        </button>
      </div>

      {regions.length === 0 && (
        <div className="rounded-lg bg-warning-50 border border-warning-200 p-4">
          <p className="text-sm font-medium text-warning-800">
            Please create at least one region before adding cities.
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-danger-50 border border-danger-200 p-4">
          <p className="text-sm font-medium text-danger-800">{error}</p>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
              onClick={handleCancel}
            ></div>

            {/* Center modal */}
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
              &#8203;
            </span>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {editingCity ? 'Edit City' : 'Add New City'}
                  </h3>
                  <button
                    onClick={handleCancel}
                    className="text-gray-400 hover:text-gray-500 transition-colors"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
                {error && (
                  <div className="mb-4 rounded-lg bg-danger-50 border border-danger-200 p-3">
                    <p className="text-sm font-medium text-danger-800">{error}</p>
                  </div>
                )}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Region *
                    </label>
                    <select
                      required
                      className="input py-2.5"
                      value={formData.regionId}
                      onChange={(e) => setFormData(prev => ({ ...prev, regionId: e.target.value }))}
                    >
                      <option value="">Select a region</option>
                      {regions.map(region => (
                        <option key={region.id} value={region.id}>{region.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Name *
                      </label>
                      <input
                        type="text"
                        required
                        className="input py-2.5"
                        placeholder="e.g., Addis Ababa, Dire Dawa"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Code
                      </label>
                      <input
                        type="text"
                        className="input py-2.5"
                        placeholder="e.g., AA, DD"
                        value={formData.code}
                        onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      rows={3}
                      className="input py-2.5"
                      placeholder="Brief description of this city..."
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      className="input py-2.5"
                      value={formData.isActive ? 'active' : 'inactive'}
                      onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.value === 'active' }))}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>

                  <div className="flex justify-end space-x-4 pt-4">
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="btn-secondary px-6 py-2.5"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-primary px-6 py-2.5"
                    >
                      {editingCity ? 'Update' : 'Create'} City
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cities List */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              All Cities
            </h3>
            <span className="text-sm text-gray-500">
              {cities.length} {cities.length === 1 ? 'city' : 'cities'}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <p className="mt-2 text-gray-500">Loading cities...</p>
            </div>
          ) : cities.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                <BuildingOfficeIcon className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No cities found
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                Get started by creating your first city
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="btn-primary px-6 py-3"
                disabled={regions.length === 0}
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Add City
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      City
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Region
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Properties
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {cities.map((city) => (
                    <tr key={city.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-primary-100 rounded-lg flex items-center justify-center">
                            <BuildingOfficeIcon className="h-5 w-5 text-primary-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {city.name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {city.regionName}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {city.code ? (
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                            {city.code}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          {city.propertyCount} {city.propertyCount === 1 ? 'property' : 'properties'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {city.isActive ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-success-100 text-success-800">
                            <CheckCircleIcon className="h-4 w-4 mr-1" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            <XCircleIcon className="h-4 w-4 mr-1" />
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleEdit(city)}
                            className="text-primary-600 hover:text-primary-900 p-1 rounded"
                            title="Edit"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(city.id, city.name)}
                            disabled={city.propertyCount > 0}
                            className={`p-1 rounded ${
                              city.propertyCount > 0
                                ? 'text-gray-300 cursor-not-allowed'
                                : 'text-danger-600 hover:text-danger-900'
                            }`}
                            title={city.propertyCount > 0 ? 'Cannot delete: has properties' : 'Delete'}
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
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
    </div>
  );
}
