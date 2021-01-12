import Tile from "./tile-component.js";
import {TilesPos, onPlayerTilePlaced, log, gameDiv, makePlayerColorStyle, stateService } from "./tsuro.js";

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

    const show = this.client.isPlayerTurn() && !this.client.getPlayerState().playerTilePlaced && this.client.getPlayerState().playerMeeple && this.col >= 0 && this.row >= 0;
    this.elem.style.display = show ? "inline-block" : "none";
  }

  async placeTile() {
    const playerState = this.client.getPlayerState();

    playerState.playerTilePlaced = {c: this.col, r: this.row};
    this.update();

    await onPlayerTilePlaced(this.client);
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
    this.elem.onclick = async () => {
      if (!stateService.isMyTurn) {
        log("it is not your turn!");
        return;
      }

      const playerState = this.client.getPlayerState();
      if(!playerState.playerSelectedTile){
        log("select a tile first");
        return;
      }

      await this.placeTile();
    };

    this.update();
    return this.elem;
  }

  init() {
    if (this.element.parentNode !== gameDiv) {
      gameDiv.appendChild(this.element);
    }

    this.syncFromState();
  }

  syncFromState() {
    this.update();
  }
}