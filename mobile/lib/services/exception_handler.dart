import 'dart:async';
import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import '../core/app_exception.dart';

/// Central exception management: parse errors into [AppException] and optionally show UI.
class ExceptionHandler {
  /// Converts any thrown error into an [AppException] with a user-friendly message.
  static AppException parse(dynamic error, {String? fallbackMessage}) {
    if (error is AppException) return error;

    String message = fallbackMessage ?? 'Something went wrong. Please try again.';
    AppExceptionType type = AppExceptionType.unknown;
    String? detail;

    if (error is DioException) {
      switch (error.type) {
        case DioExceptionType.connectionError:
        case DioExceptionType.connectionTimeout:
        case DioExceptionType.unknown:
          if (error.error is SocketException ||
              error.error is OSError ||
              (error.message != null && _isNetworkMessage(error.message!))) {
            type = AppExceptionType.noInternet;
            message = 'No internet connection. Please check your network and try again.';
          } else if (error.error is HandshakeException) {
            type = AppExceptionType.serverError;
            message = 'Secure connection failed. Please try again.';
          }
          break;
        case DioExceptionType.sendTimeout:
        case DioExceptionType.receiveTimeout:
          type = AppExceptionType.timeout;
          message = 'Request timed out. Please check your connection and try again.';
          break;
        case DioExceptionType.badResponse:
          final statusCode = error.response?.statusCode;
          final data = error.response?.data;
          if (statusCode == 401) {
            type = AppExceptionType.unauthorized;
            message = 'Session expired or invalid. Please sign in again.';
          } else if (statusCode == 404) {
            type = AppExceptionType.notFound;
            message = 'The requested resource was not found.';
          } else if (statusCode != null && statusCode >= 400 && statusCode < 500) {
            type = AppExceptionType.validation;
            message = _extractMessage(data) ?? 'Request failed. Please check your input.';
          } else {
            type = AppExceptionType.serverError;
            message = _extractMessage(data) ?? 'Server error. Please try again later.';
          }
          detail = _extractDetail(data);
          break;
        case DioExceptionType.cancel:
          message = 'Request was cancelled.';
          break;
        case DioExceptionType.badCertificate:
          type = AppExceptionType.serverError;
          message = 'Connection security error. Please try again.';
          break;
      }
    } else if (error is SocketException) {
      type = AppExceptionType.noInternet;
      message = 'No internet connection. Please check your network and try again.';
    } else if (error is TimeoutException) {
      type = AppExceptionType.timeout;
      message = 'Request timed out. Please try again.';
    } else if (error is FormatException) {
      type = AppExceptionType.unknown;
      message = 'Invalid data received. Please try again.';
    } else if (error.toString().isNotEmpty && error.toString() != 'null') {
      detail = error.toString();
    }

    return AppException(
      type: type,
      message: message,
      detail: detail,
      original: error,
    );
  }

  static bool _isNetworkMessage(String msg) {
    final lower = msg.toLowerCase();
    return lower.contains('socket') ||
        lower.contains('connection') ||
        lower.contains('network') ||
        lower.contains('failed host lookup') ||
        lower.contains('connection refused');
  }

  static String? _extractMessage(dynamic data) {
    if (data == null) return null;
    if (data is Map) {
      final msg = data['message'] ?? data['Message'] ?? data['error'] ?? data['Error'];
      if (msg != null) return msg.toString();
    }
    if (data is String) return data;
    return null;
  }

  static String? _extractDetail(dynamic data) {
    if (data == null || data is! Map) return null;
    final details = data['details'] ?? data['Details'] ?? data['errors'];
    if (details != null) return details.toString();
    return null;
  }

  /// Shows a SnackBar with the exception message. Call from catch blocks.
  static void showSnackBar(BuildContext context, dynamic error, {String? fallbackMessage}) {
    if (!context.mounted) return;
    final appError = parse(error, fallbackMessage: fallbackMessage);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(appError.message),
        backgroundColor: appError.type == AppExceptionType.unauthorized ? Colors.orange : Colors.red.shade700,
        duration: const Duration(seconds: 4),
      ),
    );
  }

  /// Returns the user-facing message for the error. Use when you want to display the message yourself.
  static String message(dynamic error, {String? fallbackMessage}) {
    return parse(error, fallbackMessage: fallbackMessage).message;
  }
}
