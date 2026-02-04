import 'dart:io';
import 'package:dio/dio.dart';

/// Central exception types for the app. Used by [ExceptionHandler] to show consistent messages.
enum AppExceptionType {
  noInternet,
  timeout,
  serverError,
  unauthorized,
  validation,
  notFound,
  unknown,
}

/// Represents a handled app-level exception with a user-friendly message.
class AppException implements Exception {
  final AppExceptionType type;
  final String message;
  final String? detail;
  final dynamic original;

  const AppException({
    required this.type,
    required this.message,
    this.detail,
    this.original,
  });

  bool get isNoInternet => type == AppExceptionType.noInternet;
  bool get isTimeout => type == AppExceptionType.timeout;
  bool get isUnauthorized => type == AppExceptionType.unauthorized;

  @override
  String toString() => message;
}
