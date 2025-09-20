particlesJS("particles-js", {
  "particles": {
    "number": {
      "value": 80,
      "density": { "enable": true, "value_area": 800 }
    },
    "color": {
      "value": "#111827" // Dark particles for the light theme
    },
    "shape": { "type": "circle" },
    "opacity": { "value": 0.5, "random": true },
    "size": { "value": 2, "random": true },
    "line_linked": {
      "enable": true, "distance": 150, "color": "#111827", "opacity": 0.4, "width": 1
    },
    "move": {
      "enable": true, "speed": 1.5, "direction": "none", "random": true, "straight": false, "out_mode": "out"
    }
  },
  "interactivity": {
    "detect_on": "canvas",
    "events": { "onhover": { "enable": true, "mode": "grab" }, "onclick": { "enable": true, "mode": "push" } },
    "modes": { "grab": { "distance": 140, "line_linked": { "opacity": 0.7 } }, "push": { "particles_nb": 4 } }
  },
  "retina_detect": true
});