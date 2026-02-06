import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:io';

class ApiService {
  static late Dio _dio;
  static String _baseUrl = 'http://10.19.114.69:9000/api';

  static void initialize(String baseUrl) {
    _baseUrl = baseUrl;
    print('=== API SERVICE INITIALIZATION ===');
    print('Base URL: $_baseUrl');
    
    _dio = Dio(
      BaseOptions(
        baseUrl: _baseUrl,
        connectTimeout: const Duration(seconds: 30),
        receiveTimeout: const Duration(seconds: 30),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    // Add interceptor for auth token
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          print('=== API REQUEST ===');
          print('Method: ${options.method}');
          print('Path: ${options.path}');
          print('Full URL: ${options.baseUrl}${options.path}');
          print('Data: ${options.data}');
          
          final prefs = await SharedPreferences.getInstance();
          final token = prefs.getString('auth_token');
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
            print('Token: Present');
          } else {
            print('Token: None');
          }
          return handler.next(options);
        },
        onResponse: (response, handler) {
          print('=== API RESPONSE ===');
          print('Status: ${response.statusCode}');
          print('Data: ${response.data}');
          return handler.next(response);
        },
        onError: (error, handler) {
          print('=== API ERROR ===');
          print('Type: ${error.type}');
          print('Message: ${error.message}');
          print('Response: ${error.response}');
          
          if (error.response?.statusCode == 401) {
            // Handle unauthorized - clear token and redirect to login
            SharedPreferences.getInstance().then((prefs) {
              prefs.remove('auth_token');
            });
          }
          return handler.next(error);
        },
      ),
    );
  }

  static Future<Response> get(String path, {Map<String, dynamic>? queryParameters}) async {
    try {
      return await _dio.get(path, queryParameters: queryParameters);
    } catch (e) {
      rethrow;
    }
  }

  static Future<Response> post(String path, {dynamic data}) async {
    try {
      return await _dio.post(path, data: data);
    } catch (e) {
      rethrow;
    }
  }

  static Future<Response> put(String path, {dynamic data}) async {
    try {
      return await _dio.put(path, data: data);
    } catch (e) {
      rethrow;
    }
  }

  static Future<Response> patch(String path, {dynamic data}) async {
    try {
      return await _dio.patch(path, data: data);
    } catch (e) {
      rethrow;
    }
  }

  static Future<Response> delete(String path) async {
    try {
      return await _dio.delete(path);
    } catch (e) {
      rethrow;
    }
  }

  static Future<Response> uploadFile(String path, String filePath, String fileName) async {
    try {
      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(
          filePath,
          filename: fileName,
        ),
      });
      
      // Dio will automatically set Content-Type with boundary for multipart/form-data
      return await _dio.post(
        path,
        data: formData,
      );
    } catch (e) {
      rethrow;
    }
  }

  static void setBaseUrl(String url) {
    _baseUrl = url;
    _dio.options.baseUrl = _baseUrl;
    print('=== API BASE URL UPDATED ===');
    print('New Base URL: $_baseUrl');
  }
  
  static String getBaseUrl() {
    return _baseUrl;
  }

  /// Lightweight reachability check. Returns true if the server is reachable (any HTTP response),
  /// false on connection error or timeout. Used to detect mobile data when connectivity_plus fails.
  static Future<bool> ping({Duration timeout = const Duration(seconds: 6)}) async {
    try {
      final response = await _dio.get(
        '/paymentmethods',
        options: Options(
          receiveTimeout: timeout,
          sendTimeout: timeout,
        ),
      );
      return response.statusCode != null && response.statusCode! >= 100;
    } on DioException catch (e) {
      if (e.type == DioExceptionType.connectionError ||
          e.type == DioExceptionType.connectionTimeout ||
          e.type == DioExceptionType.receiveTimeout ||
          e.type == DioExceptionType.sendTimeout) {
        return false;
      }
      // 401, 404, etc. mean we reached the server
      if (e.response != null) return true;
      return false;
    } catch (_) {
      return false;
    }
  }
}
