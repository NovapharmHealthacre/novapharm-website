targetScope = 'resourceGroup'

@description('Existing Azure Front Door Premium profile name.')
param profileName string

@description('Existing Azure Front Door WAF policy name.')
param wafPolicyName string

@description('Stable route code: corporate, technology, founder, portal, api or status.')
param applicationCode string

@description('Primary App Service hostname without scheme.')
param primaryHostName string

@description('Candidate-slot App Service hostname without scheme.')
param candidateHostName string = ''

@description('Optional secondary-region App Service hostname. It must point to a separately deployed and accepted service.')
param secondaryHostName string = ''

@description('Health-probe path for this application.')
param healthPath string = '/'

@description('Primary canonical hostname bound with an Azure-managed TLS certificate after DNS validation.')
param primaryCustomHostname string = ''

@description('Optional alternate canonical hostname, used for the corporate www host.')
param alternateCustomHostname string = ''

@description('Provision managed custom domains. DNS ownership and validation remain owner-controlled.')
param enableCustomDomains bool = false

@description('Provision an isolated candidate endpoint and route.')
param deployCandidateEndpoint bool = false

@description('Activate the secondary regional origin only after a separate accepted application estate exists.')
param enableRegionalFailover bool = false

@description('Resource tags inherited from the estate deployment.')
param tags object

resource profile 'Microsoft.Cdn/profiles@2024-09-01' existing = {
  name: profileName
}

resource wafPolicy 'Microsoft.Network/FrontDoorWebApplicationFirewallPolicies@2024-02-01' existing = {
  name: wafPolicyName
}

resource endpoint 'Microsoft.Cdn/profiles/afdEndpoints@2024-09-01' = {
  parent: profile
  name: '${applicationCode}-production'
  location: 'global'
  tags: union(tags, {
    applicationCode: applicationCode
    releaseRing: 'production'
  })
  properties: {
    enabledState: 'Enabled'
  }
}

resource originGroup 'Microsoft.Cdn/profiles/originGroups@2024-09-01' = {
  parent: profile
  name: '${applicationCode}-production-origins'
  properties: {
    healthProbeSettings: {
      probeIntervalInSeconds: 30
      probePath: healthPath
      probeProtocol: 'Https'
      probeRequestType: 'HEAD'
    }
    loadBalancingSettings: {
      additionalLatencyInMilliseconds: 0
      sampleSize: 5
      successfulSamplesRequired: 3
    }
    sessionAffinityState: 'Disabled'
    trafficRestorationTimeToHealedOrNewEndpointsInMinutes: 10
  }
}

resource primaryOrigin 'Microsoft.Cdn/profiles/originGroups/origins@2024-09-01' = {
  parent: originGroup
  name: '${applicationCode}-primary'
  properties: {
    enabledState: 'Enabled'
    enforceCertificateNameCheck: true
    hostName: primaryHostName
    httpPort: 80
    httpsPort: 443
    originHostHeader: primaryHostName
    priority: 1
    weight: 1000
  }
}

resource secondaryOrigin 'Microsoft.Cdn/profiles/originGroups/origins@2024-09-01' = if (enableRegionalFailover && !empty(secondaryHostName)) {
  parent: originGroup
  name: '${applicationCode}-secondary'
  properties: {
    enabledState: 'Enabled'
    enforceCertificateNameCheck: true
    hostName: secondaryHostName
    httpPort: 80
    httpsPort: 443
    originHostHeader: secondaryHostName
    priority: 2
    weight: 1000
  }
}

resource primaryDomain 'Microsoft.Cdn/profiles/customDomains@2024-09-01' = if (enableCustomDomains && !empty(primaryCustomHostname)) {
  parent: profile
  name: '${applicationCode}-primary-domain'
  properties: {
    hostName: primaryCustomHostname
    tlsSettings: {
      certificateType: 'ManagedCertificate'
      minimumTlsVersion: 'TLS12'
    }
  }
}

resource alternateDomain 'Microsoft.Cdn/profiles/customDomains@2024-09-01' = if (enableCustomDomains && !empty(alternateCustomHostname)) {
  parent: profile
  name: '${applicationCode}-alternate-domain'
  properties: {
    hostName: alternateCustomHostname
    tlsSettings: {
      certificateType: 'ManagedCertificate'
      minimumTlsVersion: 'TLS12'
    }
  }
}

var routeDomains = concat(
  enableCustomDomains && !empty(primaryCustomHostname) ? [
    {
      id: primaryDomain.id
    }
  ] : [],
  enableCustomDomains && !empty(alternateCustomHostname) ? [
    {
      id: alternateDomain.id
    }
  ] : []
)

resource route 'Microsoft.Cdn/profiles/afdEndpoints/routes@2024-09-01' = {
  parent: endpoint
  name: '${applicationCode}-production-route'
  properties: {
    customDomains: routeDomains
    enabledState: 'Enabled'
    forwardingProtocol: 'HttpsOnly'
    httpsRedirect: 'Enabled'
    linkToDefaultDomain: 'Enabled'
    originGroup: {
      id: originGroup.id
    }
    patternsToMatch: [
      '/*'
    ]
    supportedProtocols: [
      'Http'
      'Https'
    ]
  }
}

resource candidateEndpoint 'Microsoft.Cdn/profiles/afdEndpoints@2024-09-01' = if (deployCandidateEndpoint) {
  parent: profile
  name: '${applicationCode}-candidate'
  location: 'global'
  tags: union(tags, {
    applicationCode: applicationCode
    releaseRing: 'candidate'
  })
  properties: {
    enabledState: 'Enabled'
  }
}

resource candidateOriginGroup 'Microsoft.Cdn/profiles/originGroups@2024-09-01' = if (deployCandidateEndpoint) {
  parent: profile
  name: '${applicationCode}-candidate-origins'
  properties: {
    healthProbeSettings: {
      probeIntervalInSeconds: 30
      probePath: healthPath
      probeProtocol: 'Https'
      probeRequestType: 'HEAD'
    }
    loadBalancingSettings: {
      additionalLatencyInMilliseconds: 0
      sampleSize: 5
      successfulSamplesRequired: 3
    }
    sessionAffinityState: 'Disabled'
    trafficRestorationTimeToHealedOrNewEndpointsInMinutes: 10
  }
}

resource candidateOrigin 'Microsoft.Cdn/profiles/originGroups/origins@2024-09-01' = if (deployCandidateEndpoint) {
  parent: candidateOriginGroup
  name: '${applicationCode}-candidate'
  properties: {
    enabledState: 'Enabled'
    enforceCertificateNameCheck: true
    hostName: candidateHostName
    httpPort: 80
    httpsPort: 443
    originHostHeader: candidateHostName
    priority: 1
    weight: 1000
  }
}

resource candidateRoute 'Microsoft.Cdn/profiles/afdEndpoints/routes@2024-09-01' = if (deployCandidateEndpoint) {
  parent: candidateEndpoint
  name: '${applicationCode}-candidate-route'
  properties: {
    customDomains: []
    enabledState: 'Enabled'
    forwardingProtocol: 'HttpsOnly'
    httpsRedirect: 'Enabled'
    linkToDefaultDomain: 'Enabled'
    originGroup: {
      id: candidateOriginGroup.id
    }
    patternsToMatch: [
      '/*'
    ]
    supportedProtocols: [
      'Http'
      'Https'
    ]
  }
}

var productionWafDomains = concat([
  {
    id: endpoint.id
  }
], routeDomains)

var candidateWafAssociation = deployCandidateEndpoint ? [
  {
    domains: [
      {
        id: candidateEndpoint.id
      }
    ]
    patternsToMatch: [
      '/*'
    ]
  }
] : []

resource securityPolicy 'Microsoft.Cdn/profiles/securityPolicies@2024-09-01' = {
  parent: profile
  name: '${applicationCode}-waf-association'
  properties: {
    parameters: {
      type: 'WebApplicationFirewall'
      wafPolicy: {
        id: wafPolicy.id
      }
      associations: concat([
        {
          domains: productionWafDomains
          patternsToMatch: [
            '/*'
          ]
        }
      ], candidateWafAssociation)
    }
  }
  dependsOn: [
    route
    candidateRoute
  ]
}

output applicationCode string = applicationCode
output productionEndpointHostname string = endpoint.properties.hostName
output candidateEndpointHostname string = deployCandidateEndpoint ? candidateEndpoint!.properties.hostName : ''
output managedTlsEnabled bool = enableCustomDomains && !empty(primaryCustomHostname)
output regionalFailoverEnabled bool = enableRegionalFailover && !empty(secondaryHostName)
output originAccessFrontDoorId string = profile.properties.frontDoorId
