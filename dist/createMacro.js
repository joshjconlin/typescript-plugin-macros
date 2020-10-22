"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const MacroTransformer_1 = require("./MacroTransformer");
function createMacro(macro, options) {
    if (options.configName === 'options') {
        throw new Error(`You cannot use the configName "options". It is reserved for typescript-plugin-macros.`);
    }
    macroWrapper.isTypeScriptMacro = true;
    macroWrapper.options = options;
    // @ts-ignore
    return macroWrapper;
    function macroWrapper(args) {
        const { source, isTypescriptMacrosCall } = args;
        if (!isTypescriptMacrosCall) {
            throw new MacroTransformer_1.MacroError(`The macro you imported "${source}" is being executed outside the context of compilation with typescript-plugin-macros. ` +
                `This indicates that you don't have the typescript plugin "typescript-plugin-macros" configured correctly. `);
        }
        return macro(args);
    }
}
exports.default = createMacro;
