// Cortex Rush - selectable car models and colours.
//
// Cars are drawn as vector silhouettes rather than photographs: the game
// ships as a self-contained offline folder, and real manufacturer imagery
// would be both a large binary asset and a trademark problem for a public
// club booth. The three profiles below are generic supercar archetypes.
//
// Add a model or colour here and it appears in the selection screen and the
// race automatically; no other file needs editing. All measurements are
// fractions of the sprite box: x spans -0.5..0.5, y is 0 at the ground and
// 1 at roof height.
const CarCatalog = (function () {
  const MODELS = [
    {
      id: "apex",
      name: "Apex GT",
      // Low, wide supercar wedge with sharp shoulders over the rear wheels.
      bodyWidth: 0.50,
      shoulderWidth: 0.44,
      roofWidth: 0.24,
      bodyHeight: 0.40,
      roofHeight: 0.58,
      glass: { width: 0.20, top: 0.55, bottom: 0.42 },
      wing: { width: 0.0, height: 0.0, thickness: 0 },
      diffuser: 0.13,
      exhausts: 2,
      exhaustSpread: 0.16,
      lightWidth: 0.15,
      lightY: 0.30,
    },
    {
      id: "vortex",
      name: "Vortex RS",
      // GT3-style racer: big swan-neck rear wing and a wide diffuser.
      bodyWidth: 0.49,
      shoulderWidth: 0.45,
      roofWidth: 0.27,
      bodyHeight: 0.42,
      roofHeight: 0.62,
      glass: { width: 0.23, top: 0.59, bottom: 0.45 },
      wing: { width: 0.56, height: 0.86, thickness: 0.07 },
      diffuser: 0.16,
      exhausts: 2,
      exhaustSpread: 0.10,
      lightWidth: 0.13,
      lightY: 0.28,
    },
    {
      id: "bolide",
      name: "Bolide F1",
      // Open-wheel single seater: narrow body, exposed tyres, tall wing.
      bodyWidth: 0.22,
      shoulderWidth: 0.20,
      roofWidth: 0.14,
      bodyHeight: 0.40,
      roofHeight: 0.56,
      glass: { width: 0.12, top: 0.54, bottom: 0.42 },
      wing: { width: 0.62, height: 0.80, thickness: 0.08 },
      diffuser: 0.10,
      exhausts: 1,
      exhaustSpread: 0,
      lightWidth: 0.08,
      lightY: 0.24,
      openWheel: true,
    },
  ];

  const COLORS = [
    // No blue in this list: TAM is always blue, and a booth player must be
    // able to tell their own car apart at a glance.
    { id: "red", name: "Red", hex: "#ff3b3b" },
    { id: "lime", name: "Lime", hex: "#8bf34a" },
    { id: "amber", name: "Amber", hex: "#ffa22b" },
    { id: "violet", name: "Violet", hex: "#a45cff" },
    { id: "white", name: "Pearl", hex: "#eef4ff" },
    { id: "magenta", name: "Magenta", hex: "#ff4fb8" },
  ];

  function modelById(id) {
    return MODELS.find((m) => m.id === id) || MODELS[0];
  }

  function colorById(id) {
    return COLORS.find((c) => c.id === id) || COLORS[0];
  }

  return { MODELS, COLORS, modelById, colorById };
})();
