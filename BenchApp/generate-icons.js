const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

function crc32(buf) {
  let table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([len, typeAndData, crc]);
}

function buildPNG(width, height, pixels) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const ihdrChunk = pngChunk('IHDR', ihdr);
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 4)] = 0;
    pixels.copy(raw, y * (1 + width * 4) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const compressed = zlib.deflateSync(raw, { level: 6 });
  const idatChunk = pngChunk('IDAT', compressed);
  const iendChunk = pngChunk('IEND', Buffer.alloc(0));
  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function setPixel(px, w, x, y, r, g, b, a) {
  if (a === undefined) a = 255;
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || x >= w || y < 0 || y >= w) return;
  const i = (y * w + x) * 4;
  px[i] = r; px[i+1] = g; px[i+2] = b; px[i+3] = a;
}

function fillRect(px, w, x0, y0, rw, rh, r, g, b, a) {
  if (a === undefined) a = 255;
  for (let y = Math.round(y0); y < Math.round(y0 + rh); y++)
    for (let x = Math.round(x0); x < Math.round(x0 + rw); x++)
      setPixel(px, w, x, y, r, g, b, a);
}

function fillCircle(px, w, cx, cy, rad, r, g, b, a) {
  if (a === undefined) a = 255;
  const r2 = rad * rad;
  for (let y = Math.floor(cy - rad); y <= Math.ceil(cy + rad); y++)
    for (let x = Math.floor(cx - rad); x <= Math.ceil(cx + rad); x++) {
      if ((x-cx)*(x-cx)+(y-cy)*(y-cy) <= r2) setPixel(px, w, x, y, r, g, b, a);
    }
}

function fillRR(px, w, x0, y0, rw, rh, rad, r, g, b, a) {
  if (a === undefined) a = 255;
  fillRect(px, w, x0+rad, y0, rw-2*rad, rh, r, g, b, a);
  fillRect(px, w, x0, y0+rad, rad, rh-2*rad, r, g, b, a);
  fillRect(px, w, x0+rw-rad, y0+rad, rad, rh-2*rad, r, g, b, a);
  fillCircle(px, w, x0+rad, y0+rad, rad, r, g, b, a);
  fillCircle(px, w, x0+rw-rad-1, y0+rad, rad, r, g, b, a);
  fillCircle(px, w, x0+rad, y0+rh-rad-1, rad, r, g, b, a);
  fillCircle(px, w, x0+rw-rad-1, y0+rh-rad-1, rad, r, g, b, a);
}

const FONT = {
  '1': ['  #  ',' ##  ','# #  ','  #  ','  #  ','  #  ','#####'],
  '0': [' ### ','#   #','#  ##','# # #','##  #','#   #',' ### ']
};

function drawChar(px, w, ch, sx, sy, sc, r, g, b) {
  const gl = FONT[ch]; if (!gl) return;
  for (let row = 0; row < gl.length; row++)
    for (let col = 0; col < gl[row].length; col++)
      if (gl[row][col] === '#')
        fillRect(px, w, sx+col*sc, sy+row*sc, sc, sc, r, g, b);
}

function drawStr(px, w, str, cx, cy, sc, r, g, b) {
  const cW = 5*sc+sc;
  const tW = str.length*cW-sc;
  const tH = 7*sc;
  let x = Math.round(cx - tW/2);
  const y = Math.round(cy - tH/2);
  for (const ch of str) { drawChar(px, w, ch, x, y, sc, r, g, b); x += cW; }
}

function drawBarbell(px, size) {
  const cx = size/2, cy = size*0.38;
  const barH = Math.max(3, Math.round(size*0.04));
  const barW = Math.round(size*0.62);
  fillRR(px, size, Math.round(cx-barW/2), Math.round(cy-barH/2), barW, barH, Math.round(barH/2), 255, 255, 255);
  const pH = Math.round(size*0.22), pW = Math.max(4, Math.round(size*0.07)), pR = Math.max(1, Math.round(pW*0.3));
  const oO = Math.round(barW*0.46);
  fillRR(px, size, Math.round(cx-oO-pW/2), Math.round(cy-pH/2), pW, pH, pR, 255, 255, 255);
  fillRR(px, size, Math.round(cx+oO-pW/2), Math.round(cy-pH/2), pW, pH, pR, 255, 255, 255);
  const iO = Math.round(barW*0.35);
  const iPH = Math.round(size*0.28), iPW = Math.max(5, Math.round(size*0.08)), iR = Math.max(1, Math.round(iPW*0.3));
  fillRR(px, size, Math.round(cx-iO-iPW/2), Math.round(cy-iPH/2), iPW, iPH, iR, 255, 255, 255);
  fillRR(px, size, Math.round(cx+iO-iPW/2), Math.round(cy-iPH/2), iPW, iPH, iR, 255, 255, 255);
}

function generateIcon(size) {
  const px = Buffer.alloc(size*size*4, 0);
  for (let y = 0; y < size; y++) {
    const t = y/(size-1);
    const r = Math.round(30+(15-30)*t), g = Math.round(40+(20-40)*t), b = Math.round(65+(40-65)*t);
    for (let x = 0; x < size; x++) setPixel(px, size, x, y, r, g, b);
  }
  const cR = Math.round(size*0.18);
  for (let y = 0; y < cR; y++)
    for (let x = 0; x < cR; x++) {
      const dx = cR-1-x, dy = cR-1-y;
      if (dx*dx+dy*dy > cR*cR) {
        setPixel(px, size, x, y, 0, 0, 0, 0);
        setPixel(px, size, size-1-x, y, 0, 0, 0, 0);
        setPixel(px, size, x, size-1-y, 0, 0, 0, 0);
        setPixel(px, size, size-1-x, size-1-y, 0, 0, 0, 0);
      }
    }
  drawBarbell(px, size);
  const lH = Math.max(2, Math.round(size*0.012)), lW = Math.round(size*0.40);
  fillRR(px, size, Math.round(size/2-lW/2), Math.round(size*0.53), lW, lH, Math.round(lH/2), 100, 180, 255);
  const tS = Math.max(2, Math.round(size/40));
  drawStr(px, size, '100', size/2, size*0.68, tS, 255, 255, 255);
  return buildPNG(size, size, px);
}

const dir = path.dirname(process.argv[1]);
const p192 = generateIcon(192);
fs.writeFileSync(path.join(dir, 'icon-192.png'), p192);
console.log('Created icon-192.png (' + p192.length + ' bytes)');
const p512 = generateIcon(512);
fs.writeFileSync(path.join(dir, 'icon-512.png'), p512);
console.log('Created icon-512.png (' + p512.length + ' bytes)');
console.log('Done!');
