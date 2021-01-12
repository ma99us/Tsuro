import {arrayEquals} from "./common/differ.js";
import Tile from "./tile-component.js";
import {tilesDeck, playerArea, log , makePlayerColorStyle, stateService} from "./tsuro.js";

const ccwBtnImgSrc = "img/ccw_btn_1.png";
const cwBtnImgSrc = "img/cw_btn_1.png";

export default class PlayerTiles {
  playerSelectedTileElem = null;
  playerTilesElems = [];

  constructor(client) {
    this.client = client;
  }

  update() {
    const playerState = this.client.getPlayerState();
    this.playerTilesElems.forEach((el) => {
      if (this.playerSelectedTileElem === el) {
        el.style.boxShadow = "0 0 5px 5px " + makePlayerColorStyle(this.client.id);
      } else {
        el.style.boxShadow = "";
      }
      const show = this.client.isPlayerTurn();
      el.style.display = show ? "inline-block" : "none";
      const rotate = show && stateService.isMyTurn;
      el.dependantElements.forEach(el => el.style.visibility = rotate ? "visible" : "hidden");
    });
  }

  selectTile(elem) {
    const playerState = this.client.getPlayerState();
    if (elem) {
      this.playerSelectedTileElem = elem;
      playerState.playerSelectedTile = {id: elem.tile.id, rot: elem.rot};
    } else {
      this.playerSelectedTileElem = null;
      playerState.playerSelectedTile = null;
    }
    this.update();
  }

  rotateTile(elem, rot){
    elem.rot = rot;
    elem.style.transitionDuration = "0.8s";
    elem.style.transitionProperty = "transform";
    elem.style.transform = "rotate(" + elem.rot + "deg)";
  }

  // remove placed player tile from player state
  tilePlayed(id) {
    const playerState = this.client.getPlayerState();
    let idx = playerState.playerTiles.findIndex((t) => t === id);
    let elem = this.playerTilesElems.splice(idx, 1)[0];
    playerState.playerTiles.splice(idx, 1);
    elem.dependantElements.forEach(el => el.style.display = "none");
    return idx;
  }

  removePlayedTile() {
    if (!this.playerSelectedTileElem) {
      return;
    }
    this.playerSelectedTileElem.style.display = "none";
    this.playerSelectedTileElem.dependantElements.forEach(el => el.style.display = "none");
    this.playerSelectedTileElem.parentElement.remove();
    this.playerSelectedTileElem = null;
  }

  async init(ids = [null, null, null]) {
    const playerState = this.client.getPlayerState();
    playerArea.innerHTML = "";
    this.playerTilesElems = [];
    playerState.playerTiles = [];

    const makeBtn = (tileElem, txt) => {
      //const elem = document.createElement("button");
      //elem.innerHTML = txt;
      const elem = document.createElement("img");
      elem.style.background = txt === "CCW" ? "url(" + ccwBtnImgSrc + ") no-repeat" : "url(" + cwBtnImgSrc + ") no-repeat";
      elem.style.width = "40px";
      elem.style.height = "40px";
      elem.style.display = "inline-block";
      elem.style.position = "relative";
      elem.style.border = "1px solid black";
      elem.style.top = "-40px";
      elem.style.margin = "5px";
      tileElem.rot = 0;
      elem.onclick = () => {
        if (!stateService.isMyTurn) {
          log("it is not your turn!");
          return;
        }
        if (txt === "CCW") {
          this.rotateTile(tileElem, tileElem.rot - 90);
        } else {
          this.rotateTile(tileElem, tileElem.rot + 90);
        }
        this.selectTile(tileElem);
      };
      return elem;
    };

    const makeTile = (id) => {
      const tile = new Tile(id);
      const elem = tile.element;
      elem.style.margin = "5px";
      elem.style.zIndex = "11";
      elem.style.position = "relative"; // for css transitions to work
      elem.style.left = "0px"; // for css transitions to work
      elem.style.top = "0px"; // for css transitions to work
      elem.rot = 0;
      elem.onclick = () => {
        if (!stateService.isMyTurn) {
          log("it is not your turn!");
          return;
        }

        if (this.playerSelectedTileElem === elem) {
          this.selectTile(null);
        } else {
          this.selectTile(elem);
        }
      };
      this.playerTilesElems.push(elem);
      playerState.playerTiles.push(id);
      const tileDiv = document.createElement("div");
      tileDiv.style.whiteSpace="nowrap";
      let btn1 = makeBtn(elem, "CCW");
      let btn2 = makeBtn(elem, "CW");
      elem.dependantElements = [btn1, btn2];
      tileDiv.appendChild(btn1);
      tileDiv.appendChild(elem);
      tileDiv.appendChild(btn2);
      playerArea.appendChild(tileDiv);
    };

    const promises = [];
    for (let i = 0; i < ids.length; i++) {
      let id = ids[i];
      if (id === null) {
        id = tilesDeck.drawRandomTile();
        if (id === null) {
          continue;
        }
        const promise = tilesDeck.animateTileDraw(i, () => {
          makeTile(id);
        });
        promises.push(promise);
      } else {
        makeTile(id);
      }
    }

    await Promise.all(promises);

    this.syncFromState();
    this.update();
  }

  syncFromState(playerState = this.client.getPlayerState()) {
    const id = playerState.playerSelectedTile ? playerState.playerSelectedTile.id : null;
    const rot = playerState.playerSelectedTile ? playerState.playerSelectedTile.rot : 0;
    this.playerTilesElems.forEach((el) => {
      if (el.tile.id === id) {
        this.rotateTile(el, rot);
        this.playerSelectedTileElem = el;
      }
    });
  }
}