document.addEventListener("DOMContentLoaded", () => {
  const projectsContainer = document.querySelector(".projects-container");
  const images = Array.from(document.getElementsByClassName("project-image"));
  let clientX = 0;
  let isMouseDown = false;
  let velocity = 0;
  let rafId = null;

  const FRICTION = 0.975;
  const MIN_VELOCITY = 0.1;

  if (screen.width > 1024) {
    images.forEach((img) => {
      const initialWidth = img.width;
      img.addEventListener("mouseover", () => {
        if (initialWidth > 0) {
          img.style.width = (initialWidth * 1.75).toString() + "px";
        }
      });

      img.addEventListener("mouseout", () => {
        if (initialWidth > 0) {
          img.style.width = initialWidth.toString() + "px";
        }
      });
    });
  }
  
  projectsContainer.addEventListener("pointerdown", (e) => {
    isMouseDown = true;
    clientX = e.clientX;
    velocity = 0;
    cancelAnimationFrame(rafId);
    projectsContainer.setPointerCapture(e.pointerId);
  });


  projectsContainer.addEventListener("pointermove", (e) => {
    if (isMouseDown) {
      let newClientX = e.clientX;
      const dx = clientX - newClientX;
      projectsContainer.scrollBy({
        left: clientX - newClientX,
      });
      velocity = dx;
      clientX = newClientX;
      images.forEach((img) => {
        const rect = img.getBoundingClientRect();
        const startPoint = rect.left;
        const endPoint = rect.right;
        if (startPoint <= newClientX && endPoint >= newClientX) {
          img.style.width = rect.width  + "px";
        }
      });
    }
  })

  projectsContainer.addEventListener("pointerup", (e) => {
    if (isMouseDown && velocity === 0) {
      images.forEach((img) => {
        const rect = img.getBoundingClientRect();
        const startPoint = rect.left;
        const endPoint = rect.right;
        if (startPoint <= e.clientX && endPoint >= e.clientX) {
          window.location.href = img.getAttribute("data-url");
        }
      });
    }
    isMouseDown = false;
    images.forEach((img) => {
      img.style.pointerEvents = "all";
    });

    applyInertia();
  })

  document.addEventListener("pointercancel", () => {
    isMouseDown = false;
    images.forEach((img) => {
      img.style.pointerEvents = "none";
    });
  })

  function applyInertia() {
    if (Math.abs(velocity) < MIN_VELOCITY) return;

    velocity *= FRICTION;
    projectsContainer.scrollLeft += velocity;

    rafId = requestAnimationFrame(applyInertia);
  }

})

