import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { createProperty, updateProperty, fetchPropertyById, clearError } from '../store/slices/propertySlice';
import apiClient from '../config/api';
import {
  MapPinIcon,
  UserIcon,
  HomeIcon,
  DocumentTextIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';

interface PropertyType {
  id: string;
  name: string;
  price: number;
  unit: string;
}

interface Owner {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  idNumber?: string;
}

interface ResponsiblePerson {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  idNumber?: string;
  relationship?: string;
}

export default function PropertyForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const { currentProperty, isLoading, error } = useAppSelector((state) => state.property);
  const currentUser = useAppSelector((state) => state.auth.user);
  const [propertyTypes, setPropertyTypes] = useState<PropertyType[]>([]);
  
  // Owner state
  const [ownerSearchQuery, setOwnerSearchQuery] = useState('');
  const [ownerSearchResults, setOwnerSearchResults] = useState<Owner[]>([]);
  const [selectedOwner, setSelectedOwner] = useState<Owner | null>(null);
  const [showOwnerSearch, setShowOwnerSearch] = useState(false);
  const [createNewOwner, setCreateNewOwner] = useState(false);
  const [newOwnerData, setNewOwnerData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    idNumber: '',
  });
  const ownerSearchRef = useRef<HTMLDivElement>(null);

  // Responsible Person state
  const [responsibleSearchQuery, setResponsibleSearchQuery] = useState('');
  const [responsibleSearchResults, setResponsibleSearchResults] = useState<ResponsiblePerson[]>([]);
  const [selectedResponsible, setSelectedResponsible] = useState<ResponsiblePerson | null>(null);
  const [showResponsibleSearch, setShowResponsibleSearch] = useState(false);
  const [createNewResponsible, setCreateNewResponsible] = useState(false);
  const [newResponsibleData, setNewResponsibleData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    idNumber: '',
    relationship: '',
  });
  const responsibleSearchRef = useRef<HTMLDivElement>(null);

  const [regions, setRegions] = useState<Array<{ id: string; name: string; isActive: boolean }>>([]);
  const [cities, setCities] = useState<Array<{ id: string; name: string; regionId: string; isActive: boolean }>>([]);
  const [selectedRegionId, setSelectedRegionId] = useState<string>('');
  const [selectedCityId, setSelectedCityId] = useState<string>('');
  const [users, setUsers] = useState<Array<{ id: string; firstName: string; lastName: string; email: string }>>([]);
  const [sections, setSections] = useState<Array<{ id: string; name: string; isActive: boolean }>>([]);
  const [subSections, setSubSections] = useState<Array<{ id: string; name: string; sectionId: string; isActive: boolean }>>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [selectedSubSectionId, setSelectedSubSectionId] = useState<string>('');

  // Property images state
  const [propertyImages, setPropertyImages] = useState<Array<{
    id: string;
    fileUrl: string;
    originalFileName: string;
    isPrimary: boolean;
    uploadedAt: string;
  }>>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);

  const [formData, setFormData] = useState({
    latitude: '9.1450',
    longitude: '38.7613',
    streetAddress: '',
    city: '',
    state: '',
    height: '',
    width: '',
    propertyTypeId: '',
    plateNumber: '',
    sectionId: '',
    subSectionId: '',
    kontontriyeId: '',
  });

  useEffect(() => {
    // Load property types
    apiClient.get('/propertytypes')
      .then(response => {
        setPropertyTypes(response.data);
      })
      .catch(err => {
        console.error('Failed to load property types:', err);
        setPropertyTypes([]);
      });

    // Load regions
    apiClient.get('/regions')
      .then(response => {
        const activeRegions = response.data.filter((r: any) => r.isActive !== false);
        setRegions(activeRegions);
      })
      .catch(err => console.error('Failed to load regions:', err));

    // Load users for Kontontriye dropdown
    apiClient.get('/users')
      .then(response => {
        const usersData = response.data.data || response.data;
        const activeUsers = usersData.filter((u: any) => u.isActive !== false);
        setUsers(activeUsers);
      })
      .catch(err => console.error('Failed to load users:', err));

    // Load sections
    apiClient.get('/sections')
      .then(response => {
        const activeSections = response.data.filter((s: any) => s.isActive !== false);
        setSections(activeSections);
      })
      .catch(err => console.error('Failed to load sections:', err));

    // If editing, load property data
    if (id) {
      dispatch(fetchPropertyById(id));
      // Load property images
      loadPropertyImages(id);
    }
  }, [id, dispatch]);

  const loadPropertyImages = async (propertyId: string) => {
    try {
      const response = await apiClient.get(`/properties/${propertyId}/images`);
      setPropertyImages(response.data || []);
    } catch (err) {
      console.error('Failed to load property images:', err);
      setPropertyImages([]);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert('Invalid file type. Please upload an image file (JPEG, PNG, GIF, or WebP).');
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size exceeds 10MB limit.');
      return;
    }

    if (!id) {
      // For new properties, add to selected images list
      setSelectedImages(prev => [...prev, file]);
      return;
    }

    // For existing properties, upload immediately
    setUploadingImage(true);
    try {
      await handleImageUploadAfterCreate(id, file);
      await loadPropertyImages(id);
      alert('Image uploaded successfully!');
    } catch (err: any) {
      console.error('Failed to upload image:', err);
      alert(err.response?.data?.message || 'Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
      // Reset file input
      e.target.value = '';
    }
  };

  const handleImageUploadAfterCreate = async (propertyId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post(`/properties/${propertyId}/images`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response;
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!id) return;
    if (!confirm('Are you sure you want to delete this image?')) return;

    try {
      await apiClient.delete(`/properties/${id}/images/${imageId}`);
      await loadPropertyImages(id);
      alert('Image deleted successfully!');
    } catch (err: any) {
      console.error('Failed to delete image:', err);
      alert(err.response?.data?.message || 'Failed to delete image. Please try again.');
    }
  };

  const handleSetPrimaryImage = async (imageId: string) => {
    if (!id) return;

    try {
      await apiClient.put(`/properties/${id}/images/${imageId}/set-primary`);
      await loadPropertyImages(id);
      alert('Primary image updated successfully!');
    } catch (err: any) {
      console.error('Failed to set primary image:', err);
      alert(err.response?.data?.message || 'Failed to set primary image. Please try again.');
    }
  };

  // Load cities when region is selected
  useEffect(() => {
    if (selectedRegionId) {
      apiClient.get(`/cities?regionId=${selectedRegionId}`)
        .then(response => {
          const activeCities = response.data.filter((c: any) => c.isActive !== false);
          setCities(activeCities);
          // Clear city selection when region changes
          setSelectedCityId('');
        })
        .catch(err => console.error('Failed to load cities:', err));
    } else {
      setCities([]);
      setSelectedCityId('');
    }
  }, [selectedRegionId]);

  // Load subsections when section is selected
  useEffect(() => {
    if (selectedSectionId) {
      apiClient.get(`/subsections?sectionId=${selectedSectionId}`)
        .then(response => {
          const activeSubSections = response.data.filter((ss: any) => ss.isActive !== false);
          setSubSections(activeSubSections);
          // Clear subsection selection when section changes
          setSelectedSubSectionId('');
        })
        .catch(err => console.error('Failed to load subsections:', err));
    } else {
      setSubSections([]);
      setSelectedSubSectionId('');
    }
  }, [selectedSectionId]);

  useEffect(() => {
    if (currentProperty && id && propertyTypes.length > 0) {
      const property: any = currentProperty;
      
      // Calculate height and width from areaSize (assume square if not stored separately)
      // In the future, we might want to store height/width separately
      let height = '';
      let width = '';
      if (property.areaSize) {
        // Simple approximation: assume square shape
        const sideLength = Math.sqrt(property.areaSize);
        height = sideLength.toFixed(2);
        width = sideLength.toFixed(2);
      }

      // Get propertyTypeId from various possible sources (prioritize direct propertyTypeId)
      let propertyTypeId = '';
      
      // First try direct propertyTypeId field
      if (property.propertyTypeId) {
        propertyTypeId = String(property.propertyTypeId);
      }
      // Then try PropertyType relationship
      else if (property.PropertyType?.Id) {
        propertyTypeId = String(property.PropertyType.Id);
      }
      else if (property.PropertyType?.id) {
        propertyTypeId = String(property.PropertyType.id);
      }
      
      console.log('Initial propertyTypeId extracted:', propertyTypeId);
      console.log('Available property types:', propertyTypes.map(pt => ({ id: String(pt.id), name: pt.name })));
      
      // Ensure propertyTypeId exists in propertyTypes array and normalize the ID
      if (propertyTypeId && propertyTypes.length > 0) {
        // Normalize IDs for comparison (lowercase, trim)
        const normalizedPropId = propertyTypeId.toLowerCase().trim();
        
        // Try to find exact match (handle both string and GUID formats)
        const foundType = propertyTypes.find(pt => {
          const ptId = String(pt.id).toLowerCase().trim();
          return ptId === normalizedPropId;
        });
        
        if (foundType) {
          // Use the exact ID from propertyTypes array to ensure format matches
          propertyTypeId = String(foundType.id);
          console.log('Found matching property type:', foundType.name, 'with ID:', propertyTypeId);
        } else {
          console.warn('Property type ID not found in property types list:', propertyTypeId);
          console.log('Property propertyTypeId:', property.propertyTypeId);
          console.log('Property PropertyType:', property.PropertyType);
          
          // Try to find by matching PropertyType name as fallback
          if (property.PropertyType?.Name || property.PropertyType?.name) {
            const typeName = property.PropertyType?.Name || property.PropertyType?.name;
            const matchingType = propertyTypes.find(pt => 
              pt.name === typeName || pt.name?.toLowerCase() === typeName?.toLowerCase()
            );
            if (matchingType) {
              propertyTypeId = String(matchingType.id);
              console.log('Found property type by name:', matchingType.name, 'with ID:', propertyTypeId);
            } else {
              console.error('Could not find property type by ID or name');
              propertyTypeId = ''; // Clear if not found
            }
          } else {
            propertyTypeId = ''; // Clear if not found
          }
        }
      } else if (propertyTypeId && propertyTypes.length === 0) {
        // Property types not loaded yet, keep the ID for when they load
        console.log('Property types not loaded yet, keeping propertyTypeId:', propertyTypeId);
      } else if (!propertyTypeId) {
        console.warn('No propertyTypeId found in property data');
      }
      
      console.log('Final propertyTypeId to set:', propertyTypeId);

      setFormData({
        latitude: property.latitude?.toString() || '9.1450',
        longitude: property.longitude?.toString() || '38.7613',
        streetAddress: property.streetAddress || '',
        city: property.city || '',
        state: property.state || '',
        height: height,
        width: width,
        propertyTypeId: propertyTypeId,
        plateNumber: property.plateNumber || '',
        sectionId: property.sectionId || property.SectionId || '',
        subSectionId: property.subSectionId || property.SubSectionId || '',
        kontontriyeId: property.kontontriyeId || property.KontontriyeId || '',
      });

      // Set section and subsection if available
      if (property.Section || property.section) {
        const section = property.Section || property.section;
        const sectionId = section.Id || section.id;
        setSelectedSectionId(sectionId);
        
        // Load subsections for this section
        apiClient.get(`/subsections?sectionId=${sectionId}`)
          .then(response => {
            const activeSubSections = response.data.filter((ss: any) => ss.isActive !== false);
            setSubSections(activeSubSections);
            
            // Set subsection if available
            if (property.SubSection || property.subSection) {
              const subSection = property.SubSection || property.subSection;
              const subSectionId = subSection.Id || subSection.id;
              setSelectedSubSectionId(subSectionId);
            }
          })
          .catch(err => console.error('Failed to load subsections:', err));
      }

      // Set owner and responsible person if available (handle both cases)
      if (property.Owner || property.owner) {
        const owner = property.Owner || property.owner;
        setSelectedOwner({
          id: owner.Id || owner.id,
          name: owner.Name || owner.name,
          phone: owner.Phone || owner.phone,
          email: owner.Email || owner.email,
          address: owner.Address || owner.address,
          idNumber: owner.IdNumber || owner.idNumber,
        });
      }

      if (property.ResponsiblePerson || property.responsiblePerson) {
        const responsible = property.ResponsiblePerson || property.responsiblePerson;
        setSelectedResponsible({
          id: responsible.Id || responsible.id,
          name: responsible.Name || responsible.name,
          phone: responsible.Phone || responsible.phone,
          email: responsible.Email || responsible.email,
          address: responsible.Address || responsible.address,
          idNumber: responsible.IdNumber || responsible.idNumber,
          relationship: responsible.Relationship || responsible.relationship,
        });
      }

      // Use regionId and cityId directly if available
      if (property.regionId || property.RegionId) {
        const regionId = property.regionId || property.RegionId;
        setSelectedRegionId(regionId);
        
        // Load cities for this region
        apiClient.get(`/cities?regionId=${regionId}`)
          .then(response => {
            const activeCities = response.data.filter((c: any) => c.isActive !== false);
            setCities(activeCities);
            
            // Set cityId if available
            if (property.cityId || property.CityId) {
              const cityId = property.cityId || property.CityId;
              setSelectedCityId(cityId);
            } else if (property.CityNavigation?.Id || property.CityNavigation?.id) {
              setSelectedCityId(property.CityNavigation.Id || property.CityNavigation.id);
            }
          })
          .catch(err => console.error('Failed to load cities:', err));
      } else if (property.Region?.Id || property.Region?.id) {
        // Fallback: use Region relationship
        const regionId = property.Region.Id || property.Region.id;
        setSelectedRegionId(regionId);
        
        apiClient.get(`/cities?regionId=${regionId}`)
          .then(response => {
            const activeCities = response.data.filter((c: any) => c.isActive !== false);
            setCities(activeCities);
            
            if (property.cityId || property.CityId) {
              setSelectedCityId(property.cityId || property.CityId);
            }
          })
          .catch(err => console.error('Failed to load cities:', err));
      } else if (property.city) {
        // Last resort: try to find by city name
        apiClient.get('/cities')
          .then(response => {
            const allCities = response.data;
            const matchingCity = allCities.find((c: any) => 
              (c.name || c.Name) === property.city || 
              (c.Name || c.name) === property.city
            );
            if (matchingCity) {
              const cityRegionId = matchingCity.regionId || matchingCity.RegionId;
              setSelectedCityId(matchingCity.id || matchingCity.Id);
              setSelectedRegionId(cityRegionId);
              // Load cities for this region
              apiClient.get(`/cities?regionId=${cityRegionId}`)
                .then(response => {
                  const activeCities = response.data.filter((c: any) => c.isActive !== false);
                  setCities(activeCities);
                })
                .catch(err => console.error('Failed to load cities:', err));
            }
          })
          .catch(err => console.error('Failed to load cities:', err));
      }
    }
  }, [currentProperty, id, propertyTypes]);

  // Search owners in real-time
  useEffect(() => {
    const trimmedQuery = ownerSearchQuery.trim();
    
    // Search immediately if query is not empty (even with 1 character for phone numbers)
    if (trimmedQuery.length > 0) {
      const timeoutId = setTimeout(() => {
        apiClient.get(`/owners/search?query=${encodeURIComponent(trimmedQuery)}`)
          .then(response => {
            setOwnerSearchResults(response.data || []);
            setShowOwnerSearch(true);
          })
          .catch(err => {
            console.error('Failed to search owners:', err);
            setOwnerSearchResults([]);
            setShowOwnerSearch(false);
          });
      }, 200); // Reduced delay for faster real-time search
      return () => clearTimeout(timeoutId);
    } else {
      setOwnerSearchResults([]);
      setShowOwnerSearch(false);
    }
  }, [ownerSearchQuery]);

  // Search responsible persons
  useEffect(() => {
    if (responsibleSearchQuery.trim().length >= 2) {
      const timeoutId = setTimeout(() => {
        apiClient.get(`/responsiblepersons/search?query=${encodeURIComponent(responsibleSearchQuery)}`)
          .then(response => {
            setResponsibleSearchResults(response.data);
            setShowResponsibleSearch(true);
          })
          .catch(err => {
            console.error('Failed to search responsible persons:', err);
            setResponsibleSearchResults([]);
          });
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setResponsibleSearchResults([]);
      setShowResponsibleSearch(false);
    }
  }, [responsibleSearchQuery]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ownerSearchRef.current && !ownerSearchRef.current.contains(event.target as Node)) {
        setShowOwnerSearch(false);
      }
      if (responsibleSearchRef.current && !responsibleSearchRef.current.contains(event.target as Node)) {
        setShowResponsibleSearch(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectOwner = (owner: Owner) => {
    setSelectedOwner(owner);
    setOwnerSearchQuery(owner.name);
    setShowOwnerSearch(false);
    setCreateNewOwner(false);
    setOwnerSearchResults([]);
  };

  const handleSelectResponsible = (responsible: ResponsiblePerson) => {
    setSelectedResponsible(responsible);
    setResponsibleSearchQuery(responsible.name);
    setShowResponsibleSearch(false);
    setCreateNewResponsible(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(clearError());

    if (!formData.propertyTypeId) {
      alert('Please select a property type');
      return;
    }

    if (!formData.height || !formData.width) {
      alert('Please enter height and width');
      return;
    }

    if (!selectedOwner && !createNewOwner && !newOwnerData.name) {
      alert('Please select an existing owner or create a new one');
      return;
    }

    // When creating: region/city sent from current user (hidden fields); coordinates updated on phone (send 0,0).
    // When editing: use selected region/city and form coordinates.
    const isCreate = !id;
    if (isCreate && (!currentUser?.regionId || !currentUser?.cityId)) {
      alert('Your account must have a region and city assigned. Contact your administrator to set them in Users.');
      return;
    }

    const selectedCity = cities.find(c => c.id === selectedCityId);
    const cityName = selectedCity ? selectedCity.name : formData.city;

    // Get selected property type to calculate estimated value
    const selectedPropertyType = propertyTypes.find(pt => pt.id === formData.propertyTypeId);
    const height = parseFloat(formData.height) || 0;
    const width = parseFloat(formData.width) || 0;
    const pricePerUnit = selectedPropertyType?.price || 0;
    const estimatedValue = height * width * pricePerUnit;
    const areaSize = height * width; // Calculate area size

    const propertyData: any = {
      ...formData,
      latitude: isCreate ? 0 : parseFloat(formData.latitude),
      longitude: isCreate ? 0 : parseFloat(formData.longitude),
      city: cityName,
      areaSize: areaSize,
      areaUnit: selectedPropertyType?.unit || 'm',
      estimatedValue: estimatedValue > 0 ? estimatedValue : undefined,
      currency: 'USD', // Always USD by default
      propertyTypeId: formData.propertyTypeId,
      regionId: isCreate ? (currentUser?.regionId || undefined) : (selectedRegionId || undefined),
      cityId: isCreate ? (currentUser?.cityId || undefined) : (selectedCityId || undefined),
      plateNumber: formData.plateNumber.trim() || undefined,
      sectionId: selectedSectionId || undefined,
      subSectionId: selectedSubSectionId || undefined,
      kontontriyeId: formData.kontontriyeId || undefined,
    };

    // Handle owner
    if (selectedOwner) {
      propertyData.ownerId = selectedOwner.id;
    } else if (createNewOwner && newOwnerData.name) {
      propertyData.newOwner = {
        name: newOwnerData.name.trim(),
        phone: newOwnerData.phone.trim() || undefined,
        email: newOwnerData.email.trim() || undefined,
        address: newOwnerData.address.trim() || undefined,
        idNumber: newOwnerData.idNumber.trim() || undefined,
      };
    }

    // Handle responsible person
    if (selectedResponsible) {
      propertyData.responsiblePersonId = selectedResponsible.id;
    } else if (createNewResponsible && newResponsibleData.name) {
      propertyData.newResponsiblePerson = {
        name: newResponsibleData.name.trim(),
        phone: newResponsibleData.phone.trim() || undefined,
        email: newResponsibleData.email.trim() || undefined,
        address: newResponsibleData.address.trim() || undefined,
        idNumber: newResponsibleData.idNumber.trim() || undefined,
        relationship: newResponsibleData.relationship.trim() || undefined,
      };
    }

    try {
      let createdPropertyId: string | undefined;
      if (id) {
        await dispatch(updateProperty({ id, data: propertyData })).unwrap();
        createdPropertyId = id;
      } else {
        const result = await dispatch(createProperty(propertyData)).unwrap();
        createdPropertyId = result?.id || result?.Id;
      }

      // Upload selected images if property was created/updated
      if (createdPropertyId && selectedImages.length > 0) {
        setUploadingImage(true);
        try {
          for (const imageFile of selectedImages) {
            await handleImageUploadAfterCreate(createdPropertyId, imageFile);
          }
          setSelectedImages([]); // Clear selected images after upload
        } catch (err: any) {
          console.error('Failed to upload images:', err);
          alert('Property created but some images failed to upload. You can add them later.');
        } finally {
          setUploadingImage(false);
        }
      }
      
      navigate('/properties');
    } catch (err) {
      console.error('Failed to save property:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {id ? 'Edit Property' : 'Register New Property'}
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            {id ? 'Update property information' : 'Fill in the details to register a new property'}
          </p>
        </div>
        <button
          onClick={() => navigate('/properties')}
          className="btn-secondary px-4 py-2"
        >
          <XMarkIcon className="h-5 w-5 mr-2" />
          Cancel
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-danger-50 border border-danger-200 p-4">
          <p className="text-sm font-medium text-danger-800">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Hidden region/city from current user — sent with property data on create */}
        {!id && currentUser?.regionId && (
          <input type="hidden" name="regionId" value={currentUser.regionId} readOnly aria-hidden />
        )}
        {!id && currentUser?.cityId && (
          <input type="hidden" name="cityId" value={currentUser.cityId} readOnly aria-hidden />
        )}
        {/* Property Type Section */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <HomeIcon className="h-5 w-5 mr-2 text-primary-600" />
              Property Type *
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Select the property type. This determines the permit price.
            </p>
          </div>
          <div className="card-body">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Property Type *
              </label>
              <select
                required
                className="input py-2.5"
                value={formData.propertyTypeId}
                onChange={(e) => setFormData(prev => ({ ...prev, propertyTypeId: e.target.value }))}
              >
                <option value="">Select a property type</option>
                {propertyTypes.map(type => (
                  <option key={type.id} value={type.id}>
                    {type.name} - ${type.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / {type.unit}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Coordinates are hidden; they will be updated on the phone */}

        {/* Address Section */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <HomeIcon className="h-5 w-5 mr-2 text-primary-600" />
              Address Information
            </h3>
          </div>
          <div className="card-body space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Street Address *
              </label>
              <input
                type="text"
                required
                className="input py-2.5"
                placeholder="123 Main Street"
                value={formData.streetAddress}
                onChange={(e) => setFormData(prev => ({ ...prev, streetAddress: e.target.value }))}
              />
            </div>
            {/* Region and City: only shown when editing; when creating they are taken from the current user */}
            {id && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Region *
                  </label>
                  <select
                    required
                    className="input py-2.5"
                    value={selectedRegionId}
                    onChange={(e) => {
                      setSelectedRegionId(e.target.value);
                      setSelectedCityId(''); // Clear city when region changes
                    }}
                  >
                    <option value="">Select a region</option>
                    {regions.map(region => (
                      <option key={region.id} value={region.id}>
                        {region.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City *
                  </label>
                  <select
                    required
                    className="input py-2.5"
                    value={selectedCityId}
                    onChange={(e) => {
                      setSelectedCityId(e.target.value);
                      const city = cities.find(c => c.id === e.target.value);
                      if (city) {
                        setFormData(prev => ({ ...prev, city: city.name }));
                      }
                    }}
                    disabled={!selectedRegionId || cities.length === 0}
                  >
                    <option value="">
                      {!selectedRegionId ? 'Select a region first' : cities.length === 0 ? 'No cities available' : 'Select a city'}
                    </option>
                    {cities.map(city => (
                      <option key={city.id} value={city.id}>
                        {city.name}
                      </option>
                    ))}
                  </select>
                  {selectedRegionId && cities.length === 0 && (
                    <p className="mt-1 text-xs text-gray-500">No cities found for this region</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Owner or Responsible Person (at least one required) */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <UserIcon className="h-5 w-5 mr-2 text-primary-600" />
              Owner or Responsible Person *
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Provide either an owner or a responsible person for the property (at least one required).
            </p>
          </div>
          <div className="card-body space-y-4">
            {selectedOwner && !createNewOwner ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-green-900">{selectedOwner.name}</p>
                    {selectedOwner.phone && <p className="text-sm text-green-700">{selectedOwner.phone}</p>}
                    {selectedOwner.email && <p className="text-sm text-green-700">{selectedOwner.email}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedOwner(null);
                      setOwnerSearchQuery('');
                    }}
                    className="text-sm text-green-700 hover:text-green-900"
                  >
                    Change
                  </button>
                </div>
              </div>
            ) : createNewOwner ? (
              <div className="space-y-4 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">Create New Owner</h4>
                  <button
                    type="button"
                    onClick={() => {
                      setCreateNewOwner(false);
                      setNewOwnerData({ name: '', phone: '', email: '', address: '', idNumber: '' });
                    }}
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    Cancel
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    required
                    className="input py-2.5"
                    placeholder="John Doe"
                    value={newOwnerData.name}
                    onChange={(e) => setNewOwnerData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone
                    </label>
                    <input
                      type="tel"
                      className="input py-2.5"
                      placeholder="+251 911 234 567"
                      value={newOwnerData.phone}
                      onChange={(e) => setNewOwnerData(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      className="input py-2.5"
                      placeholder="owner@example.com"
                      value={newOwnerData.email}
                      onChange={(e) => setNewOwnerData(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Address
                    </label>
                    <input
                      type="text"
                      className="input py-2.5"
                      placeholder="Address"
                      value={newOwnerData.address}
                      onChange={(e) => setNewOwnerData(prev => ({ ...prev, address: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ID Number
                    </label>
                    <input
                      type="text"
                      className="input py-2.5"
                      placeholder="National ID or Tax ID"
                      value={newOwnerData.idNumber}
                      onChange={(e) => setNewOwnerData(prev => ({ ...prev, idNumber: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative" ref={ownerSearchRef}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Owner (by name or phone) *
                </label>
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    className="input py-2.5 pl-10 pr-10"
                    placeholder="Type name or phone number to search..."
                    value={ownerSearchQuery}
                    onChange={(e) => {
                      setOwnerSearchQuery(e.target.value);
                      if (selectedOwner) {
                        setSelectedOwner(null);
                      }
                    }}
                    onFocus={() => {
                      if (ownerSearchQuery.trim().length > 0 && ownerSearchResults.length > 0) {
                        setShowOwnerSearch(true);
                      }
                    }}
                    autoComplete="off"
                  />
                  {ownerSearchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setOwnerSearchQuery('');
                        setShowOwnerSearch(false);
                        setOwnerSearchResults([]);
                        setSelectedOwner(null);
                      }}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  )}
                </div>
                
                {/* Search Results Dropdown */}
                {showOwnerSearch && ownerSearchQuery.trim().length > 0 && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {ownerSearchResults.length > 0 ? (
                      <>
                        {ownerSearchResults.map((owner) => (
                          <button
                            key={owner.id}
                            type="button"
                            onClick={() => handleSelectOwner(owner)}
                            className="w-full text-left px-4 py-3 hover:bg-primary-50 hover:border-l-4 hover:border-l-primary-600 transition-all border-b border-gray-100 last:border-b-0"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">{owner.name}</p>
                                <div className="mt-1 space-y-0.5">
                                  {owner.phone && (
                                    <p className="text-sm text-gray-600 flex items-center">
                                      <span className="font-medium mr-2">Phone:</span>
                                      {owner.phone}
                                    </p>
                                  )}
                                  {owner.email && (
                                    <p className="text-sm text-gray-600 flex items-center">
                                      <span className="font-medium mr-2">Email:</span>
                                      {owner.email}
                                    </p>
                                  )}
                                  {owner.address && (
                                    <p className="text-xs text-gray-500">{owner.address}</p>
                                  )}
                                </div>
                              </div>
                              <div className="ml-4 flex-shrink-0">
                                <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
                                  Select
                                </span>
                              </div>
                            </div>
                          </button>
                        ))}
                      </>
                    ) : (
                      <div className="px-4 py-6 text-center">
                        <p className="text-sm text-gray-500">No owners found</p>
                        <p className="text-xs text-gray-400 mt-1">Try a different search term</p>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Create New Owner Button */}
                <button
                  type="button"
                  onClick={() => {
                    setCreateNewOwner(true);
                    setShowOwnerSearch(false);
                    setOwnerSearchQuery('');
                  }}
                  className="mt-3 flex items-center text-sm text-primary-600 hover:text-primary-700 transition-colors"
                >
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Create New Owner
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Responsible Person Information */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <UserIcon className="h-5 w-5 mr-2 text-primary-600" />
              Responsible Person (Optional)
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Search for an existing responsible person or create a new one.
            </p>
          </div>
          <div className="card-body space-y-4">
            {selectedResponsible && !createNewResponsible ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-green-900">{selectedResponsible.name}</p>
                    {selectedResponsible.phone && <p className="text-sm text-green-700">{selectedResponsible.phone}</p>}
                    {selectedResponsible.email && <p className="text-sm text-green-700">{selectedResponsible.email}</p>}
                    {selectedResponsible.relationship && <p className="text-sm text-green-700">Relationship: {selectedResponsible.relationship}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedResponsible(null);
                      setResponsibleSearchQuery('');
                    }}
                    className="text-sm text-green-700 hover:text-green-900"
                  >
                    Change
                  </button>
                </div>
              </div>
            ) : createNewResponsible ? (
              <div className="space-y-4 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">Create New Responsible Person</h4>
                  <button
                    type="button"
                    onClick={() => {
                      setCreateNewResponsible(false);
                      setNewResponsibleData({ name: '', phone: '', email: '', address: '', idNumber: '', relationship: '' });
                    }}
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    Cancel
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    required
                    className="input py-2.5"
                    placeholder="Jane Doe"
                    value={newResponsibleData.name}
                    onChange={(e) => setNewResponsibleData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone
                    </label>
                    <input
                      type="tel"
                      className="input py-2.5"
                      placeholder="+251 911 234 567"
                      value={newResponsibleData.phone}
                      onChange={(e) => setNewResponsibleData(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      className="input py-2.5"
                      placeholder="responsible@example.com"
                      value={newResponsibleData.email}
                      onChange={(e) => setNewResponsibleData(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Relationship
                    </label>
                    <input
                      type="text"
                      className="input py-2.5"
                      placeholder="Agent, Manager, Relative, etc."
                      value={newResponsibleData.relationship}
                      onChange={(e) => setNewResponsibleData(prev => ({ ...prev, relationship: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ID Number
                    </label>
                    <input
                      type="text"
                      className="input py-2.5"
                      placeholder="National ID or Tax ID"
                      value={newResponsibleData.idNumber}
                      onChange={(e) => setNewResponsibleData(prev => ({ ...prev, idNumber: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address
                  </label>
                  <input
                    type="text"
                    className="input py-2.5"
                    placeholder="Address"
                    value={newResponsibleData.address}
                    onChange={(e) => setNewResponsibleData(prev => ({ ...prev, address: e.target.value }))}
                  />
                </div>
              </div>
            ) : (
              <div className="relative" ref={responsibleSearchRef}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Responsible Person (by name or phone)
                </label>
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    className="input py-2.5 pl-10 pr-10"
                    placeholder="Search by name or phone..."
                    value={responsibleSearchQuery}
                    onChange={(e) => setResponsibleSearchQuery(e.target.value)}
                    onFocus={() => responsibleSearchQuery.length >= 2 && setShowResponsibleSearch(true)}
                  />
                  {responsibleSearchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setResponsibleSearchQuery('');
                        setShowResponsibleSearch(false);
                        setResponsibleSearchResults([]);
                      }}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  )}
                </div>
                {showResponsibleSearch && responsibleSearchResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {responsibleSearchResults.map((responsible) => (
                      <button
                        key={responsible.id}
                        type="button"
                        onClick={() => handleSelectResponsible(responsible)}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                      >
                        <p className="font-medium text-gray-900">{responsible.name}</p>
                        {responsible.phone && <p className="text-sm text-gray-600">{responsible.phone}</p>}
                        {responsible.email && <p className="text-sm text-gray-600">{responsible.email}</p>}
                        {responsible.relationship && <p className="text-sm text-gray-500">Relationship: {responsible.relationship}</p>}
                      </button>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setCreateNewResponsible(true)}
                  className="mt-3 flex items-center text-sm text-primary-600 hover:text-primary-700"
                >
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Create New Responsible Person
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Property Details */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <DocumentTextIcon className="h-5 w-5 mr-2 text-primary-600" />
              Property Details
            </h3>
          </div>
          <div className="card-body space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Height *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    className="input py-2.5 pr-16"
                    placeholder="0.00"
                    value={formData.height}
                    onChange={(e) => setFormData(prev => ({ ...prev, height: e.target.value }))}
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">
                    {formData.propertyTypeId ? propertyTypes.find(pt => pt.id === formData.propertyTypeId)?.unit || 'm' : 'm'}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Width *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    className="input py-2.5 pr-16"
                    placeholder="0.00"
                    value={formData.width}
                    onChange={(e) => setFormData(prev => ({ ...prev, width: e.target.value }))}
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">
                    {formData.propertyTypeId ? propertyTypes.find(pt => pt.id === formData.propertyTypeId)?.unit || 'm' : 'm'}
                  </span>
                </div>
              </div>
            </div>
            
            {formData.propertyTypeId && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Property Type Price
                    </label>
                    <p className="text-sm font-semibold text-gray-900">
                      ${propertyTypes.find(pt => pt.id === formData.propertyTypeId)?.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'} / {propertyTypes.find(pt => pt.id === formData.propertyTypeId)?.unit || 'm'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Area (Height × Width)
                    </label>
                    <p className="text-sm font-semibold text-gray-900">
                      {(() => {
                        const h = parseFloat(formData.height) || 0;
                        const w = parseFloat(formData.width) || 0;
                        return (h * w).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                      })()} {propertyTypes.find(pt => pt.id === formData.propertyTypeId)?.unit || 'm'}²
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Estimated Value (USD)
                    </label>
                    <p className="text-sm font-semibold text-primary-600">
                      ${(() => {
                        const h = parseFloat(formData.height) || 0;
                        const w = parseFloat(formData.width) || 0;
                        const price = propertyTypes.find(pt => pt.id === formData.propertyTypeId)?.price || 0;
                        return (h * w * price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                      })()}
                    </p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Estimated Value = Height × Width × Property Type Price
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Additional Property Information */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <DocumentTextIcon className="h-5 w-5 mr-2 text-primary-600" />
              Additional Information
            </h3>
          </div>
          <div className="card-body space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Plate Number
                </label>
                <input
                  type="text"
                  className="input py-2.5"
                  placeholder="ABC-123"
                  value={formData.plateNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, plateNumber: e.target.value }))}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Must be unique
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Section
                </label>
                <select
                  className="input py-2.5"
                  value={selectedSectionId}
                  onChange={(e) => {
                    setSelectedSectionId(e.target.value);
                    setSelectedSubSectionId(''); // Clear subsection when section changes
                  }}
                >
                  <option value="">Select a section (optional)</option>
                  {sections.map(section => (
                    <option key={section.id} value={section.id}>
                      {section.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sub Section
                </label>
                <select
                  className="input py-2.5"
                  value={selectedSubSectionId}
                  onChange={(e) => setSelectedSubSectionId(e.target.value)}
                  disabled={!selectedSectionId || subSections.length === 0}
                >
                  <option value="">
                    {!selectedSectionId ? 'Select a section first' : subSections.length === 0 ? 'No subsections available' : 'Select a subsection (optional)'}
                  </option>
                  {subSections.map(subSection => (
                    <option key={subSection.id} value={subSection.id}>
                      {subSection.name}
                    </option>
                  ))}
                </select>
                {selectedSectionId && subSections.length === 0 && (
                  <p className="mt-1 text-xs text-gray-500">No subsections found for this section</p>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kontontriye (Responsible User for Fee Collection)
              </label>
              <select
                className="input py-2.5"
                value={formData.kontontriyeId}
                onChange={(e) => setFormData(prev => ({ ...prev, kontontriyeId: e.target.value }))}
              >
                <option value="">Select a user (optional)</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName} ({user.email})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Select the user responsible for collecting fees for this property
              </p>
            </div>
          </div>
        </div>

        {/* Property Images Section */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <DocumentTextIcon className="h-5 w-5 mr-2 text-primary-600" />
              Property Images
            </h3>
          </div>
          <div className="card-body space-y-4">
            {/* Upload Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {id ? 'Upload Image' : 'Select Images (will be uploaded after saving)'}
              </label>
              <div className="flex items-center space-x-4">
                <label className="flex-1 cursor-pointer">
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                    className="hidden"
                  />
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-500 transition-colors">
                    <PlusIcon className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">
                      {uploadingImage ? 'Uploading...' : 'Click to upload or drag and drop'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      PNG, JPG, GIF, WebP up to 10MB
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Selected Images (for new properties) */}
            {!id && selectedImages.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  Selected Images ({selectedImages.length})
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {selectedImages.map((file, index) => (
                    <div
                      key={index}
                      className="relative group border border-gray-200 rounded-lg overflow-hidden"
                    >
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className="w-full h-48 object-cover"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <button
                          onClick={() => setSelectedImages(prev => prev.filter((_, i) => i !== index))}
                          className="bg-red-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-red-700"
                          title="Remove image"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Uploaded Images Grid (for existing properties) */}
            {id && propertyImages.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  Uploaded Images ({propertyImages.length})
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {propertyImages.map((image) => (
                    <div
                      key={image.id}
                      className="relative group border border-gray-200 rounded-lg overflow-hidden"
                    >
                      <img
                        src={image.fileUrl}
                        alt={image.originalFileName}
                        className="w-full h-48 object-cover"
                      />
                      {image.isPrimary && (
                        <div className="absolute top-2 left-2 bg-primary-600 text-white text-xs px-2 py-1 rounded">
                          Primary
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <div className="flex space-x-2">
                          {!image.isPrimary && (
                            <button
                              onClick={() => handleSetPrimaryImage(image.id)}
                              className="bg-white text-gray-900 px-3 py-1 rounded text-sm font-medium hover:bg-gray-100"
                              title="Set as primary"
                            >
                              Set Primary
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteImage(image.id)}
                            className="bg-red-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-red-700"
                            title="Delete image"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {id && propertyImages.length === 0 && !uploadingImage && (
              <p className="text-sm text-gray-500 text-center py-4">
                No images uploaded yet. Upload images to display them here.
              </p>
            )}

            {!id && selectedImages.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">
                No images selected. Select images to upload after creating the property.
              </p>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/properties')}
            className="btn-secondary px-6 py-3"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading || !formData.propertyTypeId || !formData.height || !formData.width || (id ? (!selectedRegionId || !selectedCityId) : false) || (!(selectedOwner || createNewOwner || newOwnerData.name) && !(selectedResponsible || createNewResponsible || newResponsibleData.name))}
            className="btn-primary px-6 py-3"
          >
            {isLoading ? 'Saving...' : id ? 'Update Property' : 'Register Property'}
          </button>
        </div>
      </form>
    </div>
  );
}
