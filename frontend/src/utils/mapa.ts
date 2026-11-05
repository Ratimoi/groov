// HTML do mapa (Leaflet + OpenStreetMap) que roda dentro de um WebView.
// A página fala com o app por postMessage: { tipo: "abrir", id } ou { tipo: "ponto", lat, lng }.

export type PontoMapa = { id: string; titulo: string; lat: number; lng: number; detalhe?: string };

export type CentroMapa = { lat: number; lng: number };

// Centro padrão (Recife) quando não há localização nem eventos.
export const CENTRO_PADRAO: CentroMapa = { lat: -8.0476, lng: -34.877 };

// Vai dentro de <script>: escapa o que poderia fechar a tag.
const json = (valor: unknown) => JSON.stringify(valor).replace(/</g, "\\u003c");

const BASE = `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<style>html,body,#m{height:100%;margin:0;background:#131313}
.leaflet-popup-content-wrapper{background:#1c1b1b;color:#e5e2e1;border-radius:12px}
.leaflet-popup-tip{background:#1c1b1b}
.leaflet-container a.abrir{color:#ebb2ff;font-weight:700;text-decoration:none}
.eu{width:14px;height:14px;border-radius:50%;background:#00eefa;border:3px solid #fff;box-shadow:0 0 0 4px rgba(0,238,250,.3)}</style>
</head><body><div id="m"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
var enviar=function(o){window.ReactNativeWebView.postMessage(JSON.stringify(o))};
var mapa=L.map('m',{zoomControl:true,attributionControl:true});
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(mapa);
`;

export function htmlMapaEventos(pontos: PontoMapa[], centro: CentroMapa, euAqui: CentroMapa | null): string {
  return `${BASE}
var pontos=${json(pontos)};var centro=${json(centro)};var eu=${json(euAqui)};
var limites=[];
function esc(t){var d=document.createElement('div');d.textContent=t;return d.innerHTML}
pontos.forEach(function(p){
  var m=L.marker([p.lat,p.lng]).addTo(mapa);
  m.bindPopup('<b>'+esc(p.titulo)+'</b><br>'+esc(p.detalhe||'')+'<br><a class="abrir" href="#" onclick="enviar({tipo:\\'abrir\\',id:\\''+p.id+'\\'});return false">Ver evento</a>');
  limites.push([p.lat,p.lng]);
});
if(eu){L.marker([eu.lat,eu.lng],{icon:L.divIcon({className:'',html:'<div class="eu"></div>',iconSize:[14,14]})}).addTo(mapa);limites.push([eu.lat,eu.lng])}
if(limites.length>1){mapa.fitBounds(limites,{padding:[40,40],maxZoom:15})}else{mapa.setView(limites[0]||[centro.lat,centro.lng],limites.length?14:12)}
</script></body></html>`;
}

// Mapa para marcar um ponto com um toque. `ponto` é o marcador inicial, se já houver.
export function htmlSeletorPonto(ponto: CentroMapa | null, centro: CentroMapa): string {
  return `${BASE}
var ponto=${json(ponto)};var centro=${json(centro)};var marcador=null;
function marcar(lat,lng){if(marcador){marcador.setLatLng([lat,lng])}else{marcador=L.marker([lat,lng]).addTo(mapa)}}
if(ponto){marcar(ponto.lat,ponto.lng);mapa.setView([ponto.lat,ponto.lng],16)}else{mapa.setView([centro.lat,centro.lng],13)}
mapa.on('click',function(e){marcar(e.latlng.lat,e.latlng.lng);enviar({tipo:'ponto',lat:e.latlng.lat,lng:e.latlng.lng})});
window.moverPara=function(lat,lng){marcar(lat,lng);mapa.setView([lat,lng],16)};
</script></body></html>`;
}
