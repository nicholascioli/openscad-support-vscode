import { Uri, WorkspaceConfiguration } from "vscode";
import { CodeFile, ErrorCollector, IncludeResolver, ParsingHelper, ScadFile, SolutionFile, SolutionManager } from "openscad-parser";

import { PreviewPanel } from "./previewPanel";

export class PreviewManager {
    constructor() {}

    public onDidChangeConfiguration(config: WorkspaceConfiguration): void {
        //
    }

    public async watchFile(extensionUri: Uri, file: Uri): Promise<void> {
        PreviewPanel.createOrShow(extensionUri);
        console.log("Watching file at:", file);

        // Parse the file to preview, for we need all includes / uses
        const [ast, _] = ParsingHelper.parseFile(await CodeFile.load(file.fsPath));
        if (!ast) {
            console.error("NO AST???");
            return;
        }

        // Find all includes / uses
        const imports = await findImports(ast);
        console.log("GOT IMPORTS:", imports);
        PreviewPanel.preview(file, imports);
    }
}

// Finds all import / use statements in a scad file.
async function findImports(ast: ScadFile): Promise<Uri[]> {
    const resolver = new IncludeResolver(new SolutionManager());
    const errorHandler = new ErrorCollector();

    const includes = await resolver.resolveIncludes(ast, errorHandler);
    if (errorHandler.hasErrors()) {
        console.error("Could not resolve includes :(");
        errorHandler.printErrors();
        return [];
    }

    const uses = await resolver.resolveUses(ast, errorHandler);
    if (errorHandler.hasErrors()) {
        console.error("Could not resolve uses :(");
        errorHandler.printErrors();
        return [];
    }

    // Recur into each file and aggregate the results here
    const fetchImports = async (file: SolutionFile): Promise<Uri[]> => {
        if (!file.ast) { return []; }

        return [Uri.file(file.codeFile.path), ...await findImports(file.ast as ScadFile)];
    };

    const imports = await Promise.all(includes.concat(uses).map(fetchImports));
    return imports.flat();
}
