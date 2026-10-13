const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const buf = fs.readFileSync('public/logo-rokad.png');
let pos = 8;
const chunks = [];
let idatData = [];

while (pos < buf.length) {
  const len = buf.readUInt32BE(pos);
  const type = buf.toString('ascii', pos + 4, pos + 8);
  const data = buf.subarray(pos + 8, pos + 8 + len);
  pos += 12 + len;
  if (type === 'IDAT') idatData.push(data);
  else chunks.push({ type, data });
}

const uncompressed = zlib.inflateSync(Buffer.concat(idatData));
const width = 192;
const height = 150;
const bpp = 4;
const stride = 1 + width * bpp;

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
}

const raw = Buffer.alloc(width * height * bpp);
for (let y = 0; y < height; y++) {
  const filter = uncompressed[y * stride];
  const scanline = uncompressed.subarray(y * stride + 1, (y + 1) * stride);
  const rawLine = raw.subarray(y * width * bpp, (y + 1) * width * bpp);
  const prevLine = y > 0 ? raw.subarray((y - 1) * width * bpp, y * width * bpp) : null;
  for (let i = 0; i < scanline.length; i++) {
    const filtByte = scanline[i];
    const a = i >= bpp ? rawLine[i - bpp] : 0;
    const b = prevLine ? prevLine[i] : 0;
    const c = (prevLine && i >= bpp) ? prevLine[i - bpp] : 0;
    let val = filtByte;
    if (filter === 1) val = (filtByte + a) & 0xff;
    else if (filter === 2) val = (filtByte + b) & 0xff;
    else if (filter === 3) val = (filtByte + Math.floor((a + b) / 2)) & 0xff;
    else if (filter === 4) val = (filtByte + paeth(a, b, c)) & 0xff;
    rawLine[i] = val;
  }
}

// 1. Group horizontal runs into clean SVG path
let pathD = '';
let rectCount = 0;

for (let y = 0; y < height; y++) {
  let inRun = false;
  let startX = 0;
  for (let x = 0; x < width; x++) {
    const a = raw[(y * width + x) * 4 + 3];
    const isInk = a > 25;
    if (isInk && !inRun) {
      inRun = true;
      startX = x;
    } else if (!isInk && inRun) {
      inRun = false;
      const w = x - startX;
      pathD += `M${startX} ${y}h${w}v1h-${w}z `;
      rectCount++;
    }
  }
  if (inRun) {
    const w = width - startX;
    pathD += `M${startX} ${y}h${w}v1h-${w}z `;
    rectCount++;
  }
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 150" fill="#FFFFFF">
  <path d="${pathD.trim()}" fill="#FFFFFF" fill-rule="evenodd" />
</svg>`;

fs.writeFileSync('public/logo-rokad-white.svg', svg);
const assetsDir = path.resolve('src/assets');
if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });
fs.writeFileSync('src/assets/logo-rokad-white.svg', svg);

console.log('Successfully generated public/logo-rokad-white.svg and src/assets/logo-rokad-white.svg!');
