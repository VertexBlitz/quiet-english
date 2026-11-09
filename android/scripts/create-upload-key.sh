#!/usr/bin/env bash
set -euo pipefail
umask 077

command -v keytool >/dev/null 2>&1 || {
  echo "keytool is required. Install a Java JDK (17 or newer)." >&2
  exit 1
}

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
SIGNING_DIR="${SCRIPT_DIR}/../signing"
mkdir -p "$SIGNING_DIR"

KEYSTORE="$SIGNING_DIR/quiet-english-upload.jks"
BASE64_FILE="$KEYSTORE.base64"
ALIAS="quietenglish-upload"

if [[ -e "$KEYSTORE" ]]; then
  echo "Keystore already exists at $KEYSTORE. Do not overwrite an existing upload key." >&2
  exit 1
fi

echo "Creating the permanent Quiet English Upload Key."
echo "Choose a strong keystore password and keep it in a secure password manager."
echo "When prompted for the key password, press Enter to reuse the keystore password if desired."

keytool -genkeypair -v \
  -storetype JKS \
  -keystore "$KEYSTORE" \
  -alias "$ALIAS" \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -dname "CN=Quiet English Upload"

base64 "$KEYSTORE" | tr -d '\r\n' > "$BASE64_FILE"
chmod 600 "$KEYSTORE" "$BASE64_FILE"

echo
echo "Upload key created. Keep both files private:"
echo "  Keystore: $KEYSTORE"
echo "  Base64:   $BASE64_FILE"
echo
echo "Certificate fingerprint (SHA-256):"
keytool -list -v -storetype JKS -keystore "$KEYSTORE" -alias "$ALIAS"

echo
echo "Add the Base64 file contents and the passwords as GitHub Actions secrets."
echo "Never commit the signing directory or share the key/passwords in chat."
