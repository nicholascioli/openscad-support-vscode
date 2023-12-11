import type { OpenSCAD } from "./@types/openscad-runtime";
import type { FSEntry, PreviewExtensionMsg, PreviewWebviewMsg } from "../messages.d.ts";

import OpenSCADInit from "./openscad";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/Addons.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";

declare global {
    var EXTENSION_PREFIX: string;
    function acquireVsCodeApi(): VSCode;
}

declare interface VSCode {
    postMessage(message: PreviewWebviewMsg): void;
    getState<T>(): T;
    setState<T>(state: T): void;
};

class PreviewEntrypoint {
    private _extensionHandle: VSCode;

    private _scene: THREE.Scene;
    private _camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
    private _renderer: THREE.WebGLRenderer;
    private _effects: EffectComposer;
    private _loader: STLLoader;
    private _controls: OrbitControls;

    private _scadGroup: THREE.Group;

    constructor() {
        this._extensionHandle = acquireVsCodeApi();

        this._scene = new THREE.Scene();
        this._camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this._renderer = new THREE.WebGLRenderer({ alpha: true });
        this._effects = new EffectComposer(this._renderer);
        this._loader = new STLLoader();

        // OpenSCAD by default considers Z to be the up vector
        this._camera.up.set(0, 0, 1);

        // TODO: This is located after the up vector change because it does not respect
        // it otherwise.
        this._controls = new OrbitControls(this._camera, this._renderer.domElement);

        // All rendered output will be added to this group for easy clearing.
        this._scadGroup = new THREE.Group();
        this._scene.add(this._scadGroup);

        this._renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this._renderer.domElement);

        // Create the scene
        this.layoutScene();

        // Start rendering
        this.render();
    }

    public async preview(path: FSEntry, deps: FSEntry[]) {
        // Emscriptem does not like having a module not die after running
        // TODO: How can we optimize this?
        const openscad = await OpenSCADInit({
            urlPrefix: EXTENSION_PREFIX,
            print: (msg) => console.debug("OPENHAB STDOUT:", msg),
            printErr: (err) => console.warn("OPENHAB STDERR:", err),
        });

        const allEntries = deps.concat([path]);
        console.log("ENTRIES:", allEntries);
        for (const entry of allEntries) {
            const parent = entry.path.split('/').slice(0, -1).join('/');

            const req = await fetch(entry.url);
            const data = await req.text();

            console.log("Writing:", parent, entry.path);
            openscad.FS.createPath('/', parent, true, false);
            console.log("WAT");
            openscad.FS.writeFile(entry.path, data);
            console.log("WAT 2");
        }

        console.log("Calling OpenSCAD", path.path);
        await openscad.callMain([
            path.path,
            // "--quiet",
            "--export-format", "binstl",
            "-o", "/data.stl"
        ]);

        console.log("Getting output");
        const output = openscad.FS.readFile("/data.stl", { encoding: "binary" });
        const geometry = this._loader.parse(output.buffer);
        const material = new THREE.MeshPhongMaterial({ color: 0xfdfd96 });

        // Add the STL file to the scene
        this._scadGroup.clear();
        this._scadGroup.add(new THREE.Mesh(geometry, material));
    }

    public layoutScene() {
        // Have the camera start a set size away
        this._camera.position.set(10, 10, 10);
        this._camera.lookAt(new THREE.Vector3());

        // We want an axis marker to give a sense of scale
        const axesHelper = new THREE.AxesHelper(5);
        this._scene.add(axesHelper);

        // Add basic lighting
        const ambient = new THREE.AmbientLight();
        const directional = new THREE.DirectionalLight();
        const hemi = new THREE.HemisphereLight();
        this._scene.add(ambient, directional, hemi);
    }

    public render() {
        let self = this;
        requestAnimationFrame(() => self.render());

        // Fix resize issues
        if (this.resizeRendererToDisplaySize()) {
            const canvas = this._renderer.domElement;
            if ((this._camera as THREE.PerspectiveCamera).aspect !== undefined) {
                (this._camera as THREE.PerspectiveCamera).aspect = canvas.clientWidth / canvas.clientHeight;
            }
            this._camera.updateProjectionMatrix();
        }

        this._controls.update();
        this._renderer.render(this._scene, this._camera);
    }

    private resizeRendererToDisplaySize(): boolean {
        const canvas = this._renderer.domElement;
        const width = window.innerWidth;
        const height = window.innerHeight;
        const needResize = canvas.width !== width || canvas.height !== height;
        if (needResize) {
            this._renderer.setSize(width, height, true);
        }

        return needResize;
    }
}

const preview = new PreviewEntrypoint();

// Handle messages from vscode
window.addEventListener('message', async event => {
    const message = event.data as PreviewExtensionMsg;

    switch (message.command) {
        case 'preview':
            preview.preview(message.path, message.deps);
            break;
    }
});
