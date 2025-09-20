particlesJS("particles-js", {
  "particles": {
    "number": {
      "value": 80,
      "density": { "enable": true, "value_area": 800 }
    },
    "color": {
      "value": "#6B7280" // Dark grey particles
    },
    "shape": { "type": "circle" },
    "opacity": { "value": 0.6, "random": true },
    "size": { "value": 3, "random": true },
    "line_linked": {
      "enable": true, "distance": 150, "color": "#9CA3AF", "opacity": 0.4, "width": 1 // Lighter grey lines
    },
    "move": {
      "enable": true, "speed": 1.5, "direction": "none", "random": true, "straight": false, "out_mode": "out"
    }
  },
  "interactivity": {
    "detect_on": "canvas",
    "events": { "onhover": { "enable": true, "mode": "grab" }, "onclick": { "enable": false } },
    "modes": { "grab": { "distance": 140, "line_linked": { "opacity": 0.7 } } }
  },
  "retina_detect": true
});