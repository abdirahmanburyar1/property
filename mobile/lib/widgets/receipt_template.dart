import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

class ReceiptTemplate extends StatelessWidget {
  final Map<String, dynamic> paymentData;
  final bool isPrintPreview;

  const ReceiptTemplate({
    super.key,
    required this.paymentData,
    this.isPrintPreview = false,
  });

  @override
  Widget build(BuildContext context) {
    final isReprint = paymentData['isReprint'] ?? false;
    final paymentHistory = paymentData['paymentHistory'] ?? [];
    final paymentDetail = paymentData['paymentDetail'] ?? paymentData;
    
    // For reprints, use payment history; otherwise use single payment
    final amount = isReprint && paymentHistory.isNotEmpty
        ? (paymentHistory as List).fold<double>(
            0.0,
            (sum, item) => sum + ((item['amount'] ?? item['Amount'] ?? 0).toDouble()),
          )
        : (paymentDetail['amount'] ?? paymentData['amount'] ?? 0).toDouble();
    
    final currency = paymentDetail['currency'] ?? paymentData['currency'] ?? 
                     (paymentHistory.isNotEmpty ? (paymentHistory[0]['currency'] ?? paymentHistory[0]['Currency'] ?? 'USD') : 'USD');
    final transactionRef = paymentDetail['transactionReference'] ?? paymentData['transactionReference'] ?? 'N/A';
    final paymentDate = paymentDetail['paymentDate'] ?? paymentData['paymentDate'];
    final property = paymentData['property'];
    final collector = paymentDetail['collectedBy'] ?? paymentData['collector'];
    final status = paymentDetail['status'] ?? paymentData['status'];
    final discountAmount = (paymentData['discountAmount'] ?? paymentData['DiscountAmount'] ?? paymentDetail['discountAmount'] ?? paymentDetail['DiscountAmount'] ?? 0).toDouble();
    final discountReason = paymentData['discountReason'] ?? paymentData['DiscountReason'] ?? paymentDetail['discountReason'] ?? paymentDetail['DiscountReason'];
    final isExempt = paymentData['isExempt'] == true || paymentData['IsExempt'] == true || paymentDetail['isExempt'] == true || paymentDetail['IsExempt'] == true;
    final exemptionReason = paymentData['exemptionReason'] ?? paymentData['ExemptionReason'] ?? paymentDetail['exemptionReason'] ?? paymentDetail['ExemptionReason'];

    // POS receipt width is typically 58mm or 80mm (we'll design for 58mm - 384 pixels)
    return Container(
      width: isPrintPreview ? 384 : double.infinity,
      color: Colors.white,
      padding: const EdgeInsets.all(16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // Header / Logo Area
          _buildHeader(),
          
          const Divider(thickness: 2, color: Colors.black),
          
          // Receipt Title
          const Text(
            'PAYMENT RECEIPT',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              letterSpacing: 1.2,
            ),
          ),
          const SizedBox(height: 8),
          
          // Transaction Reference
          _buildRow('Ref#:', transactionRef, isBold: true),
          const SizedBox(height: 8),
          
          const Divider(thickness: 1),
          
          // Property Information
          const SizedBox(height: 8),
          const Text(
            'PROPERTY DETAILS',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          
          if (property != null) ...[
            _buildRow('Address:', property['streetAddress'] ?? 'N/A'),
            if (property['city'] != null)
              _buildRow('City:', property['city']),
            if (property['plateNumber'] != null)
              _buildRow('Plate#:', property['plateNumber']),
            if (property['owner'] != null && property['owner']['name'] != null)
              _buildRow('Owner:', property['owner']['name']),
            if (property['owner'] != null && property['owner']['phone'] != null)
              _buildRow('Phone:', property['owner']['phone']),
          ],
          
          const SizedBox(height: 8),
          const Divider(thickness: 1),
          
          // Payment Information
          const SizedBox(height: 8),
          const Text(
            'PAYMENT DETAILS',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          
          if (isReprint && paymentHistory.isNotEmpty) ...[
            // Show payment history for reprints
            const SizedBox(height: 8),
            const Text(
              'PAYMENT HISTORY',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            ...List.generate(paymentHistory.length, (index) {
              final item = paymentHistory[index];
              final itemAmount = (item['amount'] ?? item['Amount'] ?? 0).toDouble();
              final itemDate = item['paymentDate'] ?? item['PaymentDate'];
              final itemRef = item['transactionReference'] ?? item['TransactionReference'] ?? 'N/A';
              return Column(
                children: [
                  _buildRow('#${index + 1}:', '$currency ${itemAmount.toStringAsFixed(2)}', isBold: true),
                  _buildRow('  Date:', _formatDateTime(itemDate)),
                  _buildRow('  Ref:', itemRef),
                  if (index < paymentHistory.length - 1) const SizedBox(height: 4),
                ],
              );
            }),
            const SizedBox(height: 8),
            const Divider(thickness: 1),
            _buildRow('TOTAL PAID:', '$currency ${amount.toStringAsFixed(2)}', isBold: true),
            if (discountAmount > 0) ...[
              _buildRow('Discount:', '$currency ${discountAmount.toStringAsFixed(2)}', isBold: true),
              if (discountReason != null && discountReason.toString().trim().isNotEmpty)
                _buildRow('Reason:', discountReason.toString().trim()),
            ],
            if (isExempt) ...[
              _buildRow('Exemption:', 'Yes', isBold: true),
              if (exemptionReason != null && exemptionReason.toString().trim().isNotEmpty)
                _buildRow('Reason:', exemptionReason.toString().trim()),
            ],
          ] else ...[
            _buildRow('Date:', _formatDateTime(paymentDate)),
            _buildRow('Method:', 'Mobile Money'),
            if (status != null)
              _buildRow('Status:', status['name'] ?? 'N/A'),
            if (discountAmount > 0) ...[
              _buildRow('Discount:', '$currency ${discountAmount.toStringAsFixed(2)}', isBold: true),
              if (discountReason != null && discountReason.toString().trim().isNotEmpty)
                _buildRow('Reason:', discountReason.toString().trim()),
            ],
            if (isExempt) ...[
              _buildRow('Exemption:', 'Yes', isBold: true),
              if (exemptionReason != null && exemptionReason.toString().trim().isNotEmpty)
                _buildRow('Reason:', exemptionReason.toString().trim()),
            ],
          ],
          
          const SizedBox(height: 12),
          const Divider(thickness: 2, color: Colors.black),
          
          // Amount (Large)
          const SizedBox(height: 12),
          const Text(
            'AMOUNT PAID',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            '$currency ${amount.toStringAsFixed(2)}',
            style: const TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.bold,
              letterSpacing: 1.5,
            ),
          ),
          const SizedBox(height: 12),
          
          const Divider(thickness: 2, color: Colors.black),
          
          // Collector Information
          if (collector != null) ...[
            const SizedBox(height: 8),
            _buildRow(
              'Collected by:',
              '${collector['firstName'] ?? ''} ${collector['lastName'] ?? ''}'.trim(),
              isBold: true,
            ),
          ],
          
          const SizedBox(height: 16),
          
          // Footer
          const Divider(thickness: 1),
          const SizedBox(height: 8),
          const Text(
            'Thank you for your payment!',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w500,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          
          // System Info
          Text(
            'Printed: ${_formatDateTime(DateTime.now().toIso8601String())}',
            style: const TextStyle(
              fontSize: 10,
              color: Colors.grey,
            ),
            textAlign: TextAlign.center,
          ),
          
          const SizedBox(height: 8),
          const Text(
            '--- END OF RECEIPT ---',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return Column(
      children: [
        Image.asset(
          'assets/logo.png',
          height: 56,
          fit: BoxFit.contain,
          errorBuilder: (_, __, ___) => const SizedBox.shrink(),
        ),
        const SizedBox(height: 6),
        const Text(
          'Gaalkacyo PR',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            letterSpacing: 1.5,
          ),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 4),
        const Text(
          'Property Management System',
          style: TextStyle(
            fontSize: 12,
          ),
          textAlign: TextAlign.center,
        ),
        SizedBox(height: 4),
        Text(
          'Tel: +252-XXX-XXXXXX',
          style: TextStyle(
            fontSize: 11,
          ),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }

  Widget _buildRow(String label, String value, {bool isBold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: isBold ? FontWeight.bold : FontWeight.normal,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: TextStyle(
                fontSize: 12,
                fontWeight: isBold ? FontWeight.bold : FontWeight.normal,
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _formatDateTime(dynamic date) {
    if (date == null) return 'N/A';
    try {
      final dateTime = DateTime.parse(date.toString());
      return DateFormat('dd/MM/yyyy HH:mm').format(dateTime);
    } catch (e) {
      return date.toString();
    }
  }
}

// ESC/POS Commands for thermal printers
class ESCPOSCommands {
  // Common ESC/POS commands
  static const String ESC = '\x1B';
  static const String GS = '\x1D';
  static const String LF = '\x0A';
  static const String CR = '\x0D';
  
  // Initialize printer
  static String initialize() => '$ESC@';
  
  // Text alignment
  static String alignLeft() => '${ESC}a\x00';
  static String alignCenter() => '${ESC}a\x01';
  static String alignRight() => '${ESC}a\x02';
  
  // Text formatting
  static String bold(bool enable) => enable ? '${ESC}E\x01' : '${ESC}E\x00';
  static String doubleWidth(bool enable) => enable ? '$GS!\x10' : '$GS!\x00';
  static String doubleHeight(bool enable) => enable ? '$GS!\x01' : '$GS!\x00';
  static String doubleSize(bool enable) => enable ? '$GS!\x11' : '$GS!\x00';
  
  // Line feed
  static String lineFeed([int lines = 1]) => LF * lines;
  
  // Cut paper
  static String cutPaper() => '${GS}V\x00';
  
  // Underline
  static String underline(bool enable) => enable ? '${ESC}-\x01' : '${ESC}-\x00';
  
  // Font size
  static String fontSize(int size) {
    // size: 0 = normal, 1 = double height, 2 = double width, 3 = double both
    return '$GS!${String.fromCharCode(size)}';
  }
}

// Helper class to generate printable text for POS printer
class ReceiptPrintData {
  static String generatePrintData(Map<String, dynamic> paymentData) {
    final isReprint = paymentData['isReprint'] ?? false;
    final paymentHistory = paymentData['paymentHistory'] ?? [];
    final paymentDetail = paymentData['paymentDetail'] ?? paymentData;
    
    // Calculate total amount
    final totalAmount = isReprint && paymentHistory.isNotEmpty
        ? (paymentHistory as List).fold<double>(
            0.0,
            (sum, item) => sum + ((item['amount'] ?? item['Amount'] ?? 0).toDouble()),
          )
        : (paymentDetail['amount'] ?? paymentData['amount'] ?? 0).toDouble();
    
    final currency = paymentDetail['currency'] ?? paymentData['currency'] ?? 
                     (paymentHistory.isNotEmpty ? (paymentHistory[0]['currency'] ?? paymentHistory[0]['Currency'] ?? 'USD') : 'USD');
    final transactionRef = paymentDetail['transactionReference'] ?? paymentData['transactionReference'] ?? 'N/A';
    final paymentDate = paymentDetail['paymentDate'] ?? paymentData['paymentDate'];
    final property = paymentData['property'];
    final collector = paymentDetail['collectedBy'] ?? paymentData['collector'] ?? paymentDetail['collector'];
    final status = paymentDetail['status'] ?? paymentData['status'];
    final discountAmount = (paymentData['discountAmount'] ?? paymentData['DiscountAmount'] ?? paymentDetail['discountAmount'] ?? paymentDetail['DiscountAmount'] ?? 0).toDouble();
    final discountReason = paymentData['discountReason'] ?? paymentData['DiscountReason'] ?? paymentDetail['discountReason'] ?? paymentDetail['DiscountReason'];
    final isExempt = paymentData['isExempt'] == true || paymentData['IsExempt'] == true || paymentDetail['isExempt'] == true || paymentDetail['IsExempt'] == true;
    final exemptionReason = paymentData['exemptionReason'] ?? paymentData['ExemptionReason'] ?? paymentDetail['exemptionReason'] ?? paymentDetail['ExemptionReason'];
    
    StringBuffer buffer = StringBuffer();
    
    // Initialize printer
    buffer.write(ESCPOSCommands.initialize());
    
    // Header
    buffer.write(ESCPOSCommands.alignCenter());
    buffer.write(ESCPOSCommands.bold(true));
    buffer.write('GALKACYO PROPERTY\n');
    buffer.write(ESCPOSCommands.bold(false));
    buffer.write('Property Management System\n');
    buffer.write('Tel: +252-XXX-XXXXXX\n');
    buffer.write(ESCPOSCommands.lineFeed());
    
    buffer.write('--------------------------------\n');
    
    // Receipt Title
    buffer.write(ESCPOSCommands.bold(true));
    buffer.write(ESCPOSCommands.doubleWidth(true));
    buffer.write('PAYMENT RECEIPT\n');
    buffer.write(ESCPOSCommands.doubleWidth(false));
    buffer.write(ESCPOSCommands.bold(false));
    buffer.write(ESCPOSCommands.lineFeed());
    
    // Transaction Ref
    buffer.write(ESCPOSCommands.alignLeft());
    buffer.write('Ref#: $transactionRef\n');
    buffer.write('--------------------------------\n');
    buffer.write(ESCPOSCommands.lineFeed());
    
    // Property Details
    buffer.write(ESCPOSCommands.bold(true));
    buffer.write('PROPERTY DETAILS\n');
    buffer.write(ESCPOSCommands.bold(false));
    
    if (property != null) {
      if (property['streetAddress'] != null)
        buffer.write('Address: ${property['streetAddress']}\n');
      if (property['city'] != null)
        buffer.write('City: ${property['city']}\n');
      if (property['plateNumber'] != null)
        buffer.write('Plate#: ${property['plateNumber']}\n');
      final owner = property['owner'] ?? property['Owner'];
      if (owner != null) {
        final ownerName = owner['name'] ?? owner['Name'] ?? 
                         '${owner['firstName'] ?? owner['FirstName'] ?? ''} ${owner['lastName'] ?? owner['LastName'] ?? ''}'.trim();
        if (ownerName.isNotEmpty)
          buffer.write('Owner: $ownerName\n');
        final ownerPhone = owner['phone'] ?? owner['Phone'] ?? owner['phoneNumber'] ?? owner['PhoneNumber'];
        if (ownerPhone != null)
          buffer.write('Phone: $ownerPhone\n');
      }
    }
    
    buffer.write('--------------------------------\n');
    buffer.write(ESCPOSCommands.lineFeed());
    
    // Payment Details
    buffer.write(ESCPOSCommands.bold(true));
    buffer.write('PAYMENT DETAILS\n');
    buffer.write(ESCPOSCommands.bold(false));
    
    if (isReprint && paymentHistory.isNotEmpty) {
      // Show payment history for reprints
      buffer.write(ESCPOSCommands.bold(true));
      buffer.write('PAYMENT HISTORY\n');
      buffer.write(ESCPOSCommands.bold(false));
      
      for (int i = 0; i < paymentHistory.length; i++) {
        final item = paymentHistory[i];
        final itemAmount = (item['amount'] ?? item['Amount'] ?? 0).toDouble();
        final itemDate = item['paymentDate'] ?? item['PaymentDate'];
        final itemRef = item['transactionReference'] ?? item['TransactionReference'] ?? 'N/A';
        
        buffer.write('#${i + 1}: $currency ${itemAmount.toStringAsFixed(2)}\n');
        buffer.write('  Date: ${_formatDateTime(itemDate)}\n');
        buffer.write('  Ref: $itemRef\n');
        if (i < paymentHistory.length - 1) {
          buffer.write(ESCPOSCommands.lineFeed());
        }
      }
      
      buffer.write('--------------------------------\n');
      buffer.write(ESCPOSCommands.bold(true));
      buffer.write('TOTAL PAID: $currency ${totalAmount.toStringAsFixed(2)}\n');
      buffer.write(ESCPOSCommands.bold(false));
      if (discountAmount > 0) {
        buffer.write('Discount: $currency ${discountAmount.toStringAsFixed(2)}\n');
        if (discountReason != null && discountReason.toString().trim().isNotEmpty) {
          buffer.write('Reason: ${discountReason.toString().trim()}\n');
        }
      }
      if (isExempt) {
        buffer.write('Exemption: Yes\n');
        if (exemptionReason != null && exemptionReason.toString().trim().isNotEmpty) {
          buffer.write('Reason: ${exemptionReason.toString().trim()}\n');
        }
      }
    } else {
      buffer.write('Date: ${_formatDateTime(paymentDate)}\n');
      buffer.write('Method: Mobile Money\n');
      if (status != null) {
        final statusName = status['name'] ?? status['Name'] ?? 'N/A';
        buffer.write('Status: $statusName\n');
      }
      if (discountAmount > 0) {
        buffer.write(ESCPOSCommands.bold(true));
        buffer.write('Discount: $currency ${discountAmount.toStringAsFixed(2)}\n');
        buffer.write(ESCPOSCommands.bold(false));
        if (discountReason != null && discountReason.toString().trim().isNotEmpty) {
          buffer.write('Reason: ${discountReason.toString().trim()}\n');
        }
      }
      if (isExempt) {
        buffer.write(ESCPOSCommands.bold(true));
        buffer.write('Exemption: Yes\n');
        buffer.write(ESCPOSCommands.bold(false));
        if (exemptionReason != null && exemptionReason.toString().trim().isNotEmpty) {
          buffer.write('Reason: ${exemptionReason.toString().trim()}\n');
        }
      }
    }
    
    buffer.write(ESCPOSCommands.lineFeed());
    buffer.write('================================\n');
    
    // Amount (Large and centered)
    buffer.write(ESCPOSCommands.alignCenter());
    buffer.write('TOTAL AMOUNT\n');
    buffer.write(ESCPOSCommands.bold(true));
    buffer.write(ESCPOSCommands.doubleSize(true));
    buffer.write('$currency ${totalAmount.toStringAsFixed(2)}\n');
    buffer.write(ESCPOSCommands.doubleSize(false));
    buffer.write(ESCPOSCommands.bold(false));
    buffer.write('================================\n');
    buffer.write(ESCPOSCommands.lineFeed());
    
    // Collector
    buffer.write(ESCPOSCommands.alignLeft());
    if (collector != null) {
      final collectorName = '${collector['firstName'] ?? collector['FirstName'] ?? ''} ${collector['lastName'] ?? collector['LastName'] ?? ''}'.trim();
      if (collectorName.isNotEmpty) {
        buffer.write('Collected by: $collectorName\n');
      }
    }
    
    buffer.write(ESCPOSCommands.lineFeed(2));
    
    // Footer
    buffer.write(ESCPOSCommands.alignCenter());
    buffer.write('--------------------------------\n');
    buffer.write('Thank you for your payment!\n');
    buffer.write(ESCPOSCommands.lineFeed());
    buffer.write('Printed: ${_formatDateTime(DateTime.now().toIso8601String())}\n');
    buffer.write(ESCPOSCommands.lineFeed());
    buffer.write(ESCPOSCommands.bold(true));
    buffer.write('--- END OF RECEIPT ---\n');
    buffer.write(ESCPOSCommands.bold(false));
    buffer.write(ESCPOSCommands.lineFeed(3));
    
    // Cut paper
    buffer.write(ESCPOSCommands.cutPaper());
    
    return buffer.toString();
  }
  
  static String _formatDateTime(dynamic date) {
    if (date == null) return 'N/A';
    try {
      final dateTime = DateTime.parse(date.toString());
      return DateFormat('dd/MM/yyyy HH:mm').format(dateTime);
    } catch (e) {
      return date.toString();
    }
  }
}
