import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchPaymentById, updatePayment, fetchPaymentStatuses, fetchPaymentMethods, clearError } from '../store/slices/paymentSlice';
import Swal from 'sweetalert2';
import {
  CurrencyDollarIcon,
  ArrowLeftIcon,
  UserIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  PencilIcon,
  DocumentTextIcon,
  ReceiptPercentIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  CreditCardIcon,
  BuildingOfficeIcon,
  IdentificationIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import {
  CheckCircleIcon as CheckCircleIconSolid,
} from '@heroicons/react/24/solid';
import apiClient from '../config/api';
import Receipt from '../components/Receipt';

export default function PaymentDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { currentPayment, isLoading, error } = useAppSelector((state) => state.payment);
  const [paymentStatuses, setPaymentStatuses] = useState<any[]>([]);
  const [, setPaymentMethods] = useState<any[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [propertyPaymentInfo, setPropertyPaymentInfo] = useState<any>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentAmountError, setPaymentAmountError] = useState('');
  const [paymentAmountInfo, setPaymentAmountInfo] = useState('');
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountModalAmount, setDiscountModalAmount] = useState('');
  const [discountModalReason, setDiscountModalReason] = useState('');
  const [showExemptionModal, setShowExemptionModal] = useState(false);
  const [exemptionModalReason, setExemptionModalReason] = useState('');
  const [editForm, setEditForm] = useState({
    statusId: '',
    collectorId: '',
    discountAmount: '',
    discountReason: '',
    isExempt: false,
    exemptionReason: '',
    notes: '',
  });

  useEffect(() => {
    if (id) {
      dispatch(clearError());
      dispatch(fetchPaymentById(id));
    }
  }, [id, dispatch]);

  useEffect(() => {
    if (currentPayment) {
      const propertyId = currentPayment.propertyId ||
                        getNestedProperty(currentPayment, 'Property', 'property')?.id;
      
      if (propertyId) {
        console.log('Loading payment history for property:', propertyId);
        loadPaymentHistory(propertyId);
        loadPropertyPaymentInfo(propertyId);
      } else {
        console.warn('No propertyId found in payment:', currentPayment);
      }
    }
  }, [currentPayment]);

  const loadPaymentHistory = async (propertyId: string) => {
    setIsLoadingHistory(true);
    try {
      // Use the correct API endpoint format: /paymentdetails/property/{propertyId}
      const res = await apiClient.get(`/paymentdetails/property/${propertyId}`);
      setPaymentHistory(res.data || []);
      console.log('Payment history loaded:', res.data);
    } catch (error) {
      console.error('Failed to load payment history:', error);
      setPaymentHistory([]); // Set empty array on error
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const loadPropertyPaymentInfo = async (propertyId: string) => {
    try {
      const response = await apiClient.get(`/properties/${propertyId}`);
      setPropertyPaymentInfo(response.data);
    } catch (error) {
      console.error('Failed to load property payment info:', error);
    }
  };

  useEffect(() => {
    dispatch(fetchPaymentStatuses()).then((result: any) => {
      if (result.payload) {
        setPaymentStatuses(result.payload);
      }
    });
    dispatch(fetchPaymentMethods()).then((result: any) => {
      if (result.payload) {
        setPaymentMethods(result.payload);
      }
    });
  }, [dispatch]);

  useEffect(() => {
    const loadCollectors = async () => {
      try {
        await apiClient.get('/users?role=COLLECTOR');
        // Store collectors for dropdown when needed
      } catch (error) {
        console.error('Failed to load collectors:', error);
      }
    };
    loadCollectors();
  }, []);

  useEffect(() => {
    if (currentPayment) {
      setEditForm({
        statusId: currentPayment.statusId || '',
        collectorId: currentPayment.collectorId || '',
        discountAmount: currentPayment.discountAmount != null ? String(currentPayment.discountAmount) : '',
        discountReason: currentPayment.discountReason || '',
        isExempt: currentPayment.isExempt || false,
        exemptionReason: currentPayment.exemptionReason || '',
        notes: currentPayment.notes || '',
      });
    }
  }, [currentPayment]);

  const handleUpdatePayment = async () => {
    if (!currentPayment || !editForm.statusId) return;

    setIsUpdating(true);
    try {
      await dispatch(updatePayment({
        id: currentPayment.id,
        data: {
          statusId: editForm.statusId,
          collectorId: editForm.collectorId,
          discountAmount: editForm.discountAmount ? parseFloat(editForm.discountAmount) : undefined,
          discountReason: editForm.discountReason || undefined,
          isExempt: editForm.isExempt,
          exemptionReason: editForm.exemptionReason,
          notes: editForm.notes,
        },
      })).unwrap();
      setShowEditModal(false);
      
      await Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: 'Payment updated successfully!',
        confirmButtonColor: '#10b981',
        timer: 3000,
        showConfirmButton: true,
      });
    } catch (error: any) {
      console.error('Update error:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Update Failed',
        text: error.message || 'Failed to update payment',
        confirmButtonColor: '#dc2626',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getNestedProperty = (obj: any, ...keys: string[]) => {
    for (const key of keys) {
      if (obj && (obj[key] !== undefined && obj[key] !== null)) {
        return obj[key];
      }
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Loading payment details...</p>
        </div>
      </div>
    );
  }

  if (error || !currentPayment) {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Not Found</h2>
        <p className="text-gray-600 mb-6">{error || 'The payment you are looking for does not exist.'}</p>
        <button onClick={() => navigate('/payments')} className="btn-primary transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-md hover:shadow-lg">
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Back to Payments
        </button>
      </div>
    );
  }

  const payment = currentPayment;
  const statusObj = getNestedProperty(payment, 'Status', 'status');
  const statusName = statusObj?.Name || statusObj?.name || (typeof statusObj === 'string' ? statusObj : 'Pending');
  const statusColor = paymentStatuses.find((s: any) => s.name?.toLowerCase() === statusName?.toLowerCase())?.colorCode || '#9E9E9E';

  const handlePay = () => {
    if (!payment || !propertyPaymentInfo) return;
    const expected = (propertyPaymentInfo.propertyType?.price || 0) * (propertyPaymentInfo.areaSize || 0);
    const paid = propertyPaymentInfo.paidAmount || 0;
    const remaining = expected - paid;
    const discount = Number(payment.discountAmount) || 0;
    const effective = Math.max(0, remaining - discount);
    setPaymentAmount(effective.toFixed(2));
    setPaymentAmountError('');
    setPaymentAmountInfo('');
    setShowPaymentModal(true);
  };

  const handlePaymentSubmit = async () => {
    if (!payment || !propertyPaymentInfo) return;
    const expectedAmount = (propertyPaymentInfo.propertyType?.price || 0) * (propertyPaymentInfo.areaSize || 0);
    const paidAmount = propertyPaymentInfo.paidAmount || 0;
    const remainingAmount = expectedAmount - paidAmount;
    const discountApplied = Number(payment.discountAmount) || 0;
    const effectiveRemainingForSubmit = Math.max(0, remainingAmount - discountApplied);

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      setPaymentAmountError('Please enter a valid amount greater than 0');
      return;
    }
    const finalAmount = Math.min(amount, effectiveRemainingForSubmit);
    if (finalAmount <= 0) {
      setPaymentAmountError('No remaining balance to collect');
      return;
    }

    setIsUpdating(true);
    try {
      const propertyId = payment.propertyId || getNestedProperty(payment, 'Property', 'property')?.id;
      const methodsResponse = await apiClient.get('/paymentmethods');
      let paymentMethodId = null;
      if (methodsResponse.data && Array.isArray(methodsResponse.data)) {
        const mobileMoney = methodsResponse.data.find(
          (m: any) => m.code === 'MOBILE_MONEY' || m.name?.toLowerCase().includes('mobile')
        );
        paymentMethodId = mobileMoney?.id || (methodsResponse.data.length > 0 ? methodsResponse.data[0].id : null);
      }
      if (!paymentMethodId) throw new Error('No payment method found');

      await apiClient.post('/paymentdetails', {
        propertyId: propertyId,
        paymentId: payment.id,
        paymentMethodId: paymentMethodId,
        amount: finalAmount,
        currency: payment.currency || 'USD',
        paymentDate: new Date().toISOString(),
      });

      if (propertyId) {
        await loadPaymentHistory(propertyId);
        await loadPropertyPaymentInfo(propertyId);
      }
      await dispatch(fetchPaymentById(id!));

      const updatedPropertyInfo = await apiClient.get(`/properties/${propertyId}`).then((res: any) => res.data);
      const updatedExpected = (updatedPropertyInfo.propertyType?.price || 0) * (updatedPropertyInfo.areaSize || 0);
      const updatedPaid = updatedPropertyInfo.paidAmount || 0;
      const isFullyPaid = updatedPaid >= updatedExpected && updatedExpected > 0;
      if (isFullyPaid && payment.id) {
        const statusesResponse = await apiClient.get('/payments/statuses');
        const completedStatus = statusesResponse.data?.find((s: any) => s.name?.toLowerCase() === 'completed');
        if (completedStatus) {
          try {
            await dispatch(updatePayment({ id: payment.id, data: { statusId: completedStatus.id } })).unwrap();
          } catch (_) {}
        }
      }

      setShowPaymentModal(false);
      setPaymentAmountError('');
      setPaymentAmountInfo('');
      await Swal.fire({
        icon: 'success',
        title: 'Payment Collected!',
        text: 'Payment collected successfully.',
        confirmButtonColor: '#10b981',
        timer: 3000,
        showConfirmButton: true,
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to collect payment';
      setPaymentAmountError(errorMessage);
      await Swal.fire({ icon: 'error', title: 'Collection Failed', text: errorMessage, confirmButtonColor: '#dc2626' });
    } finally {
      setIsUpdating(false);
    }
  };

  // Show receipt view
  if (showReceipt) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6 print:hidden">
            <button
              onClick={() => setShowReceipt(false)}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white rounded-lg shadow-sm hover:bg-gray-50 transition-all duration-200 transform hover:scale-105 active:scale-95"
            >
              <ArrowLeftIcon className="h-5 w-5" />
              Back to Details
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg shadow-sm hover:bg-primary-700 transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"
            >
              <DocumentTextIcon className="h-5 w-5" />
              Print Receipt
            </button>
          </div>
          <Receipt payment={payment} paymentHistory={paymentHistory} />
        </div>
      </div>
    );
  }

  const property = getNestedProperty(payment, 'Property', 'property');
  const expectedAmount = propertyPaymentInfo ? (propertyPaymentInfo.propertyType?.price || 0) * (propertyPaymentInfo.areaSize || 0) : 0;
  const paidAmount = propertyPaymentInfo?.paidAmount || 0;
  const remainingAmount = expectedAmount - paidAmount;
  const paymentDiscount = Number(payment.discountAmount) || 0;
  const effectiveRemaining = Math.max(0, remainingAmount - paymentDiscount);
  const paymentPercentage = expectedAmount > 0 ? (paidAmount / expectedAmount) * 100 : 0;

  const handleDiscountSubmit = async () => {
    const amount = parseFloat(discountModalAmount);
    if (isNaN(amount) || amount < 0) {
      await Swal.fire({ icon: 'warning', title: 'Invalid amount', text: 'Please enter a valid discount amount (0 or more).', confirmButtonColor: '#0d9488' });
      return;
    }
    // Discount cannot exceed the total payment amount (remaining balance)
    if (amount > remainingAmount) {
      await Swal.fire({
        icon: 'warning',
        title: 'Discount too high',
        text: `The total discount cannot exceed the total payment amount (remaining balance: ${payment?.currency || 'USD'} ${remainingAmount.toFixed(2)}).`,
        confirmButtonColor: '#0d9488',
      });
      return;
    }
    if (!currentPayment?.id) return;
    setIsUpdating(true);
    try {
      await dispatch(updatePayment({
        id: currentPayment.id,
        data: { discountAmount: amount, discountReason: discountModalReason.trim() || undefined },
      })).unwrap();
      await dispatch(fetchPaymentById(id!));
      setShowDiscountModal(false);
      setDiscountModalAmount('');
      setDiscountModalReason('');
      await Swal.fire({ icon: 'success', title: 'Discount applied', text: 'Payment discount has been saved.', confirmButtonColor: '#10b981' });
    } catch (e: any) {
      await Swal.fire({ icon: 'error', title: 'Failed', text: e.message || 'Failed to apply discount', confirmButtonColor: '#dc2626' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleExemptionSubmit = async () => {
    if (!exemptionModalReason?.trim()) {
      await Swal.fire({ icon: 'warning', title: 'Reason required', text: 'Please enter an exemption reason.', confirmButtonColor: '#0d9488' });
      return;
    }
    if (!currentPayment?.id) return;
    setIsUpdating(true);
    try {
      await dispatch(updatePayment({
        id: currentPayment.id,
        data: { isExempt: true, exemptionReason: exemptionModalReason.trim() },
      })).unwrap();
      await dispatch(fetchPaymentById(id!));
      setShowExemptionModal(false);
      setExemptionModalReason('');
      await Swal.fire({ icon: 'success', title: 'Payment exempted', text: 'Payment has been marked as exempt.', confirmButtonColor: '#10b981' });
    } catch (e: any) {
      await Swal.fire({ icon: 'error', title: 'Failed', text: e.message || 'Failed to set exemption', confirmButtonColor: '#dc2626' });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-6 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/payments')}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Payment Details</h1>
                <p className="mt-1 text-sm text-gray-600">
                  Transaction Reference: <span className="font-mono font-medium">{payment.transactionReference || 'N/A'}</span>
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              {propertyPaymentInfo && effectiveRemaining > 0.01 && !payment.isExempt && (
                <button
                  onClick={handlePay}
                  disabled={isUpdating || !propertyPaymentInfo}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg shadow-sm hover:bg-green-700 disabled:bg-green-400 transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-md hover:shadow-lg"
                >
                  <CurrencyDollarIcon className="h-5 w-5" />
                  Collect Payment
                </button>
              )}
              {effectiveRemaining > 0.01 && !payment.isExempt && (
                <button
                  onClick={() => {
                    setDiscountModalAmount(currentPayment?.discountAmount != null ? String(currentPayment.discountAmount) : '');
                    setDiscountModalReason(currentPayment?.discountReason || '');
                    setShowDiscountModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg shadow-sm hover:bg-amber-600 transition-all duration-200 transform hover:scale-105 active:scale-95"
                >
                  <ReceiptPercentIcon className="h-5 w-5" />
                  Apply Discount
                </button>
              )}
              {effectiveRemaining > 0.01 && !payment.isExempt && (
                <button
                  onClick={() => {
                    setExemptionModalReason(currentPayment?.exemptionReason || '');
                    setShowExemptionModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-sm hover:bg-indigo-700 transition-all duration-200 transform hover:scale-105 active:scale-95"
                >
                  <ShieldCheckIcon className="h-5 w-5" />
                  Exemption
                </button>
              )}
              <button
                onClick={() => setShowReceipt(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg shadow-sm hover:bg-gray-50 transition-all duration-200 transform hover:scale-105 active:scale-95"
              >
                <DocumentTextIcon className="h-5 w-5" />
                View Receipt
              </button>
              <button
                onClick={() => setShowEditModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg shadow-sm hover:bg-gray-50 transition-all duration-200 transform hover:scale-105 active:scale-95"
              >
                <PencilIcon className="h-5 w-5" />
                Edit
              </button>
            </div>
          </div>
        </div>

        {/* Payment Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {/* Amount Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <CurrencyDollarIcon className="h-6 w-6 text-blue-600" />
              </div>
              <span 
                className="px-3 py-1 text-xs font-semibold rounded-full text-white"
                style={{ backgroundColor: statusColor }}
              >
                {statusName}
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-1">Payment Amount</p>
            <p className="text-2xl font-bold text-gray-900">
              {payment.currency || 'USD'} {payment.amount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
            </p>
          </div>

          {/* Expected Amount Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <ChartBarIcon className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1">Expected Amount</p>
            <p className="text-2xl font-bold text-gray-900">
              {payment.currency || 'USD'} {expectedAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          {/* Total Paid Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1">Total Paid</p>
            <p className="text-2xl font-bold text-green-600">
              {payment.currency || 'USD'} {paidAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          {/* Remaining Balance Card (after discount: Expected − Paid − Discount). Green = fully paid (paid ≥ expected); zero due to discount = not fully paid. */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <ClockIcon className="h-6 w-6 text-orange-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1">Remaining Balance</p>
            <p className={`text-2xl font-bold ${
              remainingAmount <= 0 ? 'text-green-600' : effectiveRemaining > 0 ? 'text-orange-600' : 'text-orange-600'
            }`}>
              {payment.currency || 'USD'} {effectiveRemaining.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            {paymentDiscount > 0 && (
              <p className="text-xs text-gray-500 mt-1">After {payment.currency || 'USD'} {paymentDiscount.toFixed(2)} discount</p>
            )}
            {effectiveRemaining <= 0.01 && remainingAmount > 0.01 && (
              <p className="text-xs text-amber-600 mt-1 font-medium">Balance cleared (discount) — not fully paid</p>
            )}
          </div>

          {/* Discount Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-amber-100 rounded-lg">
                <ReceiptPercentIcon className="h-6 w-6 text-amber-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1">Discount</p>
            <p className="text-2xl font-bold text-amber-700">
              {payment.discountAmount != null && Number(payment.discountAmount) > 0
                ? `${payment.currency || 'USD'} ${Number(payment.discountAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : '—'}
            </p>
            {payment.discountAmount != null && Number(payment.discountAmount) > 0 && payment.discountReason && (
              <p className="text-xs text-gray-500 mt-1 truncate" title={payment.discountReason}>{payment.discountReason}</p>
            )}
          </div>

          {/* Exemption Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-indigo-100 rounded-lg">
                <ShieldCheckIcon className="h-6 w-6 text-indigo-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1">Exemption</p>
            <p className={`text-lg font-bold ${payment.isExempt ? 'text-indigo-600' : 'text-gray-400'}`}>
              {payment.isExempt ? 'Exempted' : '—'}
            </p>
            {payment.isExempt && payment.exemptionReason && (
              <p className="text-xs text-gray-500 mt-1 truncate" title={payment.exemptionReason}>{payment.exemptionReason}</p>
            )}
          </div>
        </div>

        {/* Payment Progress */}
        {propertyPaymentInfo && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <ChartBarIcon className="h-5 w-5 text-primary-600" />
                Payment Progress
              </h3>
              <span 
                className={`px-3 py-1 text-sm font-semibold rounded-full ${
                  remainingAmount <= 0.01
                    ? 'bg-green-100 text-green-800'
                    : effectiveRemaining <= 0.01 && remainingAmount > 0.01
                    ? 'bg-amber-100 text-amber-800'
                    : propertyPaymentInfo.paymentStatus === 'Paid_partially'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-orange-100 text-orange-800'
                }`}
              >
                {remainingAmount <= 0.01
                  ? 'Fully paid'
                  : effectiveRemaining <= 0.01 && remainingAmount > 0.01
                  ? 'Balance cleared (not fully paid)'
                  : (propertyPaymentInfo.paymentStatus?.replace('_', ' ') || 'Pending')}
              </span>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Progress</span>
                <span className="font-semibold text-gray-900">{paymentPercentage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    paymentPercentage >= 100 ? 'bg-green-500' :
                    paymentPercentage >= 50 ? 'bg-blue-500' :
                    'bg-orange-500'
                  }`}
                  style={{ width: `${Math.min(100, paymentPercentage)}%` }}
                />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 pt-2 text-xs text-gray-600">
                <div>
                  <span className="font-medium">Expected:</span> {payment.currency || 'USD'} {expectedAmount.toFixed(2)}
                </div>
                <div>
                  <span className="font-medium">Paid:</span> {payment.currency || 'USD'} {paidAmount.toFixed(2)}
                </div>
                <div>
                  <span className="font-medium">Discount:</span>{' '}
                  {paymentDiscount > 0 ? (
                    <span>{payment.currency || 'USD'} {paymentDiscount.toFixed(2)}</span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </div>
                <div>
                  <span className="font-medium">Exemption:</span>{' '}
                  {payment.isExempt ? (
                    <span className="text-indigo-600">{payment.exemptionReason || 'Exempted'}</span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </div>
                <div>
                  <span className="font-medium">Remaining:</span> {payment.currency || 'USD'} {effectiveRemaining.toFixed(2)}
                  {paymentDiscount > 0 && <span className="block text-gray-500">(after discount)</span>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Payment History */}
          <div className="lg:col-span-2 space-y-6">
            {/* Payment History Timeline */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <ReceiptPercentIcon className="h-5 w-5 text-primary-600" />
                    Payment History
                  </h3>
                  <span className="px-3 py-1 bg-primary-100 text-primary-800 text-sm font-semibold rounded-full">
                    {paymentHistory.length} installment{paymentHistory.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              {/* Discount & Exemption included in payment history */}
              <div className="px-6 pt-4 pb-2 border-b border-gray-100 bg-gray-50/50">
                <div className="flex flex-wrap gap-6 text-sm">
                  <div>
                    <span className="font-medium text-gray-600">Discount:</span>{' '}
                    {payment.discountAmount != null && Number(payment.discountAmount) > 0 ? (
                      <span className="text-gray-900">
                        {payment.currency || 'USD'} {Number(payment.discountAmount).toFixed(2)}
                        {payment.discountReason && <span className="text-gray-600"> — {payment.discountReason}</span>}
                      </span>
                    ) : (
                      <span className="text-gray-500">None</span>
                    )}
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Exemption:</span>{' '}
                    {payment.isExempt ? (
                      <span className="text-gray-900">{payment.exemptionReason || 'Exempted'}</span>
                    ) : (
                      <span className="text-gray-500">None</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="p-6">
                {isLoadingHistory ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                    <p className="mt-3 text-sm text-gray-500">Loading payment history...</p>
                  </div>
                ) : (() => {
                  // Build timeline: discount and exemption as stored entries, then installments (collected amounts)
                  const sortedInstallments = [...paymentHistory].sort(
                    (a: any, b: any) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
                  );
                  const hasDiscount = payment.discountAmount != null && Number(payment.discountAmount) > 0;
                  const hasExemption = payment.isExempt === true;
                  const timelineItems: { type: 'discount' | 'exemption' | 'installment'; key: string; sortOrder: number; data?: any }[] = [];
                  if (hasDiscount) {
                    timelineItems.push({ type: 'discount', key: 'discount-applied', sortOrder: 1 });
                  }
                  if (hasExemption) {
                    timelineItems.push({ type: 'exemption', key: 'exemption-applied', sortOrder: 2 });
                  }
                  sortedInstallments.forEach((d: any, i: number) => {
                    timelineItems.push({ type: 'installment', key: d.id || `inst-${i}`, sortOrder: 3 + i, data: d });
                  });
                  const hasAny = timelineItems.length > 0;

                  if (!hasAny) {
                    return (
                      <div className="text-center py-12">
                        <ReceiptPercentIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-600 font-medium">No payment history</p>
                        <p className="text-sm text-gray-500 mt-1">Discount, exemption, and installments will appear here</p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      {timelineItems.map((item, index) => {
                        const isLatest = item.type === 'installment' && index === timelineItems.findIndex(t => t.type === 'installment');
                        const isFirstInstallment = item.type === 'installment' && item.data && sortedInstallments[0]?.id === item.data?.id;

                        if (item.type === 'discount') {
                          const amount = Number(payment.discountAmount) || 0;
                          const reason = payment.discountReason || '';
                          return (
                            <div key={item.key} className="relative pl-8 pb-6 border-l-2 border-gray-200">
                              <div className="absolute left-0 top-1 w-4 h-4 rounded-full border-2 bg-amber-100 border-amber-400" />
                              <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                                <div className="flex items-start justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-amber-100">
                                      <ReceiptPercentIcon className="h-5 w-5 text-amber-600" />
                                    </div>
                                    <div>
                                      <span className="font-semibold text-gray-900">Discount applied</span>
                                      <p className="text-xs text-gray-600 mt-0.5">
                                        Deducted from total. Amount due = Expected − Discount = {payment.currency || 'USD'} {(expectedAmount - amount).toFixed(2)}
                                      </p>
                                      {reason && <p className="text-xs text-gray-500 mt-1">— {reason}</p>}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-lg font-bold text-amber-700">
                                      −{payment.currency || 'USD'} {amount.toFixed(2)}
                                    </p>
                                    <p className="text-xs text-gray-500">Stored in payment history</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        }

                        if (item.type === 'exemption') {
                          const reason = payment.exemptionReason || 'Exempted';
                          return (
                            <div key={item.key} className="relative pl-8 pb-6 border-l-2 border-gray-200">
                              <div className="absolute left-0 top-1 w-4 h-4 rounded-full border-2 bg-indigo-100 border-indigo-400" />
                              <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
                                <div className="flex items-start justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-indigo-100">
                                      <ShieldCheckIcon className="h-5 w-5 text-indigo-600" />
                                    </div>
                                    <div>
                                      <span className="font-semibold text-gray-900">Exemption</span>
                                      <p className="text-xs text-gray-600 mt-0.5">No amount collected. Stored in payment history.</p>
                                      {reason && <p className="text-xs text-gray-500 mt-1">— {reason}</p>}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-lg font-bold text-indigo-600">$0.00</p>
                                    <p className="text-xs text-gray-500">{payment.currency || 'USD'}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        }

                        const detail = item.data;
                        const paymentDate = detail.paymentDate ? new Date(detail.paymentDate) : new Date();
                        return (
                          <div
                            key={item.key}
                            className={`relative pl-8 pb-6 ${
                              index !== timelineItems.length - 1 ? 'border-l-2 border-gray-200' : ''
                            }`}
                          >
                            <div className={`absolute left-0 top-1 w-4 h-4 rounded-full border-2 ${
                              isFirstInstallment ? 'bg-green-500 border-green-500' : 'bg-white border-gray-300'
                            }`}>
                              {isFirstInstallment && <CheckCircleIconSolid className="h-3 w-3 text-white absolute top-0.5 left-0.5" />}
                            </div>
                            <div className={`bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors ${
                              isFirstInstallment ? 'ring-2 ring-green-200' : ''
                            }`}>
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <div className={`p-2 rounded-lg ${isFirstInstallment ? 'bg-green-100' : 'bg-primary-100'}`}>
                                    <CreditCardIcon className={`h-5 w-5 ${isFirstInstallment ? 'text-green-600' : 'text-primary-600'}`} />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-gray-900">
                                        Payment collected #{detail.installmentNumber}
                                      </span>
                                      {isFirstInstallment && (
                                        <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-semibold rounded-full">Latest</span>
                                      )}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                      {paymentDate.toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-lg font-bold text-gray-900">
                                    {detail.currency || payment.currency || 'USD'} {detail.amount?.toFixed(2)}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {(detail.paymentMethod || detail.PaymentMethod)?.Name ||
                                      (detail.paymentMethod || detail.PaymentMethod)?.name || 'N/A'}
                                  </p>
                                </div>
                              </div>
                              <div className="mt-3 pt-3 border-t border-gray-200">
                                <div className="flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-4 text-gray-600">
                                    <span className="flex items-center gap-1">
                                      <IdentificationIcon className="h-3 w-3" />
                                      <span className="font-mono">{detail.transactionReference}</span>
                                    </span>
                                  </div>
                                  {(detail.collectedBy || detail.CollectedBy) && (
                                    <span className="text-gray-500">
                                      Collected by{' '}
                                      {(detail.collectedBy || detail.CollectedBy)?.FirstName ||
                                        (detail.collectedBy || detail.CollectedBy)?.firstName ||
                                        (detail.collectedBy || detail.CollectedBy)?.Username ||
                                        (detail.collectedBy || detail.CollectedBy)?.username ||
                                        'System'}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Property Information */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <BuildingOfficeIcon className="h-5 w-5 text-primary-600" />
                  Property Information
                </h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                    <p className="text-sm text-gray-900">
                      {property?.StreetAddress || property?.streetAddress || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                    <p className="text-sm text-gray-900">
                      {property?.City || property?.city || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Property Type</label>
                    <p className="text-sm text-gray-900">
                      {(() => {
                        const propertyType = getNestedProperty(property, 'PropertyType', 'propertyType');
                        return propertyType?.Name || propertyType?.name || 'N/A';
                      })()}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Owner</label>
                    <p className="text-sm text-gray-900">
                      {(() => {
                        const owner = getNestedProperty(property, 'Owner', 'owner');
                        return owner?.Name || owner?.name || 'N/A';
                      })()}
                    </p>
                  </div>
                </div>
                <div className="mt-6">
                  <button
                    onClick={() => navigate(`/properties/${payment.propertyId || ''}`)}
                    className="text-primary-600 hover:text-primary-800 text-sm font-medium flex items-center gap-1"
                  >
                    View Full Property Details
                    <ArrowLeftIcon className="h-4 w-4 rotate-180" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Collector Information */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <UserIcon className="h-5 w-5 text-primary-600" />
                  Collector
                </h3>
              </div>
              <div className="p-6">
                {getNestedProperty(payment, 'Collector', 'collector') ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                      <p className="text-sm text-gray-900">
                        {(() => {
                          const collector = getNestedProperty(payment, 'Collector', 'collector');
                          const firstName = collector?.FirstName || collector?.firstName || '';
                          const lastName = collector?.LastName || collector?.lastName || '';
                          return `${firstName} ${lastName}`.trim() || 'N/A';
                        })()}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <p className="text-sm text-gray-900">
                        {(() => {
                          const collector = getNestedProperty(payment, 'Collector', 'collector');
                          return collector?.Email || collector?.email || 'N/A';
                        })()}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No collector assigned</p>
                )}
              </div>
            </div>

            {/* Discount & Exemption - always shown on payment detail page */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <ReceiptPercentIcon className="h-5 w-5 text-amber-500" />
                  Discount & Exemption
                </h3>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Discount</label>
                  {payment.discountAmount != null && Number(payment.discountAmount) > 0 ? (
                    <p className="text-sm text-gray-900">
                      {payment.currency || 'USD'} {Number(payment.discountAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      {payment.discountReason && (
                        <span className="block text-gray-600 mt-1">— {payment.discountReason}</span>
                      )}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500">No discount applied</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Exemption</label>
                  {payment.isExempt ? (
                    <p className="text-sm text-gray-900">
                      {payment.exemptionReason || 'Payment is exempted'}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500">Not exempt</p>
                  )}
                </div>
              </div>
            </div>

            {/* Notes */}
            {payment.notes && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Notes</h3>
                </div>
                <div className="p-6">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{payment.notes}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slideUp">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Edit Payment</h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status *</label>
                  <select
                    className="input py-2.5 w-full"
                    value={editForm.statusId}
                    onChange={(e) => setEditForm(prev => ({ ...prev, statusId: e.target.value }))}
                  >
                    <option value="">Select status</option>
                    {paymentStatuses.map((status: any) => (
                      <option key={status.id} value={status.id}>{status.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Discount Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">{payment?.currency || 'USD'}</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="input py-2.5 w-full pl-16"
                      value={editForm.discountAmount}
                      onChange={(e) => setEditForm(prev => ({ ...prev, discountAmount: e.target.value }))}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Discount Reason</label>
                  <input
                    type="text"
                    className="input py-2.5 w-full"
                    value={editForm.discountReason}
                    onChange={(e) => setEditForm(prev => ({ ...prev, discountReason: e.target.value }))}
                    placeholder="Reason for discount (optional)"
                  />
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      checked={editForm.isExempt}
                      onChange={(e) => setEditForm(prev => ({ ...prev, isExempt: e.target.checked }))}
                    />
                    <span className="ml-2 text-sm text-gray-700">Payment is exempted</span>
                  </label>
                </div>

                {editForm.isExempt && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Exemption Reason</label>
                    <textarea
                      className="input py-2.5 w-full"
                      rows={3}
                      value={editForm.exemptionReason}
                      onChange={(e) => setEditForm(prev => ({ ...prev, exemptionReason: e.target.value }))}
                      placeholder="Enter reason for exemption..."
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea
                    className="input py-2.5 w-full"
                    rows={3}
                    value={editForm.notes}
                    onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Add notes..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="btn-secondary px-6 py-2 transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  disabled={isUpdating}
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdatePayment}
                  className="btn-primary px-6 py-2 transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-md hover:shadow-lg"
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Updating...
                    </span>
                  ) : (
                    'Update Payment'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Collection Modal - amount only */}
      {showPaymentModal && propertyPaymentInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full animate-slideUp">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Collect Payment</h2>
                <button
                  onClick={() => { setShowPaymentModal(false); setPaymentAmountError(''); setPaymentAmountInfo(''); }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  disabled={isUpdating}
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Expected:</span>
                    <span className="font-semibold text-gray-900">
                      {payment.currency || 'USD'} {expectedAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Already Paid:</span>
                    <span className="font-semibold text-green-600">
                      {payment.currency || 'USD'} {paidAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t border-blue-300">
                    <span className="text-gray-700 font-medium">Remaining:</span>
                    <span className="font-bold text-blue-900">
                      {payment.currency || 'USD'} {remainingAmount.toFixed(2)}
                    </span>
                  </div>
                  {paymentDiscount > 0 && (
                    <>
                      <div className="flex justify-between text-sm pt-2 border-t border-amber-200">
                        <span className="text-amber-800 font-medium">Discount applied:</span>
                        <span className="font-semibold text-amber-800">-{payment.currency || 'USD'} {paymentDiscount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm pt-1">
                        <span className="text-gray-700 font-medium">Amount due after discount:</span>
                        <span className="font-bold text-blue-900">
                          {payment.currency || 'USD'} {effectiveRemaining.toFixed(2)}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Amount *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">{payment.currency || 'USD'}</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={effectiveRemaining}
                      className={`input pl-16 py-2.5 w-full ${paymentAmountError ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''}`}
                      value={paymentAmount}
                      onChange={(e) => {
                        const v = e.target.value;
                        const num = parseFloat(v);
                        if (!isNaN(num) && num > effectiveRemaining) {
                          setPaymentAmount(effectiveRemaining.toFixed(2));
                          setPaymentAmountError('');
                          setPaymentAmountInfo(`Capped to ${payment.currency || 'USD'} ${effectiveRemaining.toFixed(2)}`);
                          setTimeout(() => setPaymentAmountInfo(''), 3000);
                        } else {
                          setPaymentAmount(v);
                          setPaymentAmountError('');
                          setPaymentAmountInfo('');
                        }
                      }}
                      placeholder="0.00"
                      disabled={isUpdating}
                    />
                  </div>
                  {paymentAmountError && <p className="mt-1 text-sm text-red-600">{paymentAmountError}</p>}
                  {paymentAmountInfo && <p className="mt-1 text-sm text-blue-600">{paymentAmountInfo}</p>}
                  <p className="mt-1 text-xs text-gray-500">
                    Maximum: {payment.currency || 'USD'} {effectiveRemaining.toFixed(2)}
                  </p>
                </div>

                {paymentAmount && !paymentAmountError && parseFloat(paymentAmount) > 0 && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <p className="text-sm text-gray-600 mb-1">After this payment:</p>
                    <div className="flex items-center gap-2">
                      {(() => {
                        const amt = parseFloat(paymentAmount) || 0;
                        const newPaid = paidAmount + amt;
                        const newRemaining = expectedAmount - newPaid;
                        const isPaid = newRemaining <= 0.01;
                        return (
                          <>
                            <span className={`px-3 py-1 text-sm font-semibold rounded-full ${isPaid ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                              {isPaid ? 'Fully Paid' : 'Partially Paid'}
                            </span>
                            {!isPaid && (
                              <span className="text-sm text-gray-600">
                                (Remaining: {payment.currency || 'USD'} {newRemaining.toFixed(2)})
                              </span>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={() => { setShowPaymentModal(false); setPaymentAmountError(''); setPaymentAmountInfo(''); }}
                  className="btn-secondary px-6 py-2"
                  disabled={isUpdating}
                >
                  Cancel
                </button>
                <button
                  onClick={handlePaymentSubmit}
                  className="btn-primary px-6 py-2 shadow-md hover:shadow-lg"
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    'Collect Payment'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Discount Modal */}
      {showDiscountModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full animate-slideUp">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <ReceiptPercentIcon className="h-6 w-6 text-amber-500" />
                  Apply Discount
                </h2>
                <button
                  onClick={() => { setShowDiscountModal(false); setDiscountModalAmount(''); setDiscountModalReason(''); }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  disabled={isUpdating}
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Apply a discount to this payment. The amount due will be reduced by this discount (max: remaining balance).
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Discount Amount *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">{payment?.currency || 'USD'}</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max={remainingAmount}
                      className="input pl-16 py-2.5 w-full"
                      value={discountModalAmount}
                      onChange={(e) => {
                        const v = e.target.value;
                        const num = parseFloat(v);
                        if (v === '' || v === '.') {
                          setDiscountModalAmount(v);
                          return;
                        }
                        if (!isNaN(num)) {
                          if (num > remainingAmount) {
                            setDiscountModalAmount(remainingAmount.toFixed(2));
                          } else {
                            setDiscountModalAmount(v);
                          }
                        }
                      }}
                      placeholder="0.00"
                      disabled={isUpdating}
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Maximum: {payment?.currency || 'USD'} {remainingAmount.toFixed(2)} (resets automatically if above)</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Reason (optional)</label>
                  <input
                    type="text"
                    className="input py-2.5 w-full"
                    value={discountModalReason}
                    onChange={(e) => setDiscountModalReason(e.target.value)}
                    placeholder="e.g. Early payment, promotion"
                    disabled={isUpdating}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={() => { setShowDiscountModal(false); setDiscountModalAmount(''); setDiscountModalReason(''); }}
                  className="btn-secondary px-6 py-2"
                  disabled={isUpdating}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDiscountSubmit}
                  className="px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50"
                  disabled={isUpdating}
                >
                  {isUpdating ? 'Saving...' : 'Apply Discount'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Exemption Modal */}
      {showExemptionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full animate-slideUp">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <ShieldCheckIcon className="h-6 w-6 text-indigo-600" />
                  Mark as Exempt
                </h2>
                <button
                  onClick={() => { setShowExemptionModal(false); setExemptionModalReason(''); }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  disabled={isUpdating}
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Mark this payment as exempt. No amount will be collected. A reason is required.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Exemption Reason *</label>
                <textarea
                  className="input py-2.5 w-full"
                  rows={3}
                  value={exemptionModalReason}
                  onChange={(e) => setExemptionModalReason(e.target.value)}
                  placeholder="Enter reason for exemption..."
                  disabled={isUpdating}
                />
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={() => { setShowExemptionModal(false); setExemptionModalReason(''); }}
                  className="btn-secondary px-6 py-2"
                  disabled={isUpdating}
                >
                  Cancel
                </button>
                <button
                  onClick={handleExemptionSubmit}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  disabled={isUpdating || !exemptionModalReason?.trim()}
                >
                  {isUpdating ? 'Saving...' : 'Mark Exempt'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
