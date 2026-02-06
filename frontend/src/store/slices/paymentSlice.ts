import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import apiClient from '../../config/api';

export interface Payment {
  id: string;
  propertyId: string;
  property?: {
    id: string;
    streetAddress: string;
    city: string;
    propertyType?: { id: string; name: string; price?: number; unit?: string; };
    owner?: { id: string; name: string; phone?: string; email?: string; address?: string; };
  };
  amount: number;
  currency: string;
  transactionReference: string;
  externalReference?: string;
  notes?: string;
  discountAmount?: number;
  discountReason?: string;
  isExempt: boolean;
  exemptionReason?: string;
  paymentDate: string;
  completedAt?: string;
  appointmentDate?: string;
  AppointmentDate?: string;
  appointmentNotes?: string;
  AppointmentNotes?: string;
  createdBy?: { id: string; firstName: string; lastName: string; email?: string; };
  collector?: { id: string; firstName: string; lastName: string; email?: string; };
  collectorId?: string;
  paymentMethod?: { id: string; name: string; code?: string; };
  paymentMethodId?: string;
  status?: { id: string; name: string; colorCode?: string; };
  statusId?: string;
  paymentMetadata?: any;
  createdAt: string;
  updatedAt: string;
}

interface PaymentState {
  payments: Payment[];
  currentPayment: Payment | null;
  isLoading: boolean;
  error: string | null;
  filters: {
    propertyId?: string;
    collectorId?: string;
    statusId?: string;
    isExempt?: boolean;
  };
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}

const initialState: PaymentState = {
  payments: [],
  currentPayment: null,
  isLoading: false,
  error: null,
  filters: {},
  pagination: {
    page: 1,
    pageSize: 20,
    totalCount: 0,
    totalPages: 0,
  },
};

// Async thunks
export const fetchPayments = createAsyncThunk(
  'payment/fetchPayments',
  async (params: {
    page?: number;
    pageSize?: number;
    propertyId?: string;
    collectorId?: string;
    statusId?: string;
    isExempt?: boolean;
    startDate?: string;
    endDate?: string;
  } = {}, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams();
      if (params.page != null) queryParams.append('page', params.page.toString());
      if (params.pageSize != null) queryParams.append('pageSize', params.pageSize.toString());
      if (params.propertyId) queryParams.append('propertyId', params.propertyId);
      if (params.collectorId) queryParams.append('collectorId', params.collectorId);
      if (params.statusId) queryParams.append('statusId', params.statusId);
      if (params.isExempt !== undefined) queryParams.append('isExempt', params.isExempt.toString());
      if (params.startDate) queryParams.append('startDate', params.startDate);
      if (params.endDate) queryParams.append('endDate', params.endDate);

      const response = await apiClient.get(`/payments?${queryParams.toString()}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch payments');
    }
  }
);

export const fetchPaymentById = createAsyncThunk(
  'payment/fetchPaymentById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(`/payments/${id}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch payment');
    }
  }
);

export const fetchPaymentsByProperty = createAsyncThunk(
  'payment/fetchPaymentsByProperty',
  async (propertyId: string, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(`/payments/property/${propertyId}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch payments');
    }
  }
);

export const updatePayment = createAsyncThunk(
  'payment/updatePayment',
  async ({ id, data }: { id: string; data: Partial<Payment> }, { rejectWithValue }) => {
    try {
      const response = await apiClient.put(`/payments/${id}`, data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update payment');
    }
  }
);

export const fetchPaymentStatuses = createAsyncThunk(
  'payment/fetchPaymentStatuses',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/payments/statuses');
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch payment statuses');
    }
  }
);

export const fetchPaymentMethods = createAsyncThunk(
  'payment/fetchPaymentMethods',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/payments/methods');
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch payment methods');
    }
  }
);

const paymentSlice = createSlice({
  name: 'payment',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<PaymentState['filters']>) => {
      state.filters = action.payload;
    },
    clearCurrentPayment: (state) => {
      state.currentPayment = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch payments
      .addCase(fetchPayments.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPayments.fulfilled, (state, action) => {
        state.isLoading = false;
        state.payments = action.payload.data || [];
        state.pagination = {
          page: action.payload.page || 1,
          pageSize: action.payload.pageSize || 20,
          totalCount: action.payload.totalCount || 0,
          totalPages: action.payload.totalPages || 0,
        };
      })
      .addCase(fetchPayments.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch payment by ID
      .addCase(fetchPaymentById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPaymentById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentPayment = action.payload;
      })
      .addCase(fetchPaymentById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch payments by property
      .addCase(fetchPaymentsByProperty.fulfilled, (state, action) => {
        state.payments = action.payload || [];
      })
      // Update payment
      .addCase(updatePayment.fulfilled, (state, action) => {
        const index = state.payments.findIndex(p => p.id === action.payload.id);
        if (index !== -1) {
          state.payments[index] = action.payload;
        }
        if (state.currentPayment?.id === action.payload.id) {
          state.currentPayment = action.payload;
        }
      });
  },
});

export const { setFilters, clearCurrentPayment, clearError } = paymentSlice.actions;
export default paymentSlice.reducer;
