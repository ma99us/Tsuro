import * as drawing from "./common/drawing.js";
import {transitionElement, getElementsOffset, sleep} from "./common/dom-animator.js";
import {traversePath, projectToTile} from "./pathnavigator.js";
import Tile from "./tile-component.js";
import Meeple from "./meeple-component.js";
import TilesDeck from "./tiles-deck-component.js";
import PlayerMeeple from "./player-meeple-component.js";
import StartingPositions from "./start-positions-component.js";
import PlayerTiles from "./player-tiles-component.js";
import TileHighlighter from "./tile-highlighter-component.js";
import Prompt from "./prompt-component.js";
import GameStateService from "./game-state-service.js";
import Board from "./board-component.js";
import Players, {BackgroundColor, BackgroundColorActive} from "./players-component.js";
import Room from "./room-component.js";
import Home from "./home-component.js";
import {initDebug} from "./debug-component.js";

initDebug();    // REMOVE BEFORE RELEASE!

// DOM elements
export const gameDiv = document.getElementById('game');
//export const board = document.getElementById('board');
export const tiles = document.getElementById('tiles');
export const tilesOverlay = document.getElementById('tilesOverlay');
export const deckArea = document.getElementById('deckArea');
export const playerArea = document.getElementById('playerArea');
export const infoDiv = document.getElementById('infoDiv');

// Global constants
export const BoardSize = tiles.width;
export const TileSize = Math.round(BoardSize / 6);
export const TileThird = TileSize / 3;
export const TilesPos = {x: tiles.style.marginLeft, y: tiles.style.marginTop};
export const PathSize = 3;
export const PathColor = [207, 190, 178, 255];

// Create global (per-game) components
export const prompt = new Prompt();
export const tilesDeck = new TilesDeck();
export const board = new Board();
export const players = new Players();
export const room = new Room();
export const home = new Home();

// Global services
export const stateService = new GameStateService();

// game entry point
loadGame()
  .then(() => {
    log("Connecting to server...");

    return stateService.connect();  // get game state and call processState()
  })
  .catch(e => {
    log("Error: " + e, true);
    if (e.stack) {
      log(e.stack);
    }
  });

// simple logging
export function log(text, isError = false) {
  if (text === "#CLEAR") {
    // logDiv.innerHTML = "";
    return;
  }
  console.log(text);
  // status.textContent = text;
  // logDiv.innerHTML += text + '<br>';

  if (isError) {
    prompt.showError(text);
  }
}

// load graphic resources
async function loadGame() {
  log("Loading...");

  prompt.init();  // init this early, so we can use it right away
  prompt.showWarning("Loading...", -1);

  //await includeHTML(gameDiv, 'tsuro.html');
  // export const tiles = document.getElementById('tiles');
  // export const tilesOverlay = document.getElementById('tilesOverlay');
  // export const deckArea = document.getElementById('deckArea');
  // export const playerArea = document.getElementById('playerArea');
  // export const infoDiv = document.getElementById('infoDiv');

  await Tile.init();

  await Meeple.init();
}

export function onGameLoaded() {  // called by game-state-service when game state is ready and aright before the state machine loop
  prompt.hidePrompt();
}

// load graphic resources
function initGameComponents() {
  // these are safe to init on every state update
  tilesDeck.init();
  board.init();
  players.init();

  //TODO: update previously initialized components from state
}

function initPlayersComponents() {
  for (let id = 0; id < stateService.playersTotal; id++) {
    const client = stateService.getClient(id);
    if (!client.isReady) {
      log("Initializing player components for " + client.getPlayerState().playerName + "...");

      // Create client (per-player) components. Do this only once!
      client.playerMeeple = new PlayerMeeple(client);
      client.playerTiles = new PlayerTiles(client);
      client.startingPositions = new StartingPositions(client);
      client.highlighter = new TileHighlighter(client);

      client.isReady = true;
    }

    // these are safe to init on every state update
    client.playerMeeple.init();
    client.startingPositions.init();
    client.highlighter.init();

    //TODO: update previously initialized components from state
  }
}

export function registerPlayer(playerName, playerColor, self = false) {
  stateService.registerPlayer(playerName, playerColor, self);

  return stateService.fireLocalStateUpdated().finally(() => {
    processState();
  });
}

export function unregisterPlayer(playerName) {
  stateService.unregisterPlayer(playerName);

  return stateService.fireLocalStateUpdated().finally(() => {
    processState();
  });
}

export function startGame() {
  const state = stateService.state;
  state.gameStatus = GameStateService.GameStates.PLAYING;
  log("Game playing");

  stateService.fireLocalStateUpdated()
    .then(() => {
      return stateService.updateRoom();
    })
    .finally(() => {
    processState();
  });
}

// main state machine
export function processState() {
  if (stateService.gameId) {
    // we are in the "game mode"
    home.show(false);

    const state = stateService.state;

    if (!stateService.isGameReady) {
      // we are in a brand new game. Go to the game room first.
      room.show(false);
      showGame(false);

      state.gameStatus = GameStateService.GameStates.STARTING;
      log("Game starting");

      stateService.fireLocalStateUpdated()
        .then(() => {
          return stateService.updateRoom();
        })
        .finally(() => {
        processState();
      });
    } else if (stateService.isGameStarting) {
      // we are in the game "room". Register players, the game is about to start.
      room.init();
      room.show(true);
      showGame(false);
      // TODO:

    } else if (stateService.isGamePlaying || stateService.isGameFinished) {
      // the game is on!
      room.show(false);
      showGame(true);

      // sync local UI components based on updated state
      initGameComponents();
      initPlayersComponents();

      const playerState = stateService.playerState;
      if (playerState && !stateService.isPlayerReady) {
        playerState.playerStatus = GameStateService.PlayerStates.WAITING;
        log("Player " + playerState.playerName + " ready");

        stateService.fireLocalStateUpdated().finally(() => {
          processState();
        });
      } else if (playerState && stateService.isGamePlaying) {
        onPlayerTurn();
      } else if(playerState && stateService.isGameFinished){
        // just show the winner prompt
        const winnerIdx = state.players.findIndex(p => p.playerStatus === GameStateService.PlayerStates.WON);
        if (winnerIdx >= 0) {
          onPlayerDone(winnerIdx);
        }
      }
    }
  } else {
    // we are on the "home screen". Create a new game with unique ID
    home.init();
    home.show(true);
    room.show(false);
    showGame(false);
  }
}

export function processAction(nextState) {
  if (!stateService.isGameReady) {
    // just apply final state
    stateService.fireLocalStateUpdated().finally(() => {
      processState();
    });
    return;
  }

  //TODO: re-play player action
  // figure out if it was 'placement' turn or 'tiles' turn
  // get affected player index:
  const playerIdx = stateService.getStateDiffKeys('players')[0];
  if (playerIdx == null) {
    throw "Player's state has to change. This should not happen!";
  }
  const client = stateService.getClient(playerIdx);
  const nextPlayerState = nextState.players[playerIdx];

  // check if starting position changed
  if (stateService.getStateDiffKeys('players.' + playerIdx + '.playerStartMarker').length) {
    log("'starting position' action for playerIdx=" + playerIdx); // #DEBUG
    // this looks like 'starting position' action.
    // nothing to animate, just switch to the end state
    stateService.fireLocalStateUpdated().finally(() => {
      processState();
    });
  } else if (stateService.getStateDiffKeys('players.' + playerIdx + '.playerTilePlaced').length) {
    log("'tile placing' action for playerIdx=" + playerIdx); // #DEBUG
    // this looks like a 'tile placing' action
    // re-play placed tile action's animations
    client.playerTiles.syncFromState(nextPlayerState);

    client.getPlayerState().playerSelectedTile = nextPlayerState.playerSelectedTile;
    // let {col, row} = projectToTile(nextPlayerState.playerMeeple.path, Tile.size / 3);
    // client.highlighter.move(col, row);
    client.highlighter.placeTile();
  } else {
    log("Unexpected action for playerIdx=" + playerIdx+":" + JSON.stringify(stateService.stateDiffs)); // #DEBUG
  }
}

// player selected starting position. State handler.
export function onStartPositionSelection(client, path) {
  // place player meeple at the start
  const playerState = client.getPlayerState();
  const id = Meeple.findMeepleIdForColorStyle(playerState.playerColor);
  client.playerMeeple.makePlayerMeeple(path.x0, path.y0, id, path);

  // draw starting position marker
  drawing.canvasDrawCircle(tilesOverlay, path.x0, path.y0, PathSize * 3,
    [0, 0, 0, 255], playerState.playerMeeple.color, 2);
}

// player's turn just ended. State handler.
export function onPlayerTurnEnd(client = stateService.client) {
  const playerState = client.getPlayerState();
  playerState.playerTurnsPlayed++;
  if (stateService.playingPlayersTotal) {
    const oldPlayerTurn = stateService.state.playerTurn;
    stateService.advancePlayerTurn(false);
    log("onPlayerTurnEnd; advancing player turn; " + oldPlayerTurn + " => " + stateService.state.playerTurn);

    // send local state to host to sync with all clients
    stateService.fireLocalStateUpdated()
      .finally(() => {
        processState();
      });
  } else {
    log("Game finished. Done.");
    stateService.advancePlayerTurn(false);  // advance only so that last player action get processed correctly
    stateService.fireLocalStateUpdated()
      .then(() => {
        return stateService.updateRoom();
      })
      .finally(() => {
        processState();
      });
  }
}

// player's turn just started. State handler.
export function onPlayerTurn() {
  log("onPlayerTurn; playerTurn=" + stateService.state.playerTurn + ": " + stateService.playerState.playerName); //#DEBUG

  if (!stateService.isPlayerPlaying) {
    log(stateService.playerState.playerName + " is not playing anymore. The turn is over right away.");
    onPlayerTurnEnd();
  } else if (!stateService.playerState.playerMeeple) {
    onPlayerStartingPositionTurn();
  } else {
    onPlayerTileTurn();
  }
}

// player's preliminary turn, to pick starting position just started. State handler.
function onPlayerStartingPositionTurn() {
  infoDiv.innerHTML = "Meeple placement turn for " + makePlayerElm(stateService.state.playerTurn);

  if (stateService.isMyTurn) {
    infoDiv.style.boxShadow = "0 0 5px 5px " + makePlayerColorStyle(stateService.state.playerTurn);
    infoDiv.style.backgroundColor = BackgroundColorActive;
  } else {
    infoDiv.style.boxShadow = "";
    infoDiv.style.backgroundColor = BackgroundColor;
  }

  stateService.client.startingPositions.update();

  stateService.client.playerTiles.init([]);    // no player tiles yet
}

// player's normal game flow turn, to play a tile just started. State handler.
async function onPlayerTileTurn() {
  infoDiv.innerHTML = "Turn: " + stateService.playerState.playerTurnsPlayed + " for " +
    makePlayerElm(stateService.state.playerTurn) + ". Players left: " + stateService.playingPlayersTotal
    //+ ", total path length: " + stateService.playerState.playerPathLength
    ;

  if (stateService.isMyTurn) {
    infoDiv.style.boxShadow = "0 0 5px 5px " + makePlayerColorStyle(stateService.state.playerTurn);
    infoDiv.style.backgroundColor = BackgroundColorActive;
  } else {
    infoDiv.style.boxShadow = "";
    infoDiv.style.backgroundColor = BackgroundColor;
  }

  // reset player state
  stateService.playerState.playerTilePlaced = null;
  stateService.playerState.playerSelectedTile = null;
  stateService.client.playerTiles.playerSelectedTileElem = null;

  await stateService.client.playerTiles.init([...stateService.playerState.playerTiles]);

  const noMoreTilesToPlay = stateService.isPlayerPlaying && !stateService.playerState.playerTiles.length && !stateService.state.deckTiles.length;
  const lastPlayerPlaying = stateService.isPlayerPlaying && stateService.playingPlayersTotal === 1;

  // if no more tiles left and player has none, then Game Over and this player won.
  if (lastPlayerPlaying || noMoreTilesToPlay) {
    log("No tiles left to play or " + stateService.playerState.playerName + " is the last player standing");
    stateService.playerState.playerStatus = GameStateService.PlayerStates.WON;
    onPlayerDone(stateService.state.playerTurn);
    onPlayerTurnEnd();
    return;
  }

  // find which tile this path can continue to, and highlight it
  let {col, row} = projectToTile(stateService.playerState.playerMeeple.path, Tile.size / 3);
  stateService.client.highlighter.move(col, row);
}

// player just placed a tile. State handler.
export async function onPlayerTilePlaced(client) {
  // remove placed player tile
  client.playerTiles.tilePlayed(client.getPlayerState().playerSelectedTile.id);

  // start tile placement animation
  let {dx, dy} = getElementsOffset(client.playerTiles.playerSelectedTileElem, tiles);
  dx += client.getPlayerState().playerTilePlaced.c * Tile.size;
  dy += client.getPlayerState().playerTilePlaced.r * Tile.size;
  const animStyle = {
    transition: "all 1s",
    left: dx + "px",
    top: dy + "px"
  };

  await transitionElement(client.playerTiles.playerSelectedTileElem, animStyle);

  client.playerTiles.removePlayedTile();

  await onTraversePlacedTile(client);

  // replenish player tile
  let newIds = [...client.getPlayerState().playerTiles];
  while (newIds.length < 3) {
    //newIds.splice(0, 0, null);
    newIds.push(null);    // 'null' will trigger new tile draw from the deck
  }
  await client.playerTiles.init(newIds);

  log(stateService.playerState.playerName + "' tile placing 'turn is over");
  onPlayerTurnEnd(client);
}

// start moving meeples on just played tile. State handler.
async function onTraversePlacedTile(client) {
  const playerState = client.getPlayerState();
  // draw tile image on the board
  const id = playerState.playerSelectedTile.id;
  const rot = Math.PI / 180 * playerState.playerSelectedTile.rot;
  const tile = new Tile(id, rot);
  const x = playerState.playerTilePlaced.c * Tile.size;
  const y = playerState.playerTilePlaced.r * Tile.size;
  tiles.getContext("2d").drawImage(tile.image, x, y);

  // add placed tile to game state board tiles
  stateService.state.boardTiles.push({
    c: playerState.playerTilePlaced.c,
    r: playerState.playerTilePlaced.r,
    id: id,
    rot: playerState.playerSelectedTile.rot
  });

  const findAffectedPlayers = (tile) => {
    const ids = [];
    for (let i = 0; i < stateService.playersTotal; i++) {
      const playerState = stateService.getPlayerState(i);
      if (!playerState.playerMeeple) {
        continue;
      }
      let {col, row} = projectToTile(playerState.playerMeeple.path, Tile.size / 3);
      if (tile.c === col && tile.r === row) {
        ids.push(i);
      }
    }
    return ids;
  };

  const affectPlayerMeeple = async (id) => {
    const playerState = stateService.getPlayerState(id);
    const client = stateService.getClient(id);
    const path = playerState.playerMeeple.path; // this object will be changed by traversePath()
    path.x0 = path.x1 != null ? path.x1 : path.x0;
    path.y0 = path.y1 != null ? path.y1 : path.y0;
    await traversePath(tiles, path, path.dir, async (p) => {
      // draw path track
      drawing.canvasDrawLine(tilesOverlay, path.x2, path.y2,
        path.x1, path.y1, playerState.playerMeeple.color, path.size * 2);

      // update player meeple position
      client.playerMeeple.moveMeeple(path);

      if (path.found) {
        await sleep(30);     // path traversal animation speed
      } else if (isPathLoss(path)) {
        // next tile is outside the board
        client.playerMeeple.disableMeeple();

        // draw end position marker
        drawing.canvasDrawCircle(tilesOverlay, path.x1, path.y1, PathSize * 3,
          [0, 0, 0, 255], [0, 0, 0, 255], 2);

        playerState.playerStatus = GameStateService.PlayerStates.LOST;

        onPlayerDone(id);
      }
      else {
        playerState.playerStatus = GameStateService.PlayerStates.PLAYING;
      }
    });

    playerState.playerPathLength += playerState.playerMeeple.path.step || 0;
  };

  // find out which players were affected by placing current tile
  const ids = findAffectedPlayers(playerState.playerTilePlaced);
  // start traversing new tile paths for all affected players
  const promises = [];
  ids.forEach(id => {
    promises.push(affectPlayerMeeple(id));
  });

  await Promise.all(promises);
}

// check if given path moves out of bound of game board - player lost
function isPathLoss(path) {
  let {col, row} = projectToTile(path, Tile.size / 3);
  log("next tile; col=" + col + ", row=" + row);
  return col < 0 || col >= 6 || row < 0 || row >= 6;
}

// player just lost or can not play his turn.
async function onPlayerDone(id) {
  const playerState = stateService.getPlayerState(id);
  // check for End Game condition
  if (!stateService.playingPlayersTotal) {
    // when final player lost, he won :-)
    stateService.state.gameStatus = GameStateService.GameStates.FINISHED;
    playerState.playerStatus = GameStateService.PlayerStates.WON;

    const tilesLeft = Tile.TotalNum - stateService.state.boardTiles.length;
    infoDiv.innerHTML = makePlayerElm(id) +
      " won on turn " + playerState.playerTurnsPlayed +
      //", total path length: " + playerState.playerPathLength;
      ". Tiles left: " + tilesLeft;

    infoDiv.style.boxShadow = "0 0 5px 5px " + makePlayerColorStyle(id);
    infoDiv.style.backgroundColor = BackgroundColorActive;

    log("Game Over. " + playerState.playerName + " won!");
    //alert("Game Over. " + playerState.playerName + " won!");
    await prompt.showSuccess("Game Over. " + makePlayerElm(id) + " won!", -1);
  } else {
    // return remaining player tiles back to deck
    tilesDeck.returnTilesToDeck(playerState.playerTiles);

    log(playerState.playerName + " lost :-(");
    //alert(playerState.playerName + " lost :-(");
    await prompt.showPrompt(makePlayerElm(id) + " lost :-(");
  }
}

// show/hide game entirely
function showGame(show) {
  gameDiv.style.display = show ? "block" : "none";
}

export function makePlayerColorStyle(id, opacity = 1) {
  const playerState = stateService.getPlayerState(id);
  const color = drawing.colorStyleToArray(playerState.playerColor);
  color[3] = opacity < 1 ? Math.floor(Math.round(255 * opacity)) : color[3];
  return drawing.colorArrayToStyle(color);
}

export function makePlayerElm(id) {
  const playerState = stateService.getPlayerState(id);
  const playerColorStyle = makePlayerColorStyle(id);
  return "<span class='outlined-text' style='color: " + playerColorStyle + "; font-weight: bolder;'>" + playerState.playerName + "</span>";
}

