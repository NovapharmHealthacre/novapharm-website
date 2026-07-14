targetScope = 'resourceGroup'

@description('Existing Azure App Service name.')
param applicationName string

@description('Custom hostname already verified and bound to the App Service.')
param hostname string

resource app 'Microsoft.Web/sites@2023-12-01' existing = {
  name: applicationName
}

resource existingBinding 'Microsoft.Web/sites/hostNameBindings@2023-12-01' existing = {
  parent: app
  name: hostname
}

resource managedCertificate 'Microsoft.Web/certificates@2023-12-01' = {
  name: '${applicationName}-${uniqueString(hostname)}'
  location: resourceGroup().location
  properties: {
    canonicalName: hostname
    hostNames: [
      hostname
    ]
    serverFarmId: app.properties.serverFarmId
  }
  dependsOn: [
    existingBinding
  ]
}

resource tlsBinding 'Microsoft.Web/sites/hostNameBindings@2023-12-01' = {
  parent: app
  name: hostname
  properties: {
    hostNameType: 'Verified'
    siteName: app.name
    sslState: 'SniEnabled'
    thumbprint: managedCertificate.properties.thumbprint
  }
}

output hostname string = hostname
output certificateThumbprint string = managedCertificate.properties.thumbprint
