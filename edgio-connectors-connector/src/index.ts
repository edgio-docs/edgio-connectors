import ConnectorRoutes from './utils/ConnectorRoutes'

// Differs from what we do normally with routes -> expects to be created with name as a param.
// We can create the actual instances as a fallback, perhaps point users to this change.
export const connectorRoutes = new ConnectorRoutes()
