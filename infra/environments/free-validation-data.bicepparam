using '../free-validation-data.bicep'

param location = readEnvironmentVariable('AZURE_LOCATION', 'uksouth')
param namePrefix = 'novapharm'
param sqlEntraAdminObjectId = readEnvironmentVariable('AZURE_SQL_ENTRA_ADMIN_OBJECT_ID')
param sqlEntraAdminLogin = readEnvironmentVariable('AZURE_SQL_ENTRA_ADMIN_LOGIN')
param operationsEmail = readEnvironmentVariable('NOVAPHARM_OPERATIONS_EMAIL')
