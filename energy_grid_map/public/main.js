// Fudge distance in degrees (approximate, tweak as needed)
const STATE_BOUNDARY_FUDGE_DISTANCE_DEGREES = 0.15; // ~10-15km, adjust as needed

// Returns true if point is inside polygon or within fudge distance (in degrees) of any edge
function isPointNearPolygon(point, rings, fudgeDegrees) {
  if (isPointInPolygon(point, rings)) return true;
  if (!Array.isArray(rings) || rings.length === 0) return false;
  // If MultiPolygon, flatten one level
  if (Array.isArray(rings[0][0][0])) {
    return rings.some(poly => isPointNearPolygon(point, poly, fudgeDegrees));
  }
  // Check distance to each edge in outer ring
  const [lng, lat] = point;
  for (let i = 0, j = rings[0].length - 1; i < rings[0].length; j = i++) {
    const [x1, y1] = rings[0][i];
    const [x2, y2] = rings[0][j];
    // Compute distance from point to segment
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSq = dx * dx + dy * dy;
    let t = 0;
    if (lengthSq > 0) {
      t = ((lng - x1) * dx + (lat - y1) * dy) / lengthSq;
      t = Math.max(0, Math.min(1, t));
    }
    const projX = x1 + t * dx;
    const projY = y1 + t * dy;
    const distSq = (lng - projX) * (lng - projX) + (lat - projY) * (lat - projY);
    if (distSq <= fudgeDegrees * fudgeDegrees) {
      return true;
    }
  }
  return false;
}
// Point-in-polygon test for [lng, lat] and GeoJSON-style ring (array of [lng, lat])
function isPointInPolygon(point, rings) {
  // Accepts MultiPolygon as array of rings (outer and holes)
  // Returns true if point is inside any outer ring and not in a hole
  // Assumes first ring is outer, subsequent rings are holes (GeoJSON convention)
  // If multiple outer rings (MultiPolygon), test each
  if (!Array.isArray(rings) || rings.length === 0) return false;
  // If rings is array of arrays of arrays, flatten one level (MultiPolygon)
  if (Array.isArray(rings[0][0][0])) {
    // MultiPolygon: rings = [ [ [lng,lat], ... ], ... ]
    return rings.some(poly => isPointInPolygon(point, poly));
  }
  // Standard ray-casting algorithm
  let inside = false;
  for (let i = 0, j = rings[0].length - 1; i < rings[0].length; j = i++) {
    const xi = rings[0][i][0], yi = rings[0][i][1];
    const xj = rings[0][j][0], yj = rings[0][j][1];
    const intersect = ((yi > point[1]) !== (yj > point[1])) &&
      (point[0] < (xj - xi) * (point[1] - yi) / (yj - yi + 1e-12) + xi);
    if (intersect) inside = !inside;
  }
  // If there are holes, check if point is in any hole (rings[1..n])
  if (inside && rings.length > 1) {
    for (let k = 1; k < rings.length; ++k) {
      let inHole = false;
      for (let i = 0, j = rings[k].length - 1; i < rings[k].length; j = i++) {
        const xi = rings[k][i][0], yi = rings[k][i][1];
        const xj = rings[k][j][0], yj = rings[k][j][1];
        const intersect = ((yi > point[1]) !== (yj > point[1])) &&
          (point[0] < (xj - xi) * (point[1] - yi) / (yj - yi + 1e-12) + xi);
        if (intersect) inHole = !inHole;
      }
      if (inHole) return false;
    }
  }
  return inside;
}

const canvas = document.getElementById('glCanvas');
const stateSelect = document.getElementById('stateSelect');
const controlsPanel = document.querySelector('.controls');
const canvasOverlay = document.querySelector('.canvas-overlay');
const bottomControlsGroup = document.querySelector('.bottom-controls-group');
const mobileLegendDock = document.getElementById('mobileLegendDock');
const mobileControlsDock = document.getElementById('mobileControlsDock');

const rootStyle = document.documentElement.style;

function observeLayoutSize(selectorOrElement, cssVarName) {
  const element = typeof selectorOrElement === 'string'
    ? document.querySelector(selectorOrElement)
    : selectorOrElement;
  if (!element) return;
  new ResizeObserver(([entry]) => {
    rootStyle.setProperty(cssVarName, entry.contentRect.height + 'px');
  }).observe(element);
}

observeLayoutSize('.controls', '--top-bar-h');
const dataLayerSelect = document.getElementById('dataLayerSelect');
const generationSubtypeLabel = document.getElementById('generationSubtypeLabel');
const generationSubtypeSelect = document.getElementById('generationSubtypeSelect');
const stateSummary = document.getElementById('stateSummary');
const inspectionPanel = document.getElementById('inspectionPanel');
const inspectionHint = document.getElementById('inspectionHint');
const inspectionDetails = document.getElementById('inspectionDetails');
const detailPanel = document.getElementById('detailPanel');
const detailTabNode = document.getElementById('detailTabNode');
const detailTabRadius = document.getElementById('detailTabRadius');
const densityLegend = document.getElementById('densityLegend');
const generationHeatmapLegend = document.getElementById('generationHeatmapLegend');
const radiusStatsPanel = document.getElementById('radiusStatsPanel');
const radiusStatsHint = document.getElementById('radiusStatsHint');
const radiusStatsBody = document.getElementById('radiusStatsBody');
const radiusStatsSummary = document.getElementById('radiusStatsSummary');
const radiusStatsBreakdown = document.getElementById('radiusStatsBreakdown');
const radiusPieChart = document.getElementById('radiusPieChart');
const radiusPieSummary = document.getElementById('radiusPieSummary');
const radiusBatteryReadout = document.getElementById('radiusBatteryReadout');
const radiusGhostReadout = document.getElementById('radiusGhostReadout');
const radiusEmissionsReadout = document.getElementById('radiusEmissionsReadout');
const radiusConsumptionReadout = document.getElementById('radiusConsumptionReadout');
const radiusSubtabOverview = document.getElementById('radiusSubtabOverview');
const radiusSubtabSubstations = document.getElementById('radiusSubtabSubstations');
const radiusSubtabPowerLines = document.getElementById('radiusSubtabPowerLines');
const radiusSubtabGhostProjects = document.getElementById('radiusSubtabGhostProjects');
const radiusOverviewPanel = document.getElementById('radiusOverviewPanel');
const radiusSubstationPanel = document.getElementById('radiusSubstationPanel');
const radiusPowerLinesPanel = document.getElementById('radiusPowerLinesPanel');
const radiusGhostProjectsPanel = document.getElementById('radiusGhostProjectsPanel');
const radiusSubstationReadout = document.getElementById('radiusSubstationReadout');
const radiusPowerLineReadout = document.getElementById('radiusPowerLineReadout');
const radiusGhostProjectsReadout = document.getElementById('radiusGhostProjectsReadout');
const globalStatsPanel = document.getElementById('globalStatsPanel');
const globalStatsMeta = document.getElementById('globalStatsMeta');
const globalStatsTotals = document.getElementById('globalStatsTotals');
const genPieChart = document.getElementById('genPieChart');
const pieLegend = document.getElementById('pieLegend');
const radiusControl = document.getElementById('radiusControl');
const radiusSizeSlider = document.getElementById('radiusSizeSlider');
const radiusSizeValue = document.getElementById('radiusSizeValue');
const radiusEffectsToggle = document.getElementById('radiusEffectsToggle');
const landmarkLabelsCheckbox = document.getElementById('landmarkLabelsCheckbox');
const radiusEffectsCheckbox = document.getElementById('radiusEffectsCheckbox');
const stateTotalsButton = document.getElementById('stateTotalsButton');
const stateTotalsPopover = document.getElementById('stateTotalsPopover');
const stateTotalsPopoverBackdrop = document.getElementById('stateTotalsPopoverBackdrop');
const stateTotalsPopoverClose = document.getElementById('stateTotalsPopoverClose');
const stateTotalsPopoverBody = document.getElementById('stateTotalsPopoverBody');
const sourcesButton = document.getElementById('sourcesButton');
const sourcesPopover = document.getElementById('sourcesPopover');
const sourcesPopoverBackdrop = document.getElementById('sourcesPopoverBackdrop');
const sourcesPopoverClose = document.getElementById('sourcesPopoverClose');
const sourcesPopoverBody = document.getElementById('sourcesPopoverBody');
const webglWarningPopover = document.getElementById('webglWarningPopover');
const webglWarningBackdrop = document.getElementById('webglWarningBackdrop');
const webglWarningClose = document.getElementById('webglWarningClose');
const webglWarningDetail = document.getElementById('webglWarningDetail');

const legendFloat = document.querySelector('.map-legend-float');
const legendShowAllButton = document.getElementById('legendShowAll');
const legendHideAllButton = document.getElementById('legendHideAll');
let legendMobileDropdown = null;
let legendMobileTrigger = null;
let legendMobileControlsGroup = null;
let legendMobileRadiusGroup = null;
let legendMobileActionsGroup = null;
let legendMobileOptions = null;
let legendMobileExtras = null;
observeLayoutSize(globalStatsPanel, '--global-stats-h');
observeLayoutSize(legendFloat, '--legend-float-h');
observeLayoutSize(radiusControl, '--radius-control-h');
observeLayoutSize(radiusEffectsToggle, '--radius-effects-h');
observeLayoutSize(document.getElementById('sourcesControl'), '--sources-control-h');

const collapsedLayoutQuery = window.matchMedia('(max-width: 1100px)');
const mobileLayoutQuery = window.matchMedia('(max-width: 640px)');
const COLLAPSED_CAMERA_TARGET_X = 0.48;
const DEFAULT_WEBGL_WARNING_DETAIL = 'The browser either does not support WebGL, has GPU acceleration disabled, or blocked WebGL during startup.';

function closeWebGLWarning() {
  if (!webglWarningPopover) {
    return;
  }
  webglWarningPopover.classList.add('is-hidden');
  webglWarningPopover.setAttribute('aria-hidden', 'true');
}

function showWebGLWarning(detail = DEFAULT_WEBGL_WARNING_DETAIL) {
  if (webglWarningDetail) {
    webglWarningDetail.textContent = detail;
  }
  if (!webglWarningPopover) {
    return;
  }
  webglWarningPopover.classList.remove('is-hidden');
  webglWarningPopover.setAttribute('aria-hidden', 'false');
}

webglWarningClose?.addEventListener('click', closeWebGLWarning);
webglWarningBackdrop?.addEventListener('click', closeWebGLWarning);
canvas?.addEventListener('webglcontextcreationerror', (event) => {
  event.preventDefault();
  const detail = event.statusMessage || 'The browser reported a WebGL context creation error while loading the map.';
  showWebGLWarning(detail);
});
canvas?.addEventListener('webglcontextlost', (event) => {
  event.preventDefault();
  showWebGLWarning('The browser lost the WebGL context while the map was loading.');
});

const mobileRelocationEntries = [
  { element: legendFloat, getMobileParent: () => mobileLegendDock },
  { element: controlsPanel, getMobileParent: () => legendMobileControlsGroup || mobileControlsDock },
  { element: detailPanel, getMobileParent: () => mobileControlsDock },
  { element: radiusEffectsToggle, getMobileParent: () => legendMobileRadiusGroup || mobileControlsDock },
  { element: radiusControl, getMobileParent: () => legendMobileRadiusGroup || mobileControlsDock },
  { element: bottomControlsGroup, getMobileParent: () => legendMobileActionsGroup || mobileControlsDock },
].filter((entry) => entry.element)
  .map((entry) => ({
    ...entry,
    originalParent: entry.element.parentNode,
    originalNextSibling: entry.element.nextSibling,
  }));

function restoreRelocatedElement(entry) {
  if (!entry?.element || !entry.originalParent) {
    return;
  }
  if (entry.element.parentNode === entry.originalParent) {
    return;
  }
  if (entry.originalNextSibling && entry.originalNextSibling.parentNode === entry.originalParent) {
    entry.originalParent.insertBefore(entry.element, entry.originalNextSibling);
  } else {
    entry.originalParent.appendChild(entry.element);
  }
}

function applyMobileDockLayout() {
  const isMobile = mobileLayoutQuery.matches;

  if (legendMobileTrigger) {
    legendMobileTrigger.textContent = isMobile ? 'Menu' : 'Legend';
  }
  applyLegendVariantClasses();
  if (legendMobileControlsGroup) {
    legendMobileControlsGroup.hidden = !isMobile;
  }
  if (legendMobileActionsGroup) {
    legendMobileActionsGroup.hidden = !isMobile;
  }
  if (legendMobileRadiusGroup) {
    legendMobileRadiusGroup.hidden = !isMobile || radiusControl?.classList.contains('is-hidden');
  }

  if (mobileLegendDock) {
    mobileLegendDock.setAttribute('aria-hidden', isMobile ? 'false' : 'true');
  }
  if (mobileControlsDock) {
    mobileControlsDock.setAttribute('aria-hidden', isMobile ? 'false' : 'true');
  }

  if (isMobile) {
    mobileRelocationEntries.forEach((entry) => {
      const mobileParent = entry.getMobileParent?.();
      if (!mobileParent) {
        return;
      }
      if (entry.element.parentNode !== mobileParent) {
        mobileParent.appendChild(entry.element);
      }
    });
  } else {
    mobileRelocationEntries.forEach(restoreRelocatedElement);
  }
}

function applyLegendVariantClasses() {
  if (!legendFloat || !legendMobileDropdown) {
    return;
  }

  const isMobile = mobileLayoutQuery.matches;
  legendFloat.classList.toggle('legend-mode-mobile', isMobile);
  legendFloat.classList.toggle('legend-mode-desktop', !isMobile);

  legendMobileDropdown.classList.toggle('legend-desktop-dropdown', !isMobile);
  if (legendMobileTrigger) {
    legendMobileTrigger.classList.toggle('legend-desktop-trigger', !isMobile);
  }

  const panel = legendMobileDropdown.querySelector('.legend-mobile-panel');
  if (panel) {
    panel.classList.toggle('legend-desktop-panel', !isMobile);
  }

  legendMobileDropdown.querySelectorAll('.legend-mobile-group').forEach((group) => {
    group.classList.toggle('legend-desktop-group', !isMobile);
  });

  legendMobileDropdown.querySelectorAll('.legend-mobile-option').forEach((option) => {
    option.classList.toggle('legend-desktop-option', !isMobile);
  });

  const controls = legendMobileDropdown.querySelector('.legend-mobile-controls');
  if (controls) {
    controls.classList.toggle('legend-desktop-controls', !isMobile);
  }
}

function updateCameraTargetForLayout() {
  cameraTarget[0] = mobileLayoutQuery.matches
    ? 0
    : (collapsedLayoutQuery.matches ? COLLAPSED_CAMERA_TARGET_X : 0);
}

if (typeof collapsedLayoutQuery.addEventListener === 'function') {
  collapsedLayoutQuery.addEventListener('change', () => {
    updateCameraTargetForLayout();
    requestRender();
  });
} else if (typeof collapsedLayoutQuery.addListener === 'function') {
  collapsedLayoutQuery.addListener(() => {
    updateCameraTargetForLayout();
    requestRender();
  });
}

if (typeof mobileLayoutQuery.addEventListener === 'function') {
  mobileLayoutQuery.addEventListener('change', () => {
    applyMobileDockLayout();
    updateCameraTargetForLayout();
    requestRender();
  });
} else if (typeof mobileLayoutQuery.addListener === 'function') {
  mobileLayoutQuery.addListener(() => {
    applyMobileDockLayout();
    updateCameraTargetForLayout();
    requestRender();
  });
}

const RADIUS_MIX_COLORS = {
  renewables: '#3de8cb',
  'fossil-fuels': '#ff9f2e',
  nuclear: '#ec00ff',
  'battery-storage': '#00dfb7',
  other: '#96a5ae',
};

const RADIUS_SOURCE_COLORS = {
  solar: '#f2ca1a',
  wind: '#24d8f8',
  hydro: '#2e7cff',
  geothermal: '#ff2f56',
  biomass: '#0fd57a',
  gas: '#f47f23',
  coal: '#7f8da0',
  oil: '#a8935f',
  diesel: '#9b7f53',
  nuclear: '#ec00ff',
  battery: '#00dfb7',
  unknown: '#96a5ae',
};

const SUBSTATION_ROLE_STYLE = {
  'generator-step-up': {
    colorA: [0.95, 0.67, 0.24, 0.95],
    colorB: [1.0, 0.84, 0.42, 1.0],
    shape: 3,
  },
  'transmission-switching': {
    colorA: [0.26, 0.82, 1.0, 0.95],
    colorB: [0.72, 0.94, 1.0, 1.0],
    shape: 2,
  },
  'regional-transfer': {
    colorA: [0.42, 0.69, 1.0, 0.95],
    colorB: [0.86, 0.94, 1.0, 1.0],
    shape: 0,
  },
  'distribution-step-down': {
    colorA: [0.33, 1.0, 0.72, 0.95],
    colorB: [0.76, 1.0, 0.83, 1.0],
    shape: 1,
  },
  'grid-transfer': {
    colorA: [0.75, 0.82, 0.92, 0.95],
    colorB: [0.96, 0.97, 1.0, 1.0],
    shape: 0,
  },
};

const RADIUS_SUBSTATION_ROLE_ORDER = [
  'generator-step-up',
  'transmission-switching',
  'regional-transfer',
  'distribution-step-down',
  'grid-transfer',
];

let activeDetailTab = 'radius';
let activeRadiusSubtab = 'overview';
let lastPointerClientX = null;
let lastPointerClientY = null;
let landmarkLabelsEnabled = true;
let radiusNodeEffectsEnabled = true;

const MOBILE_LEGEND_EXTRA_TOGGLES = [
  {
    key: 'landmarks',
    label: 'Major cities / locations',
    getChecked: () => landmarkLabelsEnabled,
    setChecked: (checked) => {
      landmarkLabelsEnabled = checked;
      if (landmarkLabelsCheckbox) {
        landmarkLabelsCheckbox.checked = checked;
      }
      requestRender();
    },
  },
  {
    key: 'radius-effects',
    label: 'Radius hover lines',
    getChecked: () => radiusNodeEffectsEnabled,
    setChecked: (checked) => {
      radiusNodeEffectsEnabled = checked;
      if (radiusEffectsCheckbox) {
        radiusEffectsCheckbox.checked = checked;
      }
      requestRender();
    },
  },
];

const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
if (!gl) {
  showWebGLWarning();
  throw new Error('WebGL is not supported by this browser.');
}

const lineVertexShaderSource = `
  attribute vec3 aPosition;
  uniform mat4 uProjection;
  uniform mat4 uView;
  uniform mat4 uModel;
  uniform float uYOffset;

  void main() {
    vec3 pos = vec3(aPosition.x, aPosition.y + uYOffset, aPosition.z);
    gl_Position = uProjection * uView * uModel * vec4(pos, 1.0);
  }
`;

const lineFragmentShaderSource = `
  precision mediump float;
  uniform vec4 uColor;

  void main() {
    gl_FragColor = uColor;
  }
`;

const fillVertexShaderSource = `
  attribute vec3 aPosition;
  attribute vec4 aColor;
  uniform mat4 uProjection;
  uniform mat4 uView;
  uniform mat4 uModel;
  varying vec4 vColor;

  void main() {
    vColor = aColor;
    gl_Position = uProjection * uView * uModel * vec4(aPosition, 1.0);
  }
`;

const fillFragmentShaderSource = `
  precision mediump float;
  varying vec4 vColor;

  void main() {
    gl_FragColor = vColor;
  }
`;

const pointVertexShaderSource = `
  attribute vec3 aPosition;
  attribute float aPointSize;
  attribute vec4 aColor;
  attribute float aShape;
  uniform mat4 uProjection;
  uniform mat4 uView;
  uniform mat4 uModel;
  varying vec4 vColor;
  varying float vShape;

  void main() {
    vColor = aColor;
    vShape = aShape;
    gl_PointSize = aPointSize;
    gl_Position = uProjection * uView * uModel * vec4(aPosition, 1.0);
  }
`;

// Shapes: 0=circle  1=diamond  2=ring  3=square
const pointFragmentShaderSource = `
  precision mediump float;
  varying vec4 vColor;
  varying float vShape;

  void main() {
    vec2 c = gl_PointCoord - vec2(0.5);
    if (vShape < 0.5) {
      float r = dot(c, c);
      if (r > 0.25) discard;
      float border = smoothstep(0.17, 0.23, r);
      gl_FragColor = mix(vColor, vec4(1.0, 1.0, 1.0, vColor.a), border * 0.55);
    } else if (vShape < 1.5) {
      float dm = abs(c.x) + abs(c.y);
      if (dm > 0.48) discard;
      float border = smoothstep(0.40, 0.47, dm);
      gl_FragColor = mix(vColor, vec4(1.0, 1.0, 1.0, vColor.a), border * 0.55);
    } else if (vShape < 2.5) {
      float r = dot(c, c);
      if (r > 0.25 || r < 0.10) discard;
      float outerBorder = smoothstep(0.22, 0.25, r);
      float innerBorder = smoothstep(0.12, 0.10, r);
      gl_FragColor = mix(vColor, vec4(1.0, 1.0, 1.0, vColor.a), max(outerBorder, innerBorder) * 0.55);
    } else {
      float sq = max(abs(c.x), abs(c.y));
      if (sq > 0.46) discard;
      float border = smoothstep(0.39, 0.45, sq);
      gl_FragColor = mix(vColor, vec4(1.0, 1.0, 1.0, vColor.a), border * 0.55);
    }
  }
`;

// Halo: flat world-space quads on the ground plane, one per plant
// Vertex layout (stride 36): vec3 aPosition | vec2 aLocalXZ | vec4 aColor
const haloVertexShaderSource = `
  attribute vec3 aPosition;
  attribute vec2 aLocalXZ;
  attribute vec4 aColor;
  uniform mat4 uProjection;
  uniform mat4 uView;
  uniform mat4 uModel;
  varying vec2 vLocalXZ;
  varying vec4 vColor;

  void main() {
    vLocalXZ = aLocalXZ;
    vColor = aColor;
    gl_Position = uProjection * uView * uModel * vec4(aPosition, 1.0);
  }
`;

const haloFragmentShaderSource = `
  precision mediump float;
  varying vec2 vLocalXZ;
  varying vec4 vColor;

  void main() {
    float d = length(vLocalXZ);
    float alpha = exp(-4.6 * d * d) * vColor.a * 0.42;
    gl_FragColor = vec4(vColor.rgb, alpha);
  }
`;

function compileShader(type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    showWebGLWarning(`WebGL started, but shader compilation failed: ${message || 'unknown shader error'}`);
    throw new Error(`Shader compile error: ${message}`);
  }

  return shader;
}

function createProgram(vsSource, fsSource) {
  const vs = compileShader(gl.VERTEX_SHADER, vsSource);
  const fs = compileShader(gl.FRAGMENT_SHADER, fsSource);
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    showWebGLWarning(`WebGL started, but program linking failed: ${message || 'unknown program error'}`);
    throw new Error(`Program link error: ${message}`);
  }

  return program;
}

function identityMatrix() {
  return new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ]);
}

function perspectiveMatrix(fov, aspect, near, far) {
  const f = 1 / Math.tan(fov / 2);
  const nf = 1 / (near - far);

  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) * nf, -1,
    0, 0, (2 * far * near) * nf, 0,
  ]);
}

function subtractVec3(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function crossVec3(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function normalizeVec3(v) {
  const len = Math.hypot(v[0], v[1], v[2]);
  if (len < 1e-8) {
    return [0, 0, 0];
  }

  return [v[0] / len, v[1] / len, v[2] / len];
}

function dotVec3(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function lookAtMatrix(eye, target, up) {
  const zAxis = normalizeVec3(subtractVec3(eye, target));
  const xAxis = normalizeVec3(crossVec3(up, zAxis));
  const yAxis = crossVec3(zAxis, xAxis);

  return new Float32Array([
    xAxis[0], yAxis[0], zAxis[0], 0,
    xAxis[1], yAxis[1], zAxis[1], 0,
    xAxis[2], yAxis[2], zAxis[2], 0,
    -dotVec3(xAxis, eye), -dotVec3(yAxis, eye), -dotVec3(zAxis, eye), 1,
  ]);
}

function multiplyMatrixVector(matrix, vector) {
  return [
    matrix[0] * vector[0] + matrix[4] * vector[1] + matrix[8] * vector[2] + matrix[12] * vector[3],
    matrix[1] * vector[0] + matrix[5] * vector[1] + matrix[9] * vector[2] + matrix[13] * vector[3],
    matrix[2] * vector[0] + matrix[6] * vector[1] + matrix[10] * vector[2] + matrix[14] * vector[3],
    matrix[3] * vector[0] + matrix[7] * vector[1] + matrix[11] * vector[2] + matrix[15] * vector[3],
  ];
}

function multiplyMatrices(a, b) {
  const out = new Float32Array(16);

  for (let col = 0; col < 4; col += 1) {
    for (let row = 0; row < 4; row += 1) {
      let sum = 0;
      for (let i = 0; i < 4; i += 1) {
        sum += a[i * 4 + row] * b[col * 4 + i];
      }
      out[col * 4 + row] = sum;
    }
  }

  return out;
}

function invertMatrix4(matrix) {
  const m = matrix;
  const inv = new Float32Array(16);

  inv[0] = m[5] * m[10] * m[15]
    - m[5] * m[11] * m[14]
    - m[9] * m[6] * m[15]
    + m[9] * m[7] * m[14]
    + m[13] * m[6] * m[11]
    - m[13] * m[7] * m[10];
  inv[4] = -m[4] * m[10] * m[15]
    + m[4] * m[11] * m[14]
    + m[8] * m[6] * m[15]
    - m[8] * m[7] * m[14]
    - m[12] * m[6] * m[11]
    + m[12] * m[7] * m[10];
  inv[8] = m[4] * m[9] * m[15]
    - m[4] * m[11] * m[13]
    - m[8] * m[5] * m[15]
    + m[8] * m[7] * m[13]
    + m[12] * m[5] * m[11]
    - m[12] * m[7] * m[9];
  inv[12] = -m[4] * m[9] * m[14]
    + m[4] * m[10] * m[13]
    + m[8] * m[5] * m[14]
    - m[8] * m[6] * m[13]
    - m[12] * m[5] * m[10]
    + m[12] * m[6] * m[9];
  inv[1] = -m[1] * m[10] * m[15]
    + m[1] * m[11] * m[14]
    + m[9] * m[2] * m[15]
    - m[9] * m[3] * m[14]
    - m[13] * m[2] * m[11]
    + m[13] * m[3] * m[10];
  inv[5] = m[0] * m[10] * m[15]
    - m[0] * m[11] * m[14]
    - m[8] * m[2] * m[15]
    + m[8] * m[3] * m[14]
    + m[12] * m[2] * m[11]
    - m[12] * m[3] * m[10];
  inv[9] = -m[0] * m[9] * m[15]
    + m[0] * m[11] * m[13]
    + m[8] * m[1] * m[15]
    - m[8] * m[3] * m[13]
    - m[12] * m[1] * m[11]
    + m[12] * m[3] * m[9];
  inv[13] = m[0] * m[9] * m[14]
    - m[0] * m[10] * m[13]
    - m[8] * m[1] * m[14]
    + m[8] * m[2] * m[13]
    + m[12] * m[1] * m[10]
    - m[12] * m[2] * m[9];
  inv[2] = m[1] * m[6] * m[15]
    - m[1] * m[7] * m[14]
    - m[5] * m[2] * m[15]
    + m[5] * m[3] * m[14]
    + m[13] * m[2] * m[7]
    - m[13] * m[3] * m[6];
  inv[6] = -m[0] * m[6] * m[15]
    + m[0] * m[7] * m[14]
    + m[4] * m[2] * m[15]
    - m[4] * m[3] * m[14]
    - m[12] * m[2] * m[7]
    + m[12] * m[3] * m[6];
  inv[10] = m[0] * m[5] * m[15]
    - m[0] * m[7] * m[13]
    - m[4] * m[1] * m[15]
    + m[4] * m[3] * m[13]
    + m[12] * m[1] * m[7]
    - m[12] * m[3] * m[5];
  inv[14] = -m[0] * m[5] * m[14]
    + m[0] * m[6] * m[13]
    + m[4] * m[1] * m[14]
    - m[4] * m[2] * m[13]
    - m[12] * m[1] * m[6]
    + m[12] * m[2] * m[5];
  inv[3] = -m[1] * m[6] * m[11]
    + m[1] * m[7] * m[10]
    + m[5] * m[2] * m[11]
    - m[5] * m[3] * m[10]
    - m[9] * m[2] * m[7]
    + m[9] * m[3] * m[6];
  inv[7] = m[0] * m[6] * m[11]
    - m[0] * m[7] * m[10]
    - m[4] * m[2] * m[11]
    + m[4] * m[3] * m[10]
    + m[8] * m[2] * m[7]
    - m[8] * m[3] * m[6];
  inv[11] = -m[0] * m[5] * m[11]
    + m[0] * m[7] * m[9]
    + m[4] * m[1] * m[11]
    - m[4] * m[3] * m[9]
    - m[8] * m[1] * m[7]
    + m[8] * m[3] * m[5];
  inv[15] = m[0] * m[5] * m[10]
    - m[0] * m[6] * m[9]
    - m[4] * m[1] * m[10]
    + m[4] * m[2] * m[9]
    + m[8] * m[1] * m[6]
    - m[8] * m[2] * m[5];

  let det = m[0] * inv[0] + m[1] * inv[4] + m[2] * inv[8] + m[3] * inv[12];
  if (Math.abs(det) < 1e-8) {
    return null;
  }

  det = 1 / det;
  for (let i = 0; i < 16; i += 1) {
    inv[i] *= det;
  }

  return inv;
}

function createGridVertices(size, step) {
  const points = [];

  for (let x = -size; x <= size + 1e-5; x += step) {
    points.push(x, 0, -size, x, 0, size);
  }

  for (let z = -size; z <= size + 1e-5; z += step) {
    points.push(-size, 0, z, size, 0, z);
  }

  return new Float32Array(points);
}

function getRingsFromGeometry(geometry) {
  if (!geometry) {
    return [];
  }

  if (geometry.type === 'Polygon') {
    return geometry.coordinates;
  }

  if (geometry.type === 'MultiPolygon') {
    // Keep MultiPolygon structure intact so containment checks treat separate
    // polygons as separate landmasses instead of holes.
    return geometry.coordinates;
  }

  return [];
}

function flattenBoundaryRings(rings) {
  if (!Array.isArray(rings) || rings.length === 0) {
    return [];
  }

  // MultiPolygon: [polygon[rings[points]]]
  if (Array.isArray(rings[0]?.[0]?.[0])) {
    const flat = [];
    for (const polygon of rings) {
      if (!Array.isArray(polygon)) {
        continue;
      }
      for (const ring of polygon) {
        if (Array.isArray(ring)) {
          flat.push(ring);
        }
      }
    }
    return flat;
  }

  // Polygon: [rings[points]]
  return rings;
}

function createProjectionFromRings(rings) {
  const allPoints = [];
  const flatRings = flattenBoundaryRings(rings);

  for (const ring of flatRings) {
    for (const point of ring) {
      if (point.length >= 2) {
        allPoints.push(point);
      }
    }
  }

  if (allPoints.length < 2) {
    return null;
  }

  let minLng = allPoints[0][0];
  let maxLng = allPoints[0][0];
  let minLat = allPoints[0][1];
  let maxLat = allPoints[0][1];

  for (const point of allPoints) {
    minLng = Math.min(minLng, point[0]);
    maxLng = Math.max(maxLng, point[0]);
    minLat = Math.min(minLat, point[1]);
    maxLat = Math.max(maxLat, point[1]);
  }

  const width = Math.max(maxLng - minLng, 1e-5);
  const height = Math.max(maxLat - minLat, 1e-5);
  const centerLng = (minLng + maxLng) * 0.5;
  const centerLat = (minLat + maxLat) * 0.5;
  let minProjectedX = Number.POSITIVE_INFINITY;
  let maxProjectedX = Number.NEGATIVE_INFINITY;

  for (const point of allPoints) {
    const lat = point[1];
    const cosLat = Math.max(0.01, Math.cos((lat * Math.PI) / 180));
    const projectedX = (point[0] - centerLng) * cosLat;
    minProjectedX = Math.min(minProjectedX, projectedX);
    maxProjectedX = Math.max(maxProjectedX, projectedX);
  }

  const projectedWidth = Math.max(maxProjectedX - minProjectedX, 1e-5);
  const projectedHeight = Math.max(height, 1e-5);
  const scale = 2.8 / Math.max(projectedWidth, projectedHeight);

  return {
    project(lng, lat, y = 0.004) {
      const cosLat = Math.max(0.01, Math.cos((lat * Math.PI) / 180));
      return [(lng - centerLng) * cosLat * scale, y, -(lat - centerLat) * scale];
    },
    worldMinX: minProjectedX * scale,
    worldMaxX: maxProjectedX * scale,
    worldMinZ: -(maxLat - centerLat) * scale,
    worldMaxZ: -(minLat - centerLat) * scale,
  };
}

function buildOutlineVertices(rings, projection) {
  if (!projection) {
    return new Float32Array([]);
  }

  const vertices = [];
  const flatRings = flattenBoundaryRings(rings);

  for (const ring of flatRings) {
    if (!ring || ring.length < 2) {
      continue;
    }

    for (let i = 0; i < ring.length; i += 1) {
      const a = ring[i];
      const b = ring[(i + 1) % ring.length];

      if (!a || !b || a.length < 2 || b.length < 2) {
        continue;
      }

      const [ax, ay, az] = projection.project(a[0], a[1], 0.004);
      const [bx, by, bz] = projection.project(b[0], b[1], 0.004);
      vertices.push(ax, ay, az, bx, by, bz);
    }
  }

  return new Float32Array(vertices);
}

function buildTransmissionVerticesByType(elements, projection) {
  if (!projection || !Array.isArray(elements)) {
    return {
      line: new Float32Array([]),
      minorLine: new Float32Array([]),
      cable: new Float32Array([]),
    };
  }

  const verticesByType = {
    line: [],
    minorLine: [],
    cable: [],
  };

  // Get the current state boundary rings for filtering
  const rings = typeof stateMap !== 'undefined' && typeof selectedStateName !== 'undefined' && stateMap.has(selectedStateName)
    ? stateMap.get(selectedStateName)
    : null;

  for (const element of elements) {
    const geometry = element?.geometry;
    if (!Array.isArray(geometry) || geometry.length < 2) {
      continue;
    }

    // Only include if at least one segment midpoint is inside the state boundary
    if (rings) {
      let anyInState = false;
      for (let i = 0; i < geometry.length - 1; i += 1) {
        const start = geometry[i];
        const end = geometry[i + 1];
        if (!start || !end) continue;
        const midLon = (start.lon + end.lon) / 2;
        const midLat = (start.lat + end.lat) / 2;
        if (isPointInPolygon([midLon, midLat], rings)) {
          anyInState = true;
          break;
        }
      }
      if (!anyInState) continue;
    }

    const powerType = (element?.tags?.power || '').toLowerCase();
    const bucket = powerType === 'minor_line'
      ? verticesByType.minorLine
      : powerType === 'cable'
        ? verticesByType.cable
        : verticesByType.line;

    for (let i = 0; i < geometry.length - 1; i += 1) {
      const start = geometry[i];
      const end = geometry[i + 1];

      if (!start || !end) {
        continue;
      }

      const [sx, sy, sz] = projection.project(start.lon, start.lat, 0.008);
      const [ex, ey, ez] = projection.project(end.lon, end.lat, 0.008);
      bucket.push(sx, sy, sz, ex, ey, ez);
    }
  }

  return {
    line: new Float32Array(verticesByType.line),
    minorLine: new Float32Array(verticesByType.minorLine),
    cable: new Float32Array(verticesByType.cable),
  };
}

function estimateSegmentMiles(startLat, startLon, endLat, endLon) {
  const rad = Math.PI / 180;
  const lat1 = startLat * rad;
  const lat2 = endLat * rad;
  const dLat = (endLat - startLat) * rad;
  const dLon = (endLon - startLon) * rad;
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const a = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
  const earthMiles = 3958.7613;
  return earthMiles * c;
}

function buildTransmissionRadiusRecords(elements, projection) {
  if (!projection || !Array.isArray(elements)) {
    return [];
  }

  const records = [];

  // Get the current state boundary rings for filtering
  const rings = typeof stateMap !== 'undefined' && typeof selectedStateName !== 'undefined' && stateMap.has(selectedStateName)
    ? stateMap.get(selectedStateName)
    : null;

  for (const element of elements) {
    const geometry = element?.geometry;
    if (!Array.isArray(geometry) || geometry.length < 2) {
      continue;
    }

    // Only include if at least one segment midpoint is inside the state boundary
    if (rings) {
      let anyInState = false;
      for (let i = 0; i < geometry.length - 1; i += 1) {
        const start = geometry[i];
        const end = geometry[i + 1];
        if (!start || !end) continue;
        const midLon = (start.lon + end.lon) / 2;
        const midLat = (start.lat + end.lat) / 2;
        if (isPointInPolygon([midLon, midLat], rings)) {
          anyInState = true;
          break;
        }
      }
      if (!anyInState) continue;
    }

    let sumLat = 0;
    let sumLon = 0;
    let validPointCount = 0;
    let miles = 0;

    for (let i = 0; i < geometry.length; i += 1) {
      const point = geometry[i];
      if (!point || !Number.isFinite(point.lat) || !Number.isFinite(point.lon)) {
        continue;
      }

      sumLat += point.lat;
      sumLon += point.lon;
      validPointCount += 1;

      if (i < geometry.length - 1) {
        const next = geometry[i + 1];
        if (!next || !Number.isFinite(next.lat) || !Number.isFinite(next.lon)) {
          continue;
        }
        miles += estimateSegmentMiles(point.lat, point.lon, next.lat, next.lon);
      }
    }

    if (validPointCount < 2 || miles <= 0) {
      continue;
    }

    const avgLat = sumLat / validPointCount;
    const avgLon = sumLon / validPointCount;
    const [x, , z] = projection.project(avgLon, avgLat, 0.008);
    const tags = element?.tags || {};
    const powerType = (tags.power || '').toLowerCase();
    const labelBlob = [tags.name, tags.ref, tags.operator, tags.from, tags.to].filter(Boolean).join(' ').toLowerCase();

    records.push({
      x,
      z,
      miles,
      powerType,
      voltageKV: parseVoltageKV(tags.voltage),
      isIntertie: /(intertie|tie\s*line|state\s*line|border|dc\s*intertie|path\s*15)/.test(labelBlob),
      isGenerationLinked: /(solar|wind|hydro|geothermal|nuclear|generat|plant|powerhouse)/.test(labelBlob),
    });
  }

  return records;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpColor(colorA, colorB, t) {
  return [
    lerp(colorA[0], colorB[0], t),
    lerp(colorA[1], colorB[1], t),
    lerp(colorA[2], colorB[2], t),
    lerp(colorA[3], colorB[3], t),
  ];
}

function parseOutputMW(value) {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const match = value.match(/([\d.]+)\s*(GW|MW|KW|W)?/i);
  if (!match) {
    return null;
  }

  const amount = Number.parseFloat(match[1]);
  const unit = (match[2] || 'MW').toUpperCase();

  if (!Number.isFinite(amount)) {
    return null;
  }

  if (unit === 'GW') {
    return amount * 1000;
  }

  if (unit === 'KW') {
    return amount / 1000;
  }

  if (unit === 'W') {
    return amount / 1000000;
  }

  return amount;
}

function parseVoltageKV(value) {
  if (!value || typeof value !== 'string' || value === 'none') {
    return null;
  }

  const parts = value.split(/[;\/]/).map((part) => Number.parseFloat(part)).filter((part) => Number.isFinite(part));
  if (parts.length === 0) {
    return null;
  }

  let maxValue = Math.max(...parts);
  if (maxValue > 2000) {
    maxValue /= 1000;
  }

  return maxValue;
}

function formatNumber(value, digits = 0) {
  if (!Number.isFinite(value)) {
    return 'Unknown';
  }

  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: digits,
  }).format(value);
}

const GEN_TYPE_CO2_T_PER_MWH = {
  'Solar': 0,
  'Natural Gas': 0.41,
  'Wind': 0,
  'Hydro': 0,
  'Nuclear': 0,
  'Geothermal': 0,
  'Biomass / Biogas / Waste': 0.23,
  'Coal / Oil': 0.86,
  'Unknown / Imports': 0.28,
  'Net Imports': 0.30,
  'Other': 0.15,
};

const PLANT_SOURCE_CO2_T_PER_MWH = {
  solar: 0,
  wind: 0,
  hydro: 0,
  gas: 0.41,
  nuclear: 0,
  geothermal: 0,
  biomass: 0.23,
  battery: 0,
  coal: 0.95,
  oil: 0.78,
  biogas: 0.18,
  waste: 0.32,
  diesel: 0.74,
};

// EPA tailpipe average is ~404 g CO2 per mile; assume 30 mph average driving speed.
const GAS_CAR_CO2_T_PER_HOUR = (0.404 * 30) / 1000;

function estimateStateCo2Mt(totals) {
  const generationByType = Array.isArray(totals?.generationByTypeGWh) ? totals.generationByTypeGWh : [];
  const totalTons = generationByType.reduce((sum, entry) => {
    const gwh = Number(entry?.value) || 0;
    const factor = GEN_TYPE_CO2_T_PER_MWH[entry?.type] ?? 0;
    return sum + gwh * 1000 * factor;
  }, 0);
  return totalTons / 1000000;
}

function estimateNodeCo2TonsPerHour(node) {
  if (!node || node.type !== 'plant') {
    return 0;
  }

  const source = getPrimaryPlantSource(node.tags || {});
  const factor = PLANT_SOURCE_CO2_T_PER_MWH[source] ?? 0;
  const outputMW = Number(node.sortValue) || 0;
  return outputMW * factor;
}

function formatCo2TonsPerHour(value) {
  return `${formatNumber(value, value >= 100 ? 0 : 2)} tCO2e/hr`;
}

function formatCo2MtPerYear(value) {
  return `${formatNumber(value, value >= 100 ? 0 : 2)} MtCO2e/yr`;
}

function estimateGasCarDrivingHoursFromCo2Tons(co2Tons) {
  if (!Number.isFinite(co2Tons) || co2Tons <= 0) {
    return 0;
  }

  return co2Tons / GAS_CAR_CO2_T_PER_HOUR;
}

function formatGasCarDrivingTimeFromHours(hours) {
  if (!Number.isFinite(hours) || hours <= 0) {
    return '0 hr gas-car driving';
  }

  const dayHours = 24;
  const yearHours = 24 * 365;
  if (hours >= yearHours) {
    return `${formatNumber(hours / yearHours, 2)} years gas-car driving`;
  }

  if (hours >= dayHours) {
    return `${formatNumber(hours / dayHours, 1)} days gas-car driving`;
  }

  return `${formatNumber(hours, 1)} hr gas-car driving`;
}

function getEmissionsIconLevel(value) {
  if (value <= 0.01) return 0;
  if (value < 15) return 1;
  if (value < 60) return 2;
  if (value < 180) return 3;
  return 4;
}

function getElementPosition(element) {
  if (typeof element?.lat === 'number' && typeof element?.lon === 'number') {
    return { lat: element.lat, lon: element.lon };
  }

  if (typeof element?.center?.lat === 'number' && typeof element?.center?.lon === 'number') {
    return { lat: element.center.lat, lon: element.center.lon };
  }

  return null;
}

function hasSolarSource(tags) {
  if (!tags) {
    return false;
  }

  const source = (tags['plant:source'] || tags['generator:source'] || '').toLowerCase();
  return source.split(/[;,]/).some((value) => value.trim() === 'solar');
}

function getPrimaryPlantSource(tags) {
  const source = (tags?.['plant:source'] || tags?.['generator:source'] || '').toLowerCase();
  return source.split(/[;,]/).map((value) => value.trim()).find(Boolean) || 'unknown';
}

function getGenerationSubtypeForSource(source) {
  if (['solar', 'wind', 'hydro', 'geothermal', 'biomass', 'biogas', 'waste'].includes(source)) {
    return 'renewables';
  }

  if (['gas', 'coal', 'oil', 'diesel'].includes(source)) {
    return 'fossil-fuels';
  }

  if (source === 'nuclear') {
    return 'nuclear';
  }

  if (source === 'battery') {
    return 'battery-storage';
  }

  return 'other';
}

function getSubstationRole(tags) {
  const substationType = (tags?.substation || '').toLowerCase();
  const name = (tags?.name || '').toLowerCase();
  const voltageKV = parseVoltageKV(tags?.voltage);

  if (['distribution', 'minor_distribution'].includes(substationType)) {
    return 'distribution-step-down';
  }

  if (['generation', 'plant', 'converter'].includes(substationType) || /(powerhouse|power house|generating station|generation plant|switchyard)/.test(name)) {
    return 'generator-step-up';
  }

  if (['transmission', 'transition', 'traction'].includes(substationType)) {
    return 'transmission-switching';
  }

  if (Number.isFinite(voltageKV)) {
    if (voltageKV >= 200) {
      return 'transmission-switching';
    }
    if (voltageKV >= 69) {
      return 'regional-transfer';
    }
    return 'distribution-step-down';
  }

  return 'grid-transfer';
}

function formatSubstationRoleLabel(role) {
  if (role === 'generator-step-up') return 'Generator step-up';
  if (role === 'transmission-switching') return 'Transmission switching';
  if (role === 'regional-transfer') return 'Regional transfer';
  if (role === 'distribution-step-down') return 'Distribution step-down';
  return 'Grid transfer';
}

function getSubstationRoleDescription(role) {
  if (role === 'generator-step-up') return 'Raises plant output to bulk-grid voltage and connects generation into the network.';
  if (role === 'transmission-switching') return 'Routes and switches high-voltage bulk power across the transmission grid.';
  if (role === 'regional-transfer') return 'Moves power between regional subtransmission and major load pockets.';
  if (role === 'distribution-step-down') return 'Steps power down for local feeders serving neighborhoods and businesses.';
  return 'Transfers and conditions power within the grid where detailed role data is missing.';
}

function formatCountNoun(count, singular, plural = `${singular}s`) {
  return `${formatNumber(count)} ${count === 1 ? singular : plural}`;
}

function formatVoltageRangeLabel(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return 'No voltage tags';
  }

  const minKV = Math.min(...values);
  const maxKV = Math.max(...values);
  if (Math.abs(maxKV - minKV) < 0.5) {
    return `${formatNumber(maxKV, 0)} kV`;
  }

  return `${formatNumber(minKV, 0)}-${formatNumber(maxKV, 0)} kV`;
}

function getSubstationRoleFocusLabel(role) {
  if (role === 'generator-step-up') return 'generation injection into the bulk grid';
  if (role === 'transmission-switching') return 'bulk transmission routing and switching';
  if (role === 'regional-transfer') return 'regional transfer between major load pockets';
  if (role === 'distribution-step-down') return 'local delivery handoff into feeders';
  return 'mixed grid transfer work';
}

function getSubstationRoleOperationalDetail(role) {
  if (role === 'generator-step-up') return 'push plant output onto higher-voltage transmission paths.';
  if (role === 'transmission-switching') return 'route and sectionalize bulk-grid power flows.';
  if (role === 'regional-transfer') return 'bridge transmission into subtransmission load corridors.';
  if (role === 'distribution-step-down') return 'lower voltage for local feeder delivery.';
  return 'handle mixed transfer where role metadata is incomplete.';
}

function getPowerLineJourneyLabel(stageKey) {
  if (stageKey === 'source') return 'Source to backbone';
  if (stageKey === 'backbone') return 'Backbone transport';
  if (stageKey === 'regional') return 'Regional handoff';
  if (stageKey === 'local') return 'Local delivery interface';
  return 'Interties';
}

function classifyPowerLineStage(record) {
  if (record.isIntertie) return 'interties';
  if (record.isGenerationLinked && (record.voltageKV == null || record.voltageKV >= 115)) return 'source';
  if (Number.isFinite(record.voltageKV) && record.voltageKV >= 230) return 'backbone';
  if (Number.isFinite(record.voltageKV) && record.voltageKV >= 115) return 'regional';
  if (record.powerType === 'minor_line' || record.powerType === 'cable') return 'local';
  return 'regional';
}

function summarizeRadiusPowerLines(groundPoint, radius, totalOutputMW = 0, totalConsumptionMW = 0) {
  if (!groundPoint || !Number.isFinite(radius) || radius <= 0 || transmissionRadiusRecords.length === 0) {
    return {
      totalLines: 0,
      totalMiles: 0,
      voltageMixLabel: 'No line data in radius',
      majorRoleLabel: 'No dominant role',
      introText: 'Move the radius toward visible transmission corridors to sample power-line behavior.',
      journeyItems: [],
      lineTypeItems: [],
      voltageBandItems: [],
      taggedVoltageLineCount: 0,
      voltageTagCoverageLabel: 'No voltage-tag coverage yet',
      guidanceSteps: [
        'Slide the radius until it intersects visible transmission lines.',
        'Compare Voltage level mix and Major connection role chips first.',
        'Use the journey rows to see whether this area is transport-heavy or delivery-heavy.',
      ],
      interpretation: {
        transportVsDelivery: 'Not enough sampled lines to classify transport vs delivery behavior.',
        areaShape: 'Area class is unknown until more lines are sampled.',
        redundancy: 'Redundancy cannot be assessed without sampled lines.',
        importExport: 'Import/export posture is unknown without sampled lines.',
      },
    };
  }

  const radiusSquared = radius * radius;
  const stageStats = {
    source: { lines: 0, miles: 0 },
    backbone: { lines: 0, miles: 0 },
    regional: { lines: 0, miles: 0 },
    local: { lines: 0, miles: 0 },
    interties: { lines: 0, miles: 0 },
  };
  const voltageBands = {
    bulk: 0,
    regional: 0,
    local: 0,
    unknown: 0,
  };
  const lineTypeStats = {
    line: { lines: 0, miles: 0 },
    minor_line: { lines: 0, miles: 0 },
    cable: { lines: 0, miles: 0 },
  };

  let totalLines = 0;
  let totalMiles = 0;
  let taggedVoltageLineCount = 0;

  for (const record of transmissionRadiusRecords) {
    const sourceKey = getTransmissionLegendSource(record.powerType);
    if (isLegendSourceHidden(sourceKey)) {
      continue;
    }

    const dx = record.x - groundPoint.x;
    const dz = record.z - groundPoint.z;
    if (dx * dx + dz * dz > radiusSquared) {
      continue;
    }

    totalLines += 1;
    totalMiles += record.miles;

    const normalizedType = record.powerType === 'minor_line' || record.powerType === 'cable'
      ? record.powerType
      : 'line';
    lineTypeStats[normalizedType].lines += 1;
    lineTypeStats[normalizedType].miles += record.miles;

    const stage = classifyPowerLineStage(record);
    stageStats[stage].lines += 1;
    stageStats[stage].miles += record.miles;

    if (!Number.isFinite(record.voltageKV)) {
      voltageBands.unknown += record.miles;
    } else if (record.voltageKV >= 230) {
      taggedVoltageLineCount += 1;
      voltageBands.bulk += record.miles;
    } else if (record.voltageKV >= 69) {
      taggedVoltageLineCount += 1;
      voltageBands.regional += record.miles;
    } else {
      taggedVoltageLineCount += 1;
      voltageBands.local += record.miles;
    }
  }

  if (totalLines === 0 || totalMiles <= 0) {
    return {
      totalLines,
      totalMiles,
      voltageMixLabel: 'No line data in radius',
      majorRoleLabel: 'No dominant role',
      introText: 'No active transmission records are currently sampled in this radius.',
      journeyItems: [],
      lineTypeItems: [],
      voltageBandItems: [],
      taggedVoltageLineCount: 0,
      voltageTagCoverageLabel: 'No voltage-tag coverage yet',
      guidanceSteps: [
        'Move the radius onto mapped line geometry so this panel can classify line behavior.',
        'Start with the three chips, then read the journey rows from L1 to L5.',
        'Use the interpretation section to decide if this is corridor, hub, or edge behavior.',
      ],
      interpretation: {
        transportVsDelivery: 'This radius is currently outside sampled transmission geometry.',
        areaShape: 'Try sliding the radius over visible lines to classify this area.',
        redundancy: 'Single-path and redundancy checks require sampled lines.',
        importExport: 'Import/export posture cannot be inferred from this sample.',
      },
    };
  }

  const voltageRanking = [
    { key: 'bulk', label: 'Mostly bulk (230 kV+)', miles: voltageBands.bulk },
    { key: 'regional', label: 'Mostly regional (69-229 kV)', miles: voltageBands.regional },
    { key: 'local', label: 'Mostly local (<69 kV)', miles: voltageBands.local },
    { key: 'unknown', label: 'Mostly untagged voltage', miles: voltageBands.unknown },
  ].sort((a, b) => b.miles - a.miles);

  const stageRanking = Object.entries(stageStats)
    .map(([key, value]) => ({ key, ...value }))
    .sort((a, b) => b.miles - a.miles);
  const dominantStage = stageRanking[0];

  const journeyItems = [
    { key: 'source', description: 'Lines leaving major generation regions.', badge: 'L1' },
    { key: 'backbone', description: 'Very high-voltage corridors carrying bulk power.', badge: 'L2' },
    { key: 'regional', description: 'Lines feeding metro and regional load pockets.', badge: 'L3' },
    { key: 'local', description: 'Where transmission hands off toward distribution networks.', badge: 'L4' },
    { key: 'interties', description: 'Lines crossing regions or state borders.', badge: 'L5' },
  ].map((item) => ({
    ...item,
    title: getPowerLineJourneyLabel(item.key),
    lines: stageStats[item.key].lines,
    miles: stageStats[item.key].miles,
    share: totalMiles > 0 ? (stageStats[item.key].miles / totalMiles) * 100 : 0,
  }));

  const transportMiles = stageStats.source.miles + stageStats.backbone.miles + stageStats.regional.miles + stageStats.interties.miles;
  const deliveryMiles = stageStats.local.miles;
  const transportShare = totalMiles > 0 ? (transportMiles / totalMiles) * 100 : 0;
  const deliveryShare = totalMiles > 0 ? (deliveryMiles / totalMiles) * 100 : 0;
  const activeStages = journeyItems.filter((item) => item.lines > 0).length;

  let areaShape = 'Edge-of-grid area: fewer pathways are sampled here.';
  if (totalLines >= 30 && activeStages >= 4) {
    areaShape = 'Hub area: multiple power-line roles overlap in this radius.';
  } else if (transportShare >= 58 && totalLines >= 18) {
    areaShape = 'Corridor area: long-distance transport dominates this sample.';
  }

  const redundancy = totalLines >= 24 || stageStats.interties.lines >= 2
    ? 'Redundancy appears stronger: multiple pathways are available in this radius.'
    : 'Potential single-path dependence: only a limited set of pathways are sampled.';

  const netBalanceMW = totalOutputMW - totalConsumptionMW;
  const importExport = netBalanceMW >= 0 && stageStats.backbone.lines + stageStats.interties.lines > 0
    ? 'Likely export-capable profile: local generation plus transfer capacity are present.'
    : netBalanceMW < 0 && (stageStats.interties.lines > 0 || stageStats.backbone.lines > 0)
      ? 'Likely import-dependent profile: demand exceeds local generation and transfer paths are active.'
      : 'Balanced or uncertain import/export profile in this sample.';

  const voltageBandItems = [
    { key: 'bulk', label: 'Bulk 230 kV+', miles: voltageBands.bulk },
    { key: 'regional', label: 'Regional 69-229 kV', miles: voltageBands.regional },
    { key: 'local', label: 'Local under 69 kV', miles: voltageBands.local },
    { key: 'unknown', label: 'Untagged voltage', miles: voltageBands.unknown },
  ].map((item) => ({
    ...item,
    share: totalMiles > 0 ? (item.miles / totalMiles) * 100 : 0,
  }));

  const lineTypeItems = [
    { key: 'line', label: 'Transmission line', ...lineTypeStats.line },
    { key: 'minor_line', label: 'Transmission minor line', ...lineTypeStats.minor_line },
    { key: 'cable', label: 'Transmission cable', ...lineTypeStats.cable },
  ].map((item) => ({
    ...item,
    share: totalMiles > 0 ? (item.miles / totalMiles) * 100 : 0,
  }));

  const voltageTagCoverage = totalLines > 0 ? (taggedVoltageLineCount / totalLines) * 100 : 0;
  const voltageTagCoverageLabel = `${formatNumber(taggedVoltageLineCount)} of ${formatNumber(totalLines)} lines include voltage tags (${formatNumber(voltageTagCoverage, 0)}%)`;
  const guidanceSteps = [
    'Read the three chips first to get the headline story (voltage, scale, role).',
    'Scan L1-L5 to see where power is entering, moving, and handing off locally.',
    'Use the interpretation bullets to decide whether this area is resilient, constrained, import-heavy, or export-ready.',
  ];

  return {
    totalLines,
    totalMiles,
    voltageMixLabel: voltageRanking[0].label,
    majorRoleLabel: getPowerLineJourneyLabel(dominantStage?.key || 'regional'),
    introText: `Power lines are long-distance highways for electricity. They move bulk power from where it is generated to where it is needed. This radius currently samples ${formatCountNoun(totalLines, 'line')} covering about ${formatNumber(totalMiles, 1)} miles.`,
    journeyItems,
    lineTypeItems,
    voltageBandItems,
    taggedVoltageLineCount,
    voltageTagCoverageLabel,
    guidanceSteps,
    interpretation: {
      transportVsDelivery: transportShare >= deliveryShare
        ? `Mostly transport: ${formatNumber(transportShare, 0)}% of sampled line miles are in source/backbone/regional/intertie roles.`
        : `Mostly delivery interface: ${formatNumber(deliveryShare, 0)}% of sampled line miles are local handoff lines.`,
      areaShape,
      redundancy,
      importExport,
    },
  };
}

function summarizeRadiusSubstations(nodes, totalOutputMW = 0, totalConsumptionMW = 0) {
  const substations = nodes.filter((node) => node.type === 'substation');
  const roleCounts = Object.fromEntries(RADIUS_SUBSTATION_ROLE_ORDER.map((role) => [role, 0]));
  const voltageValues = [];
  const voltageBands = {
    bulk: 0,
    regional: 0,
    local: 0,
  };
  let namedCount = 0;

  for (const node of substations) {
    const tags = node.tags || {};
    const role = getSubstationRole(tags);
    roleCounts[role] = (roleCounts[role] || 0) + 1;
    if (tags.name) {
      namedCount += 1;
    }

    const voltageKV = parseVoltageKV(tags.voltage);
    if (!Number.isFinite(voltageKV)) {
      continue;
    }

    voltageValues.push(voltageKV);
    if (voltageKV >= 200) {
      voltageBands.bulk += 1;
    } else if (voltageKV >= 69) {
      voltageBands.regional += 1;
    } else {
      voltageBands.local += 1;
    }
  }

  const roleEntries = RADIUS_SUBSTATION_ROLE_ORDER
    .map((role) => ({
      role,
      count: roleCounts[role] || 0,
      label: formatSubstationRoleLabel(role),
      description: getSubstationRoleDescription(role),
    }))
    .filter((entry) => entry.count > 0);

  const totalSubstations = substations.length;
  const primaryRole = roleEntries[0]?.role || null;
  const knownVoltageCount = voltageValues.length;
  const averageVoltageKV = knownVoltageCount > 0
    ? voltageValues.reduce((sum, value) => sum + value, 0) / knownVoltageCount
    : null;
  const stepUpCount = roleCounts['generator-step-up'] || 0;
  const stepDownCount = roleCounts['distribution-step-down'] || 0;
  const transmissionSwitchingCount = roleCounts['transmission-switching'] || 0;
  const regionalTransferCount = roleCounts['regional-transfer'] || 0;
  const gridTransferCount = roleCounts['grid-transfer'] || 0;

  if (totalSubstations <= 0) {
    return {
      totalSubstations: 0,
      totalOutputMW,
      totalConsumptionMW,
      narrative: 'No substations are inside this radius right now. Move the sample toward transmission corridors, plant sites, or city load centers to inspect voltage conversion and routing work.',
    };
  }

  const activityParts = [];
  if (stepUpCount > 0) {
    activityParts.push(`${formatCountNoun(stepUpCount, 'step-up node')} lift plant output onto higher-voltage lines`);
  }
  if (transmissionSwitchingCount > 0) {
    activityParts.push(`${formatCountNoun(transmissionSwitchingCount, 'switching substation')} route bulk-grid flows`);
  }
  if (regionalTransferCount > 0) {
    activityParts.push(`${formatCountNoun(regionalTransferCount, 'regional-transfer substation')} bridge bulk transmission and subtransmission networks`);
  }
  if (stepDownCount > 0) {
    activityParts.push(`${formatCountNoun(stepDownCount, 'step-down substation')} lower voltage for local feeders`);
  }
  if (gridTransferCount > 0) {
    activityParts.push(`${formatCountNoun(gridTransferCount, 'general grid-transfer substation')} handle mixed routing where metadata is incomplete`);
  }

  const narrative = [
    `This radius contains ${formatCountNoun(totalSubstations, 'substation')}.`,
    primaryRole ? `The mix is led by ${formatSubstationRoleLabel(primaryRole).toLowerCase()} nodes, so this area is mostly handling ${getSubstationRoleFocusLabel(primaryRole)}.` : '',
    activityParts.length > 0 ? `Active roles here: ${activityParts.join('; ')}.` : '',
    `In the same sample, these substations sit alongside ${formatNumber(totalOutputMW, 1)} MW of generation and ${formatNumber(totalConsumptionMW, 1)} MW of demand.`,
  ].filter(Boolean).join(' ');

  return {
    totalSubstations,
    totalOutputMW,
    totalConsumptionMW,
    namedCount,
    knownVoltageCount,
    voltageRangeLabel: formatVoltageRangeLabel(voltageValues),
    averageVoltageKV,
    primaryRole,
    primaryRoleLabel: primaryRole ? formatSubstationRoleLabel(primaryRole) : 'Mixed',
    stepUpCount,
    stepDownCount,
    transmissionSwitchingCount,
    regionalTransferCount,
    gridTransferCount,
    voltageBands,
    roleEntries,
    narrative,
  };
}

function doesNodeMatchGenerationSubtype(node, subtype) {
  if (subtype === 'all') {
    return true;
  }

  const source = getPrimaryPlantSource(node?.tags || {});
  return getGenerationSubtypeForSource(source) === subtype;
}

function heatColorForNormalizedValue(t) {
  const low = [0.06, 0.21, 0.62, 0.16];
  const mid = [0.99, 0.83, 0.23, 0.50];
  const high = [1.0, 0.28, 0.11, 0.88];
  if (t < 0.55) {
    return lerpColor(low, mid, t / 0.55);
  }
  return lerpColor(mid, high, (t - 0.55) / 0.45);
}

function buildSolarDensityGridVertices(zipRows, projection) {
  if (!projection || !Array.isArray(zipRows)) {
    return { vertexData: new Float32Array([]), cells: [] };
  }

  const cols = 42;
  const rows = 42;
  const width = projection.worldMaxX - projection.worldMinX;
  const height = projection.worldMaxZ - projection.worldMinZ;

  if (width <= 0 || height <= 0) {
    return { vertexData: new Float32Array([]), cells: [] };
  }

  const cellW = width / cols;
  const cellH = height / rows;
  const buckets = Array.from({ length: cols * rows }, () => ({
    projects: 0,
    mwDc: 0,
    mwAc: 0,
    zips: [],
  }));

  for (const row of zipRows) {
    if (!row || typeof row.lat !== 'number' || typeof row.lon !== 'number') {
      continue;
    }

    const [x, , z] = projection.project(row.lon, row.lat, 0.0);
    const col = Math.floor((x - projection.worldMinX) / cellW);
    const gridRow = Math.floor((z - projection.worldMinZ) / cellH);

    if (col < 0 || col >= cols || gridRow < 0 || gridRow >= rows) {
      continue;
    }

    const idx = gridRow * cols + col;
    const bucket = buckets[idx];
    bucket.projects += Number(row.projects) || 0;
    bucket.mwDc += Number(row.mw_dc) || 0;
    bucket.mwAc += Number(row.mw_ac) || 0;
    if (row.zip) {
      bucket.zips.push(String(row.zip));
    }
  }

  let maxDensity = 0;
  for (const bucket of buckets) {
    if (bucket.projects > maxDensity) {
      maxDensity = bucket.projects;
    }
  }

  if (maxDensity <= 0) {
    return { vertexData: new Float32Array([]), cells: [] };
  }

  const vertices = [];
  const cells = [];
  const y = 0.001;
  const lowColor = [0.05, 0.30, 0.84, 0.16];
  const highColor = [1.00, 0.52, 0.04, 0.86];

  for (let gridRow = 0; gridRow < rows; gridRow += 1) {
    for (let col = 0; col < cols; col += 1) {
      const bucket = buckets[gridRow * cols + col];
      if (bucket.projects <= 0) {
        continue;
      }

      const t = clamp(Math.log(bucket.projects + 1) / Math.log(maxDensity + 1), 0, 1);
      const color = lerpColor(lowColor, highColor, t);

      const x0 = projection.worldMinX + col * cellW;
      const x1 = x0 + cellW;
      const z0 = projection.worldMinZ + gridRow * cellH;
      const z1 = z0 + cellH;

      vertices.push(
        x0, y, z0, color[0], color[1], color[2], color[3],
        x1, y, z0, color[0], color[1], color[2], color[3],
        x1, y, z1, color[0], color[1], color[2], color[3],
        x0, y, z0, color[0], color[1], color[2], color[3],
        x1, y, z1, color[0], color[1], color[2], color[3],
        x0, y, z1, color[0], color[1], color[2], color[3],
      );

      const uniqueZipCount = new Set(bucket.zips).size;
      cells.push({
        x0,
        x1,
        z0,
        z1,
        cx: (x0 + x1) * 0.5,
        cz: (z0 + z1) * 0.5,
        projects: bucket.projects,
        mwDc: bucket.mwDc,
        mwAc: bucket.mwAc,
        zipCount: uniqueZipCount,
        sampleZip: bucket.zips[0] || 'Unknown',
        visible: false,
        screenX: 0,
        screenY: 0,
        screenRadius: 0,
      });
    }
  }

  return {
    vertexData: new Float32Array(vertices),
    cells,
  };
}

function buildGenerationHeatmapVertices(nodes, projection, subtype) {
  if (!projection || !Array.isArray(nodes)) {
    return { vertexData: new Float32Array([]), cellCount: 0, cells: [] };
  }

  const cols = 52;
  const rows = 52;
  const width = projection.worldMaxX - projection.worldMinX;
  const height = projection.worldMaxZ - projection.worldMinZ;
  if (width <= 0 || height <= 0) {
    return { vertexData: new Float32Array([]), cellCount: 0, cells: [] };
  }

  const cellW = width / cols;
  const cellH = height / rows;
  const buckets = Array.from({ length: cols * rows }, () => ({
    powerMW: 0,
    plantCount: 0,
    subtypePower: {
      renewables: 0,
      'fossil-fuels': 0,
      nuclear: 0,
      'battery-storage': 0,
      other: 0,
    },
  }));

  for (const node of nodes) {
    if (!node || node.type !== 'plant') {
      continue;
    }

    if (!doesNodeMatchGenerationSubtype(node, subtype)) {
      continue;
    }

    const powerMW = Number(node.sortValue) || 0;
    if (powerMW <= 0) {
      continue;
    }

    const col = Math.floor((node.x - projection.worldMinX) / cellW);
    const gridRow = Math.floor((node.z - projection.worldMinZ) / cellH);
    if (col < 0 || col >= cols || gridRow < 0 || gridRow >= rows) {
      continue;
    }

    const bucket = buckets[gridRow * cols + col];
    const nodeSource = getPrimaryPlantSource(node.tags || {});
    const nodeSubtype = getGenerationSubtypeForSource(nodeSource);
    bucket.powerMW += powerMW;
    bucket.plantCount += 1;
    bucket.subtypePower[nodeSubtype] += powerMW;
  }

  let maxValue = 0;
  for (let i = 0; i < buckets.length; i += 1) {
    if (buckets[i].powerMW > maxValue) {
      maxValue = buckets[i].powerMW;
    }
  }

  if (maxValue <= 0) {
    return { vertexData: new Float32Array([]), cellCount: 0, cells: [] };
  }

  const vertices = [];
  const cells = [];
  let activeCells = 0;
  const y = 0.0015;

  for (let gridRow = 0; gridRow < rows; gridRow += 1) {
    for (let col = 0; col < cols; col += 1) {
      const bucket = buckets[gridRow * cols + col];
      const power = bucket.powerMW;
      if (power <= 0) {
        continue;
      }

      activeCells += 1;
      const t = clamp(Math.log(power + 1) / Math.log(maxValue + 1), 0, 1);
      const color = heatColorForNormalizedValue(t);

      const x0 = projection.worldMinX + col * cellW;
      const x1 = x0 + cellW;
      const z0 = projection.worldMinZ + gridRow * cellH;
      const z1 = z0 + cellH;

      const dominantSubtype = Object.entries(bucket.subtypePower)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'other';

      vertices.push(
        x0, y, z0, color[0], color[1], color[2], color[3],
        x1, y, z0, color[0], color[1], color[2], color[3],
        x1, y, z1, color[0], color[1], color[2], color[3],
        x0, y, z0, color[0], color[1], color[2], color[3],
        x1, y, z1, color[0], color[1], color[2], color[3],
        x0, y, z1, color[0], color[1], color[2], color[3],
      );

      cells.push({
        x0,
        x1,
        z0,
        z1,
        cx: (x0 + x1) * 0.5,
        cz: (z0 + z1) * 0.5,
        powerMW: power,
        plantCount: bucket.plantCount,
        dominantSubtype,
        subtypePower: bucket.subtypePower,
        visible: false,
        screenX: 0,
        screenY: 0,
        screenRadius: 0,
      });
    }
  }

  return {
    vertexData: new Float32Array(vertices),
    cellCount: activeCells,
    cells,
  };
}

const PLANT_SOURCE_COLORS = {
  solar:      [1.000, 0.800, 0.000, 1.0],
  wind:       [0.000, 0.898, 1.000, 1.0],
  hydro:      [0.098, 0.510, 1.000, 1.0],
  gas:        [1.000, 0.400, 0.000, 1.0],
  nuclear:    [0.925, 0.000, 1.000, 1.0],
  geothermal: [1.000, 0.075, 0.220, 1.0],
  biomass:    [0.000, 0.862, 0.408, 1.0],
  battery:    [0.000, 0.875, 0.714, 1.0],
  coal:       [0.369, 0.459, 0.502, 1.0],
  oil:        [0.596, 0.451, 0.337, 1.0],
  biogas:     [0.000, 0.862, 0.408, 1.0],
  waste:      [0.369, 0.459, 0.502, 1.0],
  diesel:     [0.596, 0.451, 0.337, 1.0],
};
const PLANT_SOURCE_DEFAULT_COLOR = [0.590, 0.590, 0.590, 0.90];

const GHOST_POWER_SOURCE_STYLE = {
  'PHOTOVOLTAIC/SOLAR': { color: [1.0, 0.78, 0.2, 0.96], shape: 0 },
  'STORAGE/BATTERY': { color: [0.1, 0.95, 0.84, 0.96], shape: 2 },
  WIND: { color: [0.32, 0.88, 1.0, 0.96], shape: 1 },
  HYDRO: { color: [0.2, 0.53, 1.0, 0.96], shape: 0 },
  GEOTHERMAL: { color: [1.0, 0.28, 0.42, 0.96], shape: 0 },
};
const GHOST_POWER_DEFAULT_STYLE = { color: [1.0, 0.54, 0.36, 0.96], shape: 3 };

// 0=circle  1=diamond  2=ring  3=square
const PLANT_SOURCE_SHAPES = {
  solar:      0,
  wind:       1,
  hydro:      0,
  gas:        3,
  nuclear:    2,
  geothermal: 0,
  biomass:    0,
  battery:    2,
  coal:       3,
  oil:        3,
  biogas:     0,
  waste:      3,
  diesel:     3,
};

const LEGEND_MATCH_SOURCES = {
  solar:      (s) => s === 'solar',
  wind:       (s) => s === 'wind',
  hydro:      (s) => s === 'hydro',
  gas:        (s) => ['gas', 'coal', 'oil', 'diesel'].includes(s),
  nuclear:    (s) => s === 'nuclear',
  geothermal: (s) => s === 'geothermal',
  biomass:    (s) => ['biomass', 'biogas', 'waste'].includes(s),
  battery:    (s) => s === 'battery',
  other:      (s) => !['solar', 'wind', 'hydro', 'gas', 'coal', 'oil', 'diesel', 'nuclear', 'geothermal', 'biomass', 'biogas', 'waste', 'battery'].includes(s),
};
const LEGEND_SOURCE_FROM_PLANT_SOURCE = {
  solar: 'solar',
  wind: 'wind',
  hydro: 'hydro',
  gas: 'gas',
  coal: 'gas',
  oil: 'gas',
  diesel: 'gas',
  nuclear: 'nuclear',
  geothermal: 'geothermal',
  biomass: 'biomass',
  biogas: 'biomass',
  waste: 'biomass',
  battery: 'battery',
};
const LEGEND_SOURCE_FROM_SUBSTATION_ROLE = {
  'generator-step-up': 'substation-generator-step-up',
  'transmission-switching': 'substation-transmission-switching',
  'regional-transfer': 'substation-regional-transfer',
  'distribution-step-down': 'substation-distribution-step-down',
  'grid-transfer': 'substation-regional-transfer',
};
const NON_INTERACTIVE_LEGEND_SOURCES = new Set(['outline']);
const TOGGLEABLE_LEGEND_SOURCES = [
  'transmission-line',
  'transmission-minor-line',
  'transmission-cable',
  'ghost-project',
  'substation-generator-step-up',
  'substation-transmission-switching',
  'substation-regional-transfer',
  'substation-distribution-step-down',
  'consumer',
  'solar',
  'wind',
  'hydro',
  'gas',
  'nuclear',
  'geothermal',
  'biomass',
  'battery',
  'other',
];
const TOGGLEABLE_LEGEND_SOURCE_SET = new Set(TOGGLEABLE_LEGEND_SOURCES);
const LEGEND_DIM = 0.055;
const RADIUS_OUTSIDE_NODE_SIZE_SCALE = 0.86;
const RADIUS_NODE_EFFECT_HEIGHT_SCALE = 0.58;

function getRadiusNodeSizeScale(node) {
  if (dataLayerMode !== 'infrastructure' || activeDetailTab !== 'radius' || !hoverCircleCenter) {
    return 1;
  }

  const dx = node.x - hoverCircleCenter.x;
  const dz = node.z - hoverCircleCenter.z;
  const radiusSquared = hoverCircleRadius * hoverCircleRadius;
  return dx * dx + dz * dz <= radiusSquared ? 1 : RADIUS_OUTSIDE_NODE_SIZE_SCALE;
}

function rebuildPointBuffer(nodes, buffer, getAlpha, getSizeScale = null) {
  if (!nodes || nodes.length === 0) return;
  const data = [];
  for (const node of nodes) {
    const sizeScale = typeof getSizeScale === 'function' ? getSizeScale(node) : 1;
    data.push(node.x, node.y, node.z, node.size * sizeScale, node.color[0], node.color[1], node.color[2], getAlpha(node), node.shape);
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.DYNAMIC_DRAW);
}

function rebuildHaloBuffer(nodes, getAlphaScale) {
  if (!nodes || nodes.length === 0) return;
  const haloData = [];
  for (const node of nodes) {
    if (node.haloRadius == null) continue;
    const ha = node.haloAlpha * getAlphaScale(node);
    const r = node.haloRadius;
    const haloY = -0.03;
    const hc = [node.color[0], node.color[1], node.color[2], ha];
    const verts = [
      [node.x - r, node.z - r, -1, -1],
      [node.x + r, node.z - r,  1, -1],
      [node.x + r, node.z + r,  1,  1],
      [node.x - r, node.z - r, -1, -1],
      [node.x + r, node.z + r,  1,  1],
      [node.x - r, node.z + r, -1,  1],
    ];
    for (const [qx, qz, lx, lz] of verts) {
      haloData.push(qx, haloY, qz, lx, lz, hc[0], hc[1], hc[2], hc[3]);
    }
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, haloBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(haloData), gl.DYNAMIC_DRAW);
}

function getLegendSourceForPlantNode(node) {
  const source = getPrimaryPlantSource(node?.tags || {});
  return LEGEND_SOURCE_FROM_PLANT_SOURCE[source] || 'other';
}

function getLegendSourceForSubstationNode(node) {
  const role = getSubstationRole(node?.tags || {});
  return LEGEND_SOURCE_FROM_SUBSTATION_ROLE[role] || 'substation-regional-transfer';
}

function isLegendSourceHidden(source) {
  if (source === 'outline') {
    return false;
  }
  return hiddenLegendSources.has(source);
}

function getTransmissionLegendSource(powerType) {
  if (powerType === 'minor_line') return 'transmission-minor-line';
  if (powerType === 'cable') return 'transmission-cable';
  return 'transmission-line';
}

function getTransmissionHoverAlpha(source, defaultAlpha, dimAlpha) {
  if (!legendHoverSource) {
    return isLegendSourceHidden(source) ? 0 : defaultAlpha;
  }
  if (legendHoverSource === source) {
    return defaultAlpha;
  }
  return isLegendSourceHidden(source) ? 0 : dimAlpha;
}

function normalizeLegendVisibilityState() {
  for (const source of hiddenLegendSources) {
    if (!TOGGLEABLE_LEGEND_SOURCE_SET.has(source)) {
      hiddenLegendSources.delete(source);
    }
  }
}

function isNodeHiddenByLegend(node) {
  if (!node) {
    return false;
  }

  if (node.type === 'ghost') {
    return isLegendSourceHidden('ghost-project');
  }

  if (node.type === 'substation') {
    return isLegendSourceHidden(getLegendSourceForSubstationNode(node));
  }

  if (node.type === 'consumer') {
    return isLegendSourceHidden('consumer');
  }

  return isLegendSourceHidden(getLegendSourceForPlantNode(node));
}

function syncLegendUiState() {
  if (legendFloat) {
    legendFloat.querySelectorAll('li[data-legend-source]').forEach((item) => {
      const source = item.dataset.legendSource;
      const isDisabled = NON_INTERACTIVE_LEGEND_SOURCES.has(source);
      const isHidden = hiddenLegendSources.has(source);
      item.classList.toggle('is-legend-hidden', isHidden);
      const checkbox = item.querySelector('.legend-toggle-input');
      if (checkbox) {
        checkbox.disabled = isDisabled;
        checkbox.checked = isDisabled ? true : !isHidden;
      }
    });

    legendFloat.querySelectorAll('.legend-mobile-option[data-legend-source]').forEach((item) => {
      const source = item.dataset.legendSource;
      const checkbox = item.querySelector('.legend-toggle-input');
      const isDisabled = NON_INTERACTIVE_LEGEND_SOURCES.has(source);
      const isHidden = hiddenLegendSources.has(source);
      item.classList.toggle('is-legend-hidden', isHidden);
      if (checkbox) {
        checkbox.disabled = isDisabled;
        checkbox.checked = isDisabled ? true : !isHidden;
      }
    });

    const showRadiusExtras = radiusEffectsToggle && !radiusEffectsToggle.classList.contains('is-hidden');
    const extrasGroup = legendFloat.querySelector('.legend-mobile-group--extras');
    if (extrasGroup) {
      extrasGroup.toggleAttribute('hidden', !showRadiusExtras);
    }

    MOBILE_LEGEND_EXTRA_TOGGLES.forEach(({ key, getChecked }) => {
      const extra = legendFloat.querySelector(`.legend-mobile-option[data-legend-extra="${key}"]`);
      const checkbox = extra?.querySelector('.legend-toggle-input');
      if (checkbox) {
        checkbox.checked = Boolean(getChecked());
      }
    });
  }

  if (legendShowAllButton) {
    legendShowAllButton.disabled = hiddenLegendSources.size === 0;
  }
}

function syncLegendDrivenSelections() {
  if (pinnedNode && isNodeHiddenByLegend(pinnedNode)) {
    pinnedNode = null;
  }

  if (hoveredNode && isNodeHiddenByLegend(hoveredNode)) {
    hoveredNode = null;
  }
}

function rebuildFilteredBuffers() {
  const filter = legendHoverSource;
  if (!filter) {
    rebuildPointBuffer(plantNodes, plantBuffer, (n) => (isNodeHiddenByLegend(n) ? 0 : n.color[3]), getRadiusNodeSizeScale);
    rebuildPointBuffer(substationNodes, substationBuffer, (n) => (isNodeHiddenByLegend(n) ? 0 : n.color[3]), getRadiusNodeSizeScale);
    rebuildPointBuffer(consumerNodes, consumerBuffer, (n) => (isNodeHiddenByLegend(n) ? 0 : n.color[3]), getRadiusNodeSizeScale);
    rebuildPointBuffer(ghostPowerNodes, ghostPowerBuffer, (n) => (isNodeHiddenByLegend(n) ? 0 : n.color[3]), getRadiusNodeSizeScale);
    rebuildHaloBuffer(plantNodes, (n) => (isNodeHiddenByLegend(n) ? 0 : 1));
    return;
  }
  if (filter === 'outline') {
    return;
  }

  if (filter.startsWith('transmission-')) {
    rebuildPointBuffer(plantNodes, plantBuffer, (n) => (isNodeHiddenByLegend(n) ? 0 : LEGEND_DIM), getRadiusNodeSizeScale);
    rebuildPointBuffer(substationNodes, substationBuffer, (n) => (isNodeHiddenByLegend(n) ? 0 : LEGEND_DIM), getRadiusNodeSizeScale);
    rebuildPointBuffer(consumerNodes, consumerBuffer, (n) => (isNodeHiddenByLegend(n) ? 0 : LEGEND_DIM), getRadiusNodeSizeScale);
    rebuildPointBuffer(ghostPowerNodes, ghostPowerBuffer, (n) => (isNodeHiddenByLegend(n) ? 0 : LEGEND_DIM), getRadiusNodeSizeScale);
    rebuildHaloBuffer(plantNodes, (n) => (isNodeHiddenByLegend(n) ? 0 : LEGEND_DIM));
    return;
  }

  if (filter.startsWith('substation-')) {
    rebuildPointBuffer(plantNodes, plantBuffer, (n) => (isNodeHiddenByLegend(n) ? 0 : LEGEND_DIM), getRadiusNodeSizeScale);
    rebuildPointBuffer(substationNodes, substationBuffer, (n) => (getLegendSourceForSubstationNode(n) === filter ? n.color[3] : (isNodeHiddenByLegend(n) ? 0 : LEGEND_DIM)), getRadiusNodeSizeScale);
    rebuildPointBuffer(consumerNodes, consumerBuffer, (n) => (isNodeHiddenByLegend(n) ? 0 : LEGEND_DIM), getRadiusNodeSizeScale);
    rebuildPointBuffer(ghostPowerNodes, ghostPowerBuffer, (n) => (isNodeHiddenByLegend(n) ? 0 : LEGEND_DIM), getRadiusNodeSizeScale);
    rebuildHaloBuffer(plantNodes, (n) => (isNodeHiddenByLegend(n) ? 0 : LEGEND_DIM));
    return;
  }
  if (filter === 'consumer') {
    rebuildPointBuffer(plantNodes, plantBuffer, (n) => (isNodeHiddenByLegend(n) ? 0 : LEGEND_DIM), getRadiusNodeSizeScale);
    rebuildPointBuffer(substationNodes, substationBuffer, (n) => (isNodeHiddenByLegend(n) ? 0 : LEGEND_DIM), getRadiusNodeSizeScale);
    rebuildPointBuffer(consumerNodes, consumerBuffer, (n) => n.color[3], getRadiusNodeSizeScale);
    rebuildPointBuffer(ghostPowerNodes, ghostPowerBuffer, (n) => (isNodeHiddenByLegend(n) ? 0 : LEGEND_DIM), getRadiusNodeSizeScale);
    rebuildHaloBuffer(plantNodes, (n) => (isNodeHiddenByLegend(n) ? 0 : LEGEND_DIM));
    return;
  }
  if (filter === 'ghost-project') {
    rebuildPointBuffer(plantNodes, plantBuffer, (n) => (isNodeHiddenByLegend(n) ? 0 : LEGEND_DIM), getRadiusNodeSizeScale);
    rebuildPointBuffer(substationNodes, substationBuffer, (n) => (isNodeHiddenByLegend(n) ? 0 : LEGEND_DIM), getRadiusNodeSizeScale);
    rebuildPointBuffer(consumerNodes, consumerBuffer, (n) => (isNodeHiddenByLegend(n) ? 0 : LEGEND_DIM), getRadiusNodeSizeScale);
    rebuildPointBuffer(ghostPowerNodes, ghostPowerBuffer, (n) => (isNodeHiddenByLegend(n) ? 0 : n.color[3]), getRadiusNodeSizeScale);
    rebuildHaloBuffer(plantNodes, (n) => (isNodeHiddenByLegend(n) ? 0 : LEGEND_DIM));
    return;
  }
  const matchFn = LEGEND_MATCH_SOURCES[filter];
  if (matchFn) {
    rebuildPointBuffer(plantNodes, plantBuffer, (n) => {
      const src = getPrimaryPlantSource(n.tags || {});
      if (matchFn(src)) {
        return n.color[3];
      }
      return isNodeHiddenByLegend(n) ? 0 : LEGEND_DIM;
    });
    rebuildPointBuffer(substationNodes, substationBuffer, (n) => (isNodeHiddenByLegend(n) ? 0 : LEGEND_DIM), getRadiusNodeSizeScale);
    rebuildPointBuffer(consumerNodes, consumerBuffer, (n) => (isNodeHiddenByLegend(n) ? 0 : LEGEND_DIM), getRadiusNodeSizeScale);
    rebuildPointBuffer(ghostPowerNodes, ghostPowerBuffer, (n) => (isNodeHiddenByLegend(n) ? 0 : LEGEND_DIM), getRadiusNodeSizeScale);
    rebuildHaloBuffer(plantNodes, (n) => {
      if (isNodeHiddenByLegend(n)) {
        return 0;
      }
      const src = getPrimaryPlantSource(n.tags || {});
      return matchFn(src) ? 1 : LEGEND_DIM;
    });
  }
}

function isGhostBatteryProject(tags) {
  const fuelA = String(tags?.['queue:fuel_1'] || '').toUpperCase();
  const fuelB = String(tags?.['queue:fuel_2'] || '').toUpperCase();
  return fuelA.includes('BATTERY') || fuelB.includes('BATTERY') || fuelA.includes('STORAGE') || fuelB.includes('STORAGE');
}

function formatGhostFuelLabel(rawFuel) {
  const fuel = String(rawFuel || '').trim();
  if (!fuel) return 'Unknown';
  const upper = fuel.toUpperCase();
  if (upper.includes('PHOTOVOLTAIC') || upper.includes('SOLAR')) return 'Solar';
  if (upper.includes('BATTERY') || upper.includes('STORAGE')) return 'Battery storage';
  if (upper.includes('WIND')) return 'Wind';
  if (upper.includes('GEOTHERMAL')) return 'Geothermal';
  if (upper.includes('HYDRO')) return 'Hydro';
  if (upper.includes('GAS')) return 'Gas';
  return fuel;
}

function formatGhostGeocodeMethodLabel(rawMethod) {
  if (rawMethod === 'poi-substation-match') return 'POI matched to substation';
  if (rawMethod === 'county-centroid-fallback') return 'County centroid fallback';
  if (!rawMethod) return 'Unknown method';
  return rawMethod;
}

function parseGhostCodYear(rawCod) {
  const value = String(rawCod || '').trim();
  const match = value.match(/(19|20)\d{2}/);
  if (!match) return null;
  const year = Number.parseInt(match[0], 10);
  return Number.isFinite(year) ? year : null;
}

function summarizeRadiusGhostProjects(nodes) {
  const ghostNodes = nodes.filter((node) => node.type === 'ghost');
  const projectCount = ghostNodes.length;
  const totalQueuedMW = ghostNodes.reduce((sum, node) => sum + (Number(node.sortValue) || 0), 0);
  const batteryQueuedMW = ghostNodes.reduce((sum, node) => {
    if (!isGhostBatteryProject(node.tags || {})) {
      return sum;
    }
    return sum + (Number(node.sortValue) || 0);
  }, 0);
  const batteryProjectCount = ghostNodes.filter((node) => isGhostBatteryProject(node.tags || {})).length;

  const geocodeCountByMethod = new Map();
  const primaryFuelMw = new Map();
  const codBuckets = {
    through2027: 0,
    years2028to2030: 0,
    after2030: 0,
    unknown: 0,
  };

  for (const node of ghostNodes) {
    const tags = node.tags || {};
    const queuedMW = Number(node.sortValue) || 0;
    const geocodeMethod = tags['queue:geocode_method'] || 'unknown';
    geocodeCountByMethod.set(geocodeMethod, (geocodeCountByMethod.get(geocodeMethod) || 0) + 1);

    const fuelLabel = formatGhostFuelLabel(tags['queue:fuel_1'] || tags['queue:fuel_2']);
    primaryFuelMw.set(fuelLabel, (primaryFuelMw.get(fuelLabel) || 0) + queuedMW);

    const codYear = parseGhostCodYear(tags['queue:requested_cod']);
    if (!codYear) {
      codBuckets.unknown += 1;
    } else if (codYear <= 2027) {
      codBuckets.through2027 += 1;
    } else if (codYear <= 2030) {
      codBuckets.years2028to2030 += 1;
    } else {
      codBuckets.after2030 += 1;
    }
  }

  const poiMatchedCount = geocodeCountByMethod.get('poi-substation-match') || 0;

  const geocodeMethodItems = Array.from(geocodeCountByMethod.entries())
    .map(([method, count]) => ({
      method,
      label: formatGhostGeocodeMethodLabel(method),
      count,
      share: projectCount > 0 ? (count / projectCount) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const fuelMixItems = Array.from(primaryFuelMw.entries())
    .map(([fuel, mw]) => ({
      fuel,
      mw,
      share: totalQueuedMW > 0 ? (mw / totalQueuedMW) * 100 : 0,
    }))
    .sort((a, b) => b.mw - a.mw);

  const topProjects = [...ghostNodes]
    .sort((a, b) => (Number(b.sortValue) || 0) - (Number(a.sortValue) || 0))
    .slice(0, 5)
    .map((node) => ({
      name: node.tags?.['queue:project_name'] || node.tags?.name || 'Unnamed queued project',
      mw: Number(node.sortValue) || 0,
      poi: node.tags?.['queue:poi'] || 'Unknown POI',
      cod: node.tags?.['queue:requested_cod'] || 'Unknown',
      fuel: formatGhostFuelLabel(node.tags?.['queue:fuel_1'] || node.tags?.['queue:fuel_2']),
    }));

  return {
    projectCount,
    totalQueuedMW,
    batteryQueuedMW,
    batteryProjectCount,
    poiMatchedCount,
    geocodeMethodItems,
    fuelMixItems,
    codBuckets,
    topProjects,
  };
}

function applyLegendFilter(source) {
  if (legendHoverSource === source) return;
  legendHoverSource = source;
  if (dataLayerMode === 'infrastructure') {
    rebuildFilteredBuffers();
    requestRender();
  }
}

function applyLegendVisibilityState() {
  normalizeLegendVisibilityState();
  syncLegendDrivenSelections();
  syncLegendUiState();

  if (dataLayerMode === 'infrastructure') {
    rebuildFilteredBuffers();

    if (activeDetailTab === 'radius') {
      if (isRadiusFrozen && hoverCircleCenter) {
        updateHoverCircleSelectionFromGroundPoint(hoverCircleCenter);
      } else if (lastPointerClientX !== null && lastPointerClientY !== null) {
        updateHoverCircleSelection(lastPointerClientX, lastPointerClientY);
      }
    } else {
      refreshInspectionPanel();
    }
  }

  updateCanvasCursor();
  requestRender();
}

function getPlantSourceStyle(tags) {
  const raw = (tags['plant:source'] || '').toLowerCase();
  const primary = raw.split(/[;,]/)[0].trim();
  return {
    color: PLANT_SOURCE_COLORS[primary] || PLANT_SOURCE_DEFAULT_COLOR,
    shape: PLANT_SOURCE_SHAPES[primary] ?? 0,
  };
}

function createPlantNodeStyle(tags) {
  const outputMW = parseOutputMW(tags['plant:output:electricity']);
  const normalizedOutput = outputMW ? clamp(Math.log10(outputMW + 1) / Math.log10(2500 + 1), 0, 1) : 0.18;
  const { color, shape } = getPlantSourceStyle(tags);
  // Push large plants much farther apart visually than small plants.
  const weightedOutput = Math.pow(normalizedOutput, 2.1);
  const size = lerp(4.5, 30, weightedOutput);
  const sizeRatio = size / 30;

  return {
    size,
    color,
    shape,
    // Crisp preset: tighter, less blended glow footprints.
    haloRadius: sizeRatio * lerp(0.055, 0.205, normalizedOutput),
    haloAlpha: lerp(0.085, 0.245, normalizedOutput),
    metricLabel: outputMW ? `${formatNumber(outputMW, 1)} MW output` : 'Output unavailable',
    sortValue: outputMW ?? 0,
  };
}

function createSubstationNodeStyle(tags) {
  const voltageKV = parseVoltageKV(tags.voltage);
  const normalizedVoltage = voltageKV ? clamp(voltageKV / 500, 0, 1) : 0.16;
  const role = getSubstationRole(tags);
  const roleStyle = SUBSTATION_ROLE_STYLE[role] || SUBSTATION_ROLE_STYLE['grid-transfer'];
  const color = lerpColor(roleStyle.colorA, roleStyle.colorB, normalizedVoltage);
  const size = lerp(4.5, 11, normalizedVoltage);

  return {
    size,
    color,
    shape: roleStyle.shape,
    metricLabel: voltageKV ? `${formatNumber(voltageKV, 0)} kV ${formatSubstationRoleLabel(role).toLowerCase()}` : formatSubstationRoleLabel(role),
    sortValue: voltageKV ?? 0,
  };
}

function createConsumerNodeStyle(tags) {
  const loadMW = Number.parseFloat(tags['load:mw']) || 0;
  const normalizedLoad = loadMW ? clamp(Math.log10(loadMW + 1) / Math.log10(7000 + 1), 0, 1) : 0.22;
  const weightedLoad = Math.pow(normalizedLoad, 1.35);
  const size = lerp(7, 20, weightedLoad);

  return {
    size,
    color: [1.0, 0.56, 0.69, 0.96],
    shape: 3,
    metricLabel: loadMW ? `${formatNumber(loadMW, 0)} MW avg. demand` : 'Demand unavailable',
    sortValue: loadMW ?? 0,
  };
}

function createGhostPowerNodeStyle(tags) {
  const queueMW = Number.parseFloat(tags['queue:mw_poi']) || 0;
  const normalizedOutput = queueMW ? clamp(Math.log10(queueMW + 1) / Math.log10(2500 + 1), 0, 1) : 0.18;
  const primaryFuel = (tags['queue:fuel_1'] || '').toUpperCase();
  const style = GHOST_POWER_SOURCE_STYLE[primaryFuel] || GHOST_POWER_DEFAULT_STYLE;

  return {
    size: lerp(6.5, 22, Math.pow(normalizedOutput, 1.85)),
    color: style.color,
    shape: style.shape,
    haloRadius: lerp(0.06, 0.16, normalizedOutput),
    haloAlpha: lerp(0.16, 0.32, normalizedOutput),
    metricLabel: `${formatNumber(queueMW, queueMW >= 100 ? 0 : 1)} MW queued`,
    sortValue: queueMW,
  };
}

function buildPointLayer(elements, projection, type) {
  if (!projection || !Array.isArray(elements)) {
    return { vertexData: new Float32Array([]), haloData: new Float32Array([]), nodes: [] };
  }

  const vertexData = [];
  const haloData = [];
  const nodes = [];

  // Get the current state boundary rings for filtering
  const rings = typeof stateMap !== 'undefined' && typeof selectedStateName !== 'undefined' && stateMap.has(selectedStateName)
    ? stateMap.get(selectedStateName)
    : null;

  for (const element of elements) {
    const position = getElementPosition(element);
    if (!position) {
      continue;
    }
    // Only apply fudge for plants and substations
    let passesBoundary = true;
    if (rings) {
      if (type === 'plant' || type === 'substation') {
        passesBoundary = isPointNearPolygon([position.lon, position.lat], rings, STATE_BOUNDARY_FUDGE_DISTANCE_DEGREES);
      } else {
        passesBoundary = isPointInPolygon([position.lon, position.lat], rings);
      }
    }
    if (!passesBoundary) {
      continue;
    }
    const tags = element.tags || {};
    const style = type === 'plant'
      ? createPlantNodeStyle(tags)
      : type === 'consumer'
        ? createConsumerNodeStyle(tags)
        : type === 'ghost'
          ? createGhostPowerNodeStyle(tags)
          : createSubstationNodeStyle(tags);
    const y = type === 'plant' ? 0.02 : type === 'consumer' ? 0.018 : type === 'ghost' ? 0.024 : 0.014;
    const [x, py, z] = projection.project(position.lon, position.lat, y);

    vertexData.push(
      x, py, z,
      style.size,
      style.color[0], style.color[1], style.color[2], style.color[3],
      style.shape ?? 0,
    );

    nodes.push({
      id: `${type}-${element.type}-${element.id}`,
      type,
      x,
      y: py,
      z,
      size: style.size,
      color: style.color,
      shape: style.shape ?? 0,
      metricLabel: style.metricLabel,
      sortValue: style.sortValue,
      tags,
      osmType: element.type,
      osmId: element.id,
      screenX: 0,
      screenY: 0,
      screenRadius: style.size,
      haloRadius: style.haloRadius ?? null,
      haloAlpha: style.haloAlpha ?? 0,
      visible: false,
    });
  }
  for (const node of nodes) {
    if (node.haloRadius == null) continue;
    const haloY = -0.03;
    const r = node.haloRadius;
    const hc = [node.color[0], node.color[1], node.color[2], node.haloAlpha];
    const verts = [
      [node.x - r, node.z - r, -1, -1],
      [node.x + r, node.z - r,  1, -1],
      [node.x + r, node.z + r,  1,  1],
      [node.x - r, node.z - r, -1, -1],
      [node.x + r, node.z + r,  1,  1],
      [node.x - r, node.z + r, -1,  1],
    ];
    for (const [qx, qz, lx, lz] of verts) {
      haloData.push(qx, haloY, qz, lx, lz, hc[0], hc[1], hc[2], hc[3]);
    }
  }

  return {
    vertexData: new Float32Array(vertexData),
    haloData: new Float32Array(haloData),
    nodes,
  };
}

function buildDetailRows(node) {
  const rows = [];
  const tags = node.tags || {};
  const annualConsumptionGWh = Number.parseFloat(tags['consumption:gwh:annual']) || 0;
  const consumerType = tags['consumer:type'] || 'load';
  const substationRole = node.type === 'substation' ? getSubstationRole(tags) : null;
  const operatorLabel = node.type === 'consumer'
    ? (tags.operator || tags['operator:short'] || 'County aggregate')
    : (tags.operator || tags['operator:short'] || 'Unknown');

  rows.push(['Type', node.type === 'plant'
    ? 'Plant'
    : node.type === 'consumer'
      ? `${consumerType.charAt(0).toUpperCase()}${consumerType.slice(1)} consumer node`
      : node.type === 'ghost'
        ? 'Queued generator project'
        : `${formatSubstationRoleLabel(substationRole)} substation`]);
  rows.push(['Name', tags.name || tags['queue:project_name'] || 'Unnamed']);

  if (node.type === 'plant') {
    const nodeCo2TonsPerHour = estimateNodeCo2TonsPerHour(node);
    rows.push(['Output', node.metricLabel]);
    rows.push(['Est. CO2', formatCo2TonsPerHour(nodeCo2TonsPerHour)]);
    rows.push(['Gas-Car Eq.', formatGasCarDrivingTimeFromHours(estimateGasCarDrivingHoursFromCo2Tons(nodeCo2TonsPerHour))]);
  } else if (node.type === 'consumer') {
    rows.push(['Avg. Demand', node.metricLabel]);
    if (annualConsumptionGWh > 0) {
      const yearLabel = tags.year ? ` (${tags.year})` : '';
      rows.push([`Annual Use${yearLabel}`, `${formatNumber(annualConsumptionGWh, 0)} GWh`]);
    }
    rows.push(['Est. CO2', 'Indirect load only']);
    rows.push(['Gas-Car Eq.', 'Indirect load only']);
  } else if (node.type === 'ghost') {
    rows.push(['Queued Capacity', node.metricLabel]);
    rows.push(['Primary Fuel', tags['queue:fuel_1'] || 'Unknown']);
    if (tags['queue:fuel_2'] && tags['queue:fuel_2'] !== 'N/A') {
      rows.push(['Hybrid Component', tags['queue:fuel_2']]);
    }
    rows.push(['Point of Interconnection', tags['queue:poi'] || 'Unknown']);
    rows.push(['Requested COD', tags['queue:requested_cod'] || 'Unknown']);
    rows.push(['Status', 'Waiting in interconnection queue']);
  } else {
    rows.push(['Transfer', node.metricLabel]);
    rows.push(['Role', formatSubstationRoleLabel(substationRole)]);
    rows.push(['Purpose', getSubstationRoleDescription(substationRole)]);
    rows.push(['Est. CO2', 'No direct emissions']);
    rows.push(['Gas-Car Eq.', '0 hr gas-car driving']);
  }

  rows.push(['Operator', operatorLabel]);
  rows.push(['Source', tags.source || tags['source:name'] || 'Unknown']);

  if (node.type === 'ghost') {
    rows.push(['Queue No.', tags['queue:number'] || 'Unknown']);
    rows.push(['Project No.', tags['queue:project_number'] || 'Unknown']);
    rows.push(['County', tags['queue:county'] || 'Unknown']);
    rows.push(['Study Area', tags['queue:study_area'] || 'Unknown']);
    rows.push(['PTO', tags['queue:pto'] || 'Unknown']);
    rows.push(['Service', tags['queue:service_type'] || 'Unknown']);
    rows.push(['Mapped Via', tags['queue:geocode_method'] || 'Unknown']);
  }

  if (tags['plant:source']) {
    rows.push(['Plant Source', tags['plant:source']]);
  }

  if (tags.voltage && tags.voltage !== 'none') {
    rows.push(['Voltage', tags.voltage]);
  }

  rows.push(['OSM', `${node.osmType} ${node.osmId}`]);
  return rows;
}

function buildDensityDetailRows(cell) {
  return [
    ['Layer', 'Residential Solar Density'],
    ['Projects', formatNumber(cell.projects)],
    ['MW DC', formatNumber(cell.mwDc, 2)],
    ['MW AC', formatNumber(cell.mwAc, 2)],
    ['ZIPs in Cell', formatNumber(cell.zipCount)],
    ['Sample ZIP', cell.sampleZip || 'Unknown'],
  ];
}

function formatGenerationSubtypeLabel(subtype) {
  if (subtype === 'fossil-fuels') return 'Fossil fuels';
  if (subtype === 'battery-storage') return 'Battery storage';
  if (subtype === 'renewables') return 'Renewables';
  if (subtype === 'nuclear') return 'Nuclear';
  if (subtype === 'other') return 'Unknown';
  return subtype || 'Unknown';
}

function formatPlantSourceLabel(source) {
  if (source === 'solar') return 'Solar';
  if (source === 'wind') return 'Wind';
  if (source === 'hydro') return 'Hydro';
  if (source === 'gas') return 'Gas';
  if (source === 'nuclear') return 'Nuclear';
  if (source === 'geothermal') return 'Geothermal';
  if (source === 'biomass') return 'Biomass';
  if (source === 'biogas') return 'Biogas';
  if (source === 'waste') return 'Waste';
  if (source === 'battery') return 'Battery';
  if (source === 'coal') return 'Coal';
  if (source === 'oil') return 'Oil';
  if (source === 'diesel') return 'Diesel';
  return 'Unknown';
}

function buildGenerationHeatmapDetailRows(cell) {
  return [
    ['Layer', 'Generation Heatmap'],
    ['Cell Output', `${formatNumber(cell.powerMW, 2)} MW`],
    ['Plants in Cell', formatNumber(cell.plantCount)],
    ['Dominant Type', formatGenerationSubtypeLabel(cell.dominantSubtype)],
    ['Renewables', `${formatNumber(cell.subtypePower.renewables || 0, 2)} MW`],
    ['Fossil Fuels', `${formatNumber(cell.subtypePower['fossil-fuels'] || 0, 2)} MW`],
    ['Nuclear', `${formatNumber(cell.subtypePower.nuclear || 0, 2)} MW`],
    ['Battery Storage', `${formatNumber(cell.subtypePower['battery-storage'] || 0, 2)} MW`],
    ['Other / Unknown', `${formatNumber(cell.subtypePower.other || 0, 2)} MW`],
  ];
}

function setInspectionNode(node, isPinned) {
  inspectionPanel.classList.toggle('is-empty', !node);

  if (!node) {
    if (dataLayerMode === 'solar-density') {
      inspectionHint.textContent = 'Hover or click a density cell.';
    } else if (dataLayerMode === 'generation-heatmap') {
      inspectionHint.textContent = 'Hover or click a generation heatmap cell.';
    } else {
      inspectionHint.textContent = 'Hover or click a plant, substation, consumer node, or ghost project.';
    }
    inspectionDetails.innerHTML = '';
    return;
  }

  inspectionHint.textContent = isPinned ? 'Pinned selection' : 'Hover preview';
  inspectionDetails.innerHTML = buildDetailRows(node)
    .map(([label, value]) => `<dt>${label}</dt><dd>${value}</dd>`)
    .join('');
}

function setInspectionDensityCell(cell, isPinned) {
  inspectionPanel.classList.toggle('is-empty', !cell);

  if (!cell) {
    inspectionHint.textContent = 'Hover or click a density cell.';
    inspectionDetails.innerHTML = '';
    return;
  }

  inspectionHint.textContent = isPinned ? 'Pinned selection' : 'Hover preview';
  inspectionDetails.innerHTML = buildDensityDetailRows(cell)
    .map(([label, value]) => `<dt>${label}</dt><dd>${value}</dd>`)
    .join('');
}

function setInspectionGenerationHeatmapCell(cell, isPinned) {
  inspectionPanel.classList.toggle('is-empty', !cell);

  if (!cell) {
    inspectionHint.textContent = 'Hover or click a generation heatmap cell.';
    inspectionDetails.innerHTML = '';
    return;
  }

  inspectionHint.textContent = isPinned ? 'Pinned selection' : 'Hover preview';
  inspectionDetails.innerHTML = buildGenerationHeatmapDetailRows(cell)
    .map(([label, value]) => `<dt>${label}</dt><dd>${value}</dd>`)
    .join('');
}

function refreshInspectionPanel() {
  if (dataLayerMode === 'solar-density') {
    setInspectionDensityCell(pinnedDensityCell || hoveredDensityCell, Boolean(pinnedDensityCell));
    return;
  }

  if (dataLayerMode === 'generation-heatmap') {
    setInspectionGenerationHeatmapCell(
      pinnedGenerationHeatmapCell || hoveredGenerationHeatmapCell,
      Boolean(pinnedGenerationHeatmapCell),
    );
    return;
  }

  setInspectionNode(pinnedNode || hoveredNode, Boolean(pinnedNode));
}

function updateCanvasCursor() {
  if (isDragging) {
    canvas.style.cursor = 'grabbing';
    return;
  }

  if (dataLayerMode === 'solar-density') {
    canvas.style.cursor = hoveredDensityCell ? 'pointer' : 'grab';
    return;
  }

  if (dataLayerMode === 'generation-heatmap') {
    canvas.style.cursor = hoveredGenerationHeatmapCell ? 'pointer' : 'grab';
    return;
  }

  if (activeDetailTab === 'radius') {
    if (isRadiusFrozen) {
      canvas.style.cursor = 'crosshair';
    } else {
      canvas.style.cursor = hoverCircleCenter ? 'none' : 'grab';
    }
    return;
  }

  canvas.style.cursor = hoveredNode ? 'pointer' : 'grab';
}

function updateRadiusControlVisibility() {
  if (!radiusControl) {
    return;
  }

  const visible = dataLayerMode === 'infrastructure' && activeDetailTab === 'radius';
  radiusControl.classList.toggle('is-hidden', !visible);
  if (radiusEffectsToggle) {
    radiusEffectsToggle.classList.toggle('is-hidden', !visible);
  }

  syncLegendUiState();
}

function ensureLegendToggleCheckboxes() {
  if (!legendFloat) {
    return;
  }

  legendFloat.querySelectorAll('li[data-legend-source]').forEach((item) => {
    if (item.querySelector('.legend-toggle-input')) {
      return;
    }

    const source = item.dataset.legendSource;
    const marker = item.querySelector('.legend-swatch, .legend-dot');
    const markerClone = marker ? marker.cloneNode(true) : null;
    const labelText = item.textContent.replace(/\s+/g, ' ').trim();

    item.textContent = '';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'legend-toggle-input';
    checkbox.setAttribute('aria-label', labelText);

    checkbox.addEventListener('click', (event) => {
      event.stopPropagation();
    });

    checkbox.addEventListener('change', (event) => {
      event.stopPropagation();
      if (NON_INTERACTIVE_LEGEND_SOURCES.has(source)) {
        checkbox.checked = true;
        return;
      }
      if (checkbox.checked) {
        hiddenLegendSources.delete(source);
      } else {
        hiddenLegendSources.add(source);
      }
      applyLegendVisibilityState();
    });

    if (markerClone) {
      item.appendChild(markerClone);
    }
    item.appendChild(checkbox);

    const label = document.createElement('span');
    label.className = 'legend-toggle-label';
    label.textContent = labelText;
    item.appendChild(label);
  });

  if (!legendMobileDropdown) {
    legendMobileDropdown = document.createElement('details');
    legendMobileDropdown.className = 'legend-mobile-dropdown';
    legendMobileDropdown.toggleAttribute('open', !mobileLayoutQuery.matches);

    legendMobileTrigger = document.createElement('summary');
    legendMobileTrigger.className = 'legend-mobile-trigger';
    legendMobileTrigger.textContent = mobileLayoutQuery.matches ? 'Menu' : 'Legend';
    legendMobileDropdown.appendChild(legendMobileTrigger);

    const panel = document.createElement('div');
    panel.className = 'legend-mobile-panel';

    legendMobileControlsGroup = document.createElement('div');
    legendMobileControlsGroup.className = 'legend-mobile-group legend-mobile-group--controls';
    legendMobileControlsGroup.hidden = !mobileLayoutQuery.matches;

    const controlsGroupTitle = document.createElement('p');
    controlsGroupTitle.className = 'legend-mobile-group-title';
    controlsGroupTitle.textContent = 'Map controls';
    legendMobileControlsGroup.appendChild(controlsGroupTitle);

    legendMobileRadiusGroup = document.createElement('div');
    legendMobileRadiusGroup.className = 'legend-mobile-group legend-mobile-group--radius';
    legendMobileRadiusGroup.hidden = !mobileLayoutQuery.matches;

    const radiusGroupTitle = document.createElement('p');
    radiusGroupTitle.className = 'legend-mobile-group-title';
    radiusGroupTitle.textContent = 'Radius';
    legendMobileRadiusGroup.appendChild(radiusGroupTitle);

    legendMobileActionsGroup = document.createElement('div');
    legendMobileActionsGroup.className = 'legend-mobile-group legend-mobile-group--actions';
    legendMobileActionsGroup.hidden = !mobileLayoutQuery.matches;

    const actionsGroupTitle = document.createElement('p');
    actionsGroupTitle.className = 'legend-mobile-group-title';
    actionsGroupTitle.textContent = 'Panels';
    legendMobileActionsGroup.appendChild(actionsGroupTitle);

    const legendGroup = document.createElement('div');
    legendGroup.className = 'legend-mobile-group legend-mobile-group--sources';

    const legendGroupTitle = document.createElement('p');
    legendGroupTitle.className = 'legend-mobile-group-title';
    legendGroupTitle.textContent = 'Map legend';
    legendGroup.appendChild(legendGroupTitle);

    if (legendShowAllButton) {
      const legendControls = document.createElement('div');
      legendControls.className = 'legend-mobile-controls';
      legendControls.appendChild(legendShowAllButton);
      if (legendHideAllButton) {
        legendControls.appendChild(legendHideAllButton);
      }
      legendGroup.appendChild(legendControls);
    }

    legendMobileOptions = document.createElement('div');
    legendMobileOptions.className = 'legend-mobile-options';
    legendGroup.appendChild(legendMobileOptions);

    const extrasGroup = document.createElement('div');
    extrasGroup.className = 'legend-mobile-group legend-mobile-group--extras';

    const extrasGroupTitle = document.createElement('p');
    extrasGroupTitle.className = 'legend-mobile-group-title';
    extrasGroupTitle.textContent = 'Radius hover';
    extrasGroup.appendChild(extrasGroupTitle);

    legendMobileExtras = document.createElement('div');
    legendMobileExtras.className = 'legend-mobile-options legend-mobile-options--extras';
    extrasGroup.appendChild(legendMobileExtras);

    panel.appendChild(legendMobileControlsGroup);
    panel.appendChild(legendMobileRadiusGroup);
    panel.appendChild(legendMobileActionsGroup);
    panel.appendChild(legendGroup);
    panel.appendChild(extrasGroup);
    legendMobileDropdown.appendChild(panel);
    legendFloat.insertBefore(legendMobileDropdown, legendFloat.firstChild);
  }

  if (legendMobileOptions && legendMobileOptions.childElementCount === 0) {
    legendFloat.querySelectorAll('li[data-legend-source]').forEach((item) => {
      const source = item.dataset.legendSource;
      const marker = item.querySelector('.legend-swatch, .legend-dot');
      const markerClone = marker ? marker.cloneNode(true) : null;
      const labelText = item.querySelector('.legend-toggle-label')?.textContent || item.textContent.replace(/\s+/g, ' ').trim();

      const option = document.createElement('label');
      option.className = 'legend-mobile-option';
      option.dataset.legendSource = source;

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'legend-toggle-input';
      checkbox.setAttribute('aria-label', labelText);
      checkbox.addEventListener('click', (event) => {
        event.stopPropagation();
      });
      checkbox.addEventListener('change', (event) => {
        event.stopPropagation();
        if (NON_INTERACTIVE_LEGEND_SOURCES.has(source)) {
          checkbox.checked = true;
          return;
        }
        if (checkbox.checked) {
          hiddenLegendSources.delete(source);
        } else {
          hiddenLegendSources.add(source);
        }
        applyLegendVisibilityState();
      });

      option.appendChild(checkbox);
      if (markerClone) {
        option.appendChild(markerClone);
      }

      const text = document.createElement('span');
      text.className = 'legend-mobile-option-label';
      text.textContent = labelText;
      option.appendChild(text);

      legendMobileOptions.appendChild(option);
    });
  }

  if (legendMobileExtras && legendMobileExtras.childElementCount === 0) {
    MOBILE_LEGEND_EXTRA_TOGGLES.forEach(({ key, label, setChecked }) => {
      const option = document.createElement('label');
      option.className = 'legend-mobile-option legend-mobile-option--extra';
      option.dataset.legendExtra = key;

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'legend-toggle-input';
      checkbox.setAttribute('aria-label', label);
      checkbox.addEventListener('click', (event) => {
        event.stopPropagation();
      });
      checkbox.addEventListener('change', (event) => {
        event.stopPropagation();
        setChecked(Boolean(event.target.checked));
        syncLegendUiState();
      });

      option.appendChild(checkbox);

      const text = document.createElement('span');
      text.className = 'legend-mobile-option-label';
      text.textContent = label;
      option.appendChild(text);

      legendMobileExtras.appendChild(option);
    });
  }

  applyLegendVariantClasses();
}

function updateRadiusControlValueLabel() {
  if (radiusSizeValue) {
    radiusSizeValue.textContent = hoverCircleRadius.toFixed(2);
  }

  if (radiusSizeSlider) {
    radiusSizeSlider.value = hoverCircleRadius.toFixed(2);
  }
}

function setActiveRadiusSubtab(tabName) {
  if (tabName === 'substations' || tabName === 'power-lines' || tabName === 'ghost-projects') {
    activeRadiusSubtab = tabName;
  } else {
    activeRadiusSubtab = 'overview';
  }

  if (radiusSubtabOverview) {
    radiusSubtabOverview.classList.toggle('is-active', activeRadiusSubtab === 'overview');
    radiusSubtabOverview.setAttribute('aria-selected', activeRadiusSubtab === 'overview' ? 'true' : 'false');
  }

  if (radiusSubtabSubstations) {
    radiusSubtabSubstations.classList.toggle('is-active', activeRadiusSubtab === 'substations');
    radiusSubtabSubstations.setAttribute('aria-selected', activeRadiusSubtab === 'substations' ? 'true' : 'false');
  }

  if (radiusSubtabPowerLines) {
    radiusSubtabPowerLines.classList.toggle('is-active', activeRadiusSubtab === 'power-lines');
    radiusSubtabPowerLines.setAttribute('aria-selected', activeRadiusSubtab === 'power-lines' ? 'true' : 'false');
  }

  if (radiusSubtabGhostProjects) {
    radiusSubtabGhostProjects.classList.toggle('is-active', activeRadiusSubtab === 'ghost-projects');
    radiusSubtabGhostProjects.setAttribute('aria-selected', activeRadiusSubtab === 'ghost-projects' ? 'true' : 'false');
  }

  if (radiusOverviewPanel) {
    radiusOverviewPanel.classList.toggle('is-hidden', activeRadiusSubtab !== 'overview');
  }

  if (radiusSubstationPanel) {
    radiusSubstationPanel.classList.toggle('is-hidden', activeRadiusSubtab !== 'substations');
  }

  if (radiusPowerLinesPanel) {
    radiusPowerLinesPanel.classList.toggle('is-hidden', activeRadiusSubtab !== 'power-lines');
  }

  if (radiusGhostProjectsPanel) {
    radiusGhostProjectsPanel.classList.toggle('is-hidden', activeRadiusSubtab !== 'ghost-projects');
  }

  requestRender();
}

function setActiveDetailTab(tabName) {
  const radiusAvailable = dataLayerMode === 'infrastructure';
  activeDetailTab = tabName === 'radius' && radiusAvailable ? 'radius' : 'inspection';

  if (detailTabNode) {
    detailTabNode.classList.toggle('is-active', activeDetailTab === 'inspection');
    detailTabNode.setAttribute('aria-selected', activeDetailTab === 'inspection' ? 'true' : 'false');
  }

  if (detailTabRadius) {
    detailTabRadius.classList.toggle('is-hidden', !radiusAvailable);
    detailTabRadius.classList.toggle('is-active', activeDetailTab === 'radius' && radiusAvailable);
    detailTabRadius.setAttribute('aria-selected', activeDetailTab === 'radius' && radiusAvailable ? 'true' : 'false');
  }

  if (inspectionPanel) {
    inspectionPanel.classList.toggle('is-hidden', activeDetailTab !== 'inspection');
  }

  if (radiusStatsPanel) {
    radiusStatsPanel.classList.toggle('is-hidden', activeDetailTab !== 'radius' || !radiusAvailable);
  }

  updateRadiusControlVisibility();

  if (activeDetailTab === 'radius' && radiusAvailable) {
    hoveredNode = null;
    if (!isDragging && lastPointerClientX !== null && lastPointerClientY !== null) {
      updateHoverCircleSelection(lastPointerClientX, lastPointerClientY);
    } else {
      setRadiusStats(false);
    }
  } else {
    if (dataLayerMode === 'infrastructure' && !pinnedNode && !isDragging && lastPointerClientX !== null && lastPointerClientY !== null) {
      hoveredNode = findNearestNode(lastPointerClientX, lastPointerClientY);
    }
    hoverCircleCenter = null;
    nodesInHoverCircle = [];
    hoverCircleTotalOutputMW = 0;
    isRadiusFrozen = false;
    setRadiusStats(false);
    refreshInspectionPanel();
    if (dataLayerMode === 'infrastructure') {
      rebuildFilteredBuffers();
    }
  }

  updateCanvasCursor();
  requestRender();
}

const GEN_TYPE_COLORS = {
  'Solar': '#ffcc00',
  'Natural Gas': '#ff6600',
  'Wind': '#00e5ff',
  'Hydro': '#1976ff',
  'Nuclear': '#ec00ff',
  'Geothermal': '#ff1338',
  'Biomass / Biogas / Waste': '#00dc69',
  'Coal / Oil': '#a08c5a',
  'Unknown / Imports': '#7a8fa0',
};

function colorForGenType(type) {
  return GEN_TYPE_COLORS[type] ?? '#9bafbe';
}

function renderGenPieChart(data) {
  if (!genPieChart || !pieLegend) return;
  const filtered = data.filter((d) => (Number(d.value) || 0) > 0);
  const total = filtered.reduce((s, d) => s + Number(d.value), 0);
  if (total === 0) {
    genPieChart.innerHTML = '';
    pieLegend.innerHTML = '';
    return;
  }
  const cx = 70, cy = 70, outerR = 64, innerR = 30;
  let angle = -Math.PI / 2;
  const GAP = 0.013;
  const paths = filtered.map((d) => {
    const slice = (Number(d.value) / total) * Math.PI * 2;
    const sa = angle + GAP / 2;
    const ea = angle + slice - GAP / 2;
    angle += slice;
    const x1 = cx + outerR * Math.cos(sa);
    const y1 = cy + outerR * Math.sin(sa);
    const x2 = cx + outerR * Math.cos(ea);
    const y2 = cy + outerR * Math.sin(ea);
    const ix1 = cx + innerR * Math.cos(ea);
    const iy1 = cy + innerR * Math.sin(ea);
    const ix2 = cx + innerR * Math.cos(sa);
    const iy2 = cy + innerR * Math.sin(sa);
    const large = slice > Math.PI ? 1 : 0;
    const p = `M${x1.toFixed(2)},${y1.toFixed(2)} A${outerR},${outerR} 0 ${large},1 ${x2.toFixed(2)},${y2.toFixed(2)} L${ix1.toFixed(2)},${iy1.toFixed(2)} A${innerR},${innerR} 0 ${large},0 ${ix2.toFixed(2)},${iy2.toFixed(2)} Z`;
    return `<path d="${p}" fill="${colorForGenType(d.type)}" opacity="0.92"/>`;
  });
  genPieChart.innerHTML = paths.join('');
  pieLegend.innerHTML = filtered
    .map((d) => {
      const pct = ((Number(d.value) / total) * 100).toFixed(1);
      return `<li><span class="pie-dot" style="background:${colorForGenType(d.type)}"></span><span class="pie-label">${d.type}</span><span class="pie-val">${pct}%</span></li>`;
    })
    .join('');
}


function setGlobalTotalsUnavailable(stateName) {
  currentStateTotals = null;
  if (!globalStatsMeta || !globalStatsTotals) {
    return;
  }

  globalStatsMeta.textContent = `No statewide totals available for ${stateName}.`;
  globalStatsTotals.innerHTML = '';
  if (genPieChart) genPieChart.innerHTML = '';
  if (pieLegend) pieLegend.innerHTML = '';
}

function setGlobalTotalsForState(stateName, totals) {
  currentStateTotals = totals;
  if (!globalStatsMeta || !globalStatsTotals) {
    return;
  }

  const generationByType = Array.isArray(totals?.generationByTypeGWh) ? totals.generationByTypeGWh : [];
  const totalGeneration = generationByType.reduce((sum, entry) => sum + (Number(entry.value) || 0), 0);
  const totalConsumption = Number(totals?.totalConsumptionGWh) || 0;
  const totalBatteryStorage = Number(totals?.totalBatteryStorageGWh) || 0;
  const totalCo2Mt = estimateStateCo2Mt(totals);
  const stateGasCarDrivingHours = estimateGasCarDrivingHoursFromCo2Tons(totalCo2Mt * 1000000);
  const batteryFillPercent = 100;
  const projectionByYear = totals?.projectionByYearGWh && typeof totals.projectionByYearGWh === 'object'
    ? totals.projectionByYearGWh
    : {};
  const projectionYears = Object.keys(projectionByYear).sort();
  const summaryRows = [
    `<dt>Total Generation</dt><dd>${formatNumber(totalGeneration, 1)} GWh</dd>`,
    `<dt>Total Consumption</dt><dd>${formatNumber(totalConsumption, 1)} GWh</dd>`,
    `<dt>Est. CO2 Emissions</dt><dd>${formatCo2MtPerYear(totalCo2Mt)}</dd>`,
    `<dt>Gas-Car Eq.</dt><dd>${formatGasCarDrivingTimeFromHours(stateGasCarDrivingHours)}</dd>`,
    `<dt>Total Battery Storage</dt><dd><span class="global-battery-value"><span class="global-battery-icon" style="--battery-fill:${batteryFillPercent.toFixed(1)};"><span class="global-battery-fill"></span></span><span>${formatNumber(totalBatteryStorage, 2)} GWh</span></span></dd>`,
  ];

  projectionYears.forEach((year) => {
    const projection = projectionByYear[year];
    const projectedGen = Number(projection?.totalGenerationGWh);
    const projectedCons = Number(projection?.totalConsumptionGWh);
    if (Number.isFinite(projectedGen)) {
      summaryRows.push(`<dt>Projected Generation (${escapeHtml(year)})</dt><dd>${formatNumber(projectedGen, 1)} GWh</dd>`);
    }
    if (Number.isFinite(projectedCons)) {
      summaryRows.push(`<dt>Projected Consumption (${escapeHtml(year)})</dt><dd>${formatNumber(projectedCons, 1)} GWh</dd>`);
    }
  });

  globalStatsMeta.textContent = totals?.meta || `Statewide totals for ${stateName}.`;
  globalStatsTotals.innerHTML = summaryRows.join('');

  renderGenPieChart(generationByType);
}

async function setGlobalTotalsForSelectedState(stateName) {
  if (!stateName) {
    setGlobalTotalsUnavailable('Unknown');
    return;
  }

  try {
    const allTotals = await loadJson(stateGlobalTotalsFilePath, stateGlobalTotalsCache);
    const stateTotals = allTotals?.[stateName];

    if (!stateTotals) {
      setGlobalTotalsUnavailable(stateName);
      return;
    }

    setGlobalTotalsForState(stateName, stateTotals);
  } catch (error) {
    console.error(error);
    setGlobalTotalsUnavailable(stateName);
  }
}

const lineProgram = createProgram(lineVertexShaderSource, lineFragmentShaderSource);
const fillProgram = createProgram(fillVertexShaderSource, fillFragmentShaderSource);
const pointProgram = createProgram(pointVertexShaderSource, pointFragmentShaderSource);
const haloProgram = createProgram(haloVertexShaderSource, haloFragmentShaderSource);

const lineLocations = {
  program: lineProgram,
  position: gl.getAttribLocation(lineProgram, 'aPosition'),
  projection: gl.getUniformLocation(lineProgram, 'uProjection'),
  view: gl.getUniformLocation(lineProgram, 'uView'),
  model: gl.getUniformLocation(lineProgram, 'uModel'),
  color: gl.getUniformLocation(lineProgram, 'uColor'),
  yOffset: gl.getUniformLocation(lineProgram, 'uYOffset'),
};

const fillLocations = {
  program: fillProgram,
  position: gl.getAttribLocation(fillProgram, 'aPosition'),
  color: gl.getAttribLocation(fillProgram, 'aColor'),
  projection: gl.getUniformLocation(fillProgram, 'uProjection'),
  view: gl.getUniformLocation(fillProgram, 'uView'),
  model: gl.getUniformLocation(fillProgram, 'uModel'),
};

const pointLocations = {
  program: pointProgram,
  position: gl.getAttribLocation(pointProgram, 'aPosition'),
  pointSize: gl.getAttribLocation(pointProgram, 'aPointSize'),
  color: gl.getAttribLocation(pointProgram, 'aColor'),
  shape: gl.getAttribLocation(pointProgram, 'aShape'),
  projection: gl.getUniformLocation(pointProgram, 'uProjection'),
  view: gl.getUniformLocation(pointProgram, 'uView'),
  model: gl.getUniformLocation(pointProgram, 'uModel'),
};

const haloLocations = {
  program: haloProgram,
  position: gl.getAttribLocation(haloProgram, 'aPosition'),
  localXZ: gl.getAttribLocation(haloProgram, 'aLocalXZ'),
  color: gl.getAttribLocation(haloProgram, 'aColor'),
  projection: gl.getUniformLocation(haloProgram, 'uProjection'),
  view: gl.getUniformLocation(haloProgram, 'uView'),
  model: gl.getUniformLocation(haloProgram, 'uModel'),
};

const gridBuffer = gl.createBuffer();
const stateOutlineBuffer = gl.createBuffer();
const transmissionLineBuffer = gl.createBuffer();
const transmissionMinorLineBuffer = gl.createBuffer();
const transmissionCableBuffer = gl.createBuffer();
const solarDensityBuffer = gl.createBuffer();
const generationHeatmapBuffer = gl.createBuffer();
const substationBuffer = gl.createBuffer();
const consumerBuffer = gl.createBuffer();
const plantBuffer = gl.createBuffer();
const ghostPowerBuffer = gl.createBuffer();
const haloBuffer = gl.createBuffer();
const highlightBuffer = gl.createBuffer();
const densityHighlightBuffer = gl.createBuffer();
const powerSpikeBuffer = gl.createBuffer();
const hoverCircleBuffer = gl.createBuffer();
const consumerSparkleBuffer = gl.createBuffer();
const generationHeatmapHighlightBuffer = gl.createBuffer();

const gridVertices = createGridVertices(2.7, 0.2);
const gridVertexCount = gridVertices.length / 3;

gl.bindBuffer(gl.ARRAY_BUFFER, gridBuffer);
gl.bufferData(gl.ARRAY_BUFFER, gridVertices, gl.STATIC_DRAW);

// Removed duplicate transmissionFileByState mapping block causing syntax error
const transmissionFileByState = {
  Alaska: 'grid/alaska-transmission.json',
  Alabama: 'grid/alabama-transmission.json',
  Arkansas: 'grid/arkansas-transmission.json',
  Arizona: 'grid/arizona-transmission.json',
  California: 'grid/california-transmission.json',
  Connecticut: 'grid/connecticut-transmission.json',
  Colorado: 'grid/colorado-transmission.json',
  Delaware: 'grid/delaware-transmission.json',
  Florida: 'grid/florida-transmission.json',
  Georgia: 'grid/georgia-transmission.json',
  Hawaii: 'grid/hawaii-transmission.json',
  Idaho: 'grid/idaho-transmission.json',
  Illinois: 'grid/illinois-transmission.json',
  Indiana: 'grid/indiana-transmission.json',
  Iowa: 'grid/iowa-transmission.json',
  Kansas: 'grid/kansas-transmission.json',
  Kentucky: 'grid/kentucky-transmission.json',
  Louisiana: 'grid/louisiana-transmission.json',
  Maine: 'grid/maine-transmission.json',
  Maryland: 'grid/maryland-transmission.json',
};

const substationFileByState = {
  Alaska: 'grid/alaska-substations.json',
  Alabama: 'grid/alabama-substations.json',
  Arkansas: 'grid/arkansas-substations.json',
  Arizona: 'grid/arizona-substations.json',
  California: 'grid/california-substations.json',
  Connecticut: 'grid/connecticut-substations.json',
  Colorado: 'grid/colorado-substations.json',
  Delaware: 'grid/delaware-substations.json',
  Florida: 'grid/florida-substations.json',
  Georgia: 'grid/georgia-substations.json',
  Hawaii: 'grid/hawaii-substations.json',
  Idaho: 'grid/idaho-substations.json',
  Illinois: 'grid/illinois-substations.json',
  Indiana: 'grid/indiana-substations.json',
  Kansas: 'grid/kansas-substations.json',
  Louisiana: 'grid/louisiana-substations.json',
  Maine: 'grid/maine-substations.json',
};

const plantFileByState = {
    Maine: 'grid/maine-plants.json',
  Alaska: 'grid/alaska-plants.json',
  Alabama: 'grid/alabama-plants.json',
  Arkansas: 'grid/arkansas-plants.json',
  Arizona: 'grid/arizona-plants.json',
  California: 'grid/california-plants.json',
  Connecticut: 'grid/connecticut-plants.json',
  Colorado: 'grid/colorado-plants.json',
  Delaware: 'grid/delaware-plants.json',
  Florida: 'grid/florida-plants.json',
  Georgia: 'grid/georgia-plants.json',
  Hawaii: 'grid/hawaii-plants.json',
  Idaho: 'grid/idaho-plants.json',
  Illinois: 'grid/illinois-plants.json',
  Indiana: 'grid/indiana-plants.json',
  Kansas: 'grid/kansas-plants.json',
  Iowa: 'grid/iowa-plants.json',
  Kentucky: 'grid/kentucky-plants.json',
  Louisiana: 'grid/louisiana-plants.json',
};

const consumerFileByState = {
  Hawaii: 'grid/hawaii-consumers.json',
  Florida: 'grid/florida-consumers.json',
  Delaware: 'grid/delaware-consumers.json',
  Connecticut: 'grid/connecticut-consumers.json',
  Arizona: 'grid/arizona-consumers.json',
  Alaska: 'grid/alaska-consumers.json',
  Alabama: 'grid/alabama-consumers.json',
  California: 'grid/california-consumers.json',
  Maryland: 'grid/maryland-consumers.json',
  Idaho: 'grid/idaho-consumers.json',
  Illinois: 'grid/illinois-consumers.json',
  Indiana: 'grid/indiana-consumers.json',
  Kansas: 'grid/kansas-consumers.json',
  Kentucky: 'grid/kentucky-consumers.json',
  Louisiana: 'grid/louisiana-consumers.json',
  Maine: 'grid/maine-consumers.json',
};
const MAINE_ESTIMATE_DISCLAIMER_TEXT = 'County-level electricity consumption for Maine is estimated by population share. Actual consumption may differ.';

function showMaineDisclaimer(show) {
  if (!stateSummary) {
    return;
  }

  const summaryText = String(stateSummary.textContent || '');
  const strippedSummary = summaryText
    .replace(`\n${MAINE_ESTIMATE_DISCLAIMER_TEXT}`, '')
    .replace(MAINE_ESTIMATE_DISCLAIMER_TEXT, '')
    .trimEnd();

  stateSummary.textContent = show
    ? `${strippedSummary}\n${MAINE_ESTIMATE_DISCLAIMER_TEXT}`
    : strippedSummary;
}

const solarZipDensityFileByState = {
  California: 'grid/california-residential-solar-zip-density.json',
};

const ghostPowerFileByState = {
  Alabama: 'grid/alabama-ghost-power.json',
  Alaska: 'grid/alaska-ghost-power.json',
  Arizona: 'grid/arizona-ghost-power.json',
  Arkansas: 'grid/arkansas-ghost-power.json',
  California: 'grid/california-ghost-power.json',
  Colorado: 'grid/colorado-ghost-power.json',
  Connecticut: 'grid/connecticut-ghost-power.json',
  Delaware: 'grid/delaware-ghost-power.json',
  'District of Columbia': 'grid/district-of-columbia-ghost-power.json',
  Florida: 'grid/florida-ghost-power.json',
  Georgia: 'grid/georgia-ghost-power.json',
  Hawaii: 'grid/hawaii-ghost-power.json',
  Idaho: 'grid/idaho-ghost-power.json',
  Illinois: 'grid/illinois-ghost-power.json',
  Indiana: 'grid/indiana-ghost-power.json',
  Iowa: 'grid/iowa-ghost-power.json',
  Kansas: 'grid/kansas-ghost-power.json',
  Kentucky: 'grid/kentucky-ghost-power.json',
  Louisiana: 'grid/louisiana-ghost-power.json',
  Maine: 'grid/maine-ghost-power.json',
  Maryland: 'grid/maryland-ghost-power.json',
  Massachusetts: 'grid/massachusetts-ghost-power.json',
  Michigan: 'grid/michigan-ghost-power.json',
  Minnesota: 'grid/minnesota-ghost-power.json',
  Mississippi: 'grid/mississippi-ghost-power.json',
  Missouri: 'grid/missouri-ghost-power.json',
  Montana: 'grid/montana-ghost-power.json',
  Nebraska: 'grid/nebraska-ghost-power.json',
  Nevada: 'grid/nevada-ghost-power.json',
  'New Hampshire': 'grid/new-hampshire-ghost-power.json',
  'New Jersey': 'grid/new-jersey-ghost-power.json',
  'New Mexico': 'grid/new-mexico-ghost-power.json',
  'New York': 'grid/new-york-ghost-power.json',
  'North Carolina': 'grid/north-carolina-ghost-power.json',
  'North Dakota': 'grid/north-dakota-ghost-power.json',
  Ohio: 'grid/ohio-ghost-power.json',
  Oklahoma: 'grid/oklahoma-ghost-power.json',
  Oregon: 'grid/oregon-ghost-power.json',
  Pennsylvania: 'grid/pennsylvania-ghost-power.json',
  'Rhode Island': 'grid/rhode-island-ghost-power.json',
  'South Carolina': 'grid/south-carolina-ghost-power.json',
  'South Dakota': 'grid/south-dakota-ghost-power.json',
  Tennessee: 'grid/tennessee-ghost-power.json',
  Texas: 'grid/texas-ghost-power.json',
  Utah: 'grid/utah-ghost-power.json',
  Vermont: 'grid/vermont-ghost-power.json',
  Virginia: 'grid/virginia-ghost-power.json',
  Washington: 'grid/washington-ghost-power.json',
  'West Virginia': 'grid/west-virginia-ghost-power.json',
  Wisconsin: 'grid/wisconsin-ghost-power.json',
  Wyoming: 'grid/wyoming-ghost-power.json',
};

const OVERPASS_DEFAULT_ENDPOINT = 'https://overpass-api.de/api/interpreter';
const CALIFORNIA_OVERPASS_BBOX = '32.0,-125.0,42.3,-114.0';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatSourceDateTime(value) {
  if (!value) return 'Unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toISOString().replace('.000', '');
}

function buildOverpassInterpreterLink(query, endpoint = OVERPASS_DEFAULT_ENDPOINT) {
  return `${endpoint}?data=${encodeURIComponent(query)}`;
}

function buildOverpassPowerFeatureQuery(powerValue, bbox = CALIFORNIA_OVERPASS_BBOX) {
  return `[out:json][timeout:180];(node["power"="${powerValue}"](${bbox});way["power"="${powerValue}"](${bbox});relation["power"="${powerValue}"](${bbox}););out center;`;
}

function buildOverpassTransmissionQuery(powerClass, bbox = CALIFORNIA_OVERPASS_BBOX) {
  return `[out:json][timeout:180];(way["power"="${powerClass}"](${bbox}););out geom;`;
}

const transmissionDataCache = new Map();
const substationDataCache = new Map();
const plantDataCache = new Map();
const consumerDataCache = new Map();
const solarZipDensityDataCache = new Map();
const ghostPowerDataCache = new Map();
const stateGlobalTotalsCache = new Map();
const stateGlobalTotalsFilePath = 'grid/state-global-totals.json';

let outlineVertexCount = 0;
let transmissionLineVertexCount = 0;
let transmissionMinorLineVertexCount = 0;
let transmissionCableVertexCount = 0;
let solarDensityVertexCount = 0;
let generationHeatmapVertexCount = 0;
let generationHeatmapCellCount = 0;
let substationVertexCount = 0;
let consumerVertexCount = 0;
let plantVertexCount = 0;
let ghostPowerVertexCount = 0;
let haloVertexCount = 0;
let highlightVertexCount = 0;
let stateMap = new Map();
let selectedStateName = 'Maryland';
let dataLayerMode = 'infrastructure';
let generationSubtypeMode = 'all';
let currentProjection = null;
let renderFramePending = false;
let substationNodes = [];
let consumerNodes = [];
let plantNodes = [];
let ghostPowerNodes = [];
let solarDensityCells = [];
let generationHeatmapCells = [];
let interactiveNodes = [];
let hoveredNode = null;
let pinnedNode = null;
let hoveredDensityCell = null;
let pinnedDensityCell = null;
let hoveredGenerationHeatmapCell = null;
let pinnedGenerationHeatmapCell = null;
let legendHoverSource = null;
let hiddenLegendSources = new Set();
let hoverCircleCenter = null;
let nodesInHoverCircle = [];
let hoverCircleTotalOutputMW = 0;
let hoverCircleRadius = 0.28;
let isRadiusFrozen = false;
let transmissionRadiusRecords = [];
let currentSubstationSource = null;
let currentTransmissionSource = null;
let currentConsumerSource = null;
let currentGhostProjectSource = null;
let currentPlantSource = null;
let currentSolarDensitySource = null;
let currentStateTotals = null;
let consumerSparkleSeeds = [];
let generatedLandmarksByState = {};
let generatedLandmarksLoadPromise = null;

async function ensureGeneratedLandmarksLoaded() {
  if (generatedLandmarksLoadPromise) {
    return generatedLandmarksLoadPromise;
  }

  generatedLandmarksLoadPromise = (async () => {
    try {
      const response = await fetch('grid/us-landmarks-generated.json');
      if (!response.ok) {
        return;
      }
      const data = await response.json();
      generatedLandmarksByState = data?.states || {};
    } catch (err) {
      console.warn(`Generated landmarks unavailable: ${err.message}`);
    }
  })();

  return generatedLandmarksLoadPromise;
}

const LANDMARKS_BY_STATE = {
      Kansas: [
      ],
      Maine: [
        { name: 'Portland', lat: 43.6591, lon: -70.2568 },
        { name: 'Lewiston', lat: 44.1004, lon: -70.2148 },
        { name: 'Bangor', lat: 44.8012, lon: -68.7778 },
        { name: 'South Portland', lat: 43.6415, lon: -70.2409 },
        { name: 'Auburn', lat: 44.0979, lon: -70.2312 },
        { name: 'Biddeford', lat: 43.4926, lon: -70.4534 },
        { name: 'Sanford', lat: 43.4393, lon: -70.7743 },
        { name: 'Saco', lat: 43.5009, lon: -70.4428 },
        { name: 'Westbrook', lat: 43.6776, lon: -70.3712 },
        { name: 'Augusta', lat: 44.3106, lon: -69.7795 },
        { name: 'Scarborough', lat: 43.5787, lon: -70.3212 },
        { name: 'Brunswick', lat: 43.9145, lon: -69.9653 },
        { name: 'Windham', lat: 43.7970, lon: -70.3864 },
        { name: 'Gorham', lat: 43.6812, lon: -70.4442 },
        { name: 'Waterville', lat: 44.5520, lon: -69.6317 },
        { name: 'York', lat: 43.1617, lon: -70.6465 },
        { name: 'Falmouth', lat: 43.7215, lon: -70.2412 },
        { name: 'Kennebunk', lat: 43.3834, lon: -70.5406 },
        { name: 'Orono', lat: 44.8834, lon: -68.6725 },
        { name: 'Old Orchard Beach', lat: 43.5170, lon: -70.3776 },

        { name: 'Wichita', lat: 37.6872, lon: -97.3301 },
        { name: 'Overland Park', lat: 38.9822, lon: -94.6708 },
        { name: 'Kansas City', lat: 39.1142, lon: -94.6275 },
        { name: 'Olathe', lat: 38.8814, lon: -94.8191 },
        { name: 'Topeka', lat: 39.0473, lon: -95.6752 },
        { name: 'Lawrence', lat: 38.9717, lon: -95.2353 },
        { name: 'Shawnee', lat: 39.0228, lon: -94.7156 },
        { name: 'Manhattan', lat: 39.1836, lon: -96.5717 },
        { name: 'Lenexa', lat: 38.9536, lon: -94.7336 },
        { name: 'Salina', lat: 38.8403, lon: -97.6114 },
        { name: 'Hutchinson', lat: 38.0608, lon: -97.9298 },
        { name: 'Leavenworth', lat: 39.3111, lon: -94.9225 },
        { name: 'Leawood', lat: 38.9667, lon: -94.6169 },
        { name: 'Dodge City', lat: 37.7528, lon: -100.0171 },
        { name: 'Garden City', lat: 37.9717, lon: -100.8727 },
        { name: 'Emporia', lat: 38.4048, lon: -96.1817 },
        { name: 'Derby', lat: 37.5520, lon: -97.2681 },
        { name: 'Prairie Village', lat: 38.9917, lon: -94.6336 },
        { name: 'Hays', lat: 38.8792, lon: -99.3268 },
        { name: 'Pittsburg', lat: 37.4109, lon: -94.7049 },
        { name: 'Liberal', lat: 37.0431, lon: -100.9210 },
        { name: 'Gardner', lat: 38.8120, lon: -94.9275 },
        { name: 'Great Bend', lat: 38.3645, lon: -98.7648 },
        { name: 'McPherson', lat: 38.3708, lon: -97.6642 },
        { name: 'El Dorado', lat: 37.8172, lon: -96.8625 },
        { name: 'Ottawa', lat: 38.6156, lon: -95.2681 },
        { name: 'Andover', lat: 37.7139, lon: -97.1373 },
        { name: 'Winfield', lat: 37.2397, lon: -96.9956 },
        { name: 'Arkansas City', lat: 37.0656, lon: -97.0386 },
        { name: 'Parsons', lat: 37.3406, lon: -95.2622 },
        { name: 'Merriam', lat: 39.0239, lon: -94.6936 },
        { name: 'Atchison', lat: 39.5639, lon: -95.1219 },
        { name: 'Chanute', lat: 37.6792, lon: -95.4572 },
        { name: 'Tonganoxie', lat: 39.1092, lon: -95.0872 },
        { name: 'Bonner Springs', lat: 39.0597, lon: -94.8836 },
        { name: 'Ulysses', lat: 37.5828, lon: -101.3557 },
        { name: 'Concordia', lat: 39.5706, lon: -97.6625 },
        { name: 'Fort Scott', lat: 37.8397, lon: -94.7081 },
        { name: 'Independence', lat: 37.2228, lon: -95.7081 },
        { name: 'Clay Center', lat: 39.3792, lon: -97.1231 },
        { name: 'Baldwin City', lat: 38.7767, lon: -95.1872 },
        { name: 'Colby', lat: 39.3958, lon: -101.0529 },
        { name: 'Hiawatha', lat: 39.8528, lon: -95.5358 },
        { name: 'Wellington', lat: 37.2656, lon: -97.3711 },
        { name: 'Hillsboro', lat: 38.3517, lon: -97.2042 },
        { name: 'Beloit', lat: 39.4650, lon: -98.1061 },
        { name: 'Marysville', lat: 39.8417, lon: -96.6472 },
        { name: 'Osawatomie', lat: 38.4972, lon: -94.9508 },
        { name: 'Wamego', lat: 39.2017, lon: -96.3069 },
        { name: 'Abilene', lat: 38.9172, lon: -97.2131 },
        { name: 'Larned', lat: 38.1806, lon: -99.0981 },
        { name: 'Russell', lat: 38.8858, lon: -98.8572 },
        { name: 'Holton', lat: 39.4650, lon: -95.7361 },
        { name: 'Kingman', lat: 37.6472, lon: -98.1131 },
        { name: 'Phillipsburg', lat: 39.7558, lon: -99.3222 },
        { name: 'Ellsworth', lat: 38.7317, lon: -98.2281 },
        { name: 'Minneapolis', lat: 39.1242, lon: -97.7058 },
        { name: 'Yates Center', lat: 37.8817, lon: -95.7342 },
        { name: 'Osage City', lat: 38.6342, lon: -95.8258 },
        { name: 'Hoxie', lat: 39.3542, lon: -100.4397 },
        { name: 'Norton', lat: 39.8328, lon: -99.8872 },
        { name: 'Meade', lat: 37.2858, lon: -100.3408 },
        { name: 'St. Marys', lat: 39.1981, lon: -96.0717 },
        { name: 'Goodland', lat: 39.3508, lon: -101.7108 },
        { name: 'Cimarron', lat: 37.8081, lon: -100.3481 },
        { name: 'Herington', lat: 38.6772, lon: -96.9422 },
        { name: 'Scott City', lat: 38.4828, lon: -100.9072 },
        { name: 'Sublette', lat: 37.4792, lon: -100.8458 },
        { name: 'Sabetha', lat: 39.9028, lon: -95.8008 },
        { name: 'Hoisington', lat: 38.5181, lon: -98.7808 },
        { name: 'Ellinwood', lat: 38.3567, lon: -98.5808 },
        { name: 'Fredonia', lat: 37.5331, lon: -95.8261 },
        { name: 'Sterling', lat: 38.2172, lon: -98.2072 },
        { name: 'Council Grove', lat: 38.6617, lon: -96.4917 },
        { name: 'Horton', lat: 39.6608, lon: -95.5261 },
        { name: 'Wakeeney', lat: 39.0242, lon: -99.8811 },
        { name: 'Anthony', lat: 37.1531, lon: -98.0292 },
        { name: 'Erie', lat: 37.5681, lon: -95.2422 },
        { name: 'Oberlin', lat: 39.8181, lon: -100.5281 },
        { name: 'Hugoton', lat: 37.1758, lon: -101.3497 },
        { name: 'Medicine Lodge', lat: 37.2831, lon: -98.5808 },
        { name: 'Syracuse', lat: 37.9858, lon: -101.7531 },
        { name: 'Satanta', lat: 37.4372, lon: -100.9972 },
        { name: 'La Crosse', lat: 38.5328, lon: -99.3081 },
        { name: 'Belleville', lat: 39.8231, lon: -97.6308 },
        { name: 'Onaga', lat: 39.4892, lon: -96.1681 },
        { name: 'Plainville', lat: 39.2328, lon: -99.2981 },
        { name: 'St. Francis', lat: 39.7742, lon: -101.8022 },
        { name: 'Mankato', lat: 39.7872, lon: -98.2092 },
        { name: 'Oskaloosa', lat: 39.2158, lon: -95.3131 },
        { name: 'Blue Rapids', lat: 39.6842, lon: -96.6572 },
        { name: 'Chetopa', lat: 37.0381, lon: -94.7142 },
        { name: 'Alma', lat: 39.0108, lon: -96.2917 },
        { name: 'Wilson', lat: 38.8258, lon: -98.4742 },
        { name: 'Lincoln', lat: 39.0408, lon: -98.1461 },
        { name: 'Caldwell', lat: 37.0331, lon: -97.6061 },
        { name: 'Oswego', lat: 37.1672, lon: -95.1092 },
        { name: 'Hoxie', lat: 39.3542, lon: -100.4397 },
        { name: 'Haviland', lat: 37.6167, lon: -99.1061 },
        { name: 'Mound City', lat: 38.1422, lon: -94.8142 },
        { name: 'Yates Center', lat: 37.8817, lon: -95.7342 },
        { name: 'Leon', lat: 37.6858, lon: -96.8011 },
        { name: 'Cimarron', lat: 37.8081, lon: -100.3481 },
        { name: 'Herington', lat: 38.6772, lon: -96.9422 },
        { name: 'Scott City', lat: 38.4828, lon: -100.9072 },
        { name: 'Sublette', lat: 37.4792, lon: -100.8458 },
        { name: 'Sabetha', lat: 39.9028, lon: -95.8008 },
        { name: 'Hoisington', lat: 38.5181, lon: -98.7808 },
        { name: 'Ellinwood', lat: 38.3567, lon: -98.5808 },
        { name: 'Fredonia', lat: 37.5331, lon: -95.8261 },
        { name: 'Sterling', lat: 38.2172, lon: -98.2072 },
        { name: 'Council Grove', lat: 38.6617, lon: -96.4917 },
        { name: 'Horton', lat: 39.6608, lon: -95.5261 },
        { name: 'Wakeeney', lat: 39.0242, lon: -99.8811 },
        { name: 'Anthony', lat: 37.1531, lon: -98.0292 },
        { name: 'Erie', lat: 37.5681, lon: -95.2422 },
        { name: 'Oberlin', lat: 39.8181, lon: -100.5281 },
        { name: 'Hugoton', lat: 37.1758, lon: -101.3497 },
        { name: 'Medicine Lodge', lat: 37.2831, lon: -98.5808 },
        { name: 'Syracuse', lat: 37.9858, lon: -101.7531 },
        { name: 'Satanta', lat: 37.4372, lon: -100.9972 },
        { name: 'La Crosse', lat: 38.5328, lon: -99.3081 },
        { name: 'Belleville', lat: 39.8231, lon: -97.6308 },
        { name: 'Onaga', lat: 39.4892, lon: -96.1681 },
        { name: 'Plainville', lat: 39.2328, lon: -99.2981 },
        { name: 'St. Francis', lat: 39.7742, lon: -101.8022 },
        { name: 'Mankato', lat: 39.7872, lon: -98.2092 },
        { name: 'Oskaloosa', lat: 39.2158, lon: -95.3131 },
        { name: 'Blue Rapids', lat: 39.6842, lon: -96.6572 },
        { name: 'Chetopa', lat: 37.0381, lon: -94.7142 },
        { name: 'Alma', lat: 39.0108, lon: -96.2917 },
        { name: 'Wilson', lat: 38.8258, lon: -98.4742 },
        { name: 'Lincoln', lat: 39.0408, lon: -98.1461 },
        { name: 'Caldwell', lat: 37.0331, lon: -97.6061 },
        { name: 'Oswego', lat: 37.1672, lon: -95.1092 },
        ],
        Kentucky: [
                ],
    Louisiana: [
      { name: 'New Orleans', lat: 29.9511, lon: -90.0715 },
      { name: 'Baton Rouge', lat: 30.4515, lon: -91.1871 },
      { name: 'Shreveport', lat: 32.5252, lon: -93.7502 },
      { name: 'Lafayette', lat: 30.2241, lon: -92.0198 },
      { name: 'Lake Charles', lat: 30.2266, lon: -93.2174 },
      { name: 'Kenner', lat: 29.9941, lon: -90.2417 },
      { name: 'Bossier City', lat: 32.5150, lon: -93.7321 },
      { name: 'Monroe', lat: 32.5093, lon: -92.1193 },
      { name: 'Alexandria', lat: 31.3113, lon: -92.4451 },
      { name: 'Houma', lat: 29.5958, lon: -90.7195 },
      { name: 'Central', lat: 30.5535, lon: -91.0368 },
      { name: 'Slidell', lat: 30.2752, lon: -89.7812 },
      { name: 'Ruston', lat: 32.5232, lon: -92.6379 },
      { name: 'Sulphur', lat: 30.2366, lon: -93.3774 },
      { name: 'Hammond', lat: 30.5044, lon: -90.4612 },
      { name: 'Gretna', lat: 29.9154, lon: -90.0534 },
      { name: 'Natchitoches', lat: 31.7607, lon: -93.0863 },
      { name: 'Zachary', lat: 30.6486, lon: -91.1568 },
      { name: 'Morgan City', lat: 29.6994, lon: -91.2068 },
      { name: 'Opelousas', lat: 30.5335, lon: -92.0818 }
    ],
    Indiana: [
      { name: 'Indianapolis', lat: 39.7684, lon: -86.1581 },
      { name: 'Fort Wayne', lat: 41.0793, lon: -85.1394 },
      { name: 'Evansville', lat: 37.9716, lon: -87.5711 },
      { name: 'South Bend', lat: 41.6764, lon: -86.2520 },
      { name: 'Carmel', lat: 39.9784, lon: -86.1180 },
      { name: 'Bloomington', lat: 39.1653, lon: -86.5264 },
      { name: 'Hammond', lat: 41.5834, lon: -87.5000 },
      { name: 'Gary', lat: 41.6021, lon: -87.3371 },
      { name: 'Lafayette', lat: 40.4167, lon: -86.8753 },
      { name: 'Muncie', lat: 40.1934, lon: -85.3864 },
      { name: 'Terre Haute', lat: 39.4667, lon: -87.4139 },
      { name: 'Noblesville', lat: 40.0456, lon: -86.0086 },
      { name: 'Kokomo', lat: 40.4864, lon: -86.1336 },
      { name: 'Anderson', lat: 40.1053, lon: -85.6803 },
      { name: 'Fishers', lat: 39.9568, lon: -86.0139 },
      { name: 'Elkhart', lat: 41.6810, lon: -85.9767 },
      { name: 'Greenwood', lat: 39.6137, lon: -86.1067 },
      { name: 'Mishawaka', lat: 41.6610, lon: -86.1586 },
      { name: 'Lawrence', lat: 39.8387, lon: -86.0253 },
      { name: 'Jeffersonville', lat: 38.2776, lon: -85.7372 },
      { name: 'Columbus', lat: 39.2014, lon: -85.9214 },
      { name: 'Westfield', lat: 40.0428, lon: -86.1270 },
      { name: 'Portage', lat: 41.5759, lon: -87.1761 },
      { name: 'New Albany', lat: 38.2856, lon: -85.8241 },
      { name: 'Richmond', lat: 39.8289, lon: -84.8902 },
      { name: 'Plainfield', lat: 39.7042, lon: -86.3994 },
    ],
    Iowa: [
      { name: 'Des Moines', lat: 41.5868, lon: -93.6250 },
      { name: 'Cedar Rapids', lat: 41.9779, lon: -91.6656 },
      { name: 'Davenport', lat: 41.5236, lon: -90.5776 },
      { name: 'Sioux City', lat: 42.4963, lon: -96.4049 },
      { name: 'Iowa City', lat: 41.6611, lon: -91.5302 },
      { name: 'Waterloo', lat: 42.4928, lon: -92.3426 },
      { name: 'Ames', lat: 42.0308, lon: -93.6319 },
      { name: 'West Des Moines', lat: 41.5772, lon: -93.7115 },
      { name: 'Ankeny', lat: 41.7318, lon: -93.6001 },
      { name: 'Council Bluffs', lat: 41.2619, lon: -95.8608 },
      { name: 'Paoli', lat: 38.5567, lon: -86.4700 },
      { name: 'Versailles', lat: 39.0670, lon: -85.2517 },
      { name: 'Rockville', lat: 39.7620, lon: -87.2297 },
      { name: 'Montpelier', lat: 40.5531, lon: -85.2772 },
      { name: 'Whiting', lat: 41.6792, lon: -87.4947 },
      { name: 'Boonville', lat: 38.0495, lon: -87.2747 },
      { name: 'Chesterfield', lat: 40.1106, lon: -85.5961 },
      { name: 'Edgewood', lat: 40.1070, lon: -85.7400 },
      { name: 'Walkerton', lat: 41.4667, lon: -86.4833 },
      { name: 'New Whiteland', lat: 39.5556, lon: -86.0886 },
      { name: 'Lapel', lat: 40.0681, lon: -85.8467 },
      { name: 'Culver', lat: 41.2181, lon: -86.4231 },
      { name: 'Churubusco', lat: 41.2303, lon: -85.3197 },
      { name: 'Winona Lake', lat: 41.2281, lon: -85.8197 },
      { name: 'Loogootee', lat: 38.6770, lon: -86.9147 },
      { name: 'North Manchester', lat: 41.0031, lon: -85.7700 },
      { name: 'Bargersville', lat: 39.5206, lon: -86.1672 },
      { name: 'Plymouth', lat: 41.3436, lon: -86.3097 },
      { name: 'Union City', lat: 40.1970, lon: -84.8031 },
      { name: 'Greendale', lat: 39.1292, lon: -84.8767 },
      { name: 'Tell City', lat: 37.9514, lon: -86.7672 },
      { name: 'Berne', lat: 40.6570, lon: -84.9517 },
      { name: 'Jasonville', lat: 39.1631, lon: -87.1997 },
      { name: 'Ligonier', lat: 41.4650, lon: -85.5872 },
      { name: 'Aurora', lat: 39.0570, lon: -84.9017 },
      { name: 'Syracuse', lat: 41.4270, lon: -85.7522 },
      { name: 'North Judson', lat: 41.2167, lon: -86.7750 },
      { name: 'Cannelton', lat: 37.9106, lon: -86.7417 },
      { name: 'Bicknell', lat: 38.7745, lon: -87.3072 },
      { name: 'Mitchell', lat: 38.7320, lon: -86.4731 },
      { name: 'Ossian', lat: 40.8800, lon: -85.1667 },
      { name: 'Clinton', lat: 39.6531, lon: -87.3981 },
      { name: 'Lynn', lat: 40.0470, lon: -84.9417 },
      { name: 'Brookston', lat: 40.6017, lon: -86.8672 },
      { name: 'Crawfordsville', lat: 40.0417, lon: -86.8747 },
      { name: 'Delphi', lat: 40.5870, lon: -86.6750 },
      { name: 'Rockport', lat: 37.8831, lon: -87.0497 },
    ],
  Connecticut: [
    { name: 'Bridgeport',       lat: 41.1865, lon: -73.1952 },
    { name: 'New Haven',        lat: 41.3083, lon: -72.9279 },
    { name: 'Hartford',         lat: 41.7658, lon: -72.6734 },
    { name: 'Stamford',         lat: 41.0534, lon: -73.5387 },
    { name: 'Waterbury',        lat: 41.5582, lon: -73.0515 },
    { name: 'Norwalk',          lat: 41.1177, lon: -73.4082 },
    { name: 'Danbury',          lat: 41.3948, lon: -73.4540 },
    { name: 'New Britain',      lat: 41.6612, lon: -72.7795 },
    { name: 'Bristol',          lat: 41.6718, lon: -72.9493 },
    { name: 'Meriden',          lat: 41.5382, lon: -72.8070 },
    { name: 'Middletown',       lat: 41.5623, lon: -72.6506 },
    { name: 'Groton',           lat: 41.3501, lon: -72.0784 },
    { name: 'New London',       lat: 41.3557, lon: -72.0995 },
    { name: 'Norwich',          lat: 41.5243, lon: -72.0759 },
  ],
  Illinois: [
    { name: 'Chicago', lat: 41.8781, lon: -87.6298 },
    { name: 'Aurora', lat: 41.7606, lon: -88.3201 },
    { name: 'Naperville', lat: 41.7508, lon: -88.1535 },
    { name: 'Joliet', lat: 41.5250, lon: -88.0817 },
    { name: 'Rockford', lat: 42.2711, lon: -89.0937 },
        { name: 'Springfield', lat: 39.7817, lon: -89.6501 },
        { name: 'Peoria', lat: 40.6936, lon: -89.5890 },
        { name: 'Elgin', lat: 42.0354, lon: -88.2826 },
        { name: 'Waukegan', lat: 42.3636, lon: -87.8448 },
        { name: 'Champaign', lat: 40.1164, lon: -88.2434 },
        { name: 'Bloomington', lat: 40.4842, lon: -88.9937 },
        { name: 'Decatur', lat: 39.8403, lon: -88.9548 },
        { name: 'Evanston', lat: 42.0451, lon: -87.6877 },
        { name: 'Schaumburg', lat: 42.0334, lon: -88.0834 },
        { name: 'Cicero', lat: 41.8456, lon: -87.7539 },
        { name: 'Arlington Heights', lat: 42.0884, lon: -87.9806 },
        { name: 'Bolingbrook', lat: 41.6986, lon: -88.0684 },
        { name: 'Palatine', lat: 42.1103, lon: -88.0342 },
        { name: 'Skokie', lat: 42.0334, lon: -87.7334 },
        { name: 'Des Plaines', lat: 42.0334, lon: -87.8834 },
        { name: 'Orland Park', lat: 41.6303, lon: -87.8539 },
        { name: 'Tinley Park', lat: 41.5734, lon: -87.7845 },
        { name: 'Oak Lawn', lat: 41.7109, lon: -87.7581 },
        { name: 'Berwyn', lat: 41.8506, lon: -87.7937 },
        { name: 'Mount Prospect', lat: 42.0664, lon: -87.9373 },
        { name: 'Wheaton', lat: 41.8661, lon: -88.1070 },
        { name: 'Normal', lat: 40.5142, lon: -88.9906 },
        { name: 'Hoffman Estates', lat: 42.0428, lon: -88.0798 },
        { name: 'Downers Grove', lat: 41.8089, lon: -88.0112 },
        { name: 'Moline', lat: 41.5067, lon: -90.5151 },
        { name: 'Glenview', lat: 42.0723, lon: -87.8376 },
        { name: 'Belleville', lat: 38.5201, lon: -89.9839 },
        { name: 'Elmhurst', lat: 41.8995, lon: -87.9403 },
        { name: 'DeKalb', lat: 41.9295, lon: -88.7504 },
        { name: 'Quincy', lat: 39.9356, lon: -91.4099 },
        { name: 'Rock Island', lat: 41.5095, lon: -90.5787 },
        { name: 'Park Ridge', lat: 42.0111, lon: -87.8406 },
        { name: 'Carbondale', lat: 37.7273, lon: -89.2168 },
        { name: 'Edwardsville', lat: 38.8114, lon: -89.9532 },
        { name: 'Kankakee', lat: 41.1200, lon: -87.8611 },
        { name: 'Freeport', lat: 42.2967, lon: -89.6212 },
        { name: 'Danville', lat: 40.1245, lon: -87.6300 },
        { name: 'Galesburg', lat: 40.9478, lon: -90.3712 },
        { name: 'East St. Louis', lat: 38.6245, lon: -90.1501 },
        { name: 'Alton', lat: 38.8906, lon: -90.1843 },
        { name: 'Mattoon', lat: 39.4831, lon: -88.3728 },
        { name: 'Sterling', lat: 41.7886, lon: -89.6962 },
        { name: 'Ottawa', lat: 41.3456, lon: -88.8426 },
        { name: 'West Chicago', lat: 41.8848, lon: -88.2034 },
        { name: 'Woodstock', lat: 42.3147, lon: -88.4487 },
        { name: 'Batavia', lat: 41.8500, lon: -88.3126 },
        { name: 'Collinsville', lat: 38.6709, lon: -89.9840 },
        { name: 'Granite City', lat: 38.7012, lon: -90.1484 },
        { name: "O'Fallon", lat: 38.5923, lon: -89.9112 },
        { name: 'Mundelein', lat: 42.2631, lon: -88.0042 },
        { name: 'Wilmette', lat: 42.0723, lon: -87.7228 },
        { name: 'Lombard', lat: 41.8800, lon: -88.0078 },
        { name: 'Crystal Lake', lat: 42.2411, lon: -88.3162 },
        { name: 'Urbana', lat: 40.1106, lon: -88.2073 },
        { name: 'Hanover Park', lat: 41.9995, lon: -88.1451 },
        { name: 'Addison', lat: 41.9317, lon: -88.0064 },
        { name: 'East Peoria', lat: 40.6664, lon: -89.5801 },
        { name: 'North Chicago', lat: 42.3256, lon: -87.8412 },
        { name: 'Burbank', lat: 41.7462, lon: -87.7701 },
        { name: 'Calumet City', lat: 41.6156, lon: -87.5295 },
        { name: 'St. Charles', lat: 41.9142, lon: -88.3087 },
        { name: 'Chicago Heights', lat: 41.5062, lon: -87.6356 },
        { name: 'Harvey', lat: 41.6106, lon: -87.6536 },
        { name: 'Melrose Park', lat: 41.9000, lon: -87.8567 },
        { name: 'Lockport', lat: 41.5898, lon: -88.0578 },
        { name: 'Morris', lat: 41.3570, lon: -88.4212 },
        { name: 'Sycamore', lat: 41.9889, lon: -88.6862 },
        { name: 'Yorkville', lat: 41.6412, lon: -88.4473 },
        { name: 'Highland Park', lat: 42.1817, lon: -87.8003 },
        { name: 'La Grange', lat: 41.8050, lon: -87.8692 },
        { name: 'Morton Grove', lat: 42.0406, lon: -87.7828 },
        { name: 'Winnetka', lat: 42.1081, lon: -87.7359 },
        { name: 'Glen Ellyn', lat: 41.8770, lon: -88.0630 },
        { name: 'Darien', lat: 41.7514, lon: -87.9731 },
        { name: 'Hinsdale', lat: 41.8009, lon: -87.9370 },
        { name: 'Vernon Hills', lat: 42.2195, lon: -87.9795 },
        { name: 'Buffalo Grove', lat: 42.1663, lon: -87.9631 },
        { name: 'Carol Stream', lat: 41.9125, lon: -88.1348 },
        { name: 'Palos Hills', lat: 41.6967, lon: -87.8192 },
        { name: 'Roselle', lat: 41.9845, lon: -88.0798 },
        { name: 'Villa Park', lat: 41.8897, lon: -87.9889 },
        { name: 'Westmont', lat: 41.7950, lon: -87.9756 },
        { name: 'Lansing', lat: 41.5645, lon: -87.5389 },
        { name: 'Rolling Meadows', lat: 42.0842, lon: -88.0131 },
        { name: 'Huntley', lat: 42.1681, lon: -88.4281 },
        { name: 'South Elgin', lat: 41.9942, lon: -88.2923 },
        { name: 'Bartlett', lat: 41.9950, lon: -88.1856 },
        { name: 'Woodridge', lat: 41.7464, lon: -88.0503 },
        { name: 'Niles', lat: 42.0181, lon: -87.8028 },
        { name: 'Prospect Heights', lat: 42.0950, lon: -87.9373 },
        { name: 'Broadview', lat: 41.8600, lon: -87.8578 },
        { name: 'Justice', lat: 41.7492, lon: -87.8367 },
        { name: 'Summit', lat: 41.7886, lon: -87.8106 },
        { name: 'Maywood', lat: 41.8792, lon: -87.8439 },
        { name: 'River Forest', lat: 41.8970, lon: -87.8131 },
        { name: 'Riverside', lat: 41.8350, lon: -87.8228 },
        { name: 'Northbrook', lat: 42.1275, lon: -87.8289 },
        { name: 'Frankfort', lat: 41.4959, lon: -87.8487 },
        { name: 'Mokena', lat: 41.5361, lon: -87.8895 },
        { name: 'New Lenox', lat: 41.5111, lon: -87.9656 },
        { name: 'Plainfield', lat: 41.6261, lon: -88.2037 },
        { name: 'Crest Hill', lat: 41.5542, lon: -88.1195 },
        { name: 'Lockport', lat: 41.5898, lon: -88.0578 },
        { name: 'East Moline', lat: 41.5000, lon: -90.4443 },
        { name: 'Pekin', lat: 40.5675, lon: -89.6401 },
        { name: 'Belvidere', lat: 42.2639, lon: -88.8443 },
        { name: 'McHenry', lat: 42.3334, lon: -88.2668 },
        { name: 'Lake in the Hills', lat: 42.1856, lon: -88.3306 },
        { name: 'Algonquin', lat: 42.1656, lon: -88.2945 },
        { name: 'Crystal Lake', lat: 42.2411, lon: -88.3162 },
        { name: 'Round Lake Beach', lat: 42.3717, lon: -88.0906 },
        { name: 'Grayslake', lat: 42.3445, lon: -88.0342 },
        { name: 'Zion', lat: 42.4461, lon: -87.8328 },
        { name: 'Waukegan', lat: 42.3636, lon: -87.8448 },
        { name: 'Mundelein', lat: 42.2631, lon: -88.0042 },
        { name: 'Gurnee', lat: 42.3703, lon: -87.9028 },
        { name: 'Libertyville', lat: 42.2831, lon: -87.9531 },
        { name: 'Lake Zurich', lat: 42.1967, lon: -88.0934 },
        { name: 'Vernon Hills', lat: 42.2195, lon: -87.9795 },
        { name: 'Buffalo Grove', lat: 42.1663, lon: -87.9631 },
        { name: 'Wheeling', lat: 42.1392, lon: -87.9281 },
        { name: 'Palatine', lat: 42.1103, lon: -88.0342 },
        { name: 'Schaumburg', lat: 42.0334, lon: -88.0834 },
        { name: 'Des Plaines', lat: 42.0334, lon: -87.8834 },
        { name: 'Mount Prospect', lat: 42.0664, lon: -87.9373 },
        { name: 'Arlington Heights', lat: 42.0884, lon: -87.9806 },
        { name: 'Evanston', lat: 42.0451, lon: -87.6877 },
        { name: 'Skokie', lat: 42.0334, lon: -87.7334 },
        { name: 'Wilmette', lat: 42.0723, lon: -87.7228 },
        { name: 'Oak Park', lat: 41.8850, lon: -87.7845 },
        { name: 'Cicero', lat: 41.8456, lon: -87.7539 },
        { name: 'Berwyn', lat: 41.8506, lon: -87.7937 },
        { name: 'Oak Lawn', lat: 41.7109, lon: -87.7581 },
        { name: 'Burbank', lat: 41.7462, lon: -87.7701 },
        { name: 'Orland Park', lat: 41.6303, lon: -87.8539 },
        { name: 'Tinley Park', lat: 41.5734, lon: -87.7845 },
        { name: 'Palos Hills', lat: 41.6967, lon: -87.8192 },
        { name: 'Calumet City', lat: 41.6156, lon: -87.5295 },
        { name: 'Chicago Heights', lat: 41.5062, lon: -87.6356 },
        { name: 'Harvey', lat: 41.6106, lon: -87.6536 },
        { name: 'Blue Island', lat: 41.6570, lon: -87.6806 },
        { name: 'Evergreen Park', lat: 41.7200, lon: -87.7012 },
        { name: 'Dolton', lat: 41.6389, lon: -87.6078 },
        { name: 'Alsip', lat: 41.6686, lon: -87.7381 },
        { name: 'Hickory Hills', lat: 41.7225, lon: -87.8256 },
        { name: 'Bridgeview', lat: 41.7500, lon: -87.8045 },
        { name: 'Justice', lat: 41.7492, lon: -87.8367 },
        { name: 'Summit', lat: 41.7886, lon: -87.8106 },
        { name: 'Maywood', lat: 41.8792, lon: -87.8439 },
        { name: 'Bellwood', lat: 41.8811, lon: -87.8728 },
        { name: 'Melrose Park', lat: 41.9000, lon: -87.8567 },
        { name: 'Elmwood Park', lat: 41.9214, lon: -87.8131 },
        { name: 'River Grove', lat: 41.9250, lon: -87.8392 },
        { name: 'Franklin Park', lat: 41.9342, lon: -87.8678 },
        { name: 'Northlake', lat: 41.9170, lon: -87.9012 },
        { name: 'Schiller Park', lat: 41.9550, lon: -87.8701 },
        { name: 'Park Ridge', lat: 42.0111, lon: -87.8406 },
        { name: 'Des Plaines', lat: 42.0334, lon: -87.8834 },
        { name: 'Niles', lat: 42.0181, lon: -87.8028 },
        { name: 'Morton Grove', lat: 42.0406, lon: -87.7828 },
        { name: 'Skokie', lat: 42.0334, lon: -87.7334 },
        { name: 'Wilmette', lat: 42.0723, lon: -87.7228 },
        { name: 'Evanston', lat: 42.0451, lon: -87.6877 },
        { name: 'Chicago', lat: 41.8781, lon: -87.6298 }
      ],
  Connecticut: [
    { name: 'Bridgeport',       lat: 41.1865, lon: -73.1952 },
    { name: 'New Haven',        lat: 41.3083, lon: -72.9279 },
    { name: 'Hartford',         lat: 41.7658, lon: -72.6734 },
    { name: 'Stamford',         lat: 41.0534, lon: -73.5387 },
    { name: 'Waterbury',        lat: 41.5582, lon: -73.0515 },
    { name: 'Norwalk',          lat: 41.1177, lon: -73.4082 },
    { name: 'Danbury',          lat: 41.3948, lon: -73.4540 },
    { name: 'New Britain',      lat: 41.6612, lon: -72.7795 },
    { name: 'Bristol',          lat: 41.6718, lon: -72.9493 },
    { name: 'Meriden',          lat: 41.5382, lon: -72.8070 },
    { name: 'Middletown',       lat: 41.5623, lon: -72.6506 },
    { name: 'Groton',           lat: 41.3501, lon: -72.0784 },
    { name: 'New London',       lat: 41.3557, lon: -72.0995 },
    { name: 'Norwich',          lat: 41.5243, lon: -72.0759 },
  ],
  Colorado: [
    { name: 'Denver',            lat: 39.7392, lon: -104.9903 },
    { name: 'Colorado Springs', lat: 38.8339, lon: -104.8214 },
    { name: 'Aurora',           lat: 39.7294, lon: -104.8319 },
    { name: 'Fort Collins',     lat: 40.5853, lon: -105.0844 },
    { name: 'Boulder',          lat: 40.0150, lon: -105.2705 },
    { name: 'Pueblo',           lat: 38.2544, lon: -104.6091 },
    { name: 'Grand Junction',   lat: 39.0639, lon: -108.5506 },
    { name: 'Greeley',          lat: 40.4233, lon: -104.7091 },
    { name: 'Longmont',         lat: 40.1672, lon: -105.1019 },
    { name: 'Vail',             lat: 39.6403, lon: -106.3742 },
    { name: 'Aspen',            lat: 39.1911, lon: -106.8175 },
    { name: 'Steamboat Springs',lat: 40.4849, lon: -106.8317 },
    { name: 'Durango',          lat: 37.2753, lon: -107.8801 },
    { name: 'Trinidad',         lat: 37.1695, lon: -104.5005 },
  ],
  Delaware: [
    { name: 'Wilmington',      lat: 39.7447, lon: -75.5484 },
    { name: 'Dover',           lat: 39.1582, lon: -75.5244 },
    { name: 'Newark',          lat: 39.6837, lon: -75.7497 },
    { name: 'Middletown',      lat: 39.4496, lon: -75.7163 },
    { name: 'Smyrna',          lat: 39.2998, lon: -75.6047 },
    { name: 'Milford',         lat: 38.9126, lon: -75.4277 },
    { name: 'Seaford',         lat: 38.6412, lon: -75.6110 },
    { name: 'Georgetown',      lat: 38.6901, lon: -75.3855 },
    { name: 'Lewes',           lat: 38.7746, lon: -75.1394 },
    { name: 'Rehoboth Beach',  lat: 38.7209, lon: -75.0760 },
    { name: 'New Castle',      lat: 39.6621, lon: -75.5663 },
    { name: 'Harrington',      lat: 38.9237, lon: -75.5771 },
    { name: 'Laurel',          lat: 38.5565, lon: -75.5713 },
  ],
  Florida: [
    { name: 'Jacksonville',    lat: 30.3322, lon: -81.6557 },
    { name: 'Miami',           lat: 25.7617, lon: -80.1918 },
    { name: 'Tampa',           lat: 27.9506, lon: -82.4572 },
    { name: 'Orlando',         lat: 28.5383, lon: -81.3792 },
    { name: 'St. Petersburg',  lat: 27.7676, lon: -82.6403 },
    { name: 'Hialeah',         lat: 25.8576, lon: -80.2781 },
    { name: 'Tallahassee',     lat: 30.4383, lon: -84.2807 },
    { name: 'Fort Lauderdale', lat: 26.1224, lon: -80.1373 },
    { name: 'Port St. Lucie',  lat: 27.2730, lon: -80.3582 },
    { name: 'Cape Coral',      lat: 26.5629, lon: -81.9495 },
    { name: 'Sarasota',        lat: 27.3364, lon: -82.5307 },
    { name: 'Pensacola',       lat: 30.4213, lon: -87.2169 },
    { name: 'Key West',        lat: 24.5551, lon: -81.7800 },
    { name: 'Daytona Beach',   lat: 29.2108, lon: -81.0228 },
  ],
  Georgia: [
    { name: 'Atlanta',         lat: 33.7490, lon: -84.3880 },
    { name: 'Augusta',         lat: 33.4735, lon: -82.0105 },
    { name: 'Savannah',        lat: 32.0809, lon: -81.0912 },
    { name: 'Columbus',        lat: 32.4609, lon: -84.9877 },
    { name: 'Macon',           lat: 32.8407, lon: -83.6324 },
    { name: 'Athens',          lat: 33.9519, lon: -83.3576 },
    { name: 'Sandy Springs',   lat: 33.9304, lon: -84.3733 },
    { name: 'Roswell',         lat: 34.0232, lon: -84.3616 },
    { name: 'Albany',          lat: 31.5785, lon: -84.1557 },
    { name: 'Warner Robins',   lat: 32.6130, lon: -83.6242 },
    { name: 'Valdosta',        lat: 30.8327, lon: -83.2785 },
    { name: 'Brunswick',       lat: 31.1499, lon: -81.4915 },
    { name: 'Rome',            lat: 34.2570, lon: -85.1647 },
    { name: 'Blue Ridge',      lat: 34.8637, lon: -84.3241 },
  ],
  Hawaii: [
    { name: 'Honolulu',        lat: 21.3069, lon: -157.8583 },
    { name: 'Hilo',            lat: 19.7070, lon: -155.0885 },
    { name: 'Kailua',          lat: 21.4022, lon: -157.7394 },
    { name: 'Kaneohe',         lat: 21.4095, lon: -157.7996 },
    { name: 'Pearl City',      lat: 21.3972, lon: -157.9752 },
    { name: 'Waipahu',         lat: 21.3869, lon: -158.0090 },
    { name: 'Kapolei',         lat: 21.3354, lon: -158.0862 },
    { name: 'Kahului',         lat: 20.8947, lon: -156.4700 },
    { name: 'Wailuku',         lat: 20.8913, lon: -156.5047 },
    { name: 'Lihue',           lat: 21.9811, lon: -159.3711 },
    { name: 'Kailua-Kona',     lat: 19.6400, lon: -155.9969 },
    { name: 'Lahaina',         lat: 20.8783, lon: -156.6825 },
    { name: 'Waimea',          lat: 20.0222, lon: -155.6659 },
    { name: 'Hana',            lat: 20.7578, lon: -155.9886 },
  ],
  Arizona: [
    { name: 'Phoenix',          lat: 33.4484, lon: -112.0740 },
    { name: 'Tucson',           lat: 32.2226, lon: -110.9747 },
    { name: 'Flagstaff',        lat: 35.1983, lon: -111.6513 },
    { name: 'Scottsdale',       lat: 33.4942, lon: -111.9261 },
    { name: 'Mesa',             lat: 33.4152, lon: -111.8315 },
    { name: 'Glendale',         lat: 33.5387, lon: -112.1860 },
    { name: 'Prescott',         lat: 34.5400, lon: -112.4685 },
    { name: 'Yuma',             lat: 32.6927, lon: -114.6277 },
    { name: 'Lake Havasu City', lat: 34.4839, lon: -114.3225 },
    { name: 'Sierra Vista',     lat: 31.5455, lon: -110.3030 },
    { name: 'Sedona',           lat: 34.8697, lon: -111.7610 },
    { name: 'Kingman',          lat: 35.1894, lon: -114.0530 },
    { name: 'Show Low',         lat: 34.2542, lon: -110.0298 },
    { name: 'Casa Grande',      lat: 32.8795, lon: -111.7574 },
  ],
  Alaska: [
    { name: 'Anchorage',        lat: 61.2181, lon: -149.9003 },
    { name: 'Fairbanks',        lat: 64.8378, lon: -147.7164 },
    { name: 'Juneau',           lat: 58.3005, lon: -134.4197 },
    { name: 'Sitka',            lat: 57.0531, lon: -135.3300 },
    { name: 'Ketchikan',        lat: 55.3422, lon: -131.6461 },
    { name: 'Kenai',            lat: 60.5544, lon: -151.2583 },
    { name: 'Homer',            lat: 59.6425, lon: -151.5483 },
    { name: 'Kodiak',           lat: 57.7900, lon: -152.4072 },
    { name: 'Nome',             lat: 64.5011, lon: -165.4064 },
    { name: 'Barrow',           lat: 71.2906, lon: -156.7887 },
  ],
  Alabama: [
    { name: 'Birmingham',       lat: 33.5186, lon: -86.8104 },
    { name: 'Montgomery',       lat: 32.3668, lon: -86.3000 },
    { name: 'Huntsville',       lat: 34.7304, lon: -86.5861 },
    { name: 'Mobile',           lat: 30.6954, lon: -88.0399 },
    { name: 'Tuscaloosa',       lat: 33.2098, lon: -87.5692 },
    { name: 'Decatur',          lat: 34.6059, lon: -86.9833 },
    { name: 'Auburn',           lat: 32.6099, lon: -85.4808 },
    { name: 'Florence',         lat: 34.7998, lon: -87.6773 },
    { name: 'Dothan',           lat: 31.2232, lon: -85.3905 },
    { name: 'Anniston',         lat: 33.6598, lon: -85.8316 },
  ],
  Arkansas: [
    { name: 'Little Rock',      lat: 34.7465, lon: -92.2896 },
    { name: 'Fort Smith',       lat: 35.3859, lon: -94.3985 },
    { name: 'Fayetteville',     lat: 36.0626, lon: -94.1574 },
    { name: 'Springdale',       lat: 36.1867, lon: -94.1288 },
    { name: 'Jonesboro',        lat: 35.8423, lon: -90.7043 },
    { name: 'Conway',           lat: 35.0887, lon: -92.4421 },
    { name: 'Rogers',           lat: 36.3320, lon: -94.1185 },
    { name: 'Pine Bluff',       lat: 34.2284, lon: -92.0032 },
    { name: 'Hot Springs',      lat: 34.5037, lon: -93.0552 },
    { name: 'Bentonville',      lat: 36.3729, lon: -94.2088 },
    { name: 'Texarkana',        lat: 33.4251, lon: -94.0477 },
    { name: 'West Memphis',     lat: 35.1465, lon: -90.1845 },
  ],
  California: [
    { name: 'Los Angeles',      lat: 34.0522, lon: -118.2437 },
    { name: 'San Francisco',    lat: 37.7749, lon: -122.4194 },
    { name: 'Sacramento',       lat: 38.5816, lon: -121.4944 },
    { name: 'San Diego',        lat: 32.7157, lon: -117.1611 },
    { name: 'San Jose',         lat: 37.3382, lon: -121.8863 },
    { name: 'Fresno',           lat: 36.7378, lon: -119.7871 },
    { name: 'Bakersfield',      lat: 35.3733, lon: -119.0187 },
    { name: 'Long Beach',       lat: 33.7701, lon: -118.1937 },
    { name: 'Riverside',        lat: 33.9806, lon: -117.3755 },
    { name: 'Palm Springs',     lat: 33.8303, lon: -116.5453 },
    { name: 'Redding',          lat: 40.5865, lon: -122.3917 },
    { name: 'Eureka',           lat: 40.8021, lon: -124.1637 },
  ],
};

let landmarkLabels = []; // { el, wx, wz, screenX, screenY }
const landmarkOverlay = document.getElementById('landmarkOverlay');
let isDragging = false;
let movedDuringDrag = false;
let previousMouseX = 0;
let previousMouseY = 0;
let suppressMouseUntil = 0;
let lastProjectionMatrix = identityMatrix();
let lastViewMatrix = identityMatrix();
let lastModelMatrix = identityMatrix();

const TRANSMISSION_TYPE_COLORS = {
  line: [1.0, 0.62, 0.18, 1.0],
  minorLine: [0.46, 0.86, 1.0, 1.0],
  cable: [0.86, 0.67, 1.0, 1.0],
};

function resetTransmissionBuffers() {
  gl.bindBuffer(gl.ARRAY_BUFFER, transmissionLineBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([]), gl.DYNAMIC_DRAW);
  transmissionLineVertexCount = 0;

  gl.bindBuffer(gl.ARRAY_BUFFER, transmissionMinorLineBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([]), gl.DYNAMIC_DRAW);
  transmissionMinorLineVertexCount = 0;

  gl.bindBuffer(gl.ARRAY_BUFFER, transmissionCableBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([]), gl.DYNAMIC_DRAW);
  transmissionCableVertexCount = 0;

  transmissionRadiusRecords = [];
}

const cameraTarget = [0, 0, 0];
const cameraUp = [0, 1, 0];

const orbit = {
  yaw: 0.75,
  pitch: 0.85,
  distance: 6.2,
  minDistance: 0.75,
  maxDistance: 16,
  minPitch: 0.15,
  maxPitch: 1.45,
  dragSensitivity: 0.005,
  zoomSensitivity: 0.0012,
};

function getCameraEye() {
  const cp = Math.cos(orbit.pitch);
  const sp = Math.sin(orbit.pitch);
  const cy = Math.cos(orbit.yaw);
  const sy = Math.sin(orbit.yaw);

  return [
    orbit.distance * cp * sy,
    orbit.distance * sp,
    orbit.distance * cp * cy,
  ];
}

async function loadJson(filePath, cache) {
  let data = cache.get(filePath);

  if (!data) {
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`Failed to load map layer: ${filePath}`);
    }

    data = await response.json();
    cache.set(filePath, data);
  }

  return data;
}

async function setTransmissionForState(stateName) {
  const fallbackTransmissionPath = `grid/${stateName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim()
    .replace(/\s+/g, '-')}-transmission.json`;
  const filePath = transmissionFileByState[stateName] || fallbackTransmissionPath;

  if (!filePath || !currentProjection) {
    resetTransmissionBuffers();
    currentTransmissionSource = null;
    renderTransmissionSourcesPopover();
    return;
  }

  const data = await loadJson(filePath, transmissionDataCache);
  currentTransmissionSource = data?.source || null;
  const verticesByType = buildTransmissionVerticesByType(data.elements, currentProjection);
  transmissionRadiusRecords = buildTransmissionRadiusRecords(data.elements, currentProjection);
  renderTransmissionSourcesPopover();

  gl.bindBuffer(gl.ARRAY_BUFFER, transmissionLineBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, verticesByType.line, gl.DYNAMIC_DRAW);
  transmissionLineVertexCount = verticesByType.line.length / 3;

  gl.bindBuffer(gl.ARRAY_BUFFER, transmissionMinorLineBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, verticesByType.minorLine, gl.DYNAMIC_DRAW);
  transmissionMinorLineVertexCount = verticesByType.minorLine.length / 3;

  gl.bindBuffer(gl.ARRAY_BUFFER, transmissionCableBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, verticesByType.cable, gl.DYNAMIC_DRAW);
  transmissionCableVertexCount = verticesByType.cable.length / 3;
}

function renderTransmissionSourcesPopover() {
  if (!sourcesPopoverBody) {
    return;
  }

  const transmissionFilePath = transmissionFileByState[selectedStateName]
    || `grid/${selectedStateName
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .trim()
      .replace(/\s+/g, '-')}-transmission.json`;
  const substationFilePath = substationFileByState[selectedStateName] || 'Unavailable';
  const substationSource = currentSubstationSource;
  const transmissionSource = currentTransmissionSource;
  const plantFilePath = plantFileByState[selectedStateName] || 'Unavailable';
  const plantSource = currentPlantSource;
  const consumerFilePath = consumerFileByState[selectedStateName] || 'Unavailable';
  const consumerSource = currentConsumerSource;
  const solarDensityFilePath = solarZipDensityFileByState[selectedStateName]
    || `grid/${selectedStateName
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .trim()
      .replace(/\s+/g, '-')}-residential-solar-zip-density.json`;
  const solarDensitySource = currentSolarDensitySource;
  const ghostFilePath = ghostPowerFileByState[selectedStateName] || 'Unavailable';
  const ghostSource = currentGhostProjectSource;
  const stateTotals = currentStateTotals;
  const overpassBBox = transmissionSource?.bbox || CALIFORNIA_OVERPASS_BBOX;
  const substationQueryUrl = buildOverpassInterpreterLink(
    buildOverpassPowerFeatureQuery('substation', overpassBBox),
  );
  const plantQueryUrl = buildOverpassInterpreterLink(
    buildOverpassPowerFeatureQuery('plant', overpassBBox),
  );

  // Special citation for Maine substations
  let substationMarkup;
  if (selectedStateName === 'Maine' && substationSource) {
    substationMarkup = [
      '<section class="sources-detail-card">',
      '<span>Substations</span>',
      `<strong>${escapeHtml(substationSource.name || 'OpenStreetMap substations')}</strong>`,
      '<div class="sources-summary-grid">',
      `<div class="sources-summary-card"><span>Dataset file</span><strong>${escapeHtml(substationFilePath)}</strong></div>`,
      `<div class="sources-summary-card"><span>Elements</span><strong>${escapeHtml(substationSource.count)}</strong></div>`,
      `<div class="sources-summary-card"><span>Source system</span><strong>${escapeHtml(substationSource.generator || 'Overpass API')}</strong></div>`,
      `<div class="sources-summary-card"><span>OSM snapshot</span><strong>${escapeHtml(formatSourceDateTime(substationSource.timestamp || 'Unavailable'))}</strong></div>`,
      `<div class="sources-summary-card"><span>Primary source</span><strong><a href=\"https://www.openstreetmap.org\" target=\"_blank\" rel=\"noopener noreferrer\">https://www.openstreetmap.org</a></strong></div>`,
      `<div class="sources-summary-card"><span>Query API</span><strong><a href=\"https://overpass-api.de\" target=\"_blank\" rel=\"noopener noreferrer\">https://overpass-api.de</a></strong></div>`,
      `<div class="sources-summary-card"><span>Exact query URL</span><strong><a href="${escapeHtml(substationQueryUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(substationQueryUrl)}</a></strong></div>`,
      `<div class="sources-summary-card"><span>License</span><strong>${escapeHtml(substationSource.license || 'ODbL')}</strong></div>`,
      '</div>',
      '</section>',
    ].join('');
  } else if (substationSource) {
    substationMarkup = [
      '<section class="sources-detail-card">',
      '<span>Substations</span>',
      `<strong>${escapeHtml(substationSource.name || 'OpenStreetMap substations')}</strong>`,
      '<div class="sources-summary-grid">',
      `<div class="sources-summary-card"><span>Dataset file</span><strong>${escapeHtml(substationFilePath)}</strong></div>`,
      `<div class="sources-summary-card"><span>Elements</span><strong>${escapeHtml(substationSource.count)}</strong></div>`,
      `<div class="sources-summary-card"><span>Source system</span><strong>${escapeHtml(substationSource.generator || 'Overpass API')}</strong></div>`,
      `<div class="sources-summary-card"><span>OSM snapshot</span><strong>${escapeHtml(formatSourceDateTime(substationSource.timestamp || 'Unavailable'))}</strong></div>`,
      `<div class="sources-summary-card"><span>Primary source</span><strong><a href="https://www.openstreetmap.org" target="_blank" rel="noopener noreferrer">https://www.openstreetmap.org</a></strong></div>`,
      `<div class="sources-summary-card"><span>Query API</span><strong><a href="https://overpass-api.de" target="_blank" rel="noopener noreferrer">https://overpass-api.de</a></strong></div>`,
      `<div class="sources-summary-card"><span>Exact query URL</span><strong><a href="${escapeHtml(substationQueryUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(substationQueryUrl)}</a></strong></div>`,
      `<div class="sources-summary-card"><span>License</span><strong>${escapeHtml(substationSource.license || 'ODbL')}</strong></div>`,
      '</div>',
      '</section>',
    ].join('');
  } else {
    substationMarkup = [
      '<section class="sources-detail-card">',
      '<span>Substations</span>',
      '<strong>Metadata unavailable</strong>',
      '<div class="sources-summary-grid">',
      `<div class="sources-summary-card"><span>Dataset file</span><strong>${escapeHtml(substationFilePath)}</strong></div>`,
      '</div>',
      '</section>',
    ].join('');
  }

  const transmissionMarkup = transmissionSource
    ? (() => {
      const details = Array.isArray(transmissionSource.details) ? transmissionSource.details : [];
      const classes = Array.isArray(transmissionSource.classes) ? transmissionSource.classes.join(', ') : 'Unavailable';
      const transmissionQueryApi = details.find((detail) => String(detail?.endpoint || '').includes('overpass'))?.endpoint || 'https://overpass-api.de/api/interpreter';
      return [
        '<section class="sources-detail-card">',
        '<span>Transmission Lines</span>',
        `<strong>${escapeHtml(transmissionSource.name || 'Transmission source')}</strong>`,
        '<div class="sources-summary-grid">',
        `<div class="sources-summary-card"><span>Dataset file</span><strong>${escapeHtml(transmissionFilePath)}</strong></div>`,
        `<div class="sources-summary-card"><span>Built at</span><strong>${escapeHtml(formatSourceDateTime(transmissionSource.builtAt))}</strong></div>`,
        `<div class="sources-summary-card"><span>Classes</span><strong>${escapeHtml(classes)}</strong></div>`,
        `<div class="sources-summary-card"><span>Bounding box</span><strong>${escapeHtml(transmissionSource.bbox || 'Unavailable')}</strong></div>`,
        `<div class="sources-summary-card"><span>Primary source</span><strong><a href="https://www.openstreetmap.org" target="_blank" rel="noopener noreferrer">https://www.openstreetmap.org</a></strong></div>`,
        `<div class="sources-summary-card"><span>Query API</span><strong><a href="${escapeHtml(transmissionQueryApi)}" target="_blank" rel="noopener noreferrer">${escapeHtml(transmissionQueryApi)}</a></strong></div>`,
        `<div class="sources-summary-card"><span>Deduped by</span><strong>${escapeHtml(transmissionSource.dedupedBy || 'Unavailable')}</strong></div>`,
        `<div class="sources-summary-card"><span>License</span><strong>${escapeHtml(transmissionSource.license || 'Unavailable')}</strong></div>`,
        '</div>',
        details.length
          ? ['<div class="sources-detail-list">',
            details.map((detail) => [
              '<div class="sources-detail-card">',
              `<span>${escapeHtml(detail.class || 'Source class')}</span>`,
              `<strong>${escapeHtml(detail.endpoint || 'Endpoint unavailable')}</strong>`,
              detail.endpoint && String(detail.endpoint).includes('overpass')
                ? `<p><a href="${escapeHtml(buildOverpassInterpreterLink(buildOverpassTransmissionQuery(detail.class || 'line', transmissionSource?.bbox || CALIFORNIA_OVERPASS_BBOX), detail.endpoint))}" target="_blank" rel="noopener noreferrer">${escapeHtml(buildOverpassInterpreterLink(buildOverpassTransmissionQuery(detail.class || 'line', transmissionSource?.bbox || CALIFORNIA_OVERPASS_BBOX), detail.endpoint))}</a></p>`
                : '<p>Exact query URL unavailable for this endpoint.</p>',
              `<p>Fetched ${escapeHtml(detail.fetched)} records and kept ${escapeHtml(detail.kept)} unique ways for this transmission class.</p>`,
              '</div>',
            ].join('')).join(''),
            '</div>'].join('')
          : '<p>Transmission detail endpoints are unavailable.</p>',
        '</section>',
      ].join('');
    })()
    : [
      '<section class="sources-detail-card">',
      '<span>Transmission Lines</span>',
      '<strong>Metadata unavailable</strong>',
      '<div class="sources-summary-grid">',
      `<div class="sources-summary-card"><span>Dataset file</span><strong>${escapeHtml(transmissionFilePath)}</strong></div>`,
      '</div>',
      '</section>',
    ].join('');

  const plantMarkup = plantSource
    ? [
      '<section class="sources-detail-card">',
      '<span>Plant Nodes</span>',
      `<strong>${escapeHtml(plantSource.name || 'OpenStreetMap power plants')}</strong>`,
      '<div class="sources-summary-grid">',
      `<div class="sources-summary-card"><span>Dataset file</span><strong>${escapeHtml(plantFilePath)}</strong></div>`,
      `<div class="sources-summary-card"><span>Elements</span><strong>${escapeHtml(plantSource.count)}</strong></div>`,
      `<div class="sources-summary-card"><span>Source system</span><strong>${escapeHtml(plantSource.generator || 'Overpass API')}</strong></div>`,
      `<div class="sources-summary-card"><span>OSM snapshot</span><strong>${escapeHtml(formatSourceDateTime(plantSource.timestamp || 'Unavailable'))}</strong></div>`,
      `<div class="sources-summary-card"><span>Primary source</span><strong><a href="https://www.openstreetmap.org" target="_blank" rel="noopener noreferrer">https://www.openstreetmap.org</a></strong></div>`,
      `<div class="sources-summary-card"><span>Query API</span><strong><a href="https://overpass-api.de" target="_blank" rel="noopener noreferrer">https://overpass-api.de</a></strong></div>`,
      `<div class="sources-summary-card"><span>Exact query URL</span><strong><a href="${escapeHtml(plantQueryUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(plantQueryUrl)}</a></strong></div>`,
      `<div class="sources-summary-card"><span>License</span><strong>${escapeHtml(plantSource.license || 'ODbL')}</strong></div>`,
      '</div>',
      '</section>',
    ].join('')
    : [
      '<section class="sources-detail-card">',
      '<span>Plant Nodes</span>',
      '<strong>Metadata unavailable</strong>',
      '<div class="sources-summary-grid">',
      `<div class="sources-summary-card"><span>Dataset file</span><strong>${escapeHtml(plantFilePath)}</strong></div>`,
      '</div>',
      '</section>',
    ].join('');

  const ghostMarkup = ghostSource
    ? (() => {
      const verification = ghostSource.verification || {};
      const sourceProjectCount = verification.sourceStateProjectCount ?? verification.sourceCaProjectCount;
      const sourceTotalQueueMW = verification.sourceStateTotalQueueMW ?? verification.sourceCaTotalQueueMW;
      return [
        '<section class="sources-detail-card">',
        '<span>Ghost Projects</span>',
        `<strong>${escapeHtml(ghostSource.name || 'Ghost project source')}</strong>`,
        '<div class="sources-summary-grid">',
        `<div class="sources-summary-card"><span>Dataset file</span><strong>${escapeHtml(ghostFilePath)}</strong></div>`,
        `<div class="sources-summary-card"><span>Original source</span><strong><a href="${escapeHtml(ghostSource.url || '#')}" target="_blank" rel="noopener noreferrer">${escapeHtml(ghostSource.url || 'Unavailable')}</a></strong></div>`,
        `<div class="sources-summary-card"><span>Source page</span><strong><a href="${escapeHtml(ghostSource.source_page || '#')}" target="_blank" rel="noopener noreferrer">${escapeHtml(ghostSource.source_page || 'Unavailable')}</a></strong></div>`,
        `<div class="sources-summary-card"><span>Built at</span><strong>${escapeHtml(formatSourceDateTime(ghostSource.builtAt))}</strong></div>`,
        `<div class="sources-summary-card"><span>Sheet</span><strong>${escapeHtml(ghostSource.sheet || 'Unavailable')}</strong></div>`,
        `<div class="sources-summary-card"><span>Source version</span><strong>${escapeHtml(ghostSource.sourceVersion || 'Unavailable')}</strong></div>`,
        `<div class="sources-summary-card"><span>Fetched at</span><strong>${escapeHtml(formatSourceDateTime(ghostSource.fetchedAtUtc))}</strong></div>`,
        `<div class="sources-summary-card"><span>Last modified</span><strong>${escapeHtml(ghostSource.lastModified || 'Unavailable')}</strong></div>`,
        `<div class="sources-summary-card"><span>ETag</span><strong>${escapeHtml(ghostSource.etag || 'Unavailable')}</strong></div>`,
        `<div class="sources-summary-card"><span>Workbook tabs</span><strong>${escapeHtml(Array.isArray(ghostSource.workbookSheetNames) ? ghostSource.workbookSheetNames.join(', ') : 'Unavailable')}</strong></div>`,
        '</div>',
        '<div class="sources-summary-grid">',
        `<div class="sources-summary-card"><span>Verification checked</span><strong>${escapeHtml(formatSourceDateTime(verification.verifiedAtUtc || 'Unavailable'))}</strong></div>`,
        `<div class="sources-summary-card"><span>Row count check</span><strong>${verification.projectCountMatch ? 'Pass' : 'Mismatch'} (${escapeHtml(verification.builtProjectCount)} built vs ${escapeHtml(sourceProjectCount)} source)</strong></div>`,
        `<div class="sources-summary-card"><span>Queue MW check</span><strong>${verification.totalQueueMWMatch ? 'Pass' : 'Mismatch'} (${escapeHtml(verification.builtTotalQueueMW)} built vs ${escapeHtml(sourceTotalQueueMW)} source)</strong></div>`,
        `<div class="sources-summary-card"><span>State filter</span><strong>${escapeHtml(verification.stateFilter || selectedStateName)}</strong></div>`,
        '</div>',
        '</section>',
      ].join('');
    })()
    : [
      '<section class="sources-detail-card">',
      '<span>Ghost Projects</span>',
      '<strong>Metadata unavailable</strong>',
      '<div class="sources-summary-grid">',
      `<div class="sources-summary-card"><span>Dataset file</span><strong>${escapeHtml(ghostFilePath)}</strong></div>`,
      '</div>',
      '</section>',
    ].join('');

  const solarDensityMarkup = solarDensitySource
    ? [
      '<section class="sources-detail-card">',
      '<span>Residential Solar Density</span>',
      `<strong>${escapeHtml(solarDensitySource.name || 'Residential solar source')}</strong>`,
      '<div class="sources-summary-grid">',
      `<div class="sources-summary-card"><span>Dataset file</span><strong>${escapeHtml(solarDensityFilePath)}</strong></div>`,
      `<div class="sources-summary-card"><span>Query API</span><strong><a href="${escapeHtml(solarDensitySource.endpoint || '#')}" target="_blank" rel="noopener noreferrer">${escapeHtml(solarDensitySource.endpoint || 'Unavailable')}</a></strong></div>`,
      `<div class="sources-summary-card"><span>Query scope</span><strong>${escapeHtml(solarDensitySource.query_scope || 'Unavailable')}</strong></div>`,
      `<div class="sources-summary-card"><span>Filter</span><strong>${escapeHtml(solarDensitySource.filter || 'Unavailable')}</strong></div>`,
      `<div class="sources-summary-card"><span>OSM snapshot</span><strong>${escapeHtml(formatSourceDateTime(solarDensitySource.timestamp_osm_base || 'Unavailable'))}</strong></div>`,
      `<div class="sources-summary-card"><span>Cell size (deg)</span><strong>${escapeHtml(solarDensitySource.cell_size_deg ?? 'Unavailable')}</strong></div>`,
      `<div class="sources-summary-card"><span>Imputed system (MW)</span><strong>${escapeHtml(solarDensitySource.imputed_system_mw ?? 'Unavailable')}</strong></div>`,
      `<div class="sources-summary-card"><span>License</span><strong>${escapeHtml(solarDensitySource.license || 'Unavailable')}</strong></div>`,
      '</div>',
      '</section>',
    ].join('')
    : [
      '<section class="sources-detail-card">',
      '<span>Residential Solar Density</span>',
      '<strong>Metadata unavailable</strong>',
      '<div class="sources-summary-grid">',
      `<div class="sources-summary-card"><span>Dataset file</span><strong>${escapeHtml(solarDensityFilePath)}</strong></div>`,
      '</div>',
      '</section>',
    ].join('');


  const consumerMarkup = (function() {
    // Special citation for Maine
    if (selectedStateName === 'Maine' && consumerSource) {
      return [
        '<section class="sources-detail-card">',
        '<span>Consumer Nodes</span>',
        `<strong>${escapeHtml(consumerSource.name || 'Consumer source')}</strong>`,
        '<div class="sources-summary-grid">',
        `<div class="sources-summary-card"><span>Dataset file</span><strong>${escapeHtml(consumerFilePath)}</strong></div>`,
        `<div class="sources-summary-card"><span>Estimation method</span><strong>${escapeHtml(consumerSource.method || 'Proportional allocation by population')}</strong></div>`,
        `<div class="sources-summary-card"><span>Population source</span><strong>${escapeHtml(consumerSource.population_source || 'U.S. Census Bureau, 2024 county population estimates')}</strong></div>`,
        `<div class="sources-summary-card"><span>State total (MWh)</span><strong>${escapeHtml(consumerSource.state_total_mwh || 'Unavailable')}</strong></div>`,
        `<div class="sources-summary-card"><span>Disclaimer</span><strong>${escapeHtml(consumerSource.disclaimer || '')}</strong></div>`,
        '</div>',
        '</section>',
      ].join('');
    }
    // Default for other states
    return consumerSource
      ? [
        '<section class="sources-detail-card">',
        '<span>Consumer Nodes</span>',
        `<strong>${escapeHtml(consumerSource.name || 'Consumer source')}</strong>`,
        '<div class="sources-summary-grid">',
        `<div class="sources-summary-card"><span>Dataset file</span><strong>${escapeHtml(consumerFilePath)}</strong></div>`,
        `<div class="sources-summary-card"><span>Year</span><strong>${escapeHtml(consumerSource.year || 'Unavailable')}</strong></div>`,
        `<div class="sources-summary-card"><span>Workbook</span><strong>${escapeHtml(consumerSource.workbook || 'Unavailable')}</strong></div>`,
        `<div class="sources-summary-card"><span>Original source</span><strong><a href="${escapeHtml(consumerSource.workbook_url || consumerSource.download_page || '#')}" target="_blank" rel="noopener noreferrer">${escapeHtml(consumerSource.workbook_url || consumerSource.download_page || 'Unavailable')}</a></strong></div>`,
        `<div class="sources-summary-card"><span>Source page</span><strong><a href="${escapeHtml(consumerSource.download_page || '#')}" target="_blank" rel="noopener noreferrer">${escapeHtml(consumerSource.download_page || 'Unavailable')}</a></strong></div>`,
        `<div class="sources-summary-card"><span>Geometry source</span><strong><a href="${escapeHtml(consumerSource.geometry_source || '#')}" target="_blank" rel="noopener noreferrer">${escapeHtml(consumerSource.geometry_source || 'Unavailable')}</a></strong></div>`,
        '</div>',
        '</section>',
      ].join('')
      : [
        '<section class="sources-detail-card">',
        '<span>Consumer Nodes</span>',
        '<strong>Metadata unavailable</strong>',
        '<div class="sources-summary-grid">',
        `<div class="sources-summary-card"><span>Dataset file</span><strong>${escapeHtml(consumerFilePath)}</strong></div>`,
        '</div>',
        '</section>',
      ].join('');
  })();

  const stateTotalsMarkup = stateTotals
    ? (() => {
      const genByType = Array.isArray(stateTotals.generationByTypeGWh) ? stateTotals.generationByTypeGWh : [];
      const totalGen = genByType.reduce((s, e) => s + (Number(e.value) || 0), 0);
      const totalCons = Number(stateTotals.totalConsumptionGWh) || 0;
      const baseYear = Number(stateTotals.baseYear) || 2024;
      const projectionByYear = stateTotals?.projectionByYearGWh && typeof stateTotals.projectionByYearGWh === 'object'
        ? stateTotals.projectionByYearGWh
        : {};
      const projectionYears = Object.keys(projectionByYear).sort();
      const projectionCards = projectionYears.map((year) => {
        const projection = projectionByYear[year] || {};
        const projectedGen = Number(projection.totalGenerationGWh);
        const projectedCons = Number(projection.totalConsumptionGWh);
        const projectedGenLabel = Number.isFinite(projectedGen) ? `${projectedGen.toFixed(1)} GWh` : 'Unavailable';
        const projectedConsLabel = Number.isFinite(projectedCons) ? `${projectedCons.toFixed(1)} GWh` : 'Unavailable';
        return `<div class="sources-summary-card"><span>Projection ${escapeHtml(year)}</span><strong>Generation ${escapeHtml(projectedGenLabel)} / Consumption ${escapeHtml(projectedConsLabel)}</strong></div>`;
      }).join('');
      return [
        '<section class="sources-detail-card">',
        '<span>Statewide Totals</span>',
        '<strong>EIA Form-923 + EIA-861 Annual Electric Power Industry Reports</strong>',
        '<div class="sources-summary-grid">',
        `<div class="sources-summary-card"><span>Dataset file</span><strong>${escapeHtml(stateGlobalTotalsFilePath)}</strong></div>`,
        `<div class="sources-summary-card"><span>Base year</span><strong>${escapeHtml(baseYear)}</strong></div>`,
        `<div class="sources-summary-card"><span>Total generation</span><strong>${escapeHtml(String(totalGen.toFixed(0)))} GWh</strong></div>`,
        `<div class="sources-summary-card"><span>Total consumption</span><strong>${escapeHtml(String(totalCons.toFixed(0)))} GWh</strong></div>`,
        `<div class="sources-summary-card"><span>Generation source</span><strong><a href="https://www.eia.gov/electricity/data/state/" target="_blank" rel="noopener noreferrer">https://www.eia.gov/electricity/data/state/</a></strong></div>`,
        `<div class="sources-summary-card"><span>Consumption source</span><strong><a href="https://www.eia.gov/electricity/data/eia861/" target="_blank" rel="noopener noreferrer">https://www.eia.gov/electricity/data/eia861/</a></strong></div>`,
        `<div class="sources-summary-card"><span>State overview</span><strong><a href="https://www.eia.gov/electricity/state/" target="_blank" rel="noopener noreferrer">https://www.eia.gov/electricity/state/</a></strong></div>`,
        projectionYears.length
          ? `<div class="sources-summary-card"><span>Projection method</span><strong>${escapeHtml(stateTotals.projectionMethod || 'Linear trend from historical annual totals')}</strong></div>`
          : '',
        projectionCards,
        `<div class="sources-summary-card"><span>Notes</span><strong>${escapeHtml(stateTotals.meta || 'EIA actuals')}</strong></div>`,
        '</div>',
        '</section>',
      ].join('');
    })()
    : [
      '<section class="sources-detail-card">',
      '<span>Statewide Totals</span>',
      '<strong>Metadata unavailable</strong>',
      '<div class="sources-summary-grid">',
      `<div class="sources-summary-card"><span>Dataset file</span><strong>${escapeHtml(stateGlobalTotalsFilePath)}</strong></div>`,
      '</div>',
      '</section>',
    ].join('');

  sourcesPopoverBody.innerHTML = [
    '<p>These are the currently loaded source records for the active state.</p>',
    '<div class="sources-summary-grid">',
    `<div class="sources-summary-card"><span>State</span><strong>${escapeHtml(selectedStateName)}</strong></div>`,
    '<div class="sources-summary-card"><span>Datasets shown</span><strong>Substations, Transmission Lines, Plant Nodes, Consumer Nodes, Residential Solar Density, Ghost Projects, Statewide Totals</strong></div>',
    '</div>',
    '<div class="sources-detail-list">',
    substationMarkup,
    transmissionMarkup,
    plantMarkup,
    consumerMarkup,
    solarDensityMarkup,
    ghostMarkup,
    stateTotalsMarkup,
    '</div>',
  ].join('');
}

function openSourcesPopover() {
  if (!sourcesPopover) {
    return;
  }

  renderTransmissionSourcesPopover();
  sourcesPopover.classList.remove('is-hidden');
  sourcesPopover.setAttribute('aria-hidden', 'false');
}

function closeSourcesPopover() {
  if (!sourcesPopover) {
    return;
  }

  sourcesPopover.classList.add('is-hidden');
  sourcesPopover.setAttribute('aria-hidden', 'true');
}

function cloneStateTotalsContentForPopover() {
  if (!globalStatsPanel) {
    return null;
  }

  const wrapper = document.createElement('section');
  wrapper.className = 'state-totals-content';
  const blocks = globalStatsPanel.querySelectorAll('.global-stats-pane:not(.global-brand), .global-stats-meta');
  blocks.forEach((block) => {
    const clone = block.cloneNode(true);
    clone.removeAttribute('id');
    clone.querySelectorAll('[id]').forEach((node) => node.removeAttribute('id'));
    wrapper.appendChild(clone);
  });

  return wrapper;
}

function renderStateTotalsPopover() {
  if (!stateTotalsPopoverBody) {
    return;
  }
  stateTotalsPopoverBody.innerHTML = '';
  const content = cloneStateTotalsContentForPopover();
  if (content) {
    stateTotalsPopoverBody.appendChild(content);
  }
}

function openStateTotalsPopover() {
  if (!stateTotalsPopover) {
    return;
  }
  renderStateTotalsPopover();
  stateTotalsPopover.classList.remove('is-hidden');
  stateTotalsPopover.setAttribute('aria-hidden', 'false');
}

function closeStateTotalsPopover() {
  if (!stateTotalsPopover) {
    return;
  }
  stateTotalsPopover.classList.add('is-hidden');
  stateTotalsPopover.setAttribute('aria-hidden', 'true');
}

async function setSolarDensityLayerForState(stateName) {
  if (!currentProjection) {
    gl.bindBuffer(gl.ARRAY_BUFFER, solarDensityBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([]), gl.DYNAMIC_DRAW);
    solarDensityVertexCount = 0;
    solarDensityCells = [];
    currentSolarDensitySource = null;
    return;
  }

  const fallbackSolarDensityPath = `grid/${stateName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim()
    .replace(/\s+/g, '-')}-residential-solar-zip-density.json`;
  const filePath = solarZipDensityFileByState[stateName] || fallbackSolarDensityPath;
  if (!filePath) {
    gl.bindBuffer(gl.ARRAY_BUFFER, solarDensityBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([]), gl.DYNAMIC_DRAW);
    solarDensityVertexCount = 0;
    solarDensityCells = [];
    currentSolarDensitySource = null;
    return;
  }

  const data = await loadJson(filePath, solarZipDensityDataCache);
  const densityLayer = buildSolarDensityGridVertices(data.rows || [], currentProjection);
  gl.bindBuffer(gl.ARRAY_BUFFER, solarDensityBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, densityLayer.vertexData, gl.DYNAMIC_DRAW);
  solarDensityVertexCount = densityLayer.vertexData.length / 7;
  solarDensityCells = densityLayer.cells;
  currentSolarDensitySource = data?.source || null;
  renderTransmissionSourcesPopover();
}

function setGenerationHeatmapLayerForState() {
  if (!currentProjection || plantNodes.length === 0) {
    gl.bindBuffer(gl.ARRAY_BUFFER, generationHeatmapBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([]), gl.DYNAMIC_DRAW);
    generationHeatmapVertexCount = 0;
    generationHeatmapCellCount = 0;
    generationHeatmapCells = [];
    return;
  }

  const heatmap = buildGenerationHeatmapVertices(plantNodes, currentProjection, generationSubtypeMode);
  gl.bindBuffer(gl.ARRAY_BUFFER, generationHeatmapBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, heatmap.vertexData, gl.DYNAMIC_DRAW);
  generationHeatmapVertexCount = heatmap.vertexData.length / 7;
  generationHeatmapCellCount = heatmap.cellCount;
  generationHeatmapCells = heatmap.cells;
}

async function setPointLayerForState(stateName, type) {
  const fileMap = type === 'plant'
    ? plantFileByState
    : type === 'consumer'
      ? consumerFileByState
      : type === 'ghost'
        ? ghostPowerFileByState
        : substationFileByState;
  const cache = type === 'plant'
    ? plantDataCache
    : type === 'consumer'
      ? consumerDataCache
      : type === 'ghost'
        ? ghostPowerDataCache
        : substationDataCache;
  const buffer = type === 'plant' ? plantBuffer : type === 'consumer' ? consumerBuffer : type === 'ghost' ? ghostPowerBuffer : substationBuffer;
  const slogan = stateName.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim().replace(/\s+/g, '-');
  const fallbackPath = type === 'substation'
    ? `grid/${slogan}-substations.json`
    : type === 'plant'
    ? `grid/${slogan}-plants.json`
    : type === 'consumer'
    ? `grid/${slogan}-consumers.json`
    : type === 'ghost'
    ? `grid/${slogan}-ghost-projects.json`
    : undefined;
  const filePath = fileMap[stateName] || fallbackPath;

  if (!filePath || !currentProjection) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([]), gl.DYNAMIC_DRAW);

    if (type === 'plant') {
      plantVertexCount = 0;
      plantNodes = [];
      currentPlantSource = null;
      gl.bindBuffer(gl.ARRAY_BUFFER, haloBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([]), gl.DYNAMIC_DRAW);
      haloVertexCount = 0;
      renderTransmissionSourcesPopover();
    } else if (type === 'consumer') {
      consumerVertexCount = 0;
      consumerNodes = [];
      currentConsumerSource = null;
      renderTransmissionSourcesPopover();
    } else if (type === 'ghost') {
      ghostPowerVertexCount = 0;
      ghostPowerNodes = [];
      currentGhostProjectSource = null;
      renderTransmissionSourcesPopover();
    } else {
      substationVertexCount = 0;
      substationNodes = [];
      currentSubstationSource = null;
      renderTransmissionSourcesPopover();
    }
    return;
  }

  let data;
  try {
    data = await loadJson(filePath, cache);
  } catch (err) {
    // For optional data types (consumer, plant, ghost), warn but continue gracefully.
    // For substations, re-throw since they are required.
    if (type !== 'substation') {
      console.warn(`Optional ${type} layer failed to load for ${stateName}: ${err.message}`);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([]), gl.DYNAMIC_DRAW);
      if (type === 'plant') {
        plantVertexCount = 0;
        plantNodes = [];
        currentPlantSource = null;
        gl.bindBuffer(gl.ARRAY_BUFFER, haloBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([]), gl.DYNAMIC_DRAW);
        haloVertexCount = 0;
      } else if (type === 'consumer') {
        consumerVertexCount = 0;
        consumerNodes = [];
        currentConsumerSource = null;
      } else if (type === 'ghost') {
        ghostPowerVertexCount = 0;
        ghostPowerNodes = [];
        currentGhostProjectSource = null;
      }
      renderTransmissionSourcesPopover();
      refreshInteractiveNodes();
      return;
    }
    throw err;
  }
  const layer = buildPointLayer(data.elements, currentProjection, type);

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, layer.vertexData, gl.DYNAMIC_DRAW);

  if (type === 'plant') {
    plantVertexCount = layer.nodes.length;
    plantNodes = layer.nodes;
    currentPlantSource = {
      name: 'OpenStreetMap power plants via Overpass API',
      count: Array.isArray(data?.elements) ? data.elements.length : 0,
      generator: data?.generator || null,
      timestamp: data?.osm3s?.timestamp_osm_base || null,
      license: data?.osm3s?.copyright || null,
    };
    renderTransmissionSourcesPopover();
    gl.bindBuffer(gl.ARRAY_BUFFER, haloBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, layer.haloData, gl.DYNAMIC_DRAW);
    haloVertexCount = layer.haloData.length / 9;
  } else if (type === 'consumer') {
    consumerVertexCount = layer.nodes.length;
    consumerNodes = layer.nodes;
    currentConsumerSource = data?.source || null;
    renderTransmissionSourcesPopover();
  } else if (type === 'ghost') {
    ghostPowerVertexCount = layer.nodes.length;
    ghostPowerNodes = layer.nodes;
    currentGhostProjectSource = data?.source || null;
    renderTransmissionSourcesPopover();
  } else {
    substationVertexCount = layer.nodes.length;
    substationNodes = layer.nodes;
    currentSubstationSource = {
      name: 'OpenStreetMap substations via Overpass API',
      count: Array.isArray(data?.elements) ? data.elements.length : 0,
      generator: data?.generator || null,
      timestamp: data?.osm3s?.timestamp_osm_base || null,
      license: data?.osm3s?.copyright || null,
    };
    renderTransmissionSourcesPopover();
  }
}

function refreshInteractiveNodes() {
  interactiveNodes = [...substationNodes, ...consumerNodes, ...plantNodes, ...ghostPowerNodes];

  if (pinnedNode) {
    pinnedNode = interactiveNodes.find((node) => node.id === pinnedNode.id) || null;
  }

  if (hoveredNode) {
    hoveredNode = interactiveNodes.find((node) => node.id === hoveredNode.id) || null;
  }

  syncLegendDrivenSelections();

  if (dataLayerMode !== 'solar-density') {
    setInspectionNode(pinnedNode || hoveredNode, Boolean(pinnedNode));
  }
}

async function setOutlineForState(stateName) {
  const rings = stateMap.get(stateName) || [];
  currentProjection = createProjectionFromRings(rings);
  const outlineVertices = buildOutlineVertices(rings, currentProjection);

  gl.bindBuffer(gl.ARRAY_BUFFER, stateOutlineBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, outlineVertices, gl.DYNAMIC_DRAW);
  outlineVertexCount = outlineVertices.length / 3;

  await ensureGeneratedLandmarksLoaded();
  buildLandmarkLabels(stateName);

  await Promise.all([
    setTransmissionForState(stateName),
    setSolarDensityLayerForState(stateName),
    setPointLayerForState(stateName, 'substation'),
    setPointLayerForState(stateName, 'consumer'),
    setPointLayerForState(stateName, 'plant'),
    setPointLayerForState(stateName, 'ghost'),
    setGlobalTotalsForSelectedState(stateName),
  ]);

  setGenerationHeatmapLayerForState();

  refreshInteractiveNodes();
  if (dataLayerMode === 'infrastructure') rebuildFilteredBuffers();

  const summaryParts = ['outline'];

  if (dataLayerMode === 'solar-density') {
    const representedZips = solarDensityCells.reduce((sum, cell) => sum + (cell.zipCount || 0), 0);
    summaryParts.push(`${formatNumber(solarDensityVertexCount / 6)} solar density cells`);
    if (representedZips > 0) {
      summaryParts.push(`${formatNumber(representedZips)} ZIPs represented`);
    }
    hoveredDensityCell = null;
    pinnedDensityCell = null;
    setInspectionDensityCell(null, false);
    stateSummary.textContent = `Now viewing ${summaryParts.join(' + ')}: ${stateName}`;
    requestRender();
    showMaineDisclaimer(false);
    return;
  }

  if (dataLayerMode === 'generation-heatmap') {
    const selectedSubtypeLabel = generationSubtypeSelect?.selectedOptions?.[0]?.textContent || 'All generation';
    summaryParts.push(`${formatNumber(generationHeatmapCellCount)} generation heat cells`);
    summaryParts.push(`filter: ${selectedSubtypeLabel}`);
    hoveredGenerationHeatmapCell = null;
    pinnedGenerationHeatmapCell = null;
    setInspectionGenerationHeatmapCell(null, false);
    stateSummary.textContent = `Now viewing ${summaryParts.join(' + ')}: ${stateName}`;
    requestRender();
    showMaineDisclaimer(false);
    return;
  }

  if (transmissionLineVertexCount + transmissionMinorLineVertexCount + transmissionCableVertexCount > 0) {
    summaryParts.push('transmission');
  }
  if (substationVertexCount > 0) {
    summaryParts.push(`${formatNumber(substationVertexCount)} substations`);
  }
  if (consumerVertexCount > 0) {
    summaryParts.push(`${formatNumber(consumerVertexCount)} consumer nodes`);
  }
  if (plantVertexCount > 0) {
    summaryParts.push(`${formatNumber(plantVertexCount)} plants`);
  }
  if (ghostPowerVertexCount > 0) {
    const totalQueuedMW = ghostPowerNodes.reduce((sum, node) => sum + (Number(node.sortValue) || 0), 0);
    summaryParts.push(`${formatNumber(ghostPowerVertexCount)} queued projects`);
    summaryParts.push(`${formatNumber(totalQueuedMW, 0)} MW queued`);
  }

  stateSummary.textContent = `Now viewing ${summaryParts.join(' + ')}: ${stateName}`;
  requestRender();

  // Append disclaimer line in the summary only for Maine
  showMaineDisclaimer(stateName === 'Maine');
}

async function loadStates() {
  const response = await fetch('us-states.json');
  const geojson = await response.json();

  const features = geojson.features || [];
  for (const feature of features) {
    const name = feature?.properties?.name;
    if (!name || name === 'District of Columbia') {
      continue;
    }

    const rings = getRingsFromGeometry(feature.geometry);
    if (rings.length > 0) {
      stateMap.set(name, rings);
    }
  }

  const stateNames = Array.from(stateMap.keys()).sort();
  for (const stateName of stateNames) {
    const option = document.createElement('option');
    option.value = stateName;
    option.textContent = stateName;
    stateSelect.appendChild(option);
  }

  // Pick a random starting state
  if (stateNames.length > 0) {
    const randomIndex = Math.floor(Math.random() * stateNames.length);
    selectedStateName = stateNames[randomIndex];
  }

  stateSelect.value = selectedStateName;
  await setOutlineForState(selectedStateName);
}

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const displayWidth = Math.floor(canvas.clientWidth * dpr);
  const displayHeight = Math.floor(canvas.clientHeight * dpr);

  if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
    canvas.width = displayWidth;
    canvas.height = displayHeight;
  }

  gl.viewport(0, 0, canvas.width, canvas.height);
}

function requestRender() {
  if (renderFramePending) {
    return;
  }

  renderFramePending = true;
  requestAnimationFrame(() => {
    renderFramePending = false;
    render();
  });
}

function drawHalos(buffer, vertexCount) {
  if (vertexCount <= 0) return;

  gl.useProgram(haloLocations.program);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.enableVertexAttribArray(haloLocations.position);
  gl.vertexAttribPointer(haloLocations.position, 3, gl.FLOAT, false, 36, 0);
  gl.enableVertexAttribArray(haloLocations.localXZ);
  gl.vertexAttribPointer(haloLocations.localXZ, 2, gl.FLOAT, false, 36, 12);
  gl.enableVertexAttribArray(haloLocations.color);
  gl.vertexAttribPointer(haloLocations.color, 4, gl.FLOAT, false, 36, 20);
  gl.uniformMatrix4fv(haloLocations.projection, false, lastProjectionMatrix);
  gl.uniformMatrix4fv(haloLocations.view, false, lastViewMatrix);
  gl.uniformMatrix4fv(haloLocations.model, false, lastModelMatrix);
  gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
}

function drawLines(buffer, vertexCount, color, yOffset = 0.0) {
  if (vertexCount <= 0) {
    return;
  }

  gl.useProgram(lineLocations.program);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.enableVertexAttribArray(lineLocations.position);
  gl.vertexAttribPointer(lineLocations.position, 3, gl.FLOAT, false, 0, 0);
  gl.uniformMatrix4fv(lineLocations.projection, false, lastProjectionMatrix);
  gl.uniformMatrix4fv(lineLocations.view, false, lastViewMatrix);
  gl.uniformMatrix4fv(lineLocations.model, false, lastModelMatrix);
  gl.uniform4fv(lineLocations.color, color);
  gl.uniform1f(lineLocations.yOffset, yOffset);
  gl.drawArrays(gl.LINES, 0, vertexCount);
}

const OUTLINE_HOLO_LAYERS = [
  { yOff: 0.000, r: 0.24, g: 0.94, b: 0.80, aScale: 1.00 },
  { yOff: 0.014, r: 0.20, g: 0.78, b: 0.67, aScale: 0.62 },
  { yOff: 0.028, r: 0.16, g: 0.62, b: 0.54, aScale: 0.40 },
  { yOff: 0.042, r: 0.12, g: 0.47, b: 0.40, aScale: 0.24 },
  { yOff: 0.056, r: 0.09, g: 0.33, b: 0.28, aScale: 0.13 },
  { yOff: 0.070, r: 0.06, g: 0.20, b: 0.17, aScale: 0.06 },
];

function drawStateOutlineHolographic(baseAlpha) {
  if (outlineVertexCount <= 0) return;
  for (const layer of OUTLINE_HOLO_LAYERS) {
    drawLines(
      stateOutlineBuffer,
      outlineVertexCount,
      new Float32Array([layer.r, layer.g, layer.b, baseAlpha * layer.aScale]),
      layer.yOff,
    );
  }
}

function drawFilledCells(buffer, vertexCount) {
  if (vertexCount <= 0) {
    return;
  }

  gl.useProgram(fillLocations.program);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.enableVertexAttribArray(fillLocations.position);
  gl.vertexAttribPointer(fillLocations.position, 3, gl.FLOAT, false, 28, 0);
  gl.enableVertexAttribArray(fillLocations.color);
  gl.vertexAttribPointer(fillLocations.color, 4, gl.FLOAT, false, 28, 12);
  gl.uniformMatrix4fv(fillLocations.projection, false, lastProjectionMatrix);
  gl.uniformMatrix4fv(fillLocations.view, false, lastViewMatrix);
  gl.uniformMatrix4fv(fillLocations.model, false, lastModelMatrix);
  gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
}

function drawPoints(buffer, vertexCount) {
  if (vertexCount <= 0) {
    return;
  }

  gl.useProgram(pointLocations.program);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.enableVertexAttribArray(pointLocations.position);
  gl.vertexAttribPointer(pointLocations.position, 3, gl.FLOAT, false, 36, 0);
  gl.enableVertexAttribArray(pointLocations.pointSize);
  gl.vertexAttribPointer(pointLocations.pointSize, 1, gl.FLOAT, false, 36, 12);
  gl.enableVertexAttribArray(pointLocations.color);
  gl.vertexAttribPointer(pointLocations.color, 4, gl.FLOAT, false, 36, 16);
  gl.enableVertexAttribArray(pointLocations.shape);
  gl.vertexAttribPointer(pointLocations.shape, 1, gl.FLOAT, false, 36, 32);
  gl.uniformMatrix4fv(pointLocations.projection, false, lastProjectionMatrix);
  gl.uniformMatrix4fv(pointLocations.view, false, lastViewMatrix);
  gl.uniformMatrix4fv(pointLocations.model, false, lastModelMatrix);
  gl.drawArrays(gl.POINTS, 0, vertexCount);
}

function buildInteractionHighlightVertices() {
  const vertices = [];

  function pushHighlight(node, isPinned) {
    if (!node || !node.visible) {
      return;
    }

    const y = node.y + 0.001;
    const outerSize = node.size + (isPinned ? 10 : 7);
    const innerSize = node.size + (isPinned ? 7 : 5);

    // Outer white ring for strong contrast on any source color.
    vertices.push(node.x, y, node.z, outerSize, 1, 1, 1, isPinned ? 1.0 : 0.9, 2);
    // Inner tinted ring to preserve source identity.
    vertices.push(node.x, y, node.z, innerSize, node.color[0], node.color[1], node.color[2], isPinned ? 0.95 : 0.82, 2);
  }

  if (hoveredNode && (!pinnedNode || hoveredNode.id !== pinnedNode.id)) {
    pushHighlight(hoveredNode, false);
  }

  if (pinnedNode) {
    pushHighlight(pinnedNode, true);
  }

  return new Float32Array(vertices);
}

function drawInteractionHighlights() {
  if (dataLayerMode !== 'infrastructure' || activeDetailTab !== 'inspection') {
    return;
  }

  const vertices = buildInteractionHighlightVertices();
  highlightVertexCount = vertices.length / 9;
  if (highlightVertexCount <= 0) {
    return;
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, highlightBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
  drawPoints(highlightBuffer, highlightVertexCount);
}

function setRadiusStats(visible, nodeCount = 0, totalOutputMW = 0, breakdown = null, totalCo2TonsPerHour = 0, totalConsumptionMW = 0, sourceBreakdown = null, substationSummary = null, powerLineSummary = null, ghostSummary = null) {
  if (!radiusStatsPanel || !radiusStatsHint || !radiusStatsBody || !radiusStatsSummary || !radiusStatsBreakdown || !radiusEmissionsReadout || !radiusConsumptionReadout) {
    return;
  }

  radiusStatsPanel.classList.toggle('is-empty', !visible);
  radiusStatsHint.classList.toggle('is-hidden', visible);
  radiusStatsBody.classList.toggle('is-hidden', !visible);
  if (!visible) {
    radiusStatsBreakdown.innerHTML = '';
    if (radiusPieChart) {
      radiusPieChart.innerHTML = '';
    }
    if (radiusPieSummary) {
      radiusPieSummary.innerHTML = '';
    }
    if (radiusBatteryReadout) {
      radiusBatteryReadout.innerHTML = '';
    }
    if (radiusGhostReadout) {
      radiusGhostReadout.innerHTML = '';
    }
    radiusEmissionsReadout.innerHTML = '';
    radiusConsumptionReadout.innerHTML = '';
    if (radiusSubstationReadout) {
      radiusSubstationReadout.innerHTML = '';
    }
    if (radiusPowerLineReadout) {
      radiusPowerLineReadout.innerHTML = '';
    }
    if (radiusGhostProjectsReadout) {
      radiusGhostProjectsReadout.innerHTML = '';
    }
    return;
  }

  const nameplateCapacityGWh = (totalOutputMW * 8760) / 1000;
  const annualizedConsumptionGWh = (totalConsumptionMW * 8760) / 1000;
  const supplyMW = Math.max(0, Number(totalOutputMW) || 0);
  const demandMW = Math.max(0, Number(totalConsumptionMW) || 0);
  const balanceTotalMW = supplyMW + demandMW;
  const supplyShare = balanceTotalMW > 0 ? (supplyMW / balanceTotalMW) * 100 : 50;
  const demandShare = balanceTotalMW > 0 ? (demandMW / balanceTotalMW) * 100 : 50;
  const netBalanceMW = supplyMW - demandMW;
  const dominantSideClass = netBalanceMW >= 0 ? 'is-surplus' : 'is-deficit';
  const netBalanceLabel = netBalanceMW >= 0
    ? `Net export +${formatNumber(Math.abs(netBalanceMW), 1)} MW`
    : `Net import -${formatNumber(Math.abs(netBalanceMW), 1)} MW`;

  radiusStatsSummary.innerHTML = [
    `<div class="radius-summary-primary">${formatNumber(nodeCount)} nodes in radius</div>`,
    '<div class="radius-summary-metrics">',
    `<span class="radius-summary-chip"><span class="radius-summary-label">Output</span><strong>${formatNumber(totalOutputMW, 1)} MW</strong></span>`,
    `<span class="radius-summary-chip"><span class="radius-summary-label">Nameplate Cap.</span><strong>${formatNumber(nameplateCapacityGWh, 1)} GWh/yr</strong></span>`,
    '</div>',
  ].join('');

  const byType = breakdown || {
    renewables: 0,
    'fossil-fuels': 0,
    nuclear: 0,
    'battery-storage': 0,
    other: 0,
  };

  const sourceValue = (source) => Number(sourceBreakdown?.[source]) || 0;
  const biomassCombined = sourceValue('biomass') + sourceValue('biogas') + sourceValue('waste');

  const renewableSourceRows = [
    { key: 'solar', label: formatPlantSourceLabel('solar'), value: sourceValue('solar'), swatch: RADIUS_SOURCE_COLORS.solar, rowClass: 'is-source' },
    { key: 'wind', label: formatPlantSourceLabel('wind'), value: sourceValue('wind'), swatch: RADIUS_SOURCE_COLORS.wind, rowClass: 'is-source' },
    { key: 'hydro', label: formatPlantSourceLabel('hydro'), value: sourceValue('hydro'), swatch: RADIUS_SOURCE_COLORS.hydro, rowClass: 'is-source' },
    { key: 'geothermal', label: formatPlantSourceLabel('geothermal'), value: sourceValue('geothermal'), swatch: RADIUS_SOURCE_COLORS.geothermal, rowClass: 'is-source' },
    { key: 'bio-combined', label: 'Biomass / Biogas / Waste', value: biomassCombined, swatch: RADIUS_SOURCE_COLORS.biomass, rowClass: 'is-source' },
  ]
    .filter((entry) => entry.value > 0)
    .sort((a, b) => b.value - a.value);

  const topRenewableSourceRows = renewableSourceRows.slice(0, 3);
  const otherRenewableSourceValue = renewableSourceRows
    .slice(3)
    .reduce((sum, entry) => sum + entry.value, 0);

  const renewableRows = [
    { key: 'renewables', label: 'Renewables total', value: Number(byType.renewables) || 0, swatch: RADIUS_MIX_COLORS.renewables, rowClass: 'is-total' },
    ...topRenewableSourceRows,
    ...(otherRenewableSourceValue > 0
      ? [{ key: 'renewables-other', label: 'Other renewable sources', value: otherRenewableSourceValue, swatch: RADIUS_SOURCE_COLORS.unknown, rowClass: 'is-source' }]
      : []),
  ].filter((entry) => entry.value > 0);

  const fossilSourceRows = [
    { key: 'gas', label: formatPlantSourceLabel('gas'), value: sourceValue('gas'), swatch: RADIUS_SOURCE_COLORS.gas, rowClass: 'is-source' },
    { key: 'coal', label: formatPlantSourceLabel('coal'), value: sourceValue('coal'), swatch: RADIUS_SOURCE_COLORS.coal, rowClass: 'is-source' },
    { key: 'oil', label: formatPlantSourceLabel('oil'), value: sourceValue('oil'), swatch: RADIUS_SOURCE_COLORS.oil, rowClass: 'is-source' },
    { key: 'diesel', label: formatPlantSourceLabel('diesel'), value: sourceValue('diesel'), swatch: RADIUS_SOURCE_COLORS.diesel, rowClass: 'is-source' },
  ]
    .filter((entry) => entry.value > 0)
    .sort((a, b) => b.value - a.value);

  const topFossilSourceRows = fossilSourceRows.slice(0, 3);
  const otherFossilSourceValue = fossilSourceRows
    .slice(3)
    .reduce((sum, entry) => sum + entry.value, 0);

  const fossilRows = [
    { key: 'fossil-fuels', label: 'Fossil fuels total', value: Number(byType['fossil-fuels']) || 0, swatch: RADIUS_MIX_COLORS['fossil-fuels'], rowClass: 'is-total' },
    ...topFossilSourceRows,
    ...(otherFossilSourceValue > 0
      ? [{ key: 'fossil-other', label: 'Other fossil sources', value: otherFossilSourceValue, swatch: RADIUS_SOURCE_COLORS.unknown, rowClass: 'is-source' }]
      : []),
  ].filter((entry) => entry.value > 0);

  const otherRows = [
    { key: 'nuclear', label: 'Nuclear', value: Number(byType.nuclear) || 0, swatch: RADIUS_MIX_COLORS.nuclear, rowClass: 'is-total' },
    { key: 'battery-storage', label: 'Battery storage', value: Number(byType['battery-storage']) || 0, swatch: RADIUS_MIX_COLORS['battery-storage'], rowClass: 'is-total' },
    { key: 'other', label: 'Unknown / other', value: Number(byType.other) || 0, swatch: RADIUS_MIX_COLORS.other, rowClass: 'is-total' },
  ].filter((entry) => entry.value > 0);

  const rowsWithDivider = [
    ...renewableRows,
    ...(renewableRows.length > 0 && fossilRows.length > 0 ? [{ key: 'divider-rf', rowClass: 'is-divider', label: 'Fossil sources' }] : []),
    ...fossilRows,
    ...otherRows,
  ];

  radiusStatsBreakdown.innerHTML = rowsWithDivider
    .map((entry) => {
      if (entry.rowClass === 'is-divider') {
        return `<li class="is-divider"><span>${entry.label}</span></li>`;
      }
      return `<li class="${entry.rowClass}"><span class="radius-breakdown-label"><span class="radius-breakdown-swatch" style="background:${entry.swatch};"></span><span>${entry.label}</span></span><strong>${formatNumber(entry.value, 1)} MW</strong></li>`;
    })
    .join('');

  const emissionsLevel = getEmissionsIconLevel(totalCo2TonsPerHour);
  const gasCarDrivingHours = estimateGasCarDrivingHoursFromCo2Tons(totalCo2TonsPerHour);
  radiusEmissionsReadout.innerHTML = [
    '<div class="radius-emissions-icon" aria-hidden="true">',
    '<div class="radius-emissions-stack"></div>',
    '<div class="radius-emissions-plume">',
    `<span class="radius-emissions-bar${emissionsLevel >= 1 ? ' is-active' : ''}"></span>`,
    `<span class="radius-emissions-bar${emissionsLevel >= 2 ? ' is-active' : ''}"></span>`,
    `<span class="radius-emissions-bar${emissionsLevel >= 3 ? ' is-active' : ''}"></span>`,
    `<span class="radius-emissions-bar${emissionsLevel >= 4 ? ' is-active' : ''}"></span>`,
    '</div>',
    '</div>',
    '<div class="radius-emissions-copy">',
    '<div class="radius-emissions-overline">CO2 Emissions</div>',
    `<div class="radius-emissions-value">${formatCo2TonsPerHour(totalCo2TonsPerHour)}</div>`,
    `<div class="radius-emissions-detail">Gas-car eq: ${formatGasCarDrivingTimeFromHours(gasCarDrivingHours)}</div>`,
    '</div>',
  ].join('');

  radiusConsumptionReadout.innerHTML = [
    '<div class="radius-consumption-icon" aria-hidden="true">',
    '<span class="radius-consumption-bar"></span>',
    '<span class="radius-consumption-bar"></span>',
    '<span class="radius-consumption-bar"></span>',
    '</div>',
    '<div class="radius-consumption-copy">',
    '<div class="radius-consumption-overline">Demand</div>',
    `<div class="radius-consumption-value">${formatNumber(totalConsumptionMW, 1)} MW avg. demand</div>`,
    `<div class="radius-consumption-detail">${formatNumber(annualizedConsumptionGWh, 1)} GWh/yr est. annual</div>`,
    '<div class="radius-balance-wrap">',
    `<div class="radius-balance-head"><span>Balance</span><strong class="${dominantSideClass}">${netBalanceLabel}</strong></div>`,
    `<div class="radius-balance-track ${dominantSideClass}" style="--supply-share:${supplyShare.toFixed(2)}%;--demand-share:${demandShare.toFixed(2)}%;"><span class="radius-balance-supply"></span><span class="radius-balance-demand"></span><span class="radius-balance-center"></span></div>`,
    `<div class="radius-balance-labels"><span>Out ${formatNumber(supplyMW, 1)} MW</span><span>Load ${formatNumber(demandMW, 1)} MW</span></div>`,
    '</div>',
    '</div>',
  ].join('');

  renderRadiusPieChart(byType);
  renderRadiusGhostReadout(ghostSummary);
  renderRadiusSubstationReadout(substationSummary);
  renderRadiusPowerLineReadout(powerLineSummary);
  renderRadiusGhostProjectsReadout(ghostSummary);
}

function renderRadiusGhostProjectsReadout(summary) {
  if (!radiusGhostProjectsReadout) {
    return;
  }

  const projectCount = Number(summary?.projectCount) || 0;
  const totalQueuedMW = Number(summary?.totalQueuedMW) || 0;
  const batteryQueuedMW = Number(summary?.batteryQueuedMW) || 0;
  const batteryProjectCount = Number(summary?.batteryProjectCount) || 0;
  const poiMatchedCount = Number(summary?.poiMatchedCount) || 0;

  if (projectCount <= 0) {
    radiusGhostProjectsReadout.innerHTML = [
      '<div class="radius-ghost-projects-empty">',
      '<div class="radius-ghost-projects-empty-title">No queued ghost projects sampled</div>',
      '<p>Move the radius over major transmission corridors or known interconnection areas to inspect queued projects waiting for grid hookup.</p>',
      '</div>',
    ].join('');
    return;
  }

  const batteryShare = totalQueuedMW > 0 ? (batteryQueuedMW / totalQueuedMW) * 100 : 0;
  const poiMatchShare = projectCount > 0 ? (poiMatchedCount / projectCount) * 100 : 0;

  const fuelMarkup = (summary.fuelMixItems || [])
    .slice(0, 6)
    .map((item) => [
      '<li>',
      `<span>${item.fuel}</span>`,
      `<strong>${formatNumber(item.mw, 1)} MW <em>${formatNumber(item.share, 0)}%</em></strong>`,
      '</li>',
    ].join(''))
    .join('');

  const geocodeMarkup = (summary.geocodeMethodItems || [])
    .map((item) => [
      '<li>',
      `<span>${item.label}</span>`,
      `<strong>${formatNumber(item.count)} projects <em>${formatNumber(item.share, 0)}%</em></strong>`,
      '</li>',
    ].join(''))
    .join('');

  const cod = summary.codBuckets || {};
  const codMarkup = [
    { label: 'Requested by 2027', value: Number(cod.through2027) || 0 },
    { label: 'Requested 2028-2030', value: Number(cod.years2028to2030) || 0 },
    { label: 'Requested after 2030', value: Number(cod.after2030) || 0 },
    { label: 'COD unknown', value: Number(cod.unknown) || 0 },
  ]
    .map((item) => `<li><span>${item.label}</span><strong>${formatNumber(item.value)}</strong></li>`)
    .join('');

  const topProjectMarkup = (summary.topProjects || [])
    .map((project) => [
      '<li>',
      '<div class="radius-ghost-projects-list-copy">',
      `<strong>${project.name}</strong>`,
      `<span>${project.fuel} · POI: ${project.poi}</span>`,
      `<span>Requested COD: ${project.cod}</span>`,
      '</div>',
      `<strong>${formatNumber(project.mw, 1)} MW</strong>`,
      '</li>',
    ].join(''))
    .join('');

  radiusGhostProjectsReadout.innerHTML = [
    '<section class="radius-ghost-projects-hero">',
    '<div class="radius-ghost-projects-kicker">Ghost Projects in Radius</div>',
    `<h3>${formatNumber(projectCount)} queued projects totaling ${formatNumber(totalQueuedMW, 1)} MW</h3>`,
    `<p>These projects are proposed generation resources waiting for interconnection. They are not yet operating plants, but they indicate potential future supply pressure and transmission demand in this area.</p>`,
    '</section>',
    '<section class="radius-ghost-projects-grid">',
    `<div class="radius-ghost-projects-chip"><span>Queued battery share</span><strong>${formatNumber(batteryQueuedMW, 1)} MW</strong><em>${formatNumber(batteryShare, 0)}% of queued MW</em></div>`,
    `<div class="radius-ghost-projects-chip"><span>Battery-tagged projects</span><strong>${formatNumber(batteryProjectCount)}</strong><em>projects in radius</em></div>`,
    `<div class="radius-ghost-projects-chip"><span>POI matched</span><strong>${formatNumber(poiMatchedCount)}</strong><em>${formatNumber(poiMatchShare, 0)}% of queued projects</em></div>`,
    `<div class="radius-ghost-projects-chip"><span>Non-POI mapped</span><strong>${formatNumber(Math.max(0, projectCount - poiMatchedCount))}</strong><em>lower-location-confidence projects</em></div>`,
    '</section>',
    '<section class="radius-ghost-projects-section">',
    '<div class="radius-ghost-projects-section-title">Primary fuel mix (queued MW)</div>',
    `<ul class="radius-ghost-projects-list">${fuelMarkup || '<li><span>Unknown</span><strong>0 MW</strong></li>'}</ul>`,
    '</section>',
    '<section class="radius-ghost-projects-section">',
    '<div class="radius-ghost-projects-section-title">Mapping confidence</div>',
    `<ul class="radius-ghost-projects-list">${geocodeMarkup || '<li><span>Unknown</span><strong>0 projects</strong></li>'}</ul>`,
    '</section>',
    '<section class="radius-ghost-projects-section">',
    '<div class="radius-ghost-projects-section-title">Requested COD timeline</div>',
    `<ul class="radius-ghost-projects-list">${codMarkup}</ul>`,
    '</section>',
    '<section class="radius-ghost-projects-section">',
    '<div class="radius-ghost-projects-section-title">Largest queued projects in this radius</div>',
    `<ul class="radius-ghost-projects-project-list">${topProjectMarkup}</ul>`,
    '</section>',
  ].join('');
}

function renderRadiusGhostReadout(summary) {
  if (!radiusGhostReadout) {
    return;
  }

  const totalQueuedMW = Math.max(0, Number(summary?.totalQueuedMW) || 0);
  const batteryQueuedMW = Math.max(0, Number(summary?.batteryQueuedMW) || 0);
  const projectCount = Math.max(0, Number(summary?.projectCount) || 0);
  const poiMatchedCount = Math.max(0, Number(summary?.poiMatchedCount) || 0);

  radiusGhostReadout.innerHTML = [
    '<div class="radius-ghost-card">',
    '<div class="radius-ghost-overline">Ghost projects</div>',
    `<strong>${formatNumber(projectCount)}</strong>`,
    '<div class="radius-ghost-detail">in this radius</div>',
    '</div>',
    '<div class="radius-ghost-card">',
    '<div class="radius-ghost-overline">Ghost queue MW</div>',
    `<strong>${formatNumber(totalQueuedMW, 1)} MW</strong>`,
    '<div class="radius-ghost-detail">total queued</div>',
    '</div>',
    '<div class="radius-ghost-card">',
    '<div class="radius-ghost-overline">Queued battery</div>',
    `<strong>${formatNumber(batteryQueuedMW, 1)} MW</strong>`,
    '<div class="radius-ghost-detail">storage-tagged queue</div>',
    '</div>',
    '<div class="radius-ghost-card">',
    '<div class="radius-ghost-overline">POI matched</div>',
    `<strong>${formatNumber(poiMatchedCount)}</strong>`,
    '<div class="radius-ghost-detail">named interconnection points</div>',
    '</div>',
  ].join('');
}

function renderRadiusPowerLineReadout(summary) {
  if (!radiusPowerLineReadout) {
    return;
  }

  if (!summary || summary.totalLines <= 0) {
    radiusPowerLineReadout.innerHTML = [
      '<div class="radius-power-lines-empty">',
      '<div class="radius-power-lines-empty-title">No power lines sampled</div>',
      `<p>${summary?.introText || 'No transmission lines are inside this radius right now.'}</p>`,
      '</div>',
    ].join('');
    return;
  }

  const journeyMarkup = summary.journeyItems
    .map((item) => [
      '<li>',
      '<div class="radius-power-journey-head">',
      `<div class="radius-power-journey-main"><span class="radius-power-journey-badge">${item.badge}</span><strong>${item.title}</strong></div>`,
      `<span>${formatNumber(item.lines)} lines · ${formatNumber(item.miles, 1)} mi</span>`,
      '</div>',
      `<p>${item.description} <em>${formatNumber(item.share, 0)}% of sampled miles.</em></p>`,
      '</li>',
    ].join(''))
    .join('');

  const lineTypeMarkup = summary.lineTypeItems
    .filter((item) => item.lines > 0)
    .map((item) => [
      '<li>',
      '<div class="radius-power-detail-head">',
      `<strong>${item.label}</strong>`,
      `<span>${formatNumber(item.lines)} lines · ${formatNumber(item.miles, 1)} mi</span>`,
      '</div>',
      `<p>${formatNumber(item.share, 0)}% of sampled line miles</p>`,
      '</li>',
    ].join(''))
    .join('');

  const voltageBandMarkup = summary.voltageBandItems
    .filter((item) => item.miles > 0)
    .map((item) => [
      '<li>',
      '<div class="radius-power-detail-head">',
      `<strong>${item.label}</strong>`,
      `<span>${formatNumber(item.miles, 1)} mi</span>`,
      '</div>',
      `<p>${formatNumber(item.share, 0)}% of sampled line miles</p>`,
      '</li>',
    ].join(''))
    .join('');

  const guidanceMarkup = (summary.guidanceSteps || [])
    .map((step, index) => `<li><span class="radius-power-guide-index">${index + 1}</span><p>${step}</p></li>`)
    .join('');

  radiusPowerLineReadout.innerHTML = [
    '<section class="radius-power-start">',
    '<div class="radius-power-kicker">Start here (Beginner language)</div>',
    `<p>${summary.introText}</p>`,
    '<div class="radius-power-chip-row">',
    `<div class="radius-power-chip"><span>Voltage level mix</span><strong>${summary.voltageMixLabel}</strong></div>`,
    `<div class="radius-power-chip"><span>Total line miles in radius</span><strong>${formatNumber(summary.totalMiles, 1)} mi</strong></div>`,
    `<div class="radius-power-chip"><span>Major connection role</span><strong>${summary.majorRoleLabel}</strong></div>`,
    '</div>',
    `<div class="radius-power-confidence"><strong>Confidence note:</strong> ${summary.voltageTagCoverageLabel}. Roles are best-effort where metadata is missing.</div>`,
    '</section>',
    '<section class="radius-power-guide">',
    '<div class="radius-power-kicker">How to use this panel</div>',
    '<ul class="radius-power-guide-list">',
    guidanceMarkup,
    '</ul>',
    '</section>',
    '<section class="radius-power-journey">',
    '<div class="radius-power-kicker">Power Journey for Lines</div>',
    `<ul class="radius-power-journey-list">${journeyMarkup}</ul>`,
    '</section>',
    '<section class="radius-power-details">',
    '<div class="radius-power-kicker">Data details in this sample</div>',
    '<div class="radius-power-detail-grid">',
    '<div class="radius-power-detail-card">',
    '<h4>Line type mix</h4>',
    `<ul class="radius-power-detail-list">${lineTypeMarkup || '<li><p>No line-type detail in this sample.</p></li>'}</ul>`,
    '</div>',
    '<div class="radius-power-detail-card">',
    '<h4>Voltage profile</h4>',
    `<ul class="radius-power-detail-list">${voltageBandMarkup || '<li><p>No voltage-tagged lines in this sample.</p></li>'}</ul>`,
    '</div>',
    '</div>',
    '</section>',
    '<section class="radius-power-interpretation">',
    '<div class="radius-power-kicker">What This Radius Means</div>',
    '<ul class="radius-power-interpretation-list">',
    `<li><strong>Transport vs delivery:</strong> ${summary.interpretation.transportVsDelivery}</li>`,
    `<li><strong>Corridor, hub, or edge:</strong> ${summary.interpretation.areaShape}</li>`,
    `<li><strong>Redundancy check:</strong> ${summary.interpretation.redundancy}</li>`,
    `<li><strong>Import vs export posture:</strong> ${summary.interpretation.importExport}</li>`,
    '</ul>',
    '</section>',
  ].join('');
}

function renderRadiusPieChart(byType) {
  if (!radiusPieChart || !radiusPieSummary || !radiusBatteryReadout) {
    return;
  }

  const entries = [
    { key: 'renewables', color: RADIUS_MIX_COLORS.renewables },
    { key: 'fossil-fuels', color: RADIUS_MIX_COLORS['fossil-fuels'] },
    { key: 'nuclear', color: RADIUS_MIX_COLORS.nuclear },
    { key: 'battery-storage', color: RADIUS_MIX_COLORS['battery-storage'] },
    { key: 'other', color: RADIUS_MIX_COLORS.other },
  ].map((entry) => ({
    ...entry,
    value: Math.max(0, Number(byType?.[entry.key]) || 0),
  }));

  const total = entries.reduce((sum, entry) => sum + entry.value, 0);
  if (total <= 0) {
    radiusPieChart.innerHTML = '';
    radiusPieSummary.innerHTML = '';
    radiusBatteryReadout.innerHTML = '';
    return;
  }

  const dominantEntry = entries.reduce((best, entry) => (entry.value > best.value ? entry : best), entries[0]);
  const dominantPercent = total > 0 ? (dominantEntry.value / total) * 100 : 0;
  const batteryValue = entries.find((entry) => entry.key === 'battery-storage')?.value || 0;
  const batteryPercent = total > 0 ? (batteryValue / total) * 100 : 0;

  const cx = 60;
  const cy = 60;
  const outerR = 54;
  const innerR = 26;
  const gap = 0.018;
  let angle = -Math.PI / 2;

  const slices = entries
    .filter((entry) => entry.value > 0)
    .map((entry) => {
      const sweep = (entry.value / total) * Math.PI * 2;
      const start = angle + gap / 2;
      const end = angle + sweep - gap / 2;
      angle += sweep;

      const x1 = cx + outerR * Math.cos(start);
      const y1 = cy + outerR * Math.sin(start);
      const x2 = cx + outerR * Math.cos(end);
      const y2 = cy + outerR * Math.sin(end);
      const ix1 = cx + innerR * Math.cos(end);
      const iy1 = cy + innerR * Math.sin(end);
      const ix2 = cx + innerR * Math.cos(start);
      const iy2 = cy + innerR * Math.sin(start);
      const largeArc = sweep > Math.PI ? 1 : 0;

      const pathData = `M${x1.toFixed(2)},${y1.toFixed(2)} A${outerR},${outerR} 0 ${largeArc},1 ${x2.toFixed(2)},${y2.toFixed(2)} L${ix1.toFixed(2)},${iy1.toFixed(2)} A${innerR},${innerR} 0 ${largeArc},0 ${ix2.toFixed(2)},${iy2.toFixed(2)} Z`;
      return `<path class="radius-pie-slice" d="${pathData}" fill="${entry.color}" opacity="0.94"/>`;
    })
    .join('');

  radiusPieChart.innerHTML = `${slices}<circle cx="${cx}" cy="${cy}" r="${innerR - 1}" fill="rgba(4,10,18,0.9)"/>`;
  radiusPieSummary.innerHTML = [
    '<div class="radius-pie-overline">Top Mix</div>',
    `<div class="radius-pie-percent">${dominantPercent.toFixed(0)}%</div>`,
    `<div class="radius-pie-dominant">${formatGenerationSubtypeLabel(dominantEntry.key)}</div>`,
    `<div class="radius-pie-detail">${formatNumber(dominantEntry.value, 2)} MW of ${formatNumber(total, 2)} MW</div>`,
  ].join('');
  radiusBatteryReadout.innerHTML = [
    `<div class="radius-battery-icon" style="--battery-fill:${batteryPercent.toFixed(1)};">`,
    '<div class="radius-battery-fill"></div>',
    '</div>',
    '<div class="radius-battery-copy">',
    '<div class="radius-battery-overline">Battery Storage</div>',
    `<div class="radius-battery-value">${formatNumber(batteryValue, 1)} MW</div>`,
    `<div class="radius-battery-detail">${batteryPercent.toFixed(0)}% of hovered mix</div>`,
    '</div>',
  ].join('');
}

function renderRadiusSubstationReadout(summary) {
  if (!radiusSubstationReadout) {
    return;
  }

  if (!summary || summary.totalSubstations <= 0) {
    radiusSubstationReadout.innerHTML = [
      '<div class="radius-substation-empty">',
      '<div class="radius-substation-empty-title">No substations sampled</div>',
      `<p>${summary?.narrative || 'No substations are inside this radius right now.'}</p>`,
      '</div>',
    ].join('');
    return;
  }

  const roleItems = summary.roleEntries
    .map((entry) => [
      '<li>',
      '<div class="radius-substation-list-copy">',
      `<strong>${entry.label}</strong>`,
      `<span>${formatCountNoun(entry.count, 'substation')} ${getSubstationRoleOperationalDetail(entry.role)}</span>`,
      '</div>',
      `<strong>${formatNumber(entry.count)}</strong>`,
      '</li>',
    ].join(''))
    .join('');

  const sortedRoles = [...summary.roleEntries].sort((a, b) => b.count - a.count);
  const topRoleParts = sortedRoles
    .slice(0, 2)
    .map((entry) => `${entry.label.toLowerCase()} (${formatNumber(entry.count)})`)
    .join(' and ');
  const dominantRoleEntry = sortedRoles[0] || null;
  const secondaryRoleEntry = sortedRoles[1] || null;
  const netBalanceMW = summary.totalOutputMW - summary.totalConsumptionMW;
  const netBalanceLabel = netBalanceMW >= 0
    ? `Net export ${formatNumber(Math.abs(netBalanceMW), 1)} MW`
    : `Net import ${formatNumber(Math.abs(netBalanceMW), 1)} MW`;
  const roleShare = (count) => {
    if (!summary.totalSubstations) return '0%';
    return `${formatNumber((count / summary.totalSubstations) * 100, 0)}%`;
  };
  const flowItems = [
    {
      title: 'Step-up',
      badge: 'S1',
      tone: 'is-source',
      count: summary.stepUpCount,
      share: roleShare(summary.stepUpCount),
      description: 'Power leaves plants and is stepped up to travel longer distances efficiently.',
    },
    {
      title: 'Transmission switching',
      badge: 'S2',
      tone: 'is-bulk',
      count: summary.transmissionSwitchingCount,
      share: roleShare(summary.transmissionSwitchingCount),
      description: 'Bulk-grid substations route and protect high-voltage corridors.',
    },
    {
      title: 'Regional transfer',
      badge: 'S3',
      tone: 'is-regional',
      count: summary.regionalTransferCount,
      share: roleShare(summary.regionalTransferCount),
      description: 'Power is handed from major lines into regional subtransmission paths.',
    },
    {
      title: 'Distribution step-down',
      badge: 'S4',
      tone: 'is-delivery',
      count: summary.stepDownCount,
      share: roleShare(summary.stepDownCount),
      description: 'Voltage is lowered again before neighborhoods and businesses use the electricity.',
    },
    {
      title: 'Other / mixed transfer',
      badge: 'S5',
      tone: 'is-mixed',
      count: summary.gridTransferCount,
      share: roleShare(summary.gridTransferCount),
      description: 'These sites are active in routing power, but source metadata does not fully classify their role.',
    },
  ];
  const sourceSideCount = summary.stepUpCount;
  const bulkSideCount = summary.transmissionSwitchingCount + summary.regionalTransferCount;
  const deliverySideCount = summary.stepDownCount;

  const voltageItems = [
    { label: 'Step-up substations', value: formatNumber(summary.stepUpCount), detail: 'Raise plant output toward transmission voltage' },
    { label: 'Step-down substations', value: formatNumber(summary.stepDownCount), detail: 'Lower voltage for local feeder networks' },
    { label: 'Bulk-grid tags', value: formatNumber(summary.voltageBands.bulk), detail: 'Known voltage tags at 200 kV and above' },
    { label: 'Regional-transfer tags', value: formatNumber(summary.voltageBands.regional), detail: 'Known voltage tags from 69 kV up to 199 kV' },
    { label: 'Local-distribution tags', value: formatNumber(summary.voltageBands.local), detail: 'Known voltage tags below 69 kV' },
    { label: 'Average tagged voltage', value: summary.averageVoltageKV == null ? 'Unknown' : `${formatNumber(summary.averageVoltageKV, 0)} kV`, detail: `${formatNumber(summary.knownVoltageCount)} of ${formatNumber(summary.totalSubstations)} substations include voltage tags` },
  ];

  radiusSubstationReadout.innerHTML = [
    '<div class="radius-substation-hero">',
    '<div class="radius-substation-kicker">Substation activity</div>',
    `<div class="radius-substation-title">${formatCountNoun(summary.totalSubstations, 'substation')} selected</div>`,
    `<p class="radius-substation-blurb">Primary role: ${summary.primaryRoleLabel.toLowerCase()}. Voltage profile: ${summary.voltageRangeLabel}. Most common roles: ${topRoleParts || 'mixed substation types'}.</p>`,
    '</div>',
    '<section class="radius-substation-journey" aria-label="Substation learning journey">',
    '<div class="radius-substation-guide-title">Start here: how substations work in this radius</div>',
    '<div class="radius-substation-guide">',
    `<p class="radius-substation-guide-intro">Substations are the checkpoints that prepare power for the next leg of its trip. In this radius, electricity starts around generation sites, moves through bulk transmission routing, and then steps down for local delivery. This sample has <strong>${formatNumber(summary.totalSubstations)} substations</strong> supporting ${formatNumber(summary.totalOutputMW, 1)} MW generation and ${formatNumber(summary.totalConsumptionMW, 1)} MW demand, with a current balance of <strong>${netBalanceLabel}</strong>.</p>`,
    '<div class="radius-substation-journey-strip">',
    `<div class="radius-substation-journey-card"><span>Source side</span><strong>${formatNumber(sourceSideCount)} sites</strong><em>Plant output gets stepped up to travel farther with lower losses.</em></div>`,
    `<div class="radius-substation-journey-card"><span>Bulk grid</span><strong>${formatNumber(bulkSideCount)} sites</strong><em>High-voltage switching and transfer points route power across the region.</em></div>`,
    `<div class="radius-substation-journey-card"><span>Delivery side</span><strong>${formatNumber(deliverySideCount)} sites</strong><em>Step-down substations prepare electricity for neighborhood feeder lines.</em></div>`,
    '</div>',
    '<div class="radius-substation-guide-title">Power journey in this sample</div>',
    `<ul class="radius-substation-flow">${flowItems.map((item) => [
      `<li class="${item.tone}">`,
      '<div class="radius-substation-flow-head">',
      '<div class="radius-substation-flow-main">',
      `<span class="radius-substation-flow-badge">${item.badge}</span>`,
      `<strong>${item.title}</strong>`,
      '</div>',
      `<span>${formatNumber(item.count)} sites (${item.share})</span>`,
      '</div>',
      `<p>${item.description}</p>`,
      '</li>',
    ].join('')).join('')}</ul>`,
    '<div class="radius-substation-guide-title">How to interpret what you are seeing</div>',
    '<ul class="radius-substation-narrative-list">',
    `<li><strong>Main function:</strong> ${dominantRoleEntry ? `${dominantRoleEntry.label} is the largest group (${formatNumber(dominantRoleEntry.count)} sites), so this area is primarily focused on ${getSubstationRoleFocusLabel(dominantRoleEntry.role)}.` : 'No single role dominates this radius; functions are evenly mixed.'}</li>`,
    `<li><strong>Secondary pattern:</strong> ${secondaryRoleEntry ? `${secondaryRoleEntry.label} is the second-largest group (${formatNumber(secondaryRoleEntry.count)} sites), showing the next most common handoff stage in the power journey.` : 'A strong secondary handoff pattern is not visible in this sample.'}</li>`,
    `<li><strong>Voltage confidence:</strong> ${formatNumber(summary.knownVoltageCount)} of ${formatNumber(summary.totalSubstations)} sites include voltage tags, with an observed range of <strong>${summary.voltageRangeLabel}</strong>. Untagged sites are still included, but classification is best-effort.</li>`,
    `<li><strong>Practical takeaway:</strong> If step-up and bulk switching dominate, you are looking at a backbone transport corridor. If step-down dominates, you are looking at a local delivery zone feeding communities.</li>`,
    '</ul>',
    '</div>',
    '</section>',
    '<div class="radius-substation-metrics">',
    `<div class="radius-substation-chip"><span>Primary role</span><strong>${summary.primaryRoleLabel}</strong></div>`,
    `<div class="radius-substation-chip"><span>Voltage range</span><strong>${summary.voltageRangeLabel}</strong></div>`,
    `<div class="radius-substation-chip"><span>Named sites</span><strong>${formatNumber(summary.namedCount)} / ${formatNumber(summary.totalSubstations)}</strong></div>`,
    `<div class="radius-substation-chip"><span>Tagged voltages</span><strong>${formatNumber(summary.knownVoltageCount)} / ${formatNumber(summary.totalSubstations)}</strong></div>`,
    '</div>',
    '<details class="radius-substation-details" open>',
    '<summary>Role mix details</summary>',
    `<ul class="radius-substation-list">${roleItems}</ul>`,
    '</details>',
    '<details class="radius-substation-details">',
    '<summary>Voltage handling details</summary>',
    `<ul class="radius-substation-list">${voltageItems.map((item) => [
      '<li>',
      '<div class="radius-substation-list-copy">',
      `<strong>${item.label}</strong>`,
      `<span>${item.detail}</span>`,
      '</div>',
      `<strong>${item.value}</strong>`,
      '</li>',
    ].join('')).join('')}</ul>`,
    '</details>',
  ].join('');
}

function getNodePowerSpikeHeight(node, isPinned) {
  let normalized = 0.15;

  if (node.type === 'plant') {
    normalized = clamp(Math.log10((node.sortValue || 0) + 1) / Math.log10(2500 + 1), 0, 1);
  } else {
    normalized = clamp((node.sortValue || 0) / 500, 0, 1);
  }

  const weighted = Math.pow(normalized, 1.8);
  const baseHeight = lerp(0.04, 1.05, weighted);
  const spikeHeight = (isPinned ? baseHeight * 1.12 : baseHeight) * RADIUS_NODE_EFFECT_HEIGHT_SCALE;
  return spikeHeight;
}

function buildPowerSpikeVertices(node, isPinned) {
  if (!node || !node.visible || node.type === 'consumer') {
    return new Float32Array([]);
  }

  const yStart = node.y + 0.012;
  const yEnd = yStart + getNodePowerSpikeHeight(node, isPinned);
  return new Float32Array([
    node.x, yStart, node.z,
    node.x, yEnd, node.z,
  ]);
}

function drawPowerSpikes() {
  if (nodesInHoverCircle.length === 0) {
    return;
  }

  gl.lineWidth(2.2);

  for (const node of nodesInHoverCircle) {
    const vertices = buildPowerSpikeVertices(node, Boolean(pinnedNode && pinnedNode.id === node.id));
    if (vertices.length > 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, powerSpikeBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
      drawLines(powerSpikeBuffer, vertices.length / 3, new Float32Array([node.color[0], node.color[1], node.color[2], 0.96]));
    }
  }

  gl.lineWidth(1);
}

function getConsumerSparkleHeight(node) {
  const mw = node.sortValue || 0;
  const normalized = clamp(Math.log10(mw + 1) / Math.log10(8000 + 1), 0, 1);
  const weighted = Math.pow(normalized, 1.4);
  return lerp(0.06, 0.72, weighted) * RADIUS_NODE_EFFECT_HEIGHT_SCALE;
}

function buildConsumerSparkleSeeds() {
  consumerSparkleSeeds = [];
  const consumers = nodesInHoverCircle.filter((n) => n.type === 'consumer' && n.visible);
  for (const node of consumers) {
    const height = getConsumerSparkleHeight(node);
    const baseRadius = 0.005 + height * 0.022;
    const normalized = clamp(Math.log10((node.sortValue || 0) + 1) / Math.log10(8000 + 1), 0, 1);
    const count = Math.round(lerp(14, 68, normalized));
    const seeds = [];
    for (let i = 0; i < count; i++) {
      const r = Math.sqrt(Math.random()) * baseRadius;
      const theta = Math.random() * Math.PI * 2;
      seeds.push({
        rx: Math.cos(theta) * r,
        rz: Math.sin(theta) * r,
        phase: Math.random(),
        speed: 0.28 + Math.random() * 0.78,
        segLen: 0.018 + Math.random() * 0.038,
        driftFreq: 0.30 + Math.random() * 0.60,
        driftPhase: Math.random() * Math.PI * 2,
      });
    }
    consumerSparkleSeeds.push({ node, height, seeds });
  }
}

function buildConsumerSparkleVertices(now) {
  const verts = [];
  const t = now * 0.001;
  for (const entry of consumerSparkleSeeds) {
    const { node, height, seeds } = entry;
    const baseY = node.y + 0.014;
    for (const s of seeds) {
      const progress = (s.phase + t * s.speed * 0.38) % 1.0;
      const drift = 0.52 + 0.48 * Math.sin(t * s.driftFreq + s.driftPhase);
      const x = node.x + s.rx * drift;
      const z = node.z + s.rz * drift;
      // fall from top toward base
      const yTop = baseY + (1.0 - progress) * height;
      const yBot = Math.max(baseY, yTop - s.segLen);
      verts.push(x, yTop, z, x, yBot, z);
    }
  }
  return new Float32Array(verts);
}

function drawConsumerSparkles() {
  if (consumerSparkleSeeds.length === 0) {
    return;
  }
  const verts = buildConsumerSparkleVertices(performance.now());
  if (verts.length === 0) {
    return;
  }
  gl.lineWidth(3.0);
  gl.bindBuffer(gl.ARRAY_BUFFER, consumerSparkleBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, verts, gl.DYNAMIC_DRAW);
  drawLines(consumerSparkleBuffer, verts.length / 3, new Float32Array([1.0, 0.76, 0.88, 0.72]));
  gl.lineWidth(1);
}

function buildHoverCircleVertices(centerX, centerZ, radius) {
  const vertices = [];
  const segments = 64;
  const y = 0.003;

  for (let i = 0; i < segments; i += 1) {
    const a0 = (i / segments) * Math.PI * 2;
    const a1 = ((i + 1) / segments) * Math.PI * 2;
    const x0 = centerX + Math.cos(a0) * radius;
    const z0 = centerZ + Math.sin(a0) * radius;
    const x1 = centerX + Math.cos(a1) * radius;
    const z1 = centerZ + Math.sin(a1) * radius;
    vertices.push(x0, y, z0, x1, y, z1);
  }

  return new Float32Array(vertices);
}

function drawHoverCircle() {
  if (!hoverCircleCenter || dataLayerMode !== 'infrastructure' || activeDetailTab !== 'radius') {
    return;
  }

  const vertices = buildHoverCircleVertices(hoverCircleCenter.x, hoverCircleCenter.z, hoverCircleRadius);
  gl.bindBuffer(gl.ARRAY_BUFFER, hoverCircleBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
  drawLines(hoverCircleBuffer, vertices.length / 3, new Float32Array([0.95, 0.98, 1.0, 0.9]));
}

function buildDensityCellOutlineVertices(cell) {
  if (!cell) {
    return [];
  }

  const y = 0.006;
  return [
    cell.x0, y, cell.z0, cell.x1, y, cell.z0,
    cell.x1, y, cell.z0, cell.x1, y, cell.z1,
    cell.x1, y, cell.z1, cell.x0, y, cell.z1,
    cell.x0, y, cell.z1, cell.x0, y, cell.z0,
  ];
}

function drawDensityCellHighlights() {
  const hoveredOnly = hoveredDensityCell && (!pinnedDensityCell || hoveredDensityCell !== pinnedDensityCell)
    ? hoveredDensityCell
    : null;

  if (!hoveredOnly && !pinnedDensityCell) {
    return;
  }

  gl.lineWidth(1.5);

  if (hoveredOnly) {
    const hoveredVertices = new Float32Array(buildDensityCellOutlineVertices(hoveredOnly));
    gl.bindBuffer(gl.ARRAY_BUFFER, densityHighlightBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, hoveredVertices, gl.DYNAMIC_DRAW);
    drawLines(densityHighlightBuffer, hoveredVertices.length / 3, new Float32Array([1.0, 1.0, 1.0, 0.95]));
  }

  if (pinnedDensityCell) {
    const pinnedVertices = new Float32Array(buildDensityCellOutlineVertices(pinnedDensityCell));
    gl.bindBuffer(gl.ARRAY_BUFFER, densityHighlightBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, pinnedVertices, gl.DYNAMIC_DRAW);
    drawLines(densityHighlightBuffer, pinnedVertices.length / 3, new Float32Array([1.0, 0.65, 0.20, 1.0]));
  }

  gl.lineWidth(1);
}

function drawGenerationHeatmapCellHighlights() {
  const hoveredOnly = hoveredGenerationHeatmapCell
    && (!pinnedGenerationHeatmapCell || hoveredGenerationHeatmapCell !== pinnedGenerationHeatmapCell)
    ? hoveredGenerationHeatmapCell
    : null;

  if (!hoveredOnly && !pinnedGenerationHeatmapCell) {
    return;
  }

  gl.lineWidth(1.5);

  if (hoveredOnly) {
    const hoveredVertices = new Float32Array(buildDensityCellOutlineVertices(hoveredOnly));
    gl.bindBuffer(gl.ARRAY_BUFFER, generationHeatmapHighlightBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, hoveredVertices, gl.DYNAMIC_DRAW);
    drawLines(generationHeatmapHighlightBuffer, hoveredVertices.length / 3, new Float32Array([1.0, 1.0, 1.0, 0.95]));
  }

  if (pinnedGenerationHeatmapCell) {
    const pinnedVertices = new Float32Array(buildDensityCellOutlineVertices(pinnedGenerationHeatmapCell));
    gl.bindBuffer(gl.ARRAY_BUFFER, generationHeatmapHighlightBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, pinnedVertices, gl.DYNAMIC_DRAW);
    drawLines(generationHeatmapHighlightBuffer, pinnedVertices.length / 3, new Float32Array([1.0, 0.65, 0.20, 1.0]));
  }

  gl.lineWidth(1);
}

function worldToScreen(node) {
  return worldPointToScreen(node.x, node.y, node.z);
}

function worldPointToScreen(x, y, z) {
  const modelSpace = multiplyMatrixVector(lastModelMatrix, [x, y, z, 1]);
  const viewSpace = multiplyMatrixVector(lastViewMatrix, modelSpace);
  const clipSpace = multiplyMatrixVector(lastProjectionMatrix, viewSpace);

  if (Math.abs(clipSpace[3]) < 1e-6) {
    return null;
  }

  const ndcX = clipSpace[0] / clipSpace[3];
  const ndcY = clipSpace[1] / clipSpace[3];
  const ndcZ = clipSpace[2] / clipSpace[3];

  if (ndcZ < -1 || ndcZ > 1) {
    return null;
  }

  const rect = canvas.getBoundingClientRect();
  return {
    x: (ndcX * 0.5 + 0.5) * rect.width,
    y: (1 - (ndcY * 0.5 + 0.5)) * rect.height,
  };
}

function screenToGroundPoint(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return null;
  }

  const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
  const ndcY = 1 - ((clientY - rect.top) / rect.height) * 2;
  const pv = multiplyMatrices(lastProjectionMatrix, lastViewMatrix);
  const invPv = invertMatrix4(pv);
  if (!invPv) {
    return null;
  }

  const near4 = multiplyMatrixVector(invPv, [ndcX, ndcY, -1, 1]);
  const far4 = multiplyMatrixVector(invPv, [ndcX, ndcY, 1, 1]);
  if (Math.abs(near4[3]) < 1e-6 || Math.abs(far4[3]) < 1e-6) {
    return null;
  }

  const near = [near4[0] / near4[3], near4[1] / near4[3], near4[2] / near4[3]];
  const far = [far4[0] / far4[3], far4[1] / far4[3], far4[2] / far4[3]];
  const dir = [far[0] - near[0], far[1] - near[1], far[2] - near[2]];

  if (Math.abs(dir[1]) < 1e-6) {
    return null;
  }

  const t = (0 - near[1]) / dir[1];
  if (t < 0) {
    return null;
  }

  return {
    x: near[0] + dir[0] * t,
    z: near[2] + dir[2] * t,
  };
}

function updateHoverCircleSelection(clientX, clientY) {
  if (dataLayerMode !== 'infrastructure' || isDragging) {
    hoverCircleCenter = null;
    nodesInHoverCircle = [];
    hoverCircleTotalOutputMW = 0;
    consumerSparkleSeeds = [];
    setRadiusStats(false);
    rebuildFilteredBuffers();
    requestRender();
    return;
  }

  if (isRadiusFrozen) {
    return;
  }

  const groundPoint = screenToGroundPoint(clientX, clientY);
  if (!groundPoint) {
    hoverCircleCenter = null;
    nodesInHoverCircle = [];
    hoverCircleTotalOutputMW = 0;
    consumerSparkleSeeds = [];
    setRadiusStats(false);
    rebuildFilteredBuffers();
    requestRender();
    return;
  }

  updateHoverCircleSelectionFromGroundPoint(groundPoint);
}

function updateHoverCircleSelectionFromGroundPoint(groundPoint) {
  hoverCircleCenter = groundPoint;
  const radiusSquared = hoverCircleRadius * hoverCircleRadius;
  nodesInHoverCircle = interactiveNodes.filter((node) => {
    if (isNodeHiddenByLegend(node)) {
      return false;
    }
    const dx = node.x - groundPoint.x;
    const dz = node.z - groundPoint.z;
    return dx * dx + dz * dz <= radiusSquared;
  });

  hoverCircleTotalOutputMW = nodesInHoverCircle
    .filter((node) => node.type === 'plant')
    .reduce((sum, node) => sum + (Number(node.sortValue) || 0), 0);

  const hoverCircleCo2TonsPerHour = nodesInHoverCircle
    .filter((node) => node.type === 'plant')
    .reduce((sum, node) => sum + estimateNodeCo2TonsPerHour(node), 0);

  const hoverCircleTotalConsumptionMW = nodesInHoverCircle
    .filter((node) => node.type === 'consumer')
    .reduce((sum, node) => sum + (Number(node.sortValue) || 0), 0);

  const hoverBreakdown = {
    renewables: 0,
    'fossil-fuels': 0,
    nuclear: 0,
    'battery-storage': 0,
    other: 0,
  };

  for (const node of nodesInHoverCircle) {
    if (node.type !== 'plant') {
      continue;
    }

    const mw = Number(node.sortValue) || 0;
    if (mw <= 0) {
      continue;
    }

    const source = getPrimaryPlantSource(node.tags || {});
    const subtype = getGenerationSubtypeForSource(source);
    hoverBreakdown[subtype] += mw;
  }

  const hoverSourceBreakdown = {
    solar: 0,
    wind: 0,
    hydro: 0,
    gas: 0,
    coal: 0,
    oil: 0,
    diesel: 0,
    nuclear: 0,
    geothermal: 0,
    biomass: 0,
    biogas: 0,
    waste: 0,
    battery: 0,
    unknown: 0,
  };

  for (const node of nodesInHoverCircle) {
    if (node.type !== 'plant') {
      continue;
    }

    const mw = Number(node.sortValue) || 0;
    if (mw <= 0) {
      continue;
    }

    const source = getPrimaryPlantSource(node.tags || {});
    if (Object.prototype.hasOwnProperty.call(hoverSourceBreakdown, source)) {
      hoverSourceBreakdown[source] += mw;
    } else {
      hoverSourceBreakdown.unknown += mw;
    }
  }

  const hoverInfrastructureNodeCount = nodesInHoverCircle.filter((node) => node.type !== 'ghost').length;
  const hoverGhostSummary = summarizeRadiusGhostProjects(nodesInHoverCircle);
  const hoverSubstationSummary = summarizeRadiusSubstations(nodesInHoverCircle, hoverCircleTotalOutputMW, hoverCircleTotalConsumptionMW);
  const hoverPowerLineSummary = summarizeRadiusPowerLines(groundPoint, hoverCircleRadius, hoverCircleTotalOutputMW, hoverCircleTotalConsumptionMW);
  setRadiusStats(
    true,
    hoverInfrastructureNodeCount,
    hoverCircleTotalOutputMW,
    hoverBreakdown,
    hoverCircleCo2TonsPerHour,
    hoverCircleTotalConsumptionMW,
    hoverSourceBreakdown,
    hoverSubstationSummary,
    hoverPowerLineSummary,
    hoverGhostSummary,
  );
  buildConsumerSparkleSeeds();
  rebuildFilteredBuffers();
  requestRender();
}

function handleRadiusSizeInput(value) {
  const nextRadius = Number.parseFloat(value);
  if (!Number.isFinite(nextRadius)) {
    return;
  }

  hoverCircleRadius = clamp(nextRadius, 0.08, 2.25);
  updateRadiusControlValueLabel();

  if (dataLayerMode === 'infrastructure' && activeDetailTab === 'radius' && !isDragging) {
    if (isRadiusFrozen && hoverCircleCenter) {
      updateHoverCircleSelectionFromGroundPoint(hoverCircleCenter);
    } else if (lastPointerClientX !== null && lastPointerClientY !== null) {
      updateHoverCircleSelection(lastPointerClientX, lastPointerClientY);
    }
  }
}

function updateNodeScreenPositions() {
  for (const node of interactiveNodes) {
    if (isNodeHiddenByLegend(node)) {
      node.visible = false;
      continue;
    }

    const screen = worldToScreen(node);
    if (!screen) {
      node.visible = false;
      continue;
    }

    node.visible = true;
    node.screenX = screen.x;
    node.screenY = screen.y;
    node.screenRadius = node.size * 0.9;
  }
}

function updateDensityCellScreenPositions() {
  for (const cell of solarDensityCells) {
    const center = worldPointToScreen(cell.cx, 0.001, cell.cz);
    const cornerA = worldPointToScreen(cell.x0, 0.001, cell.z0);
    const cornerB = worldPointToScreen(cell.x1, 0.001, cell.z1);

    if (!center || !cornerA || !cornerB) {
      cell.visible = false;
      continue;
    }

    const dxA = cornerA.x - center.x;
    const dyA = cornerA.y - center.y;
    const dxB = cornerB.x - center.x;
    const dyB = cornerB.y - center.y;
    cell.visible = true;
    cell.screenX = center.x;
    cell.screenY = center.y;
    cell.screenRadius = Math.max(10, Math.hypot(dxA, dyA), Math.hypot(dxB, dyB));
  }
}

function updateGenerationHeatmapCellScreenPositions() {
  for (const cell of generationHeatmapCells) {
    const center = worldPointToScreen(cell.cx, 0.0015, cell.cz);
    const cornerA = worldPointToScreen(cell.x0, 0.0015, cell.z0);
    const cornerB = worldPointToScreen(cell.x1, 0.0015, cell.z1);

    if (!center || !cornerA || !cornerB) {
      cell.visible = false;
      continue;
    }

    const dxA = cornerA.x - center.x;
    const dyA = cornerA.y - center.y;
    const dxB = cornerB.x - center.x;
    const dyB = cornerB.y - center.y;
    cell.visible = true;
    cell.screenX = center.x;
    cell.screenY = center.y;
    cell.screenRadius = Math.max(10, Math.hypot(dxA, dyA), Math.hypot(dxB, dyB));
  }
}

function findNearestNode(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;

  let nearestNode = null;
  let nearestDistanceSquared = Number.POSITIVE_INFINITY;

  for (const node of interactiveNodes) {
    if (!node.visible || isNodeHiddenByLegend(node)) {
      continue;
    }

    const dx = node.screenX - x;
    const dy = node.screenY - y;
    const distanceSquared = dx * dx + dy * dy;
    const hitRadius = Math.max(10, node.screenRadius + 4);

    if (distanceSquared <= hitRadius * hitRadius && distanceSquared < nearestDistanceSquared) {
      nearestNode = node;
      nearestDistanceSquared = distanceSquared;
    }
  }

  return nearestNode;
}

function findNearestDensityCell(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;

  let nearestCell = null;
  let nearestDistanceSquared = Number.POSITIVE_INFINITY;

  for (const cell of solarDensityCells) {
    if (!cell.visible) {
      continue;
    }

    const dx = cell.screenX - x;
    const dy = cell.screenY - y;
    const distanceSquared = dx * dx + dy * dy;

    if (distanceSquared <= cell.screenRadius * cell.screenRadius && distanceSquared < nearestDistanceSquared) {
      nearestCell = cell;
      nearestDistanceSquared = distanceSquared;
    }
  }

  return nearestCell;
}

function findNearestGenerationHeatmapCell(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;

  let nearestCell = null;
  let nearestDistanceSquared = Number.POSITIVE_INFINITY;

  for (const cell of generationHeatmapCells) {
    if (!cell.visible) {
      continue;
    }

    const dx = cell.screenX - x;
    const dy = cell.screenY - y;
    const distanceSquared = dx * dx + dy * dy;

    if (distanceSquared <= cell.screenRadius * cell.screenRadius && distanceSquared < nearestDistanceSquared) {
      nearestCell = cell;
      nearestDistanceSquared = distanceSquared;
    }
  }

  return nearestCell;
}

function updateHoveredNode(event) {
  const prevHoveredNode = hoveredNode;
  const prevHoveredDensityCell = hoveredDensityCell;
  const prevHoveredGenerationHeatmapCell = hoveredGenerationHeatmapCell;

  lastPointerClientX = event.clientX;
  lastPointerClientY = event.clientY;

  if (dataLayerMode === 'generation-heatmap') {
    hoveredNode = null;
    hoveredDensityCell = null;
    hoveredGenerationHeatmapCell = findNearestGenerationHeatmapCell(event.clientX, event.clientY);
    hoverCircleCenter = null;
    nodesInHoverCircle = [];
    hoverCircleTotalOutputMW = 0;
    setRadiusStats(false);
    if (!pinnedGenerationHeatmapCell) {
      setInspectionGenerationHeatmapCell(hoveredGenerationHeatmapCell, false);
    }
    updateCanvasCursor();
    if (prevHoveredGenerationHeatmapCell !== hoveredGenerationHeatmapCell) {
      requestRender();
    }
    return;
  }

  if (dataLayerMode === 'solar-density') {
    if (isDragging) {
      return;
    }

    hoveredNode = null;
    hoveredDensityCell = findNearestDensityCell(event.clientX, event.clientY);
    if (!pinnedDensityCell) {
      setInspectionDensityCell(hoveredDensityCell, false);
    }
    setRadiusStats(false);
    updateCanvasCursor();
    if (prevHoveredDensityCell !== hoveredDensityCell) {
      requestRender();
    }
    return;
  }

  if (isDragging) {
    return;
  }

  if (activeDetailTab === 'radius') {
    hoveredNode = null;
    updateHoverCircleSelection(event.clientX, event.clientY);
  } else {
    hoverCircleCenter = null;
    nodesInHoverCircle = [];
    hoverCircleTotalOutputMW = 0;
    setRadiusStats(false);
    hoveredNode = findNearestNode(event.clientX, event.clientY);
    if (!pinnedNode) {
      setInspectionNode(hoveredNode, false);
    }
  }

  updateCanvasCursor();
  if (prevHoveredNode !== hoveredNode || landmarkLabels.length > 0) {
    requestRender();
  }
}

stateSelect.addEventListener('change', async (event) => {
  selectedStateName = event.target.value;
  applyLegendFilter(null);
  pinnedNode = null;
  hoveredNode = null;
  pinnedDensityCell = null;
  hoveredDensityCell = null;
  pinnedGenerationHeatmapCell = null;
  hoveredGenerationHeatmapCell = null;
  hoverCircleCenter = null;
  nodesInHoverCircle = [];
  hoverCircleTotalOutputMW = 0;
  isRadiusFrozen = false;
  isRadiusFrozen = false;
  setRadiusStats(false);
  setInspectionNode(null, false);

  try {
    await setOutlineForState(selectedStateName);
  } catch (error) {
    stateSummary.textContent = `Grid layer unavailable for ${selectedStateName}.`;
    console.error(error);
  }
});

canvas.addEventListener('mousedown', (event) => {
  if (Date.now() < suppressMouseUntil) {
    return;
  }
  isDragging = true;
  movedDuringDrag = false;
  previousMouseX = event.clientX;
  previousMouseY = event.clientY;
  updateCanvasCursor();
});

window.addEventListener('mouseup', () => {
  isDragging = false;
  updateCanvasCursor();
});

window.addEventListener('mousemove', (event) => {
  if (Date.now() < suppressMouseUntil) {
    return;
  }
  if (!isDragging) {
    updateHoveredNode(event);
    return;
  }

  const dx = event.clientX - previousMouseX;
  const dy = event.clientY - previousMouseY;
  previousMouseX = event.clientX;
  previousMouseY = event.clientY;

  if (Math.abs(dx) + Math.abs(dy) > 0) {
    movedDuringDrag = true;
  }

  orbit.yaw -= dx * orbit.dragSensitivity;
  orbit.pitch += dy * orbit.dragSensitivity;
  orbit.pitch = Math.max(orbit.minPitch, Math.min(orbit.maxPitch, orbit.pitch));
  requestRender();
});

canvas.addEventListener('mouseleave', () => {
  if (dataLayerMode === 'infrastructure' && activeDetailTab === 'radius' && isRadiusFrozen) {
    hoveredNode = null;
    updateCanvasCursor();
    return;
  }

  hoveredNode = null;
  hoveredDensityCell = null;
  hoveredGenerationHeatmapCell = null;
  hoverCircleCenter = null;
  nodesInHoverCircle = [];
  hoverCircleTotalOutputMW = 0;
  setRadiusStats(false);

  if (dataLayerMode === 'solar-density') {
    if (!pinnedDensityCell) {
      setInspectionDensityCell(null, false);
    }
  } else if (dataLayerMode === 'generation-heatmap') {
    if (!pinnedGenerationHeatmapCell) {
      setInspectionGenerationHeatmapCell(null, false);
    }
  } else if (!pinnedNode) {
    setInspectionNode(null, false);
  }

  updateCanvasCursor();
  requestRender();
});

function handleCanvasSelectionAt(clientX, clientY) {
  if (dataLayerMode !== 'infrastructure') {
    if (dataLayerMode === 'solar-density') {
      if (movedDuringDrag) {
        movedDuringDrag = false;
        return;
      }

      const hitCell = findNearestDensityCell(clientX, clientY);
      pinnedDensityCell = hitCell;
      hoveredDensityCell = hitCell;
      setInspectionDensityCell(pinnedDensityCell, Boolean(pinnedDensityCell));
      requestRender();
    }

    if (dataLayerMode === 'generation-heatmap') {
      if (movedDuringDrag) {
        movedDuringDrag = false;
        return;
      }

      const hitCell = findNearestGenerationHeatmapCell(clientX, clientY);
      pinnedGenerationHeatmapCell = hitCell;
      hoveredGenerationHeatmapCell = hitCell;
      setInspectionGenerationHeatmapCell(pinnedGenerationHeatmapCell, Boolean(pinnedGenerationHeatmapCell));
      requestRender();
    }

    return;
  }

  if (movedDuringDrag) {
    movedDuringDrag = false;
    return;
  }

  if (activeDetailTab === 'radius') {
    if (isRadiusFrozen) {
      isRadiusFrozen = false;
      updateHoverCircleSelection(clientX, clientY);
    } else {
      updateHoverCircleSelection(clientX, clientY);
      if (hoverCircleCenter) {
        isRadiusFrozen = true;
      }
    }
    updateCanvasCursor();
    requestRender();
    return;
  }

  if (activeDetailTab !== 'inspection') {
    return;
  }

  const hitNode = findNearestNode(clientX, clientY);
  pinnedNode = hitNode;
  hoveredNode = hitNode;
  setInspectionNode(pinnedNode, Boolean(pinnedNode));
  requestRender();
}

canvas.addEventListener('click', (event) => {
  if (Date.now() < suppressMouseUntil) {
    return;
  }
  handleCanvasSelectionAt(event.clientX, event.clientY);
});

canvas.addEventListener(
  'touchstart',
  (event) => {
    if (!event.touches || event.touches.length !== 1) {
      return;
    }
    const touch = event.touches[0];
    isDragging = true;
    movedDuringDrag = false;
    previousMouseX = touch.clientX;
    previousMouseY = touch.clientY;
    updateHoveredNode({ clientX: touch.clientX, clientY: touch.clientY });
    updateCanvasCursor();
  },
  { passive: true },
);

canvas.addEventListener(
  'touchmove',
  (event) => {
    if (!event.touches || event.touches.length !== 1 || !isDragging) {
      return;
    }
    event.preventDefault();
    const touch = event.touches[0];
    const dx = touch.clientX - previousMouseX;
    const dy = touch.clientY - previousMouseY;
    previousMouseX = touch.clientX;
    previousMouseY = touch.clientY;

    if (Math.abs(dx) + Math.abs(dy) > 0) {
      movedDuringDrag = true;
    }

    orbit.yaw -= dx * orbit.dragSensitivity;
    orbit.pitch += dy * orbit.dragSensitivity;
    orbit.pitch = Math.max(orbit.minPitch, Math.min(orbit.maxPitch, orbit.pitch));
    requestRender();
  },
  { passive: false },
);

canvas.addEventListener(
  'touchend',
  (event) => {
    const touch = event.changedTouches && event.changedTouches[0];
    isDragging = false;
    if (touch && !movedDuringDrag) {
      handleCanvasSelectionAt(touch.clientX, touch.clientY);
    }
    movedDuringDrag = false;
    suppressMouseUntil = Date.now() + 600;
    updateCanvasCursor();
  },
  { passive: true },
);

canvas.addEventListener('touchcancel', () => {
  movedDuringDrag = false;
  isDragging = false;
  updateCanvasCursor();
});

canvas.addEventListener(
  'wheel',
  (event) => {
    event.preventDefault();
    orbit.distance *= 1 + event.deltaY * orbit.zoomSensitivity;
    orbit.distance = Math.max(orbit.minDistance, Math.min(orbit.maxDistance, orbit.distance));
    requestRender();
  },
  { passive: false },
);

function buildLandmarkLabels(stateName) {
  if (landmarkOverlay) {
    landmarkOverlay.innerHTML = '';
  }
  landmarkLabels = [];
  if (!currentProjection) {
    return;
  }
  const hardcodedCities = LANDMARKS_BY_STATE[stateName] || [];
  const generatedCities = generatedLandmarksByState[stateName] || [];
  const cities = hardcodedCities.length > 0 ? hardcodedCities : generatedCities;
  for (let i = 0; i < cities.length; i += 1) {
    const city = cities[i];
    const [wx, , wz] = currentProjection.project(city.lon, city.lat, 0.01);
    const el = document.createElement('span');
    el.className = 'landmark-label';
    if (i < 6) {
      el.classList.add('is-major');
    }
    el.textContent = city.name;
    el.style.opacity = '0';
    // Add hover event listeners for dimming effect
    el.addEventListener('mouseenter', () => {
      el.style.filter = 'brightness(20%)';
    });
    el.addEventListener('mouseleave', () => {
      el.style.filter = '';
    });
    if (landmarkOverlay) {
      landmarkOverlay.appendChild(el);
    }
    landmarkLabels.push({ el, wx, wz, rank: i, screenX: 0, screenY: 0 });
  }
}

function updateLandmarkLabelPositions() {
  if (!landmarkOverlay || landmarkLabels.length === 0) {
    return;
  }

  if (!landmarkLabelsEnabled) {
    for (const label of landmarkLabels) {
      label.el.style.opacity = '0';
    }
    return;
  }

  const rect = canvas.getBoundingClientRect();
  const hasPointer = lastPointerClientX !== null && lastPointerClientY !== null;
  const mx = hasPointer ? lastPointerClientX - rect.left : null;
  const my = hasPointer ? lastPointerClientY - rect.top : null;

  const DIM_RADIUS = 260;  // px: proximity at which dimming starts
  const MIN_OPACITY = 0.20; // opacity when pointer is directly over
  const MAX_OPACITY = 0.96; // resting opacity
  const OVERLAP_PADDING = 7;
  const candidates = [];

  for (const label of landmarkLabels) {
    const screen = worldPointToScreen(label.wx, 0.01, label.wz);
    if (!screen || screen.x < -60 || screen.x > rect.width + 60 || screen.y < -30 || screen.y > rect.height + 30) {
      label.el.style.opacity = '0';
      continue;
    }
    label.screenX = screen.x;
    label.screenY = screen.y;
    label.el.style.left = `${screen.x}px`;
    label.el.style.top = `${screen.y}px`;

    let opacity = MAX_OPACITY;
    const width = Math.max(8, label.el.offsetWidth);
    const height = Math.max(8, label.el.offsetHeight);
    if (mx !== null && my !== null) {
      const dx = screen.x - mx;
      const dy = screen.y - my;
      const dist = Math.hypot(dx, dy);
      const halfW = width * 0.5;
      const halfH = height * 0.5;
      const pointerInsideLabel = mx >= (screen.x - halfW) && mx <= (screen.x + halfW)
        && my >= (screen.y - halfH) && my <= (screen.y + halfH);
      if (pointerInsideLabel) {
        opacity = MIN_OPACITY;
      } else if (dist < DIM_RADIUS) {
        const t = dist / DIM_RADIUS;
        opacity = MIN_OPACITY + (MAX_OPACITY - MIN_OPACITY) * t;
      }
    }
    candidates.push({
      label,
      opacity,
      rank: label.rank,
      width,
      height,
    });
  }

  candidates.sort((a, b) => a.rank - b.rank);
  const placedBoxes = [];
  for (const candidate of candidates) {
    const halfW = candidate.width * 0.5 + OVERLAP_PADDING;
    const halfH = candidate.height * 0.5 + OVERLAP_PADDING;
    const box = {
      x0: candidate.label.screenX - halfW,
      y0: candidate.label.screenY - halfH,
      x1: candidate.label.screenX + halfW,
      y1: candidate.label.screenY + halfH,
    };

    const overlaps = placedBoxes.some((placed) => {
      if (box.x1 < placed.x0) return false;
      if (box.x0 > placed.x1) return false;
      if (box.y1 < placed.y0) return false;
      if (box.y0 > placed.y1) return false;
      return true;
    });

    if (overlaps) {
      candidate.label.el.style.opacity = '0';
      continue;
    }

    candidate.label.el.style.opacity = candidate.opacity.toFixed(3);
    placedBoxes.push(box);
  }
}

function render() {
  resizeCanvas();

  const aspect = canvas.width / Math.max(canvas.height, 1);
  lastProjectionMatrix = perspectiveMatrix(Math.PI / 3, aspect, 0.1, 100);
  lastViewMatrix = lookAtMatrix(getCameraEye(), cameraTarget, cameraUp);
  lastModelMatrix = identityMatrix();
  updateNodeScreenPositions();
  updateDensityCellScreenPositions();
  updateGenerationHeatmapCellScreenPositions();
  updateLandmarkLabelPositions();

  gl.clearColor(0.01, 0.03, 0.08, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  if (dataLayerMode === 'infrastructure') {
    gl.depthMask(false);
    drawHalos(haloBuffer, haloVertexCount);
    gl.depthMask(true);
  }

  drawLines(gridBuffer, gridVertexCount, new Float32Array([0.22, 0.33, 0.44, 1.0]));
  drawHoverCircle();

  if (dataLayerMode === 'solar-density') {
    drawFilledCells(solarDensityBuffer, solarDensityVertexCount);
    drawStateOutlineHolographic(1.0);
    drawDensityCellHighlights();
  } else if (dataLayerMode === 'generation-heatmap') {
    drawFilledCells(generationHeatmapBuffer, generationHeatmapVertexCount);
    drawStateOutlineHolographic(1.0);
    drawGenerationHeatmapCellHighlights();
  } else {
    const outlineVisible = !isLegendSourceHidden('outline');
    const outlineA = !outlineVisible ? 0.0 : ((!legendHoverSource || legendHoverSource === 'outline') ? 1.0 : 0.12);
    const transmissionLineA = getTransmissionHoverAlpha('transmission-line', 1.0, 0.12);
    const transmissionMinorLineA = getTransmissionHoverAlpha('transmission-minor-line', 1.0, 0.12);
    const transmissionCableA = getTransmissionHoverAlpha('transmission-cable', 1.0, 0.12);
    drawStateOutlineHolographic(outlineA);
    if (transmissionLineVertexCount > 0) {
      drawLines(transmissionLineBuffer, transmissionLineVertexCount, new Float32Array([
        TRANSMISSION_TYPE_COLORS.line[0],
        TRANSMISSION_TYPE_COLORS.line[1],
        TRANSMISSION_TYPE_COLORS.line[2],
        transmissionLineA,
      ]));
    }
    if (transmissionMinorLineVertexCount > 0) {
      drawLines(transmissionMinorLineBuffer, transmissionMinorLineVertexCount, new Float32Array([
        TRANSMISSION_TYPE_COLORS.minorLine[0],
        TRANSMISSION_TYPE_COLORS.minorLine[1],
        TRANSMISSION_TYPE_COLORS.minorLine[2],
        transmissionMinorLineA,
      ]));
    }
    if (transmissionCableVertexCount > 0) {
      drawLines(transmissionCableBuffer, transmissionCableVertexCount, new Float32Array([
        TRANSMISSION_TYPE_COLORS.cable[0],
        TRANSMISSION_TYPE_COLORS.cable[1],
        TRANSMISSION_TYPE_COLORS.cable[2],
        transmissionCableA,
      ]));
    }
    drawPoints(substationBuffer, substationVertexCount);
    drawPoints(consumerBuffer, consumerVertexCount);
    drawPoints(plantBuffer, plantVertexCount);
    drawPoints(ghostPowerBuffer, ghostPowerVertexCount);
    if (radiusNodeEffectsEnabled && activeDetailTab === 'radius') {
      drawPowerSpikes();
      drawConsumerSparkles();
    }
    drawInteractionHighlights();
  }

}

dataLayerSelect.addEventListener('change', async (event) => {
  dataLayerMode = event.target.value;
  applyLegendFilter(null);
  densityLegend.classList.toggle('is-hidden', dataLayerMode !== 'solar-density');
  generationHeatmapLegend.classList.toggle('is-hidden', dataLayerMode !== 'generation-heatmap');
  generationSubtypeLabel.classList.toggle('is-hidden', dataLayerMode !== 'generation-heatmap');
  generationSubtypeSelect.classList.toggle('is-hidden', dataLayerMode !== 'generation-heatmap');
  hoverCircleCenter = null;
  nodesInHoverCircle = [];
  hoverCircleTotalOutputMW = 0;

  if (dataLayerMode === 'solar-density') {
    pinnedNode = null;
    hoveredNode = null;
    setRadiusStats(false);
    setInspectionDensityCell(pinnedDensityCell || hoveredDensityCell, Boolean(pinnedDensityCell));
  } else if (dataLayerMode === 'generation-heatmap') {
    pinnedNode = null;
    hoveredNode = null;
    pinnedDensityCell = null;
    hoveredDensityCell = null;
    pinnedGenerationHeatmapCell = null;
    hoveredGenerationHeatmapCell = null;
    setRadiusStats(false);
    setInspectionGenerationHeatmapCell(null, false);
  } else {
    pinnedDensityCell = null;
    hoveredDensityCell = null;
    pinnedGenerationHeatmapCell = null;
    hoveredGenerationHeatmapCell = null;
    setRadiusStats(false);
    setInspectionNode(pinnedNode || hoveredNode, Boolean(pinnedNode));
  }

  setActiveDetailTab(dataLayerMode === 'infrastructure' ? 'radius' : 'inspection');
  updateCanvasCursor();

  await setOutlineForState(selectedStateName);
});

detailTabNode?.addEventListener('click', () => {
  setActiveDetailTab('inspection');
});

detailTabRadius?.addEventListener('click', () => {
  setActiveDetailTab('radius');
});

radiusSubtabOverview?.addEventListener('click', () => {
  setActiveRadiusSubtab('overview');
});

radiusSubtabSubstations?.addEventListener('click', () => {
  setActiveRadiusSubtab('substations');
});

radiusSubtabPowerLines?.addEventListener('click', () => {
  setActiveRadiusSubtab('power-lines');
});

radiusSubtabGhostProjects?.addEventListener('click', () => {
  setActiveRadiusSubtab('ghost-projects');
});

radiusSizeSlider?.addEventListener('input', (event) => {
  handleRadiusSizeInput(event.target.value);
});

radiusEffectsCheckbox?.addEventListener('change', (event) => {
  radiusNodeEffectsEnabled = Boolean(event.target.checked);
  syncLegendUiState();
  requestRender();
});

landmarkLabelsCheckbox?.addEventListener('change', (event) => {
  landmarkLabelsEnabled = Boolean(event.target.checked);
  syncLegendUiState();
  requestRender();
});

stateTotalsButton?.addEventListener('click', () => {
  openStateTotalsPopover();
});

stateTotalsPopoverClose?.addEventListener('click', () => {
  closeStateTotalsPopover();
});

stateTotalsPopoverBackdrop?.addEventListener('click', () => {
  closeStateTotalsPopover();
});

sourcesButton?.addEventListener('click', () => {
  openSourcesPopover();
});

sourcesPopoverClose?.addEventListener('click', () => {
  closeSourcesPopover();
});

sourcesPopoverBackdrop?.addEventListener('click', () => {
  closeSourcesPopover();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && stateTotalsPopover && !stateTotalsPopover.classList.contains('is-hidden')) {
    closeStateTotalsPopover();
  }
  if (event.key === 'Escape' && sourcesPopover && !sourcesPopover.classList.contains('is-hidden')) {
    closeSourcesPopover();
  }
});

window.addEventListener('resize', () => {
  requestRender();
});

setActiveRadiusSubtab(activeRadiusSubtab);

generationSubtypeSelect.addEventListener('change', async (event) => {
  generationSubtypeMode = event.target.value;
  if (dataLayerMode === 'generation-heatmap') {
    await setOutlineForState(selectedStateName);
  }
});

if (legendFloat) {
  legendFloat.addEventListener('mouseover', (e) => {
    if (e.target.closest('.legend-toggle-input')) {
      return;
    }
    const li = e.target.closest('[data-legend-source]');
    if (!li) return;
    const source = li.dataset.legendSource;
    if (NON_INTERACTIVE_LEGEND_SOURCES.has(source)) {
      applyLegendFilter(null);
      return;
    }
    applyLegendFilter(source);
  });
  legendFloat.addEventListener('mouseleave', () => {
    applyLegendFilter(null);
  });

  legendFloat.addEventListener('click', (e) => {
    if (e.target.closest('.legend-toggle-input')) {
      return;
    }
    const li = e.target.closest('li[data-legend-source]');
    if (!li) {
      return;
    }

    const source = li.dataset.legendSource;
    if (NON_INTERACTIVE_LEGEND_SOURCES.has(source)) {
      return;
    }

    const allCurrentlyOn = TOGGLEABLE_LEGEND_SOURCES.every((s) => !hiddenLegendSources.has(s));
    if (allCurrentlyOn) {
      hiddenLegendSources = new Set(TOGGLEABLE_LEGEND_SOURCES.filter((s) => s !== source));
    } else if (hiddenLegendSources.has(source)) {
      hiddenLegendSources.delete(source);
    } else {
      hiddenLegendSources.add(source);
    }

    applyLegendVisibilityState();
  });
}

if (legendShowAllButton) {
  legendShowAllButton.addEventListener('click', () => {
    hiddenLegendSources = new Set();
    applyLegendVisibilityState();
  });
}

if (legendHideAllButton) {
  legendHideAllButton.addEventListener('click', () => {
    hiddenLegendSources = new Set(TOGGLEABLE_LEGEND_SOURCES);
    applyLegendVisibilityState();
  });
}

ensureLegendToggleCheckboxes();
applyMobileDockLayout();
syncLegendUiState();
updateRadiusControlValueLabel();
updateRadiusControlVisibility();
updateCameraTargetForLayout();

loadStates()
  .then(() => {
    setActiveDetailTab('radius');
    updateCanvasCursor();
    requestRender();
  })
  .catch((error) => {
    stateSummary.textContent = 'Failed to load state coordinates.';
    console.error(error);
  });
