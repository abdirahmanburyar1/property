import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import apiClient from '../../config/api';

export interface Property {
  id: string;
  latitude: number;
  longitude: number;
  streetAddress: string;
  city: string;
  state?: string;
  postalCode?: string;
  country?: string;
  ownerName: string;
  ownerPhone?: string;
  ownerEmail?: string;
  areaSize: number;
  areaUnit: string;
  estimatedValue?: number;
  currency: string;
  description?: string;
  propertyTypeId?: string;
  statusId?: string;
  collectorId?: string;
  paidAmount?: number;
  paymentStatus?: 'Pending' | 'Paid' | 'Paid_partially' | 'Exemption';
  createdAt: string;
  updatedAt: string;
  // Nested relationships (for display)
  PropertyType?: { Id?: string; id?: string; Name?: string; name?: string; Price?: number; Unit?: string; };
  Status?: { Id?: string; id?: string; Name?: string; name?: string; ColorCode?: string; };
  Owner?: { Id?: string; id?: string; Name?: string; name?: string; Phone?: string; phone?: string; Email?: string; email?: string; Address?: string; address?: string; IdNumber?: string; idNumber?: string; };
  ResponsiblePerson?: { Id?: string; id?: string; Name?: string; name?: string; Phone?: string; phone?: string; Email?: string; email?: string; Address?: string; address?: string; IdNumber?: string; idNumber?: string; Relationship?: string; relationship?: string; };
  Region?: { Id?: string; id?: string; Name?: string; name?: string; };
  CityNavigation?: { Id?: string; id?: string; Name?: string; name?: string; };
}

interface PropertyState {
  properties: Property[];
  currentProperty: Property | null;
  isLoading: boolean;
  error: string | null;
  filters: {
    city?: string;
    statusId?: string;
    propertyTypeId?: string;
  };
}

const initialState: PropertyState = {
  properties: [],
  currentProperty: null,
  isLoading: false,
  error: null,
  filters: {},
};

// Async thunks
export const fetchProperties = createAsyncThunk(
  'property/fetchProperties',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/properties');
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch properties');
    }
  }
);

export const fetchPropertyById = createAsyncThunk(
  'property/fetchPropertyById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(`/properties/${id}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch property');
    }
  }
);

export const createProperty = createAsyncThunk(
  'property/createProperty',
  async (propertyData: Partial<Property>, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/properties', propertyData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create property');
    }
  }
);

export const updateProperty = createAsyncThunk(
  'property/updateProperty',
  async ({ id, data }: { id: string; data: Partial<Property> }, { rejectWithValue }) => {
    try {
      const response = await apiClient.put(`/properties/${id}`, data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update property');
    }
  }
);

export const deleteProperty = createAsyncThunk(
  'property/deleteProperty',
  async (id: string, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/properties/${id}`);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete property');
    }
  }
);

const propertySlice = createSlice({
  name: 'property',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<PropertyState['filters']>) => {
      state.filters = action.payload;
    },
    clearCurrentProperty: (state) => {
      state.currentProperty = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch properties
      .addCase(fetchProperties.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchProperties.fulfilled, (state, action) => {
        state.isLoading = false;
        // Handle both paginated response (with data property) and array response
        state.properties = action.payload.data || (Array.isArray(action.payload) ? action.payload : []);
      })
      .addCase(fetchProperties.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch property by ID
      .addCase(fetchPropertyById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPropertyById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentProperty = action.payload;
      })
      .addCase(fetchPropertyById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Create property
      .addCase(createProperty.fulfilled, (state, action) => {
        state.properties.push(action.payload);
      })
      // Update property
      .addCase(updateProperty.fulfilled, (state, action) => {
        const index = state.properties.findIndex(p => p.id === action.payload.id);
        if (index !== -1) {
          state.properties[index] = action.payload;
        }
        if (state.currentProperty?.id === action.payload.id) {
          state.currentProperty = action.payload;
        }
      })
      // Delete property
      .addCase(deleteProperty.fulfilled, (state, action) => {
        state.properties = state.properties.filter(p => p.id !== action.payload);
        if (state.currentProperty?.id === action.payload) {
          state.currentProperty = null;
        }
      });
  },
});

export const { setFilters, clearCurrentProperty, clearError } = propertySlice.actions;
export default propertySlice.reducer;
