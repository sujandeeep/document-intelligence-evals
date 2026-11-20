# Benchmark Queries for RAG Triad & EGM Evaluation Engine
## Document Intelligence, Groundedness & Confidence Testing Suite

This benchmark suite targets all **20 newly ingested rigid documents** (10 TXT and 10 PDF) across all **5 supported GPT models**:
* `gpt-6-astra` (Flagship Reasoning & Generation)
* `gpt-6.1-sol` (High-End Reasoning)
* `gpt-5.5` (Standard Reasoning)
* `gpt-4o` (Omni Multi-Purpose)
* `gpt-4o-mini` (Budget & Speed)

---

## 1. Questions for the 10 Rigid Text Documents (.txt)

### Query 1 (IT Security Compliance)
* **Command:** `Ask the RAG engine: What are the minimum password requirements and when are corporate accounts locked out? using model gpt-6-astra`
* **Target Document:** [rigid_docs/it_security_compliance.txt](file:///home/sujan/mcp-project/rigid_docs/it_security_compliance.txt)
* **Expected Grounded Facts:** Minimum 16 characters, uppercase + numbers + symbols; 5 failed login attempts trigger a 30-minute lockout.

### Query 2 (Cloud Disaster Recovery)
* **Command:** `Ask the RAG engine: What are the strict RPO and RTO limits for Tier-1 mission-critical systems and what is the maximum replication lag? using model gpt-6.1-sol`
* **Target Document:** [rigid_docs/cloud_disaster_recovery.txt](file:///home/sujan/mcp-project/rigid_docs/cloud_disaster_recovery.txt)
* **Expected Grounded Facts:** RPO is 15 minutes; RTO is 1 hour; maximum allowable replication lag is 3 seconds across us-east-1 and us-west-2.

### Query 3 (Enterprise SLA Agreement)
* **Command:** `Ask the RAG engine: What is the monthly uptime commitment and what financial service credit applies if uptime drops below 99.0%? using model gpt-5.5`
* **Target Document:** [rigid_docs/enterprise_sla_agreement.txt](file:///home/sujan/mcp-project/rigid_docs/enterprise_sla_agreement.txt)
* **Expected Grounded Facts:** 99.95% monthly uptime commitment; 25% monthly fee credit if uptime falls below 99.0%.

### Query 4 (Healthcare Benefits)
* **Command:** `Ask the RAG engine: What are the annual individual and family medical deductibles, and how many free therapy sessions are provided? using model gpt-4o`
* **Target Document:** [rigid_docs/health_insurance_benefits.txt](file:///home/sujan/mcp-project/rigid_docs/health_insurance_benefits.txt)
* **Expected Grounded Facts:** $1,000 individual deductible; $2,000 family deductible; 12 free confidential therapy sessions via EAP.

### Query 5 (GDPR & Data Retention)
* **Command:** `Ask the RAG engine: Within how many calendar days must GDPR Right to Erasure requests be fulfilled, and how long are financial transaction logs retained? using model gpt-4o-mini`
* **Target Document:** [rigid_docs/data_retention_gdpr.txt](file:///home/sujan/mcp-project/rigid_docs/data_retention_gdpr.txt)
* **Expected Grounded Facts:** Erasure within 14 calendar days; financial and tax transaction logs preserved for 7 years.

### Query 6 (Code Review & Security)
* **Command:** `Ask the RAG engine: How many peer approvals are required for pull requests to main and when does the weekend deployment freeze start? using model gpt-6-astra`
* **Target Document:** [rigid_docs/code_review_security_policy.txt](file:///home/sujan/mcp-project/rigid_docs/code_review_security_policy.txt)
* **Expected Grounded Facts:** At least 2 independent peer approvals; deployment freeze starts Friday at 4:00 PM until Monday at 9:00 AM.

### Query 7 (Corporate Procurement)
* **Command:** `Ask the RAG engine: What approvals and competitive bids are mandatory for purchases exceeding $5,000 and $25,000? using model gpt-6.1-sol`
* **Target Document:** [rigid_docs/procurement_vendor_policy.txt](file:///home/sujan/mcp-project/rigid_docs/procurement_vendor_policy.txt)
* **Expected Grounded Facts:** Purchases over $5,000 require 3 competitive vendor bids + Finance review; over $25,000 requires VP and CFO sign-off.

### Query 8 (Severity 1 Incident Protocol)
* **Command:** `Ask the RAG engine: How quickly must the incident war room bridge be initiated and what is the public status update cadence? using model gpt-5.5`
* **Target Document:** [rigid_docs/incident_response_sev1.txt](file:///home/sujan/mcp-project/rigid_docs/incident_response_sev1.txt)
* **Expected Grounded Facts:** War room within 10 minutes of initial page; public status page updated within 15 minutes and every 20 minutes thereafter.

### Query 9 (Employee Leave & Parental)
* **Command:** `Ask the RAG engine: How many weeks of fully paid parental leave are provided, and how many vacation days may be rolled over? using model gpt-4o`
* **Target Document:** [rigid_docs/employee_leave_parental.txt](file:///home/sujan/mcp-project/rigid_docs/employee_leave_parental.txt)
* **Expected Grounded Facts:** 16 weeks of 100% paid parental leave; maximum 5 unused vacation days rollover.

### Query 10 (Intellectual Property & Inventions)
* **Command:** `Ask the RAG engine: How long does the non-solicitation and non-compete restriction last following separation of employment? using model gpt-4o-mini`
* **Target Document:** [rigid_docs/intellectual_property_inventions.txt](file:///home/sujan/mcp-project/rigid_docs/intellectual_property_inventions.txt)
* **Expected Grounded Facts:** 12 months following termination of employment.

---

## 2. Questions for the 10 Rigid PDF Documents (.pdf)

### Query 11 (API Rate Limits Specification)
* **Command:** `Ask the RAG engine: What are the request limits for the Standard Developer Tier and what algorithm is used to enforce limits? using model gpt-6-astra`
* **Target Document:** [rigid_docs/api_rate_limits_spec.pdf](file:///home/sujan/mcp-project/rigid_docs/api_rate_limits_spec.pdf)
* **Expected Grounded Facts:** 100 requests per second with 2,000,000 monthly cap; enforced via distributed Redis Token Bucket algorithm.

### Query 12 (Remote Work Safety & Ergonomics)
* **Command:** `Ask the RAG engine: What is the maximum equipment allowance for remote employees and what are the monitor display specifications? using model gpt-6.1-sol`
* **Target Document:** [rigid_docs/remote_work_ergonomics.pdf](file:///home/sujan/mcp-project/rigid_docs/remote_work_ergonomics.pdf)
* **Expected Grounded Facts:** Up to $1,500 reimbursement within 45 days; minimum 27-inch 4K resolution display.

### Query 13 (Cryptographic Key Lifecycle)
* **Command:** `Ask the RAG engine: What encryption algorithm is mandatory for data at rest and how frequently must SSH host keys and API keys be rotated? using model gpt-5.5`
* **Target Document:** [rigid_docs/cryptographic_key_management.pdf](file:///home/sujan/mcp-project/rigid_docs/cryptographic_key_management.pdf)
* **Expected Grounded Facts:** AES-256 for data at rest; SSH and API keys rotated every 90 days.

### Query 14 (Corporate Travel & Per Diem)
* **Command:** `Ask the RAG engine: What is the maximum daily meal per diem and when is business class permitted for flights? using model gpt-4o`
* **Target Document:** [rigid_docs/travel_per_diem_policy.pdf](file:///home/sujan/mcp-project/rigid_docs/travel_per_diem_policy.pdf)
* **Expected Grounded Facts:** $85 per day meal allowance; business class permitted only for international flights exceeding 8 continuous hours.

### Query 15 (Data Classification Scheme)
* **Command:** `Ask the RAG engine: What classification tier covers PII and credit card data, and how quickly must security spillages be isolated? using model gpt-4o-mini`
* **Target Document:** [rigid_docs/customer_data_classification.pdf](file:///home/sujan/mcp-project/rigid_docs/customer_data_classification.pdf)
* **Expected Grounded Facts:** Tier 4 (Restricted); spillages must be isolated within 2 hours.

### Query 16 (Continuous Delivery & Canary Pipeline)
* **Command:** `Ask the RAG engine: What are the three canary rollout traffic percentages and what error rate triggers an automated rollback? using model gpt-6-astra`
* **Target Document:** [rigid_docs/continuous_deployment_policy.pdf](file:///home/sujan/mcp-project/rigid_docs/continuous_deployment_policy.pdf)
* **Expected Grounded Facts:** 5% for 30 mins, 25% for 45 mins, 100% full rollout; rollback triggered if 5xx errors spike by >1.0%.

### Query 17 (Contractor Onboarding & Hardware)
* **Command:** `Ask the RAG engine: Within how many business days must company-issued laptops be returned after contractor termination? using model gpt-6.1-sol`
* **Target Document:** [rigid_docs/contractor_onboarding_terms.pdf](file:///home/sujan/mcp-project/rigid_docs/contractor_onboarding_terms.pdf)
* **Expected Grounded Facts:** Hardware must be returned within 3 business days via prepaid courier.

### Query 18 (Bug Bounty Program Rules)
* **Command:** `Ask the RAG engine: What is the bounty payout range for Critical severity vulnerabilities and what testing methods are strictly out of scope? using model gpt-5.5`
* **Target Document:** [rigid_docs/bug_bounty_program_rules.pdf](file:///home/sujan/mcp-project/rigid_docs/bug_bounty_program_rules.pdf)
* **Expected Grounded Facts:** $5,000 to $10,000 for Critical severity; DoS/DDoS, physical attacks, and social engineering are out of scope.

### Query 19 (Database Backup & Retention)
* **Command:** `Ask the RAG engine: How often do continuous transaction log backups occur, and how long are monthly snapshots archived in Glacier? using model gpt-4o`
* **Target Document:** [rigid_docs/database_backup_retention.pdf](file:///home/sujan/mcp-project/rigid_docs/database_backup_retention.pdf)
* **Expected Grounded Facts:** Continuous transaction log backups every 5 minutes; monthly archives preserved in Glacier for 7 years.

### Query 20 (Whistleblower Protection & Ethics)
* **Command:** `Ask the RAG engine: What is the company policy regarding retaliation against whistleblowers and how quickly must investigations conclude? using model gpt-4o-mini`
* **Target Document:** [rigid_docs/whistleblower_ethics_code.pdf](file:///home/sujan/mcp-project/rigid_docs/whistleblower_ethics_code.pdf)
* **Expected Grounded Facts:** Zero-tolerance retaliation policy with immediate summary termination; investigation findings within 10 business days.

---

## 3. What You Will See in the Grafana Viewport

When you open **`http://localhost:3000`** in your browser, the **Elephant Audit Trail** table displays:
1. **Timestamp:** Real-time UTC execution time.
2. **Document Name:** The exact document retrieved (e.g. `api_rate_limits_spec.pdf`).
3. **Model:** The model requested (`gpt-6-astra`, `gpt-6.1-sol`, `gpt-4o`, etc.).
4. **Query:** The user question.
5. **Answer:** The generated grounded response.
6. **Confidence %:** The composite confidence score ($0\% - 100\%$).
7. **Faithfulness %:** Groundedness score ($100\%$ = zero hallucination).
8. **Context Relevance %:** Retrieval signal-to-noise ratio.
9. **Answer Relevancy %:** Intent satisfaction score.
10. **Atomic Claims Extraction:** The exact list of atomic claims decomposed by the Goldfish Evaluator with evidence mapping.
11. **Hallucinations:** List of any unsupported statements flagged.
12. **Verdict:** `HIGH_CONFIDENCE`, `MEDIUM_CONFIDENCE`, or `HALLUCINATION_DETECTED`.
