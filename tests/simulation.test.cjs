const test=require("node:test");
const assert=require("node:assert/strict");
const {greatCirclePath,interpolatePath,createRoute,NexusSimulation,HUBS,TYPES,TYPE_COLORS}=require("../simulation.js");

test("great-circle route includes exact endpoints and bounded intermediate points",()=>{
 const a=[-58.3816,-34.6037],b=[2.3522,48.8566],path=greatCirclePath(a,b,32);
 assert.equal(path.length,33);assert.deepEqual(path[0],a);assert.deepEqual(path.at(-1),b);
 assert.ok(path.every(([lon,lat])=>Number.isFinite(lon)&&Number.isFinite(lat)&&Math.abs(lat)<=90));
});
test("path interpolation returns a point on the route for progress 0 and 1",()=>{
 const p=[[0,0],[10,10],[20,0]];
 assert.deepEqual(interpolatePath(p,0),p[0]);assert.deepEqual(interpolatePath(p,1),p[2]);
 const mid=interpolatePath(p,.5);assert.ok(mid[0]>0&&mid[0]<20);
});
test("generated routes only use declared fictional city hubs",()=>{
 const route=createRoute((()=>{let n=0;return()=>((n++%16)+0.25)/16})());
 assert.ok(HUBS.some(h=>h.name===route.from.name));assert.ok(HUBS.some(h=>h.name===route.to.name));
 assert.notEqual(route.from.name,route.to.name);assert.ok(route.path.length>10);
});
test("simulation clamps event count and never exceeds target",()=>{
 const sim=new NexusSimulation();sim.configure(1e15,1000);assert.equal(sim.target,1e12);
 sim.count=sim.target-2;sim.start();sim.advance(.25);assert.equal(sim.count,sim.target);assert.equal(sim.running,false);
});
test("simulation pause and reset preserve consistent progress",()=>{
 const sim=new NexusSimulation();sim.configure(10000,5);sim.start();sim.advance(.1);assert.ok(sim.count>0);sim.pause();const n=sim.count;sim.advance(2);assert.equal(sim.count,n);sim.reset();assert.equal(sim.count,0);assert.equal(sim.snapshot().progress,0);
});
test("every fictional event category has a distinct visible color",()=>{
 assert.equal(TYPES.length,5);
 assert.equal(new Set(TYPES.map(type=>TYPE_COLORS[type])).size,TYPES.length);
 assert.ok(TYPES.every(type=>/^#[0-9a-f]{6}$/i.test(TYPE_COLORS[type])));
});
