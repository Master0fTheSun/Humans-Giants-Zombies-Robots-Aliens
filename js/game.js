// ============================================================
// GAME ENGINE - Core turn logic, combat, abilities
// ============================================================

class GameEngine {
    constructor() {
        this.board = new GameBoard();
        this.players = {
            1: { id: 1, faction: null, gold: 500, team: [], units: [] },
            2: { id: 2, faction: null, gold: 500, team: [], units: [] }
        };
        this.currentPlayer = 1;
        this.turnNumber = 1;
        this.phase = 'setup'; // setup, deployment, playing, gameover
        this.wager = 100;
        this.selectedUnit = null;
        this.actionMode = null; // null, 'move', 'attack', 'ability'
        this.selectedAttack = null;
        this.selectedAbility = null;
        this.log = [];
        this.zombieMovesUsed = 0;
        this.darkMatterFogUsed = { 1: false, 2: false };
        this.plasmaFenceFrequency = 'red';

        // Track which units have acted this turn (for zombie 3-move limit)
        this.unitsMovedThisTurn = new Set();
    }

    addLog(message, type = 'info') {
        this.log.push({ message, type, turn: this.turnNumber });
        // Keep log manageable
        if (this.log.length > 200) this.log.shift();
    }

    // ---- TURN MANAGEMENT ----

    startTurn() {
        const player = this.players[this.currentPlayer];
        this.zombieMovesUsed = 0;
        this.unitsMovedThisTurn.clear();

        // Reset unit states
        player.units.forEach(unit => {
            if (!unit.isAlive) return;
            unit.hasMoved = false;
            unit.hasActed = false;

            // Tick reload timers
            unit.attacks.forEach(atk => {
                if (atk.currentReload > 0) atk.currentReload--;
            });

            // Tick debuffs
            unit.debuffs = unit.debuffs.filter(d => {
                d.duration--;
                return d.duration > 0;
            });

            unit.turnsOnBoard++;
        });

        // Tick board effects
        this.board.tickEffects();

        // Auto turret fire (fires during opponent's turn, so fire now for turrets placed by the other player)
        this.processAutoTurrets();

        // Green laser healing
        this.processLaserHealing();

        this.addLog(`--- Turn ${this.turnNumber}: Player ${this.currentPlayer} (${player.faction}) ---`, 'info');
    }

    endTurn() {
        // Check win conditions
        const winner = this.checkWinCondition();
        if (winner) {
            this.phase = 'gameover';
            return winner;
        }

        // Switch player
        this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
        if (this.currentPlayer === 1) this.turnNumber++;

        this.selectedUnit = null;
        this.actionMode = null;
        this.startTurn();
        return null;
    }

    checkWinCondition() {
        const p1Alive = this.players[1].units.filter(u => u.isAlive && !u.isPhantom).length;
        const p2Alive = this.players[2].units.filter(u => u.isAlive && !u.isPhantom).length;

        if (p1Alive === 0) return 2;
        if (p2Alive === 0) return 1;
        return null;
    }

    // ---- UNIT SELECTION ----

    canActWithUnit(unit) {
        if (unit.playerId !== this.currentPlayer) return false;
        if (!unit.isAlive) return false;

        // Zombie 3-move limit
        if (this.players[this.currentPlayer].faction === 'zombies') {
            if (unit.hasMoved && unit.hasActed) return false;
            if (this.zombieMovesUsed >= 3 && !this.unitsMovedThisTurn.has(unit.id)) return false;
        }

        return !unit.hasMoved || !unit.hasActed;
    }

    selectUnit(unit) {
        if (!this.canActWithUnit(unit)) return false;
        this.selectedUnit = unit;
        this.actionMode = null;
        this.selectedAttack = null;
        this.selectedAbility = null;
        return true;
    }

    // ---- MOVEMENT ----

    getValidMoves(unit) {
        if (unit.hasMoved) return [];

        // Check root/anchor debuff
        if (unit.debuffs.some(d => d.type === 'rooted' || d.type === 'anchored')) return [];

        // Marksman: cannot move if they want to fire
        // (handled at UI level - they can move OR fire but not both)

        // Tank disabled check
        if (unit.type === 'tank' && unit.hp <= unit.maxHp * 0.1) return [];

        // Comms Officer aura bonus
        let bonusRange = 0;
        if (this.getAuraBonus(unit, 'movementBonus')) {
            bonusRange = this.getAuraBonus(unit, 'movementBonus');
        }

        return this.board.getMovementSquares(unit, bonusRange);
    }

    moveUnit(unit, targetRow, targetCol) {
        const validMoves = this.getValidMoves(unit);
        if (!validMoves.some(m => m.row === targetRow && m.col === targetCol)) return false;

        const oldRow = unit.row;
        const oldCol = unit.col;

        // Giant Overrun - check if path goes through enemies
        if (unit.size === '2x2') {
            // Simplified: just check destination neighbors for trample damage
            this.processOverrun(unit, oldRow, oldCol, targetRow, targetCol);
        }

        const success = this.board.moveUnit(unit, targetRow, targetCol);
        if (!success) return false;

        // Update facing
        unit.facing = this.calculateFacing(oldRow, oldCol, targetRow, targetCol, unit.playerId);

        unit.hasMoved = true;

        // Zombie move tracking
        if (this.players[this.currentPlayer].faction === 'zombies') {
            if (!this.unitsMovedThisTurn.has(unit.id)) {
                this.zombieMovesUsed++;
                this.unitsMovedThisTurn.add(unit.id);
            }
        }

        // Mine check
        const cell = this.board.getCell(targetRow, targetCol);
        if (cell && cell.mine && cell.mine.playerId !== unit.playerId) {
            this.triggerMine(cell, unit);
        }

        // Laser fence check
        this.checkLaserCollision(unit, oldRow, oldCol, targetRow, targetCol);

        // Marksman "Set Up" passive
        if (unit.passive && unit.passive.name === 'Set Up') {
            unit.hasActed = true; // Can't fire after moving
        }

        this.addLog(`${unit.name} moved to (${targetRow}, ${targetCol}).`, 'info');
        return true;
    }

    calculateFacing(fromRow, fromCol, toRow, toCol, playerId) {
        const dr = toRow - fromRow;
        const dc = toCol - fromCol;
        if (Math.abs(dr) >= Math.abs(dc)) {
            return dr > 0 ? 'south' : 'north';
        }
        return dc > 0 ? 'east' : 'west';
    }

    processOverrun(giant, fromRow, fromCol, toRow, toCol) {
        // Check cells along path for 1x1 enemy units
        const dr = Math.sign(toRow - fromRow);
        const dc = Math.sign(toCol - fromCol);
        let r = fromRow + dr;
        let c = fromCol + dc;

        while (r !== toRow || c !== toCol) {
            const cell = this.board.getCell(r, c);
            if (cell && cell.unit && cell.unit.size === '1x1' && cell.unit.playerId !== giant.playerId) {
                const dmg = rollDamage(3, 5);
                this.applyDamage(cell.unit, dmg, giant);
                this.addLog(`${giant.name} tramples ${cell.unit.name} for ${dmg} damage!`, 'damage');
            }
            r += dr;
            c += dc;
        }
    }

    // ---- COMBAT ----

    getValidAttackTargets(unit, attackIndex) {
        if (unit.hasActed) return [];
        const attack = unit.attacks[attackIndex];
        if (!attack) return [];
        if (attack.currentReload > 0) return [];

        // Tank machine gun requires Marine or Commander gunner
        if (attack.requiresGunner && unit.type === 'tank') {
            const hasGunner = unit.carriedUnits.some(u =>
                u.type === 'marine' || u.type === 'commander'
            );
            if (!hasGunner) return [];
        }

        // Comms Officer range bonus
        let bonusRange = 0;
        if (this.getAuraBonus(unit, 'rangeBonus')) {
            bonusRange = this.getAuraBonus(unit, 'rangeBonus');
        }

        // Smoke check - if unit is in smoke, range reduced to 1
        const cell = this.board.getCell(unit.row, unit.col);
        if (cell && cell.effects.some(e => e.type === 'smoke')) {
            bonusRange = -(attack.range - 1); // Reduce to 1
        }

        let targets = this.board.getAttackTargets(unit, attack, bonusRange);

        // Filter out units behind Riot Guard / Living Cover
        targets = targets.filter(t => !this.isProtectedByCover(t, unit, attack));

        // Filter invisible units
        targets = targets.filter(t => t.isVisible || t.isRevealed);

        return targets;
    }

    performAttack(attacker, target, attackIndex) {
        const attack = attacker.attacks[attackIndex];
        if (!attack) return null;

        let totalDamage = 0;
        const results = [];

        for (let burst = 0; burst < (attack.bursts || 1); burst++) {
            let dmg;

            // Backstab check (Mercenary)
            if (attacker.passive?.name === 'Backstab' && this.isFacingAway(target, attacker)) {
                dmg = rollBackstabDamage(attack.damageMin, attack.damageMax);
            } else {
                dmg = rollDamage(attack.damageMin, attack.damageMax);
            }

            // Shotgun distance scaling
            if (attack.distanceScaling) {
                const dist = this.board.getChebyshevDistance(attacker.row, attacker.col, target.row, target.col);
                if (dist === 1) dmg = Math.max(dmg, attack.damageMax - 1);
                else if (dist === 3) dmg = Math.min(dmg, attack.damageMin + 2);
            }

            // Stealth bonus (Stalker)
            if (attack.stealthBonus && !attacker.isRevealed && !attacker.isVisible === false) {
                if (!attacker.isVisible || attacker.passive?.name === 'Active Camouflage') {
                    dmg = attack.stealthDamage || attack.damageMax;
                }
            }

            // Melting armor debuff on target
            if (target.debuffs.some(d => d.type === 'melting_armor')) {
                dmg += 2;
            }

            // Granite Aegis: reduce projectile damage and reflect
            if (target.passive?.name === 'Kinetic Reflection' && attack.type === 'projectile') {
                const rawDmg = dmg;
                dmg = Math.max(0, dmg - target.passive.damageReduction);
                const reflectedDmg = Math.floor(rawDmg * target.passive.reflectPercent);
                if (reflectedDmg > 0) {
                    this.applyDamage(attacker, reflectedDmg, target);
                    this.addLog(`${target.name} reflects ${reflectedDmg} shrapnel damage to ${attacker.name}!`, 'damage');
                }
            }

            // Zero-Sum Protocol (Calculus-Engine)
            if (target.passive?.name === 'Zero-Sum Protocol' && target.isAlive) {
                const beforeHp = target.hp;
                this.applyDamage(target, dmg, attacker);
                const hpLost = beforeHp - target.hp;
                if (target.isAlive && hpLost > 0) {
                    this.applyDamage(attacker, hpLost, target);
                    this.addLog(`${target.name} reflects ${hpLost} damage back to ${attacker.name}!`, 'damage');
                }
            } else {
                this.applyDamage(target, dmg, attacker);
            }

            totalDamage += dmg;

            results.push({ damage: dmg });
        }

        // Infection
        if (attack.infectionPoints && target.isAlive) {
            this.applyInfection(target, attack.infectionPoints, attacker);
        }

        // Debuffs from attack
        if (attack.debuff && target.isAlive) {
            target.debuffs.push({
                type: attack.debuff,
                duration: attack.debuffDuration || 1,
                source: attacker.id
            });
            this.addLog(`${target.name} is ${attack.debuff}!`, 'special');
        }

        // Knockback
        if (attack.knockback && target.isAlive) {
            this.knockback(target, attacker, attack.knockback);
        }

        // Pull target (Meat Hook)
        if (attack.pullsTarget && target.isAlive && target.size === '1x1') {
            this.pullUnit(target, attacker);
        }

        // Root
        if (attack.rootDuration && target.isAlive) {
            target.debuffs.push({ type: 'rooted', duration: attack.rootDuration });
            this.addLog(`${target.name} is rooted!`, 'special');
        }

        // Reveal attacker if invisible
        if (attacker.passive?.name === 'Active Camouflage') {
            attacker.isVisible = true;
            attacker.isRevealed = true;
        }

        // Set reload
        if (attack.reloadTime) {
            attack.currentReload = attack.reloadTime;
        }

        // Blood Frenzy (Butcher)
        if (!target.isAlive && attacker.passive?.name === 'Blood Frenzy') {
            attacker.hasActed = false;
            attacker.hasMoved = false;
            this.addLog(`${attacker.name} enters Blood Frenzy! Extra action!`, 'special');
        }

        // Shambler strength in numbers
        // (handled in damage calc)

        attacker.hasActed = true;
        this.addLog(`${attacker.name} attacks ${target.name} with ${attack.name} for ${totalDamage} damage!`, 'damage');

        return { totalDamage, results };
    }

    applyDamage(unit, damage, source) {
        if (!unit.isAlive) return;

        // Phantom check
        if (unit.isPhantom) {
            unit.isAlive = false;
            this.board.removeUnit(unit);
            this.addLog(`${unit.name} was a phantom! It vanishes.`, 'special');
            return;
        }

        unit.hp -= damage;

        // Marine Last Stand
        if (unit.hp <= 0 && unit.passive?.name === 'Last Stand') {
            if (Math.random() < 0.2) {
                unit.hp = 1;
                this.addLog(`${unit.name} survives with Last Stand! 1 HP remaining.`, 'special');
                return;
            }
        }

        if (unit.hp <= 0) {
            unit.hp = 0;
            unit.isAlive = false;
            this.board.removeUnit(unit);
            this.addLog(`${unit.name} has been destroyed!`, 'damage');

            // Release carried units
            if (unit.carriedUnits && unit.carriedUnits.length > 0) {
                unit.carriedUnits.forEach(cu => {
                    cu.isAlive = false;
                    this.addLog(`${cu.name} (inside ${unit.name}) was destroyed!`, 'damage');
                });
            }
        }
    }

    // ---- ABILITIES ----

    useAbility(unit, abilityIndex, targetRow, targetCol, extraData) {
        const ability = unit.abilities[abilityIndex];
        if (!ability) return false;

        switch (ability.type) {
            case 'heal':
                return this.abilityHeal(unit, ability, targetRow, targetCol);
            case 'smoke':
                return this.abilitySmoke(unit, ability, targetRow, targetCol);
            case 'mine':
                return this.abilityMine(unit, ability, targetRow, targetCol);
            case 'turret':
                return this.abilityTurret(unit, ability);
            case 'repair':
                return this.abilityRepair(unit, ability, targetRow, targetCol);
            case 'flashbang':
                return this.abilityFlashbang(unit, ability, targetRow, targetCol);
            case 'rally':
                return this.abilityRally(unit, ability, targetRow, targetCol);
            case 'erupt':
                return this.abilityErupt(unit, ability, targetRow, targetCol);
            case 'hologram':
                return this.abilityHologram(unit, ability, extraData);
            case 'hack':
                return this.abilityHack(unit, ability, targetRow, targetCol);
            case 'spawn':
                return this.abilitySpawn(unit, ability, targetRow, targetCol);
            case 'explode':
                return this.abilitySelfDestruct(unit, ability);
            case 'laser_fence':
                return this.abilityLaserFence(unit, ability, targetRow, targetCol, extraData);
            case 'frequency':
                return this.abilityFrequencyShift(unit, ability, extraData);
            case 'beam_down':
                return this.abilityBeamDown(unit, ability);
            default:
                return false;
        }
    }

    abilityHeal(unit, ability, targetRow, targetCol) {
        const cell = this.board.getCell(targetRow, targetCol);
        if (!cell || !cell.unit) return false;
        if (cell.unit.playerId !== unit.playerId) return false;
        if (this.board.getDistance(unit.row, unit.col, targetRow, targetCol) > (ability.range || 1)) return false;

        const heal = rollDamage(ability.healMin, ability.healMax);
        cell.unit.hp = Math.min(cell.unit.maxHp, cell.unit.hp + heal);
        unit.hasActed = true;
        this.addLog(`${unit.name} heals ${cell.unit.name} for ${heal} HP!`, 'heal');
        return true;
    }

    abilitySmoke(unit, ability, targetRow, targetCol) {
        const dist = this.board.getChebyshevDistance(unit.row, unit.col, targetRow, targetCol);
        if (dist > ability.range) return false;

        const smokeCells = [];
        const size = ability.aoeSize || 2;
        for (let dr = 0; dr < size; dr++) {
            for (let dc = 0; dc < size; dc++) {
                const r = targetRow + dr;
                const c = targetCol + dc;
                if (isValidSquare(r, c)) {
                    smokeCells.push({ row: r, col: c });
                    const cell = this.board.getCell(r, c);
                    if (cell) cell.effects.push({ type: 'smoke', id: `smoke_${Date.now()}` });
                }
            }
        }

        const effectId = `smoke_${Date.now()}`;
        this.board.addEffect({
            id: effectId,
            type: 'smoke',
            cells: smokeCells,
            duration: ability.duration || 3,
            playerId: unit.playerId
        });

        unit.hasActed = true;
        this.addLog(`${unit.name} throws a smoke grenade!`, 'special');
        return true;
    }

    abilityMine(unit, ability, targetRow, targetCol) {
        const dist = this.board.getDistance(unit.row, unit.col, targetRow, targetCol);
        if (dist > (ability.range || 1)) return false;

        const cell = this.board.getCell(targetRow, targetCol);
        if (!cell || cell.mine || cell.unit) return false;

        cell.mine = {
            playerId: unit.playerId,
            damage: ability.damageMin || 5,
            aoeRange: ability.aoeRange || 5,
            friendlyFire: true
        };

        unit.hasActed = true;
        this.addLog(`${unit.name} deploys a mine.`, 'special');
        return true;
    }

    abilityTurret(unit, ability) {
        const forward = unit.playerId === 1 ? 1 : -1;
        const targetRow = unit.row + forward;
        const targetCol = unit.col;

        const cell = this.board.getCell(targetRow, targetCol);
        if (!cell || cell.unit || cell.turret) return false;

        cell.turret = {
            playerId: unit.playerId,
            detectionRange: ability.detectionRange || 4,
            damageMin: ability.damageMin || 3,
            damageMax: ability.damageMax || 6,
            active: false, // Becomes active next turn
            direction: 'forward_left_right',
            row: targetRow,
            col: targetCol
        };

        unit.hasActed = true;
        this.addLog(`${unit.name} deploys an auto turret!`, 'special');
        return true;
    }

    abilityRepair(unit, ability, targetRow, targetCol) {
        const cell = this.board.getCell(targetRow, targetCol);
        if (!cell || !cell.unit) return false;

        const target = cell.unit;
        if (target.playerId !== unit.playerId) return false;

        // Engineer repairs tanks, Fabricator repairs robots
        if (unit.type === 'engineer' && target.type !== 'tank') return false;
        if (unit.type === 'fabricator_node' && target.faction !== 'robots') return false;

        const dist = this.board.getDistance(unit.row, unit.col, targetRow, targetCol);
        if (dist > (ability.range || 1)) return false;

        const heal = ability.healAmount || rollDamage(ability.healMin, ability.healMax);
        target.hp = Math.min(target.maxHp, target.hp + heal);
        unit.hasActed = true;
        this.addLog(`${unit.name} repairs ${target.name} for ${heal} HP!`, 'heal');
        return true;
    }

    abilityFlashbang(unit, ability, targetRow, targetCol) {
        const dist = this.board.getChebyshevDistance(unit.row, unit.col, targetRow, targetCol);
        if (dist > ability.range) return false;

        // Reveal mines in 3x3
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                const cell = this.board.getCell(targetRow + dr, targetCol + dc);
                if (cell && cell.mine) {
                    // Mine is now visible to both players
                    cell.mine.revealed = true;
                    this.addLog(`Mine revealed at (${targetRow + dr}, ${targetCol + dc})!`, 'info');
                }
            }
        }

        unit.hasActed = true;
        this.addLog(`${unit.name} throws a flashbang!`, 'special');
        return true;
    }

    abilityRally(unit, ability, targetRow, targetCol) {
        // All zombies within radius move 1 square toward target
        const zombies = this.board.getUnitsInRadius(unit.row, unit.col, ability.range || 3);
        const friendlyZombies = zombies.filter(u =>
            u.playerId === unit.playerId && u.faction === 'zombies' && u.id !== unit.id && u.isAlive
        );

        friendlyZombies.forEach(zombie => {
            const dr = Math.sign(targetRow - zombie.row);
            const dc = Math.sign(targetCol - zombie.col);
            const newRow = zombie.row + dr;
            const newCol = zombie.col + dc;

            if (isValidSquare(newRow, newCol)) {
                const cell = this.board.getCell(newRow, newCol);
                if (cell && (!cell.unit || (zombie.type === 'shambler' && cell.unit?.type === 'shambler'))) {
                    this.board.moveUnit(zombie, newRow, newCol);
                }
            }
        });

        unit.hasActed = true;
        this.addLog(`${unit.name} rallies the dead!`, 'special');
        return true;
    }

    abilityErupt(unit, ability, targetRow, targetCol) {
        const cell = this.board.getCell(targetRow, targetCol);
        if (!cell || !cell.unit) return false;
        if (cell.unit.playerId === unit.playerId) return false;
        if (cell.unit.faction !== 'humans') return false; // Only works on humans

        const target = cell.unit;
        const dmg = rollDamage(ability.damageMin, ability.damageMax);
        this.applyDamage(target, dmg, unit);

        // Swap positions
        if (target.isAlive) {
            const oldRow = unit.row;
            const oldCol = unit.col;
            this.board.removeUnit(unit);
            this.board.removeUnit(target);
            this.board.placeUnit(unit, targetRow, targetCol);
            this.board.placeUnit(target, oldRow, oldCol);
        }

        unit.hasActed = true;
        this.addLog(`${unit.name} erupts under ${target.name} for ${dmg} damage!`, 'damage');
        return true;
    }

    abilityHologram(unit, ability, extraData) {
        if (!extraData?.targetUnitId) return false;

        const targetUnit = this.board.getAllUnits().find(u => u.id === extraData.targetUnitId);
        if (!targetUnit || targetUnit.playerId !== unit.playerId) return false;

        // Find empty adjacent square
        const neighbors = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        let placed = false;
        for (const [dr, dc] of neighbors) {
            const nr = unit.row + dr;
            const nc = unit.col + dc;
            const cell = this.board.getCell(nr, nc);
            if (cell && !cell.unit) {
                const phantom = createUnitInstance(targetUnit.faction, targetUnit.type, unit.playerId);
                phantom.isPhantom = true;
                phantom.name = targetUnit.name + ' (Phantom)';
                this.board.placeUnit(phantom, nr, nc);
                this.players[unit.playerId].units.push(phantom);
                placed = true;
                break;
            }
        }

        if (!placed) return false;
        unit.hasActed = true;
        this.addLog(`${unit.name} creates a holographic projection!`, 'special');
        return true;
    }

    abilityHack(unit, ability, targetRow, targetCol) {
        const cell = this.board.getCell(targetRow, targetCol);
        if (!cell || !cell.unit) return false;

        const target = cell.unit;
        if (target.playerId === unit.playerId) return false;

        // Check valid targets
        if (!['humans', 'aliens'].includes(target.faction)) {
            this.addLog(`Cannot hack ${target.faction} units!`, 'info');
            return false;
        }

        const dist = this.board.getChebyshevDistance(unit.row, unit.col, targetRow, targetCol);
        if (dist > (ability.range || 4)) return false;

        target.debuffs.push({
            type: 'hacked',
            duration: 1,
            controlledBy: unit.playerId
        });

        unit.hasActed = true;
        this.addLog(`${unit.name} hacks ${target.name}! Robot player controls it next turn.`, 'special');
        return true;
    }

    abilitySpawn(unit, ability, targetRow, targetCol) {
        // Check for adjacent empty square
        if (targetRow === undefined) {
            const neighbors = [[0, 1], [0, -1], [1, 0], [-1, 0]];
            for (const [dr, dc] of neighbors) {
                const nr = unit.row + dr;
                const nc = unit.col + dc;
                const cell = this.board.getCell(nr, nc);
                if (cell && !cell.unit) {
                    targetRow = nr;
                    targetCol = nc;
                    break;
                }
            }
        }

        if (targetRow === undefined) return false;

        const crawler = createUnitInstance('robots', 'crawler', unit.playerId);
        if (this.board.placeUnit(crawler, targetRow, targetCol)) {
            this.players[unit.playerId].units.push(crawler);
            unit.hasActed = true;
            unit.hasMoved = true; // Uses entire turn
            this.addLog(`${unit.name} prints a Crawler drone!`, 'special');
            return true;
        }
        return false;
    }

    abilitySelfDestruct(unit, ability) {
        // Explode on adjacent enemy
        const neighbors = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        let exploded = false;
        for (const [dr, dc] of neighbors) {
            const cell = this.board.getCell(unit.row + dr, unit.col + dc);
            if (cell && cell.unit && cell.unit.playerId !== unit.playerId) {
                const dmg = rollDamage(ability.damageMin, ability.damageMax);
                this.applyDamage(cell.unit, dmg, unit);
                this.addLog(`Crawler explodes near ${cell.unit.name} for ${dmg} damage!`, 'damage');
                exploded = true;
                break;
            }
        }

        if (exploded) {
            unit.hp = 0;
            unit.isAlive = false;
            this.board.removeUnit(unit);
            return true;
        }
        return false;
    }

    abilityLaserFence(unit, ability, targetRow, targetCol, extraData) {
        if (!extraData?.node2) {
            // Need second node - store first node
            return 'need_second_node';
        }

        const n1 = { row: targetRow, col: targetCol };
        const n2 = extraData.node2;

        // Must be in a straight line
        if (n1.row !== n2.row && n1.col !== n2.col) return false;

        // Distance check
        const dist = this.board.getDistance(n1.row, n1.col, n2.row, n2.col);
        if (dist > (ability.maxDistance || 6)) return false;

        const laserEffect = {
            id: `laser_${Date.now()}`,
            type: 'laser',
            nodes: [n1, n2],
            frequency: this.plasmaFenceFrequency,
            playerId: unit.playerId,
            damage: ability.damage || 12
        };

        this.board.addEffect(laserEffect);
        unit.hasActed = true;
        this.addLog(`${unit.name} deploys a Plasma Fence!`, 'special');
        return true;
    }

    abilityFrequencyShift(unit, ability, extraData) {
        if (!extraData?.frequency) return false;
        const freq = extraData.frequency;
        if (!['red', 'yellow', 'blue', 'green'].includes(freq)) return false;

        this.plasmaFenceFrequency = freq;

        // Update all laser effects
        this.board.effects.forEach(e => {
            if (e.type === 'laser') {
                e.frequency = freq;
            }
        });

        unit.hasActed = true;
        this.addLog(`${unit.name} shifts all Plasma Fences to ${freq.toUpperCase()} frequency!`, 'special');
        return true;
    }

    abilityBeamDown(unit, ability) {
        if (!unit.carriedUnits || unit.carriedUnits.length === 0) return false;

        const neighbors = [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]];
        let deployed = 0;

        unit.carriedUnits.forEach(carried => {
            for (const [dr, dc] of neighbors) {
                const nr = unit.row + dr;
                const nc = unit.col + dc;
                const cell = this.board.getCell(nr, nc);
                if (cell && !cell.unit) {
                    carried.isInVehicle = false;
                    carried.vehicleId = null;
                    this.board.placeUnit(carried, nr, nc);
                    deployed++;
                    break;
                }
            }
        });

        unit.carriedUnits = [];
        unit.hasActed = true;
        this.addLog(`${unit.name} beams down ${deployed} units!`, 'special');
        return true;
    }

    // ---- DARK MATTER FOG (Alien Wild Card) ----

    useDarkMatterFog(unit, targetRow, targetCol) {
        if (unit.faction !== 'aliens') return false;
        if (this.darkMatterFogUsed[unit.playerId]) return false;

        const fogCells = [];
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                const r = targetRow + dr;
                const c = targetCol + dc;
                if (isValidSquare(r, c)) {
                    fogCells.push({ row: r, col: c });
                    const cell = this.board.getCell(r, c);
                    if (cell) cell.effects.push({ type: 'fog', id: `fog_${Date.now()}` });
                }
            }
        }

        this.board.addEffect({
            id: `fog_${Date.now()}`,
            type: 'fog',
            cells: fogCells,
            duration: 1,
            playerId: unit.playerId
        });

        this.darkMatterFogUsed[unit.playerId] = true;
        unit.hasActed = true;
        unit.hasMoved = true;
        this.addLog(`${unit.name} creates Dark Matter Fog!`, 'special');
        return true;
    }

    // ---- HELPER FUNCTIONS ----

    triggerMine(cell, triggerUnit) {
        const mine = cell.mine;
        const dmg = mine.damage;

        // AOE damage
        const units = this.board.getUnitsInRadius(cell.row, cell.col, Math.floor(Math.sqrt(mine.aoeRange)));
        units.forEach(u => {
            if (mine.friendlyFire || u.playerId !== mine.playerId) {
                this.applyDamage(u, dmg, null);
                this.addLog(`Mine explodes! ${u.name} takes ${dmg} damage!`, 'damage');
            }
        });

        cell.mine = null;
    }

    checkLaserCollision(unit, fromRow, fromCol, toRow, toCol) {
        this.board.effects.forEach(effect => {
            if (effect.type !== 'laser') return;

            const [n1, n2] = effect.nodes;
            // Check if movement path crosses the laser line
            if (this.linesCross(fromRow, fromCol, toRow, toCol, n1.row, n1.col, n2.row, n2.col)) {
                let dmg = effect.damage;
                const freq = effect.frequency;

                if (freq === 'red') {
                    dmg = rollDamage(12, 15);
                    this.applyDamage(unit, dmg, null);
                    this.addLog(`${unit.name} hits a Plasma Fence for ${dmg} damage!`, 'damage');
                } else if (freq === 'yellow') {
                    unit.debuffs.push({ type: 'stunned', duration: 1 });
                    unit.debuffs.push({ type: 'blinded', duration: 1 });
                    this.addLog(`${unit.name} is stunned and blinded by Plasma Fence!`, 'special');
                } else if (freq === 'blue') {
                    unit.debuffs.push({ type: 'grounded', duration: 1 });
                    this.addLog(`${unit.name} is grounded by Plasma Fence!`, 'special');
                }
                // Green doesn't hurt
            }
        });
    }

    linesCross(r1, c1, r2, c2, r3, c3, r4, c4) {
        // Simple check: does the movement segment intersect the laser segment?
        const d1 = this.crossProduct(r3, c3, r4, c4, r1, c1);
        const d2 = this.crossProduct(r3, c3, r4, c4, r2, c2);
        const d3 = this.crossProduct(r1, c1, r2, c2, r3, c3);
        const d4 = this.crossProduct(r1, c1, r2, c2, r4, c4);

        if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
            ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
            return true;
        }
        return false;
    }

    crossProduct(r1, c1, r2, c2, r3, c3) {
        return (r2 - r1) * (c3 - c1) - (c2 - c1) * (r3 - r1);
    }

    processAutoTurrets() {
        for (let r = 0; r < BOARD_ROWS; r++) {
            for (let c = 0; c < BOARD_MAX_COLS; c++) {
                const cell = this.board.getCell(r, c);
                if (!cell || !cell.turret) continue;

                const turret = cell.turret;
                if (turret.playerId === this.currentPlayer) continue; // Turret fires during opponent's turn

                if (!turret.active) {
                    turret.active = true;
                    continue;
                }

                // Find enemies in range
                const targets = this.board.getUnitsInRadius(r, c, turret.detectionRange);
                const enemies = targets.filter(u => u.playerId === this.currentPlayer && u.isAlive);

                if (enemies.length > 0) {
                    const target = enemies[0];
                    const dmg = rollDamage(turret.damageMin, turret.damageMax);
                    this.applyDamage(target, dmg, null);
                    this.addLog(`Auto Turret fires at ${target.name} for ${dmg} damage!`, 'damage');
                }
            }
        }
    }

    processLaserHealing() {
        if (this.plasmaFenceFrequency !== 'green') return;

        this.board.effects.forEach(effect => {
            if (effect.type !== 'laser' || effect.frequency !== 'green') return;

            // Heal friendly alien units on laser squares
            const [n1, n2] = effect.nodes;
            const minR = Math.min(n1.row, n2.row);
            const maxR = Math.max(n1.row, n2.row);
            const minC = Math.min(n1.col, n2.col);
            const maxC = Math.max(n1.col, n2.col);

            for (let r = minR; r <= maxR; r++) {
                for (let c = minC; c <= maxC; c++) {
                    const cell = this.board.getCell(r, c);
                    if (cell && cell.unit && cell.unit.faction === 'aliens' &&
                        cell.unit.playerId === effect.playerId) {
                        cell.unit.hp = Math.min(cell.unit.maxHp, cell.unit.hp + 5);
                        this.addLog(`${cell.unit.name} heals 5 HP from Green Plasma Fence.`, 'heal');
                    }
                }
            }
        });
    }

    applyInfection(target, points, source) {
        if (target.faction === 'robots') return; // Immune

        target.infectionPoints = (target.infectionPoints || 0) + points;

        let threshold = 2;
        if (target.faction === 'giants') threshold = 10;

        if (target.infectionPoints >= threshold) {
            this.addLog(`${target.name} has been INFECTED and turns into a Shambler!`, 'special');

            const pos = { row: target.row, col: target.col };
            const ownerId = source ? source.playerId : this.currentPlayer;

            this.board.removeUnit(target);
            target.isAlive = false;

            if (target.size === '2x2') {
                // Giant becomes 4 shamblers
                for (let dr = 0; dr < 2; dr++) {
                    for (let dc = 0; dc < 2; dc++) {
                        const shambler = createUnitInstance('zombies', 'shambler', ownerId);
                        shambler.faction = 'zombies';
                        if (this.board.placeUnit(shambler, pos.row + dr, pos.col + dc)) {
                            this.players[ownerId].units.push(shambler);
                        }
                    }
                }
            } else {
                const shambler = createUnitInstance('zombies', 'shambler', ownerId);
                if (this.board.placeUnit(shambler, pos.row, pos.col)) {
                    this.players[ownerId].units.push(shambler);
                }
            }
        }
    }

    knockback(target, source, distance) {
        const dr = Math.sign(target.row - source.row);
        const dc = Math.sign(target.col - source.col);

        for (let i = 0; i < distance; i++) {
            const newRow = target.row + dr;
            const newCol = target.col + dc;
            if (!isValidSquare(newRow, newCol)) break;
            const cell = this.board.getCell(newRow, newCol);
            if (cell && cell.unit) break;
            this.board.moveUnit(target, newRow, newCol);
        }
    }

    pullUnit(target, puller) {
        const dr = Math.sign(puller.row - target.row);
        const dc = Math.sign(puller.col - target.col);

        let nr = target.row;
        let nc = target.col;
        while (true) {
            const nextR = nr + dr;
            const nextC = nc + dc;
            if (nextR === puller.row && nextC === puller.col) break;
            const cell = this.board.getCell(nextR, nextC);
            if (!cell || cell.unit) break;
            nr = nextR;
            nc = nextC;
        }

        if (nr !== target.row || nc !== target.col) {
            this.board.moveUnit(target, nr, nc);
            this.addLog(`${target.name} is pulled toward ${puller.name}!`, 'special');
        }
    }

    isProtectedByCover(target, attacker, attack) {
        if (attack.type === 'melee' || attack.type === 'aoe') return false;

        // Check Riot Guard Shield Wall
        const neighbors = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        for (const [dr, dc] of neighbors) {
            const cell = this.board.getCell(target.row + dr, target.col + dc);
            if (cell && cell.unit && cell.unit.passive?.name === 'Shield Wall' &&
                cell.unit.playerId === target.playerId && cell.unit.isAlive) {
                // Check if target is "behind" the guard relative to attacker
                const guardRow = cell.unit.row;
                const guardCol = cell.unit.col;
                const attackDir = Math.sign(attacker.row - target.row);
                if (guardRow - target.row === attackDir || (guardRow === target.row && guardCol - target.col === Math.sign(attacker.col - target.col))) {
                    return true;
                }
            }
        }

        // Check Forest-Walker Living Cover
        for (const [dr, dc] of neighbors) {
            for (let d2r = 0; d2r < 2; d2r++) {
                for (let d2c = 0; d2c < 2; d2c++) {
                    const cell = this.board.getCell(target.row + dr + d2r, target.col + dc + d2c);
                    if (cell && cell.unit && cell.unit.passive?.name === 'Living Cover' &&
                        cell.unit.playerId === target.playerId && cell.unit.isAlive &&
                        target.size === '1x1' && attack.range > 2) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    isFacingAway(target, attacker) {
        switch (target.facing) {
            case 'north': return attacker.row > target.row;
            case 'south': return attacker.row < target.row;
            case 'east': return attacker.col < target.col;
            case 'west': return attacker.col > target.col;
        }
        return false;
    }

    getAuraBonus(unit, bonusType) {
        const allUnits = this.board.getAllUnits();
        let bonus = 0;

        allUnits.forEach(u => {
            if (u.playerId !== unit.playerId || u.id === unit.id || !u.aura || !u.isAlive) return;
            const dist = this.board.getChebyshevDistance(u.row, u.col, unit.row, unit.col);
            if (dist <= u.aura.range) {
                if (u.aura[bonusType]) bonus += u.aura[bonusType];
            }
        });

        return bonus;
    }

    // Get Shambler effective damage considering Strength in Numbers
    getShamblerDamage(shambler) {
        const cell = this.board.getCell(shambler.row, shambler.col);
        const adjacentShamblers = this.countAdjacentShamblers(shambler);

        // Count stacked shamblers too
        let stackCount = 0;
        if (cell) stackCount = cell.stackedUnits.filter(u => u.type === 'shambler').length;

        if (adjacentShamblers + stackCount >= 2) return 5;
        return 2;
    }

    countAdjacentShamblers(unit) {
        let count = 0;
        const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        for (const [dr, dc] of dirs) {
            const cell = this.board.getCell(unit.row + dr, unit.col + dc);
            if (cell && cell.unit && cell.unit.type === 'shambler' && cell.unit.playerId === unit.playerId) {
                count++;
                count += cell.stackedUnits.filter(u => u.type === 'shambler').length;
            }
        }
        return count;
    }
}
