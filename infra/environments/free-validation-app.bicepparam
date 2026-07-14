using '../free-validation-app.bicep'

param location = readEnvironmentVariable('AZURE_LOCATION', 'uksouth')
param namePrefix = 'novapharm'
param sqlServerName = readEnvironmentVariable('AZURE_FREE_SQL_SERVER_NAME')
param sqlDatabaseName = readEnvironmentVariable('AZURE_FREE_SQL_DATABASE_NAME', 'novapharm-poc')
param deployKeyVault = bool(readEnvironmentVariable('NOVAPHARM_FREE_DEPLOY_KEY_VAULT', 'false'))
