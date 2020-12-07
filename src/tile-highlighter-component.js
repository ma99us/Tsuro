import {colorArrayToStyle} from "./drawing.js";
import Tile from "./tile-component.js";
import {TilesPos, onPlayerTilePlaced, log, stateService } from "./tsuro.js";

export default class TileHighlighter {
  elem = null;

  constructor(col = -1, row = -1){
    this.col = col;
    this.row = row;

    this.update();
  }

  move(col, row) {
    this.col = col;
    this.row = row;

    this.update();
  }

  update() {
    if (!this.elem) {
      return;
    }
    if(this.col >= 0){
      this.elem.style.left = this.col * Tile.size + "px";
    }
    if(this.row >= 0) {
      this.elem.style.top = this.row * Tile.size + "px";
    }
    if (!stateService.playerState.playerTilePlaced && stateService.playerState.playerMeeple && this.col >= 0 && this.row >= 0) {
      this.elem.style.display = "inline-block";
    } else {
      this.elem.style.display = "none";
    }
  }

  get element() {
    if(this.elem){
      this.update();
      return this.elem;
    }
    const color = [...stateService.playerState.playerColor];
    const playerColorStyle = colorArrayToStyle(color);
    color[3] = 128; // semi-transparent
    const playerColorBgStyle = colorArrayToStyle(color);
    this.elem = document.createElement("div");   // Create a <button> element
    this.elem.style.width = Tile.size +"px";
    this.elem.style.height = Tile.size + "px";
    this.elem.style.position = "absolute";
    this.elem.style.zIndex = "8";
    this.elem.style.marginLeft = TilesPos.x;
    this.elem.style.marginTop = TilesPos.y;
    //this.elem.style.border = "1px solid red";
    this.elem.style.boxShadow = "0 0 5px 5px " + playerColorStyle;
    this.elem.style.backgroundColor = playerColorBgStyle;
    this.elem.onclick = () => {
      if(!stateService.playerState.playerSelectedTile){
        log("select a tile first");
        return;
      }

      stateService.playerState.playerTilePlaced = {c: this.col, r: this.row};
      this.update();

      onPlayerTilePlaced();
    };

    this.update();
    return this.elem;
  }

  initHighlighter() {
    content.appendChild(this.element);
  }
}