/** Shared content for the property tax notice (used in full page and in modal). */

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
  className?: string;
}

export default function PropertyTaxNoticeContent({ property, className = '' }: PropertyTaxNoticeContentProps) {
  const pt = getNested(property, 'propertyType', 'PropertyType') || {};
  const price = getNested(pt, 'price', 'Price') ?? 0;
  const unit = getNested(pt, 'unit', 'Unit') || 'm';
  const typeName = getNested(pt, 'name', 'Name') || 'N/A';
  const areaSize = property.areaSize ?? property.AreaSize ?? 0;
  const paidAmount = property.paidAmount ?? property.PaidAmount ?? 0;
  const currency = property.currency || 'USD';
  const expectedAmount = price * areaSize;
  const amountDue = Math.max(0, expectedAmount - paidAmount);

  const owner = getNested(property, 'owner', 'Owner') || {};
  const ownerName = getNested(owner, 'name', 'Name') || property.ownerName || 'N/A';
  const ownerPhone = getNested(owner, 'phone', 'Phone') || property.ownerPhone || '';

  return (
    <div id="notice-content" className={`mx-auto max-w-2xl rounded-xl border border-gray-200 bg-white p-8 shadow-sm print:shadow-none print:border print:p-6 ${className}`}>
      <div className="text-center border-b border-gray-200 pb-4 mb-4">
        <h1 className="text-xl font-bold text-gray-900">Gaalkacyo PR</h1>
        <p className="text-sm text-gray-600 mt-1">Dowlada Hoose ee Gaalkacyo</p>
        <h2 className="text-lg font-bold text-gray-900 mt-4 uppercase tracking-wide">
          Ogaysiis — Lacagta ku waajibtay guriga
        </h2>
        <p className="text-sm text-gray-600 mt-1">Notice — Property tax amount due</p>
      </div>

      <div className="space-y-4 text-sm">
        <p className="text-gray-700">
          Waraaqdan waxa uu tusinayaa lacagta canshuurta guriga ee ay ku waajibaan guriga soo socda.
        </p>
        <p className="text-gray-600 italic">
          This notice indicates the property tax amount due for the following property.
        </p>
      </div>

      <div className="mt-6 border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <tbody>
            <tr className="border-b border-gray-100 bg-gray-50">
              <td className="py-2 px-4 font-medium text-gray-500 w-40">Plate / Tibix</td>
              <td className="py-2 px-4 font-semibold">{property.plateNumber || property.PlateNumber || '—'}</td>
            </tr>
            <tr className="border-b border-gray-100">
              <td className="py-2 px-4 font-medium text-gray-500">Address / Ciwaanka</td>
              <td className="py-2 px-4">{property.streetAddress || property.StreetAddress || '—'}</td>
            </tr>
            <tr className="border-b border-gray-100">
              <td className="py-2 px-4 font-medium text-gray-500">Owner / Milkiilaha</td>
              <td className="py-2 px-4">{ownerName}</td>
            </tr>
            {ownerPhone && (
              <tr className="border-b border-gray-100">
                <td className="py-2 px-4 font-medium text-gray-500">Phone / Taleefoon</td>
                <td className="py-2 px-4">{ownerPhone}</td>
              </tr>
            )}
            <tr className="border-b border-gray-100">
              <td className="py-2 px-4 font-medium text-gray-500">Property type / Nooca</td>
              <td className="py-2 px-4">{typeName}</td>
            </tr>
            <tr className="border-b border-gray-100">
              <td className="py-2 px-4 font-medium text-gray-500">Area / Bed</td>
              <td className="py-2 px-4">{areaSize} {unit}</td>
            </tr>
            <tr>
              <td className="py-2 px-4 font-medium text-gray-500">Price per unit</td>
              <td className="py-2 px-4">{currency} {(price as number).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 3 })} / {unit}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="flex justify-between items-baseline text-sm">
          <span className="font-medium text-gray-700">Total expected (waa lacagta wadarta):</span>
          <span className="font-semibold">{currency} {expectedAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        {paidAmount > 0 && (
          <div className="flex justify-between items-baseline text-sm mt-1">
            <span className="font-medium text-gray-700">Already paid (la bixiyay):</span>
            <span className="font-semibold">{currency} {paidAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        )}
        <div className="flex justify-between items-baseline text-base mt-3 pt-3 border-t border-amber-200">
          <span className="font-bold text-gray-900">Amount due (lacagta la bixinayo):</span>
          <span className="font-bold text-amber-800">{currency} {amountDue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      </div>

      <p className="mt-6 text-xs text-gray-500 text-center">
        Waraaqdan waa ogaysiis oo keliya. Receipt (rasid) waxaa la siinayaa marka lacagta la bixiyo.
        <br />
        This is a notice only. A receipt will be issued when payment is made.
      </p>
    </div>
  );
}
