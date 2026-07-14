targetScope = 'resourceGroup'

@description('Existing Azure App Service name.')
param applicationName string

@description('Verified custom hostname, such as novapharmhealthcare.com.')
param hostname string

resource app 'Microsoft.Web/sites@2023-12-01' existing = {
  name: applicationName
}

resource hostnameBinding 'Microsoft.Web/sites/hostNameBindings@2023-12-01' = {
  parent: app
  name: hostname
  properties: {
    hostNameType: 'Verified'
    siteName: app.name
  }
}

output hostnameBindingId string = hostnameBinding.id
output dnsGateComplete bool = true
