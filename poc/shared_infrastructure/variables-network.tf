#####################
# Network variables #
#####################

variable "environment" {
  type        = string
  description = "This variable defines the environment to be built"
}

variable "location" {
  type        = string
  description = "Define the primary Azure region"
}

variable "failover_location" {
  type        = string
  description = "Define the failover Azure region; Should be geographically separate from the primary location"
}

##################################
# Azure Resource Group variables #
##################################

variable "resource_group_name" {
  type        = string
  description = "Name of the resource group"
}

###################################
# Azure Storage Account variables #
###################################

variable "storage_account_name" {
  type        = string
  description = "Name of the storage account"
}

#####################################
# Azure Cosmos DB Account variables #
#####################################

variable "cosmosdb_account_name" {
  type        = string
  description = "Name of the Cosmos DB account"
}

variable "cosmosdb_database_name" {
  type        = string
  description = "Name of the Cosmos DB database"
}
