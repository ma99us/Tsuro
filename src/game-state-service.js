export default class GameStateService {
  static GameStates = {STARTING: 1, PLAYING: 5, FINISHED: 10};
  static PlayerStates = {IDLE: 1, PLAYING: 3, DONE: 6, LOST: 11, WON: 12, SPECTATOR: 15};

  // Global game state object template
  static gameStateTemplate = {
    // generic properties:
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

  onStateDirty() {
    //TODO: synchronize freshly changed state among all clients
  }

  //////// local client state components. This is not a part of the synchronized state!

  get client() {
    return this.getClient(this.state.playerTurn);
  }

  getClient(idx) {
    const state = this.state;
    if (!this.clients) {
      this.clients = state.players.map(p => new Object()); // array of empty objects
    }
    return this.clients[idx];
  }
}