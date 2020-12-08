import * as drawing from "./drawing.js";
import {averageColor, isSimilarColor} from "./pathfinder.js";
import Tile from "./tile-component.js";
import {log} from "./tsuro.js";
import {tilesOverlay} from "./tsuro";

const DEBUG_PATH = false;  // show more info about path finding
const StopPixel = [0,0,0,0];  // stop path finding immediately if encountered such pixels

// calculate the "difference" between the two colors
function getColorDiff(px1, px2) {
  if (!px1 || !px2) {
    return 255;
  }
  return (Math.abs(px1[0] - px2[0]) +
    Math.abs(px1[1] - px2[1]) +
    Math.abs(px1[2] - px2[2]) +
    Math.abs(px1[3] - px2[3])) / 4;
}

// traverse path found in 'metaInfo' one by one
async function traversePaths(canvas) {
  log("Traversing all paths...");

  if (DEBUG_PATH) {
    drawing.canvasClear(tilesOverlay);
    drawing.canvasDrawLine(tilesOverlay, 0, 0, tilesOverlay.width, 0, [0xff, 0, 0, 0xff], 3);
    drawing.canvasDrawLine(tilesOverlay, tilesOverlay.width, 0, tilesOverlay.width, tilesOverlay.height, [0xff, 0, 0, 0xff], 3);
    drawing.canvasDrawLine(tilesOverlay, tilesOverlay.width, tilesOverlay.height, 0, tilesOverlay.height, [0xff, 0, 0, 0xff], 3);
    drawing.canvasDrawLine(tilesOverlay, 0, tilesOverlay.height, 0, 0, [0xff, 0, 0, 0xff], 3);
  }

  // top paths
  for (let i = 0; i < metaInfo.topPaths.length; i++) {
    const path = metaInfo.topPaths[i];
    path.x0 = path.offset;
    path.y0 = metaInfo.topEdge;
    await traversePath(canvas, path, DIR.BOTTOM);
  }
  // right paths
  for (let i = 0; i < metaInfo.rightPaths.length; i++) {
    const path = metaInfo.rightPaths[i];
    path.x0 = metaInfo.rigthEdge;
    path.y0 = path.offset;
    await traversePath(canvas, path, DIR.LEFT);
  }
  // bottom paths
  for (let i = 0; i < metaInfo.bottomPaths.length; i++) {
    const path = metaInfo.bottomPaths[i];
    path.x0 = path.offset;
    path.y0 = metaInfo.bottomEdge;
    await traversePath(canvas, path, DIR.TOP);
  }
  // left paths
  for (let i = 0; i < metaInfo.leftPaths.length; i++) {
    const path = metaInfo.leftPaths[i];
    path.x0 = metaInfo.leftEdge;
    path.y0 = path.offset;
    await traversePath(canvas, path, DIR.RIGHT);
  }
}

export function projectPath(path, distance = null) {
  distance = distance != null ? distance : 2 * path.size;
  const x1 = path.x1 != null ? path.x1 : path.x0;
  const y1 = path.y1 != null ? path.y1 : path.y0;
  path.x = Math.round(x1 + distance * Math.cos(path.dir));
  path.y = Math.round(y1 + distance * Math.sin(path.dir));
  return {x: path.x, y: path.y};
}

export function projectToTile(path, distance = null){
  // find which tile this path can continue to
  distance = distance != null ? distance : 4 * path.size;
  projectPath(path, distance);
  const col = Math.floor(path.x / Tile.size);
  const row = Math.floor(path.y / Tile.size);
  return {col: col, row: row};
}

// dir - is the direction where the path starts towards
export async function traversePath(canvas, path, dir, func = null) {
  // find coordinates of the possible path locations
  // extract pixels colors from all rectangualr segments for directional angles range -a to +a
  // find the segment with the average color most similar to the path color
  // set the found segment as last one in the path, take that segment directional angle as a new direction

  log("Traversing path " + JSON.stringify(path));
  path.dir = dir;
  path.x1 = path.x0;  // current path end, same as beginning
  path.y1 = path.y0;  // current path end, same as beginning
  path.step = 0;      //TODO: continue counting from prev value
  path.found = false; // no path found on this iteration yet

  const adelta = Math.PI / 180 * 35;  // look from dir-30 deg to dir+30 deg //FIXME: hardcoded?
  const astep = adelta / 10;  // do 10 direction samples per step
  const pixelData = canvas.getContext('2d');

  let stopPixelFound = false;

  const findNextPathSegment = (path) => {
    // find all path segments candidates along the current path direction
    const segs = [];
    for (let a = path.dir - adelta; a <= path.dir + adelta; a += astep) {
      let seg = {};
      seg.x0 = path.x0;
      seg.y0 = path.y0;
      seg.x1 = path.x1;
      seg.y1 = path.y1;
      seg.dir = a;
      seg.size = path.size;
      seg.dirFactor = Math.abs(path.dir - a) / adelta; // continue in same direction has a factor of 0, max turn - 1.0
      //seg.x = Math.round(path.x1 + 2 * path.size * Math.cos(a));
      //seg.y = Math.round(path.y1 + 2 * path.size * Math.sin(a));
      projectPath(seg);
      let data = pixelData.getImageData(seg.x, seg.y, path.size, path.size).data;
      // convert to array of pixels color
      var colors = [];
      for (var index = 0; index < data.length; index += 4) {
        colors.push(data.slice(index, index + 4));
      }
      seg.color = averageColor(colors);
      segs.push(seg);

      stopPixelFound = stopPixelFound || isSimilarColor(StopPixel, seg.color, 10);
      // console.log("stopPixelFound=" + stopPixelFound + ", seg color: " + seg.color);    // #DEBUG
    }

    // find the segment with the color closest to the original path color and if possible in the same direction
    let mostSimilarSeg = null;
    let mostSimilarSegDelta = Number.MAX_SAFE_INTEGER;
    for (let i = 0; i < segs.length; i++) {
      let colorDiff = getColorDiff(path.color, segs[i].color);
      let dirDiff = 5 * segs[i].dirFactor; // FIXME: hardcoded?
      let diff = colorDiff + dirDiff;
      //if (isSimilarColor(path.color, segs[i].color, 70) && colorDiff < mostSimilarSegDelta) { // FIXME: hardcoded?
      if (diff < mostSimilarSegDelta) {
        mostSimilarSeg = segs[i];
        mostSimilarSegDelta = diff;
      }
    }
    if (!isSimilarColor(path.color, mostSimilarSeg.color, 90 - 20 * mostSimilarSeg.dirFactor)) { // FIXME: hardcoded?
      return null;
    }
    return mostSimilarSeg;
  };

  const maxSteps = 1000;
  do {
    let nextSeg = findNextPathSegment(path);
    if (nextSeg && !stopPixelFound) {
      path.dir = nextSeg.dir;
      path.x2 = path.x1;
      path.x1 = nextSeg.x;
      path.y2 = path.y1;
      path.y1 = nextSeg.y;
      path.step++;
      path.found = true;
      if (DEBUG_PATH) {
        drawing.canvasDrawCircle(tilesOverlay, path.x1, path.y1, path.size, null, path.color);
      }
      if (func) {
        await func(path);
      }
    } else {
      path.found = false;
      if (DEBUG_PATH) {
        drawing.canvasDrawCircle(tilesOverlay, path.x1, path.y1, path.size, [0, 0xff, 0, 0xff], [0xff, 0, 0, 0xff]);
      }
      log("Path ends at (" + path.x1 + ", " + path.y1 + "), steps: " + path.step);
      if (func) {
        await func(path);
      }
    }
  } while (path.found && path.step < maxSteps);

  return path;
}