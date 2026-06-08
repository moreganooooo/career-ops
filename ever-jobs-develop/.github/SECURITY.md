# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 0.1.x   | ✅ Active |

## Reporting Vulnerabilities

If you discover a security vulnerability, please report it responsibly:

1. **Do NOT** create a public GitHub issue
2. Email the maintainers with details of the vulnerability
3. Include steps to reproduce and potential impact
4. We aim to respond within 48 hours

## Security Measures

### API Authentication

- Optional API key authentication via configurable header
- Multiple API keys supported (comma-separated list)
- Keys compared in constant-time to prevent timing attacks

### Rate Limiting

- Configurable per-client rate limiting (by API key or IP)
- Prevents abuse and protects upstream job board APIs

### Input Validation

- All inputs validated via NestJS `ValidationPipe`
- Structured error responses for invalid parameters

### Dependencies

- Regular dependency updates and vulnerability scanning
- Use `npm audit` to check for known vulnerabilities

## Best Practices

- **Rotate API keys** regularly
- **Use HTTPS** in production (via reverse proxy)
- **Restrict CORS origins** — avoid `*` in production
- **Keep secrets out of code** — use `.env` files or secrets managers
- **Enable rate limiting** in production
- **Monitor** `/health` endpoint and review logs
