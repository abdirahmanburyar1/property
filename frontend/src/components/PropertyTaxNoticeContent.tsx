/** Shared content for the property tax notice (recurring yearly, one paragraph + details). */

function getNested(obj: any, ...keys: string[]): any {
  if (obj == null) return undefined;
  for (const k of keys) {
    const next = obj[k];
    if (next !== undefined && next !== null) return next;
  }
  return undefined;
}

interface PropertyTaxNoticeContentProps {
  property: any;
  year?: number;
  /** Optional payment for this year – used to show discount/exemption when present */
  paymentForYear?: any;
  /** Compact layout for batch print (3–4 notices per A4) */
  compact?: boolean;
  className?: string;
}

const fmt = (n: number, currency: string) =>
  `${currency} ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function PropertyTaxNoticeContent({ property, year = new Date().getFullYear(), paymentForYear, compact = false, className = '' }: PropertyTaxNoticeContentProps) {
  const pt = getNested(property, 'propertyType', 'PropertyType') || {};
  const price = getNested(pt, 'price', 'Price') ?? 0;
  const areaSize = property.areaSize ?? property.AreaSize ?? 0;
  const paidAmount = property.paidAmount ?? property.PaidAmount ?? 0;
  const currency = property.currency || 'USD';
  const expectedAmount = price * areaSize;
  const amountDue = Math.max(0, expectedAmount - paidAmount);

  const owner = getNested(property, 'owner', 'Owner') || {};
  const ownerName = getNested(owner, 'name', 'Name') || property.ownerName || 'N/A';
  const ownerPhone = getNested(owner, 'phone', 'Phone') || property.ownerPhone || '';
  const plate = property.plateNumber ?? property.PlateNumber ?? '—';
  const address = property.streetAddress ?? property.StreetAddress ?? '—';

  const kontontriye = getNested(property, 'kontontriye', 'Kontontriye');
  const collectorFirst = kontontriye?.firstName ?? kontontriye?.FirstName ?? '';
  const collectorLast = kontontriye?.lastName ?? kontontriye?.LastName ?? '';
  const collectorName = [collectorFirst, collectorLast].filter(Boolean).join(' ') || '—';

  const amountDueStr = fmt(amountDue, currency);
  const phonePart = ownerPhone ? ` (Taleefoon: ${ownerPhone})` : '';

  // Exact clause: only dynamic parts are substituted (year, address, plate, owner, phone, amount due, collector)
  const noticeParagraph = `Waraaqdan waa ogeysiiska canshuurta guriga ee sannadka ${year}. Guriga ciwaankiisu yahay ${address} (Tixraac: ${plate}) waxaa lagu diiwaangeliyay magaca ${ownerName}${phonePart}. Lacagta wadarta ah ee sannadka ${year} ku waajibtay waa ${amountDueStr}. Lacagta waxaad siin kartaa Collector-ka magaciisu yahay: ${collectorName}. Rasiid ayaana lagu siin doonaa marka aad lacagta bixiso.`;

  const discountAmount = paymentForYear?.discountAmount ?? paymentForYear?.DiscountAmount ?? 0;
  const discountReason = paymentForYear?.discountReason ?? paymentForYear?.DiscountReason ?? '';
  const isExempt = paymentForYear?.isExempt ?? paymentForYear?.IsExempt ?? false;
  const exemptionReason = paymentForYear?.exemptionReason ?? paymentForYear?.ExemptionReason ?? '';
  const hasDiscount = typeof discountAmount === 'number' && discountAmount > 0;
  const hasExemption = isExempt || (typeof exemptionReason === 'string' && exemptionReason.trim() !== '');

  const paidStr = paidAmount > 0 ? fmt(paidAmount, currency) : null;
  const discountStr = hasDiscount ? fmt(discountAmount, currency) : null;

  const wrapClass = compact
    ? `mx-auto max-w-2xl rounded-lg border border-gray-200 bg-white p-4 shadow-sm print:shadow-none print:border print:p-3 print:break-inside-avoid ${className}`
    : `mx-auto max-w-2xl rounded-xl border border-gray-200 bg-white p-8 shadow-sm print:shadow-none print:border print:p-6 ${className}`;

  return (
    <div id="notice-content" className={wrapClass}>
      <div className={`text-center border-b border-gray-200 ${compact ? 'pb-2 mb-2' : 'pb-4 mb-4'}`}>
        <h1 className={compact ? 'text-base font-bold text-gray-900' : 'text-xl font-bold text-gray-900'}>Gaalkacyo PR</h1>
        <p className={compact ? 'text-xs text-gray-600 mt-0.5' : 'text-sm text-gray-600 mt-1'}>Dowlada Hoose ee Gaalkacyo</p>
        <h2 className={compact ? 'text-sm font-bold text-gray-900 mt-2 uppercase tracking-wide' : 'text-lg font-bold text-gray-900 mt-4 uppercase tracking-wide'}>
          Ogaysiis — Lacagta ku waajibtay guriga ({year})
        </h2>
        <p className={compact ? 'text-xs text-gray-600 mt-0.5' : 'text-sm text-gray-600 mt-1'}>Ogaysiis canshuurta guriga — {year}</p>
      </div>

      <p className={compact ? 'text-xs text-gray-800 leading-snug' : 'text-sm text-gray-800 leading-relaxed'}>
        {noticeParagraph}
      </p>

      {(paidStr !== null || discountStr !== null || hasExemption) && (
        <div className={compact ? 'mt-2 text-xs text-gray-700 leading-snug space-y-0.5' : 'mt-4 text-sm text-gray-700 leading-relaxed space-y-1'}>
          {paidStr !== null && (
            <p><strong>Lacagta hore loo bixiyey:</strong> {paidStr}</p>
          )}
          {discountStr !== null && (
            <p><strong>Dhimis (discount):</strong> {discountStr}{discountReason ? ` — ${discountReason}` : ''}</p>
          )}
          {hasExemption && (
            <p><strong>Waafaq (exemption):</strong> {exemptionReason?.trim() || 'Waa la waafajiyey.'}</p>
          )}
        </div>
      )}

      <p className={compact ? 'mt-3 text-[10px] text-gray-500 text-center' : 'mt-6 text-xs text-gray-500 text-center'}>
        Waraaqdan waa ogaysiis oo keliya. Rasiid ayaana lagu siin doonaa marka aad lacagta bixiso.
      </p>
    </div>
  );
}
