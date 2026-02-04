import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:geolocator/geolocator.dart';
import '../providers/property_provider.dart';
import '../services/signalr_service.dart';

class PropertyDetailScreen extends StatefulWidget {
  final Map<String, dynamic> property;

  const PropertyDetailScreen({super.key, required this.property});

  @override
  State<PropertyDetailScreen> createState() => _PropertyDetailScreenState();
}

class _PropertyDetailScreenState extends State<PropertyDetailScreen> {
  bool _isEditing = false;
  bool _isSaving = false;
  bool _isLoadingLocation = false;

  // Controllers for editable fields (same as create screen)
  late TextEditingController _streetAddressController;
  late TextEditingController _cityController;
  late TextEditingController _stateController;
  late TextEditingController _plateNumberController;
  late TextEditingController _heightController;
  late TextEditingController _widthController;
  late TextEditingController _areaSizeController;
  late TextEditingController _descriptionController;
  late TextEditingController _latitudeController;
  late TextEditingController _longitudeController;
  late TextEditingController _ownerNameController;
  late TextEditingController _ownerPhoneController;
  late TextEditingController _ownerEmailController;
  late TextEditingController _responsibleNameController;
  late TextEditingController _responsiblePhoneController;
  late TextEditingController _responsibleEmailController;
  late TextEditingController _responsibleRelationshipController;

  // Dropdowns (same as create)
  List<Map<String, dynamic>> _propertyTypes = [];
  List<Map<String, dynamic>> _sections = [];
  List<Map<String, dynamic>> _subSections = [];
  List<Map<String, dynamic>> _regions = [];
  List<Map<String, dynamic>> _cities = [];
  List<Map<String, dynamic>> _owners = [];
  List<Map<String, dynamic>> _responsiblePersons = [];
  String? _selectedPropertyTypeId;
  String? _selectedSectionId;
  String? _selectedSubSectionId;
  String? _selectedRegionId;
  String? _selectedCityId;
  String? _selectedOwnerId;
  String? _selectedResponsibleId;
  bool _useOwner = true;

  @override
  void initState() {
    super.initState();
    _initializeControllers();
    _setupSignalR();
  }

  void _handlePropertyUpdate(Map<String, dynamic> message) {
    print('=== PROPERTY UPDATE RECEIVED IN UI ===');
    print('Message: $message');
    
    final propertyId = widget.property['id'];
    final updatedPropertyId = message['propertyId'];
    final updateType = message['updateType'];
    
    // Check if this update is for the current property
    if (updatedPropertyId == propertyId.toString()) {
      print('Update is for current property');
      
      if (updateType == 'coordinates' && message['data'] != null) {
        final data = message['data'];
        final latitude = data['latitude'];
        final longitude = data['longitude'];
        
        if (mounted && latitude != null && longitude != null) {
          setState(() {
            _latitudeController.text = latitude.toString();
            _longitudeController.text = longitude.toString();
          });
          
          // Show snackbar notification
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('📍 Coordinates updated in real-time'),
              backgroundColor: Colors.green,
              duration: Duration(seconds: 2),
            ),
          );
        }
      }
    }
  }

  void _setupSignalR() {
    // Subscribe to this property's updates
    final propertyId = widget.property['id'];
    if (propertyId != null) {
      print('=== SETTING UP SIGNALR FOR PROPERTY ===');
      print('Property ID: $propertyId');
      
      // Add listener for property updates
      SignalRService.addListener(_handlePropertyUpdate);
      
      // Subscribe to this property
      SignalRService.subscribeToProperty(propertyId.toString());
    }
  }

  void _initializeControllers() {
    final p = widget.property;
    _streetAddressController = TextEditingController(text: p['streetAddress'] ?? '');
    _cityController = TextEditingController(text: p['city'] ?? '');
    _stateController = TextEditingController(text: p['state'] ?? '');
    _plateNumberController = TextEditingController(text: p['plateNumber'] ?? '');
    // Height and width only from API; never derived from area (area is always height × width).
    _heightController = TextEditingController(text: p['height']?.toString() ?? '');
    _widthController = TextEditingController(text: p['width']?.toString() ?? '');
    _areaSizeController = TextEditingController(text: p['areaSize']?.toString() ?? '');
    _descriptionController = TextEditingController(text: p['description'] ?? '');
    _latitudeController = TextEditingController(text: p['latitude']?.toString() ?? '0.0');
    _longitudeController = TextEditingController(text: p['longitude']?.toString() ?? '0.0');
    final owner = p['owner'];
    final resp = p['responsiblePerson'];
    _ownerNameController = TextEditingController(text: owner?['name'] ?? '');
    _ownerPhoneController = TextEditingController(text: owner?['phone'] ?? '');
    _ownerEmailController = TextEditingController(text: owner?['email'] ?? '');
    _responsibleNameController = TextEditingController(text: resp?['name'] ?? '');
    _responsiblePhoneController = TextEditingController(text: resp?['phone'] ?? '');
    _responsibleEmailController = TextEditingController(text: resp?['email'] ?? '');
    _responsibleRelationshipController = TextEditingController(text: resp?['relationship'] ?? '');
    _selectedPropertyTypeId = p['propertyTypeId']?.toString() ?? p['propertyType']?['id']?.toString();
    _selectedSectionId = p['sectionId']?.toString() ?? p['section']?['id']?.toString();
    _selectedSubSectionId = p['subSectionId']?.toString() ?? p['subSection']?['id']?.toString();
    _selectedRegionId = p['regionId']?.toString() ?? p['region']?['id']?.toString();
    _selectedCityId = p['cityId']?.toString() ?? p['cityNavigation']?['id']?.toString();
    _selectedOwnerId = owner?['id']?.toString();
    _selectedResponsibleId = resp?['id']?.toString();
    _useOwner = owner != null;
  }

  Future<void> _loadEditData() async {
    final propertyProvider = Provider.of<PropertyProvider>(context, listen: false);
    final [propertyTypes, sections, regions] = await Future.wait([
      propertyProvider.fetchPropertyTypes(),
      propertyProvider.fetchSections(),
      propertyProvider.fetchRegions(),
    ]);
    if (!mounted) return;
    setState(() {
      _propertyTypes = propertyTypes;
      _sections = sections;
      _regions = regions;
    });
    if (_selectedSectionId != null) {
      final subSections = await propertyProvider.fetchSubSections(_selectedSectionId);
      if (mounted) setState(() => _subSections = subSections);
    }
    if (_selectedRegionId != null) {
      final cities = await propertyProvider.fetchCities(_selectedRegionId);
      if (mounted) setState(() => _cities = cities);
    }
  }

  Future<void> _loadSubSections(String? sectionId) async {
    if (sectionId == null) {
      setState(() {
        _subSections = [];
        _selectedSubSectionId = null;
      });
      return;
    }
    final propertyProvider = Provider.of<PropertyProvider>(context, listen: false);
    final list = await propertyProvider.fetchSubSections(sectionId);
    if (mounted) setState(() {
      _subSections = list;
      _selectedSubSectionId = null;
    });
  }

  Future<void> _loadCities(String? regionId) async {
    if (regionId == null) {
      setState(() {
        _cities = [];
        _selectedCityId = null;
      });
      return;
    }
    final propertyProvider = Provider.of<PropertyProvider>(context, listen: false);
    final list = await propertyProvider.fetchCities(regionId);
    if (mounted) setState(() {
      _cities = list;
      _selectedCityId = null;
    });
  }

  Future<void> _searchOwners(String query) async {
    if (query.length < 2) {
      setState(() => _owners = []);
      return;
    }
    final propertyProvider = Provider.of<PropertyProvider>(context, listen: false);
    final list = await propertyProvider.searchOwners(query);
    if (mounted) setState(() => _owners = list);
  }

  Future<void> _searchResponsiblePersons(String query) async {
    if (query.length < 2) {
      setState(() => _responsiblePersons = []);
      return;
    }
    final propertyProvider = Provider.of<PropertyProvider>(context, listen: false);
    final list = await propertyProvider.searchResponsiblePersons(query);
    if (mounted) setState(() => _responsiblePersons = list);
  }

  @override
  void dispose() {
    // Remove SignalR listener and unsubscribe
    final propertyId = widget.property['id'];
    if (propertyId != null) {
      print('=== CLEANING UP SIGNALR FOR PROPERTY ===');
      print('Property ID: $propertyId');
      
      SignalRService.removeListener(_handlePropertyUpdate);
      SignalRService.unsubscribeFromProperty(propertyId.toString());
    }
    
    _streetAddressController.dispose();
    _cityController.dispose();
    _stateController.dispose();
    _plateNumberController.dispose();
    _heightController.dispose();
    _widthController.dispose();
    _areaSizeController.dispose();
    _descriptionController.dispose();
    _latitudeController.dispose();
    _longitudeController.dispose();
    _ownerNameController.dispose();
    _ownerPhoneController.dispose();
    _ownerEmailController.dispose();
    _responsibleNameController.dispose();
    _responsiblePhoneController.dispose();
    _responsibleEmailController.dispose();
    _responsibleRelationshipController.dispose();
    super.dispose();
  }

  Future<void> _updateCoordinates() async {
    setState(() => _isLoadingLocation = true);

    try {
      // Check if location services are enabled
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        throw Exception('Location services are disabled. Please enable GPS.');
      }

      // Check location permissions
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          throw Exception('Location permissions are denied');
        }
      }

      if (permission == LocationPermission.deniedForever) {
        throw Exception('Location permissions are permanently denied. Please enable in settings.');
      }

      // Get current position
      Position position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );

      print('=== GPS LOCATION OBTAINED ===');
      print('Latitude: ${position.latitude}');
      print('Longitude: ${position.longitude}');
      print('Accuracy: ${position.accuracy}m');

      // If in edit mode, just update the text fields
      if (_isEditing) {
        setState(() {
          _latitudeController.text = position.latitude.toString();
          _longitudeController.text = position.longitude.toString();
        });

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('GPS coordinates updated. Don\'t forget to save!'),
              backgroundColor: Colors.blue,
              duration: const Duration(seconds: 2),
            ),
          );
        }
      } else {
        // If not in edit mode, save coordinates immediately using dedicated endpoint
        final propertyProvider = Provider.of<PropertyProvider>(context, listen: false);

        print('=== UPDATING COORDINATES ONLY (via PATCH endpoint) ===');
        print('Property ID: ${widget.property['id']}');
        print('Latitude: ${position.latitude}');
        print('Longitude: ${position.longitude}');

        final success = await propertyProvider.updatePropertyCoordinates(
          widget.property['id'],
          position.latitude,
          position.longitude,
        );

        if (mounted) {
          if (success) {
            // Update local controllers
            setState(() {
              _latitudeController.text = position.latitude.toString();
              _longitudeController.text = position.longitude.toString();
            });

            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('GPS coordinates updated and saved successfully'),
                backgroundColor: Colors.green,
              ),
            );
          } else {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(propertyProvider.error ?? 'Failed to update coordinates'),
                backgroundColor: Colors.red,
              ),
            );
          }
        }
      }
    } catch (e) {
      print('Error updating coordinates: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to get location: $e'),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 4),
          ),
        );
      }
    } finally {
      setState(() => _isLoadingLocation = false);
    }
  }

  Future<void> _saveChanges() async {
    final plateNumber = _plateNumberController.text.trim();
    if (plateNumber.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Plate number is required')));
      return;
    }
    if (_selectedSectionId == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please select a section')));
      return;
    }
    if (_selectedSubSectionId == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please select a subsection')));
      return;
    }
    final hasOwner = _selectedOwnerId != null || _ownerNameController.text.trim().isNotEmpty;
    final hasResponsible = _selectedResponsibleId != null || _responsibleNameController.text.trim().isNotEmpty;
    if (!hasOwner && !hasResponsible) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please provide either an owner or a responsible person')));
      return;
    }

    setState(() => _isSaving = true);

    try {
      final propertyProvider = Provider.of<PropertyProvider>(context, listen: false);
      // Height, width and areaSize are stored separately; send each as written.
      final height = double.tryParse(_heightController.text.trim());
      final width = double.tryParse(_widthController.text.trim());
      final areaSizeParsed = double.tryParse(_areaSizeController.text.trim());
      final areaSize = areaSizeParsed ?? (height != null && width != null ? height * width : (widget.property['areaSize'] ?? 0.0));

      final updateData = <String, dynamic>{
        'streetAddress': _streetAddressController.text.trim(),
        'city': _cityController.text.trim(),
        'state': _stateController.text.trim().isEmpty ? null : _stateController.text.trim(),
        'plateNumber': plateNumber,
        'height': height,
        'width': width,
        'areaSize': areaSize,
        'sectionId': _selectedSectionId,
        'subSectionId': _selectedSubSectionId,
        'regionId': _selectedRegionId,
        'cityId': _selectedCityId,
        'description': _descriptionController.text.trim().isEmpty ? null : _descriptionController.text.trim(),
        'latitude': double.tryParse(_latitudeController.text.trim()) ?? widget.property['latitude'],
        'longitude': double.tryParse(_longitudeController.text.trim()) ?? widget.property['longitude'],
      };
      if (_selectedPropertyTypeId != null) updateData['propertyTypeId'] = _selectedPropertyTypeId;
      if (hasOwner) {
        if (_selectedOwnerId != null) {
          updateData['ownerId'] = _selectedOwnerId;
        } else {
          updateData['newOwner'] = {
            'name': _ownerNameController.text.trim(),
            'phone': _ownerPhoneController.text.trim().isEmpty ? null : _ownerPhoneController.text.trim(),
            'email': _ownerEmailController.text.trim().isEmpty ? null : _ownerEmailController.text.trim().toLowerCase(),
          };
        }
      }
      if (hasResponsible) {
        if (_selectedResponsibleId != null) {
          updateData['responsiblePersonId'] = _selectedResponsibleId;
        } else {
          updateData['newResponsiblePerson'] = {
            'name': _responsibleNameController.text.trim(),
            'phone': _responsiblePhoneController.text.trim().isEmpty ? null : _responsiblePhoneController.text.trim(),
            'email': _responsibleEmailController.text.trim().isEmpty ? null : _responsibleEmailController.text.trim().toLowerCase(),
            'relationship': _responsibleRelationshipController.text.trim().isEmpty ? null : _responsibleRelationshipController.text.trim(),
          };
        }
      }

      print('=== UPDATING PROPERTY ===');
      print('Property ID: ${widget.property['id']}');
      print('Update data: $updateData');

      final success = await propertyProvider.updateProperty(
        widget.property['id'],
        updateData,
      );

      if (mounted) {
        if (success) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Property updated successfully'),
              backgroundColor: Colors.green,
            ),
          );
          setState(() => _isEditing = false);
          Navigator.pop(context, true); // Return true to indicate update
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(propertyProvider.error ?? 'Failed to update property'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSaving = false);
      }
    }
  }

  void _cancelEditing() {
    setState(() {
      _isEditing = false;
      _initializeControllers(); // Reset to original values
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Property Details'),
        actions: [
          if (!_isEditing)
            IconButton(
              icon: const Icon(Icons.edit),
              onPressed: () async {
                setState(() => _isEditing = true);
                await _loadEditData();
              },
              tooltip: 'Edit',
            )
          else
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: _isSaving ? null : _cancelEditing,
                  tooltip: 'Cancel',
                ),
                IconButton(
                  icon: _isSaving
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Icon(Icons.check),
                  onPressed: _isSaving ? null : _saveChanges,
                  tooltip: 'Save',
                ),
              ],
            ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: _isEditing ? _buildEditForm() : _buildViewContent(),
      ),
    );
  }

  Widget _buildEditForm() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Property Type (same as create)
        DropdownButtonFormField<String>(
          value: _selectedPropertyTypeId,
          decoration: const InputDecoration(
            labelText: 'Property Type *',
            prefixIcon: Icon(Icons.category),
          ),
          items: _propertyTypes.map((type) {
            final name = type['name'] ?? 'N/A';
            final price = type['price'] ?? 0;
            final unit = type['unit'] ?? 'm';
            return DropdownMenuItem<String>(
              value: type['id']?.toString(),
              child: Text('$name - \$$price / $unit'),
            );
          }).toList(),
          onChanged: (value) => setState(() => _selectedPropertyTypeId = value),
        ),
        const SizedBox(height: 16),
        _buildTextField(
          controller: _streetAddressController,
          label: 'Street Address *',
          icon: Icons.location_on,
          enabled: true,
        ),
        const SizedBox(height: 16),
        _buildTextField(
          controller: _plateNumberController,
          label: 'Plate Number *',
          icon: Icons.confirmation_number,
          enabled: true,
        ),
        const SizedBox(height: 16),
        DropdownButtonFormField<String>(
          value: _selectedSectionId,
          decoration: const InputDecoration(
            labelText: 'Section *',
            prefixIcon: Icon(Icons.folder),
          ),
          items: _sections.map((section) {
            return DropdownMenuItem<String>(
              value: section['id']?.toString(),
              child: Text(section['name'] ?? 'N/A'),
            );
          }).toList(),
          onChanged: (value) {
            setState(() => _selectedSectionId = value);
            _loadSubSections(value);
          },
        ),
        const SizedBox(height: 16),
        DropdownButtonFormField<String>(
          value: _selectedSubSectionId,
          decoration: InputDecoration(
            labelText: 'Subsection *',
            prefixIcon: const Icon(Icons.folder_open),
            hintText: _selectedSectionId == null ? 'Select section first' : null,
          ),
          items: _subSections.map((ss) {
            return DropdownMenuItem<String>(
              value: ss['id']?.toString(),
              child: Text(ss['name'] ?? 'N/A'),
            );
          }).toList(),
          onChanged: _selectedSectionId == null || _subSections.isEmpty
              ? null
              : (value) => setState(() => _selectedSubSectionId = value),
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: _buildTextField(
                controller: _heightController,
                label: 'Height (m) *',
                icon: Icons.height,
                enabled: true,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: _buildTextField(
                controller: _widthController,
                label: 'Width (m) *',
                icon: Icons.width_wide,
                enabled: true,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        _buildCalculatedAreaDisplay(),
        const SizedBox(height: 16),
        DropdownButtonFormField<String>(
          value: _selectedRegionId,
          decoration: const InputDecoration(
            labelText: 'Region *',
            prefixIcon: Icon(Icons.map),
          ),
          items: _regions.map((r) {
            return DropdownMenuItem<String>(
              value: r['id']?.toString(),
              child: Text(r['name'] ?? 'N/A'),
            );
          }).toList(),
          onChanged: (value) {
            setState(() => _selectedRegionId = value);
            _loadCities(value);
          },
        ),
        const SizedBox(height: 16),
        DropdownButtonFormField<String>(
          value: _selectedCityId,
          decoration: InputDecoration(
            labelText: 'City *',
            prefixIcon: const Icon(Icons.location_city),
            hintText: _selectedRegionId == null ? 'Select region first' : null,
          ),
          items: _cities.map((c) {
            return DropdownMenuItem<String>(
              value: c['id']?.toString(),
              child: Text(c['name'] ?? 'N/A'),
            );
          }).toList(),
          onChanged: _selectedRegionId == null || _cities.isEmpty
              ? null
              : (value) => setState(() => _selectedCityId = value),
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: _buildTextField(
                controller: _latitudeController,
                label: 'Latitude',
                icon: Icons.my_location,
                enabled: true,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: _buildTextField(
                controller: _longitudeController,
                label: 'Longitude',
                icon: Icons.location_searching,
                enabled: true,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        ElevatedButton.icon(
          onPressed: _isLoadingLocation ? null : _updateCoordinates,
          icon: _isLoadingLocation
              ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : const Icon(Icons.gps_fixed),
          label: Text(_isLoadingLocation ? 'Getting Location...' : 'Get Current Location'),
          style: ElevatedButton.styleFrom(
            minimumSize: const Size(double.infinity, 44),
            backgroundColor: Colors.blue,
            foregroundColor: Colors.white,
          ),
        ),
        const SizedBox(height: 24),
        const Divider(),
        const SizedBox(height: 16),
        Text(
          'Owner or Responsible Person *',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 8),
        Text(
          'Provide either an owner or a responsible person (at least one required).',
          style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.grey[600]),
        ),
        const SizedBox(height: 16),
        SegmentedButton<bool>(
          segments: const [
            ButtonSegment(value: true, label: Text('Owner'), icon: Icon(Icons.person)),
            ButtonSegment(value: false, label: Text('Responsible'), icon: Icon(Icons.badge)),
          ],
          selected: {_useOwner},
          onSelectionChanged: (Set<bool> selected) => setState(() => _useOwner = selected.first),
        ),
        const SizedBox(height: 16),
        if (_useOwner) ...[
          Autocomplete<Map<String, dynamic>>(
            optionsBuilder: (textEditingValue) async {
              if (textEditingValue.text.length >= 2) {
                await _searchOwners(textEditingValue.text);
                return _owners;
              }
              return [];
            },
            displayStringForOption: (option) => '${option['name']} - ${option['phone'] ?? 'No phone'}',
            onSelected: (owner) {
              setState(() {
                _selectedOwnerId = owner['id']?.toString();
                _ownerNameController.text = owner['name'] ?? '';
                _ownerPhoneController.text = owner['phone'] ?? '';
                _ownerEmailController.text = owner['email'] ?? '';
              });
            },
            fieldViewBuilder: (context, controller, focusNode, onFieldSubmitted) {
              return TextField(
                controller: controller,
                focusNode: focusNode,
                onSubmitted: (_) => onFieldSubmitted(),
                decoration: const InputDecoration(
                  labelText: 'Search Owner (by name or phone)',
                  prefixIcon: Icon(Icons.search),
                  hintText: 'Type to search existing owners...',
                ),
              );
            },
          ),
          const SizedBox(height: 16),
          _buildTextField(controller: _ownerNameController, label: 'Owner Name', icon: Icons.person, enabled: true),
          const SizedBox(height: 16),
          _buildTextField(controller: _ownerPhoneController, label: 'Owner Phone', icon: Icons.phone, enabled: true, keyboardType: TextInputType.phone),
          const SizedBox(height: 16),
          _buildTextField(controller: _ownerEmailController, label: 'Owner Email', icon: Icons.email, enabled: true, keyboardType: TextInputType.emailAddress),
        ] else ...[
          Autocomplete<Map<String, dynamic>>(
            optionsBuilder: (textEditingValue) async {
              if (textEditingValue.text.length >= 2) {
                await _searchResponsiblePersons(textEditingValue.text);
                return _responsiblePersons;
              }
              return [];
            },
            displayStringForOption: (option) => '${option['name']} - ${option['phone'] ?? 'No phone'}',
            onSelected: (rp) {
              setState(() {
                _selectedResponsibleId = rp['id']?.toString();
                _responsibleNameController.text = rp['name'] ?? '';
                _responsiblePhoneController.text = rp['phone'] ?? '';
                _responsibleEmailController.text = rp['email'] ?? '';
                _responsibleRelationshipController.text = rp['relationship'] ?? '';
              });
            },
            fieldViewBuilder: (context, controller, focusNode, onFieldSubmitted) {
              return TextField(
                controller: controller,
                focusNode: focusNode,
                onSubmitted: (_) => onFieldSubmitted(),
                decoration: const InputDecoration(
                  labelText: 'Search Responsible Person',
                  prefixIcon: Icon(Icons.search),
                  hintText: 'Type to search...',
                ),
              );
            },
          ),
          const SizedBox(height: 16),
          _buildTextField(controller: _responsibleNameController, label: 'Responsible Name', icon: Icons.badge, enabled: true),
          const SizedBox(height: 16),
          _buildTextField(controller: _responsiblePhoneController, label: 'Responsible Phone', icon: Icons.phone, enabled: true, keyboardType: TextInputType.phone),
          const SizedBox(height: 16),
          _buildTextField(controller: _responsibleEmailController, label: 'Responsible Email', icon: Icons.email, enabled: true, keyboardType: TextInputType.emailAddress),
          const SizedBox(height: 16),
          _buildTextField(controller: _responsibleRelationshipController, label: 'Relationship', icon: Icons.link, enabled: true),
        ],
        const SizedBox(height: 24),
        _buildTextField(
          controller: _descriptionController,
          label: 'Description',
          icon: Icons.description,
          enabled: true,
          maxLines: 3,
        ),
        const SizedBox(height: 32),
      ],
    );
  }

  Widget _buildViewContent() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildStatusBadge(),
        const SizedBox(height: 20),
        _buildSectionTitle('Location Information'),
        const SizedBox(height: 12),
        _buildReadOnlyField(label: 'Street Address', value: _streetAddressController.text.isEmpty ? 'N/A' : _streetAddressController.text, icon: Icons.location_on),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(child: _buildReadOnlyField(label: 'City', value: _cityController.text.isEmpty ? 'N/A' : _cityController.text, icon: Icons.location_city)),
            const SizedBox(width: 12),
            Expanded(child: _buildReadOnlyField(label: 'State', value: _stateController.text.isEmpty ? 'N/A' : _stateController.text, icon: Icons.map)),
          ],
        ),
        const SizedBox(height: 20),
        _buildSectionTitle('Property Details'),
        const SizedBox(height: 12),
        _buildReadOnlyField(label: 'Plate Number', value: _plateNumberController.text.isEmpty ? 'N/A' : _plateNumberController.text, icon: Icons.badge),
        const SizedBox(height: 12),
        _buildReadOnlyField(label: 'Section', value: _sectionName(_selectedSectionId), icon: Icons.folder),
        const SizedBox(height: 12),
        _buildReadOnlyField(label: 'Subsection', value: _subSectionName(_selectedSubSectionId), icon: Icons.folder_open),
        const SizedBox(height: 12),
        _buildReadOnlyField(label: 'Height (m)', value: _heightController.text.isEmpty ? 'N/A' : _heightController.text, icon: Icons.height),
        const SizedBox(height: 12),
        _buildReadOnlyField(label: 'Width (m)', value: _widthController.text.isEmpty ? 'N/A' : _widthController.text, icon: Icons.width_wide),
        const SizedBox(height: 12),
        _buildReadOnlyField(label: 'Area (m²)', value: _displayAreaValue(), icon: Icons.square_foot),
        const SizedBox(height: 12),
        _buildReadOnlyField(label: 'Region', value: _regionName(_selectedRegionId), icon: Icons.map),
        const SizedBox(height: 12),
        _buildReadOnlyField(label: 'City', value: _cityName(_selectedCityId), icon: Icons.location_city),
        if (_descriptionController.text.isNotEmpty) ...[
          const SizedBox(height: 12),
          _buildReadOnlyField(label: 'Description', value: _descriptionController.text, icon: Icons.description),
        ],
        const SizedBox(height: 20),
        _buildSectionTitle('Property Type'),
        const SizedBox(height: 12),
        _buildReadOnlyField(label: 'Type', value: widget.property['propertyType']?['name'] ?? 'N/A', icon: Icons.category),
        const SizedBox(height: 20),
        Card(
          color: Colors.blue[50],
          elevation: 0,
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(Icons.gps_fixed, color: Colors.blue[700]),
                    const SizedBox(width: 8),
                    Text('GPS Coordinates', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.blue[900])),
                  ],
                ),
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(8), border: Border.all(color: Colors.blue[200]!)),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          Icon(Icons.my_location, size: 16, color: Colors.blue[700]),
                          const SizedBox(width: 8),
                          const Text('Latitude:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500)),
                          const SizedBox(width: 8),
                          Expanded(child: Text(_latitudeController.text.isEmpty ? 'Not set' : _latitudeController.text, style: const TextStyle(fontSize: 12, fontFamily: 'monospace'))),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Icon(Icons.location_searching, size: 16, color: Colors.blue[700]),
                          const SizedBox(width: 8),
                          const Text('Longitude:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500)),
                          const SizedBox(width: 8),
                          Expanded(child: Text(_longitudeController.text.isEmpty ? 'Not set' : _longitudeController.text, style: const TextStyle(fontSize: 12, fontFamily: 'monospace'))),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                ElevatedButton.icon(
                  onPressed: _isLoadingLocation ? null : _updateCoordinates,
                  icon: _isLoadingLocation ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Icon(Icons.gps_fixed),
                  label: Text(_isLoadingLocation ? 'Getting Location...' : 'Update from GPS'),
                  style: ElevatedButton.styleFrom(minimumSize: const Size(double.infinity, 44), backgroundColor: Colors.blue, foregroundColor: Colors.white),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 20),
        if (widget.property['owner'] != null) ...[
          _buildSectionTitle('Owner Information'),
          const SizedBox(height: 12),
          _buildReadOnlyField(label: 'Name', value: widget.property['owner']['name'] ?? 'N/A', icon: Icons.person),
          const SizedBox(height: 12),
          _buildReadOnlyField(label: 'Phone', value: widget.property['owner']['phone'] ?? 'N/A', icon: Icons.phone),
          const SizedBox(height: 12),
          _buildReadOnlyField(label: 'Email', value: widget.property['owner']['email'] ?? 'N/A', icon: Icons.email),
          const SizedBox(height: 20),
        ],
        if (widget.property['responsiblePerson'] != null) ...[
          _buildSectionTitle('Responsible Person'),
          const SizedBox(height: 12),
          _buildReadOnlyField(label: 'Name', value: widget.property['responsiblePerson']['name'] ?? 'N/A', icon: Icons.person_outline),
          const SizedBox(height: 12),
          _buildReadOnlyField(label: 'Phone', value: widget.property['responsiblePerson']['phone'] ?? 'N/A', icon: Icons.contact_phone),
          const SizedBox(height: 12),
          _buildReadOnlyField(label: 'Relationship', value: widget.property['responsiblePerson']['relationship'] ?? 'N/A', icon: Icons.family_restroom),
          const SizedBox(height: 20),
        ],
        if (widget.property['owner'] == null && widget.property['responsiblePerson'] == null) ...[
          _buildSectionTitle('Contact Information'),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: Colors.orange[50], borderRadius: BorderRadius.circular(8), border: Border.all(color: Colors.orange[200]!)),
            child: const Row(
              children: [
                Icon(Icons.warning_amber, color: Colors.orange),
                SizedBox(width: 12),
                Expanded(child: Text('No owner or responsible person information available', style: TextStyle(color: Colors.orange))),
              ],
            ),
          ),
          const SizedBox(height: 20),
        ],
        _buildSectionTitle('Metadata'),
        const SizedBox(height: 12),
        _buildReadOnlyField(label: 'Created At', value: _formatDate(widget.property['createdAt']), icon: Icons.calendar_today),
        if (widget.property['updatedAt'] != null) ...[
          const SizedBox(height: 12),
          _buildReadOnlyField(label: 'Updated At', value: _formatDate(widget.property['updatedAt']), icon: Icons.update),
        ],
      ],
    );
  }

  String _sectionName(String? id) {
    if (id == null) return widget.property['section']?['name'] ?? 'N/A';
    for (final s in _sections) {
      if (s['id']?.toString() == id) return s['name'] ?? 'N/A';
    }
    return widget.property['section']?['name'] ?? 'N/A';
  }

  String _subSectionName(String? id) {
    if (id == null) return widget.property['subSection']?['name'] ?? 'N/A';
    for (final s in _subSections) {
      if (s['id']?.toString() == id) return s['name'] ?? 'N/A';
    }
    return widget.property['subSection']?['name'] ?? 'N/A';
  }

  String _regionName(String? id) {
    if (id == null) return widget.property['region']?['name'] ?? 'N/A';
    for (final r in _regions) {
      if (r['id']?.toString() == id) return r['name'] ?? 'N/A';
    }
    return widget.property['region']?['name'] ?? 'N/A';
  }

  String _cityName(String? id) {
    if (id == null) return widget.property['cityNavigation']?['name'] ?? 'N/A';
    for (final c in _cities) {
      if (c['id']?.toString() == id) return c['name'] ?? 'N/A';
    }
    return widget.property['cityNavigation']?['name'] ?? 'N/A';
  }

  /// Area is stored separately; show stored value (no derivation from height×width).
  String _displayAreaValue() {
    final text = _areaSizeController.text.trim();
    if (text.isNotEmpty) return text;
    final stored = widget.property['areaSize'];
    if (stored is num) return stored.toStringAsFixed(2);
    if (stored != null) return stored.toString();
    return 'N/A';
  }

  /// Read-only display for area (stored separately from height and width). Same design as create screen.
  Widget _buildCalculatedAreaDisplay() {
    final area = _areaSizeController.text.trim().isEmpty ? '—' : _areaSizeController.text.trim();
    return InputDecorator(
      decoration: const InputDecoration(
        labelText: 'Area (m²)',
        prefixIcon: Icon(Icons.square_foot),
        filled: true,
        fillColor: Color(0xFFF5F5F5),
        border: OutlineInputBorder(),
        enabled: false,
      ),
      child: Text(area, style: TextStyle(fontSize: 16, color: Colors.grey[700])),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Text(
      title,
      style: Theme.of(context).textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.bold,
            color: Theme.of(context).colorScheme.primary,
          ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required IconData icon,
    required bool enabled,
    int maxLines = 1,
    TextInputType? keyboardType,
  }) {
    return TextField(
      controller: controller,
      enabled: enabled,
      maxLines: maxLines,
      keyboardType: keyboardType,
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: Icon(icon),
        border: const OutlineInputBorder(),
        filled: !enabled,
        fillColor: enabled ? null : Colors.grey[100],
      ),
    );
  }

  Widget _buildReadOnlyField({
    required String label,
    required String value,
    required IconData icon,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.grey[100],
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.grey[300]!),
      ),
      child: Row(
        children: [
          Icon(icon, size: 20, color: Colors.grey[600]),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey[600],
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusBadge() {
    final status = widget.property['status'];
    if (status == null) return const SizedBox.shrink();

    final statusName = status['name'] ?? 'Unknown';
    Color badgeColor;

    switch (statusName.toLowerCase()) {
      case 'approved':
        badgeColor = Colors.green;
        break;
      case 'pending':
        badgeColor = Colors.orange;
        break;
      case 'rejected':
        badgeColor = Colors.red;
        break;
      default:
        badgeColor = Colors.grey;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: badgeColor,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.info, color: Colors.white, size: 16),
          const SizedBox(width: 8),
          Text(
            'Status: $statusName',
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  String _formatDate(dynamic date) {
    if (date == null) return 'N/A';
    try {
      final dateTime = DateTime.parse(date.toString());
      return '${dateTime.day}/${dateTime.month}/${dateTime.year} ${dateTime.hour}:${dateTime.minute.toString().padLeft(2, '0')}';
    } catch (e) {
      return date.toString();
    }
  }
}
