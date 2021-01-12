import API from "./api-config.js";
import MessageBusService from "./message-bus-service.js";

/**
 * MikeDB Service
 */
export default class HostStorageService {

  constructor(API, MessageBusService) {
    this.API = API;
    this.messageBusService = MessageBusService;

    //this.HttpHeaderheaders.common.API_KEY = this.API.HOST_API_KEY; // always send api key with every request header
    this.sessionId = null;
    this.MAX_RETRIES = 3; // set to <0 to disable retries
  }

  connect(dbName = null) {
    const url = this.API.getHostWebsocketUrl(dbName);
    if (!url) {
      throw "HOST STORAGE is not initialized";
    }

    this.disconnect();  // disconnect first if needed
    let socketUrl = url;
    if (socketUrl.indexOf('ws://') !== 0 && socketUrl.indexOf('wss://') !== 0) {  // expand relative url to a full one
      let protocol = 'ws' + (window.location.protocol === 'https' ? 's' : '');
      socketUrl = protocol + '://' + window.location.hostname + (window.location.port ? ':' + window.location.port : '') + url;
    }
    //console.log("--- socket open");
    this.dataStream = new WebSocket(socketUrl);
    this.dataStream.onmessage = (message) => {
      if (message.data === 'PONG') {
        return; // ignore keep-alive exchanges
      }
      this.onMessage(message.data);
    };
    this.dataStream.onopen = () => {
      console.log("--- on socket opened");
      this.sendMessage({API_KEY: API.HOST_API_KEY}).then(() => {   // got to send API_KEY first, otherwise socket will be closed
        this.startKeepAlive();
      });
    };
    this.dataStream.onclose = () => {
      console.log("--- on socket closed");
      this.onMessage({sessionId: this.sessionId, event: 'CLOSED', message: 'Websocket closed'});
      this.disconnect();
    };
    this.dataStream.onerror = err => {
      console.log("--- on socket error: " + err);
      this.onMessage({sessionId: this.sessionId, event: 'ERROR', message: 'Websocket error: ' + err});
    };
  }

  disconnect() {
    if (this.dataStream) {
      // unregister listeners
      this.dataStream.onmessage = null;
      this.dataStream.onopen = null;
      this.dataStream.onclose = null;
      this.dataStream.onerror = null;

      // close and reset socket sessoin
      console.log("--- socket disconnect");
      this.dataStream.close();
      this.dataStream = null;
    }

    this.sessionId = null;
    this.stopKeepAlive();
  }

  sendMessage(value) {
    if (!this.dataStream) {
      throw "Websocket is not connected";
    }

    return new Promise((resolve, reject) => {
      try {
        this.dataStream.send(HostStorageService.tryJsonStringify(value));
        resolve("ws sent");
      } catch (err) {
        reject("ws send error: " + err);
      }
    });
  }

  onMessage(message) {
    const event = HostStorageService.tryJsonParse(message);
    if (!event || typeof event !== "object") {
      //we got some primitive, not an object.
      //console.log(message);
      this.notify('session-message', message);
      return;
    }

    if (event.event === "NEW" && event.sessionId) {
      console.log("-- new session id: " + event.sessionId);
      this.setSessionId(event.sessionId);
      this.notify('session-event', event);
    } else if (event.event === 'OPENED') {
      console.log("-- opened session id: " + event.sessionId);
      this.notify('session-event', event);
    } else if (event.event === 'CLOSED') {
      console.log("-- closed session id: " + event.sessionId);
      this.notify('session-event', event);
    } else if (event.event === 'ERROR') {
      console.log("-- session error: " + event.message);
      this.notify('session-event', event);
    } else if (event.event) {
      //console.log(message);
      if (this.sessionId && this.sessionId !== event.sessionId) {   // ignore our own db updates notifications
        console.log("-- DB event " + event.event + " for key=" + event.key + " from session id: " + event.sessionId);
        this.notify('db-event', event);
      }
    } else {
      //we got some object but it is not an event.
      console.log("! Unexpected event: " + JSON.stringify(event));
      //this.notify('session-message', event);
    }
  }

  static tryJsonParse(str) {
    try {
      return JSON.parse(str);
    } catch (e) {
      return str;
    }
  }

  static tryJsonStringify(data) {
    if (data == null || typeof data !== 'object') {
      return data;
    }
    try {
      return JSON.stringify(data);
    } catch (e) {
      return data;
    }
  }

  startKeepAlive() {
    this.keepAliveWatchdog = window.setInterval(() => {
      try {
        this.sendMessage('PING');   //send keep-alive exchanges
      } catch (e) {
        this.stopKeepAlive();
      }
    }, 10000);    // every 10 seconds
  }

  stopKeepAlive() {
    if (this.keepAliveWatchdog) {
      window.clearInterval(this.keepAliveWatchdog);
      this.keepAliveWatchdog = null;
    }
  }

  notify(name, event) {
    this.messageBusService.broadcast(name, event);
  }

  setSessionId(sessionId) {
    this.sessionId = sessionId;
  }

  onRetry(retry) {
    console.log("! HTTP retry #" + retry);
    this.notify('http-event', {event: 'RETRY', message: "HTTP retry #" + retry});
  }

  /**
   * Validates HTTP result code, and resolves async request promise.
   * (not for public use)
   */
  validateResponse(response) {
    if (response && (response.status === 200 || response.status === 201)) {
      // resource exists or was created
      return response.text()
        .then((data) => {
          return data ? JSON.parse(data) : null;
        });
    }
    else if (response && (response.status === 204)) {
      return null;   // resource is empty
    }
    else if (response && (response.status || response.statusText)) {
      let message = 'Http error:';
      if (response.status) {
        message += '(' + response.status + ')';
      }
      if (response.statusText) {
        message += ' ' + response.statusText;
      }
      throw message;
    }
    else if (response && response.message) {
      throw 'Error: ' + response.message;
    }
    else if (response) {
      throw response;
    }
    else {
      throw 'No response';
    }
  }

  getApiUrl(dbName) {
    const url = this.API.getHostApiUrl(dbName);
    if (!url) {
      throw "HOST STORAGE is not initialized";
    }
    return url;
  }

  /**
   * Select appropriate request Media Type header based on Value type
   * (not for public use)
   */
  prepareHeaders(value = null) {
    const headers = {
      API_KEY: API.HOST_API_KEY   // always send api key with every request header
    };
    if (this.sessionId) {
      headers.SESSION_ID = this.sessionId;  // always send session id with every request header
    }
    if (typeof value === 'string' && value !== null) {
      headers['Content-Type'] = 'text/plain;charset=utf-8';
    } else {
      headers['Content-Type'] = 'application/json;charset=utf-8';
    }
    return headers;
  }

  prepareBody(value) {
    if (typeof value === 'string' && value !== null) {
      return value;
    } else {
      return JSON.stringify(value);
    }
  }

  /**
   * Stores new key=>value pair
   * @returns {*} status code 201 when inserted successfully
   */
  set(key, value, dbName = null) {
    const url = this.getApiUrl(dbName);

    console.log(">>> DB '" + url + "' SET for key=" + key);  // #DEBUG

    let retry = 0;
    const request = () => {
      return fetch(url + key, {
        method: 'PUT',
        headers: this.prepareHeaders(value),
        body: this.prepareBody(value),
      }).then(response => {
        return this.validateResponse(response);
      }).catch(err => {
        if (retry < self.MAX_RETRIES) {
          retry++;
          this.onRetry(retry);

          request();  // recursion for re-tries
        } else {
          this.validateResponse(err);
        }
      });
    };

    return request();
  }

  /**
   * Stores new key=>value pair, or adds to existing value if it is a collection
   * @returns {*} status code 201 when inserted successfully
   */
  add(key, value, index = null, dbName = null) {
    const url = this.getApiUrl(dbName);

    const urlParam = new URL(url + key);
    urlParam.search = new URLSearchParams({
      index: index,
    });

    if (!Array.isArray(value)) {
      value = [value];    // value has to be an array
    }

    console.log(">>> DB '" + url + "' ADD for key=" + key);  // #DEBUG

    let retry = 0;
    const request = () => {
      return fetch(urlParam, {
        method: 'POST',
        headers: this.prepareHeaders(value),
        body: this.prepareBody(value),
      }).then(response => {
        return this.validateResponse(response);
      }).catch(err => {
        if (retry < self.MAX_RETRIES) {
          retry++;
          this.onRetry(retry);

          request();  // recursion for re-tries
        } else {
          this.validateResponse(err);
        }
      });
    };

    return request();
  }

  /**
   * Retrive Object, Primitive or a Collection assosiated with given Key
   * @param key
   * @param firstResult (optional) index of the first element in resulting collection to retrieve
   * @param maxResults (optional) number of elements from resulting collection to retrieve
   * @returns {*} 200 if record retrieved or status code 204 when no such record
   */
  get(key, firstResult = 0, maxResults = -1, dbName = null) {
    const url = this.getApiUrl(dbName);

    const urlParam = new URL(url + key);
    urlParam.search = new URLSearchParams({
      firstResult: firstResult,
      maxResults: maxResults
    });

    console.log(">>> DB '" + url + "' GET for key=" + key);  // #DEBUG

    let retry = 0;
    const request = () => {
      return fetch(urlParam, {
        method: 'GET',
        headers: this.prepareHeaders()
      }).then(response => {
        return this.validateResponse(response);
      }).catch(err => {
        if (retry < self.MAX_RETRIES) {
          retry++;
          this.onRetry(retry);

          request();  // recursion for re-tries
        } else {
          this.validateResponse(err);
        }
      });
    };

    return request();
  }

  /**
   * Count how many items associated with given Key
   * @param key
   * @returns {*} 1- for simple key=>value pairs, collection size for key=>[collection]
   */
  count(key, dbName = null) {
    const url = this.getApiUrl(dbName);

    console.log(">>> DB '" + url + "' COUNT for key=" + key);  // #DEBUG

    let retry = 0;
    const request = () => {
      return fetch(url, {
        method: 'HEAD',
        headers: this.prepareHeaders()
      }).then(response => {
        response.data = response.headers.get('Content-Length');
        return this.validateResponse(response);
      }).catch(err => {
        if (retry < self.MAX_RETRIES) {
          retry++;
          this.onRetry(retry);

          request();  // recursion for re-tries
        } else {
          this.validateResponse(err);
        }
      });
    };

    return request();
  }

  /**
   * Modify a single item in a collection associated with the key
   */
  update(key, value, index = null, dbName = null) {
    const url = this.getApiUrl(dbName);

    if (index) {
      throw "'update' does not support 'index' on this client";
    }

    console.log(">>> DB '" + url + "' UPDATE for key=" + key);  // #DEBUG

    const urlParam = new URL(url + key);
    // urlParam.search = new URLSearchParams({
    //   index: index
    // });

    let retry = 0;
    const request = () => {
      return fetch(urlParam, {
        method: 'PATCH',
        headers: this.prepareHeaders(value),
        body: this.prepareBody(value)
      }).then(response => {
        return this.validateResponse(response);
      }).catch(err => {
        if (retry < self.MAX_RETRIES) {
          retry++;
          this.onRetry(retry);

          request();  // recursion for re-tries
        } else {
          this.validateResponse(err);
        }
      });
    };

    return request();
  }

  /**
   * Delete a record with given Key, or a single value from record's value list by it's id or by index if provided
   */
  delete(key, value, id = null, index = null, dbName = null) {
    const url = this.getApiUrl(dbName);

    const urlParam = new URL(url + key);
    // urlParam.search = new URLSearchParams({
    //   id: id,
    //   index: index
    // });

    console.log(">>> DB '" + url + "' DELETE for key=" + key);  // #DEBUG

    let retry = 0;
    const request = () => {
      return fetch(urlParam, {
        method: 'DELETE',
        headers: this.prepareHeaders(),
        body: this.prepareBody(value)
      }).then(response => {
        return this.validateResponse(response);
      }).catch(err => {
        if (retry < self.MAX_RETRIES) {
          retry++;
          this.onRetry(retry);

          request();  // recursion for re-tries
        } else {
          this.validateResponse(err);
        }
      });
    };

    return request();
  }

  // finally! We can use bad practice like Singleton in Java Script!
  static instance = null;

  static getInstance() {
    if (!HostStorageService.instance) {
      HostStorageService.instance = new HostStorageService(new API(), MessageBusService.getInstance());
    }
    return HostStorageService.instance;
  }
}