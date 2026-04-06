// ==================== CONSTANTS ====================
const BRAND = {
  green: '#154734',
  greenLight: 'rgba(21, 71, 52, 0.08)',
  greenMid: 'rgba(21, 71, 52, 0.15)'
};

const PINNED_STORAGE_KEY = 'pr_agent_pinned';

// Registry of all live pin buttons in the DOM keyed by their pinKey.
// Allows us to sync a pair's button UI when one is toggled.
const PIN_BTN_REGISTRY = {};