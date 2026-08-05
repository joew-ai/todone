locals {
  app_name    = "todone"
  environment = "prod"
}

# Every family-paas module below is pinned to this reviewed commit
# (?ref=5263706). Do not float to main; bump the ref deliberately in every
# module block below after re-reviewing the new commit.

data "terraform_remote_state" "shared" {
  backend = "s3"
  config = {
    bucket = "terraform-state-743837809639"
    key    = "shared/terraform.tfstate"
    region = "us-east-1"
  }
}

module "auth" {
  source = "git::https://github.com/josephwegner/family-paas.git//terraform/modules/cognito-app-client?ref=5263706"

  app_name     = local.app_name
  environment  = local.environment
  user_pool_id = data.terraform_remote_state.shared.outputs.cognito_user_pool_id
}

module "table" {
  source = "git::https://github.com/josephwegner/family-paas.git//terraform/modules/dynamodb-table?ref=5263706"

  table_name  = "${local.app_name}-data-${local.environment}"
  environment = local.environment
  hash_key    = "pk"
  range_key   = "sk"
  attributes = [
    { name = "pk", type = "S" },
    { name = "sk", type = "S" },
  ]
  # Add global_secondary_indexes only when a delivered capability requires
  # one. See docs/architecture/data-model-and-access-patterns.md for the
  # exact projection contract before adding an index.
}

# Least-privilege runtime role: this repo's Lambda functions may read/write
# only the dedicated Todone table and its indexes, and emit logs. It has no
# access to Terraform state, S3 deployment buckets, CloudFront, IAM
# administration, or any other pool/table.
resource "aws_iam_role" "lambda_role" {
  name = "${local.app_name}-lambda-${local.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "lambda_table_access" {
  name = "${local.app_name}-table-access-${local.environment}"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:BatchGetItem",
        "dynamodb:BatchWriteItem",
        "dynamodb:ConditionCheckItem",
        "dynamodb:TransactGetItems",
        "dynamodb:TransactWriteItems",
      ]
      Resource = [
        module.table.table_arn,
        "${module.table.table_arn}/index/*",
      ]
    }]
  })
}

module "lambdas" {
  source = "git::https://github.com/josephwegner/family-paas.git//terraform/modules/lambda-function?ref=5263706"

  for_each = {
    session = { s3_key = var.session_lambda_s3_key }
  }

  function_name   = each.key
  app_name        = local.app_name
  environment     = local.environment
  lambda_role_arn = aws_iam_role.lambda_role.arn
  s3_bucket       = data.terraform_remote_state.shared.outputs.lambda_deployments_bucket
  s3_key          = each.value.s3_key

  environment_variables = {
    TODONE_TABLE_NAME = module.table.table_name
  }
}

module "api" {
  source = "git::https://github.com/josephwegner/family-paas.git//terraform/modules/api-gateway?ref=5263706"

  app_name    = local.app_name
  environment = local.environment

  # Must be explicit. Leaving this unset falls back to the module default of
  # ["*"], which fails the Todone CORS/authorization boundary.
  cors_allowed_origins = var.allowed_origins

  auth = {
    issuer   = data.terraform_remote_state.shared.outputs.cognito_user_pool_issuer
    audience = [module.auth.client_id]
  }

  routes = [
    {
      route_key     = "GET /api/v1/session"
      function_arn  = module.lambdas["session"].invoke_arn
      function_name = module.lambdas["session"].function_name
      auth_required = true
    },
  ]
}

module "frontend" {
  source = "git::https://github.com/josephwegner/family-paas.git//terraform/modules/frontend-hosting?ref=5263706"

  app_name             = local.app_name
  environment          = local.environment
  api_gateway_endpoint = module.api.api_endpoint
  domain_name          = var.production_domain
  acm_certificate_arn  = var.acm_certificate_arn
}
