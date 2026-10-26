(()=> {
const $=id=>document.getElementById(id);
const canvas=$('view');
const STOREY=4.4, HOUSE_W=14, HOUSE_D=12;
let scene,camera,renderer,clock,player,world=[],bots=[],pickups=[],keys={},started=false,paused=false,health=100,stamina=100,kills=0,matchTime=180,currentItem=0,attackCd=0,invuln=0,lastDamageAt=0,playerDown=false,slideTime=0,crouch=false,moveSpeed=7.4,lookX=0,lookY=0,yaw=0,pitch=-0.16,velocityY=0,groundY=0,lastToast=0,cameraPos=new THREE.Vector3(),cameraLook=new THREE.Vector3(),cameraReady=false,colliders=[];
const items=[
 {name:'Tawa',icon:'🍳',type:'MELEE • HEAVY BONK',color:0xffb13b,power:28,range:2.65,cooldown:.62,speed:'Slow',special:'Heavy knockback'},
 {name:'Chappal',icon:'🩴',type:'MELEE • QUICK SLAP',color:0x48d7ff,power:13,range:3.25,cooldown:.24,speed:'Very fast',special:'Rapid combo'},
 {name:'Belan',icon:'🥖',type:'MELEE • LONG SWING',color:0xff68a8,power:20,range:3.35,cooldown:.43,speed:'Medium',special:'Strong pushback'},
 {name:'Banana',icon:'🍌',type:'THROWABLE • SLIP',color:0xe7ff47,power:12,range:14,cooldown:.58,speed:'Medium',special:'Longer slip-stun'},
 {name:'Jhaadu',icon:'🧹',type:'MELEE • WIDE SWEEP',color:0x9d82ff,power:11,range:3.9,cooldown:.38,speed:'Fast',special:'Hits multiple bots'},
 {name:'Water Balloon',icon:'💧',type:'THROWABLE • SPLASH',color:0x49a7ff,power:10,range:16,cooldown:.52,speed:'Medium',special:'Area splash + stun'},
 {name:'Cushion',icon:'🛋️',type:'THROWABLE • BONK',color:0xff795c,power:17,range:12,cooldown:.72,speed:'Slow',special:'Heavy knockback'}
];
function rand(a,b){return a+Math.random()*(b-a)}
function makePatternTexture(base,type='wall'){
 const c=document.createElement('canvas');c.width=256;c.height=256;const x=c.getContext('2d');
 x.fillStyle='#'+base.toString(16).padStart(6,'0');x.fillRect(0,0,256,256);
 if(type==='wall'){x.globalAlpha=.16;x.strokeStyle='#ffffff';x.lineWidth=2;for(let y=0;y<256;y+=32){x.beginPath();x.moveTo(0,y);x.lineTo(256,y);x.stroke()}for(let r=0;r<8;r++)for(let col=0;col<8;col++){x.globalAlpha=.08+((r+col)%3)*.025;x.fillStyle=(r+col)%2?'#fff':'#11182b';x.fillRect(col*32+(r%2)*16+2,r*32+2,28,28)}}
 else if(type==='floor'){x.globalAlpha=.25;x.strokeStyle='#fff2c7';x.lineWidth=2;for(let y=0;y<256;y+=64){x.beginPath();x.moveTo(0,y);x.lineTo(256,y);x.stroke()}for(let xx=0;xx<256;xx+=64){x.beginPath();x.moveTo(xx,0);x.lineTo(xx,256);x.stroke()}}
 else {x.globalAlpha=.2;for(let i=0;i<256;i+=12){x.fillStyle=i%24?'#fff':'#141a32';x.fillRect(i,0,4,256);x.fillRect(0,i,256,3)}}
 x.globalAlpha=1;const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;return t;
}
const textureCache=new Map();
function mat(c,rough=.82,type='plain'){let key=c+'-'+type;if(textureCache.has(key))return textureCache.get(key);let m=new THREE.MeshStandardMaterial({color:c,roughness:rough});if(type!=='plain'){m.map=makePatternTexture(c,type);m.needsUpdate=true}textureCache.set(key,m);return m;}
function box(w,h,d,c,x,y,z,opts={}){let m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(c,.82,opts.texture||'plain'));m.position.set(x,y,z);m.castShadow=false;m.receiveShadow=false;scene.add(m);world.push(m);if(opts.solid)colliders.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2,minY:y-h/2,maxY:y+h/2});return m}
function makeCharacter(x,z,color,isPlayer=false){
 const g=new THREE.Group();scene.add(g);g.position.set(x,0,z);
 const shirt=mat(color),pants=mat(0x202a49),skin=mat(0xc8875a),dark=mat(0x161a2a),shoe=mat(0xeff4ff);
 const torso=new THREE.Mesh(new THREE.BoxGeometry(.68,.8,.38),shirt);torso.position.y=1.25;torso.castShadow=true;g.add(torso);
 const head=new THREE.Mesh(new THREE.BoxGeometry(.43,.43,.42),skin);head.position.y=1.91;head.castShadow=true;g.add(head);
 const hair=new THREE.Mesh(new THREE.BoxGeometry(.46,.16,.44),dark);hair.position.set(0,2.17,0);g.add(hair);
 const accent=mat(isPlayer?0xffd43b:0x42e8ff),face=mat(0x282033),white=mat(0xffffff),pupil=mat(0x15192a);
 const band=new THREE.Mesh(new THREE.BoxGeometry(.48,.09,.46),accent);band.position.set(0,2.12,0);g.add(band);
 const brow=new THREE.Mesh(new THREE.BoxGeometry(.29,.055,.05),face);brow.position.set(0,2.03,-.22);g.add(brow);
 for(const ex of [-.105,.105]){const eye=new THREE.Mesh(new THREE.BoxGeometry(.075,.075,.035),white);eye.position.set(ex,1.96,-.225);g.add(eye);const dot=new THREE.Mesh(new THREE.BoxGeometry(.035,.045,.02),pupil);dot.position.set(ex,1.96,-.247);g.add(dot)}
 const belt=new THREE.Mesh(new THREE.BoxGeometry(.7,.1,.4),mat(0xffd43b));belt.position.set(0,.91,0);g.add(belt);
 const wrist=new THREE.Mesh(new THREE.BoxGeometry(.23,.14,.26),accent);wrist.position.set(.48,1.04,0);g.add(wrist);
 const leg1=new THREE.Mesh(new THREE.BoxGeometry(.24,.65,.28),pants),leg2=leg1.clone();leg1.position.set(-.19,.48,0);leg2.position.set(.19,.48,0);g.add(leg1,leg2);
 const arm1=new THREE.Mesh(new THREE.BoxGeometry(.2,.65,.24),skin),arm2=arm1.clone();arm1.position.set(-.48,1.28,0);arm2.position.set(.48,1.28,0);g.add(arm1,arm2);
 const pack=new THREE.Mesh(new THREE.BoxGeometry(.42,.48,.18),mat(isPlayer?0xff4e8a:0x252e4a));pack.position.set(0,1.35,.26);g.add(pack);
 g.userData={torso,head,leg1,leg2,arm1,arm2,hp:100,isPlayer,color,walk:rand(0,5),alive:true,attack:0,stun:0};
 return g;
}
function makeHouse(cx,cz,palette,offset){
 // floor slabs + four storeys; open-front, brightly coloured rooms, windows, balconies
 const floorColors=[palette[0],palette[1],palette[2],palette[3]];
 for(let f=0;f<4;f++){
  let y=f*STOREY;
  box(HOUSE_W,.28,HOUSE_D,0xe9b77c,cx,y,cz,{texture:'floor'});
  // back wall, side walls, front piers
  box(HOUSE_W,4.12,.28,floorColors[f],cx,y+2.1,cz-5.85,{texture:'wall',solid:true});
  box(.28,4.12,HOUSE_D,floorColors[(f+1)%4],cx-6.85,y+2.1,cz,{texture:'wall',solid:true});
  box(.28,4.12,HOUSE_D,floorColors[(f+2)%4],cx+6.85,y+2.1,cz,{texture:'wall',solid:true});
  box(.35,4.12,.35,0xffd66b,cx-6.4,y+2.1,cz+5.7);
  box(.35,4.12,.35,0xffd66b,cx+6.4,y+2.1,cz+5.7);
  // colorful interior partitions on alternate floors
  if(f%2===0){box(3,2.5,.2,0xfff0cc,cx-2.8,y+1.3,cz+.2);box(.2,2.5,3,0x8ee6dc,cx+1.5,y+1.3,cz+1.9)}
  // windows and bright shutters
  for(let k=0;k<3;k++){
   let wx=cx-3.8+k*3.8;
   box(1.3,1.05,.12,0x58d9ff,wx,y+2.8,cz-5.66);
   box(1.45,.12,.18,0xffd43b,wx,y+2.25,cz-5.6);
  }
  // balcony
  box(11,.12,1.1,0x3e5b88,cx,y+.35,cz+5.25);
  for(let k=0;k<9;k++)box(.08,.7,.08,0xffd43b,cx-5+k*1.25,y+.72,cz+5.65);
  // room props
  if(f===0){box(2,.7,1.2,0x9c4fbd,cx-2,y+.5,cz+2,{solid:f===0});box(1.1,.9,.8,0xff8657,cx+3,y+.6,cz+1,{solid:f===0})}
  if(f===1){box(2.5,.45,1.2,0x44b9a6,cx+2,y+.5,cz+2,{solid:f===0});box(.45,1.5,.45,0xffce58,cx-3,y+.8,cz+2,{solid:f===0})}
  if(f===2){box(1.4,1.2,1.4,0x6d8cff,cx-2,y+.65,cz+2,{solid:f===0});box(1.1,.5,1.1,0xff709c,cx+3,y+.4,cz+2,{solid:f===0})}
  if(f===3){box(1.8,.3,1.2,0x7a5036,cx-2,y+.25,cz+2,{solid:f===0});box(.8,.8,.8,0x50d6a8,cx+3,y+.4,cz+2,{solid:f===0})}
 }
 // Interior details: doors, rugs, furniture, shelves, lamps and room dividers.
 for(let fl=0;fl<4;fl++){
  let fy=fl*STOREY;
  // rugs and patterned floor mats
  box(3.6,.045,2.2,[0x9b4dba,0x2d9f9b,0xd45c74,0x3c68bb][fl],cx-2,fy+.18,cz+1.65,{texture:'fabric'});
  // sofa and cushions
  box(2.25,.62,.8,[0x356a9f,0x3c8d78,0x9d4d83,0x4666ad][fl],cx+2.7,fy+.52,cz+2.8,{texture:'fabric',solid:fl===0});
  for(let k=0;k<3;k++)box(.55,.42,.12,[0xffd43b,0x42e8ff,0xff4e8a][k],cx+1.95+k*.72,fy+.95,cz+2.35,{texture:'fabric'});
  // cabinets / storage and wall shelves
  box(.9,1.55,.55,0x88532f,cx-4.25,fy+.95,cz+.65,{texture:'wall',solid:fl===0});
  box(1.05,.12,.68,0xffd43b,cx-4.25,fy+1.75,cz+.65);
  box(1.7,.12,.32,0x5c3c2f,cx+1.7,fy+2.05,cz-3.9);
  for(let k=0;k<3;k++)box(.24,.35,.24,[0xff4e8a,0x42e8ff,0xb9ff4b][k],cx+1.15+k*.55,fy+2.28,cz-3.9);
  // ceiling lamps
  let lamp=new THREE.Mesh(new THREE.SphereGeometry(.16,8,6),new THREE.MeshStandardMaterial({color:0xfff0a0,emissive:0xffc85a,emissiveIntensity:.55}));
  lamp.position.set(cx,fy+3.8,cz);scene.add(lamp);
 }
 // parapet
 box(14,.8,.3,0xffb34e,cx,17.9,cz+5.85);box(.3,.8,12,0xffb34e,cx-6.85,17.9,cz);
 // bright rooftop tank
 let tank=new THREE.Mesh(new THREE.CylinderGeometry(.8,.8,1.5,12),mat(0x4aa9ff));tank.position.set(cx+3,18.6,cz-2);scene.add(tank);world.push(tank);
 // external staircase approximated with visible step blocks
 // Broad, continuous stair flights on the open-front side. Each flight climbs one storey.
 for(let f=0;f<3;f++)for(let s=0;s<20;s++){
  const z=cz+4.45-(s+.5)*(8.9/20), y=f*STOREY+(s+1)*(STOREY/20);
  box(1.65,.16,.52,0xf4d09a,cx+5.0,y-.08,z,{texture:'floor'});
  box(.07,.22,.05,0xffd43b,cx+4.18,y-.04,z);
 }
 // Stair landing markers make the route obvious from the street.
 for(let f=1;f<4;f++)box(2.2,.16,1.4,0x42e8ff,cx+5.0,f*STOREY,cz+4.65);
}
function buildWorld(){
 scene.background=new THREE.Color(0x83d9ff);scene.fog=new THREE.Fog(0x83d9ff,45,105);
 scene.add(new THREE.HemisphereLight(0xc5f6ff,0x6c4b62,2.1));
 let sun=new THREE.DirectionalLight(0xfff0cb,3.0);sun.position.set(-15,30,20);sun.castShadow=false;scene.add(sun);
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(120,100),mat(0x53bd8d));ground.rotation.x=-Math.PI/2;ground.position.y=-.18;ground.receiveShadow=true;scene.add(ground);
 // painted courtyard and street stripes
 box(20,.05,18,0xffc86a,0,0,-1);
 for(let i=-2;i<=2;i++)box(.12,.04,14,0xfff2a3,i*3,.02,-1);
 makeHouse(-9,0,[0xff775e,0xffbd59,0x4dc4c4,0x6b80ed],0);
 makeHouse(9,0,[0x5c9cff,0x9c75e8,0xff7eaa,0x58cba8],1);
 // connecting bridges between houses at floors 2 and 4
 for(let f of [1,3]){
  let y=f*STOREY+.45;box(6,.24,2.2,0x384e7a,0,y,0);
  box(6,.14,.12,0xffd43b,0,y+.55,-1.02);box(6,.14,.12,0xffd43b,0,y+.55,1.02);
  for(let i=0;i<9;i++){box(.12,.55,.12,0x42e8ff,-2.8+i*.7,y+.25,-1.02);box(.12,.55,.12,0x42e8ff,-2.8+i*.7,y+.25,1.02)}
 }
 // street clutter, awnings, clotheslines, plants
 for(let i=0;i<6;i++){let x=rand(-20,20),z=rand(-18,18);if(Math.abs(x)<13&&Math.abs(z)<7)continue;box(rand(.6,1.4),rand(.8,2),rand(.6,1.4),[0xff6b6b,0xffd43b,0x55baff,0xb4f75e][i%4],x,.4,z)}
 for(let x=-18;x<=18;x+=6){let pole= new THREE.Mesh(new THREE.CylinderGeometry(.06,.08,5,8),mat(0x53607b));pole.position.set(x,2.5,-12);scene.add(pole);box(2,.05,.05,0xfff2a3,x,4.7,-12)}
 // Visible perimeter fences align with movement bounds, so the player can see the map edge.
 const fenceMat=0x596a78;
 for(let x=-22;x<=22;x+=2){box(.09,1.25,.09,fenceMat,x,.62,-20.0);box(.09,1.25,.09,fenceMat,x,.62,20.0);box(.09,.08,.09,0xffd43b,x,1.25,-20.0);box(.09,.08,.09,0xffd43b,x,1.25,20.0)}
 for(let z=-20;z<=20;z+=2){box(.09,1.25,.09,fenceMat,-22.0,.62,z);box(.09,1.25,.09,fenceMat,22.0,.62,z)}
 for(let y of [.3,.8,1.2]){box(44,.07,.07,0xffd43b,0,y,-20);box(44,.07,.07,0xffd43b,0,y,20);box(.07,.07,40,0xffd43b,-22,y,0);box(.07,.07,40,0xffd43b,22,y,0)}
 // --- Gully detail pass: lane edges, drains, doors, signs, stalls and greenery ---
 // Sidewalk curbs and a narrow open drain along the outer lane.
 box(42,.22,.38,0xd7c8a7,-1,.02,12.7);
 box(42,.22,.38,0xd7c8a7,-1,.02,-16.7);
 box(42,.06,.34,0x394d5b,-1,.04,13.05);
 box(42,.06,.34,0x394d5b,-1,.04,-17.05);
 for(let x=-20;x<=20;x+=2.5){box(.9,.035,.09,0xeff3db,x,.04,-1.1);}
 // Drain grates and manhole covers.
 for(let x=-18;x<=18;x+=6){
  const cover=new THREE.Mesh(new THREE.CylinderGeometry(.48,.48,.045,16),mat(0x667582,.8,'metal'));cover.position.set(x,.075,12.95);scene.add(cover);world.push(cover);
  for(let k=-2;k<=2;k++)box(.045,.025,.42,0x293947,x+k*.14,.11,12.95);
 }
 // Painted shopfronts / signboards on the lane edges.
 const shopSigns=[['CHAI POINT',0xffd43b],['GUPSHUP',0x42e8ff],['NIMBU PANI',0xff709c],['GULLY MART',0xb9ff4b]];
 for(let i=0;i<4;i++){
  const x=-17+i*11.3, z= i%2===0 ? 15.2 : -19.2, col=shopSigns[i][1];
  box(5.1,2.9,.38,[0xe8b99b,0xf2d27b,0xa9d8ca,0xe6a8c7][i],x,1.45,z,{texture:'wall'});
  box(4.65,.75,.18,col,x,2.35,z+(z>0?-.25:.25));
  box(3.6,.1,.15,0xffffff,x,1.4,z+(z>0?-.27:.27));
  // striped canopy with alternating coloured panels
  for(let k=0;k<7;k++)box(.68,.08,1.05,k%2?0xffffff:col,x-2.05+k*.68,3.0,z+(z>0?-.55:.55));
  // counter and stacked produce crates
  box(3.7,.8,.65,0x89553b,x,.55,z+(z>0?-.8:.8),{solid:true});
  for(let k=0;k<3;k++)box(.62,.62,.55,[0xff6b6b,0xffd43b,0x55baff][k],x-1.1+k*1.1,.65,z+(z>0?-1.22:1.22),{solid:true});
 }
 // Door frames, grills and balconies get extra contrast on both houses.
 for(const cx of [-9,9]){
  for(let side of [-1,1]){
   box(1.25,2.25,.16,0x593c46,cx+side*3.1,1.15,5.0);
   box(.95,1.95,.08,side<0?0x9c7048:0x3d6f7b,cx+side*3.1,1.08,5.1);
   for(let k=0;k<4;k++)box(.045,1.0,.045,0xffd66b,cx+side*3.1-.34+k*.22,3.7,4.8);
  }
  // rooftop parapet corner posts, water drums and solar panels
  for(let sx of [-5.2,5.2])for(let sz of [-4.2,4.2])box(.28,1.05,.28,0xffd66b,cx+sx,24.0,sz);
  for(let k=0;k<3;k++){
   box(1.25,.08,.85,0x244e75,cx-3.5+k*1.35,24.18,-2.4);
   for(let sl=-1;sl<=1;sl++)box(.025,.025,.8,0x67d8ff,cx-3.5+k*1.35+sl*.3,24.23,-2.4);
  }
 }
 // Street trees: trunk, layered leafy crowns and low planter boxes.
 for(const [x,z] of [[-21,8],[21,8],[-21,-9],[21,-9],[-17,3],[17,3]]){
  box(1.15,.35,1.15,0x98704b,x,.18,z,{solid:true});
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.16,.23,2.2,7),mat(0x765039));trunk.position.set(x,1.35,z);scene.add(trunk);world.push(trunk);
  for(const [yy,rr,cc] of [[2.5,1.05,0x29965b],[3.1,.82,0x45b86a],[3.55,.58,0x78cf72]]){
   const leaves=new THREE.Mesh(new THREE.IcosahedronGeometry(rr,1),mat(cc));leaves.position.set(x,yy,z);scene.add(leaves);world.push(leaves);
  }
 }
 // Parked scooter silhouettes and bicycles add scale to the lane (decorative, no gameplay collision).
 for(const [x,z,paint] of [[-13,9,0xe84e63],[13,-9,0x36a8d8]]){
  for(const dx of [-.62,.62]){const wheel=new THREE.Mesh(new THREE.TorusGeometry(.28,.075,8,14),mat(0x202a35));wheel.position.set(x+dx,.31,z);wheel.rotation.y=Math.PI/2;scene.add(wheel);world.push(wheel)}
  box(1.15,.48,.48,paint,x,.72,z,{texture:'metal'});box(.45,.35,.38,0x313e50,x-.15,1.08,z);
  box(.5,.08,.3,0x252b35,x+.35,1.15,z);box(.25,.08,.18,0xffd43b,x-.6,1.05,z);
 }
 // Utility poles, overhead wires and colourful bunting across the lane.
 for(const x of [-20,0,20]){
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(.08,.12,7,8),mat(0x6b6871));pole.position.set(x,3.5,8);scene.add(pole);world.push(pole);
  box(.8,.08,.08,0x3e4653,x,6.65,8);
 }
 for(let i=0;i<15;i++){
  const x=-18+i*2.55;const pennant=new THREE.Mesh(new THREE.ConeGeometry(.22,.42,3),mat([0xff4e8a,0xffd43b,0x42e8ff,0xb9ff4b][i%4]));pennant.rotation.x=Math.PI; pennant.position.set(x,4.9,6.8);scene.add(pennant);world.push(pennant);
 }
}
function spawnPickup(x,z,itemIndex){
 let g=new THREE.Group();scene.add(g);g.position.set(x,.12,z);
 let orb=new THREE.Mesh(new THREE.IcosahedronGeometry(.38,1),new THREE.MeshStandardMaterial({color:items[itemIndex].color,emissive:items[itemIndex].color,emissiveIntensity:.5,metalness:.2,roughness:.3}));g.add(orb);
 let ring=new THREE.Mesh(new THREE.TorusGeometry(.58,.045,8,24),mat(0xffffff));ring.rotation.x=Math.PI/2;g.add(ring);
 g.userData={itemIndex,baseY:g.position.y,phase:rand(0,6)};pickups.push(g);
}
const APP_BOOT_AT=performance.now();
function enterImmersive(){
 const root=document.documentElement;
 try{if(!document.fullscreenElement&&root.requestFullscreen)root.requestFullscreen().catch(()=>{});}catch(_){}
 try{if(screen.orientation&&screen.orientation.lock)screen.orientation.lock('landscape').catch(()=>{});}catch(_){}
}
function setup(){
 scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(96,innerWidth/innerHeight,.1,180);
 renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.25));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;renderer.shadowMap.enabled=false;
 clock=new THREE.Clock();buildWorld();
 player=makeCharacter(0,9,0x2e80ff,true);
 // Hide the local avatar mesh in first-person view; bot and world meshes remain visible.
 player.visible=false;makeHeldItem();
 for(let i=0;i<5;i++){const sp=[[-19,8],[-18,15],[-1,16],[1,17],[19,8]][i];let b=makeCharacter(sp[0],sp[1],[0xff4e8a,0x9b6cff,0xff7b3d,0x25b9a5,0xd9e74e][i]);b.userData.ai=i;initBot(b);bots.push(b)}
 for(let i=0;i<9;i++)spawnPickup(rand(-17,17),rand(-13,13),i%items.length);
 addEventListener('resize',resize);resize();bindControls();initLayoutCustomization();animate();
 // Keep the tutorial visible for at least 10 seconds, even if WebGL starts instantly.
 const remaining=Math.max(0,10000-(performance.now()-APP_BOOT_AT));
 setTimeout(()=>{$('loading').classList.add('loading-done');setTimeout(()=>{$('loading').style.display='none'},300)},remaining);
}
function resize(){if(!renderer)return;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)}
function toast(s){$('toast').textContent=s;$('toast').style.opacity=1;clearTimeout(lastToast);lastToast=setTimeout(()=>$('toast').style.opacity=0,1300)}
function hitFeedback(){const el=$('hitMarker');if(!el)return;el.classList.remove('show');void el.offsetWidth;el.classList.add('show')}
function updateHealthHud(){const bar=$('healthBar');bar.style.width=Math.max(0,health)+'%';bar.style.background=health<=30?'linear-gradient(90deg,#ff315d,#ff765e)':health<=60?'linear-gradient(90deg,#ffd43b,#ff9b42)':'linear-gradient(90deg,#b9ff4b,#42e8a1)';$('healthText').textContent=Math.max(0,Math.ceil(health));$('healthText').style.color=health<=30?'#ff5c7a':'#fff'}
function bindControls(){
 addEventListener('keydown',e=>{keys[e.code]=true;if(e.code==='Space')e.preventDefault();if(e.code==='KeyC')crouch=true;if(e.code==='KeyE')pickup();if(e.code==='Escape')togglePause();if(e.code==='KeyQ')swapItem(-1);if(e.code==='KeyR')swapItem(1)});
 addEventListener('keyup',e=>{keys[e.code]=false;if(e.code==='KeyC')crouch=false});
 canvas.addEventListener('click',()=>{if(started&&!paused&&document.pointerLockElement!==canvas)canvas.requestPointerLock?.()});
 addEventListener('mousemove',e=>{if(document.pointerLockElement===canvas&&started&&!paused){yaw-=e.movementX*.00125;pitch-=e.movementY*.00105;pitch=Math.max(-1.553,Math.min(1.553,pitch))}});
 addEventListener('mousedown',e=>{if(e.button===0&&started&&!paused)attack()});
 addEventListener('wheel',e=>{if(started&&!paused)swapItem(e.deltaY>0?1:-1)});
 $('playBtn').onclick=()=>{enterImmersive();started=true;$('overlay').classList.add('hidden');$('game').classList.add('game-playing');toast('GO GO GO! PICK UP ITEMS!')};
 function respawnPlayer(){
 if(!scene||!playerDown)return;
 $('respawnOverlay').classList.add('hidden');
 player.position.set(0,0,9);velocityY=0;health=100;stamina=100;lastDamageAt=performance.now();playerDown=false;invuln=3;
 $('staminaBar').style.width='100%';$('staminaText').textContent='100';updateHealthHud();
 mobileMove.x=mobileMove.y=0;const knob=$('stickKnob');if(knob)knob.style.transform='translate(0,0)';
 toast('BACK IN THE GULLY! 3s SHIELD');
}
$('respawnBtn').onclick=respawnPlayer;
$('pauseBtn').onclick=togglePause;$('resumeBtn').onclick=togglePause;$('restartBtn').onclick=()=>location.reload();
 // Explicit, touch-first item switching controls (pointerdown avoids delayed mobile click).
 for(const [id,dir] of [['weaponPrev',-1],['weaponNext',1]]){const btn=$(id);if(btn){btn.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();if(started&&!paused)swapItem(dir)});btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation()})}}
 const fireBtn=$('mobileAttack');
 let fireLookPointer=null,fireLookLast={x:0,y:0};
 fireBtn.addEventListener('pointerdown',e=>{
   e.preventDefault();
   if(!started||paused)return;
   attack();
   // Dragging directly on the HIT button also steers the camera.
   fireLookPointer=e.pointerId;fireLookLast={x:e.clientX,y:e.clientY};
   try{fireBtn.setPointerCapture(e.pointerId)}catch(_){}
 });
 fireBtn.addEventListener('pointermove',e=>{
   if(fireLookPointer!==e.pointerId||!started||paused)return;
   const dx=e.clientX-fireLookLast.x,dy=e.clientY-fireLookLast.y;
   yaw-=dx*.0090;
   pitch=Math.max(-1.25,Math.min(1.25,pitch-dy*.0062));
   fireLookLast={x:e.clientX,y:e.clientY};
   e.preventDefault();
 });
 const endFireLook=e=>{if(fireLookPointer===e.pointerId)fireLookPointer=null};
 fireBtn.addEventListener('pointerup',endFireLook);fireBtn.addEventListener('pointercancel',endFireLook);
 $('mobileJump').addEventListener('pointerdown',e=>{e.preventDefault();if(started&&!paused){if(player.position.y<.05)velocityY=8}});
 $('mobileSlide').addEventListener('pointerdown',e=>{e.preventDefault();if(started&&!paused){slideTime=.65}});
 $('mobilePickup').addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();if(started&&!paused){pickup()}});
 $('mobileAttack').addEventListener('contextmenu',e=>e.preventDefault());
 $('mobilePickup').addEventListener('contextmenu',e=>e.preventDefault());
 const stick=$('stick'),knob=$('stickKnob');let moveId=null,lookId=null,joy={x:0,y:0},last={x:0,y:0};const radius=42;
 function resetJoy(){moveId=null;mobileMove.x=mobileMove.y=0;knob.style.transform='translate(0,0)';stick.style.opacity='.72';stick.style.left='22px';stick.style.top='auto';stick.style.bottom='22px'}
 function joyAt(x,y){stick.style.left=Math.max(8,Math.min(innerWidth*.43-116,x-58))+'px';stick.style.top=Math.max(8,Math.min(innerHeight-124,y-58))+'px';stick.style.bottom='auto';joy={x,y};stick.style.opacity='.95'}
 function joyMove(x,y){let dx=x-joy.x,dy=y-joy.y,l=Math.hypot(dx,dy);if(l>radius){dx=dx/l*radius;dy=dy/l*radius}mobileMove.x=dx/radius;mobileMove.y=dy/radius;knob.style.transform=`translate(${dx}px,${dy}px)`}
 document.addEventListener('touchstart',e=>{if(!started||paused)return;for(const t of e.changedTouches){if(t.clientX<innerWidth*.48&&moveId===null){moveId=t.identifier;joyAt(t.clientX,t.clientY);joyMove(t.clientX,t.clientY);e.preventDefault()}else if(t.clientX>=innerWidth*.48&&lookId===null&&!e.target.closest('button')){lookId=t.identifier;last={x:t.clientX,y:t.clientY};e.preventDefault()}}},{passive:false});
 document.addEventListener('touchmove',e=>{for(const t of e.changedTouches){if(t.identifier===moveId){joyMove(t.clientX,t.clientY);e.preventDefault()}else if(t.identifier===lookId&&started&&!paused){let dx=t.clientX-last.x,dy=t.clientY-last.y;yaw-=dx*.0072;pitch=Math.max(-1.25,Math.min(1.25,pitch-dy*.0052));last={x:t.clientX,y:t.clientY};e.preventDefault()}}},{passive:false});
 function touchEnd(e){for(const t of e.changedTouches){if(t.identifier===moveId)resetJoy();if(t.identifier===lookId)lookId=null}}
 document.addEventListener('touchend',touchEnd,{passive:false});document.addEventListener('touchcancel',touchEnd,{passive:false});
}
let mobileMove={x:0,y:0};
let abilitiesChosen=0, abilityMilestones=[5,10,20,30,40,50], activeAbilities={speed:false,strength:false,freezeUntil:0,shieldUntil:0,rapid:false}, layoutEdit=false;
function showAbilityChoice(milestone){if(!started||playerDown)return;paused=true;$('abilitySubtitle').textContent='You reached '+milestone+' bot KOs. Choose ONE ability.';$('abilityOverlay').classList.remove('hidden');document.exitPointerLock?.()}
document.querySelectorAll('.ability-option').forEach(btn=>btn.addEventListener('click',()=>{const a=btn.dataset.ability;if(a==='speed')activeAbilities.speed=true;if(a==='strength')activeAbilities.strength=true;if(a==='freeze'){activeAbilities.freezeUntil=performance.now()+4500;for(const b of bots)if(b.userData.alive)b.userData.stun=Math.max(b.userData.stun||0,4.5)}if(a==='heal'){health=Math.min(100,health+35);updateHealthHud()}if(a==='shield'){activeAbilities.shieldUntil=performance.now()+4000;invuln=Math.max(invuln,4)}if(a==='rapid')activeAbilities.rapid=true;$('abilityOverlay').classList.add('hidden');paused=false;toast(({speed:'SPEED BURST UNLOCKED',strength:'HEAVY HIT UNLOCKED',freeze:'FREEZE PULSE ACTIVATED',heal:'QUICK RECOVERY +35 HP',shield:'DESI SHIELD ACTIVATED',rapid:'RAPID BONK UNLOCKED'})[a])}));
function initLayoutCustomization(){
 const controls=[...document.querySelectorAll('#mobileControls button'),$('stick'),$('.item-panel'),$('.bottom-left'),$('.bottom-right'),$('.mission')].filter(Boolean);
 const overlay=$('layoutOverlay'),toggle=$('layoutToggle');
 let saved={};
 try{saved=JSON.parse(localStorage.getItem('gmHudLayout')||'{}')}catch(_){}
 controls.forEach(el=>{
  const pos=saved[el.id||el.classList[0]];
  if(pos&&Number.isFinite(pos.x)&&Number.isFinite(pos.y)){
   el.style.left=(pos.x*100)+'%';el.style.top=(pos.y*100)+'%';el.style.right='auto';el.style.bottom='auto';el.style.transform='none';
  }
 });
 $('layoutBtn').onclick=()=>{paused=true;layoutEdit=false;toggle.textContent='MOVE CONTROLS: OFF';overlay.classList.remove('hidden');document.exitPointerLock?.();};
 toggle.onclick=()=>{layoutEdit=!layoutEdit;toggle.textContent='MOVE CONTROLS: '+(layoutEdit?'ON':'OFF');overlay.classList.toggle('layout-moving',layoutEdit);toast(layoutEdit?'DRAG HUD ITEMS TO MOVE':'HUD MOVE MODE OFF');};
 let drag=null,lastX=0,lastY=0;
 const keyOf=el=>el.id||el.classList[0];
 controls.forEach(el=>{
  el.style.touchAction='none';
  el.addEventListener('pointerdown',e=>{
   if(!layoutEdit)return;
   drag=el;lastX=e.clientX;lastY=e.clientY;el.classList.add('layout-dragging');
   el.style.left=el.getBoundingClientRect().left+'px';el.style.top=el.getBoundingClientRect().top+'px';el.style.right='auto';el.style.bottom='auto';el.style.transform='none';
   try{el.setPointerCapture(e.pointerId)}catch(_){}e.preventDefault();e.stopPropagation();
  });
  el.addEventListener('pointermove',e=>{
   if(drag!==el)return;
   const r=el.getBoundingClientRect();const dx=e.clientX-lastX,dy=e.clientY-lastY;lastX=e.clientX;lastY=e.clientY;
   const maxX=Math.max(0,innerWidth-r.width),maxY=Math.max(0,innerHeight-r.height);
   const x=Math.max(0,Math.min(maxX,r.left+dx)),y=Math.max(0,Math.min(maxY,r.top+dy));
   el.style.left=(x/Math.max(1,innerWidth)*100)+'%';el.style.top=(y/Math.max(1,innerHeight)*100)+'%';e.preventDefault();e.stopPropagation();
  });
  const finish=()=>{if(drag!==el)return;drag=null;el.classList.remove('layout-dragging');let data={};controls.forEach(c=>{const r=c.getBoundingClientRect();data[keyOf(c)]={x:Math.max(0,Math.min(1,r.left/Math.max(1,innerWidth))),y:Math.max(0,Math.min(1,r.top/Math.max(1,innerHeight)))}});try{localStorage.setItem('gmHudLayout',JSON.stringify(data))}catch(_){}};
  el.addEventListener('pointerup',finish);el.addEventListener('pointercancel',finish);
 });
 $('layoutReset').onclick=()=>{try{localStorage.removeItem('gmHudLayout')}catch(_){}location.reload()};
 $('layoutDone').onclick=()=>{layoutEdit=false;toggle.textContent='MOVE CONTROLS: OFF';overlay.classList.remove('layout-moving');overlay.classList.add('hidden');paused=false;controls.forEach(c=>c.classList.remove('layout-dragging'));};
 window.addEventListener('resize',()=>{if(layoutEdit)return;let data={};controls.forEach(c=>{const r=c.getBoundingClientRect();data[keyOf(c)]={x:Math.max(0,Math.min(1,r.left/Math.max(1,innerWidth))),y:Math.max(0,Math.min(1,r.top/Math.max(1,innerHeight)))}});try{if(localStorage.getItem('gmHudLayout'))localStorage.setItem('gmHudLayout',JSON.stringify(data))}catch(_){}});
}
function togglePause(){if(!started)return;paused=!paused;$('pauseOverlay').classList.toggle('hidden',!paused);if(paused)document.exitPointerLock?.();else canvas.requestPointerLock?.()}
function swapItem(d){currentItem=(currentItem+d+items.length)%items.length;updateItem();makeHeldItem();toast(items[currentItem].name.toUpperCase()+' EQUIPPED')}
function updateItem(){let it=items[currentItem];$('itemIcon').textContent=it.icon;$('itemName').textContent=it.name;$('itemType').textContent=it.type;$('itemPower').textContent=it.power;$('itemStats').innerHTML=`<span>DMG <b>${it.power}</b></span><span>RANGE <b>${it.range.toFixed(1)}m</b></span><span>SPD <b>${it.speed}</b></span><small>${it.special}</small>`;if($('weaponIndex'))$('weaponIndex').textContent=(currentItem+1)+' / '+items.length+' · SWITCH'}
let heldItemRoot=null,heldItemParts=[];
function clearHeldItem(){
 if(heldItemRoot&&camera)camera.remove(heldItemRoot);
 heldItemParts=[];heldItemRoot=null;
}
function makeHeldItem(){
 clearHeldItem();
 heldItemRoot=new THREE.Group();
 heldItemRoot.position.set(.42,-.34,-.72);
 heldItemRoot.rotation.set(-.15,-.22,-.18);
 camera.add(heldItemRoot);
 const metal=c=>new THREE.MeshStandardMaterial({color:c,metalness:.62,roughness:.32});
 const plastic=c=>new THREE.MeshStandardMaterial({color:c,roughness:.55});
 const part=(geo,material,pos,rot)=>{const m=new THREE.Mesh(geo,material);m.position.set(...pos);if(rot)m.rotation.set(...rot);heldItemRoot.add(m);heldItemParts.push(m);return m};
 const wood=plastic(0x9b633b),yellow=plastic(0xffd43b),pink=plastic(0xff4e8a),blue=plastic(0x42cfff),green=plastic(0x85ce49),steel=metal(0xc4d2e5);
 switch(currentItem){
  case 0: // tawa
   part(new THREE.CylinderGeometry(.23,.23,.055,20),steel,[0,0,0],[Math.PI/2,0,0]);
   part(new THREE.CylinderGeometry(.18,.18,.018,20),plastic(0x34394a),[0,-.005,-.02],[Math.PI/2,0,0]);
   part(new THREE.BoxGeometry(.09,.07,.36),steel,[0,-.01,.25]);
   break;
  case 1: // slipper
   part(new THREE.CapsuleGeometry(.12,.38,4,8),pink,[0,0,0],[0,0,.12]);
   part(new THREE.BoxGeometry(.06,.15,.19),yellow,[0,.09,-.02],[0,0,-.4]);
   break;
  case 2: // belan
   part(new THREE.CylinderGeometry(.075,.075,.62,12),wood,[0,0,0],[Math.PI/2,0,0]);
   part(new THREE.CylinderGeometry(.095,.095,.07,12),yellow,[0,0,-.32],[Math.PI/2,0,0]);
   part(new THREE.CylinderGeometry(.095,.095,.07,12),yellow,[0,0,.32],[Math.PI/2,0,0]);
   break;
  case 3: // banana
   part(new THREE.TorusGeometry(.18,.065,8,14,Math.PI*1.4),yellow,[0,0,0],[0,0,.3]);
   part(new THREE.SphereGeometry(.065,8,6),green,[.12,.02,-.06]);
   break;
  case 4: // broom
   part(new THREE.CylinderGeometry(.035,.035,.68,8),wood,[0,0,0],[Math.PI/2,0,0]);
   part(new THREE.ConeGeometry(.16,.25,8),yellow,[0,0,.38],[Math.PI,0,0]);
   for(let i=0;i<4;i++)part(new THREE.BoxGeometry(.025,.04,.23),plastic(0xb9834d),[-.1+i*.065,0,.45]);
   break;
  case 5: // water balloon
   part(new THREE.SphereGeometry(.2,14,10),blue,[0,0,0]);
   part(new THREE.ConeGeometry(.045,.1,8),plastic(0x4d8cff),[0,.18,0]);
   break;
  case 6: // cushion
   part(new THREE.BoxGeometry(.4,.32,.16),pink,[0,0,0]);
   part(new THREE.BoxGeometry(.22,.025,.17),plastic(0xffb8cf),[0,.12,-.01]);
   break;
 }
}
function animateHeldItem(dt){
 if(!heldItemRoot)return;
 const moving=(keys.KeyW||keys.KeyA||keys.KeyS||keys.KeyD||mobileMove.x||mobileMove.y);
 const sprint=keys.ShiftLeft||keys.ShiftRight;
 const sliding=keys.ControlLeft||keys.ControlRight||slideTime>0;
 const t=clock.elapsedTime;
 const bob=moving?Math.sin(t*(sprint?15:9))*.018:Math.sin(t*2)*.004;
 heldItemRoot.position.set(.42+(moving?Math.cos(t*8)*.012:0),-.34+bob-(sliding?.12:0),-.72);
 heldItemRoot.rotation.x=-.15+(moving?Math.sin(t*(sprint?15:9))*.025:0);
 if(player&&player.userData.attack>0){heldItemRoot.rotation.x-=.45;heldItemRoot.rotation.y=-.42;heldItemRoot.position.z=-.57}
 else {heldItemRoot.rotation.y=-.22}
}

function pickup(){if(playerDown)return;let nearest=null,dist=4;for(let p of pickups){let d=p.position.distanceTo(player.position);if(d<dist){nearest=p;dist=d}}if(nearest){currentItem=nearest.userData.itemIndex;scene.remove(nearest);pickups=pickups.filter(p=>p!==nearest);spawnPickup(rand(-17,17),rand(-13,13),Math.floor(rand(0,items.length)));updateItem();makeHeldItem();toast(items[currentItem].name.toUpperCase()+' PICKED UP!')}else toast('NO ITEM NEARBY — MOVE CLOSER')}
function initBot(bot){
 bot.userData.level=bot.userData.level||1;bot.userData.maxHp=100+(bot.userData.level-1)*18;bot.userData.hp=bot.userData.maxHp;bot.userData.damage=12+(bot.userData.level-1)*2;bot.userData.alive=true;bot.userData.stun=0;bot.userData.attackCd=0;bot.userData.pathTimer=0;bot.userData.path=[];bot.userData.separation=0;
 // Stable approach lane: bots spread across five different angles around the player.
 if(bot.userData.ai===undefined)bot.userData.ai=Math.max(0,bots.length)%5;
 // Larger camera-facing health bar with readable current/max HP.
 const bar=new THREE.Group();bar.position.set(0,2.75,0);bot.add(bar);
 const bg=new THREE.Mesh(new THREE.PlaneGeometry(1.55,.20),new THREE.MeshBasicMaterial({color:0x171321,side:THREE.DoubleSide,depthTest:false,transparent:true,opacity:.96}));bg.renderOrder=20;bar.add(bg);
 const fill=new THREE.Mesh(new THREE.PlaneGeometry(1.43,.105),new THREE.MeshBasicMaterial({color:0x62f59b,side:THREE.DoubleSide,depthTest:false}));fill.position.z=.018;fill.renderOrder=21;bar.add(fill);
 const labelCanvas=document.createElement('canvas');labelCanvas.width=256;labelCanvas.height=64;
 const labelCtx=labelCanvas.getContext('2d');
 const labelTex=new THREE.CanvasTexture(labelCanvas);labelTex.minFilter=THREE.LinearFilter;
 const label=new THREE.Mesh(new THREE.PlaneGeometry(1.45,.30),new THREE.MeshBasicMaterial({map:labelTex,transparent:true,side:THREE.DoubleSide,depthTest:false}));label.position.y=.25;label.position.z=.025;label.renderOrder=22;bar.add(label);
 bot.userData.healthFill=fill;bot.userData.healthBar=bar;bot.userData.healthLabelCanvas=labelCanvas;bot.userData.healthLabelCtx=labelCtx;bot.userData.healthLabelTexture=labelTex;bot.userData.healthLabel=label;bot.userData.flash=0;bot.userData.originalShirt=bot.userData.torso.material.clone();bot.userData.torso.material=bot.userData.originalShirt;
 updateBotHealthDisplay(bot);
}
function updateBotHealthDisplay(bot){
 const ud=bot.userData;if(!ud.healthFill)return;
 const ratio=Math.max(0,Math.min(1,ud.hp/ud.maxHp));
 ud.healthFill.scale.x=Math.max(.001,ratio);ud.healthFill.position.x=-(1.43*(1-ratio))/2;
 ud.healthFill.material.color.set(ratio<.3?0xff315d:ratio<.6?0xffc247:0x62f59b);
 if(ud.healthLabelCtx&&ud.healthLabelTexture){const ctx=ud.healthLabelCtx;ctx.clearRect(0,0,256,64);ctx.font='bold 34px Arial';ctx.textAlign='center';ctx.textBaseline='middle';const txt=Math.ceil(ud.hp)+' / '+Math.ceil(ud.maxHp);ctx.lineWidth=7;ctx.strokeStyle='#171321';ctx.strokeText(txt,128,32);ctx.fillStyle='#ffffff';ctx.fillText(txt,128,32);ud.healthLabelTexture.needsUpdate=true;}
}
function damageBot(bot,amount,knockback){
 if(!bot.userData.alive)return;
 const ud=bot.userData;ud.hp=Math.max(0,ud.hp-amount);ud.stun=.12;ud.flash=.16;
 updateBotHealthDisplay(bot);showBotDamageNumber(bot,amount);
 if(knockback){bot.position.x+=knockback.x;bot.position.z+=knockback.z}
 hitFeedback();toast('BOT LV.'+(ud.level||1)+' HIT  -'+amount+' HP');
 if(ud.hp<=0)registerKill(bot);
}
function showBotDamageNumber(bot,amount){
 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=128;const ctx=canvas.getContext('2d');ctx.font='bold 66px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineWidth=10;ctx.strokeStyle='#26132d';ctx.strokeText('-'+Math.round(amount),128,58);ctx.fillStyle='#fff36b';ctx.fillText('-'+Math.round(amount),128,58);
 const texture=new THREE.CanvasTexture(canvas);texture.minFilter=THREE.LinearFilter;const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:false,depthWrite:false}));sprite.position.set(0,3.35,0);sprite.scale.set(1.35,.68,1);sprite.renderOrder=30;bot.add(sprite);const start=performance.now();
 const update=()=>{if(!sprite.parent){texture.dispose();return}const age=(performance.now()-start)/1000;sprite.position.y=3.35+age*.72;sprite.material.opacity=Math.max(0,1-age/.9);sprite.scale.set(1.35+age*.22,.68+age*.11,1);if(age>=.9){bot.remove(sprite);texture.dispose();sprite.material.dispose();return}requestAnimationFrame(update)};requestAnimationFrame(update);
}
function respawnBot(delay=1800,upgrade={level:1,botId:null}){
 setTimeout(()=>{
  if(!scene)return;
  const colors=[0xff4e8a,0x9b6cff,0xff7b3d,0x25b9a5,0xd9e74e];
  const spots=[[-19,8],[-18,15],[-1,16],[1,17],[19,8]];
  let chosen=spots[Math.floor(Math.random()*spots.length)];
  // Pick a clear spawn, never inside a house or another bot.
  for(let tries=0;tries<12;tries++){
   const candidate=spots[Math.floor(Math.random()*spots.length)];
   if(!blockedAt(candidate[0],candidate[1],0)&&bots.filter(o=>o.userData.alive).every(o=>o.position.distanceTo(new THREE.Vector3(candidate[0],0,candidate[1]))>2.5)){chosen=candidate;break}
  }
  const nb=makeCharacter(chosen[0],chosen[1],colors[Math.floor(rand(0,colors.length))]);
  nb.userData.level=upgrade.level||1;nb.userData.botId=upgrade.botId||("bot-"+Math.random().toString(36).slice(2));
  const laneCounts=[0,0,0,0,0];for(const other of bots){if(other.userData.alive){const lane=((other.userData.ai??0)%5+5)%5;laneCounts[lane]++}}
  nb.userData.ai=laneCounts.indexOf(Math.min(...laneCounts));initBot(nb);bots.push(nb);
  $('botcount').textContent=bots.filter(b=>b.userData.alive).length;
 },delay);
}
function registerKill(bot){
 if(!bot.userData.alive)return;
 const level=(bot.userData.level||1)+1, botId=bot.userData.botId||('bot-'+Math.random().toString(36).slice(2));
 bot.userData.alive=false;scene.remove(bot);kills++;$('kills').textContent=kills;
 $('botcount').textContent=bots.filter(b=>b.userData.alive).length;
 toast('BOT BONKED! TOTAL KOs: '+kills+' • NEXT BOT LVL '+level);respawnBot(1800,{level,botId});
 const milestone=abilityMilestones[abilitiesChosen];if(milestone&&kills>=milestone){abilitiesChosen++;showAbilityChoice(milestone)}
}
function endMatch(won){
 started=false;paused=false;document.exitPointerLock?.();
 $('pauseOverlay').classList.add('hidden');$('overlay').classList.remove('hidden');
 $('overlay').querySelector('h1').innerHTML=won?'GULLY <span>CHAMP!</span>':'GULLY <span>OVER!</span>';
 $('overlay').querySelector('.subtitle').textContent=won?'Time up! You scored '+kills+' KOs. Run it back?':'The bots got you. You scored '+kills+' KOs. Run it back?';
 $('playBtn').textContent='PLAY AGAIN ➜';$('playBtn').onclick=()=>location.reload();
}
function attack(){
 if(playerDown||attackCd>0)return;const it=items[currentItem];attackCd=Math.max(.16,it.cooldown-(activeAbilities.rapid?.12:0));player.userData.attack=.22;
 const forward=new THREE.Vector3(-Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch)).normalize();
 if(it.type.startsWith('THROWABLE')){
  const proj=new THREE.Mesh(new THREE.SphereGeometry(currentItem===5?.24:currentItem===6?.29:.2,12,10),new THREE.MeshStandardMaterial({color:it.color,emissive:it.color,emissiveIntensity:.35}));
  const eye=new THREE.Vector3(player.position.x,player.position.y+(crouch?1.05:1.62),player.position.z);proj.position.copy(eye).add(forward.clone().multiplyScalar(.8));scene.add(proj);
  projectiles.push({mesh:proj,vel:forward.clone().multiplyScalar(currentItem===3?17:currentItem===5?15:12),life:currentItem===6?1.15:1.6,power:it.power,itemIndex:currentItem});toast(it.name.toUpperCase()+' YEETED!');
 }else{
  const eye=new THREE.Vector3(player.position.x,player.position.y+(crouch?1.05:1.62),player.position.z);const facing=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw));
  const targets=[];for(const b of bots){if(!b.userData.alive)continue;const v=b.position.clone().add(new THREE.Vector3(0,1,0)).sub(eye);const d=v.length();const flat=v.clone();flat.y=0;if(d<it.range&&flat.lengthSq()>0&&flat.normalize().dot(facing)>(currentItem===4?-.05:.15)&&!lineBlocked(eye,b.position.clone().add(new THREE.Vector3(0,1,0))))targets.push({bot:b,d})}
  targets.sort((a,b)=>a.d-b.d);const chosen=currentItem===4?targets.slice(0,3):targets.slice(0,1);
  if(chosen.length){for(const {bot,d} of chosen){const push=facing.clone().multiplyScalar(currentItem===0?.95:currentItem===2?.72:currentItem===4?.28:.42);damageBot(bot,it.power+(activeAbilities.strength?10:0),push);if(currentItem===0||currentItem===2)bot.userData.stun=Math.max(bot.userData.stun||0,.28)}if(currentItem===4)toast('JAADHU SWEEP! '+chosen.length+' BOT(S) HIT');}
  else toast('WHIFF! GET CLOSER');
 }
}

let projectiles=[];
function lineBlocked(a,b){
 // Sample the attack/throw path against registered wall and partition boxes.
 const delta=b.clone().sub(a);const steps=Math.max(2,Math.ceil(delta.length()/.25));
 for(let i=1;i<steps;i++){const q=a.clone().addScaledVector(delta,i/steps);for(const c of colliders){if(q.x>c.minX&&q.x<c.maxX&&q.y>c.minY&&q.y<c.maxY&&q.z>c.minZ&&q.z<c.maxZ)return true}}
 return false;
}
function blockedAt(x,z,y){
 const r=.48,bodyH=2.05;
 if(x < -21.5+r || x > 21.5-r || z < -19.5+r || z > 19.5-r)return true;
 for(const c of colliders){
  if(y+bodyH<c.minY||y>c.maxY)continue;
  if(x+r>c.minX&&x-r<c.maxX&&z+r>c.minZ&&z-r<c.maxZ)return true;
 }
 return false;
}
function groundHeightAt(x,z,currentY){
 // Stairs use an explicit ramp-height profile; walking through the stair lane raises the player smoothly.
 for(const cx of [-9,9]){
  const localX=x-(cx+5.0), localZ=z;
  if(Math.abs(localX)<1.05 && localZ>=-4.55 && localZ<=4.55){
   const t=(4.55-localZ)/9.1;
   const level=Math.max(0,Math.min(2,Math.round((currentY-t*STOREY)/STOREY)));
   return level*STOREY+t*STOREY;
  }
  // The room floors are real walkable support surfaces at each storey.
  if(Math.abs(x-cx)<6.35 && z>=-5.35 && z<=6.35){
   const level=Math.max(0,Math.min(3,Math.round(currentY/STOREY)));
   if(Math.abs(currentY-level*STOREY)<STOREY*.58)return level*STOREY;
  }
 }
 return 0;
}
function moveWithCollision(dx,dz){const r=.48;const x=player.position.x,z=player.position.z,y=player.position.y;const clear=(nx,nz)=>nx>=-21.5+r&&nx<=21.5-r&&nz>=-19.5+r&&nz<=19.5-r&&!blockedAt(nx,nz,y)&&bots.filter(b=>b.userData.alive).every(b=>Math.hypot(nx-b.position.x,nz-b.position.z)>r+.42);if(clear(x+dx,z))player.position.x+=dx;if(clear(player.position.x,z+dz))player.position.z+=dz;player.position.x=Math.max(-21.5+r,Math.min(21.5-r,player.position.x));player.position.z=Math.max(-19.5+r,Math.min(19.5-r,player.position.z));}
function updatePlayer(dt){
 if(playerDown){const eye=new THREE.Vector3(player.position.x,player.position.y+1.62,player.position.z);const look=eye.clone().add(new THREE.Vector3(-Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch)).multiplyScalar(8));camera.position.lerp(eye,1-Math.exp(-dt*18));camera.lookAt(look);return;}
 const forward=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw)),right=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw));
 let f=(keys.KeyW?1:0)-(keys.KeyS?1:0)-mobileMove.y,r=(keys.KeyD?1:0)-(keys.KeyA?1:0)+mobileMove.x;
 let dir=forward.multiplyScalar(f).add(right.multiplyScalar(r));if(dir.length()>1)dir.normalize();
 let wantsSprint=keys.ShiftLeft||keys.ShiftRight;
 let sprint=wantsSprint&&stamina>1&&dir.length()>.05;
 let sliding=keys.ControlLeft||keys.ControlRight||slideTime>0;
 if(sliding&&slideTime<=0){slideTime=.62;stamina=Math.max(0,stamina-12)}if(slideTime>0)slideTime-=dt;
 if(sprint){stamina=Math.max(0,stamina-24*dt)}else{stamina=Math.min(100,stamina+17*dt)}
 $('staminaBar').style.width=stamina+'%';$('staminaText').textContent=Math.ceil(stamina);$('staminaBar').style.background=stamina<20?'linear-gradient(90deg,#ff315d,#ff765e)':'linear-gradient(90deg,#42cfff,#8d8bff)';
 let speed=(sliding?14.5:sprint?10.5:crouch?3.1:7.4)*(activeAbilities.speed?1.22:1);
 moveWithCollision(dir.x*speed*dt,dir.z*speed*dt);
 const supportY=groundHeightAt(player.position.x,player.position.z,player.position.y);if(keys.Space&&player.position.y<=supportY+.08)velocityY=8.3;velocityY-=22*dt;player.position.y+=velocityY*dt;if(player.position.y<supportY){player.position.y=supportY;velocityY=0}
 player.rotation.y=yaw;player.scale.y=crouch||sliding?.72:1;
 player.userData.walk+=dt*(dir.length()*(sliding?17:sprint?14:10));const amp=sliding?1.05:sprint?.95:.62;
 player.userData.leg1.rotation.x=Math.sin(player.userData.walk)*amp*dir.length();player.userData.leg2.rotation.x=-Math.sin(player.userData.walk)*amp*dir.length();player.userData.arm1.rotation.x=-Math.sin(player.userData.walk)*.5*dir.length();player.userData.arm2.rotation.x=Math.sin(player.userData.walk)*.5*dir.length();
 player.userData.torso.rotation.x=sliding?.42:crouch?.22:sprint?-.12:0;player.userData.torso.position.y=sliding?1.0:crouch?1.08:1.25;player.userData.head.position.y=sliding?1.55:crouch?1.72:1.91;
 if(player.userData.attack>0){player.userData.attack-=dt;player.userData.arm2.rotation.x=-1.8}else player.userData.arm2.rotation.x=0;
 const eyeHeight=crouch||sliding?1.05:1.62;
 const eye=new THREE.Vector3(player.position.x,player.position.y+eyeHeight,player.position.z);
 const forwardLook=new THREE.Vector3(-Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch));
 // FPS camera is anchored at the player's eye; no shoulder-follow offset or third-person orbit.
 const desiredLook=eye.clone().add(forwardLook.multiplyScalar(8));
 camera.position.lerp(eye,1-Math.exp(-dt*18));
 camera.lookAt(desiredLook);

 if(invuln>0)invuln-=dt;
}
function findBotPath(startX,startZ,goalX,goalZ){
 const minX=-21,minZ=-19,maxX=21,maxZ=19,step=1;
 const key=(x,z)=>x+','+z;
 const toCell=(x,z)=>({x:Math.max(minX,Math.min(maxX,Math.round(x))),z:Math.max(minZ,Math.min(maxZ,Math.round(z)))});
 const start=toCell(startX,startZ);let goal=toCell(goalX,goalZ);
 if(blockedAt(goal.x,goal.z,0)){let found=null;for(let r=1;r<=4&&!found;r++)for(let dx=-r;dx<=r&&!found;dx++)for(let dz=-r;dz<=r&&!found;dz++)if(Math.abs(dx)+Math.abs(dz)===r&&!blockedAt(goal.x+dx,goal.z+dz,0))found={x:goal.x+dx,z:goal.z+dz};if(found)goal=found}
 if(blockedAt(start.x,start.z,0))return [];
 const sk=key(start.x,start.z),gk=key(goal.x,goal.z),open=[{...start,f:0,g:0}],came=new Map(),cost=new Map([[sk,0]]),closed=new Set();
 const dirs=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];let loops=0;
 while(open.length&&loops++<2600){open.sort((a,b)=>a.f-b.f);const cur=open.shift(),ck=key(cur.x,cur.z);if(closed.has(ck))continue;if(ck===gk){const out=[{x:cur.x,z:cur.z}];let k=ck;while(came.has(k)){k=came.get(k);const [x,z]=k.split(',').map(Number);out.push({x,z})}out.reverse();return out.slice(1)}closed.add(ck);
  for(const [dx,dz] of dirs){const nx=cur.x+dx,nz=cur.z+dz;if(nx<minX||nx>maxX||nz<minZ||nz>maxZ||blockedAt(nx,nz,0))continue;if(dx&&dz&&(blockedAt(cur.x+dx,cur.z,0)||blockedAt(cur.x,cur.z+dz,0)))continue;const nk=key(nx,nz),ng=cur.g+(dx&&dz?1.414:1);if(ng>=(cost.get(nk)??Infinity))continue;cost.set(nk,ng);came.set(nk,ck);open.push({x:nx,z:nz,g:ng,f:ng+Math.hypot(goal.x-nx,goal.z-nz)})}
 }
 return [];
}
function updateBots(dt){
 const alive=bots.filter(b=>b.userData.alive);
 for(let b of alive){
  const ud=b.userData;if(activeAbilities.freezeUntil>performance.now()){ud.stun=Math.max(ud.stun||0,.1);continue}ud.walk+=dt*8;ud.attackCd=Math.max(0,(ud.attackCd||0)-dt);ud.pathTimer-=dt;ud.flash=Math.max(0,(ud.flash||0)-dt);
  if(ud.flash>0){ud.torso.material.emissive.setHex(0xff263f);ud.torso.material.emissiveIntensity=.7}else{ud.torso.material.emissive.setHex(0x000000);ud.torso.material.emissiveIntensity=0}
  if(ud.healthBar){ud.healthBar.quaternion.copy(camera.quaternion);const d=camera.position.distanceTo(b.position);const s=THREE.MathUtils.clamp(d*.045,1,2.15);ud.healthBar.scale.setScalar(s);}
  if(ud.stun>0){ud.stun-=dt;continue}
  // Surrounding AI: assign each bot a different approach lane around the player.
  // Five lanes prevent the whole squad from chasing in one straight queue.
  const target=player.position.clone();
  const direct=new THREE.Vector3(target.x-b.position.x,0,target.z-b.position.z);const dist=direct.length();
  if(dist>.0001)direct.normalize();
  const lane=((ud.ai??Math.max(0,bots.indexOf(b)))%5+5)%5;
  const laneAngle=(lane/5)*Math.PI*2 + (Math.sin((ud.ai??lane)*2.17)*.16);
  const ringRadius=dist>4?2.15:1.35;
  const goalX=target.x+Math.cos(laneAngle)*ringRadius;
  const goalZ=target.z+Math.sin(laneAngle)*ringRadius;
  if(ud.pathTimer<=0||!ud.path||!ud.path.length||Math.hypot((ud.lastGoalX??999)-goalX,(ud.lastGoalZ??999)-goalZ)>1.25){ud.path=findBotPath(b.position.x,b.position.z,goalX,goalZ);ud.pathTimer=.35;ud.lastGoalX=goalX;ud.lastGoalZ=goalZ}
  while(ud.path.length&&Math.hypot(ud.path[0].x-b.position.x,ud.path[0].z-b.position.z)<.7)ud.path.shift();
  let desired=ud.path.length?new THREE.Vector3(ud.path[0].x-b.position.x,0,ud.path[0].z-b.position.z).normalize():direct.clone();
  const speed=4.25;
  const lookAhead=.7;
  const blocked=(dir)=>blockedAt(b.position.x+dir.x*lookAhead,b.position.z+dir.z*lookAhead,b.position.y);
  if(blocked(desired)){ud.pathTimer=0;desired.set(0,0,0)}
  // Keep bots from stacking inside one another; they actively spread apart.
  const sep=new THREE.Vector3();let neighbours=0;
  for(const o of alive){if(o===b)continue;const dx=b.position.x-o.position.x,dz=b.position.z-o.position.z,dd=Math.hypot(dx,dz);if(dd>0&&dd<1.35){sep.x+=dx/dd*(1.35-dd);sep.z+=dz/dd*(1.35-dd);neighbours++}}
  if(neighbours){sep.multiplyScalar(1.5);desired.add(sep).normalize()}
  if(dist>1.35&&desired.lengthSq()>.001){
   const step=desired.multiplyScalar(speed*dt);const nx=b.position.x+step.x,nz=b.position.z+step.z;
   if(!blockedAt(nx,b.position.z,b.position.y))b.position.x=nx;
   if(!blockedAt(b.position.x,nz,b.position.y))b.position.z=nz;
   b.rotation.y=Math.atan2(-desired.x,-desired.z);
   ud.leg1.rotation.x=Math.sin(ud.walk)*.85;ud.leg2.rotation.x=-Math.sin(ud.walk)*.85;
   ud.arm1.rotation.x=Math.sin(ud.walk)*.5;ud.arm2.rotation.x=-Math.sin(ud.walk)*.5;
  }
  // Strong, readable close-range hits with a visible screen flash and cooldown.
  if(!playerDown&&dist<1.85&&ud.attackCd<=0&&invuln<=0){
   health=Math.max(0,health-(ud.damage||12));lastDamageAt=performance.now();updateHealthHud();showDamageFeedback();invuln=.55;ud.attackCd=.9;ud.stun=.08;
   if(health<=0&&!playerDown){playerDown=true;invuln=99;mobileMove.x=mobileMove.y=0;$('respawnOverlay').classList.remove('hidden');$('pauseOverlay').classList.add('hidden');toast('KNOCKED OUT! TAP RESPAWN')}
  }
 }
}
function showDamageFeedback(){const el=$('damageFlash');if(!el)return;el.classList.remove('active');void el.offsetWidth;el.classList.add('active')}
function updateProjectiles(dt){
 for(let i=projectiles.length-1;i>=0;i--){let p=projectiles[i];p.life-=dt;const previous=p.mesh.position.clone();p.vel.y-=12*dt;p.mesh.position.add(p.vel.clone().multiplyScalar(dt));
  let hit=null;for(let b of bots){if(b.userData.alive&&b.position.clone().add(new THREE.Vector3(0,1,0)).distanceTo(p.mesh.position)<1.15){hit=b;break}}
  const wallHit=lineBlocked(previous,p.mesh.position);
  if(hit){const away=p.vel.clone().setY(0).normalize().multiplyScalar(p.itemIndex===6?.95:.35);damageBot(hit,p.power+(activeAbilities.strength?10:0),away);hit.userData.stun=Math.max(hit.userData.stun||0,p.itemIndex===3?1.8:p.itemIndex===5?.85:p.itemIndex===6?.42:.28);
   if(p.itemIndex===5){for(const b of bots){if(b!==hit&&b.userData.alive&&b.position.distanceTo(hit.position)<3.0){damageBot(b,Math.ceil(p.power*.55)+(activeAbilities.strength?5:0),b.position.clone().sub(hit.position).setY(0).normalize().multiplyScalar(.2));b.userData.stun=Math.max(b.userData.stun||0,.65)}}}
   p.life=0}
  if(wallHit||p.life<=0||p.mesh.position.y<0){scene.remove(p.mesh);projectiles.splice(i,1)}
 }
}
function updatePickups(t){for(let p of pickups){p.position.y=p.userData.baseY+Math.sin(t*2+p.userData.phase)*.18;p.rotation.y=t*.7}}
function drawMap(){
 const c=$('minimap'),ctx=c.getContext('2d'),w=c.width,h=c.height;ctx.clearRect(0,0,w,h);
 // Detailed overhead neighbourhood map: pavement, lane, house footprints, bridges and alley props.
 ctx.fillStyle='#1c2a3b';ctx.fillRect(0,0,w,h);
 ctx.fillStyle='#344c5b';ctx.fillRect(0,0,w, h);
 ctx.fillStyle='#a6a18d';ctx.fillRect(0,8,w,12);ctx.fillRect(0,h-20,w,12);
 ctx.fillStyle='#5c6b72';ctx.fillRect(0,h*.43,w,h*.17);
 ctx.strokeStyle='#f2d8a1';ctx.lineWidth=1.5;ctx.setLineDash([7,6]);ctx.beginPath();ctx.moveTo(0,h*.515);ctx.lineTo(w,h*.515);ctx.stroke();ctx.setLineDash([]);
 // Building footprints with inner room partitions.
 ctx.fillStyle='#e87561';ctx.fillRect(w*.07,h*.14,w*.30,h*.70);
 ctx.fillStyle='#5798e9';ctx.fillRect(w*.63,h*.14,w*.30,h*.70);
 ctx.strokeStyle='#ffe0a0';ctx.lineWidth=2;ctx.strokeRect(w*.07,h*.14,w*.30,h*.70);ctx.strokeRect(w*.63,h*.14,w*.30,h*.70);
 ctx.strokeStyle='rgba(255,245,220,.7)';ctx.lineWidth=1;
 for(const bx of [w*.07,w*.63]){ctx.beginPath();ctx.moveTo(bx+w*.15,h*.14);ctx.lineTo(bx+w*.15,h*.84);ctx.moveTo(bx,h*.37);ctx.lineTo(bx+w*.30,h*.37);ctx.moveTo(bx,h*.61);ctx.lineTo(bx+w*.30,h*.61);ctx.stroke();}
 // Bridges at upper levels and courtyard access strips.
 ctx.fillStyle='#d5b46c';ctx.fillRect(w*.37,h*.30,w*.26,h*.07);ctx.fillRect(w*.37,h*.64,w*.26,h*.07);
 ctx.fillStyle='#42d5ed';for(let i=0;i<6;i++){ctx.fillRect(w*.39+i*w*.038,h*.31,2,h*.05);ctx.fillRect(w*.39+i*w*.038,h*.65,2,h*.05)}
 // Shop stalls and tree planters around the edges.
 for(let i=0;i<4;i++){ctx.fillStyle=['#ffd43b','#42e8ff','#ff709c','#b9ff4b'][i];ctx.fillRect(w*(.05+i*.24),h*(i%2?.89:.04),w*.13,h*.045)}
 for(const [tx,ty] of [[.05,.28],[.94,.28],[.05,.72],[.94,.72],[.25,.92],[.76,.92]]){ctx.fillStyle='#36c777';ctx.beginPath();ctx.arc(w*tx,h*ty,3.5,0,Math.PI*2);ctx.fill()}
 // Player, living bots, and item pickups.
 const dot=(x,z,col,r)=>{ctx.fillStyle=col;ctx.beginPath();ctx.arc((x+23)/46*w,(z+21)/42*h,r,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#152333';ctx.lineWidth=1;ctx.stroke()};
 for(let p of pickups)dot(p.position.x,p.position.z,'#d8ff4b',2.5);
 for(let b of bots)if(b.userData.alive)dot(b.position.x,b.position.z,'#ff4e8a',3.2);
 dot(player.position.x,player.position.z,'#42e8ff',4.2);
}
function animate(){
 requestAnimationFrame(animate);let dt=Math.min(clock.getDelta(),.04),t=clock.elapsedTime;
 if(started&&!paused){if(!playerDown&&health<100&&performance.now()-lastDamageAt>4000){health=Math.min(100,health+7*dt);updateHealthHud()}matchTime=Math.max(0,matchTime-dt);$('clock').textContent=String(Math.floor(matchTime/60)).padStart(2,'0')+':'+String(Math.floor(matchTime%60)).padStart(2,'0');attackCd=Math.max(0,attackCd-dt);updatePlayer(dt);animateHeldItem(dt);updateBots(dt);updateProjectiles(dt);updatePickups(t);drawMap();if(matchTime<=0)endMatch(true)}
 else {camera.position.set(0,10,24);camera.lookAt(0,5,0);updatePickups(t)}
 renderer.render(scene,camera);
}
try{setup()}catch(e){$('loading').innerHTML='<div class="load-logo">GULLY <span>MASTI</span></div><p>Could not start WebGL. Try Chrome or Edge with hardware acceleration enabled.</p><small>'+e.message+'</small>'}
})();