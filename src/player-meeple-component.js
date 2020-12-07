import {colorArrayToStyle} from "./drawing.js";
import {stateService} from "./tsuro.js";

export default class PlayerMeeple{
  playerMeepleElem = null;

  initPlayerMeeple(x, y, id, path) {
    const color = stateService.playerState.playerColor;
    const playerColorStyle = colorArrayToStyle(color);
    const playerMeeple = stateService.client.startingPositions.makeMeepleAtPosition(path.x0, path.y0, id, path);
    this.playerMeepleElem = playerMeeple.element;
    this.playerMeepleElem.style.filter = "drop-shadow(0 0 5px " + playerColorStyle + ")";    //FIXME: this does not quite work for some reason
    stateService.playerState.playerMeeple = {id: id, color: playerMeeple.color, path: {...path}}; // copy starting path to runtime path
    content.appendChild(this.playerMeepleElem);
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
}