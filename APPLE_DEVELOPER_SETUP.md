# 🍎 Apple Developer Code Signing & Notarization Setup

This guide will help you set up proper code signing and notarization for ENGIE as an Apple Developer.

## 📋 Prerequisites

- Active **Apple Developer Program** membership ($99/year)
- **Xcode** installed (available from Mac App Store)
- **Xcode Command Line Tools** installed

## 🔧 Step 1: Install Your Apple Developer Certificates

### Option A: Using Xcode (Recommended)
1. **Open Xcode**
2. **Xcode** → **Preferences** → **Accounts**
3. **Click "+"** → **Add Apple ID**
4. **Sign in** with your Apple Developer account
5. **Select your team** → **Manage Certificates**
6. **Click "+"** → **Create certificates:**
   - **Developer ID Application** (for distribution outside Mac App Store)
   - **Developer ID Installer** (for installer packages)

### Option B: Using Apple Developer Portal
1. **Visit** [Apple Developer Portal](https://developer.apple.com/certificates)
2. **Create certificates:**
   - **Developer ID Application**
   - **Developer ID Installer**
3. **Download** and **double-click** to install in Keychain

## 🔍 Step 2: Verify Certificate Installation

Run this command to check if certificates are properly installed:

\`\`\`bash
security find-identity -v -p codesigning
\`\`\`

You should see something like:
\`\`\`
1) ABC123DEF456 "Developer ID Application: Your Name (TEAM_ID)"
2) XYZ789GHI012 "Developer ID Installer: Your Name (TEAM_ID)"
\`\`\`

## 🔐 Step 3: Set Up Environment Variables

### Create `.env` file with your Apple Developer credentials:

\`\`\`bash
# Copy from .env.example and fill in your details:
cp .env.example .env.local
\`\`\`

### Required variables for code signing and notarization:
\`\`\`bash
# Apple Developer Account
APPLE_ID=your-apple-id@example.com
APPLE_TEAM_ID=ABC123DEF4
APPLE_ID_PASSWORD=your-app-specific-password

# Code Signing Identity (copy from Step 2 output)
CSC_NAME="Developer ID Application: Your Name (ABC123DEF4)"
\`\`\`

## 🔑 Step 4: Create App-Specific Password

1. **Visit** [Apple ID Account Page](https://appleid.apple.com/)
2. **Sign in** with your Apple ID
3. **Security section** → **App-Specific Passwords**
4. **Generate password** for "ENGIE Notarization"
5. **Copy the password** and use it as `APPLE_ID_PASSWORD`

## 🏗️ Step 5: Update Package.json (Already Done)

Your `package.json` has been updated with:
- ✅ **Hardened Runtime** enabled
- ✅ **Entitlements** configured
- ✅ **Notarization** script added

## 🚀 Step 6: Build with Code Signing

### Development (No Signing)
\`\`\`bash
npm run dev
\`\`\`

### Production (With Signing & Notarization)
\`\`\`bash
# Make sure your .env file is set up first!
npm run build
\`\`\`

## 🎯 Expected Build Output

**With Proper Certificates:**
\`\`\`
✓ signing         file=release/mac/ENGIE.app identity=Developer ID Application: Your Name
✓ notarizing      bundle=com.engie.macos-app
✓ notarized       
✓ building        target=DMG
\`\`\`

**Without Certificates (Current):**
\`\`\`
⚠️ skipped macOS application code signing  reason=cannot find valid "Developer ID Application" identity
\`\`\`

## 🔧 Troubleshooting

### Certificate Not Found
\`\`\`bash
# List all certificates
security find-identity -v

# Import certificate if needed
security import YourCertificate.p12 -k ~/Library/Keychains/login.keychain
\`\`\`

### Notarization Fails
- ✅ **Check Apple ID credentials** in `.env`
- ✅ **Verify app-specific password**
- ✅ **Confirm Team ID** is correct
- ✅ **Ensure 2FA is enabled** on Apple ID

### Team ID Location
- **Apple Developer Portal** → **Membership** → **Team ID**
- **Xcode** → **Preferences** → **Accounts** → **View Details**

## 📱 Distribution Options

### 1. Direct Distribution (Current Setup)
- **Signed & Notarized DMG** files
- **Users download** and install manually
- **Gatekeeper approved** (no warnings)

### 2. Mac App Store (Future)
- **Different certificates** required
- **Additional review process**
- **Automatic updates** via App Store

## 🎉 Success Indicators

When everything is set up correctly:
- ✅ **No signing warnings** during build
- ✅ **"✓ notarized"** appears in build output  
- ✅ **DMG opens without warnings** on other Macs
- ✅ **App runs without security prompts**

---

## 🆘 Need Help?

1. **Check** [Apple Developer Documentation](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)
2. **Contact** Apple Developer Support
3. **Review** the build logs for specific error messages 