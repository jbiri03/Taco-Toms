const track = document.getElementById("galleryTrack");
const slides = document.querySelectorAll(".gallery-slide");
const nextBtn = document.getElementById("nextBtn");
const prevBtn = document.getElementById("prevBtn");
const dotsContainer = document.getElementById("galleryDots");

let currentIndex = 0;

/*DOTS */
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

function updateSlider(smooth = true) {
    track.scrollTo({
        left: currentIndex * track.clientWidth,
        behavior: smooth ? "smooth" : "auto"
    });
    updateDots();
}

/* NEXT */
function goNext() {
    if (currentIndex < slides.length - 1) {
        currentIndex++;
        updateSlider(true); // smooth
    } else {
        currentIndex = 0;
        updateSlider(false); // instant jump
    }
}

/* PREVIOUS */
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


/* AUTOPLAY CONTROL */
let autoplayInterval;
let autoplayDelay = 3500;
let autoplayPaused = false;

function startAutoplay() {
    autoplayInterval = setInterval(() => {
        if (!autoplayPaused) {
            goNext();
        }
    }, autoplayDelay);
}

// PAUSE AND RESUME
function pauseAutoplay() {
    autoplayPaused = true;
    clearInterval(autoplayInterval);

    setTimeout(() => {
        autoplayPaused = false;
        startAutoplay();
    }, 5000);
}

startAutoplay();
