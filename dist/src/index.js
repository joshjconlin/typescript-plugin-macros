"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const MacroTransformer_1 = require("./MacroTransformer");
var MacroTransformer_2 = require("./MacroTransformer");
Object.defineProperty(exports, "MacroError", { enumerable: true, get: function () { return MacroTransformer_2.MacroError; } });
var createMacro_1 = require("../createMacro");
Object.defineProperty(exports, "createMacro", { enumerable: true, get: function () { return createMacro_1.default; } });
// todo: document any file that createsMacro needs to have that function return as default export
exports.default = MacroTransformer_1.default;
