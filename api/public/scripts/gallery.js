const track = document.getElementById("galleryTrack");
const slides = document.querySelectorAll(".gallery-slide");
const nextBtn = document.getElementById("nextBtn");
const prevBtn = document.getElementById("prevBtn");
const dotsContainer = document.getElementById("galleryDots");

let currentIndex = 0;
let autoplayInterval;
const autoplayDelay = 3500;
let autoplayPaused = false;

let isPointerDown = false;
let startX = 0;
let startScrollLeft = 0;
let autoplayTimeout;

/* ===========================
   DOTS
   =========================== */

slides.forEach((_, index) => {
  const dot = document.createElement("button");
  dot.classList.add("gallery-dot");
  if (index === 0) dot.classList.add("active");

  dot.addEventListener("click", () => {
    pauseAutoplay();
    currentIndex = index;
    updateSlider(true);
  });

  dotsContainer.appendChild(dot);
});

function updateDots() {
  const dots = document.querySelectorAll(".gallery-dot");
  dots.forEach((dot, index) => {
    dot.classList.toggle("active", index === currentIndex);
  });
}

/* ===========================
   SLIDER UPDATE
   =========================== */

function updateSlider(smooth = true) {
  track.scrollTo({
    left: currentIndex * track.clientWidth,
    behavior: smooth ? "smooth" : "auto"
  });
  updateDots();
}

/* ===========================
   NEXT / PREV
   =========================== */

function goNext() {
  if (currentIndex < slides.length - 1) {
    currentIndex++;
  } else {
    currentIndex = 0;
  }
  updateSlider(true);
}

function goPrev() {
  if (currentIndex > 0) {
    currentIndex--;
  } else {
    currentIndex = slides.length - 1;
  }
  updateSlider(true);
}

nextBtn.addEventListener("click", () => {
  pauseAutoplay();
  goNext();
});

prevBtn.addEventListener("click", () => {
  pauseAutoplay();
  goPrev();
});

window.addEventListener("resize", () => updateSlider(false));

/* ===========================
   AUTOPLAY CONTROL
   =========================== */

function startAutoplay() {
  clearInterval(autoplayInterval);
  autoplayInterval = setInterval(() => {
    if (!autoplayPaused) {
      goNext();
    }
  }, autoplayDelay);
}

function pauseAutoplay() {
  autoplayPaused = true;
  clearTimeout(autoplayTimeout);
  clearInterval(autoplayInterval);

  autoplayTimeout = setTimeout(() => {
    autoplayPaused = false;
    startAutoplay();
  }, 5000);
}

/* ===========================
   SWIPE / DRAG
   =========================== */

track.addEventListener("pointerdown", (e) => {
  isPointerDown = true;
  startX = e.clientX;
  startScrollLeft = track.scrollLeft;
  track.setPointerCapture(e.pointerId);
  pauseAutoplay();
});

track.addEventListener("pointermove", (e) => {
  if (!isPointerDown) return;

  const diff = e.clientX - startX;
  track.scrollLeft = startScrollLeft - diff;
});

track.addEventListener("pointerup", () => {
  if (!isPointerDown) return;
  isPointerDown = false;
  snapToNearestSlide();
});

track.addEventListener("pointercancel", () => {
  isPointerDown = false;
});

/* ===========================
   SNAP
   =========================== */

function snapToNearestSlide() {
  const slideWidth = track.clientWidth;
  const delta = track.scrollLeft - currentIndex * slideWidth;

  if (delta > slideWidth * 0.12) {
    currentIndex = Math.min(slides.length - 1, currentIndex + 1);
  } else if (delta < -slideWidth * 0.12) {
    currentIndex = Math.max(0, currentIndex - 1);
  }

  updateSlider(true);
}

/* ===========================
   INIT
   =========================== */

startAutoplay();
updateSlider(false);