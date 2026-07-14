using '../main.bicep'

param environmentCode = 'prod'
param location = readEnvironmentVariable('AZURE_LOCATION', 'uksouth')
param namePrefix = 'novapharm'
param publicOrigin = 'https://novapharmhealthcare.com'
param sqlEntraAdminObjectId = readEnvironmentVariable('AZURE_SQL_ENTRA_ADMIN_OBJECT_ID')
param sqlEntraAdminLogin = readEnvironmentVariable('AZURE_SQL_ENTRA_ADMIN_LOGIN')
param sqlAutoPauseDelay = -1
param deployCandidateSlot = true
param enableEntraAuthentication = false
param enableDefenderForStorage = false
param operationsEmail = readEnvironmentVariable('NOVAPHARM_OPERATIONS_EMAIL', '')
param emailFrom = readEnvironmentVariable('NOVAPHARM_EMAIL_FROM', '')
param contactNotificationTo = readEnvironmentVariable('NOVAPHARM_CONTACT_NOTIFICATION_TO', '')
