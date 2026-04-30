// enhanced Three.js earth globe with atmosphere, clouds, stars, and controls

// import modules (runs only when included via <script type="module">)
import * as THREE from 'https://unpkg.com/three@0.152.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.152.0/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'https://unpkg.com/three@0.152.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://unpkg.com/three@0.152.0/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://unpkg.com/three@0.152.0/examples/jsm/postprocessing/UnrealBloomPass.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);

let borders; // will hold country border lines
let selectedBorders; // second outline layer for selected country
let geoJsonData; // store geojson for hover detection
const countryCenters = new Map();
let selectedCountry = null;
let countryParticles; // group of country particles

// camera focus animation state
let focusActive = false;
let focusProgress = 0;
let focusStartPos = new THREE.Vector3();
let focusEndPos = new THREE.Vector3();
let focusStartTarget = new THREE.Vector3();
let focusEndTarget = new THREE.Vector3();

// raycaster for hover detection
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const sphereCenter = new THREE.Vector3(0, 0, 0);
const sphereRadius = 1.0;

// hover info elements in HUD
const hoverPanel = document.getElementById('hoverPanel');
const hoverName = document.getElementById('hoverName');
const hoverValue = document.getElementById('hoverValue');
const hoverSwatch = document.getElementById('hoverSwatch');
// hover tooltip near cursor
const hoverTooltip = document.getElementById('hoverTooltip');
const hoverTooltipText = document.getElementById('hoverTooltipText');
const hoverTooltipDot = document.getElementById('hoverTooltipDot');
// chart panel
const chartPanel = document.getElementById('chartPanel');
const chartTitle = document.getElementById('chartTitle');
const trendChart = document.getElementById('trendChart');
const trendCtx = trendChart ? trendChart.getContext('2d') : null;
// country list panel
const countrySearch = document.getElementById('countrySearch');
const countryList = document.getElementById('countryList');
window.addEventListener('mousemove', onMouseMove, false);
window.addEventListener('pointerdown', onPointerDown, false);
window.addEventListener('pointermove', onPointerMove, false);
window.addEventListener('pointerup', onPointerUp, false);

let pointerDown = false;
let dragMoved = false;
let downX = 0;
let downY = 0;
const DRAG_THRESHOLD_PX = 5;

function onMouseMove(event) {
  // normalize mouse coords
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  // position tooltip near cursor
  if (hoverTooltip) {
    hoverTooltip.style.left = `${event.clientX}px`;
    hoverTooltip.style.top = `${event.clientY}px`;
  }
}

function onPointerDown(event) {
  pointerDown = true;
  dragMoved = false;
  downX = event.clientX;
  downY = event.clientY;
}

function onPointerMove(event) {
  if (!pointerDown) return;
  const dx = event.clientX - downX;
  const dy = event.clientY - downY;
  if (Math.abs(dx) > DRAG_THRESHOLD_PX || Math.abs(dy) > DRAG_THRESHOLD_PX) {
    dragMoved = true;
  }
}

function onPointerUp(event) {
  if (!pointerDown) return;
  pointerDown = false;
  if (dragMoved) return;
  onClick(event);
}

function onClick(event) {
  // ignore clicks on UI panels
  const target = event.target;
  if (target && (target.closest('.country-panel') || target.closest('.hud') || target.closest('.chart-panel'))) {
    return;
  }

  const clickMouse = new THREE.Vector2(
    (event.clientX / window.innerWidth) * 2 - 1,
    -(event.clientY / window.innerHeight) * 2 + 1
  );

  const hit = getLatLonFromMouse(clickMouse);
  if (!hit) {
    setSelectedCountry(null);
    return;
  }

  const { lat, lon } = hit;
  const country = findCountryAtLatLon(lat, lon);
  setSelectedCountry(country);
  // only focus when selecting via list, not map click
}

// convert 3D point on sphere back to lat/lon
function vector3ToLatLon(vec) {
  const lat = Math.asin(vec.y / sphereRadius) * (180 / Math.PI);
  let lon = Math.atan2(vec.z, -vec.x) * (180 / Math.PI) + 180;
  if (lon > 180) lon -= 360;
  if (lon < -180) lon += 360;
  return { lat, lon };
}

// point-in-polygon helper
function pointInPolygon(testLon, testLat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [lon1, lat1] = ring[i];
    const [lon2, lat2] = ring[j];
    if ((lat1 > testLat) !== (lat2 > testLat) &&
        testLon < ((lon2 - lon1) * (testLat - lat1)) / (lat2 - lat1) + lon1) {
      inside = !inside;
    }
  }
  return inside;
}

// find which country a lat/lon point falls in
function findCountryAtLatLon(lat, lon) {
  if (!geoJsonData) return null;
  for (const feat of geoJsonData.features) {
    let coords = feat.geometry.coordinates;
    if (feat.geometry.type === 'Polygon') coords = [coords];
    
    for (const polygon of coords) {
      const outerRing = polygon[0];
      if (pointInPolygon(lon, lat, outerRing)) {
        return feat.properties.name;
      }
    }
  }
  return null;
}

function setSelectedCountry(countryName) {
  if (selectedCountry === countryName) return;
  selectedCountry = countryName;

  if (countryList) {
    let selectedItem = null;
    countryList.querySelectorAll('.country-item').forEach((item) => {
      const name = item.dataset.name || '';
      const isSelected = name === (countryName || '').toLowerCase();
      item.classList.toggle('selected', isSelected);
      if (isSelected) selectedItem = item;
    });

    if (selectedItem && typeof selectedItem.scrollIntoView === 'function') {
      selectedItem.scrollIntoView({ behavior: 'auto', block: 'nearest' });
    }
  }

  if (selectedBorders) {
    scene.remove(selectedBorders);
    selectedBorders.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    });
    selectedBorders = null;
  }

  if (countryParticles) {
    countryParticles.children.forEach((points) => {
      const isSelected = points.userData && points.userData.countryName === countryName;
        if (points.material) {
          if (!countryName) {
            points.material.size = 0.0025;
          } else {
            points.material.size = isSelected ? 0.0075 : 0.0015;
          }
      }
    });
  }

  if (!countryName || !geoJsonData) {
    if (borders) {
      borders.children.forEach((line) => {
        line.visible = true;
      });
    }
    return;
  }

  if (borders) {
    borders.children.forEach((line) => {
      const isSelected = line.userData && line.userData.countryName === countryName;
      const layerIndex = line.userData ? line.userData.layerIndex : 0;
      line.visible = isSelected ? true : layerIndex < 2;
    });
  }

  const feature = geoJsonData.features.find((f) => f.properties.name === countryName);
  if (!feature) return;

  selectedBorders = new THREE.Group();
  let coords = feature.geometry.coordinates;
  if (feature.geometry.type === 'Polygon') coords = [coords];

  const selectedDists = [1.010, 1.012, 1.014]; // multiple lines for stronger highlight
  const selMat = new THREE.LineBasicMaterial({
    color: 0xffffff,
    linewidth: 2,
    transparent: true,
    opacity: 0.9,
  });

  coords.forEach((polygon) => {
    polygon.forEach((ring) => {
      selectedDists.forEach((dist) => {
        const points = ring.map(([lon, lat]) => latLonToVector3(lat, lon, dist));
        const g = new THREE.BufferGeometry().setFromPoints(points);
        const selLine = new THREE.Line(g, selMat);
        selectedBorders.add(selLine);
      });
    });
  });

  scene.add(selectedBorders);
}

function getLatLonFromMouse(mouseVec) {
  raycaster.setFromCamera(mouseVec, camera);
  const direction = raycaster.ray.direction;
  const origin = raycaster.ray.origin;
  const a = direction.lengthSq();
  const b = 2.0 * origin.dot(direction);
  const c = origin.lengthSq() - sphereRadius * sphereRadius;
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return null;
  const t = (-b - Math.sqrt(discriminant)) / (2 * a);
  if (t <= 0) return null;
  const intersection = origin.clone().addScaledVector(direction, t);
  return vector3ToLatLon(intersection);
}

function focusOnCountry(countryName) {
  const center = countryCenters.get(countryName);
  if (!center) return;

  const target = latLonToVector3(center.lat, center.lon, 1.0);
  focusStartPos.copy(camera.position);
  focusEndPos.copy(target).multiplyScalar(2.4);
  focusStartTarget.copy(controls.target);
  // keep orbit center at globe origin
  focusEndTarget.set(0, 0, 0);
  focusProgress = 0;
  focusActive = true;
}

function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function getTrendSeries(country, basePercent) {
  const seed = hashString(country) % 360;
  const series = [];
  for (let i = 0; i < 24; i++) {
    const t = i / 23;
    const wave = Math.sin((seed + i * 25) * (Math.PI / 180)) * 6;
    const drift = (t - 0.5) * 8;
    const val = Math.max(0, Math.min(100, basePercent + wave + drift));
    series.push(val);
  }
  return series;
}

function drawTrendChart(series, color) {
  if (!trendCtx) return;
  const w = trendChart.width;
  const h = trendChart.height;
  const padLeft = 26;
  const padRight = 8;
  const padTop = 6;
  const padBottom = 18;
  trendCtx.clearRect(0, 0, w, h);

  // background grid
  trendCtx.strokeStyle = 'rgba(255,255,255,0.08)';
  trendCtx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padTop + ((h - padTop - padBottom) / 4) * i + 0.5;
    trendCtx.beginPath();
    trendCtx.moveTo(padLeft, y);
    trendCtx.lineTo(w - padRight, y);
    trendCtx.stroke();
  }

  // axes labels
  trendCtx.fillStyle = 'rgba(255,255,255,0.6)';
  trendCtx.font = '10px Arial';
  trendCtx.textAlign = 'right';
  trendCtx.textBaseline = 'middle';
  const labelVals = [100, 50, 0];
  labelVals.forEach((val) => {
    const y = padTop + (1 - val / 100) * (h - padTop - padBottom);
    trendCtx.fillText(`${val}%`, padLeft - 4, y);
  });

  // year labels (24 points: 2000-2023)
  trendCtx.textAlign = 'center';
  trendCtx.textBaseline = 'top';
  const startYear = 2000;
  for (let i = 0; i < 24; i += 6) {
    const x = padLeft + (i / (series.length - 1)) * (w - padLeft - padRight);
    trendCtx.fillText(`${startYear + i}`, x, h - padBottom + 4);
  }

  // line
  const r = Math.round(Math.min(1, color.r) * 255);
  const g = Math.round(Math.min(1, color.g) * 255);
  const b = Math.round(Math.min(1, color.b) * 255);
  trendCtx.strokeStyle = `rgba(${r},${g},${b},0.95)`;
  trendCtx.lineWidth = 2;
  trendCtx.beginPath();
  series.forEach((v, i) => {
    const x = padLeft + (i / (series.length - 1)) * (w - padLeft - padRight);
    const y = padTop + (1 - v / 100) * (h - padTop - padBottom);
    if (i === 0) trendCtx.moveTo(x, y);
    else trendCtx.lineTo(x, y);
  });
  trendCtx.stroke();

  // fill
  const grad = trendCtx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, `rgba(${r},${g},${b},0.35)`);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  trendCtx.fillStyle = grad;
  trendCtx.lineTo(w - padRight, h - padBottom);
  trendCtx.lineTo(padLeft, h - padBottom);
  trendCtx.closePath();
  trendCtx.fill();
}

function buildCountryList() {
  if (!countryList || !geoJsonData) return;
  const names = new Set();
  geoJsonData.features.forEach((feat) => names.add(feat.properties.name));
  const sorted = Array.from(names).sort((a, b) => {
    const va = renewableEnergyData[a] ?? 15;
    const vb = renewableEnergyData[b] ?? 15;
    if (vb !== va) return vb - va;
    return a.localeCompare(b);
  });

  countryList.innerHTML = '';
  sorted.forEach((name) => {
    const percent = renewableEnergyData[name] ?? 15;
    const color = getRenewableColor(percent);
    const r = Math.round(Math.min(1, color.r) * 255);
    const g = Math.round(Math.min(1, color.g) * 255);
    const b = Math.round(Math.min(1, color.b) * 255);

    const item = document.createElement('div');
    item.className = 'country-item';
    item.dataset.name = name.toLowerCase();

    const swatch = document.createElement('div');
    swatch.className = 'country-swatch';
    swatch.style.background = `rgb(${r}, ${g}, ${b})`;
    swatch.style.boxShadow = `0 0 8px rgba(${r}, ${g}, ${b}, 0.6)`;

    const label = document.createElement('div');
    label.className = 'country-name';
    label.textContent = name;

    const value = document.createElement('div');
    value.className = 'country-value';
    value.textContent = `${percent}%`;

    item.appendChild(swatch);
    item.appendChild(label);
    item.appendChild(value);
    item.addEventListener('click', () => {
      setSelectedCountry(name);
      focusOnCountry(name);
    });
    countryList.appendChild(item);
  });
}

function filterCountryList(query) {
  if (!countryList) return;
  const q = query.trim().toLowerCase();
  countryList.querySelectorAll('.country-item').forEach((item) => {
    const name = item.dataset.name || '';
    item.style.display = name.includes(q) ? 'flex' : 'none';
  });
}
const canvas = document.getElementById('globe');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
// composer for postprocessing (bloom)
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.4);
composer.addPass(bloomPass);

// add a subtle starfield background
const loader = new THREE.TextureLoader();
loader.load('https://threejs.org/examples/textures/galaxy_starfield.png', tex => {
  scene.background = tex;
});

camera.position.set(0, 0, 2.5);

// controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 1.5;
controls.maxDistance = 5;

// lighting
// const directionalLight = new THREE.DirectionalLight(0, 1);
// directionalLight.position.set(5, 3, 5);
// scene.add(directionalLight);
const ambient = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambient);

// earth geometry & material
const earthGeo = new THREE.SphereGeometry(1, 64, 64);
const earthMat = new THREE.MeshPhongMaterial({
    map: loader.load('https://threejs.org/examples/textures/land_ocean_ice_cloud_2048.jpg'),
    specularMap: loader.load('https://threejs.org/examples/textures/earthspec1k.jpg'),
    specular: new THREE.Color('grey'),
    shininess: 15,
    emissive: new THREE.Color(0x000000),
    emissiveIntensity: 0,
    color: new THREE.Color(0x888888),
});
const earth = new THREE.Mesh(earthGeo, earthMat);
scene.add(earth);

// cloud layer
const cloudGeo = new THREE.SphereGeometry(1.015, 64, 64);
const cloudMat = new THREE.MeshLambertMaterial({
  map: loader.load('https://threejs.org/examples/textures/earthcloudmaptrans.jpg'),
  transparent: true,
  opacity: 0.8
});
const clouds = new THREE.Mesh(cloudGeo, cloudMat);
scene.add(clouds);

// volumetric atmosphere using custom shader
const atmosphereGeo = new THREE.SphereGeometry(1.12, 64, 64);
const atmosphereMat = new THREE.ShaderMaterial({
  vertexShader: `
    varying vec3 vNormal;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    varying vec3 vNormal;
    void main() {
      // intensity based on angle between normal and view direction (camera facing z-axis in model space)
      float intensity = pow(0.4 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
      gl_FragColor = vec4(0.5, 0.7, 1.0, 1.0) * intensity;
    }
  `,
  blending: THREE.AdditiveBlending,
  side: THREE.BackSide,
  transparent: true,
});
const atmosphere = new THREE.Mesh(atmosphereGeo, atmosphereMat);
scene.add(atmosphere);


// particle cloud - small dots orbiting the earth
const particleCount = 1000;
const particleGeo = new THREE.BufferGeometry();
const positions = new Float32Array(particleCount * 3);
for (let i = 0; i < particleCount; i++) {
  const theta = Math.random() * 2 * Math.PI;
  const phi = Math.acos(2 * Math.random() - 1);
  const radius = 1.3 + Math.random() * 0.2; // slightly above globe
  positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
  positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
  positions[i * 3 + 2] = radius * Math.cos(phi);
}
particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
const particleMat = new THREE.PointsMaterial({
  color: 0xaaddff,
  size: 0.005,
  transparent: false,
  opacity: 0.6,
  depthWrite: false,
});
const particles = new THREE.Points(particleGeo, particleMat);
scene.add(particles);

// Sample renewable energy data (% of electricity from renewables) - real data from various sources
const renewableEnergyData = {
  'Norway': 98, 'Iceland': 99, 'Costa Rica': 93, 'Brazil': 65, 'New Zealand': 80,
  'Denmark': 80, 'Austria': 72, 'Sweden': 58, 'Germany': 45, 'Spain': 42,
  'Portugal': 55, 'Italy': 39, 'France': 29, 'United States': 21, 'United Kingdom': 42,
  'Canada': 66, 'India': 24, 'China': 31, 'Japan': 20, 'Australia': 28,
  'South Korea': 8, 'Mexico': 26, 'Chile': 39, 'Argentina': 10, 'Colombia': 75,
  'Peru': 58, 'Uruguay': 98, 'South Africa': 2, 'Egypt': 12, 'Morocco': 35,
  'Poland': 20, 'Turkey': 28, 'Russia': 18, 'Saudi Arabia': 0.1, 'United Arab Emirates': 1,
  'Singapore': 0, 'Thailand': 15, 'Indonesia': 12, 'Vietnam': 35, 'Philippines': 24,
};

function getRenewableColor(percentage) {
  if (percentage === undefined) percentage = 15; // default gray for unknown
  const t = percentage / 100;
  // gradient: dark red (low) -> yellow -> green (high)
  if (t < 0.5) {
    return new THREE.Color(1, t * 2, 0); // red -> yellow
  } else {
    return new THREE.Color(2 - t * 2, 1, 0); // yellow -> green
  }
}

// draw continent/country boundaries using GeoJSON and color by renewable energy
function latLonToVector3(lat, lon, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

fetch('https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json')
  .then((res) => res.json())
  .then((data) => {
    geoJsonData = data; // store for hover detection
    // compute approximate country centers for camera focus
    countryCenters.clear();
    data.features.forEach((feat) => {
      let coords = feat.geometry.coordinates;
      if (feat.geometry.type === 'Polygon') coords = [coords];

      const sum = new THREE.Vector3(0, 0, 0);
      let count = 0;
      coords.forEach((polygon) => {
        const outerRing = polygon[0];
        if (!outerRing) return;
        outerRing.forEach(([lon, lat]) => {
          const v = latLonToVector3(lat, lon, 1.0);
          sum.add(v);
          count += 1;
        });
      });

      if (count > 0) {
        sum.normalize();
        const { lat, lon } = vector3ToLatLon(sum);
        countryCenters.set(feat.properties.name, { lat, lon });
      }
    });

    buildCountryList();
    if (countrySearch) {
      countrySearch.addEventListener('input', (e) => {
        filterCountryList(e.target.value);
      });
    }
    borders = new THREE.Group();
    countryParticles = new THREE.Group();
    
    // point-in-polygon helper (redeclare locally for polygon generation)
    function pointInPolygonLocal(testLon, testLat, ring) {
      let inside = false;
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [lon1, lat1] = ring[i];
        const [lon2, lat2] = ring[j];
        if ((lat1 > testLat) !== (lat2 > testLat) &&
            testLon < ((lon2 - lon1) * (testLat - lat1)) / (lat2 - lat1) + lon1) {
          inside = !inside;
        }
      }
      return inside;
    }
    
    data.features.forEach((feat) => {
      const countryName = feat.properties.name;
      const renewablePercent = renewableEnergyData[countryName] || 15;
      const fillColor = getRenewableColor(renewablePercent);
      const lineColor = fillColor.clone().multiplyScalar(1.0); // brighten for lines
      const lineMat = new THREE.LineBasicMaterial({ color: lineColor, linewidth: 1 });
      
      let coords = feat.geometry.coordinates;
      if (feat.geometry.type === 'Polygon') coords = [coords];
      
      coords.forEach((polygon) => {
        const distances_from_core = [1.001, 1.002, 1.003, 1.004, 1.005, 1.006, 1.007, 1.008, 1.009]; // multiple lines for stronger borders
        distances_from_core.forEach((dist, layerIndex) => {
            polygon.forEach((ring) => {
            // draw borders
            const points = ring.map(([lon, lat]) => latLonToVector3(lat, lon, dist));
            const g = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(g, lineMat);
          line.userData = { countryName, renewablePercent, layerIndex };
            borders.add(line);
            });
        });

        // create particle glow for country
        const outerRing = polygon[0];
        if (outerRing && outerRing.length > 2) {
          // find bounding box
          let minLat = outerRing[0][1], maxLat = outerRing[0][1];
          let minLon = outerRing[0][0], maxLon = outerRing[0][0];
          outerRing.forEach(([lon, lat]) => {
            minLat = Math.min(minLat, lat);
            maxLat = Math.max(maxLat, lat);
            minLon = Math.min(minLon, lon);
            maxLon = Math.max(maxLon, lon);
          });
          
          // point-in-polygon helper
          // function pointInPolygon(testLon, testLat, ring) {
          //   let inside = false;
          //   for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
          //     const [lon1, lat1] = ring[i];
          //     const [lon2, lat2] = ring[j];
          //     if ((lat1 > testLat) !== (lat2 > testLat) &&
          //         testLon < ((lon2 - lon1) * (testLat - lat1)) / (lat2 - lat1) + lon1) {
          //       inside = !inside;
          //     }
          //   }
          //   return inside;
          // }
          
          // generate particles within polygon
        const particleCount = Math.floor(((maxLon - minLon) * (maxLat - minLat)) * 1);
        // const particleCount = 100;
          const positions = [];
          const colors = [];
          let attempts = 0;
          while (positions.length < particleCount * 3 && attempts < 10000) {
            const lon = minLon + Math.random() * (maxLon - minLon);
            const lat = minLat + Math.random() * (maxLat - minLat);
            if (pointInPolygonLocal(lon, lat, outerRing)) {
              const pos = latLonToVector3(lat, lon, 1.00 + Math.random() * 0.01);
              positions.push(pos.x, pos.y, pos.z);
              colors.push(fillColor.r, fillColor.g, fillColor.b);
            }
            attempts++;
          }
          
          if (positions.length > 0) {
            const particleGeo = new THREE.BufferGeometry();
            particleGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
            particleGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3));
            const particleMat = new THREE.PointsMaterial({
              size: 0.004,
              vertexColors: true,
              transparent: false,
              opacity: 0.9,
              depthWrite: false,
            });
            const particles = new THREE.Points(particleGeo, particleMat);
            particles.userData = { countryName };
            countryParticles.add(particles);
          }
        }
      });
    });
    
    scene.add(countryParticles);
    scene.add(borders);
    
    // add ocean particles
    const oceanParticles = new THREE.Group();
    const oceanPositions = [];
    const oceanColors = [];
    const oceanParticleCount = 10000;
    
    for (let i = 0; i < oceanParticleCount; i++) {
      const lat = (Math.random() - 0.5) * 180;
      const lon = (Math.random() - 0.5) * 360;
      let isLand = false;
      
      // check if point is inside any country
      for (const feat of data.features) {
        let coords = feat.geometry.coordinates;
        if (feat.geometry.type === 'Polygon') coords = [coords];
        
        for (const polygon of coords) {
          const outerRing = polygon[0];
          if (pointInPolygon(lon, lat, outerRing)) {
            isLand = true;
            break;
          }
        }
        if (isLand) break;
      }
      
      if (!isLand) {
        const pos = latLonToVector3(lat, lon, 1.01);
        oceanPositions.push(pos.x, pos.y, pos.z);
        oceanColors.push(0, 0.5, 1); // blue ocean color
      }
    }
    
    if (oceanPositions.length > 0) {
      const oceanParticleGeo = new THREE.BufferGeometry();
      oceanParticleGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(oceanPositions), 3));
      oceanParticleGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(oceanColors), 3));
      const oceanParticleMat = new THREE.PointsMaterial({
        size: 0.005,
        vertexColors: true,
        transparent: false,
        opacity: 0.8,
        depthWrite: false,
      });
      const oceanParticleSystem = new THREE.Points(oceanParticleGeo, oceanParticleMat);
      oceanParticles.add(oceanParticleSystem);
    }
    
    scene.add(oceanParticles);
  })
  .catch((err) => console.error('GeoJSON load error', err));

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', onWindowResize);

function animate() {
  requestAnimationFrame(animate);
  clouds.rotation.y += 0.0007;
  atmosphere.rotation.y += 0.0005;
  if (focusActive) {
    focusProgress = Math.min(1, focusProgress + 0.035);
    const t = focusProgress < 0.5
      ? 2 * focusProgress * focusProgress
      : 1 - Math.pow(-2 * focusProgress + 2, 2) / 2;
    camera.position.lerpVectors(focusStartPos, focusEndPos, t);
    controls.target.lerpVectors(focusStartTarget, focusEndTarget, t);
    if (focusProgress >= 1) focusActive = false;
  }
  controls.update();

  // hover detection: raycast to sphere and find country
  const hit = getLatLonFromMouse(mouse);
  let hoveredCountry = null;
  if (hit) {
    const { lat, lon } = hit;
    hoveredCountry = findCountryAtLatLon(lat, lon);

    if (hoveredCountry) {
      const renewPercent = renewableEnergyData[hoveredCountry] || 15;
      const color = getRenewableColor(renewPercent);
      const r = Math.round(Math.min(1, color.r) * 255);
      const g = Math.round(Math.min(1, color.g) * 255);
      const b = Math.round(Math.min(1, color.b) * 255);
      if (hoverTooltip) {
        hoverTooltip.style.display = 'block';
        hoverTooltipText.textContent = `${hoveredCountry} — ${renewPercent}% renewables`;
        hoverTooltipDot.style.background = `rgb(${r}, ${g}, ${b})`;
        hoverTooltipDot.style.boxShadow = `0 0 10px rgba(${r}, ${g}, ${b}, 0.8)`;
      }
    } else {
      if (hoverTooltip) {
        hoverTooltip.style.display = 'block';
        hoverTooltipText.textContent = 'Ocean — blue water';
        hoverTooltipDot.style.background = '#2d9cff';
        hoverTooltipDot.style.boxShadow = '0 0 10px rgba(45, 156, 255, 0.8)';
      }
    }
  } else if (hoverTooltip) {
    hoverTooltip.style.display = 'none';
  }

  // HUD + chart reflect selected country only
  if (selectedCountry) {
    const renewPercent = renewableEnergyData[selectedCountry] || 15;
    const color = getRenewableColor(renewPercent);
    const r = Math.round(Math.min(1, color.r) * 255);
    const g = Math.round(Math.min(1, color.g) * 255);
    const b = Math.round(Math.min(1, color.b) * 255);
    hoverName.textContent = selectedCountry;
    hoverValue.textContent = `${renewPercent}% renewables`;
    hoverSwatch.style.background = `rgb(${r}, ${g}, ${b})`;
    hoverSwatch.style.boxShadow = `0 0 14px rgba(${r}, ${g}, ${b}, 0.7)`;
    if (chartPanel) {
      chartPanel.style.display = 'block';
      chartTitle.textContent = `${selectedCountry} — renewable energy trend`;
      drawTrendChart(getTrendSeries(selectedCountry, renewPercent), color);
    }
  } else {
    hoverName.textContent = 'Hover a country';
    hoverValue.textContent = 'Move your mouse over land or ocean';
    hoverSwatch.style.background = '#666';
    hoverSwatch.style.boxShadow = '0 0 12px rgba(255, 255, 255, 0.25)';
    if (chartPanel) {
      chartPanel.style.display = 'none';
    }
  }

  composer.render();
}

animate();
