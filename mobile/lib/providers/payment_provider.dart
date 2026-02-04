import 'package:flutter/foundation.dart';
import '../services/api_service.dart';

class PaymentProvider with ChangeNotifier {
  List<Map<String, dynamic>> _payments = [];
  List<Map<String, dynamic>> _properties = [];
  bool _isLoading = false;
  String? _error;

  List<Map<String, dynamic>> get payments => _payments;
  List<Map<String, dynamic>> get properties => _properties;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<List<Map<String, dynamic>>> fetchProperties() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await ApiService.get('/properties');
      if (response.data != null && response.data['data'] != null) {
        _properties = List<Map<String, dynamic>>.from(response.data['data']);
        _isLoading = false;
        notifyListeners();
        return _properties;
      }
      throw Exception('Failed to load properties');
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return [];
    }
  }

  Future<List<Map<String, dynamic>>> fetchPayments() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await ApiService.get('/payments');
      if (response.data != null && response.data['data'] != null) {
        _payments = List<Map<String, dynamic>>.from(response.data['data']);
        _isLoading = false;
        notifyListeners();
        return _payments;
      }
      throw Exception('Failed to load payments');
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return [];
    }
  }

  Future<Map<String, dynamic>?> createPayment(Map<String, dynamic> paymentData) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      print('=== CREATING PAYMENT (Provider) ===');
      print('Payment Data: $paymentData');
      
      final response = await ApiService.post('/payments', data: paymentData);
      
      print('Create Payment Response Status: ${response.statusCode}');
      print('Create Payment Response Data: ${response.data}');
      
      if (response.statusCode == 200 || response.statusCode == 201) {
        final paymentResult = response.data;
        
        // Handle both direct response and wrapped in 'data'
        final payment = paymentResult is Map && paymentResult.containsKey('data')
            ? paymentResult['data']
            : paymentResult;
        
        if (payment != null) {
          _payments.insert(0, payment);
        }
        
        _isLoading = false;
        notifyListeners();
        return payment;
      }
      
      throw Exception('Failed to create payment: ${response.statusCode}');
    } catch (e) {
      print('Error creating payment: $e');
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return null;
    }
  }

  Future<Map<String, dynamic>?> getPaymentById(String paymentId) async {
    try {
      final response = await ApiService.get('/payments/$paymentId');
      if (response.data != null && response.data['data'] != null) {
        return response.data['data'];
      }
      return null;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return null;
    }
  }

  Future<List<Map<String, dynamic>>> fetchPropertyPayments(String propertyId) async {
    try {
      final response = await ApiService.get('/properties/$propertyId/payments');
      if (response.data != null && response.data['data'] != null) {
        return List<Map<String, dynamic>>.from(response.data['data']);
      }
      return [];
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return [];
    }
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}
