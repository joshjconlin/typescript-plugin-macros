import { default as transformer } from './MacroTransformer'
export { MacroError } from './MacroTransformer';
export { default as createMacro } from "./createMacro";

// todo: document any file that createsMacro needs to have that function return as default export
export default transformer;
