targetScope = 'resourceGroup'

@description('Short environment code used in resource names.')
@allowed([
  'dev'
  'stg'
  'prod'
])
param environmentCode string

@description('Azure region selected by the owner after checking service availability and data-residency requirements.')
param location string = resourceGroup().location

@description('Stable lowercase prefix for globally named resources.')
@minLength(3)
@maxLength(12)
param namePrefix string = 'novapharm'

@description('Public origin for this environment. Leave blank to use the generated Azure hostname for development or staging.')
param publicOrigin string = ''

@description('Optional single trusted IPv4 address or CIDR used only while an owner seeds Key Vault. Remove immediately afterwards.')
param keyVaultBootstrapIpCidr string = ''

@description('Object ID of the approved Microsoft Entra group that administers Azure SQL.')
param sqlEntraAdminObjectId string

@description('Display name of the approved Microsoft Entra group that administers Azure SQL.')
param sqlEntraAdminLogin string

@description('Azure SQL service objective. GP_S_Gen5_1 is suitable for initial staging; production sizing requires measured load.')
param sqlSkuName string = 'GP_S_Gen5_1'

@description('Azure SQL SKU tier.')
param sqlSkuTier string = 'GeneralPurpose'

@description('Azure SQL vCore capacity.')
@minValue(1)
param sqlCapacity int = 1

@description('Minimum serverless vCores. The conservative default is one vCore; review lower supported values with the Azure SQL SKU before deployment.')
@minValue(1)
param sqlMinCapacity int = 1

@description('Serverless auto-pause delay in minutes. Use -1 to disable auto-pause for production.')
param sqlAutoPauseDelay int = 60

@description('App Service Plan SKU. S1 is the minimum production baseline because it supports deployment slots and Always On.')
param appServiceSkuName string = 'S1'

@description('App Service Plan tier.')
param appServiceSkuTier string = 'Standard'

@description('Worker count. Production should use two only after charge approval and load validation.')
@minValue(1)
param workerCount int = 1

@description('Create the isolated production-candidate deployment slot.')
param deployCandidateSlot bool = false

@description('Enable Microsoft Entra App Service Authentication only after the app registration and redirect URIs are approved.')
param enableEntraAuthentication bool = false

@description('Microsoft Entra tenant ID. Required only when App Service Authentication is enabled.')
param entraTenantId string = tenant().tenantId

@description('Microsoft Entra application client ID. Required only when App Service Authentication is enabled.')
param entraClientId string = ''

@description('Key Vault secret name containing the Entra relying-party client secret. The secret value is never accepted as a Bicep parameter.')
param entraClientSecretName string = 'entra-client-secret'

@description('Key Vault secret name containing the restricted preview username.')
param previewUsernameSecretName string = 'preview-access-username'

@description('Key Vault secret name containing the restricted preview password.')
param previewPasswordSecretName string = 'preview-access-password'

@description('Temporarily expose the protected one-time administrator bootstrap setting to the app. Disable immediately after the first password change.')
param enableBootstrapAdmin bool = false

@description('Key Vault secret name containing the one-time production bootstrap password.')
param bootstrapAdminPasswordSecretName string = 'bootstrap-admin-password'

@description('Key Vault secret name containing the isolated candidate bootstrap password.')
param candidateBootstrapAdminPasswordSecretName string = 'candidate-bootstrap-admin-password'

@description('Optional Microsoft Entra External ID tenant ID used to distinguish approved external customer identities.')
param entraExternalTenantId string = ''

@description('Object ID of the NovaPharm administrator group mapped to the admin scope.')
param entraAdminGroupId string = ''

@description('Object ID of the NovaPharm board group mapped to the board scope.')
param entraBoardGroupId string = ''

@description('Object ID of the NovaPharm employee group mapped to the employee scope.')
param entraEmployeeGroupId string = ''

@description('Optional object ID of the approved customer group. External customers still require an active linked account record.')
param entraCustomerGroupId string = ''

@description('Enable Defender for Storage on-upload malware scanning after the owner approves the usage-based charge.')
param enableDefenderForStorage bool = false

@description('Monthly malware scanning cap in GB. Set only after reviewing expected upload volume and price.')
@minValue(1)
param malwareScanCapGB int = 50

@description('Optional operations email used to create an Azure Monitor action group.')
param operationsEmail string = ''

@description('Transactional email sender. This is configuration, not an API credential.')
param emailFrom string = ''

@description('Internal destination for contact notifications. This is configuration, not an API credential.')
param contactNotificationTo string = ''

@description('SharePoint tenant hostname, for example contoso.sharepoint.com. Leave blank until the approved site is known.')
param sharePointHostname string = ''

@description('Server-relative SharePoint site path, for example /sites/ExecutivePlatform.')
param sharePointSitePath string = ''

@description('Optional approved SharePoint document-library drive ID.')
param sharePointDriveId string = ''

@description('Controlled Executive Platform folder path within the approved drive.')
param sharePointExecutivePlatformPath string = ''

@description('Retention period for Log Analytics in days.')
@minValue(30)
param logRetentionDays int = 90

var normalisedPrefix = toLower(replace(namePrefix, '-', ''))
var uniqueSuffix = uniqueString(subscription().subscriptionId, resourceGroup().id, environmentCode)
var compactSuffix = take(uniqueSuffix, 6)
var resourceStem = '${namePrefix}-${environmentCode}'
var appName = take('${resourceStem}-web-${compactSuffix}', 60)
var resolvedPublicOrigin = empty(publicOrigin) ? 'https://${appName}.azurewebsites.net' : publicOrigin
var planName = '${resourceStem}-plan'
var keyVaultName = take('${normalisedPrefix}${environmentCode}kv${compactSuffix}', 24)
var storageName = take('${normalisedPrefix}${environmentCode}st${compactSuffix}', 24)
var sqlServerName = take('${normalisedPrefix}-${environmentCode}-sql-${compactSuffix}', 63)
var sqlDatabaseName = 'novapharm-${environmentCode}'
var candidateDatabaseName = 'novapharm-${environmentCode}-candidate'
var logWorkspaceName = '${resourceStem}-logs'
var appInsightsName = '${resourceStem}-insights'
var vnetName = '${resourceStem}-vnet'

var tags = {
  application: 'NovaPharm Digital Platform'
  environment: environmentCode
  owner: 'NovaPharm Healthcare Ltd'
  managedBy: 'Bicep'
  dataClassification: 'Confidential'
}

var keyVaultSecretsUserRoleId = subscriptionResourceId(
  'Microsoft.Authorization/roleDefinitions',
  '4633458b-17de-408a-b874-0445c86b69e6'
)
var storageBlobDataContributorRoleId = subscriptionResourceId(
  'Microsoft.Authorization/roleDefinitions',
  'ba92f5b4-2d11-453d-a403-e96b0029c9fe'
)

resource logWorkspace 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: logWorkspaceName
  location: location
  tags: tags
  properties: {
    retentionInDays: logRetentionDays
    features: {
      enableLogAccessUsingOnlyResourcePermissions: true
    }
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
  }
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  kind: 'web'
  tags: tags
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logWorkspace.id
    DisableIpMasking: false
    IngestionMode: 'LogAnalytics'
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
  }
}

resource vnet 'Microsoft.Network/virtualNetworks@2024-05-01' = {
  name: vnetName
  location: location
  tags: tags
  properties: {
    addressSpace: {
      addressPrefixes: [
        '10.42.0.0/16'
      ]
    }
  }
}

resource appIntegrationSubnet 'Microsoft.Network/virtualNetworks/subnets@2024-05-01' = {
  parent: vnet
  name: 'app-integration'
  properties: {
    addressPrefix: '10.42.1.0/24'
    delegations: [
      {
        name: 'app-service-delegation'
        properties: {
          serviceName: 'Microsoft.Web/serverFarms'
        }
      }
    ]
  }
}

resource privateEndpointSubnet 'Microsoft.Network/virtualNetworks/subnets@2024-05-01' = {
  parent: vnet
  name: 'private-endpoints'
  properties: {
    addressPrefix: '10.42.2.0/24'
    privateEndpointNetworkPolicies: 'Disabled'
  }
}

resource blobPrivateDnsZone 'Microsoft.Network/privateDnsZones@2024-06-01' = {
  name: 'privatelink.blob.core.windows.net'
  location: 'global'
  tags: tags
}

resource sqlPrivateDnsZone 'Microsoft.Network/privateDnsZones@2024-06-01' = {
  name: 'privatelink.database.windows.net'
  location: 'global'
  tags: tags
}

resource vaultPrivateDnsZone 'Microsoft.Network/privateDnsZones@2024-06-01' = {
  name: 'privatelink.vaultcore.azure.net'
  location: 'global'
  tags: tags
}

resource blobDnsLink 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2024-06-01' = {
  parent: blobPrivateDnsZone
  name: 'blob-${vnetName}'
  location: 'global'
  tags: tags
  properties: {
    registrationEnabled: false
    virtualNetwork: {
      id: vnet.id
    }
  }
}

resource sqlDnsLink 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2024-06-01' = {
  parent: sqlPrivateDnsZone
  name: 'sql-${vnetName}'
  location: 'global'
  tags: tags
  properties: {
    registrationEnabled: false
    virtualNetwork: {
      id: vnet.id
    }
  }
}

resource vaultDnsLink 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2024-06-01' = {
  parent: vaultPrivateDnsZone
  name: 'vault-${vnetName}'
  location: 'global'
  tags: tags
  properties: {
    registrationEnabled: false
    virtualNetwork: {
      id: vnet.id
    }
  }
}

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
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
    softDeleteRetentionInDays: 90
    publicNetworkAccess: empty(keyVaultBootstrapIpCidr) ? 'Disabled' : 'Enabled'
    networkAcls: {
      bypass: 'AzureServices'
      defaultAction: 'Deny'
      ipRules: empty(keyVaultBootstrapIpCidr) ? [] : [
        {
          value: keyVaultBootstrapIpCidr
        }
      ]
    }
  }
}

resource vaultPrivateEndpoint 'Microsoft.Network/privateEndpoints@2024-05-01' = {
  name: '${resourceStem}-vault-pe'
  location: location
  tags: tags
  properties: {
    subnet: {
      id: privateEndpointSubnet.id
    }
    privateLinkServiceConnections: [
      {
        name: 'vault'
        properties: {
          privateLinkServiceId: keyVault.id
          groupIds: [
            'vault'
          ]
        }
      }
    ]
  }
}

resource vaultPrivateDnsGroup 'Microsoft.Network/privateEndpoints/privateDnsZoneGroups@2024-05-01' = {
  parent: vaultPrivateEndpoint
  name: 'default'
  properties: {
    privateDnsZoneConfigs: [
      {
        name: 'vault'
        properties: {
          privateDnsZoneId: vaultPrivateDnsZone.id
        }
      }
    ]
  }
}

resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageName
  location: location
  kind: 'StorageV2'
  sku: {
    name: 'Standard_ZRS'
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
    publicNetworkAccess: 'Disabled'
    networkAcls: {
      bypass: 'AzureServices'
      defaultAction: 'Deny'
    }
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  parent: storage
  name: 'default'
  properties: {
    changeFeed: {
      enabled: true
      retentionInDays: 30
    }
    containerDeleteRetentionPolicy: {
      enabled: true
      days: 14
    }
    deleteRetentionPolicy: {
      allowPermanentDelete: false
      enabled: true
      days: 30
    }
    isVersioningEnabled: true
  }
}

resource quarantineLifecycle 'Microsoft.Storage/storageAccounts/managementPolicies@2023-05-01' = {
  parent: storage
  name: 'default'
  properties: {
    policy: {
      rules: [
        {
          name: 'expire-production-quarantine'
          enabled: true
          type: 'Lifecycle'
          definition: {
            actions: {
              baseBlob: {
                delete: {
                  daysAfterModificationGreaterThan: 30
                }
              }
            }
            filters: {
              blobTypes: [
                'blockBlob'
              ]
              prefixMatch: [
                '${uploadsQuarantine.name}/'
              ]
            }
          }
        }
        {
          name: 'expire-candidate-quarantine'
          enabled: deployCandidateSlot
          type: 'Lifecycle'
          definition: {
            actions: {
              baseBlob: {
                delete: {
                  daysAfterModificationGreaterThan: 14
                }
              }
            }
            filters: {
              blobTypes: [
                'blockBlob'
              ]
              prefixMatch: [
                'candidate-uploads-quarantine/'
              ]
            }
          }
        }
      ]
    }
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

resource candidateUploadsQuarantine 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = if (deployCandidateSlot) {
  parent: blobService
  name: 'candidate-uploads-quarantine'
  properties: {
    publicAccess: 'None'
  }
}

resource candidateDocumentsPrivate 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = if (deployCandidateSlot) {
  parent: blobService
  name: 'candidate-documents-private'
  properties: {
    publicAccess: 'None'
  }
}

resource defenderForStorage 'Microsoft.Security/defenderForStorageSettings@2022-12-01-preview' = if (enableDefenderForStorage) {
  scope: storage
  name: 'current'
  properties: {
    isEnabled: true
    malwareScanning: {
      onUpload: {
        isEnabled: true
        capGBPerMonth: malwareScanCapGB
      }
      scanResultsEventGridTopicResourceId: ''
    }
    sensitiveDataDiscovery: {
      isEnabled: false
    }
    overrideSubscriptionLevelSettings: true
  }
}

resource blobPrivateEndpoint 'Microsoft.Network/privateEndpoints@2024-05-01' = {
  name: '${resourceStem}-blob-pe'
  location: location
  tags: tags
  properties: {
    subnet: {
      id: privateEndpointSubnet.id
    }
    privateLinkServiceConnections: [
      {
        name: 'blob'
        properties: {
          privateLinkServiceId: storage.id
          groupIds: [
            'blob'
          ]
        }
      }
    ]
  }
}

resource blobPrivateDnsGroup 'Microsoft.Network/privateEndpoints/privateDnsZoneGroups@2024-05-01' = {
  parent: blobPrivateEndpoint
  name: 'default'
  properties: {
    privateDnsZoneConfigs: [
      {
        name: 'blob'
        properties: {
          privateDnsZoneId: blobPrivateDnsZone.id
        }
      }
    ]
  }
}

resource sqlServer 'Microsoft.Sql/servers@2023-08-01' = {
  name: sqlServerName
  location: location
  tags: tags
  properties: {
    administrators: {
      administratorType: 'ActiveDirectory'
      azureADOnlyAuthentication: true
      login: sqlEntraAdminLogin
      principalType: 'Group'
      sid: sqlEntraAdminObjectId
      tenantId: tenant().tenantId
    }
    minimalTlsVersion: '1.2'
    publicNetworkAccess: 'Disabled'
    version: '12.0'
  }
}

resource sqlDatabase 'Microsoft.Sql/servers/databases@2023-08-01' = {
  parent: sqlServer
  name: sqlDatabaseName
  location: location
  tags: tags
  sku: {
    name: sqlSkuName
    tier: sqlSkuTier
    capacity: sqlCapacity
    family: 'Gen5'
  }
  properties: {
    autoPauseDelay: sqlAutoPauseDelay
    catalogCollation: 'SQL_Latin1_General_CP1_CI_AS'
    collation: 'SQL_Latin1_General_CP1_CI_AS'
    minCapacity: sqlMinCapacity
    readScale: 'Disabled'
    requestedBackupStorageRedundancy: environmentCode == 'prod' ? 'Zone' : 'Local'
    zoneRedundant: false
  }
}

resource candidateSqlDatabase 'Microsoft.Sql/servers/databases@2023-08-01' = if (deployCandidateSlot) {
  parent: sqlServer
  name: candidateDatabaseName
  location: location
  tags: union(tags, {
    slot: 'candidate'
  })
  sku: {
    name: sqlSkuName
    tier: sqlSkuTier
    capacity: sqlCapacity
    family: 'Gen5'
  }
  properties: {
    autoPauseDelay: sqlAutoPauseDelay
    catalogCollation: 'SQL_Latin1_General_CP1_CI_AS'
    collation: 'SQL_Latin1_General_CP1_CI_AS'
    minCapacity: sqlMinCapacity
    readScale: 'Disabled'
    requestedBackupStorageRedundancy: 'Local'
    zoneRedundant: false
  }
}

resource sqlShortTermRetention 'Microsoft.Sql/servers/databases/backupShortTermRetentionPolicies@2023-08-01' = {
  parent: sqlDatabase
  name: 'default'
  properties: {
    diffBackupIntervalInHours: 12
    retentionDays: environmentCode == 'prod' ? 35 : 14
  }
}

resource candidateSqlShortTermRetention 'Microsoft.Sql/servers/databases/backupShortTermRetentionPolicies@2023-08-01' = if (deployCandidateSlot) {
  parent: candidateSqlDatabase
  name: 'default'
  properties: {
    diffBackupIntervalInHours: 12
    retentionDays: 14
  }
}

resource sqlPrivateEndpoint 'Microsoft.Network/privateEndpoints@2024-05-01' = {
  name: '${resourceStem}-sql-pe'
  location: location
  tags: tags
  properties: {
    subnet: {
      id: privateEndpointSubnet.id
    }
    privateLinkServiceConnections: [
      {
        name: 'sql'
        properties: {
          privateLinkServiceId: sqlServer.id
          groupIds: [
            'sqlServer'
          ]
        }
      }
    ]
  }
}

resource sqlPrivateDnsGroup 'Microsoft.Network/privateEndpoints/privateDnsZoneGroups@2024-05-01' = {
  parent: sqlPrivateEndpoint
  name: 'default'
  properties: {
    privateDnsZoneConfigs: [
      {
        name: 'sql'
        properties: {
          privateDnsZoneId: sqlPrivateDnsZone.id
        }
      }
    ]
  }
}

resource appServicePlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: planName
  location: location
  kind: 'linux'
  tags: tags
  sku: {
    name: appServiceSkuName
    tier: appServiceSkuTier
    capacity: workerCount
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
    virtualNetworkSubnetId: appIntegrationSubnet.id
    siteConfig: {
      appCommandLine: 'npm run start:production'
      alwaysOn: true
      ftpsState: 'Disabled'
      healthCheckPath: '/api/health'
      http20Enabled: true
      ipSecurityRestrictionsDefaultAction: 'Allow'
      linuxFxVersion: 'NODE|24-lts'
      loadBalancing: 'LeastRequests'
      minTlsVersion: '1.2'
      remoteDebuggingEnabled: false
      scmMinTlsVersion: '1.2'
      use32BitWorkerProcess: false
      vnetRouteAllEnabled: true
      webSocketsEnabled: false
    }
  }
}

resource candidateSlot 'Microsoft.Web/sites/slots@2023-12-01' = if (deployCandidateSlot) {
  parent: app
  name: 'candidate'
  location: location
  kind: 'app,linux'
  tags: union(tags, {
    slot: 'candidate'
  })
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    clientAffinityEnabled: false
    httpsOnly: true
    publicNetworkAccess: 'Enabled'
    serverFarmId: appServicePlan.id
    virtualNetworkSubnetId: appIntegrationSubnet.id
    siteConfig: {
      appCommandLine: 'npm run start:production'
      alwaysOn: true
      ftpsState: 'Disabled'
      healthCheckPath: '/api/health'
      http20Enabled: true
      linuxFxVersion: 'NODE|24-lts'
      minTlsVersion: '1.2'
      remoteDebuggingEnabled: false
      scmMinTlsVersion: '1.2'
      use32BitWorkerProcess: false
      vnetRouteAllEnabled: true
      webSocketsEnabled: false
    }
  }
}

var productionAppSettings = union({
  NODE_ENV: 'production'
  HOST: '0.0.0.0'
  SITE_URL: resolvedPublicOrigin
  PUBLIC_ORIGIN: resolvedPublicOrigin
  PUBLIC_API_ORIGIN: resolvedPublicOrigin
  DATABASE_PROVIDER: 'azure-sql'
  AZURE_SQL_SERVER: '${sqlServer.name}.database.windows.net'
  AZURE_SQL_DATABASE: sqlDatabase.name
  AZURE_SQL_AUTHENTICATION: 'managed-identity'
  AZURE_SQL_RUN_MIGRATIONS: 'false'
  DOCUMENT_STORAGE_PROVIDER: 'azure-blob'
  AZURE_STORAGE_ACCOUNT_NAME: storage.name
  AZURE_STORAGE_QUARANTINE_CONTAINER: uploadsQuarantine.name
  AZURE_STORAGE_PRIVATE_CONTAINER: documentsPrivate.name
  APPLICATIONINSIGHTS_CONNECTION_STRING: appInsights.properties.ConnectionString
  SECURE_CONTENT_ROOT: '/home/site/wwwroot/_secure'
  PREVIEW_MODE: string(environmentCode != 'prod')
  PREVIEW_LABEL: environmentCode != 'prod' ? 'Non-production Azure staging' : ''
  EMAIL_FROM: emailFrom
  CONTACT_NOTIFICATION_TO: contactNotificationTo
  SESSION_SECRET: '@Microsoft.KeyVault(VaultName=${keyVault.name};SecretName=session-secret)'
  SESSION_TTL_MS: '28800000'
  SESSION_IDLE_TIMEOUT_MS: '1800000'
  RESEND_API_KEY: '@Microsoft.KeyVault(VaultName=${keyVault.name};SecretName=resend-api-key)'
  ENTRA_TENANT_ID: entraTenantId
  ENTRA_CLIENT_ID: entraClientId
  ENTRA_EXTERNAL_TENANT_ID: entraExternalTenantId
  ENTRA_ADMIN_GROUP_ID: entraAdminGroupId
  ENTRA_BOARD_GROUP_ID: entraBoardGroupId
  ENTRA_EMPLOYEE_GROUP_ID: entraEmployeeGroupId
  ENTRA_CUSTOMER_GROUP_ID: entraCustomerGroupId
  ENTRA_AUTH_ENABLED: string(enableEntraAuthentication)
  MICROSOFT_GRAPH_AUTH_MODE: 'managed-identity'
  SHAREPOINT_HOSTNAME: sharePointHostname
  SHAREPOINT_SITE_PATH: sharePointSitePath
  SHAREPOINT_DRIVE_ID: sharePointDriveId
  SHAREPOINT_EXECUTIVE_PLATFORM_PATH: sharePointExecutivePlatformPath
  SCM_DO_BUILD_DURING_DEPLOYMENT: 'false'
  WEBSITE_NODE_DEFAULT_VERSION: '~24'
  WEBSITE_RUN_FROM_PACKAGE: '1'
}, environmentCode != 'prod' ? {
  PREVIEW_ACCESS_USERNAME: '@Microsoft.KeyVault(VaultName=${keyVault.name};SecretName=${previewUsernameSecretName})'
  PREVIEW_ACCESS_PASSWORD: '@Microsoft.KeyVault(VaultName=${keyVault.name};SecretName=${previewPasswordSecretName})'
} : {}, enableEntraAuthentication ? {
  ENTRA_CLIENT_SECRET: '@Microsoft.KeyVault(VaultName=${keyVault.name};SecretName=${entraClientSecretName})'
} : {}, enableBootstrapAdmin ? {
  PORTAL_USERNAME: 'Vishal'
  PORTAL_DISPLAY_NAME: 'Vishal Chakravarty'
  BOOTSTRAP_ADMIN_PASSWORD: '@Microsoft.KeyVault(VaultName=${keyVault.name};SecretName=${bootstrapAdminPasswordSecretName})'
} : {})

resource appSettings 'Microsoft.Web/sites/config@2023-12-01' = {
  parent: app
  name: 'appsettings'
  properties: productionAppSettings
}

resource candidateSlotSettings 'Microsoft.Web/sites/slots/config@2023-12-01' = if (deployCandidateSlot) {
  parent: candidateSlot
  name: 'appsettings'
  properties: union(productionAppSettings, {
    SITE_URL: 'https://${appName}-candidate.azurewebsites.net'
    PUBLIC_ORIGIN: 'https://${appName}-candidate.azurewebsites.net'
    PUBLIC_API_ORIGIN: 'https://${appName}-candidate.azurewebsites.net'
    DATABASE_PROVIDER: 'azure-sql'
    AZURE_SQL_DATABASE: candidateSqlDatabase.name
    AZURE_STORAGE_QUARANTINE_CONTAINER: candidateUploadsQuarantine.name
    AZURE_STORAGE_PRIVATE_CONTAINER: candidateDocumentsPrivate.name
    PREVIEW_MODE: 'true'
    PREVIEW_LABEL: 'Non-production Azure candidate'
    PREVIEW_ACCESS_USERNAME: '@Microsoft.KeyVault(VaultName=${keyVault.name};SecretName=${previewUsernameSecretName})'
    PREVIEW_ACCESS_PASSWORD: '@Microsoft.KeyVault(VaultName=${keyVault.name};SecretName=${previewPasswordSecretName})'
    SESSION_SECRET: '@Microsoft.KeyVault(VaultName=${keyVault.name};SecretName=candidate-session-secret)'
    RESEND_API_KEY: ''
    BOOTSTRAP_ADMIN_PASSWORD: enableBootstrapAdmin ? '@Microsoft.KeyVault(VaultName=${keyVault.name};SecretName=${candidateBootstrapAdminPasswordSecretName})' : ''
  })
}

resource stickySlotSettings 'Microsoft.Web/sites/config@2023-12-01' = if (deployCandidateSlot) {
  parent: app
  name: 'slotConfigNames'
  properties: {
    appSettingNames: [
      'SITE_URL'
      'PUBLIC_ORIGIN'
      'PUBLIC_API_ORIGIN'
      'AZURE_SQL_DATABASE'
      'AZURE_STORAGE_QUARANTINE_CONTAINER'
      'AZURE_STORAGE_PRIVATE_CONTAINER'
      'PREVIEW_MODE'
      'PREVIEW_LABEL'
      'PREVIEW_ACCESS_USERNAME'
      'PREVIEW_ACCESS_PASSWORD'
      'SESSION_SECRET'
      'RESEND_API_KEY'
      'PORTAL_USERNAME'
      'PORTAL_DISPLAY_NAME'
      'BOOTSTRAP_ADMIN_PASSWORD'
    ]
    azureStorageConfigNames: []
    connectionStringNames: []
  }
}

var authSettingsProperties = {
  globalValidation: {
    excludedPaths: [
      '/api/health'
      '/api/contact/*'
      '/api/account-applications/*'
    ]
    redirectToProvider: 'azureactivedirectory'
    requireAuthentication: false
    unauthenticatedClientAction: 'AllowAnonymous'
  }
  httpSettings: {
    forwardProxy: {
      convention: 'Standard'
    }
    requireHttps: true
    routes: {
      apiPrefix: '/.auth'
    }
  }
  identityProviders: {
    azureActiveDirectory: {
      enabled: true
      registration: {
        clientId: entraClientId
        clientSecretSettingName: 'ENTRA_CLIENT_SECRET'
        openIdIssuer: 'https://login.microsoftonline.com/${entraTenantId}/v2.0'
      }
      validation: {
        allowedAudiences: [
          entraClientId
          'api://${entraClientId}'
        ]
      }
    }
  }
  login: {
    cookieExpiration: {
      convention: 'FixedTime'
      timeToExpiration: '08:00:00'
    }
    nonce: {
      nonceExpirationInterval: '00:05:00'
      validateNonce: true
    }
    preserveUrlFragmentsForLogins: false
    routes: {}
    tokenStore: {
      enabled: false
    }
  }
  platform: {
    enabled: true
    runtimeVersion: '~1'
  }
}

resource appAuth 'Microsoft.Web/sites/config@2022-09-01' = if (enableEntraAuthentication) {
  parent: app
  name: 'authsettingsV2'
  properties: authSettingsProperties
}

resource candidateAuth 'Microsoft.Web/sites/slots/config@2022-09-01' = if (deployCandidateSlot && enableEntraAuthentication) {
  parent: candidateSlot
  name: 'authsettingsV2'
  properties: authSettingsProperties
}

resource appVaultRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVault.id, app.id, keyVaultSecretsUserRoleId)
  scope: keyVault
  properties: {
    principalId: app.identity.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: keyVaultSecretsUserRoleId
  }
}

resource appStorageRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storage.id, app.id, storageBlobDataContributorRoleId)
  scope: storage
  properties: {
    principalId: app.identity.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: storageBlobDataContributorRoleId
  }
}

resource slotVaultRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (deployCandidateSlot) {
  name: guid(keyVault.id, candidateSlot.id, keyVaultSecretsUserRoleId)
  scope: keyVault
  properties: {
    principalId: candidateSlot.identity.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: keyVaultSecretsUserRoleId
  }
}

resource slotStorageRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (deployCandidateSlot) {
  name: guid(storage.id, candidateSlot.id, storageBlobDataContributorRoleId)
  scope: storage
  properties: {
    principalId: candidateSlot.identity.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: storageBlobDataContributorRoleId
  }
}

resource appDiagnostics 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  name: 'send-to-log-analytics'
  scope: app
  properties: {
    workspaceId: logWorkspace.id
    logs: [
      {
        category: 'AppServiceHTTPLogs'
        enabled: true
      }
      {
        category: 'AppServiceConsoleLogs'
        enabled: true
      }
      {
        category: 'AppServicePlatformLogs'
        enabled: true
      }
    ]
    metrics: [
      {
        category: 'AllMetrics'
        enabled: true
      }
    ]
  }
}

resource actionGroup 'Microsoft.Insights/actionGroups@2023-01-01' = if (!empty(operationsEmail)) {
  name: '${resourceStem}-operations'
  location: 'global'
  tags: tags
  properties: {
    enabled: true
    groupShortName: take('${environmentCode}ops', 12)
    emailReceivers: [
      {
        name: 'NovaPharm operations'
        emailAddress: operationsEmail
        useCommonAlertSchema: true
      }
    ]
  }
}

resource serverErrorAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = if (!empty(operationsEmail)) {
  name: '${resourceStem}-http-5xx'
  location: 'global'
  tags: tags
  properties: {
    actions: [
      {
        actionGroupId: actionGroup.id
      }
    ]
    autoMitigate: true
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          criterionType: 'StaticThresholdCriterion'
          metricName: 'Http5xx'
          metricNamespace: 'Microsoft.Web/sites'
          name: 'Http5xxThreshold'
          operator: 'GreaterThan'
          threshold: 5
          timeAggregation: 'Total'
        }
      ]
    }
    description: 'NovaPharm App Service returned more than five HTTP 5xx responses in five minutes.'
    enabled: true
    evaluationFrequency: 'PT1M'
    scopes: [
      app.id
    ]
    severity: 1
    targetResourceRegion: location
    targetResourceType: 'Microsoft.Web/sites'
    windowSize: 'PT5M'
  }
}

output applicationName string = app.name
output applicationDefaultHostname string = app.properties.defaultHostName
output candidateHostname string = deployCandidateSlot ? '${appName}-candidate.azurewebsites.net' : ''
output keyVaultName string = keyVault.name
output storageAccountName string = storage.name
output sqlServerFullyQualifiedDomainName string = sqlServer.properties.fullyQualifiedDomainName
output sqlDatabaseName string = sqlDatabase.name
output appManagedIdentityPrincipalId string = app.identity.principalId
output candidateManagedIdentityPrincipalId string = deployCandidateSlot ? candidateSlot.identity.principalId : ''
output appInsightsName string = appInsights.name
output logAnalyticsWorkspaceName string = logWorkspace.name
