import { useState, useEffect } from 'react';
import apiClient from '../config/api';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  HomeIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface PropertyType {
  id: string;
  name: string;
  price: number;
  unit: string;
  propertyCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function PropertyTypes() {
  // Role-based access control will be implemented later
  const isAdmin = true; // Temporarily allow all actions

  const [propertyTypes, setPropertyTypes] = useState<PropertyType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingType, setDeletingType] = useState<PropertyType | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingType, setEditingType] = useState<PropertyType | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    unit: 'm', // Land measurement unit (meters, hectares, etc.)
  });

  useEffect(() => {
    loadPropertyTypes();
  }, []);

  const loadPropertyTypes = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/propertytypes');
      setPropertyTypes(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load property types');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name || !formData.name.trim()) {
      setError('Property type name is required');
      return;
    }

    if (!formData.price || parseFloat(formData.price) < 0) {
      setError('Price must be greater than or equal to zero');
      return;
    }

    if (!formData.unit || !formData.unit.trim()) {
      setError('Unit is required');
      return;
    }

    try {
      const priceValue = parseFloat(formData.price);
      if (isNaN(priceValue)) {
        setError('Price must be a valid number');
        return;
      }

      const payload = {
        name: formData.name.trim(),
        price: priceValue,
        unit: formData.unit.trim(),
      };

      if (editingType) {
        await apiClient.put(`/propertytypes/${editingType.id}`, payload);
      } else {
        await apiClient.post('/propertytypes', payload);
      }
      setShowForm(false);
      setEditingType(null);
      setFormData({ name: '', price: '', unit: 'm' });
      setError(null);
      loadPropertyTypes();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to save property type';
      const errorDetails = err.response?.data?.details || '';
      setError(errorMessage + (errorDetails ? `: ${errorDetails}` : ''));
      console.error('Error saving property type:', err);
      console.error('Error details:', err.response?.data);
    }
  };

  const handleEdit = (type: PropertyType) => {
    setEditingType(type);
    setFormData({
      name: type.name || '',
      price: type.price?.toString() || '',
      unit: type.unit || 'm',
    });
    setShowForm(true);
  };

  const handleDeleteClick = (type: PropertyType) => {
    setDeletingType(type);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingType) return;

    setIsDeleting(true);
    setError(null);
    try {
      await apiClient.delete(`/propertytypes/${deletingType.id}`);
      setShowDeleteModal(false);
      setDeletingType(null);
      loadPropertyTypes();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete property type');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setDeletingType(null);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingType(null);
    setFormData({ name: '', price: '', unit: 'm' });
    setError(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Property Types</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage property types and their permit prices. Property type determines permit pricing.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary px-6 py-3"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Property Type
          </button>
        )}
      </div>

      {error && !showForm && !showDeleteModal && (
        <div className="rounded-lg bg-danger-50 border border-danger-200 p-4">
          <p className="text-sm font-medium text-danger-800">{error}</p>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
              onClick={handleCancel}
            ></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
              &#8203;
            </span>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {editingType ? 'Edit Property Type' : 'Add New Property Type'}
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
                      Name *
                    </label>
                    <input
                      type="text"
                      required
                      className="input py-2.5"
                      placeholder="e.g., Residential, Commercial, Mosque"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Price (USD) *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                        <input
                          type="number"
                          step="0.001"
                          min="0"
                          required
                          className="input py-2.5 pl-8"
                          placeholder="0.000"
                          value={formData.price}
                          onChange={(e) => {
                          const raw = e.target.value;
                          if (raw === '' || raw === '.') {
                            setFormData(prev => ({ ...prev, price: raw }));
                            return;
                          }
                          const match = raw.match(/^\d*\.?\d{0,3}$/);
                          if (match) setFormData(prev => ({ ...prev, price: raw }));
                        }}
                        />
                      </div>
                      <p className="mt-1 text-xs text-gray-500">Permit price per unit in USD (up to 3 decimal places, e.g. 0.042)</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Unit (Land Measurement) *
                      </label>
                      <select
                        required
                        className="input py-2.5"
                        value={formData.unit}
                        onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                      >
                        <option value="m">m (Square Meters)</option>
                        <option value="hectare">Hectare</option>
                        <option value="acre">Acre</option>
                        <option value="sqft">sqft (Square Feet)</option>
                      </select>
                    </div>
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
                      {editingType ? 'Update' : 'Create'} Property Type
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingType && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
              onClick={handleDeleteCancel}
            ></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
              &#8203;
            </span>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Delete Property Type
                  </h3>
                  <button
                    onClick={handleDeleteCancel}
                    className="text-gray-400 hover:text-gray-500 transition-colors"
                    disabled={isDeleting}
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
                {error && (
                  <div className="mb-4 rounded-lg bg-danger-50 border border-danger-200 p-3">
                    <p className="text-sm font-medium text-danger-800">{error}</p>
                  </div>
                )}
                <div className="mb-4">
                  <p className="text-sm text-gray-600">
                    Are you sure you want to delete <span className="font-semibold text-gray-900">"{deletingType.name}"</span>?
                  </p>
                  {deletingType.propertyCount > 0 && (
                    <div className="mt-3 rounded-lg bg-warning-50 border border-warning-200 p-3">
                      <p className="text-sm font-medium text-warning-800">
                        This property type is being used by {deletingType.propertyCount} {deletingType.propertyCount === 1 ? 'property' : 'properties'}. 
                        You cannot delete it until all properties are removed or reassigned.
                      </p>
                    </div>
                  )}
                  {deletingType.propertyCount === 0 && (
                    <p className="mt-2 text-sm text-gray-500">
                      This action cannot be undone.
                    </p>
                  )}
                </div>
                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={handleDeleteCancel}
                    className="btn-secondary px-6 py-2.5"
                    disabled={isDeleting}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteConfirm}
                    disabled={isDeleting || deletingType.propertyCount > 0}
                    className={`px-6 py-2.5 ${
                      deletingType.propertyCount > 0
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'btn-danger'
                    }`}
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Property Types List */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              All Property Types
            </h3>
            <span className="text-sm text-gray-500">
              {propertyTypes.length} {propertyTypes.length === 1 ? 'type' : 'types'}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <p className="mt-2 text-gray-500">Loading property types...</p>
            </div>
          ) : propertyTypes.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                <HomeIcon className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No property types found
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                Get started by creating your first property type
              </p>
              {isAdmin && (
                <button
                  onClick={() => setShowForm(true)}
                  className="btn-primary px-6 py-3"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Add Property Type
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Permit Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Updated
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Properties
                    </th>
                    {isAdmin && (
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {propertyTypes.map((type) => (
                    <tr key={type.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-primary-100 rounded-lg flex items-center justify-center">
                            <HomeIcon className="h-5 w-5 text-primary-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {type.name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-gray-900">
                            ${type.price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 3 })}
                          </span>
                          <span className="ml-2 px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                            / {type.unit}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-xs text-gray-500">
                          {type.updatedAt ? new Date(type.updatedAt).toLocaleDateString() : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          {type.propertyCount} {type.propertyCount === 1 ? 'property' : 'properties'}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleEdit(type)}
                              className="text-primary-600 hover:text-primary-900 p-1 rounded"
                              title="Edit"
                            >
                              <PencilIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(type)}
                              className="text-danger-600 hover:text-danger-900 p-1 rounded transition-colors"
                              title="Delete"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      )}
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
