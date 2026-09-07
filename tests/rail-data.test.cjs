const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const RailData = require('../rail-data.js');

test('cells reuse overlapping views, wrap the dateline and avoid duplicate edge cells', () => {
  const a = RailData.cellsForBounds({south: 48.1, north: 48.4, west: 2.1, east: 2.4});
  const b = RailData.cellsForBounds({south: 48.2, north: 48.5, west: 2.2, east: 2.5});
  assert.deepEqual(a, b);
  const c = RailData.cellsForBounds({south: 0, north: .5, west: 179.8, east: -179.8});
  assert.equal(c.length, 2);
  assert.deepEqual(c.map(x => x.west), [179.5, -180]);
  assert.ok(RailData.neighbors(a).every(n => n.key !== a[0].key));
});

test('45-day freshness and pool cancellation/concurrency', async () => {
  assert.ok(RailData.fresh({ timestamp: Date.now(), elements: [] }));
  assert.ok(!RailData.fresh({timestamp: Date.now() - RailData.TTL - 1, elements: []}));
  let active = 0, peak = 0, started = 0;
  const controller = new AbortController();
  await assert.rejects(RailData.pool([1,2,3,4], 2, controller.signal, async () => {
    started++; peak = Math.max(peak, ++active);
    await new Promise(resolve => setTimeout(resolve, 5));
    active--; controller.abort();
  }), { name: 'AbortError' });
  assert.equal(peak, 2); assert.equal(started, 2);
});

function app() {
  const nodes = new Map();
  const node = id => {
    if (!nodes.has(id)) nodes.set(id, {value: id === 'threshold' ? '160' : 'subdued', textContent: '', hidden: false, addEventListener(){}, setAttribute(){}});
    return nodes.get(id);
  };
  let bounds = { south: 48.1, north: 48.4, west: 2.1, east: 2.4 };
  const b = () => ({getSouth:()=>bounds.south, getNorth:()=>bounds.north, getWest:()=>bounds.west, getEast:()=>bounds.east});
  const layers = new Set();
  const map = {zoom:4, zoomControl:{setPosition(){}}, setView(){return this;}, getZoom(){return this.zoom;}, getBounds:b,
    hasLayer:l=>layers.has(l), addLayer(l){layers.add(l);}, removeLayer(l){layers.delete(l);}, on(){}};
  class Layer {
    constructor(options){this.options=options;this.opacity=options?.opacity;}
    addTo(){layers.add(this);return this;} bringToFront(){} bringToBack(){} setOpacity(v){this.opacity=v;}
    clearLayers(){this.data=[];} addData(v){this.data=v;} redraw(){}
  }
  const context = vm.createContext({RailData, AbortController, URLSearchParams, URL, Map, Set, Date,
    setTimeout, clearTimeout, console, window:{}, document:{getElementById:node,querySelector:node},
    L:{map:()=>map, gridLayer:()=>new Layer(), tileLayer:()=>new Layer(),GridLayer:Layer,geoJSON:()=>new Layer(),
      DomEvent:{disableClickPropagation(){},disableScrollPropagation(){}},latLngBounds:(a,z)=>({getSouth:()=>a[0],getWest:()=>a[1],getNorth:()=>z[0],getEast:()=>z[1]})},
    fetch:async()=>{throw Error('offline');}});
  vm.runInContext(fs.readFileSync('index.html','utf8').match(/<script>([\s\S]*?)<\/script>/)[1], context);
  map.zoom=10;
  return {context, map, node, run: code=>vm.runInContext(code,context), move: x=>{bounds={...bounds,west:x,east:x+.3};}, stop:()=>vm.runInContext('cancelLoading()',context)};
}
const way = id => ({type:'way',id,tags:{maxspeed:'350'},geometry:[{lat:48.2,lon:2.2},{lat:48.3,lon:2.3}]});

test('live data survives storage errors, revisits reuse memory, threshold and dedup work', async () => {
  const a=app(); let requests=0;
  a.context.fetch=async()=>{requests++;return {ok:true,json:async()=>({elements:[way(1),way(1)]})};};
  a.run('diskGet = async () => {throw Error("denied")}; diskPut = async () => {throw Error("quota")};');
  await a.run('loadDataInView()');
  assert.equal(a.run('lastLoadedFeatures.length'),1);
  assert.equal(a.run('detailReady'),true);
  assert.equal(a.run('globalLayer.opacity'),0);
  await a.run('loadDataInView()');
  assert.equal(requests,1);
  a.node('threshold').value='400'; a.run('renderByThreshold()');
  assert.equal(a.run('overlayLayer.data.length'),0);
  a.stop();
});

test('obsolete response cannot overwrite a new view, global lines remain during load', async () => {
  const a=app(); let resolveOld;
  a.context.fetch=()=>new Promise(resolve=>{resolveOld=resolve;});
  const old=a.run('loadDataInView()');
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(a.run('globalLayer.opacity'),.92);
  a.move(3.1);
  a.context.fetch=async()=>({ok:true,json:async()=>({elements:[way(2)]})});
  await a.run('loadDataInView()');
  resolveOld({ok:true,json:async()=>({elements:[way(1)]})});
  await old;
  assert.equal(a.run('lastLoadedFeatures[0].properties.osm_id'),2);
  a.map.zoom=4; a.stop();
  assert.equal(a.run('globalLayer.opacity'),.92);
});

test('network errors and stale cache retain fallback and expose retry; partial responses are rejected', async () => {
  const a=app();
  a.context.fetch=async()=>({ok:true,json:async()=>({remark:'timeout',elements:[]})});
  await a.run('loadDataInView()');
  assert.equal(a.node('retryBtn').hidden,false);
  assert.equal(a.run('globalLayer.opacity'),.92);
  a.context.oldElements=[way(3)];
  a.run('diskGet = async () => ({timestamp:Date.now()-RailData.TTL-1,elements:oldElements})');
  await a.run('loadDataInView()');
  assert.equal(a.run('lastLoadedFeatures[0].properties.osm_id'),3);
  assert.equal(a.run('detailReady'),false);
  a.stop();
});
