/**
 * Sample resume + JD bundled into the client so visitors can try the demo
 * without uploading anything. Both are fictional — same characters as the
 * test fixtures, kept in sync intentionally so the demo exercises the
 * exact code paths the test suite covers.
 */
export const DEMO_RESUME_MD = `# Jane Doe
**Senior Backend Engineer**
jane.doe@example.com · (555) 123-4567 · San Francisco, CA · linkedin.com/in/janedoe-fictional

## Summary

Backend engineer with 7 years of experience building distributed systems in Go and Python. Led platform teams at two startups through significant scale milestones. Strong on observability, database internals, and pragmatic API design.

## Experience

### Staff Backend Engineer — Acme Corp
San Francisco, CA · March 2022 – Present

- Designed and shipped a sharded PostgreSQL multi-tenancy layer serving 40M monthly users.
- Reduced p99 API latency from 820ms to 180ms by introducing query plan caching and connection pool tuning.
- Mentored 4 mid-level engineers; ran weekly internals reading group on database storage engines.
- Owned the production incident review process; cut mean time to resolution by 35%.

### Senior Software Engineer — Helix Analytics
Remote · July 2019 – February 2022

- Built the event ingestion pipeline (Kafka, Go) handling 2B events/day with at-least-once guarantees.
- Migrated billing service from monolithic Rails to a Go microservice; eliminated nightly outage class.
- Led the on-call rotation overhaul, including runbook standardization and SLO definitions.

### Software Engineer — NovaCart
Boston, MA · August 2017 – June 2019

- Wrote checkout service in Python (FastAPI) handling Black Friday peaks of 8K req/s.
- Implemented idempotency keys across payment flows; eliminated duplicate-charge support tickets.

## Education

**B.S. Computer Science** — University of Illinois Urbana-Champaign · 2013 – 2017 · GPA 3.7

## Skills

**Languages:** Go, Python, SQL, TypeScript
**Infrastructure:** PostgreSQL, Kafka, Redis, Kubernetes, AWS (RDS, EKS, S3, SQS), Terraform
**Practices:** Distributed systems, observability (OpenTelemetry, Prometheus), incident response
`;

export const DEMO_JD = `Senior Backend Engineer — Acme Corp

Acme Corp is hiring a Senior Backend Engineer to join our Platform team. You'll own critical pieces of our distributed infrastructure and help us scale through the next order of magnitude.

About the role
You'll work on multi-tenant data systems, internal APIs used by every product team, and the observability stack that keeps us honest. Expect to be deep in PostgreSQL internals, queue topologies, and incident response.

Required qualifications
- 5+ years of professional backend engineering experience.
- Strong proficiency in Go or Python; willingness to work fluently in both.
- Production experience with PostgreSQL at scale, including query optimization and replication.
- Experience designing and operating distributed systems with Kafka or an equivalent messaging platform.
- Solid understanding of observability tooling (OpenTelemetry, Prometheus, structured logging).
- Bachelor's degree in Computer Science, a related field, or equivalent practical experience.
- Must be authorized to work in the United States.

Preferred qualifications
- Experience with Kubernetes in production.
- Familiarity with infrastructure as code (Terraform).
- Background mentoring engineers or leading on-call programs is a plus.
- Exposure to high-traffic e-commerce or payments systems would be ideal.

Responsibilities
- Design and ship resilient backend services consumed by internal teams.
- Drive performance work across the API surface, including latency reduction and capacity planning.
- Lead incident response for systems you own and improve our postmortem culture.
- Mentor mid-level and junior engineers on the team.

Location
Hybrid in San Francisco, CA. Remote within the United States is also acceptable for exceptional candidates. Some travel (less than 10%) for offsites.
`;
