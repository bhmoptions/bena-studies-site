import * as T from 'three';
import { mergeGeometries } from '../../../../../assets/vendor/three/BufferGeometryUtils.js';
export const COLORS = { blue: '#58b9e3', red: '#e97865', yellow: '#efc459', purple: '#b495e8' };
export const LABELS = { blue: 'Azul', red: 'Vermelho', yellow: 'Amarelo', purple: 'Roxo' };
export const ANGLES = { blue: 0, red: Math.PI / 2, yellow: Math.PI, purple: -Math.PI / 2 };
export function createWorkshopAssets() {
  const geometries = new Map(), materials = new Set(), textures = new Set();
  const geometry = (key, make) => { if (!geometries.has(key)) geometries.set(key, make()); return geometries.get(key); };
  const material = options => { const m = new T.MeshStandardMaterial(options); materials.add(m); return m; };
  const texture = canvas => { const t = new T.CanvasTexture(canvas); t.colorSpace = T.SRGBColorSpace; textures.add(t); return t; };
  function canvas(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return c; }
  // Original procedural grain: no reference photograph is embedded in the game.
  const grain = texture(canvas(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#6e3e25'; ctx.fillRect(0, 0, w, h);
    let seed = 891; const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 850; i++) {
      const y = random() * h, thickness = random() * 2 + 0.3;
      ctx.strokeStyle = random() > .5 ? 'rgba(30,12,4,.16)' : 'rgba(239,171,99,.12)';
      ctx.lineWidth = thickness; ctx.beginPath(); ctx.moveTo(0, y);
      ctx.bezierCurveTo(140, y + random() * 16, 370, y - random() * 16, w, y + random() * 8); ctx.stroke();
    }
  }));
  grain.wrapS = grain.wrapT = T.RepeatWrapping;
  const patina = texture(canvas(256, 256, (ctx,w,h) => {
    ctx.fillStyle='#e0d1b7';ctx.fillRect(0,0,w,h);
    let seed=1723;const random=()=>((seed=seed*16807%2147483647)/2147483647);
    for(let i=0;i<4200;i++){
      ctx.fillStyle=i%3?'rgba(73,58,37,.12)':'rgba(255,248,207,.15)';
      ctx.fillRect(random()*w,random()*h,random()*2+.3,random()*2+.3);
    }
    ctx.strokeStyle='rgba(72,51,24,.08)';ctx.lineWidth=.6;
    for(let i=0;i<65;i++){const y=random()*h;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y+random()*4);ctx.stroke();}
  }));
  const brass = material({ color: '#bc9556', map: patina, metalness: .78, roughness: .29 });
  const bronze = material({ color: '#785033', map: patina, metalness: .72, roughness: .4 });
  const dark = material({ color: '#243438', metalness: .62, roughness: .38 });
  const wood = material({ color: '#c6a27f', map: grain, roughness: .42, metalness: .06 });
  const blackWood = material({ color: '#402b23', map: grain, roughness: .53 });
  const ivory = material({ color: '#ecddb3', roughness: .76 });
  const glass = material({ color: '#c9f2ef', transparent: true, opacity: .19, metalness: .12, roughness: .12, depthWrite: false, side: T.DoubleSide });
  const colors = Object.fromEntries(Object.entries(COLORS).map(([k, color]) => [k, material({ color, metalness: .35, roughness: .27 })]));
  const balls = material({ color: '#f2ae53', metalness: .12, roughness: .24 });
  function mesh(parent, geo, mat, x = 0, y = 0, z = 0) {
    const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  }
  function cube(parent, w, h, d, mat, x = 0, y = 0, z = 0, bevel = .04) {
    const key = ['box', w, h, d, bevel].join(':');
    const g = geometry(key, () => {
      const s = new T.Shape(), a = w / 2 - bevel, b = h / 2 - bevel;
      s.moveTo(-a, -b); s.lineTo(a, -b); s.lineTo(a, b); s.lineTo(-a, b); s.closePath();
      const geo = new T.ExtrudeGeometry(s, { depth: Math.max(.001, d - bevel * 2), bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, steps: 1, curveSegments: 1 });
      geo.translate(0, 0, -d / 2 + bevel); return geo;
    });
    return mesh(parent, g, mat, x, y, z);
  }
  function cylinder(parent, r, height, mat, x = 0, y = 0, z = 0, r2 = r) {
    return mesh(parent, geometry(['cyl', r, r2, height].join(':'), () => new T.CylinderGeometry(r, r2, height, 32)), mat, x, y, z);
  }
  function sphere(parent, radius, mat, x, y, z) {
    return mesh(parent, geometry('sphere' + radius, () => new T.SphereGeometry(radius, 12, 8)), mat, x, y, z);
  }
  function ring(parent, radius, tube, mat, x = 0, y = 0, z = 0) {
    return mesh(parent, geometry(['ring', radius, tube].join(':'), () => new T.TorusGeometry(radius, tube, 8, 48)), mat, x, y, z);
  }
  function line(parent, points, mat, thickness = .018) {
    const curve = new T.CatmullRomCurve3(points.map(v => new T.Vector3(...v)));
    const g = new T.TubeGeometry(curve, 20, thickness, 5, false); geometries.set(g.uuid, g); return mesh(parent, g, mat);
  }
  function label(parent, text, w, h, x, y, z, color = '#32291c', bg = '#e9d9ae', fontSize = 46) {
    const c = canvas(512, Math.round(512 * h / w), (ctx, width, height) => {
      if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, width, height); }
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = color;
      ctx.font = 'bold ' + fontSize + 'px Georgia'; ctx.fillText(text, width / 2, height / 2, width - 18);
    });
    const m = new T.MeshBasicMaterial({ map: texture(c), transparent: !bg, side: T.DoubleSide }); materials.add(m);
    return mesh(parent, geometry('plane' + w + ':' + h, () => new T.PlaneGeometry(w, h)), m, x, y, z);
  }
  function gear(parent, radius, x, y, z, mat = brass, teeth = 18) {
    const g = new T.Group(); g.position.set(x, y, z); parent.add(g);
    ring(g, radius * .73, radius * .15, mat);
    ring(g, radius * .25, radius * .1, bronze);
    for (let i = 0; i < teeth; i++) {
      const a = i * Math.PI * 2 / teeth;
      const tooth = cube(g, radius * .23, radius * .28, .09, mat, Math.sin(a) * radius * .91, Math.cos(a) * radius * .91, 0, .01);
      tooth.rotation.z = -a;
    }
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3;
      cube(g, .045, radius * .63, .06, mat, Math.sin(a) * radius * .42, Math.cos(a) * radius * .42).rotation.z = -a;
    }
    return g;
  }
  // Consolidate static ornamentation by material; keep mechanical parts independently movable.
  function batch(root) {
    root.updateMatrixWorld(true);
    const inverse = root.matrixWorld.clone().invert(), bins = new Map(), remove = [];
    function visit(node) {
      if (node !== root && node.userData.dynamic) return;
      if (node.isMesh && !Array.isArray(node.material)) {
        const g = node.geometry.clone().applyMatrix4(new T.Matrix4().multiplyMatrices(inverse, node.matrixWorld));
        if (g.index) { const nonindexed = g.toNonIndexed(); g.dispose(); bins.has(node.material) || bins.set(node.material, []); bins.get(node.material).push(nonindexed); }
        else { bins.has(node.material) || bins.set(node.material, []); bins.get(node.material).push(g); }
        remove.push(node);
      }
      for (const child of node.children) visit(child);
    }
    visit(root); remove.forEach(m => m.removeFromParent());
    for (const [mat, list] of bins) {
      const g = mergeGeometries(list, false); list.forEach(geo => geo.dispose());
      geometries.set(g.uuid, g); mesh(root, g, mat);
    }
  }
  function makeBox() {
    const root = new T.Group(), faces = {};
    cube(root, 3.05, .22, 3.05, bronze, 0, .22);
    cube(root, 2.86, .15, 2.86, brass, 0, .38);
    cube(root, 2.68, .13, 2.68, blackWood, 0, .48);
    // Hollow cavity: four walls, with a real interior for the stored scroll.
    for (const [side, angle] of Object.entries(ANGLES)) {
      const mount = new T.Group(); mount.rotation.y = angle; root.add(mount);
      const hinge = new T.Group(); hinge.position.set(-1.28,0,1.32); hinge.userData.dynamic=true; mount.add(hinge);
      const face = new T.Group(); face.position.set(1.28,0,-1.32); hinge.add(face);
      cube(face, 2.7, 2.3, .15, wood, 0, 1.62, 1.28);
      const backlight=material({color:'#181b16',emissive:({blue:'#0876ff',red:'#ff3212',yellow:'#ffa900',purple:'#7d24ff'})[side],emissiveIntensity:.008,roughness:.52,metalness:.22});
      cube(face, 2.25, 1.89, .09, backlight, 0, 1.58, 1.39);
      for (const x of [-1.29, 1.29]) cube(face, .13, 2.35, .18, brass, x, 1.6, 1.4);
      for (const y of [.56, 2.67]) cube(face, 2.72, .12, .2, brass, 0, y, 1.4);
      const glow = material({ color: COLORS[side], emissive: COLORS[side], emissiveIntensity: .06, metalness: .4, roughness: .27 });
      ring(face, .79, .042, brass, 0, 1.6, 1.49);
      ring(face, .67, .022, glow, 0, 1.6, 1.52);
      ring(face, .59, .055, bronze, 0, 1.6, 1.54);
      const mechanism = gear(face, .49, 0, 1.6, 1.57, brass, 20); mechanism.userData.dynamic = true; batch(mechanism);
      ring(mechanism, .31, .023, glow);
      const emblem = cube(mechanism, .28, .28, .12, glow, 0, 0, .08); emblem.rotation.z = Math.PI / 4;
      let smallGear=null;
      if(side==='red'){
        smallGear = gear(face, .23, -.84, .85, 1.51, bronze, 14); smallGear.userData.dynamic = true; batch(smallGear);
      }
      for (const sign of [-1, 1]) {
        line(face, [[sign * .2, 2.37, 1.51], [sign * .5, 2.23, 1.51], [sign * .8, 2.36, 1.51], [sign * .98, 2.19, 1.51]], brass, .032);
        line(face, [[sign * .64, 1.03, 1.5], [sign * .87, 1.28, 1.5], [sign * 1.04, 1.72, 1.5], [sign * .88, 2.02, 1.5]], brass, .026);
        for (const y of [.64, 2.57]) sphere(face, .047, brass, sign * 1.17, y, 1.53);
      }
      for (let i = 0; i < 12; i++) {
        const a = i * Math.PI / 6;
        const detail = cube(face, .025, .083, .025, glow, Math.sin(a) * .73, 1.6 + Math.cos(a) * .73, 1.54, .005); detail.rotation.z = -a;
      }
      let bolt=null,knob=null;
      if(side==='purple'){
        bolt = new T.Group(); bolt.position.set(.83, .84, 1.53); bolt.userData.dynamic = true; face.add(bolt);
        cube(bolt, .48, .14, .16, brass);
        const buttonMat=material({color:'#258568',emissive:'#194b39',emissiveIntensity:.22,roughness:.25,metalness:.45});
        knob=cylinder(bolt,.105,.1,buttonMat,0,0,.13);knob.rotation.x=Math.PI/2;
      }
      const innerLight=new T.PointLight(COLORS[side],0,3,2);innerLight.position.set(0,1.65,1.65);face.add(innerLight);
      // A narrow gold grille leaves the colored, backlit panel visible between its ribs.
      for(let i=0;i<16;i++){
        const a=i*Math.PI/8, r=.89;
        const rib=cube(face,.024,.15,.026,bronze,Math.sin(a)*r,1.6+Math.cos(a)*r,1.46,.005);rib.rotation.z=-a;
      }
      batch(face);
      faces[side] = { group: mount, panel: face, hinge, gear: mechanism, smallGear, bolt, knob, emblem, glow, backlight, innerLight, color:COLORS[side], progress: 0 };
    }
    for (const x of [-1.28, 1.28]) for (const z of [-1.28, 1.28]) {
      sphere(root, .18, bronze, x, .12, z); cylinder(root, .115, 2.4, brass, x, 1.63, z);
    }
    const lid = new T.Group(); lid.position.set(0, 2.83, -1.45); lid.userData.dynamic = true; root.add(lid);
    cube(lid, 3.02, .2, 3.02, brass, 0, 0, 1.45);
    cube(lid, 2.78, .16, 2.78, wood, 0, .13, 1.45);
    const crown = gear(lid, .6, 0, .24, 1.45, brass, 24); crown.rotation.x = -Math.PI / 2;
    ring(lid, .81, .025, brass, 0, .24, 1.45).rotation.x = Math.PI / 2;
    for (const x of [-1.05, 1.05]) cylinder(root, .13, .35, bronze, x, 2.8, -1.46).rotation.z = Math.PI / 2;
    batch(lid); batch(root);
    return { root, faces, lid };
  }
  function makeFlask(value, side = 'blue', size = 1) {
    const root = new T.Group();
    // Taller body: shoulder and neck shifted up +0.20 so balls have room to breathe.
    const points = [[0,.015],[.23,.015],[.27,.07],[.275,.56],[.23,.92],[.115,1.00],[.115,1.16],[.10,1.19]];
    const geo = geometry('flask-body', () => new T.LatheGeometry(points.map(([x,y]) => new T.Vector2(x,y)), 28));
    mesh(root, geo, glass);
    ring(root, .22, .017, brass, 0, .045).rotation.x = Math.PI / 2;
    cylinder(root, .119, .105, bronze, 0, 1.19);
    cylinder(root, .124, .035, colors[side], 0, 1.245);
    const beadGeo = geometry('ball', () => new T.SphereGeometry(.083, 12, 8));
    const beads = new T.InstancedMesh(beadGeo, balls, value); beads.castShadow = true;
    const transform = new T.Object3D();
    // Front-visible rows: the mathematical count is the actual instance count.
    for (let i = 0; i < value; i++) {
      const row = Math.floor(i / 3), col = i % 3;
      transform.position.set((col - 1) * .162, .14 + row * .19, row % 2 ? .035 : -.025);
      transform.updateMatrix(); beads.setMatrixAt(i, transform.matrix);
    }
    root.add(beads); beads.userData.dynamic = true;
    label(root, String(value), .17, .14, 0, .90, .119, '#35291d', '#f2deb1', 100);
    // Glass highlights keep the vessel silhouette legible without hiding the balls.
    line(root, [[-.19,.12,.19],[-.22,.36,.17],[-.19,.73,.17],[-.08,.92,.08]], ivory, .008);
    root.scale.setScalar(size); batch(root);
    return root;
  }
  function makeHintPaper(side, target, hint = null) {
    const root=new T.Group(), paperColors={blue:'#8cdbef',red:'#f3ad9f',yellow:'#f5d56f',purple:'#cbb2ed'};
    const c=canvas(900,560,(ctx,w,h)=>{
      ctx.fillStyle=paperColors[side];ctx.fillRect(0,0,w,h);
      const shade=ctx.createLinearGradient(0,0,w,h);shade.addColorStop(0,'rgba(255,255,255,.34)');shade.addColorStop(.55,'rgba(255,255,255,0)');shade.addColorStop(1,'rgba(76,47,25,.13)');ctx.fillStyle=shade;ctx.fillRect(0,0,w,h);
      ctx.strokeStyle=COLORS[side];ctx.lineWidth=15;ctx.strokeRect(25,25,w-50,h-50);
      ctx.fillStyle=COLORS[side];ctx.save();ctx.translate(160,82);ctx.rotate(Math.PI/4);ctx.fillRect(-18,-18,36,36);ctx.restore();
      ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillStyle='#513d2e';ctx.font='bold 34px Arial';ctx.fillText('DICA',200,82);
      ctx.textAlign='center';ctx.font='italic 64px Georgia';
      if(side==='purple'){
        ctx.fillText('Mesmo número,',w/2,245);ctx.fillText('contas diferentes...',w/2,325);
        ctx.font='34px Arial';ctx.fillText('Os dois pratos devem usar frascos diferentes entre si.',w/2,421);ctx.fillText('Cada prato deve usar o mesmo tipo de frasco.',w/2,461);
      }else{
        const title = hint?.title || 'Alcance a marca';
        const expr = hint?.expression || (String(target) + ' bolinhas');
        ctx.fillText(title, w / 2, 245);
        ctx.font = 'bold 98px Georgia';
        ctx.fillText(expr, w / 2, 345);
        ctx.font = '34px Arial';
        ctx.fillText('Forme grupos de frascos iguais.', w / 2, 431);
      }
    });
    const mat=new T.MeshBasicMaterial({map:texture(c),side:T.DoubleSide});materials.add(mat);
    const sheet=mesh(root,geometry('hint-paper',()=>new T.PlaneGeometry(2.12,1.32)),mat,0,.035,0);sheet.rotation.x=-Math.PI/2;
    return root;
  }
  function makeDial(side, target) {
    const root = new T.Group();
    cube(root, 2.02, .14, 1.49, blackWood, 0, .13);
    cube(root, 1.87, .08, 1.35, brass, 0, .24);
    for (const x of [-.69,.69]) sphere(root, .16, bronze, x, .10, .42);
    cube(root, .62, .92, .49, bronze, 0, .74, -.11);
    const body = cylinder(root, .75, .36, bronze, 0, 1.09, .02); body.rotation.x = Math.PI / 2;
    ring(root, .71, .055, brass, 0, 1.09, .245);
    ring(root, .66, .025, colors[side], 0, 1.09, .28);
    const dialCanvas = canvas(512,512,(ctx) => {
      ctx.fillStyle = '#ecdfbb'; ctx.beginPath(); ctx.arc(256,256,248,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle = '#6c583e';ctx.lineWidth=3;ctx.beginPath();ctx.arc(256,256,231,0,Math.PI*2);ctx.stroke();
      for(let n=0;n<=100;n+=2) {
        const a=(-135+n*2.7)*Math.PI/180, big=n%10===0;
        ctx.strokeStyle='#483c2c';ctx.lineWidth=big?4:2;ctx.beginPath();
        ctx.moveTo(256+Math.sin(a)*207,256-Math.cos(a)*207);
        ctx.lineTo(256+Math.sin(a)*(big?183:194),256-Math.cos(a)*(big?183:194));ctx.stroke();
        if(big){ctx.font='bold 29px Georgia';ctx.fillStyle='#3c3226';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(n),256+Math.sin(a)*159,256-Math.cos(a)*159);}
      }
      const a=(-135+target*2.7)*Math.PI/180;
      ctx.strokeStyle=COLORS[side];ctx.lineWidth=15;ctx.beginPath();ctx.arc(256,256,220,a-Math.PI/2-.07,a-Math.PI/2+.07);ctx.stroke();
      ctx.fillStyle='#6b5336';ctx.font='20px Georgia';ctx.textAlign='center';ctx.fillText('BOLINHAS',256,359);
    });
    const mat = new T.MeshBasicMaterial({ map: texture(dialCanvas) });materials.add(mat);
    mesh(root,geometry('dial-disc',()=>new T.CircleGeometry(.64,64)),mat,0,1.09,.286);
    const needle=new T.Group();needle.position.set(0,1.09,.319);needle.userData.dynamic=true;root.add(needle);
    const needleShape=new T.Shape();needleShape.moveTo(-.029,-.12);needleShape.lineTo(.025,-.12);needleShape.lineTo(.012,.47);needleShape.lineTo(0,.55);needleShape.lineTo(-.012,.47);
    const ng=new T.ShapeGeometry(needleShape);geometries.set(ng.uuid,ng);mesh(needle,ng,dark);
    sphere(root,.068,brass,0,1.09,.35);
    cylinder(root,.13,.24,brass,0,1.87,-.08);
    const pan=new T.Group();pan.position.set(0,1.96,-.08);pan.userData.dynamic=true;root.add(pan);
    const bowlGeo=geometry('dial-bowl',()=>new T.LatheGeometry([[0,0],[.55,0],[.81,.04],[.98,.13],[.99,.15],[.97,.17],[.94,.13],[.8,.085],[.55,.05],[0,.05]].map(([x,y])=>new T.Vector2(x,y)),48));
    mesh(pan,bowlGeo,brass);
    ring(pan,.98,.03,brass,0,.15).rotation.x=Math.PI/2;
    for(const sign of [-1,1]) {
      line(root,[[sign*.13,.34,.27],[sign*.48,.46,.27],[sign*.57,.68,.27],[sign*.36,.82,.27]],brass,.024);
      for(const z of [-.5,.5])sphere(root,.036,bronze,sign*.76,.295,z);
    }
    // Ornate reverse and side plates remain finished when orbiting past a scale.
    ring(root,.54,.025,brass,0,1.09,-.177);
    ring(root,.43,.018,colors[side],0,1.09,-.184);
    for(let i=0;i<8;i++){
      const a=i*Math.PI/4;
      sphere(root,.027,brass,Math.sin(a)*.6,1.09+Math.cos(a)*.6,-.19);
      const spoke=cube(root,.025,.32,.028,brass,Math.sin(a)*.28,1.09+Math.cos(a)*.28,-.19,.006);spoke.rotation.z=-a;
    }
    sphere(root,.1,bronze,0,1.09,-.23);
    const decor=gear(root,.14,.53,.49,.29,brass,12);
    batch(pan);batch(root);
    return { root,needle,pans:{left:pan},total:0,decor };
  }
  function makeBalance() {
    const root=new T.Group();
    cylinder(root,1.47,.2,blackWood,0,.12,0,1.51);cylinder(root,1.42,.04,brass,0,.24);
    cylinder(root,.23,.2,bronze,0,.36);cylinder(root,.07,2.27,brass,0,1.5);
    for(const x of [-.16,.16]) line(root,[[x,.45,0],[x*1.6,1.2,0],[x,2.55,0],[0,2.74,0]],bronze,.035);
    ring(root,.16,.036,brass,0,2.78,0);
    const beam=new T.Group();beam.position.y=2.39;beam.userData.dynamic=true;root.add(beam);
    cube(beam,3.34,.12,.15,brass,0,0,0);
    for(const sign of [-1,1]) line(beam,[[0,-.1,0],[sign*.7,-.10,0],[sign*1.37,.1,0],[sign*1.66,0,0]],bronze,.045);
    sphere(beam,.13,colors.purple,0,0,.12);
    const pans={};
    for(const [panName,x] of [['left',-1.55],['right',1.55]]) {
      const suspension=new T.Group();suspension.position.x=x;suspension.userData.dynamic=true;beam.add(suspension);
      for(const [px,pz] of [[-.63,0],[.53,.43],[.53,-.43]]) {
        line(suspension,[[0,0,0],[px,-1.21,pz]],bronze,.015);
        for(let i=1;i<17;i++) {
          const f=i/17;
          const link=ring(suspension,.027,.006,brass,px*f,-1.21*f,pz*f);link.rotation.y=i%2?Math.PI/2:0;
        }
      }
      const pan=new T.Group();pan.position.y=-1.22;suspension.add(pan);
      mesh(pan,geometry('balance-bowl',()=>new T.LatheGeometry([[0,0],[.5,0],[.67,.04],[.8,.14],[.81,.16],[.78,.18],[.67,.08],[.5,.04],[0,.04]].map(([x,y])=>new T.Vector2(x,y)),40)),brass);ring(pan,.79,.03,brass,0,.16,0).rotation.x=Math.PI/2;
      batch(suspension);pans[panName]=pan;pan.userData.suspension=suspension;
    }
    batch(beam);batch(root);
    return {root,beam,pans,tilt:0};
  }
  function makeTable() {
    const root=new T.Group();
    cylinder(root,7.65,.4,blackWood,0,-.32,0,7.75);
    cylinder(root,7.62,.08,wood,0,-.09);
    ring(root,7.52,.04,brass,0,-.025).rotation.x=Math.PI/2;
    ring(root,3.17,.012,brass,0,-.04).rotation.x=Math.PI/2;
    ring(root,3.28,.012,brass,0,-.04).rotation.x=Math.PI/2;
    for(let i=0;i<48;i++) {
      const a=i*Math.PI/24;
      const tick=cube(root,.014,.01,i%4?.08:.17,brass,Math.sin(a)*3.23,-.02,Math.cos(a)*3.23,.003);tick.rotation.y=a;
    }
    batch(root);return root;
  }
  function makeScroll(score) {
    const root=new T.Group();root.visible=false;
    const paper=texture(canvas(768,896,(ctx,w,h)=>{
      ctx.fillStyle='#eddaaa';ctx.fillRect(0,0,w,h);
      const shade=ctx.createLinearGradient(0,0,w,0);shade.addColorStop(0,'#b3874d');shade.addColorStop(.12,'#eddaaa');shade.addColorStop(.85,'#f4e4bc');shade.addColorStop(1,'#b98d4d');ctx.fillStyle=shade;ctx.fillRect(0,0,w,h);
      ctx.strokeStyle='#9c753f';ctx.lineWidth=3;ctx.strokeRect(42,48,w-84,h-96);ctx.strokeRect(53,59,w-106,h-118);
      ctx.textAlign='center';ctx.fillStyle='#785735';ctx.font='26px Georgia';ctx.fillText('OS QUATRO SEGREDOS',w/2,158);
      ctx.fillStyle='#3f3225';ctx.font='bold 54px Georgia';ctx.fillText('Caixa desvendada!',w/2,248);
      ctx.font='bold 138px Georgia';ctx.fillText(String(score.pontos),w/2,430);
      ctx.font='32px Georgia';ctx.fillText('pontos nesta aventura',w/2,489);
      ctx.font='30px Georgia';ctx.fillText(score.acertosPrimeira+' de 4 de primeira',w/2,600);
      ctx.fillText(score.erros+' erros  ·  '+score.percentualAcertos+'% de precisão',w/2,653);
      ctx.font='25px Georgia';ctx.fillText('Rodada '+score.rodada+'  ·  '+(score.somenteTreino?'Treino livre':'Sem pressa, sem cronômetro'),w/2,726);
      ctx.font='20px Georgia';ctx.fillText('Pontuação oficial para alunos conectados',w/2,779);
    }));
    const mat=new T.MeshStandardMaterial({map:paper,side:T.DoubleSide,roughness:.9});materials.add(mat);
    const sheet=mesh(root,geometry('scroll-sheet',()=>new T.PlaneGeometry(2.22,2.59,1,12)),mat,0,0,0);
    const rolls=[];
    for(const y of [-1.3,1.3]) {
      const roller=new T.Group();roller.position.y=y;root.add(roller);
      cylinder(roller,.09,2.5,ivory).rotation.z=Math.PI/2;
      for(const x of [-1.3,1.3]) sphere(roller,.105,brass,x,0,0);
      rolls.push(roller);
    }
    return {root,sheet,rolls};
  }
  return {makeBox,makeDial,makeBalance,makeFlask,makeHintPaper,makeTable,makeScroll,batch,texture,canvas,materials,
    dispose(){geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());},
    // Batch geometries unique to removed flasks/reward must be released during replay too.
    release(root){root.traverse(node=>{if(node.isInstancedMesh)node.dispose();if(node.isMesh && geometries.get(node.geometry.uuid)===node.geometry){node.geometry.dispose();geometries.delete(node.geometry.uuid);}
      if(node.isMesh && node.material?.map && node.material.map!==grain && node.material.map!==patina){textures.delete(node.material.map);node.material.map.dispose();materials.delete(node.material);node.material.dispose();}});}
  };
}




