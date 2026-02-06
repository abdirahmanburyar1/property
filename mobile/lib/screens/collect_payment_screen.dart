import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:shimmer/shimmer.dart';
import 'package:dio/dio.dart';
import '../core/payment_utils.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import 'payment_receipt_screen.dart';

class CollectPaymentScreen extends StatefulWidget {
  const CollectPaymentScreen({super.key});

  @override
  State<CollectPaymentScreen> createState() => _CollectPaymentScreenState();
}

class _CollectPaymentScreenState extends State<CollectPaymentScreen> {
  List<Map<String, dynamic>> _pendingPayments = [];
  bool _isLoading = false;
  bool _isSearching = false;
  String? _collectingPaymentId;
  String _searchQuery = '';
  String _filterType = 'pending'; // 'pending' or 'all'
  
  int _currentPage = 1;
  final int _pageSize = 20;
  int _totalCount = 0;
  bool _hasMore = true;

  final ScrollController _scrollController = ScrollController();
  final TextEditingController _searchController = TextEditingController();
  Timer? _debounceTimer;

  @override
  void initState() {
    super.initState();
    _loadPendingPayments();
    _scrollController.addListener(_onScroll);
    _searchController.addListener(_onSearchChanged);
  }

  @override
  void dispose() {
    _scrollController.dispose();
    _searchController.dispose();
    _debounceTimer?.cancel();
    super.dispose();
  }

  void _onSearchChanged() {
    // Cancel previous timer
    _debounceTimer?.cancel();
    
    // Set new timer for debouncing (500ms delay)
    _debounceTimer = Timer(const Duration(milliseconds: 500), () {
      if (_searchController.text != _searchQuery) {
        setState(() {
          _searchQuery = _searchController.text;
        });
        _searchPayments();
      }
    });
  }

  Future<void> _searchPayments() async {
    // Reset pagination when searching
    setState(() {
      _currentPage = 1;
      _hasMore = true;
    });
    
    await _loadPendingPayments(refresh: true);
  }

  void _onScroll() {
    if (_scrollController.position.pixels >= _scrollController.position.maxScrollExtent * 0.8) {
      if (!_isLoading && _hasMore) {
        _loadMorePayments();
      }
    }
  }

  Future<void> _loadPendingPayments({bool refresh = false}) async {
    if (refresh) {
      setState(() {
        _pendingPayments = [];
        _currentPage = 1;
        _hasMore = true;
      });
    }

    setState(() {
      _isLoading = true;
      _isSearching = _searchQuery.isNotEmpty;
    });

    try {
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      final userId = authProvider.user?['id'];

      if (userId == null) {
        throw Exception('User not authenticated');
      }

      print('=== LOADING PENDING PAYMENTS ===');
      print('Kontontriye ID: $userId');
      print('Page: $_currentPage, Size: $_pageSize');
      print('Search Query: "$_searchQuery"');

      // Build query parameters
      final Map<String, String> queryParams = {
        'kontontriyeId': userId.toString(),
        'page': _currentPage.toString(),
        'pageSize': _pageSize.toString(),
      };

      // Add search query if present
      if (_searchQuery.isNotEmpty) {
        queryParams['search'] = _searchQuery;
      }

      // Use different endpoint based on filter type
      final endpoint = _filterType == 'pending' ? '/payments/pending' : '/payments';
      
      final response = await ApiService.get(
        endpoint,
        queryParameters: queryParams,
      );

      if (response.statusCode == 200) {
        final data = response.data as Map<String, dynamic>?;
        final List<dynamic> newPayments = data?['data'] ?? [];
        final tc = data?['totalCount'] ?? data?['TotalCount'];
        _totalCount = tc is int ? tc : (tc != null ? (int.tryParse(tc.toString()) ?? 0) : 0);

        setState(() {
          if (refresh) {
            _pendingPayments = List<Map<String, dynamic>>.from(newPayments);
          } else {
            _pendingPayments.addAll(List<Map<String, dynamic>>.from(newPayments));
          }
          _hasMore = _pendingPayments.length < _totalCount;
          _isLoading = false;
          _isSearching = false;
        });

        print('Loaded ${newPayments.length} pending payments. Total: ${_pendingPayments.length}/$_totalCount');
      }
    } catch (e) {
      print('Error loading pending payments: $e');
      setState(() {
        _isLoading = false;
        _isSearching = false;
      });
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to load pending payments: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _loadMorePayments() async {
    if (_isLoading || !_hasMore) return;
    
    setState(() => _currentPage++);
    await _loadPendingPayments();
  }

  Future<void> _collectPayment(Map<String, dynamic> payment) async {
    final pid = paymentId(payment);
    final propertyId = paymentPropertyId(payment);
    final requestedAmount = paymentAmount(payment);
    
    setState(() {
      _collectingPaymentId = pid;
    });

    try {
      print('=== COLLECTING PAYMENT (NEW SYSTEM) ===');
      print('Payment ID: $pid');
      print('Property ID: $propertyId');
      print('Requested Amount: $requestedAmount');
      
      // Get property information to calculate remaining balance
      double remainingBalance = requestedAmount;
      double finalAmount = requestedAmount;
      
      if (propertyId != null) {
        try {
          final propertyResponse = await ApiService.get('/properties/$propertyId');
          if (propertyResponse.statusCode == 200) {
            final property = propertyResponse.data;
            final propertyType = property['propertyType'] ?? property['PropertyType'];
            final expectedAmount = ((propertyType?['price'] ?? propertyType?['Price'] ?? 0) * (property['areaSize'] ?? property['AreaSize'] ?? 0)).toDouble();
            final paidAmount = (property['paidAmount'] ?? property['PaidAmount'] ?? 0).toDouble();
            final discountAmount = (payment['discountAmount'] ?? payment['DiscountAmount'] ?? 0).toDouble();
            final isExempt = payment['isExempt'] == true || payment['IsExempt'] == true;
            // Expected = collected + discount + exemption; remaining = expected - paid - discount (0 if exempt)
            if (isExempt) {
              remainingBalance = 0;
            } else {
              remainingBalance = expectedAmount - paidAmount - discountAmount;
              if (remainingBalance < 0) remainingBalance = 0;
            }
            
            print('Expected Amount: $expectedAmount');
            print('Paid Amount: $paidAmount');
            print('Discount: $discountAmount, Exempt: $isExempt');
            print('Remaining Balance: $remainingBalance');
            
            // Don't allow collecting for payment already done (no remaining); don't allow collecting discount
            if (remainingBalance <= 0) {
              throw Exception('No remaining balance to collect (payment already accounted for)');
            }
            // Cap amount to remaining balance
            if (requestedAmount > remainingBalance) {
              finalAmount = remainingBalance;
              print('⚠️ Amount capped from $requestedAmount to $remainingBalance');
              
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('Amount adjusted to remaining balance: ${paymentCurrency(payment)} ${finalAmount.toStringAsFixed(2)}'),
                    backgroundColor: Colors.blue,
                    duration: const Duration(seconds: 3),
                  ),
                );
              }
            }
          }
        } catch (e) {
          print('Warning: Could not fetch property info: $e');
          // Continue with requested amount if property fetch fails
        }
      }
      
      // Get default payment method (Mobile Money)
      final paymentMethodsResponse = await ApiService.get('/paymentmethods');
      String? mobileMoneyId;
      
      if (paymentMethodsResponse.statusCode == 200) {
        final methods = paymentMethodsResponse.data as List<dynamic>;
        final mobileMoney = methods.firstWhere(
          (m) {
            final code = m['code'] ?? m['Code'];
            final name = (m['name'] ?? m['Name'])?.toString().toLowerCase() ?? '';
            return code == 'MOBILE_MONEY' || name.contains('mobile');
          },
          orElse: () => methods.isNotEmpty ? methods.first : null,
        );
        mobileMoneyId = (mobileMoney?['id'] ?? mobileMoney?['Id'])?.toString();
      }

      if (mobileMoneyId == null) {
        throw Exception('No payment method found');
      }

      print('Final Amount to Collect: $finalAmount');

      // Create payment detail record with capped amount
      final response = await ApiService.post(
        '/paymentdetails',
        data: {
          'propertyId': propertyId,
          'paymentId': pid,
          'paymentMethodId': mobileMoneyId,
          'amount': finalAmount,
          'currency': paymentCurrency(payment),
          'paymentDate': DateTime.now().toIso8601String(),
        },
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        print('=== PAYMENT COLLECTED SUCCESSFULLY ===');
        print('Response: ${response.data}');
        
        if (mounted) {
          // Merge the response with the original payment data
          final responseData = response.data is Map<String, dynamic> 
              ? response.data as Map<String, dynamic>
              : {};
              
          final fullData = Map<String, dynamic>.from({
            ...payment,
            ...responseData,
            'paymentDetail': responseData,
          });
          
          // Navigate to receipt screen instead of showing dialog
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => PaymentReceiptScreen(paymentData: fullData),
            ),
          ).then((_) {
            // Refresh the payment list after returning from receipt screen
            _loadPendingPayments(refresh: true);
          });
        }
      } else {
        print('=== PAYMENT FAILED ===');
        print('Status Code: ${response.statusCode}');
        print('Response: ${response.data}');
        throw Exception('Failed to collect payment: ${response.statusCode} - ${response.data}');
      }
    } catch (e, stackTrace) {
      print('=== ERROR COLLECTING PAYMENT ===');
      print('Error: $e');
      print('Stack trace: $stackTrace');
      
      if (mounted) {
        String errorMessage = 'Failed to collect payment';
        String? detailedMessage;
        
        // Try to extract error message from DioException
        if (e is DioException) {
          print('DioException detected');
          print('Response status: ${e.response?.statusCode}');
          print('Response data: ${e.response?.data}');
          
          // Extract message from response data
          if (e.response?.data != null) {
            try {
              final responseData = e.response!.data;
              if (responseData is Map<String, dynamic>) {
                detailedMessage = responseData['message'] as String?;
                if (detailedMessage != null) {
                  errorMessage = detailedMessage;
                }
              } else if (responseData is String) {
                // Try to parse JSON string
                try {
                  final parsed = responseData as Map<String, dynamic>;
                  detailedMessage = parsed['message'] as String?;
                  if (detailedMessage != null) {
                    errorMessage = detailedMessage;
                  }
                } catch (_) {
                  detailedMessage = responseData;
                  errorMessage = responseData;
                }
              }
            } catch (parseError) {
              print('Error parsing response: $parseError');
            }
          }
          
          // Fallback to status code message
          if (detailedMessage == null) {
            if (e.response?.statusCode == 400) {
              errorMessage = 'Invalid payment amount. Please check the remaining balance.';
            } else if (e.response?.statusCode == 404) {
              errorMessage = 'Payment or property not found.';
            } else if (e.response?.statusCode == 401) {
              errorMessage = 'Authentication required.';
            } else {
              errorMessage = e.message ?? 'Failed to collect payment';
            }
          }
        } else {
          errorMessage = e.toString();
        }
        
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(errorMessage),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 5),
            action: SnackBarAction(
              label: 'Details',
              textColor: Colors.white,
              onPressed: () {
                showDialog(
                  context: context,
                  builder: (context) => AlertDialog(
                    title: const Text('Error Details'),
                    content: SingleChildScrollView(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (detailedMessage != null && detailedMessage != errorMessage) ...[
                            const Text(
                              'Error Message:',
                              style: TextStyle(fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 4),
                            Text(detailedMessage),
                            const SizedBox(height: 16),
                          ],
                          const Text(
                            'Full Error:',
                            style: TextStyle(fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            e.toString(),
                            style: const TextStyle(fontSize: 12),
                          ),
                        ],
                      ),
                    ),
                    actions: [
                      TextButton(
                        onPressed: () => Navigator.pop(context),
                        child: const Text('Close'),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _collectingPaymentId = null;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Collect Payment'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => _loadPendingPayments(refresh: true),
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    // Only show skeleton on initial load (no search query)
    if (_isLoading && _pendingPayments.isEmpty && _searchQuery.isEmpty) {
      return _buildSkeletonLoader();
    }

    return Column(
      children: [
        // Search Bar
        Container(
          padding: const EdgeInsets.all(16),
          color: Colors.white,
          child: TextField(
            controller: _searchController,
            decoration: InputDecoration(
              hintText: 'Search by plate number, owner name, phone...',
              hintStyle: TextStyle(color: Colors.grey[400], fontSize: 14),
              prefixIcon: Icon(Icons.search, color: Colors.grey[600]),
              suffixIcon: _searchController.text.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear, size: 20),
                      onPressed: () {
                        _searchController.clear();
                        setState(() {
                          _searchQuery = '';
                        });
                        _searchPayments();
                      },
                    )
                  : _isSearching
                      ? const Padding(
                          padding: EdgeInsets.all(12.0),
                          child: SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          ),
                        )
                      : null,
              filled: true,
              fillColor: Colors.grey[100],
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide.none,
              ),
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            ),
          ),
        ),
        
        // Filter Tabs
        Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          color: Colors.white,
          child: Row(
            children: [
              Expanded(
                child: _buildFilterTab('Pending', 'pending', Icons.pending),
              ),
              Expanded(
                child: _buildFilterTab('All Payments', 'all', Icons.receipt_long),
              ),
            ],
          ),
        ),
        
        // Summary Banner
        Container(
          padding: const EdgeInsets.all(16),
          color: Colors.blue[50],
          child: Row(
            children: [
              Icon(Icons.info_outline, color: Colors.blue[700]),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _searchQuery.isEmpty
                          ? '${_filterType == 'pending' ? _displayedPayments.length : _totalCount} ${_filterType == 'pending' ? 'Pending' : ''} ${(_filterType == 'pending' ? _displayedPayments.length : _totalCount) == 1 ? 'Payment' : 'Payments'}'
                          : '$_totalCount ${_totalCount == 1 ? 'Payment' : 'Payments'} Found',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: Colors.blue[900],
                      ),
                    ),
                    Text(
                      _searchQuery.isEmpty
                          ? (_filterType == 'pending' 
                              ? 'Tap any payment to collect'
                              : 'Tap any payment to view receipt')
                          : 'Search: "$_searchQuery"',
                      style: TextStyle(fontSize: 12, color: Colors.blue[700]),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        
        // Payments List
        Expanded(
          child: _isLoading && _searchQuery.isNotEmpty
              // Show skeleton while searching
              ? _buildPaymentCardsSkeletonList()
              : _displayedPayments.isEmpty
                  ? Center(
                      child: Padding(
                        padding: const EdgeInsets.all(32.0),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              _searchQuery.isEmpty ? Icons.check_circle_outline : Icons.search_off,
                              size: 64,
                              color: Colors.grey[400],
                            ),
                            const SizedBox(height: 16),
                            Text(
                              _searchQuery.isEmpty ? 'No pending payments' : 'No payments found',
                              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              _searchQuery.isEmpty
                                  ? 'All payments for your properties have been collected!'
                                  : 'Try adjusting your search criteria',
                              style: TextStyle(color: Colors.grey[600]),
                              textAlign: TextAlign.center,
                            ),
                          ],
                        ),
                      ),
                    )
                  : ListView.builder(
                  controller: _scrollController,
                  padding: const EdgeInsets.all(16),
                  itemCount: _displayedPayments.length + (_hasMore ? 1 : 0),
                  itemBuilder: (context, index) {
                    if (index == _displayedPayments.length) {
                      return const Center(
                        child: Padding(
                          padding: EdgeInsets.all(16),
                          child: CircularProgressIndicator(),
                        ),
                      );
                    }

                    final payment = _displayedPayments[index];
                    final isCollecting = _collectingPaymentId == paymentId(payment);
                    
                    return _buildPaymentCard(payment, isCollecting);
                  },
                ),
        ),
      ],
    );
  }

  Widget _buildSkeletonLoader() {
    return Column(
      children: [
        // Search Bar Skeleton
        Container(
          padding: const EdgeInsets.all(16),
          color: Colors.white,
          child: Shimmer.fromColors(
            baseColor: Colors.grey[300]!,
            highlightColor: Colors.grey[100]!,
            child: Container(
              height: 48,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
        ),
        
        // Summary Banner Skeleton
        Container(
          padding: const EdgeInsets.all(16),
          color: Colors.blue[50],
          child: Shimmer.fromColors(
            baseColor: Colors.grey[300]!,
            highlightColor: Colors.grey[100]!,
            child: Row(
              children: [
                Container(
                  width: 24,
                  height: 24,
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: 150,
                        height: 16,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(4),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Container(
                        width: 100,
                        height: 12,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(4),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        
        // Payment Cards Skeleton
        Expanded(
          child: _buildPaymentCardsSkeletonList(),
        ),
      ],
    );
  }

  // Skeleton list for payment cards (reusable for initial load and search)
  Widget _buildPaymentCardsSkeletonList() {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: 5,
      itemBuilder: (context, index) {
        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          elevation: 2,
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Shimmer.fromColors(
              baseColor: Colors.grey[300]!,
              highlightColor: Colors.grey[100]!,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Amount section
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            width: 80,
                            height: 12,
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(4),
                            ),
                          ),
                          const SizedBox(height: 8),
                          Container(
                            width: 120,
                            height: 24,
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(4),
                            ),
                          ),
                        ],
                      ),
                      Container(
                        width: 70,
                        height: 24,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  
                  // Property details
                  Container(
                    width: double.infinity,
                    height: 16,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    width: 150,
                    height: 14,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    width: 200,
                    height: 14,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    width: 130,
                    height: 14,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                  const SizedBox(height: 16),
                  
                  // Button
                  Container(
                    width: double.infinity,
                    height: 48,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  double _getRemainingAmount(Map<String, dynamic> payment) {
    return paymentRemainingAmount(payment);
  }

  /// Payments to show in the list: when pending tab, only those with remaining > 0 (don't show completed).
  List<Map<String, dynamic>> get _displayedPayments {
    if (_filterType != 'pending') return _pendingPayments;
    return _pendingPayments.where((p) => _getRemainingAmount(p) > 0.01).toList();
  }

  Widget _buildPaymentCard(Map<String, dynamic> payment, bool isCollecting) {
    final amount = paymentAmount(payment);
    final currency = paymentCurrency(payment);
    final property = paymentProperty(payment);
    final status = payment['status'] ?? payment['Status'];
    final paymentDate = payment['paymentDate'] ?? payment['PaymentDate'];
    
    final expectedAmount = propertyExpectedAmount(property);
    final paidAmount = propertyPaidAmount(property);
    final paymentStatus = property?['paymentStatus'] ?? property?['PaymentStatus'] ?? 'Pending';
    final discountAmount = paymentDiscountAmount(payment);
    final isExempt = paymentIsExempt(payment);
    var remainingAmount = _getRemainingAmount(payment);
    if (remainingAmount < 0.01 && amount > 0) {
      remainingAmount = amount;
    }
    
    final plateNumber = property != null
        ? (property['plateNumber'] ?? property['PlateNumber'])
        : null;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
              // Amount and Status
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Plate Number Badge (always show for differentiation)
                        Container(
                          margin: const EdgeInsets.only(bottom: 8),
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: plateNumber != null && plateNumber.toString().isNotEmpty 
                                ? Colors.blue[100] 
                                : Colors.grey[200],
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                              color: plateNumber != null && plateNumber.toString().isNotEmpty 
                                  ? Colors.blue[300]! 
                                  : Colors.grey[400]!,
                              width: 1.5,
                            ),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                Icons.badge, 
                                size: 16, 
                                color: plateNumber != null && plateNumber.toString().isNotEmpty 
                                    ? Colors.blue[700] 
                                    : Colors.grey[600],
                              ),
                              const SizedBox(width: 6),
                              Text(
                                plateNumber != null && plateNumber.toString().isNotEmpty
                                    ? plateNumber.toString()
                                    : 'No Plate',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.bold,
                                  color: plateNumber != null && plateNumber.toString().isNotEmpty
                                      ? Colors.blue[900]
                                      : Colors.grey[700],
                                  letterSpacing: 0.5,
                                ),
                              ),
                            ],
                          ),
                        ),
                        // Total expected amount (show first)
                        if (expectedAmount > 0) ...[
                          const Text(
                            'Expected',
                            style: TextStyle(fontSize: 12, color: Colors.grey),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            '$currency ${expectedAmount.toStringAsFixed(2)}',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: Colors.grey[800],
                            ),
                          ),
                          const SizedBox(height: 8),
                        ],
                        const Text(
                          'Amount Due',
                          style: TextStyle(fontSize: 12, color: Colors.grey),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '$currency ${remainingAmount.toStringAsFixed(2)}',
                          style: const TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                            color: Colors.orange,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      if (status != null)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: Colors.orange[100],
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            status is Map ? (status['name'] ?? status['Name'] ?? 'Pending').toString() : (status?.toString() ?? 'Pending'),
                            style: TextStyle(
                              color: Colors.orange[900],
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      if (paymentStatus == 'Paid_partially') ...[
                        const SizedBox(height: 4),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: Colors.blue[100],
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            'Partial',
                            style: TextStyle(
                              color: Colors.blue[900],
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
              
              // Details: expected, then paid / discount / exemption when present, then remaining
              if (expectedAmount > 0 && (paidAmount > 0 || discountAmount > 0 || isExempt)) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.blue[50],
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Total expected (breakdown header)
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'Expected',
                            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.black87),
                          ),
                          Text(
                            '$currency ${expectedAmount.toStringAsFixed(2)}',
                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                      if (paidAmount > 0) ...[
                        const SizedBox(height: 4),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Paid', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500)),
                            Text('$currency ${paidAmount.toStringAsFixed(2)}', style: TextStyle(fontSize: 12, color: Colors.green[700], fontWeight: FontWeight.w500)),
                          ],
                        ),
                      ],
                      if (discountAmount > 0) ...[
                        const SizedBox(height: 4),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Discount', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500)),
                            Text('$currency ${discountAmount.toStringAsFixed(2)}', style: TextStyle(fontSize: 12, color: Colors.green[700], fontWeight: FontWeight.w500)),
                          ],
                        ),
                      ],
                      if (isExempt) ...[
                        const SizedBox(height: 4),
                        Text(
                          'Exemption applied',
                          style: TextStyle(fontSize: 12, color: Colors.green[700], fontWeight: FontWeight.w500),
                        ),
                      ],
                      const SizedBox(height: 6),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Remaining', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                          Text('$currency ${remainingAmount.toStringAsFixed(2)}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.orange)),
                        ],
                      ),
                      const SizedBox(height: 8),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(4),
                        child: LinearProgressIndicator(
                          value: expectedAmount > 0 ? ((paidAmount + discountAmount) / expectedAmount).clamp(0.0, 1.0) : 0,
                          minHeight: 6,
                          backgroundColor: Colors.grey[300],
                          valueColor: AlwaysStoppedAnimation<Color>(Colors.blue[700]!),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        expectedAmount > 0
                            ? '${(((paidAmount + discountAmount) / expectedAmount) * 100).toStringAsFixed(1)}% accounted'
                            : '0% accounted',
                        style: TextStyle(fontSize: 11, color: Colors.grey[600]),
                      ),
                    ],
                  ),
                ),
              ],
              
              const Divider(height: 24),
              
              // Property Details
              if (property != null) ...[
                // Address
                Row(
                  children: [
                    const Icon(Icons.home, size: 16, color: Colors.grey),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        property['streetAddress'] ?? property['StreetAddress'] ?? 'N/A',
                        style: const TextStyle(fontWeight: FontWeight.w500),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                if ((property['owner'] ?? property['Owner']) != null) ...[
                Row(
                  children: [
                    const Icon(Icons.person, size: 16, color: Colors.grey),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Owner: ${(property['owner'] ?? property['Owner'])['name'] ?? (property['owner'] ?? property['Owner'])['Name'] ?? 'N/A'}',
                          style: const TextStyle(fontSize: 13),
                        ),
                      ),
                    ],
                  ),
              ],
              const SizedBox(height: 12),
              
              // Due Date
              Row(
                children: [
                  const Icon(Icons.calendar_today, size: 16, color: Colors.grey),
                  const SizedBox(width: 8),
                  Text(
                    'Due: ${_formatDate(paymentDate)}',
                    style: const TextStyle(fontSize: 13),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              
              // Action Button - Show collect for pending, view receipt for completed
              if (_filterType == 'pending' && remainingAmount > 0.01)
                // Collect Button - Only show if there's remaining amount
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: isCollecting ? null : () => _collectPayment(payment),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.green,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                    icon: isCollecting
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                            ),
                          )
                        : const Icon(Icons.payment),
                    label: Text(isCollecting ? 'Collecting...' : 'Collect Payment'),
                  ),
                )
              else // Show "View Receipt" button for all payments (completed or when viewing all)
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () => _viewReceipt(payment),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.blue,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                    icon: const Icon(Icons.receipt_long),
                    label: Text(
                      remainingAmount > 0.01 && _filterType == 'pending'
                          ? 'View Receipt'
                          : 'View & Print Receipt',
                    ),
                  ),
                ),
            ],
          ],
          ),
        ),
    );
  }

  Widget _buildFilterTab(String label, String value, IconData icon) {
    final isSelected = _filterType == value;
    return InkWell(
      onTap: () {
        if (_filterType != value) {
          setState(() {
            _filterType = value;
            _currentPage = 1;
            _hasMore = true;
          });
          _loadPendingPayments(refresh: true);
        }
      },
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: isSelected ? Colors.blue[50] : Colors.transparent,
          border: Border(
            bottom: BorderSide(
              color: isSelected ? Colors.blue : Colors.transparent,
              width: 2,
            ),
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 18,
              color: isSelected ? Colors.blue[700] : Colors.grey[600],
            ),
            const SizedBox(width: 8),
            Text(
              label,
              style: TextStyle(
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                color: isSelected ? Colors.blue[700] : Colors.grey[600],
                fontSize: 14,
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatDate(dynamic date) {
    if (date == null) return 'N/A';
    try {
      final dateTime = DateTime.parse(date.toString());
      return DateFormat('dd/MM/yyyy').format(dateTime);
    } catch (e) {
      return date.toString();
    }
  }

  Future<void> _viewReceipt(Map<String, dynamic> payment) async {
    try {
      final propertyId = payment['property']?['id'] ?? payment['propertyId'];
      if (propertyId == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Property ID not found'),
            backgroundColor: Colors.red,
          ),
        );
        return;
      }

      // Show loading indicator
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => const Center(
          child: CircularProgressIndicator(),
        ),
      );

      // Fetch payment history for this property
      final response = await ApiService.get('/paymentdetails/property/$propertyId');
      
      if (mounted) {
        Navigator.of(context).pop(); // Close loading dialog

        if (response.statusCode == 200 && response.data != null) {
          final paymentHistory = response.data is List ? response.data : [];
          
          // Get property details
          final propertyResponse = await ApiService.get('/properties/$propertyId');
          final property = propertyResponse.data;

          // Prepare payment data for receipt screen
          final receiptData = {
            'payment': payment,
            'property': property,
            'paymentHistory': paymentHistory,
            'isReprint': true, // Indicate this is a reprint
          };

          // Navigate to receipt screen
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (context) => PaymentReceiptScreen(
                paymentData: receiptData,
              ),
            ),
          );
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Failed to load payment history'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        Navigator.of(context).pop(); // Close loading dialog if still open
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error loading receipt: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }
}
