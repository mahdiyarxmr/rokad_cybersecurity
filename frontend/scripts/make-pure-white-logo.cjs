const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// 1. Read original uploaded image
const sourcePath = 'C:/Users/AliRezA/.gemini/antigravity-ide/brain/4b56d09a-9229-497c-a97d-f808be91dd04/.user_uploaded/media_1789475549489.png';
const buf = fs.readFileSync(sourcePath);

let pos = 8;
let idat = [];
while (pos < buf.length) {
  const len = buf.readUInt32BE(pos);
  const type = buf.toString('ascii', pos + 4, pos + 8);
  const data = buf.subarray(pos + 8, pos + 8 + len);
  pos += 12 + len;
  if (type === 'IDAT') idat.push(data);
}

const uncompressed = zlib.inflateSync(Buffer.concat(idat));
const origW = 192;
const origH = 150;
const stride = 1 + origW * 4;

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
}

const origRaw = Buffer.alloc(origW * origH * 4);
for (let y = 0; y < origH; y++) {
  const filter = uncompressed[y * stride];
  const scanline = uncompressed.subarray(y * stride + 1, (y + 1) * stride);
  const rawLine = origRaw.subarray(y * origW * 4, (y + 1) * origW * 4);
  const prevLine = y > 0 ? origRaw.subarray((y - 1) * origW * 4, y * origW * 4) : null;
  for (let i = 0; i < scanline.length; i++) {
    const filtByte = scanline[i];
    const a = i >= 4 ? rawLine[i - 4] : 0;
    const b = prevLine ? prevLine[i] : 0;
    const c = (prevLine && i >= 4) ? prevLine[i - 4] : 0;
    let val = filtByte;
    if (filter === 1) val = (filtByte + a) & 0xff;
    else if (filter === 2) val = (filtByte + b) & 0xff;
    else if (filter === 3) val = (filtByte + Math.floor((a + b) / 2)) & 0xff;
    else if (filter === 4) val = (filtByte + paeth(a, b, c)) & 0xff;
    rawLine[i] = val;
  }
}

// Extract normalized ink alpha (0.0 to 1.0)
const origAlpha = new Float32Array(origW * origH);
for (let y = 0; y < origH; y++) {
  for (let x = 0; x < origW; x++) {
    const a = origRaw[(y * origW + x) * 4 + 3];
    origAlpha[y * origW + x] = a / 255.0;
  }
}

// 2. We upscale 4x to 768x600 for razor-sharp rendering on Retina / HiDPI screens
const scale = 4;
const newW = origW * scale; // 768
const newH = origH * scale; // 600

function sampleBicubic(x, y) {
  function cubic(t) {
    const a = -0.5;
    const at = Math.abs(t);
    if (at <= 1) return (a + 2) * at * at * at - (a + 3) * at * at + 1;
    if (at < 2) return a * at * at * at - 5 * a * at * at + 8 * a * at - 4 * a;
    return 0;
  }

  const px = Math.floor(x);
  const py = Math.floor(y);
  const fx = x - px;
  const fy = y - py;

  let sum = 0;
  let weightSum = 0;
  for (let m = -1; m <= 2; m++) {
    for (let n = -1; n <= 2; n++) {
      const sx = Math.min(Math.max(px + m, 0), origW - 1);
      const sy = Math.min(Math.max(py + n, 0), origH - 1);
      const w = cubic(m - fx) * cubic(n - fy);
      sum += origAlpha[sy * origW + sx] * w;
      weightSum += w;
    }
  }
  return weightSum !== 0 ? Math.min(Math.max(sum / weightSum, 0), 1) : 0;
}

// Target RGBA buffer for newW x newH
const newRaw = Buffer.alloc(newW * newH * 4);

// To ensure 100% pure solid white without fading:
// Threshold: values above 0.35 become solid opaque white (alpha = 255).
// Edge smoothing in a tight band [0.15, 0.35] gives razor-sharp edges without pixelation.
for (let y = 0; y < newH; y++) {
  for (let x = 0; x < newW; x++) {
    const srcX = (x + 0.5) / scale - 0.5;
    const srcY = (y + 0.5) / scale - 0.5;
    const val = sampleBicubic(srcX, srcY);

    let alpha = 0;
    if (val >= 0.38) {
      alpha = 255;
    } else if (val >= 0.12) {
      // Crisp smooth antialiasing only at the boundary
      const t = (val - 0.12) / (0.38 - 0.12);
      alpha = Math.round(t * 255);
    } else {
      alpha = 0;
    }

    const idx = (y * newW + x) * 4;
    // Pure Solid White RGB: 255, 255, 255 ALWAYS
    newRaw[idx] = 255;     // R = 255
    newRaw[idx + 1] = 255; // G = 255
    newRaw[idx + 2] = 255; // B = 255
    newRaw[idx + 3] = alpha;
  }
}

// 3. Encode PNG
function makePng(width, height, rgbaBuffer) {
  const lineStride = 1 + width * 4;
  const filtered = Buffer.alloc(height * lineStride);
  for (let y = 0; y < height; y++) {
    filtered[y * lineStride] = 0; // None filter
    rgbaBuffer.copy(filtered, y * lineStride + 1, y * width * 4, (y + 1) * width * 4);
  }

  const deflated = zlib.deflateSync(filtered, { level: 9 });

  function crc32(buf) {
    let table = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) {
        if (c & 1) c = 0xedb88320 ^ (c >>> 1);
        else c = c >>> 1;
      }
      table[n] = c;
    }
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    const crc = crc32(Buffer.concat([typeBuf, data]));
    crcBuf.writeUInt32BE(crc, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bits per channel
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', deflated);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const finalPng = makePng(newW, newH, newRaw);

// Write to public and src/assets
fs.writeFileSync('public/logo-rokad-white.png', finalPng);
const assetsDir = path.resolve('src/assets');
if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });
fs.writeFileSync('src/assets/logo-rokad-white.png', finalPng);

// Also generate a base64 Data URL SVG that embeds this high-res crisp PNG
const base64Png = finalPng.toString('base64');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${newW} ${newH}" width="100%" height="100%">
  <image href="data:image/png;base64,${base64Png}" width="${newW}" height="${newH}" />
</svg>`;

fs.writeFileSync('public/logo-rokad-white.svg', svg);
fs.writeFileSync('src/assets/logo-rokad-white.svg', svg);

console.log('Successfully generated pure white high-res PNG (768x600) and SVG!');
