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
const stateCenters = new Map();
let selectedCountry = null;
let countryParticles; // group of country particles
let usStatesData = null;
let usStateBorders = null;
let selectedState = null;
const US_COUNTRY_NAME = 'United States of America';

const STATE_CODE_MAP = {
  'AK': 'Alaska', 'AL': 'Alabama', 'AR': 'Arkansas', 'AZ': 'Arizona',
  'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut',
  'DE': 'Delaware', 'FL': 'Florida', 'GA': 'Georgia',
  'HI': 'Hawaii', 'IA': 'Iowa', 'ID': 'Idaho', 'IL': 'Illinois',
  'IN': 'Indiana', 'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana',
  'MA': 'Massachusetts', 'MD': 'Maryland', 'ME': 'Maine',
  'MI': 'Michigan', 'MN': 'Minnesota', 'MO': 'Missouri',
  'MS': 'Mississippi', 'MT': 'Montana', 'NC': 'North Carolina',
  'ND': 'North Dakota', 'NE': 'Nebraska', 'NH': 'New Hampshire',
  'NJ': 'New Jersey', 'NM': 'New Mexico', 'NV': 'Nevada',
  'NY': 'New York', 'OH': 'Ohio', 'OK': 'Oklahoma', 'OR': 'Oregon',
  'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
  'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas',
  'UT': 'Utah', 'VA': 'Virginia', 'VT': 'Vermont',
  'WA': 'Washington', 'WI': 'Wisconsin', 'WV': 'West Virginia', 'WY': 'Wyoming'
};
let renewableEnergyData = {};
const renewablesByEntity = new Map();
const renewableEntitySet = new Set();
const renewableEntityNormMap = new Map();
const geoNameNormMap = new Map();

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
const metricButtons = document.getElementById('metricButtons');
const chartTooltip = document.getElementById('chartTooltip');
const chartDot = document.getElementById('chartDot');
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

const YEAR_START = 2000;
const YEAR_END = 2023;
const YEARS = Array.from({ length: YEAR_END - YEAR_START + 1 }, (_, i) => YEAR_START + i);

const metricData = {
  renewables: new Map(),
  population: new Map(),
  emissions_total: new Map(),
  gdp: new Map(),
};

const stateData = {
  renewables: new Map(),
  population: new Map(),
  emissions_total: new Map(),
  gdp: new Map(),
};

const metricMeta = {
  renewables: { label: 'Renewable share (%)', unit: '%' },
  population: { label: 'Population', unit: 'people' },
  emissions_total: { label: 'CO₂ emissions (total)', unit: 't' },
  gdp: { label: 'GDP (Penn World Table)', unit: 'USD' },
};

let selectedMetric = 'renewables';
let lastChartSeries = null;
let lastChartUnit = null;
let lastChartLabel = null;

if (trendChart) {
  trendChart.addEventListener('mousemove', onChartMouseMove, false);
  trendChart.addEventListener('mouseleave', onChartMouseLeave, false);
}

function onChartMouseMove(event) {
  if (!lastChartSeries || !lastChartUnit || !chartTooltip) return;
  const rect = trendChart.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const padLeft = 26;
  const padRight = 8;
  const padTop = 6;
  const padBottom = 18;
  if (x < padLeft || x > rect.width - padRight || y < padTop || y > rect.height - padBottom) {
    chartTooltip.style.display = 'none';
    return;
  }

  const t = (x - padLeft) / (rect.width - padLeft - padRight);
  const idx = Math.max(0, Math.min(YEARS.length - 1, Math.round(t * (YEARS.length - 1))));
  const value = lastChartSeries[idx];
  if (value === null || Number.isNaN(value)) {
    chartTooltip.style.display = 'none';
    if (chartDot) chartDot.style.display = 'none';
    return;
  }

  chartTooltip.style.display = 'block';
  chartTooltip.style.left = `${event.clientX}px`;
  chartTooltip.style.top = `${event.clientY}px`;
  chartTooltip.textContent = `${YEARS[idx]} • ${formatValue(value, lastChartUnit)}${lastChartUnit === '%' ? '' : ''}`;

  if (chartDot) {
    const padLeft = 45;
    const padRight = 8;
    const padTop = 6;
    const padBottom = 18;
    const values = lastChartSeries.filter((v) => typeof v === 'number');
    let minVal = lastChartUnit === '%' ? 0 : Math.min(...values);
    let maxVal = lastChartUnit === '%' ? 100 : Math.max(...values);
    if (minVal === maxVal) maxVal = minVal + 1;
    const cx = rect.left + padLeft + (idx / (YEARS.length - 1)) * (rect.width - padLeft - padRight);
    const cy = rect.top + padTop + (1 - (value - minVal) / (maxVal - minVal)) * (rect.height - padTop - padBottom);
    chartDot.style.display = 'block';
    chartDot.style.left = `${cx}px`;
    chartDot.style.top = `${cy}px`;
  }
}

function onChartMouseLeave() {
  if (chartTooltip) chartTooltip.style.display = 'none';
  if (chartDot) chartDot.style.display = 'none';
}
if (metricButtons) {
  metricButtons.addEventListener('click', (e) => {
    const btn = e.target.closest('.metric-btn');
    if (!btn) return;
    selectedMetric = btn.dataset.metric;
    metricButtons.querySelectorAll('.metric-btn').forEach((b) => {
      b.classList.toggle('active', b === btn);
    });
  });
}

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

  // if US or a state is selected, allow state selection
  if ((selectedCountry === US_COUNTRY_NAME || selectedState) && usStatesData) {
    const state = findStateAtLatLon(lat, lon);
    if (state) {
      setSelectedCountry(null);
      selectedState = state;
      applyCountrySelectionVisuals(US_COUNTRY_NAME);
      return;
    }
  }

  selectedState = null;
  const country = findCountryAtLatLon(lat, lon);


  setSelectedCountry(country);
  updateUsStateVisibility();
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

function findStateAtLatLon(lat, lon) {
  if (!usStatesData) return null;
  for (const feat of usStatesData.features) {
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

function updateUsStateVisibility() {
  if (usStateBorders) {
    usStateBorders.visible = selectedCountry === US_COUNTRY_NAME || !!selectedState;
  }
  updateUsStateSelectionStyles();
  updateUsStateParticleColors();
}

function updateUsStateSelectionStyles() {
  if (!usStateBorders) return;
  const hasSelection = !!selectedState;
  usStateBorders.children.forEach((line) => {
    const isSelected = line.userData && line.userData.stateName === selectedState;
    if (line.material) {
      line.material.opacity = hasSelection ? (isSelected ? 1.0 : 0.2) : 0.9;
      const baseColor = (line.userData && line.userData.baseColor) || 0x99ccff;
      line.material.color.set(hasSelection && isSelected ? 0xffffff : baseColor);
    }
  });
}

function isPointInState(lat, lon, feature) {
  if (!feature) return false;
  let coords = feature.geometry.coordinates;
  if (feature.geometry.type === 'Polygon') coords = [coords];
  for (const polygon of coords) {
    const outerRing = polygon[0];
    if (outerRing && pointInPolygon(lon, lat, outerRing)) {
      return true;
    }
  }
  return false;
}

function updateUsParticleBaseColorsByState() {
  if (!countryParticles || !usStatesData) return;

  countryParticles.children.forEach((points) => {
    if (!points.userData || points.userData.countryName !== US_COUNTRY_NAME) return;
    const baseColors = points.userData.baseColors;
    const latLons = points.userData.latLons;
    if (!baseColors || !latLons) return;

    // Update base colors based on state boundaries
    for (let i = 0; i < latLons.length; i += 2) {
      const lat = latLons[i];
      const lon = latLons[i + 1];
      
      // Find which state this particle is in
      let particleState = null;
      for (const feat of usStatesData.features) {
        if (isPointInState(lat, lon, feat)) {
          particleState = feat.properties.name;
          break;
        }
      }
      
      if (particleState) {
        const statePercent = renewableEnergyData[particleState] ?? renewableEnergyData[US_COUNTRY_NAME] ?? 15;
        const stateColor = getRenewableColor(statePercent);
        const idx = (i / 2) * 3;
        baseColors[idx] = stateColor.r;
        baseColors[idx + 1] = stateColor.g;
        baseColors[idx + 2] = stateColor.b;
      }
    }

    // Apply updated base colors to geometry
    const colorAttr = points.geometry && points.geometry.getAttribute('color');
    if (colorAttr) {
      for (let i = 0; i < baseColors.length; i++) {
        colorAttr.array[i] = baseColors[i];
      }
      colorAttr.needsUpdate = true;
    }
  });
}

function updateUsStateParticleColors() {
  if (!countryParticles) return;

  let stateFeature = null;
  if (selectedState && usStatesData) {
    stateFeature = usStatesData.features.find((feat) => feat.properties.name === selectedState) || null;
  }

  const statePercent = selectedState
    ? (renewableEnergyData[selectedState] ?? renewableEnergyData[US_COUNTRY_NAME] ?? 15)
    : null;
  const stateColor = selectedState ? getRenewableColor(statePercent) : null;

  countryParticles.children.forEach((points) => {
    if (!points.userData || points.userData.countryName !== US_COUNTRY_NAME) return;
    const baseColors = points.userData.baseColors;
    const latLons = points.userData.latLons;
    const colorAttr = points.geometry && points.geometry.getAttribute('color');
    if (!baseColors || !latLons || !colorAttr) return;

    const colors = colorAttr.array;
    const dimFactor = 0.2;
    for (let i = 0; i < latLons.length; i += 2) {
      const lat = latLons[i];
      const lon = latLons[i + 1];
      const idx = (i / 2) * 3;
      if (selectedState && isPointInState(lat, lon, stateFeature)) {
        colors[idx] = stateColor.r;
        colors[idx + 1] = stateColor.g;
        colors[idx + 2] = stateColor.b;
      } else {
        colors[idx] = baseColors[idx] * (selectedState ? dimFactor : 1);
        colors[idx + 1] = baseColors[idx + 1] * (selectedState ? dimFactor : 1);
        colors[idx + 2] = baseColors[idx + 2] * (selectedState ? dimFactor : 1);
      }
    }

    colorAttr.needsUpdate = true;
    if (points.material) {
      points.material.transparent = false;
      points.material.opacity = 0.9;
    }
  });
}

function setSelectedCountry(countryName) {
  if (selectedCountry === countryName) return;
  selectedCountry = countryName;
  if (countryName !== US_COUNTRY_NAME) {
    selectedState = null;
  }

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

  applyCountrySelectionVisuals(countryName);
}

function applyCountrySelectionVisuals(countryName) {
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
        points.material.transparent = false;
        points.material.opacity = 0.9;
      }
    });
  }

  if (!countryName || !geoJsonData) {
    if (borders) {
      borders.children.forEach((line) => {
        line.visible = true;
      });
    }
    updateUsStateVisibility();
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
  updateUsStateVisibility();
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
  let center = countryCenters.get(countryName);
  if (!center) {
    center = stateCenters.get(countryName);
  }
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

function splitCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\bthe\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (!lines.length) return { headers: [], rows: [] };
  const headers = splitCSVLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const cols = splitCSVLine(line);
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = cols[idx] ?? '';
    });
    rows.push(row);
  }
  return { headers, rows };
}

function loadMetricFromCsv(text, valueColumn) {
  const { rows } = parseCSV(text);
  const data = new Map();
  rows.forEach((row) => {
    const entity = row.Entity;
    const year = parseInt(row.Year, 10);
    const val = parseFloat(row[valueColumn]);
    if (!entity || Number.isNaN(year) || Number.isNaN(val)) return;
    if (year < YEAR_START || year > YEAR_END) return;
    if (!data.has(entity)) data.set(entity, new Map());
    data.get(entity).set(year, val);
  });
  return data;
}

function buildRenewableNameMaps() {
  renewableEntitySet.clear();
  renewableEntityNormMap.clear();
  metricData.renewables.forEach((_map, entity) => {
    renewableEntitySet.add(entity);
    renewableEntityNormMap.set(normalizeName(entity), entity);
  });
}

function buildGeoNameMap() {
  geoNameNormMap.clear();
  if (!geoJsonData) return;
  geoJsonData.features.forEach((feat) => {
    const name = feat.properties.name;
    geoNameNormMap.set(normalizeName(name), name);
  });
}

function resolveEntityName(name) {
  const aliases = {
    'United States of America': 'United States',
    'Russian Federation': 'Russia',
    'Congo, Dem. Rep.': 'Democratic Republic of Congo',
    'Congo, Rep.': 'Republic of Congo',
    'Czech Republic': 'Czechia',
    'Korea, Rep.': 'South Korea',
    'Korea, Dem. Rep.': 'North Korea',
    'Iran (Islamic Republic of)': 'Iran',
    'Viet Nam': 'Vietnam',
    'Syrian Arab Republic': 'Syria',
    'Venezuela, RB': 'Venezuela',
    'United Republic of Tanzania': 'Tanzania',
    'Lao PDR': 'Laos',
    'Bolivia (Plurinational State of)': 'Bolivia',
    'Republic of Serbia': 'Serbia',
    'Cabo Verde': 'Cape Verde',
    'Eswatini': 'Swaziland',
    'Timor-Leste': 'Timor',
    'Myanmar (Burma)': 'Myanmar',
  };
  const direct = aliases[name] || name;
  if (renewableEntitySet.has(direct)) return direct;
  const norm = normalizeName(direct);
  return renewableEntityNormMap.get(norm) || direct;
}

function resolveGeoNameFromCsv(csvName) {
  if (!geoJsonData) return null;
  if (geoNameNormMap.has(normalizeName(csvName))) {
    return geoNameNormMap.get(normalizeName(csvName));
  }
  const aliases = {
    'United States': 'United States of America',
    'Russia': 'Russian Federation',
    'Czechia': 'Czech Republic',
    'South Korea': 'Korea, Republic of',
    'North Korea': 'Korea, Democratic People\'s Republic of',
    'Iran': 'Iran, Islamic Republic of',
    'Vietnam': 'Viet Nam',
    'Syria': 'Syrian Arab Republic',
    'Venezuela': 'Venezuela, Bolivarian Republic of',
    'Tanzania': 'Tanzania, United Republic of',
    'Laos': 'Lao People\'s Democratic Republic',
    'Bolivia': 'Bolivia, Plurinational State of',
    'Serbia': 'Republic of Serbia',
    'Cape Verde': 'Cabo Verde',
    'Swaziland': 'Eswatini',
    'Timor': 'Timor-Leste',
  };
  const alias = aliases[csvName];
  if (alias && geoNameNormMap.has(normalizeName(alias))) {
    return geoNameNormMap.get(normalizeName(alias));
  }
  return null;
}

function getLatestValue(entityMap) {
  let latestYear = null;
  let latestVal = null;
  entityMap.forEach((val, year) => {
    if (year >= YEAR_START && year <= YEAR_END) {
      if (latestYear === null || year > latestYear) {
        latestYear = year;
        latestVal = val;
      }
    }
  });
  return latestVal;
}

function updateRenewableEnergyData() {
  if (!geoJsonData || !metricData.renewables) return;
  renewableEnergyData = {};
  geoJsonData.features.forEach((feat) => {
    const geoName = feat.properties.name;
    const entityName = resolveEntityName(geoName);
    const entityMap = metricData.renewables.get(entityName);
    const latest = entityMap ? getLatestValue(entityMap) : null;
    if (Number.isFinite(latest)) {
      renewableEnergyData[geoName] = latest;
    }
  });
}

async function loadAllMetrics() {
  const [renewText, popText, totalText, gdpText] = await Promise.all([
    fetch('data/share-electricity-renewables/share-electricity-renewables.csv').then((r) => r.text()),
    fetch('data/population/population.csv').then((r) => r.text()),
    fetch('data/annual-co-emissions-by-region/annual-co-emissions-by-region.csv').then((r) => r.text()),
    fetch('data/gdp-penn-world-table/gdp-penn-world-table.csv').then((r) => r.text()),
  ]);

  metricData.renewables = loadMetricFromCsv(renewText, 'Renewables');
  metricData.population = loadMetricFromCsv(popText, 'all years');
  metricData.emissions_total = loadMetricFromCsv(totalText, 'Annual CO₂ emissions');
  metricData.gdp = loadMetricFromCsv(gdpText, 'GDP');
  buildRenewableNameMaps();
  updateRenewableEnergyData();
}

loadAllMetrics();
loadUsStates();
loadStateCapacityData();
loadStatePopulationData();
loadStateCO2Data();
loadStateGDPData();

function loadStateCapacityData() {
  fetch('data/existcapacity_annual.csv')
    .then((res) => res.text())
    .then((text) => {
      const lines = text.trim().split(/\r?\n/).slice(2); // skip header rows
      const stateCapacityByYear = new Map(); // Map<stateName, Map<year, {total, renewable}>>
      
      lines.forEach((line) => {
        const cols = splitCSVLine(line);
        const year = parseInt(cols[0], 10);
        const stateCode = cols[1];
        const producerType = cols[2];
        const fuelSource = cols[3];
        const capacity = parseFloat(cols[6]?.replace(/,/g, '') || 0);
        
        if (year < YEAR_START || year > YEAR_END || producerType !== 'Total Electric Power Industry') return;
        if (!STATE_CODE_MAP[stateCode]) return;
        
        const stateName = STATE_CODE_MAP[stateCode];
        if (!stateCapacityByYear.has(stateName)) {
          stateCapacityByYear.set(stateName, new Map());
        }
        
        const yearMap = stateCapacityByYear.get(stateName);
        if (!yearMap.has(year)) {
          yearMap.set(year, { total: 0, renewable: 0 });
        }
        
        const data = yearMap.get(year);
        
        if (fuelSource === 'All Sources') {
          data.total = capacity;
        } else if (
          fuelSource === 'Hydroelectric' ||
          fuelSource === 'Wind' ||
          fuelSource === 'Solar Thermal and Photovoltaic' ||
          fuelSource === 'Geothermal' ||
          fuelSource === 'Wood and Wood Derived Fuels' ||
          fuelSource === 'Other Biomass'
        ) {
          data.renewable += capacity;
        }
      });
      
      // Calculate percentages for all years and store in stateData.renewables
      stateCapacityByYear.forEach((yearMap, stateName) => {
        const percentMap = new Map();
        yearMap.forEach((data, year) => {
          if (data.total > 0) {
            const percent = (data.renewable / data.total) * 100;
            percentMap.set(year, percent);
          }
        });
        stateData.renewables.set(stateName, percentMap);
        
        // Store latest year in renewableEnergyData for coloring
        const latestPercent = getLatestValue(percentMap);
        if (Number.isFinite(latestPercent)) {
          renewableEnergyData[stateName] = latestPercent;
        }
      });
      
      // Update US particle colors by state
      updateUsParticleBaseColorsByState();
      
      // Rebuild state borders with new colors
      buildUsStateBorders();
      
      // Rebuild country list to include state data
      buildCountryList();
    })
    .catch((err) => console.error('State capacity load error', err));
}

function loadStatePopulationData() {
  fetch('data/historical_state_population_by_year.csv')
    .then((res) => res.text())
    .then((text) => {
      const lines = text.trim().split(/\r?\n/);
      
      lines.forEach((line) => {
        const cols = line.split(',');
        const stateCode = cols[0];
        const year = parseInt(cols[1], 10);
        const population = parseFloat(cols[2]);
        
        if (year < YEAR_START || year > YEAR_END) return;
        if (!STATE_CODE_MAP[stateCode]) return;
        
        const stateName = STATE_CODE_MAP[stateCode];
        if (!stateData.population.has(stateName)) {
          stateData.population.set(stateName, new Map());
        }
        
        stateData.population.get(stateName).set(year, population);
      });
    })
    .catch((err) => console.error('State population load error', err));
}

function loadStateCO2Data() {
  fetch('data/co2_emissions_by_state.csv')
    .then((res) => res.text())
    .then((text) => {
      const lines = text.trim().split(/\r?\n/);
      const header = lines[0].split(',');
      
      // Find year column indices (starts at column 3)
      const yearStartIndex = 3;
      const years = header.slice(yearStartIndex).map((y) => parseInt(y, 10));
      
      lines.slice(1).forEach((line) => {
        const cols = splitCSVLine(line);
        const stateCode = cols[1];
        const msn = cols[2]; // Metric code
        
        // Use TETCE (Total Energy Total Carbon Emissions) for total emissions
        if (msn !== 'TETCE') return;
        if (!STATE_CODE_MAP[stateCode]) return;
        
        const stateName = STATE_CODE_MAP[stateCode];
        if (!stateData.emissions_total.has(stateName)) {
          stateData.emissions_total.set(stateName, new Map());
        }
        
        const emissionsMap = stateData.emissions_total.get(stateName);
        
        // Parse emissions for each year
        years.forEach((year, idx) => {
          if (year < YEAR_START || year > YEAR_END) return;
          const value = parseFloat(cols[yearStartIndex + idx]);
          if (Number.isFinite(value)) {
            // Convert from million metric tons to metric tons
            emissionsMap.set(year, value * 1_000_000);
          }
        });
      });
    })
    .catch((err) => console.error('State CO2 load error', err));
}

function loadStateGDPData() {
  fetch('data/per_state_gdp.csv')
    .then((res) => res.text())
    .then((text) => {
      const lines = text.trim().split(/\r?\n/);
      const header = splitCSVLine(lines[0]);
      
      // Find year column indices (starts at column 8)
      const yearStartIndex = 8;
      const years = header.slice(yearStartIndex).map((y) => parseInt(y, 10));
      
      lines.slice(1).forEach((line) => {
        const cols = splitCSVLine(line);
        const geoName = cols[1];
        const lineCode = cols[4];
        
        // Use LineCode 3 (Current-dollar GDP in millions)
        if (lineCode !== '3') return;
        
        // Remove quotes and spaces from state name
        const stateName = geoName.replace(/^"|"$/g, '').trim();
        
        // Skip US total and check if it's a valid state
        if (stateName === 'United States' || !Object.values(STATE_CODE_MAP).includes(stateName)) return;
        
        if (!stateData.gdp.has(stateName)) {
          stateData.gdp.set(stateName, new Map());
        }
        
        const gdpMap = stateData.gdp.get(stateName);
        
        // Parse GDP for each year
        years.forEach((year, idx) => {
          if (year < YEAR_START || year > YEAR_END) return;
          const value = parseFloat(cols[yearStartIndex + idx]);
          if (Number.isFinite(value)) {
            // Convert from millions to dollars
            gdpMap.set(year, value * 1_000_000);
          }
        });
      });
    })
    .catch((err) => console.error('State GDP load error', err));
}

function getMetricSeries(country, metricKey) {
  const dataMap = metricData[metricKey];
  const entity = resolveEntityName(country);
  const series = [];
  YEARS.forEach((year) => {
    const val = dataMap?.get(entity)?.get(year);
    series.push(Number.isFinite(val) ? val : null);
  });
  return series;
}

function getStateSeries(stateName, metricKey) {
  // For renewables, use real historical data
  if (metricKey === 'renewables') {
    const percentMap = stateData.renewables.get(stateName);
    if (percentMap) {
      const series = [];
      YEARS.forEach((year) => {
        const val = percentMap.get(year);
        series.push(Number.isFinite(val) ? val : null);
      });
      return series;
    }
  }
  
  // For population, use real historical data
  if (metricKey === 'population') {
    const popMap = stateData.population.get(stateName);
    if (popMap) {
      const series = [];
      YEARS.forEach((year) => {
        const val = popMap.get(year);
        series.push(Number.isFinite(val) ? val : null);
      });
      return series;
    }
  }
  
  // For CO2 emissions, use real historical data
  if (metricKey === 'emissions_total') {
    const emissionsMap = stateData.emissions_total.get(stateName);
    if (emissionsMap) {
      const series = [];
      YEARS.forEach((year) => {
        const val = emissionsMap.get(year);
        series.push(Number.isFinite(val) ? val : null);
      });
      return series;
    }
  }
  
  // For GDP, use real historical data
  if (metricKey === 'gdp') {
    const gdpMap = stateData.gdp.get(stateName);
    if (gdpMap) {
      const series = [];
      YEARS.forEach((year) => {
        const val = gdpMap.get(year);
        series.push(Number.isFinite(val) ? val : null);
      });
      return series;
    }
  }
  
  // Placeholder for other metrics
  const seed = hashString(`${stateName}:${metricKey}`) % 10000;
  const rand = (n) => {
    const x = Math.sin(seed + n * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  };

  let base = 50;
  let amp = 20;
  switch (metricKey) {
    case 'population':
      base = 3_000_000 + rand(1) * 25_000_000;
      amp = 1_500_000 + rand(2) * 4_000_000;
      break;
    case 'emissions_total':
      base = 40_000_000 + rand(3) * 400_000_000;
      amp = 20_000_000 + rand(4) * 120_000_000;
      break;
    case 'gdp':
      base = 80_000_000_000 + rand(5) * 700_000_000_000;
      amp = 30_000_000_000 + rand(6) * 150_000_000_000;
      break;
    default:
      base = 25 + rand(7) * 45;
      amp = 10 + rand(8) * 18;
      break;
  }

  const trend = (rand(9) - 0.5) * 0.6;
  const phase = rand(10) * Math.PI * 2;
  const series = [];
  YEARS.forEach((_, i) => {
    const t = i / (YEARS.length - 1);
    const wave = Math.sin(t * Math.PI * 2 + phase) * amp;
    const noise = (rand(i + 11) - 0.5) * amp * 0.15;
    const value = base + wave + base * trend * (t - 0.5) + noise;
    series.push(Math.max(0, value));
  });
  return series;
}

function formatValue(val, unit) {
  if (unit === '%') return `${val.toFixed(1)}%`;
  const abs = Math.abs(val);
  if (abs >= 1e9) return `${(val / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${(val / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${(val / 1e3).toFixed(1)}K`;
  return `${val.toFixed(0)}`;
}

function drawTrendChart(series, color, unit) {
  if (!trendCtx) return;
  const w = trendChart.width;
  const h = trendChart.height;
  const padLeft = 45;
  const padRight = 8;
  const padTop = 6;
  const padBottom = 18;
  trendCtx.clearRect(0, 0, w, h);

  const values = series.filter((v) => typeof v === 'number');
  if (!values.length) {
    trendCtx.fillStyle = 'rgba(255,255,255,0.6)';
    trendCtx.font = '12px Arial';
    trendCtx.textAlign = 'center';
    trendCtx.textBaseline = 'middle';
    trendCtx.fillText('No data available', w / 2, h / 2);
    return;
  }

  let minVal = unit === '%' ? 0 : Math.min(...values);
  let maxVal = unit === '%' ? 100 : Math.max(...values);
  if (minVal === maxVal) {
    maxVal = minVal + 1;
  }

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
  const labelVals = [maxVal, (maxVal + minVal) / 2, minVal];
  labelVals.forEach((val) => {
    const y = padTop + (1 - (val - minVal) / (maxVal - minVal)) * (h - padTop - padBottom);
    trendCtx.fillText(formatValue(val, unit), padLeft - 4, y);
  });

  // year labels (2000-2023)
  trendCtx.textAlign = 'center';
  trendCtx.textBaseline = 'top';
  for (let i = 0; i < YEARS.length; i += 6) {
    const x = padLeft + (i / (series.length - 1)) * (w - padLeft - padRight);
    trendCtx.fillText(`${YEARS[i]}`, x, h - padBottom + 4);
  }

  // line
  const r = Math.round(Math.min(1, color.r) * 255);
  const g = Math.round(Math.min(1, color.g) * 255);
  const b = Math.round(Math.min(1, color.b) * 255);
  trendCtx.strokeStyle = `rgba(${r},${g},${b},0.95)`;
  trendCtx.lineWidth = 2;
  trendCtx.beginPath();
  let started = false;
  series.forEach((v, i) => {
    if (v === null || Number.isNaN(v)) {
      started = false;
      return;
    }
    const x = padLeft + (i / (series.length - 1)) * (w - padLeft - padRight);
    const y = padTop + (1 - (v - minVal) / (maxVal - minVal)) * (h - padTop - padBottom);
    if (!started) {
      trendCtx.moveTo(x, y);
      started = true;
    } else {
      trendCtx.lineTo(x, y);
    }
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
  const csvNames = Array.from(renewableEntitySet);
  const sorted = csvNames
    .map((name) => ({
      csvName: name,
      geoName: resolveGeoNameFromCsv(name),
      latest: getLatestValue(metricData.renewables.get(name) || new Map()),
      isState: false,
    }))
    .filter((entry) => entry.geoName)
    .sort((a, b) => {
      const va = Number.isFinite(a.latest) ? a.latest : -1;
      const vb = Number.isFinite(b.latest) ? b.latest : -1;
      if (vb !== va) return vb - va;
      return a.csvName.localeCompare(b.csvName);
    });

  // Add US states to the list
  const stateEntries = [];
  if (usStatesData) {
    usStatesData.features.forEach((feat) => {
      const stateName = feat.properties.name;
      const percent = renewableEnergyData[stateName];
      stateEntries.push({
        csvName: stateName,
        geoName: stateName,
        latest: percent,
        isState: true,
      });
    });
    // Sort states by renewable percentage
    stateEntries.sort((a, b) => {
      const va = Number.isFinite(a.latest) ? a.latest : -1;
      const vb = Number.isFinite(b.latest) ? b.latest : -1;
      if (vb !== va) return vb - va;
      return a.csvName.localeCompare(b.csvName);
    });
  }

  countryList.innerHTML = '';
  
  // Render countries
  sorted.forEach(({ csvName, geoName, latest }) => {
    const percent = latest;
    const hasData = Number.isFinite(percent);
    const color = hasData ? getRenewableColor(percent) : new THREE.Color(0.4, 0.4, 0.4);
    const r = Math.round(Math.min(1, color.r) * 255);
    const g = Math.round(Math.min(1, color.g) * 255);
    const b = Math.round(Math.min(1, color.b) * 255);

    const item = document.createElement('div');
    item.className = 'country-item';
    item.dataset.name = geoName.toLowerCase();
    item.dataset.isState = 'false';

    const swatch = document.createElement('div');
    swatch.className = 'country-swatch';
    swatch.style.background = `rgb(${r}, ${g}, ${b})`;
    swatch.style.boxShadow = `0 0 8px rgba(${r}, ${g}, ${b}, 0.6)`;

    const label = document.createElement('div');
    label.className = 'country-name';
    label.textContent = csvName;

    const value = document.createElement('div');
    value.className = 'country-value';
    value.textContent = hasData ? `${percent.toFixed(1)}%` : 'No data';

    item.appendChild(swatch);
    item.appendChild(label);
    item.appendChild(value);
    item.addEventListener('click', () => {
      setSelectedCountry(geoName);
      focusOnCountry(geoName);
      updateUsStateVisibility();
    });
    countryList.appendChild(item);
  });
  
  // Render states
  stateEntries.forEach(({ csvName, geoName, latest }) => {
    const percent = latest;
    const hasData = Number.isFinite(percent);
    const color = hasData ? getRenewableColor(percent) : new THREE.Color(0.4, 0.4, 0.4);
    const r = Math.round(Math.min(1, color.r) * 255);
    const g = Math.round(Math.min(1, color.g) * 255);
    const b = Math.round(Math.min(1, color.b) * 255);

    const item = document.createElement('div');
    item.className = 'country-item';
    item.dataset.name = geoName.toLowerCase();
    item.dataset.isState = 'true';

    const swatch = document.createElement('div');
    swatch.className = 'country-swatch';
    swatch.style.background = `rgb(${r}, ${g}, ${b})`;
    swatch.style.boxShadow = `0 0 8px rgba(${r}, ${g}, ${b}, 0.6)`;

    const label = document.createElement('div');
    label.className = 'country-name';
    label.textContent = `${csvName} (US)`;

    const value = document.createElement('div');
    value.className = 'country-value';
    value.textContent = hasData ? `${percent.toFixed(1)}%` : 'No data';

    item.appendChild(swatch);
    item.appendChild(label);
    item.appendChild(value);
    item.addEventListener('click', () => {
        
      setSelectedCountry(null);
      selectedState = geoName;
      applyCountrySelectionVisuals(US_COUNTRY_NAME);
      focusOnCountry(geoName);
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

// Renewable energy data is loaded from CSV into renewableEnergyData

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

function buildUsStateBorders() {
  if (!usStatesData) return;
  if (usStateBorders) {
    scene.remove(usStateBorders);
    usStateBorders.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    });
  }

  usStateBorders = new THREE.Group();
  const distances = [1.002, 1.004, 1.006];

  usStatesData.features.forEach((feat) => {
    const stateName = feat.properties.name;

    const statePercent = renewableEnergyData[stateName] ?? renewableEnergyData[US_COUNTRY_NAME] ?? 15;
    const stateColor = getRenewableColor(statePercent);
    const baseColor = stateColor.getHex();
    const stateLineMat = new THREE.LineBasicMaterial({
      color: stateColor,
      linewidth: 1,
      transparent: true,
      opacity: 0.9,
      depthTest: false,
      depthWrite: false,
    });

    const sum = new THREE.Vector3(0, 0, 0);
    let count = 0;

    let coords = feat.geometry.coordinates;
    if (feat.geometry.type === 'Polygon') coords = [coords];
    coords.forEach((polygon) => {
      polygon.forEach((ring) => {
        distances.forEach((dist) => {
          const points = ring.map(([lon, lat]) => latLonToVector3(lat, lon, dist));
          const g = new THREE.BufferGeometry().setFromPoints(points);
          const line = new THREE.Line(g, stateLineMat.clone());
          line.renderOrder = 10;
          line.frustumCulled = false;
          line.userData = { stateName, baseColor };
          usStateBorders.add(line);

          for (let i = 0; i < ring.length; i++) {
            const [lon, lat] = ring[i];
            const v = latLonToVector3(lat, lon, 1.0);
            sum.add(v);
            count += 1;
          }
        });
      });
    });

    if (count > 0) {
        sum.normalize();
        const { lat, lon } = vector3ToLatLon(sum);
        stateCenters.set(stateName, { lat, lon });
    }
  });

  usStateBorders.visible = false;
  scene.add(usStateBorders);
}

function loadUsStates() {
  fetch('data/us-states.json')
    .then((res) => res.json())
    .then((data) => {
      usStatesData = data;
      buildUsStateBorders();
      updateUsStateVisibility();
    })
    .catch((err) => console.error('US states load error', err));
}

fetch('https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json')
  .then((res) => res.json())
  .then((data) => {
    geoJsonData = data; // store for hover detection
    buildGeoNameMap();
    updateRenewableEnergyData();
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
          const latLons = [];
          let attempts = 0;
          while (positions.length < particleCount * 3 && attempts < 10000) {
            const lon = minLon + Math.random() * (maxLon - minLon);
            const lat = minLat + Math.random() * (maxLat - minLat);
            if (pointInPolygonLocal(lon, lat, outerRing)) {
              const pos = latLonToVector3(lat, lon, 1.00 + Math.random() * 0.01);
              positions.push(pos.x, pos.y, pos.z);



              colors.push(fillColor.r, fillColor.g, fillColor.b);
              latLons.push(lat, lon);
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
            if (countryName === US_COUNTRY_NAME) {
              particles.userData = {
                countryName,
                baseColors: new Float32Array(colors),
                latLons: new Float32Array(latLons),
              };
            } else {
              particles.userData = { countryName };
            }
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
    if ((selectedCountry === US_COUNTRY_NAME || selectedState) && usStatesData) {
      const state = findStateAtLatLon(lat, lon);
      if (state) {
        hoveredCountry = state;
      } else {
        hoveredCountry = findCountryAtLatLon(lat, lon);
      }
    } else {
      hoveredCountry = findCountryAtLatLon(lat, lon);
    }

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

  // HUD + chart reflect selected country/state
  if (selectedCountry) {
    const renewPercent = renewableEnergyData[selectedCountry];
    const hasData = Number.isFinite(renewPercent);
    const color = hasData ? getRenewableColor(renewPercent) : new THREE.Color(0.4, 0.4, 0.4);
    const r = Math.round(Math.min(1, color.r) * 255);
    const g = Math.round(Math.min(1, color.g) * 255);
    const b = Math.round(Math.min(1, color.b) * 255);
    hoverName.textContent = selectedCountry;
    hoverValue.textContent = hasData ? `${renewPercent}% renewables` : 'No data';
    hoverSwatch.style.background = `rgb(${r}, ${g}, ${b})`;
    hoverSwatch.style.boxShadow = `0 0 14px rgba(${r}, ${g}, ${b}, 0.7)`;
    if (chartPanel) {
      const meta = metricMeta[selectedMetric];
      chartPanel.style.display = 'block';
      chartTitle.textContent = `${selectedCountry} — ${meta.label}`;
      const series = getMetricSeries(selectedCountry, selectedMetric);
      drawTrendChart(series, color, meta.unit);
      lastChartSeries = series;
      lastChartUnit = meta.unit;
      lastChartLabel = meta.label;
    }
  } else if (selectedState) {
    const renewPercent = renewableEnergyData[selectedState];
    const hasData = Number.isFinite(renewPercent);
    const color = hasData ? getRenewableColor(renewPercent) : new THREE.Color(0.4, 0.4, 0.4);
    const r = Math.round(Math.min(1, color.r) * 255);
    const g = Math.round(Math.min(1, color.g) * 255);
    const b = Math.round(Math.min(1, color.b) * 255);
    hoverName.textContent = selectedState;
    hoverValue.textContent = hasData ? `${renewPercent}% renewables` : 'No data';
    hoverSwatch.style.background = `rgb(${r}, ${g}, ${b})`;
    hoverSwatch.style.boxShadow = `0 0 14px rgba(${r}, ${g}, ${b}, 0.7)`;
    if (chartPanel) {
      const meta = metricMeta[selectedMetric];
      chartPanel.style.display = 'block';
      chartTitle.textContent = `${selectedState} — ${meta.label}`;
      const series = getStateSeries(selectedState, selectedMetric);
      drawTrendChart(series, color, meta.unit);
      lastChartSeries = series;
      lastChartUnit = meta.unit;
      lastChartLabel = meta.label;
    }
  } else {
    hoverName.textContent = 'Hover a country';
    hoverValue.textContent = 'Move your mouse over land or ocean';
    hoverSwatch.style.background = '#666';
    hoverSwatch.style.boxShadow = '0 0 12px rgba(255, 255, 255, 0.25)';
    if (chartPanel) {
      chartPanel.style.display = 'none';
      lastChartSeries = null;
      lastChartUnit = null;
      lastChartLabel = null;
    }
  }

  composer.render();
}

animate();
