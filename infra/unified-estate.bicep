targetScope = 'resourceGroup'

@allowed([
  'dev'
  'stg'
  'prod'
])
@description('Short environment code used in resource names.')
param environmentCode string

@description('Azure region selected after data-residency, service-availability and cost review.')
param location string = resourceGroup().location

@description('Stable lowercase prefix for globally named resources.')
@minLength(3)
@maxLength(12)
param namePrefix string = 'novapharm'

@description('Immutable source revision deployed to this environment.')
param releaseVersion string = 'unassigned'

@description('Corporate website origin. Leave blank outside production to use the generated Azure hostname.')
param corporateOrigin string = ''

@description('Innovation and Technology website origin. Leave blank outside production to use the generated Azure hostname.')
param technologyOrigin string = ''

@description('Founder website origin. Leave blank outside production to use the generated Azure hostname.')
param founderOrigin string = ''

@description('Secure portal origin. Leave blank outside production to use the generated Azure hostname.')
param portalOrigin string = ''

@description('Application API origin. Leave blank outside production to use the generated Azure hostname.')
param apiOrigin string = ''

@description('Public status service origin. Leave blank outside production to use the generated Azure hostname.')
param statusOrigin string = ''

@description('Provision Azure Front Door managed custom domains after owner-controlled DNS validation.')
param enableEdgeCustomDomains bool = false

@description('Enable priority-based failover only after a second regional application estate has passed acceptance.')
param enableRegionalFailover bool = false

@description('Canonical corporate hostname for Azure Front Door.')
param corporateCustomHostname string = 'novapharmhealthcare.com'

@description('Alternate corporate hostname redirected or routed through Azure Front Door.')
param corporateAlternateHostname string = 'www.novapharmhealthcare.com'

@description('Canonical Innovation and Technology hostname for Azure Front Door.')
param technologyCustomHostname string = 'nit.novapharmhealthcare.com'

@description('Canonical founder hostname for Azure Front Door.')
param founderCustomHostname string = 'vishal.novapharmhealthcare.com'

@description('Canonical portal hostname for Azure Front Door.')
param portalCustomHostname string = 'portal.novapharmhealthcare.com'

@description('Canonical API hostname for Azure Front Door.')
param apiCustomHostname string = 'api.novapharmhealthcare.com'

@description('Canonical status hostname for Azure Front Door.')
param statusCustomHostname string = 'status.novapharmhealthcare.com'

@description('Optional accepted secondary-region corporate App Service hostname.')
param secondaryCorporateHostName string = ''

@description('Optional accepted secondary-region Innovation and Technology App Service hostname.')
param secondaryTechnologyHostName string = ''

@description('Optional accepted secondary-region founder App Service hostname.')
param secondaryFounderHostName string = ''

@description('Optional accepted secondary-region portal App Service hostname.')
param secondaryPortalHostName string = ''

@description('Optional accepted secondary-region API App Service hostname.')
param secondaryApiHostName string = ''

@description('Optional accepted secondary-region status App Service hostname.')
param secondaryStatusHostName string = ''

@description('Global Azure Front Door per-client request threshold per minute.')
@minValue(60)
param globalRateLimitPerMinute int = 1200

@description('Azure Front Door per-client request threshold for authentication and account workflows.')
@minValue(10)
param sensitiveRateLimitPerMinute int = 120

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

@description('Serverless auto-pause delay. Use -1 for an approved permanent production service.')
param sqlAutoPauseDelay int = 60

@description('Public App Service plan SKU. Linux P0v4 is the UK South baseline because the SKU family supports slots and private networking; subscription-level aggregate capacity remains an external deployment gate.')
param publicAppServiceSkuName string = 'P0v4'

@description('Public App Service plan tier.')
param publicAppServiceSkuTier string = 'PremiumV4'

@description('Secure portal and API App Service plan SKU. Subscription-level aggregate capacity remains an external deployment gate.')
param secureAppServiceSkuName string = 'P0v4'

@description('Secure portal and API App Service plan tier.')
param secureAppServiceSkuTier string = 'PremiumV4'

@description('Worker count for each plan.')
@minValue(1)
param workerCount int = 1

@description('Create isolated candidate slots and candidate data resources. Requires Standard App Service plans or better.')
param deployCandidateSlots bool = false

@description('Enable private endpoints for the application data plane.')
param enablePrivateNetworking bool = true

@description('Temporarily trusted IPv4 address or CIDR used only while an owner seeds Key Vault.')
param keyVaultBootstrapIpCidr string = ''

@description('Enable Microsoft Entra App Service Authentication for the secure portal after registration approval.')
param enableEntraAuthentication bool = false

@description('Microsoft Entra workforce tenant ID.')
param entraTenantId string = tenant().tenantId

@description('Microsoft Entra application client ID used by the secure portal.')
param entraClientId string = ''

@description('Optional Microsoft Entra External ID tenant used to classify approved customer identities.')
param entraExternalTenantId string = ''

@description('Object ID of the NovaPharm administrator group mapped to admin scope.')
param entraAdminGroupId string = ''

@description('Object ID of the NovaPharm board group mapped to board scope.')
param entraBoardGroupId string = ''

@description('Object ID of the NovaPharm employee group mapped to employee scope.')
param entraEmployeeGroupId string = ''

@description('Optional approved customer group. Every customer still requires an active SQL account mapping.')
param entraCustomerGroupId string = ''

@description('Key Vault secret name containing the Entra relying-party credential.')
param entraClientSecretName string = 'entra-client-secret'

@description('Key Vault secret name containing the production session signing secret.')
param sessionSecretName string = 'session-secret'

@description('Key Vault secret name containing the candidate session signing secret.')
param candidateSessionSecretName string = 'candidate-session-secret'

@description('Key Vault secret shared only by the portal gateway and API verifier.')
param portalGatewaySecretName string = 'portal-gateway-secret'

@description('Key Vault secret shared only by candidate portal and API identities.')
param candidatePortalGatewaySecretName string = 'candidate-portal-gateway-secret'

@description('Temporarily expose the one-time administrator bootstrap secret to the API.')
param enableBootstrapAdmin bool = false

@description('Key Vault secret name containing the one-time administrator bootstrap password.')
param bootstrapAdminPasswordSecretName string = 'bootstrap-admin-password'

@description('Key Vault secret name containing the candidate-only bootstrap password.')
param candidateBootstrapAdminPasswordSecretName string = 'candidate-bootstrap-admin-password'

@description('Enable paid Defender for Storage only after explicit owner approval.')
param enableDefenderForStorage bool = false

@description('Monthly malware scanning cap in GB.')
@minValue(1)
param malwareScanCapGB int = 50

@description('Operations email used for critical Azure Monitor alerts.')
param operationsEmail string = ''

@description('Transactional email sender address. This is not a credential.')
param emailFrom string = ''

@description('Internal destination for contact notifications. This is not a credential.')
param contactNotificationTo string = ''

@allowed([
  'auto'
  'resend'
  'microsoft-graph'
])
@description('Transactional email adapter.')
param emailProvider string = 'auto'

@description('Approved Microsoft 365 sender mailbox for the Graph email adapter.')
param microsoftEmailSender string = ''

@description('SharePoint tenant hostname.')
param sharePointHostname string = ''

@description('Server-relative SharePoint site path.')
param sharePointSitePath string = ''

@description('Approved SharePoint document-library drive ID.')
param sharePointDriveId string = ''

@description('Controlled Executive Platform folder path.')
param sharePointExecutivePlatformPath string = ''

@description('Log Analytics retention in days.')
@minValue(30)
param logRetentionDays int = 90

var normalisedPrefix = toLower(replace(namePrefix, '-', ''))
var compactSuffix = take(uniqueString(subscription().subscriptionId, resourceGroup().id, environmentCode), 6)
var resourceStem = '${namePrefix}-${environmentCode}'
var apiKeyVaultName = take('${normalisedPrefix}${environmentCode}akv${compactSuffix}', 24)
var portalKeyVaultName = take('${normalisedPrefix}${environmentCode}pkv${compactSuffix}', 24)
var storageAccountName = take('${normalisedPrefix}${environmentCode}st${compactSuffix}', 24)
var publicPlanName = '${resourceStem}-public-plan'
var securePlanName = '${resourceStem}-secure-plan'
var corporateAppName = take('${resourceStem}-corporate-${compactSuffix}', 60)
var technologyAppName = take('${resourceStem}-technology-${compactSuffix}', 60)
var founderAppName = take('${resourceStem}-founder-${compactSuffix}', 60)
var portalAppName = take('${resourceStem}-portal-${compactSuffix}', 60)
var apiAppName = take('${resourceStem}-api-${compactSuffix}', 60)
var statusAppName = take('${resourceStem}-status-${compactSuffix}', 60)
var frontDoorProfileName = '${resourceStem}-edge'
var frontDoorWafPolicyName = '${resourceStem}-edge-waf'

var resolvedCorporateOrigin = empty(corporateOrigin) ? 'https://${corporateAppName}.azurewebsites.net' : corporateOrigin
var resolvedTechnologyOrigin = empty(technologyOrigin) ? 'https://${technologyAppName}.azurewebsites.net' : technologyOrigin
var resolvedFounderOrigin = empty(founderOrigin) ? 'https://${founderAppName}.azurewebsites.net' : founderOrigin
var resolvedPortalOrigin = empty(portalOrigin) ? 'https://${portalAppName}.azurewebsites.net' : portalOrigin
var resolvedApiOrigin = empty(apiOrigin) ? 'https://${apiAppName}.azurewebsites.net' : apiOrigin
var resolvedStatusOrigin = empty(statusOrigin) ? 'https://${statusAppName}.azurewebsites.net' : statusOrigin

var candidateCorporateOrigin = 'https://${corporateAppName}-candidate.azurewebsites.net'
var candidateTechnologyOrigin = 'https://${technologyAppName}-candidate.azurewebsites.net'
var candidateFounderOrigin = 'https://${founderAppName}-candidate.azurewebsites.net'
var candidatePortalOrigin = 'https://${portalAppName}-candidate.azurewebsites.net'
var candidateApiOrigin = 'https://${apiAppName}-candidate.azurewebsites.net'
var candidateStatusOrigin = 'https://${statusAppName}-candidate.azurewebsites.net'

var tags = {
  application: 'NovaPharm Unified Digital Estate'
  environment: environmentCode
  owner: 'NovaPharm Healthcare Ltd'
  managedBy: 'Bicep'
  dataClassification: 'Confidential'
  sourceRevision: releaseVersion
}

resource publicAppServicePlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: publicPlanName
  location: location
  kind: 'linux'
  tags: tags
  sku: {
    name: publicAppServiceSkuName
    tier: publicAppServiceSkuTier
    capacity: workerCount
  }
  properties: {
    reserved: true
    zoneRedundant: false
  }
}

resource secureAppServicePlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: securePlanName
  location: location
  kind: 'linux'
  tags: tags
  sku: {
    name: secureAppServiceSkuName
    tier: secureAppServiceSkuTier
    capacity: workerCount
  }
  properties: {
    reserved: true
    zoneRedundant: false
  }
}

module dataPlatform './modules/data-platform.bicep' = {
  name: 'data-platform'
  params: {
    environmentCode: environmentCode
    location: location
    namePrefix: namePrefix
    tags: tags
    sqlEntraAdminObjectId: sqlEntraAdminObjectId
    sqlEntraAdminLogin: sqlEntraAdminLogin
    sqlSkuName: sqlSkuName
    sqlSkuTier: sqlSkuTier
    sqlCapacity: sqlCapacity
    sqlMinCapacity: sqlMinCapacity
    sqlAutoPauseDelay: sqlAutoPauseDelay
    deployCandidateResources: deployCandidateSlots
    keyVaultBootstrapIpCidr: keyVaultBootstrapIpCidr
    enablePrivateNetworking: enablePrivateNetworking
    enableDefenderForStorage: enableDefenderForStorage
    malwareScanCapGB: malwareScanCapGB
    logRetentionDays: logRetentionDays
  }
}

module edgeCore './modules/front-door-core.bicep' = {
  name: 'front-door-core'
  params: {
    profileName: frontDoorProfileName
    wafPolicyName: frontDoorWafPolicyName
    tags: union(tags, { component: 'edge' })
    logAnalyticsWorkspaceId: dataPlatform.outputs.logAnalyticsWorkspaceId
    operationsEmail: operationsEmail
    globalRateLimitPerMinute: globalRateLimitPerMinute
    sensitiveRateLimitPerMinute: sensitiveRateLimitPerMinute
  }
}

var nextBaseSettings = {
  NODE_ENV: 'production'
  HOSTNAME: '0.0.0.0'
  APP_VERSION: releaseVersion
  APPLICATIONINSIGHTS_CONNECTION_STRING: dataPlatform.outputs.applicationInsightsConnectionString
  SCM_DO_BUILD_DURING_DEPLOYMENT: 'false'
  WEBSITE_NODE_DEFAULT_VERSION: '~24'
  WEBSITE_RUN_FROM_PACKAGE: '1'
}

var candidatePublicSettings = {
  PUBLIC_INDEXABLE: 'false'
  PREVIEW_LABEL: 'Non-production Azure candidate'
}

module corporateApp './modules/web-app.bicep' = {
  name: 'corporate-application'
  params: {
    appName: corporateAppName
    location: location
    appServicePlanId: publicAppServicePlan.id
    tags: union(tags, { component: 'corporate' })
    appCommandLine: 'node apps/corporate/server.js'
    healthCheckPath: '/'
    appSettings: union(nextBaseSettings, {
      PUBLIC_ORIGIN: resolvedCorporateOrigin
      PUBLIC_API_ORIGIN: resolvedApiOrigin
      PORTAL_ORIGIN: resolvedPortalOrigin
      STATUS_ORIGIN: resolvedStatusOrigin
      PUBLIC_INDEXABLE: string(environmentCode == 'prod')
    })
    deployCandidateSlot: deployCandidateSlots
    candidateAppSettings: union(candidatePublicSettings, {
      PUBLIC_ORIGIN: candidateCorporateOrigin
      PUBLIC_API_ORIGIN: candidateApiOrigin
      PORTAL_ORIGIN: candidatePortalOrigin
      STATUS_ORIGIN: candidateStatusOrigin
    })
    slotSettingNames: [
      'PUBLIC_ORIGIN'
      'PUBLIC_API_ORIGIN'
      'PORTAL_ORIGIN'
      'STATUS_ORIGIN'
      'PUBLIC_INDEXABLE'
      'PREVIEW_LABEL'
    ]
    alwaysOn: true
    logAnalyticsWorkspaceId: dataPlatform.outputs.logAnalyticsWorkspaceId
    frontDoorId: edgeCore.outputs.frontDoorId
    restrictOriginToFrontDoor: true
  }
}

module technologyApp './modules/web-app.bicep' = {
  name: 'technology-application'
  params: {
    appName: technologyAppName
    location: location
    appServicePlanId: publicAppServicePlan.id
    tags: union(tags, { component: 'technology' })
    appCommandLine: 'node apps/technology/server.js'
    healthCheckPath: '/'
    appSettings: union(nextBaseSettings, {
      PUBLIC_ORIGIN: resolvedTechnologyOrigin
      PUBLIC_INDEXABLE: string(environmentCode == 'prod')
    })
    deployCandidateSlot: deployCandidateSlots
    candidateAppSettings: union(candidatePublicSettings, {
      PUBLIC_ORIGIN: candidateTechnologyOrigin
    })
    slotSettingNames: [
      'PUBLIC_ORIGIN'
      'PUBLIC_INDEXABLE'
      'PREVIEW_LABEL'
    ]
    alwaysOn: true
    logAnalyticsWorkspaceId: dataPlatform.outputs.logAnalyticsWorkspaceId
    frontDoorId: edgeCore.outputs.frontDoorId
    restrictOriginToFrontDoor: true
  }
}

module founderApp './modules/web-app.bicep' = {
  name: 'founder-application'
  params: {
    appName: founderAppName
    location: location
    appServicePlanId: publicAppServicePlan.id
    tags: union(tags, { component: 'founder' })
    appCommandLine: 'node apps/founder/server.js'
    healthCheckPath: '/'
    appSettings: union(nextBaseSettings, {
      PUBLIC_ORIGIN: resolvedFounderOrigin
      PUBLIC_INDEXABLE: string(environmentCode == 'prod')
    })
    deployCandidateSlot: deployCandidateSlots
    candidateAppSettings: union(candidatePublicSettings, {
      PUBLIC_ORIGIN: candidateFounderOrigin
    })
    slotSettingNames: [
      'PUBLIC_ORIGIN'
      'PUBLIC_INDEXABLE'
      'PREVIEW_LABEL'
    ]
    alwaysOn: true
    logAnalyticsWorkspaceId: dataPlatform.outputs.logAnalyticsWorkspaceId
    frontDoorId: edgeCore.outputs.frontDoorId
    restrictOriginToFrontDoor: true
  }
}

var portalSettings = union(nextBaseSettings, {
  PUBLIC_ORIGIN: resolvedPortalOrigin
  PORTAL_ORIGIN: resolvedPortalOrigin
  PUBLIC_API_ORIGIN: resolvedApiOrigin
  INTERNAL_API_ORIGIN: resolvedApiOrigin
  NEXT_PUBLIC_ENTRA_LOGIN_ENABLED: string(enableEntraAuthentication)
  PORTAL_GATEWAY_SECRET: '@Microsoft.KeyVault(VaultName=${dataPlatform.outputs.portalKeyVaultName};SecretName=${portalGatewaySecretName})'
}, enableEntraAuthentication ? {
  ENTRA_CLIENT_SECRET: '@Microsoft.KeyVault(VaultName=${dataPlatform.outputs.portalKeyVaultName};SecretName=${entraClientSecretName})'
} : {})

module portalApp './modules/web-app.bicep' = {
  name: 'portal-application'
  params: {
    appName: portalAppName
    location: location
    appServicePlanId: secureAppServicePlan.id
    tags: union(tags, { component: 'portal' })
    appCommandLine: 'node apps/portal/server.js'
    healthCheckPath: '/'
    appSettings: portalSettings
    deployCandidateSlot: deployCandidateSlots
    candidateAppSettings: {
      PUBLIC_ORIGIN: candidatePortalOrigin
      PORTAL_ORIGIN: candidatePortalOrigin
      PUBLIC_API_ORIGIN: candidateApiOrigin
      INTERNAL_API_ORIGIN: candidateApiOrigin
      PORTAL_GATEWAY_SECRET: '@Microsoft.KeyVault(VaultName=${dataPlatform.outputs.portalKeyVaultName};SecretName=${candidatePortalGatewaySecretName})'
      PREVIEW_LABEL: 'Non-production Azure candidate'
    }
    slotSettingNames: [
      'PUBLIC_ORIGIN'
      'PORTAL_ORIGIN'
      'PUBLIC_API_ORIGIN'
      'INTERNAL_API_ORIGIN'
      'PORTAL_GATEWAY_SECRET'
      'ENTRA_CLIENT_SECRET'
      'PREVIEW_LABEL'
    ]
    alwaysOn: true
    virtualNetworkSubnetId: dataPlatform.outputs.secureAppSubnetId
    enableEntraAuthentication: enableEntraAuthentication
    entraTenantId: entraTenantId
    entraClientId: entraClientId
    logAnalyticsWorkspaceId: dataPlatform.outputs.logAnalyticsWorkspaceId
    frontDoorId: edgeCore.outputs.frontDoorId
    restrictOriginToFrontDoor: true
  }
}

var apiSettings = union({
  NODE_ENV: 'production'
  HOST: '0.0.0.0'
  APP_VERSION: releaseVersion
  NOVAPHARM_SERVER_MODE: 'api-only'
  PLATFORM_MODE: 'FULL_PLATFORM'
  SITE_URL: resolvedCorporateOrigin
  PUBLIC_ORIGIN: resolvedCorporateOrigin
  PUBLIC_API_ORIGIN: resolvedApiOrigin
  PORTAL_ORIGIN: resolvedPortalOrigin
  ALLOWED_ORIGINS: join([
    resolvedCorporateOrigin
    resolvedTechnologyOrigin
    resolvedFounderOrigin
    resolvedPortalOrigin
  ], ',')
  SECURE_CONTENT_ROOT: '/home/site/wwwroot/_secure'
  DATABASE_PROVIDER: 'azure-sql'
  AZURE_SQL_SERVER: dataPlatform.outputs.sqlServerFullyQualifiedDomainName
  AZURE_SQL_DATABASE: dataPlatform.outputs.sqlDatabaseName
  AZURE_SQL_AUTHENTICATION: 'managed-identity'
  AZURE_SQL_RUN_MIGRATIONS: 'false'
  DOCUMENT_STORAGE_PROVIDER: 'azure-blob'
  AZURE_STORAGE_ACCOUNT_NAME: dataPlatform.outputs.storageAccountName
  AZURE_STORAGE_QUARANTINE_CONTAINER: dataPlatform.outputs.uploadsQuarantineContainerName
  AZURE_STORAGE_PRIVATE_CONTAINER: dataPlatform.outputs.documentsPrivateContainerName
  APPLICATIONINSIGHTS_CONNECTION_STRING: dataPlatform.outputs.applicationInsightsConnectionString
  SESSION_SECRET: '@Microsoft.KeyVault(VaultName=${dataPlatform.outputs.apiKeyVaultName};SecretName=${sessionSecretName})'
  SESSION_TTL_MS: '28800000'
  SESSION_IDLE_TIMEOUT_MS: '1800000'
  PORTAL_GATEWAY_SECRET: '@Microsoft.KeyVault(VaultName=${dataPlatform.outputs.apiKeyVaultName};SecretName=${portalGatewaySecretName})'
  PREVIEW_MODE: 'false'
  EMAIL_FROM: emailFrom
  CONTACT_NOTIFICATION_TO: contactNotificationTo
  EMAIL_PROVIDER: emailProvider
  MICROSOFT_EMAIL_SENDER: microsoftEmailSender
  APPLICATION_UPLOAD_TOKEN_TTL_MS: '1800000'
  APPLICATION_RESUME_TOKEN_TTL_MS: '86400000'
  ENTRA_AUTH_ENABLED: string(enableEntraAuthentication)
  ENTRA_EXTERNAL_TENANT_ID: entraExternalTenantId
  ENTRA_ADMIN_GROUP_ID: entraAdminGroupId
  ENTRA_BOARD_GROUP_ID: entraBoardGroupId
  ENTRA_EMPLOYEE_GROUP_ID: entraEmployeeGroupId
  ENTRA_CUSTOMER_GROUP_ID: entraCustomerGroupId
  MICROSOFT_GRAPH_AUTH_MODE: 'managed-identity'
  MICROSOFT_TENANT_ID: entraTenantId
  SHAREPOINT_HOSTNAME: sharePointHostname
  SHAREPOINT_SITE_PATH: sharePointSitePath
  SHAREPOINT_DRIVE_ID: sharePointDriveId
  SHAREPOINT_EXECUTIVE_PLATFORM_PATH: sharePointExecutivePlatformPath
  SCM_DO_BUILD_DURING_DEPLOYMENT: 'false'
  WEBSITE_NODE_DEFAULT_VERSION: '~24'
  WEBSITE_RUN_FROM_PACKAGE: '1'
}, emailProvider == 'resend' ? {
  RESEND_API_KEY: '@Microsoft.KeyVault(VaultName=${dataPlatform.outputs.apiKeyVaultName};SecretName=resend-api-key)'
} : {}, enableBootstrapAdmin ? {
  PORTAL_USERNAME: 'Vishal'
  PORTAL_DISPLAY_NAME: 'Vishal Chakravarty'
  BOOTSTRAP_ADMIN_PASSWORD: '@Microsoft.KeyVault(VaultName=${dataPlatform.outputs.apiKeyVaultName};SecretName=${bootstrapAdminPasswordSecretName})'
} : {})

module apiApp './modules/web-app.bicep' = {
  name: 'api-application'
  params: {
    appName: apiAppName
    location: location
    appServicePlanId: secureAppServicePlan.id
    tags: union(tags, { component: 'api' })
    appCommandLine: 'node apps/api/dist/server.js'
    healthCheckPath: '/api/health/ready'
    appSettings: apiSettings
    deployCandidateSlot: deployCandidateSlots
    candidateAppSettings: {
      SITE_URL: candidateCorporateOrigin
      PUBLIC_ORIGIN: candidateCorporateOrigin
      PUBLIC_API_ORIGIN: candidateApiOrigin
      PORTAL_ORIGIN: candidatePortalOrigin
      ALLOWED_ORIGINS: join([
        candidateCorporateOrigin
        candidateTechnologyOrigin
        candidateFounderOrigin
        candidatePortalOrigin
      ], ',')
      AZURE_SQL_DATABASE: dataPlatform.outputs.candidateSqlDatabaseName
      AZURE_STORAGE_QUARANTINE_CONTAINER: dataPlatform.outputs.candidateUploadsQuarantineContainerName
      AZURE_STORAGE_PRIVATE_CONTAINER: dataPlatform.outputs.candidateDocumentsPrivateContainerName
      SESSION_SECRET: '@Microsoft.KeyVault(VaultName=${dataPlatform.outputs.apiKeyVaultName};SecretName=${candidateSessionSecretName})'
      PORTAL_GATEWAY_SECRET: '@Microsoft.KeyVault(VaultName=${dataPlatform.outputs.apiKeyVaultName};SecretName=${candidatePortalGatewaySecretName})'
      RESEND_API_KEY: ''
      EMAIL_PROVIDER: 'auto'
      EMAIL_FROM: ''
      CONTACT_NOTIFICATION_TO: ''
      PREVIEW_LABEL: 'Non-production Azure candidate'
      BOOTSTRAP_ADMIN_PASSWORD: enableBootstrapAdmin ? '@Microsoft.KeyVault(VaultName=${dataPlatform.outputs.apiKeyVaultName};SecretName=${candidateBootstrapAdminPasswordSecretName})' : ''
    }
    slotSettingNames: [
      'SITE_URL'
      'PUBLIC_ORIGIN'
      'PUBLIC_API_ORIGIN'
      'PORTAL_ORIGIN'
      'ALLOWED_ORIGINS'
      'AZURE_SQL_DATABASE'
      'AZURE_STORAGE_QUARANTINE_CONTAINER'
      'AZURE_STORAGE_PRIVATE_CONTAINER'
      'SESSION_SECRET'
      'PORTAL_GATEWAY_SECRET'
      'RESEND_API_KEY'
      'EMAIL_PROVIDER'
      'EMAIL_FROM'
      'CONTACT_NOTIFICATION_TO'
      'PREVIEW_LABEL'
      'BOOTSTRAP_ADMIN_PASSWORD'
    ]
    alwaysOn: true
    virtualNetworkSubnetId: dataPlatform.outputs.secureAppSubnetId
    logAnalyticsWorkspaceId: dataPlatform.outputs.logAnalyticsWorkspaceId
    frontDoorId: edgeCore.outputs.frontDoorId
    restrictOriginToFrontDoor: true
  }
}

module statusApp './modules/web-app.bicep' = {
  name: 'status-application'
  params: {
    appName: statusAppName
    location: location
    appServicePlanId: publicAppServicePlan.id
    tags: union(tags, { component: 'status' })
    appCommandLine: 'node apps/status/server.js'
    healthCheckPath: '/api/health/ready'
    appSettings: union(nextBaseSettings, {
      CORPORATE_ORIGIN: resolvedCorporateOrigin
      TECHNOLOGY_ORIGIN: resolvedTechnologyOrigin
      FOUNDER_ORIGIN: resolvedFounderOrigin
      PORTAL_ORIGIN: resolvedPortalOrigin
      PUBLIC_API_ORIGIN: resolvedApiOrigin
    })
    deployCandidateSlot: deployCandidateSlots
    candidateAppSettings: {
      CORPORATE_ORIGIN: candidateCorporateOrigin
      TECHNOLOGY_ORIGIN: candidateTechnologyOrigin
      FOUNDER_ORIGIN: candidateFounderOrigin
      PORTAL_ORIGIN: candidatePortalOrigin
      PUBLIC_API_ORIGIN: candidateApiOrigin
      PREVIEW_LABEL: 'Non-production Azure candidate'
    }
    slotSettingNames: [
      'CORPORATE_ORIGIN'
      'TECHNOLOGY_ORIGIN'
      'FOUNDER_ORIGIN'
      'PORTAL_ORIGIN'
      'PUBLIC_API_ORIGIN'
      'PREVIEW_LABEL'
    ]
    alwaysOn: true
    logAnalyticsWorkspaceId: dataPlatform.outputs.logAnalyticsWorkspaceId
    frontDoorId: edgeCore.outputs.frontDoorId
    restrictOriginToFrontDoor: true
  }
}

module corporateEdge './modules/front-door-application.bicep' = {
  name: 'corporate-edge'
  params: {
    profileName: edgeCore.outputs.profileName
    wafPolicyName: frontDoorWafPolicyName
    applicationCode: 'corporate'
    primaryHostName: corporateApp.outputs.defaultHostname
    candidateHostName: corporateApp.outputs.candidateHostname
    secondaryHostName: secondaryCorporateHostName
    healthPath: '/'
    primaryCustomHostname: corporateCustomHostname
    alternateCustomHostname: corporateAlternateHostname
    enableCustomDomains: enableEdgeCustomDomains
    deployCandidateEndpoint: deployCandidateSlots
    enableRegionalFailover: enableRegionalFailover
    tags: union(tags, { component: 'corporate-edge' })
  }
}

module technologyEdge './modules/front-door-application.bicep' = {
  name: 'technology-edge'
  params: {
    profileName: edgeCore.outputs.profileName
    wafPolicyName: frontDoorWafPolicyName
    applicationCode: 'technology'
    primaryHostName: technologyApp.outputs.defaultHostname
    candidateHostName: technologyApp.outputs.candidateHostname
    secondaryHostName: secondaryTechnologyHostName
    healthPath: '/'
    primaryCustomHostname: technologyCustomHostname
    enableCustomDomains: enableEdgeCustomDomains
    deployCandidateEndpoint: deployCandidateSlots
    enableRegionalFailover: enableRegionalFailover
    tags: union(tags, { component: 'technology-edge' })
  }
}

module founderEdge './modules/front-door-application.bicep' = {
  name: 'founder-edge'
  params: {
    profileName: edgeCore.outputs.profileName
    wafPolicyName: frontDoorWafPolicyName
    applicationCode: 'founder'
    primaryHostName: founderApp.outputs.defaultHostname
    candidateHostName: founderApp.outputs.candidateHostname
    secondaryHostName: secondaryFounderHostName
    healthPath: '/'
    primaryCustomHostname: founderCustomHostname
    enableCustomDomains: enableEdgeCustomDomains
    deployCandidateEndpoint: deployCandidateSlots
    enableRegionalFailover: enableRegionalFailover
    tags: union(tags, { component: 'founder-edge' })
  }
}

module portalEdge './modules/front-door-application.bicep' = {
  name: 'portal-edge'
  params: {
    profileName: edgeCore.outputs.profileName
    wafPolicyName: frontDoorWafPolicyName
    applicationCode: 'portal'
    primaryHostName: portalApp.outputs.defaultHostname
    candidateHostName: portalApp.outputs.candidateHostname
    secondaryHostName: secondaryPortalHostName
    healthPath: '/'
    primaryCustomHostname: portalCustomHostname
    enableCustomDomains: enableEdgeCustomDomains
    deployCandidateEndpoint: deployCandidateSlots
    enableRegionalFailover: enableRegionalFailover
    tags: union(tags, { component: 'portal-edge' })
  }
}

module apiEdge './modules/front-door-application.bicep' = {
  name: 'api-edge'
  params: {
    profileName: edgeCore.outputs.profileName
    wafPolicyName: frontDoorWafPolicyName
    applicationCode: 'api'
    primaryHostName: apiApp.outputs.defaultHostname
    candidateHostName: apiApp.outputs.candidateHostname
    secondaryHostName: secondaryApiHostName
    healthPath: '/api/health/ready'
    primaryCustomHostname: apiCustomHostname
    enableCustomDomains: enableEdgeCustomDomains
    deployCandidateEndpoint: deployCandidateSlots
    enableRegionalFailover: enableRegionalFailover
    tags: union(tags, { component: 'api-edge' })
  }
}

module statusEdge './modules/front-door-application.bicep' = {
  name: 'status-edge'
  params: {
    profileName: edgeCore.outputs.profileName
    wafPolicyName: frontDoorWafPolicyName
    applicationCode: 'status'
    primaryHostName: statusApp.outputs.defaultHostname
    candidateHostName: statusApp.outputs.candidateHostname
    secondaryHostName: secondaryStatusHostName
    healthPath: '/api/health/ready'
    primaryCustomHostname: statusCustomHostname
    enableCustomDomains: enableEdgeCustomDomains
    deployCandidateEndpoint: deployCandidateSlots
    enableRegionalFailover: enableRegionalFailover
    tags: union(tags, { component: 'status-edge' })
  }
}

resource apiKeyVault 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: apiKeyVaultName
}

resource portalKeyVault 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: portalKeyVaultName
}

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' existing = {
  name: storageAccountName
}

var keyVaultSecretsUserRoleId = subscriptionResourceId(
  'Microsoft.Authorization/roleDefinitions',
  '4633458b-17de-408a-b874-0445c86b69e6'
)
var storageBlobDataContributorRoleId = subscriptionResourceId(
  'Microsoft.Authorization/roleDefinitions',
  'ba92f5b4-2d11-453d-a403-e96b0029c9fe'
)

resource portalVaultRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(portalKeyVault.id, resourceId('Microsoft.Web/sites', portalAppName), keyVaultSecretsUserRoleId)
  scope: portalKeyVault
  properties: {
    principalId: portalApp.outputs.managedIdentityPrincipalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: keyVaultSecretsUserRoleId
  }
}

resource apiVaultRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(apiKeyVault.id, resourceId('Microsoft.Web/sites', apiAppName), keyVaultSecretsUserRoleId)
  scope: apiKeyVault
  properties: {
    principalId: apiApp.outputs.managedIdentityPrincipalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: keyVaultSecretsUserRoleId
  }
}

resource apiStorageRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storageAccount.id, resourceId('Microsoft.Web/sites', apiAppName), storageBlobDataContributorRoleId)
  scope: storageAccount
  properties: {
    principalId: apiApp.outputs.managedIdentityPrincipalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: storageBlobDataContributorRoleId
  }
}

resource candidatePortalVaultRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (deployCandidateSlots) {
  name: guid(portalKeyVault.id, resourceId('Microsoft.Web/sites/slots', portalAppName, 'candidate'), keyVaultSecretsUserRoleId)
  scope: portalKeyVault
  properties: {
    principalId: portalApp.outputs.candidateManagedIdentityPrincipalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: keyVaultSecretsUserRoleId
  }
}

resource candidateApiVaultRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (deployCandidateSlots) {
  name: guid(apiKeyVault.id, resourceId('Microsoft.Web/sites/slots', apiAppName, 'candidate'), keyVaultSecretsUserRoleId)
  scope: apiKeyVault
  properties: {
    principalId: apiApp.outputs.candidateManagedIdentityPrincipalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: keyVaultSecretsUserRoleId
  }
}

resource candidateApiStorageRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (deployCandidateSlots) {
  name: guid(storageAccount.id, resourceId('Microsoft.Web/sites/slots', apiAppName, 'candidate'), storageBlobDataContributorRoleId)
  scope: storageAccount
  properties: {
    principalId: apiApp.outputs.candidateManagedIdentityPrincipalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: storageBlobDataContributorRoleId
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

var monitoredApplications = [
  {
    code: 'portal'
    id: resourceId('Microsoft.Web/sites', portalAppName)
  }
  {
    code: 'api'
    id: resourceId('Microsoft.Web/sites', apiAppName)
  }
]

resource serverErrorAlerts 'Microsoft.Insights/metricAlerts@2018-03-01' = [for monitored in monitoredApplications: if (!empty(operationsEmail)) {
  name: '${resourceStem}-${monitored.code}-http-5xx'
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
    description: 'NovaPharm ${monitored.code} returned more than five HTTP 5xx responses in five minutes.'
    enabled: true
    evaluationFrequency: 'PT1M'
    scopes: [
      monitored.id
    ]
    severity: 1
    targetResourceRegion: location
    targetResourceType: 'Microsoft.Web/sites'
    windowSize: 'PT5M'
  }
}]

output applications object = {
  corporate: {
    name: corporateApp.outputs.applicationName
    hostname: corporateApp.outputs.defaultHostname
    candidateHostname: corporateApp.outputs.candidateHostname
  }
  technology: {
    name: technologyApp.outputs.applicationName
    hostname: technologyApp.outputs.defaultHostname
    candidateHostname: technologyApp.outputs.candidateHostname
  }
  founder: {
    name: founderApp.outputs.applicationName
    hostname: founderApp.outputs.defaultHostname
    candidateHostname: founderApp.outputs.candidateHostname
  }
  portal: {
    name: portalApp.outputs.applicationName
    hostname: portalApp.outputs.defaultHostname
    candidateHostname: portalApp.outputs.candidateHostname
  }
  api: {
    name: apiApp.outputs.applicationName
    hostname: apiApp.outputs.defaultHostname
    candidateHostname: apiApp.outputs.candidateHostname
  }
  status: {
    name: statusApp.outputs.applicationName
    hostname: statusApp.outputs.defaultHostname
    candidateHostname: statusApp.outputs.candidateHostname
  }
}
output edge object = {
  profileName: edgeCore.outputs.profileName
  profileId: edgeCore.outputs.profileId
  wafPolicyId: edgeCore.outputs.wafPolicyId
  managedCustomDomainsEnabled: enableEdgeCustomDomains
  regionalFailoverEnabled: enableRegionalFailover
  applications: {
    corporate: {
      productionHostname: corporateEdge.outputs.productionEndpointHostname
      candidateHostname: corporateEdge.outputs.candidateEndpointHostname
    }
    technology: {
      productionHostname: technologyEdge.outputs.productionEndpointHostname
      candidateHostname: technologyEdge.outputs.candidateEndpointHostname
    }
    founder: {
      productionHostname: founderEdge.outputs.productionEndpointHostname
      candidateHostname: founderEdge.outputs.candidateEndpointHostname
    }
    portal: {
      productionHostname: portalEdge.outputs.productionEndpointHostname
      candidateHostname: portalEdge.outputs.candidateEndpointHostname
    }
    api: {
      productionHostname: apiEdge.outputs.productionEndpointHostname
      candidateHostname: apiEdge.outputs.candidateEndpointHostname
    }
    status: {
      productionHostname: statusEdge.outputs.productionEndpointHostname
      candidateHostname: statusEdge.outputs.candidateEndpointHostname
    }
  }
}
output keyVaultNames object = {
  api: dataPlatform.outputs.apiKeyVaultName
  portal: dataPlatform.outputs.portalKeyVaultName
}
output storageAccountName string = dataPlatform.outputs.storageAccountName
output sqlServerFullyQualifiedDomainName string = dataPlatform.outputs.sqlServerFullyQualifiedDomainName
output sqlDatabaseName string = dataPlatform.outputs.sqlDatabaseName
output candidateSqlDatabaseName string = dataPlatform.outputs.candidateSqlDatabaseName
output applicationInsightsName string = dataPlatform.outputs.applicationInsightsName
output logAnalyticsWorkspaceName string = dataPlatform.outputs.logAnalyticsWorkspaceName
