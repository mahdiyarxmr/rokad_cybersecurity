۱. Foundation & Multi-Tenancy
   Claude.md → DB/ORM → Feature Flag → Auth

۲. Core ERP & Structure
   Edu Year/Term/Level/Field → Lesson → Classes → Class Schedule
   → RBAC → Students → Teacher → Coach → Staff → Parents
   → Parent-Student Link → Profile → Profile Blog → School Profile

۳. Daily Academic Operations
   Attendance → Homework → Calendar → Events → Poll
   → Parents Visit → Reports → Matters

۴. Assessment & LMS Core
   Question Bank → Exam Engine → Grades → Lesson Plan

۵. Communication & Live Content
   Content Mgmt (Make/View + MinIO-S3) → Online Class (BBB/Jitsi)
   → Messaging (WebSocket + Redis Pub/Sub + Chat)
   → Notification & SMS Engine (App SMS + Event Dispatcher)

۶. Finance & HR Operations
   Fee Engine → Installments → Receipts/Report Fee
   → Payroll (Teacher/Staff/Ex-Staff Salary)
   → System Ka (فقط API) + General Settings

۷. SaaS Super Admin & Platform Operations
   Tenant Mgmt (Onboarding + Subdomain Provisioning)
   → Subscription & Module Manager (Feature Flag به تننت)
   → Role Creator (Dynamic Permission Builder)
   → Brands, Colleges, Projects, Club Members
   → Platform Utilities (File Mgmt, DB Backup, Audit Logs)