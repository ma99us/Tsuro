import {diffObjects, diffChildKeys} from "./common/differ.js";
import MessageBusService from "./services/message-bus-service.js";
import API from "./services/api-config.js";
import HostStorageService from "./services/host-storage-service.js";
import {log, processState} from "./tsuro.js";

export default class GameStateService {
  static GameStates = {STARTING: 1, PLAYING: 5, FINISHED: 10};
  static PlayerStates = {IDLE: 1, PLAYING: 3, DONE: 6, LOST: 11, WON: 12, SPECTATOR: 15};

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
    boardTiles: []             // array of objects {column:, row:, tile:, rotation: }
  };

  // Each player state object template
  static playerStateTemplate = {
    // generic properties:
    playerName: null,
    playerColor: null,
    playerStatus: null,         // player game status, enum, one of the {idle, playing, lost, spectator, etc}
    playerTurnsPlayed: 0,       // number of turns this player have played
    // game specific properties:
    playerTiles: [],            // array of tile ids currently drown by player
    playerStartMarker: null,    // path object along the edge of the board where player starts the game {x, y, dir, color}
    playerSelectedTile: null,   // tile object with id and rotation which player about to place on the board {tile:, rotation: }
    playerTilePlaced: null,     // location onthe board where playewr placed the tile {column, row,}
    playerMeeple: null,         // player marker location and latest path object, like {id, color, path: {x:, y:, dir:, color, size, etc.)}
    playerPathLength: 0
  };

  constructor() {
    this.gameState = {...GameStateService.gameStateTemplate};
  }

  get gameId() {
    return window.location.hash.substr(1);
  }

  get state() {
    return this.gameState;
  }

  get isGameReady() {
    const state = this.state;
    return state.gameStatus;
  }

  get isGamePlaying() {
    const state = this.state;
    return state.gameStatus && state.gameStatus < GameStateService.GameStates.FINISHED;
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

  registerPlayer(name, color) {
    const state = this.state;
    const player = {...GameStateService.playerStateTemplate};
    player.playerName = name;
    player.playerColor = color;
    state.players.push(player);
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
    return playerState.playerStatus;
  }

  getIsPlayerPlaying(idx) {
    const playerState = this.getPlayerState(idx);
    return playerState.playerStatus && playerState.playerStatus < GameStateService.PlayerStates.LOST;
  }

  //////// local client state components. This is not a part of the synchronized state!

  get client() {
    return this.getClient(this.state.playerTurn);
  }

  getClient(idx) {
    const state = this.state;
    if (!this.clients) {
      // all Players has to be registered before calling this!
      this.clients = state.players.map((p, idx) => {
        const client = {
          id: idx,
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
    this.messageBusService = MessageBusService.getInstance();
    this.messageBusService.subscribe(null, (eventName, data) => { //FIXME: subscribe to all events for now
      console.log("<<< " + eventName + ": " + JSON.stringify(data));  // #DEBUG

      if (eventName === 'session-event' && data.event === 'OPENED') {
        this.onSessionConnected(data.sessionId);
      } else if (eventName === 'session-event' && data.event === 'CLOSED') {
        this.onSessionClosed();
      } else if (eventName === 'session-event' && data.event === 'ERROR') {
        this.onSessionError();
      } else if (eventName === 'db-event' && data.event === 'UPDATED' && data.key === 'state' && data.value.version > this.state.version) {
        this.onRemoteStateUpdated(data.value);
        processState(); // start game state processor loop
      }
    });

    this.hostStorageService = HostStorageService.getInstance();
    const dbName = API.HOST_DB_NAME + this.gameId;
    this.hostStorageService.API.setDbName(dbName);
    return this.hostStorageService.connect();
  }

  onSessionConnected(sessionId) {
    this.sessionId = sessionId;

    // get current game state from host or submit local state if none exists on host yet
    this.getRemoteState();
  }

  onSessionClosed() {
    this.sessionId = null;
  }

  onSessionError() {
    //this.sessionId = null;
    log('onSessionError');
  }

  // Apply remote state to local state, and reflect it in UI
  onRemoteStateUpdated(remoteState) {
    log('onRemoteStateUpdated; state: ' + JSON.stringify(remoteState));
    this.stateDiffs = diffObjects(this.gameState, remoteState); // build patch 'diff' for changes
    this.gameState = remoteState; //overwrite local state?
  }

  getStateDiffKeys(prefix, added = true, changed = true, deleted = true) {
    const keys = [];
    if (this.stateDiffs && added) {
      keys.push(...diffChildKeys(this.stateDiffs, `+.${prefix}.`));
    }
    if (this.stateDiffs && changed) {
      keys.push(...diffChildKeys(this.stateDiffs, `*.${prefix}.`));
    }
    if (this.stateDiffs && deleted) {
      keys.push(...diffChildKeys(this.stateDiffs, `-.${prefix}.`));
    }
    return keys;
  }

  fireLocalStateUpdated() {
    // synchronize freshly changed state among all clients
    this.state.version++;
    this.hostStorageService.update("state", this.state)
      .catch(err => {
        log('onLocalStateDirty; error: ' + err);
      })
  }

  getRemoteState() {
    let stateUpdated = false;
    return this.hostStorageService.get("state")
      .then(remoteState => {
        //log('getRemoteState; state: ' + JSON.stringify(remoteState));
        if (!remoteState || remoteState.version < this.state.version) {
          return this.hostStorageService.update("state", this.state);
        } else if (remoteState.version > this.state.version) {
          this.onRemoteStateUpdated(remoteState);
        }
      })
      .then(() => {
        processState(); // start game state processor loop
      })
      .catch(err => {
        log('getRemoteState; error: ' + err);
      })
  }
}