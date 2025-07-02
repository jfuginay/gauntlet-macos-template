const { notarize } = require('@electron/notarize');

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;
  
  if (electronPlatformName !== 'darwin') {
    return;
  }

  // Check if we have the required environment variables for notarization
  if (!process.env.APPLE_ID || !process.env.APPLE_ID_PASSWORD || !process.env.APPLE_TEAM_ID) {
    console.log('⚠️  Skipping notarization: Missing Apple ID credentials');
    console.log('   To enable notarization, set these environment variables:');
    console.log('   - APPLE_ID (your Apple ID email)');
    console.log('   - APPLE_ID_PASSWORD (app-specific password)');
    console.log('   - APPLE_TEAM_ID (your Apple Developer Team ID)');
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const appPath = `${appOutDir}/${appName}.app`;

  console.log(`🍎 Notarizing ${appName}...`);
  console.log(`📍 App path: ${appPath}`);

  try {
    await notarize({
      appBundleId: 'com.engie.macos-app',
      appPath: appPath,
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_ID_PASSWORD,
      teamId: process.env.APPLE_TEAM_ID,
      tool: 'notarytool', // Use the newer notarytool instead of altool
    });

    console.log('✅ Notarization complete');
  } catch (error) {
    console.error('❌ Notarization failed:', error);
    throw error;
  }
}; 