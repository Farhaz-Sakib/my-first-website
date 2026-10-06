#!/usr/bin/env python3
"""Build a debug APK; honor a cloud HTTPS proxy without storing credentials."""
import os
from pathlib import Path
import subprocess
import sys
from urllib.parse import urlsplit

root = Path(__file__).resolve().parents[1]
environment = os.environ.copy()
sdk = environment.get('ANDROID_HOME') or environment.get('ANDROID_SDK_ROOT')
if not sdk:
    default = Path('/workspace/.android-sdk')
    if default.exists():
        sdk = str(default)
    else:
        sys.exit('Install Android SDK 35 and set ANDROID_HOME; see README.md.')
environment['ANDROID_HOME'] = sdk
cloud_jdk = Path('/workspace/.java21/current')
if not environment.get('JAVA_HOME') and (cloud_jdk / 'bin/javac').exists():
    environment['JAVA_HOME'] = str(cloud_jdk)
environment.setdefault('ANDROID_USER_HOME', str(root.parent / '.android-user'))
environment.setdefault('GRADLE_USER_HOME', str(root.parent / '.gradle'))
proxy = urlsplit(environment.get('HTTPS_PROXY') or environment.get('https_proxy') or '')
options = environment.get('GRADLE_OPTS', '')
if proxy.hostname:
    # Platform proxy credentials stay in the platform. Do not extract or save them.
    port = proxy.port or (443 if proxy.scheme == 'https' else 80)
    options += f' -Dhttps.proxyHost={proxy.hostname} -Dhttps.proxyPort={port} -Dhttp.proxyHost={proxy.hostname} -Dhttp.proxyPort={port}'
    # Use the existing OS Java trust store in cloud builds. Never disable TLS checks.
    system_trust = Path('/etc/ssl/certs/java/cacerts')
    if system_trust.exists():
        options += f' -Djavax.net.ssl.trustStore={system_trust}'
environment['GRADLE_OPTS'] = options
command = ['cmd', '/c', 'gradlew.bat'] if os.name == 'nt' else ['./gradlew']
raise SystemExit(subprocess.call([*command, '--no-daemon', '--max-workers=2', ':app:assembleDebug'], cwd=root / 'android', env=environment))
