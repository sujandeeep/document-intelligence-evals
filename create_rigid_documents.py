import os
import shutil
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

from src.server import ingest_document

DOCS_DIR = "rigid_docs"
os.makedirs(DOCS_DIR, exist_ok=True)

# 10 Rigid Text Document Definitions
TXT_DOCUMENTS = [
    {
        "filename": "it_security_compliance.txt",
        "title": "IT Security and Access Control Policy 2026",
        "content": """IT Security and Access Control Policy (Document ID: SEC-2026-01)

Section 1: Authentication Requirements
All employees, contractors, and partners must enforce multi-factor authentication (MFA) via hardware security keys or authenticator apps. SMS-based 2FA is explicitly prohibited.
Passwords must be at least 16 characters in length and include uppercase letters, numbers, and symbols. Passwords do not expire unless a compromise is suspected.

Section 2: Session and VPN Policies
Corporate VPN is mandatory when connecting to company infrastructure from non-office networks.
Workstation idle timeouts are set to 10 minutes of inactivity, after which the screen locks automatically.
After 5 failed login attempts, accounts are locked out for 30 minutes unless unlocked by IT Helpdesk.

Section 3: Device Management
All devices accessing corporate data must be enrolled in company MDM (Mobile Device Management) with full disk encryption (FileVault / BitLocker) enabled."""
    },
    {
        "filename": "cloud_disaster_recovery.txt",
        "title": "Cloud Disaster Recovery and High Availability Standard",
        "content": """Cloud Disaster Recovery and Business Continuity Standard (Document ID: OPS-DR-2026)

Section 1: Recovery Objectives
For all Tier-1 mission-critical production systems:
- Recovery Point Objective (RPO) is strictly 15 minutes. No data loss exceeding 15 minutes is permissible.
- Recovery Time Objective (RTO) is 1 hour for complete restoration of critical service endpoints.

Section 2: Multi-Region Architecture
Core microservices run in an active-active configuration across us-east-1 and us-west-2.
Database replication across regions is asynchronous with a maximum allowable replication lag threshold of 3 seconds.

Section 3: Disaster Recovery Drills
Simulated regional outage failover exercises must be conducted bi-annually.
A post-drill operational readiness report must be signed off by the VP of Engineering within 5 business days."""
    },
    {
        "filename": "enterprise_sla_agreement.txt",
        "title": "Enterprise Customer Service Level Agreement",
        "content": """Enterprise Customer Service Level Agreement (Document ID: SLA-ENT-2026)

Section 1: Uptime Commitment
The Service Provider guarantees a Monthly Uptime Percentage of at least 99.95% during each billing cycle, excluding scheduled maintenance windows.

Section 2: Severity Incident Response Times
- Priority 1 (P1 - Critical Outage): Initial response within 15 minutes; hourly status briefings; root cause fix target under 4 hours.
- Priority 2 (P2 - Major Impairment): Initial response within 1 hour; resolution target under 12 hours.
- Priority 3 (P3 - Minor Issue): Initial response within 4 hours; resolution in next maintenance release.

Section 3: Financial Service Credits
If uptime falls between 99.0% and 99.94%, customer receives a 10% monthly fee credit.
If uptime falls below 99.0%, customer receives a 25% monthly fee credit upon written request within 30 days."""
    },
    {
        "filename": "health_insurance_benefits.txt",
        "title": "Comprehensive Employee Healthcare and Benefits Summary",
        "content": """Employee Healthcare and Benefits Summary (Document ID: HR-BEN-2026)

Section 1: Medical Insurance Coverage
The company provides a Gold-tier PPO plan through BlueShield.
- In-network primary care physician copay: $25 per visit.
- Specialist consultation copay: $45 per visit.
- Annual individual deductible: $1,000. Annual family deductible: $2,000.
- Out-of-pocket maximum is capped at $4,000 for individuals and $8,000 for families.

Section 2: Dental and Vision
- Dental plan covers preventive cleanings at 100% twice per year with an annual benefit limit of $2,000 per member.
- Vision plan provides a $250 annual frame allowance and annual comprehensive eye examinations at zero copay.

Section 3: Mental Health Support
Employees have access to 12 free confidential therapy sessions per calendar year through the Employee Assistance Program (EAP)."""
    },
    {
        "filename": "data_retention_gdpr.txt",
        "title": "Global Data Retention and GDPR Compliance Framework",
        "content": """Global Data Retention and Privacy Framework (Document ID: PRIV-GDPR-2026)

Section 1: Data Subject Rights and Erasure
Under GDPR Article 17, Right to Erasure requests must be fulfilled across all production databases, replicas, and analytics data lakes within 14 calendar days of receipt.
Customer personal data must be anonymized or permanently purged 30 days following contractual account termination.

Section 2: Log Retention Periods
- Application access and authentication audit logs must be retained in immutable storage for exactly 90 days.
- Financial transaction logs and billing ledger records must be preserved for 7 years to satisfy statutory tax obligations.

Section 3: Data Transfer Mechanisms
Cross-border data transfers outside the European Economic Area (EEA) must execute standard contractual clauses (SCCs) and undergo Transfer Impact Assessments."""
    },
    {
        "filename": "code_review_security_policy.txt",
        "title": "Software Engineering Code Review and Quality Standard",
        "content": """Software Engineering Code Review Standard (Document ID: ENG-REV-2026)

Section 1: Pull Request Requirements
Every pull request targeting the 'main' branch requires at least two independent peer approvals from designated code owners.
Automated Static Application Security Testing (SAST) and unit tests must achieve 100% passing status with minimum 80% line test coverage.

Section 2: Secret Management & Prohibited Practices
Hardcoding credentials, API keys, private certificates, or plain database URLs in git repositories is strictly forbidden.
Detection of an active secret in git history triggers immediate revocation of that secret and an automated incident alert.

Section 3: Deployment Freezes
A regular production merge and deployment freeze is active every Friday starting at 4:00 PM local time until Monday at 9:00 AM local time."""
    },
    {
        "filename": "procurement_vendor_policy.txt",
        "title": "Corporate Procurement and Vendor Selection Policy",
        "content": """Corporate Procurement Policy (Document ID: FIN-PROC-2026)

Section 1: Purchase Authorizations
- Purchases up to $1,000: Direct manager approval via corporate credit card.
- Purchases between $1,001 and $5,000: Director approval required.
- Purchases exceeding $5,000: Minimum of three competitive vendor bids required along with Finance review.
- Purchases exceeding $25,000: Explicit sign-off required from the Vice President and Chief Financial Officer.

Section 2: Payment Terms
Standard corporate payment terms are Net-45 days from receipt of a valid itemized invoice.
Discounts of 2% are offered for invoices paid within 10 days (2/10 Net 45).

Section 3: Software Vendor Audits
All software vendors processing corporate data must hold a valid SOC 2 Type II certification verified within the past 12 months."""
    },
    {
        "filename": "incident_response_sev1.txt",
        "title": "Severity 1 Incident Management and War Room Protocol",
        "content": """Severity 1 Incident Protocol (Document ID: OPS-INC-SEV1)

Section 1: Severity 1 Definition
A Sev-1 incident is defined as a critical, customer-facing outage impacting more than 5% of active users, or any confirmed breach of confidential customer data.

Section 2: War Room and Response Cadence
- Incident Commander (IC) must spin up the virtual incident war room bridge within 10 minutes of initial page.
- Customer-facing public status page must be updated within 15 minutes of declaration and every 20 minutes thereafter until resolution.

Section 3: Post-Mortem Requirements
A blameless post-mortem document must be drafted within 24 hours of incident mitigation.
A formal retrospective meeting with the leadership team must occur within 48 hours, establishing remediation action items with assigned owners."""
    },
    {
        "filename": "employee_leave_parental.txt",
        "title": "Employee Time Off, Sick Leave, and Parental Policy",
        "content": """Employee Paid Time Off and Family Leave Policy (Document ID: HR-LEAVE-2026)

Section 1: Paid Time Off (PTO)
Full-time exempt employees accrue 20 days of paid vacation per calendar year, accrued at 1.66 days per month.
A maximum of 5 unused vacation days may be rolled over into the following calendar year; excess days are forfeited on December 31.

Section 2: Parental Leave
All eligible new parents (birthing and non-birthing) receive 16 weeks of 100% fully paid parental leave following the birth, adoption, or foster placement of a child.
Parental leave may be taken consecutively or in two separate blocks within the first 12 months.

Section 3: Sick and Bereavement Leave
Employees receive 10 paid sick days annually. Bereavement leave provides 5 consecutive paid days off for the loss of an immediate family member."""
    },
    {
        "filename": "intellectual_property_inventions.txt",
        "title": "Proprietary Information and Inventions Agreement",
        "content": """Proprietary Information and Inventions Agreement (Document ID: LEGAL-IP-2026)

Section 1: Assignment of Inventions
All inventions, designs, source code, patents, and technical discoveries developed by the employee during working hours or utilizing company hardware are the exclusive intellectual property of the company as 'works made for hire'.

Section 2: Non-Disclosure of Trade Secrets
Employees must maintain strict confidentiality regarding company proprietary algorithms, customer lists, and financial metrics both during employment and indefinitely following termination.

Section 3: Non-Compete and Non-Solicitation
For a period of 12 months following separation of employment, former employees may not solicit company employees or contractors for competing commercial enterprises."""
    }
]

# 10 Rigid PDF Document Definitions
PDF_DOCUMENTS = [
    {
        "filename": "api_rate_limits_spec.pdf",
        "title": "Public Developer API Rate Limiting Specification",
        "content": """Public Developer API Rate Limiting Standard (Specification ID: API-LIMIT-2026)

1. Rate Tiers:
- Free Community Tier: 10 requests per second with a daily cap of 5,000 calls.
- Standard Developer Tier: 100 requests per second with a monthly cap of 2,000,000 calls.
- Enterprise Tier: 10,000 requests per minute with dedicated infrastructure and no monthly cap.

2. Throttling and HTTP Headers:
When rate limits are exceeded, the API returns HTTP status code 429 (Too Many Requests).
Response headers include:
- X-RateLimit-Limit: Total request quota in current window.
- X-RateLimit-Remaining: Available requests remaining in window.
- Retry-After: Seconds to wait before issuing new requests.

3. Algorithm:
Rate limits are enforced using a distributed Redis Token Bucket algorithm with a 60-second burst absorption allowance."""
    },
    {
        "filename": "remote_work_ergonomics.pdf",
        "title": "Remote Workplace Safety and Ergonomics Standard",
        "content": """Remote Workplace Safety and Ergonomic Policy (Standard ID: HR-ERGO-2026)

1. Ergonomic Equipment Stipend:
All verified remote employees receive a one-time home office setup reimbursement of up to $1,500.
Eligible purchases include:
- Adjustable standing desks (minimum height range 28 to 48 inches).
- Ergonomic chairs certified by ANSI/BIFMA standards.
- External monitor displays (minimum 27-inch 4K resolution).
- Noise-cancelling headsets with microphone.

2. Submission Deadline:
Reimbursement claims must be submitted in the payroll portal within 45 days of equipment delivery with itemized vendor receipts.

3. Workplace Safety:
Employees must maintain a dedicated, clear workspace free of trip hazards, with adequate ventilation and surge-protected electrical outlets."""
    },
    {
        "filename": "cryptographic_key_management.pdf",
        "title": "Cryptographic Key Lifecycle and Encryption Standard",
        "content": """Cryptographic Key Lifecycle Standard (Security ID: SEC-CRYPTO-2026)

1. Data Encryption at Rest:
All database volumes, snapshots, and object storage buckets must be encrypted using AES-256 with keys managed in AWS KMS or dedicated Hardware Security Modules (HSM).
Unencrypted storage volumes are automatically quarantined by cloud security bots.

2. Data in Transit:
All internal and external communication must mandate TLS 1.3. Deprecated protocols including SSLv3, TLS 1.0, and TLS 1.1 are blocked at the perimeter load balancers.

3. Key Rotation Cadence:
- Data encryption master keys must undergo automatic rotation every 365 days.
- SSH host keys and API service keys must be rotated every 90 days.
- Asymmetric signing keys must utilize a minimum key length of RSA 4096-bit or ECC Curve25519."""
    },
    {
        "filename": "travel_per_diem_policy.pdf",
        "title": "Corporate Travel and Expense Reimbursement Guidelines",
        "content": """Corporate Travel and Expense Reimbursement Guidelines (Document ID: FIN-TRV-2026)

1. Air Travel Regulations:
All flights must be booked at least 21 days in advance through the corporate travel booking tool.
Economy class is mandatory for domestic and international flights under 8 continuous hours. Business class is permitted only for international flights exceeding 8 continuous hours.

2. Daily Meal Allowances (Per Diem):
The maximum allowable daily meal reimbursement is $85 per day ($20 breakfast, $25 lunch, $40 dinner).
Alcohol is strictly non-reimbursable under company policy under any circumstances.

3. Ground Transportation:
Employees should utilize ridesharing services (Uber / Lyft) or airport shuttles. Rental cars require prior managerial approval."""
    },
    {
        "filename": "customer_data_classification.pdf",
        "title": "Information Security Data Classification Scheme",
        "content": """Information Security Data Classification Scheme (Standard ID: SEC-DATA-2026)

1. Classification Tiers:
- Tier 1 (Public): Marketing materials, public documentation, press releases. No access restrictions.
- Tier 2 (Internal): Internal wikis, organizational charts, team meeting notes. Restricted to active employees.
- Tier 3 (Confidential): Customer business data, operational performance metrics, vendor contracts. Requires role-based access control (RBAC).
- Tier 4 (Restricted): Personally Identifiable Information (PII), credit card data (PCI-DSS), cryptographic keys. Requires explicit multi-party authorization and end-to-end encryption.

2. Spillage Procedures:
Accidental storage of Tier 4 Restricted data in Tier 1 or 2 systems constitutes a security spillage and requires isolation within 2 hours."""
    },
    {
        "filename": "continuous_deployment_policy.pdf",
        "title": "Continuous Delivery and Canary Release Pipeline Standards",
        "content": """Continuous Delivery and Canary Release Pipeline Standard (Document ID: ENG-CD-2026)

1. Canary Progression Stages:
Deployments to production must follow a progressive 3-stage canary rollout:
- Stage 1: 5% of production traffic routed to canary pods for a soak period of 30 minutes.
- Stage 2: 25% of traffic routed for 45 minutes with automated anomaly monitoring.
- Stage 3: 100% full rollout across all regional clusters.

2. Automated Rollback Criteria:
The deployment orchestration automatically rolls back to the previous stable release if:
- HTTP 5xx error rate spikes by more than 1.0% above the 7-day baseline.
- p99 request latency degrades by more than 50ms for 3 consecutive minutes.

3. Blue-Green Staging:
Pre-production staging environments must mirror production configuration and run full synthetic regression tests prior to triggering canary releases."""
    },
    {
        "filename": "contractor_onboarding_terms.pdf",
        "title": "External Contractor and Vendor Onboarding Protocol",
        "content": """External Contractor and Vendor Onboarding Protocol (Standard ID: HR-CONT-2026)

1. Pre-Placement Screening:
All external contractors must pass a comprehensive criminal background check and 10-panel drug screening prior to receiving credentials.

2. Access Provisioning:
Contractor accounts are provisioned with a mandatory 90-day expiration date, requiring managerial renewal.
Contractors are granted access strictly via Least Privilege Role-Based Access Control (RBAC) and cannot hold permanent domain administrator privileges.

3. Offboarding and Hardware Return:
Upon contract termination, all access credentials are automatically revoked within 1 hour.
Company-issued laptops and hardware tokens must be returned via prepaid courier within 3 business days of the termination date."""
    },
    {
        "filename": "bug_bounty_program_rules.pdf",
        "title": "Responsible Disclosure and Public Bug Bounty Rules",
        "content": """Public Bug Bounty and Responsible Disclosure Standard (Program ID: SEC-BOUNTY-2026)

1. Bounty Reward Schedule:
- Critical Severity (Remote Code Execution, SQL Injection, Auth Bypass): $5,000 to $10,000.
- High Severity (Privilege Escalation, SSRF, Stored XSS): $2,000 to $4,500.
- Medium Severity (CSRF, Information Disclosure): $500 to $1,500.
- Low Severity: $100 to $300.

2. Out of Scope Testing:
The following testing methods are strictly prohibited and will lead to program disqualification:
- Denial of Service (DoS / DDoS) attacks against company endpoints.
- Physical attacks against offices or data centers.
- Social engineering, phishing, or vishing targeting company employees.

3. Disclosure Timeline:
Security reports receive initial triage within 72 hours. Public disclosure is prohibited until 30 days after a patch has been deployed."""
    },
    {
        "filename": "database_backup_retention.pdf",
        "title": "Database Backup Schedules and Long-Term Archival Standard",
        "content": """Database Backup and Long-Term Archival Standard (Document ID: OPS-DB-2026)

1. Backup Frequency:
- Automated continuous transaction log backups occur every 5 minutes (enabling Point-in-Time Recovery).
- Daily automated snapshots occur at 02:00 UTC and are retained for 30 consecutive days.
- Weekly cumulative backups occur every Sunday at 03:00 UTC and are retained for 12 months.

2. Long-Term Compliance Archival:
Monthly end-of-month snapshots are exported to AWS Glacier Deep Archive with immutability locks (WORM - Write Once, Read Many) for 7 years to satisfy regulatory audits.

3. Backup Restoration Verification:
Automated test restorations into an isolated sandbox environment run on the 1st of every month to verify backup integrity and validate recovery checksums."""
    },
    {
        "filename": "whistleblower_ethics_code.pdf",
        "title": "Corporate Code of Ethics and Whistleblower Protection",
        "content": """Corporate Code of Ethics and Whistleblower Policy (Document ID: ETHICS-2026-01)

1. Reporting Channels:
Employees, contractors, and stakeholders may report suspected financial irregularities, safety violations, harassment, or legal non-compliance through:
- A 24/7/365 confidential hotline operated by an independent third party.
- An encrypted anonymous digital web reporting portal.

2. Non-Retaliation Guarantee:
The company enforces a zero-tolerance policy against retaliation of any kind against individuals who report concerns in good faith. Any employee retaliating against a whistleblower is subject to immediate summary termination.

3. Investigation Cadence:
Reports are acknowledged within 48 hours and assigned to the General Counsel and Audit Committee for formal investigation, concluding with findings within 10 business days."""
    }
]

def generate_pdf(file_path: str, title: str, text: str):
    """Generates a formatted, multi-paragraph PDF document using ReportLab."""
    doc = SimpleDocTemplate(file_path, pagesize=letter, rightMargin=54, leftMargin=54, topMargin=54, bottomMargin=54)
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontSize=18,
        leading=22,
        textColor=colors.HexColor('#1a365d'),
        spaceAfter=14
    )
    
    body_style = ParagraphStyle(
        'DocBody',
        parent=styles['Normal'],
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#2d3748'),
        spaceAfter=10
    )
    
    story = [Paragraph(title, title_style), Spacer(1, 10)]
    
    for para in text.split("\n\n"):
        clean_para = para.replace("\n", "<br/>")
        story.append(Paragraph(clean_para, body_style))
        story.append(Spacer(1, 6))
        
    doc.build(story)

def main():
    print("=" * 60)
    print("CREATING AND INGESTING 20 RIGID BENCHMARK DOCUMENTS")
    print("=" * 60)
    
    # 1. Generate 10 Text Documents
    print("\n[Phase 1] Generating and Ingesting 10 Rigid Text Documents...")
    for idx, doc_def in enumerate(TXT_DOCUMENTS, 1):
        file_path = os.path.join(DOCS_DIR, doc_def["filename"])
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(doc_def["content"])
            
        print(f"  ({idx}/10 TXT) Ingesting {doc_def['filename']}...")
        res = ingest_document(file_path=file_path, dataset_name="corporate_benchmark_kb")
        print(f"       -> Ingested: {res.get('chunks_ingested', 'OK')} chunks")
        
    # 2. Generate 10 PDF Documents
    print("\n[Phase 2] Generating and Ingesting 10 Rigid PDF Documents...")
    for idx, doc_def in enumerate(PDF_DOCUMENTS, 1):
        file_path = os.path.join(DOCS_DIR, doc_def["filename"])
        generate_pdf(file_path, doc_def["title"], doc_def["content"])
        
        print(f"  ({idx}/10 PDF) Ingesting {doc_def['filename']}...")
        res = ingest_document(file_path=file_path, dataset_name="corporate_benchmark_kb")
        print(f"       -> Ingested: {res.get('chunks_ingested', 'OK')} chunks")
        
    print("\n" + "=" * 60)
    print("ALL 20 RIGID DOCUMENTS CREATED AND INGESTED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    main()
