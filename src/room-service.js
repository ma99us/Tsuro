import API from "./services/api-config.js";
import HostStorageService from "./services/host-storage-service.js";
import {stateService, log, processState} from "./tsuro.js";
import MessageBusService from "./services/message-bus-service";

export default class RoomService {

  rooms = [];
  room = null;  // current game room registration. (key is in a separate/parent database!)

  // Room state object template
  static roomTemplate = {
    // generic properties:
    version: 0,                 // latest state version. Iterate on every host update!
    gameId: null,               // unique id of the game/room
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

      if (eventName === 'db-event' && data.event === 'UPDATED' && data.key === 'rooms') {
        //this.onAllRoomsUpdate(data.value);
        this.getRooms();
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
        return rooms ? rooms.find(l => l && l.gameId === gameId) : null;
      }).then(room => {
        if (!room) {
          console.log("room game id " + gameId + " is not registered");
          const selfOwner = stateService.myPlayerId === 0;  // we are the owners of the room, so register it
          if (selfOwner) {
            return stateService.updateRoom(false);  // do not try to fetch this room again, it needs to be registered first
          }
        } else if (room.version > this.room.version || room.version === 0) {
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
      throw 'room is detached from DB';
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
    this.room.version++;
    return this.hostStorageService.update("rooms", this.room, null, API.HOST_DB_NAME)   // use home db
      .then((room) => {
        const id = Array.isArray(room) ? room[0].id : room.id;
        if (this.room.id !== id) {
          throw 'Room id mismatch. This should not happen!';  //paranoia check
        }
        console.log("room updated; DB id=" + id);   // #DEBUG
      })
      .catch(err => {
        log(err, true);
      });
  }

  onRemoteRoomUpdate(room) {
    this.room = room;
    console.log("got room update; " + JSON.stringify(this.room));   // #DEBUG
    processState();
  }

  onAllRoomsUpdate(rooms) {
    this.rooms = rooms;
    console.log("got all rooms update; " + JSON.stringify(this.rooms));   // #DEBUG
    processState();
    // const room = (this.room.id && this.rooms) ? this.rooms.find(l => l && l.id === this.room.id) : null;
    // if (room && (room.version > this.room.version || room.version === 0)) {
    //   this.onRemoteRoomUpdate(room);
    // }
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