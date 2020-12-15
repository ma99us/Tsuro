import {makeGlowFilter, makeDropShadowFilter} from "./common/drawing";
import {contentDiv, makePlayerColorStyle} from "./tsuro.js";

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
      contentDiv.appendChild(this.playerMeepleElem);
    }
  }

  initPlayerMeeple(){
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
      if (!this.client.isPlayerPlaying()) {
        this.disableMeeple();
      }
    }
  }
}