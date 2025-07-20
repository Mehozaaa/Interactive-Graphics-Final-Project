
function createTable() {
    const width = 4.0, height = 2.0;
    const vertices = [ -width, -height, 0,  width, -height, 0,   width,  height, 0, -width,  height, 0 ];
    const normals = [ 0, 0, 1,  0, 0, 1,  0, 0, 1,  0, 0, 1 ];
    const texCoords = [ 0, 0,   1, 0,   1, 1,   0, 1 ];
    const indices = [ 0, 1, 2,  0, 2, 3 ];
    return { vertices: new Float32Array(vertices), normals: new Float32Array(normals), texCoords: new Float32Array(texCoords), indices: new Uint16Array(indices) };
}

function createCylinder(segments = 24) {
    const vertices = [], normals = [], indices = [];
    const radius = 0.5, height = 0.5;
    for(let i = 0; i <= segments; i++) {
        const angle = i * 2 * Math.PI / segments;
        const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius;
        vertices.push(x, y, height, x, y, -height);
        normals.push(x, y, 0, x, y, 0);
    }
    for(let i = 0; i < segments; i++) {
        const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
        indices.push(a, b, c, b, d, c);
    }
    let base = vertices.length / 3;
    for (let i = 0; i <= segments; i++) {
        const angle = i * 2 * Math.PI / segments;
        const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius;
        vertices.push(x, y, height); normals.push(0, 0, 1);
    }
    for (let i = 0; i < segments - 1; i++) indices.push(base, base + i + 1, base + i + 2);
    base = vertices.length / 3;
    for (let i = 0; i <= segments; i++) {
        const angle = i * 2 * Math.PI / segments;
        const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius;
        vertices.push(x, y, -height); normals.push(0, 0, -1);
    }
    for (let i = 0; i < segments - 1; i++) indices.push(base, base + i + 1, base + i + 2);
    return { vertices: new Float32Array(vertices), normals: new Float32Array(normals), indices: new Uint16Array(indices) };
}

function createUnitCube() {
    const s = 0.5;
    const vertices = [ -s,-s,-s, -s,-s, s,  s,-s, s,  s,-s,-s, -s, s,-s, -s, s, s,  s, s, s,  s, s,-s, -s,-s,-s, -s, s,-s, -s, s, s, -s,-s, s, s,-s,-s,  s, s,-s,  s, s, s,  s,-s, s, -s,-s, s, -s, s, s,  s, s, s,  s,-s, s, -s,-s,-s, -s, s,-s,  s, s,-s,  s,-s,-s ];
    const normals = [ 0,-1, 0,  0,-1, 0,  0,-1, 0,  0,-1, 0, 0, 1, 0,  0, 1, 0,  0, 1, 0,  0, 1, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 1, 0, 0,  1, 0, 0,  1, 0, 0,  1, 0, 0, 0, 0, 1,  0, 0, 1,  0, 0, 1,  0, 0, 1, 0, 0,-1,  0, 0,-1,  0, 0,-s,  0, 0,-1 ];
    const indices = [ 0, 1, 2, 0, 2, 3,    4, 5, 6, 4, 6, 7,    8, 9,10, 8,10,11,   12,13,14,12,14,15,   16,17,18,16,18,19,   20,21,22,20,22,23 ];
    return { vertices: new Float32Array(vertices), normals: new Float32Array(normals), indices: new Uint16Array(indices) };
}

// Puck and Paddles are procedural cylinders
function createPuck() { return createCylinder(); }
function createPaddle() { return createCylinder(); }
function createWall() { return createUnitCube(); }
function createObstacleBox() { return createUnitCube(); }
function createObstacleCircle() { return createCylinder(); }
// Added a shape for the power-up item
function createPowerUp() { return createCylinder(); }
