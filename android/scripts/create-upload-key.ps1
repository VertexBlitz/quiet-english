$ErrorActionPreference = "Stop"

$keytool = Get-Command keytool -ErrorAction Stop
$signingDirectory = Join-Path $PSScriptRoot "..\signing"
New-Item -ItemType Directory -Force -Path $signingDirectory | Out-Null

$keystorePath = Join-Path $signingDirectory "quiet-english-upload.jks"
$base64Path = "$keystorePath.base64"
$alias = "quietenglish-upload"

if (Test-Path $keystorePath) {
    throw "Keystore already exists at $keystorePath. Do not overwrite an existing upload key."
}

Write-Host "Creating the permanent Quiet English Upload Key."
Write-Host "Choose a strong keystore password and remember it securely."
Write-Host "When keytool asks for the key password, you may press Enter to reuse the keystore password."

& $keytool.Source -genkeypair -v -storetype JKS -keystore $keystorePath -alias $alias -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Quiet English Upload"
if ($LASTEXITCODE -ne 0) {
    throw "keytool failed to create the upload keystore."
}

$base64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($keystorePath))
[IO.File]::WriteAllText($base64Path, $base64, [Text.Encoding]::ASCII)

Write-Host ""
Write-Host "Upload key created. Keep both files private:"
Write-Host "  Keystore: $keystorePath"
Write-Host "  Base64:   $base64Path"
Write-Host ""
Write-Host "Certificate fingerprint (SHA-256):"
& $keytool.Source -list -v -storetype JKS -keystore $keystorePath -alias $alias
if ($LASTEXITCODE -ne 0) {
    throw "Could not read the upload key certificate."
}

Write-Host ""
Write-Host "Add the Base64 file contents and the passwords as GitHub Actions secrets."
Write-Host "Never commit the signing directory or share the key/passwords in chat."
