# Project Status — Status-Page on EKS

Paste this into a fresh Claude Code conversation (in this project directory) to pick up exactly where we left off. Not a task list by itself — `ARCHITECTURE_NOTES.md` and the diagrams have the design; this is "what's actually been built and what's left."

**Last updated: 2026-09-06** — the application is now **running on EKS** (step 8א complete). Reachable inside the cluster only; no public URL yet.

## How to work with me on this

- **Teach, don't solve.** Let me write the Terraform/Helm/YAML myself. Explain concepts and point at what's needed; only show a snippet for genuinely new syntax I haven't seen.
- **Never edit or create files without asking first.** Small 1-2 line tweaks to something we're actively looking at together are fine. Anything bigger — show it in chat, I type it in.
- **When I say I'm running/checking something myself, don't run the equivalent command yourself** — give me the command, wait for my output. (Applies to read-only checks too, e.g. `kubectl get pods`.)
- **Verify before proposing.** Check real numbers/behavior for our actual scale before pitching an optimization as a big win.

## Where we stand (TL;DR)

| Area | Status |
|---|---|
| Infrastructure (VPC, EKS, RDS, Redis, S3/CloudFront, ECR, add-ons) | ✅ live via Terraform |
| Image build (`build.sh`: build → Trivy scan → push, tagged by git SHA) | ✅ working |
| App secret (`statuspage/app`) + ESO policy | ✅ done (Terraform) |
| Helm chart (full) + **app running on EKS** | ✅ web ×2 + worker + scheduler `Running`, DB migrated |
| Expose externally (Ingress + ALB + TLS + **domain**) | ⏳ next (8ב) |
| Autoscaling (HPA + KEDA) + NetworkPolicy/PDB/topologySpread | ⏳ 8ג |
| CI/CD (GitHub Actions) | ⏳ drafted, not built |
| Monitoring + Backup/restore + survival test | ⏳ mentor criteria |

## What's live in AWS right now (all via Terraform in `infra/`)

- VPC `ro-ro-statuspage-vpc`, 2 public + 2 private subnets, single NAT.
- EKS cluster `ro-ro-statuspage-cluster` (k8s 1.36) + node group (2-4x t3.medium, On-Demand).
- 5 cluster add-ons deployed: ALB Controller, External Secrets Operator (ESO), metrics-server, KEDA, Cluster Autoscaler.
- RDS PostgreSQL Multi-AZ (`manage_master_user_password=true` — AWS auto-manages the DB password in Secrets Manager, no manual secret needed).
- ElastiCache Redis Multi-AZ, cluster-mode **disabled** (required — the app needs 2 Redis DBs: 0=queue, 1=cache). TLS in-transit enabled → app connects with `SSL=True`.
- S3 + CloudFront for static files (private bucket, Origin Access Control).
- One shared ECR repo — the **live repo is `ro-ro-statuspage-dev-repo`** (web/rq-worker/scheduler are the same codebase, different start commands, so one image is correct, not three).
  ⚠️ Stale name to fix: older notes and the GitHub OIDC policy reference `ro-ro-statuspage-app` / `status-page` — the real repo is `dev-repo`. Update the OIDC policy when we build CI/CD.
- **App secret `statuspage/app`** in Secrets Manager (`infra/app-secret.tf`) — `SECRET_KEY` + `SUPERUSER_PASSWORD`, generated with `random_password`. ESO inline policy (`infra/eso.tf`) now allows **both** the RDS managed secret and this app secret.
- GitHub Actions OIDC deploy role, scoped to the `rotemamt/statuspage-terraform` repo only.
- Both `rotem` and `roey` have symmetric, explicitly-pinned EKS access entries and KMS key admin rights.

## The Helm chart — built and deployed ✅

Location: `helm/statuspage/`. Full chart, installed and running.

**Templates** (`helm/statuspage/templates/`):
- `configmap.yaml` — non-secret env (DB_HOST/PORT/NAME/USER, REDIS_HOST, SITE_URL).
- `clustersecretstore.yaml` — ESO → AWS Secrets Manager (us-east-1); auth via the ESO controller's IRSA (no explicit auth block).
- `externalsecret-db.yaml` — pulls `password` from the RDS managed secret → k8s Secret `statuspage-db` (`DB_PASSWORD`).
- `externalsecret-app.yaml` — pulls `SECRET_KEY` + `SUPERUSER_PASSWORD` from `statuspage/app` → k8s Secret `statuspage-app`.
- `deployment.yaml` — **one template, `range` over `.Values.processes`** → 3 Deployments (web/worker/scheduler). `envFrom`: configmap + both secrets.
- `service.yaml` — ClusterIP, web only.
- `job-migrate.yaml` — migrate + collectstatic + createsuperuser.

**Design:** one image, 3 Deployments differing only by `command`. Scheduler = `replicas: 1` + `strategy: Recreate` (singleton — two schedulers double-fire every scheduled job).

**Install:** `helm install statuspage ./helm/statuspage -n statuspage --create-namespace`

### Fixes that got it from CrashLoop → Running (don't re-hit these)

1. **Migrate Job is a plain Job, NOT a Helm hook.** Hooks run *before* the release's regular resources, so a `pre-install` hook Job can't see the ConfigMap/Secrets from the same chart (`configmap not found`). Trade-off: a plain Job is immutable, so `helm upgrade` won't update it — while iterating, `uninstall` + `install`, or `kubectl delete job statuspage-migrate` first.
2. **Hooks survive `helm uninstall`.** The original hook Job was left orphaned and blocked reinstall ("already exists"). Fix: `kubectl delete job statuspage-migrate -n statuspage`.
3. **`configuration.py` must define all 5 required params:** `ALLOWED_HOSTS, DATABASE, SECRET_KEY, REDIS, SITE_URL` (list is in the image's `settings.py`). We were missing **`SITE_URL`** → every pod crashed. Added `SITE_URL = os.environ.get('SITE_URL', 'http://localhost')`. Config is **baked into the image** (Dockerfile `COPY configuration.py`) → any config change = rebuild + new tag.
4. **After a rebuild, bump `image.tag` in `values.yaml`** to the new `<sha>-dirty-<ts>` tag, then redeploy. (Easy to forget — deployed the old image once.)

### App env contract (confirmed from `poc/configuration.py`, don't re-derive)
`DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, REDIS_HOST, SECRET_KEY` + `SITE_URL`.
Non-secret (DB_HOST/PORT/NAME/USER, REDIS_HOST, SITE_URL) → ConfigMap. `DB_PASSWORD` → RDS secret via ESO. `SECRET_KEY` (+ superuser pw) → `statuspage/app` via ESO.

## What's left (in order)

**8ב — Expose externally.** Ingress → ALB (controller already running) + TLS.
- **Needs a domain** (open decision): use an existing one (free subdomain) or register in Route53. Then ACM cert (us-east-1, DNS-validated) → cert ARN in the Ingress annotations → DNS record → ALB.
- Once we have the real URL, set `SITE_URL` to it via the ConfigMap.

**8ג — Autoscaling + resilience.** HPA (web, CPU) + KEDA (worker, by Redis queue length; metrics-server + KEDA already installed). Plus `NetworkPolicy` + `PodDisruptionBudget` + `topologySpreadConstraints` (required, not optional).

**Step 9 — CI/CD** (GitHub Actions, no Argo CD/GitOps — direct push-deploy with the scoped OIDC role).
- Move `build.sh` logic into a workflow; deploy step uses `helm upgrade` (not `kubectl set image`).
- **Mentor's one exception:** skip only the DB-touching test sub-step (throwaway Postgres/Redis in CI) — diagram-only. Everything else (lint, scan, build, push, migrate, deploy) is real YAML.
- Update the OIDC policy repo name (`status-page` → `ro-ro-statuspage-dev-repo`).
- Draft workflow exists in chat history; diagrams `diagrams/cicd-pipeline-v2.drawio` + `cicd-pipeline-summary.drawio` are current/approved.

**Step 10 — Monitoring + Backup (mentor criteria).** Prometheus + Grafana; backup/restore + a real survival test.

## Known permanent workaround — don't try to "fix" this again

The AWS account (992382545251, course-managed) denies `iam:GetPolicyVersion` on every standalone `aws_iam_policy`, but allows `iam:GetRolePolicy`. **Always use `aws_iam_role_policy` (inline), never `aws_iam_policy` + attachment**, for any future IRSA role. Also: `attach_encryption_policy = false` in `infra/eks.tf` skips one supporting KMS policy for the same reason — don't touch `encryption_config` itself, removing it forces full cluster replacement (nearly happened once).

## Gotchas hit this session, don't re-litigate

- **Helm hook ordering** (see fix #1 above) — hooks can't consume same-chart ConfigMaps/Secrets.
- Claude twice wrongly over-generalized "skip for time" guidance (dropping required add-ons; assuming the whole CI/CD pipeline was diagram-only). When told "the mentor said X," implement exactly X.
- `git pull` cannot delete a file that was never committed — if a file "disappears," check `git log`/`reflog`. Also: `git pull` **aborts** if an untracked local file would be overwritten by an incoming committed file (hit this when both of us created `helm/statuspage/Chart.yaml` + `values.yaml`).
- Changing the EKS access-entry identity in the same `apply` as unrelated cluster-dependent resources (like `helm_release`) can make them falsely show as needing recreation. Isolate with `-target`.

## Cleanup items, real but not blocking

- OIDC policy + old notes still say ECR `ro-ro-statuspage-app` / `status-page` → real repo is `ro-ro-statuspage-dev-repo`.
- `diagrams/aws-infra-flow.drawio` — legend still says "S3 + DynamoDB" for state locking; we use S3-native (`use_lockfile`), no DynamoDB.
- `diagrams/k8s-objects.drawio` — still shows Redis as an in-cluster StatefulSet; should be removed (ElastiCache is external).
- `diagrams/cicd-delivery.svg` — still shows the old superseded GitOps flow.
- Django `collectstatic` → S3: the app isn't yet configured (django-storages + IRSA) to push static to the S3/CloudFront bucket — currently `collectstatic` runs but isn't wired to S3. Confirm before relying on CloudFront for static.
- `SITE_URL` is a placeholder (`http://localhost`) until 8ב sets the real domain.
- Live survival/failure testing (the "six failure questions" from `ARCHITECTURE_NOTES.md`) — not yet done against the real running stack.
- Uncommitted working changes to commit: `poc/configuration.py` (SITE_URL), `helm/statuspage/values.yaml` (tag + SITE_URL), `helm/statuspage/templates/job-migrate.yaml` (hook removed).
