# Configure the Azure provider
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = ">= 2.65, <3.0.0"
    }
  }

  required_version = ">= 1.0"

  backend "azurerm" {
    container_name = "tf-poc"
    key            = "terraform.tfstate"
  }
}

provider "azurerm" {
  features {}
}

resource "azurerm_resource_group" "rg" {
  name     = var.resource_group_name
  location = var.location
  tags = {
    Environment = "Shared Infrastructure for PoC app"
    Team        = "ATAT Platform Team"
  }
}

resource "azurerm_storage_account" "sa" {
  name                     = var.storage_account_name
  resource_group_name      = azurerm_resource_group.rg.name
  location                 = azurerm_resource_group.rg.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}

module "keyvault" {
  source              = "modules\/keyvault"
  name                = "${var.environment}-keyvault"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name

  enabled_for_deployment          = var.kv-vm-deployment
  enabled_for_disk_encryption     = var.kv-disk-encryption
  enabled_for_template_deployment = var.kv-template-deployment

  tags = {
    environment = var.environment
  }

  policies = {
    full = {
      tenant_id               = var.azure-tenant-id
      object_id               = var.kv-full-object-id
      key_permissions         = var.kv-key-permissions-full
      secret_permissions      = var.kv-secret-permissions-full
      certificate_permissions = var.kv-certificate-permissions-full
      storage_permissions     = var.kv-storage-permissions-full
    }
    read = {
      tenant_id               = var.azure-tenant-id
      object_id               = var.kv-read-object-id
      key_permissions         = var.kv-key-permissions-read
      secret_permissions      = var.kv-secret-permissions-read
      certificate_permissions = var.kv-certificate-permissions-read
      storage_permissions     = var.kv-storage-permissions-read
    }
    atatgroupdeployers = {
      tenant_id               = var.azure-tenant-id
      object_id               = var.kv-atat-deployers-object-id
      key_permissions         = var.kv-key-permissions-full
      secret_permissions      = var.kv-secret-permissions-full
      certificate_permissions = var.kv-certificate-permissions-full
      storage_permissions     = var.kv-storage-permissions-full
    }
  }

  secrets    = var.kv-secrets
  customkeys = var.kv-customkeys
}

resource "azurerm_key_vault_secret" "cosmos_connection_string" {
  name         = "COSMOS-CONNECTION-STRING"
  value        = azurerm_cosmosdb_account.da.connection_strings[0]
  key_vault_id = module.keyvault.key-vault-id
}

resource "azurerm_cosmosdb_account" "da" {
  name                      = var.cosmosdb_account_name
  resource_group_name       = azurerm_resource_group.rg.name
  location                  = azurerm_resource_group.rg.location
  offer_type                = "Standard"
  kind                      = "GlobalDocumentDB"
  enable_automatic_failover = true
  consistency_policy {
    consistency_level = "Session"
  }
  geo_location {
    location          = var.failover_location
    failover_priority = 1
  }
  geo_location {
    location          = azurerm_resource_group.rg.location
    failover_priority = 0
  }
}

resource "azurerm_cosmosdb_sql_database" "db" {
  name                = var.cosmosdb_database_name
  resource_group_name = azurerm_cosmosdb_account.da.resource_group_name
  account_name        = azurerm_cosmosdb_account.da.name
  throughput          = 400
}

resource "azurerm_cosmosdb_sql_container" "users" {
  name                  = "users"
  resource_group_name   = azurerm_cosmosdb_account.da.resource_group_name
  account_name          = azurerm_cosmosdb_account.da.name
  database_name         = azurerm_cosmosdb_sql_database.db.name
  partition_key_path    = "/user_id"
  partition_key_version = 1
  throughput            = 400
  indexing_policy {
    indexing_mode = "Consistent"
    included_path {
      path = "/*"
    }
  }
}

resource "azurerm_cosmosdb_sql_container" "portfolios" {
  name                  = "portfolios"
  resource_group_name   = azurerm_cosmosdb_account.da.resource_group_name
  account_name          = azurerm_cosmosdb_account.da.name
  database_name         = azurerm_cosmosdb_sql_database.db.name
  partition_key_path    = "/portfolio_id"
  partition_key_version = 1
  throughput            = 400
  indexing_policy {
    indexing_mode = "Consistent"
    included_path {
      path = "/*"
    }
  }
}

resource "azurerm_servicebus_namespace" "service_bus" {
  name                = "${var.environment}-service-bus"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  sku                 = "Standard"
}
