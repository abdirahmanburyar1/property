import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';
import '../providers/property_provider.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';

class CreatePropertyScreen extends StatefulWidget {
  const CreatePropertyScreen({super.key});

  @override
  State<CreatePropertyScreen> createState() => _CreatePropertyScreenState();
}

class _CreatePropertyScreenState extends State<CreatePropertyScreen> {
  final _formKey = GlobalKey<FormState>();
  bool _isLoading = false;
  bool _isSubmitting = false;

  // Form Controllers
  final _streetAddressController = TextEditingController();
  final _plateNumberController = TextEditingController();
  final _heightController = TextEditingController();
  final _widthController = TextEditingController();
  final _ownerNameController = TextEditingController();
  final _ownerPhoneController = TextEditingController();
  final _ownerEmailController = TextEditingController();
  final _responsibleNameController = TextEditingController();
  final _responsiblePhoneController = TextEditingController();
  final _responsibleEmailController = TextEditingController();
  final _responsibleRelationshipController = TextEditingController();
  final _latitudeController = TextEditingController();
  final _longitudeController = TextEditingController();

  // Dropdown values
  String? _selectedPropertyTypeId;
  String? _selectedSectionId;
  String? _selectedSubSectionId;
  String? _selectedOwnerId;
  String? _selectedResponsibleId;

  // Use current user's region/city on create (same as React)
  bool _useOwner = true; // toggle: owner vs responsible

  // Lists
  List<Map<String, dynamic>> _propertyTypes = [];
  List<Map<String, dynamic>> _sections = [];
  List<Map<String, dynamic>> _subSections = [];
  List<Map<String, dynamic>> _owners = [];
  List<Map<String, dynamic>> _responsiblePersons = [];

  // Image selection
  final ImagePicker _imagePicker = ImagePicker();
  List<File> _selectedImages = [];
  bool _uploadingImages = false;

  @override
  void initState() {
    super.initState();
    _loadData();
    _getCurrentLocation();
    _heightController.addListener(() => setState(() {}));
    _widthController.addListener(() => setState(() {}));
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
    });

    final propertyProvider = Provider.of<PropertyProvider>(context, listen: false);

    try {
      final [propertyTypes, sections] = await Future.wait([
        propertyProvider.fetchPropertyTypes(),
        propertyProvider.fetchSections(),
      ]);

      setState(() {
        _propertyTypes = propertyTypes;
        _sections = sections;
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

  Future<void> _getCurrentLocation() async {
    try {
      // Request location permission
      final status = await Permission.location.request();
      if (!status.isGranted) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Location permission is required')),
          );
        }
        return;
      }

      // Get current position
      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );

      setState(() {
        _latitudeController.text = position.latitude.toStringAsFixed(6);
        _longitudeController.text = position.longitude.toStringAsFixed(6);
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error getting location: $e')),
        );
      }
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
    setState(() {
      _subSections = list;
      _selectedSubSectionId = null;
    });
  }

  Future<void> _searchOwners(String query) async {
    if (query.length < 2) {
      setState(() {
        _owners = [];
      });
      return;
    }

    final propertyProvider = Provider.of<PropertyProvider>(context, listen: false);
    final owners = await propertyProvider.searchOwners(query);
    setState(() {
      _owners = owners;
    });
  }

  Future<void> _searchResponsiblePersons(String query) async {
    if (query.length < 2) {
      setState(() {
        _responsiblePersons = [];
      });
      return;
    }

    final propertyProvider = Provider.of<PropertyProvider>(context, listen: false);
    final list = await propertyProvider.searchResponsiblePersons(query);
    setState(() {
      _responsiblePersons = list;
    });
  }

  Future<void> _pickImages() async {
    try {
      // Request storage permission (handles different Android versions)
      PermissionStatus status;
      if (await Permission.photos.isGranted || await Permission.photos.isLimited) {
        status = await Permission.photos.status;
      } else {
        status = await Permission.photos.request();
      }
      
      // Fallback to storage permission for older Android versions
      if (!status.isGranted && !status.isLimited) {
        status = await Permission.storage.request();
      }
      
      if (!status.isGranted && !status.isLimited) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Storage permission is required to select images')),
          );
        }
        return;
      }

      final List<XFile> images = await _imagePicker.pickMultiImage(
        imageQuality: 85,
        maxWidth: 1920,
        maxHeight: 1920,
      );

      if (images.isNotEmpty) {
        setState(() {
          _selectedImages = images.map((xFile) => File(xFile.path)).toList();
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error picking images: $e')),
        );
      }
    }
  }

  Future<void> _takePicture() async {
    try {
      // Request camera permission
      final status = await Permission.camera.request();
      if (!status.isGranted) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Camera permission is required to take photos')),
          );
        }
        return;
      }

      final XFile? image = await _imagePicker.pickImage(
        source: ImageSource.camera,
        imageQuality: 85,
        maxWidth: 1920,
        maxHeight: 1920,
      );

      if (image != null) {
        setState(() {
          _selectedImages.add(File(image.path));
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error taking picture: $e')),
        );
      }
    }
  }

  Future<void> _uploadImages(String propertyId) async {
    if (_selectedImages.isEmpty) return;

    setState(() {
      _uploadingImages = true;
    });

    try {
      for (var imageFile in _selectedImages) {
        final fileName = imageFile.path.split('/').last;
        await ApiService.uploadFile(
          '/properties/$propertyId/images',
          imageFile.path,
          fileName,
        );
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Images uploaded successfully!'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error uploading images: $e'),
            backgroundColor: Colors.orange,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _uploadingImages = false;
        });
      }
    }
  }

  void _removeImage(int index) {
    setState(() {
      _selectedImages.removeAt(index);
    });
  }

  /// Area is always calculated from height × width (never manual input). Same design as edit screen.
  Widget _buildCalculatedAreaDisplay() {
    final h = double.tryParse(_heightController.text.trim());
    final w = double.tryParse(_widthController.text.trim());
    final area = (h != null && w != null && h > 0 && w > 0) ? (h * w).toStringAsFixed(2) : '—';
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

  Future<void> _submitForm() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    if (_selectedPropertyTypeId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a property type')),
      );
      return;
    }

    final plateNumber = _plateNumberController.text.trim();
    if (plateNumber.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Plate number is required')),
      );
      return;
    }

    if (_selectedSectionId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a section')),
      );
      return;
    }

    if (_selectedSubSectionId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a subsection')),
      );
      return;
    }

    final hasOwner = _selectedOwnerId != null || _ownerNameController.text.trim().isNotEmpty;
    final hasResponsible = _selectedResponsibleId != null || _responsibleNameController.text.trim().isNotEmpty;
    if (!hasOwner && !hasResponsible) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please provide either an owner or a responsible person')),
      );
      return;
    }

    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final user = authProvider.user;
    final regionId = user?['regionId']?.toString();
    final cityId = user?['cityId']?.toString();
    if (regionId == null || cityId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Your account must have a region and city assigned. Contact administrator.')),
      );
      return;
    }

    setState(() {
      _isSubmitting = true;
    });

    try {
      final height = double.tryParse(_heightController.text) ?? 0;
      final width = double.tryParse(_widthController.text) ?? 0;
      final latitude = double.tryParse(_latitudeController.text) ?? 0;
      final longitude = double.tryParse(_longitudeController.text) ?? 0;

      // Get property type to calculate amount
      final propertyType = _propertyTypes.firstWhere(
        (pt) => pt['id']?.toString() == _selectedPropertyTypeId,
      );
      final price = (propertyType['price'] ?? 0).toDouble();
      final areaSize = height * width;
      final estimatedValue = areaSize * price;

      final propertyData = <String, dynamic>{
        'streetAddress': _streetAddressController.text.trim(),
        'plateNumber': plateNumber,
        'latitude': latitude,
        'longitude': longitude,
        'height': height,
        'width': width,
        'areaSize': areaSize,
        'estimatedValue': estimatedValue,
        'propertyTypeId': _selectedPropertyTypeId,
        'regionId': regionId,
        'cityId': cityId,
        'sectionId': _selectedSectionId,
        'subSectionId': _selectedSubSectionId,
        'currency': 'USD',
        'areaUnit': 'm',
      };
      if (hasOwner) {
        if (_selectedOwnerId != null) {
          propertyData['ownerId'] = _selectedOwnerId;
        } else {
          propertyData['newOwner'] = {
            'name': _ownerNameController.text.trim(),
            'phone': _ownerPhoneController.text.trim().isEmpty ? null : _ownerPhoneController.text.trim(),
            'email': _ownerEmailController.text.trim().isEmpty ? null : _ownerEmailController.text.trim().toLowerCase(),
          };
        }
      }
      if (hasResponsible) {
        if (_selectedResponsibleId != null) {
          propertyData['responsiblePersonId'] = _selectedResponsibleId;
        } else {
          propertyData['newResponsiblePerson'] = {
            'name': _responsibleNameController.text.trim(),
            'phone': _responsiblePhoneController.text.trim().isEmpty ? null : _responsiblePhoneController.text.trim(),
            'email': _responsibleEmailController.text.trim().isEmpty ? null : _responsibleEmailController.text.trim().toLowerCase(),
            'relationship': _responsibleRelationshipController.text.trim().isEmpty ? null : _responsibleRelationshipController.text.trim(),
          };
        }
      }

      final propertyProvider = Provider.of<PropertyProvider>(context, listen: false);
      final result = await propertyProvider.createProperty(propertyData);

      if (result != null && mounted) {
        final propertyId = result['id']?.toString();
        
        // Upload images if any were selected
        if (_selectedImages.isNotEmpty && propertyId != null) {
          await _uploadImages(propertyId);
        }
        
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Property created successfully!'),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.pop(context);
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(propertyProvider.error ?? 'Failed to create property'),
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
        setState(() {
          _isSubmitting = false;
        });
      }
    }
  }

  @override
  void dispose() {
    _streetAddressController.dispose();
    _plateNumberController.dispose();
    _heightController.dispose();
    _widthController.dispose();
    _ownerNameController.dispose();
    _ownerPhoneController.dispose();
    _ownerEmailController.dispose();
    _responsibleNameController.dispose();
    _responsiblePhoneController.dispose();
    _responsibleEmailController.dispose();
    _responsibleRelationshipController.dispose();
    _latitudeController.dispose();
    _longitudeController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(title: const Text('Create Property')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Create Property'),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Property Type
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
              onChanged: (value) {
                setState(() {
                  _selectedPropertyTypeId = value;
                });
              },
              validator: (value) {
                if (value == null) {
                  return 'Please select a property type';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),

            // Street Address
            TextFormField(
              controller: _streetAddressController,
              decoration: const InputDecoration(
                labelText: 'Street Address *',
                prefixIcon: Icon(Icons.location_on),
              ),
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'Please enter street address';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),

            // Plate Number (required)
            TextFormField(
              controller: _plateNumberController,
              decoration: const InputDecoration(
                labelText: 'Plate Number *',
                prefixIcon: Icon(Icons.confirmation_number),
                hintText: 'e.g. PLT-001',
              ),
              validator: (value) {
                if (value == null || value.trim().isEmpty) {
                  return 'Plate number is required';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),

            // Section *
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
                setState(() {
                  _selectedSectionId = value;
                });
                _loadSubSections(value);
              },
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'Please select a section';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),

            // Subsection *
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
                  : (value) {
                      setState(() {
                        _selectedSubSectionId = value;
                      });
                    },
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'Please select a subsection';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),
            // Region/City from current user (same as React) — not shown on create

            // Height and Width
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _heightController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: 'Height (m) *',
                      prefixIcon: Icon(Icons.height),
                    ),
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Required';
                      }
                      if (double.tryParse(value) == null || double.parse(value) <= 0) {
                        return 'Invalid';
                      }
                      return null;
                    },
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: TextFormField(
                    controller: _widthController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: 'Width (m) *',
                      prefixIcon: Icon(Icons.width_wide),
                    ),
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Required';
                      }
                      if (double.tryParse(value) == null || double.parse(value) <= 0) {
                        return 'Invalid';
                      }
                      return null;
                    },
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            // Area (m²) — calculated from height × width, read-only (same design as edit screen)
            _buildCalculatedAreaDisplay(),
            const SizedBox(height: 16),

            // Coordinates
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _latitudeController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: 'Latitude *',
                      prefixIcon: Icon(Icons.my_location),
                    ),
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Required';
                      }
                      if (double.tryParse(value) == null) {
                        return 'Invalid';
                      }
                      return null;
                    },
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: TextFormField(
                    controller: _longitudeController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: 'Longitude *',
                      prefixIcon: Icon(Icons.explore),
                    ),
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Required';
                      }
                      if (double.tryParse(value) == null) {
                        return 'Invalid';
                      }
                      return null;
                    },
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            OutlinedButton.icon(
              onPressed: _getCurrentLocation,
              icon: const Icon(Icons.gps_fixed),
              label: const Text('Get Current Location'),
            ),
            const SizedBox(height: 24),

            // Owner or Responsible Person (at least one required) — same as React
            const Divider(),
            const SizedBox(height: 16),
            Text(
              'Owner or Responsible Person *',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 8),
            Text(
              'Provide either an owner or a responsible person (at least one required).',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.grey[600]),
            ),
            const SizedBox(height: 16),

            // Toggle: Owner vs Responsible
            SegmentedButton<bool>(
              segments: const [
                ButtonSegment(value: true, label: Text('Owner'), icon: Icon(Icons.person)),
                ButtonSegment(value: false, label: Text('Responsible'), icon: Icon(Icons.badge)),
              ],
              selected: {_useOwner},
              onSelectionChanged: (Set<bool> selected) {
                setState(() {
                  _useOwner = selected.first;
                });
              },
            ),
            const SizedBox(height: 16),

            if (_useOwner) ...[
              // Search Owner
              Autocomplete<Map<String, dynamic>>(
                optionsBuilder: (textEditingValue) async {
                  if (textEditingValue.text.length >= 2) {
                    await _searchOwners(textEditingValue.text);
                    return _owners;
                  }
                  return [];
                },
                displayStringForOption: (option) =>
                    '${option['name']} - ${option['phone'] ?? 'No phone'}',
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
              TextFormField(
                controller: _ownerNameController,
                decoration: const InputDecoration(
                  labelText: 'Owner Name',
                  prefixIcon: Icon(Icons.person),
                ),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _ownerPhoneController,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(
                  labelText: 'Owner Phone',
                  prefixIcon: Icon(Icons.phone),
                ),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _ownerEmailController,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(
                  labelText: 'Owner Email',
                  prefixIcon: Icon(Icons.email),
                ),
              ),
            ] else ...[
              // Search Responsible Person
              Autocomplete<Map<String, dynamic>>(
                optionsBuilder: (textEditingValue) async {
                  if (textEditingValue.text.length >= 2) {
                    await _searchResponsiblePersons(textEditingValue.text);
                    return _responsiblePersons;
                  }
                  return [];
                },
                displayStringForOption: (option) =>
                    '${option['name']} - ${option['phone'] ?? 'No phone'}',
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
              TextFormField(
                controller: _responsibleNameController,
                decoration: const InputDecoration(
                  labelText: 'Responsible Name',
                  prefixIcon: Icon(Icons.badge),
                ),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _responsiblePhoneController,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(
                  labelText: 'Responsible Phone',
                  prefixIcon: Icon(Icons.phone),
                ),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _responsibleEmailController,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(
                  labelText: 'Responsible Email',
                  prefixIcon: Icon(Icons.email),
                ),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _responsibleRelationshipController,
                decoration: const InputDecoration(
                  labelText: 'Relationship',
                  prefixIcon: Icon(Icons.link),
                ),
              ),
            ],
            const SizedBox(height: 24),

            // Property Images Section
            const Divider(),
            const SizedBox(height: 16),
            Text(
              'Property Images',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 8),
            Text(
              'Add images of the property (optional)',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Colors.grey[600],
                  ),
            ),
            const SizedBox(height: 16),

            // Image Selection Buttons
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _pickImages,
                    icon: const Icon(Icons.photo_library),
                    label: const Text('Choose from Gallery'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _takePicture,
                    icon: const Icon(Icons.camera_alt),
                    label: const Text('Take Photo'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Selected Images Preview
            if (_selectedImages.isNotEmpty) ...[
              Text(
                'Selected Images (${_selectedImages.length})',
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                height: 120,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  itemCount: _selectedImages.length,
                  itemBuilder: (context, index) {
                    return Padding(
                      padding: const EdgeInsets.only(right: 12),
                      child: Stack(
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: Image.file(
                              _selectedImages[index],
                              width: 120,
                              height: 120,
                              fit: BoxFit.cover,
                            ),
                          ),
                          Positioned(
                            top: 4,
                            right: 4,
                            child: CircleAvatar(
                              radius: 14,
                              backgroundColor: Colors.red,
                              child: IconButton(
                                padding: EdgeInsets.zero,
                                iconSize: 16,
                                icon: const Icon(Icons.close, color: Colors.white),
                                onPressed: () => _removeImage(index),
                              ),
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(height: 16),
            ],

            if (_uploadingImages) ...[
              const LinearProgressIndicator(),
              const SizedBox(height: 8),
              const Text(
                'Uploading images...',
                style: TextStyle(fontSize: 12, color: Colors.grey),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
            ],

            const SizedBox(height: 24),

            // Submit Button
            ElevatedButton(
              onPressed: _isSubmitting ? null : _submitForm,
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: _isSubmitting
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text(
                      'Create Property',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                    ),
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }
}
