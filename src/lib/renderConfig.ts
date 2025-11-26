// Rendering configuration
// ============================================================================
// SPRITE PACK TYPE DEFINITION
// ============================================================================
// Each sprite pack contains all the configuration needed for a specific
// sprite sheet image, including layout, offsets, and building mappings.
// ============================================================================
export interface SpritePack {
  // Unique identifier for this sprite pack
  id: string;
  // Display name for the UI
  name: string;
  // Path to the sprite sheet image
  src: string;
  // Number of columns in the sprite sheet
  cols: number;
  // Number of rows in the sprite sheet
  rows: number;
  // Layout order: 'row' = left-to-right then top-to-bottom
  layout: 'row' | 'column';
  // The order of sprites in the sprite sheet (maps to grid positions)
  spriteOrder: readonly string[];
  // Per-sprite vertical offset adjustments (positive = down, negative = up)
  // Values are multiplied by tile height for consistent scaling
  verticalOffsets: Record<string, number>;
  // Per-sprite horizontal offset adjustments (positive = right, negative = left)
  // Values are multiplied by tile width for consistent scaling
  horizontalOffsets: Record<string, number>;
  // Maps building types to sprite keys in spriteOrder
  buildingToSprite: Record<string, string>;
  // Optional global scale multiplier for all sprites in this pack
  globalScale?: number;
}

// ============================================================================
// SPRITE PACK: RED (Default)
// ============================================================================
const SPRITE_PACK_RED: SpritePack = {
  id: 'red',
  name: 'Red Theme',
  src: '/assets/sprites_red_water.png',
  cols: 5,
  rows: 6,
  layout: 'row',
  spriteOrder: [
    // Row 0 (indices 0-4)
    'residential',
    'commercial',
    'industrial',
    'fire_station',
    'hospital',
    // Row 1 (indices 5-9)
    'park',
    'park_large',
    'tennis',
    'police_station',
    'school',
    // Row 2 (indices 10-14)
    'university',
    'water_tower',
    'power_plant',
    'stadium',
    'space_program',
    // Row 3 (indices 15-19)
    'tree',
    'house_medium',
    'mansion',
    'house_small',
    'shop_medium',
    // Row 4 (indices 20-24)
    'shop_small',
    'warehouse',
    'factory_small',
    'factory_medium',
    'factory_large',
    // Row 5 (indices 25-29)
    'airport',
    'water',
    '',
    '',
    'museum',
    
  ] as const,
  verticalOffsets: {
    park: 0.20,
    park_large: 0.20,
    police_station: 0.25,
    school: 0.20,
    tennis: 0.10,
    water_tower: -0.30,
    airport: -0.8,
    university: -0.3,
    space_program: -0.15,
  },
  horizontalOffsets: {
    university: 0.3,
  },
  buildingToSprite: {
    // Residential buildings
    house_small: 'house_small',
    house_medium: 'house_medium',
    mansion: 'mansion',
    apartment_low: 'residential',
    apartment_high: 'residential',
    // Commercial buildings
    shop_small: 'shop_small',
    shop_medium: 'shop_medium',
    office_low: 'commercial',
    office_high: 'commercial',
    mall: 'commercial',
    // Industrial buildings
    factory_small: 'industrial',
    factory_medium: 'industrial',
    factory_large: 'industrial',
    warehouse: 'warehouse',
    // Service buildings
    police_station: 'police_station',
    fire_station: 'fire_station',
    hospital: 'hospital',
    school: 'school',
    university: 'university',
    park: 'park',
    park_large: 'park_large',
    tennis: 'tennis',
    // Utilities
    power_plant: 'power_plant',
    water_tower: 'water_tower',
    // Special buildings
    stadium: 'stadium',
    museum: 'museum',
    airport: 'airport',
    space_program: 'space_program',
    // Nature
    tree: 'tree',
    water: 'water',
  },
};

// ============================================================================
// SPRITE PACK: SPRITES4 (Alternative)
// ============================================================================
const SPRITE_PACK_SPRITES4: SpritePack = {
  id: 'sprites4',
  name: 'Sprites 4',
  src: '/assets/sprites4.png',
  cols: 5,
  rows: 6,
  layout: 'row',
  spriteOrder: [
    // Row 0 (indices 0-4)
    'residential',
    'commercial',
    'industrial',
    'fire_station',
    'hospital',
    // Row 1 (indices 5-9)
    'park',
    'park_large',
    'tennis',
    'police_station',
    'school',
    // Row 2 (indices 10-14)
    'university',
    'water_tower',
    'power_plant',
    'stadium',
    'space_program',
    // Row 3 (indices 15-19)
    'tree',
    'house_medium',
    'mansion',
    'house_small',
    'shop_medium',
    // Row 4 (indices 20-24)
    'shop_small',
    'warehouse',
    'factory_small',
    'factory_medium',
    'factory_large',
    // Row 5 (indices 25-29)
    'airport',
    'water',
    '',
    '',
    'museum',
  ] as const,
  verticalOffsets: {
    // Adjust these as needed for sprites4.png
    park: 0.20,
    park_large: 0.20,
    police_station: 0.25,
    school: 0.20,
    tennis: 0.10,
    water_tower: -0.30,
    airport: -0.8,
    space_program: -0.15,
  },
  horizontalOffsets: {
    university: -0.6,
  },
  buildingToSprite: {
    house_small: 'house_small',
    house_medium: 'house_medium',
    mansion: 'mansion',
    apartment_low: 'residential',
    apartment_high: 'residential',
    shop_small: 'shop_small',
    shop_medium: 'shop_medium',
    office_low: 'commercial',
    office_high: 'commercial',
    mall: 'commercial',
    factory_small: 'industrial',
    factory_medium: 'industrial',
    factory_large: 'industrial',
    warehouse: 'warehouse',
    police_station: 'police_station',
    fire_station: 'fire_station',
    hospital: 'hospital',
    school: 'school',
    university: 'university',
    park: 'park',
    park_large: 'park_large',
    tennis: 'tennis',
    power_plant: 'power_plant',
    water_tower: 'water_tower',
    stadium: 'stadium',
    museum: 'museum',
    airport: 'airport',
    space_program: 'space_program',
    tree: 'tree',
    water: 'water',
  },
};

// ============================================================================
// SPRITE PACK: SPRITES4_BG (With Background)
// ============================================================================
const SPRITE_PACK_SPRITES4_BG: SpritePack = {
  id: 'sprites4_bg',
  name: 'Sprites 4 (BG)',
  src: '/assets/sprites4_bg.png',
  cols: 5,
  rows: 6,
  layout: 'row',
  spriteOrder: [
    // Row 0 (indices 0-4)
    'residential',
    'commercial',
    'industrial',
    'fire_station',
    'hospital',
    // Row 1 (indices 5-9)
    'park',
    'park_large',
    'tennis',
    'police_station',
    'school',
    // Row 2 (indices 10-14)
    'university',
    'water_tower',
    'power_plant',
    'stadium',
    'space_program',
    // Row 3 (indices 15-19)
    'tree',
    'house_medium',
    'mansion',
    'house_small',
    'shop_medium',
    // Row 4 (indices 20-24)
    'shop_small',
    'warehouse',
    'factory_small',
    'factory_medium',
    'factory_large',
    // Row 5 (indices 25-29)
    'airport',
    'water',
    '',
    '',
    'museum',
  ] as const,
  verticalOffsets: {
    park: 0.20,
    park_large: 0.20,
    police_station: 0.25,
    school: 0.20,
    tennis: 0.10,
    water_tower: -0.30,
    airport: -0.8,
    university: -0.3,
    space_program: -0.15,
  },
  horizontalOffsets: {
    university: 0.3,
  },
  buildingToSprite: {
    house_small: 'house_small',
    house_medium: 'house_medium',
    mansion: 'mansion',
    apartment_low: 'residential',
    apartment_high: 'residential',
    shop_small: 'shop_small',
    shop_medium: 'shop_medium',
    office_low: 'commercial',
    office_high: 'commercial',
    mall: 'commercial',
    factory_small: 'industrial',
    factory_medium: 'industrial',
    factory_large: 'industrial',
    warehouse: 'warehouse',
    police_station: 'police_station',
    fire_station: 'fire_station',
    hospital: 'hospital',
    school: 'school',
    university: 'university',
    park: 'park',
    park_large: 'park_large',
    tennis: 'tennis',
    power_plant: 'power_plant',
    water_tower: 'water_tower',
    stadium: 'stadium',
    museum: 'museum',
    airport: 'airport',
    space_program: 'space_program',
    tree: 'tree',
    water: 'water',
  },
};

// ============================================================================
// SPRITE PACKS REGISTRY
// ============================================================================
// Add new sprite packs here. Each pack can have completely different
// sprite arrangements, offsets, and scaling.
// ============================================================================
export const SPRITE_PACKS: SpritePack[] = [
  SPRITE_PACK_RED,
  SPRITE_PACK_SPRITES4,
  SPRITE_PACK_SPRITES4_BG,
];

// Default sprite pack ID
export const DEFAULT_SPRITE_PACK_ID = 'red';

// Get a sprite pack by ID
export function getSpritePack(id: string): SpritePack {
  return SPRITE_PACKS.find(pack => pack.id === id) || SPRITE_PACKS[0];
}

// ============================================================================
// BACKWARDS COMPATIBILITY EXPORTS
// ============================================================================
// These exports maintain compatibility with existing code that uses the old API.
// They default to the first sprite pack (RED).
// ============================================================================

// Get active sprite pack (this will be overridden by the selected pack in context)
let _activeSpritePack: SpritePack = SPRITE_PACKS[0];

export function setActiveSpritePack(pack: SpritePack) {
  _activeSpritePack = pack;
}

export function getActiveSpritePack(): SpritePack {
  return _activeSpritePack;
}

// Legacy exports that read from the active sprite pack
export const SPRITE_SHEET = {
  get src() { return _activeSpritePack.src; },
  get cols() { return _activeSpritePack.cols; },
  get rows() { return _activeSpritePack.rows; },
  get layout() { return _activeSpritePack.layout; },
};

export const SPRITE_ORDER = _activeSpritePack.spriteOrder;

export const SPRITE_VERTICAL_OFFSETS = new Proxy({} as Record<string, number>, {
  get(_, key: string) {
    return _activeSpritePack.verticalOffsets[key] ?? 0;
  },
  has(_, key: string) {
    return key in _activeSpritePack.verticalOffsets;
  },
});

export const SPRITE_HORIZONTAL_OFFSETS = new Proxy({} as Record<string, number>, {
  get(_, key: string) {
    return _activeSpritePack.horizontalOffsets[key] ?? 0;
  },
  has(_, key: string) {
    return key in _activeSpritePack.horizontalOffsets;
  },
});

export const BUILDING_TO_SPRITE = new Proxy({} as Record<string, string>, {
  get(_, key: string) {
    return _activeSpritePack.buildingToSprite[key];
  },
  has(_, key: string) {
    return key in _activeSpritePack.buildingToSprite;
  },
});

// Get the sprite sheet coordinates for a building type
export function getSpriteCoords(
  buildingType: string,
  spriteSheetWidth: number,
  spriteSheetHeight: number,
  pack?: SpritePack
): { sx: number; sy: number; sw: number; sh: number } | null {
  const activePack = pack || _activeSpritePack;
  
  // First, map building type to sprite key
  const spriteKey = activePack.buildingToSprite[buildingType];
  if (!spriteKey) return null;
  
  // Find index in sprite order
  const index = activePack.spriteOrder.indexOf(spriteKey);
  if (index === -1) return null;
  
  // Calculate tile dimensions
  const tileWidth = Math.floor(spriteSheetWidth / activePack.cols);
  const tileHeight = Math.floor(spriteSheetHeight / activePack.rows);
  
  let col: number;
  let row: number;
  
  if (activePack.layout === 'column') {
    col = Math.floor(index / activePack.rows);
    row = index % activePack.rows;
  } else {
    col = index % activePack.cols;
    row = Math.floor(index / activePack.cols);
  }
  
  return {
    sx: col * tileWidth,
    sy: row * tileHeight,
    sw: tileWidth,
    sh: tileHeight,
  };
}

// Helper to get offsets for a specific pack
export function getSpriteOffsets(
  buildingType: string,
  pack?: SpritePack
): { vertical: number; horizontal: number } {
  const activePack = pack || _activeSpritePack;
  const spriteKey = activePack.buildingToSprite[buildingType];
  
  return {
    vertical: spriteKey ? (activePack.verticalOffsets[spriteKey] ?? 0) : 0,
    horizontal: spriteKey ? (activePack.horizontalOffsets[spriteKey] ?? 0) : 0,
  };
}
