import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchPropertyById, clearError, updateProperty } from '../store/slices/propertySlice';
import apiClient from '../config/api';
import Swal from 'sweetalert2';
import {
  MapPinIcon,
  UserIcon,
  HomeIcon,
  DocumentTextIcon,
  ArrowLeftIcon,
  PencilIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ChevronRightIcon,
  ClipboardDocumentCheckIcon,
  BuildingOfficeIcon,
  BanknotesIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline';

interface PropertyStatus {
  id: string;
  name: string;
  description?: string;
  colorCode?: string;
  displayOrder: number;
}

export default function PropertyDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { currentProperty, isLoading, error } = useAppSelector((state) => state.property);
  const [propertyStatuses, setPropertyStatuses] = useState<PropertyStatus[]>([]);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [propertyImages, setPropertyImages] = useState<Array<{
    id: string;
    fileUrl: string;
    originalFileName: string;
    isPrimary: boolean;
    uploadedAt: string;
    blobUrl?: string; // For authenticated image loading
  }>>([]);
  const [selectedImage, setSelectedImage] = useState<{
    id: string;
    fileUrl: string;
    originalFileName: string;
    isPrimary: boolean;
    uploadedAt: string;
    blobUrl?: string;
  } | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  useEffect(() => {
    if (id) {
      dispatch(clearError());
      dispatch(fetchPropertyById(id));
      loadPropertyImages(id);
    }
  }, [id, dispatch]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      propertyImages.forEach((image) => {
        if (image.blobUrl) {
          URL.revokeObjectURL(image.blobUrl);
        }
      });
      // Also cleanup selected image blob URL
      if (selectedImage?.blobUrl) {
        URL.revokeObjectURL(selectedImage.blobUrl);
      }
    };
  }, [propertyImages, selectedImage]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isImageModalOpen) {
        setIsImageModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isImageModalOpen]);

  const loadPropertyImages = async (propertyId: string) => {
    try {
      const response = await apiClient.get(`/properties/${propertyId}/images`);
      const images = response.data || [];
      
      // Fetch images as blobs to include authentication headers
      const imagesWithBlobs = await Promise.all(
        images.map(async (image: any) => {
          try {
            // Extract the path from the full URL, removing /api prefix if present
            // since apiClient already has /api as baseURL
            let imagePath = image.fileUrl;
            if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
              // Extract path from full URL
              const url = new URL(imagePath);
              imagePath = url.pathname + url.search;
            }
            
            // Remove /api prefix if present (apiClient already includes it in baseURL)
            // Handle both /api/Properties and /api/properties (case-insensitive)
            const lowerPath = imagePath.toLowerCase();
            if (lowerPath.startsWith('/api/')) {
              imagePath = imagePath.substring(4); // Remove '/api' (4 characters)
            }
            
            // Ensure path starts with /
            if (!imagePath.startsWith('/')) {
              imagePath = '/' + imagePath;
            }
            
            console.log('Fetching image:', imagePath, 'from URL:', image.fileUrl);
            
            // Fetch image with authentication using apiClient
            const imageResponse = await apiClient.get(imagePath, { 
              responseType: 'blob' 
            });
            const blobUrl = URL.createObjectURL(imageResponse.data);
            return { ...image, blobUrl };
          } catch (err) {
            console.error(`Failed to load image ${image.id}:`, err);
            return image; // Return original image without blob URL
          }
        })
      );
      
      setPropertyImages(imagesWithBlobs);
    } catch (err) {
      console.error('Failed to load property images:', err);
      setPropertyImages([]);
    }
  };

  useEffect(() => {
    // Fetch property statuses
    const fetchStatuses = async () => {
      try {
        const response = await apiClient.get('/properties/statuses');
        setPropertyStatuses(response.data);
      } catch (error) {
        console.error('Failed to fetch property statuses:', error);
      }
    };
    fetchStatuses();
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
          <p className="mt-4 text-sm font-medium text-gray-500">Loading property…</p>
        </div>
      </div>
    );
  }

  if (error || !currentProperty) {
    return (
      <div className="space-y-6">
        <button onClick={() => navigate('/properties')} className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
          <ArrowLeftIcon className="h-5 w-5" />
          Back to Properties
        </button>
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-soft">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <DocumentTextIcon className="h-8 w-8 text-red-600" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-gray-900">{error || 'Property not found'}</h3>
          <p className="mt-2 text-sm text-gray-500">The property may not exist or could not be loaded.</p>
          <button onClick={() => navigate('/properties')} className="mt-6 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-700">
            Back to Properties
          </button>
        </div>
      </div>
    );
  }

  const property: any = currentProperty;

  // Helper function to safely access nested properties with fallback for different casing
  const getNestedProperty = (obj: any, ...keys: string[]) => {
    for (const key of keys) {
      if (obj && (obj[key] !== undefined && obj[key] !== null)) {
        return obj[key];
      }
    }
    return null;
  };

  // Define approval workflow steps
  const workflowSteps = [
    { 
      name: 'Draft', 
      description: 'Property registration in draft state',
      color: '#9E9E9E',
      icon: DocumentTextIcon,
      order: 1
    },
    { 
      name: 'Pending', 
      description: 'Property registration pending approval',
      color: '#FFC107',
      icon: ClockIcon,
      order: 2
    },
    { 
      name: 'Under Review', 
      description: 'Property registration under review',
      color: '#2196F3',
      icon: ClockIcon,
      order: 3
    },
    { 
      name: 'Approved', 
      description: 'Property registration approved',
      color: '#4CAF50',
      icon: CheckCircleIcon,
      order: 4
    },
    { 
      name: 'Rejected', 
      description: 'Property registration rejected',
      color: '#F44336',
      icon: XCircleIcon,
      order: 5
    }
  ];

  // Get current status (only if property is loaded)
  const currentStatusName = property 
    ? (getNestedProperty(getNestedProperty(property, 'Status', 'status'), 'Name', 'name') || 'Draft')
    : 'Draft';
  const currentStatus = workflowSteps.find(step => 
    step.name.toLowerCase() === currentStatusName.toLowerCase()
  ) || workflowSteps[0];

  // Determine which steps are completed, current, and pending
  const getStepStatus = (step: typeof workflowSteps[0]) => {
    const currentOrder = currentStatus.order;
    const stepOrder = step.order;

    if (step.name.toLowerCase() === 'rejected') {
      // Rejected is a terminal state, only show it if current status is rejected
      if (currentStatusName.toLowerCase() === 'rejected') {
        return 'current';
      }
      return 'hidden'; // Hide rejected step if not rejected
    }

    if (stepOrder < currentOrder) {
      return 'completed';
    } else if (stepOrder === currentOrder) {
      return 'current';
    } else {
      return 'pending';
    }
  };

  // Get available actions based on current status
  const getAvailableActions = () => {
    if (!property || propertyStatuses.length === 0) {
      return [];
    }

    const statusName = currentStatusName.toLowerCase();
    const actions: Array<{ label: string; statusName: string; variant: 'primary' | 'success' | 'danger' | 'warning' }> = [];

    if (statusName === 'draft') {
      // Draft can be submitted for review
      const pendingStatus = propertyStatuses.find(s => s.name.toLowerCase() === 'pending');
      if (pendingStatus) {
        actions.push({ label: 'Submit for Review', statusName: 'Pending', variant: 'primary' });
      }
    } else if (statusName === 'pending') {
      // Pending can be moved to review, approved, or rejected
      const underReviewStatus = propertyStatuses.find(s => s.name.toLowerCase() === 'under review');
      const approvedStatus = propertyStatuses.find(s => s.name.toLowerCase() === 'approved');
      const rejectedStatus = propertyStatuses.find(s => s.name.toLowerCase() === 'rejected');
      
      if (underReviewStatus) {
        actions.push({ label: 'Start Review', statusName: 'Under Review', variant: 'warning' });
      }
      if (approvedStatus) {
        actions.push({ label: 'Approve', statusName: 'Approved', variant: 'success' });
      }
      if (rejectedStatus) {
        actions.push({ label: 'Reject', statusName: 'Rejected', variant: 'danger' });
      }
    } else if (statusName === 'under review') {
      // Under Review can be approved or rejected
      const approvedStatus = propertyStatuses.find(s => s.name.toLowerCase() === 'approved');
      const rejectedStatus = propertyStatuses.find(s => s.name.toLowerCase() === 'rejected');
      
      if (approvedStatus) {
        actions.push({ label: 'Approve', statusName: 'Approved', variant: 'success' });
      }
      if (rejectedStatus) {
        actions.push({ label: 'Reject', statusName: 'Rejected', variant: 'danger' });
      }
    }
    // Approved and Rejected are terminal states - no actions

    return actions;
  };

  const handleStatusChange = async (newStatusName: string) => {
    if (!id || !property) {
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Property information not available',
        confirmButtonColor: '#dc2626',
        timer: 3000,
      });
      return;
    }

    const newStatus = propertyStatuses.find(s => s.name.toLowerCase() === newStatusName.toLowerCase());
    if (!newStatus) {
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: `Status "${newStatusName}" not found`,
        confirmButtonColor: '#dc2626',
        timer: 3000,
      });
      return;
    }

    // Confirm action for important status changes with SweetAlert
    let confirmed = true;
    if (newStatusName.toLowerCase() === 'rejected') {
      const result = await Swal.fire({
        title: 'Reject Property Registration?',
        text: 'Are you sure you want to reject this property registration? This action cannot be undone.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Yes, reject it!',
        cancelButtonText: 'Cancel',
        reverseButtons: true,
      });
      confirmed = result.isConfirmed;
    } else if (newStatusName.toLowerCase() === 'approved') {
      const result = await Swal.fire({
        title: 'Approve Property Registration?',
        text: 'Are you sure you want to approve this property registration?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#10b981',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Yes, approve it!',
        cancelButtonText: 'Cancel',
        reverseButtons: true,
      });
      confirmed = result.isConfirmed;
    }

    if (!confirmed) {
      return;
    }

    setIsUpdatingStatus(true);
    try {
      await dispatch(updateProperty({
        id,
        data: {
          statusId: newStatus.id
        }
      } as any)).unwrap();
      
      // Reload property to get updated status
      await dispatch(fetchPropertyById(id));
      
      await Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: `Property status updated to "${newStatusName}" successfully!`,
        confirmButtonColor: '#10b981',
        timer: 3000,
        showConfirmButton: true,
      });
    } catch (error: any) {
      console.error('Status update error:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Update Failed',
        text: error.message || 'Failed to update status. Please try again.',
        confirmButtonColor: '#dc2626',
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const statusName = getNestedProperty(getNestedProperty(property, 'Status', 'status'), 'Name', 'name') || 'Draft';
  const statusStyle = statusName === 'Approved' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : statusName === 'Pending' ? 'bg-amber-100 text-amber-800 border-amber-200' : statusName === 'Rejected' ? 'bg-red-100 text-red-800 border-red-200' : statusName === 'Under Review' ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-gray-100 text-gray-800 border-gray-200';

  return (
    <div className="space-y-8">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 px-6 py-6 shadow-medium sm:px-8 sm:py-7">
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <button
              onClick={() => navigate('/properties')}
              className="flex items-center gap-2 rounded-xl bg-white/15 backdrop-blur px-4 py-2.5 text-sm font-medium text-white hover:bg-white/25 transition"
            >
              <ArrowLeftIcon className="h-5 w-5" />
              Back
            </button>
            <div>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                {property.plateNumber && (
                  <span className="rounded-lg bg-white/20 backdrop-blur px-3 py-1.5 text-sm font-semibold text-white">
                    Plate {property.plateNumber}
                  </span>
                )}
                <span className={`rounded-lg border px-3 py-1.5 text-sm font-semibold ${statusStyle}`}>
                  {statusName}
                </span>
              </div>
              <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Property Details</h1>
              <p className="mt-1 text-sm text-primary-100">
                {getNestedProperty(property, 'PropertyType', 'propertyType') ? (getNestedProperty(getNestedProperty(property, 'PropertyType', 'propertyType'), 'Name', 'name') || 'Property') : 'Property'} · {property.streetAddress || 'No address'}
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate(`/properties/${id}/edit`)}
            className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-primary-700 shadow-sm hover:bg-primary-50 transition"
          >
            <PencilIcon className="h-5 w-5" />
            Edit Property
          </button>
        </div>
        <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-white/10 to-transparent pointer-events-none" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Key metrics strip */}
          <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-soft">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-100">
                  <BuildingOfficeIcon className="h-6 w-6 text-primary-600" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Property Type</p>
                  <p className="mt-0.5 text-lg font-semibold text-gray-900">
                    {getNestedProperty(property, 'PropertyType', 'propertyType') ? (getNestedProperty(getNestedProperty(property, 'PropertyType', 'propertyType'), 'Name', 'name') || 'N/A') : 'N/A'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
                  <HomeIcon className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Area</p>
                  <p className="mt-0.5 text-lg font-semibold text-gray-900">
                    {property.areaSize ? `${property.areaSize} ${property.areaUnit || 'm²'}` : 'N/A'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100">
                  <BanknotesIcon className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Est. Value</p>
                  <p className="mt-0.5 text-lg font-semibold text-gray-900">
                    {property.estimatedValue ? `${property.currency || 'USD'} ${property.estimatedValue.toLocaleString()}` : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="rounded-2xl border border-gray-200/80 bg-white shadow-soft overflow-hidden">
            <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50/80 px-6 py-4">
              <MapPinIcon className="h-5 w-5 text-primary-500" />
              <h3 className="text-base font-semibold text-gray-900">Location</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Street Address</p>
                  <p className="mt-1 text-sm font-medium text-gray-900">{property.streetAddress || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Region</p>
                  <p className="mt-1 text-sm text-gray-900">{getNestedProperty(getNestedProperty(property, 'Region', 'region'), 'Name', 'name') || property.regionId || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-500">City</p>
                  <p className="mt-1 text-sm text-gray-900">{getNestedProperty(getNestedProperty(property, 'CityNavigation', 'cityNavigation'), 'Name', 'name') || property.city || 'N/A'}</p>
                </div>
                {property.state && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-gray-500">State</p>
                    <p className="mt-1 text-sm text-gray-900">{property.state}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Coordinates</p>
                  <p className="mt-1 text-sm font-mono text-gray-700">{property.latitude}, {property.longitude}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Property details */}
          <div className="rounded-2xl border border-gray-200/80 bg-white shadow-soft overflow-hidden">
            <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50/80 px-6 py-4">
              <HomeIcon className="h-5 w-5 text-primary-500" />
              <h3 className="text-base font-semibold text-gray-900">Property Details</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Plate Number</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">{property.plateNumber || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Section</p>
                  <p className="mt-1 text-sm text-gray-900">{getNestedProperty(getNestedProperty(property, 'Section', 'section'), 'Name', 'name') || property.sectionId || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Sub-Section</p>
                  <p className="mt-1 text-sm text-gray-900">{getNestedProperty(getNestedProperty(property, 'SubSection', 'subSection'), 'Name', 'name') || property.subSectionId || 'N/A'}</p>
                </div>
                {property.description && (
                  <div className="md:col-span-2">
                    <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Description</p>
                    <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{property.description}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Approval workflow – improved */}
          <div className="rounded-2xl border border-gray-200/80 bg-white shadow-soft overflow-hidden">
            <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50/80 px-6 py-4">
              <ClipboardDocumentCheckIcon className="h-5 w-5 text-primary-500" />
              <h3 className="text-base font-semibold text-gray-900">Approval Workflow</h3>
            </div>
            <div className="p-6">
              {/* Horizontal stepper */}
              <div className="flex flex-wrap items-center gap-0 mb-8">
                {workflowSteps
                  .filter(step => getStepStatus(step) !== 'hidden')
                  .map((step, index, arr) => {
                    const stepStatus = getStepStatus(step);
                    const Icon = step.icon;
                    const isCompleted = stepStatus === 'completed';
                    const isCurrent = stepStatus === 'current';
                    const isLast = index === arr.length - 1;
                    return (
                      <div key={step.name} className="flex items-center">
                        <div className="flex flex-col items-center">
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                              isCompleted ? 'border-emerald-500 bg-emerald-50 text-emerald-600' : isCurrent ? 'border-primary-500 bg-primary-50 text-primary-600 ring-4 ring-primary-100' : 'border-gray-200 bg-gray-50 text-gray-400'
                            }`}
                          >
                            {isCompleted ? <CheckCircleIcon className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                          </div>
                          <span className={`mt-2 text-xs font-medium ${isCurrent ? 'text-primary-600' : isCompleted ? 'text-gray-700' : 'text-gray-400'}`}>{step.name}</span>
                        </div>
                        {!isLast && <ChevronRightIcon className="mx-1 h-5 w-5 text-gray-300" />}
                      </div>
                    );
                  })}
              </div>

              {/* Approved/Rejected info */}
              {currentStatusName === 'Approved' && property.approvedAt && (
                <div className="mb-6 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
                  <p className="text-sm font-medium text-emerald-800">
                    Approved on {new Date(property.approvedAt).toLocaleString()}
                    {(() => {
                      const approvedBy = getNestedProperty(property, 'ApprovedBy', 'approvedBy');
                      if (approvedBy) {
                        const fn = getNestedProperty(approvedBy, 'FirstName', 'firstName') || '';
                        const ln = getNestedProperty(approvedBy, 'LastName', 'lastName') || '';
                        return ` by ${fn} ${ln}`.trim();
                      }
                      return '';
                    })()}
                  </p>
                </div>
              )}
              {currentStatusName === 'Rejected' && (
                <div className="mb-6 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
                  <p className="text-sm font-medium text-red-800">This property registration has been rejected.</p>
                </div>
              )}

              {/* Action buttons */}
              {(() => {
                const availableActions = getAvailableActions();
                if (availableActions.length === 0) return null;
                return (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-3">Available actions</p>
                    <div className="flex flex-wrap gap-3">
                      {availableActions.map((action) => (
                        <button
                          key={action.statusName}
                          onClick={() => handleStatusChange(action.statusName)}
                          disabled={isUpdatingStatus}
                          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed ${
                            action.variant === 'success' ? 'bg-emerald-600 text-white hover:bg-emerald-700' :
                            action.variant === 'danger' ? 'bg-red-600 text-white hover:bg-red-700' :
                            action.variant === 'warning' ? 'bg-amber-500 text-white hover:bg-amber-600' :
                            'bg-primary-600 text-white hover:bg-primary-700'
                          }`}
                        >
                          {isUpdatingStatus ? (
                            <>
                              <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                              Updating…
                            </>
                          ) : (
                            <>
                              {action.variant === 'success' && <CheckCircleIcon className="h-5 w-5" />}
                              {action.variant === 'danger' && <XCircleIcon className="h-5 w-5" />}
                              {action.label}
                            </>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Payment summary */}
          <div className="rounded-2xl border border-gray-200/80 bg-white shadow-soft overflow-hidden">
            <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50/80 px-6 py-4">
              <BanknotesIcon className="h-5 w-5 text-primary-500" />
              <h3 className="text-base font-semibold text-gray-900">Payment</h3>
            </div>
            <div className="p-6">
              <div className="flex flex-wrap items-center gap-6">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Status</p>
                  <span className={`mt-1 inline-flex rounded-lg px-2.5 py-1 text-sm font-semibold ${
                    (() => {
                      const ps = property.paymentStatus?.toLowerCase();
                      if (ps === 'paid') return 'bg-emerald-100 text-emerald-800';
                      if (ps === 'paid_partially') return 'bg-amber-100 text-amber-800';
                      if (ps === 'exemption') return 'bg-blue-100 text-blue-800';
                      return 'bg-gray-100 text-gray-800';
                    })()
                  }`}>
                    {property.paymentStatus || 'Pending'}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Paid Amount</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">{property.currency || 'USD'} {property.paidAmount?.toLocaleString() || '0.00'}</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <a
                  href={`/properties/${id}/notice`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-200 transition"
                >
                  <PrinterIcon className="h-5 w-5" />
                  Print notice (Ogaysiis — Lacagta ku waajibtay guriga)
                </a>
                <p className="mt-1 text-xs text-gray-500">Waraaq ogaysiis ah oo muujinaya lacagta canshuurta ee la bixinayo. A receipt is issued when payment is collected.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6 lg:sticky lg:top-24">
          {/* Owner */}
          <div className="rounded-2xl border border-gray-200/80 bg-white shadow-soft overflow-hidden">
            <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50/80 px-5 py-3">
              <UserIcon className="h-5 w-5 text-primary-500" />
              <h3 className="text-base font-semibold text-gray-900">Owner</h3>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Name</p>
                <p className="mt-0.5 text-sm font-semibold text-gray-900">{getNestedProperty(getNestedProperty(property, 'Owner', 'owner'), 'Name', 'name') || property.ownerName || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500">ID Number</p>
                <p className="mt-0.5 text-sm text-gray-900">{getNestedProperty(getNestedProperty(property, 'Owner', 'owner'), 'IdNumber', 'idNumber') || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Phone</p>
                <p className="mt-0.5 text-sm text-gray-900">{getNestedProperty(getNestedProperty(property, 'Owner', 'owner'), 'Phone', 'phone') || property.ownerPhone || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Email</p>
                <p className="mt-0.5 text-sm text-gray-900">{getNestedProperty(getNestedProperty(property, 'Owner', 'owner'), 'Email', 'email') || property.ownerEmail || 'N/A'}</p>
              </div>
              {(() => {
                const addr = getNestedProperty(getNestedProperty(property, 'Owner', 'owner'), 'Address', 'address');
                return addr ? (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Address</p>
                    <p className="mt-0.5 text-sm text-gray-900">{addr}</p>
                  </div>
                ) : null;
              })()}
            </div>
          </div>

          {/* Responsible Person */}
          {(() => {
            const rp = getNestedProperty(property, 'ResponsiblePerson', 'responsiblePerson');
            return rp ? (
              <div className="rounded-2xl border border-gray-200/80 bg-white shadow-soft overflow-hidden">
                <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50/80 px-5 py-3">
                  <UserIcon className="h-5 w-5 text-primary-500" />
                  <h3 className="text-base font-semibold text-gray-900">Responsible Person</h3>
                </div>
                <div className="p-5 space-y-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Name</p>
                    <p className="mt-0.5 text-sm font-semibold text-gray-900">{getNestedProperty(rp, 'Name', 'name') || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Relationship</p>
                    <p className="mt-0.5 text-sm text-gray-900">{getNestedProperty(rp, 'Relationship', 'relationship') || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Phone</p>
                    <p className="mt-0.5 text-sm text-gray-900">{getNestedProperty(rp, 'Phone', 'phone') || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Email</p>
                    <p className="mt-0.5 text-sm text-gray-900">{getNestedProperty(rp, 'Email', 'email') || 'N/A'}</p>
                  </div>
                  {getNestedProperty(rp, 'Address', 'address') && (
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Address</p>
                      <p className="mt-0.5 text-sm text-gray-900">{getNestedProperty(rp, 'Address', 'address')}</p>
                    </div>
                  )}
                  {getNestedProperty(rp, 'IdNumber', 'idNumber') && (
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-gray-500">ID Number</p>
                      <p className="mt-0.5 text-sm text-gray-900">{getNestedProperty(rp, 'IdNumber', 'idNumber')}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : null;
          })()}

          {/* Property Images */}
          {propertyImages.length > 0 && (
            <div className="rounded-2xl border border-gray-200/80 bg-white shadow-soft overflow-hidden">
              <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50/80 px-5 py-3">
                <DocumentTextIcon className="h-5 w-5 text-primary-500" />
                <h3 className="text-base font-semibold text-gray-900">Images</h3>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 gap-2">
                  {propertyImages.map((image) => (
                    <button
                      key={image.id}
                      type="button"
                      className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                      onClick={() => { setSelectedImage(image); setIsImageModalOpen(true); }}
                    >
                      <img
                        src={image.blobUrl || image.fileUrl}
                        alt={image.originalFileName}
                        className="w-full h-full object-cover hover:scale-105 transition-transform"
                        onError={(e) => {
                          if (image.blobUrl && (e.target as HTMLImageElement).src !== image.fileUrl) (e.target as HTMLImageElement).src = image.fileUrl;
                        }}
                      />
                      {image.isPrimary && (
                        <span className="absolute top-1.5 left-1.5 rounded bg-primary-600 px-1.5 py-0.5 text-xs font-medium text-white">Primary</span>
                      )}
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-center text-xs text-gray-500">Click to view full size</p>
              </div>
            </div>
          )}

          {/* Image modal */}
          {isImageModalOpen && selectedImage && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
              onClick={() => setIsImageModalOpen(false)}
              onKeyDown={(e) => { if (e.key === 'Escape') setIsImageModalOpen(false); }}
              tabIndex={0}
              role="dialog"
            >
              <button onClick={() => setIsImageModalOpen(false)} className="absolute top-4 right-4 z-10 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" aria-label="Close">
                <XCircleIcon className="h-6 w-6" />
              </button>
              <img
                src={selectedImage.blobUrl || selectedImage.fileUrl}
                alt={selectedImage.originalFileName}
                className="max-w-full max-h-full object-contain rounded-lg"
                onClick={(e) => e.stopPropagation()}
                onError={(e) => {
                  if (selectedImage.blobUrl && (e.target as HTMLImageElement).src !== selectedImage.fileUrl) (e.target as HTMLImageElement).src = selectedImage.fileUrl;
                }}
              />
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-lg bg-black/60 px-4 py-2 text-sm text-white">{selectedImage.originalFileName}</div>
            </div>
          )}

          {/* Administrative */}
          <div className="rounded-2xl border border-gray-200/80 bg-white shadow-soft overflow-hidden">
            <div className="border-b border-gray-100 bg-gray-50/80 px-5 py-3">
              <h3 className="text-base font-semibold text-gray-900">Administrative</h3>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Collector</p>
                <p className="mt-0.5 text-sm text-gray-900">
                  {(() => {
                    const c = getNestedProperty(property, 'Collector', 'collector');
                    return c ? `${getNestedProperty(c, 'FirstName', 'firstName') || ''} ${getNestedProperty(c, 'LastName', 'lastName') || ''}`.trim() || 'N/A' : 'N/A';
                  })()}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Kontontriye</p>
                <p className="mt-0.5 text-sm text-gray-900">
                  {(() => {
                    const k = getNestedProperty(property, 'Kontontriye', 'kontontriye');
                    return k ? `${getNestedProperty(k, 'FirstName', 'firstName') || ''} ${getNestedProperty(k, 'LastName', 'lastName') || ''}`.trim() || 'N/A' : 'N/A';
                  })()}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Created By</p>
                <p className="mt-0.5 text-sm text-gray-900">
                  {(() => {
                    const cb = getNestedProperty(property, 'CreatedBy', 'createdBy');
                    return cb ? `${getNestedProperty(cb, 'FirstName', 'firstName') || ''} ${getNestedProperty(cb, 'LastName', 'lastName') || ''}`.trim() || 'N/A' : 'N/A';
                  })()}
                </p>
              </div>
              {(() => {
                const ab = getNestedProperty(property, 'ApprovedBy', 'approvedBy');
                return ab ? (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Approved By</p>
                    <p className="mt-0.5 text-sm text-gray-900">{`${getNestedProperty(ab, 'FirstName', 'firstName') || ''} ${getNestedProperty(ab, 'LastName', 'lastName') || ''}`.trim() || 'N/A'}</p>
                  </div>
                ) : null;
              })()}
              <div className="pt-3 border-t border-gray-100">
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Created</p>
                <p className="mt-0.5 text-sm text-gray-900">{property.createdAt ? new Date(property.createdAt).toLocaleString() : 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Updated</p>
                <p className="mt-0.5 text-sm text-gray-900">{property.updatedAt ? new Date(property.updatedAt).toLocaleString() : 'N/A'}</p>
              </div>
              {property.approvedAt && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Approved</p>
                  <p className="mt-0.5 text-sm text-gray-900">{new Date(property.approvedAt).toLocaleString()}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
