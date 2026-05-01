// triangulation using https://github.com/ironwallaby/delaunay

const TWO_PI = Math.PI * 2;

var images = [],
    imageIndex = 0;

var image,
    imageWidth = 0,
    imageHeight = 0;

var vertices = [],
    indices = [],
    fragments = [];

var timeCounter = -1;

var container = document.getElementById('homeBackContainer');
var leftBar = document.getElementById('leftBar');

var clickPosition = [imageWidth * 0.5, imageHeight * 0.5];

window.onresize = function() {
    if (image)
        image.width = window.innerWidth - 225;
}

var placeHolderImage;
var loadingImage;
var loaded = 0;
var player;
var playerPos;
var usingWebGLSlideshow = false;
var sidebarAurora = null;
var bottomWave = null;
var homepageSceneFrame = null;
var homepageSceneTransitionFrame = null;
var homepageSceneTransitionToken = 0;
var homepageSceneActiveId = "";
var homepageSceneStorageKey = "homepageLastSceneId";
var homepageSceneButtons = [];
var homepageScenePickerExpanded = false;
var homepageMobileMenuBound = false;
var homepageMobileThemePickerOpen = false;

function syncHomepageThemePickerState() {
    var picker = document.getElementById("homeScenePicker");
    var toggle = document.getElementById("homeMobileThemeToggle");

    if (!picker)
        return;

    picker.classList.toggle("is-expanded", homepageScenePickerExpanded);
    picker.classList.toggle("is-mobile-open", homepageMobileThemePickerOpen);

    if (toggle)
        toggle.setAttribute("aria-expanded", homepageMobileThemePickerOpen ? "true" : "false");
}
var movementKeyCodes = {
    37: true,
    38: true,
    39: true,
    40: true,
    65: true,
    68: true,
    83: true,
    87: true
};
var movementKeyNames = {
    ArrowLeft: 37,
    ArrowUp: 38,
    ArrowRight: 39,
    ArrowDown: 40,
    a: 65,
    A: 65,
    d: 68,
    D: 68,
    s: 83,
    S: 83,
    w: 87,
    W: 87
};
var homepageSceneInputBound = false;
var homepageSceneDragHintBound = false;
var homepageSceneDragStart = null;
var homepageSceneDragHintDismissed = false;
var homepageSceneDragHintStorageKey = "homeSceneDragHintSeen";
var homepageSlideshowPaletteEventsBound = false;
var homepageArtSlideshowState = "none";
var artSlideshowUrls = [
    'skyline15.png',
    'SunRise.jpg',
    'LevelEditor3D.png',
    'Hive.png',
    'dash_rough.jpg',
    'redzone8.jpg',
    'ship5.jpg',
    'coexist.png',
    'zerocitynightrender.jpg',
    'PlayerShipTextured2.jpg',
    'forest.png',
    'ProjectStreetwarsTank2.png',
    'GreenCity10.jpg',
    'Learn.png',
];

var homepageScenes = [
    {
        id: "GoldenField",
        title: "Golden FIeld homepage background",
        src: "GoldenField/GoldenField.html?embed=1",
        thumbnail: "scene_screenshots/golden_field.png",
        primary: [0.96, 0.71, 0.18],
        accent: [0.55, 0.82, 0.33],
        credits: 'Tree model by <a href="https://sketchfab.com/3d-models/oak-tree-ed9401a0cae24967a620f90348b1b7be" target="_blank" rel="noopener noreferrer">Atrahasis</a>'
    },
    {
        id: "YourRide",
        title: "Cyberpunk City homepage background",
        src: "YourRide/YourRide.html?embed=1",
        thumbnail: "scene_screenshots/cypberunk_city.png",
        primary: [0.18, 0.82, 0.98],
        accent: [1.0, 0.48, 0.24],
        darkUi: true,
        credits: 'Car model by <a href="https://sketchfab.com/models/0634683fee6147c0b3d66b23d1643565" target="_blank" rel="noopener noreferrer">Rasmus.Eist</a>'
    },
    {
        id: "Aurora",
        title: "Aurora homepage background",
        src: "Aurora/Aurora.html?embed=1",
        thumbnail: "scene_screenshots/aurora.png",
        primary: [0.18, 0.88, 0.72],
        accent: [0.14, 0.42, 1.0],
        darkUi: true,
        credits: 'Tree model by <a href="https://sketchfab.com/3d-models/oak-tree-ed9401a0cae24967a620f90348b1b7be" target="_blank" rel="noopener noreferrer">Atrahasis</a>'
    },
    {
        id: "SpaceBattle",
        title: "Space Battle homepage background",
        src: "SpaceBattle/SpaceBattle.html?embed=1",
        thumbnail: "scene_screenshots/space_battle.png",
        primary: [0.52, 0.72, 1.0],
        accent: [1.0, 0.38, 0.54],
        darkUi: true,
        credits: 'Ship #1 by <a href="https://sketchfab.com/models/63ce372c1aa843e98bf1548109e055d8" target="_blank" rel="noopener noreferrer">Comrade1280</a> &nbsp;|&nbsp; Ship #2 by <a href="https://sketchfab.com/models/705e1a79b48745938e67760c4e3eed65" target="_blank" rel="noopener noreferrer">toomanydemons</a> &nbsp;|&nbsp; Ship #3 by <a href="https://sketchfab.com/models/4cccb0378e474f8a8d3c7079e2e56d63" target="_blank" rel="noopener noreferrer">rakshaan</a> &nbsp;(model shaders modified slightly)'
    },
    {
        id: "SpaceGame",
        title: "Space Game homepage background",
        src: "SpaceGame/SpaceGame.html",
        newTabUrl: "/spacegame",
        openInNewTab: true,
        thumbnail: "scene_screenshots/spacegame2.png",
        primary: [0.38, 0.66, 1.0],
        accent: [0.94, 0.42, 1.0],
        darkUi: true
    },
    {
        id: "EnergyGridMap",
        title: "Energy Grid Map homepage background",
        src: "energy_grid_map/public/index.html",
        newTabUrl: "/energy_grid_map/public/index.html",
        openInNewTab: true,
        thumbnail: "scene_screenshots/energy_grid.png",
        primary: [0.1, 0.84, 0.72],
        accent: [0.24, 0.56, 1.0],
        darkUi: true
    },
    {
        id: "ClimateGlobe",
        title: "Climate Globe homepage background",
        src: "climate_globe/public/",
        newTabUrl: "/climate_globe/public/",
        openInNewTab: true,
        thumbnail: "scene_screenshots/climate_globe.png",
        primary: [0.24, 0.74, 0.92],
        accent: [0.36, 0.92, 0.56],
        darkUi: true
    },
    {
        id: "WebglResume",
        title: "WebGL Resume",
        src: "webgl/resume.html",
        newTabUrl: "/webgl/resume",
        openInNewTab: true,
        thumbnail: "scene_screenshots/webgl_resume.png",
        primary: [0.84, 0.44, 0.2],
        accent: [0.96, 0.78, 0.28],
        darkUi: true
    },
    {
        id: "ArtSlideshow",
        title: "Art slideshow homepage background",
        thumbnail: "skyline15.png",
        primary: [0.18, 0.52, 0.98],
        accent: [0.98, 0.34, 0.72],
        darkUi: true
    }
];

function updateHomepageSceneCredits(scene) {
    var banner = document.getElementById("homeSceneCredits");
    var inlineBanner = document.getElementById("homeSceneCreditsInline");
    var credits = scene && scene.credits ? scene.credits : "";
    var creditsMarkup = credits ? ("3D Models: " + credits) : "";
    var inlineCreditsMarkup = credits;

    if (banner) {
        banner.innerHTML = creditsMarkup;
        banner.style.display = credits ? "" : "none";
    }

    if (inlineBanner) {
        inlineBanner.innerHTML = inlineCreditsMarkup;
        inlineBanner.style.display = credits ? "" : "none";
    }
}

function getHomepageScene(sceneId) {
    for (var i = 0; i < homepageScenes.length; i++) {
        if (homepageScenes[i].id === sceneId)
            return homepageScenes[i];
    }

    return homepageScenes[0];
}

function updateHomepageScenePicker(activeSceneId) {
    for (var i = 0; i < homepageSceneButtons.length; i++) {
        var button = homepageSceneButtons[i];
        var isActive = button.getAttribute("data-scene") === activeSceneId;
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-pressed", isActive ? "true" : "false");
    }
}

function applyHomepageSceneTheme(scene) {
    if (!document.body)
        return;

    document.body.classList.toggle("darkSceneUi", !!(scene && scene.darkUi));
}

function getPointerFromEvent(event) {
    if (!event)
        return null;

    if (event.touches && event.touches.length)
        return { x: event.touches[0].clientX, y: event.touches[0].clientY };

    if (event.changedTouches && event.changedTouches.length)
        return { x: event.changedTouches[0].clientX, y: event.changedTouches[0].clientY };

    if (typeof event.clientX === "number" && typeof event.clientY === "number")
        return { x: event.clientX, y: event.clientY };

    return null;
}

function setHomepageSceneDragHintVisibility(isVisible) {
    var hint = document.getElementById("homeSceneDragHint");
    if (!hint)
        return;

    hint.classList.toggle("is-hidden", !isVisible);
    hint.setAttribute("aria-hidden", isVisible ? "false" : "true");
}

function hasSeenHomepageSceneDragHint() {
    try {
        return window.localStorage && localStorage.getItem(homepageSceneDragHintStorageKey) === "1";
    } catch (error) {
        return false;
    }
}

function markHomepageSceneDragHintSeen() {
    try {
        if (window.localStorage)
            localStorage.setItem(homepageSceneDragHintStorageKey, "1");
    } catch (error) {
    }
}

function dismissHomepageSceneDragHint() {
    if (homepageSceneDragHintDismissed)
        return;

    homepageSceneDragHintDismissed = true;
    homepageSceneDragStart = null;
    setHomepageSceneDragHintVisibility(false);
    markHomepageSceneDragHintSeen();
}

function onHomepageSceneDragStart(event) {
    if (homepageSceneDragHintDismissed)
        return;

    homepageSceneDragStart = getPointerFromEvent(event);
}

function onHomepageSceneDragMove(event) {
    if (homepageSceneDragHintDismissed || !homepageSceneDragStart)
        return;

    var pointer = getPointerFromEvent(event);
    if (!pointer)
        return;

    var dx = pointer.x - homepageSceneDragStart.x;
    var dy = pointer.y - homepageSceneDragStart.y;
    if ((dx * dx + dy * dy) > 100)
        dismissHomepageSceneDragHint();
}

function onHomepageSceneDragEnd() {
    homepageSceneDragStart = null;
}

function bindHomepageSceneDragEventsOnDocument(targetDocument) {
    if (!targetDocument)
        return;

    targetDocument.addEventListener("mousedown", onHomepageSceneDragStart, true);
    targetDocument.addEventListener("mousemove", onHomepageSceneDragMove, true);
    targetDocument.addEventListener("mouseup", onHomepageSceneDragEnd, true);

    targetDocument.addEventListener("touchstart", onHomepageSceneDragStart, true);
    targetDocument.addEventListener("touchmove", onHomepageSceneDragMove, true);
    targetDocument.addEventListener("touchend", onHomepageSceneDragEnd, true);
    targetDocument.addEventListener("touchcancel", onHomepageSceneDragEnd, true);
}

function bindHomepageSceneDragHint() {
    if (homepageSceneDragHintBound)
        return;

    homepageSceneDragHintBound = true;
    homepageSceneDragHintDismissed = hasSeenHomepageSceneDragHint();
    setHomepageSceneDragHintVisibility(!homepageSceneDragHintDismissed);

    bindHomepageSceneDragEventsOnDocument(document);
}

function bindHomepageSceneDragHintToFrame(targetFrame) {
    var frame = targetFrame || homepageSceneFrame;
    if (!frame || !frame.contentWindow)
        return;

    try {
        bindHomepageSceneDragEventsOnDocument(frame.contentWindow.document);
    } catch (error) {
    }
}

function createHomepageSceneFrameElement() {
    var frame = document.createElement("iframe");
    frame.className = "auroraEmbedFrame";
    frame.setAttribute("aria-hidden", "true");
    frame.tabIndex = -1;
    frame.style.display = "block";
    frame.style.opacity = "0";
    frame.style.pointerEvents = "none";
    frame.addEventListener("load", function() {
        bindHomepageSceneDragHintToFrame(frame);
    });
    return frame;
}

function clearHomepageSceneTransitionFrame() {
    if (homepageSceneTransitionFrame && homepageSceneTransitionFrame.parentNode) {
        homepageSceneTransitionFrame.parentNode.removeChild(homepageSceneTransitionFrame);
    }
    homepageSceneTransitionFrame = null;
}

function persistHomepageSceneSelection(scene) {
    if (!scene || !scene.id)
        return;

    try {
        if (window.localStorage && !scene.openInNewTab)
            localStorage.setItem(homepageSceneStorageKey, scene.id);
    } catch (error) {
    }
}

function getInitialHomepageSceneId() {
    try {
        if (window.localStorage) {
            var savedSceneId = localStorage.getItem(homepageSceneStorageKey);
            if (savedSceneId) {
                var savedScene = getHomepageScene(savedSceneId);
                if (savedScene.id === savedSceneId) {
                    if (!savedScene.openInNewTab)
                        return savedSceneId;

                    localStorage.removeItem(homepageSceneStorageKey);
                }
            }
        }
    } catch (error) {
    }

    if (window.matchMedia && window.matchMedia("(max-width: 900px)").matches)
        return "Aurora";

    return homepageScenes[0].id;
}

function setHomepageScene(sceneId) {
    if (!container)
        return false;

    var scene = getHomepageScene(sceneId);
    persistHomepageSceneSelection(scene);

    if (scene && scene.openInNewTab) {
        var newTabUrl = scene.newTabUrl || scene.src;
        window.open(newTabUrl, "_blank", "noopener,noreferrer");
        return true;
    }

    if (document.body)
        document.body.classList.toggle("artSlideshowMode", !!(scene && scene.id === "ArtSlideshow"));

    if (scene && scene.id === "ArtSlideshow") {
        homepageSceneTransitionToken++;
        clearHomepageSceneTransitionFrame();
        homepageSceneActiveId = scene.id;
        container.classList.remove("iframeSceneMode");
        container.classList.remove("auroraBackgroundContainer");
        applyHomepageSceneTheme(scene);
        applySidebarPaletteCss(scene.primary, scene.accent);

        if (bottomWave)
            bottomWave.setPalette(scene.primary, scene.accent);

        if (sidebarAurora && typeof sidebarAurora.setPalette === "function")
            sidebarAurora.setPalette(scene.primary, scene.accent);

        if (homepageSceneFrame) {
            homepageSceneFrame.style.opacity = "1";
            homepageSceneFrame.style.display = "none";
            homepageSceneFrame.style.pointerEvents = "none";
        }

        updateHomepageScenePicker(scene.id);
        updateHomepageSceneCredits(scene);
        return startArtSlideshowMode();
    }

    container.classList.add("auroraBackgroundContainer");
    container.classList.add("iframeSceneMode");

    if (homepageSceneFrame && homepageSceneFrame.parentNode !== container) {
        container.appendChild(homepageSceneFrame);
    }

    usingWebGLSlideshow = true;

    if (!homepageSceneDragHintDismissed)
        setHomepageSceneDragHintVisibility(true);

    var loadingText = document.getElementById("loadingText");
    if (loadingText)
        loadingText.style.visibility = "hidden";

    applyHomepageSceneTheme(scene);
    applySidebarPaletteCss(scene.primary, scene.accent);

    if (bottomWave)
        bottomWave.setPalette(scene.primary, scene.accent);

    if (sidebarAurora && typeof sidebarAurora.setPalette === "function")
        sidebarAurora.setPalette(scene.primary, scene.accent);

    updateHomepageScenePicker(scene.id);
    updateHomepageSceneCredits(scene);

    var outgoingFrame = null;
    if (homepageSceneFrame && homepageSceneFrame.parentNode === container && homepageSceneFrame.style.display !== "none") {
        outgoingFrame = homepageSceneFrame;
    } else if (homepageSceneTransitionFrame && homepageSceneTransitionFrame.parentNode === container && homepageSceneTransitionFrame.style.display !== "none") {
        outgoingFrame = homepageSceneTransitionFrame;
    }

    if (homepageSceneActiveId === scene.id && outgoingFrame)
        return true;

    if (homepageSceneTransitionFrame && homepageSceneTransitionFrame !== outgoingFrame && homepageSceneTransitionFrame.parentNode)
        homepageSceneTransitionFrame.parentNode.removeChild(homepageSceneTransitionFrame);

    var incomingFrame = createHomepageSceneFrameElement();
    incomingFrame.title = scene.title;
    incomingFrame.style.opacity = "0";
    incomingFrame.style.pointerEvents = "none";
    container.appendChild(incomingFrame);
    homepageSceneTransitionFrame = incomingFrame;

    var transitionToken = ++homepageSceneTransitionToken;
    incomingFrame.addEventListener("load", function() {
        if (transitionToken !== homepageSceneTransitionToken) {
            if (incomingFrame.parentNode)
                incomingFrame.parentNode.removeChild(incomingFrame);
            if (homepageSceneTransitionFrame === incomingFrame)
                homepageSceneTransitionFrame = null;
            return;
        }

        incomingFrame.style.opacity = "1";
        if (outgoingFrame)
            outgoingFrame.style.opacity = "0";

        setTimeout(function() {
            if (transitionToken !== homepageSceneTransitionToken)
                return;

            if (outgoingFrame && outgoingFrame.parentNode)
                outgoingFrame.parentNode.removeChild(outgoingFrame);

            homepageSceneFrame = incomingFrame;
            homepageSceneTransitionFrame = null;
            homepageSceneActiveId = scene.id;
            homepageSceneFrame.style.display = "block";
            homepageSceneFrame.style.opacity = "1";
            homepageSceneFrame.style.pointerEvents = "auto";

            var frames = container.querySelectorAll("iframe.auroraEmbedFrame");
            for (var i = 0; i < frames.length; i++) {
                if (frames[i] !== homepageSceneFrame && frames[i].parentNode)
                    frames[i].parentNode.removeChild(frames[i]);
            }
        }, 360);
    }, { once: true });

    incomingFrame.src = scene.src;
    return true;
}

function bindHomepageScenePicker() {
    var picker = document.getElementById("homeScenePicker");
    if (!picker)
        return;

    syncHomepageThemePickerState();

    homepageSceneButtons = Array.prototype.slice.call(picker.querySelectorAll("[data-scene]"));

    for (var i = 0; i < homepageSceneButtons.length; i++) {
        homepageSceneButtons[i].addEventListener("click", function(event) {
            event.preventDefault();
            setHomepageScene(this.getAttribute("data-scene"));
            if (window.matchMedia("(max-width: 900px)").matches) {
                homepageMobileThemePickerOpen = false;
                syncHomepageThemePickerState();
            }
        });

        var btn = homepageSceneButtons[i];
        var sceneData = getHomepageScene(btn.getAttribute("data-scene"));
        var thumb = btn.querySelector(".homeSceneThumb");
        if (thumb && sceneData) {
            var p = sceneData.primary;
            var a = sceneData.accent;
            var pc = "rgb(" + Math.round(p[0]*255) + "," + Math.round(p[1]*255) + "," + Math.round(p[2]*255) + ")";
            var ac = "rgb(" + Math.round(a[0]*255) + "," + Math.round(a[1]*255) + "," + Math.round(a[2]*255) + ")";
            var gradient = "linear-gradient(135deg, " + pc + " 0%, " + ac + " 100%)";

            if (sceneData.thumbnail) {
                thumb.style.backgroundImage = "url('" + sceneData.thumbnail + "')";
                thumb.style.backgroundSize = "cover";
                thumb.style.backgroundPosition = "center";
                thumb.style.backgroundRepeat = "no-repeat";

                // If the thumbnail fails to load, keep a scene-color fallback.
                thumb.onerror = null;
                var probe = new Image();
                probe.onerror = function() {
                    thumb.style.backgroundImage = "none";
                    thumb.style.background = gradient;
                };
                probe.src = sceneData.thumbnail;
            } else {
                thumb.style.background = gradient;
            }
        }
    }

    var showMoreButton = document.getElementById("homeSceneShowMore");
    if (showMoreButton) {
        showMoreButton.addEventListener("click", function(event) {
            event.preventDefault();
            homepageScenePickerExpanded = true;
            syncHomepageThemePickerState();
            showMoreButton.setAttribute("aria-expanded", "true");
        });
        showMoreButton.setAttribute("aria-expanded", homepageScenePickerExpanded ? "true" : "false");
    }

    var mobileThemeToggle = document.getElementById("homeMobileThemeToggle");
    if (mobileThemeToggle) {
        mobileThemeToggle.addEventListener("click", function(event) {
            event.preventDefault();
            homepageMobileThemePickerOpen = !homepageMobileThemePickerOpen;
            syncHomepageThemePickerState();
        });
    }

    document.addEventListener("click", function(event) {
        if (!window.matchMedia("(max-width: 900px)").matches || !homepageMobileThemePickerOpen)
            return;

        if (picker.contains(event.target))
            return;

        homepageMobileThemePickerOpen = false;
        syncHomepageThemePickerState();
    });
}

function setHomepageMenuOpen(isOpen) {
    if (!document.body)
        return;

    document.body.classList.toggle("homeMenuOpen", !!isOpen);

    var menuButton = document.getElementById("homeMobileMenuToggle");
    if (menuButton)
        menuButton.setAttribute("aria-expanded", isOpen ? "true" : "false");
}

function bindHomepageMobileMenu() {
    if (homepageMobileMenuBound)
        return;

    homepageMobileMenuBound = true;

    var menuButton = document.getElementById("homeMobileMenuToggle");
    var closeButton = document.getElementById("homeMobileMenuClose");
    var menu = document.getElementById("leftBar");

    if (!menuButton || !menu)
        return;

    menuButton.addEventListener("click", function(event) {
        event.preventDefault();
        setHomepageMenuOpen(!document.body.classList.contains("homeMenuOpen"));
    });

    if (closeButton) {
        closeButton.addEventListener("click", function(event) {
            event.preventDefault();
            setHomepageMenuOpen(false);
        });
    }

    menu.addEventListener("click", function(event) {
        if (window.matchMedia("(max-width: 900px)").matches && event.target && event.target.closest("a"))
            setHomepageMenuOpen(false);
    });

    document.addEventListener("click", function(event) {
        if (!window.matchMedia("(max-width: 900px)").matches)
            return;

        if (menu.contains(event.target) || menuButton.contains(event.target))
            return;

        setHomepageMenuOpen(false);
    });

    window.addEventListener("resize", function() {
        if (!window.matchMedia("(max-width: 900px)").matches)
            setHomepageMenuOpen(false);
    });
}

function getSceneMovementKeyCode(event) {
    if (!event)
        return 0;

    return event.keyCode || event.which || movementKeyNames[event.key] || movementKeyNames[event.code] || 0;
}

function isSceneMovementEvent(event) {
    if (!event || event.altKey || event.ctrlKey || event.metaKey)
        return false;

    return !!movementKeyCodes[getSceneMovementKeyCode(event)];
}

function releaseHomepageSceneMovementKeys() {
    if (!homepageSceneFrame || !homepageSceneFrame.contentWindow || !homepageSceneFrame.contentWindow.currentlyPressedKeys)
        return;

    var pressedKeys = homepageSceneFrame.contentWindow.currentlyPressedKeys;
    for (var keyCode in movementKeyCodes) {
        if (movementKeyCodes.hasOwnProperty(keyCode))
            pressedKeys[keyCode] = false;
    }
}

function forwardHomepageSceneMovement(event, isPressed) {
    if (!isSceneMovementEvent(event) || !homepageSceneFrame || !homepageSceneFrame.contentWindow)
        return;

    var sceneWindow = homepageSceneFrame.contentWindow;
    var keyCode = getSceneMovementKeyCode(event);

    if (sceneWindow.currentlyPressedKeys)
        sceneWindow.currentlyPressedKeys[keyCode] = isPressed;

    try {
        homepageSceneFrame.focus();
        sceneWindow.focus();
    } catch (error) {
    }

    event.preventDefault();
}

function bindHomepageSceneInputForwarding() {
    if (homepageSceneInputBound)
        return;

    homepageSceneInputBound = true;

    window.addEventListener("keydown", function(event) {
        forwardHomepageSceneMovement(event, true);
    }, true);

    window.addEventListener("keyup", function(event) {
        forwardHomepageSceneMovement(event, false);
    }, true);

    window.addEventListener("blur", releaseHomepageSceneMovementKeys);
    document.addEventListener("visibilitychange", function() {
        if (document.hidden)
            releaseHomepageSceneMovementKeys();
    });
}

function clampColorChannel(value) {
    var n = Math.max(0, Math.min(1, Number(value) || 0));
    return Math.round(n * 255);
}

function rgbToHslChannels(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;

    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);
    var h = 0;
    var s = 0;
    var l = (max + min) * 0.5;

    if (max !== min) {
        var d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

        if (max === r) {
            h = (g - b) / d + (g < b ? 6 : 0);
        } else if (max === g) {
            h = (b - r) / d + 2;
        } else {
            h = (r - g) / d + 4;
        }

        h *= 60;
    }

    return [h, s, l];
}

function hslToRgbChannels(h, s, l) {
    function hueToRgb(p, q, t) {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
    }

    var r;
    var g;
    var b;
    var hue = ((h % 360) + 360) % 360;

    if (s === 0) {
        r = l;
        g = l;
        b = l;
    } else {
        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        var hk = hue / 360;
        r = hueToRgb(p, q, hk + 1 / 3);
        g = hueToRgb(p, q, hk);
        b = hueToRgb(p, q, hk - 1 / 3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function neonizeUiRgb(rgb, fallbackRgb) {
    var hsl = rgbToHslChannels(rgb[0], rgb[1], rgb[2]);
    var h = hsl[0];
    var s = Math.max(hsl[1], 0.58);
    var l = Math.max(0.46, Math.min(0.66, hsl[2] + 0.04));

    // Prevent muddy olive/yellow-green button highlights.
    if (h >= 45 && h <= 105) {
        h = h * 0.35 + 188 * 0.65;
    }

    if (fallbackRgb && s < 0.62) {
        var fbHsl = rgbToHslChannels(fallbackRgb[0], fallbackRgb[1], fallbackRgb[2]);
        h = h * 0.55 + fbHsl[0] * 0.45;
        s = Math.max(s, 0.62);
    }

    return hslToRgbChannels(h, s, l);
}

function applySidebarPaletteCss(primary, accent) {
    if (!leftBar || !primary || !accent)
        return;

    var pR = clampColorChannel(primary[0]);
    var pG = clampColorChannel(primary[1]);
    var pB = clampColorChannel(primary[2]);
    var aR = clampColorChannel(accent[0]);
    var aG = clampColorChannel(accent[1]);
    var aB = clampColorChannel(accent[2]);

    var uiPrimary = neonizeUiRgb([pR, pG, pB], [aR, aG, aB]);
    var uiAccent = neonizeUiRgb([aR, aG, aB], [pR, pG, pB]);

    leftBar.style.setProperty("--sidebar-primary-rgb", uiPrimary[0] + ", " + uiPrimary[1] + ", " + uiPrimary[2]);
    leftBar.style.setProperty("--sidebar-accent-rgb", uiAccent[0] + ", " + uiAccent[1] + ", " + uiAccent[2]);
    leftBar.style.setProperty("--sidebar-base-rgb", Math.round(uiPrimary[0] * 0.22) + ", " + Math.round(uiPrimary[1] * 0.22) + ", " + Math.round(uiPrimary[2] * 0.22));

    // Keep top bar hover hue synced to the same slideshow-driven accent.
    document.documentElement.style.setProperty("--ui-hover-rgb", pR + ", " + pG + ", " + pB);
}

function startHomepageAuroraScene() {
    if (!container)
        return false;

    container.innerHTML = "";
    container.classList.add("auroraBackgroundContainer");
    homepageSceneFrame = null;
    bindHomepageScenePicker();
    bindHomepageSceneInputForwarding();
    bindHomepageSceneDragHint();
    return setHomepageScene(getInitialHomepageSceneId());
}

function bindHomepageSlideshowPaletteEvents() {
    if (homepageSlideshowPaletteEventsBound)
        return;

    homepageSlideshowPaletteEventsBound = true;

    window.addEventListener("webgl-slideshow-transition", function(event) {
        if (!sidebarAurora || typeof sidebarAurora.pulse !== "function")
            return;

        var detail = event && event.detail ? event.detail : {};
        var strength = typeof detail.strength === "number" ? detail.strength : 1.0;

        if (detail.primary && detail.accent)
            applySidebarPaletteCss(detail.primary, detail.accent);

        if (bottomWave && detail.primary && detail.accent)
            bottomWave.setPalette(detail.primary, detail.accent);

        if (typeof sidebarAurora.setPalette === "function" && detail.primary && detail.accent)
            sidebarAurora.setPalette(detail.primary, detail.accent);

        sidebarAurora.pulse(strength);
    });

    window.addEventListener("webgl-slideshow-palette", function(event) {
        if (!sidebarAurora || typeof sidebarAurora.setPalette !== "function")
            return;

        var detail = event && event.detail ? event.detail : {};
        if (detail.primary && detail.accent) {
            applySidebarPaletteCss(detail.primary, detail.accent);
            if (bottomWave)
                bottomWave.setPalette(detail.primary, detail.accent);
            sidebarAurora.setPalette(detail.primary, detail.accent);
        }
    });
}

function startArtSlideshowMode() {
    if (!container)
        return false;

    bindHomepageSlideshowPaletteEvents();

    if (homepageSceneFrame)
        homepageSceneFrame.style.display = "none";

    setHomepageSceneDragHintVisibility(false);

    if (homepageArtSlideshowState === "webgl") {
        usingWebGLSlideshow = true;
        return true;
    }

    if (homepageArtSlideshowState === "legacy") {
        usingWebGLSlideshow = false;
        return true;
    }

    if (window.WebGLGlassSlideshow && window.WebGLGlassSlideshow.isSupported()) {
        var loadingText = document.getElementById("loadingText");
        var webglStarted = window.WebGLGlassSlideshow.start({
            container: container,
            urls: artSlideshowUrls,
            leftOffset: function() { return window.innerWidth > 900 ? 225 : 0; },
            mobilePan: true,
            panDurationMs: 12000,
            loadingText: loadingText,
            shardSize: 18,
            transitionDurationMs: 2800,
            holdDurationMs: 4200,
        });

        if (webglStarted) {
            usingWebGLSlideshow = true;
            homepageArtSlideshowState = "webgl";
            return true;
        }
    }

    usingWebGLSlideshow = false;

    var sidebarOffset = window.innerWidth > 900 ? 225 : 0;
    placeHolderImage = new Image();
    placeHolderImage.src = 'homebackMini.jpg';
    placeHolderImage.width = window.innerWidth - sidebarOffset;
    placeHolderImage.className = "homeBlur";

    // very quick and dirty hack to load and display the first image asap
    var preloadImage = new Image();
    images[0] = preloadImage;

    preloadImage.onload = function() {
        document.body.style.backgroundColor = "black";
        imagesLoaded();
        loaded++;

        for (var i = 1; i < artSlideshowUrls.length; i++) {
            images[i] = preloadImage = new Image();

            preloadImage.src = artSlideshowUrls[i];
            preloadImage.width = window.innerWidth - sidebarOffset;
            preloadImage.onload = function() {
                loaded++;
            }
        }
    };

    preloadImage.src = artSlideshowUrls[0];
    preloadImage.width = window.innerWidth - sidebarOffset;
    container.appendChild(placeHolderImage);
    homepageArtSlideshowState = "legacy";
    return true;
}

function BottomWaveEffect(parent, leftOffset) {
    this.parent = parent;
    this.leftOffset = leftOffset || 225;
    this.canvas = null;
    this.ctx = null;
    this.width = 0;
    this.height = 110;
    this.dpr = 1;
    this.lastTime = 0;
    this.time = 0;
    this.primary = [0, 0, 0];
    this.accent = [0, 0, 0];
    this.primaryTarget = [0, 0, 0];
    this.accentTarget = [0, 0, 0];
    this.barWidth = 8;
    this.barGap = 2;
    this.blockHeight = 4;
    this.blockGap = 1;

    this.boundResize = this.resize.bind(this);
    this.boundRender = this.render.bind(this);
}

BottomWaveEffect.prototype.init = function() {
    if (!this.parent) {
        return false;
    }

    this.canvas = document.createElement("canvas");
    this.canvas.className = "bottomWaveCanvas";
    this.parent.appendChild(this.canvas);
    this.ctx = this.canvas.getContext("2d");

    if (!this.ctx) {
        return false;
    }

    this.resize();
    window.addEventListener("resize", this.boundResize);
    this.lastTime = performance.now();
    requestAnimationFrame(this.boundRender);
    return true;
};

BottomWaveEffect.prototype.resize = function() {
    if (!this.canvas || !this.ctx) {
        return;
    }

    var contentWidth = Math.max(320, window.innerWidth - this.leftOffset);
    this.dpr = Math.max(1, window.devicePixelRatio || 1);
    this.width = contentWidth;
    this.height = Math.max(88, Math.min(150, Math.round(window.innerHeight * 0.16)));

    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
    this.canvas.style.width = this.width + "px";
    this.canvas.style.height = this.height + "px";
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
};

BottomWaveEffect.prototype.setPalette = function(primary, accent) {
    if (primary && primary.length >= 3) {
        this.primaryTarget[0] = Math.max(0, Math.min(1, Number(primary[0]) || 0));
        this.primaryTarget[1] = Math.max(0, Math.min(1, Number(primary[1]) || 0));
        this.primaryTarget[2] = Math.max(0, Math.min(1, Number(primary[2]) || 0));
    }

    if (accent && accent.length >= 3) {
        this.accentTarget[0] = Math.max(0, Math.min(1, Number(accent[0]) || 0));
        this.accentTarget[1] = Math.max(0, Math.min(1, Number(accent[1]) || 0));
        this.accentTarget[2] = Math.max(0, Math.min(1, Number(accent[2]) || 0));
    }
};

BottomWaveEffect.prototype.lerpPalette = function(dt) {
    var factor = Math.min(1, dt * 2.2);
    for (var i = 0; i < 3; i++) {
        this.primary[i] += (this.primaryTarget[i] - this.primary[i]) * factor;
        this.accent[i] += (this.accentTarget[i] - this.accent[i]) * factor;
    }
};

BottomWaveEffect.prototype.toRgba = function(color, alpha) {
    return "rgba(" + clampColorChannel(color[0]) + ", " + clampColorChannel(color[1]) + ", " + clampColorChannel(color[2]) + ", " + alpha + ")";
};

BottomWaveEffect.prototype.mixColor = function(colorMix) {
    return [
        this.primary[0] * (1 - colorMix) + this.accent[0] * colorMix,
        this.primary[1] * (1 - colorMix) + this.accent[1] * colorMix,
        this.primary[2] * (1 - colorMix) + this.accent[2] * colorMix
    ];
};

BottomWaveEffect.prototype.drawEqBars = function(timeScale, colorMix, alphaScale, heightBias) {
    var ctx = this.ctx;
    var width = this.width;
    var height = this.height;
    var eqColor = this.mixColor(colorMix);
    var barSpan = this.barWidth + this.barGap;
    var barCount = Math.ceil(width / barSpan);
    var maxBlocks = Math.max(3, Math.floor((height - 12) / (this.blockHeight + this.blockGap)));
    var baseline = height - 8;

    for (var i = 0; i < barCount; i++) {
        var x = i * barSpan;
        var center = i / Math.max(1, barCount - 1);
        var envelope = 0.45 + 0.55 * Math.sin(center * Math.PI);
        var drift = Math.sin(i * 0.42 + this.time * timeScale) * 0.5 + 0.5;
        var shimmer = Math.cos(i * 0.18 - this.time * timeScale * 1.7) * 0.5 + 0.5;
        var energy = Math.max(0, Math.min(1, drift * 0.68 + shimmer * 0.32));
        var blocks = Math.max(1, Math.round((heightBias + envelope * energy) * maxBlocks));

        for (var j = 0; j < blocks; j++) {
            var y = baseline - (j + 1) * this.blockHeight - j * this.blockGap;
            var levelFade = 1 - j / Math.max(1, maxBlocks);
            var alpha = alphaScale * (0.35 + levelFade * 0.65);
            var mixT = Math.max(0, Math.min(1, colorMix + levelFade * 0.18));
            var blockColor = [
                eqColor[0] * (1 - mixT) + this.accent[0] * mixT,
                eqColor[1] * (1 - mixT) + this.accent[1] * mixT,
                eqColor[2] * (1 - mixT) + this.accent[2] * mixT
            ];

            ctx.fillStyle = this.toRgba(blockColor, alpha);
            ctx.fillRect(x, y, this.barWidth, this.blockHeight);
        }
    }
};

BottomWaveEffect.prototype.render = function(now) {
    if (!this.ctx) {
        return;
    }

    var dt = Math.max(0.001, (now - this.lastTime) / 1000);
    this.lastTime = now;
    this.time += dt;
    this.lerpPalette(dt);

    var ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    this.drawEqBars(1.2, 0.12, 0.16, 0.2);
    this.drawEqBars(1.55, 0.58, 0.26, 0.28);

    requestAnimationFrame(this.boundRender);
};

window.onload = function() {
    TweenMax.set(container, {perspective:500});

    bindHomepageMobileMenu();

    if (window.SidebarAuroraEffect && window.SidebarAuroraEffect.isSupported() && leftBar) {
        sidebarAurora = window.SidebarAuroraEffect.start(leftBar);
    }

    // Only on slideshow pages, force a dark startup palette to avoid pre-load flashes.
    if (leftBar && container) {
        leftBar.style.setProperty("--sidebar-primary-rgb", "0, 0, 0");
        leftBar.style.setProperty("--sidebar-accent-rgb", "0, 0, 0");
        leftBar.style.setProperty("--sidebar-base-rgb", "0, 0, 0");
        document.documentElement.style.setProperty("--ui-hover-rgb", "0, 0, 0");

        if (bottomWave)
            bottomWave.setPalette([0, 0, 0], [0, 0, 0]);

        if (sidebarAurora && typeof sidebarAurora.setPalette === "function")
            sidebarAurora.setPalette([0, 0, 0], [0, 0, 0]);
    }

    bindHomepageSlideshowPaletteEvents();

    if (startHomepageAuroraScene())
        return;

    startArtSlideshowMode();
};

function imagesLoaded() {

    placeImage(false);
    container.removeChild(placeHolderImage);
    shatterCompleteHandler();
}

function placeImage(transitionIn) {

    imageIndex++;
    console.log("imageIndex >= images.length: " + imageIndex + " >= " + images.length);
    if (imageIndex >= images.length)
        imageIndex = 0;

    image = images[imageIndex];
    image.width = window.innerWidth - 225;

    imageWidth = image.width;
    imageHeight = image.height;
    image.addEventListener('click', imageClickHandler);
    container.appendChild(image);

    image.width = window.innerWidth - 225;


    if (transitionIn !== false) {
        // TweenMax.fromTo(image, 0.75, {y:-1000}, {y:0, ease:Back.easeOut});
    }
}

function imageClickHandler(event) {

    if (usingWebGLSlideshow)
        return;

    var nextIndex = imageIndex + 1;
    if (nextIndex >= images.length)
        nextIndex = 0;
    
    if (imageIndex >= loaded || !images[nextIndex].complete)
    {
        return;
    }

    if (fragments.length > 0 || !image)
        return;

    var loadingText = document.getElementById("loadingText");
    if (loadingText)
        loadingText.style.visibility = "hidden";

    var box = image.getBoundingClientRect(),
        top = box.top,
        left = box.left;

    clickPosition[0] = event.clientX - left;
    clickPosition[1] = event.clientY - top;

    image.width = window.innerWidth - 225;
    
    triangulate();
    shatter();
}

function doRipple() {

    var canvas = document.createElement("span");

    var box = {
        x: clickPosition[0] - 240,
        y: clickPosition[1] - 240,
        w: 400,
        h: 400,
    }

    canvas.width = box.w;
    canvas.height = box.h;
    canvas.style.width = box.w + 'px';
    canvas.style.height = box.h + 'px';
    canvas.style.left = box.x + 'px';
    canvas.style.top = box.y + 'px';
    canvas.className = "ripple"

    container.appendChild(canvas);
    fragments.push({canvas:canvas});
}

function triangulate() {

    var dx = window.innerWidth * 0.15 * 0.5;
    var dy = window.innerWidth * 0.3 * 0.5;

    for (x = -dx; x < image.width + dx; x += dx)
    {
        for (y = 0; y < window.innerHeight + dy; y += dy)
        {
            {
                x1 = x + 0;
                y1 = y + 0;
                vertices.push([x1, y1]);
            }
            {
                x1 = x + dx / 2;
                y1 = y + dy / 2;
                vertices.push([x1, y1]);
            }
        }
    }

    vertices.forEach(function(v) {
        v[0] = clamp(v[0], 0, image.width);
        v[1] = clamp(v[1], 0, window.innerHeight);
    });

    indices = Delaunay.triangulate(vertices);
}

setInterval(spaceTimer, 30);
function spaceTimer()
{
    if (player && false)
    {
        console.log("function spaceTimer() " + playerPos[1]);
        playerPos[1] -= 1;
        if (playerPos[1] < -100)
            playerPos[1] = window.innerHeight + 500;

        player.style.left = playerPos[0] + 'px';
        player.style.top = playerPos[1] + 'px';

    }
}

setInterval(doRippleTimer, 600);
function doRippleTimer()
{
    if (usingWebGLSlideshow)
        return;

    if (loaded == 0 && document.hasFocus())
    {
        clickPosition[0] = (window.innerWidth - 225) / 2;
        clickPosition[1] = window.innerHeight / 2;
        doRipple();
    }
} 


setInterval(doTimer, 300);
function doTimer() {

    if (usingWebGLSlideshow)
        return;

    if (fragments.length > 0 || loaded == 0)
        return;

    if (document.hasFocus() || timeCounter < 6)
    {
        timeCounter++;
    }

    var nextIndex = imageIndex + 1;
    if (nextIndex >= images.length)
        nextIndex = 0;

    if (imageIndex < loaded && images[nextIndex] && images[nextIndex].complete)
    {
        var loadingText = document.getElementById("loadingText");
        if (loadingText)
            loadingText.style.visibility = "hidden";
        
        if (timeCounter > 9)
        {
            timeCounter = 0;

            var box = image.getBoundingClientRect(),
                top = box.top,
                left = box.left;

            image.width = window.innerWidth - 225;
                
            clickPosition[0] = 0;
            clickPosition[1] = window.innerHeight + 100;
        
            triangulate();
            shatter();
        }
    }
}


var xMult = 0;
var yMult = 0;
function shatter() {

    if (sidebarAurora && typeof sidebarAurora.pulse === "function") {
        sidebarAurora.pulse(1.2);
    }

    timeCounter = 0;
    var p0, p1, p2,
        fragment;

    var tl0 = new TimelineMax({onComplete:shatterCompleteHandler});

    xMult = image.width / (window.innerWidth - 225);
    yMult = image.height / window.innerHeight;

    for (var i = 0; i < indices.length; i += 3) {

        p0 = vertices[indices[i + 0]];
        p1 = vertices[indices[i + 1]];
        p2 = vertices[indices[i + 2]];

        fragment = new Fragment(p0, p1, p2);

        var dx = fragment.centroid[0] - clickPosition[0],
            dy = fragment.centroid[1] - clickPosition[1],
            d = Math.abs(dx) + Math.abs(dy),
            rx = 30 * sign(dy),
            ry = 90 * -sign(dx),
            delay = d * 0.0005 * randomRange(0.9, 1.1);

        fragment.canvas.style.zIndex = Math.floor(d).toString();

        var tl1 = new TimelineMax();

        tl1.to(fragment.canvas, 1, {
            z: 25 * randomRange(-5, 5),
            rotationY:90 * randomRange(-1, 1),
            ease:Cubic.easeIn
        });

        tl1.to(fragment.canvas, 0.4,{alpha:0}, 0.4);

        tl0.insert(tl1, delay);

        fragments.push(fragment);
        container.appendChild(fragment.canvas);
    }

    doRipple();

    container.removeChild(image);
    image.removeEventListener('click', imageClickHandler);
    placeImage();
}

function shatterCompleteHandler() {
    // add pooling?
    fragments.forEach(function(f) {
        container.removeChild(f.canvas);
    });
    fragments.length = 0;
    vertices.length = 0;
    indices.length = 0;
}

//////////////
// MATH UTILS
//////////////

function randomRange(min, max) {
    return min + (max - min) * Math.random();
}

function clamp(x, min, max) {
    return x < min ? min : (x > max ? max : x);
}

function sign(x) {
    return x < 0 ? -1 : 1;
}

//////////////
// FRAGMENT
//////////////

Fragment = function(v0, v1, v2) {
    this.v0 = v0;
    this.v1 = v1;
    this.v2 = v2;

    this.computeBoundingBox();
    this.computeCentroid();
    this.createCanvas();
    this.clip();
};
Fragment.prototype = {
    computeBoundingBox:function() {
        var xMin = Math.min(this.v0[0], this.v1[0], this.v2[0]),
            xMax = Math.max(this.v0[0], this.v1[0], this.v2[0]),
            yMin = Math.min(this.v0[1], this.v1[1], this.v2[1]),
            yMax = Math.max(this.v0[1], this.v1[1], this.v2[1]);

        this.box ={
            x:xMin,
            y:yMin,
            w:(xMax - xMin),
            h:(yMax - yMin)
        };
    },
    computeCentroid:function() {
        var x = (this.v0[0] + this.v1[0] + this.v2[0]) / 3,
            y = (this.v0[1] + this.v1[1] + this.v2[1]) / 3;

        this.centroid = [x, y];
    },
    createCanvas:function() {
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.box.w;
        this.canvas.height = this.box.h;
        this.canvas.style.width = this.box.w + 'px';
        this.canvas.style.height = this.box.h + 'px';
        this.canvas.style.left = this.box.x + 'px';
        this.canvas.style.top = this.box.y + 'px';
        this.ctx = this.canvas.getContext('2d');
    },
    clip:function() {
        this.ctx.translate(-this.box.x, -this.box.y);
        this.ctx.beginPath();
        this.ctx.moveTo(this.v0[0], this.v0[1]);
        this.ctx.lineTo(this.v1[0], this.v1[1]);
        this.ctx.lineTo(this.v2[0], this.v2[1]);
        this.ctx.closePath();
        this.ctx.clip();
        this.ctx.fillStyle="#000000";
        this.ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
        this.ctx.drawImage(image, 0, 0, image.width, image.height);
    }
};