import { useState, useEffect } from 'react';
import apiClient from '../../config/api';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  FolderIcon,
  CheckCircleIcon,
  XCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface Section {
  id: string;
  name: string;
}

interface SubSection {
  id: string;
  sectionId: string;
  sectionName: string;
  name: string;
  description?: string;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export default function SubSections() {
  const [subSections, setSubSections] = useState<SubSection[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingSubSection, setEditingSubSection] = useState<SubSection | null>(null);
  const [formData, setFormData] = useState({
    sectionId: '',
    name: '',
    isActive: true,
  });

  useEffect(() => {
    loadSections();
    loadSubSections();
  }, []);

  const loadSections = async () => {
    try {
      const response = await apiClient.get('/sections');
      const activeSections = response.data.filter((s: any) => s.isActive !== false);
      setSections(activeSections);
    } catch (err: any) {
      console.error('Failed to load sections:', err);
    }
  };

  const loadSubSections = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/subsections');
      // Transform the data to include section name
      const transformed = response.data.map((ss: any) => ({
        ...ss,
        sectionName: ss.Section?.name || ss.section?.name || 'N/A',
      }));
      setSubSections(transformed);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load subsections');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.sectionId) {
      setError('Please select a section');
      return;
    }

    if (!formData.name.trim()) {
      setError('Please enter a subsection name');
      return;
    }

    try {
      if (editingSubSection) {
        await apiClient.put(`/subsections/${editingSubSection.id}`, formData);
      } else {
        await apiClient.post('/subsections', formData);
      }
      setShowForm(false);
      setEditingSubSection(null);
      setFormData({ sectionId: '', name: '', isActive: true });
      loadSubSections();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.response?.data?.error || 'Failed to save subsection';
      setError(errorMessage);
      console.error('Error saving subsection:', err.response?.data || err);
    }
  };

  const handleEdit = (subSection: SubSection) => {
    setEditingSubSection(subSection);
    setFormData({
      sectionId: subSection.sectionId,
      name: subSection.name,
      isActive: subSection.isActive,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await apiClient.delete(`/subsections/${id}`);
      loadSubSections();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete subsection');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingSubSection(null);
    setFormData({ sectionId: '', name: '', isActive: true });
    setError(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">SubSections</h2>
          <p className="mt-1 text-sm text-gray-600">
            Manage property subsections within sections
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary px-6 py-3"
          disabled={sections.length === 0}
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add SubSection
        </button>
      </div>

      {sections.length === 0 && (
        <div className="rounded-lg bg-warning-50 border border-warning-200 p-4">
          <p className="text-sm font-medium text-warning-800">
            Please create at least one section before adding subsections.
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
                    {editingSubSection ? 'Edit SubSection' : 'Add New SubSection'}
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
                      Section *
                    </label>
                    <select
                      required
                      className="input py-2.5"
                      value={formData.sectionId}
                      onChange={(e) => setFormData(prev => ({ ...prev, sectionId: e.target.value }))}
                    >
                      <option value="">Select a section</option>
                      {sections.map(section => (
                        <option key={section.id} value={section.id}>{section.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Name *
                    </label>
                    <input
                      type="text"
                      required
                      className="input py-2.5"
                      placeholder="e.g., SubSection A1, SubSection B2"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
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

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="btn-secondary px-4 py-2"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-primary px-4 py-2"
                    >
                      {editingSubSection ? 'Update' : 'Create'} SubSection
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SubSections List */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading subsections...</p>
        </div>
      ) : subSections.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <FolderIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No subsections</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new subsection.</p>
        </div>
      ) : (
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Section
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
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
              {subSections.map((subSection) => (
                <tr key={subSection.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{subSection.sectionName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{subSection.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {subSection.isActive ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircleIcon className="h-3 w-3 mr-1" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <XCircleIcon className="h-3 w-3 mr-1" />
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleEdit(subSection)}
                        className="text-primary-600 hover:text-primary-900 transition-colors"
                        title="Edit"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(subSection.id, subSection.name)}
                        className="text-danger-600 hover:text-danger-900 transition-colors"
                        title="Delete"
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
  );
}
