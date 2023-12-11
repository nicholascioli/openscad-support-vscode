import type { InitOptions, OpenSCAD as OpenSCADInterface } from "./@types/openscad-runtime";

let wasmModule: string;

declare global {
    var OpenSCAD: any;
};

export default async function OpenSCAD(options: { urlPrefix: string } & Partial<InitOptions>): Promise<OpenSCADInterface> {
    if (!wasmModule) {
        const url = new URL(`./openscad.wasm.js`, options.urlPrefix).href;
        const request = await fetch(url);
        wasmModule = "data:text/javascript;base64," + btoa(await request.text());
    }

    const module = {
        noInitialRun: true,
        locateFile: (path: string) => new URL(`./${path}`, options.urlPrefix).href,
        ...options,
    };

    globalThis.OpenSCAD = module;
    await import(wasmModule + `#${Math.random()}`);
    delete globalThis.OpenSCAD;

    await new Promise((resolve) => {
        (module as any).onRuntimeInitialized = () => resolve(null);
    });

    return module as any as OpenSCADInterface;
}
