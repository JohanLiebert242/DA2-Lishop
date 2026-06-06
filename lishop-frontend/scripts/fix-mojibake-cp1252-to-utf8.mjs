#!/usr/bin/env node
/**
 * Fixes common mojibake where UTF-8 bytes were mis-decoded as Windows-1252.
 *
 * It reads UTF-8 text files, re-encodes their codepoints back into CP1252 bytes,
 * then decodes those bytes as UTF-8. This often turns sequences like "Chá»‰nh"
 * back into "Chỉnh".
 *
 * Safety:
 * - Only writes a file when the conversion changes content AND does not introduce
 *   Unicode replacement chars (U+FFFD).
 * - Skips binary-ish files by extension and simple null-byte detection.
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();

const TEXT_EXTS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.json',
  '.md',
  '.yml',
  '.yaml',
  '.css',
  '.scss',
  '.html',
  '.txt',
]);

// Windows-1252 mapping for bytes 0x80..0x9F. (Undefined bytes are omitted.)
const CP1252_BYTE_TO_CODEPOINT = new Map([
  [0x80, 0x20ac],
  [0x82, 0x201a],
  [0x83, 0x0192],
  [0x84, 0x201e],
  [0x85, 0x2026],
  [0x86, 0x2020],
  [0x87, 0x2021],
  [0x88, 0x02c6],
  [0x89, 0x2030],
  [0x8a, 0x0160],
  [0x8b, 0x2039],
  [0x8c, 0x0152],
  [0x8e, 0x017d],
  [0x91, 0x2018],
  [0x92, 0x2019],
  [0x93, 0x201c],
  [0x94, 0x201d],
  [0x95, 0x2022],
  [0x96, 0x2013],
  [0x97, 0x2014],
  [0x98, 0x02dc],
  [0x99, 0x2122],
  [0x9a, 0x0161],
  [0x9b, 0x203a],
  [0x9c, 0x0153],
  [0x9e, 0x017e],
  [0x9f, 0x0178],
]);

const CP1252_CODEPOINT_TO_BYTE = new Map(
  Array.from(CP1252_BYTE_TO_CODEPOINT.entries()).map(([b, cp]) => [cp, b]),
);

function cp1252ByteForCodePoint(cp) {
  if (cp <= 0xff) return cp;
  const mapped = CP1252_CODEPOINT_TO_BYTE.get(cp);
  if (mapped != null) return mapped;
  return null;
}

function encodeCp1252BytesFromString(s) {
  const bytes = [];
  for (let i = 0; i < s.length; i++) {
    const cp = s.codePointAt(i);
    if (cp == null) continue;
    if (cp > 0xffff) i++; // consume surrogate pair

    const b = cp1252ByteForCodePoint(cp);
    if (b == null) return null;
    bytes.push(b);
  }
  return Buffer.from(bytes);
}

function looksLikeTextFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return TEXT_EXTS.has(ext);
}

function walk(dir, out = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name === '.next' || e.name === '.turbo') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function hasMojibakeMarkers(s) {
  // Common markers for UTF-8-as-CP1252 garbling.
  return /[ÃÂÄÅÆÐÑØÞãâäåæðñøþ]|â€|áº|á»|Ä‘|Ä|Â·/u.test(s);
}

function fixMojibakeSegments(text) {
  let out = '';
  let seg = '';

  const flush = () => {
    if (!seg) return;
    if (!hasMojibakeMarkers(seg)) {
      out += seg;
      seg = '';
      return;
    }

    const bytes = encodeCp1252BytesFromString(seg);
    if (!bytes) {
      out += seg;
      seg = '';
      segHasMarker = false;
      return;
    }

    const fixed = bytes.toString('utf8');
    if (fixed.includes('\ufffd')) out += seg;
    else out += fixed;

    seg = '';
  };

  for (let i = 0; i < text.length; i++) {
    const cp = text.codePointAt(i);
    if (cp == null) continue;
    const isAstral = cp > 0xffff;
    if (isAstral) i++;

    const b = cp1252ByteForCodePoint(cp);
    if (b == null) {
      flush();
      out += String.fromCodePoint(cp);
      continue;
    }

    const ch = String.fromCodePoint(cp);
    seg += ch;
  }

  flush();
  return out;
}

let scanned = 0;
let changed = 0;
let skipped = 0;

for (const file of walk(ROOT)) {
  scanned++;
  if (!looksLikeTextFile(file)) continue;

  const raw = fs.readFileSync(file);
  // Null byte is a cheap binary detector.
  if (raw.includes(0)) continue;

  const text = raw.toString('utf8');
  if (!hasMojibakeMarkers(text)) continue;

  const fixed = fixMojibakeSegments(text);
  if (fixed === text) continue;
  if (fixed.includes('\ufffd')) {
    skipped++;
    continue;
  }

  fs.writeFileSync(file, fixed, 'utf8');
  changed++;
}

process.stdout.write(
  `fix-mojibake: scanned=${scanned} changed=${changed} skipped=${skipped} root=${ROOT}\n`,
);
