// import * as THREE from "https://unpkg.com/three@0.133.0/build/three.js";
import { ARButton } from "https://unpkg.com/three@0.133.0/examples/jsm/webxr/ARButton.js";

let camera, scene, renderer;
let loader;
let model;

const init = async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    
    scene = new THREE.Scene();
    console.log(scene)

    // PerspectiveCamera( fov : Number, aspect : Number, near : Number, far : Number )
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 40);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    container.appendChild(renderer.domElement);

    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
    light.position.set(0.5, 1, 0.25);
    scene.add(light);

    // const modelUrl = 'https://raw.githubusercontent.com/cbrito1994/Lindsey-AR/main/assets/violin.glb';
    // const modelUrl = 'https://raw.githubusercontent.com/cbrito1994/AR-Models/main/stradivariViolin.glb'
    const modelUrl = 'https://raw.githubusercontent.com/cbrito1994/Lindsey-AR/main/assets/stradivariViolin.glb'

    console.log(modelUrl)
    loader = new THREE.GLTFLoader();
    const gltf = await loader.loadAsync(modelUrl);
    console.log(gltf)
    model = gltf.scene;
    model.translate(0, 0, 1) // (x, y, z);
    model.matrixAutoUpdate = false;
    model.visible = false;
    scene.add(model);

    const imageUrl = 'https://raw.githubusercontent.com/cbrito1994/Lindsey-AR/main/assets/lindsey-shatterMe.jpg';
    console.log(imageUrl)
    const imgBitmap = await getImageBitmap(imageUrl);

    const button = ARButton.createButton(renderer, {
        requiredFeatures: ['image-tracking'],
        trackedImages: [
            {
                image: imgBitmap,
                widthInMeters: 0.5
            }
        ]
    });

    document.body.appendChild(button);
    window.addEventListener('resize', onWindowResize, false);
}

const onWindowResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth / window.innerHeight);
}

const animate = () => {
    renderer.setAnimationLoop(render);
}

const getImageBitmap = async (url) => {
    const response = await fetch(url);
    const blob = await response.blob();
    const imageBitmap = await createImageBitmap(blob);
    return imageBitmap;
}

const updateModel = (pose) => {
    model.matrix.fromArray(pose.transform.matrix); // It converts all the info of position and rotation from the pose (which again, represents where the image is) into the model
}

const render = (timestamp, frame) => {
    if(frame) {
        const results = frame.getImageTrackingResults(); // Can you tell me if there are any images that we tracked and where they are. The resul is an array
        for(const result of results) {
            // The result's index is the image's position in the trackedImages array specified at session creation
            const imageIndex = result.index;

            // Get the pose (position) of the image relative to a reference space and we're gonna transfer that into the mesh
            const referenceSpace = renderer.xr.getReferenceSpace(); // We're getting a reference space
            const pose = frame.getPose(result.imageSpace, referenceSpace); // Hey frame get the pose of the image inside of our reference space. What this const is storing is the accurate position and rotation of where the image was found
            const state = result.trackingState;
            console.log(state);
            if(state === "tracked") {
                model.visible = true;
                updateModel(pose); // Update the position of the model based on the pose. Once we get the position of the image, we want to transfer that info into the model
            } else {
                model.visible = false;
            }
        }
    }
    renderer.render(scene, camera);
}

init();
animate();