import { useConfiguration } from '../src/hooks/useConfiguration.js';
import { halfExtentsForItem, aabbOverlap, isOverlappingAny, findNonOverlappingPosition } from '../src/utils/collision.js';

const MODES = ['icu','recovery','grad'];
const gridSize = 0.25;

function layoutItems(layout) {
  const out = [];
  const lists = [ ['beds','bed'], ['bowls','bowl'], ['pads','pad'] ];
  for (const [key, kind] of lists) {
    const arr = layout[key] || [];
    for (let i = 0; i < arr.length; i++) {
      const it = arr[i];
      // ensure a stable identifier on the original object so excludes and logs work
      if (!it._id) it._id = `${kind}:${i}`;
      it.__kind = kind;
      out.push(it); // push the original object reference so edits persist
    }
  }
  return out;
}

function findSolidOverlaps(layout) {
  const items = layoutItems(layout).filter(it => it.position && it.__kind !== 'pad');
  const issues = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i+1; j < items.length; j++) {
      const A = items[i];
      const B = items[j];
      if (aabbOverlap(A.position, halfExtentsForItem(A), B.position, halfExtentsForItem(B))) {
        issues.push({ a: A, b: B });
      }
    }
  }
  return issues;
}

async function auditMode(mode) {
  console.log('\n=== AUDIT', mode, '===');
  const layout = useConfiguration(mode);
  const issues = findSolidOverlaps(layout);
  if (!issues.length) {
    console.log('No solid overlaps detected.');
    return { mode, ok: true };
  }
  console.log('Detected', issues.length, 'overlaps. Attempting auto-fix...');

  // Try to auto-fix each overlapping item by finding nearest non-overlapping position
  let attempts = 0;
  const maxAttempts = 50;
  let changed = false;

  while (attempts < maxAttempts) {
    const curIssues = findSolidOverlaps(layout);
    if (!curIssues.length) break;
    changed = true;
    for (const issue of curIssues) {
      const cand = issue.b; // try moving the later item
      const pos = cand.position;
      const alt = findNonOverlappingPosition(layout, cand, pos, { gridSize, maxRadius: 24, excludeId: cand._id });
      if (alt) {
        console.log(`${cand.__kind} nudged to [${alt[0].toFixed(1)}, ${alt[2].toFixed(1)}] to resolve overlap with ${issue.a.__kind}`);
        cand.position = alt;
      } else {
        console.warn(`Could not find alt for ${cand.__kind} id=${cand._id}`);
      }
    }
    attempts++;
  }

  const finalIssues = findSolidOverlaps(layout);
  if (!finalIssues.length) {
    console.log('Auto-fix succeeded — no remaining solid overlaps.');
    return { mode, ok: true, changed };
  }
  console.warn('Auto-fix incomplete — remaining overlaps:', finalIssues.length);
  return { mode, ok: false, remaining: finalIssues.length };
}

async function run() {
  const results = [];
  for (const mode of MODES) {
    results.push(await auditMode(mode));
  }
  console.log('\nSummary:');
  console.table(results.map(r => ({ mode: r.mode, ok: r.ok, changed: r.changed || false, remaining: r.remaining || 0 })));
}

run();
