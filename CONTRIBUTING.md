# Contributing to Anygle

Thank you for your interest in contributing to Anygle! We welcome contributions from the community.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/anygle.git`
3. Create a branch: `git checkout -b feature/your-feature-name`

## Development Setup

### Frontend
```bash
npm install
npm run dev
```

### Backend
```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan serve
```

### Docker (Recommended)
```bash
./deploy.sh development
```

## Code Style

### Frontend (TypeScript/React)
- Use TypeScript for all new code
- Follow the existing component structure
- Use Tailwind CSS for styling
- Run `npm run lint` before committing

### Backend (PHP/Laravel)
- Follow PSR-12 coding standards
- Run `./vendor/bin/phpcs` to check style
- Run `./vendor/bin/phpstan` for static analysis
- Write tests for new features

## Testing

- Write unit tests for backend changes
- Ensure all tests pass before submitting PR
- Test on multiple browsers for frontend changes

## Submitting Changes

1. Commit your changes: `git commit -m "feat: add new feature"`
2. Push to your fork: `git push origin feature/your-feature-name`
3. Open a Pull Request

### Commit Message Format
We use conventional commits:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `style:` - Formatting
- `refactor:` - Code refactoring
- `test:` - Tests
- `chore:` - Maintenance

## Code Review

- All PRs require at least one review
- Address review comments promptly
- Keep PRs focused and reasonably sized

## Security

Please do not report security issues publicly. Email security@anygle.app instead.

## Questions?

Join our Discord or open an issue for discussion.