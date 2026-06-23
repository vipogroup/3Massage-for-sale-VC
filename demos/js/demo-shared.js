(function () {
    const images = ['../assets/images/1.webp', '../assets/images/2.webp', '../assets/images/3.webp'];
    let idx = 0;

    function rotateImages() {
        document.querySelectorAll('[data-demo-gallery]').forEach(function (img) {
            if (!img.dataset.demoGallery) return;
            img.src = images[idx % images.length];
        });
        idx++;
    }

    document.addEventListener('DOMContentLoaded', function () {
        rotateImages();
        setInterval(rotateImages, 3500);

        const video = document.getElementById('demoVideo');
        if (video) video.play().catch(function () {});
    });
})();
