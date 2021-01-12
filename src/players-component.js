import GameStateService from "./game-state-service.js";
import {tiles, log, stateService, makePlayerColorStyle, makePlayerElm} from "./tsuro.js"

export const BackgroundColor = '#D69D5E33';
export const BackgroundColorActive = '#D69D5ECC';

export default class Players {

  playerElems = [];

  constructor(){
    this.playersDiv = document.getElementById('playersDiv');
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
  }

  init() {

    const makePlayer = (idx) => {
      const playerState = stateService.getPlayerState(idx);
      const elem = document.createElement("div");
      elem.innerHTML = makePlayerElm(idx);

      this.playersDiv.insertBefore(elem, this.playersDiv.childNodes[idx]);
      this.playerElems.splice(idx, 0, elem);
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