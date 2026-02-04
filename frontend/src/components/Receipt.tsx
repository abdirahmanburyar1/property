import { PrinterIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid';
import { useEffect, useState } from 'react';
import apiClient from '../config/api';

interface ReceiptProps {
  payment: any;
  paymentHistory?: any[];
  onPrint?: () => void;
}

export default function Receipt({ payment, paymentHistory = [], onPrint }: ReceiptProps) {
  const [history, setHistory] = useState<any[]>(paymentHistory);
  const [, setIsLoadingHistory] = useState(false);
  const [propertyInfo, setPropertyInfo] = useState<any>(null);

  const getNestedProperty = (obj: any, ...keys: string[]) => {
    for (const key of keys) {
      if (obj && (obj[key] !== undefined && obj[key] !== null)) {
        return obj[key];
      }
    }
    return null;
  };

  const loadPaymentHistory = async () => {
    const propertyId = payment?.propertyId || payment?.PropertyId || 
                      getNestedProperty(payment, 'Property', 'property')?.id ||
                      getNestedProperty(payment, 'Property', 'property')?.Id;
    
    if (!propertyId) return;

    setIsLoadingHistory(true);
    try {
      const response = await apiClient.get(`/paymentdetails/property/${propertyId}`);
      setHistory(response.data || []);
    } catch (error) {
      console.error('Failed to load payment history:', error);
      setHistory([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const loadPropertyInfo = async () => {
    const propertyId = payment?.propertyId || payment?.PropertyId || 
                      getNestedProperty(payment, 'Property', 'property')?.id ||
                      getNestedProperty(payment, 'Property', 'property')?.Id;
    
    if (!propertyId) return;

    try {
      const response = await apiClient.get(`/properties/${propertyId}`);
      setPropertyInfo(response.data);
    } catch (error) {
      console.error('Failed to load property info:', error);
    }
  };

  useEffect(() => {
    // Load payment history if not provided
    if (paymentHistory.length === 0 && payment?.propertyId) {
      loadPaymentHistory();
    } else {
      setHistory(paymentHistory);
    }
    
    // Load property info if not in payment object
    const property = getNestedProperty(payment, 'Property', 'property');
    if (!property || (!property.PropertyType && !property.propertyType)) {
      loadPropertyInfo();
    }
  }, [payment?.propertyId, paymentHistory]);

  const property = propertyInfo || getNestedProperty(payment, 'Property', 'property');
  const propertyType = propertyInfo?.propertyType || propertyInfo?.PropertyType || 
                       getNestedProperty(property, 'PropertyType', 'propertyType');
  const owner = propertyInfo?.owner || propertyInfo?.Owner ||
                getNestedProperty(property, 'Owner', 'owner') || 
                getNestedProperty(payment, 'Owner', 'owner');
  const statusObj = getNestedProperty(payment, 'Status', 'status');
  const statusName = statusObj?.Name || statusObj?.name || 'Pending';
  const collector = getNestedProperty(payment, 'Collector', 'collector');

  const receiptDate = payment.paymentDate 
    ? new Date(payment.paymentDate).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    : new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });

  const receiptTime = payment.paymentDate
    ? new Date(payment.paymentDate).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
      })
    : new Date().toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
      });

  const isPaid = statusName.toLowerCase() === 'completed' || statusName.toLowerCase() === 'paid';

  // Calculate totals from payment history
  const sortedHistory = [...history].sort((a: any, b: any) => 
    new Date(a.paymentDate || a.PaymentDate || 0).getTime() - 
    new Date(b.paymentDate || b.PaymentDate || 0).getTime()
  );

  const totalPaid = sortedHistory.reduce((sum: number, detail: any) => {
    return sum + (parseFloat(detail.amount || detail.Amount || 0));
  }, 0);

  const currency = sortedHistory[0]?.currency || sortedHistory[0]?.Currency || payment.currency || payment.Currency || 'USD';

  // Generate QR code (square barcode) URL
  const receiptNumber = payment.transactionReference || payment.TransactionReference || 'N/A';
  
  // Get full URL path for QR code data
  const currentUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}${window.location.pathname}${window.location.search}`
    : '';
  
  // Use full URL path as QR code data, or receipt number if URL not available
  const qrCodeData = currentUrl || receiptNumber;
  
  // Generate QR code using QR code generation service
  // Using QR Server API - generates square QR code
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrCodeData)}&format=png&margin=1`;

  return (
    <div className="bg-white">
      {/* Print Button - Hidden when printing */}
      <div className="mb-6 print:hidden flex justify-end">
        <button
          onClick={onPrint || (() => window.print())}
          className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg shadow-sm hover:bg-primary-700 transition-colors"
        >
          <PrinterIcon className="h-5 w-5" />
          Print Receipt
        </button>
      </div>

      {/* Receipt Content - A4 Size */}
      <div 
        className="bg-white mx-auto shadow-2xl print:shadow-none border border-gray-200 print:border-0"
        style={{
          width: '210mm',
          minHeight: 'auto',
          padding: '20mm 25mm',
          margin: '0 auto',
          boxSizing: 'border-box',
        }}
      >
        {/* Header with Logo Area */}
        <div className="text-center mb-6 pb-4 border-b-4 border-primary-600">
          <div className="mb-3">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-full mb-2">
              <CheckCircleIconSolid className="h-10 w-10 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1 tracking-tight">PROPERTY REGISTRATION</h1>
          <h2 className="text-lg font-semibold text-primary-600 mb-1">OFFICIAL PAYMENT RECEIPT</h2>
          <p className="text-xs text-gray-600 font-medium">Government Property Registration System</p>
        </div>

        {/* Receipt Number and Status Badge */}
        <div className="flex justify-between items-start mb-6 pb-4 border-b-2 border-gray-300">
          <div>
            <p className="text-xs text-gray-600 mb-1 font-medium uppercase tracking-wide">Receipt Number</p>
            <p className="text-xl font-bold text-gray-900 font-mono">
              {receiptNumber}
            </p>
          </div>
          <div className="text-right">
            <div className="mb-2">
              <span className={`px-3 py-1 inline-flex items-center gap-1 text-xs font-semibold rounded-full ${
                isPaid 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {isPaid && <CheckCircleIcon className="h-3 w-3" />}
                {statusName.toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1 font-medium uppercase tracking-wide">Date & Time</p>
              <p className="text-sm font-semibold text-gray-900">{receiptDate}</p>
              <p className="text-xs text-gray-600">{receiptTime}</p>
            </div>
          </div>
        </div>

        {/* Total Amount */}
        <div className="mb-6 text-right">
          <p className="text-sm text-gray-600 font-medium mb-1">Total Amount:</p>
          <p className="text-2xl font-bold text-gray-900">
            {currency} {totalPaid.toLocaleString('en-US', { 
              minimumFractionDigits: 2, 
              maximumFractionDigits: 2 
            })}
          </p>
        </div>

        {/* Discount & Exemption (included in payment history) */}
        {(payment?.discountAmount != null && Number(payment.discountAmount) > 0) || payment?.isExempt ? (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">Discount & Exemption</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600 font-medium">Discount:</span>{' '}
                {payment.discountAmount != null && Number(payment.discountAmount) > 0 ? (
                  <span className="text-gray-900">
                    {currency} {Number(payment.discountAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    {payment.discountReason && <span className="block text-gray-600 text-xs mt-0.5">— {payment.discountReason}</span>}
                  </span>
                ) : (
                  <span className="text-gray-500">None</span>
                )}
              </div>
              <div>
                <span className="text-gray-600 font-medium">Exemption:</span>{' '}
                {payment.isExempt ? (
                  <span className="text-gray-900">{payment.exemptionReason || 'Exempted'}</span>
                ) : (
                  <span className="text-gray-500">None</span>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {/* Payment History Table - includes discount, exemption, and collected payments */}
        {(sortedHistory.length > 0 || (payment?.discountAmount != null && Number(payment.discountAmount) > 0) || payment?.isExempt) && (
          <div className="mb-6">
            <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
              <div className="w-1 h-5 bg-primary-600 rounded"></div>
              PAYMENT HISTORY
            </h3>
            <div className="border border-gray-300 rounded-lg overflow-hidden">
              <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-gray-300" style={{ fontSize: '10px' }}>
                      #
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-gray-300" style={{ fontSize: '10px' }}>
                      Type / Date
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-gray-300" style={{ fontSize: '10px' }}>
                      Amount
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-gray-300" style={{ fontSize: '10px' }}>
                      Method
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-gray-300" style={{ fontSize: '10px' }}>
                      Reference / Note
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-gray-300" style={{ fontSize: '10px' }}>
                      Collector
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* Discount row: deducted from total, amount due = expected − discount */}
                  {payment?.discountAmount != null && Number(payment.discountAmount) > 0 && (
                    <tr className="border-b border-gray-200 bg-amber-50">
                      <td className="px-3 py-2 text-gray-900 font-medium" style={{ fontSize: '10px' }}>—</td>
                      <td className="px-3 py-2 text-gray-700" style={{ fontSize: '10px' }}>Discount (deducted from total)</td>
                      <td className="px-3 py-2 text-amber-700 font-semibold" style={{ fontSize: '10px' }}>
                        −{currency} {Number(payment.discountAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-2 text-gray-600" style={{ fontSize: '10px' }}>—</td>
                      <td className="px-3 py-2 text-gray-600" style={{ fontSize: '9px' }}>{payment.discountReason || '—'}</td>
                      <td className="px-3 py-2 text-gray-500" style={{ fontSize: '10px' }}>—</td>
                    </tr>
                  )}
                  {/* Exemption row: no amount collected, stored in history */}
                  {payment?.isExempt && (
                    <tr className="border-b border-gray-200 bg-indigo-50">
                      <td className="px-3 py-2 text-gray-900 font-medium" style={{ fontSize: '10px' }}>—</td>
                      <td className="px-3 py-2 text-gray-700" style={{ fontSize: '10px' }}>Exemption (no amount collected)</td>
                      <td className="px-3 py-2 text-indigo-700 font-semibold" style={{ fontSize: '10px' }}>{currency} 0.00</td>
                      <td className="px-3 py-2 text-gray-600" style={{ fontSize: '10px' }}>—</td>
                      <td className="px-3 py-2 text-gray-600" style={{ fontSize: '9px' }}>{payment.exemptionReason || 'Exempted'}</td>
                      <td className="px-3 py-2 text-gray-500" style={{ fontSize: '10px' }}>—</td>
                    </tr>
                  )}
                  {/* Collected payment installments (e.g. $22 after $10 discount on $32 expected) */}
                  {sortedHistory.map((detail: any, index: number) => {
                    const paymentDate = detail.paymentDate || detail.PaymentDate;
                    const amount = detail.amount || detail.Amount || 0;
                    const method = detail.paymentMethod || detail.PaymentMethod;
                    const ref = detail.transactionReference || detail.TransactionReference || 'N/A';
                    const collector = detail.collectedBy || detail.CollectedBy;
                    const collectorName = collector 
                      ? `${collector.FirstName || collector.firstName || ''} ${collector.LastName || collector.lastName || ''}`.trim()
                      : collector?.Username || collector?.username || 'System';
                    
                    return (
                      <tr key={detail.id || detail.Id || index} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-900 font-medium" style={{ fontSize: '10px' }}>
                          {detail.installmentNumber || detail.InstallmentNumber || index + 1}
                        </td>
                        <td className="px-3 py-2 text-gray-700" style={{ fontSize: '10px' }}>
                          {paymentDate 
                            ? new Date(paymentDate).toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric' 
                              })
                            : 'N/A'}
                        </td>
                        <td className="px-3 py-2 text-gray-900 font-semibold" style={{ fontSize: '10px' }}>
                          {currency} {parseFloat(amount).toLocaleString('en-US', { 
                            minimumFractionDigits: 2, 
                            maximumFractionDigits: 2 
                          })}
                        </td>
                        <td className="px-3 py-2 text-gray-700" style={{ fontSize: '10px' }}>
                          {method?.Name || method?.name || 'N/A'}
                        </td>
                        <td className="px-3 py-2 text-gray-600 font-mono" style={{ fontSize: '9px' }}>
                          {ref}
                        </td>
                        <td className="px-3 py-2 text-gray-700" style={{ fontSize: '10px' }}>
                          {collectorName}
                        </td>
                      </tr>
                    );
                  })}
                  {/* Total Row (collected amount) */}
                  <tr className="bg-gray-50 font-bold border-t-2 border-gray-400">
                    <td colSpan={2} className="px-3 py-2 text-gray-900" style={{ fontSize: '10px' }}>
                      TOTAL COLLECTED
                    </td>
                    <td className="px-3 py-2 text-gray-900" style={{ fontSize: '10px' }}>
                      {currency} {totalPaid.toLocaleString('en-US', { 
                        minimumFractionDigits: 2, 
                        maximumFractionDigits: 2 
                      })}
                    </td>
                    <td colSpan={3} className="px-3 py-2"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Property Information Card */}
        <div className="mb-6 bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
            <div className="w-1 h-5 bg-primary-600 rounded"></div>
            PROPERTY INFORMATION
          </h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-gray-600 mb-0.5 font-medium">Address:</p>
              <p className="text-gray-900 font-semibold">
                {property?.StreetAddress || property?.streetAddress || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-gray-600 mb-0.5 font-medium">City:</p>
              <p className="text-gray-900 font-semibold">
                {property?.City || property?.city || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-gray-600 mb-0.5 font-medium">Property Type:</p>
              <p className="text-gray-900 font-semibold">
                {propertyType?.Name || propertyType?.name || 'N/A'}
              </p>
            </div>
            {property?.AreaSize && (
              <div>
                <p className="text-gray-600 mb-0.5 font-medium">Area Size:</p>
                <p className="text-gray-900 font-semibold">
                  {property.AreaSize} {property.AreaUnit || 'm²'}
                </p>
              </div>
            )}
            {property?.PlateNumber && (
              <div className="col-span-2">
                <p className="text-gray-600 mb-0.5 font-medium">Plate Number:</p>
                <p className="text-gray-900 font-semibold font-mono">
                  {property.PlateNumber || property.plateNumber || 'N/A'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Owner Information Card */}
        <div className="mb-6 bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
            <div className="w-1 h-5 bg-primary-600 rounded"></div>
            PROPERTY OWNER
          </h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-gray-600 mb-0.5 font-medium">Owner Name:</p>
              <p className="text-gray-900 font-semibold">
                {owner?.Name || owner?.name || 'N/A'}
              </p>
            </div>
            {owner?.Phone && (
              <div>
                <p className="text-gray-600 mb-0.5 font-medium">Phone:</p>
                <p className="text-gray-900 font-semibold">{owner.Phone || owner.phone}</p>
              </div>
            )}
            {owner?.Email && (
              <div className="col-span-2">
                <p className="text-gray-600 mb-0.5 font-medium">Email:</p>
                <p className="text-gray-900 font-semibold">{owner.Email || owner.email}</p>
              </div>
            )}
          </div>
        </div>

        {/* Collector Information */}
        {collector && (
          <div className="mb-6 bg-green-50 rounded-lg p-4 border border-green-200">
            <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
              <div className="w-1 h-5 bg-green-600 rounded"></div>
              COLLECTED BY
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-gray-600 mb-0.5 font-medium">Collector Name:</p>
                <p className="text-gray-900 font-semibold">
                  {collector.FirstName || collector.firstName || ''} {collector.LastName || collector.lastName || ''}
                </p>
              </div>
              {collector.Email && (
                <div>
                  <p className="text-gray-600 mb-0.5 font-medium">Email:</p>
                  <p className="text-gray-900 font-semibold">{collector.Email || collector.email}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* QR Code Section */}
        <div className="mb-6 text-center border-t-2 border-gray-300 pt-4">
          <div className="mb-3">
            <p className="text-xs text-gray-600 font-medium mb-2">Receipt Verification Code</p>
            <div className="flex justify-center">
              <img 
                src={qrCodeUrl} 
                alt={`QR Code for ${qrCodeData}`}
                className="mx-auto border-2 border-gray-300 rounded p-2 bg-white"
                style={{ 
                  width: '120px',
                  height: '120px',
                  imageRendering: 'crisp-edges',
                }}
                onError={(e) => {
                  // Fallback if QR code service fails
                  console.error('QR code image failed to load');
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          </div>
          <p className="text-xs text-gray-500 font-mono mb-2">{receiptNumber}</p>
          {currentUrl && (
            <div className="mt-2">
              <p className="text-xs text-gray-600 font-medium mb-1">Verification URL:</p>
              <p className="text-xs text-gray-500 font-mono break-all" style={{ fontSize: '9px' }}>
                {currentUrl}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t-2 border-gray-800">
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-2 mb-2">
              <CheckCircleIconSolid className="h-5 w-5 text-green-600" />
              <p className="text-xs font-semibold text-gray-900">
                This is an official receipt for property registration payment.
              </p>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Please keep this receipt for your records. This document serves as proof of payment
              for property registration services.
            </p>
            <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-300">
              Generated on {new Date().toLocaleString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
            <div className="mt-4 pt-3 border-t border-gray-300">
              <p className="text-xs text-gray-500">
                For inquiries, please contact the Property Registration Office.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }
          body {
            margin: 0;
            padding: 0;
            background: white;
          }
          /* Hide layout header and sidebar */
          header,
          nav,
          aside,
          .sidebar,
          [class*="header"],
          [class*="Header"],
          [class*="navbar"],
          [class*="Navbar"] {
            display: none !important;
          }
          /* Hide main layout wrapper margins */
          main {
            margin: 0 !important;
            padding: 0 !important;
          }
          /* Hide print button and other UI elements */
          .print\\:hidden,
          button,
          .btn,
          [role="button"] {
            display: none !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          /* Receipt container padding for print */
          .bg-white[style*="width: 210mm"] {
            margin: 0 auto !important;
            padding: 15mm 20mm !important;
            width: 100% !important;
            max-width: 100% !important;
            box-shadow: none !important;
            min-height: auto !important;
            border: none !important;
          }
          /* Ensure proper spacing */
          .bg-white[style*="width: 210mm"] > * {
            page-break-inside: avoid;
          }
          /* Table styling for print */
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          thead {
            display: table-header-group;
          }
          tfoot {
            display: table-footer-group;
          }
          /* QR Code styling for print */
          img[alt*="QR Code"] {
            width: 120px !important;
            height: 120px !important;
            max-width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}
