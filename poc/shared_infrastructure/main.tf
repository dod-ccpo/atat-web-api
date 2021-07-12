# Configure the Azure provider
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = ">= 2.65, <3.0.0"
    }
  }

  required_version = ">= 0.10"

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
  source              = "./modules/keyvault"
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
