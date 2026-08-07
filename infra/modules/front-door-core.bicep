targetScope = 'resourceGroup'

@description('Azure Front Door Premium profile name.')
param profileName string

@description('Azure Front Door WAF policy name.')
param wafPolicyName string

@description('Resource tags inherited from the estate deployment.')
param tags object

@description('Log Analytics workspace used for access, health-probe and WAF diagnostics.')
param logAnalyticsWorkspaceId string

@description('Optional operations recipient for edge alerts.')
param operationsEmail string = ''

@description('Global per-client request threshold per minute. Application-level limits remain stricter for sensitive workflows.')
@minValue(60)
param globalRateLimitPerMinute int = 1200

@description('Per-client rate threshold for authentication and account workflow paths.')
@minValue(10)
param sensitiveRateLimitPerMinute int = 120

resource profile 'Microsoft.Cdn/profiles@2024-09-01' = {
  name: profileName
  location: 'global'
  tags: tags
  identity: {
    type: 'SystemAssigned'
  }
  sku: {
    name: 'Premium_AzureFrontDoor'
  }
  properties: {
    originResponseTimeoutSeconds: 60
  }
}

resource wafPolicy 'Microsoft.Network/FrontDoorWebApplicationFirewallPolicies@2024-02-01' = {
  name: wafPolicyName
  location: 'global'
  tags: tags
  sku: {
    name: 'Premium_AzureFrontDoor'
  }
  properties: {
    policySettings: {
      enabledState: 'Enabled'
      mode: 'Prevention'
      requestBodyCheck: 'Enabled'
      customBlockResponseStatusCode: 403
    }
    managedRules: {
      managedRuleSets: [
        {
          ruleSetType: 'Microsoft_DefaultRuleSet'
          ruleSetVersion: '2.2'
          ruleSetAction: 'Block'
        }
        {
          ruleSetType: 'Microsoft_BotManagerRuleSet'
          ruleSetVersion: '1.1'
          ruleSetAction: 'Block'
        }
      ]
    }
    customRules: {
      rules: [
        {
          name: 'GlobalPerClientRateLimit'
          enabledState: 'Enabled'
          priority: 100
          ruleType: 'RateLimitRule'
          rateLimitDurationInMinutes: 1
          rateLimitThreshold: globalRateLimitPerMinute
          action: 'Block'
          matchConditions: [
            {
              matchVariable: 'RemoteAddr'
              operator: 'IPMatch'
              negateCondition: false
              matchValue: [
                '0.0.0.0/0'
                '::/0'
              ]
              transforms: []
            }
          ]
        }
        {
          name: 'SensitiveWorkflowRateLimit'
          enabledState: 'Enabled'
          priority: 90
          ruleType: 'RateLimitRule'
          rateLimitDurationInMinutes: 1
          rateLimitThreshold: sensitiveRateLimitPerMinute
          action: 'Block'
          matchConditions: [
            {
              matchVariable: 'RequestUri'
              operator: 'Contains'
              negateCondition: false
              matchValue: [
                '/api/auth/'
                '/api/contact'
                '/api/account-applications'
                '/api/portal/'
              ]
              transforms: [
                'Lowercase'
              ]
            }
          ]
        }
      ]
    }
  }
}

resource diagnostics 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = if (!empty(logAnalyticsWorkspaceId)) {
  name: 'send-edge-logs-to-log-analytics'
  scope: profile
  properties: {
    workspaceId: logAnalyticsWorkspaceId
    logs: [
      {
        category: 'FrontDoorAccessLog'
        enabled: true
      }
      {
        category: 'FrontDoorHealthProbeLog'
        enabled: true
      }
      {
        category: 'FrontDoorWebApplicationFirewallLog'
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

resource edgeActionGroup 'Microsoft.Insights/actionGroups@2023-01-01' = if (!empty(operationsEmail)) {
  name: '${profileName}-edge-operations'
  location: 'global'
  tags: tags
  properties: {
    enabled: true
    groupShortName: 'np-edge'
    emailReceivers: [
      {
        name: 'NovaPharm edge operations'
        emailAddress: operationsEmail
        useCommonAlertSchema: true
      }
    ]
  }
}

resource wafBlockAlert 'Microsoft.Insights/scheduledQueryRules@2023-12-01' = if (!empty(logAnalyticsWorkspaceId)) {
  name: '${profileName}-waf-block-spike'
  location: resourceGroup().location
  tags: tags
  properties: {
    displayName: 'NovaPharm Front Door WAF block spike'
    description: 'More than 100 WAF blocks were recorded in a five-minute window.'
    enabled: true
    severity: 1
    evaluationFrequency: 'PT5M'
    scopes: [
      logAnalyticsWorkspaceId
    ]
    targetResourceTypes: [
      'Microsoft.OperationalInsights/workspaces'
    ]
    windowSize: 'PT5M'
    criteria: {
      allOf: [
        {
          query: 'AzureDiagnostics | where ResourceProvider == "MICROSOFT.CDN" and Category == "FrontDoorWebApplicationFirewallLog" | summarize BlockedRequests=count()'
          timeAggregation: 'Count'
          dimensions: []
          operator: 'GreaterThan'
          threshold: 100
          failingPeriods: {
            numberOfEvaluationPeriods: 1
            minFailingPeriodsToAlert: 1
          }
        }
      ]
    }
    actions: {
      actionGroups: empty(operationsEmail) ? [] : [
        edgeActionGroup.id
      ]
    }
    autoMitigate: true
    checkWorkspaceAlertsStorageConfigured: false
    skipQueryValidation: false
  }
}

resource originHealthAlert 'Microsoft.Insights/scheduledQueryRules@2023-12-01' = if (!empty(logAnalyticsWorkspaceId)) {
  name: '${profileName}-origin-health-failure'
  location: resourceGroup().location
  tags: tags
  properties: {
    displayName: 'NovaPharm Front Door origin health failures'
    description: 'Front Door health probes reported unsuccessful origin responses in a five-minute window.'
    enabled: true
    severity: 1
    evaluationFrequency: 'PT5M'
    scopes: [
      logAnalyticsWorkspaceId
    ]
    targetResourceTypes: [
      'Microsoft.OperationalInsights/workspaces'
    ]
    windowSize: 'PT5M'
    criteria: {
      allOf: [
        {
          query: 'AzureDiagnostics | where ResourceProvider == "MICROSOFT.CDN" and Category == "FrontDoorHealthProbeLog" | where httpStatusCode_d < 200 or httpStatusCode_d >= 400 | summarize FailedProbes=count()'
          timeAggregation: 'Count'
          dimensions: []
          operator: 'GreaterThan'
          threshold: 5
          failingPeriods: {
            numberOfEvaluationPeriods: 1
            minFailingPeriodsToAlert: 1
          }
        }
      ]
    }
    actions: {
      actionGroups: empty(operationsEmail) ? [] : [
        edgeActionGroup.id
      ]
    }
    autoMitigate: true
    checkWorkspaceAlertsStorageConfigured: false
    skipQueryValidation: false
  }
}

output profileName string = profile.name
output profileId string = profile.id
output frontDoorId string = profile.properties.frontDoorId
output wafPolicyId string = wafPolicy.id
output diagnosticsEnabled bool = !empty(logAnalyticsWorkspaceId)
output alertsRecipientConfigured bool = !empty(operationsEmail)
