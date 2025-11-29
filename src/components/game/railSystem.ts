/**
 * Rail System - Railway track rendering and train management
 * Handles track connections, curves, spurs, and multi-carriage trains
 */

import { Tile } from '@/types/game';
import { TILE_WIDTH, TILE_HEIGHT, CarDirection } from './types';

// ============================================================================
// Types
// ============================================================================

/** Rail track connection pattern */
export type RailConnection = {
  north: boolean;
  east: boolean;
  south: boolean;
  west: boolean;
};

/** Track segment type based on connections */
export type TrackType = 
  | 'straight_ns'     // North-South straight
  | 'straight_ew'     // East-West straight
  | 'curve_ne'        // Curves connecting N-E
  | 'curve_nw'        // Curves connecting N-W
  | 'curve_se'        // Curves connecting S-E
  | 'curve_sw'        // Curves connecting S-W
  | 'junction_t_n'    // T-junction, no north
  | 'junction_t_e'    // T-junction, no east
  | 'junction_t_s'    // T-junction, no south
  | 'junction_t_w'    // T-junction, no west
  | 'junction_cross'  // 4-way crossing
  | 'terminus_n'      // Dead-end facing north
  | 'terminus_e'      // Dead-end facing east
  | 'terminus_s'      // Dead-end facing south
  | 'terminus_w'      // Dead-end facing west
  | 'single';         // Isolated single track

/** Train carriage type */
export type CarriageType = 'locomotive' | 'passenger' | 'freight_box' | 'freight_tank' | 'freight_flat' | 'caboose';

/** Train type */
export type TrainType = 'passenger' | 'freight';

/** Individual train carriage */
export interface TrainCarriage {
  type: CarriageType;
  color: string;
  // Position along the train's path (0-1 within current tile segment)
  progress: number;
  // Current tile position
  tileX: number;
  tileY: number;
  // Direction of travel
  direction: CarDirection;
}

/** Complete train with multiple carriages */
export interface Train {
  id: number;
  type: TrainType;
  carriages: TrainCarriage[];
  // Lead locomotive position
  tileX: number;
  tileY: number;
  direction: CarDirection;
  progress: number;
  speed: number;
  // Path for the train
  path: { x: number; y: number }[];
  pathIndex: number;
  // Lifecycle
  age: number;
  maxAge: number;
  // Visual
  color: string;
}

// ============================================================================
// Constants
// ============================================================================

/** Rail track colors */
export const RAIL_COLORS = {
  BALLAST: '#9B8365',           // Track bed (gravel/ballast) - lighter for contrast
  BALLAST_DARK: '#7B6354',      // Darker ballast edges
  TIE: '#3a2718',               // Wooden rail ties (sleepers) - darker for contrast
  TIE_HIGHLIGHT: '#5d4a3a',     // Lighter tie surface
  RAIL: '#303030',              // Steel rail - darker for visibility
  RAIL_HIGHLIGHT: '#505050',    // Rail highlight
  RAIL_SHADOW: '#1a1a1a',       // Rail shadow
};

/** Locomotive colors (various liveries) */
export const LOCOMOTIVE_COLORS = [
  '#1e40af', // Blue
  '#dc2626', // Red
  '#059669', // Green
  '#7c3aed', // Purple
  '#ea580c', // Orange
  '#0891b2', // Cyan
];

/** Freight car colors */
export const FREIGHT_COLORS = [
  '#8B4513', // Brown
  '#696969', // Gray
  '#2F4F4F', // Dark slate
  '#8B0000', // Dark red
  '#006400', // Dark green
  '#4682B4', // Steel blue
];

/** Passenger car colors */
export const PASSENGER_COLORS = [
  '#C0C0C0', // Silver
  '#1e40af', // Blue
  '#059669', // Green
  '#7c3aed', // Purple
];

/** Track gauge (width between rails) as ratio of tile width */
export const TRACK_GAUGE_RATIO = 0.15;

/** Ballast width as ratio of tile width */
export const BALLAST_WIDTH_RATIO = 0.32;

/** Number of ties per tile */
export const TIES_PER_TILE = 6;

/** Train car dimensions */
export const TRAIN_CAR = {
  LOCOMOTIVE_LENGTH: 16,
  CAR_LENGTH: 14,
  CAR_WIDTH: 6,
  CAR_SPACING: 2, // Gap between cars
};

// ============================================================================
// Rail Analysis Functions
// ============================================================================

/**
 * Check if a tile is a rail track
 */
export function isRailTile(grid: Tile[][], gridSize: number, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= gridSize || y >= gridSize) return false;
  return grid[y][x].building.type === 'rail';
}

/**
 * Check if a tile is a rail station
 */
export function isRailStationTile(grid: Tile[][], gridSize: number, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= gridSize || y >= gridSize) return false;
  return grid[y][x].building.type === 'rail_station';
}

/**
 * Get adjacent rail connections for a tile
 */
export function getAdjacentRail(
  grid: Tile[][],
  gridSize: number,
  x: number,
  y: number
): RailConnection {
  return {
    north: isRailTile(grid, gridSize, x - 1, y) || isRailStationTile(grid, gridSize, x - 1, y),
    east: isRailTile(grid, gridSize, x, y - 1) || isRailStationTile(grid, gridSize, x, y - 1),
    south: isRailTile(grid, gridSize, x + 1, y) || isRailStationTile(grid, gridSize, x + 1, y),
    west: isRailTile(grid, gridSize, x, y + 1) || isRailStationTile(grid, gridSize, x, y + 1),
  };
}

/**
 * Determine track type based on connections
 */
export function getTrackType(connections: RailConnection): TrackType {
  const { north, east, south, west } = connections;
  const count = [north, east, south, west].filter(Boolean).length;

  // 4-way crossing
  if (count === 4) return 'junction_cross';

  // T-junctions (3 connections)
  if (count === 3) {
    if (!north) return 'junction_t_n';
    if (!east) return 'junction_t_e';
    if (!south) return 'junction_t_s';
    if (!west) return 'junction_t_w';
  }

  // Straight tracks (2 opposite connections)
  if (north && south && !east && !west) return 'straight_ns';
  if (east && west && !north && !south) return 'straight_ew';

  // Curves (2 adjacent connections)
  if (north && east && !south && !west) return 'curve_ne';
  if (north && west && !south && !east) return 'curve_nw';
  if (south && east && !north && !west) return 'curve_se';
  if (south && west && !north && !east) return 'curve_sw';

  // Dead ends (1 connection)
  if (count === 1) {
    if (north) return 'terminus_s';  // Track faces south (connects to north)
    if (east) return 'terminus_w';   // Track faces west (connects to east)
    if (south) return 'terminus_n';  // Track faces north (connects to south)
    if (west) return 'terminus_e';   // Track faces east (connects to west)
  }

  // Isolated or unconnected
  return 'single';
}

// ============================================================================
// Track Drawing Functions
// ============================================================================

// Isometric direction vectors (normalized)
// These are the two main axes in isometric projection
const ISO_NS_DIR = { x: 0.894427, y: 0.447214 };  // N-S direction (top-left to bottom-right)
const ISO_EW_DIR = { x: -0.894427, y: 0.447214 }; // E-W direction (top-right to bottom-left)

/**
 * Draw the ballast (gravel bed) foundation for tracks
 */
function drawBallast(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  trackType: TrackType,
  _zoom: number
): void {
  const w = TILE_WIDTH;
  const h = TILE_HEIGHT;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const ballastW = w * BALLAST_WIDTH_RATIO;

  // Calculate edge midpoints (where tracks meet tile edges)
  const northEdge = { x: x + w * 0.25, y: y + h * 0.25 };  // top-left edge midpoint
  const eastEdge = { x: x + w * 0.75, y: y + h * 0.25 };   // top-right edge midpoint
  const southEdge = { x: x + w * 0.75, y: y + h * 0.75 };  // bottom-right edge midpoint
  const westEdge = { x: x + w * 0.25, y: y + h * 0.75 };   // bottom-left edge midpoint

  // Diamond corners for curve control points
  const topCorner = { x: x + w / 2, y: y };
  const rightCorner = { x: x + w, y: y + h / 2 };
  const bottomCorner = { x: x + w / 2, y: y + h };
  const leftCorner = { x: x, y: y + h / 2 };

  ctx.fillStyle = RAIL_COLORS.BALLAST;
  const halfW = ballastW / 2;

  // Draw a straight ballast segment using isometric perpendiculars
  // For N-S tracks, perpendicular is E-W direction; for E-W tracks, perpendicular is N-S direction
  const drawStraightBallast = (
    from: { x: number; y: number },
    to: { x: number; y: number },
    perp: { x: number; y: number }  // Isometric perpendicular direction
  ) => {
    ctx.beginPath();
    ctx.moveTo(from.x + perp.x * halfW, from.y + perp.y * halfW);
    ctx.lineTo(to.x + perp.x * halfW, to.y + perp.y * halfW);
    ctx.lineTo(to.x - perp.x * halfW, to.y - perp.y * halfW);
    ctx.lineTo(from.x - perp.x * halfW, from.y - perp.y * halfW);
    ctx.closePath();
    ctx.fill();
  };

  // Draw center diamond for intersections/junctions
  const drawCenterBallast = () => {
    const size = ballastW * 0.7;
    ctx.beginPath();
    ctx.moveTo(cx, cy - size * 0.5);
    ctx.lineTo(cx + size, cy);
    ctx.lineTo(cx, cy + size * 0.5);
    ctx.lineTo(cx - size, cy);
    ctx.closePath();
    ctx.fill();
  };

  // Draw curved ballast using a filled arc shape
  const drawCurvedBallast = (
    from: { x: number; y: number },
    to: { x: number; y: number },
    control: { x: number; y: number },
    fromPerp: { x: number; y: number },
    toPerp: { x: number; y: number }
  ) => {
    // Average perpendicular at the curve apex
    const midPerp = {
      x: (fromPerp.x + toPerp.x) / 2,
      y: (fromPerp.y + toPerp.y) / 2
    };
    const midLen = Math.hypot(midPerp.x, midPerp.y);
    const normMidPerp = { x: midPerp.x / midLen, y: midPerp.y / midLen };

    ctx.beginPath();
    // Outer edge
    ctx.moveTo(from.x + fromPerp.x * halfW, from.y + fromPerp.y * halfW);
    ctx.quadraticCurveTo(
      control.x + normMidPerp.x * halfW, control.y + normMidPerp.y * halfW,
      to.x + toPerp.x * halfW, to.y + toPerp.y * halfW
    );
    // Inner edge (reverse)
    ctx.lineTo(to.x - toPerp.x * halfW, to.y - toPerp.y * halfW);
    ctx.quadraticCurveTo(
      control.x - normMidPerp.x * halfW, control.y - normMidPerp.y * halfW,
      from.x - fromPerp.x * halfW, from.y - fromPerp.y * halfW
    );
    ctx.closePath();
    ctx.fill();
  };

  // Draw ballast based on track type
  // N-S tracks use E-W perpendicular, E-W tracks use N-S perpendicular
  switch (trackType) {
    case 'straight_ns':
      // N-S track: perpendicular is E-W direction
      drawStraightBallast(northEdge, southEdge, ISO_EW_DIR);
      break;
    case 'straight_ew':
      // E-W track: perpendicular is N-S direction
      drawStraightBallast(eastEdge, westEdge, ISO_NS_DIR);
      break;
    case 'curve_ne':
      // Curve from N to E: uses top corner as control
      drawCurvedBallast(northEdge, eastEdge, topCorner, ISO_EW_DIR, ISO_NS_DIR);
      break;
    case 'curve_nw':
      // Curve from N to W: uses left corner as control
      drawCurvedBallast(northEdge, westEdge, leftCorner, ISO_EW_DIR, ISO_NS_DIR);
      break;
    case 'curve_se':
      // Curve from S to E: uses right corner as control
      drawCurvedBallast(southEdge, eastEdge, rightCorner, ISO_EW_DIR, ISO_NS_DIR);
      break;
    case 'curve_sw':
      // Curve from S to W: uses bottom corner as control
      drawCurvedBallast(southEdge, westEdge, bottomCorner, ISO_EW_DIR, ISO_NS_DIR);
      break;
    case 'junction_t_n':
      // T-junction missing north: E-W through + spur to south
      drawStraightBallast(eastEdge, westEdge, ISO_NS_DIR);
      drawStraightBallast({ x: cx, y: cy }, southEdge, ISO_EW_DIR);
      drawCenterBallast();
      break;
    case 'junction_t_e':
      // T-junction missing east: N-S through + spur to west
      drawStraightBallast(northEdge, southEdge, ISO_EW_DIR);
      drawStraightBallast({ x: cx, y: cy }, westEdge, ISO_NS_DIR);
      drawCenterBallast();
      break;
    case 'junction_t_s':
      // T-junction missing south: E-W through + spur to north
      drawStraightBallast(eastEdge, westEdge, ISO_NS_DIR);
      drawStraightBallast({ x: cx, y: cy }, northEdge, ISO_EW_DIR);
      drawCenterBallast();
      break;
    case 'junction_t_w':
      // T-junction missing west: N-S through + spur to east
      drawStraightBallast(northEdge, southEdge, ISO_EW_DIR);
      drawStraightBallast({ x: cx, y: cy }, eastEdge, ISO_NS_DIR);
      drawCenterBallast();
      break;
    case 'junction_cross':
      // 4-way crossing
      drawStraightBallast(northEdge, southEdge, ISO_EW_DIR);
      drawStraightBallast(eastEdge, westEdge, ISO_NS_DIR);
      drawCenterBallast();
      break;
    case 'terminus_n':
      // Dead end facing north (track from south)
      drawStraightBallast({ x: cx, y: cy }, southEdge, ISO_EW_DIR);
      drawCenterBallast();
      break;
    case 'terminus_e':
      // Dead end facing east (track from west)
      drawStraightBallast({ x: cx, y: cy }, westEdge, ISO_NS_DIR);
      drawCenterBallast();
      break;
    case 'terminus_s':
      // Dead end facing south (track from north)
      drawStraightBallast({ x: cx, y: cy }, northEdge, ISO_EW_DIR);
      drawCenterBallast();
      break;
    case 'terminus_w':
      // Dead end facing west (track from east)
      drawStraightBallast({ x: cx, y: cy }, eastEdge, ISO_NS_DIR);
      drawCenterBallast();
      break;
    case 'single':
      // Isolated track - just draw center diamond
      drawCenterBallast();
      break;
  }
}

/**
 * Draw rail ties (sleepers) perpendicular to track direction
 * Ties run perpendicular to the track in isometric space
 */
function drawTies(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  trackType: TrackType,
  zoom: number
): void {
  if (zoom < 0.5) return; // Skip ties at low zoom for performance

  const w = TILE_WIDTH;
  const h = TILE_HEIGHT;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const tieWidth = w * 0.035;
  const tieLength = w * BALLAST_WIDTH_RATIO * 0.8;

  // Calculate edge midpoints
  const northEdge = { x: x + w * 0.25, y: y + h * 0.25 };
  const eastEdge = { x: x + w * 0.75, y: y + h * 0.25 };
  const southEdge = { x: x + w * 0.75, y: y + h * 0.75 };
  const westEdge = { x: x + w * 0.25, y: y + h * 0.75 };
  const center = { x: cx, y: cy };

  // Diamond corners for curve control points
  const topCorner = { x: x + w / 2, y: y };
  const rightCorner = { x: x + w, y: y + h / 2 };
  const bottomCorner = { x: x + w / 2, y: y + h };
  const leftCorner = { x: x, y: y + h / 2 };

  ctx.fillStyle = RAIL_COLORS.TIE;

  // Draw a single tie at a position, oriented along the given isometric direction
  const drawTie = (tieX: number, tieY: number, isoDir: { x: number; y: number }) => {
    const halfLen = tieLength / 2;
    const halfWidth = tieWidth / 2;
    // Tie runs along isoDir, with thickness perpendicular to it
    // In isometric, perpendicular to ISO_NS is ISO_EW and vice versa
    const perpDir = isoDir === ISO_NS_DIR ? ISO_EW_DIR : ISO_NS_DIR;
    
    ctx.beginPath();
    ctx.moveTo(
      tieX + isoDir.x * halfLen + perpDir.x * halfWidth,
      tieY + isoDir.y * halfLen + perpDir.y * halfWidth
    );
    ctx.lineTo(
      tieX + isoDir.x * halfLen - perpDir.x * halfWidth,
      tieY + isoDir.y * halfLen - perpDir.y * halfWidth
    );
    ctx.lineTo(
      tieX - isoDir.x * halfLen - perpDir.x * halfWidth,
      tieY - isoDir.y * halfLen - perpDir.y * halfWidth
    );
    ctx.lineTo(
      tieX - isoDir.x * halfLen + perpDir.x * halfWidth,
      tieY - isoDir.y * halfLen + perpDir.y * halfWidth
    );
    ctx.closePath();
    ctx.fill();
  };

  // Draw ties along a straight segment
  // tieDir is the isometric direction the ties should run (perpendicular to track)
  const drawTiesAlongSegment = (
    from: { x: number; y: number },
    to: { x: number; y: number },
    tieDir: { x: number; y: number },
    numTies: number
  ) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    
    for (let i = 0; i < numTies; i++) {
      const t = (i + 0.5) / numTies;
      const tieX = from.x + dx * t;
      const tieY = from.y + dy * t;
      drawTie(tieX, tieY, tieDir);
    }
  };

  // Draw ties along a curve (ties smoothly rotate from one isometric direction to another)
  const drawTiesAlongCurve = (
    from: { x: number; y: number },
    to: { x: number; y: number },
    control: { x: number; y: number },
    fromTieDir: { x: number; y: number },
    toTieDir: { x: number; y: number },
    numTies: number
  ) => {
    for (let i = 0; i < numTies; i++) {
      const t = (i + 0.5) / numTies;
      const u = 1 - t;
      
      // Position on bezier curve
      const tieX = u * u * from.x + 2 * u * t * control.x + t * t * to.x;
      const tieY = u * u * from.y + 2 * u * t * control.y + t * t * to.y;
      
      // Interpolate tie direction
      const interpDir = {
        x: fromTieDir.x * u + toTieDir.x * t,
        y: fromTieDir.y * u + toTieDir.y * t
      };
      const interpLen = Math.hypot(interpDir.x, interpDir.y);
      const normDir = { x: interpDir.x / interpLen, y: interpDir.y / interpLen };
      
      // Draw tie with interpolated direction
      const halfLen = tieLength / 2;
      const halfWidth = tieWidth / 2;
      const perpDir = { x: -normDir.y, y: normDir.x }; // Screen perpendicular for thickness
      
      ctx.beginPath();
      ctx.moveTo(
        tieX + normDir.x * halfLen + perpDir.x * halfWidth,
        tieY + normDir.y * halfLen + perpDir.y * halfWidth
      );
      ctx.lineTo(
        tieX + normDir.x * halfLen - perpDir.x * halfWidth,
        tieY + normDir.y * halfLen - perpDir.y * halfWidth
      );
      ctx.lineTo(
        tieX - normDir.x * halfLen - perpDir.x * halfWidth,
        tieY - normDir.y * halfLen - perpDir.y * halfWidth
      );
      ctx.lineTo(
        tieX - normDir.x * halfLen + perpDir.x * halfWidth,
        tieY - normDir.y * halfLen + perpDir.y * halfWidth
      );
      ctx.closePath();
      ctx.fill();
    }
  };

  // Draw ties based on track type
  const tiesHalf = Math.ceil(TIES_PER_TILE / 2);

  switch (trackType) {
    case 'straight_ns':
      // N-S track: ties run E-W
      drawTiesAlongSegment(northEdge, southEdge, ISO_EW_DIR, TIES_PER_TILE);
      break;
    case 'straight_ew':
      // E-W track: ties run N-S
      drawTiesAlongSegment(eastEdge, westEdge, ISO_NS_DIR, TIES_PER_TILE);
      break;
    case 'curve_ne':
      drawTiesAlongCurve(northEdge, eastEdge, topCorner, ISO_EW_DIR, ISO_NS_DIR, TIES_PER_TILE);
      break;
    case 'curve_nw':
      drawTiesAlongCurve(northEdge, westEdge, leftCorner, ISO_EW_DIR, ISO_NS_DIR, TIES_PER_TILE);
      break;
    case 'curve_se':
      drawTiesAlongCurve(southEdge, eastEdge, rightCorner, ISO_EW_DIR, ISO_NS_DIR, TIES_PER_TILE);
      break;
    case 'curve_sw':
      drawTiesAlongCurve(southEdge, westEdge, bottomCorner, ISO_EW_DIR, ISO_NS_DIR, TIES_PER_TILE);
      break;
    case 'junction_t_n':
      drawTiesAlongSegment(eastEdge, westEdge, ISO_NS_DIR, TIES_PER_TILE);
      drawTiesAlongSegment(center, southEdge, ISO_EW_DIR, tiesHalf);
      break;
    case 'junction_t_e':
      drawTiesAlongSegment(northEdge, southEdge, ISO_EW_DIR, TIES_PER_TILE);
      drawTiesAlongSegment(center, westEdge, ISO_NS_DIR, tiesHalf);
      break;
    case 'junction_t_s':
      drawTiesAlongSegment(eastEdge, westEdge, ISO_NS_DIR, TIES_PER_TILE);
      drawTiesAlongSegment(center, northEdge, ISO_EW_DIR, tiesHalf);
      break;
    case 'junction_t_w':
      drawTiesAlongSegment(northEdge, southEdge, ISO_EW_DIR, TIES_PER_TILE);
      drawTiesAlongSegment(center, eastEdge, ISO_NS_DIR, tiesHalf);
      break;
    case 'junction_cross':
      drawTiesAlongSegment(northEdge, southEdge, ISO_EW_DIR, TIES_PER_TILE);
      drawTiesAlongSegment(eastEdge, westEdge, ISO_NS_DIR, TIES_PER_TILE);
      break;
    case 'terminus_n':
      drawTiesAlongSegment(center, southEdge, ISO_EW_DIR, tiesHalf);
      break;
    case 'terminus_e':
      drawTiesAlongSegment(center, westEdge, ISO_NS_DIR, tiesHalf);
      break;
    case 'terminus_s':
      drawTiesAlongSegment(center, northEdge, ISO_EW_DIR, tiesHalf);
      break;
    case 'terminus_w':
      drawTiesAlongSegment(center, eastEdge, ISO_NS_DIR, tiesHalf);
      break;
  }
}

/**
 * Draw the two parallel steel rails
 */
function drawRails(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  trackType: TrackType,
  zoom: number
): void {
  const w = TILE_WIDTH;
  const h = TILE_HEIGHT;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const railGauge = w * TRACK_GAUGE_RATIO;
  const railWidth = zoom >= 0.7 ? 2.5 : 2;

  // Calculate edge midpoints
  const northEdge = { x: x + w * 0.25, y: y + h * 0.25 };
  const eastEdge = { x: x + w * 0.75, y: y + h * 0.25 };
  const southEdge = { x: x + w * 0.75, y: y + h * 0.75 };
  const westEdge = { x: x + w * 0.25, y: y + h * 0.75 };
  const center = { x: cx, y: cy };

  // Diamond corners for curve control points
  const topCorner = { x: x + w / 2, y: y };
  const rightCorner = { x: x + w, y: y + h / 2 };
  const bottomCorner = { x: x + w / 2, y: y + h };
  const leftCorner = { x: x, y: y + h / 2 };

  const halfGauge = railGauge / 2;

  // Draw two parallel rails along a straight segment using isometric perpendicular
  const drawStraightRailPair = (
    from: { x: number; y: number },
    to: { x: number; y: number },
    perp: { x: number; y: number }  // Isometric perpendicular direction
  ) => {
    // Draw shadow rails first
    ctx.strokeStyle = RAIL_COLORS.RAIL_SHADOW;
    ctx.lineWidth = railWidth + 0.5;
    ctx.lineCap = 'round';

    // Left rail shadow
    ctx.beginPath();
    ctx.moveTo(from.x + perp.x * halfGauge + 0.5, from.y + perp.y * halfGauge + 0.5);
    ctx.lineTo(to.x + perp.x * halfGauge + 0.5, to.y + perp.y * halfGauge + 0.5);
    ctx.stroke();

    // Right rail shadow
    ctx.beginPath();
    ctx.moveTo(from.x - perp.x * halfGauge + 0.5, from.y - perp.y * halfGauge + 0.5);
    ctx.lineTo(to.x - perp.x * halfGauge + 0.5, to.y - perp.y * halfGauge + 0.5);
    ctx.stroke();

    // Main rails
    ctx.strokeStyle = RAIL_COLORS.RAIL;
    ctx.lineWidth = railWidth;

    // Left rail
    ctx.beginPath();
    ctx.moveTo(from.x + perp.x * halfGauge, from.y + perp.y * halfGauge);
    ctx.lineTo(to.x + perp.x * halfGauge, to.y + perp.y * halfGauge);
    ctx.stroke();

    // Right rail
    ctx.beginPath();
    ctx.moveTo(from.x - perp.x * halfGauge, from.y - perp.y * halfGauge);
    ctx.lineTo(to.x - perp.x * halfGauge, to.y - perp.y * halfGauge);
    ctx.stroke();

    // Rail highlights (for zoom > 0.8)
    if (zoom >= 0.8) {
      ctx.strokeStyle = RAIL_COLORS.RAIL_HIGHLIGHT;
      ctx.lineWidth = 0.5;

      ctx.beginPath();
      ctx.moveTo(from.x + perp.x * halfGauge - 0.3, from.y + perp.y * halfGauge - 0.3);
      ctx.lineTo(to.x + perp.x * halfGauge - 0.3, to.y + perp.y * halfGauge - 0.3);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(from.x - perp.x * halfGauge - 0.3, from.y - perp.y * halfGauge - 0.3);
      ctx.lineTo(to.x - perp.x * halfGauge - 0.3, to.y - perp.y * halfGauge - 0.3);
      ctx.stroke();
    }
  };

  // Draw curved rails using quadratic bezier curves with isometric perpendiculars
  const drawCurvedRailPair = (
    from: { x: number; y: number },
    to: { x: number; y: number },
    control: { x: number; y: number },
    fromPerp: { x: number; y: number },
    toPerp: { x: number; y: number }
  ) => {
    // Average perpendicular for control point
    const midPerp = {
      x: (fromPerp.x + toPerp.x) / 2,
      y: (fromPerp.y + toPerp.y) / 2
    };
    const midLen = Math.hypot(midPerp.x, midPerp.y);
    const ctrlPerp = { x: midPerp.x / midLen, y: midPerp.y / midLen };

    // Draw shadow rails
    ctx.strokeStyle = RAIL_COLORS.RAIL_SHADOW;
    ctx.lineWidth = railWidth + 0.5;
    ctx.lineCap = 'round';

    // Left rail shadow (outer)
    ctx.beginPath();
    ctx.moveTo(from.x + fromPerp.x * halfGauge + 0.5, from.y + fromPerp.y * halfGauge + 0.5);
    ctx.quadraticCurveTo(
      control.x + ctrlPerp.x * halfGauge + 0.5, control.y + ctrlPerp.y * halfGauge + 0.5,
      to.x + toPerp.x * halfGauge + 0.5, to.y + toPerp.y * halfGauge + 0.5
    );
    ctx.stroke();

    // Right rail shadow (inner)
    ctx.beginPath();
    ctx.moveTo(from.x - fromPerp.x * halfGauge + 0.5, from.y - fromPerp.y * halfGauge + 0.5);
    ctx.quadraticCurveTo(
      control.x - ctrlPerp.x * halfGauge + 0.5, control.y - ctrlPerp.y * halfGauge + 0.5,
      to.x - toPerp.x * halfGauge + 0.5, to.y - toPerp.y * halfGauge + 0.5
    );
    ctx.stroke();

    // Main rails
    ctx.strokeStyle = RAIL_COLORS.RAIL;
    ctx.lineWidth = railWidth;

    // Left rail (outer)
    ctx.beginPath();
    ctx.moveTo(from.x + fromPerp.x * halfGauge, from.y + fromPerp.y * halfGauge);
    ctx.quadraticCurveTo(
      control.x + ctrlPerp.x * halfGauge, control.y + ctrlPerp.y * halfGauge,
      to.x + toPerp.x * halfGauge, to.y + toPerp.y * halfGauge
    );
    ctx.stroke();

    // Right rail (inner)
    ctx.beginPath();
    ctx.moveTo(from.x - fromPerp.x * halfGauge, from.y - fromPerp.y * halfGauge);
    ctx.quadraticCurveTo(
      control.x - ctrlPerp.x * halfGauge, control.y - ctrlPerp.y * halfGauge,
      to.x - toPerp.x * halfGauge, to.y - toPerp.y * halfGauge
    );
    ctx.stroke();

    // Rail highlights (for zoom > 0.8)
    if (zoom >= 0.8) {
      ctx.strokeStyle = RAIL_COLORS.RAIL_HIGHLIGHT;
      ctx.lineWidth = 0.5;

      ctx.beginPath();
      ctx.moveTo(from.x + fromPerp.x * halfGauge - 0.3, from.y + fromPerp.y * halfGauge - 0.3);
      ctx.quadraticCurveTo(
        control.x + ctrlPerp.x * halfGauge - 0.3, control.y + ctrlPerp.y * halfGauge - 0.3,
        to.x + toPerp.x * halfGauge - 0.3, to.y + toPerp.y * halfGauge - 0.3
      );
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(from.x - fromPerp.x * halfGauge - 0.3, from.y - fromPerp.y * halfGauge - 0.3);
      ctx.quadraticCurveTo(
        control.x - ctrlPerp.x * halfGauge - 0.3, control.y - ctrlPerp.y * halfGauge - 0.3,
        to.x - toPerp.x * halfGauge - 0.3, to.y - toPerp.y * halfGauge - 0.3
      );
      ctx.stroke();
    }
  };

  // Draw rails based on track type
  // N-S tracks use E-W perpendicular, E-W tracks use N-S perpendicular
  switch (trackType) {
    case 'straight_ns':
      drawStraightRailPair(northEdge, southEdge, ISO_EW_DIR);
      break;
    case 'straight_ew':
      drawStraightRailPair(eastEdge, westEdge, ISO_NS_DIR);
      break;
    case 'curve_ne':
      drawCurvedRailPair(northEdge, eastEdge, topCorner, ISO_EW_DIR, ISO_NS_DIR);
      break;
    case 'curve_nw':
      drawCurvedRailPair(northEdge, westEdge, leftCorner, ISO_EW_DIR, ISO_NS_DIR);
      break;
    case 'curve_se':
      drawCurvedRailPair(southEdge, eastEdge, rightCorner, ISO_EW_DIR, ISO_NS_DIR);
      break;
    case 'curve_sw':
      drawCurvedRailPair(southEdge, westEdge, bottomCorner, ISO_EW_DIR, ISO_NS_DIR);
      break;
    case 'junction_t_n':
      drawStraightRailPair(eastEdge, westEdge, ISO_NS_DIR);
      drawStraightRailPair(center, southEdge, ISO_EW_DIR);
      break;
    case 'junction_t_e':
      drawStraightRailPair(northEdge, southEdge, ISO_EW_DIR);
      drawStraightRailPair(center, westEdge, ISO_NS_DIR);
      break;
    case 'junction_t_s':
      drawStraightRailPair(eastEdge, westEdge, ISO_NS_DIR);
      drawStraightRailPair(center, northEdge, ISO_EW_DIR);
      break;
    case 'junction_t_w':
      drawStraightRailPair(northEdge, southEdge, ISO_EW_DIR);
      drawStraightRailPair(center, eastEdge, ISO_NS_DIR);
      break;
    case 'junction_cross':
      drawStraightRailPair(northEdge, southEdge, ISO_EW_DIR);
      drawStraightRailPair(eastEdge, westEdge, ISO_NS_DIR);
      break;
    case 'terminus_n':
      drawStraightRailPair(center, southEdge, ISO_EW_DIR);
      drawBufferStop(ctx, cx, cy, 'north', zoom);
      break;
    case 'terminus_e':
      drawStraightRailPair(center, westEdge, ISO_NS_DIR);
      drawBufferStop(ctx, cx, cy, 'east', zoom);
      break;
    case 'terminus_s':
      drawStraightRailPair(center, northEdge, ISO_EW_DIR);
      drawBufferStop(ctx, cx, cy, 'south', zoom);
      break;
    case 'terminus_w':
      drawStraightRailPair(center, eastEdge, ISO_NS_DIR);
      drawBufferStop(ctx, cx, cy, 'west', zoom);
      break;
    case 'single':
      // Just draw a small cross in the center for isolated track
      const stubLen = w * 0.1;
      drawStraightRailPair(
        { x: cx - ISO_NS_DIR.x * stubLen, y: cy - ISO_NS_DIR.y * stubLen },
        { x: cx + ISO_NS_DIR.x * stubLen, y: cy + ISO_NS_DIR.y * stubLen },
        ISO_EW_DIR
      );
      break;
  }
}

/**
 * Draw a buffer stop at track terminus
 */
function drawBufferStop(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  facing: 'north' | 'east' | 'south' | 'west',
  zoom: number
): void {
  if (zoom < 0.6) return;

  const size = 4;
  const offset = 2;

  ctx.save();
  ctx.translate(x, y);

  // Rotate based on facing direction
  const rotations = {
    north: -Math.PI * 0.75,
    east: -Math.PI * 0.25,
    south: Math.PI * 0.25,
    west: Math.PI * 0.75,
  };
  ctx.rotate(rotations[facing]);

  // Draw buffer stop (red/white striped)
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(-size - offset, -size / 2, size, size);
  
  // White stripe
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-size - offset, -size / 4, size, size / 2);

  ctx.restore();
}

// ============================================================================
// Main Track Drawing Function
// ============================================================================

/**
 * Draw complete rail track at a tile position
 * This should be called AFTER the base tile is drawn
 */
export function drawRailTrack(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  gridX: number,
  gridY: number,
  grid: Tile[][],
  gridSize: number,
  zoom: number
): void {
  // Get adjacent rail connections
  const connections = getAdjacentRail(grid, gridSize, gridX, gridY);
  
  // Determine track type
  const trackType = getTrackType(connections);

  // Draw layers in order: ballast (bottom), ties, rails (top)
  drawBallast(ctx, x, y, trackType, zoom);
  drawTies(ctx, x, y, trackType, zoom);
  drawRails(ctx, x, y, trackType, zoom);
}

// ============================================================================
// Train Pathfinding Functions
// ============================================================================

/**
 * Get available direction options from a rail tile
 */
export function getRailDirectionOptions(
  grid: Tile[][],
  gridSize: number,
  x: number,
  y: number
): CarDirection[] {
  const options: CarDirection[] = [];
  if (isRailTile(grid, gridSize, x - 1, y) || isRailStationTile(grid, gridSize, x - 1, y)) options.push('north');
  if (isRailTile(grid, gridSize, x, y - 1) || isRailStationTile(grid, gridSize, x, y - 1)) options.push('east');
  if (isRailTile(grid, gridSize, x + 1, y) || isRailStationTile(grid, gridSize, x + 1, y)) options.push('south');
  if (isRailTile(grid, gridSize, x, y + 1) || isRailStationTile(grid, gridSize, x, y + 1)) options.push('west');
  return options;
}

/**
 * Find all rail stations in the grid
 */
export function findRailStations(
  grid: Tile[][],
  gridSize: number
): { x: number; y: number }[] {
  const stations: { x: number; y: number }[] = [];
  
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      if (grid[y][x].building.type === 'rail_station') {
        stations.push({ x, y });
      }
    }
  }
  
  return stations;
}

/**
 * Count rail tiles in the grid
 */
export function countRailTiles(
  grid: Tile[][],
  gridSize: number
): number {
  let count = 0;
  
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      if (grid[y][x].building.type === 'rail') {
        count++;
      }
    }
  }
  
  return count;
}

/**
 * Find path on rail network between two points
 */
export function findPathOnRails(
  grid: Tile[][],
  gridSize: number,
  startX: number,
  startY: number,
  endX: number,
  endY: number
): { x: number; y: number }[] | null {
  // BFS pathfinding on rail network
  const queue: { x: number; y: number; path: { x: number; y: number }[] }[] = [
    { x: startX, y: startY, path: [{ x: startX, y: startY }] }
  ];
  const visited = new Set<string>();
  visited.add(`${startX},${startY}`);

  const directions = [
    { dx: -1, dy: 0 },  // north
    { dx: 0, dy: -1 },  // east
    { dx: 1, dy: 0 },   // south
    { dx: 0, dy: 1 },   // west
  ];

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current.x === endX && current.y === endY) {
      return current.path;
    }

    for (const { dx, dy } of directions) {
      const nx = current.x + dx;
      const ny = current.y + dy;
      const key = `${nx},${ny}`;

      if (nx < 0 || ny < 0 || nx >= gridSize || ny >= gridSize) continue;
      if (visited.has(key)) continue;
      if (!isRailTile(grid, gridSize, nx, ny) && !isRailStationTile(grid, gridSize, nx, ny)) continue;

      visited.add(key);
      queue.push({
        x: nx,
        y: ny,
        path: [...current.path, { x: nx, y: ny }],
      });
    }
  }

  return null;
}
