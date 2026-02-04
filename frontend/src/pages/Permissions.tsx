import { useState, useEffect } from 'react';
import apiClient from '../config/api';
import {
  KeyIcon,
  ShieldCheckIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface Permission {
  id: string;
  name: string;
  code: string;
  description?: string;
  category: string;
  roleCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function Permissions() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    isActive: true,
  });

  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get('/permissions');
      const loadedPermissions = response.data as Permission[];
      setPermissions(loadedPermissions);
      
      // Extract categories from permissions
      const uniqueCategories = Array.from(new Set(loadedPermissions.map((p) => p.category).filter((c): c is string => !!c)));
      setCategories(uniqueCategories.sort());
    } catch (err: any) {
      console.error('Failed to load permissions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name || !formData.code) {
      setError('Permission name and code are required');
      return;
    }

    try {
      const payload = {
        name: formData.name.trim(),
        code: formData.code.trim(),
        description: formData.description?.trim() || null,
        isActive: formData.isActive,
      };

      if (editingPermission) {
        await apiClient.put(`/permissions/${editingPermission.id}`, payload);
      } else {
        await apiClient.post('/permissions', payload);
      }
      setShowForm(false);
      setEditingPermission(null);
      setFormData({ name: '', code: '', description: '', isActive: true });
      loadPermissions();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.response?.data?.error || 'Failed to save permission';
      const errorDetails = err.response?.data?.details;
      setError(errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage);
      console.error('Error saving permission:', err.response?.data || err);
    }
  };

  const handleEdit = (permission: Permission) => {
    setEditingPermission(permission);
    setFormData({
      name: permission.name,
      code: permission.code,
      description: permission.description || '',
      isActive: true, // Permissions are always active in the list
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await apiClient.delete(`/permissions/${id}`);
      loadPermissions();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete permission');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingPermission(null);
    setFormData({ name: '', code: '', description: '', isActive: true });
    setError(null);
  };

  const filteredPermissions = permissions.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const permissionsByCategory = categories.reduce((acc, category) => {
    acc[category] = filteredPermissions.filter(p => p.category === category);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Permissions</h2>
          <p className="mt-1 text-sm text-gray-600">
            Manage system permissions
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary px-6 py-3"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Permission
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-danger-50 border border-danger-200 p-4">
          <p className="text-sm font-medium text-danger-800">{error}</p>
        </div>
      )}

      {/* Form Modal */}
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
                    {editingPermission ? 'Edit Permission' : 'Add New Permission'}
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
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Name *
                      </label>
                      <input
                        type="text"
                        required
                        className="input py-2.5"
                        placeholder="e.g., Properties.Create"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Category will be auto-extracted from name (e.g., "Properties.Create" → "Properties")
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Code *
                      </label>
                      <input
                        type="text"
                        required
                        className="input py-2.5"
                        placeholder="e.g., PROPERTIES_CREATE"
                        value={formData.code}
                        onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
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
                      placeholder="Brief description of this permission..."
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    />
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
                      {editingPermission ? 'Update' : 'Create'} Permission
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Permissions
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="input py-2.5 pl-10"
                placeholder="Search by name, code, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Permissions List */}
      {isLoading ? (
        <div className="card">
          <div className="card-body text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="mt-2 text-gray-500">Loading permissions...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {categories.map(category => {
            const categoryPermissions = permissionsByCategory[category] || [];
            if (categoryPermissions.length === 0) return null;

            return (
              <div key={category} className="card">
                <div className="card-header">
                  <div className="flex items-center">
                    <KeyIcon className="h-5 w-5 mr-2 text-primary-600" />
                    <h3 className="text-lg font-semibold text-gray-900">{category}</h3>
                    <span className="ml-2 text-sm text-gray-500">
                      ({categoryPermissions.length} {categoryPermissions.length === 1 ? 'permission' : 'permissions'})
                    </span>
                  </div>
                </div>
                <div className="card-body p-0">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Permission
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Code
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Description
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Assigned to Roles
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {categoryPermissions.map((permission) => (
                          <tr key={permission.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-8 w-8 bg-primary-100 rounded-lg flex items-center justify-center">
                                  <ShieldCheckIcon className="h-4 w-4 text-primary-600" />
                                </div>
                                <div className="ml-3">
                                  <div className="text-sm font-medium text-gray-900">
                                    {permission.name}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 font-mono">
                                {permission.code}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-500 max-w-md">
                                {permission.description || <span className="text-gray-400">No description</span>}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                {permission.roleCount} {permission.roleCount === 1 ? 'role' : 'roles'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex items-center justify-end space-x-2">
                                <button
                                  onClick={() => handleEdit(permission)}
                                  disabled={permission.roleCount > 0}
                                  className={`p-1 rounded ${
                                    permission.roleCount > 0
                                      ? 'text-gray-300 cursor-not-allowed'
                                      : 'text-primary-600 hover:text-primary-900'
                                  }`}
                                  title={permission.roleCount > 0 ? 'Cannot edit: assigned to roles' : 'Edit'}
                                >
                                  <PencilIcon className="h-5 w-5" />
                                </button>
                                <button
                                  onClick={() => handleDelete(permission.id, permission.name)}
                                  disabled={permission.roleCount > 0}
                                  className={`p-1 rounded ${
                                    permission.roleCount > 0
                                      ? 'text-gray-300 cursor-not-allowed'
                                      : 'text-danger-600 hover:text-danger-900'
                                  }`}
                                  title={permission.roleCount > 0 ? 'Cannot delete: assigned to roles' : 'Delete'}
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
                </div>
              </div>
            );
          })}

          {filteredPermissions.length === 0 && (
            <div className="card">
              <div className="card-body text-center py-16">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                  <KeyIcon className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No permissions found
                </h3>
                <p className="text-sm text-gray-500">
                  {searchTerm ? 'Try adjusting your search criteria' : 'No permissions available'}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
