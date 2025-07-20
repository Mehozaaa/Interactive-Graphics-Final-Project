

let gl;
let textureProgram, solidProgram;
let uniforms = { texture: {}, solid: {} };
let attributes = { texture: {}, solid: {} };
let gameState;
let camera;
let buffers = {};
let rinkTexture;

async function init() {
    const canvas = document.getElementById('gameCanvas');
    gl = canvas.getContext('webgl');
    if (!gl) { return console.error('WebGL not supported'); }
    const statusMessage = document.getElementById('statusMessage');
    if (statusMessage) { setTimeout(() => { statusMessage.style.display = 'none'; }, 3000); }
    
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);

    if (!initShaders()) { return console.error("Halting due to shader initialization failure."); }

    await initBuffers();
    rinkTexture = createRinkTexture();

    gameState = new GameState();
    camera = new Camera(canvas);
    
    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0.05, 0.05, 0.1, 1.0);
    requestAnimationFrame(render);
}

// --- SHADER INITIALIZATION ---
function initShaders() {
    const vsTexture = `
        attribute vec3 a_position; attribute vec2 a_texCoord;
        uniform mat4 u_modelMatrix; uniform mat4 u_viewMatrix; uniform mat4 u_projMatrix;
        varying vec2 v_texCoord;
        void main() { gl_Position = u_projMatrix * u_viewMatrix * u_modelMatrix * vec4(a_position, 1.0); v_texCoord = a_texCoord; }`;
    const fsTexture = `
        precision mediump float; varying vec2 v_texCoord;
        uniform sampler2D u_texture;
        void main() { gl_FragColor = texture2D(u_texture, v_texCoord); }`;
    textureProgram = createProgram(vsTexture, fsTexture);
    if (!textureProgram) return false;
    attributes.texture = { position: gl.getAttribLocation(textureProgram, 'a_position'), texCoord: gl.getAttribLocation(textureProgram, 'a_texCoord') };
    uniforms.texture = { modelMatrix: gl.getUniformLocation(textureProgram, 'u_modelMatrix'), viewMatrix: gl.getUniformLocation(textureProgram, 'u_viewMatrix'), projMatrix: gl.getUniformLocation(textureProgram, 'u_projMatrix'), texture: gl.getUniformLocation(textureProgram, 'u_texture') };

    const vsSolid = `
        attribute vec3 a_position; attribute vec3 a_normal;
        uniform mat4 u_modelMatrix; uniform mat4 u_viewMatrix; uniform mat4 u_projMatrix;
        uniform mat3 u_normalMatrix;
        varying vec3 v_normal; varying vec3 v_worldPosition;
        void main() {
            vec4 worldPos = u_modelMatrix * vec4(a_position, 1.0);
            v_worldPosition = worldPos.xyz;
            v_normal = normalize(u_normalMatrix * a_normal);
            gl_Position = u_projMatrix * u_viewMatrix * worldPos;
        }`;
    const fsSolid = `
        precision mediump float;
        varying vec3 v_normal; varying vec3 v_worldPosition;
        uniform vec3 u_color; uniform vec3 u_cameraPosition;
        uniform vec3 u_lightPositions[2];
        uniform float u_att_constant; uniform float u_att_linear; uniform float u_att_quadratic;
        void main() {
            vec3 totalLight = vec3(0.0);
            vec3 ambient = u_color * 0.2;
            vec3 viewDir = normalize(u_cameraPosition - v_worldPosition);
            for (int i = 0; i < 2; i++) {
                vec3 lightDir = normalize(u_lightPositions[i] - v_worldPosition);
                float diff = max(dot(v_normal, lightDir), 0.0);
                vec3 diffuse = diff * u_color;
                vec3 reflectDir = reflect(-lightDir, v_normal);
                float spec = pow(max(dot(viewDir, reflectDir), 0.0), 64.0);
                vec3 specular = 0.8 * spec * vec3(1.0, 1.0, 1.0);
                float distance = length(u_lightPositions[i] - v_worldPosition);
                float attenuation = 1.0 / (u_att_constant + u_att_linear * distance + u_att_quadratic * (distance * distance));
                totalLight += (diffuse + specular) * attenuation;
            }
            gl_FragColor = vec4(ambient + totalLight, 1.0);
        }`;
    solidProgram = createProgram(vsSolid, fsSolid);
    if (!solidProgram) return false;
    attributes.solid = { position: gl.getAttribLocation(solidProgram, 'a_position'), normal: gl.getAttribLocation(solidProgram, 'a_normal') };
    uniforms.solid = {
        modelMatrix: gl.getUniformLocation(solidProgram, 'u_modelMatrix'), viewMatrix: gl.getUniformLocation(solidProgram, 'u_viewMatrix'),
        projMatrix: gl.getUniformLocation(solidProgram, 'u_projMatrix'), color: gl.getUniformLocation(solidProgram, 'u_color'),
        cameraPosition: gl.getUniformLocation(solidProgram, 'u_cameraPosition'),
        lightPositions: [gl.getUniformLocation(solidProgram, 'u_lightPositions[0]'), gl.getUniformLocation(solidProgram, 'u_lightPositions[1]')],
        normalMatrix: gl.getUniformLocation(solidProgram, 'u_normalMatrix'),
        att_constant: gl.getUniformLocation(solidProgram, 'u_att_constant'),
        att_linear: gl.getUniformLocation(solidProgram, 'u_att_linear'),
        att_quadratic: gl.getUniformLocation(solidProgram, 'u_att_quadratic')
    };
    return true;
}

// --- HELPER AND BUFFER FUNCTIONS ---
function createProgram(vsSource, fsSource) {
    const vertexShader = createShader(gl.VERTEX_SHADER, vsSource);
    const fragmentShader = createShader(gl.FRAGMENT_SHADER, fsSource);
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Unable to initialize the shader program: ' + gl.getProgramInfoLog(program));
        return null;
    }
    return program;
}
function createShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

async function initBuffers() {
    buffers.table = createGeometryBuffers(createTable());
    buffers.puck = createGeometryBuffers(createPuck());
    buffers.paddle = createGeometryBuffers(createPaddle());
    buffers.wall = createGeometryBuffers(createUnitCube());
    buffers.powerUp = createGeometryBuffers(createPowerUp());
    buffers.obstacleBox = createGeometryBuffers(createObstacleBox());
    buffers.obstacleCircle = createGeometryBuffers(createObstacleCircle());
}

function createGeometryBuffers(geometry) {
    const bufferSet = {
        vertices: gl.createBuffer(),
        indices: gl.createBuffer(),
        numIndices: geometry.indices.length
    };
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferSet.vertices);
    gl.bufferData(gl.ARRAY_BUFFER, geometry.vertices, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bufferSet.indices);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geometry.indices, gl.STATIC_DRAW);
    if (geometry.normals) {
        bufferSet.normals = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, bufferSet.normals);
        gl.bufferData(gl.ARRAY_BUFFER, geometry.normals, gl.STATIC_DRAW);
    }
    if (geometry.texCoords) {
        bufferSet.texCoords = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, bufferSet.texCoords);
        gl.bufferData(gl.ARRAY_BUFFER, geometry.texCoords, gl.STATIC_DRAW);
    }
    return bufferSet;
}
function createTransform(translation, scale = [1, 1, 1]) {
    const matrix = mat4.create();
    mat4.translate(matrix, matrix, translation);
    mat4.scale(matrix, matrix, scale);
    return matrix;
}
function createRinkTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 2048; canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#A0C0E0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#E62E2D';
    ctx.fillRect(canvas.width/2 - 5, 0, 10, canvas.height);
    ctx.strokeStyle = '#0033A0';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(canvas.width/2, canvas.height/2, 150, 0, 2 * Math.PI);
    ctx.stroke();
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    return texture;
}

// --- RENDER LOOP ---
function render(currentTime) {
    if (!gameState || !buffers.wall) return;
    gameState.update(currentTime);
    camera.update();
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const viewMatrix = camera.getViewMatrix();
    const projMatrix = camera.getProjectionMatrix();
    
    // Render Table
    gl.useProgram(textureProgram);
    gl.uniformMatrix4fv(uniforms.texture.viewMatrix, false, viewMatrix);
    gl.uniformMatrix4fv(uniforms.texture.projMatrix, false, projMatrix);
    renderObject(textureProgram, attributes.texture, buffers.table, mat4.create());

    // Render all solid objects
    gl.useProgram(solidProgram);
    gl.uniformMatrix4fv(uniforms.solid.viewMatrix, false, viewMatrix);
    gl.uniformMatrix4fv(uniforms.solid.projMatrix, false, projMatrix);
    gl.uniform3f(uniforms.solid.cameraPosition, camera.position.x, camera.position.y, camera.position.z);
    
    const lightHeight = 1.0; 
    gl.uniform3f(uniforms.solid.lightPositions[0], gameState.player1.position.x, gameState.player1.position.y, lightHeight);
    gl.uniform3f(uniforms.solid.lightPositions[1], gameState.player2.position.x, gameState.player2.position.y, lightHeight);

    gl.uniform1f(uniforms.solid.att_constant, 1.0);
    gl.uniform1f(uniforms.solid.att_linear, 0.1);
    gl.uniform1f(uniforms.solid.att_quadratic, 0.2);

    // scale paddles based on their current radius property
    const p1 = gameState.player1;
    const paddle1Scale = [p1.radius * 2, p1.radius * 2, 0.1];
    renderSolidObject(createTransform([p1.position.x, p1.position.y, 0.05], paddle1Scale), buffers.paddle, [1.0, 0.2, 0.2]);

    const p2 = gameState.player2;
    const paddle2Scale = [p2.radius * 2, p2.radius * 2, 0.1];
    renderSolidObject(createTransform([p2.position.x, p2.position.y, 0.05], paddle2Scale), buffers.paddle, [0.2, 0.2, 1.0]);
    
    // Render all pucks in the array
    gameState.pucks.forEach(puck => {
        renderSolidObject(puck.getModelMatrix(), buffers.puck, [0.1, 0.1, 0.1]);
    });

    // Render walls
    const wallColor = [0.4, 0.45, 0.5];
    renderSolidObject(createTransform([0, 2.1, 0.1], [8.4, 0.2, 0.2]), buffers.wall, wallColor);
    renderSolidObject(createTransform([0, -2.1, 0.1], [8.4, 0.2, 0.2]), buffers.wall, wallColor);
    renderSolidObject(createTransform([-4.1, 0, 0.1], [0.2, 4.4, 0.2]), buffers.wall, wallColor);
    renderSolidObject(createTransform([4.1, 0, 0.1], [0.2, 4.4, 0.2]), buffers.wall, wallColor);
    
    // Render goals with their current size
    const goalColor = [0.7, 0.7, 0.8];
    const goalHeight = 0.6;
    const postThickness = 0.1;
    
    renderSolidObject(createTransform([4.0, -gameState.goalP1.width/2 - postThickness/2, goalHeight/2], [postThickness, postThickness, goalHeight]), buffers.wall, goalColor);
    renderSolidObject(createTransform([4.0, gameState.goalP1.width/2 + postThickness/2, goalHeight/2], [postThickness, postThickness, goalHeight]), buffers.wall, goalColor);
    renderSolidObject(createTransform([4.0, 0, goalHeight + postThickness/2], [postThickness, gameState.goalP1.width + (postThickness*2), postThickness]), buffers.wall, goalColor);
    
    renderSolidObject(createTransform([-4.0, -gameState.goalP2.width/2 - postThickness/2, goalHeight/2], [postThickness, postThickness, goalHeight]), buffers.wall, goalColor);
    renderSolidObject(createTransform([-4.0, gameState.goalP2.width/2 + postThickness/2, goalHeight/2], [postThickness, postThickness, goalHeight]), buffers.wall, goalColor);
    renderSolidObject(createTransform([-4.0, 0, goalHeight + postThickness/2], [postThickness, gameState.goalP2.width + (postThickness*2), postThickness]), buffers.wall, goalColor);

    // Render obstacles
    gameState.obstacles.forEach(obstacle => {
        let bufferToUse;
        if (obstacle.shape === 'circle') {
            bufferToUse = buffers.obstacleCircle;
        } else { // 'box'
            bufferToUse = buffers.obstacleBox;
        }
        renderSolidObject(obstacle.getModelMatrix(), bufferToUse, [0.4, 0.8, 0.4]);
    });

    // Render the power-up item if it exists
    if (gameState.powerUp) {
        renderSolidObject(gameState.powerUp.getModelMatrix(), buffers.powerUp, [1.0, 0.85, 0.0]);
    }

    requestAnimationFrame(render);
}

// --- RENDER FUNCTIONS ---
function renderObject(program, attrs, bufferSet, modelMatrix) {
    gl.uniformMatrix4fv(uniforms.texture.modelMatrix, false, modelMatrix);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, rinkTexture);
    gl.uniform1i(uniforms.texture.texture, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferSet.vertices);
    gl.vertexAttribPointer(attrs.position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(attrs.position);
    if (attrs.texCoord !== -1 && bufferSet.texCoords) {
        gl.bindBuffer(gl.ARRAY_BUFFER, bufferSet.texCoords);
        gl.vertexAttribPointer(attrs.texCoord, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(attrs.texCoord);
    }
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bufferSet.indices);
    gl.drawElements(gl.TRIANGLES, bufferSet.numIndices, gl.UNSIGNED_SHORT, 0);
}
function renderSolidObject(modelMatrix, bufferSet, color) {
    gl.uniformMatrix4fv(uniforms.solid.modelMatrix, false, modelMatrix);
    gl.uniform3fv(uniforms.solid.color, color);
    const normalMatrix = mat3.create();
    mat3.normalFromMat4(normalMatrix, modelMatrix);
    gl.uniformMatrix3fv(uniforms.solid.normalMatrix, false, normalMatrix);

    gl.bindBuffer(gl.ARRAY_BUFFER, bufferSet.vertices);
    gl.vertexAttribPointer(attributes.solid.position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(attributes.solid.position);
    
    if (attributes.solid.normal !== -1 && bufferSet.normals) {
        gl.bindBuffer(gl.ARRAY_BUFFER, bufferSet.normals);
        gl.vertexAttribPointer(attributes.solid.normal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(attributes.solid.normal);
    }

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bufferSet.indices);
    gl.drawElements(gl.TRIANGLES, bufferSet.numIndices, gl.UNSIGNED_SHORT, 0);
}

window.addEventListener('load', () => { init().catch(error => console.error("Initialization failed:", error)); });
