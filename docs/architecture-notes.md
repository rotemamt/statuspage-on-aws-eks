# Status-Page Final Project — Architecture Notes

Living file. Add to it as we go. Things marked **VERIFY** still need confirming from the app docs.

---

## The app in one line

Status-Page = a website showing "is our service up or down". Django app. We do not write its code — we build the machinery that runs it.

## The four pieces

| Piece | Job | If it dies |
|---|---|---|
| Web (gunicorn + Django) | Serves pages and API | Site down, data safe |
| PostgreSQL | All permanent data | **Project gone.** Must be backed up |
| Redis | Cache + job queue | Slow for a minute, pending jobs lost |
| Workers (rq + scheduler) | Slow/background work | Emails and cleanups stop; site still loads |

---

## Request flow

```
browser → nginx (:443, TLS) → gunicorn (:8001) → Django
                                                   ├→ PostgreSQL (:5432)  "give me the components"
                                                   └→ Redis DB 1 (:6379)  "did I already compute this?"
                                                 ← HTML
        ← nginx returns it
```

CSS/images stop at nginx — served from disk, gunicorn and Django never see them.

Analogy: nginx = doorman. gunicorn = restaurant (takes orders, keeps several chefs busy). Django = the chef who cooks.

---

## Django vs gunicorn

- **Django** = the app's logic. Python code. Can't listen on a network port by itself.
- **gunicorn** = runs Django. Opens the port, accepts connections, and keeps several copies of Django working in parallel (called *workers*) so users don't queue behind each other.

---

## PostgreSQL vs Redis — do not confuse

- **PostgreSQL = truth.** Permanent, on disk, backed up. Lose it and the project is gone.
- **Redis = speed.** In RAM, expires in minutes, holds only recently-requested answers.

**Cache is NOT a backup.** Two reasons: it's incomplete on purpose (only recent stuff, short expiry) and it lives in RAM (restart = gone). It's the most fragile piece in the stack, not the safest.

- Cache = sticky note with an answer you just worked out.
- Backup = photocopy of the whole filing cabinet, in another building.

**Rule: deleting Redis entirely must lose nothing permanent.** Site gets slower while cache refills, that's all. If deleting Redis loses real data, the design is wrong.

Also: Redis caches *answers*, not requests. And only what the app chose to cache — user-specific or fast-changing data usually isn't.

---

## The two Redis databases

| DB | Name | Holds | Losing it |
|---|---|---|---|
| 0 | `tasks` | Job queue — real pending work | Those jobs never run |
| 1 | `caching` | Throwaway cache | Harmless |

Must not be mixed. Clearing DB 0 by accident = queued emails never go out.

Note for AWS: ElastiCache in **cluster-mode enabled does not support multiple databases**. Use cluster-mode disabled, or this breaks.

---

## Async work — why there are three processes

Problem: admin clicks "publish incident". Saving takes 20ms, emailing 500 subscribers takes 3 minutes. Doing both before answering = browser hangs 3 minutes.

Fix: write the slow work onto a list, answer the browser immediately, let a different process work the list. The list is a **queue** (Redis DB 0). The process eating it is a **worker**.

```
admin clicks publish
  → Django saves incident to PostgreSQL            (20ms)
  → Django pushes job "send emails" to Redis DB 0  (1ms)
  → Django returns "Done!"                          ← admin is free

meanwhile, separately:
  → rq worker takes the job off Redis DB 0
  → sends 500 emails over 3 minutes
```

Admin waited 21ms instead of 3 minutes. This is **asynchronous work**. It's why the app has three processes, not one.

---

## The three processes — and how many copies of each

From the guide's systemd units: `status-page`, `status-page-rq`, `status-page-scheduler`.

| Process | Job | Copies | Why |
|---|---|---|---|
| `status-page` (gunicorn) | Serves web + API on :8001 | many | More users = more copies. They share nothing. |
| `status-page-rq` | Worker. Takes jobs off Redis DB 0 and runs them | many | All pull from one shared queue, so no overlap |
| `status-page-scheduler` | The clock. At the right time, pushes jobs onto the queue | **exactly 1** | Each copy has its own clock — two copies queue every job twice |

**RQ** = "Redis Queue", the Python library behind the worker.

The scheduler does **not** do the work — it only says "now". The worker does the work. Clock and workforce, split apart.

**The scheduler singleton problem** — worth raising with the mentor: Kubernetes' instinct is "run three copies and restart freely". The scheduler is the deliberate exception. Two copies = duplicate cleanups, duplicate emails, every subscriber notified twice.

**VERIFY**: the exact list of jobs Status-Page schedules (from the app docs). Role is confirmed; the specific job list is not.

---

## Things still to answer (the six failure questions)

- [ ] gunicorn dies → ?
- [ ] rq worker dies mid-job → ?
- [ ] scheduler dies for an hour → ?
- [ ] PostgreSQL dies → ?
- [ ] Redis dies → ?
- [ ] Whole server dies → ?

---

## Version + upstream status (decided)

| | |
|---|---|
| Drive snapshot | 11 Feb 2023, ~v2.2.x (**VERIFY** exact VERSION in settings) |
| Latest stable | v2.5.1 (Oct 2024) |
| Repo | github.com/Status-Page/Status-Page — **ARCHIVED Oct 2025**, Apache-2.0, ~74 stars |

Real public open-source project (NetBox-derived), not made for us. Docs at docs.status-page.dev are the app authors'.

**Archived = no more upstream security fixes, ever.** Turn into a talking point, not a problem:
> App is unmaintained upstream. So: pin exact version, scan image for CVEs in the pipeline, run non-root, network policies, no direct internet exposure beyond the load balancer. No upstream fix coming — we mitigate at the platform layer.

Plan: use v2.5.1 (fewer CVEs, same install steps). **Confirm with mentor** he allows newer than his snapshot, and check v2.5.1's Python requirement.

systemd finding (from `contrib/status-page.service`): `Restart=on-failure` + `RestartSec=30`, `User=status-page` (non-root). So single-server DOES auto-restart — but 30s of 502 on every crash. K8s restarts near-instantly with backoff = direct comparison point. Copy the non-root idea into our container.

---

## Compute: Kubernetes or not, and which flavor (decided: EKS + Managed Node Groups)

### K8s vs plain VMs

| | Kubernetes | VMs + systemd (the guide) |
|---|---|---|
| Survival | self-healing, moves pods | Restart=on-failure, 30s 502 per crash |
| Scale | HPA automatic | manual, add a server |
| Monitoring | ready ecosystem (Prometheus) | assemble yourself |
| Cost | higher (control plane + nodes) | cheap |
| Complexity | high | low |
| Market/CV value | **what interviews test** | less impressive |

Decision: **Kubernetes.** Overkill for one small app — say so out loud — but it's what the market tests and what we want to prove.

### EKS (managed) vs self-managed (kubeadm on EC2)

"Managed vs unmanaged" = who runs the **control plane** (etcd, API server, scheduler).

| | EKS (managed) | self-managed kubeadm |
|---|---|---|
| Control plane | AWS runs/patches/backs up | us — hard, easy to break |
| Control-plane HA | Multi-AZ automatic | we build it, weaker |
| Setup time | ~1hr with Terraform | days + debugging |
| Cost | $0.10/hr ≈ $73/mo | "free" (pay only EC2) |
| AWS integration | IAM/ALB/EBS built in | wired by hand |
| Learning depth | less internals | more internals |
| Schedule risk | low | **high — can eat a week** |

Decision: **EKS.** Reasons: 2.5-week schedule can't absorb control-plane debugging; survival is a mentor criterion and EKS gives Multi-AZ out of the box; $73 fits in $300. Mentor framing:
> Considered self-managed for learning value, but a control plane we run contradicts the survival criterion and risks the timeline. Chose EKS; spent the saved time on real backup/restore + monitoring.

### Node management (decided: Managed Node Groups)

Pods run on **nodes** = EC2 servers. Someone must provision, scale, replace them.

| Option | Who provides nodes | When |
|---|---|---|
| **Managed Node Groups** | you, fixed, up 24/7 | default — **our choice** |
| **Fargate** (serverless) | AWS, no visible server; pay per pod, no node patching; pricier per pod, no DaemonSets | don't want to manage nodes at all |
| **Karpenter** (smart autoscaler) | tool spins up the exact cheapest EC2 (incl. Spot) on demand, kills it when idle | save cost at variable scale |

Note: even on EKS, **the nodes are still our responsibility** unless we use Fargate. "Managed" covers only the control plane.

Decision: **Managed Node Groups** — simple, predictable, fits $300. Fargate/Karpenter solve scale problems we don't have. Mentor framing:
> Chose Managed Node Groups — simple and predictable. Know Karpenter (smart node autoscaling) and Fargate (serverless), but both are overkill for a small fixed cluster and add complexity without payoff at our size.

---

## Configuration philosophy — the mentor's "what configures everything?" question

Ansible and Kubernetes solve the same problem with opposite philosophies:
- **Ansible** = push, imperative, SSH into servers and run steps. Good for long-lived VMs (pets).
- **Kubernetes** = pull, declarative, "I want 3 copies" and it maintains that. Containers are disposable (cattle).

Why modern container apps skip Ansible: once the app is in an image, there's nothing to "configure on a server" — the image already has everything. K8s replaces Ansible's role *inside* the cluster. Running Ansible against a live container fights K8s's philosophy.

So what configures everything (our stack):
- **Terraform** — builds the cloud infra (VPC, EKS, RDS). Replaces Ansible at the cloud layer.
- **Helm** — configures what runs inside K8s.
- **Argo CD / GitOps** — syncs the cluster to Git.

Ansible would fit only if we chose VMs instead of K8s (install gunicorn/nginx/systemd per server). Worth one of us understanding that path to compare. Optional: use Ansible for one small thing (bastion bootstrap) to show we know it.

---

## Where to run PostgreSQL (leaning: RDS)

| Where | Pros | Cons |
|---|---|---|
| **Managed (RDS)** | auto backups, failover, patches, less work | costs money, less control, "less impressive" |
| **Pod in K8s** | all in one place, cheap | **risky** — stateful DB inside disposable cluster; needs StatefulSet + PersistentVolume + self-managed backups |
| **Separate VM** | full control, isolated from cluster | you own everything: backup, patches, failover |

Rule: state (data) and disposable (containers) don't mix. Lean **RDS**, and turn "less impressive" into a strength — knowing *when not* to self-host. But run PostgreSQL in a pod once in dev to understand *why* it's hard (answers the mentor from experience, not theory).

---

## Load Balancer — managed vs not

- **Managed (AWS ALB):** don't configure by hand. Install **AWS Load Balancer Controller** in the cluster, write a K8s `Ingress` object; the controller creates/updates the ALB automatically. TLS from ACM.
- **Unmanaged (nginx ingress controller):** run nginx inside the cluster as a pod that spreads traffic; you manage its certs, scaling, availability.

Both wire to gunicorn via `Service` + `Ingress`. Difference is only *who runs* the LB.

---

## Network — the first thing we build (decided: own VPC, Terraform)

Network is the ground. EKS, RDS, ElastiCache, ALB all sit *inside* it → it must come first.

**VPC is not optional in AWS.** Everything runs in a VPC. The real choice is Default VPC vs our own:

| | Default VPC | Own VPC (Terraform) |
|---|---|---|
| Exists automatically | yes | no, we build it |
| Control of subnets/routing | little | full |
| Production-safe | no — all public | yes |
| Impresses mentor | no ("didn't touch the network") | yes ("designed the network") |

Decision: **own VPC in Terraform.**

### Dependency order (why network is first)

```
VPC → Subnets → EKS nodes / RDS / ElastiCache → ALB / Ingress → App
```

Can't make EKS before subnets, can't make subnets before VPC.

### Minimal correct layout

```
VPC (e.g. 10.0.0.0/16)
├─ 2 Availability Zones          (survival — mentor criterion)
├─ Public subnets  (1 per AZ)    → ALB, NAT Gateway
└─ Private subnets (1 per AZ)    → EKS nodes, RDS, ElastiCache
```

Guiding rule: **what the user reaches = public; the data + app = private.** Only the ALB is exposed; it forwards inward to pods in private subnets. RDS and Redis are never reachable from the internet.

### Components

| Component | Role | Cost |
|---|---|---|
| VPC | the network | free |
| Subnets | split public/private per AZ | free |
| Internet Gateway | connects public to internet | free |
| **NAT Gateway** | lets private subnets reach out (updates, image pulls) without being exposed | **~$32/mo — biggest silent cost** |
| Route Tables | who talks to whom | free |
| Security Groups | per-component firewall | free |

**NAT budget warning:** two NATs (one per AZ) ≈ $64/mo on nothing. Start with **one NAT** — less survival, saves ~$32. Tell mentor: "single NAT to save cost, know it's a single point of failure, real prod would have two."

Practical: don't hand-write the VPC — use `terraform-aws-modules/vpc/aws`. Build order day 1: Terraform backend (S3 + lock) → VPC module (2 AZ, public+private, 1 NAT) → apply → then EKS inside those subnets.

---

## AWS infra diagram — decisions locked for the mentor presentation (25 Aug 2026)

Diagram: [`diagrams/aws-infra.drawio`](diagrams/aws-infra.drawio)

| Question | Decision | Why |
|---|---|---|
| Load Balancer | **AWS ALB** via AWS Load Balancer Controller | Industry-standard for EKS ingress; TLS from ACM; less to run ourselves than nginx ingress |
| RDS layout | **Multi-AZ** (standby, automatic failover) | Survival is a mentor criterion; RDS handles the failover for us |
| ElastiCache layout | **Multi-AZ replica** (automatic failover) | Same survival reasoning; queue jobs shouldn't vanish if the primary node dies |
| Static files (CSS/JS) | **S3 + CloudFront**, not served by gunicorn | ALB replaces nginx at the edge, so nothing local serves static files anymore — offloading them keeps pods purely app logic and matches the PoC's known gap ("gunicorn doesn't serve CSS by itself") |

Consequence: the "web pod" is now gunicorn+Django only — no nginx inside the pod. nginx's old job (TLS termination, static files) is split between ALB (TLS) and CloudFront+S3 (static).

---

## Mentor round 2 — scaling, scheduler, spread, secrets (fixes to add)

Scaling / autoscaling:
- **web HPA** — scale on **CPU > 70%** via **metrics-server** (basic). RPS / p95 latency would be more accurate but need Prometheus Adapter. Diagram label: `HPA web: CPU>70% (metrics-server)`.
- **rq worker also needs autoscaling** — but NOT on CPU (workers idle/IO-bound). Scale on **queue depth** (Redis list length) via **KEDA** (can scale-to-zero). Diagram label: `KEDA: scale on queue depth`.
- **metrics-server** = cluster add-on that collects CPU/mem and feeds HPA. Without it HPA on CPU can't work (`kubectl top` also fails).

Scheduler singleton during upgrade:
- Rolling update creates the new pod before killing the old → **2 schedulers for a moment → every job double-fires**.
- Fix is in the **Deployment**: `strategy: type: Recreate` (kill old before new). Or `rollingUpdate: maxSurge: 0`. Few seconds without a scheduler is fine (it's just the clock). Diagram note: `strategy: Recreate — never 2 at once`.

Pod spread across nodes/AZs:
- Use **topologySpreadConstraints** in the pod spec (`topologyKey: kubernetes.io/hostname` for nodes, `topology.kubernetes.io/zone` for AZs, `maxSkew: 1`). Older alt: podAntiAffinity. Diagram note: `topologySpreadConstraints: spread across nodes + AZs`.

DB secret flow (the mentor's "how does the web pod authenticate every time?"):
- **Where**: password in **Secrets Manager** (source of truth, never in Git).
- **How it reaches the pod**: **External Secrets Operator** reads Secrets Manager (via **IRSA** — ServiceAccount mapped to an IAM role over OIDC, no static AWS keys) → creates a **K8s Secret** → Deployment injects it as **env var** (`secretKeyRef`) → `configuration.py` reads `os.environ`.
- **How it connects "every time"**: opens a TCP connection to RDS :5432, auths once, then **pools it** (`CONN_MAX_AGE=300`) — not per request. Plus network gate: `rds-sg` allows :5432 from `nodes-sg` only.
- **Rotation**: Secrets Manager auto-rotates (integrated with RDS) → ESO re-syncs the K8s Secret → pod must reload (use **Reloader** for auto rolling-restart, else stale password fails).
- **RDS IAM auth considered, rejected**: most secure (no stored password, short-lived token) but requires the app to fetch/refresh tokens = app code change. We don't modify Status-Page → chose Secrets Manager + ESO + rotation. IAM auth is the pick only if we owned the code.
- Diagram: one short note is enough (like the HPA labels) → `Secrets: Secrets Manager → ESO → pods (IRSA, no static keys)`. Remove "Secrets Manager" from the "omitted" note.

**IRSA** = IAM Roles for Service Accounts. Pod gets temporary AWS creds (OIDC), no static keys. Same idea as GitHub Actions → AWS. Used by: ESO, ALB Controller, Cluster Autoscaler, web pods (S3).

Add-ons (install via **Terraform** — `helm_release` / `aws_eks_addon`, not manual kubectl, so delete-and-rebuild works): metrics-server, AWS Load Balancer Controller, Cluster Autoscaler, External Secrets Operator, Argo CD, KEDA, Prometheus/Grafana. (Core VPC CNI / CoreDNS / kube-proxy / EBS CSI come as EKS managed add-ons.)

---

## Glossary

| Word | Means |
|---|---|
| Container / Docker | App frozen in a box, runs the same everywhere |
| Kubernetes (K8s) | Runs and babysits many containers — restarts crashes, scales copies, updates without downtime |
| Helm chart | A template of Kubernetes settings, so you don't copy-paste config |
| Terraform / IaC | Text files that create cloud resources, instead of clicking in a console |
| EKS / RDS / ElastiCache | Amazon's managed Kubernetes / PostgreSQL / Redis |
| CI/CD | Robot that tests, builds and deploys on every code push |
| GitOps / Argo CD | Git is the source of truth; a tool continuously syncs the cluster to match it |
| Prometheus / Grafana | Collects the numbers / draws the graphs |
| Gunicorn | The program that actually serves the Django site |
| RQ / worker | Redis Queue; the process that runs queued background jobs |
| Secrets | Passwords and keys — never in Git |
