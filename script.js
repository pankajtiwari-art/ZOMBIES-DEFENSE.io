<script>
// ═══════════════════════════════════════════════════════════════
//  ZOMBIES DEFENSE.IO  —  Complete Game Engine
// ═══════════════════════════════════════════════════════════════

const canvas = document.getElementById('gc');
const ctx    = canvas.getContext('2d');
const mm     = document.getElementById('minimap');
const mctx   = mm.getContext('2d');

let W = window.innerWidth, H = window.innerHeight;
canvas.width = W; canvas.height = H;

window.addEventListener('resize', () => {
  W = window.innerWidth; H = window.innerHeight;
  canvas.width = W; canvas.height = H;
});

// ── ROUND RECT POLYFILL ──────────────────────────────────────
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x,y,w,h,r){
    r = Math.min(r, w/2, h/2);
    this.beginPath();
    this.moveTo(x+r,y); this.lineTo(x+w-r,y);
    this.quadraticCurveTo(x+w,y,x+w,y+r);
    this.lineTo(x+w,y+h-r);
    this.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    this.lineTo(x+r,y+h);
    this.quadraticCurveTo(x,y+h,x,y+h-r);
    this.lineTo(x,y+r);
    this.quadraticCurveTo(x,y,x+r,y);
    this.closePath();
  };
}

// ── MENU BACKGROUND ─────────────────────────────────────────
(function buildMenuBg(){
  const bg = document.getElementById('menuBg');
  for (let i=0;i<120;i++){
    const s=document.createElement('div');
    s.className='star';
    s.style.cssText=`left:${Math.random()*100}%;top:${Math.random()*100}%;
    width:${1+Math.random()*3}px;height:${1+Math.random()*3}px;
    --d:${1.5+Math.random()*3}s;animation-delay:${Math.random()*3}s`;
    bg.appendChild(s);
  }
  for (let i=0;i<6;i++){
    const o=document.createElement('div');
    o.className='floatOrb';
    const sz=100+Math.random()*300;
    o.style.cssText=`left:${Math.random()*100}%;top:${Math.random()*100}%;
    width:${sz}px;height:${sz}px;opacity:${.05+Math.random()*.1};
    --d:${4+Math.random()*6}s;--tx:${(Math.random()-.5)*80}px;--ty:${(Math.random()-.5)*80}px;
    animation-delay:${Math.random()*4}s`;
    bg.appendChild(o);
  }
})();

// ── AUDIO ────────────────────────────────────────────────────
let AC = null,
  masterGain = null;

function initAudio() {
  if (AC) return;
  AC = new(window.AudioContext || window.webkitAudioContext)();
  masterGain = AC.createGain();
  
  // Game start hone par check karega ki sound ON hai ya OFF 👇
  masterGain.gain.value = gameSettings.sound ? 0.35 : 0;
  
  masterGain.connect(AC.destination);
  startAmbient();
}

function tone(freq,dur,type='sine',vol=0.25,dt=0){
  if(!AC)return;
  const o=AC.createOscillator(),g=AC.createGain();
  o.type=type; o.frequency.value=freq; o.detune.value=dt;
  g.gain.setValueAtTime(vol,AC.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001,AC.currentTime+dur);
  o.connect(g); g.connect(masterGain);
  o.start(); o.stop(AC.currentTime+dur);
}

function noise(dur,vol=0.15,fc=2000,q=0.8){
  if(!AC)return;
  const n=AC.sampleRate*dur;
  const buf=AC.createBuffer(1,n,AC.sampleRate);
  const d=buf.getChannelData(0);
  for(let i=0;i<n;i++) d[i]=Math.random()*2-1;
  const src=AC.createBufferSource(); src.buffer=buf;
  const filt=AC.createBiquadFilter(); filt.type='bandpass';
  filt.frequency.value=fc; filt.Q.value=q;
  const g=AC.createGain(); g.gain.setValueAtTime(vol,AC.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001,AC.currentTime+dur);
  src.connect(filt); filt.connect(g); g.connect(masterGain);
  src.start(); src.stop(AC.currentTime+dur);
}

function sndShoot(){
  if(!AC)return;
  // Sharp crack + bark
  const t=AC.currentTime;
  // Click transient
  const osc=AC.createOscillator(), og=AC.createGain();
  osc.type='square'; osc.frequency.setValueAtTime(220,t); osc.frequency.exponentialRampToValueAtTime(55,t+.04);
  og.gain.setValueAtTime(.35,t); og.gain.exponentialRampToValueAtTime(.001,t+.06);
  osc.connect(og); og.connect(masterGain); osc.start(t); osc.stop(t+.07);
  // Noise burst (the bang)
  const n=AC.sampleRate*.12, buf=AC.createBuffer(1,n,AC.sampleRate), d=buf.getChannelData(0);
  for(let i=0;i<n;i++) d[i]=(Math.random()*2-1)*(1-i/n);
  const src=AC.createBufferSource(); src.buffer=buf;
  const hp=AC.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=1800;
  const lp=AC.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=8000;
  const ng=AC.createGain(); ng.gain.setValueAtTime(.55,t); ng.gain.exponentialRampToValueAtTime(.001,t+.12);
  src.connect(hp); hp.connect(lp); lp.connect(ng); ng.connect(masterGain);
  src.start(t); src.stop(t+.13);
  // Low body thud
  const b=AC.createOscillator(), bg=AC.createGain();
  b.type='sine'; b.frequency.setValueAtTime(120,t); b.frequency.exponentialRampToValueAtTime(40,t+.08);
  bg.gain.setValueAtTime(.28,t); bg.gain.exponentialRampToValueAtTime(.001,t+.09);
  b.connect(bg); bg.connect(masterGain); b.start(t); b.stop(t+.1);
}

function sndZombieDeath(){
  if(!AC)return;
  const t=AC.currentTime;
  // Wet gurgling groan
  const o=AC.createOscillator(), og=AC.createGain();
  o.type='sawtooth'; o.frequency.setValueAtTime(180,t); o.frequency.exponentialRampToValueAtTime(55,t+.5);
  og.gain.setValueAtTime(.22,t); og.gain.exponentialRampToValueAtTime(.001,t+.55);
  const wf=AC.createBiquadFilter(); wf.type='bandpass'; wf.frequency.setValueAtTime(600,t);
  wf.frequency.exponentialRampToValueAtTime(200,t+.5); wf.Q.value=3;
  o.connect(wf); wf.connect(og); og.connect(masterGain); o.start(t); o.stop(t+.6);
  // Flesh splat noise
  const n=AC.sampleRate*.18, buf=AC.createBuffer(1,n,AC.sampleRate), d=buf.getChannelData(0);
  for(let i=0;i<n;i++) d[i]=(Math.random()*2-1)*(1-i/n)*.7;
  const src=AC.createBufferSource(); src.buffer=buf;
  const f=AC.createBiquadFilter(); f.type='lowpass'; f.frequency.value=700;
  const g=AC.createGain(); g.gain.setValueAtTime(.25,t); g.gain.exponentialRampToValueAtTime(.001,t+.2);
  src.connect(f); f.connect(g); g.connect(masterGain); src.start(t); src.stop(t+.2);
}

function sndHit(){
  if(!AC)return;
  const t=AC.currentTime;
  // Heavy thud
  const o=AC.createOscillator(), og=AC.createGain();
  o.type='sine'; o.frequency.setValueAtTime(100,t); o.frequency.exponentialRampToValueAtTime(38,t+.15);
  og.gain.setValueAtTime(.45,t); og.gain.exponentialRampToValueAtTime(.001,t+.18);
  o.connect(og); og.connect(masterGain); o.start(t); o.stop(t+.2);
  // Grunt noise
  const n=AC.sampleRate*.1, buf=AC.createBuffer(1,n,AC.sampleRate), d=buf.getChannelData(0);
  for(let i=0;i<n;i++) d[i]=(Math.random()*2-1)*(1-i/n);
  const src=AC.createBufferSource(); src.buffer=buf;
  const f=AC.createBiquadFilter(); f.type='bandpass'; f.frequency.value=400; f.Q.value=2;
  const g=AC.createGain(); g.gain.setValueAtTime(.28,t); g.gain.exponentialRampToValueAtTime(.001,t+.1);
  src.connect(f); f.connect(g); g.connect(masterGain); src.start(t); src.stop(t+.12);
}

function sndPickup(){
  if(!AC)return;
  const t=AC.currentTime;
  [660,880,1100].forEach((f,i)=>{
    const o=AC.createOscillator(),g=AC.createGain();
    o.type='sine'; o.frequency.value=f;
    g.gain.setValueAtTime(.14,t+i*.04); g.gain.exponentialRampToValueAtTime(.001,t+i*.04+.12);
    o.connect(g); g.connect(masterGain); o.start(t+i*.04); o.stop(t+i*.04+.14);
  });
}

function sndLevelUp(){
  if(!AC)return;
  const t=AC.currentTime;
  [392,523,659,784,1047].forEach((f,i)=>{
    const o=AC.createOscillator(),g=AC.createGain();
    o.type='triangle'; o.frequency.value=f;
    g.gain.setValueAtTime(.22,t+i*.08); g.gain.exponentialRampToValueAtTime(.001,t+i*.08+.3);
    o.connect(g); g.connect(masterGain); o.start(t+i*.08); o.stop(t+i*.08+.35);
  });
  // Shimmer
  const n=AC.sampleRate*.5, buf=AC.createBuffer(1,n,AC.sampleRate), d=buf.getChannelData(0);
  for(let i=0;i<n;i++) d[i]=(Math.random()*2-1)*(1-i/n)*.3;
  const src=AC.createBufferSource(); src.buffer=buf;
  const f=AC.createBiquadFilter(); f.type='highpass'; f.frequency.value=5000;
  const g=AC.createGain(); g.gain.value=.12; src.connect(f); f.connect(g); g.connect(masterGain);
  src.start(t); src.stop(t+.5);
}

function sndWave(){
  if(!AC)return;
  const t=AC.currentTime;
  // Dramatic impact
  const o=AC.createOscillator(),og=AC.createGain();
  o.type='sawtooth'; o.frequency.setValueAtTime(60,t); o.frequency.exponentialRampToValueAtTime(25,t+.6);
  og.gain.setValueAtTime(.35,t); og.gain.exponentialRampToValueAtTime(.001,t+.65);
  o.connect(og); og.connect(masterGain); o.start(t); o.stop(t+.7);
  [200,267,320].forEach((f,i)=>setTimeout(()=>{
    if(!AC)return;
    const o2=AC.createOscillator(),g2=AC.createGain();
    o2.type='square'; o2.frequency.value=f;
    g2.gain.setValueAtTime(.18,AC.currentTime); g2.gain.exponentialRampToValueAtTime(.001,AC.currentTime+.4);
    o2.connect(g2); g2.connect(masterGain); o2.start(); o2.stop(AC.currentTime+.45);
  },i*200));
}

function sndExplosion(){
  if(!AC)return;
  const t=AC.currentTime;
  const n=AC.sampleRate*.6, buf=AC.createBuffer(1,n,AC.sampleRate), d=buf.getChannelData(0);
  for(let i=0;i<n;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/n,0.4);
  const src=AC.createBufferSource(); src.buffer=buf;
  const lp=AC.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=600;
  const g=AC.createGain(); g.gain.setValueAtTime(.55,t); g.gain.exponentialRampToValueAtTime(.001,t+.6);
  src.connect(lp); lp.connect(g); g.connect(masterGain); src.start(t); src.stop(t+.65);
  const o=AC.createOscillator(),og=AC.createGain();
  o.type='sine'; o.frequency.setValueAtTime(80,t); o.frequency.exponentialRampToValueAtTime(28,t+.4);
  og.gain.setValueAtTime(.4,t); og.gain.exponentialRampToValueAtTime(.001,t+.45);
  o.connect(og); og.connect(masterGain); o.start(t); o.stop(t+.5);
}

function startAmbient(){
  if(!AC)return;
  [[55,.04],[82.4,.025],[27.5,.035],[110,.015]].forEach(([f,v])=>{
    const o=AC.createOscillator(),g=AC.createGain();
    o.type='sine'; o.frequency.value=f; g.gain.value=v;
    o.connect(g); g.connect(masterGain); o.start();
  });
}

// ── CONSTANTS ───────────────────────────────────────────────
const MAP_W=2800, MAP_H=1900, TILE=80;
const STATE={MENU:0,PLAYING:1,UPGRADE:2,OVER:3};

// ── GAME VARIABLES ──────────────────────────────────────────
let gameState = STATE.MENU;
let running = false;
let lastTs = 0;

// --- SETTINGS AUR MOUSE/TOUCH CONTROL ---
const gameSettings = {
  sound: true,
  autoAim: true,
  autoShoot: true,
  difficulty: 3 // Default level (Medium 1)
};

const mouse = { x: 0, y: 0, down: false };

// PC Mouse Controls
window.addEventListener('mousemove', e => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});
window.addEventListener('mousedown', () => mouse.down = true);
window.addEventListener('mouseup', () => mouse.down = false);

// Mobile Touch Controls (Mobile par fire karne ke liye)
window.addEventListener('touchstart', () => mouse.down = true, { passive: true });
window.addEventListener('touchend', () => mouse.down = false, { passive: true });
window.addEventListener('touchcancel', () => mouse.down = false, { passive: true });

const keys = {};
window.addEventListener('keydown', e => {
  keys[e.key.toLowerCase()]=true;
  if(['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d',' '].includes(e.key.toLowerCase()))
    e.preventDefault();
});
window.addEventListener('keyup',e=>{ keys[e.key.toLowerCase()]=false; });

// ── JOYSTICK ─────────────────────────────────────────────────
const joy={dx:0,dy:0,active:false};
(function initJoystick(){
  const zone  = document.getElementById('joystickZone');
  const base  = document.getElementById('joystickBase');
  const knob  = document.getElementById('joystickKnob');
  const RADIUS = 42; // max knob travel from center
  let tid=-1, cx=0, cy=0;

  function getBaseCenter(){
    const r=base.getBoundingClientRect();
    return {x:r.left+r.width/2, y:r.top+r.height/2};
  }

  function setKnob(nx,ny){
    // nx,ny relative to base center
    const dist=Math.hypot(nx,ny);
    const clamp=Math.min(dist,RADIUS);
    const ang=Math.atan2(ny,nx);
    const kx=Math.cos(ang)*clamp, ky=Math.sin(ang)*clamp;
    const hw=base.offsetWidth/2, hh=base.offsetHeight/2;
    knob.style.left=(hw+kx)+'px';
    knob.style.top =(hh+ky)+'px';
    joy.dx=dist>8?Math.cos(ang)*Math.min(1,dist/RADIUS):0;
    joy.dy=dist>8?Math.sin(ang)*Math.min(1,dist/RADIUS):0;
  }

  function reset(){
    const hw=base.offsetWidth/2, hh=base.offsetHeight/2;
    knob.style.left=hw+'px'; knob.style.top=hh+'px';
    knob.classList.remove('active');
    joy.dx=0; joy.dy=0; joy.active=false; tid=-1;
  }

  // position knob at center on load
  window.addEventListener('load',()=>reset());
  setTimeout(()=>reset(),100);

  zone.addEventListener('touchstart',e=>{
    e.preventDefault();
    initAudio();
    const t=e.changedTouches[0]; tid=t.identifier; joy.active=true;
    const bc=getBaseCenter();
    cx=bc.x; cy=bc.y;
    setKnob(t.clientX-cx, t.clientY-cy);
    knob.classList.add('active');
  },{passive:false});

  zone.addEventListener('touchmove',e=>{
    e.preventDefault();
    for(const t of e.changedTouches){
      if(t.identifier===tid){ setKnob(t.clientX-cx, t.clientY-cy); break; }
    }
  },{passive:false});

  zone.addEventListener('touchend',e=>{
    for(const t of e.changedTouches){ if(t.identifier===tid){ reset(); break; } }
  });
  zone.addEventListener('touchcancel',()=>reset());

  // Also support mouse drag for desktop testing
  let mdown=false;
  zone.addEventListener('mousedown',e=>{
    mdown=true; joy.active=true; knob.classList.add('active');
    const bc=getBaseCenter(); cx=bc.x; cy=bc.y;
    setKnob(e.clientX-cx, e.clientY-cy);
  });
  window.addEventListener('mousemove',e=>{
    if(!mdown) return;
    setKnob(e.clientX-cx, e.clientY-cy);
  });
  window.addEventListener('mouseup',()=>{ if(mdown){ mdown=false; reset(); } });
})();

const cam={x:0,y:0,tx:0,ty:0,shake:0};

// ── ENTITIES ────────────────────────────────────────────────
let player,bullets=[],zombies=[],xpOrbs=[],particles=[];

// ── MAP DECORATIONS ──────────────────────────────────────────
const deco=[];
function buildMap(){
  deco.length=0;
  const rng=(min,max)=>min+Math.random()*(max-min);
  // Gravestones
  for(let i=0;i<55;i++) deco.push({t:'grave',x:rng(60,MAP_W-60),y:rng(60,MAP_H-60),ang:rng(-.3,.3),sz:rng(.8,1.4)});
  // Dead trees
  for(let i=0;i<30;i++) deco.push({t:'tree',x:rng(60,MAP_W-60),y:rng(60,MAP_H-60),sz:rng(.7,1.3),br:3+Math.floor(rng(0,5)),seed:Math.random()});
  // Blood pools
  for(let i=0;i<25;i++) deco.push({t:'pool',x:rng(60,MAP_W-60),y:rng(60,MAP_H-60),rx:rng(18,50),ry:rng(10,28),rot:rng(0,Math.PI)});
  // Rocks
  for(let i=0;i<20;i++) deco.push({t:'rock',x:rng(60,MAP_W-60),y:rng(60,MAP_H-60),sz:rng(.5,1.2),seed:Math.random()});
  // Fog seeds
  for(let i=0;i<8;i++) deco.push({t:'fog',x:rng(200,MAP_W-200),y:rng(200,MAP_H-200),r:rng(150,350),spd:rng(.5,1.5),phase:rng(0,Math.PI*2)});
}

// ── PARTICLES ────────────────────────────────────────────────
class Particle{
  constructor(x,y,vx,vy,col,sz,life,grav=0){
    this.x=x;this.y=y;this.vx=vx;this.vy=vy;
    this.col=col;this.sz=sz;this.life=this.maxLife=life;this.grav=grav;
  }
  update(dt){
    this.x+=this.vx*dt*60; this.vy+=this.grav*dt; this.y+=this.vy*dt*60; this.life-=dt;
    return this.life>0;
  }
  draw(){
    const a=Math.max(0,this.life/this.maxLife);
    ctx.save(); ctx.globalAlpha=a; ctx.fillStyle=this.col;
    ctx.beginPath(); ctx.arc(this.x-cam.x,this.y-cam.y,this.sz*a,0,Math.PI*2); ctx.fill(); ctx.restore();
  }
}

function spawnBlood(x,y,n=10){
  for(let i=0;i<n;i++){
    const a=Math.random()*Math.PI*2,sp=.5+Math.random()*4;
    particles.push(new Particle(x,y,Math.cos(a)*sp,Math.sin(a)*sp,
      `hsl(${Math.random()*20},85%,${18+Math.random()*18}%`,2+Math.random()*4,.6+Math.random()*.5,.4));
  }
}
function spawnXPSpark(x,y,n=6){
  for(let i=0;i<n;i++){
    const a=Math.random()*Math.PI*2,sp=.5+Math.random()*2.5;
    particles.push(new Particle(x,y,Math.cos(a)*sp,Math.sin(a)*sp,
      `hsl(${270+Math.random()*50},100%,${60+Math.random()*20}%`,1+Math.random()*2.5,.4+Math.random()*.4));
  }
}
function spawnMuzzle(x,y,ang){
  for(let i=0;i<5;i++){
    const a=ang+(Math.random()-.5)*.5,sp=3+Math.random()*5;
    particles.push(new Particle(x,y,Math.cos(a)*sp,Math.sin(a)*sp,
      Math.random()>.5?'#fbbf24':'#f97316',2+Math.random()*3,.12));
  }
}
function spawnHit(x,y){
  for(let i=0;i<6;i++){
    const a=Math.random()*Math.PI*2,sp=2+Math.random()*4;
    particles.push(new Particle(x,y,Math.cos(a)*sp,Math.sin(a)*sp,'#fef08a',1.5+Math.random()*2,.2));
  }
}
function spawnExplosion(x,y){
  for(let i=0;i<30;i++){
    const a=Math.random()*Math.PI*2,sp=1+Math.random()*6;
    particles.push(new Particle(x,y,Math.cos(a)*sp,Math.sin(a)*sp,
      [`#f97316`,`#fbbf24`,`#ef4444`,`#fde047`][Math.floor(Math.random()*4)],2+Math.random()*5,.5+Math.random()*.5));
  }
}
function spawnLevelOrbs(x,y){
  for(let i=0;i<20;i++){
    const ang=Math.random()*Math.PI*2,sp=1+Math.random()*5;
    particles.push(new Particle(x,y,Math.cos(ang)*sp,Math.sin(ang)*sp,
      `hsl(${270+Math.random()*60},100%,70%`,2+Math.random()*4,.7+Math.random()*.5));
  }
}
// ── DAMAGE TEXT ──────────────────────────────────────────────
class DmgText {
  constructor(x, y, dmg, isCrit) {
    this.x = x + (Math.random() - 0.5) * 20; 
    this.y = y - 20;
    this.dmg = Math.floor(dmg);
    this.life = 0.7; // Visible for 0.7 seconds
    this.vy = -40; // Visible for 0.7 seconds ki taraf jayega
    this.col = isCrit ? '#facc15' : '#fff'; // Bada damage yellow, normal white
    this.sz = isCrit ? 22 : 16;
  }
  update(dt) {
    this.y += this.vy * dt; 
    this.life -= dt; 
    return this.life > 0;
  }
  draw() {
    const a = Math.max(0, this.life / 0.7);
    ctx.save(); 
    ctx.globalAlpha = a; 
    ctx.fillStyle = this.col;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.font = `bold ${this.sz}px 'Oswald', sans-serif`; 
    ctx.textAlign = 'center';
    ctx.strokeText(this.dmg, this.x - cam.x, this.y - cam.y);
    ctx.fillText(this.dmg, this.x - cam.x, this.y - cam.y);
    ctx.restore();
  }
}
let dmgTexts = [];

// ── LOOT DROP SYSTEM ──────────────────────────────────────────
const LOOT_DEFS = [
  {id: 'haste', name: '⚡ HASTE', col: '#4ade80', dur: 8, rar: 'common'},
  {id: 'power', name: '💥 2X DAMAGE', col: '#f87171', dur: 8, rar: 'common'},
  {id: 'shield', name: '🛡️ SHIELD', col: '#60a5fa', dur: 6, rar: 'common'},
  {id: 'vacuum', name: '🧲 VACUUM', col: '#c084fc', dur: 10, rar: 'common'},
  {id: '8_way', name: '🎯 8-WAY FIRE', col: '#3b82f6', dur: 6, rar: 'rare'},
  {id: 'gatling', name: '🔫 GATLING', col: '#eab308', dur: 5, rar: 'rare'},
  {id: 'freeze', name: '❄️ FREEZE', col: '#38bdf8', dur: 6, rar: 'rare'},
  {id: 'nuke_aura', name: '💀 DEATH AURA', col: '#a855f7', dur: 5, rar: 'epic'}
];

let lootDrops = [];

class LootDrop {
  constructor(x, y) {
    this.x = x; this.y = y; this.age = 0;
    // Rarity decide karna
    let r = Math.random();
    let pool = [];
    if (r < 0.10) pool = LOOT_DEFS.filter(l => l.rar === 'epic'); // 10% Epic
    else if (r < 0.40) pool = LOOT_DEFS.filter(l => l.rar === 'rare'); // 30% Rare
    else pool = LOOT_DEFS.filter(l => l.rar === 'common'); // 60% Common
    
    this.def = pool[Math.floor(Math.random() * pool.length)];
    this.done = false;
  }
  update(dt, p) {
    this.age += dt;
    // Player se collision check (Pickup)
    if (Math.hypot(p.x - this.x, p.y - this.y) < 35) {
      p.buffs[this.def.id] = this.def.dur; // Player ko effect dena
      showKillPop(this.x - cam.x, this.y - cam.y - 40, this.def.name); // Text pop-up
      this.done = true;
    }
  }
  draw() {
    const bx = this.x - cam.x, by = this.y - cam.y + Math.sin(this.age * 5) * 5;
    ctx.save();
    ctx.shadowColor = this.def.col; ctx.shadowBlur = 15;
    ctx.fillStyle = this.def.col;
    ctx.beginPath(); ctx.rect(bx - 10, by - 10, 20, 20); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    ctx.strokeRect(bx - 10, by - 10, 20, 20);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center';
    ctx.fillText('?', bx, by + 5);
    ctx.restore();
  }
}

// ── XP ORB ───────────────────────────────────────────────────
class XPOrb {
  constructor(x,y,v){
    this.x=x; this.y=y; this.v=v; this.sz=5+v*.4; this.done=false;
    this.bob=Math.random()*Math.PI*2; this.age=0;
  }
  update(dt,p){
    this.age+=dt;
    const dx=p.x-this.x, dy=p.y-this.y, dist=Math.hypot(dx,dy);
    
    // NAYA: Agar Vacuum buff on hai toh range badh jayegi
    const currentRange = p.buffs.vacuum ? 450 : p.xpRange; 

    if(dist < currentRange){
      const spd=(6*(1-dist/currentRange)+2)*dt*60;
      const a=Math.atan2(dy,dx);
      this.x+=Math.cos(a)*spd; this.y+=Math.sin(a)*spd;
    }
    if(dist<22){
      this.done=true; p.gainXP(this.v);
      spawnXPSpark(this.x,this.y,4); sndPickup();
    }
  }
  draw(){
    const bx=this.x-cam.x, by=this.y-cam.y+Math.sin(this.age*3+this.bob)*3;
    ctx.save();
    const g=ctx.createRadialGradient(bx,by,0,bx,by,this.sz*2.8);
    g.addColorStop(0,'rgba(168,85,247,.9)'); g.addColorStop(1,'rgba(168,85,247,0)');
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(bx,by,this.sz*2.8,0,Math.PI*2); ctx.fill();
    ctx.shadowColor='#a855f7'; ctx.shadowBlur=12;
    ctx.fillStyle='#c084fc'; ctx.beginPath(); ctx.arc(bx,by,this.sz,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0;
    ctx.fillStyle='rgba(255,255,255,.65)';
    ctx.beginPath(); ctx.arc(bx-this.sz*.3,by-this.sz*.3,this.sz*.3,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }
}

// ── BULLET (FIXED) ───────────────────────────────────────────
class Bullet{
  constructor(x,y,ang,dmg, p){
    this.x=x; this.y=y; this.ang=ang; this.p=p;
    
    // Speed set karna
    this.vx=Math.cos(ang)*10.5; this.vy=Math.sin(ang)*10.5;
    
    // Stats set karna (Safe default values ke sath)
    this.pierce = p.pierce || false; 
    this.expl = p.expl || false; 
    this.scale = p.bScale || 1; // Agar bScale undefined hua toh 1 lega
    this.bounce = p.bounce || 0; 
    
    this.dead=false; this.trail=[]; this.age=0;
    
    // Critical Hit check (Agar critCh undefined hai toh 0 lega)
    this.isCrit = Math.random() < (p.critCh || 0);
    this.dmg = this.isCrit ? dmg * 3 : dmg; 
    if(this.isCrit) this.scale *= 1.3;
  }

  update(dt){
    this.trail.push({x:this.x,y:this.y});
    if(this.trail.length>7) this.trail.shift();
    this.x+=this.vx*dt*60; this.y+=this.vy*dt*60; this.age+=dt;

    // Ricochet (Bounce) Logic
    if(this.x < 0 || this.x > MAP_W) {
      if(this.bounce > 0) { this.vx *= -1; this.bounce--; this.ang = Math.atan2(this.vy, this.vx); }
      else this.dead = true;
    }
    if(this.y < 0 || this.y > MAP_H) {
      if(this.bounce > 0) { this.vy *= -1; this.bounce--; this.ang = Math.atan2(this.vy, this.vx); }
      else this.dead = true;
    }
  }

  draw(){
    const sx=this.x-cam.x,sy=this.y-cam.y;
    // Agar coordinates screen ke bahar bahut zyada hain toh draw mat karo (Crash prevention)
    if (isNaN(sx) || isNaN(sy)) return;

    ctx.save();
    for(let i=0; i<this.trail.length; i++){
      const a=(i/this.trail.length)*.5;
      const trailSz = (this.scale || 1) * (3 * (i/this.trail.length));
      ctx.globalAlpha=a; 
      ctx.fillStyle = this.expl ? '#f97316' : (this.isCrit ? '#ef4444' : '#fbbf24');
      ctx.beginPath(); 
      ctx.arc(this.trail[i].x-cam.x, this.trail[i].y-cam.y, trailSz, 0, Math.PI*2); 
      ctx.fill();
    }
    
    ctx.globalAlpha=1;
    ctx.translate(sx,sy); ctx.rotate(this.ang);
    
    const s = this.scale || 1; // Graduation calculation ke liye safe scale
    if(this.expl){
      ctx.shadowColor='#f97316'; ctx.shadowBlur=18;
      const g=ctx.createRadialGradient(0,0,0,0,0,8*s);
      g.addColorStop(0,'#fff'); g.addColorStop(.3,'#fbbf24'); g.addColorStop(1,'#f97316');
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(0,0,7*s,0,Math.PI*2); ctx.fill();
    } else {
      ctx.shadowColor = this.isCrit ? '#ef4444' : '#fde68a'; ctx.shadowBlur=10;
      // Gradient crash fix: Provided values must be finite
      const gradStart = -14*s;
      const gradEnd = 8*s;
      const g=ctx.createLinearGradient(gradStart, 0, gradEnd, 0);
      g.addColorStop(0, this.isCrit ? 'rgba(239,68,68,0)' : 'rgba(251,191,36,0)'); 
      g.addColorStop(1, this.isCrit ? '#dc2626' : '#fbbf24');
      ctx.fillStyle=g;
      ctx.beginPath(); ctx.ellipse(0,0,12*s,3.5*s,0,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur=6; ctx.fillStyle='#fffbeb';
      ctx.beginPath(); ctx.arc(7*s,0,3.5*s,0,Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }
}

// ── ENEMY BULLET (SPITTER KE LIYE) ───────────────────────────
let enemyBullets = []; // Is array mein Spitter ki bullets rahengi

class EnemyBullet {
  constructor(x, y, ang, dmg) {
    this.x = x; this.y = y; this.ang = ang; this.dmg = dmg;
    this.vx = Math.cos(ang) * 180; this.vy = Math.sin(ang) * 180;
    this.dead = false;
  }
  update(dt, p) {
    this.x += this.vx * dt; this.y += this.vy * dt;
    if (Math.hypot(p.x - this.x, p.y - this.y) < 20) { 
      p.hurt(this.dmg); this.dead = true; 
    }
    if (this.x < -100 || this.x > MAP_W + 100 || this.y < -100 || this.y > MAP_H + 100) this.dead = true;
  }
  draw() {
    ctx.fillStyle = '#84cc16'; // Acid green color
    ctx.shadowColor = '#65a30d'; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(this.x - cam.x, this.y - cam.y, 7, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
  }
}
 
// ── ZOMBIE DEFINITIONS ───────────────────────────────────────
const ZDEFS=[
  {name:'Walker', c:'#3a6a3a',sc:'#7a9a5a',spd:55, hp:50, dmg:10,xp:10,sz:19,score:10},
  {name:'Runner', c:'#7a3530',sc:'#a06050',spd:135,hp:28, dmg:8, xp:15,sz:14,score:15},
  {name:'Tank',   c:'#234523',sc:'#4a6a40',spd:32, hp:200,dmg:25,xp:50,sz:32,score:45},
  {name:'Spitter',c:'#5a7020',sc:'#8a9a40',spd:70, hp:40, dmg:12,xp:20,sz:16,score:20},
  {name:'Screamer',c:'#6a2a6a',sc:'#9a5080',spd:85,hp:65, dmg:18,xp:28,sz:20,score:28},
  {name:'Phantom',c:'#4c1d95',sc:'#2e1065',spd:175,hp:35, dmg:15,xp:30,sz:15,score:25} // NAYA MOB (Ghost)
];

class Zombie {
  constructor(x, y, ti, waveMult = 1) {
    Object.assign(this, ZDEFS[ti % ZDEFS.length]);
    this.x = x; this.y = y; 
    
    // Difficulty ke hisab se HP aur Speed Boost
    const diff = gameSettings.difficulty || 3;
    let hpMult = 1; let spdMult = 1;
    if(diff >= 4) spdMult += 0.10; 
    if(diff >= 5) { hpMult += 0.20; spdMult += 0.05; } 
    if(diff >= 6) { hpMult += 0.35; spdMult += 0.10; } 
    if(diff >= 7) { hpMult += 0.60; spdMult += 0.20; } 

    this.maxHp = Math.ceil(this.hp * waveMult * hpMult); 
    this.hp = this.maxHp;
    const speedBoost = 1 + (waveMult - 1) * 0.15; 
    this.spd = Math.min(this.spd * speedBoost * spdMult, 260); 

    this.dead = false; this.dying = false; this.ang = 0; this.ti = ti;
    this.hitFlash = 0; this.deathT = 0;
    this.leg = Math.random() * Math.PI * 2; this.armAng = 0; this.wobble = Math.random() * Math.PI * 2;
    this.atkCD = 0; this.age = 0;
    
    // NAYA: Frost aur Poison ke timers
    this.chillT = 0; 
    this.poisonT = 0; 
  }

    update(dt, p) {
    if (this.dying) { this.deathT += dt; if (this.deathT > .5) this.dead = true; return; }
    this.age += dt; this.leg += dt * (this.spd / 55) * 4;
    const dx = p.x - this.x, dy = p.y - this.y, dist = Math.hypot(dx, dy);
    this.ang = Math.atan2(dy, dx);

    let currentZSpd = p.buffs.freeze ? this.spd * 0.15 : this.spd;
    
    if(this.chillT > 0) { this.chillT -= dt; currentZSpd *= 0.4; } 
    
    // Zeher se HP kam hogi
    if(this.poisonT > 0) { 
       this.poisonT -= dt; 
       this.hp -= 20 * dt; // Har second 20 damage
       if(this.hp <= 0 && !this.dying) this.hit(1, false); // Zeher se marne par drop
    }

    if (this.name === 'Spitter' && dist < 300) {
      this.atkCD -= dt;
      if (this.atkCD <= 0) {
        enemyBullets.push(new EnemyBullet(this.x, this.y, this.ang, this.dmg));
        this.atkCD = 2.5; this.armAng = 0.8;
      }
    } else if (this.name === 'Screamer' && dist < 180) {
      this.atkCD -= dt;
      if (this.atkCD <= 0) {
        p.slowT = 2.0; this.hitFlash = 1; this.atkCD = 4.0; this.armAng = 0.8;
      }
    } else if (dist > this.sz + 18) {
      this.x += dx / dist * currentZSpd * dt; 
      this.y += dy / dist * currentZSpd * dt;
    } else {
      this.atkCD -= dt;
      if (this.atkCD <= 0) { 
        p.hurt(this.dmg); this.atkCD = 1.1; this.armAng = .8; 
        // Thorns Power (Ulta zombie ko damage lagega)
        if(p.thorns > 0) this.hit(this.dmg * p.thorns, false);
      }
    }
    this.armAng*=.88;
    if(this.hitFlash>0) this.hitFlash-=dt*6;
    this.x=Math.max(25,Math.min(MAP_W-25,this.x));
    this.y=Math.max(25,Math.min(MAP_H-25,this.y));
  }

  hit(dmg, isCrit = false) {
    this.hp-=dmg; this.hitFlash=1; spawnHit(this.x,this.y);
    dmgTexts.push(new DmgText(this.x, this.y, dmg, isCrit || dmg > 30)); 

    if(this.hp<=0&&!this.dying){
      this.dying=true; spawnBlood(this.x,this.y,14); sndZombieDeath();
      xpOrbs.push(new XPOrb(this.x,this.y,this.xp)); 
      
      // Scavenger power (Loot drop chance badhega)
      let dropChance = 0.06 + (player.luck || 0);
      if (Math.random() < dropChance) lootDrops.push(new LootDrop(this.x, this.y));
      
      return true;
    }
    return false;
  }

  draw(){
    const sx=this.x-cam.x,sy=this.y-cam.y;
    ctx.save(); ctx.translate(sx,sy);
    if(this.name === 'Phantom') ctx.globalAlpha = 0.45; 
    if(this.dying){
      ctx.globalAlpha=Math.max(0,1-this.deathT*2);
      ctx.rotate(this.deathT*6);
      const s=1+this.deathT*.8; ctx.scale(s,s);
      ctx.shadowColor=this.c; ctx.shadowBlur=20;
      ctx.fillStyle=this.c; ctx.beginPath(); ctx.arc(0,0,this.sz*.9,0,Math.PI*2); ctx.fill();
      ctx.restore(); return;
    }
    ctx.rotate(this.ang+Math.PI/2);
    const fl=this.hitFlash;
    // Shadow
    ctx.save(); ctx.rotate(-Math.PI/2);
    ctx.fillStyle='rgba(0,0,0,.32)'; ctx.beginPath();
    ctx.ellipse(2,5,this.sz*.8,this.sz*.4,0,0,Math.PI*2); ctx.fill(); ctx.restore();
    // Legs
    const lg=Math.sin(this.leg)*7,c1=fl?'#fff':'#1a2a1a',c2=fl?'#fff':'#1a1a0a';
    ctx.fillStyle=c1;
    [-4,4].forEach((lx,i)=>{ ctx.beginPath(); ctx.ellipse(lx,this.sz*.6+(i?-lg:lg),4,7,0,0,Math.PI*2); ctx.fill(); });
    
    // NAYA: Colors for Poison aur Frostbite
    let baseCol = this.c, headCol = this.sc;
    if (this.poisonT > 0) { baseCol = '#16a34a'; headCol = '#22c55e'; } // Zeher (Green)
    else if (this.chillT > 0) { baseCol = '#0284c7'; headCol = '#38bdf8'; } // Baraf (Blue)

    // Body
    const bg=ctx.createLinearGradient(-this.sz,0,this.sz,0);
    bg.addColorStop(0,fl?'#fff':baseCol+'cc'); 
    bg.addColorStop(1,fl?'#fbb':baseCol);
    ctx.fillStyle=bg; ctx.strokeStyle='rgba(0,0,0,.45)'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.ellipse(0,this.sz*.1,this.sz*.72,this.sz*.65,0,0,Math.PI*2);
    ctx.fill(); ctx.stroke();
    // Arms
    const asw=Math.sin(this.leg)*.3;
    [[-(this.sz*.82),asw+this.armAng],[this.sz*.82,-asw+this.armAng]].forEach(([ax,rot])=>{
      ctx.save(); ctx.translate(ax,0); ctx.rotate(rot);
      ctx.fillStyle=fl?'#fff':baseCol+'bb';
      ctx.beginPath(); ctx.ellipse(0,this.sz*.5,4,this.sz*.55,0,0,Math.PI*2); ctx.fill();
      ctx.restore();
    });
    // Head
    ctx.fillStyle=fl?'#fff':headCol; ctx.strokeStyle='rgba(0,0,0,.35)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.arc(0,-this.sz*.65,this.sz*.5,0,Math.PI*2); ctx.fill(); ctx.stroke();
    if(!fl){
      ctx.shadowColor='#ef4444'; ctx.shadowBlur=10; ctx.fillStyle='#ef4444';
      [-4,4].forEach(ex=>{ ctx.beginPath(); ctx.arc(ex,-this.sz*.68,2.8,0,Math.PI*2); ctx.fill(); });
      ctx.shadowBlur=0;
      ctx.strokeStyle='#200000'; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.arc(0,-this.sz*.58,3.5,.2,Math.PI-.2); ctx.stroke();
      if(this.name==='Tank'){
        ctx.restore(); ctx.save(); ctx.translate(sx,sy);
        ctx.rotate(this.ang+Math.PI/2);
        ctx.font=`18px Arial`; ctx.textAlign='center';
        ctx.fillText('💀',0,-this.sz-20);
      }
    }
    if(this.hp<this.maxHp){
      ctx.rotate(-(this.ang+Math.PI/2));
      const bw=this.sz*2.2;
      ctx.fillStyle='rgba(0,0,0,.65)'; ctx.fillRect(-bw/2,-this.sz-14,bw,5);
      const pct=this.hp/this.maxHp;
      ctx.fillStyle=pct>.5?'#4ade80':pct>.25?'#fbbf24':'#ef4444';
      ctx.fillRect(-bw/2,-this.sz-14,bw*pct,5);
    }
    ctx.restore();
  }
}

// ── UPGRADES ────────────────────────────────────────────────
const UPGRADES=[
  {id:'damage',  name:'Power Shot',    desc:'+30% bullet damage',       icon:'💥',rar:'common'},
  {id:'firerate',name:'Rapid Fire',    desc:'+28% fire rate',           icon:'🔫',rar:'common'},
  {id:'speed',   name:'Swift Feet',    desc:'+20% move speed',          icon:'👟',rar:'common'},
  {id:'maxhp',   name:'Iron Body',     desc:'+30 max HP, heal 20',      icon:'🛡️',rar:'common'},
  {id:'heal',    name:'Field Medic',   desc:'Restore 50 health',        icon:'💊',rar:'common'},
  {id:'multi',   name:'Spread Shot',   desc:'Fire one extra bullet',    icon:'🎯',rar:'rare'},
  {id:'pierce',  name:'Pierce Shot',   desc:'Bullets pierce zombies',   icon:'⚡',rar:'rare'},
  {id:'magnet',  name:'XP Magnet',     desc:'+70% XP pickup range',     icon:'🧲',rar:'common'},
  {id:'regen',   name:'Regeneration',  desc:'Slowly restore health',    icon:'🌿',rar:'rare'},
  {id:'explosive',name:'Explosive',    desc:'Bullets explode on impact',icon:'💣',rar:'epic'},
  {id:'lifesteal',name:'Life Drain',   desc:'+5 HP per kill',           icon:'🩸',rar:'epic'},
  {id:'bigshot', name:'Big Shot',      desc:'+60% bullet size/damage',  icon:'🔮',rar:'rare'},
  {id:'aoe',     name:'Shockwave',     desc:'AOE damage on shoot',      icon:'🌊',rar:'epic'},
  {id:'crit',      name:'Critical Strike',desc:'15% chance for 3x damage', icon:'🔪',rar:'rare'},
  {id:'bounce',    name:'Ricochet',       desc:'Bullets bounce off map edges', icon:'🪃',rar:'epic'},
  {id:'frost',     name:'Frostbite',      desc:'Slows zombies for 0.8s', icon:'❄️',rar:'rare'},
  {id:'knockback', name:'Impact',         desc:'Push zombies back on hit', icon:'🥊',rar:'common'},
  {id:'evasion',   name:'Ghost Step',     desc:'10% chance to dodge attacks', icon:'👻',rar:'epic'},
  {id:'armor',     name:'Kevlar Armor',   desc:'Reduce incoming damage by 15%', icon:'🛡️',rar:'common'},
  {id:'thorns',    name:'Spiked Armor',   desc:'Reflect damage to attackers', icon:'🌵',rar:'rare'},
  {id:'luck',      name:'Scavenger',      desc:'Increases loot drop chance', icon:'🍀',rar:'rare'},
  {id:'xpboost',   name:'Scholar',        desc:'Gain +25% more XP', icon:'📚',rar:'common'},
  {id:'venom',     name:'Venom Shot',     desc:'Poisons zombies (Damage over time)', icon:'🧪',rar:'epic'} // NAYA VENOM
];
const RCOL={common:'#94a3b8',rare:'#60a5fa',epic:'#c084fc'};

function pickUpgrades(n = 3) {
  // Sirf wo upgrades filter karo jinka level 5 se kam hai
  const pool = UPGRADES.filter(u => {
    const currentLvl = player.upgrades[u.id] || 0;
    return currentLvl < 5; 
  });
  
  // Randomize karo
  pool.sort(() => Math.random() - .5);
  
  // Agar options bache hi nahi (sab max ho gaye), toh empty return mat karo
  if (pool.length === 0) return []; 
  
  return pool.slice(0, Math.min(n, pool.length));
}

// ── PLAYER ──────────────────────────────────────────────────
class Player {
  constructor() {
    this.x = MAP_W / 2; this.y = MAP_H / 2;
    this.maxHp = 100; this.hp = 100;
    this.spd = 185; this.dmg = 25; this.fireInt = 420;
    this.fireT = 0; this.bullets = 1; this.pierce = false;
    this.expl = false; this.aoe = false; this.bScale = 1;
    this.xpRange = 85; this.regen = 0; this.steal = false;
    this.xp = 0; this.xpNext = 35; this.lvl = 1;
    this.kills = 0; this.score = 0;
    this.ang = 0; this.leg = 0; this.iframes = 0;
    this.dmgFlash = 0; this.aura = 0; this.auraCol = '#a855f7';
    this.shootRange = 520;

    this.upgrades = {}; 
    this.slowT = 0; 
    
    // NAYA: Active Buffs track karne ke liye (Loot Drops)
    this.buffs = {}; 
    this.critCh = 0; this.bounce = 0; this.frost = false; this.kb = 0;
    this.evade = 0; this.armor = 0; this.thorns = 0; this.luck = 0;
    this.xpMult = 1; this.venom = false; // NAYA: Venom Power
  }
   

  update(dt, zs) {
    let dx = 0, dy = 0;
    if (keys['w'] || keys['arrowup']) dy -= 1;
    if (keys['s'] || keys['arrowdown']) dy += 1;
    if (keys['a'] || keys['arrowleft']) dx -= 1;
    if (keys['d'] || keys['arrowright']) dx += 1;
    if (joy.active || Math.abs(joy.dx) > .05 || Math.abs(joy.dy) > .05) { dx = joy.dx; dy = joy.dy; }

    // --- BUFFS TIMER UPDATE ---
    for (let b in this.buffs) {
      this.buffs[b] -= dt;
      if (this.buffs[b] <= 0) delete this.buffs[b];
    }

    if (dx || dy) {
      const l = Math.hypot(dx, dy);
      
      // HASTE Buff check (Speed badhegi)
      let currentSpd = this.spd * (this.buffs.haste ? 1.5 : 1);
      if (this.slowT > 0) { this.slowT -= dt; currentSpd *= 0.4; }

      this.x += dx / l * currentSpd * dt;
      this.y += dy / l * currentSpd * dt;
      this.leg += dt * 9;
    }

    this.x = Math.max(30, Math.min(MAP_W - 30, this.x));
    this.y = Math.max(30, Math.min(MAP_H - 30, this.y));

    let near = null, nd = Infinity;
    for (const z of zs) if (!z.dead && !z.dying) {
      const d = Math.hypot(z.x - this.x, z.y - this.y);
      if (d < nd) { nd = d; near = z; }
    }
    
    if (gameSettings.autoAim) {
      if (near) this.ang = Math.atan2(near.y - this.y, near.x - this.x);
    } else {
      if (joy.active && (joy.dx !== 0 || joy.dy !== 0)) {
        this.ang = Math.atan2(joy.dy, joy.dx);
      } else {
        const mx = mouse.x + cam.x; const my = mouse.y + cam.y;
        this.ang = Math.atan2(my - this.y, mx - this.x);
      }
    }

    this.fireT += dt * 1000;
    
    // GATLING Buff check (Fire rate bahut fast ho jayega)
    const currentFireInt = this.buffs.gatling ? 60 : this.fireInt;

    if (gameSettings.autoShoot) {
      if (near && nd <= this.shootRange && this.fireT >= currentFireInt) { this.fireT = 0; this.shoot(); }
    } else {
      const isMoving = (dx !== 0 || dy !== 0 || joy.active);
      if ((mouse.down || isMoving) && this.fireT >= currentFireInt) { this.fireT = 0; this.shoot(); }
    }

    if (this.iframes > 0) this.iframes -= dt;
    if (this.dmgFlash > 0) this.dmgFlash -= dt * 5;
    if (this.aura > 0) this.aura -= dt;
    if (this.regen > 0) this.hp = Math.min(this.maxHp, this.hp + this.regen * dt);

    // SHIELD Buff (Koi damage nahi lagega)
    if (this.buffs.shield) this.iframes = 0.2;

    // DEATH AURA Buff (Epic - Aas paas explosion aur damage)
    if (this.buffs.nuke_aura) {
      if (Math.random() < 0.2) spawnExplosion(this.x + (Math.random()-0.5)*150, this.y + (Math.random()-0.5)*150);
      for (const z of zs) {
        if (!z.dead && !z.dying && Math.hypot(z.x-this.x, z.y-this.y) < 140) {
          z.hit(80 * dt); // Massive continuous damage
        }
      }
    }

    if (this.aoe && this.fireT < 50) {
      for (const z of zs) {
        if (!z.dead && !z.dying && Math.hypot(z.x - this.x, z.y - this.y) < 100) z.hit(8);
      }
    }
  }

  shoot() {
    // POWER Buff Check (Damage double)
    const dmgMultiplier = this.buffs.power ? 2 : 1;
    const finalDmg = this.dmg * this.bScale * dmgMultiplier;

    // 8-WAY FIRE Buff (Ab yeh loot se aayega)
    if (this.buffs['8_way']) {
      for (let i = 0; i < 8; i++) {
        const a = this.ang + (i * Math.PI / 4);
        bullets.push(new Bullet(this.x, this.y, a, finalDmg, this.pierce, this.expl, this.bScale));
      }
      spawnMuzzle(this.x + Math.cos(this.ang) * 22, this.y + Math.sin(this.ang) * 22, this.ang);
      sndShoot();
      return; 
    }

    // Normal Shoot
    const spread = Math.max(0, (this.bullets - 1) * .22);
    for (let i = 0; i < this.bullets; i++) {
      const off = this.bullets > 1 ? (i / (this.bullets - 1) - .5) * spread : 0;
      const a = this.ang + off;
      bullets.push(new Bullet(this.x, this.y, a, finalDmg, this.pierce, this.expl, this.bScale));
    }
    spawnMuzzle(this.x + Math.cos(this.ang) * 22, this.y + Math.sin(this.ang) * 22, this.ang);
    sndShoot();
  }

  hurt(amt) {
    if (this.iframes > 0) return;
    this.hp -= amt; this.iframes = .55; this.dmgFlash = 1.2;
    shakeCamera(8); sndHit();
    if (this.hp <= 0) { this.hp = 0; endGame(); }
  }

  gainXP(v) {
    this.xp += v; this.score += v;
    if (this.xp >= this.xpNext) {
      this.xp -= this.xpNext; this.xpNext = Math.floor(this.xpNext * 1.45);
      this.lvl++; this.aura = 3.5;
      spawnLevelOrbs(this.x, this.y); sndLevelUp(); pendingUpgrades++;
      if (!waveActive && spawnQ.length === 0) flushUpgrade();
    }
  }

  onKill() {
    this.kills++; this.score += 50;
    if (this.steal) this.hp = Math.min(this.maxHp, this.hp + 5);
    showKillPop(this.x - cam.x, this.y - cam.y - 50, '+50');
  }

    applyUpgrade(id) {
    let currentLevel = this.upgrades[id] || 0;
    currentLevel++;
    this.upgrades[id] = currentLevel;

    switch (id) {
      case 'damage': this.dmg *= 1.3; break;
      case 'firerate':
        this.fireInt = Math.max(100, this.fireInt * 0.75);
        break;
      case 'speed': this.spd *= 1.15; break;
      case 'maxhp': this.maxHp += 30; this.hp = Math.min(this.maxHp, this.hp + 20); break;
      case 'heal': this.hp = Math.min(this.maxHp, this.hp + 50); break;
      case 'multi': this.bullets = Math.min(7, this.bullets + 1); break;
      case 'pierce': this.pierce = true; break;
      case 'magnet': this.xpRange += 60; break;
      case 'regen': this.regen += 4; break;
      case 'explosive': this.expl = true; break;
      case 'lifesteal': this.steal = true; break;
      case 'bigshot': this.bScale *= 1.4; this.dmg *= 1.4; break;
      case 'aoe': this.aoe = true; break;
      
      // 👇 NAYE 10 POWERS (Venom ke sath) YAHAN HAIN 👇
      case 'crit': this.critCh += 0.15; break;
      case 'bounce': this.bounce += 1; break;
      case 'frost': this.frost = true; break;
      case 'knockback': this.kb += 25; break;
      case 'evasion': this.evade += 0.10; break;
      case 'armor': this.armor += 0.15; break;
      case 'thorns': this.thorns += 0.5; break;
      case 'luck': this.luck += 0.05; break;
      case 'xpboost': this.xpMult += 0.25; break;
      case 'venom': this.venom = true; break; 
    }
    updateSideUI();
  }

  draw(){
    const sx=this.x-cam.x,sy=this.y-cam.y;
    ctx.save(); ctx.translate(sx,sy);
    // Aura glow
    const aStr=this.aura>0?Math.min(1,this.aura/2):Math.min(.4,(this.lvl-1)*.07);
    if(aStr>.02){
      const t=Date.now()/1000;
      const ar=50+Math.sin(t*3)*8;
      const ag=ctx.createRadialGradient(0,0,6,0,0,ar);
      ag.addColorStop(0,`rgba(168,85,247,${.5*aStr})`);
      ag.addColorStop(.5,`rgba(124,58,237,${.25*aStr})`);
      ag.addColorStop(1,'rgba(168,85,247,0)');
      ctx.fillStyle=ag; ctx.beginPath(); ctx.arc(0,0,ar,0,Math.PI*2); ctx.fill();
      if(this.aura>0){
        for(let i=0;i<3;i++){
          const ra=t*2+(i*Math.PI*2/3);
          ctx.fillStyle=`rgba(192,132,252,${.75*this.aura/3.5})`;
          ctx.shadowColor='#c084fc'; ctx.shadowBlur=8;
          ctx.beginPath(); ctx.arc(Math.cos(ra)*36,Math.sin(ra)*36,5,0,Math.PI*2); ctx.fill();
        }
        ctx.shadowBlur=0;
      }
    }
    ctx.rotate(this.ang+Math.PI/2);
    // Shadow
    ctx.save(); ctx.rotate(-Math.PI/2);
    ctx.fillStyle='rgba(0,0,0,.35)'; ctx.beginPath();
    ctx.ellipse(3,6,16,8,0,0,Math.PI*2); ctx.fill(); ctx.restore();
    const fl=this.dmgFlash>0;
    const ifl=this.iframes>.3&&Math.floor(Date.now()/80)%2;
    if(ifl){ ctx.globalAlpha=.5; }
    const bc=fl?'#ff6060':'#2a5080',vc=fl?'#ff8080':'#183060';
    // Legs
    const l1=Math.sin(this.leg)*9,l2=-l1;
    ctx.fillStyle=fl?'#f88':'#162040';
    [-4,4].forEach((lx,i)=>{ ctx.beginPath(); ctx.ellipse(lx,20+(i?l2:l1),5,8.5,0,0,Math.PI*2); ctx.fill(); });
    // Boots
    ctx.fillStyle=fl?'#a44':'#1a0d00';
    [-4,4].forEach((lx,i)=>{ ctx.beginPath(); ctx.ellipse(lx+1.5,27+(i?l2:l1),5.5,4.5,.12,0,Math.PI*2); ctx.fill(); });
    // Body
    const bg2=ctx.createLinearGradient(-14,-10,14,14);
    bg2.addColorStop(0,bc); bg2.addColorStop(1,vc);
    ctx.fillStyle=bg2; ctx.strokeStyle='rgba(0,0,0,.4)'; ctx.lineWidth=1;
    ctx.roundRect(-13,-10,26,26,4); ctx.fill(); ctx.stroke();
    // Tactical vest lines
    if(!fl){
      ctx.strokeStyle='rgba(80,130,200,.55)'; ctx.lineWidth=1.5;
      ctx.beginPath();
      ctx.moveTo(-8,-8);ctx.lineTo(-8,13);
      ctx.moveTo(8,-8);ctx.lineTo(8,13);
      ctx.moveTo(-12,-1);ctx.lineTo(12,-1);
      ctx.stroke();
      // Ammo pouches
      ctx.fillStyle='#142840'; ctx.strokeStyle='rgba(80,130,200,.4)'; ctx.lineWidth=1;
      [[-9,5],[7,5]].forEach(([px,py])=>{
        ctx.beginPath(); ctx.rect(px,py,5,6); ctx.fill(); ctx.stroke();
      });
    }
    // Arms
    const aw=Math.sin(this.leg)*.35;
    [[-(16),-2,aw],[16,-2,-aw]].forEach(([ax,ay,rot])=>{
      ctx.save(); ctx.translate(ax,ay); ctx.rotate(rot);
      ctx.fillStyle=bc; ctx.beginPath(); ctx.ellipse(0,9,5,10,0,0,Math.PI*2); ctx.fill(); ctx.restore();
    });
    // Gun arm (right, forward)
    ctx.save(); ctx.translate(12,-5); ctx.rotate(-.35);
    ctx.fillStyle='#1a1a1a'; ctx.shadowColor=this.fireT<80?'#fbbf24':'transparent'; ctx.shadowBlur=this.fireT<80?18:0;
    ctx.roundRect(-3,-20,7,18,2); ctx.fill();
    ctx.fillStyle='#333'; ctx.fillRect(-4,-24,9,7);
    ctx.fillStyle='#222'; ctx.fillRect(-2,-30,5,8);
    ctx.shadowBlur=0; ctx.restore();
    // Head
    const hc=fl?'#ffaaaa':'#e2c090';
    ctx.fillStyle=hc; ctx.strokeStyle='rgba(0,0,0,.3)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.arc(0,-19,13,0,Math.PI*2); ctx.fill(); ctx.stroke();
    // Helmet
    ctx.fillStyle=fl?'#448':'#1e3a5a';
    ctx.beginPath(); ctx.arc(0,-23,12,Math.PI,0); ctx.fill();
    ctx.fillRect(-12,-23,24,5);
    // Visor
    ctx.fillStyle='rgba(80,190,255,.45)';
    ctx.beginPath(); ctx.ellipse(0,-21,9,4.5,0,0,Math.PI*2); ctx.fill();
    // Eyes
    ctx.shadowColor='#7dd3fc'; ctx.shadowBlur=8; ctx.fillStyle='#7dd3fc';
    [-5,5].forEach(ex=>{ ctx.beginPath(); ctx.arc(ex,-21,2.2,0,Math.PI*2); ctx.fill(); });
    ctx.shadowBlur=0;
    ctx.restore();
  }
}

// ── PENDING UPGRADES QUEUE ───────────────────────────────────
let pendingUpgrades=0;
function flushUpgrade(){
  if(pendingUpgrades>0){ pendingUpgrades--; showUpgrades(); }
}

// ── WAVE SYSTEM ──────────────────────────────────────────────
let wave=0,waveActive=false,waveCooldown=4,spawnQ=[],spawnBT=0;

function waveComposition(w){
  let diff = gameSettings.difficulty || 3;
  let baseCount = Math.floor((w * 3.5) + (diff * 2.5)); // Hard = zyada zombies
  let pool = [0]; // Hamesha Walkers rahenge
  
  if(diff >= 2) pool.push(2); // Tanks
  if(diff >= 3) { pool.push(1); pool.push(3); } // Runners, Spitters
  if(diff >= 4) pool.push(5); // Phantom
  if(diff >= 5) pool.push(4); // Screamers

  let comp = [];
  for(let i=0; i<pool.length; i++){
     let portion = (i===0) ? 0.35 : (0.65 / (pool.length - 1)); // 35% Walkers, baaki sab split
     comp.push({ t: pool[i], n: Math.ceil(baseCount * portion) });
  }
  return comp;
}

function startWave(){
  wave++;
  const comp=waveComposition(wave);
  spawnQ=[];
  const mult=1+(wave-1)*.13;
  comp.forEach(({t,n})=>{ for(let i=0;i<n;i++) spawnQ.push({t,mult}); });
  spawnQ.sort(()=>Math.random()-.5);
  spawnBT=0; waveActive=true;
  const el=document.getElementById('waveAnnounce');
  el.textContent=`⚠ WAVE ${wave}`; el.style.opacity='1'; el.style.color='#f59e0b';
  setTimeout(()=>el.style.opacity='0',3000);
  document.getElementById('sWave').textContent=wave;
  sndWave();
}

function updateWave(dt){
  if(!waveActive){
    waveCooldown-=dt;
    if(waveCooldown<=0){ startWave(); }
    return;
  }
  if(spawnQ.length>0){
    spawnBT+=dt;
    // Difficulty ke hisab se spawn speed:
    const spawnInt = Math.max(0.12, 0.7 - ((gameSettings.difficulty || 3) * 0.08)); 
    
    if(spawnBT >= spawnInt){
      spawnBT=0;
      const batch=wave>5 ? Math.min(3,spawnQ.length) : 1;
      for(let b=0;b<batch&&spawnQ.length;b++){
        const {t,mult}=spawnQ.pop();
        const edge=Math.floor(Math.random()*4);
        let sx,sy;
        switch(edge){
          case 0:sx=Math.random()*MAP_W;sy=-70;break;
          case 1:sx=MAP_W+70;sy=Math.random()*MAP_H;break;
          case 2:sx=Math.random()*MAP_W;sy=MAP_H+70;break;
          case 3:sx=-70;sy=Math.random()*MAP_H;break;
        }
        zombies.push(new Zombie(sx,sy,t,mult));
      }
    }
  }
  if(spawnQ.length===0&&zombies.filter(z=>!z.dead).length===0){
    waveActive=false; waveCooldown=5;
    player.score+=wave*120; player.xp+=wave*8;
    const el=document.getElementById('waveAnnounce');
    el.textContent=`✓ WAVE ${wave} CLEAR!`; el.style.opacity='1'; el.style.color='#4ade80';
    setTimeout(()=>el.style.opacity='0',3000);
    pendingUpgrades++; setTimeout(()=>flushUpgrade(), 1200);
  }
}

// ── CAMERA ──────────────────────────────────────────────────
function shakeCamera(s){ cam.shake=Math.max(cam.shake,s); }

// ── MAP RENDER ───────────────────────────────────────────────
function drawMap(){
  const ox=-cam.x,oy=-cam.y;
  // Sky
  ctx.fillStyle='#050008'; ctx.fillRect(0,0,W,H);
  // Map floor gradient
  const mg=ctx.createRadialGradient(MAP_W/2+ox,MAP_H/2+oy,0,MAP_W/2+ox,MAP_H/2+oy,Math.max(MAP_W,MAP_H)*.7);
  mg.addColorStop(0,'#120020'); mg.addColorStop(.5,'#0a0014'); mg.addColorStop(1,'#060008');
  ctx.fillStyle=mg; ctx.fillRect(ox,oy,MAP_W,MAP_H);
  // Grid lines
  ctx.strokeStyle='rgba(90,20,140,.18)'; ctx.lineWidth=1;
  const gxs=Math.floor(cam.x/TILE)*TILE, gys=Math.floor(cam.y/TILE)*TILE;
  for(let gx=gxs;gx<=cam.x+W+TILE;gx+=TILE){
    const sx=gx+ox; if(sx<0||sx>W) continue;
    ctx.beginPath(); ctx.moveTo(sx,Math.max(0,oy)); ctx.lineTo(sx,Math.min(H,oy+MAP_H)); ctx.stroke();
  }
  for(let gy=gys;gy<=cam.y+H+TILE;gy+=TILE){
    const sy=gy+oy; if(sy<0||sy>H) continue;
    ctx.beginPath(); ctx.moveTo(Math.max(0,ox),sy); ctx.lineTo(Math.min(W,ox+MAP_W),sy); ctx.stroke();
  }
  // Decorations
  const t=Date.now()/1000;
  for(const d of deco){
    const dx=d.x+ox,dy=d.y+oy;
    if(dx<-120||dx>W+120||dy<-120||dy>H+120) continue;
    ctx.save(); ctx.translate(dx,dy);
    if(d.t==='grave'){
      ctx.rotate(d.ang); ctx.scale(d.sz,d.sz);
      ctx.fillStyle='#1e0f2e'; ctx.strokeStyle='rgba(100,50,150,.6)'; ctx.lineWidth=1.2;
      ctx.beginPath(); ctx.moveTo(-10,-8);ctx.lineTo(10,-8);ctx.lineTo(10,14);ctx.lineTo(-10,14);ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(0,-8,10,Math.PI,0); ctx.fill(); ctx.stroke();
      ctx.strokeStyle='rgba(120,60,180,.5)'; ctx.lineWidth=1.8;
      ctx.beginPath(); ctx.moveTo(0,-14);ctx.lineTo(0,0);ctx.moveTo(-5,-8);ctx.lineTo(5,-8); ctx.stroke();
    } else if(d.t==='tree'){
      ctx.strokeStyle='#1e0e0e'; ctx.lineCap='round';
      ctx.lineWidth=4*d.sz; ctx.beginPath(); ctx.moveTo(0,22*d.sz); ctx.lineTo(0,-18*d.sz); ctx.stroke();
      for(let b=0;b<d.br;b++){
        const ba=(b/d.br)*Math.PI*1.8-Math.PI*.1+(d.seed*.6);
        const bl=(12+((b+d.seed)*17%18))*d.sz;
        ctx.lineWidth=1.8*d.sz;
        ctx.beginPath(); ctx.moveTo(0,-8*d.sz);
        ctx.lineTo(Math.cos(ba)*bl,Math.sin(ba)*bl-10*d.sz); ctx.stroke();
      }
    } else if(d.t==='pool'){
      ctx.rotate(d.rot);
      ctx.fillStyle='rgba(25,3,5,.7)'; ctx.strokeStyle='rgba(80,5,10,.4)'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.ellipse(0,0,d.rx,d.ry,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle='rgba(80,10,10,.15)';
      ctx.beginPath(); ctx.ellipse(-d.rx*.2,-d.ry*.15,d.rx*.35,d.ry*.25,.3,0,Math.PI*2); ctx.fill();
    } else if(d.t==='rock'){
      ctx.fillStyle='#1a0d28'; ctx.strokeStyle='rgba(80,40,100,.5)'; ctx.lineWidth=1;
      ctx.beginPath();
      ctx.arc(0,0,14*d.sz,0,Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle='rgba(80,40,110,.2)';
      ctx.beginPath(); ctx.arc(-4*d.sz,-4*d.sz,5*d.sz,0,Math.PI*2); ctx.fill();
    } else if(d.t==='fog'){
      const fp=Math.sin(t*d.spd+d.phase)*.5+.5;
      const fg=ctx.createRadialGradient(0,0,0,0,0,d.r);
      fg.addColorStop(0,`rgba(30,0,55,${.08*fp})`);
      fg.addColorStop(1,'rgba(30,0,55,0)');
      ctx.fillStyle=fg; ctx.beginPath(); ctx.ellipse(0,0,d.r,d.r*.5,0,0,Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }
  // Map border glow
  ctx.shadowColor='#9333ea'; ctx.shadowBlur=20;
  ctx.strokeStyle='#7c3aed'; ctx.lineWidth=4;
  ctx.strokeRect(ox,oy,MAP_W,MAP_H);
  ctx.shadowBlur=0;
}

// ── MINIMAP ─────────────────────────────────────────────────
function drawMinimap(){
  const mw=mm.width,mh=mm.height;
  const sx=mw/MAP_W,sy=mh/MAP_H;
  mctx.clearRect(0,0,mw,mh);
  mctx.fillStyle='rgba(10,0,20,.85)'; mctx.fillRect(0,0,mw,mh);
  mctx.strokeStyle='rgba(124,58,237,.5)'; mctx.lineWidth=1;
  mctx.strokeRect(0,0,mw,mh);
  
  // XP orbs
  mctx.fillStyle='#a855f7';
  xpOrbs.forEach(o=>{ mctx.beginPath(); mctx.arc(o.x*sx,o.y*sy,1.5,0,Math.PI*2); mctx.fill(); });
  
  // Loot Drops (Minimap par Yellow dot dikhega)
  mctx.fillStyle='#facc15';
  lootDrops.forEach(ld=>{ mctx.beginPath(); mctx.arc(ld.x*sx,ld.y*sy,2.5,0,Math.PI*2); mctx.fill(); });

  // Zombies
  mctx.fillStyle='#ef4444';
  zombies.forEach(z=>{ if(!z.dead){ mctx.beginPath(); mctx.arc(z.x*sx,z.y*sy,2,0,Math.PI*2); mctx.fill(); } });
  
  // Player
  mctx.fillStyle='#60d0ff'; mctx.shadowColor='#60d0ff'; mctx.shadowBlur=6;
  mctx.beginPath(); mctx.arc(player.x*sx,player.y*sy,3.5,0,Math.PI*2); mctx.fill();
  mctx.shadowBlur=0;
  
  // Viewport
  mctx.strokeStyle='rgba(255,255,255,.15)'; mctx.lineWidth=1;
  mctx.strokeRect(cam.x*sx,cam.y*sy,W*sx,H*sy);
}

// ── KILL POPUP ──────────────────────────────────────────────
function showKillPop(x,y,txt){
  const el=document.createElement('div');
  el.className='killPop';
  el.textContent=txt;
  el.style.cssText=`left:${x}px;top:${y}px;color:${['#fbbf24','#f87171','#a78bfa','#4ade80'][Math.floor(Math.random()*4)]}`;
  document.body.appendChild(el);
  setTimeout(()=>el.remove(),900);
}

// ── UPGRADE SCREEN ──────────────────────────────────────────
function showUpgrades(){
  gameState=STATE.UPGRADE;
  const sc=document.getElementById('upgradeScreen');
  sc.style.display='flex';
  document.getElementById('upgLevel').textContent=`LEVEL ${player.lvl}`;
  const cards=document.getElementById('upgCards');
  cards.innerHTML='';
  pickUpgrades(3).forEach(u=>{
    const c=document.createElement('div');
    c.className='upgCard';
    c.style.borderColor=RCOL[u.rar];
    c.innerHTML=`<span class="upgIcon">${u.icon}</span><div class="upgName" style="color:${RCOL[u.rar]}">${u.name}</div><div class="upgDesc">${u.desc}</div><div class="upgRarity" style="color:${RCOL[u.rar]}">${u.rar}</div>`;
    c.onclick=()=>{
      player.applyUpgrade(u.id); sc.style.display='none'; gameState=STATE.PLAYING;
      // Check if more upgrades are queued
      if(pendingUpgrades>0) setTimeout(()=>flushUpgrade(),400);
    };
    cards.appendChild(c);
  });
}

// ── HUD UPDATE ──────────────────────────────────────────────
function updateHUD(){
  document.getElementById('hpFill').style.width=(player.hp/player.maxHp*100)+'%';
  document.getElementById('hpVal').textContent=`${Math.ceil(player.hp)}/${player.maxHp}`;
  document.getElementById('xpFill').style.width=(player.xp/player.xpNext*100)+'%';
  document.getElementById('lvlBadge').textContent=`LV ${player.lvl}`;
  document.getElementById('sKills').textContent=player.kills;
  document.getElementById('sScore').textContent=player.score;
}
function updateSideUI() {
  const side = document.getElementById('sideUpgrades');
  side.innerHTML = ''; // Pehle ka clear karo
  
  for (const [id, level] of Object.entries(player.upgrades)) {
    // Upgrade ka icon dhoondo
    const upgData = UPGRADES.find(u => u.id === id);
    if (!upgData) continue;
    
    const isMax = level >= 5;
    side.innerHTML += `
      <div style="background:rgba(0,0,0,0.6); border:1px solid ${isMax ? '#fbbf24' : '#7c3aed'}; padding:4px 8px; border-radius:4px; font-size:12px; color:white; display:flex; gap:8px; align-items:center;">
        <span>${upgData.icon}</span>
        <span style="letter-spacing:1px; ${isMax ? 'color:#fbbf24; font-weight:bold;' : ''}">${isMax ? 'MAX' : 'LVL ' + level}</span>
      </div>
    `;
  }
}

// ── MAIN UPDATE ─────────────────────────────────────────────
function update(dt){
  // Camera
  cam.tx=player.x-W/2; cam.ty=player.y-H/2;
  cam.x+=(cam.tx-cam.x)*.1; cam.y+=(cam.ty-cam.y)*.1;
  if(cam.shake>0){ cam.x+=(Math.random()-.5)*cam.shake*2.5; cam.y+=(Math.random()-.5)*cam.shake*2.5; cam.shake*=.82; if(cam.shake<.1) cam.shake=0; }
  
  // Player
  player.update(dt,zombies);
  // Zombies
  zombies.forEach(z=>{ if(!z.dead) z.update(dt,player); });
  
  // Bullets
  bullets.forEach(b=>{
    if(b.dead) return;
    b.update(dt);
    for(const z of zombies){
      if(z.dead||z.dying) continue;
      if(Math.hypot(z.x-b.x,z.y-b.y)<z.sz+6*b.scale){
        
        // NAYA: Hit bullet ke hisab se lagega (Critical)
        const k=z.hit(b.dmg, b.isCrit);
        
        // NAYA: 0.8s Frostbite aur Poison apply karna
        if (b.p.frost) z.chillT = 0.8; // User demand: 0.8 sec!
        if (b.p.venom) z.poisonT = 3.5; // Zeher 3.5 second tak rahega
        if (b.p.kb > 0) { 
          z.x += Math.cos(b.ang) * b.p.kb; 
          z.y += Math.sin(b.ang) * b.p.kb; 
        }

        if(k){ player.onKill(); }
        if(b.expl){ spawnExplosion(b.x,b.y); sndExplosion();
          zombies.forEach(oz=>{ if(!oz.dead&&!oz.dying&&Math.hypot(oz.x-b.x,oz.y-b.y)<85){
            const k2=oz.hit(b.dmg*.55); if(k2) player.onKill();
          }});
          b.dead=true; break;
        }
        if(!b.pierce){ b.dead=true; break; }
      }
    }
  });

  // XP orbs
  xpOrbs.forEach(o=>{ if(!o.done) o.update(dt,player); });
  
  // 👇 YAHAN HAI LOOT DROPS KO UPDATE KARNE KA SAHI CODE 👇
  lootDrops.forEach(ld => { if(!ld.done) ld.update(dt, player); });
  for(let i=lootDrops.length-1; i>=0; i--) if(lootDrops[i].done) lootDrops.splice(i,1);
  // 👆 --------------------------------------------------- 👆

  // Particles
  for(let i=particles.length-1;i>=0;i--) if(!particles[i].update(dt)) particles.splice(i,1);
  
  // Clean up
  for(let i=zombies.length-1;i>=0;i--) if(zombies[i].dead) zombies.splice(i,1);
  for(let i=bullets.length-1;i>=0;i--) if(bullets[i].dead) bullets.splice(i,1);
  for(let i=xpOrbs.length-1;i>=0;i--) if(xpOrbs[i].done) xpOrbs.splice(i,1);
  for(let i=dmgTexts.length-1; i>=0; i--) if(!dmgTexts[i].update(dt)) dmgTexts.splice(i,1);
  
  // Spitter ki bullets ko update aur clean karo
  enemyBullets.forEach(eb => eb.update(dt, player));
  for (let i = enemyBullets.length - 1; i >= 0; i--)
    if (enemyBullets[i].dead) enemyBullets.splice(i, 1);

  // Waves
  updateWave(dt);
  updateHUD();
}

// ── RENDER ──────────────────────────────────────────────────
function render(){
  ctx.clearRect(0,0,W,H);
  if(gameState===STATE.MENU) return;
  drawMap();
  xpOrbs.forEach(o=>o.draw());
  lootDrops.forEach(ld => ld.draw());
  particles.forEach(p=>p.draw());
  bullets.forEach(b=>{ if(!b.dead) b.draw(); });
    enemyBullets.forEach(eb => eb.draw()); // Spitter ki acid bullets draw karo
  zombies.forEach(z=>{ if(!z.dead) z.draw(); });
  dmgTexts.forEach(dt => dt.draw());

  player.draw();
  // Damage red flash — full screen slam
  if(player.dmgFlash>.01){
    const f=player.dmgFlash/1.2;
    // Bold outer border slam
    const dg=ctx.createRadialGradient(W/2,H/2,H*.12,W/2,H/2,Math.max(W,H)*.72);
    dg.addColorStop(0,`rgba(220,0,0,${f*.15})`);
    dg.addColorStop(.55,`rgba(180,0,0,${f*.38})`);
    dg.addColorStop(1,`rgba(255,0,0,${f*.75})`);
    ctx.fillStyle=dg; ctx.fillRect(0,0,W,H);
    // Solid tint overlay
    ctx.fillStyle=`rgba(180,0,0,${f*.18})`; ctx.fillRect(0,0,W,H);
  }
  // Atmospheric vignette
  const vg=ctx.createRadialGradient(W/2,H/2,H*.25,W/2,H/2,H*.85);
  vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(0,0,15,.65)');
  ctx.fillStyle=vg; ctx.fillRect(0,0,W,H);
  drawMinimap();
}

// ── GAME LOOP ────────────────────────────────────────────────
function gameLoop(ts){
  if(!running) return;
  requestAnimationFrame(gameLoop);
  const dt=Math.min((ts-lastTs)/1000,.05); lastTs=ts;
  if(gameState===STATE.PLAYING) update(dt);
  render();
}

// ── GAME LIFECYCLE ──────────────────────────────────────────
function initGame(){
  player=new Player();
  
  // NAYA: Purane arrays ke sath-sath naye arrays ko bhi 0 (khali) karna hai
  bullets.length = zombies.length = xpOrbs.length = particles.length = 0;
  enemyBullets.length = lootDrops.length = dmgTexts.length = 0; 
  
  wave=0; waveActive=false; waveCooldown=3; spawnQ=[]; spawnBT=0; pendingUpgrades=0;
  buildMap();
  cam.x=player.x-W/2; cam.y=player.y-H/2;
}

function startGame(){
  initAudio();
  document.getElementById('menu').style.display='none';
  document.getElementById('hud').style.display='block';
  document.getElementById('minimap').style.display='block';
  document.getElementById('joystickZone').style.display='block';
  document.getElementById('gameOver').style.display='none';
  initGame(); gameState=STATE.PLAYING; running=true;
  lastTs=performance.now();
  requestAnimationFrame(gameLoop);
}

function endGame(){
  gameState=STATE.OVER;
  document.getElementById('gameOver').style.display='flex';
  document.getElementById('goStats').innerHTML=
    `Waves Survived: <strong>${wave}</strong><br>Zombies Killed: <strong>${player.kills}</strong><br>Final Score: <strong>${player.score}</strong><br>Level Reached: <strong>${player.lvl}</strong>`;
}

function restartGame(){
  document.getElementById('gameOver').style.display='none';
  document.getElementById('upgradeScreen').style.display='none';
  initGame(); gameState=STATE.PLAYING;
}

function goToMenu(){
  running=false; gameState=STATE.MENU;
  document.getElementById('gameOver').style.display='none';
  document.getElementById('hud').style.display='none';
  document.getElementById('minimap').style.display='none';
  document.getElementById('joystickZone').style.display='none';
  document.getElementById('menu').style.display='flex';
}

// ── NAYA SETTINGS LOGIC ────────────────────────────────────
function showSettings(){
  document.getElementById('settingsModal').style.display='flex';
}

function closeSettings(){
  document.getElementById('settingsModal').style.display='none';
}

function toggleSetting(type) {
  const btn = document.getElementById(type === 'sound' ? 'btnSound' : type === 'aim' ? 'btnAim' : 'btnShoot');
  
  if (type === 'sound') {
    gameSettings.sound = !gameSettings.sound;
    if (masterGain) masterGain.gain.value = gameSettings.sound ? 0.35 : 0;
  } else if (type === 'aim') {
    gameSettings.autoAim = !gameSettings.autoAim;
  } else if (type === 'shoot') {
    gameSettings.autoShoot = !gameSettings.autoShoot;
  }
  
  const state = gameSettings[type === 'sound' ? 'sound' : type === 'aim' ? 'autoAim' : 'autoShoot'];
  btn.textContent = state ? 'ON' : 'OFF';
  
  if (state) {
    btn.classList.remove('off');
  } else {
    btn.classList.add('off');
  }
}

//A SLIDER FUNCTION 
const DIFF_NAMES = ['EASY 1', 'EASY 2', 'MEDIUM 1', 'MEDIUM 2', 'HARD 1', 'HARD 2', 'ULTRA HARD'];

function changeDiff() {
  const val = parseInt(document.getElementById('diffSlider').value);
  gameSettings.difficulty = val;
  document.getElementById('diffValText').textContent = DIFF_NAMES[val - 1];
}

function showLeaderboard() {
  document.getElementById('lbModal').style.display = 'flex';
}
</script>
