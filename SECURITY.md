# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Please report security vulnerabilities by emailing the security team at:

**security@montimage.com**

Include the following information in your report:

- Description of the vulnerability
- Steps to reproduce the issue
- Potential impact and severity
- Any suggested mitigations (optional)

### What to expect

- **Acknowledgement**: We will acknowledge receipt within **48 hours**.
- **Assessment**: We will assess the report and provide an initial response within **7 days**.
- **Resolution**: We aim to resolve critical vulnerabilities within **30 days**.
- **Disclosure**: We coordinate disclosure with the reporter before publishing.

We follow responsible disclosure principles. Reporters who comply with this policy will be credited in the release notes (unless they prefer to remain anonymous).

## Security Hardening

When deploying MMT-Pentester, please follow the security guidelines in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md):

- Change all default credentials on first run
- Set a strong `JWT_SECRET` (minimum 32 characters, randomly generated)
- Set a strong `REGISTER_INVITE_CODE` or disable registration
- Run behind HTTPS (TLS 1.2+)
- Restrict network access — this platform is intended for use in controlled environments only

## Scope

This platform is designed **for educational and research use in authorized, controlled environments only**. Unauthorized use against systems you do not own or have explicit permission to test is illegal and outside the scope of this project.
