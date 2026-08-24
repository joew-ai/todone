locals {
  app_name    = "todone"
  environment = "prod"
  lambda_table_actions = [
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
  family_account_cognito_actions = [
    "cognito-idp:AdminCreateUser",
    "cognito-idp:AdminDeleteUser",
    "cognito-idp:AdminSetUserPassword",
    "cognito-idp:AdminUpdateUserAttributes",
    "cognito-idp:AdminUserGlobalSignOut",
  ]
}

# Every family-paas module below is pinned to this reviewed commit
# (?ref=eeac7ad). Do not float to main; bump the ref deliberately in every
# module block below after re-reviewing the new commit.

data "terraform_remote_state" "shared" {
  backend = "s3"
  config = {
    bucket = "terraform-state-743837809639"
    key    = "shared/terraform.tfstate"
    region = "us-east-1"
  }
}

resource "aws_cognito_user_pool" "todone" {
  name                     = "${local.app_name}-users-${local.environment}"
  auto_verified_attributes = ["email"]
  deletion_protection      = "ACTIVE"

  username_configuration {
    case_sensitive = false
  }

  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_uppercase = true
    require_numbers   = true
    require_symbols   = true
  }

  schema {
    name                = "email"
    attribute_data_type = "String"
    required            = false
    mutable             = true
  }

  admin_create_user_config {
    allow_admin_create_user_only = false
  }

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  lambda_config {
    pre_sign_up = module.pre_signup_lambda.function_arn
  }

  tags = {
    Name        = "Todone users"
    Environment = local.environment
    ManagedBy   = "terraform"
  }
}

module "auth" {
  source = "git::https://github.com/josephwegner/family-paas.git//terraform/modules/cognito-app-client?ref=eeac7ad"

  app_name     = local.app_name
  environment  = local.environment
  user_pool_id = aws_cognito_user_pool.todone.id
}

module "table" {
  source = "git::https://github.com/josephwegner/family-paas.git//terraform/modules/dynamodb-table?ref=eeac7ad"

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

# Privileged family-account handlers use a separate role from ordinary session,
# Membership, profile, and directory handlers. Future provisioning Lambdas must
# opt into this role only after their application authorization checks are wired.
resource "aws_iam_role" "family_account_admin_role" {
  name = "${local.app_name}-family-account-admin-${local.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "family_account_admin_basic" {
  role       = aws_iam_role.family_account_admin_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "family_account_cognito_admin" {
  name = "${local.app_name}-cognito-family-account-admin-${local.environment}"
  role = aws_iam_role.family_account_admin_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = local.family_account_cognito_actions
      Resource = aws_cognito_user_pool.todone.arn
    }]
  })
}

# Family-account mutations also need the same dedicated application-table boundary as
# ordinary handlers. Keep this policy separate from Cognito administration so review
# can prove that neither permission set reaches an unrelated table or user pool.
resource "aws_iam_role_policy" "family_account_table_access" {
  name = "${local.app_name}-family-account-table-access-${local.environment}"
  role = aws_iam_role.family_account_admin_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = local.lambda_table_actions
      Resource = [
        module.table.table_arn,
        "${module.table.table_arn}/index/*",
      ]
    }]
  })
}

resource "aws_iam_role" "pre_signup_role" {
  name = "${local.app_name}-pre-signup-${local.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "pre_signup_basic" {
  role       = aws_iam_role.pre_signup_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

module "pre_signup_lambda" {
  source = "git::https://github.com/josephwegner/family-paas.git//terraform/modules/lambda-function?ref=eeac7ad"

  function_name    = "pre-signup"
  app_name         = local.app_name
  environment      = local.environment
  lambda_role_arn  = aws_iam_role.pre_signup_role.arn
  s3_bucket        = data.terraform_remote_state.shared.outputs.lambda_deployments_bucket
  s3_key           = var.lambda_artifacts["pre-signup"].s3_key
  source_code_hash = var.lambda_artifacts["pre-signup"].source_code_hash

  environment_variables = {
    REGISTRATION_GATE_PASSWORD_HASH = var.registration_gate_password_hash
  }
}

resource "aws_lambda_permission" "cognito_pre_signup" {
  statement_id  = "AllowCognitoPreSignup"
  action        = "lambda:InvokeFunction"
  function_name = module.pre_signup_lambda.function_name
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = aws_cognito_user_pool.todone.arn
}

resource "aws_iam_role_policy" "lambda_table_access" {
  name = "${local.app_name}-table-access-${local.environment}"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = local.lambda_table_actions
      Resource = [
        module.table.table_arn,
        "${module.table.table_arn}/index/*",
      ]
    }]
  })
}

module "lambdas" {
  source = "git::https://github.com/josephwegner/family-paas.git//terraform/modules/lambda-function?ref=eeac7ad"

  for_each = {
    session            = var.lambda_artifacts["session"]
    current-membership = var.lambda_artifacts["current-membership"]
    create-household   = var.lambda_artifacts["create-household"]
    profile            = var.lambda_artifacts["profile"]
    family-directory   = var.lambda_artifacts["family-directory"]
  }

  function_name    = each.key
  app_name         = local.app_name
  environment      = local.environment
  lambda_role_arn  = aws_iam_role.lambda_role.arn
  s3_bucket        = data.terraform_remote_state.shared.outputs.lambda_deployments_bucket
  s3_key           = each.value.s3_key
  source_code_hash = each.value.source_code_hash

  environment_variables = {
    TODONE_TABLE_NAME    = module.table.table_name
    COGNITO_USER_POOL_ID = aws_cognito_user_pool.todone.id
    COGNITO_CLIENT_ID    = module.auth.client_id
  }
}

module "api" {
  source = "git::https://github.com/josephwegner/family-paas.git//terraform/modules/api-gateway?ref=eeac7ad"

  app_name    = local.app_name
  environment = local.environment

  # Must be explicit. Leaving this unset falls back to the module default of
  # ["*"], which fails the Todone CORS/authorization boundary.
  cors_allowed_origins = var.allowed_origins

  auth = {
    issuer   = "https://cognito-idp.us-east-1.amazonaws.com/${aws_cognito_user_pool.todone.id}"
    audience = [module.auth.client_id]
  }

  routes = [
    {
      route_key     = "GET /api/v1/session"
      function_arn  = module.lambdas["session"].invoke_arn
      function_name = module.lambdas["session"].function_name
      auth_required = true
    },
    {
      route_key     = "GET /api/v1/memberships/current"
      function_arn  = module.lambdas["current-membership"].invoke_arn
      function_name = module.lambdas["current-membership"].function_name
      auth_required = true
    },
    {
      route_key     = "POST /api/v1/households"
      function_arn  = module.lambdas["create-household"].invoke_arn
      function_name = module.lambdas["create-household"].function_name
      auth_required = true
    },
    {
      route_key     = "GET /api/v1/profiles/me"
      function_arn  = module.lambdas["profile"].invoke_arn
      function_name = module.lambdas["profile"].function_name
      auth_required = true
    },
    {
      route_key     = "PUT /api/v1/profiles/me"
      function_arn  = module.lambdas["profile"].invoke_arn
      function_name = module.lambdas["profile"].function_name
      auth_required = true
    },
    {
      route_key     = "GET /api/v1/family-members"
      function_arn  = module.lambdas["family-directory"].invoke_arn
      function_name = module.lambdas["family-directory"].function_name
      auth_required = true
    },
  ]
}

module "frontend" {
  source = "git::https://github.com/josephwegner/family-paas.git//terraform/modules/frontend-hosting?ref=eeac7ad"

  app_name             = local.app_name
  environment          = local.environment
  api_gateway_endpoint = module.api.api_endpoint
  domain_name          = var.production_domain
  acm_certificate_arn  = var.acm_certificate_arn
}
