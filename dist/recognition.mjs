const green=(r,g,b)=>g>65&&g>r*1.35&&g>b*1.12&&r<160;
const avg=(a)=>a.reduce((s,x)=>s+x,0)/a.length;
function imagePixels(image){const c=document.createElement('canvas');c.width=image.naturalWidth;c.height=image.naturalHeight;
  const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(image,0,0);return {width:c.width,height:c.height,data:x.getImageData(0,0,c.width,c.height).data};}
function colorAt(p,x,y){x=Math.max(0,Math.min(p.width-1,Math.round(x)));y=Math.max(0,Math.min(p.height-1,Math.round(y)));
  const i=(y*p.width+x)*4;return [p.data[i],p.data[i+1],p.data[i+2]];}
function clusters(values,gap=4){const out=[];for(const n of values){const last=out.at(-1);if(last&&n-last.at(-1)<=gap)last.push(n);else out.push([n]);}return out.map(a=>({at:avg(a),size:a.length}));}
export function locateBoard(p){
  // The supplied game uses a green, square outside border. Score pairs of long green lines.
  const rows=[];
  for(let y=0;y<p.height;y+=2){let first=-1,last=-1,count=0;
    for(let x=0;x<p.width;x+=2){const c=colorAt(p,x,y);if(green(...c)){if(first<0)first=x;last=x;count++;}}
    if(count>p.width*.25&&last-first>p.width*.52)rows.push({y,first,last,count});
  }
  const groups=[];for(const row of rows){const last=groups.at(-1);if(last&&row.y-last.at(-1).y<=5)last.push(row);else groups.push([row]);}
  const lines=groups.map(a=>({y:avg(a.map(v=>v.y)),x1:avg(a.map(v=>v.first)),x2:avg(a.map(v=>v.last)),strength:a.reduce((s,v)=>s+v.count,0)}));
  let best=null;
  for(let a=0;a<lines.length;a++)for(let b=a+1;b<lines.length;b++){
    const top=lines[a],bottom=lines[b],w=avg([top.x2-top.x1,bottom.x2-bottom.x1]),h=bottom.y-top.y;
    if(h<100||Math.abs(h-w)>w*.1||Math.abs(top.x1-bottom.x1)>w*.06)continue;
    const x1=avg([top.x1,bottom.x1]),x2=avg([top.x2,bottom.x2]);let side=0;
    for(let k=0;k<25;k++){const y=top.y+(k+.5)*h/25;
      for(const x of [x1,x2]){let found=false;for(let dx=-4;dx<=4;dx++)if(green(...colorAt(p,x+dx,y))){found=true;break;}if(found)side++;}}
    const score=side*10+top.strength+bottom.strength;
    if(!best||score>best.score)best={x:x1,y:top.y,w:x2-x1,h,score};
  }
  if(!best)throw Error('没有找到完整的绿色 9×9 棋盘。请截取包含整个棋盘的清晰图片。');
  return best;
}
function makeCrop(p,box,mode='digit'){
  const scale=mode==='sum'?5:3,c=document.createElement('canvas');c.width=Math.max(64,Math.round(box.w*scale));c.height=Math.max(64,Math.round(box.h*scale));
  const x=c.getContext('2d'),img=x.createImageData(c.width,c.height);let dark=0;
  for(let yy=0;yy<c.height;yy++)for(let xx=0;xx<c.width;xx++){
    const [r,g,b]=colorAt(p,box.x+(xx+.5)*box.w/c.width,box.y+(yy+.5)*box.h/c.height);
    const isDark=mode==='sum'?(r<160&&g<160&&b<160):mode==='inverse'?(r>110&&g>175&&b>100):(r<190&&g<190&&b<190)||(g<145&&r<80&&b<100&&green(r,g,b));
    const i=(yy*c.width+xx)*4;img.data[i]=img.data[i+1]=img.data[i+2]=isDark?0:255;img.data[i+3]=255;if(isDark)dark++;
  }x.putImageData(img,0,0);return {canvas:c,dark,ratio:dark/(c.width*c.height)};
}
function darkGreenFill(p,board,r,c){
  const step=board.w/9;let count=0;
  for(let iy=0;iy<5;iy++)for(let ix=0;ix<5;ix++){
    const [R,G,B]=colorAt(p,board.x+(c+.25+ix*.12)*step,board.y+(r+.25+iy*.12)*step);
    if(R<90&&G>80&&G<185&&B<120&&G>R+30)count++;
  }return count>=13;
}
let templatesPromise;
async function templates(){if(!templatesPromise)templatesPromise=fetch('./templates.json').then(r=>{if(!r.ok)throw Error('数字模板未加载');return r.json();});return templatesPromise;}
function readDigit(crop,refs){
  if(crop.ratio<.003||crop.ratio>.55)return {value:0,uncertain:false};
  const ctx=crop.canvas.getContext('2d',{willReadFrequently:true}),w=crop.canvas.width,h=crop.canvas.height,data=ctx.getImageData(0,0,w,h).data;
  const seen=new Uint8Array(w*h),components=[];
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    let at=y*w+x;if(seen[at]||data[at*4]>100)continue;
    const stack=[at],points=[];seen[at]=1;
    while(stack.length){at=stack.pop();const xx=at%w,yy=Math.floor(at/w);points.push([xx,yy]);
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
        if(!dx&&!dy)continue;const nx=xx+dx,ny=yy+dy,ni=ny*w+nx;
        if(nx>=0&&nx<w&&ny>=0&&ny<h&&!seen[ni]&&data[ni*4]<100){seen[ni]=1;stack.push(ni);}
      }
    }components.push(points);
  }
  components.sort((a,b)=>b.length-a.length);const points=components[0];
  if(!points||points.length<w*h*.003)return {value:0,uncertain:false};
  let x0=w,y0=h,x1=0,y1=0;for(const [x,y] of points){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
  if(x1-x0<3||y1-y0<h*.15)return {value:0,uncertain:true};
  const src=document.createElement('canvas');src.width=x1-x0+1;src.height=y1-y0+1;const sx=src.getContext('2d');sx.fillStyle='white';sx.fillRect(0,0,src.width,src.height);sx.fillStyle='black';for(const [x,y] of points)sx.fillRect(x-x0,y-y0,1,1);
  const norm=document.createElement('canvas');norm.width=24;norm.height=32;const nx=norm.getContext('2d');nx.fillStyle='white';nx.fillRect(0,0,24,32);nx.drawImage(src,0,0,24,32);
  const pixels=nx.getImageData(0,0,24,32).data;let best={distance:Infinity,value:0},second=Infinity;
  for(const ref of refs){let d=0;for(let i=0;i<768;i++)d+=Math.abs(1-pixels[i*4]/255-ref.pixels[i]);d/=768;
    if(d<best.distance){second=best.distance;best={distance:d,value:ref.digit};}else if(d<second&&ref.digit!==best.value)second=d;
  }
  return {value:best.distance<.31?best.value:0,uncertain:best.distance>.20||second-best.distance<.015};
}
function boundaryScore(p,board,a,b){
  const step=board.w/9,ar=Math.floor(a/9),ac=a%9,br=Math.floor(b/9),bc=b%9;
  // Cage outlines are dotted. A parity square or the 3×3 grid is a solid line;
  // comparing alternating samples along each inset side separates them.
  let best=0;
  for(const sign of [-1,1])for(const d of [.035,.045,.055,.065,.075,.085,.095,.105,.115,.125,.135,.145,.155,.165]){
    let previous=false,transitions=0,count=0;
    for(let n=0;n<60;n++){
      const t=.1+n*.0133;let x,y,bx,by;
      if(ar===br){x=board.x+Math.max(ac,bc)*step+sign*d*step;y=board.y+(ar+t)*step;bx=x+sign*.15*step;by=y;}
      else{x=board.x+(ac+t)*step;y=board.y+Math.max(ar,br)*step+sign*d*step;bx=x;by=y+sign*.15*step;}
      const c=colorAt(p,x,y),base=colorAt(p,bx,by),delta=Math.max(...c.map((v,k)=>Math.abs(v-base[k])));
      const on=delta>30&&Math.min(...c)>105&&Math.max(...c)-Math.min(...c)>15;
      if(n&&on!==previous)transitions++;if(on)count++;previous=on;
    }
    if(count>=4&&count<=54)best=Math.max(best,transitions);
  }
  return best;
}
function sumRegion(p,board,i,anchorOnly=false){
  const step=board.w/9,r=Math.floor(i/9),c=i%9;
  const x=Math.round(board.x+(c+(anchorOnly?.03:.02))*step),y=Math.round(board.y+(r+(anchorOnly?.02:.015))*step),w=Math.round(step*(anchorOnly?.29:.36)),h=Math.round(step*(anchorOnly?.20:.29));
  const bits=new Uint8Array(w*h);let count=0;
  for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++){
    const [R,G,B]=colorAt(p,x+xx,y+yy);if(R<100&&G<100&&B<100){bits[yy*w+xx]=1;count++;}
  }
  return {x,y,w,h,bits,count};
}
function components(region,minSize=15){
  const {w,h,bits}=region,seen=new Uint8Array(bits.length),out=[];
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    let at=y*w+x;if(!bits[at]||seen[at])continue;
    const stack=[at],points=[];seen[at]=1;
    while(stack.length){at=stack.pop();const px=at%w,py=Math.floor(at/w);points.push([px,py]);
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
        const nx=px+dx,ny=py+dy,ni=ny*w+nx;
        if(nx>=0&&nx<w&&ny>=0&&ny<h&&bits[ni]&&!seen[ni]){seen[ni]=1;stack.push(ni);}
      }
    }if(points.length>minSize)out.push(points);
  }
  return out.sort((a,b)=>Math.min(...a.map(p=>p[0]))-Math.min(...b.map(p=>p[0])));
}
function normalized(points){
  let x0=Infinity,y0=Infinity,x1=0,y1=0;for(const [x,y] of points){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
  const a=document.createElement('canvas');a.width=x1-x0+1;a.height=y1-y0+1;const ax=a.getContext('2d');ax.fillStyle='#fff';ax.fillRect(0,0,a.width,a.height);ax.fillStyle='#000';for(const [x,y] of points)ax.fillRect(x-x0,y-y0,1,1);
  const b=document.createElement('canvas');b.width=24;b.height=32;const bx=b.getContext('2d');bx.fillStyle='#fff';bx.fillRect(0,0,24,32);bx.drawImage(a,0,0,24,32);
  const raw=bx.getImageData(0,0,24,32).data;return Array.from({length:768},(_,i)=>1-raw[i*4]/255);
}
let sumTemplatesPromise;
async function readSumTemplates(){if(!sumTemplatesPromise)sumTemplatesPromise=fetch('./sum-templates.json').then(r=>r.json());return sumTemplatesPromise;}
function templateNumber(region,refs){
  const parts=components(region).filter(a=>a.length>=20);
  if(!parts.length||parts.length>2)return 0;
  let result='';for(const points of parts){const f=normalized(points);let best={digit:0,distance:Infinity};
    for(const ref of refs){let d=0;for(let k=0;k<768;k++)d+=Math.abs(f[k]-ref.pixels[k]);d/=768;if(d<best.distance)best={digit:ref.digit,distance:d};}
    if(best.distance>.36)return 0;result+=best.digit;
  }return Number(result);
}
function detectCages(p,board,anchors){
  const parent=Array.from({length:81},(_,i)=>i);
  const root=i=>parent[i]===i?i:(parent[i]=root(parent[i]));
  const merge=(a,b)=>parent[root(a)]=root(b);
  const edges=[];
  for(let i=0;i<81;i++){
    if(i%9<8)edges.push([i,i+1,boundaryScore(p,board,i,i+1)]);
    if(i<72)edges.push([i,i+9,boundaryScore(p,board,i,i+9)]);
  }
  for(const [a,b,score] of edges)if(score<6)merge(a,b);
  // Each cage has one small sum label. Join fragments along the least convincing
  // dotted boundary, while never merging two components that both have labels.
  // Leave regions without a visible sum unclaimed at this stage. They may be
  // joined to a neighboring cage once its total is known.
  const map=new Map();for(let i=0;i<81;i++){const k=root(i);if(!map.has(k))map.set(k,[]);map.get(k).push(i);}
  const groups=[...map.values()].sort((a,b)=>Math.min(...a)-Math.min(...b));
  return {cages:groups.filter(cells=>cells.some(i=>anchors.has(i))).map(cells=>({cells,sum:0,anchor:cells.find(i=>anchors.has(i))})),orphans:groups.filter(cells=>!cells.some(i=>anchors.has(i))),edges};
}
function cageBounds(cage,grid){
  let used=0,total=0,empty=0;for(const i of cage.cells){const n=grid[i];if(n){if(used&(1<<n))return {min:Infinity,max:-Infinity};used|=1<<n;total+=n;}else empty++;}
  const available=[];for(let n=1;n<=9;n++)if(!(used&(1<<n)))available.push(n);
  if(available.length<empty)return {min:Infinity,max:-Infinity};
  return {min:total+available.slice(0,empty).reduce((a,b)=>a+b,0),max:total+available.slice(-empty).reduce((a,b)=>a+b,0)};
}
function attachNecessaryCells(cages,orphans,edges,grid){
  for(let turn=0;turn<20;turn++){
    const needy=cages.find(c=>c.sum&&cageBounds(c,grid).max<c.sum);
    if(!needy)break;
    let best=null;
    for(let k=0;k<orphans.length;k++){
      const joined={...needy,cells:[...needy.cells,...orphans[k]]};
      const bounds=cageBounds(joined,grid);if(bounds.min>needy.sum)continue;
      const score=Math.min(...edges.filter(([a,b])=>(needy.cells.includes(a)&&orphans[k].includes(b))||(needy.cells.includes(b)&&orphans[k].includes(a))).map(e=>e[2]));
      const resolves=bounds.max>=needy.sum;
      if(Number.isFinite(score)&&(!best||(resolves&&!best.resolves)||(resolves===best.resolves&&score<best.score)))best={k,score,resolves};
    }
    if(!best)break;
    needy.cells.push(...orphans[best.k]);orphans.splice(best.k,1);
  }
  return cages;
}
function classifyMarkers(p,board){
  const step=board.w/9,parity=Array(81).fill(0);let count=0;
  for(let i=0;i<81;i++){const r=Math.floor(i/9),c=i%9;let blue=0,orange=0;
    for(let yy=.06;yy<.95;yy+=.025)for(let xx=.06;xx<.95;xx+=.025){const [R,G,B]=colorAt(p,board.x+(c+xx)*step,board.y+(r+yy)*step);
      if(B>R+15&&B>G+4&&R>100)blue++;
      if(R>G+25&&G>B+12&&R>160)orange++;
    }
    if(blue>25&&blue>orange*1.5){parity[i]=1;count++;}
    else if(orange>25&&orange>blue*1.5){parity[i]=2;count++;}
  }
  return {parity,count};
}
function findConsecutive(p,board){
  // Consecutive puzzles often put a short gray bar at the midpoint of a shared edge.
  const step=board.w/9,links=[];
  for(let i=0;i<81;i++)for(const j of [i+1,i+9]){
    if(j>=81||(j===i+1&&i%9===8))continue;
    const horizontal=j===i+1,r=Math.floor(i/9),c=i%9;
    const x=board.x+(c+(horizontal?1:.5))*step,y=board.y+(r+(horizontal?.5:1))*step;
    let center=0,outer=0;
    for(let a=-.16;a<=.16;a+=.025)for(let d=-.035;d<=.035;d+=.0175){
      const sample=(at)=>{const [R,G,B]=colorAt(p,x+(horizontal?d:at)*step,y+(horizontal?at:d)*step);
        return Math.max(R,G,B)-Math.min(R,G,B)<35&&Math.min(R,G,B)>35&&Math.max(R,G,B)<190;};
      if(sample(a))center++;if(sample(a<0?a-.25:a+.25))outer++;
    }
    if(center>=14&&center>outer*2.5)links.push([i,j]);
  }
  return links;
}
let workerPromise;
async function getWorker(){
  if(!window.Tesseract)throw Error('识别引擎未加载。请检查网络连接，或直接在棋盘中输入数字。');
  const asset=path=>new URL(path,import.meta.url).href;
  if(!workerPromise)workerPromise=Tesseract.createWorker('eng',1,{
    logger:()=>{},
    workerPath:asset('./ocr/worker.min.js'),
    corePath:asset('./ocr/core'),
    langPath:asset('./ocr/lang'),
  }).then(async w=>{
    await w.setParameters({tessedit_char_whitelist:'123456789',tessedit_pageseg_mode:'10'});return w;
  }).catch(e=>{workerPromise=null;throw e;});return workerPromise;
}
async function readNumber(worker,crop,psm='10'){
  await worker.setParameters({tessedit_pageseg_mode:psm,tessedit_char_whitelist:psm==='7'?'0123456789':'123456789'});
  const result=await worker.recognize(crop.canvas);
  const match=result.data.text.match(/[1-9]+/);return match?Number(match[0]):0;
}
export async function recognize(image,onProgress=()=>{}){
  const p=imagePixels(image),board=locateBoard(p),step=board.w/9;
  const anchors=new Set();for(let i=0;i<81;i++)if(sumRegion(p,board,i,true).count>20)anchors.add(i);
  const killer=anchors.size>=8;let cages=[],orphanGroups=[],cageEdges=[];
  if(killer){const detected=detectCages(p,board,anchors);cages=detected.cages;orphanGroups=detected.orphans;cageEdges=detected.edges;}
  const markers=killer?{parity:Array(81).fill(0),count:0}:classifyMarkers(p,board);
  const candidateLinks=killer?[]:findConsecutive(p,board);
  const consecutive=!killer&&markers.count<3&&candidateLinks.length>=5;
  const links=consecutive?candidateLinks:[];
  const rules={classic:true,antiKnight:false,killer,diagonal:false,parity:!killer&&markers.count>=3,consecutive};
  const grid=Array(81).fill(0),uncertain=[];onProgress('已找到棋盘，正在识别数字…');
  const refs=await templates();let processed=0,worker=null;
  for(let i=0;i<81;i++){
    const r=Math.floor(i/9),c=i%9;
    const crop=makeCrop(p,{x:board.x+(c+.19)*step,y:board.y+(r+.16)*step,w:step*.62,h:step*.69});
    const filled=crop.ratio>.55&&darkGreenFill(p,board,r,c);
    const found=readDigit(filled?makeCrop(p,{x:board.x+(c+.19)*step,y:board.y+(r+.16)*step,w:step*.62,h:step*.69},'inverse'):crop,refs);grid[i]=found.value;
    if(!killer&&!grid[i]&&found.uncertain){try{worker??=await getWorker();grid[i]=await readNumber(worker,crop);}catch{}}
    if(found.uncertain&&!grid[i])uncertain.push(i);
    processed++;if(processed%9===0)onProgress(`正在识别数字 ${processed}/81…`);
  }
  if(killer){const refs=await readSumTemplates();for(let k=0;k<cages.length;k++){
    const i=cages[k].anchor;if(i===undefined){uncertain.push(Math.min(...cages[k].cells));continue;}
    let sum=templateNumber(sumRegion(p,board,i),refs);
    if(!sum){try{worker??=await getWorker();const r=Math.floor(i/9),c=i%9;
      const crop=makeCrop(p,{x:board.x+(c+.02)*step,y:board.y+(r+.015)*step,w:step*.36,h:step*.29},'sum');sum=await readNumber(worker,crop,'7');}catch{}}
    cages[k].sum=sum;if(!sum)uncertain.push(i);
    if(k%5===0)onProgress(`正在识别笼合计 ${k+1}/${cages.length}…`);
  }cages=attachNecessaryCells(cages,orphanGroups,cageEdges,grid).map(({anchor,...c})=>c);}
  return {puzzle:{grid,parity:markers.parity,cages,links,rules},board,uncertain};
}
