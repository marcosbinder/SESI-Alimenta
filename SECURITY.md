# Security Policy & Vulnerability Reporting

The SESI Alimenta project takes security, data privacy, and compliance with the Brazilian General Data Protection Law (LGPD - Lei 13.709/2018) seriously.

---

## 🛡️ Supported Versions

Only the latest release receives active security updates and vulnerability patches.

| Version | Supported          |
| :---:   | :---:              |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

---

## 🚨 Reporting a Vulnerability

If you discover a security vulnerability, **DO NOT** open a public issue, pull request, or discussion. Public disclosure puts running production school systems at risk.

Please report vulnerabilities privately via:

* **Security Advisory:** Use GitHub's private vulnerability reporting feature on this repository:  
  `https://github.com/marcosbinder/SESI-Alimenta/security/advisories/new`
* **Direct Email:** Send an encrypted or direct email to `mrbbinder@gmail.com` with the subject `[SECURITY VULNERABILITY] SESI Alimenta`.

### What to Include in Your Report:
1. **Description:** Clear explanation of the potential vulnerability and its impact.
2. **Reproduction Steps:** Step-by-step instructions or Proof of Concept (PoC) code.
3. **Affected Component:** Endpoint, middleware, database script, or frontend view affected.
4. **Remediation Suggestion:** Any recommended fix or mitigation, if known.

### Response Timeline:
* **Initial Response:** Within 48 hours of receipt.
* **Assessment & Fix:** Triage and coordinated patch release within 7 to 14 days depending on severity.
* **Credit:** Responsible disclosures will be acknowledged in release notes.

---

## 🔒 Security Architecture Highlights

* **Mandatory Multi-Factor Authentication (TOTP 2FA):** Privileged actions (e.g. database purge, password resets) require continuous re-validation.
* **Cryptographic Session Control:** Instant session revocation through database `token_version` tracking.
* **Zero Trust Logging:** All mutation bodies are sanitized with sensitive fields automatically redacted before log persistence.
