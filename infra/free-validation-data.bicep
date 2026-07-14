targetScope = 'resourceGroup'

@description('Azure region confirmed to support the Azure SQL Database free offer for this subscription.')
param location string = resourceGroup().location

@description('Stable lowercase prefix for globally named resources.')
@minLength(3)
@maxLength(12)
param namePrefix string = 'novapharm'

@description('Object ID of the approved Microsoft Entra group that administers this synthetic validation database.')
param sqlEntraAdminObjectId string

@description('Display name of the approved Microsoft Entra SQL administrator group.')
param sqlEntraAdminLogin string

@description('Email receiver for the free-compute remaining alert. Use an approved validation operations mailbox.')
param operationsEmail string

var environmentCode = 'poc'
var uniqueSuffix = uniqueString(subscription().subscriptionId, resourceGroup().id, environmentCode)
var compactSuffix = take(uniqueSuffix, 6)
var resourceStem = '${namePrefix}-${environmentCode}'
var sqlServerName = take('${resourceStem}-sql-${compactSuffix}', 63)
var sqlDatabaseName = 'novapharm-${environmentCode}'

var tags = {
  application: 'NovaPharm Digital Platform'
  environment: 'free-validation'
  owner: 'NovaPharm Healthcare Ltd'
  managedBy: 'Bicep'
  dataClassification: 'Synthetic validation data only'
  costPolicy: 'Zero out-of-pocket'
}

resource sqlServer 'Microsoft.Sql/servers@2025-01-01' = {
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
    publicNetworkAccess: 'Enabled'
    version: '12.0'
  }
}

// F1 has no VNet integration. This validation-only server therefore accepts
// Azure-origin connections, while Entra-only authentication remains mandatory.
resource allowAzureServices 'Microsoft.Sql/servers/firewallRules@2023-08-01' = {
  parent: sqlServer
  name: 'AllowAzureServicesForSyntheticValidation'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

resource sqlDatabase 'Microsoft.Sql/servers/databases@2025-01-01' = {
  parent: sqlServer
  name: sqlDatabaseName
  location: location
  tags: tags
  sku: {
    name: 'GP_S_Gen5_2'
    tier: 'GeneralPurpose'
    capacity: 2
    family: 'Gen5'
  }
  properties: {
    autoPauseDelay: 60
    catalogCollation: 'SQL_Latin1_General_CP1_CI_AS'
    collation: 'SQL_Latin1_General_CP1_CI_AS'
    freeLimitExhaustionBehavior: 'AutoPause'
    maxSizeBytes: 34359738368
    readScale: 'Disabled'
    requestedBackupStorageRedundancy: 'Local'
    useFreeLimit: true
    zoneRedundant: false
  }
}

resource freeUsageActionGroup 'Microsoft.Insights/actionGroups@2023-01-01' = {
  name: '${resourceStem}-free-usage'
  location: 'global'
  tags: tags
  properties: {
    enabled: true
    groupShortName: 'NPFreePOC'
    emailReceivers: [
      {
        name: 'Validation operations'
        emailAddress: operationsEmail
        useCommonAlertSchema: true
      }
    ]
  }
}

resource freeComputeRemainingAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: '${resourceStem}-sql-free-compute-10-percent'
  location: 'global'
  tags: tags
  properties: {
    description: 'Warn when the Azure SQL free offer has approximately ten percent of its monthly vCore-seconds remaining.'
    severity: 2
    enabled: true
    scopes: [
      sqlDatabase.id
    ]
    evaluationFrequency: 'PT1H'
    windowSize: 'PT6H'
    autoMitigate: true
    targetResourceType: 'Microsoft.Sql/servers/databases'
    targetResourceRegion: location
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          criterionType: 'StaticThresholdCriterion'
          name: 'FreeAmountRemainingBelowTenPercent'
          metricName: 'free_amount_remaining'
          metricNamespace: 'Microsoft.Sql/servers/databases'
          operator: 'LessThanOrEqual'
          threshold: 10000
          timeAggregation: 'Minimum'
          skipMetricValidation: false
        }
      ]
    }
    actions: [
      {
        actionGroupId: freeUsageActionGroup.id
      }
    ]
  }
}

output sqlServerName string = sqlServer.name
output sqlServerFullyQualifiedDomainName string = sqlServer.properties.fullyQualifiedDomainName
output sqlDatabaseName string = sqlDatabase.name
output sqlDatabaseId string = sqlDatabase.id
output freeLimitExhaustionBehavior string = sqlDatabase.properties.freeLimitExhaustionBehavior
output useFreeLimit bool = sqlDatabase.properties.useFreeLimit
