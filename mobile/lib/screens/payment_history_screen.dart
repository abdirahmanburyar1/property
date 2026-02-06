import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../providers/payment_provider.dart';

class PaymentHistoryScreen extends StatefulWidget {
  const PaymentHistoryScreen({super.key});

  @override
  State<PaymentHistoryScreen> createState() => _PaymentHistoryScreenState();
}

class _PaymentHistoryScreenState extends State<PaymentHistoryScreen> {
  bool _isLoading = false;
  List<Map<String, dynamic>> _payments = [];
  List<Map<String, dynamic>> _properties = [];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
    });

    final paymentProvider = Provider.of<PaymentProvider>(context, listen: false);

    try {
      final results = await Future.wait([
        paymentProvider.fetchPayments(),
        paymentProvider.fetchProperties(),
      ]);

      setState(() {
        _payments = results[0];
        _properties = results[1];
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading data: $e')),
        );
      }
    }
  }

  Color _getStatusColor(String? status) {
    switch (status?.toUpperCase()) {
      case 'COMPLETED':
        return Colors.green;
      case 'PENDING':
        return Colors.orange;
      case 'FAILED':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Payment History'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadData,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _payments.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.receipt_long, size: 64, color: Colors.grey[400]),
                      const SizedBox(height: 16),
                      Text(
                        'No payments recorded yet',
                        style: TextStyle(fontSize: 16, color: Colors.grey[600]),
                      ),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadData,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _payments.length,
                    itemBuilder: (context, index) {
                      final payment = _payments[index];
                      final amountRaw = payment['amount'] ?? payment['Amount'];
                      final amount = (amountRaw is num) ? amountRaw.toDouble() : (double.tryParse(amountRaw?.toString() ?? '') ?? 0.0);
                      final currency = payment['currency'] ?? payment['Currency'] ?? 'USD';
                      final paymentMethodObj = payment['paymentMethod'] ?? payment['PaymentMethod'];
                      final paymentMethod = paymentMethodObj is Map
                          ? (paymentMethodObj['name'] ?? paymentMethodObj['Name'] ?? 'N/A').toString()
                          : (paymentMethodObj?.toString() ?? 'N/A');
                      final statusObj = payment['status'] ?? payment['Status'];
                      final status = statusObj is Map
                          ? (statusObj['name'] ?? statusObj['Name'] ?? 'UNKNOWN').toString()
                          : (statusObj?.toString() ?? 'UNKNOWN');
                      final receiptNumber = payment['receiptNumber'] ?? payment['ReceiptNumber'] ?? payment['transactionReference'] ?? payment['TransactionReference'] ?? 'N/A';
                      final paymentDateRaw = payment['paymentDate'] ?? payment['PaymentDate'];
                      final paymentDate = paymentDateRaw != null
                          ? DateFormat('dd/MM/yyyy HH:mm')
                              .format(DateTime.parse(paymentDateRaw.toString()))
                          : 'N/A';

                      // Get property details (support both camelCase and PascalCase from API)
                      final propertyId = (payment['propertyId'] ?? payment['PropertyId'])?.toString();
                      final property = _properties.firstWhere(
                        (p) => (p['id'] ?? p['Id'])?.toString() == propertyId,
                        orElse: () => {},
                      );
                      final propertyAddress = property['streetAddress'] ?? property['StreetAddress'] ?? 'Unknown Property';
                      final owner = property['owner'] ?? property['Owner'];
                      final ownerName = owner != null && owner is Map
                          ? (owner['name'] ?? owner['Name'] ?? '').toString()
                          : '';

                      return Card(
                        margin: const EdgeInsets.only(bottom: 12),
                        elevation: 2,
                        child: InkWell(
                          onTap: () => _showPaymentDetails(payment, property),
                          borderRadius: BorderRadius.circular(12),
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            'Receipt #$receiptNumber',
                                            style: const TextStyle(
                                              fontWeight: FontWeight.bold,
                                              fontSize: 16,
                                            ),
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            propertyAddress,
                                            style: TextStyle(
                                              color: Colors.grey[600],
                                              fontSize: 14,
                                            ),
                                          ),
                                          if (ownerName.isNotEmpty)
                                            Text(
                                              'Owner: $ownerName',
                                              style: TextStyle(
                                                color: Colors.grey[500],
                                                fontSize: 12,
                                              ),
                                            ),
                                        ],
                                      ),
                                    ),
                                    Column(
                                      crossAxisAlignment: CrossAxisAlignment.end,
                                      children: [
                                        Text(
                                          '$currency ${amount.toStringAsFixed(2)}',
                                          style: const TextStyle(
                                            fontWeight: FontWeight.bold,
                                            fontSize: 18,
                                            color: Colors.green,
                                          ),
                                        ),
                                        Container(
                                          padding: const EdgeInsets.symmetric(
                                            horizontal: 8,
                                            vertical: 4,
                                          ),
                                          decoration: BoxDecoration(
                                            color: _getStatusColor(status).withOpacity(0.2),
                                            borderRadius: BorderRadius.circular(12),
                                          ),
                                          child: Text(
                                            status,
                                            style: TextStyle(
                                              color: _getStatusColor(status),
                                              fontSize: 12,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                                const Divider(height: 24),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Row(
                                      children: [
                                        Icon(Icons.calendar_today, size: 16, color: Colors.grey[600]),
                                        const SizedBox(width: 4),
                                        Text(
                                          paymentDate,
                                          style: TextStyle(color: Colors.grey[600], fontSize: 12),
                                        ),
                                      ],
                                    ),
                                    Row(
                                      children: [
                                        Icon(Icons.payment, size: 16, color: Colors.grey[600]),
                                        const SizedBox(width: 4),
                                        Text(
                                          paymentMethod.replaceAll('_', ' '),
                                          style: TextStyle(color: Colors.grey[600], fontSize: 12),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
    );
  }

  void _showPaymentDetails(Map<String, dynamic> payment, Map<String, dynamic> property) {
    final amountRaw = payment['amount'] ?? payment['Amount'];
    final amount = (amountRaw is num) ? amountRaw.toDouble() : (double.tryParse(amountRaw?.toString() ?? '') ?? 0.0);
    final currency = payment['currency'] ?? payment['Currency'] ?? 'USD';
    final paymentMethodObj = payment['paymentMethod'] ?? payment['PaymentMethod'];
    final paymentMethod = paymentMethodObj is Map
        ? (paymentMethodObj['name'] ?? paymentMethodObj['Name'] ?? 'N/A').toString()
        : (paymentMethodObj?.toString() ?? 'N/A');
    final statusObj = payment['status'] ?? payment['Status'];
    final status = statusObj is Map
        ? (statusObj['name'] ?? statusObj['Name'] ?? 'UNKNOWN').toString()
        : (statusObj?.toString() ?? 'UNKNOWN');
    final receiptNumber = payment['receiptNumber'] ?? payment['ReceiptNumber'] ?? payment['transactionReference'] ?? payment['TransactionReference'] ?? 'N/A';
    final notes = payment['notes'] ?? payment['Notes'] ?? '';
    final paymentDateRaw = payment['paymentDate'] ?? payment['PaymentDate'];
    final paymentDate = paymentDateRaw != null
        ? DateFormat('dd/MM/yyyy HH:mm').format(DateTime.parse(paymentDateRaw.toString()))
        : 'N/A';

    final propertyAddress = property['streetAddress'] ?? property['StreetAddress'] ?? 'Unknown Property';
    final owner = property['owner'] ?? property['Owner'];
    final ownerName = owner != null && owner is Map ? (owner['name'] ?? owner['Name'] ?? 'N/A').toString() : 'N/A';
    final ownerPhone = owner != null && owner is Map ? (owner['phone'] ?? owner['Phone'] ?? 'N/A').toString() : 'N/A';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.7,
        minChildSize: 0.5,
        maxChildSize: 0.9,
        expand: false,
        builder: (context, scrollController) => SingleChildScrollView(
          controller: scrollController,
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey[300],
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 24),
              const Text(
                'Payment Details',
                style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 24),
              _DetailRow('Receipt Number', receiptNumber),
              _DetailRow('Amount', '$currency ${amount.toStringAsFixed(2)}'),
              _DetailRow('Payment Method', paymentMethod.replaceAll('_', ' ')),
              _DetailRow('Status', status),
              _DetailRow('Payment Date', paymentDate),
              if (notes.isNotEmpty) _DetailRow('Notes', notes),
              const Divider(height: 32),
              const Text(
                'Property Details',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 16),
              _DetailRow('Address', propertyAddress),
              _DetailRow('Owner Name', ownerName),
              _DetailRow('Owner Phone', ownerPhone),
            ],
          ),
        ),
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  final String label;
  final String value;

  const _DetailRow(this.label, this.value);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              label,
              style: TextStyle(
                color: Colors.grey[600],
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }
}
