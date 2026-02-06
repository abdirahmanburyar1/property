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
  className?: string;
}

export default function PropertyTaxNoticeContent({ property, year = new Date().getFullYear(), className = '' }: PropertyTaxNoticeContentProps) {
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
  const plate = property.plateNumber || property.PlateNumber || '—';
  const address = property.streetAddress || property.StreetAddress || '—';

  const noticeParagraph = `This is the ${year} property tax notice (Ogaysiis canshuurta guriga ee sannadka ${year}) for the property at ${address} (Plate ${plate}), registered in the name of ${ownerName}${ownerPhone ? ` (${ownerPhone})` : ''}. The total amount due for ${year} is ${currency} ${amountDue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}. Payment should be made to the assigned collector. A receipt will be issued upon payment.`;

  return (
    <div id="notice-content" className={`mx-auto max-w-2xl rounded-xl border border-gray-200 bg-white p-8 shadow-sm print:shadow-none print:border print:p-6 ${className}`}>
      <div className="text-center border-b border-gray-200 pb-4 mb-4">
        <h1 className="text-xl font-bold text-gray-900">Gaalkacyo PR</h1>
        <p className="text-sm text-gray-600 mt-1">Dowlada Hoose ee Gaalkacyo</p>
        <h2 className="text-lg font-bold text-gray-900 mt-4 uppercase tracking-wide">
          Ogaysiis — Lacagta ku waajibtay guriga ({year})
        </h2>
        <p className="text-sm text-gray-600 mt-1">Property tax notice — {year}</p>
      </div>

      <p className="text-sm text-gray-800 leading-relaxed">
        {noticeParagraph}
      </p>

      <div className="mt-6 border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <tbody>
            <tr className="border-b border-gray-100 bg-gray-50">
              <td className="py-2 px-4 font-medium text-gray-500 w-40">Plate / Tibix</td>
              <td className="py-2 px-4 font-semibold">{plate}</td>
            </tr>
            <tr className="border-b border-gray-100">
              <td className="py-2 px-4 font-medium text-gray-500">Address / Ciwaanka</td>
              <td className="py-2 px-4">{address}</td>
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
              <td className="py-2 px-4 font-medium text-gray-500">Amount due ({year})</td>
              <td className="py-2 px-4 font-bold text-amber-800">{currency} {amountDue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="mt-6 text-xs text-gray-500 text-center">
        Waraaqdan waa ogaysiis oo keliya. Receipt (rasid) waxaa la siinayaa marka lacagta la bixiyo. This is a notice only.
      </p>
    </div>
  );
}
