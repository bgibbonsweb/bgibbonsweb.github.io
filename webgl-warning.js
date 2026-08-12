(function() {
  var STYLE_ID = 'bgWebglWarningStyle';
  var OVERLAY_ID = 'bgWebglWarningOverlay';
  var PREVIEW_ID = 'bgWebglPreviewOverlay';
  var STATE_KEY = '__bgWebglWarningState';
  var MESSAGE_TYPE = 'bgibbons:webgl-warning';
  var pendingShow = null;

  function getState() {
    if (!window[STATE_KEY]) {
      window[STATE_KEY] = {
        listenersInstalled: false,
        options: {},
        isShowing: false,
        previewShown: false,
        hasFailed: false,
        parentNotified: false,
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

  function isEmbeddedFrame() {
    return !!(window.parent && window.parent !== window);
  }

  function getContinueLabel(options) {
    return options && options.previewSrc ? 'Show still image instead' : 'Continue without 3D';
  }

  function shouldShowOverlay(options) {
    if (options && options.hostOnly)
      return true;

    if (options && options.showWarningInIframe)
      return true;

    return !isEmbeddedFrame();
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
      '  align-items: flex-start;',
      '  justify-content: center;',
      '  padding: max(18px, env(safe-area-inset-top)) max(18px, env(safe-area-inset-right)) max(18px, env(safe-area-inset-bottom)) max(18px, env(safe-area-inset-left));',
      '  background: rgba(4, 8, 16, 0.84);',
      '  backdrop-filter: blur(6px);',
      '  box-sizing: border-box;',
      '  overflow-y: auto;',
      '  overscroll-behavior: contain;',
      '}',
      '#' + OVERLAY_ID + '.is-hidden {',
      '  display: none;',
      '}',
      '#' + PREVIEW_ID + ' {',
      '  position: fixed;',
      '  inset: 0;',
      '  z-index: 2147483645;',
      '  background: #03060d;',
      '  overflow: hidden;',
      '}',
      '#' + PREVIEW_ID + '.is-hidden {',
      '  display: none;',
      '}',
      '#' + PREVIEW_ID + ' img {',
      '  width: 100%;',
      '  height: 100%;',
      '  object-fit: cover;',
      '  object-position: center center;',
      '  display: block;',
      '}',
      '#' + OVERLAY_ID + ' .bg-webgl-warning-card {',
      '  width: min(720px, 100%);',
      '  margin: auto 0;',
      '  max-height: calc(100dvh - 36px);',
      '  overflow: auto;',
      '  background: linear-gradient(180deg, rgba(11, 18, 32, 0.98), rgba(7, 12, 22, 0.98));',
      '  color: #e8eefc;',
      '  border-radius: 20px;',
      '  border: 1px solid rgba(118, 155, 255, 0.18);',
      '  box-shadow: 0 28px 80px rgba(0, 0, 0, 0.55);',
      '  padding: 24px 24px 20px;',
      '  font-family: Arial, sans-serif;',
      '}',
      '#' + OVERLAY_ID + ' .bg-webgl-warning-kicker {',
      '  margin: 0 0 8px;',
      '  font-size: 12px;',
      '  letter-spacing: 0.08em;',
      '  text-transform: uppercase;',
      '  color: #8ca3d9;',
      '}',
      '#' + OVERLAY_ID + ' .bg-webgl-warning-title {',
      '  margin: 0;',
      '  font-size: 30px;',
      '  line-height: 1.15;',
      '  color: #f4f7ff;',
      '}',
      '#' + OVERLAY_ID + ' .bg-webgl-warning-body {',
      '  margin-top: 18px;',
      '  font-size: 17px;',
      '  line-height: 1.6;',
      '}',
      '#' + OVERLAY_ID + ' .bg-webgl-warning-detail {',
      '  margin: 14px 0 0;',
      '  padding: 12px 14px;',
      '  background: rgba(110, 145, 255, 0.12);',
      '  border-radius: 12px;',
      '  color: #c7d4f5;',
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
      '  color: #b8c6e8;',
      '}',
      '#' + OVERLAY_ID + ' .bg-webgl-warning-actions {',
      '  display: flex;',
      '  gap: 12px;',
      '  flex-wrap: wrap;',
      '  margin-top: 22px;',
      '}',
      '#' + OVERLAY_ID + ' .bg-webgl-warning-button {',
      '  appearance: none;',
      '  border: 1px solid rgba(136, 166, 255, 0.2);',
      '  border-radius: 999px;',
      '  padding: 12px 18px;',
      '  font-size: 15px;',
      '  cursor: pointer;',
      '  transition: background-color 160ms ease, border-color 160ms ease, color 160ms ease;',
      '}',
      '#' + OVERLAY_ID + ' .bg-webgl-warning-button.primary {',
      '  background: #2b78ff;',
      '  color: white;',
      '}',
      '#' + OVERLAY_ID + ' .bg-webgl-warning-button.secondary {',
      '  background: rgba(255, 255, 255, 0.06);',
      '  color: #f0f4ff;',
      '}',
      '#' + OVERLAY_ID + ' .bg-webgl-warning-button:hover,',
      '#' + OVERLAY_ID + ' .bg-webgl-warning-link:hover {',
      '  background: rgba(91, 132, 255, 0.18);',
      '  border-color: rgba(136, 166, 255, 0.42);',
      '}',
      '#' + OVERLAY_ID + ' .bg-webgl-warning-link {',
      '  display: inline-flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  border: 1px solid rgba(136, 166, 255, 0.2);',
      '  border-radius: 999px;',
      '  padding: 12px 18px;',
      '  background: rgba(255, 255, 255, 0.06);',
      '  color: #f0f4ff;',
      '  text-decoration: none;',
      '  font-size: 15px;',
      '}',
      '  @media (max-width: 640px) {',
      '    #' + OVERLAY_ID + ' { padding: max(12px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left)); }',
      '    #' + OVERLAY_ID + ' .bg-webgl-warning-card { max-height: calc(100dvh - 24px); padding: 18px 16px; border-radius: 16px; }',
      '    #' + OVERLAY_ID + ' .bg-webgl-warning-title { font-size: 24px; }',
      '    #' + OVERLAY_ID + ' .bg-webgl-warning-body { font-size: 15px; }',
      '    #' + OVERLAY_ID + ' .bg-webgl-warning-actions { flex-direction: column; }',
      '    #' + OVERLAY_ID + ' .bg-webgl-warning-button,',
      '    #' + OVERLAY_ID + ' .bg-webgl-warning-link { width: 100%; box-sizing: border-box; }',
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

  function ensurePreview() {
    if (!document.body)
      return null;

    var preview = document.getElementById(PREVIEW_ID);
    if (preview)
      return preview;

    preview = document.createElement('div');
    preview.id = PREVIEW_ID;
    preview.className = 'is-hidden';

    var image = document.createElement('img');
    image.id = 'bgWebglPreviewImage';
    image.alt = 'Still image preview of the 3D scene';
    preview.appendChild(image);

    document.body.appendChild(preview);
    return preview;
  }

  function showPreview(options) {
    var previewSrc = options && options.previewSrc;
    var preview;
    var image;
    var state = getState();

    if (!previewSrc || !document.body)
      return false;

    preview = ensurePreview();
    if (!preview)
      return false;

    image = document.getElementById('bgWebglPreviewImage');
    if (!image)
      return false;

    image.src = previewSrc;
    image.alt = (describeExperience(options) || '3D scene') + ' preview image';
    preview.classList.remove('is-hidden');
    state.previewShown = true;
    return true;
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
    var state = getState();

    if (!window.parent || window.parent === window || state.parentNotified)
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
      state.parentNotified = true;
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
    var closeButton = document.getElementById('bgWebglWarningClose');

    if (titleNode)
      titleNode.textContent = getDefaultTitle(mergedOptions);

    if (leadNode)
      leadNode.textContent = getDefaultLead(mergedOptions);

    if (detailNode)
      detailNode.textContent = detail || getDefaultDetail();

    if (closeButton)
      closeButton.textContent = getContinueLabel(mergedOptions);

    overlay.classList.remove('is-hidden');
    getState().isShowing = true;
  }

  function handleFailure(detail, options) {
    var state = getState();
    var mergedOptions = mergeOptions(state.options, options || {});

    if (state.hasFailed)
      return;

    state.options = mergedOptions;
    state.hasFailed = true;

    showPreview(mergedOptions);

    if (shouldShowOverlay(mergedOptions)) {
      showOverlay(detail || getDefaultDetail(), mergedOptions);
      return;
    }

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

      handleFailure(message, {});
    }, true);

    window.addEventListener('unhandledrejection', function(event) {
      var message = extractMessage(event && event.reason);
      if (!isWebGLErrorMessage(message))
        return;

      handleFailure(message, {});
    });

    document.addEventListener('webglcontextcreationerror', function(event) {
      if (event && typeof event.preventDefault === 'function')
        event.preventDefault();

      handleFailure(event && event.statusMessage ? event.statusMessage : getDefaultDetail(), {});
    }, true);

    document.addEventListener('webglcontextlost', function(event) {
      if (event && typeof event.preventDefault === 'function')
        event.preventDefault();

      handleFailure('The browser started loading the 3D graphics, then lost access to them before the page finished drawing.', {});
    }, true);
  }

  function install(options) {
    var state = getState();
    state.options = mergeOptions(state.options, options || {});
    installGlobalListeners();

    if (!state.options.hostOnly) {
      var result = supportsWebGL();
      if (!result.supported)
        handleFailure(result.detail, state.options);
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