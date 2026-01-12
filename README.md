Hisaab Kitaab POS 🧾
A complete Point of Sale (POS) system built with React Native and Firebase. Designed for Cafes and Restaurants to manage orders, print thermal receipts via Bluetooth, and track daily financial reports.

🚀 Features
Table Management: Visual grid layout to manage active tables and orders.

Menu Management: Add, edit, and delete items and categories dynamically. Supports item variants (e.g., Half/Full).

Order Processing: Real-time cart management, calculation of totals, discounts, and extra charges.

Bluetooth Printing: Seamless integration with Thermal Printers (58mm & 80mm support). Prints professional receipts with cafe details.

Financial Reports: View Daily, Monthly, and Yearly sales. Track pending payments vs. paid orders.

PDF Export: Generate and download detailed sales reports as PDFs.

User Authentication: Secure Email/Password login with email verification enforcement.

Customizable Settings: Change Cafe Name, Phone Number, and Receipt Footer directly from the app.

🛠️ Tech Stack
Frontend: React Native (CLI)

Backend/Database: Firebase Firestore (Real-time updates)

Auth: Firebase Authentication

Printing: react-native-bluetooth-escpos-printer

Icons: Lucide React Native

Storage: Async Storage (Local settings)

⚙️ Installation & Setup
Since this project relies on Firebase, you must set up your own Firebase project to run the app.

1. Clone the Repository
Bash

git clone https://github.com/IshaanAjaz/Cafe-POS-System

2. Install Dependencies
Bash

npm install
# or
yarn install
3. Firebase Configuration (Critical Step)
This app requires google-services.json (Android) and GoogleService-Info.plist (iOS) to function. These files are not included in the repo for security reasons.

Go to the Firebase Console.

Create a new project.

Enable Authentication:

Go to Build > Authentication > Sign-in method.

Enable Email/Password.

Enable Firestore Database:

Go to Build > Firestore Database > Create Database.

Start in Production Mode.

(Optional) Update rules to allow authenticated read/write:

JavaScript

allow read, write: if request.auth != null;
Add Android App:

Package name: com.hisaabkitaab (Check your android/app/build.gradle applicationId to be sure).

Download google-services.json.

Place it inside android/app/.

Add iOS App (If building for iOS):

Download GoogleService-Info.plist.

Place it inside ios/.

4. Run the App
For Android:

Bash

npx react-native run-android
For iOS:

Bash

cd ios && pod install && cd ..
npx react-native run-ios
📱 Generating a Release APK
To generate a standalone APK file to install on your phone:

Ensure you have set up your my-upload-key.keystore and gradle.properties as per React Native documentation.

Run the build command:

Bash

cd android
./gradlew assembleRelease
The APK will be generated at: android/app/build/outputs/apk/release/app-release.apk

🖨️ Printer Setup
The app supports ESC/POS Bluetooth Thermal Printers.

Go to Settings tab within the app.

Ensure Bluetooth is ON and the printer is paired with your phone settings first.

Click "Scan Devices".

Select your printer from the list.

Click "Test Print" to verify connection.

Note on Permissions: On Android 12+ (API 31+), the app will request BLUETOOTH_SCAN and BLUETOOTH_CONNECT permissions. On older versions, it requests ACCESS_FINE_LOCATION.

📄 License
This project is licensed under the MIT License - see the LICENSE file for details.
