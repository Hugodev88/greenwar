// Gera o SVG simplificado dos 27 estados a partir do GeoJSON (fonte: IBGE via codeforamerica/click_that_hood).
const g = require("./brazil-states.geojson.json");
const K = 15, C = Math.cos(14*Math.PI/180), X0 = -74.2, Y0 = 5.6, TOL = 0.7;
const proj = ([lon,lat]) => [(lon - X0)*K*C, (Y0 - lat)*K];
function dp(pts, tol){ if (pts.length < 3) return pts;
  const [a,b] = [pts[0], pts[pts.length-1]]; let md = 0, mi = 0;
  for (let i=1;i<pts.length-1;i++){ const p=pts[i];
    const dx=b[0]-a[0], dy=b[1]-a[1], L=Math.hypot(dx,dy)||1e-9;
    const d = Math.abs(dy*p[0]-dx*p[1]+b[0]*a[1]-b[1]*a[0])/L; if (d>md){md=d;mi=i;} }
  if (md <= tol) return [a,b];
  return dp(pts.slice(0,mi+1),tol).slice(0,-1).concat(dp(pts.slice(mi),tol)); }
const area = r => { let s=0; for(let i=0;i<r.length;i++){const [x1,y1]=r[i],[x2,y2]=r[(i+1)%r.length]; s+=x1*y2-x2*y1;} return s/2; };
const centroid = r => { let A=area(r), cx=0, cy=0; for(let i=0;i<r.length;i++){const [x1,y1]=r[i],[x2,y2]=r[(i+1)%r.length]; const f=x1*y2-x2*y1; cx+=(x1+x2)*f; cy+=(y1+y2)*f;} return [cx/(6*A), cy/(6*A)]; };
const out = {}; let maxX=0, maxY=0;
for (const f of g.features){
  const uf = f.properties.sigla; let d = "", best = null, bestA = 0;
  for (const poly of f.geometry.coordinates){
    const ring = poly[0].map(proj); const A = Math.abs(area(ring));
    if (A > bestA){ bestA = A; best = ring; }
    if (A < 4 && f.geometry.coordinates.length > 1) continue; // ilhotas
    const h = Math.floor(ring.length/2); const s = dp(ring.slice(0,h+1),TOL).slice(0,-1).concat(dp(ring.slice(h),TOL)); if (s.length < 4) continue;
    s.forEach(([x,y]) => { maxX=Math.max(maxX,x); maxY=Math.max(maxY,y); });
    d += "M" + s.map(p => p[0].toFixed(1)+","+p[1].toFixed(1)).join("L") + "Z";
  }
  const [cx, cy] = centroid(best);
  out[uf] = { name: f.properties.name, d, lx: +cx.toFixed(1), ly: +cy.toFixed(1) };
}
out._size = [Math.ceil(maxX), Math.ceil(maxY)];
require("fs").writeFileSync(__dirname + "/brazil-map.json", JSON.stringify(out));
console.log("size", out._size, "bytes", JSON.stringify(out).length);
