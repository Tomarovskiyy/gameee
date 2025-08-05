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

        // Sounds (optional, can be removed if не нужны)
        this.sounds = {
            click: new Audio('click.wav'),
            flag: new Audio('flag.wav'),
            explosion: new Audio('explosion.wav')
        };
        this.sounds.click.volume = 0.3;
        this.sounds.flag.volume = 0.4;
        this.sounds.explosion.volume = 0.6;

        this.init();
    }

    init() {
        this.bindEvents();
        this.bindZoomEvents();
        this.newGame();
    }

    bindEvents() {
        document.getElementById('new-game').addEventListener('click', () => this.newGame());
        document.getElementById('restart').addEventListener('click', () => this.newGame());
        document.getElementById('difficulty').addEventListener('change', () => this.newGame());

        // Canvas click handlers
        const canvas = document.getElementById('game-canvas');
        canvas.addEventListener('click', e => {
            if (this.gameOver) return;
            const rect = canvas.getBoundingClientRect();
            const zoomedCellSize = this.cellSize * this.zoom;
            const x = Math.floor((e.clientX - rect.left) / zoomedCellSize);
            const y = Math.floor((e.clientY - rect.top) / zoomedCellSize);
            if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
                this.handleClick(x, y);
            }
        });

        canvas.addEventListener('contextmenu', e => {
            e.preventDefault();
            if (this.gameOver) return;
            const rect = canvas.getBoundingClientRect();
            const zoomedCellSize = this.cellSize * this.zoom;
            const x = Math.floor((e.clientX - rect.left) / zoomedCellSize);
            const y = Math.floor((e.clientY - rect.top) / zoomedCellSize);
            if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
                this.handleRightClick(x, y);
            }
        });
    }

    bindZoomEvents() {
        const canvas = document.getElementById('game-canvas');

        // Mouse wheel zoom
        canvas.addEventListener('wheel', (e) => {
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

        // Mobile zoom buttons (если есть)
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

    applyZoom() {
        this.renderCanvas();
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

        this.generateBoard();
        this.renderCanvas();
        this.updateUI();

        document.getElementById('game-over').classList.add('hidden');
    }

    generateBoard() {
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

        // Fisher-Yates shuffle for mine placement
        const positions = [];
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                positions.push([x, y]);
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

        // Calculate adjacent mines
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (!this.board[y][x].isMine) {
                    this.board[y][x].adjacentMines = this.countAdjacentMines(x, y);
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

    renderCanvas() {
        const canvas = document.getElementById('game-canvas');
        const ctx = canvas.getContext('2d');
    
        const zoomedCellSize = this.cellSize * this.zoom;
        canvas.width = this.width * zoomedCellSize;
        canvas.height = this.height * zoomedCellSize;
    
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    
        ctx.font = `${Math.max(8, 14 * this.zoom)}px 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
    
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const cell = this.board[y][x];
                const px = x * zoomedCellSize;
                const py = y * zoomedCellSize;
    
                // Фон клетки, имитирующий градиент .cell
                if (cell.isRevealed) {
                    // светлый фон для открытых клеток
                    const grad = ctx.createLinearGradient(px, py, px + zoomedCellSize, py + zoomedCellSize);
                    grad.addColorStop(0, '#fff');
                    grad.addColorStop(1, '#ddd');
                    ctx.fillStyle = grad;
                } else if (cell.isFlagged) {
                    // красный градиент для флагов
                    const grad = ctx.createLinearGradient(px, py, px + zoomedCellSize, py + zoomedCellSize);
                    grad.addColorStop(0, '#ff6b6b');
                    grad.addColorStop(1, '#ff5252');
                    ctx.fillStyle = grad;
                } else {
                    // светло-серый фон для закрытых клеток
                    const grad = ctx.createLinearGradient(px, py, px + zoomedCellSize, py + zoomedCellSize);
                    grad.addColorStop(0, '#f0f0f0');
                    grad.addColorStop(1, '#e0e0e0');
                    ctx.fillStyle = grad;
                }
    
                ctx.fillRect(px, py, zoomedCellSize, zoomedCellSize);
    
                // Рамка клетки
                ctx.strokeStyle = cell.isRevealed ? '#ccc' : '#999';
                ctx.lineWidth = 1;
                ctx.strokeRect(px + 0.5, py + 0.5, zoomedCellSize - 1, zoomedCellSize - 1);
    
                // Текст или иконки
                if (cell.isRevealed) {
                    if (cell.isMine) {
                        ctx.fillStyle = 'black';
                        ctx.font = `${Math.max(12, 16 * this.zoom)}px serif`;
                        ctx.fillText('💣', px + zoomedCellSize / 2, py + zoomedCellSize / 2);
                    } else if (cell.adjacentMines > 0) {
                        // Цвета чисел из стилей (number-1 ... number-8)
                        const colors = [
                            null,
                            '#1976d2',
                            '#388e3c',
                            '#d32f2f',
                            '#7b1fa2',
                            '#f57c00',
                            '#00796b',
                            '#5d4037',
                            '#424242'
                        ];
                        ctx.fillStyle = colors[cell.adjacentMines] || 'black';
                        ctx.fillText(cell.adjacentMines, px + zoomedCellSize / 2, py + zoomedCellSize / 2);
                    }
                } else if (cell.isFlagged) {
                    ctx.fillStyle = 'white';
                    ctx.font = `${Math.max(12, 16 * this.zoom)}px serif`;
                    ctx.fillText('🚩', px + zoomedCellSize / 2, py + zoomedCellSize / 2);
                }
            }
        }
    }
    
    playSound(soundName) {
        if (!this.sounds[soundName]) return;
        this.sounds[soundName].currentTime = 0;
        this.sounds[soundName].play().catch(() => {});
    }

    handleClick(x, y) {
        if (this.gameOver) return;
        const cell = this.board[y][x];
        if (cell.isRevealed || cell.isFlagged) return;

        if (!this.gameStarted) {
            this.gameStarted = true;
            this.startTimer();
        }

        this.revealCell(x, y);
        this.playSound('click');
        this.renderCanvas();
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
        this.renderCanvas();
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
            this.renderCanvas();
            return;
        }

        // Reveal adjacent empty cells (flood fill)
        if (cell.adjacentMines === 0) {
            const queue = [[x, y]];
            const visited = new Set([`${x},${y}`]);

            while (queue.length) {
                const [cx, cy] = queue.shift();

                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const nx = cx + dx;
                        const ny = cy + dy;
                        if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
                            const ncell = this.board[ny][nx];
                            const key = `${nx},${ny}`;
                            if (!visited.has(key) && !ncell.isRevealed && !ncell.isFlagged) {
                                ncell.isRevealed = true;
                                this.revealed++;
                                visited.add(key);
                                if (ncell.adjacentMines === 0) queue.push([nx, ny]);
                            }
                        }
                    }
                }
            }
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

// Инициализация игры
window.onload = () => {
    new Minesweeper();
};
