import Tile from "./tile-component.js";
import {tiles, log, stateService} from "./tsuro.js"

export default class Board {

  init() {
    if (!this.isReady) {
      stateService.state.boardTiles.forEach(tile => {
        this.drawTile(tile);
      });
      this.isReady = true;
    }

    this.syncFromState();
  }

  placeTile(tile) {
    //TODO: maybe move board state changing logic from tsuro.js ?
  }

  drawTile(tile) {
    // draw tile image on the board
    const id = tile.id;
    const rot = Math.PI / 180 * tile.rot;
    const t = new Tile(id, rot);
    const x = tile.c * Tile.size;
    const y = tile.r * Tile.size;
    tiles.getContext("2d").drawImage(t.image, x, y);
  }

  syncFromState() {
    const idx = stateService.getStateDiffKeys('boardTiles', true, false, false);  // only new tiles
    idx.forEach(i => {
      const tile = stateService.state.boardTiles[i];
      this.drawTile(tile);
    })
  }
}