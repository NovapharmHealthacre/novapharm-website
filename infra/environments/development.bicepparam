using '../main.bicep'

param environmentCode = 'dev'
param location = readEnvironmentVariable('AZURE_LOCATION', 'uksouth')
param namePrefix = 'novapharm'
param publicOrigin = readEnvironmentVariable('NOVAPHARM_DEV_ORIGIN')
param sqlEntraAdminObjectId = readEnvironmentVariable('AZURE_SQL_ENTRA_ADMIN_OBJECT_ID')
param sqlEntraAdminLogin = readEnvironmentVariable('AZURE_SQL_ENTRA_ADMIN_LOGIN')
param sqlAutoPauseDelay = 60
param deployCandidateSlot = false
param enableEntraAuthentication = false
param enableDefenderForStorage = false
param operationsEmail = ''
