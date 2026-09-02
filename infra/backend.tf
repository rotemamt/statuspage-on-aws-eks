terraform {
  backend "s3" {
    bucket       = "ro-ro-statuspage-tfstate"
    key          = "statuspage/terraform.tfstate"
    region       = "us-east-1"
    encrypt      = true
    use_lockfile = true
  }
}