

class Camera {
    constructor(canvas) {
        this.canvas = canvas;
        this.position = { x: 0, y: -7, z: 5 }; 
        this.target = { x: 0, y: 0, z: 0 };  
        this.up = { x: 0, y: 0, z: 1 };       
        this.setupControls();
    }
    
    setupControls() {
        document.addEventListener('keydown', (e) => {
            if (e.key === '1') this.setTopView();
            if (e.key === '2') this.setSideView();
            if (e.key === '3') this.setPerspectiveView();
        });
    }

    setTopView() {
        this.position = { x: 0, y: 0, z: 8 };
        this.target = { x: 0, y: 0, z: 0 };
        this.up = { x: 0, y: 1, z: 0 };
    }

    setSideView() {
        this.position = { x: -7, y: 0, z: 2 };
        this.target = { x: 0, y: 0, z: 0 };
        this.up = { x: 0, y: 0, z: 1 };
    }
    
    setPerspectiveView() {
        this.position = { x: 0, y: -7, z: 5 };
        this.target = { x: 0, y: 0, z: 0 };
        this.up = { x: 0, y: 0, z: 1 };
    }

    update() { /* No update logic needed for static views for now */ }
    
    getViewMatrix() {
        const viewMatrix = mat4.create();
        mat4.lookAt(viewMatrix, 
            [this.position.x, this.position.y, this.position.z],
            [this.target.x, this.target.y, this.target.z],
            [this.up.x, this.up.y, this.up.z]
        );
        return viewMatrix;
    }
    
    getProjectionMatrix() {
        const projMatrix = mat4.create();
        const aspectRatio = this.canvas.width / this.canvas.height;
        mat4.perspective(projMatrix, Math.PI / 4, aspectRatio, 0.1, 100.0);
        return projMatrix;
    }
}
