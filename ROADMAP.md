# Rokad Platform Technical Roadmap

This document outlines the strategic engineering roadmap and planned capabilities for the **Rokad Platform**.

---

## 🎯 Release Horizons Overview

```
+-------------------------------------------------------------------------------+
|  Q3 2026: v1.0.0 (Current) - Enterprise Core Foundation                        |
|  - Zero-Trust Security Suite & 2FA TOTP                                       |
|  - Sayad Cheque Ledger & Financial Engine                                     |
|  - LMS & Academic Operations (Gradebook, Exams, Attendance)                   |
|  - Realtime Socket.io Chat & Multi-Tenant Architecture                        |
+-------------------------------------------------------------------------------+
                                      |
                                      v
+-------------------------------------------------------------------------------+
|  Q4 2026: v1.1.0 - Advanced Automation & Integrations                         |
|  - SMS Gateway Failover Aggregator (Kavenegar / FarazSMS / Magfa)             |
|  - OpenID Connect (OIDC) & SAML 2.0 Single Sign-On for Enterprise Colleges    |
|  - Automated AI Homework OCR & Plagiarism Detection                           |
|  - Sentry APM & OpenTelemetry Distributed Tracing                             |
+-------------------------------------------------------------------------------+
                                      |
                                      v
+-------------------------------------------------------------------------------+
|  Q1 2027: v1.2.0 - Intelligence & Native Ecosystem                            |
|  - Native Mobile Apps (React Native / Expo) for iOS & Android                 |
|  - Biometric Attendance Terminal Integration (ZKTeco / Suprema Webhooks)       |
|  - Predictive Academic Analytics & Early Dropout Warning ML Model             |
|  - Multi-Currency & International IBAN Support for Overseas Branches          |
+-------------------------------------------------------------------------------+
```

---

## 📅 Detailed Phase Breakdown

### Phase 1: Enterprise Core Foundation (v1.0.0 — Completed ✅)
- [x] Defense-in-depth Multi-Tenancy (Prisma Extension + PostgreSQL RLS).
- [x] Cryptographic Chained Audit Logging with Telegram Anchor.
- [x] AES-256 Envelope Encryption + HMAC Blind Indexing.
- [x] Sayad Cheque Treasury, Maturity Reminders, and Zarinpal Gateway.
- [x] Real-time Socket.io multi-tenant chat and VAPID WebPush.
- [x] PWA offline caching with Workbox.

### Phase 2: Automation & Enterprise Identity (v1.1.0 — In Planning ⏳)
- [ ] **SMS Gateway Router:** Smart routing and health-check failover across Iranian SMS providers (Kavenegar, FarazSMS, RayanPayam).
- [ ] **Enterprise SSO (SAML 2.0 / OIDC):** Support for organizational Identity Providers (Active Directory, Google Workspace, Keycloak).
- [ ] **AI-Assisted Grading:** OCR recognition for handwritten Persian exam papers with preliminary score suggestions.
- [ ] **Observability:** OpenTelemetry metrics exported to Prometheus / Grafana dashboard.

### Phase 3: Hardware & Mobile Ecosystem (v1.2.0 — Research 🔬)
- [ ] **Native Mobile Client:** Cross-platform React Native app with biometric login (FaceID / Fingerprint).
- [ ] **IoT School Hardware Gateways:** Real-time RFID turnstiles and biometric gate logs synchronization.
- [ ] **Adaptive Learning Engine:** Student personalized review recommendations based on continuous assessment test performance.

---

## 💡 Suggesting New Features

Have an idea or requirement? We encourage you to open a [Feature Request](.github/ISSUE_TEMPLATE/feature_request.yml) or start a discussion!
