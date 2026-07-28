const track = document.getElementById("galleryTrack");
    const slides = document.querySelectorAll(".gallery-slide");
    const nextBtn = document.getElementById("nextBtn");
    const prevBtn = document.getElementById("prevBtn");

    let currentIndex = 0;

    function updateSlider() {
        track.scrollTo({
            left: currentIndex * track.clientWidth,
            behavior: "smooth"
        });
    }

    nextBtn.addEventListener("click", () => {
        currentIndex = (currentIndex + 1) % slides.length;
        updateSlider();
    });

    prevBtn.addEventListener("click", () => {
        currentIndex = (currentIndex - 1 + slides.length) % slides.length;
        updateSlider();
    });

    window.addEventListener("resize", updateSlider);