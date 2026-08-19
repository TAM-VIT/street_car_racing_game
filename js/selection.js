// Cortex Rush - the player's chosen name, car model and colour.
const Selection = (function () {
  const state = {
    name: CONFIG.NAME.defaultName,
    modelId: CarCatalog.MODELS[0].id,
    colorId: CarCatalog.COLORS[0].id,
  };

  // Control characters, zero-width joiners and bidi overrides. These are not
  // an injection vector on their own, but they can corrupt the rendered
  // layout or disguise the displayed name, so they are dropped.
  const UNSAFE_CHARS = /[\x00-\x1f\x7f-\x9f\u200b-\u200f\u2028-\u202e\ufeff]/g;

  // The player name is the only place user input reaches the page. It is
  // normalised here and only ever inserted with textContent, never
  // innerHTML, so a name like a script tag is displayed as literal text.
  // Length is counted in code points so an emoji counts as one character
  // and a surrogate pair can never be split in half.
  function setName(raw) {
    const cleaned = String(raw == null ? "" : raw)
      .replace(UNSAFE_CHARS, "")
      .replace(/\s+/g, " ")
      .trim();
    const capped = Array.from(cleaned).slice(0, CONFIG.NAME.maxLength).join("");
    state.name = capped.length > 0 ? capped : CONFIG.NAME.defaultName;
    return state.name;
  }

  function model() {
    return CarCatalog.modelById(state.modelId);
  }

  function colorHex() {
    return CarCatalog.colorById(state.colorId).hex;
  }

  return { state, setName, model, colorHex };
})();
