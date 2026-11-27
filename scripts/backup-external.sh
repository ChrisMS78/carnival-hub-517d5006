#!/usr/bin/env bash
# Run on a trusted external Linux machine/NAS, not in the public GitHub repository.
set -euo pipefail
umask 077
: "${KEB_BACKUP_TOKEN:?Set a dedicated backup token}"
: "${KEB_BACKUP_PASSPHRASE_FILE:?Set path to a protected GPG passphrase file}"
: "${KEB_BACKUP_DIR:?Set a private backup destination}"
mkdir -p "$KEB_BACKUP_DIR"
work=$(mktemp -d "$KEB_BACKUP_DIR/.work.XXXXXX")
trap 'rm -rf "$work"' EXIT
stamp=$(date -u +%Y%m%dT%H%M%SZ)
# Pass the token via a private curl header file rather than the process command line.
printf 'X-KEB-Request: 1\nX-KEB-Backup-Token: %s\n' "$KEB_BACKUP_TOKEN" > "$work/headers"
curl --fail --silent --show-error --max-time 900 --request POST --header @"$work/headers" --output "$work/backup.zip" https://keb-ev.de/api/backup.php
unzip -tq "$work/backup.zip"
gpg --batch --yes --pinentry-mode loopback --passphrase-file "$KEB_BACKUP_PASSPHRASE_FILE" --symmetric --cipher-algo AES256 --output "$work/backup.zip.gpg" "$work/backup.zip"
mv "$work/backup.zip.gpg" "$KEB_BACKUP_DIR/KEB-$stamp.zip.gpg"
# Keep 30 days; an independent off-site copy and restore tests are recommended.
find "$KEB_BACKUP_DIR" -maxdepth 1 -type f -name 'KEB-*.zip.gpg' -mtime +30 -delete
