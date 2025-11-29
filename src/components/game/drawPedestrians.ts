/**
 * Pedestrian drawing utilities
 * Renders pedestrians with dynamic activities and states
 * OPTIMIZED for performance with LOD (Level of Detail)
 */

import { Tile } from '@/types/game';
import { Pedestrian, PedestrianActivity, TILE_WIDTH, TILE_HEIGHT } from './types';
import { DIRECTION_META } from './constants';
import { gridToScreen } from './utils';
import { isEntityBehindBuilding } from './renderHelpers';
import { getPedestrianOpacity, getVisiblePedestrians } from './pedestrianSystem';

// LOD thresholds - draw simpler at lower zoom
const LOD_SIMPLE_ZOOM = 0.55;  // Below this, draw very simple pedestrians (just above min zoom)
const LOD_MEDIUM_ZOOM = 0.75;  // Below this, skip some details

/**
 * Draw pedestrians with dynamic activities and states
 * Uses LOD (Level of Detail) for performance
 */
export function drawPedestrians(
  ctx: CanvasRenderingContext2D,
  pedestrians: Pedestrian[],
  grid: Tile[][],
  gridSize: number,
  viewBounds: { viewLeft: number; viewTop: number; viewRight: number; viewBottom: number },
  zoom: number = 1.0
): void {
  // Get only visible pedestrians (not inside buildings)
  const visiblePedestrians = getVisiblePedestrians(pedestrians);
  if (visiblePedestrians.length === 0) return;

  // Determine LOD level based on zoom
  const useSimpleLOD = zoom < LOD_SIMPLE_ZOOM;
  const useMediumLOD = zoom < LOD_MEDIUM_ZOOM;

  // Pre-set common styles to reduce state changes
  ctx.lineCap = 'round';

  for (let i = 0; i < visiblePedestrians.length; i++) {
    const ped = visiblePedestrians[i];
    // Calculate position based on state
    let pedX: number;
    let pedY: number;
    
    if (ped.state === 'at_recreation') {
      // At recreation area - position at destination with offset
      const { screenX, screenY } = gridToScreen(ped.destX, ped.destY, 0, 0);
      pedX = screenX + TILE_WIDTH / 2 + ped.activityOffsetX;
      pedY = screenY + TILE_HEIGHT / 2 + ped.activityOffsetY;
    } else if (ped.state === 'entering_building' || ped.state === 'exiting_building') {
      // Near building entrance
      const { screenX, screenY } = gridToScreen(ped.destX, ped.destY, 0, 0);
      pedX = screenX + TILE_WIDTH / 2;
      pedY = screenY + TILE_HEIGHT / 2;
    } else if (ped.state === 'socializing' || ped.state === 'idle') {
      // Standing still at current position
      const { screenX, screenY } = gridToScreen(ped.tileX, ped.tileY, 0, 0);
      const centerX = screenX + TILE_WIDTH / 2;
      const centerY = screenY + TILE_HEIGHT / 2;
      const meta = DIRECTION_META[ped.direction];
      const sidewalkOffset = ped.sidewalkSide === 'left' ? -12 : 12;
      pedX = centerX + meta.vec.dx * ped.progress + meta.normal.nx * sidewalkOffset;
      pedY = centerY + meta.vec.dy * ped.progress + meta.normal.ny * sidewalkOffset;
    } else {
      // Walking - normal position calculation
      const { screenX, screenY } = gridToScreen(ped.tileX, ped.tileY, 0, 0);
      const centerX = screenX + TILE_WIDTH / 2;
      const centerY = screenY + TILE_HEIGHT / 2;
      const meta = DIRECTION_META[ped.direction];
      const sidewalkOffset = ped.sidewalkSide === 'left' ? -12 : 12;
      pedX = centerX + meta.vec.dx * ped.progress + meta.normal.nx * sidewalkOffset;
      pedY = centerY + meta.vec.dy * ped.progress + meta.normal.ny * sidewalkOffset;
    }

    // Viewport culling
    if (
      pedX < viewBounds.viewLeft - 20 ||
      pedX > viewBounds.viewRight + 20 ||
      pedY < viewBounds.viewTop - 30 ||
      pedY > viewBounds.viewBottom + 30
    ) {
      continue;
    }

    // Check if behind building (for walking pedestrians only, skip for performance at low zoom)
    if (!useSimpleLOD && ped.state === 'walking' && isEntityBehindBuilding(grid, gridSize, ped.tileX, ped.tileY)) {
      continue;
    }

    // Get opacity for enter/exit animations
    const opacity = getPedestrianOpacity(ped);
    if (opacity <= 0) continue;

    ctx.save();
    ctx.translate(pedX, pedY);
    if (opacity < 1) ctx.globalAlpha = opacity;

    // OPTIMIZED: Use simple LOD for zoomed out view
    if (useSimpleLOD) {
      drawSimplePedestrian(ctx, ped);
      ctx.restore();
      continue;
    }

    // Draw based on current activity/state
    // OPTIMIZED: Use medium detail for most activities when zoomed out
    if (useMediumLOD) {
      if (ped.state === 'at_recreation') {
        drawMediumActivityPedestrian(ctx, ped);
      } else {
        drawMediumWalkingPedestrian(ctx, ped);
      }
      ctx.restore();
      continue;
    }

    // Full detail drawing
    switch (ped.activity) {
      case 'playing_basketball':
        drawBasketballPlayer(ctx, ped);
        break;
      case 'playing_tennis':
        drawTennisPlayer(ctx, ped);
        break;
      case 'playing_soccer':
        drawSoccerPlayer(ctx, ped);
        break;
      case 'playing_baseball':
        drawBaseballPlayer(ctx, ped);
        break;
      case 'swimming':
        drawSwimmer(ctx, ped);
        break;
      case 'skateboarding':
        drawSkateboarder(ctx, ped);
        break;
      case 'sitting_bench':
        drawSittingPerson(ctx, ped);
        break;
      case 'picnicking':
        drawPicnicker(ctx, ped);
        break;
      case 'jogging':
        drawJogger(ctx, ped);
        break;
      case 'walking_dog':
        drawDogWalker(ctx, ped);
        break;
      case 'playground':
        drawPlaygroundKid(ctx, ped);
        break;
      case 'watching_game':
        drawSpectator(ctx, ped);
        break;
      default:
        // Default walking/standing pedestrian
        if (ped.state === 'socializing') {
          drawSocializingPerson(ctx, ped);
        } else if (ped.state === 'idle') {
          drawIdlePerson(ctx, ped);
        } else {
          drawWalkingPedestrian(ctx, ped);
        }
    }

    ctx.restore();
  }
}

/**
 * Draw a very simple pedestrian (lowest LOD) - just colored dots
 */
function drawSimplePedestrian(ctx: CanvasRenderingContext2D, ped: Pedestrian): void {
  // Just draw a small colored circle for the body
  ctx.fillStyle = ped.shirtColor;
  ctx.beginPath();
  ctx.arc(0, -2, 2.5, 0, Math.PI * 2);
  ctx.fill();
  
  // Head as tiny dot
  ctx.fillStyle = ped.skinColor;
  ctx.beginPath();
  ctx.arc(0, -5, 1.5, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Draw medium detail walking pedestrian
 */
function drawMediumWalkingPedestrian(ctx: CanvasRenderingContext2D, ped: Pedestrian): void {
  const walkBob = Math.sin(ped.walkOffset) * 0.5;
  const scale = 0.35;

  // Head
  ctx.fillStyle = ped.skinColor;
  ctx.beginPath();
  ctx.arc(0, (-12 + walkBob) * scale, 3 * scale, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.fillStyle = ped.shirtColor;
  ctx.beginPath();
  ctx.ellipse(0, (-5 + walkBob) * scale, 2.5 * scale, 4 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  // Simple legs (single stroke)
  ctx.strokeStyle = ped.pantsColor;
  ctx.lineWidth = 1.5 * scale;
  const legSwing = Math.sin(ped.walkOffset) * 2;
  ctx.beginPath();
  ctx.moveTo(0, (-1 + walkBob) * scale);
  ctx.lineTo(legSwing * scale, 5 * scale);
  ctx.moveTo(0, (-1 + walkBob) * scale);
  ctx.lineTo(-legSwing * scale, 5 * scale);
  ctx.stroke();
}

/**
 * Draw medium detail activity pedestrian
 */
function drawMediumActivityPedestrian(ctx: CanvasRenderingContext2D, ped: Pedestrian): void {
  const scale = 0.35;
  const anim = Math.sin(ped.activityAnimTimer);

  // Head
  ctx.fillStyle = ped.skinColor;
  ctx.beginPath();
  ctx.arc(0, -12 * scale, 3 * scale, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.fillStyle = ped.shirtColor;
  ctx.beginPath();
  ctx.ellipse(anim * scale, -5 * scale, 2.5 * scale, 4 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  // Simple legs
  ctx.strokeStyle = ped.pantsColor;
  ctx.lineWidth = 1.5 * scale;
  ctx.beginPath();
  ctx.moveTo(-1 * scale, -1 * scale);
  ctx.lineTo(-1.5 * scale, 5 * scale);
  ctx.moveTo(1 * scale, -1 * scale);
  ctx.lineTo(1.5 * scale, 5 * scale);
  ctx.stroke();

  // Activity indicator (colored dot for ball, etc.)
  if (ped.hasBall) {
    ctx.fillStyle = '#ff6b35';
    ctx.beginPath();
    ctx.arc(4 * scale, 2 * scale, 1.5 * scale, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Draw a standard walking pedestrian - OPTIMIZED
 */
function drawWalkingPedestrian(ctx: CanvasRenderingContext2D, ped: Pedestrian): void {
  const walkBob = Math.sin(ped.walkOffset) * 0.8;
  const walkSway = Math.sin(ped.walkOffset * 0.5) * 0.5;
  const scale = 0.35;
  const legSwing = Math.sin(ped.walkOffset) * 3;

  // Draw head and body first (filled shapes)
  ctx.fillStyle = ped.skinColor;
  ctx.beginPath();
  ctx.arc(walkSway * scale, (-12 + walkBob) * scale, 3 * scale, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = ped.shirtColor;
  ctx.beginPath();
  ctx.ellipse(walkSway * scale, (-5 + walkBob) * scale, 2.5 * scale, 4 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  // Draw both legs in one path
  ctx.strokeStyle = ped.pantsColor;
  ctx.lineWidth = 1.5 * scale;
  ctx.beginPath();
  ctx.moveTo(walkSway * scale, (-1 + walkBob) * scale);
  ctx.lineTo((walkSway - 1 + legSwing) * scale, (5 + walkBob) * scale);
  ctx.moveTo(walkSway * scale, (-1 + walkBob) * scale);
  ctx.lineTo((walkSway + 1 - legSwing) * scale, (5 + walkBob) * scale);
  ctx.stroke();

  // Draw both arms in one path
  ctx.strokeStyle = ped.skinColor;
  ctx.lineWidth = 1.2 * scale;
  const armSwing = legSwing * 0.67;
  ctx.beginPath();
  ctx.moveTo((walkSway - 2) * scale, (-6 + walkBob) * scale);
  ctx.lineTo((walkSway - 3 - armSwing) * scale, (-2 + walkBob) * scale);
  ctx.moveTo((walkSway + 2) * scale, (-6 + walkBob) * scale);
  ctx.lineTo((walkSway + 3 + armSwing) * scale, (-2 + walkBob) * scale);
  ctx.stroke();

  // Dog if walking one (simplified)
  if (ped.hasDog) {
    drawDogSimple(ctx, ped);
  }
}

/**
 * Draw a simplified dog for performance
 */
function drawDogSimple(ctx: CanvasRenderingContext2D, ped: Pedestrian): void {
  const scale = 0.3;
  const offsetX = 8;
  const offsetY = 3;
  
  // Dog as simple ellipse
  ctx.fillStyle = '#8B4513';
  ctx.beginPath();
  ctx.ellipse(offsetX * scale, (offsetY + 3) * scale, 4 * scale, 2 * scale, 0, 0, Math.PI * 2);
  ctx.arc((offsetX + 4) * scale, (offsetY + 1) * scale, 2 * scale, 0, Math.PI * 2);
  ctx.fill();
  
  // Leash
  ctx.strokeStyle = '#8B4513';
  ctx.lineWidth = 0.5 * scale;
  ctx.beginPath();
  ctx.moveTo(-2 * scale, -2 * scale);
  ctx.lineTo(offsetX * scale, (offsetY + 2) * scale);
  ctx.stroke();
}

/**
 * Draw a basketball player
 */
function drawBasketballPlayer(ctx: CanvasRenderingContext2D, ped: Pedestrian): void {
  const scale = 0.38;
  const bounce = Math.abs(Math.sin(ped.activityAnimTimer * 3)) * 2;
  const armMove = Math.sin(ped.activityAnimTimer * 6) * 4;

  // Head
  ctx.fillStyle = ped.skinColor;
  ctx.beginPath();
  ctx.arc(0, (-12 + bounce) * scale, 3 * scale, 0, Math.PI * 2);
  ctx.fill();

  // Jersey (bright color)
  ctx.fillStyle = ped.shirtColor;
  ctx.beginPath();
  ctx.ellipse(0, (-5 + bounce) * scale, 3 * scale, 4.5 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  // Shorts
  ctx.fillStyle = ped.pantsColor;
  ctx.fillRect(-2 * scale, (-1 + bounce) * scale, 4 * scale, 3 * scale);

  // Legs - athletic stance
  ctx.strokeStyle = ped.skinColor;
  ctx.lineWidth = 1.5 * scale;
  ctx.beginPath();
  ctx.moveTo(-1 * scale, (2 + bounce) * scale);
  ctx.lineTo(-2 * scale, (6 + bounce) * scale);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(1 * scale, (2 + bounce) * scale);
  ctx.lineTo(2 * scale, (6 + bounce) * scale);
  ctx.stroke();

  // Arms - dribbling motion
  ctx.strokeStyle = ped.skinColor;
  ctx.lineWidth = 1.2 * scale;
  ctx.beginPath();
  ctx.moveTo(-2 * scale, (-6 + bounce) * scale);
  ctx.lineTo((-3 + armMove * 0.3) * scale, (-1 + bounce) * scale);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(2 * scale, (-6 + bounce) * scale);
  ctx.lineTo((4 + armMove * 0.3) * scale, (2 + Math.abs(armMove)) * scale);
  ctx.stroke();

  // Basketball
  ctx.fillStyle = '#ff6b35';
  ctx.beginPath();
  ctx.arc((4 + armMove * 0.3) * scale, (4 + Math.abs(armMove) + bounce) * scale, 2 * scale, 0, Math.PI * 2);
  ctx.fill();
  // Ball lines
  ctx.strokeStyle = '#8B4513';
  ctx.lineWidth = 0.3 * scale;
  ctx.beginPath();
  ctx.arc((4 + armMove * 0.3) * scale, (4 + Math.abs(armMove) + bounce) * scale, 2 * scale, 0, Math.PI);
  ctx.stroke();
}

/**
 * Draw a tennis player
 */
function drawTennisPlayer(ctx: CanvasRenderingContext2D, ped: Pedestrian): void {
  const scale = 0.36;
  const swing = Math.sin(ped.activityAnimTimer * 2) * 5;

  // Head
  ctx.fillStyle = ped.skinColor;
  ctx.beginPath();
  ctx.arc(0, -12 * scale, 3 * scale, 0, Math.PI * 2);
  ctx.fill();

  // Visor
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(0, -14 * scale, 4 * scale, 1 * scale, 0, 0, Math.PI);
  ctx.fill();

  // Polo shirt
  ctx.fillStyle = ped.shirtColor;
  ctx.beginPath();
  ctx.ellipse(0, -5 * scale, 2.5 * scale, 4 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  // Tennis skirt/shorts
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-2.5 * scale, -1 * scale, 5 * scale, 2.5 * scale);

  // Legs
  ctx.strokeStyle = ped.skinColor;
  ctx.lineWidth = 1.5 * scale;
  ctx.beginPath();
  ctx.moveTo(-1 * scale, 1.5 * scale);
  ctx.lineTo(-1.5 * scale, 6 * scale);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(1 * scale, 1.5 * scale);
  ctx.lineTo(2 * scale, 6 * scale);
  ctx.stroke();

  // Arms with racket
  ctx.strokeStyle = ped.skinColor;
  ctx.lineWidth = 1.2 * scale;
  // Back arm
  ctx.beginPath();
  ctx.moveTo(-2 * scale, -6 * scale);
  ctx.lineTo(-3 * scale, -2 * scale);
  ctx.stroke();
  // Racket arm
  ctx.beginPath();
  ctx.moveTo(2 * scale, -6 * scale);
  ctx.lineTo((4 + swing * 0.5) * scale, (-8 + Math.abs(swing) * 0.3) * scale);
  ctx.stroke();

  // Tennis racket
  ctx.strokeStyle = '#444444';
  ctx.lineWidth = 0.8 * scale;
  ctx.beginPath();
  ctx.moveTo((4 + swing * 0.5) * scale, (-8 + Math.abs(swing) * 0.3) * scale);
  ctx.lineTo((7 + swing) * scale, (-12 + Math.abs(swing) * 0.5) * scale);
  ctx.stroke();
  // Racket head
  ctx.strokeStyle = '#228B22';
  ctx.lineWidth = 1 * scale;
  ctx.beginPath();
  ctx.ellipse((8 + swing) * scale, (-14 + Math.abs(swing) * 0.5) * scale, 2.5 * scale, 3 * scale, swing * 0.1, 0, Math.PI * 2);
  ctx.stroke();
}

/**
 * Draw a soccer player
 */
function drawSoccerPlayer(ctx: CanvasRenderingContext2D, ped: Pedestrian): void {
  const scale = 0.36;
  const kick = Math.sin(ped.activityAnimTimer * 4) * 4;
  const run = Math.abs(Math.sin(ped.activityAnimTimer * 5));

  // Head
  ctx.fillStyle = ped.skinColor;
  ctx.beginPath();
  ctx.arc(0, (-12 + run) * scale, 3 * scale, 0, Math.PI * 2);
  ctx.fill();

  // Jersey
  ctx.fillStyle = ped.shirtColor;
  ctx.beginPath();
  ctx.ellipse(0, (-5 + run) * scale, 2.5 * scale, 4 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  // Shorts
  ctx.fillStyle = ped.pantsColor;
  ctx.fillRect(-2 * scale, (-1 + run) * scale, 4 * scale, 2.5 * scale);

  // Legs - kicking motion
  ctx.strokeStyle = ped.skinColor;
  ctx.lineWidth = 1.5 * scale;
  ctx.beginPath();
  ctx.moveTo(-1 * scale, (1.5 + run) * scale);
  ctx.lineTo((-1.5 - kick * 0.2) * scale, (6 + run) * scale);
  ctx.stroke();
  // Kicking leg
  ctx.beginPath();
  ctx.moveTo(1 * scale, (1.5 + run) * scale);
  ctx.lineTo((2 + kick) * scale, (4 + run - Math.abs(kick) * 0.3) * scale);
  ctx.stroke();

  // Soccer ball
  if (Math.abs(kick) > 2) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc((4 + kick * 1.5) * scale, (3 + run) * scale, 1.5 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 0.3 * scale;
    ctx.stroke();
  }

  // Arms running motion
  ctx.strokeStyle = ped.skinColor;
  ctx.lineWidth = 1.2 * scale;
  ctx.beginPath();
  ctx.moveTo(-2 * scale, (-6 + run) * scale);
  ctx.lineTo((-3 - kick * 0.2) * scale, (-2 + run) * scale);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(2 * scale, (-6 + run) * scale);
  ctx.lineTo((3 + kick * 0.2) * scale, (-2 + run) * scale);
  ctx.stroke();
}

/**
 * Draw a baseball player
 */
function drawBaseballPlayer(ctx: CanvasRenderingContext2D, ped: Pedestrian): void {
  const scale = 0.36;
  const swing = Math.sin(ped.activityAnimTimer * 2) * 6;

  // Head
  ctx.fillStyle = ped.skinColor;
  ctx.beginPath();
  ctx.arc(0, -12 * scale, 3 * scale, 0, Math.PI * 2);
  ctx.fill();

  // Baseball cap
  ctx.fillStyle = ped.shirtColor;
  ctx.beginPath();
  ctx.arc(0, -13 * scale, 3.5 * scale, Math.PI, 0);
  ctx.fill();
  // Cap bill
  ctx.fillRect(-4 * scale, -13 * scale, 4 * scale, 1 * scale);

  // Uniform
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(0, -5 * scale, 2.5 * scale, 4 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  // Pants
  ctx.fillStyle = ped.pantsColor;
  ctx.fillRect(-2 * scale, -1 * scale, 4 * scale, 4 * scale);

  // Legs
  ctx.strokeStyle = ped.pantsColor;
  ctx.lineWidth = 2 * scale;
  ctx.beginPath();
  ctx.moveTo(-1 * scale, 3 * scale);
  ctx.lineTo(-1.5 * scale, 7 * scale);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(1 * scale, 3 * scale);
  ctx.lineTo(1.5 * scale, 7 * scale);
  ctx.stroke();

  // Arms and bat
  ctx.strokeStyle = ped.skinColor;
  ctx.lineWidth = 1.2 * scale;
  ctx.beginPath();
  ctx.moveTo(-2 * scale, -6 * scale);
  ctx.lineTo((-1 + swing * 0.3) * scale, (-9) * scale);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(2 * scale, -6 * scale);
  ctx.lineTo((1 + swing * 0.5) * scale, (-9) * scale);
  ctx.stroke();

  // Bat
  ctx.strokeStyle = '#8B4513';
  ctx.lineWidth = 1.5 * scale;
  ctx.beginPath();
  ctx.moveTo((swing * 0.4) * scale, -9 * scale);
  ctx.lineTo((swing * 1.2) * scale, -16 * scale);
  ctx.stroke();
}

/**
 * Draw a swimmer
 */
function drawSwimmer(ctx: CanvasRenderingContext2D, ped: Pedestrian): void {
  const scale = 0.35;
  const swim = Math.sin(ped.activityAnimTimer * 4);
  const bob = Math.sin(ped.activityAnimTimer * 2) * 1.5;

  // Water effect around swimmer
  ctx.fillStyle = 'rgba(59, 130, 246, 0.3)';
  ctx.beginPath();
  ctx.ellipse(0, 2 * scale, 8 * scale, 3 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  // Head poking out of water
  ctx.fillStyle = ped.skinColor;
  ctx.beginPath();
  ctx.arc(0, (-3 + bob) * scale, 3 * scale, 0, Math.PI * 2);
  ctx.fill();

  // Swim cap
  ctx.fillStyle = ped.shirtColor;
  ctx.beginPath();
  ctx.arc(0, (-4 + bob) * scale, 3 * scale, Math.PI, 0);
  ctx.fill();

  // Goggles
  ctx.fillStyle = '#333333';
  ctx.fillRect(-3 * scale, (-3 + bob) * scale, 6 * scale, 1 * scale);

  // Arms doing stroke
  ctx.strokeStyle = ped.skinColor;
  ctx.lineWidth = 1.5 * scale;
  // Left arm
  ctx.beginPath();
  ctx.moveTo(-2 * scale, (0 + bob) * scale);
  ctx.lineTo((-5 + swim * 3) * scale, (-2 + swim * 2) * scale);
  ctx.stroke();
  // Right arm
  ctx.beginPath();
  ctx.moveTo(2 * scale, (0 + bob) * scale);
  ctx.lineTo((5 - swim * 3) * scale, (-2 - swim * 2) * scale);
  ctx.stroke();

  // Splash effect
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  const splashSize = Math.abs(swim) * 2;
  ctx.beginPath();
  ctx.arc((-5 + swim * 3) * scale, 0, splashSize * scale, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Draw a skateboarder
 */
function drawSkateboarder(ctx: CanvasRenderingContext2D, ped: Pedestrian): void {
  const scale = 0.36;
  const ride = Math.sin(ped.activityAnimTimer * 3);
  const bob = Math.abs(ride) * 1.5;

  // Skateboard
  ctx.fillStyle = '#8B4513';
  ctx.fillRect(-5 * scale, (5 + bob) * scale, 10 * scale, 1.5 * scale);
  // Wheels
  ctx.fillStyle = '#333333';
  ctx.beginPath();
  ctx.arc(-3 * scale, (7 + bob) * scale, 1 * scale, 0, Math.PI * 2);
  ctx.arc(3 * scale, (7 + bob) * scale, 1 * scale, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.fillStyle = ped.skinColor;
  ctx.beginPath();
  ctx.arc(ride * scale, (-10 + bob) * scale, 3 * scale, 0, Math.PI * 2);
  ctx.fill();

  // Helmet
  ctx.fillStyle = '#333333';
  ctx.beginPath();
  ctx.arc(ride * scale, (-11 + bob) * scale, 3.5 * scale, Math.PI, 0);
  ctx.fill();

  // Body - crouched
  ctx.fillStyle = ped.shirtColor;
  ctx.beginPath();
  ctx.ellipse(ride * scale, (-4 + bob) * scale, 2.5 * scale, 3.5 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  // Bent legs
  ctx.strokeStyle = ped.pantsColor;
  ctx.lineWidth = 2 * scale;
  ctx.beginPath();
  ctx.moveTo((-1 + ride) * scale, (0 + bob) * scale);
  ctx.quadraticCurveTo((-3 + ride) * scale, (3 + bob) * scale, (-2 + ride) * scale, (5 + bob) * scale);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo((1 + ride) * scale, (0 + bob) * scale);
  ctx.quadraticCurveTo((3 + ride) * scale, (3 + bob) * scale, (2 + ride) * scale, (5 + bob) * scale);
  ctx.stroke();

  // Arms out for balance
  ctx.strokeStyle = ped.skinColor;
  ctx.lineWidth = 1.2 * scale;
  ctx.beginPath();
  ctx.moveTo((-2 + ride) * scale, (-5 + bob) * scale);
  ctx.lineTo((-6 - ride) * scale, (-3 + bob) * scale);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo((2 + ride) * scale, (-5 + bob) * scale);
  ctx.lineTo((6 + ride) * scale, (-3 + bob) * scale);
  ctx.stroke();
}

/**
 * Draw a person sitting on a bench
 */
function drawSittingPerson(ctx: CanvasRenderingContext2D, ped: Pedestrian): void {
  const scale = 0.36;
  const breathe = Math.sin(ped.activityAnimTimer * 0.5) * 0.3;

  // Bench
  ctx.fillStyle = '#8B4513';
  ctx.fillRect(-6 * scale, 2 * scale, 12 * scale, 2 * scale);
  // Bench legs
  ctx.fillRect(-5 * scale, 4 * scale, 1.5 * scale, 3 * scale);
  ctx.fillRect(3.5 * scale, 4 * scale, 1.5 * scale, 3 * scale);

  // Head
  ctx.fillStyle = ped.skinColor;
  ctx.beginPath();
  ctx.arc(0, (-8 + breathe) * scale, 3 * scale, 0, Math.PI * 2);
  ctx.fill();

  // Hat if has one
  if (ped.hasHat) {
    ctx.fillStyle = ped.hatColor;
    ctx.beginPath();
    ctx.ellipse(0, (-11 + breathe) * scale, 4 * scale, 1.5 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Body - seated
  ctx.fillStyle = ped.shirtColor;
  ctx.beginPath();
  ctx.ellipse(0, (-2 + breathe) * scale, 2.5 * scale, 4 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  // Legs - bent at 90 degrees
  ctx.fillStyle = ped.pantsColor;
  // Thighs (horizontal)
  ctx.fillRect(-2 * scale, 1 * scale, 4 * scale, 2 * scale);
  // Lower legs (hanging down)
  ctx.strokeStyle = ped.pantsColor;
  ctx.lineWidth = 2 * scale;
  ctx.beginPath();
  ctx.moveTo(-1 * scale, 3 * scale);
  ctx.lineTo(-1 * scale, 7 * scale);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(1 * scale, 3 * scale);
  ctx.lineTo(1 * scale, 7 * scale);
  ctx.stroke();

  // Arms resting
  ctx.strokeStyle = ped.skinColor;
  ctx.lineWidth = 1.2 * scale;
  ctx.beginPath();
  ctx.moveTo(-2 * scale, (-3 + breathe) * scale);
  ctx.lineTo(-4 * scale, 1 * scale);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(2 * scale, (-3 + breathe) * scale);
  ctx.lineTo(4 * scale, 1 * scale);
  ctx.stroke();
}

/**
 * Draw someone having a picnic
 */
function drawPicnicker(ctx: CanvasRenderingContext2D, ped: Pedestrian): void {
  const scale = 0.34;

  // Picnic blanket
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(-8 * scale, 0, 16 * scale, 8 * scale);
  // Blanket pattern
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-6 * scale, 2 * scale, 4 * scale, 4 * scale);
  ctx.fillRect(2 * scale, 2 * scale, 4 * scale, 4 * scale);

  // Person sitting cross-legged
  // Head
  ctx.fillStyle = ped.skinColor;
  ctx.beginPath();
  ctx.arc(0, -8 * scale, 3 * scale, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.fillStyle = ped.shirtColor;
  ctx.beginPath();
  ctx.ellipse(0, -2 * scale, 2.5 * scale, 4 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  // Crossed legs
  ctx.strokeStyle = ped.pantsColor;
  ctx.lineWidth = 2 * scale;
  ctx.beginPath();
  ctx.moveTo(-1 * scale, 2 * scale);
  ctx.lineTo(2 * scale, 5 * scale);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(1 * scale, 2 * scale);
  ctx.lineTo(-2 * scale, 5 * scale);
  ctx.stroke();

  // Picnic basket
  ctx.fillStyle = '#8B4513';
  ctx.fillRect(5 * scale, 1 * scale, 4 * scale, 3 * scale);
}

/**
 * Draw a jogger
 */
function drawJogger(ctx: CanvasRenderingContext2D, ped: Pedestrian): void {
  const scale = 0.36;
  const run = ped.walkOffset;
  const bounce = Math.abs(Math.sin(run * 2)) * 2;

  // Head
  ctx.fillStyle = ped.skinColor;
  ctx.beginPath();
  ctx.arc(0, (-12 + bounce) * scale, 3 * scale, 0, Math.PI * 2);
  ctx.fill();

  // Headband
  ctx.fillStyle = ped.shirtColor;
  ctx.fillRect(-3 * scale, (-13 + bounce) * scale, 6 * scale, 1.5 * scale);

  // Athletic top
  ctx.fillStyle = ped.shirtColor;
  ctx.beginPath();
  ctx.ellipse(0, (-5 + bounce) * scale, 2.3 * scale, 4 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  // Running shorts
  ctx.fillStyle = ped.pantsColor;
  ctx.fillRect(-2 * scale, (-1 + bounce) * scale, 4 * scale, 2 * scale);

  // Legs - running stride
  ctx.strokeStyle = ped.skinColor;
  ctx.lineWidth = 1.5 * scale;
  const leftLeg = Math.sin(run) * 5;
  const rightLeg = Math.sin(run + Math.PI) * 5;
  ctx.beginPath();
  ctx.moveTo(0, (1 + bounce) * scale);
  ctx.lineTo(leftLeg * scale, (6 + bounce) * scale);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, (1 + bounce) * scale);
  ctx.lineTo(rightLeg * scale, (6 + bounce) * scale);
  ctx.stroke();

  // Arms - pumping motion
  ctx.strokeStyle = ped.skinColor;
  ctx.lineWidth = 1.2 * scale;
  const leftArm = Math.sin(run + Math.PI) * 3;
  const rightArm = Math.sin(run) * 3;
  ctx.beginPath();
  ctx.moveTo(-2 * scale, (-6 + bounce) * scale);
  ctx.lineTo((-3 + leftArm) * scale, (-2 + bounce) * scale);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(2 * scale, (-6 + bounce) * scale);
  ctx.lineTo((3 + rightArm) * scale, (-2 + bounce) * scale);
  ctx.stroke();
}

/**
 * Draw a dog walker - just uses the regular walking function which handles dogs
 */
function drawDogWalker(ctx: CanvasRenderingContext2D, ped: Pedestrian): void {
  drawWalkingPedestrian(ctx, ped);
}

/**
 * Draw a kid on playground
 */
function drawPlaygroundKid(ctx: CanvasRenderingContext2D, ped: Pedestrian): void {
  const scale = 0.32; // Smaller - it's a kid
  const swing = Math.sin(ped.activityAnimTimer * 3) * 8;
  const sway = Math.cos(ped.activityAnimTimer * 3) * 3;

  // Swing set hint
  ctx.strokeStyle = '#666666';
  ctx.lineWidth = 1 * scale;
  ctx.beginPath();
  ctx.moveTo(-2 * scale, -20 * scale);
  ctx.lineTo((-2 + sway) * scale, (-8 + Math.abs(swing) * 0.2) * scale);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(2 * scale, -20 * scale);
  ctx.lineTo((2 + sway) * scale, (-8 + Math.abs(swing) * 0.2) * scale);
  ctx.stroke();

  // Kid's head
  ctx.fillStyle = ped.skinColor;
  ctx.beginPath();
  ctx.arc(sway * scale, (-10 + Math.abs(swing) * 0.2) * scale, 2.5 * scale, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.fillStyle = ped.shirtColor;
  ctx.beginPath();
  ctx.ellipse(sway * scale, (-4 + Math.abs(swing) * 0.1) * scale, 2 * scale, 3 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  // Legs - kicking while swinging
  ctx.strokeStyle = ped.pantsColor;
  ctx.lineWidth = 1.5 * scale;
  ctx.beginPath();
  ctx.moveTo(sway * scale, (-1 + Math.abs(swing) * 0.1) * scale);
  ctx.lineTo((sway + swing * 0.3) * scale, (4) * scale);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(sway * scale, (-1 + Math.abs(swing) * 0.1) * scale);
  ctx.lineTo((sway + swing * 0.2) * scale, (4) * scale);
  ctx.stroke();

  // Arms holding ropes
  ctx.strokeStyle = ped.skinColor;
  ctx.lineWidth = 1 * scale;
  ctx.beginPath();
  ctx.moveTo((sway - 1.5) * scale, (-5 + Math.abs(swing) * 0.15) * scale);
  ctx.lineTo((-2 + sway) * scale, (-8 + Math.abs(swing) * 0.2) * scale);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo((sway + 1.5) * scale, (-5 + Math.abs(swing) * 0.15) * scale);
  ctx.lineTo((2 + sway) * scale, (-8 + Math.abs(swing) * 0.2) * scale);
  ctx.stroke();
}

/**
 * Draw a spectator watching a game
 */
function drawSpectator(ctx: CanvasRenderingContext2D, ped: Pedestrian): void {
  const scale = 0.35;
  const cheer = Math.sin(ped.activityAnimTimer * 4);
  const cheerUp = cheer > 0.7;

  // Head
  ctx.fillStyle = ped.skinColor;
  ctx.beginPath();
  ctx.arc(0, (-12 + (cheerUp ? -1 : 0)) * scale, 3 * scale, 0, Math.PI * 2);
  ctx.fill();

  // Team cap/hat
  ctx.fillStyle = ped.shirtColor;
  ctx.beginPath();
  ctx.arc(0, (-13 + (cheerUp ? -1 : 0)) * scale, 3.5 * scale, Math.PI, 0);
  ctx.fill();

  // Body
  ctx.fillStyle = ped.shirtColor;
  ctx.beginPath();
  ctx.ellipse(0, -5 * scale, 2.5 * scale, 4 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  // Pants
  ctx.fillStyle = ped.pantsColor;
  ctx.fillRect(-2 * scale, -1 * scale, 4 * scale, 3 * scale);

  // Legs
  ctx.strokeStyle = ped.pantsColor;
  ctx.lineWidth = 2 * scale;
  ctx.beginPath();
  ctx.moveTo(-1 * scale, 2 * scale);
  ctx.lineTo(-1.5 * scale, 7 * scale);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(1 * scale, 2 * scale);
  ctx.lineTo(1.5 * scale, 7 * scale);
  ctx.stroke();

  // Arms - raised when cheering
  ctx.strokeStyle = ped.skinColor;
  ctx.lineWidth = 1.2 * scale;
  if (cheerUp) {
    // Arms up!
    ctx.beginPath();
    ctx.moveTo(-2 * scale, -6 * scale);
    ctx.lineTo(-4 * scale, -14 * scale);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(2 * scale, -6 * scale);
    ctx.lineTo(4 * scale, -14 * scale);
    ctx.stroke();
  } else {
    // Arms at sides
    ctx.beginPath();
    ctx.moveTo(-2 * scale, -6 * scale);
    ctx.lineTo(-3 * scale, -1 * scale);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(2 * scale, -6 * scale);
    ctx.lineTo(3 * scale, -1 * scale);
    ctx.stroke();
  }
}

/**
 * Draw a socializing person (facing another person)
 */
function drawSocializingPerson(ctx: CanvasRenderingContext2D, ped: Pedestrian): void {
  const scale = 0.35;
  const gesture = Math.sin(ped.activityAnimTimer * 2) * 2;

  // Head
  ctx.fillStyle = ped.skinColor;
  ctx.beginPath();
  ctx.arc(0, -12 * scale, 3 * scale, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.fillStyle = ped.shirtColor;
  ctx.beginPath();
  ctx.ellipse(0, -5 * scale, 2.5 * scale, 4 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  // Legs (standing)
  ctx.strokeStyle = ped.pantsColor;
  ctx.lineWidth = 1.5 * scale;
  ctx.beginPath();
  ctx.moveTo(-1 * scale, -1 * scale);
  ctx.lineTo(-1.5 * scale, 5 * scale);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(1 * scale, -1 * scale);
  ctx.lineTo(1.5 * scale, 5 * scale);
  ctx.stroke();

  // Arms - gesturing while talking
  ctx.strokeStyle = ped.skinColor;
  ctx.lineWidth = 1.2 * scale;
  ctx.beginPath();
  ctx.moveTo(-2 * scale, -6 * scale);
  ctx.lineTo((-4 + gesture) * scale, (-4 + Math.abs(gesture) * 0.5) * scale);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(2 * scale, -6 * scale);
  ctx.lineTo((4 - gesture) * scale, (-4 + Math.abs(gesture) * 0.5) * scale);
  ctx.stroke();

  // Speech indicator (small dots)
  if (Math.sin(ped.activityAnimTimer * 5) > 0) {
    ctx.fillStyle = '#666666';
    ctx.beginPath();
    ctx.arc(5 * scale, -14 * scale, 0.8 * scale, 0, Math.PI * 2);
    ctx.arc(7 * scale, -15 * scale, 0.6 * scale, 0, Math.PI * 2);
    ctx.arc(8.5 * scale, -15.5 * scale, 0.4 * scale, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Draw an idle person
 */
function drawIdlePerson(ctx: CanvasRenderingContext2D, ped: Pedestrian): void {
  const scale = 0.35;
  const breathe = Math.sin(ped.activityAnimTimer * 0.5) * 0.3;

  // Head
  ctx.fillStyle = ped.skinColor;
  ctx.beginPath();
  ctx.arc(0, (-12 + breathe) * scale, 3 * scale, 0, Math.PI * 2);
  ctx.fill();

  // Hat if has one
  if (ped.hasHat) {
    ctx.fillStyle = ped.hatColor;
    ctx.beginPath();
    ctx.ellipse(0, (-15 + breathe) * scale, 4 * scale, 1.5 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Body
  ctx.fillStyle = ped.shirtColor;
  ctx.beginPath();
  ctx.ellipse(0, (-5 + breathe) * scale, 2.5 * scale, 4 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  // Legs (standing)
  ctx.strokeStyle = ped.pantsColor;
  ctx.lineWidth = 1.5 * scale;
  ctx.beginPath();
  ctx.moveTo(-1 * scale, (-1 + breathe) * scale);
  ctx.lineTo(-1 * scale, (5 + breathe) * scale);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(1 * scale, (-1 + breathe) * scale);
  ctx.lineTo(1 * scale, (5 + breathe) * scale);
  ctx.stroke();

  // Arms at rest
  ctx.strokeStyle = ped.skinColor;
  ctx.lineWidth = 1.2 * scale;
  ctx.beginPath();
  ctx.moveTo(-2 * scale, (-6 + breathe) * scale);
  ctx.lineTo(-2.5 * scale, (-1 + breathe) * scale);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(2 * scale, (-6 + breathe) * scale);
  ctx.lineTo(2.5 * scale, (-1 + breathe) * scale);
  ctx.stroke();

  // Bag if carrying
  if (ped.hasBag) {
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(3 * scale, (-4 + breathe) * scale, 2 * scale, 3 * scale);
  }
}
