# Deploying PFlood behind Apache

The app is one Node.js process. It serves the built React page, the `/api` endpoints and the uploaded
photos, and it stores data in SQLite with photos on disk. Apache stays the only public web server
and forwards `/PFlood/` to Node on `127.0.0.1`.

```
browser ──https──▶ Apache :443 (existing) ──/PFlood/──▶ node 127.0.0.1:3001 ──▶ SQLite + uploads/
```

## Why not Docker

Docker isn't needed and would be the riskier choice on this host:

- On older hosts like EL7, which is end-of-life, Docker is no longer supported.
- Installing Docker changes firewall/iptables and adds a root daemon on what may be a shared server.
- The app has no system dependencies. Node is a self-contained binary in `.node/`, so a folder,
  a systemd unit and 7 lines of Apache config do the same job.
- The Node process uses about 80 MB, which suits small shared VMs.

If the app later moves to a modern host (EL9 or Ubuntu), a Dockerfile would make sense there.

## Dev instance

- A checkout in your home directory (e.g. `~/DEVfloodmarkers`), with a private Node 24 in `.node/`.
- Listens on `127.0.0.1:3101` only, so it can't be reached from outside and Apache doesn't know it exists.
- Its own database is `server/data/floodlite.db`, and photos go in `server/uploads/`.

View it from your laptop through an SSH tunnel:

```bash
ssh -L 3101:127.0.0.1:3101 <server>
```

Then open http://localhost:3101/PFlood/

Start, stop or rebuild the dev instance:

```bash
cd ~/DEVfloodmarkers && export PATH=$PWD/.node/bin:$PATH
npm start               # run (Ctrl-C to stop)
npm run build           # after changing client code or VITE_/BASE_PATH settings
scripts/setup.sh        # after git pull: install deps, build, migrate
```

## Go-live steps (need root / the sysadmin)

1. **Service account and checkout** (keeps production separate from dev):
   ```bash
   useradd -r -m -d /home/pflood -s /sbin/nologin pflood
   sudo -u pflood git clone https://github.com/davidwagenblast/PrincetonFloodMarkers.git /home/pflood/app
   sudo -u pflood mkdir -p /home/pflood/data /home/pflood/backups
   ```
2. **Production `.env`**, owned by pflood with mode 600, at `/home/pflood/app/.env`:
   ```
   BASE_PATH=/PFlood/
   API_PORT=3001
   HOST=127.0.0.1
   TRUST_PROXY=1
   IP_ALLOWLIST=on                  # soft launch: Princeton networks only; remove for public launch
   NOMINATIM_CONTACT=<team email>   # required by OpenStreetMap's usage policy
   DB_PATH=/home/pflood/data/floodlite.db
   UPLOADS_DIR=/home/pflood/data/uploads
   VITE_REGION_LABEL=Princeton
   VITE_DEFAULT_VIEW=40.3350,-74.6800,12
   VITE_SOURCE_URL=https://github.com/davidwagenblast/PrincetonFloodMarkers   # About page link
   # EMBED_ALLOWED_ORIGINS=https://example.princeton.edu   # sites allowed to iframe /PFlood/embed; unset = any
   ```
3. **Install Node, build and create the DB:** `sudo -u pflood /home/pflood/app/scripts/setup.sh`
4. **systemd:** copy `deploy/pflood.service` to `/etc/systemd/system/`, then run `systemctl daemon-reload`
   and `systemctl enable --now pflood`. Check it with `curl http://127.0.0.1:3001/PFlood/api/health`.
5. **Apache:** add `deploy/apache-geoweb-path.conf` to the `*:443` vhost in
   `sites-available/geoweb.princeton.edu.conf`, then run `apachectl configtest && systemctl reload httpd`.
   A *reload* is graceful: in-flight requests to the other sites finish normally.
   Or give it its own hostname with `deploy/apache-own-hostname.conf` (needs DNS and a certificate).
6. **Backups:** add a nightly cron for the pflood user:
   `15 2 * * * /home/pflood/app/scripts/backup.sh /home/pflood/backups`
   Also confirm `/home/pflood` is covered by the server's regular backups.

## Before you flip it

- [ ] **Config management:** if the server is managed by Puppet (or similar), ask whether `/etc/httpd`
      and `/etc/systemd/system` are controlled by it. If they are, the changes must go into
      config management or they'll be reverted.
- [ ] **SELinux:** if it's enforcing, run
      `setsebool -P httpd_can_network_connect 1` or Apache can't reach Node.
- [ ] **Embedding:** `/PFlood/embed` can be put in an iframe by any site unless `EMBED_ALLOWED_ORIGINS`
      is set. While `IP_ALLOWLIST=on`, embedded maps only load for visitors on the allowed networks.
- [ ] **Moderation:** submissions are anonymous and there are no accounts or delete button.
      Spam cleanup means editing SQLite by hand. Decide whether that's acceptable, and keep `IP_ALLOWLIST=on`
      until it is.
- [ ] **HSTS:** the app sends `Strict-Transport-Security` (1 year, includeSubDomains) for
      geoweb.princeton.edu. That host already forces HTTPS, so this should be harmless, but tell the other site owners.
- [ ] **npm audit:** there are 2 moderate react-router advisories. The fix is a v6 → v7 upgrade.
      Low risk here because the app has no server-side rendering and no user-controlled links, but plan the upgrade.

## Updating production later

```bash
sudo -u pflood git -C /home/pflood/app pull
sudo -u pflood /home/pflood/app/scripts/setup.sh
systemctl restart pflood
```

A restart takes about 1 s. Only PFlood blips; Apache and the other sites are unaffected.
