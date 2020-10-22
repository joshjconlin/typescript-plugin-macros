import * as _typescript from 'typescript';
import { TransformerFactory } from "typescript";
export declare class MacroError extends Error {
    constructor(message: string);
}
declare const transformer: (_program?: _typescript.Program | undefined) => TransformerFactory<any>;
export default transformer;
