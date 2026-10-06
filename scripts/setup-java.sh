#!/usr/bin/env bash
set -euo pipefail
jdk_root=/workspace/.java21/current
if [[ -x "$jdk_root/bin/javac" ]]; then
  "$jdk_root/bin/javac" -version
  exit 0
fi
if [[ -e "$jdk_root" ]]; then
  echo 'An incomplete JDK exists. Inspect it before reinstalling.' >&2
  exit 1
fi
archive=$(mktemp /tmp/krishi-jdk.XXXXXX.tar.gz)
staging=$(mktemp -d /tmp/krishi-jdk.XXXXXX)
trap 'rm -f "$archive"; rm -rf "$staging"' EXIT
curl --fail --location --silent --show-error --retry 2 'https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.12.1%2B1/OpenJDK21U-jdk_x64_linux_hotspot_21.0.12.1_1.tar.gz' -o "$archive"
printf '%s  %s\n' 'ce79869e1307ed8ee1e2baa86a412b1eb5b75d10a01006d788a6f968bcfaee94' "$archive" | sha256sum --check
tar -xzf "$archive" --strip-components=1 -C "$staging"
mkdir -p /workspace/.java21
mv "$staging" "$jdk_root"
"$jdk_root/bin/javac" -version
