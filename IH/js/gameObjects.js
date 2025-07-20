

class GameObject {
    constructor(x = 0, y = 0, z = 0) {
        this.position = { x, y, z };
        this.scale = { x: 1, y: 1, z: 1 };
        this.active = true;
    }
    getModelMatrix() {
        const matrix = mat4.create();
        mat4.translate(matrix, matrix, [this.position.x, this.position.y, this.position.z]);
        mat4.scale(matrix, matrix, [this.scale.x, this.scale.y, this.scale.z]);
        return matrix;
    }
}

class PowerUp extends GameObject {
    constructor(x, y) {
        super(x, y, 0.05);
        this.radius = 0.15;
        this.scale = { x: 0.3, y: 0.3, z: 0.1 };
        const types = ['FAST_PUCK', 'BIG_PADDLE', 'MULTI_PUCK', 'SMALL_GOAL'];
        this.type = types[Math.floor(Math.random() * types.length)];
    }
}

class Obstacle extends GameObject {
    constructor(x, y, shape) {
        super(x, y, 0.05);
        this.shape = shape;
        this.lifetime = 6.0;
        if (this.shape === 'circle') {
            this.radius = 0.2 + Math.random() * 0.2;
            this.scale = { x: this.radius * 2, y: this.radius * 2, z: 0.1 };
        } else { // 'box'
            this.width = 0.3 + Math.random() * 0.4;
            this.height = 0.3 + Math.random() * 0.4;
            this.scale = { x: this.width, y: this.height, z: 0.1 };
        }
    }
    update(deltaTime) {
        this.lifetime -= deltaTime;
        if (this.lifetime <= 0) this.active = false;
    }
}

class Puck extends GameObject {
    constructor(x = 0, y = 0) {
        super(x, y, 0.04);
        this.radius = 0.08;
        this.velocity = { x: 0, y: 0 };
        this.scale = { x: 0.16, y: 0.16, z: 0.08 };
    }
    update(deltaTime, speedMultiplier = 1.0) {
        this.position.x += this.velocity.x * deltaTime * speedMultiplier;
        this.position.y += this.velocity.y * deltaTime * speedMultiplier;
        this.velocity.x *= 0.985;
        this.velocity.y *= 0.985;
    }
}

class Paddle extends GameObject {
    constructor(x = 0, y = 0) {
        super(x, y, 0.05);
        this.baseRadius = 0.25;
        this.radius = this.baseRadius;
        this.speed = 4.0;
        this.tableBounds = { minX: -3.8, maxX: 3.8, minY: -2.0, maxY: 2.0 };
    }
    move(dx, dy, deltaTime) {
        let currentBounds = { ...this.tableBounds };
        if (this.position.x <= 0) {
            currentBounds.maxX = 0 - this.radius;
        } else {
            currentBounds.minX = 0 + this.radius;
        }
        const moveX = dx * this.speed * deltaTime;
        const moveY = dy * this.speed * deltaTime;
        this.position.x = Math.max(currentBounds.minX, Math.min(currentBounds.maxX, this.position.x + moveX));
        this.position.y = Math.max(currentBounds.minY + this.radius, Math.min(currentBounds.maxY - this.radius, this.position.y + moveY));
    }
}

class GameState {
    constructor() {
        this.pucks = [];
        this.powerUp = null;
        this.player1 = new Paddle(-3.0, 0);
        this.player2 = new Paddle(3.0, 0);
        this.goalP1 = { width: 1.2, baseWidth: 1.2 };
        this.goalP2 = { width: 1.2, baseWidth: 1.2 };
        this.score = { player1: 0, player2: 0 };
        this.keys = {};
        this.setupInput();
        this.lastTime = 0;
        this.obstacles = [];
        this.obstacleSpawnTimer = 3.0;
        this.powerUpSpawnTimer = 10.0;
        this.activePowerUp = null;
        this.powerUpTimer = 0;
        this.powerUpDuration = 10.0;
        this.puckSpeedMultiplier = 1.0;
        this.resetPuck(true);
        this.updateScoreDisplay();
    }

    setupInput() {
        document.addEventListener('keydown', (e) => { this.keys[e.key.toLowerCase()] = true; });
        document.addEventListener('keyup', (e) => { this.keys[e.key.toLowerCase()] = false; });
    }

    updateScoreDisplay() {
        document.getElementById('player1Score').textContent = this.score.player1;
        document.getElementById('player2Score').textContent = this.score.player2;
    }

    resetPuck(initial = false) {
        this.pucks = [];
        this.pucks.push(new Puck(0, 0));
        if (!initial) {
            this.deactivatePowerUp();
        }
    }

    resetPaddles() {
        this.player1.position.x = -3.0; this.player1.position.y = 0;
        this.player2.position.x = 3.0; this.player2.position.y = 0;
    }

    spawnObstacle() {
        const shapes = ['box', 'circle'];
        const shape = shapes[Math.floor(Math.random() * shapes.length)];
        const x = (Math.random() - 0.5) * 5;
        const y = (Math.random() - 0.5) * 3;
        this.obstacles.push(new Obstacle(x, y, shape));
    }

    spawnPowerUp() {
        if (!this.powerUp) {
            const x = (Math.random() - 0.5) * 4;
            const y = (Math.random() - 0.5) * 2;
            this.powerUp = new PowerUp(x, y);
        }
    }
    
    activatePowerUp(player, powerUpType) {
        if (this.activePowerUp) this.deactivatePowerUp();
        console.log(`Player ${(player === this.player1 ? 1 : 2)} activated ${powerUpType}!`);
        this.activePowerUp = { player, type: powerUpType };
        this.powerUpTimer = this.powerUpDuration;

        switch(powerUpType) {
            case 'MULTI_PUCK':
                this.pucks.push(new Puck(0.2, 0.2));
                this.pucks.push(new Puck(-0.2, -0.2));
                break;
            case 'BIG_PADDLE':
                player.radius = player.baseRadius * 1.5;
                break;
            case 'SMALL_GOAL':
                const opponentGoal = (player === this.player1) ? this.goalP2 : this.goalP1;
                opponentGoal.width = opponentGoal.baseWidth * 0.4;
                break;
            case 'FAST_PUCK':
                this.puckSpeedMultiplier = 2.0;
                break;
        }
    }
    
    deactivatePowerUp() {
        if (!this.activePowerUp) return;
        console.log(`Deactivating ${this.activePowerUp.type}`);
        const { player, type } = this.activePowerUp;

        switch(type) {
            case 'MULTI_PUCK':
                if (this.pucks.length > 1) this.pucks = [this.pucks[0]];
                break;
            case 'BIG_PADDLE':
                player.radius = player.baseRadius;
                break;
            case 'SMALL_GOAL':
                this.goalP1.width = this.goalP1.baseWidth;
                this.goalP2.width = this.goalP2.baseWidth;
                break;
            case 'FAST_PUCK':
                this.puckSpeedMultiplier = 1.0;
                break;
        }
        
        this.activePowerUp = null;
        this.powerUpTimer = 0;
    }

    update(currentTime) {
        const deltaTime = Math.min((currentTime - this.lastTime) / 1000.0, 0.016);
        this.lastTime = currentTime;

        if (this.keys['a']) this.player1.move(-1, 0, deltaTime);
        if (this.keys['d']) this.player1.move(1, 0, deltaTime);
        if (this.keys['w']) this.player1.move(0, 1, deltaTime);
        if (this.keys['s']) this.player1.move(0, -1, deltaTime);
        if (this.keys['arrowleft']) this.player2.move(-1, 0, deltaTime);
        if (this.keys['arrowright']) this.player2.move(1, 0, deltaTime);
        if (this.keys['arrowup']) this.player2.move(0, 1, deltaTime);
        if (this.keys['arrowdown']) this.player2.move(0, -1, deltaTime);

        this.pucks.forEach(puck => puck.update(deltaTime, this.puckSpeedMultiplier));

        this.obstacleSpawnTimer -= deltaTime;
        if (this.obstacleSpawnTimer <= 0) {
            this.spawnObstacle();
            this.obstacleSpawnTimer = 3.0 + Math.random() * 2.0;
        }
        this.obstacles.forEach(obstacle => obstacle.update(deltaTime));
        this.obstacles = this.obstacles.filter(obstacle => obstacle.active);

        this.powerUpSpawnTimer -= deltaTime;
        if (this.powerUpSpawnTimer <= 0) {
            this.spawnPowerUp();
            this.powerUpSpawnTimer = 10.0 + Math.random() * 5.0;
        }
        if (this.activePowerUp) {
            this.powerUpTimer -= deltaTime;
            if (this.powerUpTimer <= 0) {
                this.deactivatePowerUp();
            }
        }

        this.checkAllCollisions();
    }
    
    checkAllCollisions() {
        let goalWasScored = false;
        this.pucks.forEach((puck) => {
            if (goalWasScored) return;

            // Puck to Paddle (circle-circle collision)
            [this.player1, this.player2].forEach(paddle => {
                const dx = puck.position.x - paddle.position.x;
                const dy = puck.position.y - paddle.position.y;
                const distanceSq = dx * dx + dy * dy;
                const totalRadius = puck.radius + paddle.radius;
                if (distanceSq < totalRadius * totalRadius) {
                    const distance = Math.sqrt(distanceSq) || 1;
                    puck.velocity.x = (dx / distance) * 7.0;
                    puck.velocity.y = (dy / distance) * 7.0;
                }
            });

            // Puck to Obstacle
            this.obstacles.forEach(obstacle => {
                if (obstacle.shape === 'box') {
                    const closestX = Math.max(obstacle.position.x - obstacle.width / 2, Math.min(puck.position.x, obstacle.position.x + obstacle.width / 2));
                    const closestY = Math.max(obstacle.position.y - obstacle.height / 2, Math.min(puck.position.y, obstacle.position.y + obstacle.height / 2));
                    const dx = puck.position.x - closestX;
                    const dy = puck.position.y - closestY;
                    if ((dx * dx + dy * dy) < (puck.radius * puck.radius)) {
                        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
                        puck.velocity.x = (dx / distance) * 5.0;
                        puck.velocity.y = (dy / distance) * 5.0;
                    }
                } else if (obstacle.shape === 'circle') {
                    const totalRadius = puck.radius + obstacle.radius;
                    const dx = puck.position.x - obstacle.position.x;
                    const dy = puck.position.y - obstacle.position.y;
                    if ((dx * dx + dy * dy) < (totalRadius * totalRadius)) {
                        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
                        puck.velocity.x = (dx / distance) * 5.0;
                        puck.velocity.y = (dy / distance) * 5.0;
                    }
                }
            });
            
            // Side Wall collisions
            if (puck.position.y + puck.radius > 2.0 || puck.position.y - puck.radius < -2.0) {
                puck.velocity.y *= -1; puck.position.y = Math.sign(puck.position.y) * (2.0 - puck.radius);
            }
        
            // Goal and Back Wall Logic
            if (puck.position.x - puck.radius < -4.0) {
                if (Math.abs(puck.position.y) < this.goalP2.width / 2) {
                    this.score.player2++; this.updateScoreDisplay(); this.resetPuck(); this.resetPaddles();
                    goalWasScored = true;
                } else { puck.velocity.x *= -1; puck.position.x = -4.0 + puck.radius; }
            } else if (puck.position.x + puck.radius > 4.0) {
                if (Math.abs(puck.position.y) < this.goalP1.width / 2) {
                    this.score.player1++; this.updateScoreDisplay(); this.resetPuck(); this.resetPaddles();
                    goalWasScored = true;
                } else { puck.velocity.x *= -1; puck.position.x = 4.0 - puck.radius; }
            }
        });
        
        // Paddle to Obstacle
        [this.player1, this.player2].forEach(paddle => {
            this.obstacles.forEach(obstacle => {
                if (obstacle.shape === 'box') {
                    const closestX = Math.max(obstacle.position.x - obstacle.width / 2, Math.min(paddle.position.x, obstacle.position.x + obstacle.width / 2));
                    const closestY = Math.max(obstacle.position.y - obstacle.height / 2, Math.min(paddle.position.y, obstacle.position.y + obstacle.height / 2));
                    const dx = paddle.position.x - closestX;
                    const dy = paddle.position.y - closestY;
                    if ((dx * dx + dy * dy) < (paddle.radius * paddle.radius)) {
                        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
                        const overlap = paddle.radius - distance;
                        paddle.position.x += (dx / distance) * overlap;
                        paddle.position.y += (dy / distance) * overlap;
                    }
                } else if (obstacle.shape === 'circle') {
                    const totalRadius = paddle.radius + obstacle.radius;
                    const dx = paddle.position.x - obstacle.position.x;
                    const dy = paddle.position.y - obstacle.position.y;
                    if ((dx*dx + dy*dy) < (totalRadius * totalRadius)) {
                        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
                        const overlap = totalRadius - distance;
                        paddle.position.x += (dx / distance) * overlap;
                        paddle.position.y += (dy / distance) * overlap;
                    }
                }
            });
        });

        // <<< THE CRITICAL FIX IS HERE
        // Paddle to Power-up
        if (this.powerUp) {
            // use a for-of so we can break as soon as one paddle picks it up
            for (const paddle of [this.player1, this.player2]) {
                const totalRadius = paddle.radius + this.powerUp.radius;
                const dx = paddle.position.x - this.powerUp.position.x;
                const dy = paddle.position.y - this.powerUp.position.y;
                if ((dx * dx + dy * dy) < (totalRadius * totalRadius)) {
                    this.activatePowerUp(paddle, this.powerUp.type);
                    this.powerUp = null;
                    break;   // stop checking the other paddle
                }
            }
        }
    }
}
