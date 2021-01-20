const TileMapImgSrc = "img/all_tiles_1.png";
const TileBackImgSrc = "img/tile_back_1.png";
const TileBackGreyImgSrc = "img/tile_back_1_grey.png";

export default class Tile {
  static MappingCols = 6;
  static MappingRows = 6;

  static size = null;
  static mapImg = null;
  static backImg = null;
  static backGreyImg = null;

  static TotalNum = Tile.MappingCols * Tile.MappingRows - 1;  // last tile is not playable (special)
  static DragonId = Tile.TotalNum;  // special dragon tile id
  static BackId = Tile.TotalNum + 1;  // tile back side id
  static BackGreyId = Tile.TotalNum + 2;  // tile back grey side id

  constructor(id = Tile.BackId, rot = 0) {
    this.id = id;
    this.rot = rot;

    Tile.init();
  }

  static async init() {
    if (Tile.mapImg && Tile.backImg && Tile.backGreyImg) {
      return;
    }

    const p1 = new Promise((resolve, reject) => {
      Tile.mapImg = new Image();
      Tile.mapImg.setAttribute('crossOrigin', '');
      Tile.mapImg.src = TileMapImgSrc;
      Tile.mapImg.onload = () => {
        Tile.size = Math.round(Tile.mapImg.width / Tile.MappingCols);
        resolve("tiles ready");
      };
    });

    const p2 = new Promise((resolve, reject) => {
      Tile.backImg = new Image();
      Tile.backImg.setAttribute('crossOrigin', '');
      Tile.backImg.src = TileBackImgSrc;
      Tile.backImg.onload = () => {
        resolve("tile back ready");
      };
    });

    const p3 = new Promise((resolve, reject) => {
      Tile.backGreyImg = new Image();
      Tile.backGreyImg.setAttribute('crossOrigin', '');
      Tile.backGreyImg.src = TileBackGreyImgSrc;
      Tile.backGreyImg.onload = () => {
        resolve("tile back grey ready");
      };
    });

    return Promise.all([p1, p2, p3]);
  }

  get image() {
    if (this.canvas) {
      return this.canvas;
    }

    const drawMappedImage = (context, x, y, width, height) => {
      const row = Math.floor(this.id / Tile.MappingCols);
      const col = this.id % Tile.MappingCols;
      if (row >= Tile.MappingRows) {
        throw "bad tile id: " + this.id;
      }
      context.drawImage(Tile.mapImg, col * Tile.size, row * Tile.size, Tile.size, Tile.size,
        x, y, width, height);
    };

    const drawBackImage = (context, x, y, width, height) => {
      context.drawImage(Tile.backImg, 0, 0, Tile.size, Tile.size,
        x, y, width, height);
    };

    const drawBackGreyImage = (context, x, y, width, height) => {
      context.drawImage(Tile.backGreyImg, 0, 0, Tile.size, Tile.size,
        x, y, width, height);
    };

    this.canvas = document.createElement('canvas');
    this.canvas.width = Tile.size;
    this.canvas.height = Tile.size;

    const context = this.canvas.getContext('2d');
    let width = this.canvas.width;
    let height = this.canvas.height;
    if (this.rot !== 0) {
      let x = width / 2;
      let y = height / 2;
      context.translate(x, y);
      context.rotate(this.rot);
      if (this.id === Tile.BackGreyId) {
        drawBackGreyImage(context, -width / 2, -height / 2, width, height);
      } else if (this.id === Tile.BackId) {
        drawBackImage(context, -width / 2, -height / 2, width, height);
      } else {
        drawMappedImage(context, -width / 2, -height / 2, width, height);
      }
      context.rotate(-this.rot);
      context.translate(-x, -y);
    } else {
      if (this.id === Tile.BackGreyId) {
        drawBackGreyImage(context, 0, 0, width, height);
      } else if (this.id === Tile.BackId) {
        drawBackImage(context, 0, 0, width, height);
      } else {
        drawMappedImage(context, 0, 0, width, height);
      }
    }

    return this.canvas;
  }

  get element() {
    if (this.elem) {
      return this.elem;
    }

    this.elem = document.createElement("canvas");   // Create a <button> element
    this.elem.tile = this; // reference to this tile
    this.elem.width = Tile.size;
    this.elem.height = Tile.size;
    this.elem.getContext('2d').drawImage(this.image, 0, 0);

    return this.elem;
  }

  mask() {
    if (!this.elem || this.isMasked) {
      return;
    }

    this.elem.getContext('2d').drawImage(Tile.backImg, 0, 0);
    this.isMasked = true;
  }

  unmask() {
    if (!this.elem || !this.isMasked) {
      return;
    }

    this.elem.getContext('2d').drawImage(this.image, 0, 0);
    this.isMasked = false;
  }
}