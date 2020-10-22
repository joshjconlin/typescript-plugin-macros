import {CreateMacroFn, CreateMacroFnParams, GenericObject, MacroOptions} from "./types";
import {MacroError} from "./MacroTransformer";

export default function createMacro(macro: CreateMacroFn, options: MacroOptions & GenericObject) {
    if (options.configName === 'options') {
        throw new Error(
            `You cannot use the configName "options". It is reserved for typescript-plugin-macros.`
        );
    }

    macroWrapper.isTypeScriptMacro = true;
    macroWrapper.options = options;

    // @ts-ignore
    return macroWrapper;

    function macroWrapper(args: CreateMacroFnParams) {
        const { source, isTypescriptMacrosCall } = args;

        if (!isTypescriptMacrosCall) {
            throw new MacroError(
                `The macro you imported "${source}" is being executed outside the context of compilation with typescript-plugin-macros. ` +
                `This indicates that you don't have the typescript plugin "typescript-plugin-macros" configured correctly. `
            );
        }

        return macro(args);
    }
}
