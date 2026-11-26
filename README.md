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
