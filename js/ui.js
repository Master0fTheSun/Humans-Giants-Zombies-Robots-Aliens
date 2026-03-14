// ============================================================
// UI CONTROLLER - Handles all screen transitions and user input
// ============================================================

class UIController {
    constructor(game, renderer) {
        this.game = game;
        this.renderer = renderer;
        this.currentScreen = 'title-screen';

        // State for multi-step abilities
        this.laserNode1 = null;
        this.selectingSecondNode = false;
        this.selectingHologramTarget = false;
    }

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
        this.currentScreen = screenId;
    }

    // ---- TEAM BUILDER ----

    renderUnitRoster(faction, playerId) {
        const roster = document.getElementById('unit-roster');
        roster.innerHTML = '';

        const units = FACTIONS[faction].units;
        const player = this.game.players[playerId];

        for (const [key, def] of Object.entries(units)) {
            if (def.spawned) continue; // Don't show spawned-only units

            const card = document.createElement('div');
            card.className = 'unit-card';
            card.dataset.unitType = key;

            const canAfford = player.gold >= def.goldCost;
            const currentWeight = player.team.reduce((sum, t) => sum + t.def.deploymentWeight, 0);
            const canFit = currentWeight + def.deploymentWeight <= 50;

            if (!canAfford || !canFit) card.classList.add('disabled');

            card.innerHTML = `
                <h4>${def.name} <span style="color:${FACTIONS[faction].color}">[${def.symbol}]</span></h4>
                <div class="unit-stats">
                    <span class="unit-cost">Gold: ${def.goldCost}</span> |
                    <span class="unit-weight">DW: ${def.deploymentWeight}</span> |
                    HP: ${def.hp}
                </div>
                <div class="unit-stats">${def.description}</div>
            `;

            card.addEventListener('click', () => {
                if (card.classList.contains('disabled')) return;
                this.addToTeam(key, def, playerId);
            });

            roster.appendChild(card);
        }
    }

    addToTeam(unitType, def, playerId) {
        const player = this.game.players[playerId];
        const currentWeight = player.team.reduce((sum, t) => sum + t.def.deploymentWeight, 0);

        if (player.gold < def.goldCost) return;
        if (currentWeight + def.deploymentWeight > 50) return;

        player.team.push({ type: unitType, def: def });
        player.gold -= def.goldCost;

        this.updateBuilderUI(playerId);
    }

    removeFromTeam(index, playerId) {
        const player = this.game.players[playerId];
        const item = player.team[index];
        player.gold += item.def.goldCost;
        player.team.splice(index, 1);
        this.updateBuilderUI(playerId);
    }

    updateBuilderUI(playerId) {
        const player = this.game.players[playerId];
        const currentWeight = player.team.reduce((sum, t) => sum + t.def.deploymentWeight, 0);

        document.getElementById('builder-gold').innerHTML = `Gold: <strong>${player.gold}</strong>`;
        document.getElementById('builder-weight').innerHTML = `Deployment: <strong>${currentWeight} / 50</strong>`;

        // Re-render roster to update disabled states
        this.renderUnitRoster(player.faction, playerId);

        // Render team list
        const teamList = document.getElementById('team-list');
        teamList.innerHTML = '';

        player.team.forEach((item, i) => {
            const entry = document.createElement('div');
            entry.className = 'team-entry';
            entry.innerHTML = `
                <span>${item.def.name} (DW:${item.def.deploymentWeight})</span>
                <button class="remove-btn" data-index="${i}">X</button>
            `;
            entry.querySelector('.remove-btn').addEventListener('click', () => {
                this.removeFromTeam(i, playerId);
            });
            teamList.appendChild(entry);
        });
    }

    // ---- DEPLOYMENT ----

    setupDeployment(playerId) {
        const player = this.game.players[playerId];
        const rosterDiv = document.getElementById('deploy-roster');
        rosterDiv.innerHTML = '';

        this.deployQueue = [...player.team];
        this.selectedDeployUnit = null;

        this.deployQueue.forEach((item, i) => {
            const div = document.createElement('div');
            div.className = 'deploy-unit';
            div.dataset.index = i;
            div.textContent = `${item.def.name} (DW:${item.def.deploymentWeight})`;
            div.addEventListener('click', () => {
                if (div.classList.contains('placed')) return;
                document.querySelectorAll('.deploy-unit').forEach(d => d.classList.remove('selected'));
                div.classList.add('selected');
                this.selectedDeployUnit = i;
            });
            rosterDiv.appendChild(div);
        });

        // Show deployment zones
        const zones = this.game.board.getDeploymentZone(playerId);
        this.renderer.setHighlights(zones, 'deploy');

        document.getElementById('deployment-title').textContent =
            `Player ${playerId} - Deploy Your Units`;
    }

    handleDeployClick(row, col, playerId) {
        if (this.selectedDeployUnit === null) return;

        const zones = this.game.board.getDeploymentZone(playerId);
        if (!zones.some(z => z.row === row && z.col === col)) return;

        const item = this.deployQueue[this.selectedDeployUnit];
        if (!item || item.placed) return;

        const unit = createUnitInstance(
            this.game.players[playerId].faction,
            item.type,
            playerId
        );

        // Check if cell is free (and for 2x2, check all 4 cells)
        if (unit.size === '2x2') {
            for (let dr = 0; dr < 2; dr++) {
                for (let dc = 0; dc < 2; dc++) {
                    const cell = this.game.board.getCell(row + dr, col + dc);
                    if (!cell || cell.unit) return;
                    if (!zones.some(z => z.row === row + dr && z.col === col + dc)) return;
                }
            }
        } else {
            const cell = this.game.board.getCell(row, col);
            if (!cell || cell.unit) return;
        }

        if (this.game.board.placeUnit(unit, row, col)) {
            this.game.players[playerId].units.push(unit);
            item.placed = true;

            const div = document.querySelectorAll('.deploy-unit')[this.selectedDeployUnit];
            if (div) {
                div.classList.add('placed');
                div.classList.remove('selected');
            }
            this.selectedDeployUnit = null;

            // Re-render board
            this.renderer.drawBoard(this.game.board, this.game);
        }
    }

    isDeploymentComplete(playerId) {
        return this.deployQueue.every(item => item.placed);
    }

    // ---- GAME SCREEN ----

    updateHUD() {
        const player = this.game.players[this.game.currentPlayer];
        document.getElementById('hud-player').textContent =
            `Player ${this.game.currentPlayer}'s Turn`;
        document.getElementById('hud-faction').textContent = player.faction;
        document.getElementById('hud-turn').textContent = `Turn ${this.game.turnNumber}`;

        if (player.faction === 'zombies') {
            document.getElementById('hud-moves-left').textContent =
                `Moves: ${this.game.zombieMovesUsed}/3`;
        } else {
            document.getElementById('hud-moves-left').textContent = '';
        }
    }

    updateUnitInfo(unit) {
        const panel = document.getElementById('unit-info-panel');
        if (!unit) {
            panel.innerHTML = '<h3>Select a Unit</h3>';
            return;
        }

        const faction = FACTIONS[unit.faction];
        let html = `
            <h3 style="color:${faction.color}">${unit.name}</h3>
            <div class="stat-line stat-hp">HP: ${unit.hp} / ${unit.maxHp}</div>
            <div class="stat-line">Player ${unit.playerId} | ${unit.faction}</div>
            <div class="stat-line">DW: ${unit.deploymentWeight} | Size: ${unit.size}</div>
        `;

        if (unit.attacks.length > 0) {
            html += '<div class="stat-line stat-dmg"><strong>Attacks:</strong></div>';
            unit.attacks.forEach(atk => {
                let reloadStr = atk.currentReload > 0 ? ` (Reload: ${atk.currentReload})` : '';
                html += `<div class="stat-line stat-dmg">&nbsp; ${atk.name}: ${atk.damageMin}-${atk.damageMax} dmg, range ${atk.range}${reloadStr}</div>`;
            });
        }

        if (unit.abilities && unit.abilities.length > 0) {
            html += '<div class="stat-line stat-range"><strong>Abilities:</strong></div>';
            unit.abilities.forEach(ab => {
                html += `<div class="stat-line stat-range">&nbsp; ${ab.name}: ${ab.description}</div>`;
            });
        }

        if (unit.passive) {
            html += `<div class="stat-line"><strong>Passive:</strong> ${unit.passive.name} - ${unit.passive.description}</div>`;
        }

        if (unit.aura) {
            html += `<div class="stat-line"><strong>Aura:</strong> ${unit.aura.name} - ${unit.aura.description}</div>`;
        }

        if (unit.debuffs.length > 0) {
            html += '<div class="stat-line" style="color:#ff4444"><strong>Debuffs:</strong> ';
            html += unit.debuffs.map(d => `${d.type}(${d.duration})`).join(', ');
            html += '</div>';
        }

        if (unit.infectionPoints > 0) {
            html += `<div class="stat-line" style="color:#5cb85c"><strong>Infection:</strong> ${unit.infectionPoints} points</div>`;
        }

        panel.innerHTML = html;
    }

    updateActionPanel(unit) {
        const panel = document.getElementById('action-panel');
        panel.innerHTML = '';

        if (!unit || unit.playerId !== this.game.currentPlayer) return;
        if (!unit.isAlive) return;

        // Move button
        if (!unit.hasMoved) {
            const moveBtn = document.createElement('button');
            moveBtn.className = 'action-btn';
            moveBtn.textContent = 'Move';
            moveBtn.addEventListener('click', () => this.enterMoveMode(unit));
            panel.appendChild(moveBtn);
        }

        // Attack buttons
        unit.attacks.forEach((atk, i) => {
            if (unit.hasActed) return;
            const btn = document.createElement('button');
            btn.className = 'action-btn';
            btn.textContent = atk.name;
            if (atk.currentReload > 0) {
                btn.disabled = true;
                btn.textContent += ` (${atk.currentReload})`;
            }
            btn.addEventListener('click', () => this.enterAttackMode(unit, i));
            panel.appendChild(btn);
        });

        // Ability buttons
        if (unit.abilities) {
            unit.abilities.forEach((ab, i) => {
                if (unit.hasActed) return;
                const btn = document.createElement('button');
                btn.className = 'action-btn';
                btn.textContent = ab.name;
                btn.addEventListener('click', () => this.enterAbilityMode(unit, i));
                panel.appendChild(btn);
            });
        }

        // Dark Matter Fog (aliens)
        if (unit.faction === 'aliens' && !this.game.darkMatterFogUsed[unit.playerId] && !unit.hasActed) {
            const fogBtn = document.createElement('button');
            fogBtn.className = 'action-btn';
            fogBtn.textContent = 'Dark Matter Fog';
            fogBtn.addEventListener('click', () => {
                this.game.actionMode = 'fog';
                this.addLogEntry('Select target square for Dark Matter Fog.', 'info');
            });
            panel.appendChild(fogBtn);
        }
    }

    enterMoveMode(unit) {
        this.game.actionMode = 'move';
        this.game.selectedUnit = unit;
        const moves = this.game.getValidMoves(unit);
        this.renderer.setHighlights(moves, 'move');
        this.renderer.drawBoard(this.game.board, this.game);
    }

    enterAttackMode(unit, attackIndex) {
        this.game.actionMode = 'attack';
        this.game.selectedAttack = attackIndex;
        this.game.selectedUnit = unit;
        const targets = this.game.getValidAttackTargets(unit, attackIndex);
        const targetCells = targets.map(t => ({ row: t.row, col: t.col }));
        this.renderer.setHighlights(targetCells, 'attack');
        this.renderer.drawBoard(this.game.board, this.game);
    }

    enterAbilityMode(unit, abilityIndex) {
        this.game.actionMode = 'ability';
        this.game.selectedAbility = abilityIndex;
        this.game.selectedUnit = unit;

        const ability = unit.abilities[abilityIndex];

        // Special handling for different ability types
        if (ability.type === 'hologram') {
            this.selectingHologramTarget = true;
            this.addLogEntry('Click a friendly unit to create a hologram of.', 'info');
        } else if (ability.type === 'frequency') {
            this.showFrequencySelector(unit, abilityIndex);
        } else if (ability.type === 'spawn') {
            // Show adjacent empty squares
            const adjacents = [];
            [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([dr, dc]) => {
                const r = unit.row + dr;
                const c = unit.col + dc;
                if (isValidSquare(r, c)) {
                    const cell = this.game.board.getCell(r, c);
                    if (cell && !cell.unit) adjacents.push({ row: r, col: c });
                }
            });
            this.renderer.setHighlights(adjacents, 'move');
            this.renderer.drawBoard(this.game.board, this.game);
        } else if (ability.type === 'beam_down') {
            this.game.useAbility(unit, abilityIndex);
            this.afterAction();
        } else {
            // For targeted abilities, highlight valid targets
            const range = ability.range || 3;
            const cells = [];
            for (let r = unit.row - range; r <= unit.row + range; r++) {
                for (let c = unit.col - range; c <= unit.col + range; c++) {
                    if (isValidSquare(r, c)) {
                        const dist = this.game.board.getChebyshevDistance(unit.row, unit.col, r, c);
                        if (dist <= range) cells.push({ row: r, col: c });
                    }
                }
            }
            this.renderer.setHighlights(cells, ability.type === 'heal' || ability.type === 'repair' ? 'move' : 'attack');
            this.renderer.drawBoard(this.game.board, this.game);
        }
    }

    showFrequencySelector(unit, abilityIndex) {
        const panel = document.getElementById('action-panel');
        panel.innerHTML = '<div style="font-size:0.8rem;margin-bottom:0.3rem">Choose Frequency:</div>';

        ['red', 'yellow', 'blue', 'green'].forEach(freq => {
            const btn = document.createElement('button');
            btn.className = 'action-btn';
            btn.style.color = freq === 'red' ? '#ff4444' :
                freq === 'yellow' ? '#ffff44' :
                    freq === 'blue' ? '#4444ff' : '#44ff44';
            btn.textContent = freq.charAt(0).toUpperCase() + freq.slice(1);
            btn.addEventListener('click', () => {
                this.game.useAbility(unit, abilityIndex, null, null, { frequency: freq });
                this.afterAction();
            });
            panel.appendChild(btn);
        });
    }

    handleGameClick(row, col) {
        const game = this.game;
        const cell = game.board.getCell(row, col);
        if (!cell) return;

        const mode = game.actionMode;

        if (mode === 'move' && game.selectedUnit) {
            const success = game.moveUnit(game.selectedUnit, row, col);
            if (success) {
                this.afterAction();
            }
            return;
        }

        if (mode === 'attack' && game.selectedUnit) {
            if (cell.unit && cell.unit.playerId !== game.currentPlayer) {
                game.performAttack(game.selectedUnit, cell.unit, game.selectedAttack);
                this.afterAction();
            }
            return;
        }

        if (mode === 'ability' && game.selectedUnit) {
            const ability = game.selectedUnit.abilities[game.selectedAbility];

            if (this.selectingHologramTarget && cell.unit && cell.unit.playerId === game.currentPlayer) {
                game.useAbility(game.selectedUnit, game.selectedAbility, null, null,
                    { targetUnitId: cell.unit.id });
                this.selectingHologramTarget = false;
                this.afterAction();
                return;
            }

            if (ability.type === 'laser_fence') {
                if (!this.laserNode1) {
                    this.laserNode1 = { row, col };
                    this.addLogEntry('Select second node for Plasma Fence.', 'info');
                    return;
                } else {
                    const result = game.useAbility(game.selectedUnit, game.selectedAbility,
                        this.laserNode1.row, this.laserNode1.col,
                        { node2: { row, col } });
                    this.laserNode1 = null;
                    if (result) this.afterAction();
                    return;
                }
            }

            const result = game.useAbility(game.selectedUnit, game.selectedAbility, row, col);
            if (result) this.afterAction();
            return;
        }

        if (mode === 'fog' && game.selectedUnit) {
            game.useDarkMatterFog(game.selectedUnit, row, col);
            this.afterAction();
            return;
        }

        // Select unit
        if (cell.unit && cell.unit.playerId === game.currentPlayer) {
            if (game.selectUnit(cell.unit)) {
                this.updateUnitInfo(cell.unit);
                this.updateActionPanel(cell.unit);
                this.renderer.selectedCell = { row, col };
                this.renderer.clearHighlights();
                this.renderer.drawBoard(game.board, game);
            }
        } else if (cell.unit) {
            // Show enemy unit info
            this.updateUnitInfo(cell.unit);
            this.renderer.selectedCell = { row, col };
            this.renderer.drawBoard(game.board, game);
        }
    }

    afterAction() {
        this.renderer.clearHighlights();
        this.game.actionMode = null;

        // Check win
        const winner = this.game.checkWinCondition();
        if (winner) {
            this.game.phase = 'gameover';
            this.showVictory(winner);
            return;
        }

        // Update UI
        if (this.game.selectedUnit) {
            this.updateUnitInfo(this.game.selectedUnit);
            this.updateActionPanel(this.game.selectedUnit);
        }
        this.updateHUD();
        this.renderLog();
        this.renderer.drawBoard(this.game.board, this.game);
    }

    renderLog() {
        const logDiv = document.getElementById('game-log');
        logDiv.innerHTML = '';

        // Show last 30 entries
        const entries = this.game.log.slice(-30);
        entries.forEach(entry => {
            const div = document.createElement('div');
            div.className = `log-entry ${entry.type}`;
            div.textContent = entry.message;
            logDiv.appendChild(div);
        });

        logDiv.scrollTop = logDiv.scrollHeight;
    }

    addLogEntry(message, type) {
        this.game.addLog(message, type);
        this.renderLog();
    }

    showVictory(winner) {
        const goldWon = this.game.wager * 2;
        document.getElementById('victory-text').textContent =
            `Player ${winner} Wins!`;
        document.getElementById('victory-gold').textContent =
            `${FACTIONS[this.game.players[winner].faction].name} claim ${goldWon} gold!`;
        this.showScreen('victory-screen');
    }
}
