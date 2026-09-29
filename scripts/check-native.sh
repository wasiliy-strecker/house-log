#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../android"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/.local/android-sdk}"
if [ -z "${JAVA_HOME:-}" ] && [ -x "$HOME/.local/jdk-21/bin/javac" ]; then
  export JAVA_HOME="$HOME/.local/jdk-21"
fi
# SDK 57 dependency lint crashes in Kotlin analysis (Cannot find a KaModule).
# Skip only those dependency tasks. Own module analysis and errors stay enabled.
./gradlew :house-native:testDebugUnitTest :house-native:lintDebug \
  -x :react-native-worklets:lintAnalyzeDebug \
  -x :expo-modules-core:lintAnalyzeDebug \
  --max-workers=4 "$@"
