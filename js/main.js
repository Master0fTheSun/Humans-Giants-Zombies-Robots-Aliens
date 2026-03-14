// ============================================================
// MAIN - Application entry point, wires everything together
// ============================================================

(function () {
    let game = new GameEngine();
    let renderer = null;
    let ui = null;
    let currentSetupPlayer = 1;

    function init() {
        ui = new UIController(game, renderer);

        // Title Screen
        document.getElementById('btn-local-pvp').addEventListener('click', () => {
            currentSetupPlayer = 1;
            document.getElementById('faction-select-title').textContent =
                'Player 1 - Choose Your Faction';
            ui.showScreen('faction-select-screen');
        });

        document.getElementById('btn-vs-ai').addEventListener('click', () => {
            alert('AI mode coming soon!');
        });

        // Faction Select
        document.querySelectorAll('.faction-card').forEach(card => {
            card.addEventListener('click', () => {
                document.querySelectorAll('.faction-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');

                setTimeout(() => {
                    const faction = card.dataset.faction;
                    game.players[currentSetupPlayer].faction = faction;

                    if (currentSetupPlayer === 1) {
                        currentSetupPlayer = 2;
                        document.getElementById('faction-select-title').textContent =
                            'Player 2 - Choose Your Faction';
                        document.querySelectorAll('.faction-card').forEach(c => c.classList.remove('selected'));
                    } else {
                        ui.showScreen('wager-screen');
                    }
                }, 300);
            });
        });

        // Wager Screen
        document.getElementById('btn-confirm-wager').addEventListener('click', () => {
            const wager = parseInt(document.getElementById('wager-input').value) || 100;
            game.wager = Math.min(500, Math.max(10, wager));

            currentSetupPlayer = 1;
            startTeamBuilder(1);
        });

        // Team Builder
        document.getElementById('btn-confirm-team').addEventListener('click', () => {
            const player = game.players[currentSetupPlayer];
            if (player.team.length === 0) {
                alert('You need at least one unit!');
                return;
            }

            if (currentSetupPlayer === 1) {
                currentSetupPlayer = 2;
                startTeamBuilder(2);
            } else {
                currentSetupPlayer = 1;
                startDeployment(1);
            }
        });

        // Deployment confirm
        document.getElementById('btn-confirm-deploy').addEventListener('click', () => {
            if (!ui.isDeploymentComplete(currentSetupPlayer)) {
                alert('Place all your units before confirming!');
                return;
            }

            if (currentSetupPlayer === 1) {
                currentSetupPlayer = 2;
                startDeployment(2);
            } else {
                startGame();
            }
        });

        // End Turn
        document.getElementById('btn-end-turn').addEventListener('click', () => {
            const winner = game.endTurn();
            if (winner) {
                ui.showVictory(winner);
            } else {
                ui.updateHUD();
                ui.updateUnitInfo(null);
                document.getElementById('action-panel').innerHTML = '';
                ui.renderLog();
                renderer.selectedCell = null;
                renderer.clearHighlights();
                renderer.drawBoard(game.board, game);
            }
        });

        // Play Again
        document.getElementById('btn-play-again').addEventListener('click', () => {
            game = new GameEngine();
            ui.game = game;
            currentSetupPlayer = 1;
            ui.showScreen('title-screen');
        });
    }

    function startTeamBuilder(playerId) {
        const player = game.players[playerId];
        document.getElementById('builder-title').textContent =
            `Player ${playerId} (${FACTIONS[player.faction].name}) - Build Your Team`;
        ui.showScreen('team-builder-screen');
        ui.renderUnitRoster(player.faction, playerId);
        ui.updateBuilderUI(playerId);
    }

    function startDeployment(playerId) {
        ui.showScreen('deployment-screen');

        const canvas = document.getElementById('deploy-canvas');
        const deployRenderer = new IsometricRenderer(canvas);
        ui.renderer = deployRenderer;

        deployRenderer.drawBoard(game.board, game);
        ui.setupDeployment(playerId);
        deployRenderer.drawBoard(game.board, game);

        // Click handler
        canvas.onclick = (e) => {
            const rect = canvas.getBoundingClientRect();
            const sx = e.clientX - rect.left;
            const sy = e.clientY - rect.top;
            const { row, col } = deployRenderer.screenToGrid(sx, sy);

            if (isValidSquare(row, col)) {
                ui.handleDeployClick(row, col, playerId);
                deployRenderer.drawBoard(game.board, game);
            }
        };

        // Hover handler
        canvas.onmousemove = (e) => {
            const rect = canvas.getBoundingClientRect();
            const sx = e.clientX - rect.left;
            const sy = e.clientY - rect.top;
            const { row, col } = deployRenderer.screenToGrid(sx, sy);

            if (isValidSquare(row, col)) {
                deployRenderer.hoveredCell = { row, col };
            } else {
                deployRenderer.hoveredCell = null;
            }
            deployRenderer.drawBoard(game.board, game);
        };
    }

    function startGame() {
        ui.showScreen('game-screen');

        const canvas = document.getElementById('game-canvas');
        renderer = new IsometricRenderer(canvas);
        ui.renderer = renderer;

        game.phase = 'playing';
        game.startTurn();

        ui.updateHUD();
        ui.renderLog();
        renderer.drawBoard(game.board, game);

        // Game canvas click handler
        canvas.onclick = (e) => {
            const rect = canvas.getBoundingClientRect();
            const sx = e.clientX - rect.left;
            const sy = e.clientY - rect.top;
            const { row, col } = renderer.screenToGrid(sx, sy);

            if (isValidSquare(row, col)) {
                ui.handleGameClick(row, col);
            }
        };

        // Hover
        canvas.onmousemove = (e) => {
            const rect = canvas.getBoundingClientRect();
            const sx = e.clientX - rect.left;
            const sy = e.clientY - rect.top;
            const { row, col } = renderer.screenToGrid(sx, sy);

            if (isValidSquare(row, col)) {
                renderer.hoveredCell = { row, col };
                // Show unit info on hover
                const cell = game.board.getCell(row, col);
                if (cell && cell.unit && !game.actionMode) {
                    ui.updateUnitInfo(cell.unit);
                }
            } else {
                renderer.hoveredCell = null;
            }
            renderer.drawBoard(game.board, game);
        };
    }

    // Start
    document.addEventListener('DOMContentLoaded', init);
})();
