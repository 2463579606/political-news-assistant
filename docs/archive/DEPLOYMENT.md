# 时政新闻助手 - Production Deployment Guide

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Backend Deployment](#backend-deployment)
4. [Frontend Deployment](#frontend-deployment)
5. [Database Setup](#database-setup)
6. [Production Checklist](#production-checklist)
7. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Prerequisites

### Required Software

- **Node.js**: >= 20.9.0 (required for Next.js 15)
- **PostgreSQL**: >= 13 (for production database)
- **PM2** (optional, for process management): `npm install -g pm2`
- **Nginx** (optional, for reverse proxy)
- **Domain name** and **SSL certificate** (for HTTPS)

### System Requirements

- **Minimum**: 2 CPU cores, 2GB RAM, 20GB disk
- **Recommended**: 4 CPU cores, 4GB RAM, 40GB disk

---

## Environment Configuration

### Backend Environment Variables

Create `/backend/.env`:

```bash
# Server
NODE_ENV=production
PORT=3001

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/political_news
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=political_news
POSTGRES_USER=your_user
POSTGRES_PASSWORD=strong_password_here

# JWT Secret (generate with: openssl rand -base64 32)
JWT_SECRET=your-secret-key-here-change-this
JWT_EXPIRY=7d

# Claude API (optional, for AI features)
ANTHROPIC_API_KEY=sk-ant-your-key-here

# CORS
ALLOWED_ORIGINS=https://yourdomain.com
```

### Frontend Environment Variables

Create `/frontend/.env.local`:

```bash
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

---

## Backend Deployment

### 1. Install Dependencies

```bash
cd src/backend
npm ci --production
```

### 2. Setup Database

```bash
# Create database
createdb political_news

# Run migrations (when available)
# npm run migrate

# Seed data (optional)
# npm run seed
```

### 3. Start with PM2

```bash
# Install PM2 globally
npm install -g pm2

# Start backend
pm2 start simple-server.js --name "political-news-backend"

# Configure PM2 for auto-restart
pm2 startup
pm2 save
```

### 4. Check Logs

```bash
pm2 logs political-news-backend
pm2 status
```

---

## Frontend Deployment

### Option 1: Vercel (Recommended)

```bash
cd src/frontend

# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Option 2: Self-Hosted with Node.js

```bash
cd src/frontend

# Build
npm run build

# Start production server
pm2 start npm --name "political-news-frontend" -- start

# Or use standalone mode
# Add to next.config.js: output: 'standalone'
# Then run: node server.js
```

### Option 3: Docker

```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

```bash
docker build -t political-news-frontend .
docker run -p 3000:3000 political-news-frontend
```

---

## Database Setup

### PostgreSQL Configuration

```sql
-- Create user
CREATE USER political_news_user WITH PASSWORD 'strong_password';

-- Create database
CREATE DATABASE political_news OWNER political_news_user;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE political_news TO political_news_user;

-- Connect to database
\c political_news

-- Create schema
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS news_articles (
  id VARCHAR(50) PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  url TEXT,
  source_name VARCHAR(255),
  category VARCHAR(50),
  importance_score DECIMAL(3,2),
  published_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_news_category ON news_articles(category);
CREATE INDEX idx_news_published ON news_articles(published_at DESC);
CREATE INDEX idx_users_email ON users(email);
```

### Database Backup

```bash
# Backup
pg_dump -U political_news_user political_news > backup.sql

# Restore
psql -U political_news_user political_news < backup.sql

# Automated backup with cron
0 2 * * * pg_dump -U political_news_user political_news | gzip > /backups/db_$(date +\%Y\%m\%d).sql.gz
```

---

## Production Checklist

### Security

- [ ] Change all default passwords
- [ ] Set strong JWT_SECRET (min 32 characters)
- [ ] Enable HTTPS with valid SSL certificate
- [ ] Configure CORS properly (restrict allowed origins)
- [ ] Set up firewall rules (only open necessary ports)
- [ ] Enable rate limiting on API endpoints
- [ ] Configure helmet.js headers for security
- [ ] Regular security updates: `npm audit fix`

### Performance

- [ ] Enable gzip compression
- [ ] Configure CDN for static assets
- [ ] Set up caching headers
- [ ] Optimize database queries with indexes
- [ ] Monitor memory and CPU usage
- [ ] Set up database connection pooling

### Monitoring

- [ ] Configure error tracking (Sentry, etc.)
- [ ] Set up uptime monitoring
- [ ] Configure log aggregation
- [ ] Set performance alerts
- [ ] Monitor API response times

### Backup & Recovery

- [ ] Automated database backups (daily)
- [ ] Off-site backup storage
- [ ] Documented recovery procedure
- [ ] Test restore procedure

### Configuration

- [ ] Set NODE_ENV=production
- [ ] Configure production database
- [ ] Set appropriate log levels
- [ ] Configure email/notifications
- [ ] Set up cron jobs for scheduled tasks

---

## Monitoring & Maintenance

### Log Files

```bash
# Backend logs
pm2 logs political-news-backend

# Frontend logs (if self-hosted)
pm2 logs political-news-frontend

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Health Checks

```bash
# Backend health
curl https://api.yourdomain.com/api/v1/health

# Frontend availability
curl https://yourdomain.com

# Database connection
psql -U political_news_user -d political_news -c "SELECT 1;"
```

### Performance Monitoring

```bash
# PM2 monitoring
pm2 monit

# System resources
htop

# Disk usage
df -h

# Database size
psql -U political_news_user -d political_news -c "SELECT pg_size_pretty(pg_database_size('political_news'));"
```

### Scaling Considerations

1. **Backend Scaling**
   - Add more worker processes with PM2 cluster mode
   - Load balance with Nginx
   - Consider microservices for AI features

2. **Database Scaling**
   - Implement read replicas for read-heavy operations
   - Consider Redis for caching frequently accessed data
   - Archive old news data periodically

3. **Frontend Scaling**
   - Use CDN (Cloudflare, AWS CloudFront)
   - Enable ISR (Incremental Static Regeneration)
   - Consider edge deployment with Vercel Edge

---

## Troubleshooting

### Common Issues

**Issue**: Backend won't start
```bash
# Check port availability
lsof -i :3001

# Check logs
pm2 logs political-news-backend --lines 50

# Restart backend
pm2 restart political-news-backend
```

**Issue**: Database connection failed
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test connection
psql -U political_news_user -d political_news -h localhost

# Check firewall
sudo ufw status
```

**Issue**: Frontend build fails
```bash
# Clear cache
rm -rf .next
rm -rf node_modules
npm install

# Check Node version
node --version  # Should be >= 20.9.0
```

---

## Support & Documentation

- **Documentation**: `/docs` directory
- **API Documentation**: `/docs/api.md`
- **Development Guide**: `/DEVELOPMENT.md`
- **Issue Tracker**: GitHub Issues (if applicable)

---

**Last Updated**: 2026-02-15
**Version**: 1.0.0
