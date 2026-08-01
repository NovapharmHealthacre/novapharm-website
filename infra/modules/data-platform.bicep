targetScope = 'resourceGroup'

@allowed([
  'dev'
  'stg'
  'prod'
])
@description('Short environment code used in resource names and retention policy.')
param environmentCode string

@description('Azure region for the data and observability platform.')
param location string

@description('Stable lowercase prefix for globally named resources.')
@minLength(3)
@maxLength(12)
param namePrefix string

@description('Resource tags inherited from the estate deployment.')
param tags object

@description('Object ID of the approved Microsoft Entra group that administers Azure SQL.')
param sqlEntraAdminObjectId string

@description('Display name of the approved Microsoft Entra group that administers Azure SQL.')
param sqlEntraAdminLogin string

@description('Azure SQL service objective.')
param sqlSkuName string = 'GP_S_Gen5_1'

@description('Azure SQL SKU tier.')
param sqlSkuTier string = 'GeneralPurpose'

@description('Azure SQL vCore capacity.')
@minValue(1)
param sqlCapacity int = 1

@description('Minimum serverless vCores supported by the selected SKU.')
@minValue(1)
param sqlMinCapacity int = 1

@description('Serverless auto-pause delay in minutes. Use -1 to disable it for production.')
param sqlAutoPauseDelay int = 60

@description('Create isolated candidate data resources for deployment-slot acceptance.')
param deployCandidateResources bool = false

@description('Temporarily trusted IPv4 address or CIDR used only while an owner seeds Key Vault.')
param keyVaultBootstrapIpCidr string = ''

@description('Enable private endpoints and private DNS for Key Vault, Blob Storage and Azure SQL.')
param enablePrivateNetworking bool = true

@description('Enable paid Defender for Storage malware scanning only after explicit approval.')
param enableDefenderForStorage bool = false

@description('Monthly Defender malware scanning cap in GB.')
@minValue(1)
param malwareScanCapGB int = 50

@description('Log Analytics retention in days.')
@minValue(30)
param logRetentionDays int = 90

var normalisedPrefix = toLower(replace(namePrefix, '-', ''))
var compactSuffix = take(uniqueString(subscription().subscriptionId, resourceGroup().id, environmentCode), 6)
var resourceStem = '${namePrefix}-${environmentCode}'
var apiKeyVaultName = take('${normalisedPrefix}${environmentCode}akv${compactSuffix}', 24)
var portalKeyVaultName = take('${normalisedPrefix}${environmentCode}pkv${compactSuffix}', 24)
var storageName = take('${normalisedPrefix}${environmentCode}st${compactSuffix}', 24)
var sqlServerName = take('${normalisedPrefix}-${environmentCode}-sql-${compactSuffix}', 63)
var sqlDatabaseName = 'novapharm-${environmentCode}'
var candidateDatabaseName = 'novapharm-${environmentCode}-candidate'
var logWorkspaceName = '${resourceStem}-logs'
var appInsightsName = '${resourceStem}-insights'
var vnetName = '${resourceStem}-vnet'

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

resource vnet 'Microsoft.Network/virtualNetworks@2024-05-01' = if (enablePrivateNetworking) {
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

resource secureAppSubnet 'Microsoft.Network/virtualNetworks/subnets@2024-05-01' = if (enablePrivateNetworking) {
  parent: vnet
  name: 'secure-app-integration'
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

resource privateEndpointSubnet 'Microsoft.Network/virtualNetworks/subnets@2024-05-01' = if (enablePrivateNetworking) {
  parent: vnet
  name: 'private-endpoints'
  properties: {
    addressPrefix: '10.42.2.0/24'
    privateEndpointNetworkPolicies: 'Disabled'
  }
}

resource blobPrivateDnsZone 'Microsoft.Network/privateDnsZones@2024-06-01' = if (enablePrivateNetworking) {
  name: 'privatelink.blob.${environment().suffixes.storage}'
  location: 'global'
  tags: tags
}

resource sqlPrivateDnsZone 'Microsoft.Network/privateDnsZones@2024-06-01' = if (enablePrivateNetworking) {
  name: 'privatelink${environment().suffixes.sqlServerHostname}'
  location: 'global'
  tags: tags
}

resource vaultPrivateDnsZone 'Microsoft.Network/privateDnsZones@2024-06-01' = if (enablePrivateNetworking) {
  name: 'privatelink.vaultcore.azure.net'
  location: 'global'
  tags: tags
}

resource blobDnsLink 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2024-06-01' = if (enablePrivateNetworking) {
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

resource sqlDnsLink 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2024-06-01' = if (enablePrivateNetworking) {
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

resource vaultDnsLink 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2024-06-01' = if (enablePrivateNetworking) {
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

resource apiKeyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: apiKeyVaultName
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
    publicNetworkAccess: enablePrivateNetworking && empty(keyVaultBootstrapIpCidr) ? 'Disabled' : 'Enabled'
    networkAcls: {
      bypass: 'AzureServices'
      defaultAction: enablePrivateNetworking ? 'Deny' : 'Allow'
      ipRules: empty(keyVaultBootstrapIpCidr) ? [] : [
        {
          value: keyVaultBootstrapIpCidr
        }
      ]
    }
  }
}

resource portalKeyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: portalKeyVaultName
  location: location
  tags: union(tags, {
    secretBoundary: 'portal'
  })
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
    publicNetworkAccess: enablePrivateNetworking && empty(keyVaultBootstrapIpCidr) ? 'Disabled' : 'Enabled'
    networkAcls: {
      bypass: 'AzureServices'
      defaultAction: enablePrivateNetworking ? 'Deny' : 'Allow'
      ipRules: empty(keyVaultBootstrapIpCidr) ? [] : [
        {
          value: keyVaultBootstrapIpCidr
        }
      ]
    }
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
    publicNetworkAccess: enablePrivateNetworking ? 'Disabled' : 'Enabled'
    networkAcls: {
      bypass: 'AzureServices'
      defaultAction: enablePrivateNetworking ? 'Deny' : 'Allow'
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

resource candidateUploadsQuarantine 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = if (deployCandidateResources) {
  parent: blobService
  name: 'candidate-uploads-quarantine'
  properties: {
    publicAccess: 'None'
  }
}

resource candidateDocumentsPrivate 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = if (deployCandidateResources) {
  parent: blobService
  name: 'candidate-documents-private'
  properties: {
    publicAccess: 'None'
  }
}

resource storageLifecycle 'Microsoft.Storage/storageAccounts/managementPolicies@2023-05-01' = {
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
          enabled: deployCandidateResources
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
    publicNetworkAccess: enablePrivateNetworking ? 'Disabled' : 'Enabled'
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

resource candidateSqlDatabase 'Microsoft.Sql/servers/databases@2023-08-01' = if (deployCandidateResources) {
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

resource candidateSqlShortTermRetention 'Microsoft.Sql/servers/databases/backupShortTermRetentionPolicies@2023-08-01' = if (deployCandidateResources) {
  parent: candidateSqlDatabase
  name: 'default'
  properties: {
    diffBackupIntervalInHours: 12
    retentionDays: 14
  }
}

resource apiVaultPrivateEndpoint 'Microsoft.Network/privateEndpoints@2024-05-01' = if (enablePrivateNetworking) {
  name: '${resourceStem}-api-vault-pe'
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
          privateLinkServiceId: apiKeyVault.id
          groupIds: [
            'vault'
          ]
        }
      }
    ]
  }
}

resource portalVaultPrivateEndpoint 'Microsoft.Network/privateEndpoints@2024-05-01' = if (enablePrivateNetworking) {
  name: '${resourceStem}-portal-vault-pe'
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
          privateLinkServiceId: portalKeyVault.id
          groupIds: [
            'vault'
          ]
        }
      }
    ]
  }
}

resource blobPrivateEndpoint 'Microsoft.Network/privateEndpoints@2024-05-01' = if (enablePrivateNetworking) {
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

resource sqlPrivateEndpoint 'Microsoft.Network/privateEndpoints@2024-05-01' = if (enablePrivateNetworking) {
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

resource apiVaultPrivateDnsGroup 'Microsoft.Network/privateEndpoints/privateDnsZoneGroups@2024-05-01' = if (enablePrivateNetworking) {
  parent: apiVaultPrivateEndpoint
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

resource portalVaultPrivateDnsGroup 'Microsoft.Network/privateEndpoints/privateDnsZoneGroups@2024-05-01' = if (enablePrivateNetworking) {
  parent: portalVaultPrivateEndpoint
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

resource blobPrivateDnsGroup 'Microsoft.Network/privateEndpoints/privateDnsZoneGroups@2024-05-01' = if (enablePrivateNetworking) {
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

resource sqlPrivateDnsGroup 'Microsoft.Network/privateEndpoints/privateDnsZoneGroups@2024-05-01' = if (enablePrivateNetworking) {
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

output apiKeyVaultName string = apiKeyVault.name
output apiKeyVaultId string = apiKeyVault.id
output portalKeyVaultName string = portalKeyVault.name
output portalKeyVaultId string = portalKeyVault.id
output storageAccountName string = storage.name
output storageAccountId string = storage.id
output uploadsQuarantineContainerName string = uploadsQuarantine.name
output documentsPrivateContainerName string = documentsPrivate.name
output candidateUploadsQuarantineContainerName string = deployCandidateResources ? candidateUploadsQuarantine!.name : ''
output candidateDocumentsPrivateContainerName string = deployCandidateResources ? candidateDocumentsPrivate!.name : ''
output sqlServerName string = sqlServer.name
output sqlServerFullyQualifiedDomainName string = sqlServer.properties.fullyQualifiedDomainName
output sqlDatabaseName string = sqlDatabase.name
output candidateSqlDatabaseName string = deployCandidateResources ? candidateSqlDatabase!.name : ''
output secureAppSubnetId string = enablePrivateNetworking ? secureAppSubnet!.id : ''
output applicationInsightsConnectionString string = appInsights.properties.ConnectionString
output applicationInsightsName string = appInsights.name
output logAnalyticsWorkspaceId string = logWorkspace.id
output logAnalyticsWorkspaceName string = logWorkspace.name
