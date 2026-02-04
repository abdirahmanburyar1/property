#!/bin/bash

echo "========================================="
echo "Property Collector Mobile App Setup"
echo "========================================="
echo ""

# Navigate to mobile directory
cd "$(dirname "$0")"

echo "Step 1: Cleaning previous builds..."
flutter clean

echo ""
echo "Step 2: Getting dependencies..."
flutter pub get

echo ""
echo "Step 3: Checking Flutter doctor..."
flutter doctor

echo ""
echo "========================================="
echo "Setup Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Pair your Bluetooth printer in Android settings"
echo "2. Connect your Android device"
echo "3. Run: flutter run"
echo ""
echo "For more information, see:"
echo "- PAYMENT_PRINTING_GUIDE.md"
echo "- IMPLEMENTATION_SUMMARY.md"
echo ""
