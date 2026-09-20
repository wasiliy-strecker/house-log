#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export ANDROID_HOME="${ANDROID_HOME:-$HOME/.local/android-sdk}"
if [ -z "${JAVA_HOME:-}" ] && [ -x "$HOME/.local/jdk-21/bin/javac" ]; then
  export JAVA_HOME="$HOME/.local/jdk-21"
fi
if [ ! -f android/app/debug.keystore ]; then
  mkdir -p android/app
  keytool_bin="${JAVA_HOME:+$JAVA_HOME/bin/}keytool"
  "$keytool_bin" -genkeypair -keystore android/app/debug.keystore -storepass android -keypass android -alias androiddebugkey -dname 'CN=Hausakte Local Development' -keyalg RSA -keysize 2048 -validity 10000 -noprompt
fi
npx expo prebuild --platform android --no-install
cd android
./gradlew :app:assembleDevDebug -PreactNativeArchitectures=arm64-v8a,x86_64 --max-workers=4 "$@"
