# K.E.B. e.V. Bösensell

React/Vite frontend with a PHP 8.4 / MySQL 8.4 backend on Host Europe.

## Deployment

Pushes validate the frontend build and PHP syntax without publishing. Deployment is manually triggered from Actions > Build and Deploy to HostEurope > Run workflow (main).
Repository secrets: FTP_SERVER, FTP_USERNAME, FTP_PASSWORD, KEB_DB_PASSWORD, KEB_SETUP_TOKEN.
The database configuration is generated in the deployment output and is never committed.
Upload directories are excluded from synchronization; clean slate must remain disabled.

## Initial setup

After a successful deployment open https://keb-ev.de/api/setup.php over HTTPS.
Enter the setup token and the first administrator email and password (12–72 bytes).
The installer checks image processing and write access, creates tables and inserts initial settings.
It rejects further setup requests once a user exists.
Log in at https://keb-ev.de/admin and populate the site settings, events, gallery and texts.
No old data is imported. The initial data must be entered manually.

## Storage

Gallery images: /bilder/<album-folder>/<album-folder>_001.jpg and _001_small.jpg.
The album folder is assigned at creation and remains stable when the display title changes.
The original upload is discarded; maximum 400000 bytes and 1600 px for the large image,
180000 bytes and 900 px for the thumbnail. Existing thumbnails can be regenerated in the gallery administration from the stored full-size JPEG. JPEG, PNG, WebP and GIF input are supported.
Other site images use dedicated folders under /bilder; PDFs are under /dokumente.
Previous non-gallery media are retained for recovery. Back up both upload directories and the MySQL database.

## Local development

npm ci
npm run build

The frontend expects the PHP API at /api/index.php; the Vite dev server alone does not run PHP.

## Account creation

New accounts require matching password and password confirmation (validated by PHP as well as the UI). No automatic account notification email is sent.

## Usernames and edit attribution (schema v2)

The API automatically applies an additive migration on its first request after deployment. Existing passwords, roles, IDs and content are preserved. Existing usernames are derived from display names, normalized to lowercase ASCII, with numeric suffixes for collisions. New accounts require a unique username. Login accepts username or email.
Administrators can permanently delete other accounts; the role is removed via the existing foreign key. The current account and last active administrator are protected. Deactivation remains separate. Created content is not deleted.
The last editor username and UTC timestamp are stored on content and user records at creation/change; album operations also stamp the parent album. Existing entries without historical metadata show Unknown. Editor metadata is returned only to authorized administrative users, not anonymous visitors. Snapshots survive account deletion. This is not a full audit history.

## Administration v3

Automatic additive migration adds imprint fields, publication status, soft deletion, last login and audit history. Existing content remains published. New events, albums and about/download entries are saved as drafts; preview and publish from each card. Previously published edits are live unless the item is withdrawn first. Media URLs are public even for drafts and trash; do not upload confidential files. The archive automatically groups past events by Berlin date. Restore from Trash; only admins may permanently purge. Non-gallery media may remain on disk after purge. Audit entries contain action, username, record ID and changed field names, not prior values. Last login is recorded only after this version is deployed.

## Backups

Administrators can download a full ZIP under Administration > Datensicherung. PHP ZipArchive and sufficient temporary disk space are required. The ZIP contains database.sql (including password hashes and personal data), bilder/ and dokumente/, but no DB connection credentials. Store it encrypted outside the webspace. Run while editors are inactive; database and file snapshots are not atomic across both systems. For large galleries hosting request limits may require a different backup mechanism.
Optional unattended external pull: create a dedicated random KEB_BACKUP_TOKEN repository secret (32+ characters), deploy, and configure scripts/backup-external.sh on a trusted NAS or Linux system with curl, unzip and GPG, its own protected token, passphrase file, and private destination. Schedule it daily via the external scheduler; no job is active by default. Keep the decryption key separately and regularly test recovery into an empty DB. Never upload backups to this public repository.

## Legal pages (schema v4)

Impressum and Datenschutz are linked in the footer. Administrators edit them in dedicated tabs. The API validates all fields together and commits atomically; generic settings updates cannot bypass this. Optional IDs and the editorial responsibility question require an explicit yes/no decision. A persistent admin warning shows missing or invalid fields. Existing content is not overwritten by migration. The privacy text is a prefilled starting point; hosting log retention, transfers, actual deletion practice, photo legal basis and backups require actual operator information and review. Validation is not a legal compliance guarantee. Contact form has an information notice, not a forced consent checkbox. External Google Fonts are removed; system fonts used. Anonymous API requests no longer start a session unless a cookie exists, and successful login starts it explicitly. Unused sidebar preference cookie removed. Confirm hosting-side cookies and network requests in the deployed browser, plus the AV agreement and actual retention practices. No cookie banner added for the necessary login cookie alone.
