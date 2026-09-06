resource "random_password" "secret_key" {
  length           = 50
  special          = true
  override_special = "!@#%^&*(-_=+)"
}

resource "random_password" "superuser" {
  length  = 20
  special = false
}

resource "aws_secretsmanager_secret" "app" {
  name                    = "statuspage/app"
  recovery_window_in_days = 0

  tags = {
    Environment = "dev"
    Terraform   = "true"
  }
}

resource "aws_secretsmanager_secret_version" "app" {
  secret_id = aws_secretsmanager_secret.app.id
  secret_string = jsonencode({
    SECRET_KEY         = random_password.secret_key.result
    SUPERUSER_PASSWORD = random_password.superuser.result
  })
}