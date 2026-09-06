# Project Status — Status-Page on EKS

Paste this into a fresh Claude Code conversation (in this project directory) to pick up exactly where we left off. Not a task list by itself — `ARCHITECTURE_NOTES.md` and the diagrams have the design; this is "what's actually been built and what's left."

**Last updated: 2026-09-07** — app **running on EKS with a public URL**, autoscaling + resilience done, **CI/CD pipeline built and passing end-to-end** (build → scan → push → migrate → deploy via Helm, triggered on push to `main`).

## How to work with me on this

- **Teach, don't solve.** Let me write the Terraform/Helm/YAML myself. Explain concepts and point at what's needed; only show a snippet for genuinely new syntax I haven't seen.
- **Never edit or create files without asking first.** Small 1-2 line tweaks to something we're actively looking at together are fine. Anything bigger — show it in chat, I type it in. (Exception made a few times under deadline pressure — asked explicitly each time.)
- **When I say I'm running/checking something myself, don't run the equivalent command yourself** — give me the command, wait for my output. (Applies to read-only checks too, e.g. `kubectl get pods`.)
- **Verify before proposing.** Check real numbers/behavior for our actual scale before pitching an optimization as a big win.

## Where we stand (TL;DR)

| Area | Status |
|---|---|
| Infrastructure (VPC, EKS, RDS, Redis, S3/CloudFront, ECR, add-ons) | ✅ live via Terraform |
| App running on EKS (web ×2 + worker + scheduler) | ✅ `Running`, DB migrated |
| Public URL (Ingress + ALB + DuckDNS) | ✅ `http://roro-status.duckdns.org` — **HTTP only, no TLS yet** |
| Static files (CSS/JS actually loading) | ✅ WhiteNoise, fixed 2026-09-06/07 |
| Autoscaling (HPA + KEDA) + NetworkPolicy/PDB/topologySpread | ✅ done (8ג complete) |
| CI/CD (GitHub Actions) | ✅ built, passing end-to-end |
| Monitoring + Backup/restore + survival test | ⏳ mentor criteria, not started |
| TLS/HTTPS | ⏳ open decision — DuckDNS is IP-only, ACM DNS validation may not work with it |

## CI/CD — built and working (`.github/workflows/ci-cd.yaml`)

Two jobs: `build-and-test` (terraform validate, helm lint, Trivy config scan on `infra/`) → `deploy` (OIDC auth, docker build+scan+push, `helm upgrade`, wait for migrate Job, verify rollout). Runs on push to `main`.

**Every failure hit and fixed, in order — don't re-litigate any of these:**

1. **GitHub Actions OIDC → AWS: "Not authorized to perform sts:AssumeRoleWithWebIdentity."** Root cause (confirmed via official GitHub docs + our own repo's `created_at`/`owner_id`/`id`): repos created after **2026-07-15** default to GitHub's new **immutable OIDC subject claim** format — `repo:OWNER@ORG_ID/REPO@REPO_ID:ref:...` instead of `repo:OWNER/REPO:ref:...`. Our role's trust policy only matched the old format. **Fix:** since the account denies `iam:UpdateAssumeRolePolicy` (trust policy is set-once at `CreateRole`, can't be edited in place, and `iam:DeleteRole` is also denied so the old role stays orphaned forever) — created a **new role `GitHubActionsDeployRoleV2`** (`infra/github-actions-oidc.tf`) with both subject formats in `StringLike`, repointed the EKS access entry (`infra/eks.tf`) and the workflow's `role-to-assume` at it. **Old `GitHubActionsDeployRole` is dead, ignore it** — can't be deleted, don't try.
2. **Trivy image scan blocking on unfixable OS CVEs.** Debian base image CVEs with no available fix were failing the `--exit-code 1` gate. Fix: added `--ignore-unfixed`.
3. **Real fixable CVEs (Django SQL injection, pillow, wheel, jaraco.context).** Pinned patched versions in `poc/Dockerfile` via a **second** `pip install --upgrade` (a single `pip install -r requirements.txt "pkg==X"` fails — pip sees two conflicting pins on the same package in one invocation and refuses to resolve; a separate `--upgrade` call has no memory of the first file's pin).
4. **Two CVEs remain, both on packages *vendored inside `setuptools` itself*** (`setuptools/_vendor/jaraco.context-5.3.0`, `setuptools/_vendor/wheel-0.45.1`) — separate from the top-level packages we pinned, not reachable/imported by the running app. Accepted via `.trivyignore` (same pattern as the infra Trivy exceptions), and added `--ignorefile .trivyignore` to the image-scan step (it wasn't being passed before).
5. **RBAC: `helm upgrade` failing with `"X is forbidden ... cannot get resource"` for three different custom resources in a row** (`clustersecretstores.external-secrets.io`, `externalsecrets.external-secrets.io`, `scaledobjects.keda.sh`). Root cause: AWS's built-in EKS access policies (`AmazonEKSEditPolicy`, `AmazonEKSViewPolicy`) are built from Kubernetes' standard `edit`/`view` ClusterRoles, which only include resources explicitly **aggregated** into them — third-party CRDs (ESO, KEDA) aren't, unlike built-in API groups (apps/core/batch/autoscaling/networking.k8s.io/policy, which *are* aggregated and worked fine). **Fix:** `infra/rbac-github-actions.tf` — added the `kubernetes` Terraform provider (reuses the same `data.aws_eks_cluster_auth` token as the existing `helm` provider) plus explicit native K8s RBAC: one cluster-scoped `ClusterRole`+`ClusterRoleBinding` (read-only) for `clustersecretstores`, one namespace-scoped `Role`+`RoleBinding` (full CRUD) covering both `externalsecrets` and `scaledobjects` in `statuspage` only. **Checked every `kind:` line in every `helm/statuspage/templates/*.yaml` file — these 3 CRDs are the complete list**, nothing else should surface this error.
   - First attempt at this was a **cluster-wide `AmazonEKSViewPolicy`** grant — caught as unnecessary scope creep (violates the namespace-only design) once the narrow CRD-specific grants existed, and removed. Final state: CI role has write access to `statuspage` namespace only, plus read-only on one specific cluster-scoped resource type.

## What's live in AWS right now (all via Terraform in `infra/`)

- VPC `ro-ro-statuspage-vpc`, 2 public + 2 private subnets, single NAT.
- EKS cluster `ro-ro-statuspage-cluster` (k8s 1.36) + node group (2-4x t3.medium, On-Demand).
- 5 cluster add-ons: ALB Controller, External Secrets Operator (ESO), metrics-server, KEDA, Cluster Autoscaler.
- RDS PostgreSQL Multi-AZ (`manage_master_user_password=true`).
- ElastiCache Redis Multi-AZ, cluster-mode disabled, TLS in-transit.
- S3 + CloudFront provisioned for static files — **not actually wired to the app** (see Static files below; app serves its own static via WhiteNoise instead). CloudFront/S3 sit unused; mention as "built, deprioritized under deadline" if it comes up.
- ECR repo `ro-ro-statuspage-dev-repo` (single image, 3 processes differ by command).
- App secret `statuspage/app` in Secrets Manager, ESO-synced.
- **`GitHubActionsDeployRoleV2`** — current, correct OIDC role (see CI/CD section). Old `GitHubActionsDeployRole` orphaned, can't be deleted, ignore it.
- Native K8s RBAC for the CI role (`infra/rbac-github-actions.tf`) — see CI/CD section.
- Both `rotem` and `roey` have symmetric, explicitly-pinned EKS access entries and KMS key admin rights.

## Static files — fixed via WhiteNoise (not S3/CloudFront)

App had zero static-file serving wired up (`STATIC_URL`/middleware hardcoded in upstream `settings.py`, not configurable via our `configuration.py`). Chose WhiteNoise over S3/CloudFront for speed under deadline (same visual result either way — same Tailwind CSS either way, only the serving path differs).
- `poc/Dockerfile` — two `sed -i` patches on the freshly-cloned upstream `settings.py`: inject `WhiteNoiseMiddleware` right after `SecurityMiddleware`, add `STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'`.
- `helm/statuspage/values.yaml` — `web` process `command` changed to a shell wrapper: `collectstatic --noinput && gunicorn ...`. Runs on every pod boot (not at image build time) because `configuration.py` needs env vars (`DB_NAME` etc.) that don't exist yet during `docker build`.

## The Helm chart — built and deployed ✅

Location: `helm/statuspage/`. Full chart: `configmap.yaml`, `clustersecretstore.yaml`, `externalsecret-db.yaml`, `externalsecret-app.yaml`, `deployment.yaml` (one template, `range` over `.Values.processes` → 3 Deployments), `service.yaml`, `job-migrate.yaml`, `ingress.yaml`, `hpa.yaml`, `scaledobject.yaml`, `networkpolicy.yaml` (4 policies), `poddisruptionbudget.yaml` (web only).

**Design:** one image, 3 Deployments differing only by `command`. Scheduler = `replicas: 1` + `strategy: Recreate` (singleton).

### Fixes that got it from CrashLoop → Running (still true, don't re-hit)

1. **Migrate Job is a plain Job, NOT a Helm hook** (hooks can't see same-chart ConfigMaps/Secrets). Trade-off: immutable — `kubectl delete job statuspage-migrate -n statuspage` before every `helm upgrade` that changes it. **CI does this automatically** (a step before `helm upgrade`); only needed manually for local/manual upgrades.
2. **`configuration.py` needs all 5 required params:** `ALLOWED_HOSTS, DATABASE, SECRET_KEY, REDIS, SITE_URL`.
3. Config is **baked into the image** — any config change = rebuild + new tag.

### App env contract (confirmed from `poc/configuration.py`)
`DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, REDIS_HOST, SECRET_KEY, SITE_URL`. Non-secret → ConfigMap. `DB_PASSWORD` → RDS secret via ESO. `SECRET_KEY`+superuser pw → `statuspage/app` via ESO.

## What's left

**TLS/HTTPS** — currently HTTP-only via DuckDNS. DuckDNS is IP-only (no CNAME-to-hostname), which may block ACM DNS validation against an ALB (2 IPs, no fixed single IP). Open decision: pursue anyway, or document as a defended tradeoff for the presentation.

**Step 10 — Monitoring + Backup (mentor criteria).** Prometheus + Grafana; backup/restore + a real survival test. Not started.

**Cleanup, real but not blocking:**
- `diagrams/aws-infra-flow.drawio` — legend still says "S3 + DynamoDB" for state locking; we use S3-native (`use_lockfile`), no DynamoDB.
- `diagrams/k8s-objects.drawio` — still shows Redis as an in-cluster StatefulSet; should be removed (ElastiCache is external).
- `diagrams/cicd-delivery.svg` — may still show an older flow; verify against the actual `.github/workflows/ci-cd.yaml` before presenting it.
- Port 8001 security-group relevance — not re-verified this session.
- Scheduler job list — not re-verified this session.
- S3+CloudFront static infra sits built but unused (see Static files section) — decide whether to mention or quietly drop from the architecture story.

## Known permanent workarounds — don't try to "fix" these again

- The AWS account (992382545251, course-managed) denies `iam:GetPolicyVersion` on every standalone `aws_iam_policy`, but allows `iam:GetRolePolicy`. **Always use `aws_iam_role_policy` (inline), never `aws_iam_policy` + attachment.**
- `attach_encryption_policy = false` in `infra/eks.tf` skips one supporting KMS policy for the same reason — don't touch `encryption_config` itself (forces full cluster replacement).
- `iam:UpdateAssumeRolePolicy` and (believed, not separately confirmed) `iam:DeleteRole` are also denied on this account — an IAM role's trust policy is fixed forever at `CreateRole` time. If a trust policy needs to change, create a new role and repoint everything at it; the old one can't be cleaned up.
- AWS's built-in EKS access policies (View/Edit/Admin) don't cover third-party CRDs (ESO, KEDA, likely any future one) — always check for this class of failure with explicit native K8s RBAC (`infra/rbac-github-actions.tf` is the pattern to extend), not by reaching for a broader built-in policy.

## Gotchas hit this session

- Multiple copy-paste line-merge bugs (a pasted second line landing on the same line as the first, no newline) — hit in `values.yaml`, `ci-cd.yaml` twice. Always re-read the file after a manual paste before running anything against it.
- `pip install -r requirements.txt "pkg==X"` in one command does **not** let the explicit pin win over the file's pin — pip treats both as simultaneous constraints and refuses to resolve if they conflict. Needs two separate `pip install` calls (second one `--upgrade`).
- Don't accept a third party's technical claim (even a plausible, detailed one) without independent verification — the GitHub OIDC immutable-subject-claims diagnosis from another student was verified against official docs *and* this repo's own `gh api` output before acting on it, not taken on faith.
