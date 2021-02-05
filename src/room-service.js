import API from "./services/api-config.js";
import HostStorageService from "./services/host-storage-service.js";
import {stateService, log, processState} from "./tsuro.js";
import MessageBusService from "./services/message-bus-service";
import {diffChildKeys, diffObjects} from "./common/differ";

export default class RoomService {

  rooms = [];
  room = null;  // current game room registration. (key is in a separate/parent database!)

  // Room state object template
  static roomTemplate = {
    // generic properties:
    id: null,                   // unique id of the game/room
    version: 0,                 // latest state version. Iterate on every host update!
    gameName: null,             // name of the game
    gameStatus: null,           // game status, enum, one of the {starting, playing, finished, etc}
    playersNum: 0,              // current registered players in the room
    playersMax: 0,              // maximum allowed players fro this gmae type
    createdBy: null,            // player name who created the game room
  };

  constructor() {
    this.hostStorageService = HostStorageService.getInstance();
    this.messageBusService = MessageBusService.getInstance();

    this.room = {...RoomService.roomTemplate};

    this.messageBusService.subscribe(null, (eventName, data) => { //FIXME: subscribe to all events for now
      // console.log("<<< " + eventName + ": " + JSON.stringify(data));  // #DEBUG

      if (eventName === 'db-event' && data.key === 'rooms') {
        //this.onAllRoomsUpdate(data.value);
        this.syncRooms();
      }
    });
  }

  getRooms() {
    return this.hostStorageService.get("rooms", 0, -1, API.HOST_DB_NAME)   // use home db
      .then(data => {
        return ((!Array.isArray(data) && data !== null) ? [data] : data) || [];
      }).then(rooms => {
        this.onAllRoomsUpdate(rooms);
        return rooms;
      }).catch(err => {
        log(err, true);
      })
  }

  getRoom(gameId) {
    return this.getRooms()
      .then(rooms => {
        return rooms ? rooms.find(l => l && l.id == gameId) : null;   // intentional equal-ish
      }).then(room => {
        if (room && (room.version > this.room.version || room.version === 0)) {
          this.onRemoteRoomUpdate(room);
        }
        return room;
      }).catch(err => {
        log(err, true);
      })
  }

  unregisterRoom() {
    if (!this.room) {
      return;
    }
    if (!this.room.id) {
      throw "room has to be registered first. This should not happen!";
    }
    return this.hostStorageService.delete("rooms", this.room, this.room.id, null, API.HOST_DB_NAME)   // use home db
      .then(() => {
        this.room = {...RoomService.roomTemplate};
        console.log("room unregistered");
      })// use home db
      .catch(err => {
        log(err, true);
      });
  }

  registerRoom() {
    if (!this.room) {
      return;
    }
    return this.hostStorageService.add("rooms", this.room, 0, API.HOST_DB_NAME)   // use home db
      .then((room) => {
        const id = Array.isArray(room) ? room[0].id : room.id;
        this.room.id = id;
        console.log("room registered; DB id=" + id);   // #DEBUG
      })
      .catch(err => {
        log(err, true);
      });
  }

  updateRoom() {
    if (!this.room) {
      return;
    }
    if (!this.room.id) {
      throw 'Room has to have an id. This should not happen!';  //paranoia check
    }
    this.room.version++;
    return this.hostStorageService.update("rooms", this.room, null, API.HOST_DB_NAME)   // use home db
      .then((room) => {
        const id = Array.isArray(room) ? room[0].id : room.id;
        if (this.room.id !== id) {
          throw 'Room id mismatch. This should not happen!';  //paranoia check
        }
        console.log("room updated; id=" + id);   // #DEBUG
      })
      .catch(err => {
        log(err, true);
      });
  }

  syncRooms() {
    if (stateService.gameId) {
      return this.getRoom(stateService.gameId)
        .then((room) => {
          return stateService.updateRoom(); // try to register
        });
    } else {
      return this.getRooms();
    }
  }

  onRemoteRoomUpdate(room) {
    this.room = room;
    console.log("got room update; " + JSON.stringify(this.room));   // #DEBUG
    if (!stateService.gameId) {
      // only update state if on Home screen
      processState();
    }
  }

  onAllRoomsUpdate(rooms) {
    this.roomsDiffs = diffObjects(this.rooms, rooms); // build patch 'diff' for changes
    this.rooms = rooms;
    // const diffs = this.getRoomsDiffKeys('version');
    // console.log("got all rooms update; diffs: " + JSON.stringify(this.roomsDiffs) + "; keys: " + JSON.stringify(diffs));   // #DEBUG
    // if (this.roomsDiffs.size) {
    //   console.log("got all rooms update; diffs: " + JSON.stringify(this.roomsDiffs) + "; rooms: " + JSON.stringify(this.rooms));   // #DEBUG
    // }
    if (!stateService.gameId) {
      // only update state if on Home screen
      processState();
    }
    // const room = (this.room.id && this.rooms) ? this.rooms.find(l => l && l.id === this.room.id) : null;
    // if (room && (room.version > this.room.version || room.version === 0)) {
    //   this.onRemoteRoomUpdate(room);
    // }
  }

  getRoomsDiffKeys(prefix, added = true, changed = true, deleted = true) {
    const keys = [];
    if (this.roomsDiffs && added) {
      keys.push(...diffChildKeys(this.roomsDiffs, `+.${prefix}`));
    }
    if (this.roomsDiffs && changed) {
      keys.push(...diffChildKeys(this.roomsDiffs, `*.${prefix}`));
    }
    if (this.roomsDiffs && deleted) {
      keys.push(...diffChildKeys(this.roomsDiffs, `-.${prefix}`));
    }
    return keys;
  }

  ///// DEBUG ONLY!

  deleteAllRooms() {
    return this.hostStorageService.delete("rooms", null, null, null, API.HOST_DB_NAME)   // use home db
      .then(() => {
        console.log("All Rooms deleted!");
      })
      .catch(err => {
        log(err, true);
      });
  }
}