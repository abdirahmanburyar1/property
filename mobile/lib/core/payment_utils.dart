/// Helpers to read payment and property data from API responses.
/// Backend returns PascalCase (Amount, Property, etc.); we support both casings.

/// Returns payment amount as double. Handles amount/Amount and int/double/string.
double paymentAmount(Map<String, dynamic> payment) {
  final raw = payment['amount'] ?? payment['Amount'];
  if (raw == null) return 0.0;
  if (raw is num) return raw.toDouble();
  return double.tryParse(raw.toString()) ?? 0.0;
}

/// Returns currency string.
String paymentCurrency(Map<String, dynamic> payment) {
  return payment['currency'] ?? payment['Currency'] ?? 'USD';
}

/// Returns the property map from a payment (property or Property).
Map<String, dynamic>? paymentProperty(Map<String, dynamic> payment) {
  final p = payment['property'] ?? payment['Property'];
  if (p is Map<String, dynamic>) return p;
  return null;
}

/// Expected total from property (price * area). Uses PropertyType.Price and Property.AreaSize (both casings).
double propertyExpectedAmount(Map<String, dynamic>? property) {
  if (property == null) return 0.0;
  final pt = property['propertyType'] ?? property['PropertyType'];
  if (pt is! Map) return 0.0;
  final price = (pt['price'] ?? pt['Price'] ?? 0);
  final area = (property['areaSize'] ?? property['AreaSize'] ?? 0);
  return ((price is num ? price.toDouble() : double.tryParse(price.toString()) ?? 0) *
      (area is num ? area.toDouble() : double.tryParse(area.toString()) ?? 0));
}

/// Paid amount from property (paidAmount or PaidAmount).
double propertyPaidAmount(Map<String, dynamic>? property) {
  if (property == null) return 0.0;
  final raw = property['paidAmount'] ?? property['PaidAmount'];
  if (raw == null) return 0.0;
  if (raw is num) return raw.toDouble();
  return double.tryParse(raw.toString()) ?? 0.0;
}

/// Discount amount from payment.
double paymentDiscountAmount(Map<String, dynamic> payment) {
  final raw = payment['discountAmount'] ?? payment['DiscountAmount'];
  if (raw == null) return 0.0;
  if (raw is num) return raw.toDouble();
  return double.tryParse(raw.toString()) ?? 0.0;
}

/// Whether payment is exempt.
bool paymentIsExempt(Map<String, dynamic> payment) {
  return payment['isExempt'] == true || payment['IsExempt'] == true;
}

/// Remaining amount: expected - paid - discount; 0 if exempt.
double paymentRemainingAmount(Map<String, dynamic> payment) {
  if (paymentIsExempt(payment)) return 0.0;
  final property = paymentProperty(payment);
  final expected = propertyExpectedAmount(property);
  final paid = propertyPaidAmount(property);
  final discount = paymentDiscountAmount(payment);
  final remaining = expected - paid - discount;
  return remaining < 0 ? 0.0 : remaining;
}

/// Property ID from payment (for lookup).
String? paymentPropertyId(Map<String, dynamic> payment) {
  final id = payment['propertyId'] ?? payment['PropertyId'];
  if (id == null) {
    final prop = paymentProperty(payment);
    if (prop != null) return (prop['id'] ?? prop['Id'])?.toString();
    return null;
  }
  return id.toString();
}

/// Payment ID from payment.
String? paymentId(Map<String, dynamic> payment) {
  final id = payment['id'] ?? payment['Id'];
  return id?.toString();
}
