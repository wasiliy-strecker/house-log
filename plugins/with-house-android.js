const {
  withAppBuildGradle,
  withAndroidManifest,
  withProjectBuildGradle,
} = require('expo/config-plugins');

module.exports = function withHouseAndroid(config) {
  config = withProjectBuildGradle(config, (mod) => {
    if (!mod.modResults.contents.includes('ext.ndkVersion'))
      mod.modResults.contents =
        'ext.ndkVersion = "28.2.13676358"\n' + mod.modResults.contents;
    return mod;
  });
  config = withAppBuildGradle(config, (mod) => {
    let source = mod.modResults.contents;
    if (!source.includes('// Hausakte variants')) {
      source = source.replace(
        'android {',
        `// Hausakte variants
android {
    flavorDimensions "distribution"
    productFlavors {
        dev {
            dimension "distribution"
            applicationIdSuffix ".dev"
            resValue "string", "app_name", "Hausakte Dev"
        }
        store {
            dimension "distribution"
            resValue "string", "app_name", "Hausakte"
        }
    }
`,
      );
      source = source.replace(
        'react {',
        'react {\n    debuggableVariants = ["devDebug"]',
      );
      // Never sign a Store release with the scaffold's debug key.
      source = source.replace(
        /(release\s*\{[\s\S]*?)signingConfig signingConfigs.debug/,
        '$1signingConfig = null',
      );
      source += `
androidComponents {
    beforeVariants(selector().all()) { variant ->
        if (variant.productFlavors.any { it.second == "store" } && variant.buildType != "release") {
            variant.enable = false
        }
    }
}
`;
      mod.modResults.contents = source;
    }
    return mod;
  });
  return withAndroidManifest(config, (mod) => {
    const app = mod.modResults.manifest.application[0];
    app.$['android:allowBackup'] = 'false';
    app.$['android:fullBackupContent'] = 'false';
    app['meta-data'] = (app['meta-data'] ?? []).filter(
      (item) => item.$['android:name'] !== 'EXDevMenuShowFloatingActionButton',
    );
    app['meta-data'].push({
      $: {
        'android:name': 'EXDevMenuShowFloatingActionButton',
        'android:value': 'false',
      },
    });
    return mod;
  });
};
