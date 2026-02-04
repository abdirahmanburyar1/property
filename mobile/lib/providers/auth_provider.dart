import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';
import '../services/signalr_service.dart';
import 'package:dio/dio.dart';

class AuthProvider with ChangeNotifier {
  bool _isAuthenticated = false;
  bool _isLoading = false;
  Map<String, dynamic>? _user;

  bool get isAuthenticated => _isAuthenticated;
  bool get isLoading => _isLoading;
  Map<String, dynamic>? get user => _user;

  AuthProvider() {
    _checkAuthStatus();
  }

  Future<void> _checkAuthStatus() async {
    _isLoading = true;
    notifyListeners();

    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('auth_token');
      final userData = prefs.getString('user_data');

      if (token != null) {
        // Load user data from local storage
        if (userData != null) {
          _user = jsonDecode(userData);
        }

        // Verify token by fetching current user
        try {
          final response = await ApiService.get('/auth/me');
          if (response.statusCode == 200) {
            final responseData = response.data['data'] ?? response.data;
            _user = responseData;
            _isAuthenticated = true;
            
            // Update stored user data
            await prefs.setString('user_data', jsonEncode(_user));
          } else {
            await _logout();
          }
        } catch (e) {
          // If verification fails but we have token, still authenticate
          // (for offline scenarios)
          if (userData != null) {
            _isAuthenticated = true;
          } else {
            await _logout();
          }
        }
      }
    } catch (e) {
      print('Auth status check error: $e');
      await _logout();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> login(String username, String password) async {
    _isLoading = true;
    notifyListeners();

    try {
      print('=== LOGIN ATTEMPT ===');
      print('Username: $username');
      
      // Get current API configuration
      final prefs = await SharedPreferences.getInstance();
      final apiUrl = prefs.getString('api_base_url') ?? 'NOT SET';
      print('Stored API URL: $apiUrl');
      print('Current API Base URL: ${ApiService.getBaseUrl()}');
      
      final response = await ApiService.post(
        '/auth/login',
        data: {
          'username': username,
          'password': password,
        },
      );

      print('Login response status: ${response.statusCode}');
      print('Login response data: ${response.data}');

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = response.data;
        
        // Handle both direct data and nested data response
        final responseData = data['data'] ?? data;
        final token = responseData['token'] ?? responseData['accessToken'];
        final user = responseData['user'];

        print('Extracted token: ${token != null ? "Present" : "Missing"}');
        print('Extracted user: ${user != null ? "Present" : "Missing"}');

        if (token != null) {
          final prefs = await SharedPreferences.getInstance();
          await prefs.setString('auth_token', token);
          if (user != null) {
            await prefs.setString('user_data', jsonEncode(user));
            _user = user;
          }

          _isAuthenticated = true;
          _isLoading = false;
          notifyListeners();
          
          print('Login successful!');
          
          // Initialize SignalR for real-time updates
          SignalRService.initialize().then((_) {
            print('SignalR initialized after login');
          }).catchError((error) {
            print('Failed to initialize SignalR: $error');
          });
          
          return true;
        }
      }

      print('Login failed: Invalid response format');
      _isLoading = false;
      notifyListeners();
      return false;
    } on DioException catch (e) {
      print('Login DioException: ${e.type}');
      print('Login error message: ${e.message}');
      print('Login error response: ${e.response?.data}');
      print('Login error status: ${e.response?.statusCode}');
      
      _isLoading = false;
      notifyListeners();
      return false;
    } catch (e) {
      print('Login error: $e');
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> _logout() async {
    // Dispose SignalR connection
    await SignalRService.dispose();
    
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('auth_token');
    await prefs.remove('user_data');
    _isAuthenticated = false;
    _user = null;
    notifyListeners();
  }

  Future<void> logout() async {
    await _logout();
  }
}
