import {arrFindMostSimilarIndex} from "./common/statistics.js";
import {colorArrayToStyle, getColorStylesDiff} from "./common/drawing.js";

const MeepleMapImgSrc = "img/meeple_3.png";

export default class Meeple {
  static MappingCols = 9;
  static MappingRows = 1;
  static Colors = [[226,55,46,255], [46,226,129,255], [46,193,226,255], [226,208,46,255],
    [61,61,61,255], [190,46,226,255], [50,46,226,255], [191,191,191,255]];
  static TotalNum = Meeple.Colors.length;
  static BlankID = Meeple.MappingCols - 1;

  static width = null;
  static height = null;
  static mapImg = null;

  constructor(id, rot = 0) {
    this.id = id;
    this.rot = rot;

    Meeple.init();
  }

  static async init() {
    if (Meeple.mapImg) {
      return;
    }

    return new Promise((resolve, reject) => {
      Meeple.mapImg = new Image();
      Meeple.mapImg.setAttribute('crossOrigin', '');
      Meeple.mapImg.src = MeepleMapImgSrc;
      Meeple.mapImg.onload = () => {
        Meeple.width = Math.round(Meeple.mapImg.width / Meeple.MappingCols);
        Meeple.height = Math.round(Meeple.mapImg.height / Meeple.MappingRows);
        resolve("meeples ready");
      };
    });
  }

  static get size() {
    return Math.max(Meeple.width, Meeple.height);
  }

  static findMeepleIdForColorStyle(clrStyle) {
    return arrFindMostSimilarIndex(Meeple.Colors, (clr) => getColorStylesDiff(colorArrayToStyle(clr), clrStyle));
  }

  get color() {
    return Meeple.Colors[this.id];
  }

  get image() {
    if (this.canvas) {
      return this.canvas;
    }

    const row = Math.floor(this.id / Meeple.MappingCols);
    const col = this.id % Meeple.MappingCols;
    if (row >= Meeple.MappingRows) {
      throw "bad meeple id: " + this.id;
    }

    this.canvas = document.createElement('canvas');
    this.canvas.width = Meeple.size;
    this.canvas.height = Meeple.size;

    const context = this.canvas.getContext('2d');
    const x = this.canvas.width / 2;    // center
    const y = this.canvas.height / 2;   // center
    context.translate(x, y);
    context.rotate(this.rot);
    context.drawImage(Meeple.mapImg, col * Meeple.width, row * Meeple.height, Meeple.width, Meeple.height,
      -Meeple.width / 2, -Meeple.height / 2, Meeple.width, Meeple.height);
    context.rotate(-this.rot);
    context.translate(-x, -y);

    return this.canvas;
  }

  get element() {
    if (this.elem) {
      return this.elem;
    }

    this.elem = document.createElement("canvas");   // Create a <button> element
    this.elem.meeple = this; // reference to this tile
    this.elem.width = this.image.width;
    this.elem.height = this.image.height;
    this.elem.getContext('2d').drawImage(this.image, 0, 0);

    return this.elem;
  }
}