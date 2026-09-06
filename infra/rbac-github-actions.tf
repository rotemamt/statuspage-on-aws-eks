# AmazonEKSViewPolicy (attached to GitHub Actions in eks.tf) doesn't cover custom CRDs
# like external-secrets.io — it's built from the standard Kubernetes "view" ClusterRole,
# which only includes resources explicitly aggregated into it. ESO's CRDs aren't.
# `helm upgrade` needs read access to ClusterSecretStore (cluster-scoped) to diff it,
# so we grant that one permission explicitly instead of guessing at broader built-in policies.

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
