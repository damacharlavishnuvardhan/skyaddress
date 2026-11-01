const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 4000;
const DB = path.join(__dirname, 'data', 'db.json');
app.use(cors());
app.use(express.json({ limit: '1mb' }));
function readDb(){ return JSON.parse(fs.readFileSync(DB, 'utf8')); }
function writeDb(db){ fs.writeFileSync(DB, JSON.stringify(db, null, 2)); }
function clean(v){ return String(v ?? '').trim(); }
function makeCode(db){
  const next = db.homes.length + 1;
  return `SA-KER-001-${String(next).padStart(4,'0')}`;
}
app.get('/api/health', (_req,res)=>res.json({ok:true, service:'SkyAddress API'}));
app.get('/api/dashboard', (_req,res)=>{
  const db=readDb(); const points=db.homes.flatMap(h=>h.points||[]);
  res.json({homes:db.homes.length, points:points.length, available:points.filter(p=>p.availability==='available'&&p.obstacle==='clear'&&!p.restricted).length, deliveries:db.deliveries.length, delivered:db.deliveries.filter(d=>d.status==='Delivered').length});
});
app.get('/api/homes', (_req,res)=>res.json(readDb().homes));
app.get('/api/homes/:code', (req,res)=>{
  const home=readDb().homes.find(h=>h.code.toLowerCase()===req.params.code.toLowerCase());
  if(!home) return res.status(404).json({error:'No home was found for that SkyAddress code.'});
  res.json(home);
});
app.post('/api/homes', (req,res)=>{
  const b=req.body||{}; const required=['name','locality','district','state','lat','lng'];
  const missing=required.filter(k=>b[k]===undefined||b[k]===null||clean(b[k])==='');
  if(missing.length) return res.status(400).json({error:`Please provide: ${missing.join(', ')}.`});
  const lat=Number(b.lat), lng=Number(b.lng);
  if(!Number.isFinite(lat)||lat < -90||lat>90||!Number.isFinite(lng)||lng < -180||lng>180) return res.status(400).json({error:'Enter valid latitude and longitude values.'});
  const db=readDb();
  const duplicate=db.homes.find(h=>Math.abs(h.lat-lat)<0.00003&&Math.abs(h.lng-lng)<0.00003&&h.locality.toLowerCase()===clean(b.locality).toLowerCase());
  if(duplicate) return res.status(409).json({error:`A home is already registered near this location (${duplicate.code}).`});
  const home={id:`home-${Date.now()}`,code:makeCode(db),name:clean(b.name),owner:clean(b.owner),locality:clean(b.locality),district:clean(b.district),state:clean(b.state),postalCode:clean(b.postalCode),description:clean(b.description),landmarks:clean(b.landmarks),directions:clean(b.directions),lat,lng,createdAt:new Date().toISOString(),points:[{id:`pt-${Date.now()}`,name:'Main entrance',type:'ground-drop',lat,lng,availability:'available',obstacle:'unknown',restricted:false}]};
  db.homes.push(home); writeDb(db); res.status(201).json(home);
});
app.post('/api/homes/:id/points', (req,res)=>{
  const db=readDb(); const home=db.homes.find(h=>h.id===req.params.id); if(!home) return res.status(404).json({error:'Home not found.'});
  const b=req.body||{}; if(!clean(b.name)||!Number.isFinite(Number(b.lat))||Number(b.lat)<-90||Number(b.lat)>90||!Number.isFinite(Number(b.lng))||Number(b.lng)<-180||Number(b.lng)>180) return res.status(400).json({error:'Point name and valid coordinates are required.'});
  const point={id:`pt-${Date.now()}`,name:clean(b.name),type:clean(b.type)||'designated-drop',lat:Number(b.lat),lng:Number(b.lng),availability:b.availability||'available',obstacle:b.obstacle||'unknown',restricted:Boolean(b.restricted)};
  home.points.push(point); writeDb(db); res.status(201).json(point);
});
app.patch('/api/points/:pointId', (req,res)=>{
  const db=readDb(); let found=null;
  for(const h of db.homes){ const p=(h.points||[]).find(x=>x.id===req.params.pointId); if(p){found=p;break;} }
  if(!found) return res.status(404).json({error:'Delivery point not found.'});
  const allowed=['availability','obstacle','restricted']; for(const k of allowed) if(req.body[k]!==undefined) found[k]=req.body[k];
  writeDb(db); res.json(found);
});
app.post('/api/deliveries', (req,res)=>{
  const db=readDb(); const {code,pointId,method='ground'}=req.body||{}; const home=db.homes.find(h=>h.code.toLowerCase()===clean(code).toLowerCase());
  if(!home) return res.status(404).json({error:'Unknown SkyAddress code.'});
  const point=(home.points||[]).find(p=>p.id===pointId); if(!point) return res.status(400).json({error:'Choose a valid delivery point for this home.'});
  if(method==='drone' && (point.availability!=='available'||point.obstacle!=='clear'||point.restricted)) return res.status(400).json({error:'This point is not eligible for a simulated drone route. Check availability, obstacle status and restrictions.'});
  const delivery={id:`del-${Date.now()}`,code:home.code,homeId:home.id,pointId,method,status:method==='drone'?'Planned':'Pending',createdAt:new Date().toISOString()}; db.deliveries.unshift(delivery); writeDb(db); res.status(201).json(delivery);
});
app.patch('/api/deliveries/:id', (req,res)=>{
  const db=readDb(); const d=db.deliveries.find(x=>x.id===req.params.id); if(!d) return res.status(404).json({error:'Delivery not found.'});
  const transitions={Pending:['In Transit','Failed'],Planned:['In Transit','Failed'], 'In Transit':['Delivered','Failed'],Delivered:[],Failed:['Pending']};
  if(!transitions[d.status]?.includes(req.body.status)) return res.status(400).json({error:`Cannot change delivery from ${d.status} to ${req.body.status}.`});
  d.status=req.body.status; d.updatedAt=new Date().toISOString(); writeDb(db); res.json(d);
});
app.post('/api/reports', (req,res)=>{const db=readDb(); const report={id:`rep-${Date.now()}`,code:clean(req.body.code),message:clean(req.body.message),createdAt:new Date().toISOString()}; if(!report.message) return res.status(400).json({error:'Please describe the location issue.'}); db.reports.unshift(report); writeDb(db); res.status(201).json(report);});
app.get('/api/activity', (_req,res)=>{const db=readDb();res.json({deliveries:db.deliveries,reports:db.reports});});
if(process.env.NODE_ENV==='production'){const dist=path.join(__dirname,'../client/dist');app.use(express.static(dist));app.get('*',(req,res)=>res.sendFile(path.join(dist,'index.html')));}
app.listen(PORT,()=>console.log(`SkyAddress API running at http://localhost:${PORT}`));
