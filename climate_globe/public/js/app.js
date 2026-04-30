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
let oceanParticleSystem = null;
let oceanColorAttr = null; // BufferAttribute for ocean particle colors
let earthMat = null;
let thermalViewActive = false;
let earthOriginalTexture = null;
let usStatesData = null;
let usStateBorders = null;
let selectedState = null;
let selectedOcean = false;
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
const geoIso3ByName = new Map();
const temperatureByIso3 = new Map();

// camera focus animation state
let focusActive = false;
let focusProgress = 0;
let focusStartPos = new THREE.Vector3();
let focusEndPos = new THREE.Vector3();
let focusStartTarget = new THREE.Vector3();
let focusEndTarget = new THREE.Vector3();

// render optimization
let needsRender = 60;

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
const hoverTooltipTemp = document.getElementById('hoverTooltipTemp');

// NASA temperature anomaly grid (Feb 2026 vs 1951–1980)
let nasaTempGrid = null;
// chart panel
const chartPanel = document.getElementById('chartPanel');
const chartTitle = document.getElementById('chartTitle');
const chartSubtitle = document.getElementById('chartSubtitle');
const chartSources = document.getElementById('chartSources');
const trendChart = document.getElementById('trendChart');
const trendCtx = trendChart ? trendChart.getContext('2d') : null;
const metricGroupTabs = document.getElementById('metricGroupTabs');
const metricButtons = document.getElementById('metricButtons');
const metricSubcontrols = document.getElementById('metricSubcontrols');
const chartTooltip = document.getElementById('chartTooltip');
const chartDot = document.getElementById('chartDot');
const snapshotPanel = document.getElementById('snapshotPanel');
const snapshotTitle = document.getElementById('snapshotTitle');
const snapshotTabButtons = document.getElementById('snapshotTabButtons');
const snapshotContent = document.getElementById('snapshotContent');
const co2Ribbon = document.getElementById('co2Ribbon');
const co2RibbonTrack = document.getElementById('co2RibbonTrack');
const co2RibbonTooltip = document.getElementById('co2RibbonTooltip');
const thermalToggleBtn = document.getElementById('thermalToggleBtn');
const sourcesOpenBtn = document.getElementById('sourcesOpenBtn');
const sourcesModal = document.getElementById('sourcesModal');
const sourcesModalBackdrop = document.getElementById('sourcesModalBackdrop');
const sourcesCloseBtn = document.getElementById('sourcesCloseBtn');
const dockTabs = document.getElementById('dockTabs');
const chartEmpty = document.getElementById('chartEmpty');
const snapshotEmpty = document.getElementById('snapshotEmpty');
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

function setDockTab(tabId) {
  if (!tabId) return;
  document.querySelectorAll('.dock-tab').forEach((button) => {
    button.classList.toggle('active', button.dataset.dockTab === tabId);
  });
  document.querySelectorAll('.dock-pane').forEach((pane) => {
    pane.classList.toggle('active', pane.dataset.dockPane === tabId);
  });
}

function updateDockEmptyStates() {
  if (chartEmpty && chartPanel) {
    chartEmpty.classList.toggle('visible', chartPanel.style.display !== 'block');
  }
  if (snapshotEmpty && snapshotPanel) {
    snapshotEmpty.classList.toggle('visible', snapshotPanel.style.display !== 'block');
  }
}

if (dockTabs) {
  dockTabs.addEventListener('click', (event) => {
    const button = event.target.closest('[data-dock-tab]');
    if (!button) return;
    setDockTab(button.dataset.dockTab || 'trends');
  });
}

if (snapshotPanel) {
  ['pointerdown', 'pointerup', 'click', 'dblclick', 'wheel'].forEach((evt) => {
    snapshotPanel.addEventListener(evt, (e) => {
      e.stopPropagation();
    });
  });
}

function setSourcesModalOpen(open) {
  if (!sourcesModal) return;
  sourcesModal.classList.toggle('open', !!open);
  sourcesModal.setAttribute('aria-hidden', open ? 'false' : 'true');
}

if (sourcesOpenBtn && sourcesModal) {
  sourcesOpenBtn.addEventListener('click', () => setSourcesModalOpen(true));
}

if (sourcesCloseBtn && sourcesModal) {
  sourcesCloseBtn.addEventListener('click', () => setSourcesModalOpen(false));
}

if (sourcesModalBackdrop && sourcesModal) {
  sourcesModalBackdrop.addEventListener('click', () => setSourcesModalOpen(false));
}

if (sourcesModal) {
  sourcesModal.addEventListener('click', (e) => {
    if (e.target === sourcesModal) {
      setSourcesModalOpen(false);
    }
  });
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && sourcesModal && sourcesModal.classList.contains('open')) {
    setSourcesModalOpen(false);
  }
});

const YEAR_START = 1950;
const YEAR_END = 2025;
const YEARS = Array.from({ length: YEAR_END - YEAR_START + 1 }, (_, i) => YEAR_START + i);
const GDP_CLIMATE_YEARS = Array.from({ length: 28 }, (_, i) => 2023 + i); // IMF projections 2023–2050
const OCEAN_SEA_LEVEL_YEARS = Array.from({ length: 2026 - 1993 + 1 }, (_, i) => 1993 + i); // NOAA altimetry 1993–2026

// Plain-English descriptions shown below the chart title for each climate-GDP scenario
const GDP_SCENARIO_DESC = {
  climate_gdp_hot_house: 'No climate policy — damages accumulate unchecked. Each value = % of that country\'s entire annual GDP lost to climate impacts that year. e.g. −2% on a $20T economy = $400B in losses that year.',
  climate_gdp_delayed: 'Action delayed until ~2030, then a rapid forced transition. Transition costs come first; outcomes vary. Negative = GDP lost, positive = GDP saved vs. full inaction.',
  climate_gdp_net_zero: 'Decisive early action reaches global Net Zero by 2050. Positive values = GDP saved or gained vs. doing nothing. e.g. +2% on a $20T economy = $400B/yr in avoided damages.',
};

const METRIC_EXPLAINER_DESC = {
  carbon_intensity: 'How much CO2 is emitted per unit of electricity generated. Lower values mean cleaner electricity supply.',
  land_use_change_co2: 'CO2 emissions from land-use changes such as deforestation and peatland drainage. Positive values indicate net emissions.',
};

const metricData = {
  renewables: new Map(),
  coal_share: new Map(),
  gas_share: new Map(),
  hydropower_share: new Map(),
  solar_share: new Map(),
  wind_share: new Map(),
  oil_share: new Map(),
  nuclear_share: new Map(),
  other_renewables_share: new Map(),
  bioenergy_share: new Map(),
  electricity_generation_total: new Map(),
  energy_use_per_person: new Map(),
  electricity_access_share: new Map(),
  ev_sales_share: new Map(),
  population: new Map(),
  emissions_total: new Map(),
  gdp: new Map(),
  gen_cost_coal: new Map(),
  gen_cost_gas: new Map(),
  gen_cost_hydro: new Map(),
  gen_cost_solar: new Map(),
  gen_cost_wind: new Map(),
  gen_cost_oil: new Map(),
  gen_cost_nuclear: new Map(),
  gen_cost_other_renewables: new Map(),
  electricity_cost: new Map(),
  carbon_intensity: new Map(),
  temperature_change: new Map(),
  extreme_weather_deaths: new Map(),
  insurance_cost: new Map(),
  // New metrics
  emissions_per_capita: new Map(),
  methane_emissions: new Map(),
  land_use_change_co2: new Map(),
  wildfire_burned_area: new Map(),
};

const stateData = {
  renewables: new Map(),
  population: new Map(),
  emissions_total: new Map(),
  gdp: new Map(),
  insurance_cost: new Map(),
  wildfire_acres: new Map(),
  drought_severity: new Map(),
};

// Snapshot lookup maps for new per-country fields
const carbonPriceByNormCountry = new Map();
const fossilFuelSubsidiesByNormCountry = new Map();
const ndcStatusByNormCountry = new Map();
const seaLevelRise2026ByIso3 = new Map();

const metricMeta = {
  renewables: { label: 'Renewable share (%)', unit: '%' },
  coal_share: { label: 'Electricity from coal (%)', unit: '%' },
  gas_share: { label: 'Electricity from gas (%)', unit: '%' },
  hydropower_share: { label: 'Electricity from hydropower (%)', unit: '%' },
  solar_share: { label: 'Electricity from solar (%)', unit: '%' },
  wind_share: { label: 'Electricity from wind (%)', unit: '%' },
  oil_share: { label: 'Electricity from oil (%)', unit: '%' },
  nuclear_share: { label: 'Electricity from nuclear (%)', unit: '%' },
  other_renewables_share: { label: 'Electricity from other renewables (%)', unit: '%' },
  bioenergy_share: { label: 'Electricity from bioenergy (%)', unit: '%' },
  electricity_generation_total: { label: 'Total electricity generation', unit: 'TWh' },
  energy_use_per_person: { label: 'Energy use per person', unit: 'kWh' },
  electricity_access_share: { label: 'Population with access to electricity', unit: '%' },
  ev_sales_share: { label: 'EV share of new car sales', unit: '%' },
  population: { label: 'Population', unit: 'people' },
  emissions_total: { label: 'CO₂ emissions (total)', unit: 't' },
  gdp: { label: 'GDP (Penn World Table)', unit: 'USD' },
  gen_cost_coal: { label: 'Generation cost — coal', unit: 'USD/MWh' },
  gen_cost_gas: { label: 'Generation cost — gas', unit: 'USD/MWh' },
  gen_cost_hydro: { label: 'Generation cost — hydro', unit: 'USD/MWh' },
  gen_cost_solar: { label: 'Generation cost — solar', unit: 'USD/MWh' },
  gen_cost_wind: { label: 'Generation cost — wind', unit: 'USD/MWh' },
  gen_cost_oil: { label: 'Generation cost — oil', unit: 'USD/MWh' },
  gen_cost_nuclear: { label: 'Generation cost — nuclear', unit: 'USD/MWh' },
  gen_cost_other_renewables: { label: 'Generation cost — other renewables', unit: 'USD/MWh' },
  electricity_cost: { label: 'Electricity cost (household retail)', unit: 'USD/kWh' },
  carbon_intensity: { label: 'Carbon intensity of electricity', unit: 'gCO₂/kWh' },
  temperature_change: { label: 'Surface temperature change', unit: '°C' },
  extreme_weather_deaths: { label: 'Deaths from extreme weather', unit: 'deaths' },
  insurance_cost: { label: 'Homeowners insurance premium', unit: 'USD' },
  insurance_cost_yoy: { label: 'Homeowners insurance premium (YoY change)', unit: '%' },
  climate_gdp_hot_house: { label: 'Cost of No Climate Action (% of GDP/yr)', unit: '% of GDP' },
  climate_gdp_delayed: { label: 'Cost of Delayed Climate Action (% of GDP/yr)', unit: '% of GDP' },
  climate_gdp_net_zero: { label: 'Benefit of Early Climate Action (% of GDP/yr)', unit: '% of GDP' },
  // New metrics
  emissions_per_capita: { label: 'CO\u2082 per capita', unit: 't/person' },
  methane_emissions: { label: 'Methane emissions', unit: 'MtCO\u2082e' },
  land_use_change_co2: { label: 'Land-use change CO\u2082', unit: 'MtCO\u2082' },
  wildfire_burned_area: { label: 'Wildfire burned area', unit: 'kHa' },
  wildfire_acres:       { label: 'Wildfire burned area', unit: 'acres' },
  drought_severity:     { label: 'Area in drought (D1+)', unit: '%' },
};

let selectedMetric = 'renewables';
let selectedMetricGroup = 'electricity';
let lastChartSeries = null;
let lastChartUnit = null;
let lastChartLabel = null;
let lastChartYears = null; // null → use global YEARS; set for projection-type metrics

// Climate-GDP projection data keyed by ISO3 country code (IMF/NGFS dataset)
const gdpClimateDataByISO3 = {
  climate_gdp_hot_house: new Map(), // iso3 → Map<year, value>
  climate_gdp_delayed: new Map(),
  climate_gdp_net_zero: new Map(),
};

const heatwaveDaysByIso3 = new Map();
const extremeWeatherEventsByIso3 = new Map();
const batteryStorageCapacity2023ByNormCountry = new Map();
const coalUnitsShutdownByNormCountry = new Map();
const climateResilienceByIso3 = new Map();
const energyTrade2026ByNormCountry = new Map();

const CLIMATE_RESILIENCE_KEYS = [
  'sea_level_exposure_pop_below_5m_pct',
  'flood_deaths_latest',
  'drought_deaths_latest',
  'wildfire_deaths_latest',
  'heat_deaths_latest',
  'cereal_yield_anomaly_pct_latest',
  'water_stress_pct_latest',
  'freshwater_resources_per_capita_m3_latest',
  'pm25_ug_m3_latest',
  'air_pollution_death_rate_per_100k_latest',
  'nd_gain_readiness_latest',
  'coal_share_latest_pct',
];

const METRIC_BUTTON_LABELS = {
  renewables: 'Renewables',
  coal_share: 'Coal',
  gas_share: 'Gas',
  hydropower_share: 'Hydropower',
  solar_share: 'Solar',
  wind_share: 'Wind',
  oil_share: 'Oil',
  nuclear_share: 'Nuclear',
  other_renewables_share: 'Other Renewables',
  bioenergy_share: 'Bioenergy',
  electricity_generation_total: 'Electricity Generation',
  energy_use_per_person: 'Energy / Person',
  electricity_access_share: 'Electricity Access',
  ev_sales_share: 'EV Sales Share',
  population: 'Population',
  emissions_total: 'CO₂ Total',
  gdp: 'GDP',
  gen_cost_coal: 'Coal',
  gen_cost_gas: 'Gas',
  gen_cost_hydro: 'Hydro',
  gen_cost_solar: 'Solar',
  gen_cost_wind: 'Wind',
  gen_cost_oil: 'Oil',
  gen_cost_nuclear: 'Nuclear',
  gen_cost_other_renewables: 'Other Renewables',
  electricity_cost: 'Electricity Cost',
  insurance_cost: 'Insurance Cost',
  insurance_cost_yoy: 'Insurance Cost YoY %',
  temperature_change: 'Temp Change',
  extreme_weather_deaths: 'Extreme Weather Deaths',
  carbon_intensity: 'Carbon Intensity',
  climate_gdp_hot_house: '🔴 No Mitigation',
  climate_gdp_delayed: '🟡 Late Action',
  climate_gdp_net_zero: '🟢 Net Zero 2050',
  emissions_per_capita: 'CO\u2082 / Person',
  methane_emissions: 'Methane',
  land_use_change_co2: 'Land-Use CO\u2082',
  wildfire_burned_area: 'Wildfire Area',
  wildfire_acres: 'Wildfire Acres',
  drought_severity: 'Drought Severity',
};

const SRC_OWID_RENEWABLES = [
  { label: 'Source', href: 'https://ourworldindata.org/grapher/share-electricity-renewables' },
  { label: 'Raw', href: 'data/share-electricity-renewables/share-electricity-renewables.csv' },
];
const SRC_OWID_SOURCE_MIX = [
  { label: 'Source', href: 'https://ourworldindata.org/grapher/share-elec-by-source' },
  { label: 'Raw', href: 'data/share-elec-by-source/share-elec-by-source.csv' },
];
const SRC_OWID_ELEC_GEN = [
  { label: 'Source', href: 'https://ourworldindata.org/grapher/electricity-generation' },
  { label: 'Raw', href: 'data/electricity-generation/electricity-generation.csv' },
];
const SRC_OWID_ENERGY_PER_PERSON = [
  { label: 'Source', href: 'https://ourworldindata.org/grapher/energy-use-per-person' },
  { label: 'Raw', href: 'data/energy-use-per-person/energy-use-per-person.csv' },
];
const SRC_OWID_ELEC_ACCESS = [
  { label: 'Source', href: 'https://ourworldindata.org/grapher/share-of-the-population-with-access-to-electricity' },
  { label: 'Raw', href: 'data/share-of-the-population-with-access-to-electricity/share-of-the-population-with-access-to-electricity.csv' },
];
const SRC_OWID_EV = [
  { label: 'Source', href: 'https://ourworldindata.org/grapher/share-car-sales-battery-plugin' },
  { label: 'Raw', href: 'data/share-car-sales-battery-plugin/share-car-sales-battery-plugin.csv' },
];
const SRC_OWID_POP = [
  { label: 'Source', href: 'https://ourworldindata.org/grapher/population' },
  { label: 'Raw', href: 'data/population/population.csv' },
];
const SRC_OWID_CO2 = [
  { label: 'Source', href: 'https://ourworldindata.org/grapher/annual-co-emissions-by-region' },
  { label: 'Raw', href: 'data/annual-co-emissions-by-region/annual-co-emissions-by-region.csv' },
];
const SRC_OWID_GDP = [
  { label: 'Source', href: 'https://ourworldindata.org/grapher/gdp-penn-world-table' },
  { label: 'Raw', href: 'data/gdp-penn-world-table/gdp-penn-world-table.csv' },
];
const SRC_OWID_CARBON_INTENSITY = [
  { label: 'Source', href: 'https://ourworldindata.org/grapher/carbon-intensity-electricity' },
  { label: 'Raw', href: 'data/carbon-intensity-electricity/carbon-intensity-electricity.csv' },
];
const SRC_IMF_TEMP = [
  { label: 'Source', href: 'https://climatedata.imf.org/datasets/4063314923d74187be9596f10d034914_0/about' },
  { label: 'Raw', href: 'data/Indicator_3_1_Climate_Indicators_Annual_Mean_Global_Surface_Temperature_6121427861384429071.csv' },
];
const SRC_OWID_DISASTER_DEATHS = [
  { label: 'Source', href: 'https://ourworldindata.org/grapher/number-of-deaths-from-natural-disasters' },
  { label: 'Raw', href: 'data/number-of-deaths-from-natural-disasters/number-of-deaths-from-natural-disasters.csv' },
];
const SRC_CLIMATE_GDP = [
  { label: 'Source', href: 'https://www.ngfs.net/ngfs-scenarios-portal/' },
  { label: 'Raw', href: 'data/Climate_GDP_Losses_Benefits.csv' },
];
const SRC_OWID_CO2_PER_CAPITA = [
  { label: 'Source', href: 'https://ourworldindata.org/co2-and-other-greenhouse-gas-emissions' },
  { label: 'Raw', href: 'data/co2_per_capita_by_country_owid.csv' },
];
const SRC_OWID_METHANE = [
  { label: 'Source', href: 'https://ourworldindata.org/methane' },
  { label: 'Raw', href: 'data/methane_by_country_owid.csv' },
];
const SRC_OWID_LUC = [
  { label: 'Source', href: 'https://ourworldindata.org/co2-and-other-greenhouse-gas-emissions' },
  { label: 'Raw', href: 'data/land_use_change_co2_by_country_owid.csv' },
];
const SRC_GWIS_WILDFIRE = [
  { label: 'Source', href: 'https://gwis.jrc.ec.europa.eu/apps/country.profile/overview' },
  { label: 'Raw', href: 'data/wildfire_burned_area_by_country_gwis.csv' },
];
const SRC_NIFC_WILDFIRE = [
  { label: 'Source', href: 'https://www.nifc.gov/fire-information/statistics/wildfires' },
  { label: 'Raw', href: 'data/wildfire_burned_acres_by_state_nifc.csv' },
];
const SRC_NOAA_DROUGHT = [
  { label: 'Source', href: 'https://droughtmonitor.unl.edu/DmData/DataDownload/ComprehensiveStatistics.aspx' },
  { label: 'Raw', href: 'data/drought_severity_by_state_noaa.csv' },
];

const CHART_METRIC_SOURCES_COUNTRY = {
  renewables: SRC_OWID_RENEWABLES,
  coal_share: SRC_OWID_SOURCE_MIX,
  gas_share: SRC_OWID_SOURCE_MIX,
  hydropower_share: SRC_OWID_SOURCE_MIX,
  solar_share: SRC_OWID_SOURCE_MIX,
  wind_share: SRC_OWID_SOURCE_MIX,
  oil_share: SRC_OWID_SOURCE_MIX,
  nuclear_share: SRC_OWID_SOURCE_MIX,
  other_renewables_share: SRC_OWID_SOURCE_MIX,
  bioenergy_share: SRC_OWID_SOURCE_MIX,
  electricity_generation_total: SRC_OWID_ELEC_GEN,
  energy_use_per_person: SRC_OWID_ENERGY_PER_PERSON,
  electricity_access_share: SRC_OWID_ELEC_ACCESS,
  ev_sales_share: SRC_OWID_EV,
  population: SRC_OWID_POP,
  emissions_total: SRC_OWID_CO2,
  gdp: SRC_OWID_GDP,
  carbon_intensity: SRC_OWID_CARBON_INTENSITY,
  temperature_change: SRC_IMF_TEMP,
  extreme_weather_deaths: SRC_OWID_DISASTER_DEATHS,
  climate_gdp_hot_house: SRC_CLIMATE_GDP,
  climate_gdp_delayed: SRC_CLIMATE_GDP,
  climate_gdp_net_zero: SRC_CLIMATE_GDP,
  emissions_per_capita: SRC_OWID_CO2_PER_CAPITA,
  methane_emissions: SRC_OWID_METHANE,
  land_use_change_co2: SRC_OWID_LUC,
  wildfire_burned_area: SRC_GWIS_WILDFIRE,
};

const CHART_METRIC_SOURCES_STATE = {
  renewables: [
    { label: 'Source', href: 'https://www.eia.gov/electricity/data/eia860/' },
    { label: 'Raw', href: 'data/existcapacity_annual.csv' },
  ],
  population: [
    { label: 'Source', href: 'https://github.com/JoshData/historical-state-population-csv' },
    { label: 'Raw', href: 'data/historical_state_population_by_year.csv' },
  ],
  emissions_total: [
    { label: 'Source', href: 'https://www.eia.gov/environment/emissions/state/' },
    { label: 'Raw', href: 'data/co2_emissions_by_state.csv' },
  ],
  gdp: [
    { label: 'Source', href: 'https://www.bea.gov/data/gdp/gdp-state' },
    { label: 'Raw', href: 'data/per_state_gdp.csv' },
  ],
  insurance_cost: [
    { label: 'Source', href: 'https://www.iii.org/table-archive/21407' },
    { label: 'Raw', href: 'data/state_homeowners_insurance_premiums.csv' },
  ],
  insurance_cost_yoy: [
    { label: 'Source', href: 'https://www.iii.org/table-archive/21407' },
    { label: 'Raw', href: 'data/state_homeowners_insurance_premiums.csv' },
  ],
  wildfire_acres: SRC_NIFC_WILDFIRE,
  drought_severity: SRC_NOAA_DROUGHT,
};

const CHART_METRIC_SOURCES_OCEAN = {
  ocean_acidity: [
    { label: 'Source', href: 'https://www.epa.gov/climate-indicators/climate-change-indicators-ocean-acidity' },
    { label: 'Raw', href: 'data/epa_ocean_data/ocean-acidity_fig-1.csv' },
  ],
  ocean_heat: [
    { label: 'Source', href: 'https://www.epa.gov/climate-indicators/climate-change-indicators-ocean-heat' },
    { label: 'Raw', href: 'data/epa_ocean_data/ocean-heat_fig-1.csv' },
  ],
  ocean_sea_level: [
    { label: 'Source', href: 'https://www.star.nesdis.noaa.gov/socd/lsa/SeaLevelRise/LSA_SLR_timeseries.php' },
    { label: 'Raw', href: 'https://www.star.nesdis.noaa.gov/socd/lsa/SeaLevelRise/slr/slr_sla_gbl_keep_ref_90.csv' },
    { label: 'Annual 1993-2026', href: 'data/ocean_sea_level_global_annual_2026_proxy.csv' },
    { label: 'Method', href: 'data/ocean_sea_level_global_annual_2026_proxy_method.md' },
  ],
  ocean_sst: [
    { label: 'Source', href: 'https://www.epa.gov/climate-indicators/climate-change-indicators-sea-surface-temperature' },
    { label: 'Raw', href: 'data/epa_ocean_data/sea-surface-temp_fig-1.csv' },
  ],
  arctic_sea_ice: [
    { label: 'Source', href: 'https://nsidc.org/data/seaice_index/' },
    { label: 'NSIDC G02135', href: 'https://nsidc.org/data/G02135/versions/3' },
    { label: 'Raw', href: 'data/arctic_sea_ice_nsidc_annual.csv' },
  ],
  antarctic_sea_ice: [
    { label: 'Source', href: 'https://nsidc.org/data/seaice_index/' },
    { label: 'NSIDC G02135', href: 'https://nsidc.org/data/G02135/versions/3' },
    { label: 'Raw', href: 'data/antarctic_sea_ice_nsidc_annual.csv' },
  ],
};

function renderChartSources(metricKey, contextType = 'country') {
  if (!chartSources) return;
  let sourceMap = CHART_METRIC_SOURCES_COUNTRY;
  if (contextType === 'state') sourceMap = CHART_METRIC_SOURCES_STATE;
  if (contextType === 'ocean') sourceMap = CHART_METRIC_SOURCES_OCEAN;

  const links = sourceMap[metricKey] || [];
  chartSources.innerHTML = '';

  if (!links.length) {
    chartSources.style.display = 'none';
    return;
  }

  const prefix = document.createElement('span');
  prefix.textContent = 'Sources:';
  chartSources.appendChild(prefix);

  links.forEach((src) => {
    const a = document.createElement('a');
    a.className = 'chart-source-link';
    a.href = src.href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = src.label;
    chartSources.appendChild(a);
  });

  chartSources.style.display = 'flex';
}

const COUNTRY_METRIC_GROUPS = [
  {
    id: 'electricity',
    label: 'Electricity',
    metrics: ['renewables', 'electricity_generation_total', 'energy_use_per_person', 'electricity_access_share', 'carbon_intensity'],
  },
  {
    id: 'generation_mix',
    label: 'Generation Mix',
    metrics: [
      'coal_share',
      'gas_share',
      'hydropower_share',
      'solar_share',
      'wind_share',
      'oil_share',
      'nuclear_share',
      'other_renewables_share',
      'bioenergy_share',
    ],
  },
  {
    id: 'economy',
    label: 'Economy & People',
    metrics: ['population', 'gdp', 'ev_sales_share'],
  },
  {
    id: 'climate',
    label: 'Climate',
    metrics: ['emissions_total', 'emissions_per_capita', 'methane_emissions', 'land_use_change_co2', 'temperature_change', 'extreme_weather_deaths', 'wildfire_burned_area'],
  },
  {
    id: 'climate_cost',
    label: 'Cost of Warming',
    metrics: ['climate_gdp_hot_house', 'climate_gdp_delayed', 'climate_gdp_net_zero'],
  },
];

const STATE_METRIC_GROUPS = [
  {
    id: 'state_overview',
    label: 'State Overview',
    metrics: ['renewables', 'population', 'emissions_total', 'gdp'],
  },
  {
    id: 'state_costs',
    label: 'State Costs',
    metrics: ['insurance_cost', 'insurance_cost_yoy'],
  },
  {
    id: 'state_climate',
    label: 'Climate Impacts',
    metrics: ['wildfire_acres', 'drought_severity'],
  },
];

// ── Ocean metrics (EPA Climate Change Indicators) ────────────────────────────
// Data arrays filled by loadOceanData(); empty arrays render "No data" until loaded.
const oceanMetricData = {
  ocean_acidity:   [],
  ocean_heat:      [],
  ocean_sea_level: [],
  ocean_sst:       [],
  arctic_sea_ice:  [],
  antarctic_sea_ice: [],
};
const oceanMetricMeta = {
  ocean_acidity:     { label: 'Ocean Acidity',           unit: 'pH' },
  ocean_heat:        { label: 'Heat Content',             unit: '\u00d710\u00b2\u00b2 J' },
  ocean_sea_level:   { label: 'Sea Level Change',         unit: 'mm' },
  ocean_sst:         { label: 'Surface Temp Anomaly',     unit: '\u00b0F' },
  arctic_sea_ice:    { label: 'Arctic Sea Ice Extent',    unit: 'M km\u00b2' },
  antarctic_sea_ice: { label: 'Antarctic Sea Ice Extent', unit: 'M km\u00b2' },
};
const OCEAN_METRIC_DESC = {
  ocean_sea_level: 'Global mean sea level anomaly (mm) from NOAA satellite altimetry annual means. 2026 is a trend-based estimate from the latest observed 2025 values.',
  ocean_sst:       'Average global sea-surface temperature anomaly (°F) vs. the 20th-century mean. Warmer oceans fuel stronger storms, bleach coral reefs, and disrupt marine food webs.',
  ocean_heat:      'Total heat stored in the top 2,000 m of the world\'s oceans (×10²² joules) relative to a 1955–2006 baseline. Oceans absorb ~90% of excess heat trapped by greenhouse gases.',
  ocean_acidity:   'Average surface ocean pH averaged across monitoring stations. Each 0.1 drop in pH = ~26% more acidic. Threatens shell-forming species like oysters, corals, and pteropods.',
  arctic_sea_ice:  'Arctic sea ice September minimum extent (million km\u00b2) — the annual summer low. Loss of reflective ice accelerates warming via the ice-albedo feedback loop. Source: NSIDC Sea Ice Index v3.',
  antarctic_sea_ice: 'Antarctic sea ice February minimum extent (million km\u00b2) — the annual summer low for the Southern Hemisphere. Hit back-to-back record lows in 2023 and 2022. Source: NSIDC Sea Ice Index v3.',
};
const OCEAN_METRIC_GROUPS = [
  {
    id: 'ocean_overview',
    label: 'Ocean & Atmosphere',
    metrics: ['ocean_sea_level', 'ocean_sst', 'ocean_heat', 'ocean_acidity'],
  },
  {
    id: 'ocean_ice',
    label: 'Sea Ice',
    metrics: ['arctic_sea_ice', 'antarctic_sea_ice'],
  },
];
// ─────────────────────────────────────────────────────────────────────────────

let selectedOceanMetric = 'ocean_sea_level';
let selectedOceanMetricGroup = 'ocean_overview';
let oceanSeaLevelUnitMode = 'mm';
let selectedSnapshotTab = 'overview';
let lastMetricButtonsSignature = '';
let lastSnapshotTabButtonsSignature = '';
let lastSnapshotPanelSignature = '';

const SNAPSHOT_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'risk', label: 'Risk & Resilience' },
  { id: 'generation_cost', label: 'Generation Cost' },
  { id: 'energy_trade', label: 'Energy Trade' },
];

const CLIMATE_SNAPSHOT_FIELDS = [
  { key: 'battery_storage_capacity_gw_2023', label: 'Grid battery storage capacity (2023)', type: 'number', suffix: ' GW', decimals: 1, tab: 'overview' },
  { key: 'electricity_cost', label: 'Electricity cost (latest)', type: 'number', suffix: ' USD/kWh', decimals: 2, tab: 'overview' },
  { key: 'coal_units_shut_down_2000_2025', label: 'Coal units shut down (2000–2025)', type: 'number', decimals: 0, tab: 'overview' },
  { key: 'carbon_price_usd', label: 'Carbon price (2025)', type: 'number', suffix: ' USD/tCO₂e', decimals: 0, tab: 'overview' },
  { key: 'fossil_fuel_subsidies_bn_usd', label: 'Fossil fuel subsidies (2024)', type: 'number', suffix: ' B USD', decimals: 1, tab: 'overview' },
  { key: 'ndc_net_zero_status', label: 'Net-zero pledge status', type: 'text', tab: 'overview' },
  { key: 'ndc_target_year', label: 'Net-zero target year', type: 'number', decimals: 0, tab: 'overview' },
  { key: 'extreme_weather_events_2024', label: 'Extreme weather events (2024)', type: 'number', decimals: 0, tab: 'overview' },
  { key: 'heatwave_days_annual_mean_past7y', label: 'Heatwave days (annual mean, past 7y)', type: 'number', decimals: 1, tab: 'overview' },
  { key: 'sea_level_exposure_pop_below_5m_pct', label: 'Population below 5m elevation (latest)', type: 'number', suffix: '%', decimals: 1, tab: 'overview' },
  { key: 'sea_level_rise_2026_m', label: 'Sea level rise (2026 projection)', type: 'number', suffix: ' m', decimals: 3, tab: 'overview' },
  { key: 'flood_deaths_latest', label: 'Flood deaths (latest year)', type: 'number', decimals: 0, tab: 'risk' },
  { key: 'drought_deaths_latest', label: 'Drought deaths (latest year)', type: 'number', decimals: 0, tab: 'risk' },
  { key: 'wildfire_burned_area_latest_kha', label: 'Wildfire burned area (latest)', type: 'number', suffix: ' kHa', decimals: 0, tab: 'risk' },
  { key: 'wildfire_deaths_latest', label: 'Wildfire deaths (latest year)', type: 'number', decimals: 0, tab: 'risk' },
  { key: 'heat_deaths_latest', label: 'Heat-related deaths (latest year)', type: 'number', decimals: 0, tab: 'risk' },
  { key: 'cereal_yield_anomaly_pct_latest', label: 'Cereal yield anomaly vs 2000–2019 mean (latest)', type: 'number', suffix: '%', decimals: 1, tab: 'risk' },
  { key: 'water_stress_pct_latest', label: 'Water stress (latest)', type: 'number', suffix: '%', decimals: 1, tab: 'risk' },
  { key: 'freshwater_resources_per_capita_m3_latest', label: 'Renewable freshwater resources (latest)', type: 'number', suffix: ' m³/person', decimals: 0, tab: 'risk' },
  { key: 'pm25_ug_m3_latest', label: 'PM2.5 concentration (latest)', type: 'number', suffix: ' µg/m³', decimals: 1, tab: 'risk' },
  { key: 'air_pollution_death_rate_per_100k_latest', label: 'Air pollution death rate (latest)', type: 'number', suffix: ' per 100k', decimals: 1, tab: 'risk' },
  { key: 'nd_gain_readiness_latest', label: 'ND-GAIN readiness score (latest)', type: 'number', decimals: 3, tab: 'risk' },
  { key: 'gen_cost_coal', label: 'Coal generation cost', type: 'number', suffix: ' USD/MWh', decimals: 1, tab: 'generation_cost' },
  { key: 'gen_cost_gas', label: 'Gas generation cost', type: 'number', suffix: ' USD/MWh', decimals: 1, tab: 'generation_cost' },
  { key: 'gen_cost_hydro', label: 'Hydro generation cost', type: 'number', suffix: ' USD/MWh', decimals: 1, tab: 'generation_cost' },
  { key: 'gen_cost_solar', label: 'Solar generation cost', type: 'number', suffix: ' USD/MWh', decimals: 1, tab: 'generation_cost' },
  { key: 'gen_cost_wind', label: 'Wind generation cost', type: 'number', suffix: ' USD/MWh', decimals: 1, tab: 'generation_cost' },
  { key: 'gen_cost_oil', label: 'Oil generation cost', type: 'number', suffix: ' USD/MWh', decimals: 1, tab: 'generation_cost' },
  { key: 'gen_cost_nuclear', label: 'Nuclear generation cost', type: 'number', suffix: ' USD/MWh', decimals: 1, tab: 'generation_cost' },
  { key: 'gen_cost_other_renewables', label: 'Other renewables generation cost', type: 'number', suffix: ' USD/MWh', decimals: 1, tab: 'generation_cost' },
  { key: 'trade_oil_import_mt_2026', label: 'Oil imports (2026)', type: 'number', suffix: ' Mt', decimals: 1, tab: 'energy_trade' },
  { key: 'trade_oil_export_mt_2026', label: 'Oil exports (2026)', type: 'number', suffix: ' Mt', decimals: 1, tab: 'energy_trade' },
  { key: 'trade_gas_import_bcm_2026', label: 'Natural gas imports (2026)', type: 'number', suffix: ' bcm', decimals: 1, tab: 'energy_trade' },
  { key: 'trade_gas_export_bcm_2026', label: 'Natural gas exports (2026)', type: 'number', suffix: ' bcm', decimals: 1, tab: 'energy_trade' },
  { key: 'trade_gas_production_bcm_2026', label: 'Natural gas production (2026)', type: 'number', suffix: ' bcm', decimals: 1, tab: 'energy_trade' },
  { key: 'trade_gas_consumption_bcm_2026', label: 'Natural gas consumption (2026)', type: 'number', suffix: ' bcm', decimals: 1, tab: 'energy_trade' },
  { key: 'trade_coal_import_mt_2026', label: 'Coal imports (2026)', type: 'number', suffix: ' Mt', decimals: 1, tab: 'energy_trade' },
  { key: 'trade_coal_export_mt_2026', label: 'Coal exports (2026)', type: 'number', suffix: ' Mt', decimals: 1, tab: 'energy_trade' },
  { key: 'trade_coal_production_mt_2026', label: 'Coal production (2026)', type: 'number', suffix: ' Mt', decimals: 1, tab: 'energy_trade' },
  { key: 'trade_coal_consumption_mt_2026', label: 'Coal consumption (2026)', type: 'number', suffix: ' Mt', decimals: 1, tab: 'energy_trade' },
  { key: 'trade_oil_production_mt_2026', label: 'Oil production (2026)', type: 'number', suffix: ' Mt', decimals: 1, tab: 'energy_trade' },
  { key: 'trade_oil_consumption_mt_2026', label: 'Oil consumption (2026)', type: 'number', suffix: ' Mt', decimals: 1, tab: 'energy_trade' },
];

const SNAPSHOT_FIELD_SOURCES = {
  battery_storage_capacity_gw_2023: [
    { label: 'Voronoi', href: 'https://www.voronoiapp.com/energy/Visualized-Countries-by-Grid-Storage-Battery-Capacity-in-2023-2903' },
    { label: 'Energy Inst.', href: 'https://www.energyinst.org/statistical-review' },
    { label: 'source', href: 'data/grid_storage_battery_capacity_2023_top10.csv' },
  ],
  electricity_cost: [
    { label: 'source', href: 'data/cost_of_electricity_by_country_wpr_2026.csv' },
    { label: 'WPR', href: 'https://worldpopulationreview.com/country-rankings/cost-of-electricity-by-country' },
  ],
  coal_units_shut_down_2000_2025: [
    { label: 'source', href: 'data/coal_units_shut_down_by_country_gem_2000_2025.csv' },
    { label: 'GEM', href: 'https://globalenergymonitor.org/projects/global-coal-plant-tracker/summary-tables/' },
  ],
  extreme_weather_events_2024: [
    { label: 'EM-DAT/HDX', href: 'https://data.humdata.org/dataset/emdat-country-profiles' },
    { label: 'source', href: 'data/extreme_weather_events_by_country_emdat_2024.csv' },
  ],
  heatwave_days_annual_mean_past7y: [
    { label: 'CCVI', href: 'https://climate-conflict.org/www/data-pages/CLI_accumulated_heatwave' },
    { label: 'source', href: 'data/heatwave_days_by_country_ccvi_2025q4.csv' },
  ],
  sea_level_exposure_pop_below_5m_pct: [
    { label: 'source', href: 'data/climate_resilience_snapshot_by_country_2026.csv' },
    { label: 'WB', href: 'https://api.worldbank.org/v2/country/all/indicator/EN.POP.EL5M.ZS?format=json' },
  ],
  sea_level_rise_2026_m: [
    { label: 'source', href: 'data/sea_level_rise_by_country_cckp_2026.csv' },
    { label: 'CCKP (World Bank)', href: 'https://climateknowledgeportal.worldbank.org/' },
  ],
  coal_share_latest_pct: [
    { label: 'source', href: 'data/climate_resilience_snapshot_by_country_2026.csv' },
  ],
  carbon_price_usd: [
    { label: 'source', href: 'data/carbon_price_by_country_wb_2025.csv' },
    { label: 'World Bank CPD', href: 'https://carbonpricingdashboard.worldbank.org/' },
  ],
  fossil_fuel_subsidies_bn_usd: [
    { label: 'source', href: 'data/fossil_fuel_subsidies_by_country_imf_2024.csv' },
    { label: 'IMF WP/24/11', href: 'https://www.imf.org/en/Publications/WP/Issues/2024/08/18/IMF-Working-Paper-Fossil-Fuel-Subsidies-2024' },
  ],
  ndc_net_zero_status: [
    { label: 'source', href: 'data/ndc_net_zero_status_by_country_2025.csv' },
    { label: 'Climate Watch', href: 'https://www.climatewatchdata.org/' },
  ],
  ndc_target_year: [
    { label: 'source', href: 'data/ndc_net_zero_status_by_country_2025.csv' },
    { label: 'Climate Watch', href: 'https://www.climatewatchdata.org/' },
  ],

  flood_deaths_latest: [
    { label: 'source', href: 'data/climate_resilience_snapshot_by_country_2026.csv' },
    { label: 'OWID', href: 'https://ourworldindata.org/grapher/number-of-deaths-from-natural-disasters' },
  ],
  drought_deaths_latest: [
    { label: 'source', href: 'data/climate_resilience_snapshot_by_country_2026.csv' },
    { label: 'OWID', href: 'https://ourworldindata.org/grapher/number-of-deaths-from-natural-disasters' },
  ],
  wildfire_burned_area_latest_kha: [
    { label: 'source', href: 'data/wildfire_burned_area_by_country_gwis.csv' },
    { label: 'GWIS/GFED', href: 'https://gwis.jrc.ec.europa.eu/' },
  ],
  wildfire_deaths_latest: [
    { label: 'source', href: 'data/climate_resilience_snapshot_by_country_2026.csv' },
    { label: 'OWID', href: 'https://ourworldindata.org/grapher/number-of-deaths-from-natural-disasters' },
  ],
  heat_deaths_latest: [
    { label: 'source', href: 'data/climate_resilience_snapshot_by_country_2026.csv' },
    { label: 'OWID', href: 'https://ourworldindata.org/grapher/number-of-deaths-from-natural-disasters' },
  ],
  cereal_yield_anomaly_pct_latest: [
    { label: 'source', href: 'data/climate_resilience_snapshot_by_country_2026.csv' },
    { label: 'WB', href: 'https://api.worldbank.org/v2/country/all/indicator/AG.YLD.CREL.KG?format=json' },
  ],
  water_stress_pct_latest: [
    { label: 'source', href: 'data/climate_resilience_snapshot_by_country_2026.csv' },
    { label: 'WB', href: 'https://api.worldbank.org/v2/country/all/indicator/ER.H2O.FWST.ZS?format=json' },
  ],
  freshwater_resources_per_capita_m3_latest: [
    { label: 'source', href: 'data/climate_resilience_snapshot_by_country_2026.csv' },
    { label: 'WB', href: 'https://api.worldbank.org/v2/country/all/indicator/ER.H2O.INTR.PC?format=json' },
  ],
  pm25_ug_m3_latest: [
    { label: 'source', href: 'data/climate_resilience_snapshot_by_country_2026.csv' },
    { label: 'WB', href: 'https://api.worldbank.org/v2/country/all/indicator/EN.ATM.PM25.MC.M3?format=json' },
  ],
  air_pollution_death_rate_per_100k_latest: [
    { label: 'source', href: 'data/climate_resilience_snapshot_by_country_2026.csv' },
    { label: 'WB', href: 'https://api.worldbank.org/v2/country/all/indicator/SH.STA.AIRP.P5?format=json' },
  ],
  nd_gain_readiness_latest: [
    { label: 'source', href: 'data/climate_resilience_snapshot_by_country_2026.csv' },
    { label: 'ND-GAIN', href: 'https://gain.nd.edu/our-work/country-index/download-data/' },
  ],

  gen_cost_coal: [
    { label: 'source', href: 'data/generation_cost_country_source_usd_per_mwh_2026_proxy.csv' },
    { label: 'OECD-NEA', href: 'https://www.oecd-nea.org/jcms/pl_108100/projected-costs-of-generating-electricity-2025-edition' },
    { label: 'World Bank CMO', href: 'https://bit.ly/CMO-October-2025-Data' },
  ],
  gen_cost_gas: [
    { label: 'source', href: 'data/generation_cost_country_source_usd_per_mwh_2026_proxy.csv' },
    { label: 'OECD-NEA', href: 'https://www.oecd-nea.org/jcms/pl_108100/projected-costs-of-generating-electricity-2025-edition' },
    { label: 'World Bank CMO', href: 'https://bit.ly/CMO-October-2025-Data' },
  ],
  gen_cost_hydro: [
    { label: 'source', href: 'data/generation_cost_country_source_usd_per_mwh_2026_proxy.csv' },
    { label: 'OECD-NEA', href: 'https://www.oecd-nea.org/jcms/pl_108100/projected-costs-of-generating-electricity-2025-edition' },
  ],
  gen_cost_solar: [
    { label: 'source', href: 'data/generation_cost_country_source_usd_per_mwh_2026_proxy.csv' },
    { label: 'OECD-NEA', href: 'https://www.oecd-nea.org/jcms/pl_108100/projected-costs-of-generating-electricity-2025-edition' },
  ],
  gen_cost_wind: [
    { label: 'source', href: 'data/generation_cost_country_source_usd_per_mwh_2026_proxy.csv' },
    { label: 'OECD-NEA', href: 'https://www.oecd-nea.org/jcms/pl_108100/projected-costs-of-generating-electricity-2025-edition' },
  ],
  gen_cost_oil: [
    { label: 'source', href: 'data/generation_cost_country_source_usd_per_mwh_2026_proxy.csv' },
    { label: 'OECD-NEA', href: 'https://www.oecd-nea.org/jcms/pl_108100/projected-costs-of-generating-electricity-2025-edition' },
    { label: 'World Bank CMO', href: 'https://bit.ly/CMO-October-2025-Data' },
  ],
  gen_cost_nuclear: [
    { label: 'source', href: 'data/generation_cost_country_source_usd_per_mwh_2026_proxy.csv' },
    { label: 'OECD-NEA', href: 'https://www.oecd-nea.org/jcms/pl_108100/projected-costs-of-generating-electricity-2025-edition' },
  ],
  gen_cost_other_renewables: [
    { label: 'source', href: 'data/generation_cost_country_source_usd_per_mwh_2026_proxy.csv' },
    { label: 'OECD-NEA', href: 'https://www.oecd-nea.org/jcms/pl_108100/projected-costs-of-generating-electricity-2025-edition' },
  ],
  trade_oil_import_mt_2026: [
    { label: 'source', href: 'data/energy_trade_import_export_by_country_2026.csv' },
    { label: 'method', href: 'data/energy_trade_import_export_by_country_2026_proxy_method.md' },
  ],
  trade_oil_export_mt_2026: [
    { label: 'source', href: 'data/energy_trade_import_export_by_country_2026.csv' },
    { label: 'method', href: 'data/energy_trade_import_export_by_country_2026_proxy_method.md' },
  ],
  trade_gas_import_bcm_2026: [
    { label: 'source', href: 'data/energy_trade_import_export_by_country_2026.csv' },
    { label: 'method', href: 'data/energy_trade_import_export_by_country_2026_proxy_method.md' },
  ],
  trade_gas_export_bcm_2026: [
    { label: 'source', href: 'data/energy_trade_import_export_by_country_2026.csv' },
    { label: 'method', href: 'data/energy_trade_import_export_by_country_2026_proxy_method.md' },
  ],
  trade_gas_production_bcm_2026: [
    { label: 'source', href: 'data/energy_trade_import_export_by_country_2026.csv' },
    { label: 'method', href: 'data/energy_trade_import_export_by_country_2026_proxy_method.md' },
  ],
  trade_gas_consumption_bcm_2026: [
    { label: 'source', href: 'data/energy_trade_import_export_by_country_2026.csv' },
    { label: 'method', href: 'data/energy_trade_import_export_by_country_2026_proxy_method.md' },
  ],
  trade_coal_import_mt_2026: [
    { label: 'source', href: 'data/energy_trade_import_export_by_country_2026.csv' },
    { label: 'method', href: 'data/energy_trade_import_export_by_country_2026_proxy_method.md' },
  ],
  trade_coal_export_mt_2026: [
    { label: 'source', href: 'data/energy_trade_import_export_by_country_2026.csv' },
    { label: 'method', href: 'data/energy_trade_import_export_by_country_2026_proxy_method.md' },
  ],
  trade_coal_production_mt_2026: [
    { label: 'source', href: 'data/energy_trade_import_export_by_country_2026.csv' },
    { label: 'method', href: 'data/energy_trade_import_export_by_country_2026_proxy_method.md' },
  ],
  trade_coal_consumption_mt_2026: [
    { label: 'source', href: 'data/energy_trade_import_export_by_country_2026.csv' },
    { label: 'method', href: 'data/energy_trade_import_export_by_country_2026_proxy_method.md' },
  ],
  trade_oil_production_mt_2026: [
    { label: 'source', href: 'data/energy_trade_import_export_by_country_2026.csv' },
    { label: 'method', href: 'data/energy_trade_import_export_by_country_2026_proxy_method.md' },
  ],
  trade_oil_consumption_mt_2026: [
    { label: 'source', href: 'data/energy_trade_import_export_by_country_2026.csv' },
    { label: 'method', href: 'data/energy_trade_import_export_by_country_2026_proxy_method.md' },
  ],
};

function closeAllSnapshotSourceMenus() {
  if (!snapshotContent) return;
  snapshotContent.querySelectorAll('.snapshot-source-dropdown.open').forEach((el) => {
    el.classList.remove('open');
  });
}

function getSnapshotSourceOptions(fieldKey) {
  const sources = SNAPSHOT_FIELD_SOURCES[fieldKey] || [];
  const raw = sources.find((src) => {
    if (!src || !src.href) return false;
    const lbl = String(src.label || '').toLowerCase();
    return lbl === 'raw' || lbl === 'source' || String(src.href).startsWith('data/');
  });
  const website = sources.find((src) => src && src.href && !String(src.href).startsWith('data/'));

  const out = [];
  if (raw) out.push({ label: 'raw source', href: raw.href });
  if (website) out.push({ label: 'website source', href: website.href });
  return out;
}

document.addEventListener('pointerdown', (e) => {
  const target = e.target;
  if (target && target.closest('.snapshot-source-dropdown')) return;
  closeAllSnapshotSourceMenus();
}, true);

if (snapshotTabButtons) {
  snapshotTabButtons.addEventListener('click', (e) => {
    const btn = e.target.closest('.snapshot-tab');
    if (!btn) return;
    selectedSnapshotTab = btn.dataset.tab || 'overview';
    renderClimateSnapshotPanel();
    requestRender();
  });
}

function renderSnapshotTabButtons() {
  if (!snapshotTabButtons) return;

  const signature = JSON.stringify({
    selectedSnapshotTab,
    tabs: SNAPSHOT_TABS.map((tab) => ({ id: tab.id, label: tab.label })),
  });
  if (signature === lastSnapshotTabButtonsSignature) return;
  lastSnapshotTabButtonsSignature = signature;

  snapshotTabButtons.innerHTML = '';
  SNAPSHOT_TABS.forEach((tab) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'snapshot-tab';
    btn.dataset.tab = tab.id;
    btn.textContent = tab.label;
    if (tab.id === selectedSnapshotTab) btn.classList.add('active');
    snapshotTabButtons.appendChild(btn);
  });
}

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

  const activeYears = lastChartYears || YEARS;
  const t = (x - padLeft) / (rect.width - padLeft - padRight);
  const idx = Math.max(0, Math.min(activeYears.length - 1, Math.round(t * (activeYears.length - 1))));
  const value = lastChartSeries[idx];
  if (value === null || Number.isNaN(value)) {
    chartTooltip.style.display = 'none';
    if (chartDot) chartDot.style.display = 'none';
    return;
  }

  chartTooltip.style.display = 'block';
  chartTooltip.style.left = `${event.clientX}px`;
  chartTooltip.style.top = `${event.clientY}px`;
  chartTooltip.textContent = `${activeYears[idx]} • ${formatValueForChart(value, lastChartUnit)}`;

  if (chartDot) {
    const padLeft = 45;
    const padRight = 8;
    const padTop = 6;
    const padBottom = 18;
    const values = lastChartSeries.filter((v) => typeof v === 'number');
    let minVal = lastChartUnit === '%' ? 0 : Math.min(...values);
    let maxVal = lastChartUnit === '%' ? 100 : Math.max(...values);
    if (minVal === maxVal) maxVal = minVal + 1;
    const cx = rect.left + padLeft + (idx / (activeYears.length - 1)) * (rect.width - padLeft - padRight);
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
    if (selectedOcean) {
      selectedOceanMetric = btn.dataset.metric;
    } else {
      selectedMetric = btn.dataset.metric;
    }
    updateMetricButtonVisibility();
    requestRender();
  });
}

if (metricSubcontrols) {
  metricSubcontrols.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-ocean-sea-level-unit]');
    if (!btn) return;
    oceanSeaLevelUnitMode = btn.dataset.oceanSeaLevelUnit || 'mm';
    renderOceanSubcontrols();
    requestRender();
  });
}

if (metricGroupTabs) {
  metricGroupTabs.addEventListener('click', (e) => {
    if (selectedOcean) {
      const btn = e.target.closest('[data-group]');
      if (!btn) return;
      selectedOceanMetricGroup = btn.dataset.group;
      const group = OCEAN_METRIC_GROUPS.find((g) => g.id === selectedOceanMetricGroup);
      if (group && !group.metrics.includes(selectedOceanMetric)) {
        selectedOceanMetric = group.metrics[0];
      }
      updateMetricButtonVisibility();
      requestRender();
      return;
    }
    const btn = e.target.closest('.metric-group-tab');
    if (!btn) return;

    selectedMetricGroup = btn.dataset.group;
    const groups = getVisibleMetricGroups();
    const group = groups.find((entry) => entry.id === selectedMetricGroup);
    if (group && !group.metrics.includes(selectedMetric)) {
      selectedMetric = group.metrics[0];
    }

    updateMetricButtonVisibility();
    requestRender();
  });
}

function getVisibleMetricGroups() {
  if (selectedOcean) return OCEAN_METRIC_GROUPS;
  return selectedState ? STATE_METRIC_GROUPS : COUNTRY_METRIC_GROUPS;
}

function convertSeaLevelFromMm(valMm, targetUnit) {
  if (!Number.isFinite(valMm)) return null;
  if (targetUnit === 'in') return valMm / 25.4;
  if (targetUnit === 'ft') return valMm / 304.8;
  return valMm;
}

function getOceanMetricUnit(metricKey) {
  if (metricKey === 'ocean_sea_level') return oceanSeaLevelUnitMode;
  return oceanMetricMeta[metricKey]?.unit || '';
}

function renderOceanSubcontrols() {
  if (!metricSubcontrols) return;
  const showSeaLevelModes = selectedOcean && selectedOceanMetric === 'ocean_sea_level';
  if (!showSeaLevelModes) {
    metricSubcontrols.innerHTML = '';
    metricSubcontrols.style.display = 'none';
    return;
  }

  const units = [
    { key: 'mm', label: 'mm' },
    { key: 'in', label: 'inches' },
    { key: 'ft', label: 'feet' },
  ];
  metricSubcontrols.innerHTML = '<span class="metric-subcontrols-label">Sea level units:</span>';
  units.forEach((unit) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'metric-subcontrol-btn';
    button.dataset.oceanSeaLevelUnit = unit.key;
    button.textContent = unit.label;
    button.classList.toggle('active', unit.key === oceanSeaLevelUnitMode);
    metricSubcontrols.appendChild(button);
  });
  metricSubcontrols.style.display = 'flex';
}

function getMetricButtonLabel(metricKey) {
  return METRIC_BUTTON_LABELS[metricKey] || metricMeta[metricKey]?.label || metricKey;
}

function syncInteractivePanels() {
  updateMetricButtonVisibility();
  renderClimateSnapshotPanel();
  updateDockEmptyStates();
}

function updateMetricButtonVisibility() {
  if (!metricButtons || !metricGroupTabs) return;

  const groups = getVisibleMetricGroups();

  // ocean has its own selected-metric/group state
  if (selectedOcean) {
    let activeGroup = groups.find((g) => g.metrics.includes(selectedOceanMetric)) || groups[0];
    if (!groups.some((g) => g.id === selectedOceanMetricGroup)) {
      selectedOceanMetricGroup = activeGroup?.id || groups[0]?.id;
    }

    const currentGroup = groups.find((g) => g.id === selectedOceanMetricGroup) || activeGroup;
    const signature = JSON.stringify({
      mode: 'ocean',
      selectedOceanMetricGroup,
      selectedOceanMetric,
      groups: groups.map((group) => ({
        id: group.id,
        label: group.label,
        metrics: group.metrics.map((metricKey) => ({
          key: metricKey,
          label: getOceanMetricButtonLabel(metricKey),
        })),
      })),
      currentGroupMetrics: (currentGroup?.metrics || []).slice(),
    });
    if (signature === lastMetricButtonsSignature) return;
    lastMetricButtonsSignature = signature;

    metricGroupTabs.innerHTML = '';
    groups.forEach((group) => {
      const button = document.createElement('button');
      button.className = 'metric-group-tab';
      button.type = 'button';
      button.dataset.group = group.id;
      button.textContent = group.label;
      button.classList.toggle('active', group.id === selectedOceanMetricGroup);
      metricGroupTabs.appendChild(button);
    });

    metricButtons.innerHTML = '';
    (currentGroup?.metrics || []).forEach((metricKey) => {
      const button = document.createElement('button');
      button.className = 'metric-btn';
      button.type = 'button';
      button.dataset.metric = metricKey;
      button.textContent = getOceanMetricButtonLabel(metricKey);
      button.classList.toggle('active', metricKey === selectedOceanMetric);
      metricButtons.appendChild(button);
    });
    renderOceanSubcontrols();
    return;
  }

  if (metricSubcontrols) {
    metricSubcontrols.innerHTML = '';
    metricSubcontrols.style.display = 'none';
  }

  let activeGroup = groups.find((group) => group.metrics.includes(selectedMetric));

  if (!activeGroup) {
    activeGroup = groups[0];
    selectedMetric = activeGroup?.metrics?.[0] || 'renewables';
  }

  if (!groups.some((group) => group.id === selectedMetricGroup)) {
    selectedMetricGroup = activeGroup?.id || groups[0]?.id || 'electricity';
  }

  if (activeGroup && activeGroup.id !== selectedMetricGroup) {
    selectedMetricGroup = activeGroup.id;
  }

  const currentGroup = groups.find((group) => group.id === selectedMetricGroup) || activeGroup;
  const signature = JSON.stringify({
    mode: selectedState ? 'state' : 'country',
    selectedMetricGroup,
    selectedMetric,
    groups: groups.map((group) => ({
      id: group.id,
      label: group.label,
      metrics: group.metrics.map((metricKey) => ({
        key: metricKey,
        label: getMetricButtonLabel(metricKey),
      })),
    })),
    currentGroupMetrics: (currentGroup?.metrics || []).slice(),
  });
  if (signature === lastMetricButtonsSignature) return;
  lastMetricButtonsSignature = signature;

  metricGroupTabs.innerHTML = '';
  groups.forEach((group) => {
    const button = document.createElement('button');
    button.className = 'metric-group-tab';
    button.type = 'button';
    button.dataset.group = group.id;
    button.textContent = group.label;
    button.classList.toggle('active', group.id === selectedMetricGroup);
    metricGroupTabs.appendChild(button);
  });

  metricButtons.innerHTML = '';
  (currentGroup?.metrics || []).forEach((metricKey) => {
    const button = document.createElement('button');
    button.className = 'metric-btn';
    button.type = 'button';
    button.dataset.metric = metricKey;
    button.textContent = getMetricButtonLabel(metricKey);
    button.classList.toggle('active', metricKey === selectedMetric);
    if (metricKey === 'climate_gdp_hot_house') button.classList.add('scenario-bad');
    if (metricKey === 'climate_gdp_delayed') button.classList.add('scenario-mid');
    if (metricKey === 'climate_gdp_net_zero') button.classList.add('scenario-good');
    metricButtons.appendChild(button);
  });
}

function getOceanMetricButtonLabel(metricKey) {
  return oceanMetricMeta[metricKey]?.label || metricKey;
}

function getOceanMetricSeries(metricKey) {
  const rows = oceanMetricData[metricKey];
  if (!rows || !rows.length) return YEARS.map(() => null);
  const byYear = new Map(rows.map((r) => [r.year, r.value]));
  return YEARS.map((yr) => byYear.has(yr) ? byYear.get(yr) : null);
}

async function loadNasaTempData() {
  try {
    const res = await fetch('data/nasa_temperature_data.txt');
    const text = await res.text();
    const grid = new Float32Array(180 * 90).fill(NaN);
    const lines = text.split('\n');
    // First two lines are headers; data starts at line index 2
    for (let i = 2; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const parts = line.split(/\s+/);
      if (parts.length < 5) continue;
      const lon = parseFloat(parts[2]);
      const lat = parseFloat(parts[3]);
      const val = parseFloat(parts[4]);
      if (isNaN(lon) || isNaN(lat) || isNaN(val)) continue;
      const iLon = Math.min(179, Math.max(0, Math.round((lon + 179) / 2)));
      const iLat = Math.min(89, Math.max(0, Math.round((lat + 89) / 2)));
      grid[iLon * 90 + iLat] = val;
    }
    nasaTempGrid = grid;
  } catch (e) {
    console.warn('Failed to load NASA temp data:', e);
  }
}

function getNasaTempAnomaly(lat, lon) {
  if (!nasaTempGrid) return null;
  let normLon = ((lon + 180) % 360) - 180;
  normLon = Math.max(-179, Math.min(179, normLon));
  const iLon = Math.min(179, Math.max(0, Math.round((normLon + 179) / 2)));
  const iLat = Math.min(89, Math.max(0, Math.round((lat + 89) / 2)));
  const val = nasaTempGrid[iLon * 90 + iLat];
  return isNaN(val) ? null : val;
}

// Map a temperature anomaly in °C to an RGB triple using a blue→white→red diverging palette
function anomalyToColor(a) {
  const t = Math.max(-3, Math.min(3, a));
  const neutral = [80, 80, 80]; // softer than pure white for mid-range anomalies
  if (t <= 0) {
    // deep blue (0,0,200) at -3°C → soft neutral at 0°C
    const f = (t + 3) / 3;
    return [
      Math.round(f * neutral[0]),
      Math.round(f * neutral[1]),
      Math.round(160 + f * (neutral[2] - 160)),
    ];
  } else {
    // soft neutral at 0°C → deep red (220,0,0) at +3°C
    const f = t / 3;
    return [
      Math.round(neutral[0] + f * (160 - neutral[0])),
      Math.round(neutral[1] * (1 - f)),
      Math.round(neutral[2] * (1 - f)),
    ];
  }
}

// Build a 720×360 CanvasTexture where each pixel is colored by the NASA temp anomaly grid
function buildThermalTexture() {
  const W = 720, H = 360;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const imageData = ctx.createImageData(W, H);
  const d = imageData.data;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      // equirectangular mapping: x→lon, y→lat (top=+90°)
      const lon = -180 + (x / W) * 360;
      const lat = 90 - (y / H) * 180;
      const anomaly = getNasaTempAnomaly(lat, lon);
      const idx = (y * W + x) * 4;
      if (anomaly === null || isNaN(anomaly)) {
        // no data: very dark navy
        d[idx] = 15; d[idx + 1] = 15; d[idx + 2] = 40; d[idx + 3] = 255;
      } else {
        const [r, g, b] = anomalyToColor(anomaly);
        d[idx] = r; d[idx + 1] = g; d[idx + 2] = b; d[idx + 3] = 255;
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return new THREE.CanvasTexture(canvas);
}

function toggleThermalView() {
  thermalViewActive = !thermalViewActive;
  if (earthMat) {
    if (thermalViewActive) {
      earthOriginalTexture = earthMat.map;
      earthMat.map = buildThermalTexture();
      // Use neutral white multiply so the thermal canvas colors render true
      earthMat.color.set(0xffffff);
      earthMat.needsUpdate = true;
    } else {
      earthMat.map = earthOriginalTexture;
      earthMat.color.set(0x888888); // restore original grey multiply
      earthMat.needsUpdate = true;
    }
  }
  if (thermalToggleBtn) {
    thermalToggleBtn.classList.toggle('active', thermalViewActive);
    thermalToggleBtn.textContent = thermalViewActive ? '🌡 Normal View' : '🌡 Thermal View';
  }
  requestRender();
}

if (thermalToggleBtn) thermalToggleBtn.addEventListener('click', toggleThermalView);

async function loadOceanData() {
  try {
    const [acidText, heatText, seaLevelText, sstText] = await Promise.all([
      fetch('data/epa_ocean_data/ocean-acidity_fig-1.csv').then((r) => r.text()),
      fetch('data/epa_ocean_data/ocean-heat_fig-1.csv').then((r) => r.text()),
      fetch('data/ocean_sea_level_global_annual_2026_proxy.csv').then((r) => r.text()),
      fetch('data/epa_ocean_data/sea-surface-temp_fig-1.csv').then((r) => r.text()),
    ]);

    // Skip 7 lines (5 info rows + 1 blank + 1 column-header row), return split columns
    function epaRows(text) {
      return text
        .trim()
        .split(/\r?\n/)
        .slice(7)
        .filter((l) => l.trim())
        .map((l) => splitCSVLine(l));
    }

    // ── Acidity: average pH across Hawaii, Canary Islands, Bermuda (fractional years → integer)
    {
      const acc = new Map();
      epaRows(acidText).forEach((cols) => {
        [[0, 1], [4, 5], [8, 9]].forEach(([yc, pc]) => {
          const yr = parseFloat(cols[yc]);
          const ph = parseFloat(cols[pc]);
          if (isNaN(yr) || isNaN(ph)) return;
          const iy = Math.round(yr);
          if (!acc.has(iy)) acc.set(iy, { sum: 0, n: 0 });
          acc.get(iy).sum += ph;
          acc.get(iy).n += 1;
        });
      });
      oceanMetricData['ocean_acidity'] = Array.from(acc.entries())
        .sort(([a], [b]) => a - b)
        .map(([year, { sum, n }]) => ({ year, value: parseFloat((sum / n).toFixed(4)) }));
    }

    // ── Heat: average of up to 3 sources (MRI/JMA, CSIRO, NOAA) per year
    {
      oceanMetricData['ocean_heat'] = epaRows(heatText)
        .map((cols) => {
          const yr = parseInt(cols[0], 10);
          const vals = [1, 2, 3].map((i) => parseFloat(cols[i])).filter((v) => !isNaN(v));
          if (isNaN(yr) || !vals.length) return null;
          return { year: yr, value: parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(4)) };
        })
        .filter(Boolean);
    }

    // ── Sea Level: annual global anomaly in mm (NOAA LSA-derived local file)
    {
      const rows = seaLevelText.trim().split(/\r?\n/);
      oceanMetricData['ocean_sea_level'] = rows
        .slice(1)
        .map((line) => line.split(','))
        .map((cols) => {
          const yr = parseInt(cols[0], 10);
          const val = parseFloat(cols[1]);
          if (isNaN(yr) || isNaN(val)) return null;
          return { year: yr, value: parseFloat(val.toFixed(3)) };
        })
        .filter(Boolean);
    }

    // ── Sea Surface Temperature: annual anomaly (°F)
    {
      oceanMetricData['ocean_sst'] = epaRows(sstText)
        .map((cols) => {
          const yr = parseInt(cols[0], 10);
          const val = parseFloat(cols[1]);
          if (isNaN(yr) || isNaN(val)) return null;
          return { year: yr, value: parseFloat(val.toFixed(4)) };
        })
        .filter(Boolean);
    }

    requestRender();
  } catch (e) {
    console.error('Failed to load EPA ocean data:', e);
  }

  // ── Polar sea ice: NSIDC annual extent (loaded separately, non-blocking)
  function loadSeaIce(key, filename) {
    fetch(`data/${filename}`)
      .then((r) => r.text())
      .then((text) => {
        oceanMetricData[key] = text.trim().split(/\r?\n/).slice(1)
          .map((line) => {
            const [yr, val] = line.split(',');
            const year = parseInt(yr, 10);
            const value = parseFloat(val);
            if (isNaN(year) || isNaN(value)) return null;
            return { year, value };
          })
          .filter(Boolean);
        requestRender();
      })
      .catch((e) => console.warn(`Sea ice load error (${key}):`, e));
  }
  loadSeaIce('arctic_sea_ice',    'arctic_sea_ice_nsidc_annual.csv');
  loadSeaIce('antarctic_sea_ice', 'antarctic_sea_ice_nsidc_annual.csv');
}

async function loadClimateGDPData() {
  try {
    const text = await fetch('data/Climate_GDP_Losses_Benefits.csv').then((r) => r.text());
    const lines = text.trim().split(/\r?\n/);
    const headers = splitCSVLine(lines[0]);

    // Map each year column (F2023–F2050) to its array index
    const yearCols = headers
      .map((h, i) => ({ h, i }))
      .filter(({ h }) => /^F\d{4}$/.test(h))
      .map(({ h, i }) => ({ year: parseInt(h.slice(1), 10), idx: i }));

    // Stage-1: accumulate per (iso3, model) so Acute+Chronic are summed before averaging
    // Map<`${iso3}:${model}`, Map<year, { sum, n }>>
    const perModelAcc = {
      climate_gdp_hot_house: new Map(),
      climate_gdp_delayed: new Map(),
      climate_gdp_net_zero: new Map(),
    };

    function addToModel(metricKey, iso3, model, yearVals) {
      const key = `${iso3}:${model}`;
      const m = perModelAcc[metricKey];
      if (!m.has(key)) m.set(key, new Map());
      const byYear = m.get(key);
      for (const [yr, val] of yearVals) {
        if (!byYear.has(yr)) byYear.set(yr, { sum: 0, n: 0 });
        const e = byYear.get(yr);
        e.sum += val;
        e.n++;
      }
    }

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const cols = splitCSVLine(lines[i]);
      const iso3 = cols[3]?.trim();
      // Only real ISO 3166-1 alpha-3 codes (skip regional aggregates like “605NiGEM”)
      if (!iso3 || !/^[A-Z]{3}$/.test(iso3)) continue;

      const indicator = cols[4]?.trim();
      const variable = cols[5]?.trim();
      const model = cols[6]?.trim();
      const scenario = cols[7]?.trim();

      const yearVals = yearCols
        .map(({ year, idx }) => [year, parseFloat(cols[idx])])
        .filter(([, v]) => !isNaN(v));
      if (!yearVals.length) continue;

      // Hot House World: sum of Acute + Chronic climate damages under Current Policies
      if (
        indicator === 'Potential National Income Loss From Climate Risks' &&
        (variable === 'Acute climate damages' || variable === 'Chronic climate damages') &&
        scenario === 'Current Policies (Hot house world scenario)'
      ) {
        addToModel('climate_gdp_hot_house', iso3, model, yearVals);
      }

      // Delayed Transition: Net GDP benefit under Delayed Transition scenario
      if (
        indicator === 'Potential National Income Benefit From Avoided Climate Damages' &&
        variable === 'Net GDP benefit' &&
        scenario === 'Delayed Transition (Disorderly scenario)'
      ) {
        addToModel('climate_gdp_delayed', iso3, model, yearVals);
      }

      // Net Zero 2050: Net GDP benefit under Net Zero 2050 scenario
      if (
        indicator === 'Potential National Income Benefit From Avoided Climate Damages' &&
        variable === 'Net GDP benefit' &&
        scenario === 'Net Zero 2050 (Orderly scenario)'
      ) {
        addToModel('climate_gdp_net_zero', iso3, model, yearVals);
      }
    }

    // Stage-2: average the per-model sums across models to get one value per (iso3, year)
    for (const [metricKey, modelMap] of Object.entries(perModelAcc)) {
      const byIso3 = new Map(); // iso3 → Map<year, { sum, n }>
      for (const [modelKey, yearMap] of modelMap) {
        const iso3 = modelKey.split(':')[0];
        if (!byIso3.has(iso3)) byIso3.set(iso3, new Map());
        const acc2 = byIso3.get(iso3);
        for (const [yr, { sum, n }] of yearMap) {
          const modelVal = sum / n;
          if (!acc2.has(yr)) acc2.set(yr, { sum: 0, n: 0 });
          const e = acc2.get(yr);
          e.sum += modelVal;
          e.n++;
        }
      }
      const finalMap = new Map();
      for (const [iso3, acc2] of byIso3) {
        const yearFinal = new Map();
        for (const [yr, { sum, n }] of acc2) {
          yearFinal.set(yr, parseFloat((sum / n).toFixed(3)));
        }
        finalMap.set(iso3, yearFinal);
      }
      gdpClimateDataByISO3[metricKey] = finalMap;
    }

    requestRender();
  } catch (e) {
    console.error('Failed to load Climate GDP data:', e);
  }
}

function loadHeatwaveCountryData() {
  fetch('data/heatwave_days_by_country_ccvi_2025q4.csv')
    .then((res) => res.text())
    .then((text) => {
      const { rows } = parseCSV(text);
      heatwaveDaysByIso3.clear();

      rows.forEach((row) => {
        const iso3 = (row.iso3 || '').trim().toUpperCase();
        const days = parseFloat(row.heatwave_days_annual_mean_past7y);
        if (!/^[A-Z]{3}$/.test(iso3) || !Number.isFinite(days)) return;
        heatwaveDaysByIso3.set(iso3, days);
      });

      requestRender();
    })
    .catch((err) => console.error('Heatwave country data load error', err));
}

function loadExtremeWeatherEventsData() {
  fetch('data/extreme_weather_events_by_country_emdat_2024.csv')
    .then((res) => res.text())
    .then((text) => {
      const { rows } = parseCSV(text);
      extremeWeatherEventsByIso3.clear();

      rows.forEach((row) => {
        const iso3 = (row.iso3 || '').trim().toUpperCase();
        const events = parseFloat(row.extreme_weather_events);
        if (!/^[A-Z]{3}$/.test(iso3) || !Number.isFinite(events)) return;
        extremeWeatherEventsByIso3.set(iso3, events);
      });

      requestRender();
    })
    .catch((err) => console.error('Extreme weather events data load error', err));
}

function loadBatteryStorage2023Data() {
  fetch('data/grid_storage_battery_capacity_2023_top10.csv')
    .then((res) => res.text())
    .then((text) => {
      const { rows } = parseCSV(text);
      batteryStorageCapacity2023ByNormCountry.clear();

      const aliases = {
        'U.S.': 'United States of America',
      };

      rows.forEach((row) => {
        const countryRaw = (row.country || '').trim();
        const country = aliases[countryRaw] || countryRaw;
        const gw = parseFloat(row.grid_storage_battery_capacity_gw);
        if (!country || !Number.isFinite(gw)) return;
        batteryStorageCapacity2023ByNormCountry.set(normalizeName(country), gw);
      });

      requestRender();
    })
    .catch((err) => console.error('Battery storage 2023 load error', err));
}

function loadCoalUnitsShutdownData() {
  fetch('data/coal_units_shut_down_by_country_gem_2000_2025.csv')
    .then((res) => res.text())
    .then((text) => {
      const { rows } = parseCSV(text);
      coalUnitsShutdownByNormCountry.clear();

      const aliases = {
        'United States': 'United States of America',
      };

      rows.forEach((row) => {
        const countryRaw = (row.country || '').trim();
        const country = aliases[countryRaw] || countryRaw;
        const units = parseFloat(row.coal_units_shut_down_2000_2025);
        if (!country || !Number.isFinite(units)) return;
        coalUnitsShutdownByNormCountry.set(normalizeName(country), units);
      });

      requestRender();
    })
    .catch((err) => console.error('Coal units shutdown data load error', err));
}

function loadClimateResilienceSnapshotData() {
  fetch('data/climate_resilience_snapshot_by_country_2026.csv')
    .then((res) => res.text())
    .then((text) => {
      const { rows } = parseCSV(text);
      climateResilienceByIso3.clear();

      rows.forEach((row) => {
        const iso3 = (row.iso3 || '').trim().toUpperCase();
        if (!/^[A-Z]{3}$/.test(iso3)) return;

        const metrics = {};
        CLIMATE_RESILIENCE_KEYS.forEach((key) => {
          const val = parseFloat(row[key]);
          if (Number.isFinite(val)) {
            metrics[key] = val;
          }
        });

        if (Object.keys(metrics).length) {
          climateResilienceByIso3.set(iso3, metrics);
        }
      });

      requestRender();
    })
    .catch((err) => console.error('Climate resilience snapshot data load error', err));
}

function loadSeaLevelRise2026Data() {
  fetch('data/sea_level_rise_by_country_cckp_2026.csv')
    .then((res) => res.text())
    .then((text) => {
      const { rows } = parseCSV(text);
      seaLevelRise2026ByIso3.clear();

      rows.forEach((row) => {
        const iso3 = (row.Code || '').trim().toUpperCase();
        const year = parseInt(row.Year, 10);
        const value = parseFloat(row['Sea level rise (m, projected)']);

        if (!/^[A-Z]{3}$/.test(iso3)) return;
        if (year !== 2026) return;
        if (!Number.isFinite(value)) return;

        seaLevelRise2026ByIso3.set(iso3, value);
      });

      requestRender();
    })
    .catch((err) => console.error('Sea level rise 2026 data load error', err));
}

function loadEnergyTradeImportExport2026Data() {
  fetch('data/energy_trade_import_export_by_country_2026.csv')
    .then((res) => res.text())
    .then((text) => {
      const { rows } = parseCSV(text);
      energyTrade2026ByNormCountry.clear();

      rows.forEach((row) => {
        const country = (row.country || '').trim();
        if (!country) return;

        const normalized = normalizeName(country);
        if (!normalized) return;

        const entry = {};
        [
          'trade_oil_import_mt_2026',
          'trade_oil_export_mt_2026',
          'trade_oil_production_mt_2026',
          'trade_oil_consumption_mt_2026',
          'trade_gas_import_bcm_2026',
          'trade_gas_export_bcm_2026',
          'trade_gas_production_bcm_2026',
          'trade_gas_consumption_bcm_2026',
          'trade_coal_import_mt_2026',
          'trade_coal_export_mt_2026',
          'trade_coal_production_mt_2026',
          'trade_coal_consumption_mt_2026',
        ].forEach((key) => {
          const val = parseFloat(row[key]);
          if (Number.isFinite(val)) entry[key] = val;
        });

        if (Object.keys(entry).length) {
          energyTrade2026ByNormCountry.set(normalized, entry);
        }
      });

      requestRender();
    })
    .catch((err) => console.error('Energy trade 2026 data load error', err));
}

function getBatteryStorageCapacity2023ForCountry(countryName) {
  if (!countryName) return null;

  const candidates = [
    countryName,
    resolveEntityName(countryName),
  ];

  for (const candidate of candidates) {
    const norm = normalizeName(candidate || '');
    if (!norm) continue;
    const val = batteryStorageCapacity2023ByNormCountry.get(norm);
    if (Number.isFinite(val)) return val;
  }

  return null;
}

function getCoalUnitsShutdownForCountry(countryName) {
  if (!countryName) return null;

  const candidates = [
    countryName,
    resolveEntityName(countryName),
  ];

  for (const candidate of candidates) {
    const norm = normalizeName(candidate || '');
    if (!norm) continue;
    const val = coalUnitsShutdownByNormCountry.get(norm);
    if (Number.isFinite(val)) return val;
  }

  return null;
}

function getElectricityCostForCountry(countryName) {
  if (!countryName) return null;
  const candidates = [
    countryName,
    resolveEntityName(countryName),
  ];

  for (const candidate of candidates) {
    const series = metricData.electricity_cost?.get(candidate);
    if (!series) continue;
    const latest = getLatestValue(series);
    if (Number.isFinite(latest)) return latest;
  }

  return null;
}

function getLatestValueAnyYear(entityMap) {
  let latestYear = null;
  let latestVal = null;
  entityMap.forEach((val, year) => {
    if (latestYear === null || year > latestYear) {
      latestYear = year;
      latestVal = val;
    }
  });
  return latestVal;
}

function getGenerationCostForCountry(metricKey, countryName) {
  if (!metricKey || !countryName) return null;
  const dataMap = metricData[metricKey];
  if (!dataMap) return null;

  const candidates = [countryName, resolveEntityName(countryName)].filter(Boolean);

  for (const candidate of candidates) {
    const series = dataMap.get(candidate);
    if (!series) continue;
    const latest = getLatestValueAnyYear(series);
    if (Number.isFinite(latest)) return latest;
  }

  const targetNorm = normalizeName(countryName || '');
  if (!targetNorm) return null;

  for (const [key, series] of dataMap.entries()) {
    if (normalizeName(key) !== targetNorm) continue;
    const latest = getLatestValueAnyYear(series);
    if (Number.isFinite(latest)) return latest;
  }

  return null;
}

function getClimateResilienceMetricForCountry(metricKey, countryName) {
  if (!metricKey || !countryName) return null;
  const iso3 = geoIso3ByName.get(countryName);
  if (!iso3) return null;
  const row = climateResilienceByIso3.get(iso3);
  if (!row) return null;
  const val = row[metricKey];
  return Number.isFinite(val) ? val : null;
}

function getHeatwaveDaysForCountry(countryName) {
  if (!countryName) return null;
  const iso3 = geoIso3ByName.get(countryName);
  if (!iso3) return null;
  const val = heatwaveDaysByIso3.get(iso3);
  return Number.isFinite(val) ? val : null;
}

function getExtremeWeatherEventsForCountry(countryName) {
  if (!countryName) return null;
  const iso3 = geoIso3ByName.get(countryName);
  if (!iso3) return null;
  const val = extremeWeatherEventsByIso3.get(iso3);
  return Number.isFinite(val) ? val : null;
}

function getEnergyTradeMetricForCountry(fieldKey, countryName) {
  if (!fieldKey || !countryName) return null;
  const candidates = [countryName, resolveEntityName(countryName)].filter(Boolean);

  for (const candidate of candidates) {
    const norm = normalizeName(candidate);
    if (!norm) continue;
    const row = energyTrade2026ByNormCountry.get(norm);
    if (!row) continue;
    const val = row[fieldKey];
    if (Number.isFinite(val)) return val;
  }

  return null;
}

function getSnapshotFieldRawValue(fieldKey, countryName) {
  const candidates = [countryName, resolveEntityName(countryName)].filter(Boolean);
  const normCandidates = candidates.map((name) => normalizeName(name || '')).filter(Boolean);

  if (fieldKey === 'battery_storage_capacity_gw_2023') {
    return getBatteryStorageCapacity2023ForCountry(countryName);
  }
  if (fieldKey === 'electricity_cost') {
    return getElectricityCostForCountry(countryName);
  }
  if (fieldKey.startsWith('gen_cost_')) {
    return getGenerationCostForCountry(fieldKey, countryName);
  }
  if (fieldKey === 'coal_units_shut_down_2000_2025') {
    return getCoalUnitsShutdownForCountry(countryName);
  }
  if (fieldKey === 'extreme_weather_events_2024') {
    return getExtremeWeatherEventsForCountry(countryName);
  }
  if (fieldKey === 'heatwave_days_annual_mean_past7y') {
    return getHeatwaveDaysForCountry(countryName);
  }
  if (fieldKey === 'sea_level_rise_2026_m') {
    const iso3 = geoIso3ByName.get(countryName);
    if (!iso3) return null;
    const value = seaLevelRise2026ByIso3.get(iso3);
    return Number.isFinite(value) ? value : null;
  }
  if (fieldKey === 'carbon_price_usd') {
    for (const norm of normCandidates) {
      const value = carbonPriceByNormCountry.get(norm);
      if (Number.isFinite(value)) return value;
    }
    return null;
  }
  if (fieldKey === 'fossil_fuel_subsidies_bn_usd') {
    for (const norm of normCandidates) {
      const value = fossilFuelSubsidiesByNormCountry.get(norm);
      if (Number.isFinite(value)) return value;
    }
    return null;
  }
  if (fieldKey === 'ndc_net_zero_status' || fieldKey === 'ndc_target_year') {
    for (const norm of normCandidates) {
      const ndc = ndcStatusByNormCountry.get(norm);
      if (!ndc) continue;
      if (fieldKey === 'ndc_net_zero_status') return ndc.status || null;
      return Number.isFinite(ndc.targetYear) ? ndc.targetYear : null;
    }
    return null;
  }
  if (fieldKey === 'wildfire_burned_area_latest_kha') {
    for (const candidate of candidates) {
      const series = metricData.wildfire_burned_area?.get(candidate);
      if (!series) continue;
      const latest = getLatestValueAnyYear(series);
      if (Number.isFinite(latest)) return latest;
    }
    for (const [entityName, series] of metricData.wildfire_burned_area.entries()) {
      if (!normCandidates.includes(normalizeName(entityName || ''))) continue;
      const latest = getLatestValueAnyYear(series);
      if (Number.isFinite(latest)) return latest;
    }
    return null;
  }
  if (fieldKey.startsWith('trade_')) {
    return getEnergyTradeMetricForCountry(fieldKey, countryName);
  }
  return getClimateResilienceMetricForCountry(fieldKey, countryName);
}

function renderClimateSnapshotPanel() {
  if (!snapshotPanel || !snapshotTitle || !snapshotContent) return;

  if (!selectedCountry || selectedState) {
    if (lastSnapshotPanelSignature === 'hidden') return;
    lastSnapshotPanelSignature = 'hidden';
    snapshotPanel.style.display = 'none';
    updateDockEmptyStates();
    return;
  }

  const titleText = `${selectedCountry} — Climate snapshot (latest)`;
  const visibleFields = CLIMATE_SNAPSHOT_FIELDS.filter((field) => {
    const tab = field.tab || 'overview';
    return tab === selectedSnapshotTab;
  });

  const renderedFields = visibleFields.map((field) => {
    const raw = getSnapshotFieldRawValue(field.key, selectedCountry);
    let valueText = '—';
    if (field.type === 'text') {
      if (raw) valueText = String(raw);
    } else if (Number.isFinite(raw)) {
      const decimals = Number.isInteger(field.decimals) ? field.decimals : 0;
      valueText = `${raw.toFixed(decimals)}${field.suffix || ''}`;
    }
    return {
      field,
      valueText,
      sourceOptions: getSnapshotSourceOptions(field.key),
    };
  });

  const signature = JSON.stringify({
    titleText,
    selectedSnapshotTab,
    fields: renderedFields.map(({ field, valueText, sourceOptions }) => ({
      key: field.key,
      label: field.label,
      valueText,
      sources: sourceOptions,
    })),
  });

  snapshotPanel.style.display = 'block';
  renderSnapshotTabButtons();
  updateDockEmptyStates();
  if (signature === lastSnapshotPanelSignature) return;
  lastSnapshotPanelSignature = signature;

  snapshotTitle.textContent = titleText;
  snapshotContent.className = 'snapshot-grid';
  snapshotContent.textContent = '';

  renderedFields.forEach(({ field, valueText, sourceOptions }) => {
    const keyEl = document.createElement('div');
    keyEl.className = 'snapshot-key';
    keyEl.textContent = field.label;

    if (sourceOptions.length) {
      const sourceDropdown = document.createElement('span');
      sourceDropdown.className = 'snapshot-source-dropdown';

      const sourceToggle = document.createElement('button');
      sourceToggle.type = 'button';
      sourceToggle.className = 'snapshot-source-toggle';
      sourceToggle.textContent = 'source';

      const sourceMenu = document.createElement('div');
      sourceMenu.className = 'snapshot-source-menu';

      sourceOptions.forEach((src) => {
        const a = document.createElement('a');
        a.className = 'snapshot-source-option';
        a.href = src.href;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = src.label;
        sourceMenu.appendChild(a);
      });

      sourceToggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const willOpen = !sourceDropdown.classList.contains('open');
        closeAllSnapshotSourceMenus();
        if (willOpen) sourceDropdown.classList.add('open');
      });

      sourceMenu.addEventListener('click', () => {
        sourceDropdown.classList.remove('open');
      });

      sourceDropdown.appendChild(sourceToggle);
      sourceDropdown.appendChild(sourceMenu);
      keyEl.appendChild(sourceDropdown);
    }

    const valueEl = document.createElement('div');
    valueEl.className = 'snapshot-value';
    valueEl.textContent = valueText;

    snapshotContent.appendChild(keyEl);
    snapshotContent.appendChild(valueEl);
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
  // Only track left-click for custom drag detection
  if (event.button !== 0) return;
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
  if (target && (
    target.closest('.info-dock')
    || target.closest('.country-panel')
    || target.closest('.hud')
    || target.closest('.chart-panel')
    || target.closest('.snapshot-panel')
    || target.closest('.thermal-toggle-wrap')
    || target.closest('.sources-modal')
    || target.closest('.co2-ribbon')
  )) {
    return;
  }

  const clickMouse = new THREE.Vector2(
    (event.clientX / window.innerWidth) * 2 - 1,
    -(event.clientY / window.innerHeight) * 2 + 1
  );

  const hit = getLatLonFromMouse(clickMouse);
  if (!hit) {
    setSelectedOcean(false);
    setSelectedCountry(null);
    return;
  }

  const { lat, lon } = hit;

  // if US or a state is selected, allow state selection
  if ((selectedCountry === US_COUNTRY_NAME || selectedState) && usStatesData) {
    const state = findStateAtLatLon(lat, lon);
    if (state) {
      setSelectedOcean(false);
      setSelectedCountry(null);
      selectedState = state;
      applyCountrySelectionVisuals(US_COUNTRY_NAME);
      syncInteractivePanels();
      requestRender();
      return;
    }
  }

  selectedState = null;
  const country = findCountryAtLatLon(lat, lon);

  if (country) {
    setSelectedOcean(false);
    setSelectedCountry(country);
  } else {
    setSelectedCountry(null);
    setSelectedOcean(true);
  }
  updateUsStateVisibility();
  requestRender();
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
    ? (getLatestRenewablePercent(selectedState, true) ?? getLatestRenewablePercent(US_COUNTRY_NAME) ?? 15)
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

function requestRender() {
  needsRender = 10;
}

function setSelectedCountry(countryName) {
  if (selectedCountry === countryName) return;
  selectedCountry = countryName;
  if (countryName) {
    selectedOcean = false;
  }
  if (countryName !== US_COUNTRY_NAME) {
    selectedState = null;
  }
  requestRender();
  requestRender();

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
  syncInteractivePanels();
}

function setSelectedOcean(isSelected) {
  if (selectedOcean === isSelected) return;
  selectedOcean = isSelected;
  if (isSelected) {
    selectedCountry = null;
    selectedState = null;
    applyCountrySelectionVisuals(null);
  }
  applyOceanSelectionVisuals();
  syncInteractivePanels();
  requestRender();
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

  applyOceanSelectionVisuals();

  if (!countryName || !geoJsonData) {
    if (borders) {
      borders.children.forEach((line) => {
        const isSelected = false;
        const layerIndex = line.userData ? line.userData.layerIndex : 0;
        line.visible = isSelected ? true : layerIndex < 2;
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
  requestRender();
}

function applyOceanSelectionVisuals() {
  if (oceanParticleSystem && oceanParticleSystem.material) {
    oceanParticleSystem.material.size = selectedOcean ? 0.0125 : 0.005;
    oceanParticleSystem.material.opacity = selectedOcean ? 1.0 : 0.8;
    oceanParticleSystem.material.needsUpdate = true;
  }
  if (oceanColorAttr) {
    // normal: rgb(0, 0.5, 1)  — medium blue
    // selected: rgb(0, 0.18, 0.72) — deep ocean blue
    const r = 0;
    const g = selectedOcean ? 0.18 : 0.5;
    const b = selectedOcean ? 0.72 : 1.0;
    const arr = oceanColorAttr.array;
    for (let i = 0; i < arr.length; i += 3) {
      arr[i]     = r;
      arr[i + 1] = g;
      arr[i + 2] = b;
    }
    oceanColorAttr.needsUpdate = true;
  }

  if (earthMat) {
    if (selectedOcean) {
    //   earthMat.color.set(0x8ba0b5);       // subtle blue tint over the texture
    //   earthMat.emissive.set(0x081828);    // very dark ocean-blue glow
    //   earthMat.emissiveIntensity = 0.12;
    } else if (!thermalViewActive) {
      earthMat.color.set(0x888888);       // original neutral grey multiply
      earthMat.emissive.set(0x000000);
      earthMat.emissiveIntensity = 0;
    }
    earthMat.needsUpdate = true;
  }
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

function loadMetricFromCsv(text, valueColumn, options = {}) {
  const { rows } = parseCSV(text);
  const minYear = Number.isFinite(options.minYear) ? options.minYear : YEAR_START;
  const maxYear = Number.isFinite(options.maxYear) ? options.maxYear : YEAR_END;
  const data = new Map();
  rows.forEach((row) => {
    const entity = row.Entity;
    const year = parseInt(row.Year, 10);
    const val = parseFloat(row[valueColumn]);
    if (!entity || Number.isNaN(year) || Number.isNaN(val)) return;
    if (year < minYear || year > maxYear) return;
    if (!data.has(entity)) data.set(entity, new Map());
    data.get(entity).set(year, val);
  });
  return data;
}

function loadSummedMetricFromCsv(text, valueColumns) {
  const { rows } = parseCSV(text);
  const data = new Map();
  rows.forEach((row) => {
    const entity = row.Entity;
    const year = parseInt(row.Year, 10);
    if (!entity || Number.isNaN(year)) return;
    if (year < YEAR_START || year > YEAR_END) return;

    let sum = 0;
    let hasAny = false;
    valueColumns.forEach((col) => {
      const val = parseFloat(row[col]);
      if (Number.isFinite(val)) {
        sum += val;
        hasAny = true;
      }
    });
    if (!hasAny) return;

    if (!data.has(entity)) data.set(entity, new Map());
    data.get(entity).set(year, sum);
  });
  return data;
}

function canonicalizeTemperatureCountryName(name) {
  let n = (name || '').trim();
  if (!n) return n;
  if (/,\s*The$/.test(n)) {
    n = `The ${n.replace(/,\s*The$/, '')}`;
  }
  n = n.replace(/,\s*(Islamic Rep\. of|Rep\. of|Kingdom of|Principality of|State of)$/i, '');
  return n.trim();
}

function loadTemperatureMetricFromCsv(text) {
  const { headers, rows } = parseCSV(text);
  const data = new Map();
  temperatureByIso3.clear();

  const yearCols = headers
    .filter((h) => /^\d{4}$/.test(h))
    .map((h) => parseInt(h, 10))
    .filter((year) => year >= YEAR_START && year <= YEAR_END);

  rows.forEach((row) => {
    const country = (row.Country || '').trim();
    const iso3 = (row.ISO3 || '').trim().toUpperCase();
    if (!country) return;

    const yearMap = new Map();
    yearCols.forEach((year) => {
      const val = parseFloat(row[String(year)]);
      if (Number.isFinite(val)) {
        yearMap.set(year, val);
      }
    });
    if (!yearMap.size) return;

    data.set(country, yearMap);

    const canonical = canonicalizeTemperatureCountryName(country);
    if (canonical && !data.has(canonical)) {
      data.set(canonical, yearMap);
    }

    const noCommaVariant = country.replace(/,/g, '').trim();
    if (noCommaVariant && !data.has(noCommaVariant)) {
      data.set(noCommaVariant, yearMap);
    }

    if (iso3 && iso3.length === 3) {
      temperatureByIso3.set(iso3, yearMap);
    }
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
  geoIso3ByName.clear();
  if (!geoJsonData) return;
  geoJsonData.features.forEach((feat) => {
    const name = feat.properties.name;
    geoNameNormMap.set(normalizeName(name), name);
    const iso3 = String(
      feat.id ||
      feat.properties?.ISO3166-1-Alpha-3 ||
      feat.properties?.iso_a3 ||
      ''
    ).trim().toUpperCase();
    if (iso3 && iso3.length === 3) {
      geoIso3ByName.set(name, iso3);
    }
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

    function getLatestRenewablePercent(name, preferState = false) {
      if (preferState) {
        const stateMap = stateData.renewables.get(name);
        const stateLatest = stateMap ? getLatestValue(stateMap) : null;
        if (Number.isFinite(stateLatest)) return stateLatest;
      }

      const directValue = renewableEnergyData[name];
      if (Number.isFinite(directValue)) return directValue;

      const entityName = resolveEntityName(name);
      const entityMap = metricData.renewables.get(entityName);
      const entityLatest = entityMap ? getLatestValue(entityMap) : null;
      if (Number.isFinite(entityLatest)) return entityLatest;

      const fallbackStateMap = stateData.renewables.get(name);
      const fallbackStateLatest = fallbackStateMap ? getLatestValue(fallbackStateMap) : null;
      if (Number.isFinite(fallbackStateLatest)) return fallbackStateLatest;

      return null;
    }
  return latestVal;
}

function getLatestRenewablePercent(name, preferState = false) {
  if (preferState) {
    const stateMap = stateData.renewables.get(name);
    const stateLatest = stateMap ? getLatestValue(stateMap) : null;
    if (Number.isFinite(stateLatest)) return stateLatest;
  }

  const direct = renewableEnergyData[name];
  if (Number.isFinite(direct)) return direct;

  const entityName = resolveEntityName(name);
  const entityMap = metricData.renewables.get(entityName);
  const latest = entityMap ? getLatestValue(entityMap) : null;
  if (Number.isFinite(latest)) return latest;

  const fallbackStateMap = stateData.renewables.get(name);
  const fallbackStateLatest = fallbackStateMap ? getLatestValue(fallbackStateMap) : null;
  if (Number.isFinite(fallbackStateLatest)) return fallbackStateLatest;

  return null;
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

function getCo2ContributionColor(percent) {
  const t = Math.max(0, Math.min(1, percent / 20)); // 20%+ clamped to max intensity
  // deep blue -> cyan -> yellow -> red
  if (t < 0.33) {
    const u = t / 0.33;
    return new THREE.Color(0.15 + 0.05 * u, 0.3 + 0.5 * u, 0.8 + 0.2 * u);
  }
  if (t < 0.66) {
    const u = (t - 0.33) / 0.33;
    return new THREE.Color(0.2 + 0.8 * u, 0.8 + 0.15 * u, 1.0 - 1.0 * u);
  }
  const u = (t - 0.66) / 0.34;
  return new THREE.Color(1.0, 0.95 - 0.7 * u, 0.0);
}

function buildCo2Ribbon() {
  if (!co2RibbonTrack || !co2RibbonTooltip || !geoJsonData || !metricData.emissions_total) return;

  const entries = [];
  metricData.emissions_total.forEach((yearMap, csvName) => {
    const geoName = resolveGeoNameFromCsv(csvName);
    if (!geoName) return;
    const emission2023 = yearMap.get(2023);
    if (!Number.isFinite(emission2023) || emission2023 <= 0) return;
    entries.push({ csvName, geoName, emission2023 });
  });

  if (!entries.length) {
    co2RibbonTrack.innerHTML = '';
    return;
  }

  const total = entries.reduce((sum, e) => sum + e.emission2023, 0);
  const withShare = entries
    .map((e) => ({ ...e, sharePct: (e.emission2023 / total) * 100 }))
    .sort((a, b) => b.sharePct - a.sharePct);

  co2RibbonTrack.innerHTML = '';

  withShare.forEach((entry) => {
    const block = document.createElement('div');
    block.className = 'co2-ribbon-block';
    block.style.flexGrow = `${Math.max(entry.sharePct, 0.001)}`;
    block.style.flexBasis = '0';

    const color = getCo2ContributionColor(entry.sharePct);
    const r = Math.round(Math.min(1, color.r) * 255);
    const g = Math.round(Math.min(1, color.g) * 255);
    const b = Math.round(Math.min(1, color.b) * 255);
    block.style.background = `rgb(${r}, ${g}, ${b})`;

    block.addEventListener('mouseenter', () => {
      co2RibbonTooltip.style.display = 'block';
      co2RibbonTooltip.textContent = `${entry.csvName}: ${entry.sharePct.toFixed(2)}% of global CO₂ (2023)`;
    });

    block.addEventListener('mousemove', (event) => {
      co2RibbonTooltip.style.left = `${event.clientX}px`;
      co2RibbonTooltip.style.top = `${event.clientY}px`;
    });

    block.addEventListener('mouseleave', () => {
      co2RibbonTooltip.style.display = 'none';
    });

    block.addEventListener('click', () => {
      setSelectedCountry(entry.geoName);
      focusOnCountry(entry.geoName);
      updateUsStateVisibility();
      requestRender();
    });

    co2RibbonTrack.appendChild(block);
  });
}

async function loadAllMetrics() {
  const [renewText, sourceMixText, elecGenText, energyUsePerPersonText, electricityAccessText, evSalesText, popText, totalText, gdpText, generationCostBySourceText, electricityCostText, carbonIntensityText, tempText, heatDeathsText] = await Promise.all([
    fetch('data/share-electricity-renewables/share-electricity-renewables.csv').then((r) => r.text()),
    fetch('data/share-elec-by-source/share-elec-by-source.csv').then((r) => r.text()),
    fetch('data/electricity-generation/electricity-generation.csv').then((r) => r.text()),
    fetch('data/energy-use-per-person/energy-use-per-person.csv').then((r) => r.text()),
    fetch('data/share-of-the-population-with-access-to-electricity/share-of-the-population-with-access-to-electricity.csv').then((r) => r.text()),
    fetch('data/share-car-sales-battery-plugin/share-car-sales-battery-plugin.csv').then((r) => r.text()),
    fetch('data/population/population.csv').then((r) => r.text()),
    fetch('data/annual-co-emissions-by-region/annual-co-emissions-by-region.csv').then((r) => r.text()),
    fetch('data/gdp-penn-world-table/gdp-penn-world-table.csv').then((r) => r.text()),
    fetch('data/generation_cost_country_source_usd_per_mwh_2026_proxy.csv').then((r) => r.text()),
    fetch('data/cost_of_electricity_by_country_wpr_2026.csv').then((r) => r.text()),
    fetch('data/carbon-intensity-electricity/carbon-intensity-electricity.csv').then((r) => r.text()),
    fetch('data/Indicator_3_1_Climate_Indicators_Annual_Mean_Global_Surface_Temperature_6121427861384429071.csv').then((r) => r.text()),
    fetch('data/number-of-deaths-from-natural-disasters/number-of-deaths-from-natural-disasters.csv').then((r) => r.text()),
  ]);

  metricData.renewables = loadMetricFromCsv(renewText, 'Renewables');
  metricData.coal_share = loadMetricFromCsv(sourceMixText, 'Coal');
  metricData.gas_share = loadMetricFromCsv(sourceMixText, 'Gas');
  metricData.hydropower_share = loadMetricFromCsv(sourceMixText, 'Hydropower');
  metricData.solar_share = loadMetricFromCsv(sourceMixText, 'Solar');
  metricData.wind_share = loadMetricFromCsv(sourceMixText, 'Wind');
  metricData.oil_share = loadMetricFromCsv(sourceMixText, 'Oil');
  metricData.nuclear_share = loadMetricFromCsv(sourceMixText, 'Nuclear');
  metricData.other_renewables_share = loadMetricFromCsv(sourceMixText, 'Other renewables');
  metricData.bioenergy_share = loadMetricFromCsv(sourceMixText, 'Bioenergy');
  metricData.electricity_generation_total = loadMetricFromCsv(elecGenText, 'Total electricity');
  metricData.energy_use_per_person = loadMetricFromCsv(energyUsePerPersonText, 'Per capita energy consumption');
  metricData.electricity_access_share = loadMetricFromCsv(electricityAccessText, 'Share of the population with access to electricity');
  metricData.ev_sales_share = loadSummedMetricFromCsv(evSalesText, ['Plug-in hybrid', 'Battery-electric']);
  metricData.population = loadMetricFromCsv(popText, 'all years');
  metricData.emissions_total = loadMetricFromCsv(totalText, 'Annual CO₂ emissions');
  metricData.gdp = loadMetricFromCsv(gdpText, 'GDP');
  metricData.gen_cost_coal = loadMetricFromCsv(generationCostBySourceText, 'Coal', { minYear: 1900, maxYear: 2100 });
  metricData.gen_cost_gas = loadMetricFromCsv(generationCostBySourceText, 'Gas', { minYear: 1900, maxYear: 2100 });
  metricData.gen_cost_hydro = loadMetricFromCsv(generationCostBySourceText, 'Hydro', { minYear: 1900, maxYear: 2100 });
  metricData.gen_cost_solar = loadMetricFromCsv(generationCostBySourceText, 'Solar', { minYear: 1900, maxYear: 2100 });
  metricData.gen_cost_wind = loadMetricFromCsv(generationCostBySourceText, 'Wind', { minYear: 1900, maxYear: 2100 });
  metricData.gen_cost_oil = loadMetricFromCsv(generationCostBySourceText, 'Oil', { minYear: 1900, maxYear: 2100 });
  metricData.gen_cost_nuclear = loadMetricFromCsv(generationCostBySourceText, 'Nuclear', { minYear: 1900, maxYear: 2100 });
  metricData.gen_cost_other_renewables = loadMetricFromCsv(generationCostBySourceText, 'Other renewables', { minYear: 1900, maxYear: 2100 });
  metricData.electricity_cost = loadMetricFromCsv(electricityCostText, 'Electricity cost (USD per kWh)');
  metricData.carbon_intensity = loadMetricFromCsv(carbonIntensityText, 'Carbon intensity of electricity per kWh');
  metricData.temperature_change = loadTemperatureMetricFromCsv(tempText);
  metricData.extreme_weather_deaths = loadSummedMetricFromCsv(heatDeathsText, [
    'Extreme temperatures',
    'Floods',
    'Droughts',
    'Storms',
  ]);
  buildRenewableNameMaps();
  updateRenewableEnergyData();
  buildCo2Ribbon();
}

async function loadOwid3Metrics() {
  const [co2capText, methaneText, lucText, wfText] = await Promise.all([
    fetch('data/co2_per_capita_by_country_owid.csv').then((r) => r.text()),
    fetch('data/methane_by_country_owid.csv').then((r) => r.text()),
    fetch('data/land_use_change_co2_by_country_owid.csv').then((r) => r.text()),
    fetch('data/wildfire_burned_area_by_country_gwis.csv').then((r) => r.text()),
  ]);
  metricData.emissions_per_capita = loadMetricFromCsv(co2capText, 'CO2 per capita (t)');
  metricData.methane_emissions     = loadMetricFromCsv(methaneText, 'Methane emissions (MtCO2e)');
  metricData.land_use_change_co2   = loadMetricFromCsv(lucText, 'Land-use change CO2 (MtCO2)');
  metricData.wildfire_burned_area  = loadMetricFromCsv(wfText, 'Wildfire burned area (thousand ha)');
  requestRender();
}

function loadStateWildfireData() {
  fetch('data/wildfire_burned_acres_by_state_nifc.csv')
    .then((r) => r.text())
    .then((text) => {
      const lines = text.trim().split(/\r?\n/);
      lines.slice(1).forEach((line) => {
        const [state, yearStr, acresStr] = line.split(',');
        if (!state) return;
        const year  = parseInt(yearStr, 10);
        const acres = parseFloat(acresStr);
        if (isNaN(year) || isNaN(acres)) return;
        if (!stateData.wildfire_acres.has(state)) stateData.wildfire_acres.set(state, new Map());
        stateData.wildfire_acres.get(state).set(year, acres);
      });
      requestRender();
    })
    .catch((e) => console.warn('Wildfire state data load error', e));
}

function loadStateDroughtData() {
  fetch('data/drought_severity_by_state_noaa.csv')
    .then((r) => r.text())
    .then((text) => {
      const lines = text.trim().split(/\r?\n/);
      lines.slice(1).forEach((line) => {
        const [state, yearStr, pctStr] = line.split(',');
        if (!state) return;
        const year = parseInt(yearStr, 10);
        const pct  = parseFloat(pctStr);
        if (isNaN(year) || isNaN(pct)) return;
        if (!stateData.drought_severity.has(state)) stateData.drought_severity.set(state, new Map());
        stateData.drought_severity.get(state).set(year, pct);
      });
      requestRender();
    })
    .catch((e) => console.warn('Drought state data load error', e));
}

function loadCarbonPriceData() {
  fetch('data/carbon_price_by_country_wb_2025.csv')
    .then((r) => r.text())
    .then((text) => {
      const lines = text.trim().split(/\r?\n/);
      lines.slice(1).forEach((line) => {
        const parts = line.split(',');
        const country = parts[0]?.trim();
        const price   = parseFloat(parts[2]);
        if (!country || isNaN(price)) return;
        carbonPriceByNormCountry.set(normalizeName(country), price);
      });
      requestRender();
    })
    .catch((e) => console.warn('Carbon price data load error', e));
}

function loadFossilFuelSubsidiesData() {
  fetch('data/fossil_fuel_subsidies_by_country_imf_2024.csv')
    .then((r) => r.text())
    .then((text) => {
      const lines = text.trim().split(/\r?\n/);
      lines.slice(1).forEach((line) => {
        const parts = line.split(',');
        const country = parts[0]?.trim();
        const val     = parseFloat(parts[2]);
        if (!country || isNaN(val)) return;
        fossilFuelSubsidiesByNormCountry.set(normalizeName(country), val);
      });
      requestRender();
    })
    .catch((e) => console.warn('Fossil fuel subsidies data load error', e));
}

function loadNdcStatusData() {
  fetch('data/ndc_net_zero_status_by_country_2025.csv')
    .then((r) => r.text())
    .then((text) => {
      const lines = text.trim().split(/\r?\n/);
      lines.slice(1).forEach((line) => {
        const parts = line.split(',');
        const country   = parts[0]?.trim();
        const status    = parts[2]?.trim();
        const targetYear = parseInt(parts[3], 10);
        if (!country || !status) return;
        ndcStatusByNormCountry.set(normalizeName(country), { status, targetYear: isNaN(targetYear) ? null : targetYear });
      });
      requestRender();
    })
    .catch((e) => console.warn('NDC status data load error', e));
}

loadAllMetrics();
loadOwid3Metrics();
loadUsStates();
loadStateCapacityData();
loadStatePopulationData();
loadStateCO2Data();
loadStateGDPData();
loadStateInsuranceData();
loadStateWildfireData();
loadStateDroughtData();
loadHeatwaveCountryData();
loadExtremeWeatherEventsData();
loadBatteryStorage2023Data();
loadCoalUnitsShutdownData();
loadClimateResilienceSnapshotData();
loadSeaLevelRise2026Data();
loadEnergyTradeImportExport2026Data();
loadNasaTempData();
loadOceanData();
loadClimateGDPData();
loadCarbonPriceData();
loadFossilFuelSubsidiesData();
loadNdcStatusData();

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

function loadStateInsuranceData() {
  fetch('data/state_homeowners_insurance_premiums.csv')
    .then((res) => res.text())
    .then((text) => {
      const lines = text.trim().split(/\r?\n/);

      lines.slice(1).forEach((line) => {
        const cols = splitCSVLine(line);
        const stateName = cols[0]?.trim();
        const year = parseInt(cols[1], 10);
        const premium = parseFloat(cols[2]);

        if (!stateName || year < YEAR_START || year > YEAR_END || !Number.isFinite(premium)) return;

        if (!stateData.insurance_cost.has(stateName)) {
          stateData.insurance_cost.set(stateName, new Map());
        }

        stateData.insurance_cost.get(stateName).set(year, premium);
      });
    })
    .catch((err) => console.error('State insurance load error', err));
}

function getMetricSeries(country, metricKey) {
  if (metricKey.startsWith('climate_gdp_')) {
    const iso3 = geoIso3ByName.get(country);
    if (!iso3) return GDP_CLIMATE_YEARS.map(() => null);
    const yearMap = gdpClimateDataByISO3[metricKey]?.get(iso3);
    if (!yearMap) return GDP_CLIMATE_YEARS.map(() => null);
    return GDP_CLIMATE_YEARS.map((yr) => (yearMap.has(yr) ? yearMap.get(yr) : null));
  }
  if (metricKey === 'temperature_change') {
    const directMap = metricData.temperature_change;
    const direct = directMap.get(country)
      || directMap.get(canonicalizeTemperatureCountryName(country))
      || directMap.get(resolveEntityName(country));

    if (direct) {
      const series = [];
      YEARS.forEach((year) => {
        const val = direct.get(year);
        series.push(Number.isFinite(val) ? val : null);
      });
      return series;
    }

    const iso3 = geoIso3ByName.get(country);
    if (iso3 && temperatureByIso3.has(iso3)) {
      const isoMap = temperatureByIso3.get(iso3);
      const series = [];
      YEARS.forEach((year) => {
        const val = isoMap.get(year);
        series.push(Number.isFinite(val) ? val : null);
      });
      return series;
    }
  }

  const dataMap = metricData[metricKey];
  if (!dataMap) return YEARS.map(() => null);

  const candidates = [country, resolveEntityName(country)].filter(Boolean);
  let entityMap = null;

  for (const candidate of candidates) {
    const found = dataMap.get(candidate);
    if (found) {
      entityMap = found;
      break;
    }
  }

  if (!entityMap) {
    const targetNorm = normalizeName(country || '');
    if (targetNorm) {
      for (const [key, value] of dataMap.entries()) {
        if (normalizeName(key) === targetNorm) {
          entityMap = value;
          break;
        }
      }
    }
  }

  const series = [];
  YEARS.forEach((year) => {
    const val = entityMap?.get(year);
    series.push(Number.isFinite(val) ? val : null);
  });
  return series;
}

function getStateSeries(stateName, metricKey) {
  if ([
    'coal_share',
    'gas_share',
    'hydropower_share',
    'solar_share',
    'wind_share',
    'oil_share',
    'nuclear_share',
    'other_renewables_share',
    'bioenergy_share',
    'electricity_generation_total',
    'energy_use_per_person',
    'electricity_access_share',
    'electricity_cost',
    'gen_cost_coal',
    'gen_cost_gas',
    'gen_cost_hydro',
    'gen_cost_solar',
    'gen_cost_wind',
    'gen_cost_oil',
    'gen_cost_nuclear',
    'gen_cost_other_renewables',
    'ev_sales_share',
    'carbon_intensity',
    'temperature_change',
    'extreme_weather_deaths',
    'climate_gdp_hot_house',
    'climate_gdp_delayed',
    'climate_gdp_net_zero',
    'emissions_per_capita',
    'methane_emissions',
    'land_use_change_co2',
    'wildfire_burned_area',
  ].includes(metricKey)) {
    return YEARS.map(() => null);
  }

  // Wildfire acres (state-specific, sparse data — return available years)
  if (metricKey === 'wildfire_acres') {
    const wfMap = stateData.wildfire_acres.get(stateName);
    if (wfMap) {
      return YEARS.map((year) => {
        const val = wfMap.get(year);
        return Number.isFinite(val) ? val : null;
      });
    }
    return YEARS.map(() => null);
  }

  // Drought severity (state-specific, sparse data)
  if (metricKey === 'drought_severity') {
    const drMap = stateData.drought_severity.get(stateName);
    if (drMap) {
      return YEARS.map((year) => {
        const val = drMap.get(year);
        return Number.isFinite(val) ? val : null;
      });
    }
    return YEARS.map(() => null);
  }

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

  if (metricKey === 'insurance_cost') {
    const insuranceMap = stateData.insurance_cost.get(stateName);
    if (insuranceMap) {
      const series = [];
      YEARS.forEach((year) => {
        const val = insuranceMap.get(year);
        series.push(Number.isFinite(val) ? val : null);
      });
      return series;
    }
  }

  if (metricKey === 'insurance_cost_yoy') {
    const insuranceMap = stateData.insurance_cost.get(stateName);
    if (insuranceMap) {
      const series = [];
      YEARS.forEach((year, i) => {
        if (i === 0) {
          series.push(null);
          return;
        }
        const prevYear = YEARS[i - 1];
        const prevVal = insuranceMap.get(prevYear);
        const currVal = insuranceMap.get(year);
        if (!Number.isFinite(prevVal) || !Number.isFinite(currVal) || prevVal === 0) {
          series.push(null);
          return;
        }
        series.push(((currVal - prevVal) / prevVal) * 100);
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
  if (unit === '°C') return `${val.toFixed(2)}°C`;
  if (unit === '°F') return `${val.toFixed(2)}°F`;
  if (unit === 'USD/kWh') return `$${val.toFixed(2)}`;
  if (unit === 'USD/MWh') return `$${val.toFixed(1)}`;
  if (unit === 't/person') return `${val.toFixed(2)} t/person`;
  if (unit === 'MtCO₂e') return `${val.toFixed(1)} MtCO₂e`;
  if (unit === 'MtCO₂') return `${val.toFixed(1)} MtCO₂`;
  if (unit === 'kHa') return `${val.toFixed(0)} kHa`;
  if (unit === 'M km²') return `${val.toFixed(2)} M km²`;
  if (unit === 'acres') return `${val.toFixed(0)} acres`;
  if (unit === 'pH') return `${val.toFixed(3)} pH`;
  if (unit === 'mm') return `${val.toFixed(1)} mm`;
  if (unit === 'in') return `${val.toFixed(2)} in`;
  if (unit === 'ft') return `${val.toFixed(3)} ft`;
  if (unit === '×10²² J') return `${val.toFixed(1)} ×10²² J`;
  const abs = Math.abs(val);
  if (abs >= 1e9) return `${(val / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${(val / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${(val / 1e3).toFixed(1)}K`;
  return `${val.toFixed(0)}`;
}

function shouldShowExplicitGraphUnit(unit) {
  return unit === 'TWh' || unit === 'kWh' || unit === 'gCO₂/kWh' || unit === 't' || unit === 'USD/kWh' || unit === 'USD/MWh';
}

function formatValueForChart(val, unit) {
  const base = formatValue(val, unit);
  if (!shouldShowExplicitGraphUnit(unit)) return base;
  return `${base} ${unit}`;
}

function getYearLabelStep(years) {
  const span = years[years.length - 1] - years[0];
  if (span <= 0) return 1;

  const roughStep = span / 5;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const normalized = roughStep / magnitude;

  let niceStep = 1;
  if (normalized <= 1) niceStep = 1;
  else if (normalized <= 2) niceStep = 2;
  else if (normalized <= 5) niceStep = 5;
  else niceStep = 10;

  return niceStep * magnitude;
}

function drawTrendChart(series, color, unit, years = YEARS) {
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
    trendCtx.fillText(formatValueForChart(val, unit), padLeft - 4, y);
  });

  // year labels
  trendCtx.textAlign = 'center';
  trendCtx.textBaseline = 'top';
  const yearStep = getYearLabelStep(years);
  for (let i = 0; i < years.length; i++) {
    const year = years[i];
    if (year !== years[0] && year !== years[years.length - 1] && (year - years[0]) % yearStep !== 0) {
      continue;
    }
    const x = padLeft + (i / (series.length - 1)) * (w - padLeft - padRight);
    trendCtx.fillText(`${year}`, x, h - padBottom + 4);
  }
  // zero reference line (for GDP / anomaly charts where data crosses zero)
  if (minVal < 0 && maxVal > 0) {
    const zeroY = padTop + (1 - (0 - minVal) / (maxVal - minVal)) * (h - padTop - padBottom);
    trendCtx.save();
    trendCtx.strokeStyle = 'rgba(255,255,255,0.30)';
    trendCtx.lineWidth = 1;
    trendCtx.setLineDash([4, 2]);
    trendCtx.beginPath();
    trendCtx.moveTo(padLeft, zeroY);
    trendCtx.lineTo(w - padRight, zeroY);
    trendCtx.stroke();
    trendCtx.setLineDash([]);
      trendCtx.fillStyle = 'rgba(255,255,255,0.35)';
    trendCtx.font = '8px Arial';
      trendCtx.textAlign = 'left';
    trendCtx.textBaseline = 'bottom';
      trendCtx.fillText('← no impact', padLeft + 4, zeroY - 2);
    trendCtx.restore();
  }

  // projection indicator: dashed line at 2026 (first IMF projected year)
  const projIdx = years.indexOf(2026);
  if (projIdx > 0) {
    const projX = padLeft + (projIdx / (years.length - 1)) * (w - padLeft - padRight);
    trendCtx.save();
    trendCtx.strokeStyle = 'rgba(255,255,255,0.22)';
    trendCtx.lineWidth = 1;
    trendCtx.setLineDash([3, 3]);
    trendCtx.beginPath();
    trendCtx.moveTo(projX, padTop);
    trendCtx.lineTo(projX, h - padBottom);
    trendCtx.stroke();
    trendCtx.setLineDash([]);
    trendCtx.fillStyle = 'rgba(255,255,255,0.32)';
    trendCtx.font = '9px Arial';
    trendCtx.textAlign = 'right';
    trendCtx.textBaseline = 'top';
    trendCtx.fillText('Historical ◀', projX - 4, padTop + 2);
    trendCtx.textAlign = 'left';
    trendCtx.fillText('▶ Projected', projX + 4, padTop + 2);
    trendCtx.restore();
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

  // rotated Y-axis label for GDP charts
  if (unit === '% of GDP') {
    trendCtx.save();
    trendCtx.fillStyle = 'rgba(255,255,255,0.32)';
    trendCtx.font = '8px Arial';
    trendCtx.textAlign = 'center';
    trendCtx.textBaseline = 'middle';
    trendCtx.translate(7, padTop + (h - padTop - padBottom) / 2);
    trendCtx.rotate(-Math.PI / 2);
    trendCtx.fillText('% of GDP  (loss ↓ / gain ↑)', 0, 0);
    trendCtx.restore();
  }

  // split fill — red below zero (loss), green above zero (gain), else standard gradient
  const crossesZero = minVal < 0 && maxVal > 0;
  const zeroFillY = crossesZero
    ? padTop + (1 - (0 - minVal) / (maxVal - minVal)) * (h - padTop - padBottom)
    : null;

  function buildFillPath() {
    trendCtx.beginPath();
    let fs = false;
    series.forEach((v, i) => {
      if (v === null || Number.isNaN(v)) { fs = false; return; }
      const x = padLeft + (i / (series.length - 1)) * (w - padLeft - padRight);
      const y = padTop + (1 - (v - minVal) / (maxVal - minVal)) * (h - padTop - padBottom);
      if (!fs) { trendCtx.moveTo(x, y); fs = true; } else trendCtx.lineTo(x, y);
    });
    trendCtx.lineTo(w - padRight, h - padBottom);
    trendCtx.lineTo(padLeft, h - padBottom);
    trendCtx.closePath();
  }

  if (crossesZero) {
    // red fill for loss region (below zero line)
    trendCtx.save();
    trendCtx.beginPath();
    trendCtx.rect(padLeft, zeroFillY, w - padLeft - padRight, h - padBottom - zeroFillY + 1);
    trendCtx.clip();
    buildFillPath();
    trendCtx.fillStyle = 'rgba(255, 70, 50, 0.20)';
    trendCtx.fill();
    trendCtx.restore();
    // green fill for gain region (above zero line)
    trendCtx.save();
    trendCtx.beginPath();
    trendCtx.rect(padLeft, padTop, w - padLeft - padRight, zeroFillY - padTop + 1);
    trendCtx.clip();
    buildFillPath();
    trendCtx.fillStyle = 'rgba(50, 210, 90, 0.20)';
    trendCtx.fill();
    trendCtx.restore();
  } else {
    const grad = trendCtx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, `rgba(${r},${g},${b},0.35)`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    trendCtx.fillStyle = grad;
    trendCtx.lineTo(w - padRight, h - padBottom);
    trendCtx.lineTo(padLeft, h - padBottom);
    trendCtx.closePath();
    trendCtx.fill();
  }
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
      const percent = getLatestRenewablePercent(stateName, true);
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
      syncInteractivePanels();
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
controls.enablePan = false; // Disable panning entirely
controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.ZOOM, RIGHT: THREE.MOUSE.ROTATE };

// Prevent context menu on canvas to allow right-click drag
renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

// lighting
// const directionalLight = new THREE.DirectionalLight(0, 1);
// directionalLight.position.set(5, 3, 5);
// scene.add(directionalLight);
const ambient = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambient);

// earth geometry & material
const earthGeo = new THREE.SphereGeometry(1, 64, 64);
earthMat = new THREE.MeshPhongMaterial({
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
    // gradient: red (low) -> yellow -> green -> sky blue (high)
    if (t < 0.333) {
        const s = t / 0.333; // 0 to 1 within red->yellow
        return new THREE.Color(1, s, 0); // red -> yellow
    } else if (t < 0.667) {
        const s = (t - 0.333) / 0.333; // 0 to 1 within yellow->green
        return new THREE.Color(1 - s, 1, 0); // yellow -> green
    } else {
        const s = (t - 0.667) / 0.333; // 0 to 1 within green->sky blue
        return new THREE.Color(0, 1 - s * 0.5, s); // green -> sky blue
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

    const statePercent = getLatestRenewablePercent(stateName, true) ?? getLatestRenewablePercent(US_COUNTRY_NAME) ?? 15;
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
    buildCo2Ribbon();
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
      const oceanColorBuf = new Float32Array(oceanColors);
      oceanColorAttr = new THREE.BufferAttribute(oceanColorBuf, 3);
      oceanParticleGeo.setAttribute('color', oceanColorAttr);
      const oceanParticleMat = new THREE.PointsMaterial({
        size: 0.005,
        vertexColors: true,
        transparent: false,
        opacity: 0.8,
        depthWrite: false,
      });
      oceanParticleSystem = new THREE.Points(oceanParticleGeo, oceanParticleMat);
      oceanParticles.add(oceanParticleSystem);
      applyOceanSelectionVisuals();
    }
    
    scene.add(oceanParticles);
  })
  .catch((err) => console.error('GeoJSON load error', err));

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  requestRender();
}

window.addEventListener('resize', onWindowResize);

// Request render when controls change
controls.addEventListener('change', requestRender);

function animate() {
  requestAnimationFrame(animate);
  
  // Continuous animations that always need rendering
  if (focusActive) {
    focusProgress = Math.min(1, focusProgress + 0.035);
    const t = focusProgress < 0.5
      ? 2 * focusProgress * focusProgress
      : 1 - Math.pow(-2 * focusProgress + 2, 2) / 2;
    camera.position.lerpVectors(focusStartPos, focusEndPos, t);
    controls.target.lerpVectors(focusStartTarget, focusEndTarget, t);
    if (focusProgress >= 1) focusActive = false;
    // needsRender = 10;
  }
  
  // Always render clouds/atmosphere animation
//   needsRender = true;
  
  controls.update();

  // hover detection: raycast to sphere and find country
// Only check for hit if mouse is outside of the chart area (lower left)
let hit = null;

if (chartPanel) {
    const rect = chartPanel.getBoundingClientRect();
    // If mouse is inside chart, skip globe hover detection
    // Convert mouse coordinates from normalized device (-1 to 1) to screen pixels
    const mouseScreenX = ((mouse.x + 1) / 2) * window.innerWidth;
    const mouseScreenY = ((-mouse.y + 1) / 2) * window.innerHeight;
    
    if (
        !(
            mouseScreenX >= rect.left &&
            mouseScreenX <= rect.right &&
            mouseScreenY >= rect.top &&
            mouseScreenY <= rect.bottom
        )
    ) {
        hit = getLatLonFromMouse(mouse);
    }
} else {
    hit = getLatLonFromMouse(mouse);
}
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

    // temperature anomaly for this lat/lon
    const tempAnomaly = getNasaTempAnomaly(lat, lon);
    if (hoverTooltipTemp) {
      if (tempAnomaly !== null) {
        const sign = tempAnomaly >= 0 ? '+' : '';
        hoverTooltipTemp.textContent = `🌡 ${sign}${tempAnomaly.toFixed(1)}°C vs 1951–1980`;
        hoverTooltipTemp.style.color = tempAnomaly > 0.5 ? '#ff7043' : tempAnomaly < -0.5 ? '#4fc3f7' : '#aaaaaa';
        hoverTooltipTemp.style.display = 'block';
      } else {
        hoverTooltipTemp.style.display = 'none';
      }
    }

    if (hoveredCountry) {
      const renewPercent = getLatestRenewablePercent(hoveredCountry, !!selectedState) ?? 15;
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

  if (needsRender < 0) return;
  needsRender--;

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
      const chartYears = selectedMetric.startsWith('climate_gdp_') ? GDP_CLIMATE_YEARS : YEARS;
      chartPanel.style.display = 'block';
      chartTitle.textContent = `${selectedCountry} — ${meta.label}`;
      if (chartSubtitle) chartSubtitle.textContent = GDP_SCENARIO_DESC[selectedMetric] || METRIC_EXPLAINER_DESC[selectedMetric] || '';
      renderChartSources(selectedMetric, 'country');
      const series = getMetricSeries(selectedCountry, selectedMetric);
      drawTrendChart(series, color, meta.unit, chartYears);
      lastChartSeries = series;
      lastChartUnit = meta.unit;
      lastChartLabel = meta.label;
      lastChartYears = chartYears;
      updateDockEmptyStates();
    }
  } else if (selectedState) {
    const renewPercent = getLatestRenewablePercent(selectedState, true);
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
      if (chartSubtitle) chartSubtitle.textContent = '';
      renderChartSources(selectedMetric, 'state');
      const series = getStateSeries(selectedState, selectedMetric);
      drawTrendChart(series, color, meta.unit);
      lastChartSeries = series;
      lastChartUnit = meta.unit;
      lastChartLabel = meta.label;
      lastChartYears = null;
      updateDockEmptyStates();
    }
  } else if (selectedOcean) {
    hoverName.textContent = 'Ocean';
    hoverValue.textContent = 'Ocean selected';
    hoverSwatch.style.background = '#2d9cff';
    hoverSwatch.style.boxShadow = '0 0 14px rgba(45, 156, 255, 0.7)';
    if (chartPanel) {
      const meta = oceanMetricMeta[selectedOceanMetric] || { label: 'Ocean data', unit: '' };
      chartPanel.style.display = 'block';
      chartTitle.textContent = `Ocean — ${meta.label}`;
      if (chartSubtitle) {
        const desc = OCEAN_METRIC_DESC[selectedOceanMetric] || '';
        if (selectedOceanMetric === 'ocean_sea_level') {
          chartSubtitle.innerHTML = desc +
            ' <span class="data-badge data-badge--observed">&#9679; Observed 1993&#8211;2025</span>' +
            ' <span class="data-badge data-badge--estimated">&#9670; Est. 2026</span>';
        } else {
          chartSubtitle.textContent = desc;
        }
      }
      renderChartSources(selectedOceanMetric, 'ocean');
      const unit = getOceanMetricUnit(selectedOceanMetric);
      let series;
      let chartYearsOcean;
      if (selectedOceanMetric === 'ocean_sea_level') {
        const rawRows = oceanMetricData['ocean_sea_level'];
        const byYear = new Map(rawRows.map((r) => [r.year, r.value]));
        series = OCEAN_SEA_LEVEL_YEARS.map((yr) => {
          const v = byYear.get(yr);
          return v !== undefined ? convertSeaLevelFromMm(v, unit) : null;
        });
        chartYearsOcean = OCEAN_SEA_LEVEL_YEARS;
      } else {
        series = getOceanMetricSeries(selectedOceanMetric);
        chartYearsOcean = YEARS;
      }
      const oceanColor = new THREE.Color(0.17, 0.61, 1.0);
      drawTrendChart(series, oceanColor, unit, chartYearsOcean);
      lastChartSeries = series;
      lastChartUnit = unit;
      lastChartLabel = meta.label;
      lastChartYears = chartYearsOcean;
      updateDockEmptyStates();
    }
  } else {
    hoverName.textContent = 'Select a country';
    hoverValue.textContent = 'Move your mouse over land or ocean';
    hoverSwatch.style.background = '#666';
    hoverSwatch.style.boxShadow = '0 0 12px rgba(255, 255, 255, 0.25)';
    if (chartPanel) {
      chartPanel.style.display = 'none';
      if (chartSources) {
        chartSources.innerHTML = '';
        chartSources.style.display = 'none';
      }
      lastChartSeries = null;
      lastChartUnit = null;
      lastChartLabel = null;
      lastChartYears = null;
      updateDockEmptyStates();
    }
  }

  composer.render();
}

syncInteractivePanels();
animate();
