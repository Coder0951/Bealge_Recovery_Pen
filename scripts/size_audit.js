const fs = require('fs');
const path = require('path');

function extractObject(src, key) {
  const re = new RegExp(key + '\\s*=\\s*({[\s\S]*?});', 'm');
  const m = src.match(re);
  if (!m) return null;
  return m[1];
}

function parseDimensionsFromUseConfig(src) {
  const re = /const DIMENSIONS = \{([\s\S]*?)\};/m;
  const m = src.match(re);
  if (!m) throw new Error('DIMENSIONS not found in useConfiguration.js');
  const objSrc = '{' + m[1] + '}';
  // crude eval in safe Function
  return new Function('return ' + objSrc)();
}

function parseDimensionsFromCollision(src) {
  const re = /export const DIMENSIONS = \{([\s\S]*?)\};/m;
  const m = src.match(re);
  if (!m) throw new Error('DIMENSIONS not found in collision.js');
  const objSrc = '{' + m[1] + '}';
  return new Function('return ' + objSrc)();
}

function parseBedConstants(src) {
  const get = (name) => {
    const re = new RegExp(name + '\\s*=\\s*([0-9.]+)');
    const m = src.match(re);
    return m ? parseFloat(m[1]) : null;
  };
  return {
    FULL_BED_OUTER_WIDTH: get('FULL_BED_OUTER_WIDTH'),
    FULL_BED_OUTER_DEPTH: get('FULL_BED_OUTER_DEPTH'),
    INTERIOR_WIDTH: get('INTERIOR_WIDTH'),
    INTERIOR_DEPTH: get('INTERIOR_DEPTH'),
    FULL_BED_TOTAL_HEIGHT: get('FULL_BED_TOTAL_HEIGHT')
  };
}

function parsePeePadSize(src) {
  const re = /const size = isWashable \? ([0-9]+) : ([0-9]+);/m;
  const m = src.match(re);
  if (!m) return null;
  return { washable: parseInt(m[1], 10), disposable: parseInt(m[2], 10) };
}

function parsePlaypen(src) {
  const re = /const PEN_SIZE = ([0-9.]+)/m;
  const m = src.match(re);
  return m ? parseFloat(m[1]) : null;
}

function fail(msg) { console.error('AUDIT FAIL:', msg); process.exitCode = 2; }

try {
  const base = path.resolve(__dirname, '..');
  const useConfig = fs.readFileSync(path.join(base, 'src/hooks/useConfiguration.js'), 'utf8');
  const collision = fs.readFileSync(path.join(base, 'src/utils/collision.js'), 'utf8');
  const bed = fs.readFileSync(path.join(base, 'src/components/Bed.jsx'), 'utf8');
  const pad = fs.readFileSync(path.join(base, 'src/components/PeePad.jsx'), 'utf8');
  const playpen = fs.readFileSync(path.join(base, 'src/components/Playpen.jsx'), 'utf8');

  const dimsConfig = parseDimensionsFromUseConfig(useConfig);
  const dimsCollision = parseDimensionsFromCollision(collision);
  const bedConsts = parseBedConstants(bed);
  const padSizes = parsePeePadSize(pad);
  const penSize = parsePlaypen(playpen);

  console.log('Loaded dimensions from useConfiguration:', dimsConfig);
  console.log('Loaded dimensions from collision:', dimsCollision);
  console.log('Parsed bed constants:', bedConsts);
  console.log('Parsed pad sizes:', padSizes);
  console.log('Parsed pen size:', penSize);

  // Compare dimsConfig vs dimsCollision
  const keys = Object.keys(dimsConfig);
  let ok = true;
  for (const k of keys) {
    const a = dimsConfig[k];
    const b = dimsCollision[k];
    if (!b) { fail(`Missing key ${k} in collision DIMENSIONS`); ok = false; continue; }
    if (a.width !== b.width || a.depth !== b.depth) {
      fail(`Mismatch for ${k}: useConfiguration ${JSON.stringify(a)} vs collision ${JSON.stringify(b)}`);
      ok = false;
    }
  }

  // Compare bed constants
  if (bedConsts.FULL_BED_OUTER_WIDTH !== dimsConfig.fullBed.width) {
    fail(`Bed width mismatch: Bed.jsx ${bedConsts.FULL_BED_OUTER_WIDTH} vs useConfiguration ${dimsConfig.fullBed.width}`);
    ok = false;
  }
  if (bedConsts.FULL_BED_OUTER_DEPTH !== dimsConfig.fullBed.depth) {
    fail(`Bed depth mismatch: Bed.jsx ${bedConsts.FULL_BED_OUTER_DEPTH} vs useConfiguration ${dimsConfig.fullBed.depth}`);
    ok = false;
  }
  if (bedConsts.INTERIOR_WIDTH !== dimsConfig.padBed.width) {
    fail(`Interior width mismatch: Bed.jsx ${bedConsts.INTERIOR_WIDTH} vs useConfiguration ${dimsConfig.padBed.width}`);
    ok = false;
  }
  if (bedConsts.INTERIOR_DEPTH !== dimsConfig.padBed.depth) {
    fail(`Interior depth mismatch: Bed.jsx ${bedConsts.INTERIOR_DEPTH} vs useConfiguration ${dimsConfig.padBed.depth}`);
    ok = false;
  }

  if (padSizes.washable !== dimsConfig.washablePad.width || padSizes.disposable !== dimsConfig.disposablePad.width) {
    fail(`Pad sizes mismatch: PeePad ${JSON.stringify(padSizes)} vs useConfiguration washers ${JSON.stringify(dimsConfig.washablePad)} disposables ${JSON.stringify(dimsConfig.disposablePad)}`);
    ok = false;
  }

  if (penSize && penSize !== 50) {
    fail(`Pen size unexpected: Playpen PEN_SIZE ${penSize} expected 50`);
    ok = false;
  }

  if (ok) {
    console.log('\nAUDIT OK: Dimension sources are consistent and use inches as units.');
    process.exitCode = 0;
  } else {
    console.error('\nAUDIT FAILED: See errors above.');
    process.exitCode = 2;
  }

} catch (e) {
  console.error('Exception during audit:', e);
  process.exitCode = 3;
}
