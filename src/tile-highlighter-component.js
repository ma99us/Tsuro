import {colorArrayToStyle} from "./common/drawing.js";
import Tile from "./tile-component.js";
import {TilesPos, onPlayerTilePlaced, log, contentDiv, makePlayerColorStyle } from "./tsuro.js";

export default class TileHighlighter {
  elem = null;

  constructor(client, col = -1, row = -1){
    this.client = client;
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
    if (!this.client.getPlayerState().playerTilePlaced && this.client.getPlayerState().playerMeeple && this.col >= 0 && this.row >= 0) {
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
    this.elem = document.createElement("div");   // Create a <button> element
    this.elem.style.width = Tile.size +"px";
    this.elem.style.height = Tile.size + "px";
    this.elem.style.position = "absolute";
    this.elem.style.zIndex = "8";
    this.elem.style.marginLeft = TilesPos.x;
    this.elem.style.marginTop = TilesPos.y;
    //this.elem.style.border = "1px solid red";
    this.elem.style.boxShadow = "0 0 5px 5px " + makePlayerColorStyle(this.client.id);
    this.elem.style.backgroundColor = makePlayerColorStyle(this.client.id, 0.5);
    this.elem.onclick = () => {
      if(!this.client.getPlayerState().playerSelectedTile){
        log("select a tile first");
        return;
      }

      this.client.getPlayerState().playerTilePlaced = {c: this.col, r: this.row};
      this.update();

      onPlayerTilePlaced(this.client);
    };

    this.update();
    return this.elem;
  }

  initHighlighter() {
    if (this.element.parentNode !== contentDiv) {
      contentDiv.appendChild(this.element);
    }

    this.syncFromState();
  }

  syncFromState() {
    this.update();
  }
}