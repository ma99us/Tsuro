import {diffObjects, diffChildKeys} from "./common/differ.js";
import MessageBusService from "./services/message-bus-service.js";
import API from "./services/api-config.js";
import HostStorageService from "./services/host-storage-service.js";
import LocalStorageService from "./services/local-storage-service.js";
import RoomService from "./room-service.js";
import {log, onGameLoaded, processState, processAction} from "./tsuro.js";
import {stateService} from "./tsuro";

export default class GameStateService {
  static GameStates = {STARTING: 1, PLAYING: 5, FINISHED: 10};
  static PlayerStates = {WAITING: 1, PLAYING: 3, DONE: 6, LOST: 11, WON: 12, SPECTATOR: 15};

  static GameName = "Tsuro";  // game specific
  static PlayersMax = 8;

  // Global game state object template
  static gameStateTemplate = {
    // generic properties:
    version: 0,                 // latest state version. Iterate on every host update!
    gameStatus: null,           // game status, enum, one of the {starting, playing, finished, etc}
    players: [],                // array of player states objects (as bellow)
    playerTurn: 0,              // index of the player, whose turn it is to play
    roundNum: 0,                 // game round number
    // game specific properties:
    deckTiles: [],              // array of tile ids, left in the deck
    boardTiles: [],             // array of objects {column:, row:, tile:, rotation: }
    // dragonTileTaken: null       // index of the player who took "dragon tile", null if tile is returned/available
  };

  // Each player state object template
  static playerStateTemplate = {
    // generic properties:
    playerName: null,
    playerColor: null,          // color rgb array (game specific)
    playerStatus: null,         // player game status, enum, one of the {idle, playing, lost, spectator, etc}
    playerTurnsPlayed: 0,       // number of turns this player have played
    // game specific properties:
    playerTiles: [],            // array of tile ids currently drown by player
    playerStartMarker: null,    // path object along the edge of the board where player starts the game {x, y, dir, color}
    playerSelectedTile: null,   // tile object with id and rotation which player about to place on the board {tile:, rotation: }
    playerTilePlaced: null,     // location on the board where player placed the selected tile {column, row,}
    playerMeeple: null,         // player marker location and latest path object, like {id, color, path: {x:, y:, dir:, color, size, etc.)}
    playerPathLength: 0
  };

  constructor() {
    this.localStorageService = new LocalStorageService('HFG');
    this.roomService = new RoomService();

    this.readPlayerInfo();
  }

  readPlayerInfo() {
    this.selfPlayerName = this.localStorageService.get('PlayerName');
    this.selfPlayerColor = this.localStorageService.get('PlayerColor');
    return {playerName: this.selfPlayerName, playerColor: this.selfPlayerColor};
  }

  savePlayerInfo(playerName, playerColor) {
    this.localStorageService.set('PlayerName', playerName);
    this.localStorageService.set('PlayerColor', playerColor);
  }

  newGame(gameId = null) {
    if (!gameId) {
      gameId = getRandomRange(100000, 999999);
    }
    window.location.hash = gameId;
    window.location.reload();
  }

  get gameName() {
    return GameStateService.GameName;
  }

  get playersMax() {
    return GameStateService.PlayersMax;
  }

  get gameId() {
    return window.location.hash ? window.location.hash.substr(1) : '';
  }

  get state() {
    return this.gameState;
  }

  get isGameReady() {
    const state = this.state;
    return state.gameStatus != null;
  }

  get isGameStarting() {
    const state = this.state;
    return state.gameStatus && state.gameStatus === GameStateService.GameStates.STARTING;
  }

  get isGamePlaying() {
    const state = this.state;
    return state.gameStatus && state.gameStatus === GameStateService.GameStates.PLAYING;
  }

  get isGameFinished() {
    const state = this.state;
    return state.gameStatus && state.gameStatus === GameStateService.GameStates.FINISHED;
  }

  get isMyTurn() {
    const state = this.state;
    return this.state.playerTurn === this.myPlayerId;
  }

  get playerState() {
    return this.getPlayerState(this.state.playerTurn);
  }

  get isPlayerPlaying() {
    return this.getIsPlayerPlaying(this.state.playerTurn);
  }

  get isPlayerReady() {
    return this.getIsPlayerReady(this.state.playerTurn);
  }

  get playersTotal() {
    const state = this.state;
    return state.players.length;
  }

  get playingPlayersTotal() {
    const state = this.state;
    let players = state.players.filter((p, idx) => this.getIsPlayerPlaying(idx));
    return players.length;
  }

  get myPlayerId() {
    const state = this.state;
    return this.selfPlayerName ? state.players.findIndex(p => p.playerName === this.selfPlayerName) : -1;
  }

  registerGameState() {
    this.gameState = {...GameStateService.gameStateTemplate};
    console.log('registerGameState;') //#DEBUG
  }

  registerPlayer(name, color, self = false) {
    if (!name || !name.trim()) {
      throw "Name can not be empty.";
    }

    const state = this.state;

    // prevent duplicate player names
    name = name.trim();
    const names = state.players.map(p => p.playerName);
    if (names.includes(name)) {
      throw "Name '" + name + "' already taken. Choose another.";
    }

    const player = {...GameStateService.playerStateTemplate};
    player.playerName = name;
    player.playerColor = color;
    state.players.push(player);
    console.log("registerPlayer; '" + name + "' color: " + color + "; total players: " + state.players.length) //#DEBUG

    if (self) {
      this.selfPlayerName = player.playerName;
      this.selfPlayerColor = player.playerColor;
      this.savePlayerInfo(this.selfPlayerName, this.selfPlayerColor);
      console.log("We are '" + this.selfPlayerName + "', player id:" + this.myPlayerId);
    }

    this.updateRoom();
  }

  unregisterPlayer(name) {
    if (!name || !name.trim()) {
      throw "Name can not be empty.";
    }

    const state = this.state;

    name = name.trim();
    const idx = state.players.findIndex(p => p.playerName === name);
    if (idx >= 0) {
      state.players.splice(idx, 1);
      if (this.clients) {
        // TODO: remove associated elements from DOM first
        this.clients.splice(idx, 1);
      }
    }

    if (this.selfPlayerName === name) {
      this.selfPlayerName = null;
    }

    if (this.playersTotal > 0) {
      this.updateRoom();
    } else if (this.roomService.room.id) {
      return this.roomService.unregisterRoom();
    }
  }

  advancePlayerTurn(onlyPlayingPlayers = true) {
    const state = this.state;
    let nextPlayerTurn = state.playerTurn;
    do {
      nextPlayerTurn = (nextPlayerTurn + 1) % this.playersTotal;
    } while (onlyPlayingPlayers && !this.isPlayerPlaying(nextPlayerTurn) && nextPlayerTurn !== state.playerTurn);
    state.playerTurn = nextPlayerTurn;
    return state.playerTurn;
  }

  getPlayerState(idx) {
    const state = this.state;
    idx = idx != null ? idx : state.playerTurn;
    return state.players[idx];
  }

  getIsPlayerReady(idx) {
    const playerState = this.getPlayerState(idx);
    return playerState && playerState.playerStatus != null;
  }

  getIsPlayerPlaying(idx) {
    const playerState = this.getPlayerState(idx);
    return this.getIsPlayerReady(idx) && playerState.playerStatus < GameStateService.PlayerStates.LOST;
  }

  async updateRoom(refresh = true) {
    const state = this.state;
    const selfOwner = this.myPlayerId === 0;

    if (refresh && this.gameId && !this.roomService.room.id) {
      // we are in a room but have no 'room' info yet. fetch it right now!
      await this.roomService.getRoom(this.gameId);
    }

    const room = this.roomService.room;
    room.gameId = this.gameId;
    room.gameName = this.gameName;
    room.gameStatus = state.gameStatus;
    room.playersNum = this.playersTotal;
    room.playersMax = this.playersMax;
    room.createdBy = state.players.length ? this.getPlayerState(0).playerName : null; // player id=0 is the "owner"

    if (!room.id && selfOwner) {
      return this.roomService.registerRoom();
    } else if (room.id) {
      return this.roomService.updateRoom();
    } else {
      // do not register that new room before first player gets registered
      //throw "Can't update room. This should not happen!";
    }
  }


  //////// local client state components. This is not a part of the synchronized state!

  get client() {
    return this.getClient(this.state.playerTurn);
  }

  get myClient() {
    return this.getClient(this.myPlayerId);
  }

  getClient(idx) {
    const state = this.state;
    if (!this.clients) {
      // all Players has to be registered before calling this!
      this.clients = state.players.map((p, idx) => {
        const client = {
          id: idx,
          isMyClient: idx === this.myPlayerId,
          getGameState: () => {
            return this.state;
          },
          getPlayerState: () => {
            return this.getPlayerState(idx);
          },
          isPlayerTurn: () => {
            return this.state.playerTurn === idx;
          },
          isPlayerPlaying: () => {
            return this.getIsPlayerPlaying(idx);
          },
          isPlayerReady: () => {
            return this.getIsPlayerReady(idx);
          }
        };
        return client;
      });
    }
    return this.clients[idx];
  }

  //////// host state synchronization events

  connect() {
    this.hostStorageService = HostStorageService.getInstance();
    this.messageBusService = MessageBusService.getInstance();

    const dbName = API.HOST_DB_NAME + this.gameId;
    this.hostStorageService.API.setDbName(dbName);

    this.messageBusService.subscribe(null, (eventName, data) => { //FIXME: subscribe to all events for now
      //console.log("<<< " + eventName + ": " + JSON.stringify(data));  // #DEBUG
      //console.log("<<< " + eventName);  // #DEBUG

      if (eventName === 'session-event' && data.event === 'OPENED' && data.sessionId === this.hostStorageService.sessionId) {
        this.onSessionConnected(data.sessionId);
      } else if (eventName === 'session-event' && data.event === 'CLOSED' && data.sessionId === this.hostStorageService.sessionId) {
        this.onSessionClosed();
      } else if (eventName === 'session-event' && data.event === 'ERROR' && data.sessionId === this.hostStorageService.sessionId) {
        this.onSessionError();
      } else if (eventName === 'db-event' && data.event === 'UPDATED' && data.key === 'state' && (data.value.version > this.state.version || data.value.version === 0)) {
        if (this.onRemoteStateUpdate(data.value)) {
          this.onRemoteStateUpdated();
        }
      }
    });

    console.log("Game id='" + this.gameId + "'; DB name='" + dbName + "'");  // #DEBUG
    return this.hostStorageService.connect();
  }

  onSessionConnected(sessionId) {
    this.sessionId = sessionId;

    if (this.gameId) {
      // get current game state from host or submit local state if none exists on host yet
      this.registerGameState();
      this.getRemoteState().then(() => {
        this.roomService.getRoom(this.gameId);
      });
    } else {
      this.roomService.getRooms().then(() => {
        onGameLoaded();
        processState();
      });
    }
  }

  onSessionClosed() {
    this.sessionId = null;
  }

  onSessionError() {
    //this.sessionId = null;
    log('onSessionError', true);
  }

  // Apply remote state to local state, and reflect it in UI
  onRemoteStateUpdate(remoteState) {
    //log('onRemoteStateUpdate; state: ' + JSON.stringify(remoteState)); // #DEBUG
    log('onRemoteStateUpdate; local version=' + this.gameState.version + ', remote version=' + remoteState.version + '; this.nextState=' + this.nextState); // #DEBUG

    if (this.nextState && remoteState.version !== 0) {
      // already processing next state, wait fro it's complition
      this.nextState = remoteState;
      return false; // do not call state machine
    }

    this.stateDiffs = diffObjects(this.gameState, remoteState); // build patch 'diff' for changes
    //Check if current player action just ended, and do not apply new state right away
    this.isActionState = remoteState.version !== 0 && remoteState.version === this.gameState.version + 1
      && remoteState.playerTurn !== this.gameState.playerTurn
    ;
    if (this.isActionState) {
      // queue pending state
      this.nextState = remoteState;
    } else {
      // overwrite local state now
      this.gameState = remoteState;
    }

    if (remoteState.version === 0) {  // special case - rest state and reload
      window.location.reload();
    }

    return true;
  }

  onRemoteStateUpdated() {
    if (this.nextState) {
      // player "Action" finished, animate it locally before switching to the new state
      //TODO: animate current state before switching to the next one
      processAction(this.nextState);
    } else {
      // state updated, run game state processor loop
      processState();
    }
  }

  getStateDiffKeys(prefix, added = true, changed = true, deleted = true) {
    const keys = [];
    if (this.stateDiffs && added) {
      keys.push(...diffChildKeys(this.stateDiffs, `+.${prefix}`));
    }
    if (this.stateDiffs && changed) {
      keys.push(...diffChildKeys(this.stateDiffs, `*.${prefix}`));
    }
    if (this.stateDiffs && deleted) {
      keys.push(...diffChildKeys(this.stateDiffs, `-.${prefix}`));
    }
    return keys;
  }

  fireLocalStateUpdated() {
    if (this.nextState) {
      // apply pending state instead
      this.gameState = this.nextState;
      this.nextState = null;
      // this.onRemoteStateUpdated();
      return Promise.resolve();
    } else {
      // synchronize freshly changed state among all clients
      this.state.version++;
      log('fireLocalStateUpdated; version=' + this.state.version);  // #DEBUG
      return this.updateRemoteState()
        .catch(err => {
          log('onLocalStateDirty; error: ' + err, true);
        })
    }
  }

  updateRemoteState() {
    return this.hostStorageService.update("state", this.state);
  }

  getRemoteState() {
    let stateUpdated = false;
    return this.hostStorageService.get("state")
      .then(remoteState => {
        //log('getRemoteState; state: ' + JSON.stringify(remoteState));
        //NOTE: version = 0 is a special case! Always force local state update.
        if (!remoteState) {
          return this.updateRemoteState();
        } else if (remoteState.version > this.state.version || remoteState.version === 0) {
          return this.onRemoteStateUpdate(remoteState);
        }
      })
      .then(() => {
        onGameLoaded();
      })
      .then(() => {
        this.onRemoteStateUpdated();
      })
      .catch(err => {
        log('getRemoteState; error: ' + err, true);
        if (err.stack) {
          log(err.stack);
        }
      })
  }
}


/**
 * Generates a random number in the range from "to" to "from" inclusive.
 */
export function getRandomRange(from = 1, to = 999999) {
  return Math.floor(Math.random() * (to + 1 - from) + from);
}