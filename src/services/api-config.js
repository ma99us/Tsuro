export default class API {
  //static HOST_LOCATION = '';                // <- release
  static HOST_LOCATION = 'ghost:8181';        // <- development (beta)
  //static HOST_LOCATION = 'localhost:8181';  // <- development (alpha)
  static HOST_API_KEY = 'TSURO53cr3tK3y';
  static HOST_DB_NAME = ':memory:tsuro-';

  dbName = null;

  constructor(dbName) {
    this.setDbName(dbName);
  }

  setDbName(dbName = API.HOST_DB_NAME) {
    this.dbName = dbName;
    this.HOST_API_URL = this.getHostApiUrl(this.dbName);
    this.HOST_WEBSOCKET_URL = this.getHostWebsocketUrl(this.dbName);
    return this.dbName;
  }

  getHostApiUrl(dbName) {
    if (!dbName) {
      return this.HOST_API_URL;
    }
    const apiHost = API.HOST_LOCATION ? 'http://' + API.HOST_LOCATION : '';
    return apiHost + '/mike-db/api/' + dbName + '/';
  }

  getHostWebsocketUrl(dbName) {
    if (!dbName) {
      return this.HOST_WEBSOCKET_URL;
    }
    const socketHost = API.HOST_LOCATION ? 'ws://' + API.HOST_LOCATION : '';
    return socketHost + '/mike-db/subscribe' + '/' + dbName;
  }
};