(()=>{const HUBS=[
{name:"Buenos Aires",lat:-34.6037,lon:-58.3816,region:"Sudamérica"},
{name:"São Paulo",lat:-23.5505,lon:-46.6333,region:"Sudamérica"},
{name:"New York",lat:40.7128,lon:-74.006,region:"Norteamérica"},
{name:"San Francisco",lat:37.7749,lon:-122.4194,region:"Norteamérica"},
{name:"London",lat:51.5072,lon:-.1276,region:"Europa"},
{name:"Paris",lat:48.8566,lon:2.3522,region:"Europa"},
{name:"Berlin",lat:52.52,lon:13.405,region:"Europa"},
{name:"Cairo",lat:30.0444,lon:31.2357,region:"África"},
{name:"Lagos",lat:6.5244,lon:3.3792,region:"África"},
{name:"Dubai",lat:25.2048,lon:55.2708,region:"Asia meridional"},
{name:"Mumbai",lat:19.076,lon:72.8777,region:"Asia meridional"},
{name:"Singapore",lat:1.3521,lon:103.8198,region:"Asia-Pacífico"},
{name:"Tokyo",lat:35.6762,lon:139.6503,region:"Asia-Pacífico"},
{name:"Seoul",lat:37.5665,lon:126.978,region:"Asia-Pacífico"},
{name:"Sydney",lat:-33.8688,lon:151.2093,region:"Oceanía"},
{name:"Johannesburg",lat:-26.2041,lon:28.0473,region:"África"}
];
const REGIONS=[...new Set(HUBS.map(h=>h.region))].map(name=>({name,...(HUBS.find(h=>h.region===name))}));
const TYPES=["Phishing (simulado)","Malware (simulado)","Denegación de servicio (simulada)","Acceso no autorizado (simulado)","Reconocimiento (simulado)"];
const TYPE_COLORS={"Phishing (simulado)":"#45c6ff","Malware (simulado)":"#a78bfa","Denegación de servicio (simulada)":"#ff668a","Acceso no autorizado (simulado)":"#f5b942","Reconocimiento (simulado)":"#5ee0ae"};
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
function greatCirclePath(a,b,steps=48){const rad=Math.PI/180,deg=180/Math.PI,lon1=a[0]*rad,lat1=a[1]*rad,lon2=b[0]*rad,lat2=b[1]*rad;const v1=[Math.cos(lat1)*Math.cos(lon1),Math.cos(lat1)*Math.sin(lon1),Math.sin(lat1)],v2=[Math.cos(lat2)*Math.cos(lon2),Math.cos(lat2)*Math.sin(lon2),Math.sin(lat2)];const dot=clamp(v1[0]*v2[0]+v1[1]*v2[1]+v1[2]*v2[2],-1,1),omega=Math.acos(dot),sin=Math.sin(omega),out=[];for(let i=0;i<=steps;i++){const t=i/steps;let v;if(Math.abs(sin)<1e-8)v=v1.map((x,k)=>x*(1-t)+v2[k]*t);else{const p=Math.sin((1-t)*omega)/sin,q=Math.sin(t*omega)/sin;v=v1.map((x,k)=>p*x+q*v2[k])}const len=Math.hypot(...v)||1;v=v.map(x=>x/len);let lon=Math.atan2(v[1],v[0])*deg,lat=Math.atan2(v[2],Math.hypot(v[0],v[1]))*deg;if(i===0){lon=a[0];lat=a[1]}if(i===steps){lon=b[0];lat=b[1]}out.push([lon,lat])}return out}
function interpolatePath(path,progress){const p=clamp(progress,0,1)*(path.length-1),i=Math.min(path.length-2,Math.floor(p)),t=p-i,a=path[i],b=path[i+1];return[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]}
function createRoute(random=Math.random){const fromIndex=Math.floor(random()*HUBS.length),from=HUBS[fromIndex],to=HUBS[(fromIndex+1+Math.floor(random()*(HUBS.length-1)))%HUBS.length];return{id:"NX-"+Math.floor(random()*0xffffff).toString(16).toUpperCase().padStart(6,"0"),from,to,path:greatCirclePath([from.lon,from.lat],[to.lon,to.lat]),type:TYPES[Math.floor(random()*TYPES.length)]}}
class NexusSimulation{constructor(){this.target=3e6;this.count=0;this.rate=0;this.running=false;this.startedAt=0;this.elapsed=0;this.speed=5;this.onTick=()=>{}}configure(t,s){this.target=clamp(Math.floor(Number(t)||1),1,1e12);this.speed=clamp(Number(s)||1,1,1000);if(this.running&&this.count>=this.target){this.count=this.target;this.running=false;this.rate=0;this.onTick(this.snapshot())}}start(){if(this.running||this.count>=this.target)return;this.running=true;this.startedAt=performance.now()-this.elapsed*1000}pause(){this.running=false;this.rate=0}reset(){this.running=false;this.count=0;this.elapsed=0;this.rate=0;this.onTick(this.snapshot())}advance(dt){if(!this.running)return this.snapshot();dt=clamp(Number(dt)||0,0,.25);this.elapsed+=dt;const perSecond=Math.min(25e6,Math.max(1e3,this.target/Math.max(15,90/this.speed))),add=Math.min(this.target-this.count,Math.floor(perSecond*dt));this.count+=Math.max(0,add);this.rate=dt?Math.round(Math.max(0,add)/dt):0;if(this.count>=this.target){this.count=this.target;this.running=false;this.rate=0}return this.snapshot()}snapshot(){return{target:this.target,count:this.count,rate:this.rate,elapsed:this.elapsed,running:this.running,progress:this.target?this.count/this.target:0}}sample(){const h=HUBS[Math.floor(Math.random()*HUBS.length)];return{region:h.region,lat:h.lat+(Math.random()-.5)*3,lon:h.lon+(Math.random()-.5)*4,type:TYPES[Math.floor(Math.random()*TYPES.length)],id:Math.floor(Math.random()*0xffffff).toString(16).toUpperCase()}}}
if(typeof window!=="undefined"){window.NEXUS_REGIONS=REGIONS;window.NEXUS_HUBS=HUBS;window.NEXUS_TYPES=TYPES;window.NEXUS_TYPE_COLORS=TYPE_COLORS;window.NexusSimulation=NexusSimulation;window.NEXUS_GEO={greatCirclePath,interpolatePath,createRoute}}
if(typeof module!=="undefined"&&module.exports)module.exports={HUBS,REGIONS,TYPES,TYPE_COLORS,greatCirclePath,interpolatePath,createRoute,NexusSimulation};
})();