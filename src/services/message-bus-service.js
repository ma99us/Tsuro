export default class MessageBusService {
  subscribers = {};

  broadcast(eventName, data) {
    if (Array.isArray(this.subscribers[eventName])) {
      this.subscribers[eventName].forEach((callback) => {
        callback(eventName, data);
      });
    }
    if (Array.isArray(this.subscribers['-all-events-'])) {
      this.subscribers['-all-events-'].forEach((callback) => {
        callback(eventName, data);
      });
    }
  }

  subscribe(eventName, callback) {
    if(eventName){
      if (!Array.isArray(this.subscribers[eventName])) {
        this.subscribers[eventName] = [];
      }
      this.subscribers[eventName].push(callback);
    } else {
      if (!Array.isArray(this.subscribers['-all-events-'])) {
        this.subscribers['-all-events-'] = [];
      }
      this.subscribers['-all-events-'].push(callback);
    }
  }

  unsubscribe(callback) {
    for (let eventName in this.subscribers) {
      const index = this.subscribers[eventName].findIndex(clbck => clbck === callback);
      if (index >= 0) {
        this.subscribers[eventName].splice(index, 1);
      }
    }
  }

  // finally! We can use bad practice like Singleton in Java Script!
  static instance = null;

  static getInstance() {
    if (!MessageBusService.instance) {
      MessageBusService.instance = new MessageBusService();
    }
    return MessageBusService.instance;
  }
}