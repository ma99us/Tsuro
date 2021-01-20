import {arrayEquals} from "./common/differ.js";
import Tile from "./tile-component.js";
import {tilesDeck, playerArea, players, log, makePlayerColorStyle, stateService} from "./tsuro.js";

const ccwBtnImgSrc = "img/ccw_btn_1.png";
const cwBtnImgSrc = "img/cw_btn_1.png";

export default class PlayerTiles {
  selectedTileElem = null;
  tilesElems = [];
  playerTilesElems = [];
  playerTilesDiv = null;

  constructor(client) {
    this.client = client;
  }

  update() {
    const playerState = this.client.getPlayerState();
    this.tilesElems.forEach((el) => {
      if (this.selectedTileElem === el) {
        el.style.boxShadow = "0 0 5px 5px " + makePlayerColorStyle(this.client.id);
      } else {
        el.style.boxShadow = "";
      }
      const show = true; // this.client.isPlayerTurn();
      el.style.display = show ? "inline-block" : "none";
      if (el.dependantElements) {
        const rotate = show && this.client.isMyClient && el.tile.id !== Tile.DragonId;
        el.dependantElements.forEach(el => el.style.visibility = rotate ? "visible" : "hidden");
      }
    });
  }

  init() {
    if (this.isBusy) {
      return;
    }

    const state = stateService.state;
    const playerState = this.client.getPlayerState();

    this.playerTilesDiv = players.getTilesDiv(this.client.id);
    this.playerTilesDiv.innerHTML = "";
    this.tilesElems = [];

    if (this.client.isMyClient) {
      playerArea.innerHTML = '';
    }
    this.playerTilesElems = [];

    for (let i = 0; i < playerState.playerTiles.length; i++) {
      if (this.client.isMyClient) {
        this.makeTile(playerState.playerTiles[i]);
      }
      this.makePlayerTile(playerState.playerTiles[i]);
    }

    this.syncFromState();
    this.update();
  }

  syncFromState(playerState = this.client.getPlayerState()) {
    const id = playerState.playerSelectedTile ? playerState.playerSelectedTile.id : null;
    const rot = playerState.playerSelectedTile ? playerState.playerSelectedTile.rot : 0;
    if (this.client.isMyClient) {
      this.tilesElems.forEach((el) => {
        if (el.tile.id === id) {
          this.rotateTile(el, rot);
          this.selectedTileElem = el;
        }
      });
    } else {
      this.playerTilesElems.forEach((el) => {
        if (el.tile.id === id) {
          this.rotateTile(el, rot);
          this.selectedTileElem = el;
        }
      });
    }
  }

  selectTile(elem) {
    const playerState = this.client.getPlayerState();
    if (elem) {
      this.selectedTileElem = elem;
      playerState.playerSelectedTile = {id: elem.tile.id, rot: elem.rot};
    } else {
      this.selectedTileElem = null;
      playerState.playerSelectedTile = null;
    }
    this.update();
  }

  rotateTile(elem, rot) {
    elem.rot = rot;
    elem.style.transitionDuration = "0.8s";
    elem.style.transitionProperty = "transform";
    elem.style.transform = "rotate(" + elem.rot + "deg)";
  }

  // remove placed player tile from player state
  tilePlayed(id) {
    const playerState = this.client.getPlayerState();
    const idx = playerState.playerTiles.findIndex((t) => t === id);
    if (idx < 0) {
      throw 'tilePlayed; player does not have tile id: ' + id + '. This should not happen!';
    }
    const elem = this.tilesElems[idx];
    if (elem && elem.dependantElements) {
      elem.dependantElements.forEach(el => el.style.visibility = "hidden");
    }

    // convert selected tile to "absolute" position fro animation to nit mess up the page
    this.selectedTileElem.style.position = "absolute";
    if (this.client.isMyClient) {
      this.selectedTileElem.style.marginLeft = (40 + 10) + "px";
    } else {
      this.selectedTileElem.style.marginLeft = idx * (40 + 2) + "px";
      this.selectedTileElem.tile.unmask();  // reveal actual card
    }

    return elem;
  }

  // remove played tile from DOM
  removePlayedTile(id) {
    const playerState = this.client.getPlayerState();
    const idx = playerState.playerTiles.findIndex((t) => t === id);
    if (idx < 0) {
      throw 'tilePlayed; player does not have tile id: ' + id + '. This should not happen!';
    }

    // remove the whole tile with rotation buttons <div> from playerArea
    const elem = this.tilesElems.splice(idx, 1)[0];
    if(elem){
      elem.parentElement.remove();
    }

    // just remove the element itself players tiles
    const elem1 = this.playerTilesElems.splice(idx, 1)[0];
    if(elem1){
      elem1.remove();
    }

    this.selectedTileElem = null;

    playerState.playerTiles.splice(idx, 1);
  }

  makeTile(id) {
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
      elem.style.top = "-60px";
      elem.style.margin = "5px";
      elem.style.visibility = tileElem.tile.id !== Tile.DragonId ? "visible" : "hidden";
      tileElem.rot = 0;
      elem.onclick = () => {
        // if (!stateService.isMyTurn) {
        //   log("it is not your turn!");
        //   return;
        // }

        if (tileElem.tile.id !== Tile.DragonId) {
          if (txt === "CCW") {
            this.rotateTile(tileElem, tileElem.rot - 90);
          } else {
            this.rotateTile(tileElem, tileElem.rot + 90);
          }
          this.selectTile(tileElem);
        }
      };
      return elem;
    };

    const tile = new Tile(id);
    const elem = tile.element;
    elem.style.margin = "5px";
    elem.style.zIndex = "11";
    elem.style.position = "relative"; // for css transitions to work
    elem.style.left = "0px"; // for css transitions to work
    elem.style.top = "0px"; // for css transitions to work
    elem.rot = 0;

    // this player tile
    elem.onclick = () => {
      // if (!stateService.isMyTurn) {
      //   log("it is not your turn!");
      //   return;
      // }

      if (elem.tile.id === Tile.DragonId) {
        elem.style.transform = "translate3d(0, 0, 0)";
        if (!elem.animState) {
          elem.classList.add("shake-me");
          elem.animState = true;
        } else {
          elem.classList.remove("shake-me");
          elem.animState = false;
        }
      } else {
        if (this.selectedTileElem === elem) {
          this.selectTile(null);
        } else {
          this.selectTile(elem);
        }
      }
    };
    this.tilesElems.push(elem);

    const tileDiv = document.createElement("div");
    tileDiv.style.whiteSpace = "nowrap";
    tileDiv.style.position = "relative";
    const btn1 = makeBtn(elem, "CCW");
    const btn2 = makeBtn(elem, "CW");
    elem.dependantElements = [btn1, btn2];
    tileDiv.appendChild(btn1);
    tileDiv.appendChild(elem);
    tileDiv.appendChild(btn2);

    playerArea.appendChild(tileDiv);
  };

  makePlayerTile(id) {
    const tile = new Tile(id);
    const elem = tile.element;
    if (id !== Tile.DragonId) {
      tile.mask();    // hide actual tile image, except the Dragon
    }
    elem.style.margin = "2px";
    elem.style.zIndex = "11";
    elem.style.position = "relative"; // for css transitions to work
    elem.style.left = "0px"; // for css transitions to work
    elem.style.top = "0px"; // for css transitions to work
    elem.rot = 0;

    // other player tile
    elem.style.width = "40px";
    elem.style.height = "40px";

    this.playerTilesElems.push(elem);
    this.playerTilesDiv.appendChild(elem);
  };

  // player needs to draw new tiles
  async drawNewTile() {
    const state = stateService.state;
    const playerState = this.client.getPlayerState();

    if (tilesDeck.isDragonTileTaken && !this.hasDragonTile) {
      // Dragon tile is taken by someone other then this player.
      // Can not draw new tiles.
      return;
    }

    if (this.hasDragonTile && tilesDeck.tilesNum) {
      // We have the dragon, and there are tiles in the deck.
      // Return the dragon and then draw
      this.removePlayedTile(Tile.DragonId);
      // stateService.state.dragonTileTaken = null;
      log(playerState.playerName + " returns Dragon tile");
      tilesDeck.returnTilesToDeck([Tile.DragonId]);
    }

    const id = tilesDeck.drawRandomTile();
    if (id === null) {
      // log(playerState.playerName + " does not draw a tile");
      return;
    } else if (id === Tile.DragonId) {
      // stateService.state.dragonTileTaken = this.client.id;
      log(playerState.playerName + " takes Dragon tile");
    }

    const idx = playerState.playerTiles.length;
    playerState.playerTiles.push(id);

    await tilesDeck.animateTileDraw(idx, () => {
      if (this.client.isMyClient) {
        this.makeTile(id);
      }
      this.makePlayerTile(id);
    });
  }

  get hasDragonTile() {
    const playerState = this.client.getPlayerState();
    return playerState.playerTiles.includes(Tile.DragonId);
  }
}