const track = document.getElementById("galleryTrack");
const slides = document.querySelectorAll(".gallery-slide");
const nextBtn = document.getElementById("nextBtn");
const prevBtn = document.getElementById("prevBtn");
const dotsContainer = document.getElementById("galleryDots");

let currentIndex = 0;

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
    updateSlider(true);
  } else {
    currentIndex = 0;
    updateSlider(false);
  }
}

function goPrev() {
  if (currentIndex > 0) {
    currentIndex--;
    updateSlider(true);
  } else {
    currentIndex = slides.length - 1;
    updateSlider(false);
  }
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

let autoplayInterval;
const autoplayDelay = 3500;
let autoplayPaused = false;

function startAutoplay() {
  clearInterval(autoplayInterval);
  autoplayInterval = setInterval(() => {
    if (!autoplayPaused) {
      goNext();
    }
  }, autoplayDelay);
}

// Pause for 5s on any user interaction, then resume
function pauseAutoplay() {
  autoplayPaused = true;
  clearInterval(autoplayInterval);

  setTimeout(() => {
    autoplayPaused = false;
    startAutoplay();
  }, 5000);
}

/* ===========================
   SWIPE / DRAG (TOUCH + MOUSE)
   =========================== */

let isPointerDown = false;
let startX = 0;
let startScrollLeft = 0;

// Touch start
track.addEventListener("touchstart", (e) => {
  if (e.touches.length !== 1) return;
  isPointerDown = true;
  startX = e.touches[0].clientX;
  startScrollLeft = track.scrollLeft;
  pauseAutoplay();
});

// Touch move
track.addEventListener("touchmove", (e) => {
  if (!isPointerDown || e.touches.length !== 1) return;
  e.preventDefault(); // prevent default scrolling
  const currentX = e.touches[0].clientX;
  const diff = currentX - startX;
  track.scrollLeft = startScrollLeft - diff;
});

// Touch end
track.addEventListener("touchend", () => {
  if (!isPointerDown) return;
  isPointerDown = false;
  snapToNearestSlide();
});

// // Mouse start (desktop)
// track.addEventListener("mousedown", (e) => {
//   isPointerDown = true;
//   startX = e.clientX;
//   startScrollLeft = track.scrollLeft;
//   pauseAutoplay();
// });

// // Mouse move
// track.addEventListener("mousemove", (e) => {
//   if (!isPointerDown) return;
//   e.preventDefault(); // stop text selection
//   const currentX = e.clientX;
//   const diff = currentX - startX;
//   track.scrollLeft = startScrollLeft - diff;
// });

// // Mouse end / leave
// ["mouseup", "mouseleave"].forEach((evt) => {
//   track.addEventListener(evt, () => {
//     if (!isPointerDown) return;
//     isPointerDown = false;
//     snapToNearestSlide();
//   });
// });

// Snap to nearest slide + update index/dots
function snapToNearestSlide() {
  const slideWidth = track.clientWidth;
  const newIndex = Math.round(track.scrollLeft / slideWidth);
  currentIndex = Math.max(0, Math.min(slides.length - 1, newIndex));
  updateSlider(true);
}

/* ===========================
   INIT
   =========================== */

startAutoplay();
updateSlider(false);