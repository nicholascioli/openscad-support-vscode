import { Uri } from "vscode";

declare type PreviewWebviewMsg = void;
declare type PreviewExtensionMsg = PreviewExecuteMsg;

declare interface FSEntry {
    url: string,
    path: string,
}

declare interface PreviewExecuteMsg {
    command: 'preview',
    path: FSEntry,
    deps: FSEntry[],
}
