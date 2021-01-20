import {DEBUG_ENABLED} from "./debug-component.js";
import GameStateService from "./game-state-service.js";
import Tile from "./tile-component.js";
import {tiles, log, stateService, makePlayerColorStyle, makePlayerElm} from "./tsuro.js"

export const BackgroundColor = '#D69D5E33';
export const BackgroundColorActive = '#D69D5ECC';

export default class Players {

  playerElems = [];

  constructor(){
    this.playersDiv = document.getElementById('playersDiv');
  }

  getTilesDiv(idx) {
    return this.playerElems[idx].tilesDiv;
  }

  update(idx){
    const state = stateService.state;
    const playerState = stateService.getPlayerState(idx);
    const elem = this.playerElems[idx];

    const highlite = (stateService.isGamePlaying && state.playerTurn === idx)
      || (stateService.isGameFinished && playerState.playerStatus === GameStateService.PlayerStates.WON);
    if (highlite) {
      elem.style.boxShadow = "0 0 5px 5px " + makePlayerColorStyle(idx);
    } else {
      elem.style.boxShadow = "";
    }

    if (stateService.myPlayerId === idx) {
      elem.style.backgroundColor = BackgroundColorActive;
    } else {
      elem.style.backgroundColor = BackgroundColor;
    }

    if (playerState.playerStatus === GameStateService.PlayerStates.LOST) {
      elem.style.textDecoration = "line-through";
    } else {
      elem.style.textDecoration = "";
    }

    // update players cards
    // if (elem.tilesDiv) {
    //   elem.tilesDiv.innerHTML = "";
    //   for (let i = 0; playerState.playerTiles && i < playerState.playerTiles.length; i++) {
    //     let id = playerState.playerTiles[i];
    //     if (!DEBUG_ENABLED) {
    //       id = id === Tile.DragonId ? Tile.DragonId : Tile.BackId;  // hide the tiles
    //     }
    //     const tileElem = new Tile(id).element;
    //     tileElem.style.margin = "2px";
    //     tileElem.style.width = "40px";
    //     tileElem.style.height = "40px";
    //     elem.tilesDiv.appendChild(tileElem);
    //   }
    // }
  }

  init() {

    const makePlayer = (idx) => {
      const playerState = stateService.getPlayerState(idx);
      const elem = document.createElement("div");
      elem.classList.add('player-div');
      elem.innerHTML = makePlayerElm(idx);

      if (playerState.playerStatus >= GameStateService.PlayerStates.WAITING
        && playerState.playerStatus < GameStateService.PlayerStates.SPECTATOR) {
        const tilesElem = document.createElement("div");
        tilesElem.style.height = "45px";
        tilesElem.style.position = "relative";
        elem.tilesDiv = tilesElem;
        elem.appendChild(tilesElem);
      }

      this.playersDiv.appendChild(elem);
      this.playerElems.push(elem);
    };

    for (let i = 0; i < stateService.playersTotal; i++) {
      if (!this.playerElems[i]) {
        makePlayer(i);
      }
      this.update(i);
    }

    this.syncFromState();
  }

  syncFromState() {
    const idx = stateService.getStateDiffKeys('players');
    idx.forEach(i => {
      this.update(parseInt(i));
    })
  }
}