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
    var vs = createShader(gl, gl.VERTEX_SHADER, vertexSource);
    var fs = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    var program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      var error = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error(error || "Program link failed");
    }
    return program;
  }

  function clamp01(value) {
    return Math.max(0, Math.min(1, value));
  }

  function sanitizeColor(color, fallback) {
    if (!color || color.length < 3) {
      return [fallback[0], fallback[1], fallback[2]];
    }
    return [
      clamp01(Number(color[0])),
      clamp01(Number(color[1])),
      clamp01(Number(color[2]))
    ];
  }

  function lerpColor(current, target, factor) {
    current[0] += (target[0] - current[0]) * factor;
    current[1] += (target[1] - current[1]) * factor;
    current[2] += (target[2] - current[2]) * factor;
  }

  function luma(color) {
    return color[0] * 0.2126 + color[1] * 0.7152 + color[2] * 0.0722;
  }

  function boostToLuma(color, minimumLuma) {
    var currentLuma = luma(color);
    if (currentLuma >= minimumLuma || currentLuma <= 0.0001) {
      return [color[0], color[1], color[2]];
    }

    var scale = minimumLuma / currentLuma;
    return [
      clamp01(color[0] * scale),
      clamp01(color[1] * scale),
      clamp01(color[2] * scale)
    ];
  }

  function SidebarAurora(container) {
    this.container = container;
    this.canvas = null;
    this.gl = null;
    this.program = null;
    this.buffer = null;
    this.locations = null;

    this.mouse = { x: 0.5, y: 0.5 };
    this.ripple = 0;
    this.rippleTarget = 0;
    this.sparkle = 0;
    this.sparkleAge = 999;
    this.lastFrame = 0;
    this.paletteA = [0.05, 0.86, 1.0];
    this.paletteB = [1.0, 0.14, 0.78];
    this.paletteATarget = this.paletteA.slice();
    this.paletteBTarget = this.paletteB.slice();

    this.boundRender = this.render.bind(this);
    this.boundResize = this.resize.bind(this);
    this.boundMouseMove = this.onMouseMove.bind(this);
    this.boundClick = this.onClick.bind(this);
  }

  SidebarAurora.prototype.init = function() {
    this.canvas = document.createElement("canvas");
    this.canvas.className = "sidebarAuroraCanvas";
    this.container.insertBefore(this.canvas, this.container.firstChild);

    this.gl = this.canvas.getContext("webgl", { antialias: true, alpha: true }) ||
      this.canvas.getContext("experimental-webgl");

    if (!this.gl) {
      return false;
    }

    var gl = this.gl;

    var vertexSource = [
      "attribute vec2 aPos;",
      "varying vec2 vUv;",
      "void main() {",
      "  vUv = aPos * 0.5 + 0.5;",
      "  gl_Position = vec4(aPos, 0.0, 1.0);",
      "}"
    ].join("\n");

    var fragmentSource = [
      "precision mediump float;",
      "uniform vec2 uResolution;",
      "uniform vec2 uMouse;",
      "uniform float uTime;",
      "uniform float uRipple;",
      "uniform float uSparkle;",
      "uniform float uSparkleAge;",
      "uniform vec3 uPaletteA;",
      "uniform vec3 uPaletteB;",
      "varying vec2 vUv;",
      "float hash(vec2 p) {",
      "  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);",
      "}",
      "float noise(vec2 p) {",
      "  vec2 i = floor(p);",
      "  vec2 f = fract(p);",
      "  float a = hash(i);",
      "  float b = hash(i + vec2(1.0, 0.0));",
      "  float c = hash(i + vec2(0.0, 1.0));",
      "  float d = hash(i + vec2(1.0, 1.0));",
      "  vec2 u = f * f * (3.0 - 2.0 * f);",
      "  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;",
      "}",
      "float fbm(vec2 p) {",
      "  float v = 0.0;",
      "  float a = 0.5;",
      "  for (int i = 0; i < 5; i++) {",
      "    v += a * noise(p);",
      "    p = p * 2.0 + vec2(12.7, 4.1);",
      "    a *= 0.5;",
      "  }",
      "  return v;",
      "}",
      "void main() {",
      "  vec2 uv = vUv;",
      "  uv.x *= uResolution.x / max(uResolution.y, 1.0);",
      "  float t = uTime * 0.11;",
      "  float mouseDist = distance(vUv, uMouse);",
      "  float rippleWave = sin(18.0 * mouseDist - uTime * 6.0);",
      "  float ripple = rippleWave * exp(-mouseDist * 9.0) * uRipple;",
      "  vec2 p = vec2(uv.x * 1.8, uv.y * 2.5 + t + ripple);",
      "  float band1 = smoothstep(0.35, 0.95, fbm(p + vec2(0.0, -0.9)));",
      "  float band2 = smoothstep(0.45, 0.98, fbm(p * 1.35 + vec2(3.2, 1.4)));",
      "  float band3 = smoothstep(0.55, 0.99, fbm(p * 1.9 + vec2(-2.8, 0.2)));",
      "  vec3 cyan = uPaletteA;",
      "  vec3 magenta = uPaletteB;",
      "  vec3 violet = mix(cyan, magenta, 0.5) * 0.72;",
      "  vec3 abyss = vec3(0.01, 0.02, 0.09);",
      "  vec3 col = abyss * 0.72;",
      "  col += cyan * band1 * 0.72;",
      "  col += magenta * band2 * 0.64;",
      "  col += mix(cyan, magenta, 0.58) * band3 * 0.52;",
      "  col += violet * (band2 * band3) * 0.28;",
      "  float glow = (band1 + band2 * 0.9 + band3 * 0.68) * 0.95;",
      "  col += vec3(glow * 0.055);",
      "  float fluidMask = clamp((band1 + band2 + band3) * 0.52, 0.0, 1.0);",
      "  vec2 circuitUv = vUv * vec2(10.0, 18.0);",
      "  vec2 circuitCell = floor(circuitUv);",
      "  vec2 circuitLocal = fract(circuitUv);",
      "  float seedA = hash(circuitCell + vec2(1.3, 7.1));",
      "  float seedB = hash(circuitCell + vec2(9.2, 3.4));",
      "  float hLine = smoothstep(0.022, 0.0, abs(circuitLocal.y - 0.5)) * step(0.44, seedA);",
      "  float laneX = mix(0.24, 0.76, step(0.52, seedB));",
      "  float vLine = smoothstep(0.022, 0.0, abs(circuitLocal.x - laneX)) * step(0.5, seedB);",
      "  float flowPulse = 0.45 + 0.55 * sin(uTime * 3.8 + circuitCell.x * 0.9 + circuitCell.y * 0.7);",
      "  float circuitTrace = max(hLine, vLine) * flowPulse;",
      "  float circuitStencil = clamp(circuitTrace * 0.8 * (0.52 + fluidMask), 0.0, 1.0);",
      "  col = mix(col, col * 0.55, circuitStencil * 0.34);",
      "  col += mix(cyan, magenta, seedA) * circuitTrace * 0.22;",
      "  vec2 glitterUv = vUv * vec2(68.0, 122.0);",
      "  vec2 cell = floor(glitterUv);",
      "  vec2 local = fract(glitterUv) - 0.5;",
      "  float seed = hash(cell + vec2(11.3, 7.7));",
      "  vec2 starOffset = vec2(hash(cell + vec2(1.2, 9.4)), hash(cell + vec2(4.8, 2.6))) - 0.5;",
      "  float distToStar = length(local - starOffset * 0.85);",
      "  float star = smoothstep(0.16, 0.0, distToStar);",
      "  float sparkleMask = step(0.86, seed);",
      "  float sparkleFade = exp(-uSparkleAge * 0.68) * uSparkle;",
      "  float twinkle = 0.45 + 0.55 * sin(uTime * 7.5 + seed * 55.0);",
      "  float glitter = star * sparkleMask * fluidMask * twinkle * sparkleFade;",
      "  vec3 glitterColor = mix(vec3(1.0, 0.2, 0.86), vec3(0.62, 0.93, 1.0), seed);",
      "  col += glitterColor * glitter * 0.68;",
      "  col = pow(col, vec3(1.12));",
      "  gl_FragColor = vec4(col, 0.88);",
      "}"
    ].join("\n");

    this.program = createProgram(gl, vertexSource, fragmentSource);
    this.locations = {
      aPos: gl.getAttribLocation(this.program, "aPos"),
      uResolution: gl.getUniformLocation(this.program, "uResolution"),
      uMouse: gl.getUniformLocation(this.program, "uMouse"),
      uTime: gl.getUniformLocation(this.program, "uTime"),
      uRipple: gl.getUniformLocation(this.program, "uRipple"),
      uSparkle: gl.getUniformLocation(this.program, "uSparkle"),
      uSparkleAge: gl.getUniformLocation(this.program, "uSparkleAge"),
      uPaletteA: gl.getUniformLocation(this.program, "uPaletteA"),
      uPaletteB: gl.getUniformLocation(this.program, "uPaletteB")
    };

    this.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    this.resize();
    window.addEventListener("resize", this.boundResize);
    this.container.addEventListener("mousemove", this.boundMouseMove);
    this.container.addEventListener("click", this.boundClick);
    this.lastFrame = performance.now();
    requestAnimationFrame(this.boundRender);
    return true;
  };

  SidebarAurora.prototype.resize = function() {
    if (!this.gl || !this.canvas) {
      return;
    }
    var rect = this.container.getBoundingClientRect();
    this.canvas.width = Math.max(1, Math.floor(rect.width));
    this.canvas.height = Math.max(1, Math.floor(rect.height));
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  };

  SidebarAurora.prototype.onMouseMove = function(event) {
    var rect = this.canvas.getBoundingClientRect();
    this.mouse.x = (event.clientX - rect.left) / Math.max(1, rect.width);
    this.mouse.y = 1 - (event.clientY - rect.top) / Math.max(1, rect.height);
    this.rippleTarget = 1.0;
  };

  SidebarAurora.prototype.pulse = function(strength) {
    this.triggerSparkle((strength || 1.0) * 1.05);
  };

  SidebarAurora.prototype.setPalette = function(primary, accent) {
    var defaultA = [0.05, 0.86, 1.0];
    var defaultB = [1.0, 0.14, 0.78];
    var sanitizedA = sanitizeColor(primary, defaultA);
    var sanitizedB = sanitizeColor(accent, defaultB);

    // Keep palette visible without forcing any specific hue channel.
    var visibleA = boostToLuma(sanitizedA, 0.22);
    var visibleB = boostToLuma(sanitizedB, 0.2);

    this.paletteATarget[0] = visibleA[0];
    this.paletteATarget[1] = visibleA[1];
    this.paletteATarget[2] = visibleA[2];

    this.paletteBTarget[0] = visibleB[0];
    this.paletteBTarget[1] = visibleB[1];
    this.paletteBTarget[2] = visibleB[2];
  };

  SidebarAurora.prototype.triggerSparkle = function(strength) {
    this.sparkle = Math.min(4.2, this.sparkle + (strength || 1.0) * 2.4);
    this.sparkleAge = 0;
  };

  SidebarAurora.prototype.onClick = function() {
    this.triggerSparkle(0.95);
  };

  SidebarAurora.prototype.render = function(now) {
    if (!this.gl) {
      return;
    }
    var gl = this.gl;
    var dt = Math.max(0.001, (now - this.lastFrame) / 1000);
    this.lastFrame = now;

    if (this.rippleTarget > 0.02) {
      this.ripple = Math.min(1.0, this.ripple + dt * 7.5);
      this.rippleTarget *= 0.9;
    } else {
      this.ripple = Math.max(0.0, this.ripple - dt * 1.1);
    }

    this.sparkle = Math.max(0.0, this.sparkle - dt * 0.14);
    this.sparkleAge += dt;

    lerpColor(this.paletteA, this.paletteATarget, Math.min(1, dt * 2.2));
    lerpColor(this.paletteB, this.paletteBTarget, Math.min(1, dt * 2.2));

    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.program);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.enableVertexAttribArray(this.locations.aPos);
    gl.vertexAttribPointer(this.locations.aPos, 2, gl.FLOAT, false, 0, 0);

    gl.uniform2f(this.locations.uResolution, this.canvas.width, this.canvas.height);
    gl.uniform2f(this.locations.uMouse, this.mouse.x, this.mouse.y);
    gl.uniform1f(this.locations.uTime, now * 0.001);
    gl.uniform1f(this.locations.uRipple, this.ripple * 0.1);
    gl.uniform1f(this.locations.uSparkle, this.sparkle);
    gl.uniform1f(this.locations.uSparkleAge, this.sparkleAge);
    gl.uniform3f(this.locations.uPaletteA, this.paletteA[0], this.paletteA[1], this.paletteA[2]);
    gl.uniform3f(this.locations.uPaletteB, this.paletteB[0], this.paletteB[1], this.paletteB[2]);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    requestAnimationFrame(this.boundRender);
  };

  window.SidebarAuroraEffect = {
    isSupported: supportsWebGL,
    start: function(container) {
      if (!container || !supportsWebGL()) {
        return null;
      }

      try {
        var effect = new SidebarAurora(container);
        return effect.init() ? effect : null;
      } catch (e) {
        console.error("Sidebar aurora failed to start", e);
        return null;
      }
    }
  };
})();