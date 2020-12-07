import * as drawing from "./drawing.js";
import {transitionElement, getElementsOffset} from "./dom-animator.js";
import {traversePath, projectToTile} from "./pathnavigator.js";
import Tile from "./tile-component.js";
import Meeple from "./meeple-component.js";
import TilesDeck from "./tiles-deck-component.js";
import PlayerMeeple from "./player-meeple-component.js";
import StartingPositions from "./start-positions-component.js";
import PlayerTiles from "./player-tiles-component.js";
import TileHighlighter from "./tile-highlighter-component.js";
import GameStateService from "./game-state-service.js";

// DOM elements
export const content = document.getElementById('content');
export const board = document.getElementById('board');
export const tiles = document.getElementById('tiles');
export const tilesOverlay = document.getElementById('tilesOverlay');
export const deckArea = document.getElementById('deckArea');
export const playerArea = document.getElementById('playerArea');
export const infoDiv = document.getElementById('infoDiv');

// Global constants
export const DEBUG_PATH = false;  // show more info about path finding
export const BoardSize = tiles.width;
export const TileSize = Math.round(BoardSize / 6);
export const TileThird = TileSize / 3;
export const TilesPos = {x: tiles.style.marginLeft, y: tiles.style.marginTop};
export const PathSize = 3;
export const PathColor = [207, 190, 178, 255];

// Create global (per-game) components
export const tilesDeck = new TilesDeck();

// Global services
export const stateService = new GameStateService();

// game entry point
loadGame().then(() => {
  if (DEBUG_PATH) {
    drawing.canvasClear(tilesOverlay);
    drawing.canvasDrawLine(tilesOverlay, 0, 0, tilesOverlay.width, 0, [0xff, 0, 0, 0xff], 3);
    drawing.canvasDrawLine(tilesOverlay, tilesOverlay.width, 0, tilesOverlay.width, tilesOverlay.height, [0xff, 0, 0, 0xff], 3);
    drawing.canvasDrawLine(tilesOverlay, tilesOverlay.width, tilesOverlay.height, 0, tilesOverlay.height, [0xff, 0, 0, 0xff], 3);
    drawing.canvasDrawLine(tilesOverlay, 0, tilesOverlay.height, 0, 0, [0xff, 0, 0, 0xff], 3);
  }

  log("Starting...");
  processState();
}).catch(e => {
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

// main state machine
function processState() {
  const state = stateService.state;

  if (!stateService.isGameReady) {
    //#TEST init some dummy players for test only
    stateService.registerPlayer("Mike", Meeple.Colors[0]);
    stateService.registerPlayer("Stephan", Meeple.Colors[1]);
    stateService.registerPlayer("Ian", Meeple.Colors[2]);
    stateService.registerPlayer("Carlo", Meeple.Colors[3]);
    stateService.registerPlayer("ppl", Meeple.Colors[4]);
    stateService.registerPlayer("Kevin", Meeple.Colors[5]);
    stateService.registerPlayer("Pascal", Meeple.Colors[6]);
    //....

    // init global components
    tilesDeck.initTilesDeck();

    state.gameStatus = GameStateService.GameStates.STARTING;
    log("Players ready");
    processState();
  } else {
    const playerState = stateService.playerState;
    if (!stateService.isPlayerReady) {
      const client = stateService.client;

      // Create client (per-player) components
      client.playerMeeple = new PlayerMeeple();
      client.playerTiles = new PlayerTiles();
      client.startingPositions = new StartingPositions();
      client.highlighter = new TileHighlighter();

      // init components right away
      client.startingPositions.initStartingPositions();
      client.highlighter.initHighlighter();

      playerState.playerStatus = GameStateService.PlayerStates.IDLE;
      log("Client ready for " + playerState.playerName);
      processState();
    } else {
      onPlayerTurn();
    }
  }
}

// player selected starting position. State handler.
export function onStartPositionSelection(path) {
  // place player meeple at the start
  const id = stateService.state.playerTurn;   // player turn is basically index or id of the player and corresponding meeple
  stateService.client.playerMeeple.initPlayerMeeple(path.x0, path.y0, id, path);

  // draw starting position marker
  drawing.canvasDrawCircle(tilesOverlay, path.x0, path.y0, PathSize * 3,
    [0, 0, 0, 255], stateService.playerState.playerMeeple.color, 2);

  onPlayerTurnEnd();
}

// player's turn just ended. State handler.
export function onPlayerTurnEnd() {
  if (stateService.playingPlayersTotal) {
    stateService.advancePlayerTurn(false);
    processState();
  } else {
    log("Done.");
  }
}

// player's turn just started. State handler.
export function onPlayerTurn() {
  log("onPlayerTurn; playerTurn=" + stateService.state.playerTurn);
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
  const playerColorStyle = drawing.colorArrayToStyle(stateService.playerState.playerColor);
  infoDiv.innerHTML = "Meeple placement turn for " +
    "<span style='color: " + playerColorStyle + "'>" + stateService.playerState.playerName + "</span>";

  stateService.client.playerTiles.initPlayerTiles([]);    // no player tiles yet
}

// player's normal game flow turn, to play a tile just started. State handler.
async function onPlayerTileTurn() {
  stateService.playerState.playerTurnsPlayed++;
  stateService.playerState.playerPathLength += stateService.playerState.playerMeeple.path.step || 0;
  const playerColorStyle = drawing.colorArrayToStyle(stateService.playerState.playerColor);
  infoDiv.innerHTML = "Players left: " + stateService.playingPlayersTotal +
    ". Turn: " + stateService.playerState.playerTurnsPlayed + " for " +
    "<span style='color: " + playerColorStyle + "'>" + stateService.playerState.playerName + "</span>" +
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

  // if no more tiles left and player has none, then Game Over and this player won.
  if (!stateService.playerState.playerTiles.length && !stateService.state.deckTiles.length) {
    log("No tiles let to play for " + stateService.playerState.playerName);
    stateService.playerState.playerStatus = GameStateService.PlayerStates.LOST;
    onPlayerLost(stateService.state.playerTurn);
    onPlayerTurnEnd();
    return;
  }

  // find which tile this path can continue to, and highlight it
  let {col, row} = projectToTile(stateService.playerState.playerMeeple.path, Tile.size / 3);
  stateService.client.highlighter.move(col, row);
}

// player just placed a tile. State handler.
export function onPlayerTilePlaced() {
  // remove placed player tile
  stateService.client.playerTiles.tilePlayed(stateService.playerState.playerSelectedTile.id);

  // start tile placement animation
  let {dx, dy} = getElementsOffset(stateService.client.playerTiles.playerSelectedTileElem, tiles);
  dx += stateService.playerState.playerTilePlaced.c * Tile.size;
  dy += stateService.playerState.playerTilePlaced.r * Tile.size;
  const animStyle = {
    transition: "all 1s",
    left: dx + "px",
    top: dy + "px"
  };
  transitionElement(stateService.client.playerTiles.playerSelectedTileElem, animStyle, (ev) => {
    //log("call onTraversePlacedTile() here ")
    stateService.client.playerTiles.playerSelectedTileElem.style.display = "none";
    void onTraversePlacedTile();
  });
}

// start moving meeples on just played tile. State handler.
async function onTraversePlacedTile() {
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // draw tile image on the board
  const id = stateService.playerState.playerSelectedTile.id;
  const rot = Math.PI / 180 * stateService.playerState.playerSelectedTile.rot;
  const tile = new Tile(id, rot);
  const x = stateService.playerState.playerTilePlaced.c * Tile.size;
  const y = stateService.playerState.playerTilePlaced.r * Tile.size;
  tiles.getContext("2d").drawImage(tile.image, x, y);

  // add placed tile to game state board tiles
  stateService.state.boardTiles.push({
    c: stateService.playerState.playerTilePlaced.c,
    r: stateService.playerState.playerTilePlaced.r,
    id: id,
    rot: stateService.playerState.playerSelectedTile.rot
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

        onPlayerLost(id);
      }
      else {
        playerState.playerStatus = GameStateService.PlayerStates.PLAYING;
      }
    });
  };

  // find out which players were affected by placing current tile
  const ids = findAffectedPlayers(stateService.playerState.playerTilePlaced);
  // start traversing new tile paths for all affected players
  const promises = [];
  ids.forEach(id => {
    promises.push(affectPlayerMeeple(id));
  });

  await Promise.all(promises);

  onPlayerTurnEnd();
}

// check if given path moves out of bound of game board - player lost
function isPathLoss(path) {
  let {col, row} = projectToTile(path, Tile.size / 3);
  log("next tile; col=" + col + ", row=" + row);
  return col < 0 || col >= 6 || row < 0 || row >= 6;
}

// player just lost. State handler.
function onPlayerLost(id) {
  const playerState = stateService.getPlayerState(id);
  // check for End Game condition
  if (!stateService.playingPlayersTotal) {
    // when final player lost, he won :-)
    stateService.state.gameStatus = GameStateService.GameStates.FINISHED;

    const playerColorStyle = drawing.colorArrayToStyle(playerState.playerColor);
    infoDiv.innerHTML = "<span style='color: " + playerColorStyle + "'>" + playerState.playerName + "</span>" +
      " won on turn " + playerState.playerTurnsPlayed +
      ", total path length: " + playerState.playerPathLength;
    log("Game Over. " + playerState.playerName + " won!");
    alert("Game Over. " + playerState.playerName + " won!");
  } else {
    // return remaining player tiles back to deck
    tilesDeck.returnTilesToDeck(playerState.playerTiles);

    alert(playerState.playerName + " lost :-(");
    log(playerState.playerName + " lost :-(");
  }
}