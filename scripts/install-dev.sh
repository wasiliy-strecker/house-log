#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
device="${1:?Bitte die adb-Gerätekennung angeben.}"
apk="${2:-android/app/build/outputs/apk/dev/debug/app-dev-debug.apk}"
sdk="${ANDROID_HOME:-$HOME/.local/android-sdk}"
adb="$sdk/platform-tools/adb"
build_tools="$(find "$sdk/build-tools" -mindepth 1 -maxdepth 1 -type d | sort -V | tail -n 1)"
package='com.appfactory.house_log.dev'
badging="$("$build_tools/aapt" dump badging "$apk")"
if ! rg -q "^package: name='$package' " <<< "$badging" || ! rg -q '^application-debuggable' <<< "$badging"; then
  echo 'Abbruch. Erwartet wird ausschließlich eine Hausakte-Dev-Debug-APK.' >&2
  exit 1
fi
rg '^package:|^application-label:|^application-debuggable' <<< "$badging"
"$adb" -s "$device" get-state
installed="$("$adb" -s "$device" shell pm path "$package" | tr -d '\r' | sed -n 's/^package://p' | head -n 1 || true)"
if [ -n "$installed" ]; then
  "$adb" -s "$device" shell pm list packages -i --show-versioncode "$package"
  "$adb" -s "$device" shell dumpsys package "$package" | rg 'versionCode=|versionName=|flags=|installerPackageName=' || true
  temp="$(mktemp -d -t hausakte-cert-XXXXXXXX)"
  trap 'rm -rf "$temp"' EXIT
  "$adb" -s "$device" pull "$installed" "$temp/installed.apk" >/dev/null
  before="$("$build_tools/apksigner" verify --print-certs "$temp/installed.apk" | rg 'certificate SHA-256 digest')"
  after="$("$build_tools/apksigner" verify --print-certs "$apk" | rg 'certificate SHA-256 digest')"
  if [ "$before" != "$after" ]; then
    echo 'Abbruch. Die Signatur unterscheidet sich. Keine Installation und keine Datenlöschung ausgeführt.' >&2
    exit 1
  fi
  echo 'Signatur stimmt mit der vorhandenen Dev-Installation überein.'
else
  echo 'Keine vorhandene Hausakte-Dev-Installation. Version, Debug-Flag und Installer entfallen für den bisherigen Stand.'
fi
"$adb" -s "$device" install -r -t -g --no-streaming "$apk"
"$adb" -s "$device" shell pm list packages -i --show-versioncode "$package"
"$adb" -s "$device" shell dumpsys package "$package" | rg 'versionCode=|versionName=|flags=|installerPackageName=' || true
"$adb" -s "$device" reverse tcp:8083 tcp:8083
"$adb" -s "$device" shell am start -a android.intent.action.VIEW -d 'exp+hausakte://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8083' "$package"
