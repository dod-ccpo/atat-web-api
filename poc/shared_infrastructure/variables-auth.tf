##################
# Authentication #
##################

# azure authentication variables
variable "azure-subscription-id" {
  type        = string
  description = "Azure Subscription ID"
  sensitive   = true
}

variable "azure-client-id" {
  type        = string
  description = "Azure Client ID"
  sensitive   = true
}

variable "azure-client-secret" {
  type        = string
  description = "Azure Client Secret"
  sensitive   = true
}

variable "azure-tenant-id" {
  type        = string
  description = "Azure Tenant ID"
  sensitive   = true
}
