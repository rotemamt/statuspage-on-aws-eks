module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 21.0"

  name               = "ro-ro-statuspage-cluster"
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

  # cluster_encryption IAM policy blocked (iam:GetPolicyVersion not granted, keeps
  # orphaning new policies on retry) — skip ONLY that policy, don't touch encryption_config.
  # Encryption is already associated on the live cluster and can't be removed without a
  # full cluster replacement (AWS/Terraform limitation) — do not set encryption_config=null.
  attach_encryption_policy = false

  # Same identity-churn bug as the access entries above, but for the KMS key policy:
  # "if no value is provided, the current caller identity is used" (module source) —
  # so the key administrator kept flipping between rotem/roey depending on who applied.
  # Pin both explicitly so it's stable regardless of who runs apply.
  kms_key_administrators = [
    "arn:aws:iam::992382545251:user/rotem",
    "arn:aws:iam::992382545251:user/roey",
  ]

  # Optional
  endpoint_public_access = true

  # Disabled: this ties cluster-admin to whoever happens to run `apply`, which caused
  # the access entry to drift/change every time a different person applied. Both people
  # get a fixed, explicit access_entries below instead — stable no matter who runs apply.
  enable_cluster_creator_admin_permissions = false

  access_entries = {
    rotem = {
      principal_arn = "arn:aws:iam::992382545251:user/rotem"
      policy_associations = {
        admin = {
          policy_arn = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy"
          access_scope = {
            type = "cluster"
          }
        }
      }
    }
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
    github_actions = {
      principal_arn = aws_iam_role.github_actions_deploy_v2.arn
      policy_associations = {
        edit = {
          policy_arn = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSEditPolicy"
          access_scope = {
            type       = "namespace"
            namespaces = ["statuspage"]
          }
        }
      }
    }
  }

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  # EKS Managed Node Group(s)
  eks_managed_node_groups = {
    app = {
      # Starting on 1.30, AL2023 is the default AMI type for EKS managed node groups
      ami_type       = "AL2023_x86_64_STANDARD"
      instance_types = ["t3.medium"]

      min_size     = 2
      max_size     = 4
      desired_size = 2
    }
  }

  tags = {
    Environment = "dev"
    Terraform   = "true"
    Owner       = "Rotem and Roei"
  }
}
