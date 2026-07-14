# Production Deployment Guide

Status: Azure is the accepted target; the former Render/SQLite deployment path is retired  
Last reviewed: 14 July 2026

Use these current documents in order:

1. `architecture/architecture-decision-record.md`
2. `deployment/infrastructure-deployment-guide.md`
3. `security/identity-and-access-model.md`
4. `database/database-migration-plan.md`
5. `deployment/deployment-runbook.md`
6. `deployment/backup-and-restore-runbook.md`
7. `deployment/rollback-plan.md`
8. `final-report/production-acceptance-report.md`

The repository's `render.yaml` remains historical compatibility material only. Do not create a new Render service for this Azure migration. Do not use a local computer, attached SQLite disk or publicly exposed SQL Server as production infrastructure.

GitHub Pages remains the current public host until the Azure candidate has passed acceptance and the owner separately approves the slot swap, custom-domain binding, DNS changes and Pages retirement.

