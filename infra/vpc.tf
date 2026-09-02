module "vpc" {
  source = "terraform-aws-modules/vpc/aws"
  version = "~> 6.0"

  name = "ro-ro-statuspage-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["us-east-1a", "us-east-1b"]
  public_subnets = ["10.0.0.0/24", "10.0.1.0/24"]
  private_subnets  = ["10.0.10.0/24", "10.0.11.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = true

  tags = {
    Terraform = "true"
    Environment = "dev"
  }
}