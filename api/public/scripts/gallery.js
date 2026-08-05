const track = document.getElementById("galleryTrack");
const slides = document.querySelectorAll(".gallery-slide");
const nextBtn = document.getElementById("nextBtn");
const prevBtn = document.getElementById("prevBtn");
const dotsContainer = document.getElementById("galleryDots");

let currentIndex = 0;
let autoplayInterval = null;
let autoplayTimeout = null;
let autoplayPaused = false;

const autoplayDelay = 3500;
const resumeDelay = 5000;

let touchStartX = 0;
let touchStartTime = 0;
let isTouching = false;
let scrollEndTimer = null;

/* ===========================
   DOTS
   =========================== */

function createDots() {
  dotsContainer.innerHTML = "";

  slides.forEach((_, index) => {
    const dot = document.createElement("button");
    dot.className = "gallery-dot";
    if (index === 0) dot.classList.add("active");

    dot.type = "button";
    dot.addEventListener("click", () => {
      pauseAutoplay();
      goToSlide(index);
    });

    dotsContainer.appendChild(dot);
  });
}

function updateDots() {
  const dots = document.querySelectorAll(".gallery-dot");
  dots.forEach((dot, index) => {
    dot.classList.toggle("active", index === currentIndex);
  });
}

/* ===========================
   SLIDE CONTROL
   =========================== */

function goToSlide(index, smooth = true) {
  currentIndex = Math.max(0, Math.min(index, slides.length - 1));

  const left = currentIndex * track.clientWidth;
  track.scrollTo({
    left,
    behavior: smooth ? "smooth" : "auto"
  });

  updateDots();
}

function goNext() {
  goToSlide(currentIndex === slides.length - 1 ? 0 : currentIndex + 1);
}

function goPrev() {
  goToSlide(currentIndex === 0 ? slides.length - 1 : currentIndex - 1);
}

/* ===========================
   AUTOPLAY
   =========================== */

function startAutoplay() {
  stopAutoplay();

  autoplayInterval = setInterval(() => {
    if (!autoplayPaused) {
      goNext();
    }
  }, autoplayDelay);
}

function stopAutoplay() {
  if (autoplayInterval) clearInterval(autoplayInterval);
  if (autoplayTimeout) clearTimeout(autoplayTimeout);
}

function pauseAutoplay() {
  autoplayPaused = true;
  stopAutoplay();

  autoplayTimeout = setTimeout(() => {
    autoplayPaused = false;
    startAutoplay();
  }, resumeDelay);
}

/* ===========================
   TOUCH / SCROLL HANDLING
   =========================== */

track.addEventListener("touchstart", (e) => {
  if (!e.touches || !e.touches.length) return;

  isTouching = true;
  touchStartX = e.touches[0].clientX;
  touchStartTime = Date.now();
  pauseAutoplay();
}, { passive: true });

track.addEventListener("touchend", () => {
  isTouching = false;
  scheduleSnap();
}, { passive: true });

track.addEventListener("scroll", () => {
  if (isTouching) return;
  scheduleSnap();
}, { passive: true });

function scheduleSnap() {
  clearTimeout(scrollEndTimer);
  scrollEndTimer = setTimeout(() => {
    snapToNearestSlide();
  }, 120);
}

function snapToNearestSlide() {
  const slideWidth = track.clientWidth;
  const index = Math.round(track.scrollLeft / slideWidth);

  currentIndex = Math.max(0, Math.min(index, slides.length - 1));
  goToSlide(currentIndex, true);
}

/* ===========================
   BUTTONS
   =========================== */

nextBtn.addEventListener("click", () => {
  pauseAutoplay();
  goNext();
});

prevBtn.addEventListener("click", () => {
  pauseAutoplay();
  goPrev();
});

/* ===========================
   RESIZE
   =========================== */

window.addEventListener("resize", () => {
  goToSlide(currentIndex, false);
});

/* ===========================
   INIT
   =========================== */

createDots();
goToSlide(0, false);
startAutoplay();