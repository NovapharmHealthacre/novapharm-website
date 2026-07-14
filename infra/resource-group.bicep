targetScope = 'subscription'

@description('Name of the isolated NovaPharm environment resource group.')
param resourceGroupName string

@description('Azure region approved for this environment.')
param location string

@allowed([
  'dev'
  'stg'
  'prod'
])
param environmentCode string

resource environmentResourceGroup 'Microsoft.Resources/resourceGroups@2022-09-01' = {
  name: resourceGroupName
  location: location
  tags: {
    application: 'NovaPharm Digital Platform'
    environment: environmentCode
    owner: 'NovaPharm Healthcare Ltd'
    managedBy: 'Bicep'
  }
}

output resourceGroupId string = environmentResourceGroup.id
output resourceGroupName string = environmentResourceGroup.name
