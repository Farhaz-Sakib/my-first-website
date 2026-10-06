#!/usr/bin/env bash
set -euo pipefail
export ANDROID_HOME="${ANDROID_HOME:-/workspace/.android-sdk}"
export ANDROID_USER_HOME="${ANDROID_USER_HOME:-/workspace/.android-user}"
export XDG_CACHE_HOME="${XDG_CACHE_HOME:-/workspace/.cache}"
export XDG_DATA_HOME="${XDG_DATA_HOME:-/workspace/.local/share}"
export XDG_CONFIG_HOME="${XDG_CONFIG_HOME:-/workspace/.config}"
mkdir -p "$ANDROID_HOME/cmdline-tools" "$ANDROID_USER_HOME" "$XDG_CACHE_HOME" "$XDG_DATA_HOME" "$XDG_CONFIG_HOME"
if [[ ! -x "$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" ]]; then
  archive=$(mktemp /tmp/krishi-android-tools.XXXXXX.zip)
  staging=$(mktemp -d /tmp/krishi-android-tools.XXXXXX)
  trap 'rm -f "$archive"; rm -rf "$staging"' EXIT
  curl --fail --location --silent --show-error --retry 2 'https://dl.google.com/android/repository/commandlinetools-linux-16111833_latest.zip' -o "$archive"
  printf '%s  %s\n' 'e025545c62a8e64c7559119566a569fb1dec5f60' "$archive" | sha1sum --check
  unzip -q "$archive" -d "$staging"
  # Preserve any existing incomplete tool installation for diagnosis.
  if [[ -e "$ANDROID_HOME/cmdline-tools/latest" ]]; then
    echo 'Existing incomplete command-line tools found. Inspect them before reinstalling.' >&2
    exit 1
  fi
  mv "$staging/cmdline-tools" "$ANDROID_HOME/cmdline-tools/latest"
fi
if [[ ! -f "$ANDROID_HOME/platforms/android-35/android.jar" || ! -x "$ANDROID_HOME/build-tools/35.0.0/aapt2" || ! -x "$ANDROID_HOME/build-tools/34.0.0/aapt2" || ! -x "$ANDROID_HOME/platform-tools/adb" ]]; then
  "$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" --sdk_root="$ANDROID_HOME" 'platform-tools' 'platforms;android-35' 'build-tools;35.0.0' 'build-tools;34.0.0'
fi
