# Deployment Guide

Two environments: **production** (branch: `main`) and **dev** (branch: `dev`).

Each environment has:
- An **EC2 instance** running the Node.js backend
- An **S3 bucket + CloudFront distribution** serving the React frontend

---

## One-time AWS Setup

Do this once. Both environments follow the same steps — just run them twice with different names.

### 1. Create an IAM user for GitHub Actions

1. Go to **IAM → Users → Create user**
2. Name it `github-actions-resale`
3. Attach these policies:
   - `AmazonS3FullAccess`
   - `CloudFrontFullAccess`
4. Create an **Access Key** (type: Application) → save both values

### 2. Create EC2 instances (×2 — one prod, one dev)

1. **Launch Instance** in EC2 console
   - AMI: **Amazon Linux 2023**
   - Instance type: `t3.small` (prod) / `t3.micro` (dev)
   - Create or select a key pair — download the `.pem` file
   - Security group — open these ports:
     - SSH (22) — your IP only
     - HTTP (80) — anywhere
     - HTTPS (443) — anywhere (for when you add SSL later)
   - Storage: 20 GB gp3

2. Note the **Public IPv4 DNS** for each instance (e.g. `ec2-1-2-3-4.compute-1.amazonaws.com`)

3. SSH in and run the bootstrap script:
   ```bash
   # Upload the script
   scp -i your-key.pem scripts/setup-ec2.sh ec2-user@<EC2-HOST>:~/

   # SSH in
   ssh -i your-key.pem ec2-user@<EC2-HOST>

   # Run (prod instance)
   chmod +x setup-ec2.sh && sudo ./setup-ec2.sh prod

   # Run (dev instance)
   chmod +x setup-ec2.sh && sudo ./setup-ec2.sh dev
   ```

4. The script will pause and ask you to create a `.env` file. Create it at
   `/app/resale-dashboard/backend/.env` (prod) or `/app/resale-dashboard-dev/backend/.env` (dev):

   ```env
   DATABASE_URL=file:../data/resale.db
   JWT_SECRET=<run: openssl rand -hex 32>
   JWT_EXPIRES_IN=8h
   PORT=4000
   UPLOAD_DIR=./uploads/photos
   MAX_PHOTO_SIZE_MB=10
   CORS_ORIGIN=https://<cloudfront-id>.cloudfront.net
   SHOPIFY_ENABLED=false
   SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
   SHOPIFY_ACCESS_TOKEN=shpat_xxx
   ```

5. **GitHub Deploy Key** — the EC2 instance needs to pull from your private repo:
   ```bash
   # On the EC2 instance:
   ssh-keygen -t ed25519 -f ~/.ssh/github_deploy -N ""
   cat ~/.ssh/github_deploy.pub   # copy this

   # Configure SSH to use it for GitHub
   cat >> ~/.ssh/config << 'EOF'
   Host github.com
     IdentityFile ~/.ssh/github_deploy
     StrictHostKeyChecking no
   EOF
   ```
   Then add the public key in GitHub: **Repo → Settings → Deploy keys → Add deploy key**
   - Title: `EC2 prod` (or `EC2 dev`)
   - Allow write access: **No**

6. **GitHub Actions SSH Key** — GitHub Actions needs to SSH *into* the EC2 instance.
   On your **local machine** (not the EC2):
   ```bash
   ssh-keygen -t ed25519 -f resale-deploy-prod -N ""
   ```
   - Copy the **public key** content and add it to `~/.ssh/authorized_keys` on the EC2 instance
   - Copy the **private key** content → goes into GitHub secret `PROD_EC2_SSH_KEY`

### 3. Create S3 buckets (×2)

For each environment:

1. **S3 → Create bucket**
   - Name: `resale-dashboard-prod-frontend` / `resale-dashboard-dev-frontend`
   - Region: same as your EC2
   - Block all public access: **ON** (CloudFront will serve it, not S3 directly)

2. **Bucket Policy** — after creating the CloudFront distribution (step 4), add the OAC policy

### 4. Create CloudFront distributions (×2)

For each environment:

1. **CloudFront → Create distribution**
   - Origin domain: select your S3 bucket
   - Origin access: **Origin access control (OAC)** → Create new OAC
   - Copy the bucket policy CloudFront shows you → paste it into the S3 bucket policy
   - Viewer protocol policy: **Redirect HTTP to HTTPS**
   - Default root object: `index.html`

2. **Custom error pages** — required for React Router:
   - Error code: `403` → Response page: `/index.html` → HTTP Response Code: `200`
   - Error code: `404` → Response page: `/index.html` → HTTP Response Code: `200`

3. Note the **Distribution domain name** (e.g. `d1234abcdef.cloudfront.net`)
   - Update the `CORS_ORIGIN` in the EC2 `.env` file to this value
   - Restart PM2: `pm2 restart resale-backend-prod`

---

## GitHub Secrets

Go to **Repo → Settings → Secrets and variables → Actions** and add:

| Secret | Value |
|--------|-------|
| `AWS_ACCESS_KEY_ID` | IAM user access key ID |
| `AWS_SECRET_ACCESS_KEY` | IAM user secret access key |
| `AWS_REGION` | e.g. `us-east-1` |
| `PROD_EC2_HOST` | Prod EC2 public DNS |
| `PROD_EC2_SSH_KEY` | Private SSH key for prod EC2 (full contents of .pem/private key file) |
| `PROD_API_URL` | `http://<prod-ec2-public-dns>` (no trailing slash) |
| `PROD_S3_BUCKET` | `resale-dashboard-prod-frontend` |
| `PROD_CLOUDFRONT_ID` | Prod CloudFront distribution ID (e.g. `EXXXXXXXXXXXXXX`) |
| `DEV_EC2_HOST` | Dev EC2 public DNS |
| `DEV_EC2_SSH_KEY` | Private SSH key for dev EC2 |
| `DEV_API_URL` | `http://<dev-ec2-public-dns>` |
| `DEV_S3_BUCKET` | `resale-dashboard-dev-frontend` |
| `DEV_CLOUDFRONT_ID` | Dev CloudFront distribution ID |

---

## Deploy Flow

| Action | Result |
|--------|--------|
| Open a PR → `main` or `dev` | CI runs: typecheck backend + frontend |
| Merge / push to `main` | Typecheck → deploy frontend to prod S3/CF → deploy backend to prod EC2 |
| Merge / push to `dev` | Typecheck → deploy frontend to dev S3/CF → deploy backend to dev EC2 |

Frontend and backend deploy **in parallel** after typecheck passes.

---

## When You Get a Domain

1. **Add a CNAME record** pointing `api.yourdomain.com` → EC2 public DNS
2. **Add SSL with Let's Encrypt** on the EC2:
   ```bash
   sudo dnf install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d api.yourdomain.com
   ```
3. Update `nginx.conf` to add the SSL server block (template is in `infra/nginx.conf`)
4. Update GitHub secret `PROD_API_URL` to `https://api.yourdomain.com`
5. Add a separate CNAME for CloudFront in the CloudFront alternate domain names settings

---

## Useful Commands (on EC2)

```bash
pm2 list                          # see running processes
pm2 logs resale-backend-prod      # tail logs
pm2 restart resale-backend-prod   # manual restart
pm2 monit                         # live CPU/memory monitor

# Manual deploy without GitHub Actions:
cd /app/resale-dashboard
git pull origin main
cd backend && npm ci --omit=dev && npm run build
npx prisma migrate deploy
pm2 restart resale-backend-prod
```
