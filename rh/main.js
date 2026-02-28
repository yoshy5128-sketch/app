import * as THREE from 'https://unpkg.com/three@0.162.0/build/three.module.js';
import RapierModule from 'https://cdn.skypack.dev/@dimforge/rapier3d-compat@0.13.0'; // Direct import of Rapier.js default export

let scene, camera, renderer;
let world; 
let RAPIER; // Declare RAPIER here to hold the initialized Rapier object

const cars = [];
const CAR_WIDTH = 2;
const CAR_HEIGHT = 1.5;
const CAR_LENGTH = 4;
const ROAD_WIDTH = 6 * 3.5; // 6 lanes, approx 3.5m per lane
const LANE_WIDTH = ROAD_WIDTH / 6;
const CAR_SPEED_MIN = 20 / 3.6; // m/s (20 km/h)
const CAR_SPEED_MAX = 120 / 3.6; // m/s (120 km/h)
const SPAWN_INTERVAL_MS = 1000; // milliseconds
let lastSpawnTime = 0;
const ROAD_LENGTH = 300; // Make road longer for cars to travel further
const CAR_LIFESPAN_Z = 200; // Z-distance before cars are removed

let ragdoll = {}; // To store ragdoll body parts and rigid bodies

const RAGDOLL_MASS = 60; // kg
const RAGDOLL_MOVE_FORCE = 100; // Force for walking
const RAGDOLL_DASH_FORCE = 300; // Force for dashing
const RAGDOLL_UPRIGHT_STRENGTH = 10; // How strongly the ragdoll tries to stand up

// Player Input State (PC & Mobile)
let moveForward = false;
let moveBackward = false;
let isDashing = false;
let lastForwardPressTime = 0;
let lastBackwardPressTime = 0;
const DASH_PRESS_THRESHOLD = 300; // ms for double press

// Camera control state
const cameraDistance = { current: 20, target: 20, min: 5, max: 50 }; // Initial, min, max distance from ragdoll
let isPanning = false;
let lastMouseX = 0;
let lastMouseY = 0;
let cameraAngle = { current: 0, target: 0 }; // Angle around the ragdoll in Y-axis
const cameraRotationSpeed = 0.005; // Mouse/Touch sensitivity

let initialPinchDistance = 0;
let isPinching = false;


const init = async () => {
    // Initialize Rapier.js
    RAPIER = await RapierModule.init(); // Initialize and store the returned object
    world = new RAPIER.World({ x: 0.0, y: -9.81, z: 0.0 });


    scene = new THREE.Scene();
    // Add a fog to simulate distance and reduce rendering load
    scene.fog = new THREE.Fog(0xcccccc, 50, 200);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true, canvas: document.getElementById('game-canvas') });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.getElementById('game-container').appendChild(renderer.domElement);

    // Basic lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7);
    directionalLight.castShadow = true; // Enable shadows
    directionalLight.shadow.mapSize.width = 1024; // default
    directionalLight.shadow.mapSize.height = 1024; // default
    directionalLight.shadow.camera.near = 0.5; // default
    directionalLight.shadow.camera.far = 50; // default
    directionalLight.shadow.camera.left = -50;
    directionalLight.shadow.camera.right = 50;
    directionalLight.shadow.camera.top = 50;
    directionalLight.shadow.camera.bottom = -50;
    scene.add(directionalLight);

    // Add a helper for the directional light's shadow camera (for debugging)
    // const helper = new THREE.CameraHelper(directionalLight.shadow.camera);
    // scene.add(helper);


    camera.position.set(0, 10, 40); // Initial camera position, further back to see more road
    camera.lookAt(0, 0, 0);

    // --- Create Road ---
    const roadGeometry = new THREE.PlaneGeometry(ROAD_WIDTH, ROAD_LENGTH);
    const roadMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const road = new THREE.Mesh(roadGeometry, roadMaterial);
    road.rotation.x = -Math.PI / 2; // Rotate to lie flat
    road.position.z = -ROAD_LENGTH / 2 + 50; // Shift road to be visible from camera
    road.receiveShadow = true; // Road receives shadows
    scene.add(road);

    // Add lane markings
    // Dashed lines for traffic lanes (3 lanes each direction)
    const dashLength = 5;
    const gapLength = 5;
    const totalDashPatternLength = dashLength + gapLength;
    const numDashes = ROAD_LENGTH / totalDashPatternLength;

    for (let i = 0; i < 3; i++) { // For the 3 lanes in each direction
        // Lane markings for one direction (e.g., right side of middle)
        let xOffset = (1.5 + i) * LANE_WIDTH - (ROAD_WIDTH / 2); // Position for the right lanes
        for (let j = 0; j < numDashes; j++) {
            const laneMarkingGeometry = new THREE.PlaneGeometry(0.1, dashLength);
            const laneMarkingMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
            const laneMarking = new THREE.Mesh(laneMarkingGeometry, laneMarkingMaterial);
            laneMarking.rotation.x = -Math.PI / 2;
            laneMarking.position.set(xOffset, 0.01, (j * totalDashPatternLength) - (ROAD_LENGTH / 2));
            scene.add(laneMarking);
        }

        // Lane markings for the other direction (left side of middle)
        xOffset = -(1.5 + i) * LANE_WIDTH + (ROAD_WIDTH / 2); // Position for the left lanes
        for (let j = 0; j < numDashes; j++) {
            const laneMarkingGeometry = new THREE.PlaneGeometry(0.1, dashLength);
            const laneMarkingMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
            const laneMarking = new THREE.Mesh(laneMarkingGeometry, laneMarkingMaterial);
            laneMarking.rotation.x = -Math.PI / 2;
            laneMarking.position.set(xOffset, 0.01, (j * totalDashPatternLength) - (ROAD_LENGTH / 2));
            scene.add(laneMarking);
        }
    }

    // Middle line (double yellow)
    const middleLineGeometry = new THREE.PlaneGeometry(0.15, ROAD_LENGTH);
    const middleLineMaterialYellow = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const middleLine1 = new THREE.Mesh(middleLineGeometry, middleLineMaterialYellow);
    middleLine1.rotation.x = -Math.PI / 2;
    middleLine1.position.set(-0.15, 0.01, 0);
    scene.add(middleLine1);
    const middleLine2 = new THREE.Mesh(middleLineGeometry, middleLineMaterialYellow);
    middleLine2.rotation.x = -Math.PI / 2;
    middleLine2.position.set(0.15, 0.01, 0);
    scene.add(middleLine2);


    // --- Rapier ground collider (for the road) ---
    const groundColliderDesc = RAPIER.ColliderDesc.cuboid(ROAD_WIDTH / 2, 0.05, ROAD_LENGTH / 2);
    groundColliderDesc.setTranslation(0, -0.05, 0); // Position it correctly
    world.createCollider(groundColliderDesc);

    // --- Create Ragdoll ---
    createRagdoll(0, 1.0, 0); // Start ragdoll at (0, 1, 0)
    
    // Handle window resizing
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // --- Input Controls (PC Keyboard) ---
    window.addEventListener('keydown', (event) => {
        switch (event.key) {
            case 'ArrowRight': // Forward
                if (!moveForward) {
                    const now = performance.now();
                    if (now - lastForwardPressTime < DASH_PRESS_THRESHOLD) {
                        isDashing = true;
                    }
                    lastForwardPressTime = now;
                }
                moveForward = true;
                break;
            case 'ArrowLeft': // Backward
                if (!moveBackward) {
                    const now = performance.now();
                    if (now - lastBackwardPressTime < DASH_PRESS_THRESHOLD) {
                        isDashing = true;
                    }
                    lastBackwardPressTime = now;
                }
                moveBackward = true;
                break;
        }
    });

    window.addEventListener('keyup', (event) => {
        switch (event.key) {
            case 'ArrowRight':
                moveForward = false;
                isDashing = false;
                break;
            case 'ArrowLeft':
                moveBackward = false;
                isDashing = false;
                break;
        }
    });

    // --- Input Controls (PC Mouse for Camera) ---
    const gameCanvas = document.getElementById('game-canvas');
    gameCanvas.addEventListener('mousedown', (event) => {
        if (event.button === 0) { // Left mouse button
            isPanning = true;
            lastMouseX = event.clientX;
            lastMouseY = event.clientY;
        }
    });

    gameCanvas.addEventListener('mousemove', (event) => {
        if (isPanning) {
            const deltaX = event.clientX - lastMouseX;
            // const deltaY = event.clientY - lastMouseY; // For vertical camera movement (pitch) if needed
            cameraAngle.target += deltaX * cameraRotationSpeed;
            lastMouseX = event.clientX;
            // lastMouseY = event.clientY;
        }
    });

    gameCanvas.addEventListener('mouseup', () => {
        isPanning = false;
    });

    gameCanvas.addEventListener('wheel', (event) => {
        event.preventDefault(); // Prevent page scrolling
        cameraDistance.target += event.deltaY * 0.01;
        cameraDistance.target = Math.max(cameraDistance.min, Math.min(cameraDistance.max, cameraDistance.target));
    });


    // --- Input Controls (Mobile Touch) ---
    const moveLeftButton = document.getElementById('move-left');
    const moveRightButton = document.getElementById('move-right');

    if (moveLeftButton && moveRightButton) {
        moveLeftButton.addEventListener('touchstart', (event) => {
            event.preventDefault(); // Prevent scrolling
            if (!moveBackward) {
                const now = performance.now();
                if (now - lastBackwardPressTime < DASH_PRESS_THRESHOLD) {
                    isDashing = true;
                }
                lastBackwardPressTime = now;
            }
            moveBackward = true;
        }, { passive: false });
        moveLeftButton.addEventListener('touchend', () => {
            moveBackward = false;
            isDashing = false;
        });

        moveRightButton.addEventListener('touchstart', (event) => {
            event.preventDefault(); // Prevent scrolling
            if (!moveForward) {
                const now = performance.now();
                if (now - lastForwardPressTime < DASH_PRESS_THRESHOLD) {
                    isDashing = true;
                }
                lastForwardPressTime = now;
            }
            moveForward = true;
        }, { passive: false });
        moveRightButton.addEventListener('touchend', () => {
            moveForward = false;
            isDashing = false;
        });
    }

    gameCanvas.addEventListener('touchstart', (event) => {
        event.preventDefault(); // Prevent scrolling and default browser actions

        if (event.touches.length === 1) { // Single touch for pan
            isPanning = true;
            lastMouseX = event.touches[0].clientX;
            lastMouseY = event.touches[0].clientY;
            isPinching = false;
        } else if (event.touches.length === 2) { // Two touches for pinch zoom
            isPinching = true;
            initialPinchDistance = Math.hypot(
                event.touches[1].clientX - event.touches[0].clientX,
                event.touches[1].clientY - event.touches[0].clientY
            );
            isPanning = false;
        }
    }, { passive: false });

    gameCanvas.addEventListener('touchmove', (event) => {
        event.preventDefault(); // Prevent scrolling

        if (isPanning && event.touches.length === 1) {
            const deltaX = event.touches[0].clientX - lastMouseX;
            // const deltaY = event.touches[0].clientY - lastMouseY; // For vertical camera movement (pitch)
            cameraAngle.target += deltaX * cameraRotationSpeed * 2; // Increase sensitivity for touch
            lastMouseX = event.touches[0].clientX;
            // lastMouseY = event.touches[0].clientY;
        } else if (isPinching && event.touches.length === 2) {
            const currentPinchDistance = Math.hypot(
                event.touches[1].clientX - event.touches[0].clientX,
                event.touches[1].clientY - event.touches[0].clientY
            );
            const deltaDistance = currentPinchDistance - initialPinchDistance;
            cameraDistance.target -= deltaDistance * 0.05; // Adjust zoom sensitivity
            initialPinchDistance = currentPinchDistance; // Update initial for continuous pinch
            cameraDistance.target = Math.max(cameraDistance.min, Math.min(cameraDistance.max, cameraDistance.target));
        }
    }, { passive: false });

    gameCanvas.addEventListener('touchend', () => {
        isPanning = false;
        isPinching = false;
    });


    animate();
};

// Helper function to create a body part for the ragdoll
const createBodyPart = (name, geometry, material, position, mass) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(position.x, position.y, position.z)
        .setLinearDamping(0.5) // Add some damping to prevent endless bouncing
        .setAngularDamping(0.5);

    const rigidBody = world.createRigidBody(rigidBodyDesc);

    // Calculate collider size from geometry. For BoxGeometry, width, height, depth are available.
    let hx, hy, hz;
    if (geometry instanceof THREE.BoxGeometry) {
        hx = geometry.parameters.width / 2;
        hy = geometry.parameters.height / 2;
        hz = geometry.parameters.depth / 2;
    } else if (geometry instanceof THREE.SphereGeometry) {
        hx = hy = hz = geometry.parameters.radius;
    } else if (geometry instanceof THREE.CapsuleGeometry) {
        // For capsule, Rapier's collider needs half_height and radius.
        // CapsuleGeometry in Three.js takes radius and length (total length of cylindrical part)
        const capsuleRadius = geometry.parameters.radius;
        const capsuleHalfHeight = geometry.parameters.length / 2; // Half of the cylindrical part's length
        
        const colliderDesc = RAPIER.ColliderDesc.capsule(capsuleHalfHeight, capsuleRadius);
        // Approximate volume for capsule: (4/3)*PI*r^3 (for two half spheres) + PI*r^2*length (for cylinder)
        const volume = (4/3) * Math.PI * Math.pow(capsuleRadius, 3) + Math.PI * Math.pow(capsuleRadius, 2) * geometry.parameters.length;
        colliderDesc.setDensity(mass / volume);
        world.createCollider(colliderDesc, rigidBody);
        return { mesh, rigidBody, name };
    } else {
        hx = hy = hz = 0.5; // Default to a small cube if geometry is unknown
    }
    const colliderDesc = RAPIER.ColliderDesc.cuboid(hx, hy, hz); // Using cuboid for simplicity if not capsule/sphere
    colliderDesc.setDensity(mass / (8 * hx * hy * hz)); // Density = mass / volume (for cuboid)
    world.createCollider(colliderDesc, rigidBody);

    return { mesh, rigidBody, name };
};

const createRagdoll = (x, y, z) => {
    const material = new THREE.MeshLambertMaterial({ color: 0x00ff00 }); // Green ragdoll

    // Torso (main body)
    const torsoGeometry = new THREE.BoxGeometry(0.8, 1.2, 0.4);
    const torsoMass = RAGDOLL_MASS * 0.4; // 40% of body mass
    const torso = createBodyPart('torso', torsoGeometry, material, new THREE.Vector3(x, y + 1.2, z), torsoMass);
    ragdoll.torso = torso;

    // Head
    const headRadius = 0.3;
    const headGeometry = new THREE.SphereGeometry(headRadius);
    const headMass = RAGDOLL_MASS * 0.08; // 8% of body mass
    const head = createBodyPart('head', headGeometry, material, new THREE.Vector3(x, y + 1.2 + 0.6 + headRadius, z), headMass);
    ragdoll.head = head;

    // Head to Torso Joint (Spherical Joint)
    // Anchor points are relative to the center of each rigid body
    const headAnchor = { x: 0, y: -headRadius, z: 0 }; // Bottom of the head
    const torsoAnchorHead = { x: 0, y: 0.6, z: 0 }; // Top of the torso
    const headTorsoJoint = RAPIER.JointSet.spherical(
        new RAPIER.Vector3(torsoAnchorHead.x, torsoAnchorHead.y, torsoAnchorHead.z),
        new RAPIER.Vector3(headAnchor.x, headAnchor.y, headAnchor.z)
    );
    world.createImpulseJoint(headTorsoJoint, torso.rigidBody, head.rigidBody);


    // Upper Arm (Left)
    const upperArmLength = 0.6;
    const upperArmRadius = 0.15;
    // THREE.CapsuleGeometry creates a capsule along Y-axis, so for arm to be along X, it needs rotation for visuals, but Rapier collider is just dimensions
    const upperArmGeometry = new THREE.CapsuleGeometry(upperArmRadius, upperArmLength);
    const upperArmMass = RAGDOLL_MASS * 0.03; // 3% * 2 arms = 6%
    const upperArmL = createBodyPart('upperArmL', upperArmGeometry, material, new THREE.Vector3(x - 0.4 - upperArmRadius, y + 1.2 + 0.2, z), upperArmMass);
    ragdoll.upperArmL = upperArmL;

    // Upper Arm (Right)
    const upperArmR = createBodyPart('upperArmR', upperArmGeometry, material, new THREE.Vector3(x + 0.4 + upperArmRadius, y + 1.2 + 0.2, z), upperArmMass);
    ragdoll.upperArmR = upperArmR;

    // Upper Leg (Left)
    const upperLegLength = 0.8;
    const upperLegRadius = 0.2;
    const upperLegGeometry = new THREE.CapsuleGeometry(upperLegRadius, upperLegLength);
    const upperLegMass = RAGDOLL_MASS * 0.1; // 10% * 2 legs = 20%
    const upperLegL = createBodyPart('upperLegL', upperLegGeometry, material, new THREE.Vector3(x - 0.2, y + 1.2 - 0.6 - upperLegLength / 2, z), upperLegMass);
    ragdoll.upperLegL = upperLegL;

    // Upper Leg (Right)
    const upperLegR = createBodyPart('upperLegR', upperLegGeometry, material, new THREE.Vector3(x + 0.2, y + 1.2 - 0.6 - upperLegLength / 2, z), upperLegMass);
    ragdoll.upperLegR = upperLegR;


    // Torso to Upper Arm Joints (Spherical Joints)
    const torsoAnchorArmL = { x: -0.4, y: 0.4, z: 0 }; // Shoulder position on torso
    const torsoAnchorArmR = { x: 0.4, y: 0.4, z: 0 }; // Shoulder position on torso
    const armAnchor = { x: 0, y: upperArmLength / 2, z: 0 }; // Top of the upper arm (local to arm)

    const shoulderLJoint = RAPIER.JointSet.spherical(
        new RAPIER.Vector3(torsoAnchorArmL.x, torsoAnchorArmL.y, torsoAnchorArmL.z),
        new RAPIER.Vector3(armAnchor.x, armAnchor.y, armAnchor.z)
    );
    world.createImpulseJoint(shoulderLJoint, torso.rigidBody, upperArmL.rigidBody);

    const shoulderRJoint = RAPIER.JointSet.spherical(
        new RAPIER.Vector3(torsoAnchorArmR.x, torsoAnchorArmR.y, torsoAnchorArmR.z),
        new RAPIER.Vector3(armAnchor.x, armAnchor.y, armAnchor.z)
    );
    world.createImpulseJoint(shoulderRJoint, torso.rigidBody, upperArmR.rigidBody);


    // Torso to Upper Leg Joints (Spherical Joints)
    const torsoAnchorLegL = { x: -0.25, y: -0.6, z: 0 }; // Hip position on torso
    const torsoAnchorLegR = { x: 0.25, y: -0.6, z: 0 }; // Hip position on torso
    const legAnchor = { x: 0, y: upperLegLength / 2, z: 0 }; // Top of the upper leg (local to leg)

    const hipLJoint = RAPIER.JointSet.spherical(
        new RAPIER.Vector3(torsoAnchorLegL.x, torsoAnchorLegL.y, torsoAnchorLegL.z),
        new RAPIER.Vector3(legAnchor.x, legAnchor.y, legAnchor.z)
    );
    world.createImpulseJoint(hipLJoint, torso.rigidBody, upperLegL.rigidBody);

    const hipRJoint = RAPIER.JointSet.spherical(
        new RAPIER.Vector3(torsoAnchorLegR.x, torsoAnchorLegR.y, torsoAnchorLegR.z),
        new RAPIER.Vector3(legAnchor.x, legAnchor.y, legAnchor.z)
    );
    world.createImpulseJoint(hipRJoint, torso.rigidBody, upperLegR.rigidBody);


    // Lower Arm (Left)
    const lowerArmLength = 0.5;
    const lowerArmRadius = 0.12;
    const lowerArmGeometry = new THREE.CapsuleGeometry(lowerArmRadius, lowerArmLength);
    const lowerArmMass = RAGDOLL_MASS * 0.02; // 2% * 2 arms = 4%
    const lowerArmL = createBodyPart('lowerArmL', lowerArmGeometry, material, new THREE.Vector3(upperArmL.mesh.position.x, upperArmL.mesh.position.y - upperArmLength / 2 - lowerArmLength / 2, z), lowerArmMass);
    ragdoll.lowerArmL = lowerArmL;

    // Lower Arm (Right)
    const lowerArmR = createBodyPart('lowerArmR', lowerArmGeometry, material, new THREE.Vector3(upperArmR.mesh.position.x, upperArmR.mesh.position.y - upperArmLength / 2 - lowerArmLength / 2, z), lowerArmMass);
    ragdoll.lowerArmR = lowerArmR;

    // Lower Leg (Left)
    const lowerLegLength = 0.7;
    const lowerLegRadius = 0.18;
    const lowerLegGeometry = new THREE.CapsuleGeometry(lowerLegRadius, lowerLegLength);
    const lowerLegMass = RAGDOLL_MASS * 0.06; // 6% * 2 legs = 12%
    const lowerLegL = createBodyPart('lowerLegL', lowerLegGeometry, material, new THREE.Vector3(upperLegL.mesh.position.x, upperLegL.mesh.position.y - upperLegLength / 2 - lowerLegLength / 2, z), lowerLegMass);
    ragdoll.lowerLegL = lowerLegL;

    // Lower Leg (Right)
    const lowerLegR = createBodyPart('lowerLegR', lowerLegGeometry, material, new THREE.Vector3(upperLegR.mesh.position.x, upperLegR.mesh.position.y - upperLegLength / 2 - lowerLegLength / 2, z), lowerLegMass);
    ragdoll.lowerLegR = lowerLegR;


    // Upper Arm to Lower Arm Joints (Revolute Joints for elbow)
    // Elbow joints usually rotate around one axis
    const upperArmAnchorElbow = { x: 0, y: -upperArmLength / 2, z: 0 }; // Bottom of upper arm
    const lowerArmAnchor = { x: 0, y: lowerArmLength / 2, z: 0 }; // Top of lower arm
    const elbowAxis = { x: 0, y: 0, z: 1 }; // Rotation around Z-axis

    const elbowLJoint = RAPIER.JointSet.revolute(
        new RAPIER.Vector3(upperArmAnchorElbow.x, upperArmAnchorElbow.y, upperArmAnchorElbow.z),
        new RAPIER.Vector3(lowerArmAnchor.x, lowerArmAnchor.y, lowerArmAnchor.z),
        new RAPIER.Vector3(elbowAxis.x, elbowAxis.y, elbowAxis.z)
    );
    world.createImpulseJoint(elbowLJoint, upperArmL.rigidBody, lowerArmL.rigidBody);

    const elbowRJoint = RAPIER.JointSet.revolute(
        new RAPIER.Vector3(upperArmAnchorElbow.x, upperArmAnchorElbow.y, upperArmAnchorElbow.z),
        new RAPIER.Vector3(lowerArmAnchor.x, lowerArmAnchor.y, lowerArmAnchor.z),
        new RAPIER.Vector3(elbowAxis.x, elbowAxis.y, elbowAxis.z)
    );
    world.createImpulseJoint(elbowRJoint, upperArmR.rigidBody, lowerArmR.rigidBody);


    // Upper Leg to Lower Leg Joints (Revolute Joints for knee)
    const upperLegAnchorKnee = { x: 0, y: -upperLegLength / 2, z: 0 }; // Bottom of upper leg
    const lowerLegAnchor = { x: 0, y: lowerLegLength / 2, z: 0 }; // Top of lower leg
    const kneeAxis = { x: 1, y: 0, z: 0 }; // Rotation around X-axis (more natural for knees)

    const kneeLJoint = RAPIER.JointSet.revolute(
        new RAPIER.Vector3(upperLegAnchorKnee.x, upperLegAnchorKnee.y, upperLegAnchorKnee.z),
        new RAPIER.Vector3(lowerLegAnchor.x, lowerLegAnchor.y, lowerLegAnchor.z),
        new RAPIER.Vector3(kneeAxis.x, kneeAxis.y, kneeAxis.z)
    );
    world.createImpulseJoint(kneeLJoint, upperLegL.rigidBody, lowerLegL.rigidBody);

    const kneeRJoint = RAPIER.JointSet.revolute(
        new RAPIER.Vector3(upperLegAnchorKnee.x, upperLegAnchorKnee.y, upperLegAnchorKnee.z),
        new RAPIER.Vector3(lowerLegAnchor.x, lowerLegAnchor.y, lowerLegAnchor.z),
        new RAPIER.Vector3(kneeAxis.x, kneeAxis.y, kneeAxis.z)
    );
    world.createImpulseJoint(kneeRJoint, upperLegR.rigidBody, lowerLegR.rigidBody);
};

const updateCars = (deltaTime) => {
    // Spawn new cars
    if (performance.now() - lastSpawnTime > SPAWN_INTERVAL_MS) {
        // Randomly pick one of the 6 lanes
        const globalLaneIndex = Math.floor(Math.random() * 6);
        let direction; // 1 for +Z (up), -1 for -Z (down)
        let localLaneIndex; // 0, 1, 2 for within a direction's lanes

        if (globalLaneIndex < 3) { // Lanes 0, 1, 2 for one direction (e.g., traffic moving -Z)
            direction = -1;
            localLaneIndex = globalLaneIndex;
        } else { // Lanes 3, 4, 5 for the other direction (e.g., traffic moving +Z)
            direction = 1;
            localLaneIndex = globalLaneIndex - 3;
        }
        createCar(localLaneIndex, direction);
        lastSpawnTime = performance.now();
    }

    // Update car positions and remove out-of-bounds cars
    for (let i = cars.length - 1; i >= 0; i--) {
        const car = cars[i];
        car.mesh.position.z += car.speed * deltaTime;
        
        // Update Rapier rigid body position
        const newRapierPos = new RAPIER.Vector3(car.mesh.position.x, car.mesh.position.y, car.mesh.position.z);
        car.rigidBody.setTranslation(newRapierPos, true);

        // Remove car if it's too far
        if (Math.abs(car.mesh.position.z) > CAR_LIFESPAN_Z + 50) { // Add buffer
            scene.remove(car.mesh);
            world.removeRigidBody(car.rigidBody);
            cars.splice(i, 1);
        }
    }
};

const updateRagdoll = () => {
    // Update mesh positions and rotations from Rapier rigid bodies
    for (const partName in ragdoll) {
        const part = ragdoll[partName];
        if (part.rigidBody && part.mesh) {
            const position = part.rigidBody.translation();
            const rotation = part.rigidBody.rotation();
            part.mesh.position.set(position.x, position.y, position.z);
            part.mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
        }
    }
    
    // Apply movement forces to torso
    if (ragdoll.torso && ragdoll.torso.rigidBody) {
        const forceMagnitude = isDashing ? RAGDOLL_DASH_FORCE : RAGDOLL_MOVE_FORCE;
        const currentRotation = ragdoll.torso.rigidBody.rotation();
        const quaternion = new THREE.Quaternion(currentRotation.x, currentRotation.y, currentRotation.z, currentRotation.w);
        const directionVector = new THREE.Vector3(0, 0, 1); // Forward direction (local Z)
        directionVector.applyQuaternion(quaternion); // Apply torso rotation to get world forward direction

        let forceZ = 0;
        if (moveForward) {
            forceZ = forceMagnitude;
        } else if (moveBackward) {
            forceZ = -forceMagnitude;
        }

        // Apply force to the torso
        if (forceZ !== 0) {
            // Apply force in the world Z direction (for now, simpler movement)
            // Or apply in local directionVector.z to move relative to ragdoll's facing.
            // For now, simpler: always forward/backward on global Z.
            ragdoll.torso.rigidBody.applyImpulse(new RAPIER.Vector3(0, 0, forceZ), true);
        }

        // Try to keep ragdoll upright (simple anti-gravity / balance)
        const currentTorsoRotation = ragdoll.torso.rigidBody.rotation();
        const euler = new THREE.Euler().setFromQuaternion(new THREE.Quaternion(currentTorsoRotation.x, currentTorsoRotation.y, currentTorsoRotation.z, currentTorsoRotation.w));
        const angleX = euler.x;
        const angleZ = euler.z;

        if (Math.abs(angleX) > 0.1 || Math.abs(angleZ) > 0.1) {
            // Apply a torque to counteract falling over
            // This is a very basic uprighting force, complex ragdoll balancing is an advanced topic
            const torqueX = -angleX * RAGDOLL_UPRIGHT_STRENGTH;
            const torqueZ = -angleZ * RAGDOLL_UPRIGHT_STRENGTH;
            ragdoll.torso.rigidBody.applyTorque(new RAPIER.Vector3(torqueX, 0, torqueZ), true);
        }
    }
};

const updateCamera = () => {
    if (ragdoll.torso && ragdoll.torso.mesh) {
        const targetPosition = ragdoll.torso.mesh.position;
        const cameraVerticalOffset = 10;
        const cameraHorizontalOffset = 0; // For camera to rotate around ragdoll

        // Smoothly update camera angle
        cameraAngle.current = THREE.MathUtils.lerp(cameraAngle.current, cameraAngle.target, 0.1);

        // Calculate camera position based on angle and distance
        const x = targetPosition.x + cameraDistance.current * Math.sin(cameraAngle.current);
        const z = targetPosition.z + cameraDistance.current * Math.cos(cameraAngle.current);
        const y = targetPosition.y + cameraVerticalOffset;

        camera.position.set(x, y, z);
        camera.lookAt(targetPosition);
    }
};

let previousRAF = null;
const animate = () => {
    requestAnimationFrame(animate);

    if (previousRAF === null) {
        previousRAF = performance.now();
    }
    const deltaTime = (performance.now() - previousRAF) / 1000; // seconds
    previousRAF = performance.now();

    updateCars(deltaTime);
    updateRagdoll(); // Update ragdoll mesh positions
    updateCamera(); // Update camera position to follow ragdoll

    // Update the physics world
    world.step();

    renderer.render(scene, camera);
};

init();