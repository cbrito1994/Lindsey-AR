import { ARButton } from "https://unpkg.com/three@0.133.0/examples/jsm/webxr/ARButton.js";

let camera, scene, renderer;
let loader;
let model;

let sound;
let listener;
let audioIsPlaying = false;
let audioIsInitialized = false;

const setupMobileDebug = () => {
    // First thing we do is setup the mobile debug console
    // This library is very big so only use it while debugging
    // just comment it out when your app is done

    const containerEl = document.getElementById("console-ui");
    eruda.init({
        container: containerEl // where we wanna contain the eruda class
    });
    const devToolEl = containerEl.shadowRoot.querySelector('.eruda-dev-tools');
    devToolEl.style.height = '40%'; // control the height of the dev tool panel
}

let i = 0;
const logsForMobileDebug = () => {
    console.log(i++);
}

const init = async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    
    scene = new THREE.Scene();

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

    // const modelUrl = 'https://raw.githubusercontent.com/cbrito1994/AR-Models/main/stradivariViolin.glb'
    const modelUrl = 'https://raw.githubusercontent.com/cbrito1994/Lindsey-AR/main/assets/stradivariViolin.glb'

    loader = new THREE.GLTFLoader();
    const gltf = await loader.loadAsync(modelUrl);
    console.log(gltf)
    model = gltf.scene;
    model.scale.setScalar(0.01);
    model.translateZ(0.01);
    model.rotateX(THREE.Math.degToRad(360));
    model.rotateY(THREE.Math.degToRad(90));
    model.matrixAutoUpdate = false;
    model.visible = false;
    scene.add(model);

    const imageUrl = 'https://raw.githubusercontent.com/cbrito1994/Lindsey-AR/main/assets/lindsey-shatterMe.jpg';
    const imgBitmap = await getImageBitmap(imageUrl);

    const button = ARButton.createButton(renderer, {
        requiredFeatures: ["image-tracking"], // notice a new required feature
        trackedImages: [
            {
                image: imgBitmap, // tell webxr this is the image target we want to track
                widthInMeters: 0.2
            }
        ],
        optionalFeatures: ["dom-overlay", "dom-overlay-for-handheld-ar"],
        domOverlay: {
            root: document.body
        }
    });


    document.body.appendChild(button);

    // button.addEventListener('click', async () => {
    //     if (!audioIsInitialized) { // one time setup
    //         await setupAudio();
    //         audioIsInitialized = true;
    //         startAudio();
    //         console.log("start audio");
    //     } else {
    //         toggleAudio(); 
    //     }
    // })

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
                console.log("Image target has been found")
                model.visible = true;
                updateModel(pose); // Update the position of the model based on the pose. Once we get the position of the image, we want to transfer that info into the model
                trackedAndAudio();
            } else {
                model.visible = false;
            }
        }
    }
    renderer.render(scene, camera);
}

/***************************/
/* Audio section */
/***************************/

const trackedAndAudio = async () => {
    if(model.visible !== true) {
        toggleAudio();
    } else {
        if(!audioIsInitialized) {
            console.log("start audio");
            await setupAudio();
            audioIsInitialized = true;
            startAudio();
        }
    }
}

const setupAudio = async () => {
    listener = new THREE.AudioListener();
    camera.add(listener);
    await createPositionalAudio();
    model.add(sound);
}

const createPositionalAudio = async () => {
    sound = new THREE.PositionalAudio(listener);
    sound.setRefDistance(0.1); // the distance between sound and listener at which the volume reduction starts taking effect.
    sound.setDistanceModel('linear'); // this has to be linear for the max distance to work
    sound.setMaxDistance(1.5); // more settings here: https://threejs.org/docs/#api/en/audio/PositionalAudio
    sound.setLoop(true);
    sound.setDirectionalCone(180, 230, 0);

    // load a sound and set it as the PositionalAudio object's buffer
    const audioLoader = new THREE.AudioLoader();
    // do not load a music file as ogg, won't play in Firefox
    const url = 'https://raw.githubusercontent.com/cbrito1994/Lindsey-AR/main/assets/04_Shatter_Me_(feat_Lzzy_Hale).m4a';
    // const url = 'https://music.apple.com/mx/album/shatter-me-feat-lzzy-hale/1440857636?i=1440857646';
    const buffer = await audioLoader.loadAsync(url);
    sound.setBuffer(buffer);
}

const startAudio = () => {
    sound.play();
    console.log(sound);
    audioIsPlaying = true;
}

const stopAudio = () => {
    sound.stop();
    audioIsPlaying = false;
}

const toggleAudio = () => {
    if (audioIsInitialized) {
        if (!audioIsPlaying) {
          playAudio();
        } else {
          stopAudio();
        }
    }
}

init();
animate();
setupMobileDebug();
setInterval(logsForMobileDebug, 1000);