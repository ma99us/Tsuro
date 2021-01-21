import {DEBUG_ENABLED} from "./debug-component.js";
import {makeDropShadowFilter} from "./common/drawing.js";
import {transitionElement} from "./common/dom-animator.js";
import Tile from "./tile-component.js";
import {log, stateService} from "./tsuro.js"

export default class TilesDeck {
  deckImgTile = null;
  txtElem = null;

  constructor() {
    this.deckArea = document.getElementById('deckArea');
  }

  update() {
    if (this.tilesNum > 1) {
      this.makeDeckElement(Tile.BackId);
      this.txtElem.innerHTML = this.tilesNum + " tiles left";
    } else if (this.tilesNum === 1) {
      this.makeDeckElement(Tile.BackId);
      this.txtElem.innerHTML = "1 tile left";
    } else if (!this.isDragonTileTaken) {
      this.makeDeckElement(Tile.DragonId);
      this.txtElem.innerHTML = "\"Dragon Tile\" available";
    } else {
      this.makeDeckElement(Tile.BackGreyId);
      this.txtElem.innerHTML = "No more tiles";
    }

    const shadowDepth = Math.min(this.tilesNum, 5);
    this.deckImgTile.element.style.filter = makeDropShadowFilter(shadowDepth, 'black', 0);
  }

  init() {
    if (!this.deckImgTile) {
      this.makeDeckElement(Tile.BackId);
    }

    if (!this.txtElem) {
      this.txtElem = document.createElement("p");
      this.txtElem.style.marginLeft = "50px";
      this.txtElem.style.marginTop = "0.5em";
      this.deckArea.appendChild(this.txtElem);
    }

    this.update();
  }

  makeDeckElement(id) {
    if (this.deckImgTile && this.deckImgTile.id === id) {
      return;
    } else if (this.deckImgTile) {
      this.deckImgTile.element.remove();
    }
    this.deckImgTile = new Tile(id);
    const elem = this.deckImgTile.element;
    elem.style.marginLeft = "50px";
    elem.onclick = () => {
      if (DEBUG_ENABLED) {
        const id = stateService.myClient.getPlayerState().playerTiles[0];
        if (id != null) {
          stateService.myClient.playerTiles.removePlayedTile(id);
        }
        stateService.myClient.playerTiles.drawNewTile();    // #DEBUG
      } else {
        elem.style.transform = "translate3d(0, 0, 0)";
        if (!elem.animState) {
          elem.classList.add("shake-me");
          elem.animState = true;
        } else {
          elem.classList.remove("shake-me");
          elem.animState = false;
        }
      }
    };

    this.deckArea.insertBefore(elem, this.deckArea.childNodes[0]);
  }

  // build initial tiles deck
  initDeckTiles() {
    // if (!stateService.state.deckTiles || !stateService.state.deckTiles.length) {
    stateService.state.deckTiles = [];
    stateService.state.deckTiles.push(Tile.DragonId); // dragon tile always on the bottom of the deck
    for (let id = 0; id < Tile.TotalNum; id++) {
      stateService.state.deckTiles.push(id);
    }
    // }
  }

  get isDragonTileTaken() {
    return !stateService.state.deckTiles.length || stateService.state.deckTiles[0] !== Tile.DragonId;
  }

  get tilesNum() {
    return this.isDragonTileTaken ? stateService.state.deckTiles.length : stateService.state.deckTiles.length - 1;
  }

  returnTilesToDeck(ids) {

    const doesPlayerNeedTiles = (idx) => {
      const playerState = stateService.getPlayerState(idx);
      return stateService.getIsPlayerPlaying(idx) && playerState.playerTiles.length < 3
    };

    const findNextDragonTilePlayerIdx = () => {
      let nextPlayerTurn = stateService.state.playerTurn;
      do {
        nextPlayerTurn = stateService.findNextPlayerIdx(true, nextPlayerTurn);
      } while (nextPlayerTurn >= 0 && !doesPlayerNeedTiles(nextPlayerTurn) && nextPlayerTurn !== stateService.state.playerTurn);
      return (nextPlayerTurn >= 0 && nextPlayerTurn !== stateService.state.playerTurn) ? nextPlayerTurn : -1;
    };

    for (let i = 0; i < ids.length; i++) {
      if (ids[i] === Tile.DragonId) {
        const nextPlayerTurn = findNextDragonTilePlayerIdx();
        if (nextPlayerTurn >= 0) {
          // giving Dragon to the next player
          const playerState = stateService.getPlayerState(nextPlayerTurn);
          playerState.playerTiles.push(Tile.DragonId);
          log("passing \"Dragon Tile\" to " + playerState.playerName);
        } else {
          // returning Dragon to the deck
          stateService.state.deckTiles.splice(0, 0, ids[i]);  // always insert Dragon into index 0
          log("returning \"Dragon Tile\"");
        }
      } else {
        stateService.state.deckTiles.push(ids[i]);
        log("returning tile id: " + ids[i] + ", tiles left: " + this.tilesNum);
      }
    }
    this.update();
  }

  drawRandomTile() {
    if (this.tilesNum) {
      let idx = null;
      if (this.isDragonTileTaken) {
        idx = Math.floor(Math.random() * stateService.state.deckTiles.length);  // all indexes
      } else {
        idx = Math.floor(Math.random() * (stateService.state.deckTiles.length - 1)) + 1;  // all indexes, except 0
      }

      let id = stateService.state.deckTiles.splice(idx, 1)[0];
      log("new tile id: " + id + " [" + idx + "], tiles left: " + this.tilesNum + ", isDragonTileTaken: " + this.isDragonTileTaken);
      this.update();
      return id;
    } else if (!this.isDragonTileTaken) {
      let id = stateService.state.deckTiles.splice(0, 1)[0];
      log("giving out \"dragon tile\"");
      this.update();
      return id;
    } else {
      log("no more tiles left");
      this.update();
      return null;  // deck is empty
    }
  }

  animateTileDraw(idx, callback) {
    const tBack = new Tile();
    const elem = tBack.element;
    elem.style.position = "absolute"; // for css transitions to work
    elem.style.transition = "all 1s";
    elem.style.left = "0px"; // for css transitions to work
    elem.style.top = "0px"; // for css transitions to work
    elem.style.marginLeft = "50px";
    elem.style.opacity = "1";
    elem.style.zIndex = "12";
    this.deckArea.appendChild(elem);

    const animStyle = {
      transition: "all 1s",
      top: 190 + idx * (Tile.size + 30) + "px",
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