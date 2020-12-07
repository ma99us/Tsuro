import {transitionElement} from "./dom-animator.js";
import Tile from "./tile-component.js";
import {log, stateService} from "./tsuro.js"

const TileBackImgSrc = "img/tile_back_1.png";

export default class TilesDeck {
  imgElem = null;
  txtElem = null;

  initTilesDeck() {
    stateService.state.deckTiles = [];
    for (let id = 0; id < Tile.TotalNum; id++) {
      stateService.state.deckTiles.push(id);
    }

    this.imgElem = document.createElement("img");
    this.imgElem.src = TileBackImgSrc;
    this.imgElem.style.marginLeft = "50px";
    this.imgElem.onclick = () => {
      stateService.client.playerTiles.initPlayerTiles();
    };
    deckArea.appendChild(this.imgElem);

    this.txtElem = document.createElement("p");
    this.txtElem.style.marginLeft = "50px";
    deckArea.appendChild(this.txtElem);
    this.updateTilesDeck();
  }

  updateTilesDeck() {
    if (stateService.state.deckTiles.length > 1) {
      this.txtElem.innerHTML = stateService.state.deckTiles.length + " tiles";
    } else if (stateService.state.deckTiles.length === 1) {
      this.txtElem.innerHTML = "Last tile";
    } else {
      this.txtElem.innerHTML = "No more tiles";
    }
  }

  drawRandomTile() {
    let idx = Math.floor(Math.random() * stateService.state.deckTiles.length);
    if (idx < stateService.state.deckTiles.length) {
      let id = stateService.state.deckTiles.splice(idx, 1);
      log("new tile id: " + id + ", tiles left: " + stateService.state.deckTiles.length);
      this.updateTilesDeck();
      return id;
    } else {
      log("no more tiles left");
      this.updateTilesDeck();
      return null;  // deck is empty
    }
  }

  returnTilesToDeck(ids){
    for (let i = 0; i < ids.length; i++) {
      stateService.state.deckTiles.push(ids[i]);
      log("returning tile id: " + ids[i] + ", tiles left: " + stateService.state.deckTiles.length);
    }
    this.updateTilesDeck();
  }

  animateTileDraw(idx, callback) {
    const tBack = new Tile(Tile.BackId);
    const elem = tBack.element;
    elem.style.position = "absolute"; // for css transitions to work
    elem.style.transition = "all 1s";
    elem.style.left = "0px"; // for css transitions to work
    elem.style.top = "0px"; // for css transitions to work
    elem.style.marginLeft = "50px";
    elem.style.opacity = "1";
    elem.style.zIndex = "12";
    deckArea.appendChild(elem);

    const animStyle = {
      transition: "all 1s",
      top: 200 + idx * (Tile.size + 10) + "px",
      //opacity: "0"
    };

    return transitionElement(elem, animStyle, (ev) => {
      elem.remove();
      if (callback) {
        callback();
      }
    });
  }
}