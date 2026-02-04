import 'package:flutter/material.dart';
import '../widgets/receipt_template.dart';
import '../services/printer_service.dart';
import '../widgets/printer_selection_dialog.dart';

class PaymentReceiptScreen extends StatefulWidget {
  final Map<String, dynamic> paymentData;

  const PaymentReceiptScreen({
    super.key,
    required this.paymentData,
  });

  @override
  State<PaymentReceiptScreen> createState() => _PaymentReceiptScreenState();
}

class _PaymentReceiptScreenState extends State<PaymentReceiptScreen> {
  bool _isPrinting = false;

  @override
  void initState() {
    super.initState();
    // Initialize printer service to load saved printer
    PrinterService.initialize();
  }

  Future<void> _handlePrint(BuildContext context) async {
    // Ensure printer service is initialized and printer is loaded
    await PrinterService.initialize();
    
    // Check if printer is already selected (checks SharedPreferences too)
    final hasPrinter = await PrinterService.hasSelectedPrinter();
    if (!hasPrinter) {
      // Request permissions first
      final hasPermission = await PrinterService.requestPermissions();
      if (!hasPermission) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Bluetooth permissions are required to print'),
              backgroundColor: Colors.red,
            ),
          );
        }
        return;
      }

      // Show printer selection dialog
      final selectedPrinter = await showDialog(
        context: context,
        builder: (context) => const PrinterSelectionDialog(),
      );

      if (selectedPrinter == null) {
        return; // User cancelled
      }
    }

    // Print the receipt
    setState(() {
      _isPrinting = true;
    });

    try {
      final success = await PrinterService.printReceipt(widget.paymentData);
      
      if (mounted) {
        setState(() {
          _isPrinting = false;
        });

        if (success) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(widget.paymentData['isReprint'] ?? false 
                  ? 'Receipt reprinted successfully!' 
                  : 'Receipt printed successfully!'),
              backgroundColor: Colors.green,
            ),
          );
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Failed to print receipt. Please try again.'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isPrinting = false;
        });

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Print error: ${e.toString()}'),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 4),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isReprint = widget.paymentData['isReprint'] ?? false;
    final paymentHistory = widget.paymentData['paymentHistory'] ?? [];
    final paymentDetail = widget.paymentData['paymentDetail'] ?? widget.paymentData;
    
    // For reprints, calculate total from history
    final totalAmount = isReprint && paymentHistory.isNotEmpty
        ? (paymentHistory as List).fold<double>(
            0.0,
            (sum, item) => sum + ((item['amount'] ?? item['Amount'] ?? 0).toDouble()),
          )
        : (paymentDetail['amount'] ?? widget.paymentData['amount'] ?? 0).toDouble();
    
    final currency = paymentDetail['currency'] ?? widget.paymentData['currency'] ?? 
                     (paymentHistory.isNotEmpty ? (paymentHistory[0]['currency'] ?? paymentHistory[0]['Currency'] ?? 'USD') : 'USD');
    final transactionRef = paymentDetail['transactionReference'] ?? 'N/A';
    final installmentNumber = paymentDetail['installmentNumber'] ?? 1;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Payment Receipt'),
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: Column(
        children: [
          // Success Banner
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [Colors.green[600]!, Colors.green[700]!],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
            child: Column(
              children: [
                const Icon(
                  Icons.check_circle,
                  color: Colors.white,
                  size: 64,
                ),
                const SizedBox(height: 12),
                Text(
                  isReprint ? 'Payment Receipt' : 'Payment Successful!',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  '$currency ${totalAmount.toStringAsFixed(2)}',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 32,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  isReprint 
                    ? '${paymentHistory.length} ${paymentHistory.length == 1 ? 'Payment' : 'Payments'}'
                    : 'Installment #$installmentNumber',
                  style: const TextStyle(
                    color: Colors.white70,
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.receipt_long, color: Colors.white, size: 16),
                      const SizedBox(width: 8),
                      Text(
                        transactionRef,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontFamily: 'monospace',
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Receipt Preview
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Card(
                elevation: 4,
                child: Container(
                  padding: const EdgeInsets.all(16),
                  child: ReceiptTemplate(
                    paymentData: widget.paymentData,
                    isPrintPreview: false,
                  ),
                ),
              ),
            ),
          ),

          // Action Buttons
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(
                  color: Colors.grey.withOpacity(0.2),
                  spreadRadius: 1,
                  blurRadius: 5,
                  offset: const Offset(0, -2),
                ),
              ],
            ),
            child: SafeArea(
              child: Row(
                children: [
                  // Print Button
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: _isPrinting ? null : () => _handlePrint(context),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.blue,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      icon: _isPrinting
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                              ),
                            )
                          : const Icon(Icons.print),
                      label: Text(
                        _isPrinting
                            ? 'Printing...'
                            : (isReprint ? 'Reprint Receipt' : 'Print Receipt'),
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  // Done Button
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () => Navigator.of(context).pop(),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.green[600],
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      icon: const Icon(Icons.check),
                      label: const Text(
                        'Done',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
