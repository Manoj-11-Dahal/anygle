# GitHub Actions Workflows

This directory contains all GitHub Actions workflows for Anygle CI/CD.

## Workflows Overview

### 1. **laravel.yml** - Backend CI
- Runs on: Push/PR to main/develop when backend changes
- Jobs:
  - `test`: PHPUnit tests with MySQL & Redis
  - `code-quality`: PHP_CodeSniffer, PHPStan, PHP CS Fixer
  - `security`: Security audit with composer

### 2. **frontend.yml** - Frontend CI
- Runs on: Push/PR to main/develop when frontend changes
- Jobs:
  - `build`: Build with Node.js 18.x and 20.x
  - `test`: Unit tests with coverage
  - `lighthouse`: Performance audits
  - `e2e`: Playwright end-to-end tests
  - `security`: npm audit and Snyk scan

### 3. **docker-build.yml** - Container Builds
- Runs on: Push to main, tags, PRs
- Builds:
  - Frontend image
  - Backend image
  - WebSocket image
  - Nginx image
- Pushes to GitHub Container Registry (ghcr.io)

### 4. **deploy.yml** - Deployment
- Runs on: Push to main, tags, manual trigger
- Environments:
  - `staging`: Auto-deploy from main
  - `production`: Deploy from tags with approval
- Features:
  - Database backup before deploy
  - Health checks
  - Automatic rollback on failure
  - Slack notifications

### 5. **migrate.yml** - Database Migrations
- Manual trigger only
- Supports:
  - `migrate`: Run pending migrations
  - `rollback`: Rollback last batch
  - `fresh`: Drop and recreate all tables
  - `seed`: Run database seeders
- Automatic backup before destructive operations

### 6. **release.yml** - Release Management
- Runs on: Tag push (v*)
- Creates:
  - GitHub release with changelog
  - Docker image references
  - Deployment instructions
- Notifications:
  - Discord
  - Slack

## Secrets Required

### For CI/CD
```
GITHUB_TOKEN          # Auto-provided
LHCI_GITHUB_APP_TOKEN # Lighthouse CI
SNYK_TOKEN           # Snyk security scanning
```

### For Deployment
```
STAGING_HOST         # Staging server IP/hostname
STAGING_USER         # SSH username
STAGING_SSH_KEY      # Private SSH key
STAGING_PORT         # SSH port (default: 22)

PRODUCTION_HOST      # Production server IP/hostname
PRODUCTION_USER      # SSH username
PRODUCTION_SSH_KEY   # Private SSH key
PRODUCTION_PORT      # SSH port (default: 22)
DB_PASSWORD          # MySQL root password

SLACK_WEBHOOK        # Slack notifications
DISCORD_WEBHOOK      # Discord notifications
```

## Setting Up Secrets

1. Go to Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add each secret with its value

## Branch Protection

Configure in Settings → Branches:
- Require PR before merging
- Require status checks to pass
- Require reviews from code owners
- Include administrators

## Local Testing

Test workflows locally with [act](https://github.com/nektos/act):

```bash
# Install act
brew install act

# Run specific workflow
act -W .github/workflows/laravel.yml

# Run with secrets
act -s GITHUB_TOKEN=xxx -s DB_PASSWORD=xxx
```

## Troubleshooting

### Docker Build Failures
- Check Dockerfile syntax
- Ensure all dependencies are in package.json/composer.json
- Verify multi-arch build support

### Deployment Failures
- Verify SSH keys are correct
- Check server has Docker & Docker Compose installed
- Ensure target directory exists (/opt/anygle)

### Test Failures
- Run tests locally first
- Check database connection settings
- Verify Redis is running

## Badges

Add to README.md:
```markdown
[![Laravel CI](https://github.com/your-org/anygle/actions/workflows/laravel.yml/badge.svg)](https://github.com/your-org/anygle/actions/workflows/laravel.yml)
[![Frontend CI](https://github.com/your-org/anygle/actions/workflows/frontend.yml/badge.svg)](https://github.com/your-org/anygle/actions/workflows/frontend.yml)
[![Docker Build](https://github.com/your-org/anygle/actions/workflows/docker-build.yml/badge.svg)](https://github.com/your-org/anygle/actions/workflows/docker-build.yml)
[![Deploy](https://github.com/your-org/anygle/actions/workflows/deploy.yml/badge.svg)](https://github.com/your-org/anygle/actions/workflows/deploy.yml)
```