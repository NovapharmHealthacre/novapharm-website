targetScope = 'resourceGroup'

@description('Azure region whose portal and capability APIs confirm Linux App Service F1 availability.')
param location string = resourceGroup().location

@description('Stable lowercase prefix for globally named resources.')
@minLength(3)
@maxLength(12)
param namePrefix string = 'novapharm'

@description('Name of the existing free-offer Azure SQL logical server created by free-validation-data.bicep.')
param sqlServerName string

@description('Name of the existing free-offer Azure SQL database.')
param sqlDatabaseName string = 'novapharm-poc'

@description('Enable Key Vault Standard only after current credit and spending-limit protection are verified. Default remains off.')
param deployKeyVault bool = false

@allowed([
  'none'
  'microsoft-graph'
])
@description('Validation email adapter. Keep none until a synthetic mailbox and narrow Graph permission are approved.')
param emailProvider string = 'none'

@description('Validation-only sender identity; no production recipient list may be used.')
param emailFrom string = ''

@description('Validation-only internal recipient.')
param contactNotificationTo string = ''

@description('Approved validation Microsoft 365 sender mailbox.')
param microsoftEmailSender string = ''

var environmentCode = 'poc'
var normalisedPrefix = toLower(replace(namePrefix, '-', ''))
var uniqueSuffix = uniqueString(subscription().subscriptionId, resourceGroup().id, environmentCode)
var compactSuffix = take(uniqueSuffix, 6)
var resourceStem = '${namePrefix}-${environmentCode}'
var appName = take('${resourceStem}-web-${compactSuffix}', 60)
var planName = '${resourceStem}-plan'
var storageName = take('${normalisedPrefix}${environmentCode}st${compactSuffix}', 24)
var keyVaultName = take('${normalisedPrefix}${environmentCode}kv${compactSuffix}', 24)
var generatedOrigin = 'https://${appName}.azurewebsites.net'

var tags = {
  application: 'NovaPharm Digital Platform'
  environment: 'free-validation'
  owner: 'NovaPharm Healthcare Ltd'
  managedBy: 'Bicep'
  dataClassification: 'Synthetic validation data only'
  costPolicy: 'Zero out-of-pocket'
}

var storageBlobDataContributorRoleId = subscriptionResourceId(
  'Microsoft.Authorization/roleDefinitions',
  'ba92f5b4-2d11-453d-a403-e96b0029c9fe'
)
var keyVaultSecretsUserRoleId = subscriptionResourceId(
  'Microsoft.Authorization/roleDefinitions',
  '4633458b-17de-408a-b874-0445c86b69e6'
)

resource appServicePlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: planName
  location: location
  kind: 'linux'
  tags: tags
  sku: {
    name: 'F1'
    tier: 'Free'
    capacity: 1
  }
  properties: {
    reserved: true
    zoneRedundant: false
  }
}

resource app 'Microsoft.Web/sites@2023-12-01' = {
  name: appName
  location: location
  kind: 'app,linux'
  tags: tags
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    clientAffinityEnabled: false
    httpsOnly: true
    publicNetworkAccess: 'Enabled'
    serverFarmId: appServicePlan.id
    siteConfig: {
      appCommandLine: 'npm run start'
      alwaysOn: false
      ftpsState: 'Disabled'
      http20Enabled: true
      linuxFxVersion: 'NODE|24-lts'
      minTlsVersion: '1.2'
      remoteDebuggingEnabled: false
      scmMinTlsVersion: '1.2'
      use32BitWorkerProcess: false
      webSocketsEnabled: false
    }
  }
}

resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageName
  location: location
  kind: 'StorageV2'
  sku: {
    name: 'Standard_LRS'
  }
  tags: tags
  properties: {
    accessTier: 'Hot'
    allowBlobPublicAccess: false
    allowCrossTenantReplication: false
    allowSharedKeyAccess: false
    defaultToOAuthAuthentication: true
    supportsHttpsTrafficOnly: true
    minimumTlsVersion: 'TLS1_2'
    publicNetworkAccess: 'Enabled'
    networkAcls: {
      bypass: 'AzureServices'
      defaultAction: 'Allow'
    }
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  parent: storage
  name: 'default'
  properties: {
    containerDeleteRetentionPolicy: {
      enabled: true
      days: 7
    }
    deleteRetentionPolicy: {
      allowPermanentDelete: false
      enabled: true
      days: 7
    }
    isVersioningEnabled: false
  }
}

resource uploadsQuarantine 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobService
  name: 'uploads-quarantine'
  properties: {
    publicAccess: 'None'
  }
}

resource documentsPrivate 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobService
  name: 'documents-private'
  properties: {
    publicAccess: 'None'
  }
}

resource validationLifecycle 'Microsoft.Storage/storageAccounts/managementPolicies@2023-05-01' = {
  parent: storage
  name: 'default'
  properties: {
    policy: {
      rules: [
        {
          name: 'expire-synthetic-validation-uploads'
          enabled: true
          type: 'Lifecycle'
          definition: {
            actions: {
              baseBlob: {
                delete: {
                  daysAfterModificationGreaterThan: 7
                }
              }
            }
            filters: {
              blobTypes: [
                'blockBlob'
              ]
              prefixMatch: [
                '${uploadsQuarantine.name}/'
                '${documentsPrivate.name}/'
              ]
            }
          }
        }
      ]
    }
  }
}

resource appStorageRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storage.id, app.id, storageBlobDataContributorRoleId)
  scope: storage
  properties: {
    roleDefinitionId: storageBlobDataContributorRoleId
    principalId: app.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = if (deployKeyVault) {
  name: keyVaultName
  location: location
  tags: tags
  properties: {
    tenantId: tenant().tenantId
    sku: {
      family: 'A'
      name: 'standard'
    }
    enableRbacAuthorization: true
    enablePurgeProtection: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 7
    publicNetworkAccess: 'Enabled'
    networkAcls: {
      bypass: 'AzureServices'
      defaultAction: 'Allow'
    }
  }
}

resource appVaultRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (deployKeyVault) {
  name: guid(keyVault.id, app.id, keyVaultSecretsUserRoleId)
  scope: keyVault
  properties: {
    roleDefinitionId: keyVaultSecretsUserRoleId
    principalId: app.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

var baseAppSettings = {
  NODE_ENV: 'production'
  HOST: '0.0.0.0'
  SITE_URL: generatedOrigin
  PUBLIC_ORIGIN: generatedOrigin
  PUBLIC_API_ORIGIN: generatedOrigin
  DATABASE_PROVIDER: 'azure-sql'
  AZURE_SQL_SERVER: '${sqlServerName}${environment().suffixes.sqlServerHostname}'
  AZURE_SQL_DATABASE: sqlDatabaseName
  AZURE_SQL_AUTHENTICATION: 'managed-identity'
  AZURE_SQL_RUN_MIGRATIONS: 'false'
  DATABASE_POOL_MAX: '2'
  DOCUMENT_STORAGE_PROVIDER: 'azure-blob'
  AZURE_STORAGE_ACCOUNT_NAME: storage.name
  AZURE_STORAGE_QUARANTINE_CONTAINER: uploadsQuarantine.name
  AZURE_STORAGE_PRIVATE_CONTAINER: documentsPrivate.name
  SECURE_CONTENT_ROOT: '/home/site/wwwroot/_secure'
  PREVIEW_MODE: 'true'
  PREVIEW_LABEL: 'Azure free-validation environment - synthetic data only'
  SESSION_TTL_MS: '14400000'
  SESSION_IDLE_TIMEOUT_MS: '900000'
  PORTAL_USERNAME: 'Vishal'
  PORTAL_DISPLAY_NAME: 'Vishal Chakravarty'
  ENTRA_AUTH_ENABLED: 'false'
  MICROSOFT_GRAPH_AUTH_MODE: 'managed-identity'
  EMAIL_PROVIDER: emailProvider
  EMAIL_FROM: emailFrom
  CONTACT_NOTIFICATION_TO: contactNotificationTo
  MICROSOFT_EMAIL_SENDER: microsoftEmailSender
  APPLICATION_UPLOAD_TOKEN_TTL_MS: '1800000'
  APPLICATION_RESUME_TOKEN_TTL_MS: '86400000'
  SCM_DO_BUILD_DURING_DEPLOYMENT: 'false'
  WEBSITE_NODE_DEFAULT_VERSION: '~24'
  WEBSITE_RUN_FROM_PACKAGE: '1'
}

var keyVaultAppSettings = deployKeyVault ? {
  SESSION_SECRET: '@Microsoft.KeyVault(VaultName=${keyVault.name};SecretName=free-validation-session-secret)'
  PREVIEW_ACCESS_USERNAME: '@Microsoft.KeyVault(VaultName=${keyVault.name};SecretName=free-validation-preview-username)'
  PREVIEW_ACCESS_PASSWORD: '@Microsoft.KeyVault(VaultName=${keyVault.name};SecretName=free-validation-preview-password)'
  BOOTSTRAP_ADMIN_PASSWORD: '@Microsoft.KeyVault(VaultName=${keyVault.name};SecretName=free-validation-bootstrap-admin-password)'
} : {}

resource appSettings 'Microsoft.Web/sites/config@2023-12-01' = {
  parent: app
  name: 'appsettings'
  properties: union(baseAppSettings, keyVaultAppSettings)
}

output applicationName string = app.name
output applicationDefaultHostname string = app.properties.defaultHostName
output applicationOrigin string = generatedOrigin
output appServicePlanSku string = appServicePlan.sku.name
output storageAccountName string = storage.name
output keyVaultName string = deployKeyVault ? keyVault.name : ''
output managedIdentityPrincipalId string = app.identity.principalId
