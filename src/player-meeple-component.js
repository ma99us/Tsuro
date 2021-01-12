import {makeGlowFilter, makeDropShadowFilter} from "./common/drawing.js";
import GameStateService from "./game-state-service.js";
import {gameDiv, makePlayerColorStyle} from "./tsuro.js";

export default class PlayerMeeple{
  playerMeepleElem = null;

  constructor(client) {
    this.client = client;
  }

  makePlayerMeeple(x, y, id, path) {
    if (!this.playerMeepleElem) {
      const playerState = this.client.getPlayerState();
      const playerMeeple = this.client.startingPositions.makeMeepleAtPosition(path.x0, path.y0, id, path);
      this.playerMeepleElem = playerMeeple.element;
      //this.playerMeepleElem.style.filter = makeGlowFilter(5, makePlayerColorStyle(id), 0);
      //this.playerMeepleElem.style.filter = makeDropShadowFilter(3, 'black', 0);
      if (!playerState.playerMeeple) {
        playerState.playerMeeple = {id: id, color: playerMeeple.color, path: {...path}}; // copy starting path to runtime path
      } else {
        this.syncFromState();
      }
      gameDiv.appendChild(this.playerMeepleElem);
    }
  }

  init(){
    if (this.playerMeepleElem) {
      this.syncFromState();
    }
  }

  moveMeeple(path){
    // update player meeple position
    const elem = this.playerMeepleElem;
    elem.rot = 180 / Math.PI * path.dir;
    elem.style.left = (path.x1 - elem.width / 2) + "px";
    elem.style.top = (path.y1 - elem.height / 2) + "px";
    elem.style.transform = "rotate(" + elem.rot + "deg)";
  }

  highliteMeeple() {
    const elem = this.playerMeepleElem;
    elem.style.opacity = 1.0;
    elem.style.filter = makeGlowFilter(3, makePlayerColorStyle(this.client.id), 5);
  }

  disableMeeple() {
    const elem = this.playerMeepleElem;
    elem.style.opacity = 0.5;
  }

  hideMeeple() {
    const elem = this.playerMeepleElem;
    elem.style.opacity = 0;
  }

  syncFromState(){
    const playerState = this.client.getPlayerState();
    if (playerState.playerMeeple) {
      this.moveMeeple(playerState.playerMeeple.path);
      if (playerState.playerStatus === GameStateService.PlayerStates.LOST) {
        this.disableMeeple();
      } else if (playerState.playerStatus === GameStateService.PlayerStates.WON) {
        this.highliteMeeple();
      }
    }
  }
}