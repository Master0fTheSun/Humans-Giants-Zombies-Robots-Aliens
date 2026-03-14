// ============================================================
// BOARD - Hex/Grid Logic for the Custom Board Shape
// ============================================================
// Board layout:
//   Row 0 (P1 back):  7 squares
//   Row 1:            9 squares
//   Rows 2-8:        11 squares each (7 rows)
//   Row 9:            9 squares
//   Row 10 (P2 back): 7 squares
// Total: 11 rows

const BOARD_ROWS = 11;
const BOARD_MAX_COLS = 11;

function getRowWidth(row) {
    if (row === 0 || row === 10) return 7;
    if (row === 1 || row === 9) return 9;
    return 11; // rows 2-8
}

function getRowOffset(row) {
    // Offset to center narrower rows
    const width = getRowWidth(row);
    return Math.floor((BOARD_MAX_COLS - width) / 2);
}

function isValidSquare(row, col) {
    if (row < 0 || row >= BOARD_ROWS) return false;
    const offset = getRowOffset(row);
    const width = getRowWidth(row);
    return col >= offset && col < offset + width;
}

class GameBoard {
    constructor() {
        this.grid = [];
        this.effects = []; // smoke, rubble, mines, turrets, lasers, fog
        this.initGrid();
    }

    initGrid() {
        this.grid = [];
        for (let r = 0; r < BOARD_ROWS; r++) {
            const row = [];
            for (let c = 0; c < BOARD_MAX_COLS; c++) {
                if (isValidSquare(r, c)) {
                    row.push({
                        row: r,
                        col: c,
                        unit: null,
                        stackedUnits: [], // for zombie flesh-piles
                        effects: [],
                        mine: null,
                        turret: null,
                        rubble: false,
                        rubbleTurns: 0,
                        laserNode: null
                    });
                } else {
                    row.push(null);
                }
            }
            this.grid.push(row);
        }
    }

    getCell(row, col) {
        if (row < 0 || row >= BOARD_ROWS || col < 0 || col >= BOARD_MAX_COLS) return null;
        return this.grid[row][col];
    }

    placeUnit(unit, row, col) {
        if (unit.size === '2x2') {
            // Place a 2x2 unit (top-left corner at row,col)
            for (let dr = 0; dr < 2; dr++) {
                for (let dc = 0; dc < 2; dc++) {
                    const cell = this.getCell(row + dr, col + dc);
                    if (!cell) return false;
                    if (cell.unit && cell.unit.id !== unit.id) return false;
                }
            }
            for (let dr = 0; dr < 2; dr++) {
                for (let dc = 0; dc < 2; dc++) {
                    this.grid[row + dr][col + dc].unit = unit;
                }
            }
        } else {
            // 1x1 unit
            const cell = this.getCell(row, col);
            if (!cell) return false;

            // Check for zombie stacking
            if (cell.unit && unit.type === 'shambler' && cell.unit.type === 'shambler' &&
                cell.unit.playerId === unit.playerId) {
                if (cell.stackedUnits.length < 2) { // max 3 total (1 main + 2 stacked)
                    cell.stackedUnits.push(unit);
                    unit.row = row;
                    unit.col = col;
                    return true;
                }
                return false;
            }

            if (cell.unit) return false;
            cell.unit = unit;
        }
        unit.row = row;
        unit.col = col;
        return true;
    }

    removeUnit(unit) {
        if (unit.size === '2x2') {
            for (let dr = 0; dr < 2; dr++) {
                for (let dc = 0; dc < 2; dc++) {
                    const cell = this.getCell(unit.row + dr, unit.col + dc);
                    if (cell && cell.unit && cell.unit.id === unit.id) {
                        cell.unit = null;
                    }
                }
            }
        } else {
            const cell = this.getCell(unit.row, unit.col);
            if (cell) {
                // Check stacked units
                const stackIdx = cell.stackedUnits.findIndex(u => u.id === unit.id);
                if (stackIdx >= 0) {
                    cell.stackedUnits.splice(stackIdx, 1);
                } else if (cell.unit && cell.unit.id === unit.id) {
                    if (cell.stackedUnits.length > 0) {
                        cell.unit = cell.stackedUnits.shift();
                    } else {
                        cell.unit = null;
                    }
                }
            }
        }
    }

    moveUnit(unit, newRow, newCol) {
        this.removeUnit(unit);
        return this.placeUnit(unit, newRow, newCol);
    }

    getUnitsInRadius(row, col, radius) {
        const units = [];
        for (let r = row - radius; r <= row + radius; r++) {
            for (let c = col - radius; c <= col + radius; c++) {
                const cell = this.getCell(r, c);
                if (cell && cell.unit) {
                    if (!units.find(u => u.id === cell.unit.id)) {
                        units.push(cell.unit);
                    }
                    cell.stackedUnits.forEach(su => {
                        if (!units.find(u => u.id === su.id)) {
                            units.push(su);
                        }
                    });
                }
            }
        }
        return units;
    }

    getDistance(r1, c1, r2, c2) {
        return Math.abs(r1 - r2) + Math.abs(c1 - c2);
    }

    getChebyshevDistance(r1, c1, r2, c2) {
        return Math.max(Math.abs(r1 - r2), Math.abs(c1 - c2));
    }

    getMovementSquares(unit, bonusRange = 0) {
        const range = unit.movement.range + bonusRange;
        const directions = unit.movement.directions;
        const validSquares = [];
        const playerForward = unit.playerId === 1 ? 1 : -1;

        if (directions === 'l_pattern') {
            // Mercenary L-move (like chess knight)
            const lMoves = [
                [-2, -1], [-2, 1], [2, -1], [2, 1],
                [-1, -2], [-1, 2], [1, -2], [1, 2]
            ];
            for (const [dr, dc] of lMoves) {
                const nr = unit.row + dr;
                const nc = unit.col + dc;
                if (isValidSquare(nr, nc)) {
                    const cell = this.getCell(nr, nc);
                    if (cell && !cell.unit && !cell.rubble) {
                        validSquares.push({ row: nr, col: nc });
                    }
                }
            }
            return validSquares;
        }

        // BFS for reachable squares
        const visited = new Set();
        const queue = [{ row: unit.row, col: unit.col, dist: 0 }];
        visited.add(`${unit.row},${unit.col}`);

        while (queue.length > 0) {
            const { row, col, dist } = queue.shift();
            if (dist >= range) continue;

            const neighbors = this.getNeighbors(row, col, directions, playerForward, unit);
            for (const [nr, nc] of neighbors) {
                const key = `${nr},${nc}`;
                if (visited.has(key)) continue;
                visited.add(key);

                const cell = this.getCell(nr, nc);
                if (!cell) continue;
                if (cell.rubble) continue;

                const isFlying = directions === 'flying';
                const isSubterranean = directions === 'subterranean';

                if (cell.unit) {
                    // Giants can overrun 1x1 units
                    if (unit.size === '2x2' && cell.unit.size === '1x1') {
                        // Can move through but not end on
                        queue.push({ row: nr, col: nc, dist: dist + 1 });
                        continue;
                    }
                    if (isFlying || isSubterranean) {
                        queue.push({ row: nr, col: nc, dist: dist + 1 });
                        // Flying/subterranean can move through but only land on empty
                        if (!cell.unit) {
                            validSquares.push({ row: nr, col: nc });
                        }
                        continue;
                    }
                    continue; // Blocked
                }

                validSquares.push({ row: nr, col: nc });
                queue.push({ row: nr, col: nc, dist: dist + 1 });
            }
        }

        return validSquares;
    }

    getNeighbors(row, col, directions, playerForward, unit) {
        const neighbors = [];
        const allDirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        const diagonals = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

        switch (directions) {
            case 'omnidirectional':
            case 'flying':
            case 'subterranean':
                for (const [dr, dc] of allDirs) {
                    const nr = row + dr, nc = col + dc;
                    if (isValidSquare(nr, nc)) neighbors.push([nr, nc]);
                }
                break;
            case 'orthogonal':
                for (const [dr, dc] of allDirs) {
                    const nr = row + dr, nc = col + dc;
                    if (isValidSquare(nr, nc)) neighbors.push([nr, nc]);
                }
                break;
            case 'forward_only':
                {
                    const nr = row + playerForward, nc = col;
                    if (isValidSquare(nr, nc)) neighbors.push([nr, nc]);
                }
                break;
            case 'forward_back':
                for (const [dr, dc] of allDirs) {
                    const nr = row + dr, nc = col + dc;
                    if (isValidSquare(nr, nc)) neighbors.push([nr, nc]);
                }
                break;
            case 'forward_left_right':
                {
                    const fwd = [row + playerForward, col];
                    const left = [row, col - 1];
                    const right = [row, col + 1];
                    for (const [nr, nc] of [fwd, left, right]) {
                        if (isValidSquare(nr, nc)) neighbors.push([nr, nc]);
                    }
                }
                break;
            default:
                for (const [dr, dc] of allDirs) {
                    const nr = row + dr, nc = col + dc;
                    if (isValidSquare(nr, nc)) neighbors.push([nr, nc]);
                }
        }

        return neighbors;
    }

    getAttackTargets(unit, attack, bonusRange = 0) {
        const targets = [];
        const range = (attack.range || 0) + bonusRange;
        const minRange = attack.minRange || 0;

        for (let r = 0; r < BOARD_ROWS; r++) {
            for (let c = 0; c < BOARD_MAX_COLS; c++) {
                const cell = this.getCell(r, c);
                if (!cell || !cell.unit) continue;
                if (cell.unit.playerId === unit.playerId) continue;
                if (!cell.unit.isAlive) continue;

                const dist = this.getChebyshevDistance(unit.row, unit.col, r, c);
                if (dist > range || dist < minRange) continue;

                // Check direction constraints
                if (this.isInAttackDirection(unit, r, c, attack.direction)) {
                    targets.push(cell.unit);
                    // Also add stacked units
                    cell.stackedUnits.forEach(su => {
                        if (su.playerId !== unit.playerId && su.isAlive) {
                            targets.push(su);
                        }
                    });
                }
            }
        }
        return targets;
    }

    isInAttackDirection(unit, targetRow, targetCol, direction) {
        const playerForward = unit.playerId === 1 ? 1 : -1;
        const dr = targetRow - unit.row;
        const dc = targetCol - unit.col;

        switch (direction) {
            case 'omnidirectional':
            case 'radius':
            case 'targeted':
            case 'adjacent':
                return true;
            case 'forward_left_right':
            case 'forward_cone':
                return dr * playerForward >= 0; // not behind
            case 'forward_3x3':
                return dr * playerForward > 0 && Math.abs(dc) <= 1 && Math.abs(dr) <= 3;
            case 'horizontal_arc':
                return Math.abs(dr) <= 1 && Math.abs(dc) <= 2;
            case 'straight_line':
                return dr === 0 || dc === 0;
            case 'lines_and_diagonals':
                return dr === 0 || dc === 0 || Math.abs(dr) === Math.abs(dc);
            default:
                return true;
        }
    }

    getDeploymentZone(playerId) {
        const zones = [];
        if (playerId === 1) {
            // Rows 0-1 for player 1
            for (let r = 0; r <= 1; r++) {
                const offset = getRowOffset(r);
                const width = getRowWidth(r);
                for (let c = offset; c < offset + width; c++) {
                    zones.push({ row: r, col: c });
                }
            }
        } else {
            // Rows 9-10 for player 2
            for (let r = 9; r <= 10; r++) {
                const offset = getRowOffset(r);
                const width = getRowWidth(r);
                for (let c = offset; c < offset + width; c++) {
                    zones.push({ row: r, col: c });
                }
            }
        }
        return zones;
    }

    addEffect(effect) {
        this.effects.push(effect);
        return effect;
    }

    tickEffects() {
        // Decrement durations, remove expired effects
        this.effects = this.effects.filter(e => {
            if (e.duration !== undefined) {
                e.duration--;
                if (e.duration <= 0) {
                    // Clean up effect from cells
                    if (e.type === 'smoke' || e.type === 'rubble' || e.type === 'fog') {
                        if (e.cells) {
                            e.cells.forEach(({ row, col }) => {
                                const cell = this.getCell(row, col);
                                if (cell) {
                                    cell.effects = cell.effects.filter(ce => ce.id !== e.id);
                                    if (e.type === 'rubble') cell.rubble = false;
                                }
                            });
                        }
                    }
                    return false;
                }
            }
            return true;
        });
    }

    getAllUnits() {
        const units = [];
        for (let r = 0; r < BOARD_ROWS; r++) {
            for (let c = 0; c < BOARD_MAX_COLS; c++) {
                const cell = this.getCell(r, c);
                if (cell && cell.unit) {
                    if (!units.find(u => u.id === cell.unit.id)) {
                        units.push(cell.unit);
                    }
                    cell.stackedUnits.forEach(su => {
                        if (!units.find(u => u.id === su.id)) {
                            units.push(su);
                        }
                    });
                }
            }
        }
        return units;
    }
}
