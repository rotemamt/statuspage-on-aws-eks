resource "aws_security_group" "redis" {
  name        = "ro-ro-statuspage-redis-sg"
  description = "Allow Redis from EKS nodes only"
  vpc_id      = module.vpc.vpc_id

  tags = {
    Environment = "dev"
    Terraform   = "true"
  }
}

resource "aws_security_group_rule" "redis_from_nodes" {
  type                     = "ingress"
  from_port                = 6379
  to_port                  = 6379
  protocol                 = "tcp"
  security_group_id        = aws_security_group.redis.id
  source_security_group_id = module.eks.node_security_group_id
}

resource "aws_elasticache_subnet_group" "redis" {
  name       = "ro-ro-statuspage-redis-subnets"
  subnet_ids = module.vpc.private_subnets
}

resource "aws_elasticache_replication_group" "redis" {
  replication_group_id = "ro-ro-statuspage-redis"
  description          = "Redis for tasks (db0) and cache (db1)"

  engine         = "redis"
  engine_version = "7.1"
  node_type      = "cache.t3.micro"
  port           = 6379

  num_cache_clusters         = 2
  automatic_failover_enabled = true
  multi_az_enabled           = true

  subnet_group_name  = aws_elasticache_subnet_group.redis.name
  security_group_ids = [aws_security_group.redis.id]

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true

  tags = {
    Environment = "dev"
    Terraform   = "true"
  }
}