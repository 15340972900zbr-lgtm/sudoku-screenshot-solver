// Constraint solver shared by the page and the local checks.
const FULL = 0x3fe;
const bit = n => 1 << n;
const digits = mask => { const out=[]; for(let n=1;n<=9;n++) if(mask&bit(n)) out.push(n); return out; };
const peers = Array.from({length:81},(_,i)=>{
  const r=Math.floor(i/9), c=i%9, box=Math.floor(r/3)*3+Math.floor(c/3);
  const p=[]; for(let j=0;j<81;j++) if(j!==i){ const rr=Math.floor(j/9),cc=j%9;
    if(rr===r||cc===c||Math.floor(rr/3)*3+Math.floor(cc/3)===box) p.push(j);
  } return p;
});
const knights=Array.from({length:81},(_,i)=>{const r=Math.floor(i/9),c=i%9,a=[];
  for(const [dr,dc] of [[1,2],[1,-2],[-1,2],[-1,-2],[2,1],[2,-1],[-2,1],[-2,-1]]){
    const rr=r+dr,cc=c+dc;if(rr>=0&&rr<9&&cc>=0&&cc<9)a.push(rr*9+cc);
  }return a;
});
function validCage(cells,sum,board){
  let used=0,total=0,empty=0;
  for(const i of cells){const v=board[i];if(v){if(used&bit(v))return false;used|=bit(v);total+=v;}else empty++;}
  if(!empty)return total===sum;
  const remain=digits(FULL&~used).sort((a,b)=>a-b);
  if(remain.length<empty)return false;
  const min=remain.slice(0,empty).reduce((a,b)=>a+b,0);
  const max=remain.slice(-empty).reduce((a,b)=>a+b,0);
  return total+min<=sum&&total+max>=sum;
}
export function solvePuzzle(puzzle,limit=2){
  const board=puzzle.grid.map(Number), rules=puzzle.rules||{};
  const parity=puzzle.parity||Array(81).fill(0), cages=puzzle.cages||[], links=puzzle.links||[];
  if(board.length!==81||board.some(x=>!Number.isInteger(x)||x<0||x>9))return {error:'棋盘必须是 9×9，且只能填 1–9。'};
  if(rules.killer){
    const seen=new Set();for(const cage of cages){
      if(!Number.isInteger(cage.sum)||!Array.isArray(cage.cells)||!cage.cells.length)return {error:'请补全每个笼的格子与合计数。'};
      for(const i of cage.cells){if(i<0||i>80||seen.has(i))return {error:'杀手笼重叠或包含无效格。'};seen.add(i);}
    }
    // Some published killer variants mark only selected cages. Unmarked cells
    // still follow the base Sudoku rules.
  }
  const cageAt=Array(81).fill(-1);cages.forEach((c,k)=>c.cells.forEach(i=>cageAt[i]=k));
  const edges=Array.from({length:81},()=>[]);
  const marked=new Set();
  if(rules.consecutive)for(const e of links){
    if(!Array.isArray(e)||e.length!==2||e.some(i=>i<0||i>80))return {error:'连续标记有无效位置。'};
    const [a,b]=e;if(Math.abs(Math.floor(a/9)-Math.floor(b/9))+Math.abs(a%9-b%9)!==1)return {error:'连续标记必须位于相邻两格之间。'};
    edges[a].push(b);edges[b].push(a);marked.add([Math.min(a,b),Math.max(a,b)].join('-'));
  }
  const orthogonal=Array.from({length:81},(_,i)=>{
    const r=Math.floor(i/9),c=i%9,a=[];if(r>0)a.push(i-9);if(r<8)a.push(i+9);if(c>0)a.push(i-1);if(c<8)a.push(i+1);return a;
  });
  const diagonal=Array.from({length:81},(_,i)=>{
    const r=Math.floor(i/9),c=i%9,a=[];
    if(r===c)for(let k=0;k<9;k++)if(k!==r)a.push(k*9+k);
    if(r+c===8)for(let k=0;k<9;k++)if(k!==r)a.push(k*9+8-k);
    return a;
  });
  function candidates(i){
    let m=FULL;
    for(const j of peers[i])if(board[j])m&=~bit(board[j]);
    if(rules.antiKnight)for(const j of knights[i])if(board[j])m&=~bit(board[j]);
    if(rules.diagonal)for(const j of diagonal[i])if(board[j])m&=~bit(board[j]);
    if(rules.parity){if(parity[i]===1)m&=0x2aa;else if(parity[i]===2)m&=0x154;}
    if(rules.consecutive)for(const j of orthogonal[i])if(board[j]){
      const pair=[Math.min(i,j),Math.max(i,j)].join('-'),near=bit(board[j]-1)|bit(board[j]+1);
      m&=marked.has(pair)?near:~near;
    }
    if(rules.killer&&cageAt[i]>=0){const cage=cages[cageAt[i]];
      for(const j of cage.cells)if(board[j])m&=~bit(board[j]);
    }
    return m;
  }
  // Check all givens with the same constraints used for search.
  for(let i=0;i<81;i++)if(board[i]){
    const v=board[i];board[i]=0;const ok=!!(candidates(i)&bit(v));board[i]=v;
    if(!ok)return {error:`第 ${Math.floor(i/9)+1} 行第 ${i%9+1} 列的已知数与规则冲突。`};
  }
  if(rules.killer)for(const cage of cages)if(!validCage(cage.cells,cage.sum,board))return {error:'杀手笼的合计数或已知数有冲突。'};
  const solutions=[], maxNodes=800000;let nodes=0;
  function dfs(){
    if(solutions.length>=limit||++nodes>maxNodes)return;
    let at=-1,opts=0,best=10;
    for(let i=0;i<81;i++)if(!board[i]){
      const m=candidates(i),count=digits(m).length;if(!count)return;
      if(count<best){at=i;opts=m;best=count;if(count===1)break;}
    }
    if(at<0){solutions.push(board.slice());return;}
    for(const v of digits(opts)){
      board[at]=v;
      const cageIndex=cageAt[at];
      if(cageIndex<0||!rules.killer||validCage(cages[cageIndex].cells,cages[cageIndex].sum,board))dfs();
      board[at]=0;if(solutions.length>=limit)break;
    }
  }
  dfs();
  return {solutions,nodes,exhausted:nodes>maxNodes};
}
