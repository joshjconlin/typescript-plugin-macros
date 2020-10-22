import { CreateMacroFn, CreateMacroFnParams, GenericObject, MacroOptions } from "./types";
export default function createMacro(macro: CreateMacroFn, options: MacroOptions & GenericObject): {
    (args: CreateMacroFnParams): import("typescript").SourceFile;
    isTypeScriptMacro: boolean;
    options: MacroOptions & GenericObject;
};
