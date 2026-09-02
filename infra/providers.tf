provider "aws" {
  region = "us-east-1"

  default_tags {
    tags = {
      Owner = "Rotem and Roei"
    }
  }
}
