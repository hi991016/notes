/* -------------------------------------------------------
   Page Transitions — Barba.js + GSAP
   Adapted from codebydennis.com style
------------------------------------------------------- */

gsap.registerPlugin(CustomEase);
CustomEase.create("animation-nav", ".3, 0, .3, 1");

const transitionOffset = 450;

// ── Helpers ──────────────────────────────────────────────
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms || 2000));
}

// ── Page Leave: overlay flashes in + circle spins ────────
function pageTransitionIn() {
  const tl = gsap.timeline();
  const circle = document.querySelector(".loading-circle svg circle");
  const circleLength = circle ? circle.getTotalLength() : 100;

  tl.set("html", {
    cursor: "wait",
  });

  // Overlay flash in
  tl.to(
    ".transition-screen",
    {
      duration: 0.4,
      autoAlpha: 1,
      ease: "animation-nav",
    },
    0,
  );

  // Overlay fade out
  tl.to(
    ".transition-screen",
    {
      duration: 0.8,
      autoAlpha: 0,
      ease: "animation-nav",
    },
    0.5,
  ).set(
    "html",
    {
      cursor: "auto",
    },
    "=-0.5",
  );

  // Circle: dash setup
  tl.set(
    ".loading-circle svg circle",
    {
      strokeDashoffset: circleLength * 3,
      strokeDasharray: circleLength + 2,
      opacity: 1,
    },
    0,
  );
  tl.set(".loading-circle svg", { rotate: 0, opacity: 1 }, 0);

  // Circle: spin
  tl.to(
    ".loading-circle svg",
    {
      rotate: 360,
      duration: 1.3,
      ease: "none",
    },
    0,
  );

  // Circle: draw first half
  tl.to(
    ".loading-circle svg circle",
    {
      autoAlpha: 1,
      duration: 0.65,
      ease: "Power1.easeIn",
      strokeDashoffset: circleLength * 2,
    },
    0,
  );

  // Circle: draw second half
  tl.to(
    ".loading-circle svg circle",
    {
      autoAlpha: 1,
      duration: 0.65,
      ease: "Power1.easeOut",
      strokeDashoffset: circleLength * 1,
    },
    0.7,
  );

  // Circle: hide
  tl.to(
    ".loading-circle svg",
    {
      duration: 0.01,
      opacity: 0,
    },
    1.25,
  );



  // Nav attr flags
  tl.call(
    () => {
      document
        .querySelector("[data-page-transition]")
        ?.setAttribute("data-page-transition", "active");
    },
    null,
    0,
  );
  tl.call(
    () => {
      document
        .querySelector("[data-page-transition]")
        ?.setAttribute("data-page-transition", "not-active");
    },
    null,
    0.5,
  );

  return tl;
}

// ── Page Enter: content blurs/slides in ──────────────────
function pageTransitionOut() {
  const tl = gsap.timeline();
  const targets = ".page-header .col-row, .page-header + .section";

  tl.set(
    targets,
    {
      rotate: 0.001,
      opacity: 0,
      y: "1em",
      filter: "blur(0.25em)",
      scale: 0.975,
    },
    0,
  );

  tl.to(
    targets,
    {
      duration: 1.4,
      rotate: 0.001,
      opacity: 1,
      y: "0em",
      ease: "expo.out",
      stagger: 0.1,
      scale: 1,
    },
    0.2,
  );

  tl.to(
    targets,
    {
      duration: 2,
      ease: "expo.out",
      clearProps: "all",
      stagger: 0.1,
      filter: "blur(0em)",
      scale: 1,
    },
    0.2,
  );

  return tl;
}

// ── Active Nav Link ──────────────────────────────────────
function updateActiveNav() {
  const currentPath = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-links a").forEach((link) => {
    const linkPath = link.getAttribute("href");
    link.classList.toggle("nav-active", linkPath === currentPath);
  });
}

// ── Barba Init ───────────────────────────────────────────
barba.init({
  sync: true,
  debug: false,
  timeout: 7000,

  transitions: [
    {
      name: "default",

      // First load — no loading screen, just reveal content
      once() {
        updateActiveNav();
        pageTransitionOut();
      },

      // Link clicked → leave current page
      async leave() {
        pageTransitionIn();
        await delay(transitionOffset);
      },

      // New page DOM ready → reveal content
      async enter() {
        window.scrollTo(0, 0);
        updateActiveNav();
        pageTransitionOut();
      },
    },
  ],
});
