# Project Status — Status-Page on EKS

Paste this into a fresh Claude Code conversation (in this project directory) to pick up exactly where we left off. Not a task list by itself — `ARCHITECTURE_NOTES.md` and the diagrams have the design; this is "what's actually been built and what's left."

## How to work with me on this

- **Teach, don't solve.** Let me write the Terraform/Helm/YAML myself. Explain concepts and point at what's needed; only show a snippet for genuinely new syntax I haven't seen.
- **Never edit or create files without asking first.** Small 1-2 line tweaks to something we're actively looking at together are fine. Anything bigger — show it in chat, I type it in.
- **When I say I'm running/checking something myself, don't run the equivalent command yourself** — give me the command, wait for my output. (Applies to read-only checks too, e.g. `kubectl get pods`.)
- **Verify before proposing.** Check real numbers/behavior for our actual scale before pitching an optimization as a big win.

## What's live in AWS right now (all via Terraform in `infra/`)

- VPC `ro-ro-statuspage-vpc`, 2 public + 2 private subnets, single NAT.
- EKS cluster `ro-ro-statuspage-cluster` (k8s 1.36) + node group (2-4x t3.medium, On-Demand).
- 5 cluster add-ons deployed: ALB Controller, External Secrets Operator (ESO), metrics-server, KEDA, Cluster Autoscaler.
- RDS PostgreSQL Multi-AZ (`manage_master_user_password=true` — AWS auto-manages the DB password in Secrets Manager, no manual secret needed).
- ElastiCache Redis Multi-AZ, cluster-mode **disabled** (required — the app needs 2 Redis DBs: 0=queue, 1=cache).
- S3 + CloudFront for static files (private bucket, Origin Access Control).
- One shared ECR repo (`ro-ro-statuspage-app`) — web/rq-worker/scheduler are the same codebase, different start commands, so one image is correct, not three.
- GitHub Actions OIDC deploy role, scoped to the `rotemamt/statuspage-terraform` repo only.
- Both `rotem` and `roey` have symmetric, explicitly-pinned EKS access entries and KMS key admin rights (fixed two "whoever runs apply gets it" bugs that caused churn between us).

## Known permanent workaround — don't try to "fix" this again

The AWS account (992382545251, course-managed) denies `iam:GetPolicyVersion` on every standalone `aws_iam_policy`, but allows `iam:GetRolePolicy`. **Always use `aws_iam_role_policy` (inline), never `aws_iam_policy` + attachment**, for any future IRSA role. Also: `attach_encryption_policy = false` in `infra/eks.tf` skips one supporting KMS policy for the same reason — don't touch `encryption_config` itself, removing it forces full cluster replacement (nearly happened once).

## CI/CD — decided, partially drafted, not yet built

- **GitHub Actions, no Argo CD/GitOps** — direct push-deploy with a scoped OIDC role, not cluster-admin.
- **Mentor's one exception:** skip only the DB-touching test sub-step (spinning up throwaway Postgres/Redis containers in CI) — keep that part diagram-only. Everything else (lint, security scan, build, push, migrate, deploy) should be real, working YAML.
- A draft workflow exists in chat history (not yet committed) — needs updating: deploy step should use `helm upgrade` now that we're doing a real Helm chart, not `kubectl set image`/raw manifests.
- Diagrams: `diagrams/cicd-pipeline-v2.drawio` (detailed reference) and `diagrams/cicd-pipeline-summary.drawio` (mentor-presentation version) are both current and approved.

## App deployment — in progress, this is the biggest open piece

We're building a real **Helm chart** at `helm/statuspage/` (not raw kubectl manifests — that was a false start, reverted once we noticed it contradicted the already-decided "Helm configures what runs inside K8s").

**Done:** `Chart.yaml`, `values.yaml`, `templates/configmap.yaml` — validated with `helm template`.

**Still to write** (all in `helm/statuspage/templates/`):
- `SecretStore` + `ExternalSecret` — pulls the RDS auto-managed secret into a K8s Secret via ESO.
- `Deployment` x3: web, rq-worker, scheduler. **Scheduler must use `strategy: Recreate`** (singleton — two running at once double-fires every scheduled job).
- `Service` (ClusterIP, web).
- `Ingress` (routes ALB → web Service, via the ALB Controller already running).
- `NetworkPolicy` + `PodDisruptionBudget` + `topologySpreadConstraints` — required, not optional (see gotcha below).
- `k8s/migrate-job.yaml` equivalent — likely a Helm hook (`helm.sh/hook: pre-upgrade`) on a Job, since we're in Helm now.

**App env vars** (confirmed from `poc/configuration.py`, don't re-derive): `DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, REDIS_HOST, SECRET_KEY`. DB_NAME/DB_PORT/REDIS_HOST already in `values.yaml` → ConfigMap. DB_USER/DB_PASSWORD/DB_HOST should come from the RDS secret via ExternalSecret, not be split across ConfigMap and Secret.

## Gotchas hit this session, don't re-litigate

- Claude twice wrongly over-generalized "skip for time" guidance (once dropping metrics-server/KEDA/Cluster-Autoscaler/NetworkPolicy/PDB as "nice to have" — wrong, all required; once assuming the whole CI/CD pipeline was diagram-only — wrong, only the DB-test sub-step is). When told "the mentor said X," implement exactly X.
- `git pull` cannot delete a file that was never committed — if a file "disappears," check `git log`/`reflog` before assuming corruption; it's usually an uncommitted file that got `git clean`'d or manually deleted.
- Changing the EKS access-entry identity for whoever's actively applying, in the same `apply` as unrelated cluster-dependent resources (like `helm_release`), can make those resources falsely show as needing recreation — their refresh needs live cluster API access, which is briefly gone mid-transition. Fix with `-target` to isolate the identity change first.

## Cleanup items, real but not blocking

- `diagrams/aws-infra-flow.drawio` — legend still says "S3 + DynamoDB" for state locking; we use S3-native (`use_lockfile`), no DynamoDB.
- `diagrams/k8s-objects.drawio` — still shows Redis as an in-cluster StatefulSet; should be removed (ElastiCache is external, no K8s object needed).
- `diagrams/cicd-delivery.svg` — still shows the old superseded GitOps flow.
- VERIFY: the scheduler's actual scheduled job list (from app docs/source) — never confirmed.
- Port 8001 in some SG — leftover from the original EC2 PoC, unclear if still relevant to the new EKS setup at all.
- Live survival/failure testing (the "six failure questions" from `ARCHITECTURE_NOTES.md`) — not yet done against the real running stack.
