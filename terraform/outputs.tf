output "cognito_user_pool_id" {
  value = data.terraform_remote_state.shared.outputs.cognito_user_pool_id
}

output "cognito_user_pool_arn" {
  value = data.terraform_remote_state.shared.outputs.cognito_user_pool_arn
}

output "jwt_issuer" {
  value = data.terraform_remote_state.shared.outputs.cognito_user_pool_issuer
}

output "jwt_audience" {
  value = module.auth.client_id
}

output "pwa_client_id" {
  value = module.auth.client_id
}

output "pwa_session_config" {
  value = module.auth.session_config
}

output "api_base_url" {
  value = module.api.api_endpoint
}

output "api_jwt_authorizer_id" {
  value = module.api.jwt_authorizer_id
}

output "static_site_url" {
  value = module.frontend.cloudfront_url
}

output "static_distribution_id" {
  value = module.frontend.cloudfront_distribution_id
}

output "static_bucket_name" {
  value = module.frontend.s3_bucket_name
}

output "dynamodb_table_name" {
  value = module.table.table_name
}

output "dynamodb_table_arn" {
  value = module.table.table_arn
}

output "dynamodb_pitr_enabled" {
  value = module.table.point_in_time_recovery_enabled
}

output "dynamodb_index_names" {
  value = module.table.global_secondary_index_names
}

output "lambda_function_name" {
  value = module.lambdas["session"].function_name
}

output "lambda_function_arn" {
  value = module.lambdas["session"].function_arn
}

output "lambda_qualified_arn" {
  value = module.lambdas["session"].qualified_arn
}

output "lambda_version" {
  value = module.lambdas["session"].version
}

output "runtime_role_arn" {
  value = aws_iam_role.lambda_role.arn
}

output "log_group_names" {
  value = [
    module.lambdas["session"].log_group_name,
    module.api.access_log_group_name,
  ]
}
