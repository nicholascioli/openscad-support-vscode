export interface InitOptions {
    noInitialRun: boolean;
    print: (_: string) => void,
    printErr: (_: string) => void,
    preInit: () => void,
    preRun: (() => void)[],
}
export interface OpenSCAD {
    callMain(args: Array<string>): Promise<number>;
    FS: FS;
    locateFile?: (path: string, prefix: string) => string;
    onRuntimeInitialized?: () => void;
}
export interface FS {
    createLazyFile(parent: string, name: string, url: string, canRead: boolean, canWrite: boolean): void;
    createPreloadedFile(parent: string, name: string, url: string, canRead: boolean, canWrite: boolean): void;
    createPath(parent: string, subpath: string, canRead: boolean, canWrite: boolean): void;
    mkdir(path: string): void;
    rename(oldpath: string, newpath: string): void;
    rmdir(path: string): void;
    stat(path: string): unknown;
    readFile(path: string): string | Uint8Array;
    readFile(path: string, opts: {
        encoding: "utf8";
    }): string;
    readFile(path: string, opts: {
        encoding: "binary";
    }): Uint8Array;
    writeFile(path: string, data: string | ArrayBufferView): void;
    unlink(path: string): void;
}
declare function OpenSCAD(options?: InitOptions): Promise<OpenSCAD>;
export default OpenSCAD;
