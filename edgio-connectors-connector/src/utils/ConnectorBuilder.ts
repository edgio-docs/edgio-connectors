import { Connector } from './types'

export default class ConnectorBuilder {
  private connector: Connector

  constructor(name: Connector['name']) {
    this.connector = {
      name,
    }
    return this
  }

  setOnRegister(func: Connector['onRegister']) {
    this.connector.onRegister = func
    return this
  }

  setInit(command: Connector['initCommand']) {
    this.connector.initCommand = command
    return this
  }

  setDev(command: Connector['devCommand']) {
    this.connector.devCommand = command
    return this
  }

  setBuild(command: Connector['buildCommand']) {
    this.connector.buildCommand = command
    return this
  }

  setProd(command: Connector['prodCommand']) {
    this.connector.prodCommand = command
    return this
  }

  setTemplateConfig(config: Connector['templateConfig']) {
    // we prepend 2 spaces in order to format properly and to not have to do it manually
    this.connector.templateConfig = config?.replace(/^/gm, '  ')
    return this
  }

  setTemplateRoutes(config: Connector['templateRoutes']) {
    // we prepend 4 spaces in order to format properly and to not have to do it manually
    this.connector.templateRoutes = config?.replace(/^/gm, '    ')
    return this
  }

  withStaticFolder(folder: Connector['staticFolder']) {
    this.connector.staticFolder = folder
    return this
  }

  withServiceWorker(withGlob?: boolean) {
    this.connector.withServiceWorker = withGlob
      ? {
          withGlob,
        }
      : true
    return this
  }

  withServerless() {
    this.connector.withServerless = true
    return this
  }

  toConnector(): Connector {
    return this.connector
  }
}
