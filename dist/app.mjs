import {recognize} from './recognition.mjs';
import {solvePuzzle} from './solver.mjs';
const $=id=>document.getElementById(id);
const names={classic:'经典',antiKnight:'无马',killer:'杀手',diagonal:'对角线',parity:'奇偶',consecutive:'连续'};
function blank(){return {grid:Array(81).fill(0),parity:Array(81).fill(0),cages:[],links:[],rules:{classic:true,antiKnight:false,killer:false,diagonal:false,parity:false,consecutive:false}};}
let puzzle=blank(),given=Array(81).fill(false),uncertain=new Set(),solution=null,selected=0,mode='number',cageSelection=new Set(),linkStart=null,photoURL=null;
function say(message,error=false){$('status').textContent=message;$('status').classList.toggle('error',error);}
function showResult(message,error=false){$('result').textContent=message;$('result').classList.remove('hidden');$('result').classList.toggle('error',error);}
function invalidate(){$('result').classList.add('hidden');solution=null;}
function cageAt(i){return puzzle.cages.findIndex(c=>c.cells.includes(i));}
function hasLink(a,b){return puzzle.links.some(e=>(e[0]===a&&e[1]===b)||(e[0]===b&&e[1]===a));}
function renderRules(){const box=$('rule-list');box.innerHTML='';for(const [key,label] of Object.entries(names)){
  const button=document.createElement('button');button.className='rule-chip'+(puzzle.rules[key]?' active':'');button.textContent=label;button.type='button';button.setAttribute('aria-pressed',String(!!puzzle.rules[key]));
  button.addEventListener('click',()=>{if(key!=='classic')puzzle.rules[key]=!puzzle.rules[key];invalidate();renderRules();renderBoard();});box.append(button);
}}
function renderBoard(){const board=$('board');board.innerHTML='';for(let i=0;i<81;i++){
  const r=Math.floor(i/9),c=i%9,v=solution?.[i]||puzzle.grid[i],cell=document.createElement('button');cell.type='button';cell.className='cell';
  if(c===2||c===5)cell.classList.add('box-r');if(r===2||r===5)cell.classList.add('box-b');
  if(given[i]&&puzzle.grid[i])cell.classList.add('given');if(solution&&!puzzle.grid[i])cell.classList.add('answer');
  if(uncertain.has(i))cell.classList.add('uncertain');if(selected===i)cell.classList.add('selected');
  if(cageSelection.has(i))cell.classList.add('cage-picked');
  if(puzzle.rules.parity&&puzzle.parity[i])cell.classList.add(puzzle.parity[i]===1?'parity-odd':'parity-even');
  if(puzzle.rules.killer&&cageAt(i)>=0){const k=cageAt(i),cells=puzzle.cages[k].cells;if(i===Math.min(...cells)){
    const small=document.createElement('span');small.className='cage-label';small.textContent=puzzle.cages[k].sum||'?';cell.append(small);
  }if(cells.includes(selected))cell.classList.add('cage-outline');}
  if(puzzle.rules.consecutive){for(const [j,klass] of [[i+1,'link-right'],[i+9,'link-bottom']])if((j===i+1?c<8:j<81)&&hasLink(i,j)){const mark=document.createElement('span');mark.className=klass;cell.append(mark);}}
  const number=document.createElement('span');number.textContent=v||'';cell.append(number);
  cell.setAttribute('aria-label',`${r+1} 行 ${c+1} 列${v?`，${v}`:'，空格'}`);cell.addEventListener('click',()=>tapCell(i));board.append(cell);
}}
function tapCell(i){
  if(mode==='number'){selected=i;uncertain.delete(i);renderBoard();return;}
  if(mode==='parity'){puzzle.rules.parity=true;puzzle.parity[i]=(puzzle.parity[i]+1)%3;selected=i;invalidate();renderRules();renderBoard();return;}
  if(mode==='cage'){
    if(!cageSelection.size&&cageAt(i)>=0){const cage=puzzle.cages[cageAt(i)];$('cage-sum').value=cage.sum||'';}
    if(cageSelection.has(i))cageSelection.delete(i);else cageSelection.add(i);selected=i;renderBoard();return;
  }
  if(mode==='link'){
    if(linkStart===null){linkStart=i;selected=i;say('再点一格相邻格子，添加或取消连续标记。');renderBoard();return;}
    const a=linkStart,b=i;linkStart=null;selected=i;
    if(Math.abs(Math.floor(a/9)-Math.floor(b/9))+Math.abs(a%9-b%9)!==1){say('连续标记要点选相邻两格。',true);renderBoard();return;}
    puzzle.rules.consecutive=true;
    if(hasLink(a,b))puzzle.links=puzzle.links.filter(e=>!((e[0]===a&&e[1]===b)||(e[0]===b&&e[1]===a)));
    else puzzle.links.push([a,b]);invalidate();renderRules();renderBoard();say('已更新连续标记。');
  }
}
function setMode(next){mode=next;linkStart=null;cageSelection.clear();document.querySelectorAll('#modes button').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));
  $('numpad').classList.toggle('hidden',mode!=='number');$('cage-tools').classList.toggle('hidden',mode!=='cage');
  $('mode-help').textContent={number:'点选格子，再点下方数字。空格键可清除。',parity:'点格子循环切换：未标记 → 圆圈奇数 → 方框偶数。',link:'依次点两格相邻格子，添加或取消连续标记。',cage:'逐格选中一个笼，填写合计后保存；点现有笼可修改。'}[mode];renderBoard();}
function setDigit(n){puzzle.grid[selected]=n;given[selected]=false;uncertain.delete(selected);invalidate();renderBoard();}
for(let n=1;n<=9;n++){const b=document.createElement('button');b.type='button';b.textContent=n;b.addEventListener('click',()=>setDigit(n));$('numpad').append(b);}const erase=document.createElement('button');erase.type='button';erase.textContent='清除';erase.addEventListener('click',()=>setDigit(0));$('numpad').append(erase);
document.addEventListener('keydown',e=>{if(document.activeElement?.tagName==='INPUT')return;if(mode!=='number')return;if(/^[1-9]$/.test(e.key))setDigit(Number(e.key));if(e.key==='Backspace'||e.key==='Delete'||e.key==='0')setDigit(0);});
document.querySelectorAll('#modes button').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));
$('save-cage').addEventListener('click',()=>{
  const cells=[...cageSelection].sort((a,b)=>a-b),sum=Number($('cage-sum').value);
  if(!cells.length||!Number.isInteger(sum)||sum<1||sum>45){showResult('请选中笼内格子，并填写有效合计数。',true);return;}
  puzzle.cages=puzzle.cages.filter(c=>!c.cells.some(i=>cageSelection.has(i)));
  puzzle.cages.push({cells,sum});puzzle.rules.killer=true;cageSelection.clear();$('cage-sum').value='';invalidate();renderRules();renderBoard();say('已保存笼。请对照原题检查笼的格子与合计数。');
});
$('clear-selection').addEventListener('click',()=>{cageSelection.clear();$('cage-sum').value='';renderBoard();});
$('solve').addEventListener('click',()=>{
  const result=solvePuzzle(puzzle);if(result.error){showResult(result.error,true);return;}
  if(!result.solutions.length){showResult(result.exhausted?'搜索量过大，请检查题目约束。':'没有符合这些数字与规则的答案。请核对橙色虚线格、笼合计和题型。',true);return;}
  if(result.solutions.length>1){solution=result.solutions[0];renderBoard();showResult('找到了多种答案，目前显示其中一种。请补全特殊规则或核对截图识别结果。');return;}
  solution=result.solutions[0];renderBoard();showResult('已求得唯一答案。绿色数字是补入的答案；深色数字是题目中的数字。');
});
$('reset').addEventListener('click',()=>{puzzle=blank();given.fill(false);uncertain.clear();solution=null;selected=0;cageSelection.clear();$('result').classList.add('hidden');$('image-wrap').classList.add('hidden');$('board-photo-wrap').classList.add('hidden');$('file').value='';if(photoURL)URL.revokeObjectURL(photoURL);photoURL=null;renderRules();renderBoard();say('已清空，可以上传另一张截图。');});
$('file').addEventListener('change',async e=>{
  const file=e.target.files?.[0];if(!file)return; if(photoURL)URL.revokeObjectURL(photoURL);photoURL=URL.createObjectURL(file);const img=$('photo');img.src=photoURL;$('image-wrap').classList.remove('hidden');
  try{await img.decode();say('正在寻找 9×9 棋盘…');const detected=await recognize(img,message=>say(message));puzzle=detected.puzzle;given=puzzle.grid.map(Boolean);uncertain=new Set(detected.uncertain);selected=0;solution=null;renderRules();renderBoard();$('result').classList.add('hidden');
    const canvas=$('board-photo');canvas.width=720;canvas.height=720;const {x,y,w,h}=detected.board;canvas.getContext('2d').drawImage(img,x,y,w,h,0,0,720,720);$('board-photo-wrap').classList.remove('hidden');
    if(!puzzle.rules.killer&&!puzzle.rules.parity&&puzzle.grid.filter(Boolean).length>=12){
      const base=solvePuzzle(puzzle);
      if(base.solutions?.length===2){
        const candidates=[];
        for(const key of ['antiKnight','diagonal']){const trial={...puzzle,rules:{...puzzle.rules,[key]:true}};const result=solvePuzzle(trial);
          if(result.solutions?.length===1)candidates.push(key);
        }
        if(candidates.length===1){puzzle.rules[candidates[0]]=true;renderRules();}
      }
    }
    const type=Object.entries(puzzle.rules).filter(([k,v])=>v&&k!=='classic').map(([k])=>names[k]).join('、')||'经典';
    say(`已识别为${type}数独，读到 ${puzzle.grid.filter(Boolean).length} 个数字${puzzle.rules.killer?`、${puzzle.cages.length} 个笼`:''}。请核对橙色虚线格与规则。`);
  }catch(err){say(`识别未完成：${err?.message||err}。可以手动输入棋盘。`,true);}
});
renderRules();renderBoard();
