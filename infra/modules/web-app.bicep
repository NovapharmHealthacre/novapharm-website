targetScope = 'resourceGroup'

@description('Globally unique App Service application name.')
param appName string

@description('Azure region for the application.')
param location string

@description('Resource ID of the App Service Plan that owns the worker.')
param appServicePlanId string

@description('Resource tags inherited from the estate deployment.')
param tags object

@description('Command executed from the root of the deployed release package.')
param appCommandLine string

@description('Application health endpoint used by App Service.')
param healthCheckPath string

@description('Non-secret and Key Vault reference application settings.')
param appSettings object

@description('Create a candidate deployment slot. Requires Standard tier or better.')
param deployCandidateSlot bool = false

@description('Candidate-slot overrides. These are merged over the production settings.')
param candidateAppSettings object = {}

@description('App settings that must remain bound to the candidate slot during a swap.')
param slotSettingNames array = []

@description('Enable Always On. This must remain false on Free or Shared plans.')
param alwaysOn bool = true

@description('Optional delegated App Service integration subnet resource ID.')
param virtualNetworkSubnetId string = ''

@description('Enable Microsoft Entra App Service Authentication for this application only.')
param enableEntraAuthentication bool = false

@description('Microsoft Entra tenant used by App Service Authentication.')
param entraTenantId string = tenant().tenantId

@description('Microsoft Entra application client ID used by App Service Authentication.')
param entraClientId string = ''

@description('Application setting containing the Entra relying-party secret reference.')
#disable-next-line secure-secrets-in-params // This is an app-setting name, never the credential value.
param entraClientSecretSettingName string = 'ENTRA_CLIENT_SECRET'

@description('Optional Log Analytics workspace resource ID for platform diagnostics.')
param logAnalyticsWorkspaceId string = ''

@description('Unique Front Door profile identifier used to reject traffic from other Front Door tenants.')
param frontDoorId string = ''

@description('Deny direct public origin access and admit only the AzureFrontDoor.Backend service tag with the matching X-Azure-FDID header.')
param restrictOriginToFrontDoor bool = false

var frontDoorRestrictions = restrictOriginToFrontDoor ? [
  {
    action: 'Allow'
    description: 'Allow only this Azure Front Door Premium profile.'
    headers: {
      'x-azure-fdid': [
        frontDoorId
      ]
    }
    ipAddress: 'AzureFrontDoor.Backend'
    name: 'Allow-NovaPharm-Front-Door'
    priority: 100
    tag: 'ServiceTag'
  }
] : []

var siteProperties = {
  clientAffinityEnabled: false
  httpsOnly: true
  publicNetworkAccess: 'Enabled'
  serverFarmId: appServicePlanId
  siteConfig: {
    appCommandLine: appCommandLine
    alwaysOn: alwaysOn
    ftpsState: 'Disabled'
    healthCheckPath: healthCheckPath
    http20Enabled: true
    ipSecurityRestrictions: frontDoorRestrictions
    ipSecurityRestrictionsDefaultAction: restrictOriginToFrontDoor ? 'Deny' : 'Allow'
    linuxFxVersion: 'NODE|24-lts'
    loadBalancing: 'LeastRequests'
    minTlsVersion: '1.2'
    remoteDebuggingEnabled: false
    scmIpSecurityRestrictionsUseMain: true
    scmMinTlsVersion: '1.2'
    use32BitWorkerProcess: false
    vnetRouteAllEnabled: !empty(virtualNetworkSubnetId)
    webSocketsEnabled: false
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
  properties: union(siteProperties, empty(virtualNetworkSubnetId) ? {} : {
    virtualNetworkSubnetId: virtualNetworkSubnetId
  })
}

resource appConfiguration 'Microsoft.Web/sites/config@2023-12-01' = {
  parent: app
  name: 'appsettings'
  properties: appSettings
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
  properties: union(siteProperties, empty(virtualNetworkSubnetId) ? {} : {
    virtualNetworkSubnetId: virtualNetworkSubnetId
  })
}

resource candidateConfiguration 'Microsoft.Web/sites/slots/config@2023-12-01' = if (deployCandidateSlot) {
  parent: candidateSlot
  name: 'appsettings'
  properties: union(appSettings, candidateAppSettings)
}

resource stickySlotConfiguration 'Microsoft.Web/sites/config@2023-12-01' = if (deployCandidateSlot && length(slotSettingNames) > 0) {
  parent: app
  name: 'slotConfigNames'
  properties: {
    appSettingNames: slotSettingNames
    azureStorageConfigNames: []
    connectionStringNames: []
  }
}

var authSettings = {
  globalValidation: {
    excludedPaths: [
      '/api/health'
      '/api/health/live'
      '/api/health/ready'
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
        clientSecretSettingName: entraClientSecretSettingName
        openIdIssuer: '${environment().authentication.loginEndpoint}${entraTenantId}/v2.0'
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

resource appAuthentication 'Microsoft.Web/sites/config@2022-09-01' = if (enableEntraAuthentication) {
  parent: app
  name: 'authsettingsV2'
  properties: authSettings
}

resource candidateAuthentication 'Microsoft.Web/sites/slots/config@2022-09-01' = if (deployCandidateSlot && enableEntraAuthentication) {
  parent: candidateSlot
  name: 'authsettingsV2'
  properties: authSettings
}

resource applicationDiagnostics 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = if (!empty(logAnalyticsWorkspaceId)) {
  name: 'send-to-log-analytics'
  scope: app
  properties: {
    workspaceId: logAnalyticsWorkspaceId
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

resource candidateDiagnostics 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = if (deployCandidateSlot && !empty(logAnalyticsWorkspaceId)) {
  name: 'send-to-log-analytics'
  scope: candidateSlot
  properties: {
    workspaceId: logAnalyticsWorkspaceId
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

output applicationName string = app.name
output applicationId string = app.id
output defaultHostname string = app.properties.defaultHostName
output managedIdentityPrincipalId string = app.identity.principalId
output candidateHostname string = deployCandidateSlot ? '${appName}-candidate.azurewebsites.net' : ''
output candidateId string = deployCandidateSlot ? candidateSlot!.id : ''
output candidateManagedIdentityPrincipalId string = deployCandidateSlot ? candidateSlot!.identity.principalId : ''
