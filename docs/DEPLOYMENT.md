# Deployment

Production deployment guide for MMT-Pentester.

## Prerequisites

- Ubuntu 20.04+ (or equivalent)
- Node.js 20+ (via NVM recommended)
- MongoDB 6+
- PM2 (`npm install -g pm2`)
- Apache2 or Nginx (reverse proxy)
- Certbot (HTTPS)

## 1. Clone and Build

```bash
git clone https://github.com/Montimage/ai4sim.git mmt-pentester
cd mmt-pentester
npm run install:all
npm run build
```

## 2. Configure Environment

```bash
cp backend/.env.example backend/.env
nano backend/.env
```

Critical values to set:

```env
MONGODB_URI=mongodb://localhost:27017/mmt-pentester
JWT_SECRET=<openssl rand -base64 32>
REGISTER_INVITE_CODE=<openssl rand -base64 12>
NODE_ENV=production
HOST=0.0.0.0
PORT=3000
CORS_ORIGINS=https://your-domain.example.com
```

## 3. Initialize Database

```bash
cd backend
npm run init-super-admin
```

Change the default password (`admin` / `admin123456`) immediately after first login.

## 4. Start with PM2

```bash
pm2 start backend/dist/server.js --name mmt-pentester
pm2 save
pm2 startup
```

## 5. Apache2 Reverse Proxy (with HTTPS)

Enable required modules:

```bash
sudo a2enmod proxy proxy_http proxy_wstunnel rewrite ssl headers
```

Create `/etc/apache2/sites-available/mmt-pentester.conf`:

```apache
<VirtualHost *:80>
    ServerName your-domain.example.com
    RewriteEngine On
    RewriteRule ^(.*)$ https://%{HTTP_HOST}$1 [R=301,L]
</VirtualHost>

<VirtualHost *:443>
    ServerName your-domain.example.com

    SSLEngine on
    SSLCertificateFile    /etc/letsencrypt/live/your-domain.example.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/your-domain.example.com/privkey.pem

    # Frontend (static)
    DocumentRoot /path/to/mmt-pentester/frontend/dist

    # API
    ProxyPass /api http://localhost:3000/api
    ProxyPassReverse /api http://localhost:3000/api

    # WebSocket
    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} websocket [NC]
    RewriteRule /socket.io/(.*) ws://localhost:3000/socket.io/$1 [P,L]
    ProxyPass /socket.io http://localhost:3000/socket.io
    ProxyPassReverse /socket.io http://localhost:3000/socket.io

    RewriteCond %{HTTP:Upgrade} websocket [NC]
    RewriteRule /ws/(.*) ws://localhost:9090/$1 [P,L]
</VirtualHost>
```

```bash
sudo a2ensite mmt-pentester
sudo certbot --apache -d your-domain.example.com
sudo systemctl reload apache2
```

## 6. Security Checklist

- [ ] Change default admin password on first login
- [ ] Set `JWT_SECRET` to a random 32+ char string
- [ ] Set or disable `REGISTER_INVITE_CODE`
- [ ] Restrict MongoDB to localhost (`bind_ip = 127.0.0.1`)
- [ ] Enable UFW: allow only 80, 443, 22
- [ ] Enable automatic security updates

## Updating

```bash
git pull origin main
npm run install:all
npm run build
pm2 restart mmt-pentester
```
