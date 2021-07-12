#####################
# Network variables #
#####################

variable "environment" {
  type        = string
  description = "This variable defines the environment to be built"
}

##################################
# Azure Resource Group variables #
##################################

variable "resource_group_name" {
  type        = string
  description = "Name of the resource group"
}

variable "location" {
  type        = string
  description = "Define the region the in which resource group will be created"
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

variable "failover_location" {
  type        = string
  description = "Define the failover Azure region; Should be geographically separate from the primary location"
}
