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

/* Tab con dưới hero: bấm là tải trang bình thường (đã bỏ kiểu đổi nội dung tại chỗ, 23/11) */

/* "Đang phát triển" links: a tap shows the tooltip for a moment (touch screens have no hover) */
document.addEventListener('click',e=>{const d=e.target.closest('.dev');if(!d)return;e.preventDefault();
  d.classList.add('tip-on');clearTimeout(d._t);d._t=setTimeout(()=>d.classList.remove('tip-on'),1800);});
