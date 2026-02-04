import 'package:flutter/foundation.dart';
import '../services/api_service.dart';

class PropertyProvider with ChangeNotifier {
  List<Map<String, dynamic>> _properties = [];
  bool _isLoading = false;
  String? _error;

  List<Map<String, dynamic>> get properties => _properties;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> fetchProperties({Map<String, String>? filters}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      print('=== FETCHING PROPERTIES ===');
      print('Filters: $filters');
      
      final response = await ApiService.get('/properties', queryParameters: filters);
      
      print('Response status: ${response.statusCode}');
      print('Response data type: ${response.data.runtimeType}');
      
      if (response.statusCode == 200) {
        // Handle both direct array and nested data object
        final responseData = response.data;
        if (responseData is Map && responseData.containsKey('data')) {
          _properties = List<Map<String, dynamic>>.from(responseData['data']);
        } else if (responseData is List) {
          _properties = List<Map<String, dynamic>>.from(responseData);
        } else {
          _properties = [];
        }
        
        print('Properties loaded: ${_properties.length}');
        _error = null;
      }
    } catch (e) {
      print('Error fetching properties: $e');
      _error = e.toString();
      _properties = [];
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<Map<String, dynamic>?> createProperty(Map<String, dynamic> propertyData) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await ApiService.post('/properties', data: propertyData);
      if (response.statusCode == 200 || response.statusCode == 201) {
        final newProperty = response.data;
        _properties.insert(0, newProperty);
        _error = null;
        _isLoading = false;
        notifyListeners();
        return newProperty;
      } else {
        _error = 'Failed to create property';
        _isLoading = false;
        notifyListeners();
        return null;
      }
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return null;
    }
  }

  Future<List<Map<String, dynamic>>> fetchPropertyTypes() async {
    try {
      final response = await ApiService.get('/propertytypes');
      if (response.statusCode == 200) {
        return List<Map<String, dynamic>>.from(response.data);
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  Future<List<Map<String, dynamic>>> fetchRegions() async {
    try {
      final response = await ApiService.get('/regions');
      if (response.statusCode == 200) {
        return List<Map<String, dynamic>>.from(response.data);
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  Future<List<Map<String, dynamic>>> fetchCities(String? regionId) async {
    try {
      final response = await ApiService.get('/cities', queryParameters: regionId != null ? {'regionId': regionId} : null);
      if (response.statusCode == 200) {
        return List<Map<String, dynamic>>.from(response.data);
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  Future<List<Map<String, dynamic>>> fetchSections() async {
    try {
      final response = await ApiService.get('/sections');
      if (response.statusCode == 200) {
        return List<Map<String, dynamic>>.from(response.data);
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  Future<List<Map<String, dynamic>>> fetchSubSections(String? sectionId) async {
    try {
      final response = await ApiService.get(
        '/subsections',
        queryParameters: sectionId != null ? {'sectionId': sectionId} : null,
      );
      if (response.statusCode == 200) {
        return List<Map<String, dynamic>>.from(response.data);
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  Future<List<Map<String, dynamic>>> searchOwners(String query) async {
    try {
      final response = await ApiService.get(
        '/owners/search',
        queryParameters: {'query': query},
      );
      if (response.statusCode == 200) {
        return List<Map<String, dynamic>>.from(response.data);
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  Future<List<Map<String, dynamic>>> searchResponsiblePersons(String query) async {
    try {
      final response = await ApiService.get('/responsiblepersons/search', queryParameters: {'query': query});
      if (response.statusCode == 200) {
        return List<Map<String, dynamic>>.from(response.data);
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  Future<Map<String, dynamic>?> createOwner(Map<String, dynamic> ownerData) async {
    try {
      final response = await ApiService.post('/owners', data: ownerData);
      if (response.statusCode == 200 || response.statusCode == 201) {
        return response.data;
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  Future<bool> updateProperty(String propertyId, Map<String, dynamic> updateData) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      print('=== UPDATING PROPERTY VIA PROVIDER ===');
      print('Property ID: $propertyId');
      print('Update data: $updateData');
      
      final response = await ApiService.put('/properties/$propertyId', data: updateData);
      
      print('Update response status: ${response.statusCode}');
      
      if (response.statusCode == 200) {
        // Update the property in the local list if it exists
        final index = _properties.indexWhere((p) => p['id'] == propertyId);
        if (index != -1) {
          _properties[index] = {..._properties[index], ...updateData};
        }
        
        _error = null;
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _error = 'Failed to update property';
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      print('Error updating property: $e');
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> updatePropertyCoordinates(String propertyId, double latitude, double longitude) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      print('=== UPDATING PROPERTY COORDINATES VIA PROVIDER ===');
      print('Property ID: $propertyId');
      print('Latitude: $latitude');
      print('Longitude: $longitude');
      
      final response = await ApiService.patch(
        '/properties/$propertyId/coordinates',
        data: {
          'latitude': latitude,
          'longitude': longitude,
        },
      );
      
      print('Update coordinates response status: ${response.statusCode}');
      print('Response data: ${response.data}');
      
      if (response.statusCode == 200) {
        // Update the property in the local list if it exists
        final index = _properties.indexWhere((p) => p['id'] == propertyId);
        if (index != -1) {
          _properties[index]['latitude'] = latitude;
          _properties[index]['longitude'] = longitude;
        }
        
        _error = null;
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _error = 'Failed to update coordinates';
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      print('Error updating coordinates: $e');
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }
}
