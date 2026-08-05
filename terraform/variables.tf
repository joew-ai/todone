variable "allowed_origins" {
  description = <<-EOT
    Explicit browser origins permitted by API Gateway CORS. Must NOT be left
    unset/default; the api-gateway module defaults to ["*"], which fails the
    Todone authorization boundary (see docs/architecture/system-context.md).
    Include local development origins and the production Todone origin only.
  EOT
  type        = list(string)

  validation {
    condition     = length(var.allowed_origins) > 0 && !contains(var.allowed_origins, "*")
    error_message = "allowed_origins must be a non-empty list of explicit origins, not \"*\"."
  }
}

variable "session_lambda_s3_key" {
  description = "S3 key of the built current-session Lambda artifact, supplied by the release process. Never a secret value."
  type        = string
}

variable "production_domain" {
  description = "Optional custom domain for the production PWA. Leave empty to use the default CloudFront domain."
  type        = string
  default     = ""
}

variable "acm_certificate_arn" {
  description = "Optional ACM certificate ARN for production_domain. Must be issued in us-east-1 for CloudFront."
  type        = string
  default     = ""
}
