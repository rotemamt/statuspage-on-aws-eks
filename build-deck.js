// Status-Page on AWS EKS — final project deck
// Rebuilt from the original .pptx geometry, with layout fixes and a reworked slide 14.

const pptxgen = require("pptxgenjs");

const NAVY = "1E2761";
const NAVY_TEXT = "24304A";
const MUTED = "5B6B8C";
const ICE = "CADCFC";
const TINT = "F2F5FC";
const AMBER = "F5A623";
const GREEN = "2F9E6E";
const GREEN_DK = "1E7A52";
const BLUE = "3B6EA5";
const BLUE_TINT = "E7EFF8";
const ORANGE = "E0812F";
const ORANGE_TINT = "FCEEE1";
const GREEN_TINT = "E6F5EE";
const AMBER_TINT = "FDF3E1";
const WHITE = "FFFFFF";

const SERIF = "Cambria";
const SANS = "Calibri";

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.333 x 7.5
pres.author = "Rotem & Roei";
pres.title = "Status-Page on AWS EKS";

// ---------- helpers ----------

function head(slide, kicker, title, titleSize = 34) {
  slide.addText(kicker, {
    x: 0.6, y: 0.45, w: 8.0, h: 0.35, isTextBox: true, margin: 0,
    fontSize: 12, bold: true, color: AMBER, fontFace: SANS, charSpacing: 2,
  });
  slide.addText(title, {
    x: 0.6, y: 0.75, w: 11.5, h: 0.9, isTextBox: true, margin: 0,
    fontSize: titleSize, bold: true, color: NAVY, fontFace: SERIF, valign: "middle",
  });
}

function pageNum(slide, n) {
  slide.addText(String(n), {
    x: 12.43, y: 7.12, w: 0.5, h: 0.3, isTextBox: true, margin: 0,
    fontSize: 10, color: MUTED, fontFace: SANS,
  });
}

function card(slide, x, y, w, h, fill = TINT, line = ICE) {
  const opts = { x, y, w, h, fill: { color: fill }, rectRadius: 0.08 };
  if (line) opts.line = { color: line, width: 1 };
  slide.addShape(pres.ShapeType.roundRect, opts);
}

function banner(slide, y, text, h = 0.9, size = 16) {
  slide.addShape(pres.ShapeType.roundRect, {
    x: 0.6, y, w: 11.1, h, fill: { color: NAVY }, rectRadius: 0.08,
  });
  slide.addText(text, {
    x: 0.7, y, w: 10.9, h, isTextBox: true, margin: 0,
    fontSize: size, bold: true, color: WHITE, fontFace: SANS, align: "center", valign: "middle",
  });
}

function arrowDown(slide, x, y, h, color = MUTED) {
  slide.addShape(pres.ShapeType.line, {
    x, y, w: 0, h, line: { color, width: 1.5, endArrowType: "triangle" },
  });
}

function arrowRight(slide, x, y, w, color = MUTED) {
  slide.addShape(pres.ShapeType.line, {
    x, y, w, h: 0, line: { color, width: 1.5, endArrowType: "triangle" },
  });
}

function bullets(slide, x, y, w, h, items, size = 15, color = NAVY_TEXT) {
  slide.addText(
    items.map((t, i) => ({
      text: t,
      options: { bullet: true, breakLine: i !== items.length - 1 },
    })),
    {
      x, y, w, h, isTextBox: true, margin: 0,
      fontSize: size, color, fontFace: SANS, paraSpaceAfter: 10, valign: "top",
    }
  );
}

// ---------- 1. title ----------
{
  const s = pres.addSlide();
  s.background = { color: NAVY };
  [[10.9, GREEN], [11.45, AMBER], [12.0, ICE]].forEach(([x, c]) => {
    s.addShape(pres.ShapeType.ellipse, { x, y: 0.9, w: 0.28, h: 0.28, fill: { color: c } });
  });
  s.addText("STATUS-PAGE ON AWS EKS", {
    x: 0.9, y: 2.6, w: 11.5, h: 1.1, isTextBox: true, margin: 0,
    fontSize: 44, bold: true, color: WHITE, fontFace: SERIF, valign: "middle",
  });
  s.addText("Production infrastructure for an open-source status dashboard", {
    x: 0.9, y: 3.6, w: 11.0, h: 0.5, isTextBox: true, margin: 0,
    fontSize: 18, color: ICE, fontFace: SANS,
  });
  s.addText("Rotem & Roei  ·  Final Project", {
    x: 0.9, y: 6.4, w: 8.0, h: 0.4, isTextBox: true, margin: 0,
    fontSize: 13, color: ICE, fontFace: SANS,
  });
}

// ---------- 2. what we built ----------
{
  const s = pres.addSlide();
  head(s, "CONTEXT", "What We Built");

  const rows = [
    ["■", "Status-Page", "Public uptime & incident dashboard — open-source Django app"],
    ["⚙", "Our Scope", "We did not write the app's code — we built the production infrastructure that runs it"],
  ];
  rows.forEach(([icon, title, sub], i) => {
    const y = 2.35 + i * 1.75;
    s.addShape(pres.ShapeType.ellipse, { x: 0.6, y, w: 0.9, h: 0.9, fill: { color: ICE } });
    s.addText(icon, {
      x: 0.6, y, w: 0.9, h: 0.9, isTextBox: true, margin: 0,
      fontSize: 23, bold: true, color: NAVY, fontFace: SANS, align: "center", valign: "middle",
    });
    s.addText(title, {
      x: 1.8, y: y + 0.02, w: 6.0, h: 0.45, isTextBox: true, margin: 0,
      fontSize: 20, bold: true, color: NAVY, fontFace: SERIF, valign: "middle",
    });
    s.addText(sub, {
      x: 1.8, y: y + 0.5, w: 6.3, h: 0.75, isTextBox: true, margin: 0,
      fontSize: 13, color: MUTED, fontFace: SANS, valign: "top",
    });
  });

  const tiles = ["Web", "Database", "Cache/Queue", "Workers"];
  tiles.forEach((t, i) => {
    const x = 8.4 + (i % 2) * 2.1;
    const y = 2.35 + Math.floor(i / 2) * 1.75;
    card(s, x, y, 1.95, 1.45);
    s.addText(t, {
      x: x + 0.08, y, w: 1.79, h: 1.45, isTextBox: true, margin: 0,
      fontSize: 12.5, bold: true, color: NAVY, fontFace: SANS, align: "center", valign: "middle",
    });
  });
  pageNum(s, 2);
}

// ---------- 3. why kubernetes (banded table) ----------
{
  const s = pres.addSlide();
  head(s, "COMPUTE STRATEGY", "Why Kubernetes");
  banner(s, 1.95, "Overkill for this app's size — but it's what the industry tests for");

  const COL1 = 0.85, COL2 = 4.8, COL3 = 8.4;
  const W1 = 3.7, W2 = 3.4, W3 = 3.1;

  s.addText("Kubernetes", {
    x: COL2, y: 3.20, w: W2, h: 0.35, isTextBox: true, margin: 0,
    fontSize: 13, bold: true, color: GREEN_DK, fontFace: SANS,
  });
  s.addText("Plain VMs + systemd", {
    x: COL3, y: 3.20, w: W3, h: 0.35, isTextBox: true, margin: 0,
    fontSize: 13, bold: true, color: MUTED, fontFace: SANS,
  });

  const rows = [
    ["Survival", "Self-healing, moves pods automatically", "Manual restart, 30s downtime per crash"],
    ["Scaling", "HPA scales replicas automatically", "Manual — add a server by hand"],
    ["Market Value", "What technical interviews test", "Less differentiated on a resume"],
  ];
  rows.forEach(([label, a, b], i) => {
    const y = 3.70 + i * 1.02;
    if (i % 2 === 0) {
      s.addShape(pres.ShapeType.rect, { x: 0.6, y, w: 11.1, h: 0.92, fill: { color: TINT } });
    }
    s.addText(label, {
      x: COL1, y, w: W1, h: 0.92, isTextBox: true, margin: 0,
      fontSize: 14, bold: true, color: NAVY, fontFace: SANS, valign: "middle",
    });
    s.addText(a, {
      x: COL2, y, w: W2, h: 0.92, isTextBox: true, margin: 0,
      fontSize: 12.5, color: NAVY_TEXT, fontFace: SANS, valign: "middle",
    });
    s.addText(b, {
      x: COL3, y, w: W3, h: 0.92, isTextBox: true, margin: 0,
      fontSize: 12.5, color: MUTED, fontFace: SANS, valign: "middle",
    });
  });
  pageNum(s, 3);
}

// ---------- 4. managed control plane ----------
{
  const s = pres.addSlide();
  head(s, "COMPUTE STRATEGY", "Managed Control Plane");

  card(s, 0.6, 2.1, 3.6, 4.4);
  s.addText("$73", {
    x: 0.6, y: 3.05, w: 3.6, h: 1.0, isTextBox: true, margin: 0,
    fontSize: 52, bold: true, color: AMBER, fontFace: SERIF, align: "center", valign: "middle",
  });
  s.addText("per month", {
    x: 0.6, y: 4.05, w: 3.6, h: 0.4, isTextBox: true, margin: 0,
    fontSize: 12, color: MUTED, fontFace: SANS, align: "center",
  });
  s.addText("EKS control plane — AWS runs, patches, and backs it up", {
    x: 0.95, y: 4.85, w: 2.9, h: 1.0, isTextBox: true, margin: 0,
    fontSize: 12, color: MUTED, fontFace: SANS, align: "center", valign: "top",
  });

  const items = [
    ["Multi-AZ, automatically", "The control plane spans AZs with no HA for us to build"],
    ["~1 hour, not days", "Stood up with Terraform, vs. days of kubeadm debugging"],
    ["A fixed timeline can't absorb it", "A self-managed control-plane failure risked eating a week"],
  ];
  items.forEach(([t, sub], i) => {
    const y = 2.1 + i * 1.55;
    card(s, 4.7, y, 8.0, 1.3, WHITE, ICE);
    s.addText(t, {
      x: 4.95, y: y + 0.15, w: 7.5, h: 0.42, isTextBox: true, margin: 0,
      fontSize: 15.5, bold: true, color: NAVY, fontFace: SERIF, valign: "middle",
    });
    s.addText(sub, {
      x: 4.95, y: y + 0.62, w: 7.5, h: 0.55, isTextBox: true, margin: 0,
      fontSize: 12.5, color: MUTED, fontFace: SANS, valign: "top",
    });
  });
  pageNum(s, 4);
}

// ---------- 5. architecture ----------
{
  const s = pres.addSlide();
  head(s, "ARCHITECTURE", "How a Request Flows", 30);

  s.addShape(pres.ShapeType.roundRect, {
    x: 0.5, y: 1.55, w: 12.3, h: 5.4, fill: { color: WHITE }, line: { color: ICE, width: 1 }, rectRadius: 0.06,
  });
  s.addText("VPC  ·  10.0.0.0/16", {
    x: 0.58, y: 1.6, w: 12.14, h: 0.3, isTextBox: true, margin: 0,
    fontSize: 10, color: MUTED, fontFace: SANS, align: "center",
  });

  function zone(y, h, fill, line, label) {
    s.addShape(pres.ShapeType.roundRect, {
      x: 0.8, y, w: 11.7, h, fill: { color: fill }, line: { color: line, width: 1 }, rectRadius: 0.06,
    });
    s.addText(label, {
      x: 0.95, y: y + 0.05, w: 6.0, h: 0.25, isTextBox: true, margin: 0,
      fontSize: 9, bold: true, color: line, fontFace: SANS, charSpacing: 1,
    });
  }
  function node(x, y, w, h, line, lines, sub) {
    s.addShape(pres.ShapeType.roundRect, {
      x, y, w, h, fill: { color: WHITE }, line: { color: line, width: 1 }, rectRadius: 0.06,
    });
    s.addText(lines, {
      x: x + 0.06, y: sub ? y + 0.08 : y, w: w - 0.12, h: sub ? h * 0.55 : h, isTextBox: true, margin: 0,
      fontSize: 11, bold: true, color: NAVY, fontFace: SANS, align: "center", valign: "middle",
    });
    if (sub) {
      s.addText(sub, {
        x: x + 0.06, y: y + h * 0.55, w: w - 0.12, h: h * 0.38, isTextBox: true, margin: 0,
        fontSize: 9.5, color: MUTED, fontFace: SANS, align: "center", valign: "middle",
      });
    }
  }

  zone(2.0, 1.35, ORANGE_TINT, ORANGE, "PUBLIC SUBNETS");
  node(1.0, 2.45, 2.0, 0.75, ORANGE, "Route 53 + IGW");
  node(3.3, 2.45, 2.2, 0.75, ORANGE, "ALB :443");
  node(9.5, 2.45, 2.7, 0.75, ORANGE, "NAT Gateway (x1)");
  arrowRight(s, 3.0, 2.82, 0.3);

  zone(3.55, 1.5, BLUE_TINT, BLUE, "PRIVATE SUBNETS — EKS NODES (2 AZ)");
  node(1.0, 4.0, 1.95, 0.9, BLUE, "web pod");
  node(3.15, 4.0, 1.95, 0.9, BLUE, "rq-worker");
  node(5.3, 4.0, 1.95, 0.9, BLUE, "scheduler (x1)");
  node(9.3, 4.0, 2.9, 0.9, ORANGE, "CloudFront + S3", "(static assets)");
  arrowDown(s, 4.4, 3.2, 0.35, BLUE);

  zone(5.3, 1.5, GREEN_TINT, GREEN, "PRIVATE SUBNETS — DATA (2 AZ, Multi-AZ)");
  node(1.0, 5.75, 3.0, 0.9, GREEN, "RDS PostgreSQL", "primary + standby");
  node(4.3, 5.75, 3.0, 0.9, GREEN, "ElastiCache Redis", "primary + replica");
  node(7.6, 5.75, 4.6, 0.9, GREEN, "Secrets Manager → ESO → pod (IRSA)");
  arrowDown(s, 2.4, 4.9, 0.4, GREEN);
  arrowDown(s, 5.4, 4.9, 0.4, GREEN);

  pageNum(s, 5);
}

// ---------- 6. network design ----------
{
  const s = pres.addSlide();
  head(s, "ARCHITECTURE", "Network Design");

  [["AZ-a", 0.7], ["AZ-b", 6.6]].forEach(([label, x]) => {
    card(s, x, 1.95, 5.6, 4.35);
    s.addText(label, {
      x: x + 0.08, y: 2.0, w: 5.44, h: 0.4, isTextBox: true, margin: 0,
      fontSize: 12, bold: true, color: NAVY, fontFace: SANS, valign: "middle",
    });
    const subnets = [
      ["Public subnet", ORANGE_TINT, ORANGE],
      ["Private subnet — app", BLUE_TINT, BLUE],
      ["Private subnet — data", GREEN_TINT, GREEN],
    ];
    subnets.forEach(([t, fill, line], i) => {
      const y = 2.5 + i * 1.2;
      s.addShape(pres.ShapeType.roundRect, {
        x: x + 0.25, y, w: 5.1, h: 1.0, fill: { color: fill }, line: { color: line, width: 1 }, rectRadius: 0.06,
      });
      s.addText(t, {
        x: x + 0.33, y, w: 4.94, h: 1.0, isTextBox: true, margin: 0,
        fontSize: 11, bold: true, color: NAVY, fontFace: SANS, align: "center", valign: "middle",
      });
    });
  });

  // narrower than full width so it clears the page number
  s.addShape(pres.ShapeType.roundRect, {
    x: 0.7, y: 6.55, w: 11.5, h: 0.68, fill: { color: NAVY }, rectRadius: 0.08,
  });
  s.addText("Single NAT Gateway — saves ~$32/mo. Known single point of failure, accepted knowingly.", {
    x: 0.8, y: 6.55, w: 11.3, h: 0.68, isTextBox: true, margin: 0,
    fontSize: 12.5, bold: true, color: WHITE, fontFace: SANS, align: "center", valign: "middle",
  });
  pageNum(s, 6);
}

// ---------- 7. node management ----------
{
  const s = pres.addSlide();
  head(s, "COMPUTE STRATEGY", "Node Management");
  banner(s, 2.1, "Decision: Managed Node Groups", 1.0, 18);

  const items = [
    ["Fixed, predictable capacity", "A known EC2 bill fits a $300 budget cleanly"],
    ["Fargate and Karpenter solve a problem we don't have", "Both are answers to scale volatility this project never sees"],
    ["Nodes are still ours", "“Managed” on EKS covers the control plane, not the workers"],
  ];
  items.forEach(([t, sub], i) => {
    const y = 3.45 + i * 1.08;
    card(s, 0.6, y, 11.1, 0.92, WHITE, ICE);
    s.addText(t, {
      x: 0.9, y: y + 0.08, w: 10.4, h: 0.38, isTextBox: true, margin: 0,
      fontSize: 15, bold: true, color: NAVY, fontFace: SERIF, valign: "middle",
    });
    s.addText(sub, {
      x: 0.9, y: y + 0.48, w: 10.4, h: 0.36, isTextBox: true, margin: 0,
      fontSize: 12.5, color: MUTED, fontFace: SANS, valign: "middle",
    });
  });
  pageNum(s, 7);
}

// ---------- 8. data layer ----------
{
  const s = pres.addSlide();
  head(s, "DATA LAYER", "Managed, Multi-AZ Data");

  const cols = [
    [0.6, 5.5, "RDS PostgreSQL", [
      "Multi-AZ, automatic failover",
      "Survival is a mentor grading criterion",
      "Master password auto-managed in Secrets Manager",
    ]],
    [6.3, 5.4, "ElastiCache Redis", [
      "Multi-AZ replica, automatic failover",
      "Cluster-mode disabled — required for 2 DBs (queue + cache)",
      "Queue jobs survive a primary-node failure",
    ]],
  ];
  cols.forEach(([x, w, title, items]) => {
    card(s, x, 2.1, w, 3.4, GREEN_TINT, GREEN);
    s.addText(title, {
      x: x + 0.3, y: 2.4, w: w - 0.6, h: 0.5, isTextBox: true, margin: 0,
      fontSize: 18, bold: true, color: NAVY, fontFace: SERIF, valign: "middle",
    });
    bullets(s, x + 0.3, 3.15, w - 0.6, 2.2, items, 13.5);
  });
  s.addText("State lives in managed services, never inside a pod — so the pods stay disposable.", {
    x: 0.6, y: 5.85, w: 11.1, h: 0.45, isTextBox: true, margin: 0,
    fontSize: 13.5, italic: true, color: MUTED, fontFace: SANS, align: "center", valign: "middle",
  });
  pageNum(s, 8);
}

// ---------- 9. autoscaling ----------
{
  const s = pres.addSlide();
  head(s, "ELASTICITY", "Three Layers of Autoscaling");

  const layers = [
    ["HPA", "web pods · scale on CPU > 70%", BLUE_TINT, BLUE],
    ["KEDA", "rq-worker pods · scale on queue depth", AMBER_TINT, AMBER],
    ["Cluster Autoscaler", "EC2 nodes · scale when pods can't be scheduled", GREEN_TINT, GREEN],
  ];
  layers.forEach(([t, sub, fill, line], i) => {
    const y = 2.1 + i * 1.6;
    s.addShape(pres.ShapeType.roundRect, {
      x: 2.5, y, w: 8.3, h: 1.25, fill: { color: fill }, line: { color: line, width: 1 }, rectRadius: 0.08,
    });
    s.addText(t, {
      x: 2.8, y: y + 0.12, w: 7.7, h: 0.5, isTextBox: true, margin: 0,
      fontSize: 20, bold: true, color: NAVY, fontFace: SERIF, valign: "middle",
    });
    s.addText(sub, {
      x: 2.8, y: y + 0.68, w: 7.7, h: 0.45, isTextBox: true, margin: 0,
      fontSize: 13, color: MUTED, fontFace: SANS, valign: "middle",
    });
    if (i < 2) arrowDown(s, 6.65, y + 1.25, 0.35);
  });
  pageNum(s, 9);
}

// ---------- 10. caught in review ----------
{
  const s = pres.addSlide();
  head(s, "RELIABILITY", "Caught in Review");

  const cols = [
    [0.6, 5.5, "Scheduler Singleton", [
      "Rolling updates briefly run 2 copies",
      "2 schedulers = every job fires twice",
      "Fixed: strategy: Recreate — old pod dies before new one starts",
    ]],
    [6.3, 5.4, "Pod Spread", [
      "Nothing stopped all replicas landing on one node",
      "Fixed: topologySpreadConstraints across nodes + AZs",
      "One AZ failure no longer takes out every replica",
    ]],
  ];
  cols.forEach(([x, w, title, items]) => {
    card(s, x, 2.1, w, 3.4);
    s.addText(title, {
      x: x + 0.3, y: 2.4, w: w - 0.6, h: 0.5, isTextBox: true, margin: 0,
      fontSize: 18, bold: true, color: NAVY, fontFace: SERIF, valign: "middle",
    });
    bullets(s, x + 0.3, 3.1, w - 0.6, 2.2, items, 13.5);
  });

  s.addText("Found during mentor review — fixed before build, not in production.", {
    x: 0.6, y: 5.85, w: 11.1, h: 0.45, isTextBox: true, margin: 0,
    fontSize: 13.5, italic: true, color: MUTED, fontFace: SANS, align: "center", valign: "middle",
  });
  pageNum(s, 10);
}

// ---------- 11. secrets ----------
{
  const s = pres.addSlide();
  head(s, "SECURITY", "Secrets, Without Static Keys");

  const boxes = [
    ["Secrets\nManager", false],
    ["External\nSecrets Operator", true],
    ["K8s\nSecret", false],
    ["Pod\n(env var)", false],
  ];
  boxes.forEach(([label, emph], i) => {
    const x = 0.7 + i * 3.1;
    const y = emph ? 2.45 : 2.6;
    const h = emph ? 1.6 : 1.3;
    s.addShape(pres.ShapeType.roundRect, {
      x, y, w: 2.55, h,
      fill: { color: emph ? NAVY : TINT },
      line: emph ? null : { color: ICE, width: 1 },
      rectRadius: 0.08,
    });
    s.addText(label, {
      x: x + 0.08, y, w: 2.39, h, isTextBox: true, margin: 0,
      fontSize: emph ? 14 : 13, bold: true,
      color: emph ? WHITE : NAVY, fontFace: SANS, align: "center", valign: "middle",
    });
    if (i < 3) arrowRight(s, x + 2.55, emph ? 3.25 : 3.25, 0.55);
  });
  s.addText("the one moving part we run", {
    x: 3.8, y: 4.12, w: 2.55, h: 0.3, isTextBox: true, margin: 0,
    fontSize: 11, italic: true, color: MUTED, fontFace: SANS, align: "center",
  });

  s.addText("IRSA — pod identity via OIDC, no long-lived AWS keys stored anywhere", {
    x: 0.7, y: 4.75, w: 11.5, h: 0.4, isTextBox: true, margin: 0,
    fontSize: 14, italic: true, color: MUTED, fontFace: SANS, align: "center", valign: "middle",
  });
  s.addText("Secrets Manager auto-rotates the RDS password → ESO re-syncs the K8s Secret automatically", {
    x: 0.7, y: 5.2, w: 11.5, h: 0.4, isTextBox: true, margin: 0,
    fontSize: 13, color: MUTED, fontFace: SANS, align: "center", valign: "middle",
  });

  s.addShape(pres.ShapeType.roundRect, {
    x: 0.6, y: 5.95, w: 11.1, h: 0.8, fill: { color: NAVY }, rectRadius: 0.08,
  });
  s.addText("No password in git. No AWS key in a pod. Nothing to rotate by hand.", {
    x: 0.7, y: 5.95, w: 10.9, h: 0.8, isTextBox: true, margin: 0,
    fontSize: 14, bold: true, color: WHITE, fontFace: SANS, align: "center", valign: "middle",
  });
  pageNum(s, 11);
}

// ---------- 12. ci/cd ----------
{
  const s = pres.addSlide();
  head(s, "DELIVERY", "CI/CD Pipeline");

  ["Build &\nTest", "Security\nScan", "Push to\nECR", "Migrate +\nDeploy"].forEach((label, i) => {
    const x = 0.7 + i * 3.1;
    card(s, x, 2.2, 2.55, 1.2);
    s.addText(label, {
      x: x + 0.08, y: 2.2, w: 2.39, h: 1.2, isTextBox: true, margin: 0,
      fontSize: 13, bold: true, color: NAVY, fontFace: SANS, align: "center", valign: "middle",
    });
    if (i < 3) arrowRight(s, x + 2.55, 2.8, 0.55);
  });

  s.addShape(pres.ShapeType.roundRect, {
    x: 0.7, y: 3.95, w: 11.5, h: 0.9, fill: { color: NAVY }, rectRadius: 0.08,
  });
  s.addText("GitHub Actions — not Jenkins (another server to run), not Argo CD (overhead that doesn't pay off at this scale)", {
    x: 0.8, y: 3.95, w: 11.3, h: 0.9, isTextBox: true, margin: 0,
    fontSize: 13.5, bold: true, color: WHITE, fontFace: SANS, align: "center", valign: "middle",
  });

  s.addShape(pres.ShapeType.roundRect, {
    x: 0.7, y: 5.35, w: 11.5, h: 1.3, fill: { color: ORANGE_TINT }, line: { color: ORANGE, width: 1 }, rectRadius: 0.08,
  });
  s.addText("Upstream repo archived since Oct 2025 — no more security fixes coming.", {
    x: 1.0, y: 5.55, w: 10.9, h: 0.4, isTextBox: true, margin: 0,
    fontSize: 13, bold: true, color: NAVY, fontFace: SANS, align: "center", valign: "middle",
  });
  s.addText("Image scanning in this pipeline is exactly the mitigation for that gap.", {
    x: 1.0, y: 5.98, w: 10.9, h: 0.4, isTextBox: true, margin: 0,
    fontSize: 12.5, color: MUTED, fontFace: SANS, align: "center", valign: "middle",
  });
  pageNum(s, 12);
}

// ---------- 13. cost ----------
{
  const s = pres.addSlide();
  head(s, "BUDGET", "Cost Breakdown");

  const rows = [
    ["NAT Gateway", "$32/mo"],
    ["EKS control plane", "$73/mo"],
    ["Worker nodes (2–4x t3.medium)", "~$60/mo"],
    ["RDS + ElastiCache (Multi-AZ)", "~$75/mo"],
    ["ALB + CloudFront/S3", "~$20/mo"],
  ];
  rows.forEach(([label, amount], i) => {
    const y = 2.1 + i * 0.78;
    s.addShape(pres.ShapeType.rect, {
      x: 0.6, y, w: 7.6, h: 0.78, fill: { color: i % 2 === 0 ? TINT : WHITE },
    });
    s.addText(label, {
      x: 0.85, y, w: 5.5, h: 0.78, isTextBox: true, margin: 0,
      fontSize: 14, color: NAVY_TEXT, fontFace: SANS, valign: "middle",
    });
    s.addText(amount, {
      x: 6.3, y, w: 1.75, h: 0.78, isTextBox: true, margin: 0,
      fontSize: 14, bold: true, color: NAVY, fontFace: SANS, align: "right", valign: "middle",
    });
  });

  s.addShape(pres.ShapeType.roundRect, {
    x: 8.6, y: 2.1, w: 4.1, h: 3.9, fill: { color: NAVY }, rectRadius: 0.08,
  });
  s.addText("~$260", {
    x: 8.6, y: 2.7, w: 4.1, h: 0.95, isTextBox: true, margin: 0,
    fontSize: 46, bold: true, color: AMBER, fontFace: SERIF, align: "center", valign: "middle",
  });
  s.addText("estimated / month", {
    x: 8.6, y: 3.7, w: 4.1, h: 0.4, isTextBox: true, margin: 0,
    fontSize: 12, color: ICE, fontFace: SANS, align: "center",
  });
  s.addText("Budget: $300", {
    x: 8.6, y: 4.6, w: 4.1, h: 0.45, isTextBox: true, margin: 0,
    fontSize: 15, color: WHITE, fontFace: SANS, align: "center", valign: "middle",
  });
  s.addText("Fits — with room accounted for, not maxed out", {
    x: 8.9, y: 5.1, w: 3.5, h: 0.6, isTextBox: true, margin: 0,
    fontSize: 11, color: ICE, fontFace: SANS, align: "center", valign: "top",
  });
  s.addText("Multi-AZ on RDS and ElastiCache roughly doubles the data-layer cost — that premium is the survival requirement, priced.", {
    x: 0.6, y: 6.25, w: 11.1, h: 0.45, isTextBox: true, margin: 0,
    fontSize: 13, italic: true, color: MUTED, fontFace: SANS, align: "center", valign: "middle",
  });
  pageNum(s, 13);
}

// ---------- 14. trade-offs (reworked) ----------
{
  const s = pres.addSlide();
  head(s, "TRADE-OFFS", "What We Traded, and Why");

  s.addText("Three things a reviewer will look for and not find. Each one is a decision with a number or a rule behind it.", {
    x: 0.6, y: 1.72, w: 11.1, h: 0.4, isTextBox: true, margin: 0,
    fontSize: 13.5, italic: true, color: MUTED, fontFace: SANS, valign: "middle",
  });

  const items = [
    [
      "One NAT Gateway, not one per AZ",
      "A second NAT is ~$32/mo — 11% of the whole budget — to protect egress on a cluster carrying no production traffic.",
      "One per AZ. The cost stops mattering the moment downtime does.",
    ],
    [
      "Push-deploy, not GitOps",
      "Argo CD's value is drift detection and multi-team approval. Two people on one cluster have neither problem yet.",
      "Argo CD, once more people can deploy than can say what's deployed.",
    ],
    [
      "Terraform apply stays manual — on purpose",
      "App deploys are fully automated end-to-end. Infrastructure is not — a human approves any change to the VPC, database, or IAM.",
      "Same rule, enforced by a plan-and-approve gate in the pipeline instead of by a laptop.",
    ],
  ];

  items.forEach(([title, today, scale], i) => {
    const y = 2.35 + i * 1.53;
    card(s, 0.6, y, 11.1, 1.38, WHITE, ICE);
    s.addText(title, {
      x: 0.9, y: y + 0.1, w: 10.5, h: 0.38, isTextBox: true, margin: 0,
      fontSize: 15.5, bold: true, color: NAVY, fontFace: SERIF, valign: "middle",
    });
    s.addText(
      [
        { text: "Here: ", options: { bold: true, color: NAVY } },
        { text: today, options: { color: NAVY_TEXT } },
      ],
      {
        x: 0.9, y: y + 0.5, w: 10.5, h: 0.42, isTextBox: true, margin: 0,
        fontSize: 12, fontFace: SANS, valign: "middle",
      }
    );
    s.addText(
      [
        { text: "At real scale: ", options: { bold: true, color: GREEN_DK } },
        { text: scale, options: { color: MUTED } },
      ],
      {
        x: 0.9, y: y + 0.92, w: 10.5, h: 0.36, isTextBox: true, margin: 0,
        fontSize: 12, fontFace: SANS, valign: "middle",
      }
    );
  });
  pageNum(s, 14);
}

// ---------- 15. takeaways ----------
{
  const s = pres.addSlide();
  s.background = { color: NAVY };
  s.addText("KEY TAKEAWAYS", {
    x: 0.9, y: 0.9, w: 8.0, h: 0.4, isTextBox: true, margin: 0,
    fontSize: 13, bold: true, color: AMBER, fontFace: SANS, charSpacing: 2,
  });

  const items = [
    "Real production patterns — Multi-AZ, autoscaling, secrets rotation — on a $300 budget",
    "Survival built in from the network layer up, not bolted on afterward",
    "A conscious decision at every layer — including when NOT to add complexity (Karpenter, Argo CD, GitOps)",
  ];
  items.forEach((t, i) => {
    const y = 2.05 + i * 1.4;
    s.addShape(pres.ShapeType.ellipse, { x: 0.9, y, w: 0.5, h: 0.5, fill: { color: AMBER } });
    s.addText(String(i + 1), {
      x: 0.9, y, w: 0.5, h: 0.5, isTextBox: true, margin: 0,
      fontSize: 18, bold: true, color: NAVY, fontFace: SERIF, align: "center", valign: "middle",
    });
    s.addText(t, {
      x: 1.7, y: y - 0.1, w: 10.5, h: 0.7, isTextBox: true, margin: 0,
      fontSize: 17, color: WHITE, fontFace: SANS, valign: "middle",
    });
  });

  s.addText("Thank you", {
    x: 0.6, y: 6.35, w: 12.13, h: 0.6, isTextBox: true, margin: 0,
    fontSize: 20, bold: true, color: ICE, fontFace: SERIF, align: "center", valign: "middle",
  });
}

pres.writeFile({ fileName: "Status-Page-Presentation.pptx" }).then((f) => console.log("wrote", f));
