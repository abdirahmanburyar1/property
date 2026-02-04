# Property Collector Mobile App

Flutter mobile application for property collectors to register properties in the field.

## Features

- **Login**: Secure authentication with the backend API
- **Home Screen**: View list of registered properties
- **Create Property**: Register new properties with:
  - Property type selection
  - Location (GPS coordinates)
  - Height and width measurements
  - Owner information (search existing or create new)
  - Region and City selection

## Setup

1. Install Flutter dependencies:
```bash
cd mobile
flutter pub get
```

2. Configure API Base URL:
   - Update the base URL in `lib/main.dart` or set it via SharedPreferences
   - Default: `http://localhost:9000/api`
   - For Android emulator: `http://10.0.2.2:9000/api`
   - For iOS simulator: `http://localhost:9000/api`
   - For physical device: Use your computer's IP address (e.g., `http://192.168.1.100:9000/api`)

3. Run the app:
```bash
flutter run
```

## Permissions

The app requires the following permissions:
- **Location**: To capture GPS coordinates for properties
- **Internet**: To communicate with the backend API

## API Endpoints Used

- `POST /api/auth/login` - User authentication
- `GET /api/auth/me` - Get current user
- `GET /api/properties` - List properties
- `POST /api/properties` - Create property
- `GET /api/propertytypes` - List property types
- `GET /api/regions` - List regions
- `GET /api/cities` - List cities (filtered by region)
- `GET /api/owners` - Search owners
- `POST /api/owners` - Create owner

## Project Structure

```
lib/
├── main.dart                 # App entry point
├── providers/               # State management
│   ├── auth_provider.dart
│   └── property_provider.dart
├── screens/                 # UI screens
│   ├── login_screen.dart
│   ├── home_screen.dart
│   └── create_property_screen.dart
└── services/                # API services
    └── api_service.dart
```
