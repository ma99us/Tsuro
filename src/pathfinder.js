// wrapper for all image paths analysis data
let metaInfo = {};

export const DIR = {TOP: Math.PI*3/2, RIGHT: 0, BOTTOM: Math.PI/2, LEFT: Math.PI};  // general directions

// checks if the two colors are somewhat similar
// by default use metaInfo.delta value
export function isSimilarColor(px1, px2, delta = metaInfo.delta) {
  if (!px1 || !px2) {
    return false;
  }
  return Math.abs(px1[0] - px2[0]) < delta &&
    Math.abs(px1[1] - px2[1]) < delta &&
    Math.abs(px1[2] - px2[2]) < delta &&
    Math.abs(px1[3] - px2[3]) < delta;
}

// checks if the two sizes are somewhat similar
// by default within 30% size diff.
export function isSimilarSize(s1, s2, factor = 0.3) {
  if (!s1 || !s2) {
    return false;
  }
  let delta = Math.ceil(s1 > s2 ? s1 * factor : s2 * factor);
  delta = delta > 2 ? delta : 2;  // minimal delta should be a couple of pixels at least
  return Math.abs(s1 - s2) <= delta;
}

// gets an average color of the given array of colors. Each color item si an array of [R, G, B, A]
export function averageColor(colors, skipTransparent = true) {
  if (!colors || !colors.length) {
    return null;
  }
  let color = [0, 0, 0, 0];
  let total = 0;
  for (let i = 0; i < colors.length; i++) {
    if(skipTransparent && colors[i][3] === 0){   // alpha channel
      continue; // skip transparent pixels
    }
    color[0] += colors[i][0];
    color[1] += colors[i][1];
    color[2] += colors[i][2];
    color[3] += colors[i][3];
    total++;
  }
  if (total > 0) {
    color[0] = Math.floor(color[0] / total);
    color[1] = Math.floor(color[1] / total);
    color[2] = Math.floor(color[2] / total);
    color[3] = Math.floor(color[3] / total);
  }
  return color;
}

// tries to find similar repeating segments (paths) from all sides of the image
function findPathsEdges(canvas, sensetivity = 50, borderOffset = 0, minPathSize = 2) {
  log("Finding paths and edges...");

  metaInfo = {};
  metaInfo.delta = sensetivity;
  metaInfo.borderOffset = borderOffset;
  minPathSize = minPathSize >= 2 ? minPathSize : 2;   // path can't be smaller then 2 pixels
  metaInfo.minPathSize = minPathSize;

  // add given pixel to the current segment or start a new segment
  const processPixel = (offset, px, stat) => {
    //if (isSimilarColor(arrLast(stat.colors), px)) {
    //if (isSimilarColor(arrFirst(stat.colors), px)) {
    if (isSimilarColor(averageColor(stat.colors), px)) {
      stat.colors.push(px);
    } else {
      if (stat.colors && stat.colors.length >= minPathSize) {
        // process finished segment
        let segMid = Math.floor(stat.colors.length / 2);
        //stat.color = stat.colors[segMid];  // color of the center of the segment
        stat.color = averageColor(stat.colors);   // average color of the segment
        stat.offset += segMid;
        if (!stat.segments) {
          stat.segments = new Map();  // map of 'size' -> segments []
        }
        let segs = stat.segments.get(stat.colors.length);
        if (!segs) {
          segs = [];
        }
        segs.push({offset: stat.offset, color: [...stat.color], size: stat.colors.length});
        stat.segments.set(stat.colors.length, segs);
      }
      // start new segment
      stat.offset = offset;
      stat.colors = [px];
    }
    return stat;
  };

  // find most likely candidate for a "path" among all segments of the cross-section
  const findPathSegments = (stat) => {
    // console.log("findPathSegmentSize; " + stat);     // #DEBUG
    if (!stat.segments) {
      return null;
    }
    //let mostSize = metaInfo.pathSize || null; // use previously found path size
    let mostSize = null;
    let mostSizeNum = 0;
    //let mostColor = metaInfo.pathColor || null; //[0,0,0,0]; // use previously found path color
    let mostColor = null;
    //if (!metaInfo.pathSize || !metaInfo.pathColor) {
      for (let size of stat.segments.keys()) {
        let segs = stat.segments.get(size);
        if (segs.length > mostSizeNum) {
          mostSize = size;
          mostSizeNum = segs.length;
          // find average color of the whole segment
          mostColor = averageColor(statArray(segs.map(seg => seg.color), (color, simColor) => isSimilarColor(color, simColor)));
        }
      }
      // check that found segment size is a good candidate
      // has to be at least a couple of paths found
      // path has to be narrower then 20% of the full analyzed length (FIXME: really?)
      if (mostSizeNum < 2 || mostSize > stat.length * 0.2) {
        return null;
      }
    //}

    // now pick all other segments of similar size and similar color
    let paths = [];
    for (let size of stat.segments.keys()) {
      if (isSimilarSize(mostSize, size)) {
        let segs = stat.segments.get(size);
        for (let i = 0; i < segs.length; i++) {
          if (isSimilarColor(mostColor, segs[i].color)) {
            paths.push(segs[i]);
          }
        }
      }
    }
    if (paths.length < 2) {
      return null;
    }

    stat.pathSize = mostSize;
    stat.pathSizeNum = paths.length;
    stat.pathColor = mostColor;
    stat.paths = paths;

    return mostSize;
  };

  const similarPaths = (segs1, segs2) => {
    if(!segs1 || !segs2 || segs1.length !== segs2.length){
      return false;
    }
    let avgOffset1 = segs1.reduce((total, seg) => total + seg.offset, 0) / segs1.length;
    let avgOffset2 = segs2.reduce((total, seg) => total + seg.offset, 0) / segs2.length;
    // if offsets averages are withing 10% from each other, then probably those paths segments are similar // FIXME: really?
    let delta = 0.1;
    return Math.abs(avgOffset1 - avgOffset2) <= (avgOffset1 > avgOffset2 ? avgOffset1 * delta : avgOffset2 * delta);
  };


  ////// start processing image data.
  const pixelData = canvas.getContext('2d');
  // prepare overlay canvas
  canvasClear(tilesOverlay);
  canvasDrawLine(tilesOverlay, 0, 0, canvas.width, 0);
  canvasDrawLine(tilesOverlay, canvas.width, 0, canvas.width, canvas.height);
  canvasDrawLine(tilesOverlay, canvas.width, canvas.height, 0, canvas.height);
  canvasDrawLine(tilesOverlay, 0, canvas.height, 0, 0);

  // find top edge
  let lastPixelStat = {};
  for (let y = borderOffset; y < borderOffset + canvas.height * 0.1;) {
    //let y = 10;
    const pixelStat = {edgeOffset: y};
    pixelStat.length = canvas.width;
    for (let x = borderOffset; x < canvas.width - borderOffset; x++) {
      let px = pixelData.getImageData(x, y, 1, 1).data;
      processPixel(x, px, pixelStat);
    }
    let size = findPathSegments(pixelStat);
    if (size) {
      //if (similarPaths(lastPixelStat.paths, pixelStat.paths)) {
      {
        metaInfo.pathSize = pixelStat.pathSize;
        metaInfo.topEdge = pixelStat.edgeOffset;
        metaInfo.topPaths = [...pixelStat.paths];
        metaInfo.pathColor = pixelStat.pathColor;

        log("found top edge; offset=" + metaInfo.topEdge + ", path width=" + metaInfo.pathSize + ", paths num=" + metaInfo.topPaths.length + ", path color=" + metaInfo.pathColor);
        // draw info overlay
        canvasDrawLine(tilesOverlay, 0, metaInfo.topEdge, canvas.width, metaInfo.topEdge);
        for (let i = 0; i < metaInfo.topPaths.length; i++) {
          canvasDrawCircle(tilesOverlay, metaInfo.topPaths[i].offset, metaInfo.topEdge, metaInfo.pathSize, [0, 0xff, 0, 0xff], metaInfo.topPaths[i].color);
        }
        break;
      }
      lastPixelStat.pathSize = pixelStat.pathSize;
      lastPixelStat.edgeOffset = pixelStat.edgeOffset;
      lastPixelStat.paths = [...pixelStat.paths];
      lastPixelStat.pathColor = pixelStat.pathColor;
      y += 1;
    } else {
      y++;
    }
  }
  if (!(metaInfo.topEdge >= 0)) {
    log("top edge not found");
  }


  // find right edge
  lastPixelStat = {};
  for (let x = canvas.width - borderOffset; x > canvas.width * 0.9 - borderOffset;) {
//    let x = canvas.width - 10;
    const pixelStat = {edgeOffset: x};
    pixelStat.length = canvas.height;
    for (let y = borderOffset; y < canvas.height - borderOffset; y++) {
      let px = pixelData.getImageData(x, y, 1, 1).data;
      processPixel(y, px, pixelStat);
    }
    let size = findPathSegments(pixelStat);
    if (size) {
      // if (similarPaths(lastPixelStat.paths, pixelStat.paths)) {
      {
        metaInfo.pathSize = pixelStat.pathSize;
        metaInfo.rigthEdge = pixelStat.edgeOffset;
        metaInfo.rightPaths = [...pixelStat.paths];
        metaInfo.pathColor = pixelStat.pathColor;

        log("found right edge; offset=" + metaInfo.rigthEdge + ", path width=" + metaInfo.pathSize + ", paths num=" + metaInfo.rightPaths.length + ", path color=" + metaInfo.pathColor);
        // draw info overlay
        canvasDrawLine(tilesOverlay, metaInfo.rigthEdge, 0, metaInfo.rigthEdge, canvas.height);
        for (let i = 0; i < metaInfo.rightPaths.length; i++) {
          canvasDrawCircle(tilesOverlay, metaInfo.rigthEdge, metaInfo.rightPaths[i].offset, metaInfo.pathSize, [0, 0xff, 0, 0xff], metaInfo.rightPaths[i].color);
        }
        break;
      }
      lastPixelStat.pathSize = pixelStat.pathSize;
      lastPixelStat.edgeOffset = pixelStat.edgeOffset;
      lastPixelStat.paths = [...pixelStat.paths];
      lastPixelStat.pathColor = pixelStat.pathColor;
      x -= 1;
    } else {
      x--;
    }
  }
  if (!(metaInfo.rigthEdge >= 0)) {
    log("right edge not found");
  }

  // find bottom edge
  lastPixelStat = {};
  for (let y = canvas.height - borderOffset; y > canvas.height * 0.9 - borderOffset;) {
    //let y = canvas.height - 10;
    const pixelStat = {edgeOffset: y};
    pixelStat.length = canvas.width;
    for (let x = borderOffset; x < canvas.width - borderOffset; x++) {
      let px = pixelData.getImageData(x, y, 1, 1).data;
      processPixel(x, px, pixelStat);
    }
    let size = findPathSegments(pixelStat);
    if (size) {
      //if (similarPaths(lastPixelStat.paths, pixelStat.paths)) {
      {
        metaInfo.pathSize = pixelStat.pathSize;
        metaInfo.bottomEdge = pixelStat.edgeOffset;
        metaInfo.bottomPaths = [...pixelStat.paths];
        metaInfo.pathColor = pixelStat.pathColor;

        log("found bottom edge; offset=" + metaInfo.bottomEdge + ", path width=" + metaInfo.pathSize + ", paths num=" + metaInfo.bottomPaths.length + ", path color=" + metaInfo.pathColor);
        // draw info overlay
        canvasDrawLine(tilesOverlay, 0, metaInfo.bottomEdge, canvas.width, metaInfo.bottomEdge);
        for (let i = 0; i < metaInfo.bottomPaths.length; i++) {
          canvasDrawCircle(tilesOverlay, metaInfo.bottomPaths[i].offset, metaInfo.bottomEdge, metaInfo.pathSize, [0, 0xff, 0, 0xff], metaInfo.bottomPaths[i].color);
        }
        break;
      }
      lastPixelStat.pathSize = pixelStat.pathSize;
      lastPixelStat.edgeOffset = pixelStat.edgeOffset;
      lastPixelStat.paths = [...pixelStat.paths];
      lastPixelStat.pathColor = pixelStat.pathColor;
      y -= 1;
    } else {
      y--;
    }
  }
  if (!(metaInfo.bottomEdge >= 0)) {
    log("bottom edge not found");
  }

  // find left edge
  lastPixelStat = {};
  for (let x = borderOffset; x < borderOffset + canvas.width * 0.1;) {
//    let x = 10;
    const pixelStat = {edgeOffset: x};
    pixelStat.length = canvas.height;
    for (let y = borderOffset; y < canvas.height - borderOffset; y++) {
      let px = pixelData.getImageData(x, y, 1, 1).data;
      processPixel(y, px, pixelStat);
    }
    let size = findPathSegments(pixelStat);
    if (size) {
      //if (similarPaths(lastPixelStat.paths, pixelStat.paths)) {
      {
        metaInfo.pathSize = pixelStat.pathSize;
        metaInfo.leftEdge = pixelStat.edgeOffset;
        metaInfo.leftPaths = [...pixelStat.paths];
        metaInfo.pathColor = pixelStat.pathColor;

        log("found left edge; offset=" + metaInfo.leftEdge + ", path width=" + metaInfo.pathSize + ", paths num=" + metaInfo.leftPaths.length + ", path color=" + metaInfo.pathColor);
        // draw info overlay
        canvasDrawLine(tilesOverlay, metaInfo.leftEdge, 0, metaInfo.leftEdge, canvas.height);
        for (let i = 0; i < metaInfo.leftPaths.length; i++) {
          canvasDrawCircle(tilesOverlay, metaInfo.leftEdge, metaInfo.leftPaths[i].offset, metaInfo.pathSize, [0, 0xff, 0, 0xff], metaInfo.leftPaths[i].color);
        }
        break;
      }
      lastPixelStat.pathSize = pixelStat.pathSize;
      lastPixelStat.edgeOffset = pixelStat.edgeOffset;
      lastPixelStat.paths = [...pixelStat.paths];
      lastPixelStat.pathColor = pixelStat.pathColor;
      x += 1;
    } else {
      x++;
    }
  }
  if (!(metaInfo.leftEdge >= 0)) {
    log("left edge not found");
  }

}
