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
    
    applyZoom() {
        const gameBoard = document.getElementById('game-board');
        gameBoard.style.transform = `scale(${this.zoom})`;
        const cellElements = document.querySelectorAll('.cell');
        const zoomedSize = this.cellSize * this.zoom;
        cellElements.forEach(cell => {
            cell.style.width = `${zoomedSize}px`;
            cell.style.height = `${zoomedSize}px`;
            cell.style.fontSize = `${Math.max(8, 14 * this.zoom)}px`;
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
        
        this.generateBoard();
        this.render();
        this.updateUI();
        
        document.getElementById('game-over').classList.add('hidden');
    }
    
    generateBoard() {
        // Initialize empty board
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
        
        // Optimized mine placement with Fisher-Yates shuffle
        const positions = [];
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                positions.push([x, y]);
            }
        }
        
        // Fisher-Yates shuffle
        for (let i = positions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [positions[i], positions[j]] = [positions[j], positions[i]];
        }
        
        // Take first N positions for mines
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
    
    render() {
        const gameBoard = document.getElementById('game-board');
        gameBoard.innerHTML = '';
        gameBoard.style.transform = '';
        
        // Create document fragment for better performance
        const fragment = document.createDocumentFragment();
        
        // Get viewport dimensions
        const viewport = this.getViewportDimensions();
        const maxBoardSize = Math.max(this.width, this.height);
        
        // Auto-adjust initial zoom for extremely large boards
        if (maxBoardSize > 100) {
            this.zoom = Math.max(0.05, 50 / maxBoardSize);
        } else {
            this.zoom = 1;
        }
        
        // Adjust container for scrolling
        if (this.width > 50 || this.height > 50) {
            gameBoard.parentElement.style.overflow = 'auto';
            gameBoard.style.transformOrigin = 'top left';
        }
        
        const gameContainer = document.createElement('div');
        gameContainer.style.display = 'inline-block';
        gameContainer.style.position = 'relative';
        
        for (let y = 0; y < this.height; y++) {
            const row = document.createElement('div');
            row.className = 'row';
            
            for (let x = 0; x < this.width; x++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.x = x;
                cell.dataset.y = y;
                
                cell.addEventListener('click', (e) => this.handleClick(x, y));
                cell.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    this.handleRightClick(x, y);
                });
                
                row.appendChild(cell);
            }
            
            gameContainer.appendChild(row);
            
        }
        
        fragment.appendChild(gameContainer);
        gameBoard.appendChild(fragment);
        
        // Set board dimensions
        gameBoard.style.gridTemplateColumns = `repeat(${this.width}, ${this.cellSize}px)`;
        
        this.applyZoom();
    }
    
    getViewportDimensions() {
        const container = document.querySelector('.container');
        return {
            width: container.clientWidth - 80,
            height: window.innerHeight - 200
        };
    }
    
    playSound(soundName) {
        // Reset sound to beginning before playing
        this.sounds[soundName].currentTime = 0;
        this.sounds[soundName].play().catch(() => {
            // Handle autoplay restrictions silently
        });
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
        
        // Play click sound
        this.playSound('click');
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
        
        this.updateCell(x, y);
        this.updateUI();
        
        // Play flag sound
        this.playSound('flag');
    }
    
    revealCell(x, y) {
        const cell = this.board[y][x];
        if (cell.isRevealed || cell.isFlagged) return;
        
        cell.isRevealed = true;
        this.revealed++;
        
        if (cell.isMine) {
            // Play explosion sound
            this.playSound('explosion');
            this.gameOver = true;
            this.revealAllMines();
            this.endGame(false);
            return;
        }
        
        this.updateCell(x, y);
        
        // Batch reveal for empty areas (optimized for large boards)
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
            
            // Batch update cells
            toReveal.forEach(([rx, ry]) => this.updateCell(rx, ry));
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
                    this.updateCell(x, y);
                }
            }
        }
    }
    
    updateCell(x, y) {
        const cell = this.board[y][x];
        const element = document.querySelector(`[data-x="${x}"][data-y="${y}"]`);
        if (!element) return;
        
        element.className = 'cell';
        
        if (cell.isRevealed) {
            element.classList.add('revealed');
            
            if (cell.isMine) {
                element.classList.add('mine');
                element.textContent = '💣';
            } else if (cell.adjacentMines > 0) {
                element.classList.add(`number-${cell.adjacentMines}`);
                element.textContent = cell.adjacentMines;
            } else {
                element.textContent = '';
            }
        } else if (cell.isFlagged) {
            element.classList.add('flagged');
            element.textContent = '🚩';
        } else {
            element.textContent = '';
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