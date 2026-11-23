/* trình duyệt chưa hỗ trợ text-wrap:pretty: nối hai chữ cuối bằng khoảng trắng không ngắt để dòng cuối không còn một chữ */
(()=>{if(window.CSS&&CSS.supports('text-wrap','pretty'))return;
document.querySelectorAll('main p, main li, main dd, main figcaption, main h1, main h2, main h3').forEach(el=>{
  if(el.textContent.trim().split(/\s+/).length<4)return;
  const w=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let last=null,n;while((n=w.nextNode()))if(n.nodeValue.trim())last=n;
  if(!last)return;const t=last.nodeValue.replace(/\s+$/,''),i=t.lastIndexOf(' ');
  if(i>0)last.nodeValue=t.slice(0,i)+' '+t.slice(i+1)+last.nodeValue.slice(t.length);});})();

/* Ansan — shared header behaviour + mobile menu for sub-pages. */
(()=>{
const root=document.documentElement, hd=document.querySelector('header');
if(!hd) return;
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const alwaysSolid=hd.hasAttribute('data-solid');

/* header: solid once the page moves; hides only after ~160px of continuous downward scroll
   (never in the first half-screen), returns after ~40px of upward scroll */
const HIDE_AFTER=160, SHOW_AFTER=40;
let lastY=scrollY, anchor=scrollY, dir=0, tick=false;
function frame(){
  tick=false;
  const y=Math.max(0,scrollY), dy=y-lastY; lastY=y;
  hd.classList.toggle('solid',alwaysSolid||y>40);
  if(dy===0) return;
  const d=dy>0?1:-1;
  if(d!==dir){dir=d;anchor=y-dy;}
  if(y<Math.max(320,innerHeight*.5)){hd.classList.remove('hide');return;}
  if(dir>0&&y-anchor>HIDE_AFTER) hd.classList.add('hide');
  else if(dir<0&&anchor-y>SHOW_AFTER) hd.classList.remove('hide');
}
addEventListener('scroll',()=>{if(!tick){tick=true;requestAnimationFrame(frame)}},{passive:true});
frame();

/* mobile menu */
const burger=hd.querySelector('.burger'), mnav=document.getElementById('mnav');
if(!burger||!mnav) return;
const setMenu=open=>{
  root.classList.toggle('menu-open',open);
  burger.setAttribute('aria-expanded',open);
  burger.setAttribute('aria-label',open?'Đóng menu':'Mở menu');
  mnav.setAttribute('aria-hidden',!open);
  if(open){hd.classList.remove('hide');const a=mnav.querySelector('a');if(a)a.focus({preventScroll:true});}
};
burger.addEventListener('click',()=>setMenu(!root.classList.contains('menu-open')));
mnav.querySelectorAll('a').forEach(a=>a.addEventListener('click',e=>{
  const h=a.getAttribute('href')||'';
  if(h.startsWith('#')){const t=document.querySelector(h);if(!t)return;e.preventDefault();setMenu(false);
    requestAnimationFrame(()=>{t.scrollIntoView({behavior:reduce?'auto':'smooth'});history.replaceState(null,'',h)});}
  else setMenu(false);
}));
addEventListener('keydown',e=>{if(e.key==='Escape'&&root.classList.contains('menu-open')){setMenu(false);burger.focus();}});
matchMedia('(max-width:1200px)').addEventListener('change',e=>{if(!e.matches)setMenu(false)});
})();

/* =====================================================================
   Scroll reveals for sub-pages — same language as the homepage:
   headings rise line by line out of a mask, photos open like a curtain,
   list items rise in turn. Transform (and clip on small text) only — no fading.
   The clip sits on the CHILDREN so IntersectionObserver can still see the observed element.
   ===================================================================== */
(()=>{
const root=document.documentElement;
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches||!('IntersectionObserver' in window);
if(!reduce) root.classList.add('motion');
const $$=(s,c=document)=>[...c.querySelectorAll(s)];
const io=reduce?null:new IntersectionObserver(es=>es.forEach(e=>{if(!e.isIntersecting)return;io.unobserve(e.target);e.target.classList.add('is-in');}),
  {rootMargin:'100% 0px -8% 0px',threshold:0} /* top margin: things already scrolled past (fast flicks) still reveal */);
/* rendering is suppressed while a cross-document view transition runs, and an observer started
   in that window can miss entries — on first load, collect the targets and start watching once
   the page is shown; content swapped in later (sub-tabs) is watched straight away */
let live=false; const queued=[];
const watch=el=>{if(!io)return el.classList.add('is-in'); live?io.observe(el):queued.push(el);};
const start=()=>{if(live)return;live=true;queued.forEach(el=>io.observe(el));};
const split=h=>{if(h.dataset.split)return;h.dataset.split=1;
  h.innerHTML=h.innerHTML.split(/<br\s*\/?>/i).map((t,i)=>'<span class="rv-line"><span style="transition-delay:'+(i*.12).toFixed(2)+'s">'+t+'</span></span>').join('');};
const GROUPS=['.grid-list','.ledger','.road','.roles','.packs','.br','.people','.who','.tiers','.next','.phases','.tiers3','.isnt','.vm','.posts','.docs','.journey ol','.steps ol','.org','.rows'];

/* set up every reveal inside `scope`; heroStatic = show the hero as it stands (sub-tab swap) */
function setup(scope,heroStatic){
  const heroH=$$('.phero h1, .thero h1, .lp .hero h1, .intro h1',scope);
  heroH.forEach(split);
  if(heroStatic||!io) heroH.forEach(h=>h.classList.add('is-in'));
  else{const show=()=>heroH.forEach(h=>h.classList.add('is-in'));
    requestAnimationFrame(()=>requestAnimationFrame(show)); setTimeout(show,400); /* rAF can be paused in a background tab */}
  /* 1 · headings → masked lines */
  $$('h2',scope).filter(h=>h.closest('main')&&!h.closest('.pk, .done, legend')&&!h.dataset.split).forEach(h=>{split(h);watch(h)});
  /* 2 · photos open like a curtain (hero photos animate on load via CSS) */
  $$('.split figure, .gallery .ph, .feat-img, .body figure, .journey figure, .lp .place figure, .partner-main .mou',scope)
    .filter(f=>!f.classList.contains('rv-img')).forEach(f=>{f.classList.add('rv-img');watch(f)});
  /* 3 · list items rise in turn */
  $$(GROUPS.join(','),scope).forEach(g=>{
    const kids=g.matches('.docs')?$$(':scope > section',g):[...g.children];
    kids.filter(k=>!k.classList.contains('rv-item')).forEach((k,i)=>{k.classList.add('rv-item');k.style.setProperty('--d',(Math.min(i,7)*.08).toFixed(2)+'s');watch(k)});
  });
}
setup(document,false);
(window.__ansanShown||Promise.resolve()).then(start);
setTimeout(start,2500); /* safety net */
window.__ansanReveal=scope=>{start();setup(scope,true);
  /* safety net for swapped-in content: whatever is already on screen shows even if the
     observer is slow to report (it pauses while the tab is in the background) */
  setTimeout(()=>{const vh=innerHeight;$$('.rv-item:not(.is-in), .rv-img:not(.is-in), h2[data-split]:not(.is-in)',scope)
    .forEach(el=>{const r=el.getBoundingClientRect();if(r.top<vh*.92&&r.bottom>-vh){el.classList.add('is-in');io&&io.unobserve(el);}});},120);};
})();

/* =====================================================================
   Sub-tabs (the section bar under the hero): switching between pages of the same section
   keeps the header and the tab bar in place and swaps only what is below it —
   no page-transition curtain. The URL, title and history still change, so every tab
   keeps its own address and Back/Forward work; any failure falls back to a normal load.
   ===================================================================== */
(()=>{
const bar=document.querySelector('main .subnav');
if(!bar||!window.fetch||!window.DOMParser||!history.pushState) return;
const main=bar.parentElement;
const path=h=>new URL(h,location.href).pathname;
const inGroup=a=>a&&!a.classList.contains('go')&&a.closest('.subnav')===bar&&new URL(a.href,location.href).origin===location.origin;
const cache=new Map();
const get=url=>{const k=path(url);if(!cache.has(k))cache.set(k,fetch(url,{credentials:'same-origin'}).then(r=>{if(!r.ok)throw new Error(r.status);return r.text();}));return cache.get(k);};
/* warm the cache when a tab is hovered or touched */
['pointerover','touchstart','focusin'].forEach(ev=>bar.addEventListener(ev,e=>{const a=e.target.closest('a');if(inGroup(a))get(a.href).catch(()=>{});},{passive:true}));

let busy=false;
async function swap(url,push){
  if(busy)return; busy=true;
  let doc;
  try{doc=new DOMParser().parseFromString(await get(url),'text/html');}catch(err){location.href=url;return;}
  const nmain=doc.querySelector('main'), nbar=nmain&&nmain.querySelector(':scope > .subnav');
  if(!nbar){location.href=url;return;}
  const offset=bar.getBoundingClientRect().top;
  /* head: title, description, share tags, this page's own styles */
  document.title=doc.title;
  ['meta[name="description"]','meta[property="og:title"]','meta[property="og:description"]','meta[property="og:image"]'].forEach(s=>{
    const a=document.head.querySelector(s),b=doc.head.querySelector(s);if(a&&b)a.setAttribute('content',b.getAttribute('content'));});
  const st=document.head.querySelector('style'),nst=doc.head.querySelector('style');if(st&&nst)st.textContent=nst.textContent;
  /* everything above the bar (the hero) is replaced as it stands — no intro animation */
  while(main.firstElementChild&&main.firstElementChild!==bar) main.firstElementChild.remove();
  for(const n of [...nmain.children]){if(n===nbar)break;const m=document.importNode(n,true);m.classList.add('swap-static');main.insertBefore(m,bar);}
  /* the bar keeps its place; only which tab is current changes */
  const sl=bar.scrollLeft;
  bar.innerHTML=nbar.innerHTML;
  /* phones: the bar scrolls sideways — keep the chosen tab in view */
  const cur=bar.querySelector('[aria-current]');bar.scrollLeft=sl;
  if(cur&&(cur.offsetLeft<bar.scrollLeft||cur.offsetLeft+cur.offsetWidth>bar.scrollLeft+bar.clientWidth)) bar.scrollLeft=Math.max(0,cur.offsetLeft-24);
  /* everything below the bar is the new page */
  while(bar.nextSibling) bar.nextSibling.remove();
  let after=false;
  for(const n of [...nmain.childNodes]){if(n===nbar){after=true;continue;}if(after)main.appendChild(document.importNode(n,true));}
  if(push) history.pushState({ansanTab:1},'',url);
  /* keep the bar where it was on screen; if it had scrolled away, bring it to the top */
  const html=document.documentElement,sb=html.style.scrollBehavior;html.style.scrollBehavior='auto';
  scrollTo(0,bar.getBoundingClientRect().top+scrollY-Math.max(0,offset));
  html.style.scrollBehavior=sb;
  /* this page's own scripts (forms on the new content) */
  [...doc.body.querySelectorAll('script:not([src])')].forEach(o=>{const s=document.createElement('script');s.textContent=o.textContent;document.body.appendChild(s);s.remove();});
  if(window.__ansanReveal) window.__ansanReveal(main);
  busy=false;
}
document.addEventListener('click',e=>{
  const a=e.target.closest('a');
  if(!inGroup(a)||e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||a.target) return;
  e.preventDefault();
  if(path(a.href)===location.pathname) return;
  swap(a.href,true);
});
history.replaceState(Object.assign({},history.state,{ansanTab:1}),'');
addEventListener('popstate',e=>{if(e.state&&e.state.ansanTab) swap(location.href,false);});
})();

/* "Đang phát triển" links: a tap shows the tooltip for a moment (touch screens have no hover) */
document.addEventListener('click',e=>{const d=e.target.closest('.dev');if(!d)return;e.preventDefault();
  d.classList.add('tip-on');clearTimeout(d._t);d._t=setTimeout(()=>d.classList.remove('tip-on'),1800);});
