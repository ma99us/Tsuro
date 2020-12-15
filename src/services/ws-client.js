/*

export default class WsClient {

  ws = null;
  counter = 0;
  ignore = true;

  constructor() {
    this.ws = new WebSocket("wss://y31zqtt3wl.execute-api.us-east-1.amazonaws.com/live");

    this.ws.onopen = this.onOpen;
    this.ws.onclose = this.onClose;
    this.ws.onerror = this.onError;
    this.ws.onmessage = (event) => {
      this.onMessage(JSON.parse(event.data));
    };
  }

  onOpen(event) {
    store.dispatch(mothershipUplinkAcquired());
  }

  onClose(event) {
    store.dispatch(mothershipUplinkDown());
  }

  onError(event) {
    store.dispatch(mothershipUplinkDown());
  }

  broadcast(data) {
    //const json = JSON.parse(JSON.stringify(data));
    const json = data;
    json.lambda = 'broadcast';
    this.ws.send(JSON.stringify(json));
  };

  onMessage(data) {
    try {
      const localRoomState = store.getState().room;

      if (data.name !== localRoomState.name) {
        return;
      }

      if (roomState.updateCounter === 1) {
        // If new player join, first person with the latest state adds the player
        const remotePlayers = data.players.allIds;
        const localPlayers = localRoomState.players.allIds;
        const newPlayers = R.difference(remotePlayers, localPlayers);
        if (newPlayers.length === 1) {
          //ignore = true;
          store.dispatch(addPlayer(newPlayers[0])); // add new player
        }
        else {
          broadcast(localRoomState); // send back state when play rejoins
        }
      }
      else if (data.updateCounter >= counter) {
        counter = data.updateCounter;
        ignore = true;
        store.dispatch(adminForceUpdate(data));
      }
    }
    catch (e) {
      console.log(`Failed to parse update: ${event.data}`)
    }
  }
}

*/