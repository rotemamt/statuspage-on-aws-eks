resource "aws_security_group" "rds" {
  name        = "ro-ro-statuspage-rds-sg"
  description = "Allow Postgres from EKS nodes only"
  vpc_id      = module.vpc.vpc_id

  tags = {
    Environment = "dev"
    Terraform   = "true"
  }
}

resource "aws_security_group_rule" "rds_from_nodes" {
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  security_group_id        = aws_security_group.rds.id
  source_security_group_id = module.eks.node_security_group_id
}

resource "aws_db_subnet_group" "rds" {
  name       = "ro-ro-statuspage-db-subnets"
  subnet_ids = module.vpc.private_subnets

  tags = {
    Environment = "dev"
    Terraform   = "true"
  }
}

resource "aws_db_instance" "rds" {
  identifier     = "ro-ro-statuspage-db"
  engine         = "postgres"
  engine_version = "16"
  instance_class = "db.t3.micro"

  allocated_storage     = 20
  max_allocated_storage = 100
  storage_encrypted     = true

  db_name                     = "statuspage"
  username                    = "statuspage"
  manage_master_user_password = true

  multi_az               = true
  db_subnet_group_name   = aws_db_subnet_group.rds.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false

  backup_retention_period = 7
  skip_final_snapshot     = true
  deletion_protection     = false

  tags = {
    Environment = "dev"
    Terraform   = "true"
  }
}