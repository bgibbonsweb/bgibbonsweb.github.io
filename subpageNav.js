(function() {
  function applySubpageSceneTheme() {
    document.body.classList.remove("subpageSceneLight");
    document.body.classList.add("subpageSceneDark");
    document.body.style.setProperty("--subpage-scene-image", "url('scene_screenshots/cypberunk_city.png')");
  }

  function setSubpageMenuOpen(isOpen) {
    if (!document.body || document.body.classList.contains("homePage")) {
      return;
    }

    document.body.classList.toggle("subpageMenuOpen", !!isOpen);

    var menu = document.getElementById("leftBar");
    if (menu) {
      menu.classList.toggle("is-subpage-open", !!isOpen);

      // Art page has legacy duplicated CSS blocks; enforce open/closed visibility inline.
      if (document.body.classList.contains("artPage")) {
        menu.style.setProperty("opacity", isOpen ? "1" : "0", "important");
        menu.style.setProperty("transform", isOpen ? "translateY(0) scale(1)" : "translateY(-10px) scale(0.985)", "important");
        menu.style.setProperty("pointer-events", isOpen ? "auto" : "none", "important");
      }
    }

    var menuButton = document.getElementById("subpageMobileMenuToggle");
    if (menuButton) {
      menuButton.setAttribute("aria-expanded", isOpen ? "true" : "false");
    }
  }

  function ensureSubpageMobileMenuButton() {
    if (document.body.classList.contains("homePage")) {
      return null;
    }

    var existingButton = document.getElementById("subpageMobileMenuToggle");
    if (existingButton) {
      return existingButton;
    }

    var button = document.createElement("button");
    button.id = "subpageMobileMenuToggle";
    button.className = "subpageMobileMenuToggle";
    button.type = "button";
    button.setAttribute("aria-controls", "leftBar");
    button.setAttribute("aria-expanded", "false");
    button.textContent = "Menu";
    document.body.appendChild(button);
    return button;
  }

  function bindSubpageMobileMenu() {
    if (!document.body || document.body.classList.contains("homePage")) {
      return;
    }

    if (document.body.dataset.subpageMobileMenuBound === "1") {
      return;
    }

    var menu = document.getElementById("leftBar");
    var menuButton = ensureSubpageMobileMenuButton();
    if (!menu || !menuButton) {
      return;
    }

    document.body.dataset.subpageMobileMenuBound = "1";

    document.addEventListener("click", function(event) {
      var allowDesktopArtMenu = document.body.classList.contains("artPage");
      if (!window.matchMedia("(max-width: 900px)").matches && !allowDesktopArtMenu) {
        return;
      }

      var menuToggleTarget = event.target && event.target.closest("#subpageMobileMenuToggle");
      if (menuToggleTarget) {
        event.preventDefault();
        setSubpageMenuOpen(!document.body.classList.contains("subpageMenuOpen"));
        return;
      }

      var menuCloseTarget = event.target && event.target.closest("#subpageMobileMenuClose");
      if (menuCloseTarget) {
        event.preventDefault();
        setSubpageMenuOpen(false);
        return;
      }

      if (menu.contains(event.target) && event.target && event.target.closest("a")) {
        setSubpageMenuOpen(false);
        return;
      }

      if (menu.contains(event.target) || menuButton.contains(event.target)) {
        return;
      }

      setSubpageMenuOpen(false);
    });

    window.addEventListener("resize", function() {
      if (!window.matchMedia("(max-width: 900px)").matches && !document.body.classList.contains("artPage")) {
        setSubpageMenuOpen(false);
      }
    });
  }

  function applySubpageNav() {
    if (document.body && document.body.classList.contains("homePage")) {
      return;
    }

    applySubpageSceneTheme();

    var subpageHomeLabel = "Ben Gibbons";
    if (window.matchMedia && window.matchMedia("(max-width: 900px)").matches) {
      subpageHomeLabel = "Home";
    }

    var sidebar = document.querySelector("#leftBar .smallerText");
    if (sidebar) {
      sidebar.innerHTML = [
        '<button id="subpageMobileMenuClose" class="subpageMobileMenuClose" type="button" aria-label="Close menu">Close</button>',
        '<a href="index" class="subpageMobileHomeTile"><div class="linkArrow bgibbons"><div class="vPadding"></div>' + subpageHomeLabel + '<div class="vPadding"></div></div></a>',
        '<a href="work"><div class="linkArrow"><div class="vPadding"></div>Work Experience<div class="vPadding"></div></div></a>',
        '<a href="certifications"><div class="linkArrow"><div class="vPadding"></div>Certifications<div class="vPadding"></div></div></a>',
        '<a href="projects"><div class="linkArrow"><div class="vPadding"></div>Personal Projects<div class="vPadding"></div></div></a>',
        '<a href="resume"><div class="linkArrow"><div class="vPadding"></div>Resume<div class="vPadding"></div></div></a>',
        '<a href="volunteering"><div class="linkArrow"><div class="vPadding"></div>Volunteer Work<div class="vPadding"></div></div></a>',
        '<a href="art"><div class="linkArrow"><div class="vPadding"></div>Art<div class="vPadding"></div></div></a>',
        '<a href="contact"><div class="linkArrow"><div class="vPadding"></div>Contact<div class="vPadding"></div></div></a>'
      ].join("\n");
    }

    var topRow = document.querySelector(".mainSubTextTable table tr");
    if (topRow) {
      topRow.innerHTML = [
        '<td class="mainSubText"><a href="work" class="topLink"><div class="linkArrow2">Principal Software Engineer</div></a></td>',
        '<td class="mainSubText"><a href="certifications" class="topLink"><div class="linkArrow2"><span>   </span>Certified AI Engineer</div></a></td>',
        '<td class="mainSubText"><a href="art" class="topLink"><div class="linkArrow2"><span>   </span>Artist</div></a></td>'
      ].join("\n");
    }

    var topLeftLink = document.querySelector(".top-left .topLink");
    if (topLeftLink) {
      topLeftLink.textContent = "Ben Gibbons";
      topLeftLink.setAttribute("href", "index");
    }

    bindSubpageMobileMenu();
    enableSubpageScrollReveal();
  }

  function enableSubpageScrollReveal() {
    var revealTargets = document.querySelectorAll(
      ".fixedLeftContent .whiteCell, .fixedLeftContent .blackCell, .fixedLeftContent .barCell, .fixedLeftContent .resumeCell, .fixedLeftContent .botCell, .fixedLeftContent .blurCell, .fixedLeftContent .blurCell2, .fixedLeftContent .levelCell, .fixedLeftContent2 .whiteCell, .fixedLeftContent2 .blackCell, .fixedLeftContent2 .barCell, .fixedLeftContent2 .resumeCell, .fixedLeftContent2 .botCell, .fixedLeftContent2 .blurCell, .fixedLeftContent2 .blurCell2, .fixedLeftContent2 .levelCell"
    );

    if (!revealTargets.length) {
      return;
    }

    document.body.classList.add("subpageRevealReady");

    if (window.matchMedia && window.matchMedia("(max-width: 900px)").matches) {
      revealTargets.forEach(function(target) {
        target.classList.add("is-visible");
      });
      return;
    }

    if (!("IntersectionObserver" in window)) {
      revealTargets.forEach(function(target) {
        target.classList.add("is-visible");
      });
      return;
    }

    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, {
      threshold: 0.16,
      rootMargin: "0px 0px -10% 0px"
    });

    revealTargets.forEach(function(target) {
      observer.observe(target);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applySubpageNav);
  } else {
    applySubpageNav();
  }
})();
