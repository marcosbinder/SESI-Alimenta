# Contributing to SESI Alimenta

Thank you for your interest in contributing to **SESI Alimenta**! As an enterprise-grade school nutrition ERP running in production environments, we hold high standards for code quality, security, and data privacy.

---

## 📜 Code of Conduct

We are committed to providing a welcoming, inclusive, and harassment-free environment for all contributors. Please treat everyone with respect and empathy.

---

## 🛠️ Development Workflow

1. **Fork the Repository:** Create your own fork and branch off from `main`.
2. **Branch Naming Conventions:**
   - `feat/feature-name` for new capabilities.
   - `fix/bug-description` for bug fixes.
   - `security/patch-name` for security hardening.
   - `docs/documentation-update` for documentation changes.
3. **Set Up Local Environment:**
   ```bash
   npm install
   cd site && npm install && cd ..
   cp .env.example .env
   ```
4. **Adhere to Code Guidelines:**
   - **No Emojis in Source Code:** Use Lucide icons (`lucide-react`) for all UI indicators.
   - **Zero Insecure Fallbacks:** Never hardcode secrets, passwords, or fallback credentials in code.
   - **Strict LGPD Compliance:** Never commit real student names, registration numbers (RAs), IDs, or clinical records. Use mock/anonymized data for demonstration.
   - **Defensive Frontend Reactivity:** Ensure optional chaining (`?.`) and fallback defaults (`|| []`, `|| {}`) to prevent White Screen of Death (WSoD) states.
5. **Run the Test Suite:**
   Before submitting your Pull Request, ensure that 100% of the tests pass:
   ```bash
   npm test
   ```

---

## 📥 Submitting Pull Requests

* Provide a clear, descriptive title following [Conventional Commits](https://www.conventionalcommits.org/).
* Reference any related issues or discussions.
* Describe the problem being solved and include steps for testing.
* Ensure your PR passes the automated CI workflow.

---

## 🔒 Security Vulnerabilities

Please do **NOT** report security vulnerabilities via public GitHub issues. Follow the instructions in our [SECURITY.md](SECURITY.md) to report security concerns responsibly.
