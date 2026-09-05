resource "aws_ecr_repository" "this" {

  name                 = "ro-ro-statuspage-dev-repo"
  image_tag_mutability = "IMMUTABLE"
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Environment = "dev"
    Terraform   = "true"
  }
}