// ============================================================
// ISOMETRIC RENDERER
// ============================================================

class IsometricRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.tileWidth = 64;
        this.tileHeight = 32;
        this.originX = canvas.width / 2;
        this.originY = 80;
        this.hoveredCell = null;
        this.selectedCell = null;
        this.highlightedCells = [];
        this.attackCells = [];
        this.deployZoneCells = [];
        this.effectCells = []; // smoke, rubble, fog, laser
    }

    // Convert grid coords to screen (isometric) coords
    gridToScreen(row, col) {
        const x = this.originX + (col - row) * (this.tileWidth / 2);
        const y = this.originY + (col + row) * (this.tileHeight / 2);
        return { x, y };
    }

    // Convert screen coords to grid coords
    screenToGrid(sx, sy) {
        const rx = sx - this.originX;
        const ry = sy - this.originY;
        const col = (rx / (this.tileWidth / 2) + ry / (this.tileHeight / 2)) / 2;
        const row = (ry / (this.tileHeight / 2) - rx / (this.tileWidth / 2)) / 2;
        return { row: Math.round(row), col: Math.round(col) };
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawBoard(board, gameState) {
        this.clear();

        // Draw tiles back-to-front for proper overlap
        for (let r = 0; r < BOARD_ROWS; r++) {
            for (let c = 0; c < BOARD_MAX_COLS; c++) {
                const cell = board.getCell(r, c);
                if (!cell) continue;
                this.drawTile(r, c, cell, board, gameState);
            }
        }

        // Draw units on top
        for (let r = 0; r < BOARD_ROWS; r++) {
            for (let c = 0; c < BOARD_MAX_COLS; c++) {
                const cell = board.getCell(r, c);
                if (!cell || !cell.unit) continue;
                // For 2x2 units, only draw from top-left corner
                if (cell.unit.size === '2x2' && (cell.unit.row !== r || cell.unit.col !== c)) continue;
                this.drawUnit(cell.unit, r, c, gameState);
            }
        }

        // Draw effects overlay
        this.drawEffects(board);
    }

    drawTile(row, col, cell, board, gameState) {
        const { x, y } = this.gridToScreen(row, col);
        const ctx = this.ctx;
        const hw = this.tileWidth / 2;
        const hh = this.tileHeight / 2;

        // Determine tile color
        let fillColor = this.getTileColor(row, col, cell);

        // Check highlights
        const isHovered = this.hoveredCell && this.hoveredCell.row === row && this.hoveredCell.col === col;
        const isSelected = this.selectedCell && this.selectedCell.row === row && this.selectedCell.col === col;
        const isHighlighted = this.highlightedCells.some(h => h.row === row && h.col === col);
        const isAttackTarget = this.attackCells.some(a => a.row === row && a.col === col);
        const isDeployZone = this.deployZoneCells.some(d => d.row === row && d.col === col);

        // Draw diamond tile
        ctx.beginPath();
        ctx.moveTo(x, y - hh);
        ctx.lineTo(x + hw, y);
        ctx.lineTo(x, y + hh);
        ctx.lineTo(x - hw, y);
        ctx.closePath();

        // Fill
        if (isSelected) {
            fillColor = '#4a6a9a';
        } else if (isAttackTarget) {
            fillColor = '#8a3030';
        } else if (isHighlighted) {
            fillColor = '#3a5a3a';
        } else if (isDeployZone) {
            fillColor = '#2a4a5a';
        } else if (isHovered) {
            fillColor = this.lightenColor(fillColor, 20);
        }

        // Cell effects
        if (cell.effects.some(e => e.type === 'smoke')) {
            fillColor = '#606060';
        }
        if (cell.rubble) {
            fillColor = '#5a4a3a';
        }

        ctx.fillStyle = fillColor;
        ctx.fill();

        // Grid line
        ctx.strokeStyle = 'rgba(180, 170, 150, 0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Mine indicator (only for owner)
        if (cell.mine && gameState) {
            if (cell.mine.playerId === gameState.currentPlayer) {
                ctx.fillStyle = 'rgba(255, 50, 50, 0.5)';
                ctx.beginPath();
                ctx.arc(x, y, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Turret
        if (cell.turret) {
            ctx.fillStyle = cell.turret.active ? '#aaa' : '#666';
            ctx.fillRect(x - 4, y - 8, 8, 6);
            ctx.fillRect(x - 1, y - 12, 2, 4);
        }
    }

    getTileColor(row, col, cell) {
        // Dark stone/concrete look with subtle checkerboard
        const base = (row + col) % 2 === 0 ? '#3a3530' : '#332e28';
        return base;
    }

    lightenColor(hex, amount) {
        const num = parseInt(hex.slice(1), 16);
        const r = Math.min(255, (num >> 16) + amount);
        const g = Math.min(255, ((num >> 8) & 0xFF) + amount);
        const b = Math.min(255, (num & 0xFF) + amount);
        return `rgb(${r},${g},${b})`;
    }

    drawUnit(unit, row, col, gameState) {
        const { x, y } = this.gridToScreen(row, col);
        const ctx = this.ctx;

        // Visibility check
        if (!unit.isVisible && gameState && unit.playerId !== gameState.currentPlayer) {
            return; // Invisible to opponent
        }

        const factionData = FACTIONS[unit.faction];
        const color = factionData ? factionData.color : '#fff';
        const darkColor = factionData ? factionData.darkColor : '#888';

        if (unit.size === '2x2') {
            // Draw larger unit spanning 4 tiles
            const { x: x2, y: y2 } = this.gridToScreen(row + 1, col + 1);
            const centerX = (x + x2) / 2;
            const centerY = (y + y2) / 2;

            ctx.fillStyle = darkColor;
            ctx.beginPath();
            ctx.ellipse(centerX, centerY - 4, this.tileWidth * 0.6, this.tileHeight * 0.6, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.stroke();

            // Symbol
            ctx.fillStyle = color;
            ctx.font = 'bold 14px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(unit.symbol, centerX, centerY - 4);

            // HP bar
            this.drawHPBar(centerX, centerY + 14, unit, 40);
        } else {
            // 1x1 unit
            const size = unit.isPhantom ? 10 : 12;

            // Unit body
            ctx.fillStyle = darkColor;
            ctx.beginPath();
            ctx.ellipse(x, y - 6, size, size * 0.65, 0, 0, Math.PI * 2);
            ctx.fill();

            // Border
            ctx.strokeStyle = unit.isPhantom ? 'rgba(255,255,255,0.3)' : color;
            ctx.lineWidth = unit.hasMoved && unit.hasActed ? 1 : 2;
            ctx.stroke();

            // Symbol
            ctx.fillStyle = unit.hasMoved && unit.hasActed ? '#888' : '#fff';
            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(unit.symbol, x, y - 6);

            // Stacked shamblers indicator
            const cell = gameState?.board?.getCell(row, col);
            if (cell && cell.stackedUnits.length > 0) {
                ctx.fillStyle = '#5cb85c';
                ctx.font = 'bold 8px monospace';
                ctx.fillText(`x${1 + cell.stackedUnits.length}`, x + 12, y - 14);
            }

            // HP bar
            this.drawHPBar(x, y + 6, unit, 20);
        }

        // Debuff indicators
        if (unit.debuffs.length > 0) {
            ctx.fillStyle = '#ff4444';
            ctx.beginPath();
            ctx.arc(x + 10, y - 16, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        // Facing indicator (small arrow)
        this.drawFacingArrow(x, y - 6, unit.facing, color);
    }

    drawHPBar(x, y, unit, width) {
        const ctx = this.ctx;
        const hpPercent = unit.hp / unit.maxHp;
        const barHeight = 3;

        ctx.fillStyle = '#333';
        ctx.fillRect(x - width / 2, y, width, barHeight);

        let barColor = '#5cb85c';
        if (hpPercent < 0.25) barColor = '#d9534f';
        else if (hpPercent < 0.5) barColor = '#f0ad4e';

        ctx.fillStyle = barColor;
        ctx.fillRect(x - width / 2, y, width * hpPercent, barHeight);
    }

    drawFacingArrow(x, y, facing, color) {
        const ctx = this.ctx;
        const size = 3;
        ctx.fillStyle = color;
        ctx.beginPath();

        switch (facing) {
            case 'north':
                ctx.moveTo(x, y - 14 - size);
                ctx.lineTo(x - size, y - 14);
                ctx.lineTo(x + size, y - 14);
                break;
            case 'south':
                ctx.moveTo(x, y + 2 + size);
                ctx.lineTo(x - size, y + 2);
                ctx.lineTo(x + size, y + 2);
                break;
            case 'east':
                ctx.moveTo(x + 14 + size, y);
                ctx.lineTo(x + 14, y - size);
                ctx.lineTo(x + 14, y + size);
                break;
            case 'west':
                ctx.moveTo(x - 14 - size, y);
                ctx.lineTo(x - 14, y - size);
                ctx.lineTo(x - 14, y + size);
                break;
        }
        ctx.closePath();
        ctx.fill();
    }

    drawEffects(board) {
        const ctx = this.ctx;

        board.effects.forEach(effect => {
            if (effect.type === 'smoke' && effect.cells) {
                effect.cells.forEach(({ row, col }) => {
                    const { x, y } = this.gridToScreen(row, col);
                    ctx.fillStyle = 'rgba(150, 150, 150, 0.5)';
                    const hw = this.tileWidth / 2;
                    const hh = this.tileHeight / 2;
                    ctx.beginPath();
                    ctx.moveTo(x, y - hh);
                    ctx.lineTo(x + hw, y);
                    ctx.lineTo(x, y + hh);
                    ctx.lineTo(x - hw, y);
                    ctx.closePath();
                    ctx.fill();
                });
            }

            if (effect.type === 'fog' && effect.cells) {
                effect.cells.forEach(({ row, col }) => {
                    const { x, y } = this.gridToScreen(row, col);
                    ctx.fillStyle = 'rgba(80, 0, 120, 0.4)';
                    const hw = this.tileWidth / 2;
                    const hh = this.tileHeight / 2;
                    ctx.beginPath();
                    ctx.moveTo(x, y - hh);
                    ctx.lineTo(x + hw, y);
                    ctx.lineTo(x, y + hh);
                    ctx.lineTo(x - hw, y);
                    ctx.closePath();
                    ctx.fill();
                });
            }

            if (effect.type === 'laser' && effect.nodes) {
                const [n1, n2] = effect.nodes;
                const p1 = this.gridToScreen(n1.row, n1.col);
                const p2 = this.gridToScreen(n2.row, n2.col);

                let laserColor = '#ff3333';
                if (effect.frequency === 'yellow') laserColor = '#ffff33';
                else if (effect.frequency === 'blue') laserColor = '#3333ff';
                else if (effect.frequency === 'green') laserColor = '#33ff33';

                ctx.strokeStyle = laserColor;
                ctx.lineWidth = 3;
                ctx.shadowBlur = 8;
                ctx.shadowColor = laserColor;
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
                ctx.shadowBlur = 0;

                // Nodes
                [p1, p2].forEach(p => {
                    ctx.fillStyle = laserColor;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
                    ctx.fill();
                });
            }
        });
    }

    setHighlights(cells, type = 'move') {
        if (type === 'move') this.highlightedCells = cells;
        else if (type === 'attack') this.attackCells = cells;
        else if (type === 'deploy') this.deployZoneCells = cells;
    }

    clearHighlights() {
        this.highlightedCells = [];
        this.attackCells = [];
        this.deployZoneCells = [];
    }
}
