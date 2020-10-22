import { default as _typescript, SourceFile, TransformationContext } from "typescript";
export interface MacroOptions {
    configName: string;
}
export interface GenericObject {
    [key: string]: any;
}
export interface CreateMacroFnParams {
    source: SourceFile;
    config: GenericObject;
    context: TransformationContext;
    ts: typeof _typescript;
    importAlias: string;
    isTypescriptMacrosCall: boolean;
}
export interface CreateMacroFnProperties {
    isTypeScriptMacro: boolean;
    options: GenericObject;
}
export declare type CreateMacroFn = ((params: CreateMacroFnParams) => SourceFile) & CreateMacroFnProperties;
