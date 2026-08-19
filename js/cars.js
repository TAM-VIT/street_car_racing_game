// Cortex Rush - selectable car models and colours.
// Add a model or colour here and it appears in the selection screen and
// the race automatically; no other file needs editing.
const CarCatalog = (function () {
  const MODELS = [
    {
      id: "bolt",
      name: "Bolt",
      // Body outline as fractions of the sprite box: x is -0.5..0.5 across
      // the width, y is 0 at the ground up to 1 at the roof.
      body: [
        [-0.50, 0.00], [-0.44, 0.42], [-0.30, 0.62], [0.30, 0.62],
        [0.44, 0.42], [0.50, 0.00],
      ],
      cabin: { x: -0.26, y: 0.34, w: 0.52, h: 0.24 },
      wingHeight: 0,
    },
    {
      id: "vector",
      name: "Vector",
      body: [
        [-0.50, 0.00], [-0.46, 0.30], [-0.34, 0.70], [-0.14, 0.80],
        [0.14, 0.80], [0.34, 0.70], [0.46, 0.30], [0.50, 0.00],
      ],
      cabin: { x: -0.22, y: 0.42, w: 0.44, h: 0.28 },
      wingHeight: 0.1,
    },
    {
      id: "tank",
      name: "Tank",
      body: [
        [-0.52, 0.00], [-0.52, 0.52], [-0.38, 0.72], [0.38, 0.72],
        [0.52, 0.52], [0.52, 0.00],
      ],
      cabin: { x: -0.30, y: 0.44, w: 0.60, h: 0.24 },
      wingHeight: 0.06,
    },
  ];

  const COLORS = [
    { id: "cyan", name: "Cyan", hex: "#3ad1ff" },
    { id: "lime", name: "Lime", hex: "#8bf34a" },
    { id: "amber", name: "Amber", hex: "#ffb03a" },
    { id: "violet", name: "Violet", hex: "#b06bff" },
    { id: "white", name: "White", hex: "#eef4ff" },
    { id: "magenta", name: "Magenta", hex: "#ff5ec7" },
  ];

  function modelById(id) {
    return MODELS.find((m) => m.id === id) || MODELS[0];
  }

  function colorById(id) {
    return COLORS.find((c) => c.id === id) || COLORS[0];
  }

  return { MODELS, COLORS, modelById, colorById };
})();
