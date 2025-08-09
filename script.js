class Minesweeper {
    constructor() {
        this.board = [];
        this.width = 9;
        this.height = 9;
        this.mines = 10;
        this.revealed = 0;
        this.flagged = 0;
        this.gameStarted = false;
        this.gameOver = false;
        this.timer = 0;
        this.timerInterval = null;
        this.zoom = 1;
        this.cellSize = 30;

        // Для виртуализации — размер видимой области
        this.VIEW_WIDTH = 30;
        this.VIEW_HEIGHT = 20;
        this.offsetX = 0;
        this.offsetY = 0;

        this.difficulties = {
            easy: { width: 9, height: 9, mines: 10 },
            medium: { width: 16, height: 16, mines: 40 },
            hard: { width: 30, height: 16, mines: 99 },
            extreme50: { width: 50, height: 50, mines: 400 },
            extreme100: { width: 100, height: 100, mines: 1600 },
            extreme200: { width: 200, height: 200, mines: 6400 },
            extreme500: { width: 500, height: 500, mines: 40000 },
            extreme1000: { width: 1000, height: 1000, mines: 160000 }
        };

        // Sound effects
        this.sounds = {
            click: new Audio('click.wav' || 'click.mp3'),
            flag: new Audio('flag.wav'),
            explosion: new Audio('explosion.wav')
        };

        // Set volume levels
        this.sounds.click.volume = 0.3;
        this.sounds.flag.volume = 0.4;
        this.sounds.explosion.volume = 0.6;

        this.init();
    }

    init() {
        this.bindEvents();
        this.bindZoomEvents();
        this.bindScrollEvents(); // добавляем слушатели для управления смещением (виртуализация)
        this.newGame();
    }

    bindEvents() {
        document.getElementById('new-game').addEventListener('click', () => this.newGame());
        document.getElementById('restart').addEventListener('click', () => this.newGame());
        document.getElementById('difficulty').addEventListener('change', () => this.newGame());
    }

    bindZoomEvents() {
        const gameBoard = document.getElementById('game-board');

        // Mouse wheel zoom
        gameBoard.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            this.zoom = Math.max(0.1, Math.min(3, this.zoom + delta));
            this.applyZoom();
        });

        // Keyboard zoom
        document.addEventListener('keydown', (e) => {
            if (e.key === '+' || e.key === '=') {
                this.zoom = Math.min(3, this.zoom + 0.2);
                this.applyZoom();
            } else if (e.key === '-') {
                this.zoom = Math.max(0.1, this.zoom - 0.2);
                this.applyZoom();
            }
        });

        // Mobile zoom buttons
        const zoomInBtn = document.getElementById('zoom-in');
        const zoomOutBtn = document.getElementById('zoom-out');

        if (zoomInBtn && zoomOutBtn) {
            zoomInBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.zoom = Math.min(3, this.zoom + 0.2);
                this.applyZoom();
            });

            zoomOutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.zoom = Math.max(0.1, this.zoom - 0.2);
                this.applyZoom();
            });

            // Touch support for buttons
            let zoomInterval;
            const startZoom = (direction) => {
                zoomInterval = setInterval(() => {
                    this.zoom = Math.max(0.1, Math.min(3, this.zoom + direction * 0.1));
                    this.applyZoom();
                }, 100);
            };

            const stopZoom = () => {
                clearInterval(zoomInterval);
            };

            zoomInBtn.addEventListener('touchstart', () => startZoom(0.2));
            zoomInBtn.addEventListener('touchend', stopZoom);
            zoomInBtn.addEventListener('touchcancel', stopZoom);

            zoomOutBtn.addEventListener('touchstart', () => startZoom(-0.2));
            zoomOutBtn.addEventListener('touchend', stopZoom);
            zoomOutBtn.addEventListener('touchcancel', stopZoom);
        }
    }

    // Добавляем управление стрелками для "камеры" виртуализации
    bindScrollEvents() {
        document.addEventListener('keydown', (e) => {
            let changed = false;
            if (e.key === 'ArrowUp' && this.offsetY > 0) {
                this.offsetY--;
                changed = true;
            }
            if (e.key === 'ArrowDown' && this.offsetY < this.height - this.VIEW_HEIGHT) {
                this.offsetY++;
                changed = true;
            }
            if (e.key === 'ArrowLeft' && this.offsetX > 0) {
                this.offsetX--;
                changed = true;
            }
            if (e.key === 'ArrowRight' && this.offsetX < this.width - this.VIEW_WIDTH) {
                this.offsetX++;
                changed = true;
            }
            if (changed) {
                this.render(); // перерисовываем видимую область
            }
        });
    }

    applyZoom() {
        const gameBoard = document.getElementById('game-board');
        gameBoard.style.transform = `scale(${this.zoom})`;
        const zoomedSize = this.cellSize * this.zoom;
        gameBoard.style.width = `${this.VIEW_WIDTH * zoomedSize}px`;
        gameBoard.style.height = `${this.VIEW_HEIGHT * zoomedSize}px`;

        // Подстраиваем все видимые клетки (если нужно)
        const cellElements = document.querySelectorAll('.cell');
        cellElements.forEach(cell => {
            cell.style.width = `${zoomedSize}px`;
            cell.style.height = `${zoomedSize}px`;
            cell.style.fontSize = `${Math.max(8, 14 * this.zoom)}px`;
            cell.style.lineHeight = `${zoomedSize}px`;
        });
    }

    newGame() {
        const difficulty = document.getElementById('difficulty').value;
        const config = this.difficulties[difficulty];

        this.width = config.width;
        this.height = config.height;
        this.mines = config.mines;

        this.board = [];
        this.revealed = 0;
        this.flagged = 0;
        this.gameStarted = false;
        this.gameOver = false;
        this.timer = 0;
        this.zoom = 1;

        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }

        // Сбрасываем камеру в 0,0
        this.offsetX = 0;
        this.offsetY = 0;

        this.generateBoard();
        this.render();
        this.updateUI();

        document.getElementById('game-over').classList.add('hidden');
    }

    generateBoard(firstX, firstY) {
        this.board = [];
        for (let y = 0; y < this.height; y++) {
            this.board[y] = [];
            for (let x = 0; x < this.width; x++) {
                this.board[y][x] = {
                    x, y,
                    isMine: false,
                    isRevealed: false,
                    isFlagged: false,
                    adjacentMines: 0
                };
            }
        }

        const positions = [];
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const isSafeZone = Math.abs(x - firstX) <= 1 && Math.abs(y - firstY) <= 1;
                if (!isSafeZone) positions.push([x, y]);
            }
        }

        for (let i = positions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [positions[i], positions[j]] = [positions[j], positions[i]];
        }

        for (let i = 0; i < this.mines; i++) {
            const [x, y] = positions[i];
            this.board[y][x].isMine = true;
        }

        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (!this.board[y][x].isMine) {
                    this.board[y][x].adjacentMines = this.countAdjacentMines(x, y);
                }
            }
        }
    }

    handleDoubleClick(x, y) {
        const cell = this.board[y][x];
        if (!cell.isRevealed || cell.isMine) return;

        const flagsAround = this.countFlagsAround(x, y);
        if (flagsAround === cell.adjacentMines) {
            this.openNeighbors(x, y);
        }
    }

    countFlagsAround(x, y) {
        let count = 0;
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
                    if (this.board[ny][nx].isFlagged) count++;
                }
            }
        }
        return count;
    }

    openNeighbors(x, y) {
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
                    this.revealCell(nx, ny);
                }
            }
        }
    }

    countAdjacentMines(x, y) {
        let count = 0;
        const minY = Math.max(0, y - 1);
        const maxY = Math.min(this.height - 1, y + 1);
        const minX = Math.max(0, x - 1);
        const maxX = Math.min(this.width - 1, x + 1);

        for (let dy = minY; dy <= maxY; dy++) {
            for (let dx = minX; dx <= maxX; dx++) {
                if (this.board[dy][dx].isMine) count++;
            }
        }
        return count;
    }

    // **Изменённый метод render — виртуализация рендера**
    render() {
        const gameBoard = document.getElementById('game-board');
        gameBoard.innerHTML = '';
        gameBoard.style.position = 'relative';
        gameBoard.style.width = `${this.VIEW_WIDTH * this.cellSize}px`;
        gameBoard.style.height = `${this.VIEW_HEIGHT * this.cellSize}px`;
        gameBoard.style.overflow = 'hidden';
        gameBoard.style.background = '#ddd';

        const zoomedCellSize = this.cellSize * this.zoom;

        // Создаём фрагмент для добавления клеток
        const fragment = document.createDocumentFragment();

        for (let y = 0; y < this.VIEW_HEIGHT; y++) {
            for (let x = 0; x < this.VIEW_WIDTH; x++) {
                const globalX = x + this.offsetX;
                const globalY = y + this.offsetY;

                if (globalX >= this.width || globalY >= this.height) continue;

                const cellData = this.board[globalY][globalX];

                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.style.position = 'absolute';
                cell.style.left = `${x * zoomedCellSize}px`;
                cell.style.top = `${y * zoomedCellSize}px`;
                cell.style.width = `${zoomedCellSize}px`;
                cell.style.height = `${zoomedCellSize}px`;
                cell.style.lineHeight = `${zoomedCellSize}px`;
                cell.style.textAlign = 'center';
                cell.style.border = '1px solid #999';
                cell.style.userSelect = 'none';
                cell.style.fontSize = `${Math.max(8, 14 * this.zoom)}px`;
                cell.dataset.x = globalX;
                cell.dataset.y = globalY;

                cell.addEventListener('click', () => this.handleClick(globalX, globalY));
                cell.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    this.handleRightClick(globalX, globalY);
                });

                if (cellData.isRevealed) {
                    cell.classList.add('revealed');

                    if (cellData.isMine) {
                        cell.classList.add('mine');
                        cell.textContent = '💣';
                    } else if (cellData.adjacentMines > 0) {
                        cell.classList.add(`number-${cellData.adjacentMines}`);
                        cell.textContent = cellData.adjacentMines;
                    }
                } else if (cellData.isFlagged) {
                    cell.classList.add('flagged');
                    cell.textContent = '🚩';
                }

                fragment.appendChild(cell);
            }
        }

        gameBoard.appendChild(fragment);
    }

    playSound(soundName) {
        this.sounds[soundName].currentTime = 0;
        this.sounds[soundName].play().catch(() => {});
    }

    handleClick(x, y) {
        if (this.gameOver) return;

        if (!this.gameStarted) {
            this.gameStarted = true;
            this.startTimer();
            this.generateBoard(x, y);
        }

        const cell = this.board[y][x];
        if (cell.isRevealed || cell.isFlagged) return;

        this.revealCell(x, y);
        this.playSound('click');
        this.render(); // обновляем отображение после клика
    }

    handleRightClick(x, y) {
        if (this.gameOver) return;

        const cell = this.board[y][x];
        if (cell.isRevealed) return;

        if (!this.gameStarted) {
            this.gameStarted = true;
            this.startTimer();
        }

        cell.isFlagged = !cell.isFlagged;
        this.flagged += cell.isFlagged ? 1 : -1;

        this.updateUI();
        this.playSound('flag');
        this.render(); // обновляем отображение после установки флага
    }

    revealCell(x, y) {
        const cell = this.board[y][x];
        if (cell.isRevealed || cell.isFlagged) return;

        cell.isRevealed = true;
        this.revealed++;

        if (cell.isMine) {
            this.playSound('explosion');
            this.gameOver = true;
            this.revealAllMines();
            this.endGame(false);
            this.render();
            return;
        }

        // Рекурсивное открытие пустых соседних клеток
        if (cell.adjacentMines === 0) {
            const toReveal = [];
            const visited = new Set();
            const queue = [[x, y]];

            while (queue.length > 0) {
                const [cx, cy] = queue.shift();
                const key = `${cx},${cy}`;

                if (visited.has(key)) continue;
                visited.add(key);

                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const nx = cx + dx;
                        const ny = cy + dy;

                        if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
                            const nextCell = this.board[ny][nx];
                            if (!nextCell.isRevealed && !nextCell.isFlagged) {
                                nextCell.isRevealed = true;
                                this.revealed++;
                                toReveal.push([nx, ny]);

                                if (nextCell.adjacentMines === 0) {
                                    queue.push([nx, ny]);
                                }
                            }
                        }
                    }
                }
            }

            toReveal.forEach(([rx, ry]) => {});
        }

        if (this.revealed === this.width * this.height - this.mines) {
            this.gameOver = true;
            this.endGame(true);
        }

        this.updateUI();
    }

    revealAllMines() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const cell = this.board[y][x];
                if (cell.isMine && !cell.isRevealed) {
                    cell.isRevealed = true;
                }
            }
        }
    }

    updateUI() {
        document.getElementById('mine-count').textContent = this.mines.toLocaleString();
        document.getElementById('flag-count').textContent = this.flagged.toLocaleString();
        document.getElementById('timer').textContent = this.timer.toString().padStart(3, '0');
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            this.timer++;
            this.updateUI();
        }, 1000);
    }

    endGame(won) {
        clearInterval(this.timerInterval);

        const result = document.getElementById('game-result');
        result.textContent = won ? `Победа! 🎉 ${(this.timer * 1000 / this.revealed).toFixed(2)}ms/ячеек` : 'Поражение! 💥';
        result.style.color = won ? '#4caf50' : '#f44336';

        document.getElementById('game-over').classList.remove('hidden');
    }
}

// Initialize game
new Minesweeper();
