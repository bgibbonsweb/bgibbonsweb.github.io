(function() {
  var STYLE_ID = 'bgWebglWarningStyle';
  var OVERLAY_ID = 'bgWebglWarningOverlay';
  var STATE_KEY = '__bgWebglWarningState';
  var MESSAGE_TYPE = 'bgibbons:webgl-warning';
  var pendingShow = null;

  function getState() {
    if (!window[STATE_KEY]) {
      window[STATE_KEY] = {
        listenersInstalled: false,
        options: {},
        isShowing: false,
      };
    }

    return window[STATE_KEY];
  }

  function mergeOptions(baseOptions, nextOptions) {
    var merged = {};
    var key;

    for (key in baseOptions) {
      if (Object.prototype.hasOwnProperty.call(baseOptions, key))
        merged[key] = baseOptions[key];
    }

    for (key in nextOptions) {
      if (Object.prototype.hasOwnProperty.call(nextOptions, key))
        merged[key] = nextOptions[key];
    }

    return merged;
  }

  function describeExperience(options) {
    return options.experienceName || 'This 3D view';
  }

  function getDefaultTitle(options) {
    return options.title || (describeExperience(options) + ' could not start');
  }

  function getDefaultLead(options) {
    if (options.lead)
      return options.lead;

    return describeExperience(options) + ' uses your browser\'s built-in 3D graphics support, called WebGL. Right now that 3D support is turned off, blocked, or unavailable on this device, so the page cannot draw the scene.';
  }

  function getDefaultDetail() {
    return 'The browser could not create the WebGL graphics context needed to render this scene.';
  }

  function ensureStyle() {
    if (document.getElementById(STYLE_ID))
      return;

    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      '#' + OVERLAY_ID + ' {',
      '  position: fixed;',
      '  inset: 0;',
      '  z-index: 2147483647;',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  padding: 24px;',
      '  background: rgba(5, 8, 14, 0.72);',
      '  backdrop-filter: blur(6px);',
      '  box-sizing: border-box;',
      '}',
      '#' + OVERLAY_ID + '.is-hidden {',
      '  display: none;',
      '}',
      '#' + OVERLAY_ID + ' .bg-webgl-warning-card {',
      '  width: min(680px, 100%);',
      '  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(241, 246, 252, 0.98));',
      '  color: #172033;',
      '  border-radius: 20px;',
      '  border: 1px solid rgba(14, 33, 61, 0.12);',
      '  box-shadow: 0 28px 80px rgba(0, 0, 0, 0.35);',
      '  padding: 24px 24px 20px;',
      '  font-family: Arial, sans-serif;',
      '}',
      '#' + OVERLAY_ID + ' .bg-webgl-warning-kicker {',
      '  margin: 0 0 8px;',
      '  font-size: 12px;',
      '  letter-spacing: 0.08em;',
      '  text-transform: uppercase;',
      '  color: #4c6289;',
      '}',
      '#' + OVERLAY_ID + ' .bg-webgl-warning-title {',
      '  margin: 0;',
      '  font-size: 30px;',
      '  line-height: 1.15;',
      '  color: #0f1a2f;',
      '}',
      '#' + OVERLAY_ID + ' .bg-webgl-warning-body {',
      '  margin-top: 18px;',
      '  font-size: 17px;',
      '  line-height: 1.6;',
      '}',
      '#' + OVERLAY_ID + ' .bg-webgl-warning-detail {',
      '  margin: 14px 0 0;',
      '  padding: 12px 14px;',
      '  background: rgba(19, 37, 67, 0.06);',
      '  border-radius: 12px;',
      '  color: #314568;',
      '  font-size: 15px;',
      '}',
      '#' + OVERLAY_ID + ' .bg-webgl-warning-steps {',
      '  margin: 18px 0 0;',
      '  padding-left: 24px;',
      '}',
      '#' + OVERLAY_ID + ' .bg-webgl-warning-steps li {',
      '  margin: 0 0 10px;',
      '}',
      '#' + OVERLAY_ID + ' .bg-webgl-warning-note {',
      '  margin: 16px 0 0;',
      '  color: #314568;',
      '}',
      '#' + OVERLAY_ID + ' .bg-webgl-warning-actions {',
      '  display: flex;',
      '  gap: 12px;',
      '  flex-wrap: wrap;',
      '  margin-top: 22px;',
      '}',
      '#' + OVERLAY_ID + ' .bg-webgl-warning-button {',
      '  appearance: none;',
      '  border: 0;',
      '  border-radius: 999px;',
      '  padding: 12px 18px;',
      '  font-size: 15px;',
      '  cursor: pointer;',
      '}',
      '#' + OVERLAY_ID + ' .bg-webgl-warning-button.primary {',
      '  background: #1f5eff;',
      '  color: white;',
      '}',
      '#' + OVERLAY_ID + ' .bg-webgl-warning-button.secondary {',
      '  background: rgba(19, 37, 67, 0.08);',
      '  color: #172033;',
      '}',
      '#' + OVERLAY_ID + ' .bg-webgl-warning-link {',
      '  display: inline-flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  border-radius: 999px;',
      '  padding: 12px 18px;',
      '  background: rgba(19, 37, 67, 0.08);',
      '  color: #172033;',
      '  text-decoration: none;',
      '  font-size: 15px;',
      '}',
      '  @media (max-width: 640px) {',
      '    #' + OVERLAY_ID + ' { padding: 14px; }',
      '    #' + OVERLAY_ID + ' .bg-webgl-warning-card { padding: 18px 16px; border-radius: 16px; }',
      '    #' + OVERLAY_ID + ' .bg-webgl-warning-title { font-size: 24px; }',
      '    #' + OVERLAY_ID + ' .bg-webgl-warning-body { font-size: 15px; }',
      '  }'
    ].join('\n');

    document.head.appendChild(style);
  }

  function closeOverlay() {
    var overlay = document.getElementById(OVERLAY_ID);
    if (!overlay)
      return;

    overlay.classList.add('is-hidden');
    getState().isShowing = false;
  }

  function ensureOverlay() {
    if (!document.body)
      return null;

    var overlay = document.getElementById(OVERLAY_ID);
    if (overlay)
      return overlay;

    ensureStyle();

    overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.className = 'is-hidden';
    overlay.innerHTML = [
      '<section class="bg-webgl-warning-card" role="dialog" aria-modal="true" aria-labelledby="bgWebglWarningTitle">',
      '  <p class="bg-webgl-warning-kicker">Browser graphics issue</p>',
      '  <h1 id="bgWebglWarningTitle" class="bg-webgl-warning-title"></h1>',
      '  <div class="bg-webgl-warning-body">',
      '    <p id="bgWebglWarningLead"></p>',
      '    <p id="bgWebglWarningDetail" class="bg-webgl-warning-detail"></p>',
      '    <ol class="bg-webgl-warning-steps">',
      '      <li>Open this page in the latest Chrome, Edge, Firefox, or Safari.</li>',
      '      <li>In your browser settings, turn on hardware acceleration, then fully quit and reopen the browser.</li>',
      '      <li>If you are on a company laptop, remote desktop, virtual machine, or battery saver mode, try the page on a normal local browser window instead.</li>',
      '      <li>Install any pending browser or system updates, then restart the computer if needed.</li>',
      '    </ol>',
      '    <p class="bg-webgl-warning-note">Quick explanation: WebGL is the browser feature that lets websites draw interactive 3D graphics using your computer\'s graphics hardware.</p>',
      '    <div class="bg-webgl-warning-actions">',
      '      <a class="bg-webgl-warning-link" href="https://get.webgl.org/" target="_blank" rel="noopener noreferrer">Test WebGL on get.webgl.org</a>',
      '      <button type="button" class="bg-webgl-warning-button secondary" id="bgWebglWarningClose">Continue without 3D</button>',
      '    </div>',
      '  </div>',
      '</section>'
    ].join('');

    overlay.addEventListener('click', function(event) {
      if (event.target === overlay)
        closeOverlay();
    });

    document.body.appendChild(overlay);

    var closeButton = document.getElementById('bgWebglWarningClose');
    if (closeButton)
      closeButton.addEventListener('click', closeOverlay);

    return overlay;
  }

  function notifyParent(detail, options) {
    if (!window.parent || window.parent === window)
      return;

    try {
      window.parent.postMessage({
        type: MESSAGE_TYPE,
        detail: detail,
        options: {
          title: getDefaultTitle(options),
          lead: getDefaultLead(options),
          experienceName: describeExperience(options)
        }
      }, '*');
    } catch (error) {
    }
  }

  function showOverlay(detail, options) {
    var mergedOptions = mergeOptions(getState().options, options || {});

    if (!document.body) {
      pendingShow = { detail: detail, options: mergedOptions };
      return;
    }

    var overlay = ensureOverlay();
    if (!overlay)
      return;

    var titleNode = document.getElementById('bgWebglWarningTitle');
    var leadNode = document.getElementById('bgWebglWarningLead');
    var detailNode = document.getElementById('bgWebglWarningDetail');

    if (titleNode)
      titleNode.textContent = getDefaultTitle(mergedOptions);

    if (leadNode)
      leadNode.textContent = getDefaultLead(mergedOptions);

    if (detailNode)
      detailNode.textContent = detail || getDefaultDetail();

    overlay.classList.remove('is-hidden');
    getState().isShowing = true;

    notifyParent(detail || getDefaultDetail(), mergedOptions);
  }

  function flushPendingShow() {
    if (!pendingShow || !document.body)
      return;

    var nextPendingShow = pendingShow;
    pendingShow = null;
    showOverlay(nextPendingShow.detail, nextPendingShow.options);
  }

  function supportsWebGL() {
    var canvas;
    var context = null;

    try {
      canvas = document.createElement('canvas');
      context = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    } catch (error) {
      return {
        supported: false,
        detail: error && error.message ? error.message : getDefaultDetail()
      };
    }

    if (!context) {
      return {
        supported: false,
        detail: 'The browser reported that WebGL is unavailable or disabled for this page.'
      };
    }

    return {
      supported: true,
      detail: ''
    };
  }

  function extractMessage(value) {
    if (!value)
      return '';

    if (typeof value === 'string')
      return value;

    if (value.message)
      return value.message;

    try {
      return String(value);
    } catch (error) {
      return '';
    }
  }

  function isWebGLErrorMessage(message) {
    var normalized = (message || '').toLowerCase();
    return normalized.indexOf('webgl') !== -1
      || normalized.indexOf('three.webglrenderer') !== -1
      || normalized.indexOf('graphics context') !== -1
      || normalized.indexOf('gpu') !== -1;
  }

  function installGlobalListeners() {
    var state = getState();
    if (state.listenersInstalled)
      return;

    state.listenersInstalled = true;

    document.addEventListener('DOMContentLoaded', flushPendingShow);

    window.addEventListener('message', function(event) {
      var data = event && event.data ? event.data : null;
      if (!data || data.type !== MESSAGE_TYPE)
        return;

      showOverlay(data.detail, data.options || {});
    });

    window.addEventListener('error', function(event) {
      var message = extractMessage(event && (event.message || event.error));
      if (!isWebGLErrorMessage(message))
        return;

      showOverlay(message, {});
    }, true);

    window.addEventListener('unhandledrejection', function(event) {
      var message = extractMessage(event && event.reason);
      if (!isWebGLErrorMessage(message))
        return;

      showOverlay(message, {});
    });

    document.addEventListener('webglcontextcreationerror', function(event) {
      if (event && typeof event.preventDefault === 'function')
        event.preventDefault();

      showOverlay(event && event.statusMessage ? event.statusMessage : getDefaultDetail(), {});
    }, true);

    document.addEventListener('webglcontextlost', function(event) {
      if (event && typeof event.preventDefault === 'function')
        event.preventDefault();

      showOverlay('The browser started loading the 3D graphics, then lost access to them before the page finished drawing.', {});
    }, true);
  }

  function install(options) {
    var state = getState();
    state.options = mergeOptions(state.options, options || {});
    installGlobalListeners();

    if (!state.options.hostOnly) {
      var result = supportsWebGL();
      if (!result.supported)
        showOverlay(result.detail, state.options);
    }

    return supportsWebGL().supported;
  }

  window.BenWebGLWarning = {
    install: install,
    show: showOverlay,
    close: closeOverlay,
    isSupported: function() {
      return supportsWebGL().supported;
    }
  };
})();