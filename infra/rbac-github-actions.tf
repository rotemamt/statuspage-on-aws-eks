# AWS's built-in EKS access policies (View, Edit) are built from the standard Kubernetes
# "view"/"edit" ClusterRoles, which only include resources explicitly aggregated into them
# — ESO's CRDs (external-secrets.io) aren't. `helm upgrade` needs read/write access to two
# specific ESO resource kinds to manage the app's secrets pipeline. Rather than widen the
# CI role's access with a broader built-in policy (e.g. cluster-wide View), we grant exactly
# these two resource kinds explicitly — keeping the CI role's blast radius at "statuspage"
# namespace only, plus read-only on the one cluster-scoped resource it genuinely needs.

provider "kubernetes" {
  host                   = module.eks.cluster_endpoint
  cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)
  token                  = data.aws_eks_cluster_auth.this.token
}

resource "kubernetes_cluster_role" "eso_clustersecretstore_viewer" {
  metadata {
    name = "eso-clustersecretstore-viewer"
  }
  rule {
    api_groups = ["external-secrets.io"]
    resources  = ["clustersecretstores"]
    verbs      = ["get", "list", "watch"]
  }
}

resource "kubernetes_cluster_role_binding" "github_actions_clustersecretstore_viewer" {
  metadata {
    name = "github-actions-clustersecretstore-viewer"
  }
  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "ClusterRole"
    name      = kubernetes_cluster_role.eso_clustersecretstore_viewer.metadata[0].name
  }
  subject {
    kind      = "User"
    name      = "arn:aws:sts::992382545251:assumed-role/GitHubActionsDeployRoleV2/GitHubActions"
    api_group = "rbac.authorization.k8s.io"
  }
}

# Same gap, different CRDs: ExternalSecret (external-secrets.io) and ScaledObject (keda.sh)
# are both namespaced (unlike ClusterSecretStore), so this is a Role+RoleBinding scoped to
# the statuspage namespace, not cluster-wide. Full CRUD (not just view) — helm upgrade
# actually creates/updates these resources, matching what AmazonEKSEditPolicy would cover
# if it recognized the CRDs. Every custom (non-built-in) resource kind in helm/statuspage's
# templates is covered here — checked every template's `kind:` line, this is the full list.
resource "kubernetes_role" "custom_resource_editor" {
  metadata {
    name      = "ci-custom-resource-editor"
    namespace = "statuspage"
  }
  rule {
    api_groups = ["external-secrets.io"]
    resources  = ["externalsecrets"]
    verbs      = ["get", "list", "watch", "create", "update", "patch", "delete"]
  }
  rule {
    api_groups = ["keda.sh"]
    resources  = ["scaledobjects"]
    verbs      = ["get", "list", "watch", "create", "update", "patch", "delete"]
  }
}

resource "kubernetes_role_binding" "github_actions_custom_resource_editor" {
  metadata {
    name      = "github-actions-custom-resource-editor"
    namespace = "statuspage"
  }
  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "Role"
    name      = kubernetes_role.custom_resource_editor.metadata[0].name
  }
  subject {
    kind      = "User"
    name      = "arn:aws:sts::992382545251:assumed-role/GitHubActionsDeployRoleV2/GitHubActions"
    api_group = "rbac.authorization.k8s.io"
  }
}
