(() => {
  'use strict';
  const TAU = Math.PI * 2, instances = new Map(), reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const ease = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
  const hash = n => { const x = Math.sin(n * 127.1 + 12.9898) * 43758.5453; return x - Math.floor(x); };
  const orbit = Array.from({length: 540}, (_, i) => {
    const u = i * 2.39996323, v = i * 1.718, r = 0.78 + Math.cos(v) * 0.25;
    return {x:r*Math.cos(u),y:r*Math.sin(u),z:Math.sin(v)*0.36,
      hx:(hash(i*4+31)-0.5)*2.6,hy:(hash(i*6+8)-0.5)*2.6,
      size:0.65+hash(i+1)*1.2,i};
  });
  function dataValues(el) {
    const ids = el.dataset.motionSource?.split(',');
    if (ids) {
      const count = id => Number((document.getElementById(id)?.textContent || '').match(/\d+/)?.[0] || 0);
      const completed = count(ids[0]), total = count(ids[1]);
      return [Math.min(total,completed),Math.max(0,total-completed)];
    }
    return (el.dataset.values || '').split(',').map(Number).filter(Number.isFinite).map(v=>Math.max(0,v));
  }
  function glyph(s) {
    if (s.points) return s.points;
    const off = document.createElement('canvas');off.width=320;off.height=160;
    const g = off.getContext('2d',{willReadFrequently:true}); if(!g) return [];
    const label=(s.el.dataset.text||'RB').slice(0,4);
    g.fillStyle='#000';g.font='800 '+(label.length>2?82:112)+'px Arial,sans-serif';
    g.textAlign='center';g.textBaseline='middle';g.fillText(label,160,85,300);
    const pixels=g.getImageData(0,0,320,160).data, points=[];
    for(let y=5;y<155;y+=5)for(let x=5;x<315;x+=5)if(pixels[(y*320+x)*4+3]>100)
      points.push({x:(x-160)/320,y:(y-80)/160,hx:hash(x*y*0.07)-0.5,hy:hash(x*9+y)-0.5});
    return (s.points=points);
  }
  function render(s,time){
    const el=s.el,c=s.ctx;
    if(!el.isConnected)return;
    const w=Math.max(1,el.clientWidth),h=Math.max(1,el.clientHeight);
    const dpr=Math.min(1.6,devicePixelRatio||1);
    if(s.w!==w||s.h!==h||s.dpr!==dpr){s.w=w;s.h=h;s.dpr=dpr;el.width=Math.round(w*dpr);el.height=Math.round(h*dpr);}
    c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);
    const cx=w/2,cy=h/2,size=Math.min(w,h),accent=el.dataset.accent||'#d96a44';
    if(s.kind==='identity'){
      const k=ease((time-0.12)/2.4);
      glyph(s).forEach((p,i)=>{
        const x=cx+(p.x*k+p.hx*(1-k)+(1-k)*Math.sin(time*3+i)*0.09)*w*0.88;
        const y=cy+(p.y*k+p.hy*(1-k))*h*0.93;
        c.fillStyle=i%8===0?accent:'#293630';c.globalAlpha=0.4+0.6*k;
        c.beginPath();c.arc(x,y,Math.max(0.5,Math.min(1.55,size*0.009)),0,TAU);c.fill();
      });
      c.globalAlpha=ease((time-2.4)/0.7);
      c.fillStyle='#27332e';c.font='800 '+Math.floor(size*0.66)+'px Arial,sans-serif';
      c.textAlign='center';c.textBaseline='middle';
      c.fillText((el.dataset.text||'RB').slice(0,4),cx,cy+size*0.025,w*0.86);c.globalAlpha=1;
    } else if(s.kind==='orbit'){
      const k=ease(time/2.5),angle=time*0.18,r=size*0.35;
      const points=orbit.map(p=>{
        const x=(p.hx*(1-k)+p.x*k)*r,y=(p.hy*(1-k)+p.y*k)*r,z=p.z*k*r;
        const yy=y*Math.cos(angle)-z*Math.sin(angle),zz=y*Math.sin(angle)+z*Math.cos(angle);
        const xx=x*Math.cos(angle*.65)+zz*Math.sin(angle*.65),depth=-x*Math.sin(angle*.65)+zz*Math.cos(angle*.65);
        const proj=size/(size-depth*.22);
        return {x:cx+xx*proj,y:cy+yy*proj,z:depth,i:p.i,r:p.size*proj*Math.min(1,size/170)};
      }).sort((a,b)=>a.z-b.z);
      points.forEach(p=>{
        c.globalAlpha=Math.max(.2,Math.min(.85,.38+.45*(p.z/(size*.4)+.5)));
        c.fillStyle=p.i%4===0?'#198a88':accent;
        c.beginPath();c.arc(p.x,p.y,Math.max(.45,p.r),0,TAU);c.fill();
      });c.globalAlpha=1;
    } else if(s.kind==='object'){
      const a=time*.43+.5,b=.36+.12*Math.sin(time*.24),r=size*.3*ease((time+.3)/.8);
      const rot=([x,y,z])=>{const xx=x*Math.cos(a)+z*Math.sin(a),zz=-x*Math.sin(a)+z*Math.cos(a);return [xx,y*Math.cos(b)-zz*Math.sin(b),y*Math.sin(b)+zz*Math.cos(b)];};
      const verts=[];for(const z of [-r,r])for(const y of [-r,r])for(const x of [-r,r])verts.push(rot([x,y,z]));
      const proj=p=>{const k=size*2.2/(size*2.2-p[2]);return [cx+p[0]*k,cy+p[1]*k];};
      const faces=[[0,1,3,2],[4,5,7,6],[0,1,5,4],[2,3,7,6],[0,2,6,4],[1,3,7,5]];
      faces.sort((f,g)=>f.reduce((n,i)=>n+verts[i][2],0)-g.reduce((n,i)=>n+verts[i][2],0));
      faces.forEach((face,index)=>{
        const pts=face.map(i=>proj(verts[i]));
        c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();
        const grad=c.createLinearGradient(...pts[0],...pts[2]);grad.addColorStop(0,index%2?'#ffe2cd':'#f4b58e');grad.addColorStop(1,index%2?'#df7650':'#bf573b');
        c.fillStyle=grad;c.fill();c.strokeStyle='#9b4e3955';c.lineWidth=1;c.stroke();
      });
    } else if(s.kind==='data'){
      const vals=dataValues(el);if(!vals.length)return;
      const left=Math.max(5,w*.035),right=w-left,top=h*.1,bottom=h*.86;
      const max=Math.max(1,...vals),gap=(right-left)/vals.length,k=ease(time/1.45);
      c.strokeStyle='#cfded9';c.lineWidth=1;c.beginPath();c.moveTo(left,bottom+.5);c.lineTo(right,bottom+.5);c.stroke();
      c.beginPath();
      vals.forEach((value,i)=>{
        const x=left+(i+.5)*gap,y=bottom-(value/max)*(bottom-top)*k,bar=Math.min(32,gap*.58);
        c.fillStyle=i%3===0?'#cf734d':(el.dataset.accent||'#278e8c');
        c.fillRect(x-bar/2,y,bar,bottom-y);
        if(i===0)c.moveTo(x,y-2);else c.lineTo(x,y-2);
      });
      c.strokeStyle='#24372f';c.lineWidth=Math.max(1,Math.min(1.8,size*.02));c.stroke();
    }
  }
  function stop(s){if(s.raf)cancelAnimationFrame(s.raf);s.raf=0;}
  function start(s){
    stop(s);s.start=performance.now();
    function frame(now){
      s.raf=0;if(!s.el.isConnected||document.hidden||!s.visible)return;
      const elapsed=reduce.matches?5:Math.min(6,(now-s.start)/1000);
      render(s,elapsed);
      if(!reduce.matches&&(s.kind==='orbit'||s.kind==='object'||elapsed<3.3))s.raf=requestAnimationFrame(frame);
      if(!reduce.matches&&(s.kind==='orbit'||s.kind==='object')&&elapsed===6)s.start=now-1500;
    }
    if(s.visible)s.raf=requestAnimationFrame(frame);
  }
  const observer='IntersectionObserver' in window?new IntersectionObserver(entries=>{
    entries.forEach(e=>{const s=instances.get(e.target);if(!s)return;s.visible=e.isIntersecting;if(s.visible)start(s);else stop(s);});
  },{rootMargin:'80px'}):null;
  function mount(el){
    if(instances.has(el))return;
    const ctx=el.getContext('2d');if(!ctx)return;
    const s={el,ctx,kind:el.dataset.motionLight,visible:!observer,raf:0};
    instances.set(el,s);el.setAttribute('aria-hidden','true');el.style.pointerEvents='none';
    s.changes=new MutationObserver(()=>{if(s.kind==='data')start(s);});
    s.changes.observe(el,{attributes:true,attributeFilter:['data-values']});
    if(el.dataset.motionSource){
      s.sourceChanges=new MutationObserver(()=>start(s));
      el.dataset.motionSource.split(',').forEach(id=>{const n=document.getElementById(id);if(n)s.sourceChanges.observe(n,{childList:true,characterData:true,subtree:true});});
    }
    if(observer)observer.observe(el);else start(s);
  }
  function scan(node){if(node.matches?.('canvas[data-motion-light]'))mount(node);node.querySelectorAll?.('canvas[data-motion-light]').forEach(mount);}
  scan(document);
  new MutationObserver(records=>records.forEach(rec=>{
    rec.addedNodes.forEach(n=>{if(n.nodeType===1)scan(n);});
    rec.removedNodes.forEach(n=>{if(n.nodeType!==1)return;
      const clear=el=>{const s=instances.get(el);if(s&&!el.isConnected){stop(s);observer?.unobserve(el);s.changes.disconnect();s.sourceChanges?.disconnect();instances.delete(el);}};
      clear(n);n.querySelectorAll?.('canvas[data-motion-light]').forEach(clear);
    });
  })).observe(document.body,{childList:true,subtree:true});
  document.addEventListener('visibilitychange',()=>instances.forEach(s=>document.hidden?stop(s):s.visible&&start(s)));
  reduce.addEventListener?.('change',()=>instances.forEach(start));
  window.addEventListener('resize',()=>instances.forEach(s=>s.visible&&start(s)),{passive:true});
})();