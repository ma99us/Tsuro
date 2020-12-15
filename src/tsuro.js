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

// DOM elements
export const contentDiv = document.getElementById('content');
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

// Global services
export const stateService = new GameStateService();

// game entry point
loadGame()
  .then(() => {
    log("Starting game...");

    return stateService.connect();  // get game state and call processState()
  })
  .catch(e => {
    log("Error: " + e);
    if (e.stack) {
      log(e.stack);
    }
  });

// simple logging
export function log(text) {
  if (text === "#CLEAR") {
    // logDiv.innerHTML = "";
    return;
  }
  console.log(text);
  // status.textContent = text;
  // logDiv.innerHTML += text + '<br>';
}

// load graphic resources
async function loadGame() {
  log("Loading...");

  await Tile.init();

  await Meeple.init();
}

// load graphic resources
function initGameComponents() {
  if (!prompt.isReady || !tilesDeck.isReady) {
    log("Initializing game components...");

    // init those only once!
    prompt.initPrompt();
    tilesDeck.initTilesDeck();
  }

  // these are safe to init on every state update
  board.initBoard();

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
    client.playerMeeple.initPlayerMeeple();
    client.startingPositions.initStartingPositions();
    client.highlighter.initHighlighter();

    //TODO: update previously initialized components from state
  }
}

// main state machine
export function processState() {
  const state = stateService.state;

  if (!stateService.isGameReady) {
    log("Registering players for TEST only!...");

    //#TEST init some dummy players for test only
    stateService.registerPlayer("Mike", Meeple.Colors[0]);
    stateService.registerPlayer("Stephan", Meeple.Colors[1]);
    stateService.registerPlayer("Ian", Meeple.Colors[2]);
    stateService.registerPlayer("Carlo", Meeple.Colors[3]);
    stateService.registerPlayer("ppl", Meeple.Colors[4]);
    stateService.registerPlayer("Kevin", Meeple.Colors[5]);
    stateService.registerPlayer("Pascal", Meeple.Colors[6]);

    state.gameStatus = GameStateService.GameStates.STARTING;
    log("Game ready");

    stateService.fireLocalStateUpdated();
    processState();
  } else {

    // sync local UI components based on updated state
    initGameComponents();
    initPlayersComponents();

    const playerState = stateService.playerState;
    if (!stateService.isPlayerReady) {
      playerState.playerStatus = GameStateService.PlayerStates.IDLE;
      log("Player " + playerState.playerName + " ready");

      stateService.fireLocalStateUpdated();
      processState();
    } else {
      onPlayerTurn();
    }
  }
}

// player selected starting position. State handler.
export function onStartPositionSelection(client, path) {
  // place player meeple at the start
  const playerState = client.getPlayerState();
  const id = client.id;   // client id is basically index or id of the player and corresponding meeple id for now
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
    log("onPlayerTurnEnd; advancing player turn");
    stateService.advancePlayerTurn(false);
    stateService.fireLocalStateUpdated(); // send local state to host to sync with all clients
    processState();
  } else {
    log("Done.");
  }
}

// player's turn just started. State handler.
export function onPlayerTurn() {
  log("onPlayerTurn; playerTurn=" + stateService.state.playerTurn + ": " + stateService.playerState.playerName); //#DEBUG

  if (!stateService.isPlayerPlaying) {
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

  stateService.client.startingPositions.update();

  stateService.client.playerTiles.initPlayerTiles([]);    // no player tiles yet
}

// player's normal game flow turn, to play a tile just started. State handler.
async function onPlayerTileTurn() {
  infoDiv.innerHTML = "Players left: " + stateService.playingPlayersTotal +
    ". Turn: " + stateService.playerState.playerTurnsPlayed + " for " +
    makePlayerElm(stateService.state.playerTurn) +
    ", total path length: " + stateService.playerState.playerPathLength;

  // reset player state
  stateService.playerState.playerTilePlaced = null;
  stateService.playerState.playerSelectedTile = null;
  stateService.client.playerTiles.playerSelectedTileElem = null;

  // replenish player tile
  let newIds = [...stateService.playerState.playerTiles];
  while (newIds.length < 3) {
    //newIds.splice(0, 0, null);
    newIds.push(null);    // 'null' will trigger new tile draw from the deck
  }

  await stateService.client.playerTiles.initPlayerTiles(newIds);

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
export function onPlayerTilePlaced(client) {
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
  transitionElement(client.playerTiles.playerSelectedTileElem, animStyle, (ev) => {
    //log("call onTraversePlacedTile() here ")
    client.playerTiles.playerSelectedTileElem.style.display = "none";
    void onTraversePlacedTile(client);
  });
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

  onPlayerTurnEnd(client);
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

    infoDiv.innerHTML = makePlayerElm(id) +
      " won on turn " + playerState.playerTurnsPlayed +
      ", total path length: " + playerState.playerPathLength;
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

export function makePlayerColorStyle(id, opacity = 1) {
  const playerState = stateService.getPlayerState(id);
  const color = [...playerState.playerColor];
  color[3] = Math.round(255 * opacity);
  return drawing.colorArrayToStyle(color);
}

export function makePlayerElm(id) {
  const playerState = stateService.getPlayerState(id);
  const playerColorStyle = makePlayerColorStyle(id);
  return "<span style='color: " + playerColorStyle + "; font-weight: bolder;'>" + playerState.playerName + "</span>";
}

