/**
 * A bunch of utility function to draw on a canvas
 */

export function colorArrayToStyle(color) {
  if (!color) {
    return '#000000FF'; // black
  } else if (!Array.isArray(color)) {
    throw "color should be in RBGA array";
  }
  return '#' + color[0].toString(16) + color[1].toString(16) + color[2].toString(16) + color[3].toString(16);
}

export function canvasDrawLine(canvas, x0, y0, x1, y1, color = [0xff, 0, 0, 0xff], lineWidth = 1) {
  if (!canvas) {
    return;
  }
  const ctx = canvas.getContext("2d");
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = colorArrayToStyle(color);
  ctx.stroke();
}

export function canvasDrawCircle(canvas, x0, y0, r, color = [0, 0xff, 0, 0xff], fill = null, lineWidth = 1) {
  if (!canvas) {
    return;
  }
  const ctx = canvas.getContext("2d");
  ctx.beginPath();
  ctx.arc(x0, y0, r, 0, 2 * Math.PI, false);
  if (fill) {
    ctx.fillStyle = colorArrayToStyle(fill);
    ctx.fill();
  }
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = colorArrayToStyle(color);
  ctx.stroke();
}

export function canvasClear(canvas) {
  if (!canvas) {
    return;
  }
  const ctx = canvas.getContext("2d");
  ctx.clearRect(1, 1, canvas.width - 1, canvas.height - 1);
}