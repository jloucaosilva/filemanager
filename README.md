# FileManager – Lightweight Self-Hosted Upload Tool

## 🚀 Overview

This is a minimal, self-hosted file manager that allows drag-and-drop file uploads to a specified directory, directory tree browsing, and Markdown previews – all accessible via a web UI.

Supports:

* 📂 Folder creation
* 📄 File previews
* 🧠 Auto-refresh via WebSockets (no manual refresh needed)
* 💾 Persistent storage in a configurable upload directory
* 🧱 Compatible with NGINX reverse proxy
* 🔐 Local-only or VPN-only access

---

## ⚙️ Environment Variables

The following **OS environment variables** are required for proper operation:

| Variable           | Description                         | Example                                                         |
| ------------------ | ----------------------------------- | --------------------------------------------------------------- |
| `UPLOAD_DIR`       | Full filesystem path to store files | `D:\Storage\Uploads` (Windows) or `/mnt/shared/uploads` (Linux) |
| `UPLOAD_PORT`      | Port on which the app will listen   | `6543`                                                          |
| `UPLOAD_LISTEN_ON` | IP address to bind the app to       | `127.0.0.1` or `0.0.0.0`                                        |

You must set these both **for the current session** and **permanently**.

### Windows (PowerShell)

```powershell
# Current session
$env:UPLOAD_DIR = 'D:\Storage\Uploads'
$env:UPLOAD_PORT = '6543'
$env:UPLOAD_LISTEN_ON = '127.0.0.1'

# Permanently
[System.Environment]::SetEnvironmentVariable('UPLOAD_DIR', 'D:\Storage\Uploads', 'User')
[System.Environment]::SetEnvironmentVariable('UPLOAD_PORT', '6543', 'User')
[System.Environment]::SetEnvironmentVariable('UPLOAD_LISTEN_ON', '127.0.0.1', 'User')
```

---

## 🧱 Reverse Proxy (NGINX)

To expose this app behind HTTPS, use a reverse proxy like NGINX.

### Example: `myapp.local.test.conf`

```nginx
server {
    listen 80;
    server_name myapp.local.test;

    location ^~ /.well-known/acme-challenge/ {
        root /var/www/certbot;
        allow all;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {

	# Restricts access to the application to the IP addresses in the specified range
    allow 192.168.0.0/24;
    deny all;

    listen 443 ssl http2;
    server_name myapp.local.test;

    ssl_certificate     /etc/ssl/myapp.local.test/fullchain.pem;
    ssl_certificate_key /etc/ssl/myapp.local.test/privkey.pem;

    client_max_body_size 5G;

    location / {
        proxy_pass http://127.0.0.1:6543/filemanager/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }

    location /ws/ {
        proxy_pass http://127.0.0.1:6543;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

> 🧠 NGINX does **not** support environment variable substitution in config files. Use mock IP/port values directly.

---

## 🔥 Firewall Rule Example (Windows)

Allow inbound traffic on your custom port (e.g. 6543):

```powershell
New-NetFirewallRule -DisplayName "UploadApp 6543" -Direction Inbound -Protocol TCP -LocalPort 6543 -Action Allow
```

---

## 🧪 Test Locally

1. Set environment variables.
2. Run the app:

   ```bash
   node index.js
   ```
3. Access at: `http://127.0.0.1:6543/filemanager/`

---

## 📦 Dependencies

* [Express](https://expressjs.com/)
* [Multer](https://github.com/expressjs/multer)
* [WS (WebSocket)](https://github.com/websockets/ws)
* [Chokidar](https://github.com/paulmillr/chokidar)

---

## 📝 License

MIT
