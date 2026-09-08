resource "aws_iam_role" "github_actions_deploy" {
  name = "GitHubActionsDeployRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Federated = "arn:aws:iam::992382545251:oidc-provider/token.actions.githubusercontent.com"
      }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
        }
        StringLike = {
        "token.actions.githubusercontent.com:sub" = "repo:rotemamt/statuspage-terraform:*" }
      }
    }]
  })
}

resource "aws_iam_role_policy" "github_actions_deploy" {
  name = "GitHubActionsDeployPolicy"
  role = aws_iam_role.github_actions_deploy.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["ecr:GetAuthorizationToken"]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = ["ecr:BatchCheckLayerAvailability", "ecr:PutImage", "ecr:InitiateLayerUpload", "ecr:UploadLayerPart", "ecr:CompleteLayerUpload"]
        Resource = "arn:aws:ecr:us-east-1:992382545251:repository/ro-ro-statuspage-dev-repo"
      },
      {
        Effect   = "Allow"
        Action   = ["eks:DescribeCluster"]
        Resource = "arn:aws:eks:us-east-1:992382545251:cluster/ro-ro-statuspage-cluster"
      }
    ]
  })
}

resource "aws_iam_role" "github_actions_deploy_v2" {
  name = "GitHubActionsDeployRoleV2"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Federated = "arn:aws:iam::992382545251:oidc-provider/token.actions.githubusercontent.com"
      }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
        }
        StringLike = {
          "token.actions.githubusercontent.com:sub" = [
            "repo:rotemamt/statuspage-terraform:*",
            "repo:rotemamt@229573277/statuspage-terraform@1354911446:*"
          ]
        }
      }
    }]
  })
}

resource "aws_iam_role_policy" "github_actions_deploy_v2" {
  name = "GitHubActionsDeployPolicy"
  role = aws_iam_role.github_actions_deploy_v2.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["ecr:GetAuthorizationToken"]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = ["ecr:BatchCheckLayerAvailability", "ecr:PutImage", "ecr:InitiateLayerUpload", "ecr:UploadLayerPart", "ecr:CompleteLayerUpload"]
        Resource = "arn:aws:ecr:us-east-1:992382545251:repository/ro-ro-statuspage-dev-repo"
      },
      {
        Effect   = "Allow"
        Action   = ["eks:DescribeCluster"]
        Resource = "arn:aws:eks:us-east-1:992382545251:cluster/ro-ro-statuspage-cluster"
      }
    ]
  })
}
# V3 — the repository was renamed from "statuspage-terraform" to "statuspage-on-aws-eks".
# Both OIDC subject formats embed the repository NAME (the immutable format adds owner and
# repo IDs, but keeps the name), so a rename invalidates the V2 trust policy. This account
# denies iam:UpdateAssumeRolePolicy, so the trust policy cannot be edited in place — and it
# denies iam:DeleteRole, so V1 and V2 are left in place rather than removed. Adding a new
# role is the only path forward; do not change V1/V2 above, Terraform would try to update
# or destroy them and fail.
resource "aws_iam_role" "github_actions_deploy_v3" {
  name = "GitHubActionsDeployRoleV3"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Federated = "arn:aws:iam::992382545251:oidc-provider/token.actions.githubusercontent.com"
      }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
        }
        StringLike = {
          "token.actions.githubusercontent.com:sub" = [
            "repo:rotemamt/statuspage-on-aws-eks:*",
            "repo:rotemamt@229573277/statuspage-on-aws-eks@1354911446:*"
          ]
        }
      }
    }]
  })
}

resource "aws_iam_role_policy" "github_actions_deploy_v3" {
  name = "GitHubActionsDeployPolicy"
  role = aws_iam_role.github_actions_deploy_v3.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["ecr:GetAuthorizationToken"]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = ["ecr:BatchCheckLayerAvailability", "ecr:PutImage", "ecr:InitiateLayerUpload", "ecr:UploadLayerPart", "ecr:CompleteLayerUpload"]
        Resource = "arn:aws:ecr:us-east-1:992382545251:repository/ro-ro-statuspage-dev-repo"
      },
      {
        Effect   = "Allow"
        Action   = ["eks:DescribeCluster"]
        Resource = "arn:aws:eks:us-east-1:992382545251:cluster/ro-ro-statuspage-cluster"
      }
    ]
  })
}
