const {
  withAppBuildGradle,
  withAndroidManifest,
  withProjectBuildGradle,
  withDangerousMod,
} = require('expo/config-plugins');
const fs = require('node:fs/promises');
const path = require('node:path');

module.exports = function withHouseAndroid(config) {
  // Android native-stack does not expose a duration option. Override only the
  // four resources used by slide_from_right, including its reverse transition.
  config = withDangerousMod(config, [
    'android',
    async (mod) => {
      const res = path.join(
        mod.modRequest.platformProjectRoot,
        'app/src/main/res',
      );
      await fs.mkdir(path.join(res, 'anim'), { recursive: true });
      await fs.mkdir(path.join(res, 'values'), { recursive: true });
      await fs.writeFile(
        path.join(res, 'values/hausakte_navigation.xml'),
        `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <integer name="hausakte_screen_transition_duration">200</integer>
</resources>
`,
      );
      const slides = {
        rns_slide_in_from_right: ['100%', '0%'],
        rns_slide_out_to_left: ['0%', '-100%'],
        rns_slide_in_from_left: ['-100%', '0%'],
        rns_slide_out_to_right: ['0%', '100%'],
      };
      for (const [name, [from, to]] of Object.entries(slides)) {
        await fs.writeFile(
          path.join(res, 'anim', `${name}.xml`),
          `<?xml version="1.0" encoding="utf-8"?>
<translate xmlns:android="http://schemas.android.com/apk/res/android"
    android:duration="@integer/hausakte_screen_transition_duration"
    android:fromXDelta="${from}"
    android:toXDelta="${to}" />
`,
        );
      }
      return mod;
    },
  ]);
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
