import {makeGlowFilter} from "./common/drawing.js";
import {DIR} from "./pathfinder.js";
import Meeple from "./meeple-component.js";
import {TilesPos, BoardSize, TileThird, PathSize, PathColor, contentDiv, onStartPositionSelection, onPlayerTurnEnd, makePlayerColorStyle, stateService} from "./tsuro.js";

export default class StartingPositions {
  allMarkersElems = [];
  playerMarkerElem = null;

  constructor(client) {
    this.client = client;
  }

  update() {
    const selectedDisplay = "inline-block";
    const unselectedDisplay = "none";
    this.allMarkersElems.forEach((el) => {
      const show = !this.playerMarkerElem && this.client.isPlayerTurn() && !this.isAlreadyTaken(el.path);
      el.style.display = show ? "inline-block" : "none";
    });
  }

  selectPosition(elem) {
    const playerState = this.client.getPlayerState();
    this.playerMarkerElem = elem;
    playerState.playerStartMarker = elem.path;
    this.update();
  }

  isAlreadyTaken(path){
    for (let i = 0; i < stateService.playersTotal; i++) {
      const playerState = stateService.getPlayerState(i);
      if (playerState.playerStartMarker
        && playerState.playerStartMarker.x0 === path.x0
        && playerState.playerStartMarker.y0 === path.y0) {
        return true;
      }
    }
    return false;
  }

  makeMeepleAtPosition(x, y, id, path) {
    const meeple = new Meeple(id, Math.PI / 2);
    const elem = meeple.element;
    elem.rot = 180 / Math.PI * path.dir;
    elem.style.position = "absolute";
    elem.style.zIndex = "10";
    elem.style.marginLeft = TilesPos.x;
    elem.style.marginTop = TilesPos.y;
    elem.style.left = (x - meeple.element.width / 2) + "px";
    elem.style.top = (y - meeple.element.height / 2) + "px";
    elem.style.transform = "rotate(" + meeple.element.rot + "deg)";
    elem.path = {
      x: x,
      y: y,
      x0: path.x0,
      y0: path.y0,
      dir: path.dir,
      size: PathSize,
      color: PathColor
    };
    return meeple;
  }

  initStartingPositions() {
    const makeSelector = (x, y, txt, path) => {
      x = Math.round(x);
      y = Math.round(y);
      path.x0 = Math.round(path.x0);
      path.y0 = Math.round(path.y0);
      // if (this.isAlreadyTaken(path)) {
      //   return;
      // }
      const meeple = this.makeMeepleAtPosition(x, y, Meeple.BlankID, path);
      const elem = meeple.element;
      //elem.style.border = "3px solid " + makePlayerColorStyle(this.client.id);  // #DEBUG
      elem.style.filter = makeGlowFilter(3, makePlayerColorStyle(this.client.id), 3);
      elem.style.zIndex = "9";
      elem.onclick = () => {
        this.selectPosition(elem);
        onStartPositionSelection(this.client, elem.path);
        onPlayerTurnEnd(this.client);
      };
      this.allMarkersElems.push(elem);
      contentDiv.appendChild(elem);
    };

    if (!this.allMarkersElems || !this.allMarkersElems.length) {
      for (let i = 0; i < BoardSize / TileThird; i++) {
        if (i % 3 === 0) {
          continue;
        }
        const border = 4;
        makeSelector(TileThird * i, 0, "?", {x0: TileThird * i, y0: border, dir: DIR.BOTTOM});                        // top
        makeSelector(BoardSize, TileThird * i, "?", {x0: BoardSize - border, y0: TileThird * i, dir: DIR.LEFT});     // right
        makeSelector(TileThird * i, BoardSize, "?", {x0: TileThird * i, y0: BoardSize - border, dir: DIR.TOP});       // bottom
        makeSelector(0, TileThird * i, "?", {x0: border, y0: TileThird * i, dir: DIR.RIGHT});                         // left
      }
    }

    this.syncFromState();
    this.update();
  }

  syncFromState() {
    const playerState = this.client.getPlayerState();
    if (playerState.playerStartMarker) {
      this.allMarkersElems.forEach(elem => {
        if (elem.path.x0 === playerState.playerStartMarker.x0 &&
          elem.path.y0 === playerState.playerStartMarker.y0) {

          //this.playerMarkerElem = elem;
          this.selectPosition(elem);
          onStartPositionSelection(this.client, elem.path);
        }
      });

      this.update();
    }
  }
}