import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sumComponents} from '../dist/recognition.mjs';
import {solvePuzzle} from '../dist/solver.mjs';

const sumSamples=JSON.parse(readFileSync(new URL('./fixtures/killer-sums.json',import.meta.url)));
test('small leading 1 remains part of a killer sum',()=>{
  for(const sample of sumSamples){
    const region={
      w:sample.rows[0].length,
      h:sample.rows.length,
      bits:Uint8Array.from(sample.rows.join(''),Number)
    };
    const parts=sumComponents(region);
    assert.equal(parts.length,String(sample.expected).length,sample.cell);
    assert.ok(parts.every(points=>points.length>=8),sample.cell);
  }
});

test('irregular regions replace standard 3×3 boxes',()=>{
  const latin=Array.from({length:81},(_,i)=>(Math.floor(i/9)+i%9)%9+1);
  assert.match(solvePuzzle({grid:latin,rules:{}}).error,/已知数/);
  const regions=Array.from({length:81},(_,i)=>Math.floor(i/9));
  const solved=solvePuzzle({grid:latin,regions,rules:{irregular:true}},1);
  assert.deepEqual(solved.solutions?.[0],latin);
  regions[0]=1;
  assert.match(solvePuzzle({grid:latin,regions,rules:{irregular:true}}).error,/每宫必须恰好 9 格/);
});

test('window regions add four independent 1–9 constraints',()=>{
  const valid='123456789456789123789123456534297861261834597897561234912378645348615972675942318'.split('').map(Number);
  assert.deepEqual(solvePuzzle({grid:valid,rules:{window:true}},1).solutions?.[0],valid);
  const ordinary='123456789456789123789123456234567891567891234891234567345678912678912345912345678'.split('').map(Number);
  assert.match(solvePuzzle({grid:ordinary,rules:{window:true}}).error,/已知数/);
});
