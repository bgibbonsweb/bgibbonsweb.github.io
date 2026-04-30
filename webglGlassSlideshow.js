(function() {
  "use strict";

  function supportsWebGL() {
    try {
      var canvas = document.createElement("canvas");
      return !!(
        window.WebGLRenderingContext &&
        (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
      );
    } catch (e) {
      return false;
    }
  }

  function createShader(gl, type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      var error = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(error || "Shader compile failed");
    }

    return shader;
  }

  function createProgram(gl, vertexSource, fragmentSource) {
    var vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
    var fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    var program = gl.createProgram();

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      var error = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error(error || "Program link failed");
    }

    return program;
  }

  function createTexture(gl, image) {
    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.bindTexture(gl.TEXTURE_2D, null);
    return tex;
  }

  function clamp01(value) {
    return Math.max(0, Math.min(1, value));
  }

  function blackPalette() {
    return {
      primary: [0, 0, 0],
      accent: [0, 0, 0]
    };
  }

  function samplePaletteFromImage(image) {
    if (!image || !image.width || !image.height) {
      return null;
    }

    var sampleCanvas = document.createElement("canvas");
    var sampleSize = 28;
    sampleCanvas.width = sampleSize;
    sampleCanvas.height = sampleSize;
    var ctx = sampleCanvas.getContext("2d");

    if (!ctx) {
      return null;
    }

    try {
      ctx.drawImage(image, 0, 0, sampleSize, sampleSize);
      var pixels = ctx.getImageData(0, 0, sampleSize, sampleSize).data;
      var primary = [0, 0, 0];
      var accent = [0, 0, 0];
      var pWeightTotal = 0;
      var aWeightTotal = 0;
      var mostSaturated = 0;
      var mostSaturatedColor = [0.05, 0.86, 1.0];
      var hueBinCount = 12;
      var hueWeight = new Array(hueBinCount);
      var hueR = new Array(hueBinCount);
      var hueG = new Array(hueBinCount);
      var hueB = new Array(hueBinCount);

      for (var bIndex = 0; bIndex < hueBinCount; bIndex++) {
        hueWeight[bIndex] = 0;
        hueR[bIndex] = 0;
        hueG[bIndex] = 0;
        hueB[bIndex] = 0;
      }

      for (var i = 0; i < pixels.length; i += 4) {
        var alpha = pixels[i + 3] / 255;
        if (alpha < 0.2) {
          continue;
        }

        var r = pixels[i] / 255;
        var g = pixels[i + 1] / 255;
        var b = pixels[i + 2] / 255;
        var maxC = Math.max(r, g, b);
        var minC = Math.min(r, g, b);
        var saturation = maxC <= 0.001 ? 0 : (maxC - minC) / maxC;
        if (saturation > mostSaturated) {
          mostSaturated = saturation;
          mostSaturatedColor = [r, g, b];
        }

        var luminance = r * 0.2126 + g * 0.7152 + b * 0.0722;
        var pWeight = alpha * (0.1 + saturation * 0.58 + luminance * 0.32);
        primary[0] += r * pWeight;
        primary[1] += g * pWeight;
        primary[2] += b * pWeight;
        pWeightTotal += pWeight;

        var aWeight = alpha * saturation * saturation * (0.2 + luminance * 0.8);
        if (aWeight > 0.02) {
          accent[0] += r * aWeight;
          accent[1] += g * aWeight;
          accent[2] += b * aWeight;
          aWeightTotal += aWeight;
        }

        if (saturation > 0.12) {
          var hue = 0;
          var delta = maxC - minC;
          if (delta > 0.0001) {
            if (maxC === r) {
              hue = ((g - b) / delta) % 6;
            } else if (maxC === g) {
              hue = (b - r) / delta + 2;
            } else {
              hue = (r - g) / delta + 4;
            }
          }

          hue = hue / 6;
          if (hue < 0) {
            hue += 1;
          }

          var bin = Math.floor(hue * hueBinCount) % hueBinCount;
          var hWeight = alpha * saturation * (0.25 + luminance * 0.75);
          hueWeight[bin] += hWeight;
          hueR[bin] += r * hWeight;
          hueG[bin] += g * hWeight;
          hueB[bin] += b * hWeight;
        }
      }

      if (pWeightTotal <= 0.0001) {
        return null;
      }

      primary = [
        clamp01(primary[0] / pWeightTotal),
        clamp01(primary[1] / pWeightTotal),
        clamp01(primary[2] / pWeightTotal)
      ];

      if (aWeightTotal > 0.0001) {
        accent = [
          clamp01(accent[0] / aWeightTotal),
          clamp01(accent[1] / aWeightTotal),
          clamp01(accent[2] / aWeightTotal)
        ];
      } else {
        accent = mostSaturatedColor.slice();
      }

      var pMax = Math.max(primary[0], primary[1], primary[2]);
      var pMin = Math.min(primary[0], primary[1], primary[2]);
      var pSat = pMax <= 0.001 ? 0 : (pMax - pMin) / pMax;
      if (pSat < 0.16) {
        primary = [
          clamp01(primary[0] * 0.45 + mostSaturatedColor[0] * 0.55),
          clamp01(primary[1] * 0.45 + mostSaturatedColor[1] * 0.55),
          clamp01(primary[2] * 0.45 + mostSaturatedColor[2] * 0.55)
        ];
      }

      var aMax = Math.max(accent[0], accent[1], accent[2]);
      var aMin = Math.min(accent[0], accent[1], accent[2]);
      var aSat = aMax <= 0.001 ? 0 : (aMax - aMin) / aMax;
      if (aSat < 0.22) {
        accent = [
          clamp01(accent[0] * 0.25 + mostSaturatedColor[0] * 0.75),
          clamp01(accent[1] * 0.25 + mostSaturatedColor[1] * 0.75),
          clamp01(accent[2] * 0.25 + mostSaturatedColor[2] * 0.75)
        ];
      }

      var bestBin = -1;
      var secondBin = -1;
      for (var k = 0; k < hueBinCount; k++) {
        if (bestBin < 0 || hueWeight[k] > hueWeight[bestBin]) {
          secondBin = bestBin;
          bestBin = k;
        } else if (secondBin < 0 || hueWeight[k] > hueWeight[secondBin]) {
          secondBin = k;
        }
      }

      if (bestBin >= 0 && hueWeight[bestBin] > 0.0001) {
        primary = [
          clamp01(hueR[bestBin] / hueWeight[bestBin]),
          clamp01(hueG[bestBin] / hueWeight[bestBin]),
          clamp01(hueB[bestBin] / hueWeight[bestBin])
        ];
      }

      if (secondBin >= 0 && hueWeight[secondBin] > 0.0001) {
        accent = [
          clamp01(hueR[secondBin] / hueWeight[secondBin]),
          clamp01(hueG[secondBin] / hueWeight[secondBin]),
          clamp01(hueB[secondBin] / hueWeight[secondBin])
        ];
      }

      return {
        primary: primary,
        accent: accent
      };
    } catch (e) {
      return null;
    }
  }

  function GlassSlideshow(options) {
    this.container = options.container;
    this.urls = options.urls;
    this.leftOffset = options.leftOffset || 225;
    this.mobilePan = options.mobilePan || false;
    this.loadingText = options.loadingText || null;
    this.shardSize = options.shardSize || 22;
    this.transitionDurationMs = options.transitionDurationMs || 2400;
    this.holdDurationMs = options.holdDurationMs || 4200;
    this.panDurationMs = options.panDurationMs || this.holdDurationMs;

    this.canvas = null;
    this.gl = null;
    this.program = null;

    this.textures = [];
    this.ready = false;

    this.currentIndex = 0;
    this.nextIndex = 1;
    this.inTransition = false;
    this.transitionProgress = 0;
    this.lastFrame = 0;
    this.holdTimer = 0;
    this.panProgress = 0;
    this.nextPanProgress = 0;

    this.mouse = { x: 0, y: 0 };
    this.transitionOrigin = { x: 0, y: 0 };
    this.maxDistance = 1;
    this.ripple = 0;
    this.rippleTarget = 0;

    this.buffers = null;
    this.vertexCount = 0;
    this.resolution = { width: 0, height: 0 };

    this.boundRender = this.render.bind(this);
    this.boundResize = this.handleResize.bind(this);
    this.boundMouseMove = this.handleMouseMove.bind(this);
    this.boundClick = this.handleClick.bind(this);
  }

  GlassSlideshow.prototype.getPaletteForIndex = function(index) {
    if (!this.textures || index < 0 || index >= this.textures.length) {
      return blackPalette();
    }

    var entry = this.textures[index];
    if (!entry || !entry.loaded || !entry.image) {
      return blackPalette();
    }

    if (!entry.palette) {
      entry.palette = samplePaletteFromImage(entry.image);
    }

    return entry.palette || blackPalette();
  };

  GlassSlideshow.prototype.emitPalette = function(index, source) {
    var palette = this.getPaletteForIndex(index);

    window.dispatchEvent(new CustomEvent("webgl-slideshow-palette", {
      detail: {
        index: index,
        source: source || "unknown",
        primary: palette.primary,
        accent: palette.accent
      }
    }));
  };

  GlassSlideshow.prototype.init = function() {
    this.canvas = document.createElement("canvas");
    this.canvas.className = "webglHomeCanvas";
    this.container.innerHTML = "";
    this.container.appendChild(this.canvas);

    this.gl = this.canvas.getContext("webgl", { antialias: true, alpha: false }) ||
      this.canvas.getContext("experimental-webgl");

    if (!this.gl) {
      return false;
    }

    var gl = this.gl;

    var vertexSource = [
      "precision mediump float;",
      "attribute vec2 aPos;",
      "attribute vec2 aUv;",
      "attribute vec2 aCentroid;",
      "attribute vec2 aRandom;",
      "attribute float aDelay;",
      "uniform vec2 uResolution;",
      "uniform vec2 uMouse;",
      "uniform vec2 uOrigin;",
      "uniform vec2 uTexScale;",
      "uniform vec2 uTexOffset;",
      "uniform float uMaxDist;",
      "uniform float uProgress;",
      "uniform float uMode;",
      "uniform float uRipple;",
      "uniform float uTime;",
      "varying vec2 vUv;",
      "varying float vAlpha;",
      "float ease(float t) { return t * t * (3.0 - 2.0 * t); }",
      "void main() {",
      "  float waveDelay = distance(aCentroid, uOrigin) / max(uMaxDist, 1.0);",
      "  float wavePortion = 0.68;",
      "  float randomPortion = 0.08;",
      "  float start = waveDelay * wavePortion + aDelay * randomPortion;",
      "  float duration = max(0.001, 1.0 - wavePortion - randomPortion);",
      "  float local = clamp((uProgress - start) / duration, 0.0, 1.0);",
      "  local = ease(local);",
      "  float burst = uMode < 0.5 ? local : (1.0 - local);",
      "  vec2 dir = normalize((aPos - aCentroid) + aRandom * 18.0 + vec2(0.001));",
      "  vec2 pos = aPos + dir * burst * 42.0;",
      "  float mouseDist = distance(aPos, uMouse);",
      "  float rippleFalloff = exp(-mouseDist * 0.015);",
      "  float rippleWave = sin(mouseDist * 0.085 - uTime * 10.0);",
      "  pos += dir * rippleWave * rippleFalloff * uRipple * 10.0;",
      "  vec2 clip = (pos / uResolution) * 2.0 - 1.0;",
      "  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);",
      "  vUv = aUv;",
      "  vAlpha = uMode < 0.5 ? (1.0 - local) : local;",
      "}"
    ].join("\n");

    var fragmentSource = [
      "precision mediump float;",
      "uniform sampler2D uTexture;",
      "uniform vec2 uTexScale;",
      "uniform vec2 uTexOffset;",
      "varying vec2 vUv;",
      "varying float vAlpha;",
      "void main() {",
      "  vec2 sampleUv = uTexOffset + vUv * uTexScale;",
      "  vec4 c = texture2D(uTexture, sampleUv);",
      "  float glass = 0.08 * pow(1.0 - abs(vUv.y - 0.5) * 2.0, 3.0);",
      "  c.rgb = c.rgb + vec3(glass);",
      "  gl_FragColor = vec4(c.rgb, c.a * clamp(vAlpha, 0.0, 1.0));",
      "}"
    ].join("\n");

    this.program = createProgram(gl, vertexSource, fragmentSource);

    this.locations = {
      aPos: gl.getAttribLocation(this.program, "aPos"),
      aUv: gl.getAttribLocation(this.program, "aUv"),
      aCentroid: gl.getAttribLocation(this.program, "aCentroid"),
      aRandom: gl.getAttribLocation(this.program, "aRandom"),
      aDelay: gl.getAttribLocation(this.program, "aDelay"),
      uResolution: gl.getUniformLocation(this.program, "uResolution"),
      uMouse: gl.getUniformLocation(this.program, "uMouse"),
      uOrigin: gl.getUniformLocation(this.program, "uOrigin"),
      uTexScale: gl.getUniformLocation(this.program, "uTexScale"),
      uTexOffset: gl.getUniformLocation(this.program, "uTexOffset"),
      uMaxDist: gl.getUniformLocation(this.program, "uMaxDist"),
      uProgress: gl.getUniformLocation(this.program, "uProgress"),
      uMode: gl.getUniformLocation(this.program, "uMode"),
      uRipple: gl.getUniformLocation(this.program, "uRipple"),
      uTime: gl.getUniformLocation(this.program, "uTime"),
      uTexture: gl.getUniformLocation(this.program, "uTexture")
    };

    this.handleResize();
    this.createGeometry();
    this.bindEvents();
    this.loadImages();

    return true;
  };

  GlassSlideshow.prototype.bindEvents = function() {
    window.addEventListener("resize", this.boundResize);
    this.container.addEventListener("mousemove", this.boundMouseMove);
    this.container.addEventListener("click", this.boundClick);
  };

  GlassSlideshow.prototype.handleResize = function() {
    var leftOffset = typeof this.leftOffset === 'function' ? this.leftOffset() : this.leftOffset;
    var width = Math.max(320, window.innerWidth - leftOffset);
    var height = Math.max(240, window.innerHeight);
    this.resolution.width = width;
    this.resolution.height = height;

    if (!this.canvas || !this.gl) {
      return;
    }

    this.canvas.width = width;
    this.canvas.height = height;
    this.canvas.style.width = width + "px";
    this.canvas.style.height = height + "px";

    this.gl.viewport(0, 0, width, height);
    this.mouse.x = width * 0.5;
    this.mouse.y = height * 0.5;
    this.maxDistance = Math.sqrt(width * width + height * height);

    if (!this.inTransition) {
      this.transitionOrigin.x = this.mouse.x;
      this.transitionOrigin.y = this.mouse.y;
    }

    this.createGeometry();
  };

  GlassSlideshow.prototype.handleMouseMove = function(event) {
    var rect = this.canvas.getBoundingClientRect();
    this.mouse.x = event.clientX - rect.left;
    this.mouse.y = event.clientY - rect.top;
    this.rippleTarget = 1;
  };

  GlassSlideshow.prototype.handleClick = function(event) {
    if (event && this.canvas) {
      var rect = this.canvas.getBoundingClientRect();
      this.mouse.x = event.clientX - rect.left;
      this.mouse.y = event.clientY - rect.top;
      this.rippleTarget = 1;
    }

    this.startTransition();
  };

  GlassSlideshow.prototype.createGeometry = function() {
    if (!this.gl) {
      return;
    }

    var gl = this.gl;
    var width = this.resolution.width;
    var height = this.resolution.height;
    var size = this.shardSize;

    var positions = [];
    var uvs = [];
    var centroids = [];
    var randoms = [];
    var delays = [];

    function pushVertex(x, y, uvx, uvy, cx, cy, rx, ry, delay) {
      positions.push(x, y);
      uvs.push(uvx, uvy);
      centroids.push(cx, cy);
      randoms.push(rx, ry);
      delays.push(delay);
    }

    for (var y = 0; y < height; y += size) {
      for (var x = 0; x < width; x += size) {
        var x0 = x;
        var y0 = y;
        var x1 = Math.min(width, x + size);
        var y1 = Math.min(height, y + size);

        var delay = Math.random() * 0.55;
        var rx = (Math.random() * 2 - 1);
        var ry = (Math.random() * 2 - 1);

        var c1x = (x0 + x1 + x1) / 3;
        var c1y = (y0 + y0 + y1) / 3;
        pushVertex(x0, y0, x0 / width, y0 / height, c1x, c1y, rx, ry, delay);
        pushVertex(x1, y0, x1 / width, y0 / height, c1x, c1y, rx, ry, delay);
        pushVertex(x1, y1, x1 / width, y1 / height, c1x, c1y, rx, ry, delay);

        var c2x = (x0 + x1 + x0) / 3;
        var c2y = (y0 + y1 + y1) / 3;
        pushVertex(x0, y0, x0 / width, y0 / height, c2x, c2y, -rx, -ry, delay);
        pushVertex(x1, y1, x1 / width, y1 / height, c2x, c2y, -rx, -ry, delay);
        pushVertex(x0, y1, x0 / width, y1 / height, c2x, c2y, -rx, -ry, delay);
      }
    }

    this.vertexCount = positions.length / 2;

    if (!this.buffers) {
      this.buffers = {
        positions: gl.createBuffer(),
        uvs: gl.createBuffer(),
        centroids: gl.createBuffer(),
        randoms: gl.createBuffer(),
        delays: gl.createBuffer()
      };
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.positions);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.uvs);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs), gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.centroids);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(centroids), gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.randoms);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(randoms), gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.delays);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(delays), gl.STATIC_DRAW);
  };

  GlassSlideshow.prototype.bindAttributes = function() {
    var gl = this.gl;
    var loc = this.locations;

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.positions);
    gl.enableVertexAttribArray(loc.aPos);
    gl.vertexAttribPointer(loc.aPos, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.uvs);
    gl.enableVertexAttribArray(loc.aUv);
    gl.vertexAttribPointer(loc.aUv, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.centroids);
    gl.enableVertexAttribArray(loc.aCentroid);
    gl.vertexAttribPointer(loc.aCentroid, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.randoms);
    gl.enableVertexAttribArray(loc.aRandom);
    gl.vertexAttribPointer(loc.aRandom, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.delays);
    gl.enableVertexAttribArray(loc.aDelay);
    gl.vertexAttribPointer(loc.aDelay, 1, gl.FLOAT, false, 0, 0);
  };

  GlassSlideshow.prototype.loadImages = function() {
    var gl = this.gl;
    var self = this;
    var loadedCount = 0;

    this.textures = this.urls.map(function() {
      return { image: null, texture: null, loaded: false };
    });

    // Before any image has loaded, treat derived palette colors as pure black.
    this.emitPalette(-1, "empty");

    this.urls.forEach(function(url, index) {
      var img = new Image();
      img.onload = function() {
        self.textures[index].image = img;
        self.textures[index].texture = createTexture(gl, img);
        self.textures[index].loaded = true;
        self.textures[index].palette = samplePaletteFromImage(img);
        loadedCount += 1;

        if (index === self.currentIndex) {
          self.emitPalette(index, "initial");
        }

        if (loadedCount === 1 && self.loadingText) {
          self.loadingText.style.visibility = "hidden";
        }

        if (loadedCount >= 2 && !self.ready) {
          self.ready = true;
          self.lastFrame = performance.now();
          requestAnimationFrame(self.boundRender);
        }
      };

      img.onerror = function() {
        self.textures[index].loaded = false;
      };

      img.src = url;
    });
  };

  GlassSlideshow.prototype.startTransition = function() {
    if (!this.ready || this.inTransition) {
      return;
    }

    var next = this.currentIndex + 1;
    if (next >= this.textures.length) {
      next = 0;
    }

    if (!this.textures[next] || !this.textures[next].loaded) {
      return;
    }

    this.nextIndex = next;
    this.transitionOrigin.x = this.mouse.x;
    this.transitionOrigin.y = this.mouse.y;
    var nextPalette = this.getPaletteForIndex(this.nextIndex);

    window.dispatchEvent(new CustomEvent("webgl-slideshow-transition", {
      detail: {
        currentIndex: this.currentIndex,
        nextIndex: this.nextIndex,
        strength: 1.3,
        primary: nextPalette ? nextPalette.primary : null,
        accent: nextPalette ? nextPalette.accent : null
      }
    }));

    this.inTransition = true;
    this.transitionProgress = 0;
    this.holdTimer = 0;
    this.nextPanProgress = 0;
  };

  GlassSlideshow.prototype.getTextureFit = function(textureEntry, panProgress) {
    var canvasWidth = Math.max(1, this.resolution.width);
    var canvasHeight = Math.max(1, this.resolution.height);
    var image = textureEntry && textureEntry.image;

    if (!image || !image.width || !image.height) {
      return {
        scaleX: 1,
        scaleY: 1,
        offsetX: 0,
        offsetY: 0
      };
    }

    var canvasAspect = canvasWidth / canvasHeight;
    var imageAspect = image.width / image.height;
    var scaleX = 1;
    var scaleY = 1;
    var offsetX = 0;
    var offsetY = 0;

    var currentLeftOffset = typeof this.leftOffset === 'function' ? this.leftOffset() : this.leftOffset;
    var isMobile = this.mobilePan && currentLeftOffset === 0;
    var usePan = isMobile && typeof panProgress === 'number';

    // Cover mapping: fill the viewport while preserving aspect ratio.
    // On mobile with pan enabled, scroll from one edge to the other over the hold period.
    if (imageAspect > canvasAspect) {
      scaleX = canvasAspect / imageAspect;
      offsetX = usePan ? (1 - scaleX) * panProgress : (1 - scaleX) * 0.5;
    } else {
      scaleY = imageAspect / canvasAspect;
      offsetY = usePan ? (1 - scaleY) * panProgress : (1 - scaleY) * 0.5;
    }

    return {
      scaleX: scaleX,
      scaleY: scaleY,
      offsetX: offsetX,
      offsetY: offsetY
    };
  };

  GlassSlideshow.prototype.drawTexture = function(textureEntry, mode, progress, timeSec, panProgress) {
    var gl = this.gl;
    var loc = this.locations;
    var fit = this.getTextureFit(textureEntry, panProgress);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textureEntry.texture);
    gl.uniform1i(loc.uTexture, 0);
    gl.uniform2f(loc.uTexScale, fit.scaleX, fit.scaleY);
    gl.uniform2f(loc.uTexOffset, fit.offsetX, fit.offsetY);
    gl.uniform1f(loc.uMode, mode);
    gl.uniform1f(loc.uProgress, progress);
    gl.uniform1f(loc.uRipple, this.ripple);
    gl.uniform1f(loc.uTime, timeSec);
    gl.drawArrays(gl.TRIANGLES, 0, this.vertexCount);
  };

  GlassSlideshow.prototype.render = function(now) {
    var gl = this.gl;
    if (!gl) {
      return;
    }

    var dt = Math.max(0.001, (now - this.lastFrame) / 1000);
    this.lastFrame = now;

    if (this.rippleTarget > 0.01) {
      this.ripple = Math.min(1, this.ripple + dt * 8);
      this.rippleTarget *= 0.9;
    } else {
      this.ripple = Math.max(0, this.ripple - dt * 1.2);
    }

    if (this.ready && !this.inTransition) {
      this.holdTimer += dt * 1000;
      this.panProgress = Math.min(1, this.panProgress + (dt * 1000) / this.panDurationMs);
      if (this.holdTimer > this.holdDurationMs) {
        this.startTransition();
      }
    }

    if (this.inTransition) {
      this.transitionProgress += (dt * 1000) / this.transitionDurationMs;
      this.nextPanProgress = Math.min(1, this.nextPanProgress + (dt * 1000) / this.panDurationMs);
      if (this.transitionProgress >= 1) {
        this.transitionProgress = 1;
      }
    }

    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.program);
    this.bindAttributes();

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.uniform2f(this.locations.uResolution, this.resolution.width, this.resolution.height);
    gl.uniform2f(this.locations.uMouse, this.mouse.x, this.mouse.y);
    gl.uniform2f(this.locations.uOrigin, this.transitionOrigin.x, this.transitionOrigin.y);
    gl.uniform1f(this.locations.uMaxDist, this.maxDistance);

    var currentEntry = this.textures[this.currentIndex];
    if (currentEntry && currentEntry.texture) {
      this.drawTexture(currentEntry, 0, this.inTransition ? this.transitionProgress : 0, now * 0.001, this.panProgress);
    }

    if (this.inTransition) {
      var nextEntry = this.textures[this.nextIndex];
      if (nextEntry && nextEntry.texture) {
        this.drawTexture(nextEntry, 1, this.transitionProgress, now * 0.001, this.nextPanProgress);
      }

      if (this.transitionProgress >= 1) {
        this.currentIndex = this.nextIndex;
        this.inTransition = false;
        this.transitionProgress = 0;
        this.holdTimer = 0;
        this.panProgress = this.nextPanProgress;
        this.nextPanProgress = 0;
        this.emitPalette(this.currentIndex, "settled");
      }
    }

    requestAnimationFrame(this.boundRender);
  };

  window.WebGLGlassSlideshow = {
    isSupported: supportsWebGL,
    start: function(options) {
      if (!supportsWebGL()) {
        return false;
      }

      try {
        var slideshow = new GlassSlideshow(options);
        return slideshow.init();
      } catch (e) {
        console.error("WebGL slideshow failed, falling back.", e);
        return false;
      }
    }
  };
})();