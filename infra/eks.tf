module "eks" {
  source = "terraform-aws-modules/eks/aws"
  version = "~> 21.0"

  name = "ro-ro-statuspage-cluster"
  kubernetes_version = "1.36"

  addons = {
    coredns = {}
    eks-pod-identity-agent = {
      before_compute = true
    }
    kube-proxy = {}
    vpc-cni = {
      before_compute = true
    }
  }

  enabled_log_types = ["api", "audit"]

  # KMS permission (kms:TagResource) not granted on this account yet.
  # Secrets still encrypted at rest via etcd's EBS volume, just without the extra KMS envelope layer.
  create_kms_key = false
  encryption_config = null

  # Optional
  endpoint_public_access = true

  # Optional: Adds the current caller identity as an administrator via cluster access entry
  enable_cluster_creator_admin_permissions = true

  # Second admin: Roei's IAM user doesn't run apply, so he needs an explicit access entry
  access_entries = {
    roey = {
      principal_arn = "arn:aws:iam::992382545251:user/roey"
      policy_associations = {
        admin = {
          policy_arn = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy"
          access_scope = {
            type = "cluster"
          }
        }
      }
    }
  }

  vpc_id = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets
  
  # EKS Managed Node Group(s)
  eks_managed_node_groups = {
    app = {
      # Starting on 1.30, AL2023 is the default AMI type for EKS managed node groups
      ami_type = "AL2023_x86_64_STANDARD"
      instance_types = ["t3.medium"]

      min_size = 2
      max_size = 4
      desired_size = 2
    }
  }

  tags = {
    Environment = "dev"
    Terraform = "true"
    Owner = "Rotem and Roei"
  }
}
