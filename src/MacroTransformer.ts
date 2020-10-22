import * as _typescript from 'typescript';
import {
    Identifier,
    isImportDeclaration,
    isStringLiteral,
    Node,
    Program,
    SourceFile,
    TransformationContext,
    TransformerFactory,
    TypeChecker,
    visitEachChild,
    visitNode
} from "typescript";

import path from "path";
import {CreateMacroFn} from "./types";
const resolve = require('resolve');

export class MacroError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'MacroError';
        if (typeof Error.captureStackTrace === 'function') {
            Error.captureStackTrace(this, this.constructor);
        } else if (!this.stack) {
            this.stack = new Error(message).stack;
        }
    }
}

class Transformer {
    private rootMacros = new Map<string, CreateMacroFn>();
    // private configExplorer = null;
    private readonly typeChecker: TypeChecker;
    private readonly context: TransformationContext;
    private readonly macroRegex: RegExp;
    private sourceFile: SourceFile | undefined;

    constructor(context: TransformationContext, typeChecker: TypeChecker) {
        this.macroRegex = /[./]macro(\.js|\.ts)?.$/;
        this.context = context;
        this.typeChecker = typeChecker;

        this.testMacrosRegex = this.testMacrosRegex.bind(this);
        this.transform = this.transform.bind(this);
        this.extractMacros = this.extractMacros.bind(this);
        this.transformMacros = this.transformMacros.bind(this);
        this.isMacroImportedInFile = this.isMacroImportedInFile.bind(this);
        this.getImportedMacro = this.getImportedMacro.bind(this);
    }

    /**
     *  @todo set this up, probably not back compatible with existing babel macros, since would require transforming babel syntax to typescript
     **/
    // private getConfigExplorer() {
    //     return (this.configExplorer =
    //         this.configExplorer ||
    //         // Lazy load cosmiconfig since it is a relatively large bundle
    //         require('cosmiconfig').cosmiconfigSync('typescript-plugin-macros', {
    //             searchPlaces: [
    //                 'package.json',
    //                 '.typescript-plugin-macrosrc',
    //                 '.typescript-plugin-macrosrc.json',
    //                 '.typescript-plugin-macrosrc.yaml',
    //                 '.typescript-plugin-macrosrc.yml',
    //                 '.typescript-plugin-macrosrc.js',
    //                 'typescript-plugin-macros.config.js',
    //             ],
    //             packageProp: 'typescriptMacros',
    //         }));
    // }

    private getFullFilename(filename: string): string {
        if (path.isAbsolute(filename)) {
            return filename;
        }

        return path.join(process.cwd(), filename);
    }

    // private getConfigFromFile(configName: string, filename: string) {
    //     try {
    //         const loaded = this.getConfigExplorer().search(filename);
    //
    //         if (loaded) {
    //             return {
    //                 options: loaded.config[configName],
    //                 path: loaded.filepath,
    //             };
    //         }
    //     } catch (e) {
    //         return { error: e };
    //     }
    //     return {};
    // }
    //
    // private getConfigFromOptions(configName: string, options: any) {
    //     if (options.hasOwnProperty(configName)) {
    //         if (options[configName] && typeof options[configName] !== 'object') {
    //             // eslint-disable-next-line no-console
    //             console.error(
    //                 `The macro plugin options' ${configName} property was not an object or null.`
    //             );
    //         } else {
    //             return { options: options[configName] };
    //         }
    //     }
    //     return {};
    // }
    //
    // private getConfig(macro, filename, source, options) {
    //     const { configName } = macro.options;
    //     if (configName) {
    //         const fileConfig = this.getConfigFromFile(configName, filename);
    //         const optionsConfig = this.getConfigFromOptions(configName, options);
    //
    //         if (
    //             optionsConfig.options === undefined &&
    //             fileConfig.options === undefined &&
    //             fileConfig.error !== undefined
    //         ) {
    //             // eslint-disable-next-line no-console
    //             console.error(
    //                 `There was an error trying to load the config "${configName}" ` +
    //                 `for the macro imported from "${source}. ` +
    //                 `Please see the error thrown for more information.`
    //             );
    //             throw fileConfig.error;
    //         }
    //
    //         if (
    //             fileConfig.options !== undefined &&
    //             optionsConfig.options !== undefined &&
    //             typeof fileConfig.options !== 'object'
    //         ) {
    //             throw new Error(
    //                 `${fileConfig.path} specified a ${configName} config of type ` +
    //                 `${typeof optionsConfig.options}, but the the macros plugin's ` +
    //                 `options.${configName} did contain an object. Both configs must ` +
    //                 `contain objects for their options to be mergeable.`
    //             );
    //         }
    //
    //         return {
    //             ...optionsConfig.options,
    //             ...fileConfig.options,
    //         };
    //     }
    //     return undefined;
    // }

    private nodeResolvePath(source: string, basedir: string) {
        return resolve.sync(source, {
            basedir,
            // This is here to support the package being globally installed
            paths: [path.resolve(__dirname, '../../')],
        });
    }

    private readonly testMacrosRegex = (value: string) => this.macroRegex.test(value);

    private interopRequire(path: string) {
        // eslint-disable-next-line import/no-dynamic-require
        const o = require(path);
        return o && o.__esModule && o.default ? o.default : o;
    }

    public transform(sourceFile: SourceFile): Node {
        if (!sourceFile) {
            throw new MacroError('No source file handed to transformer');
        }
        this.sourceFile = sourceFile;

        this.sourceFile = visitNode(this.sourceFile, this.extractMacros);

        if (this.rootMacros.size > 0) {
            return this.transformMacros();
        }

        return this.sourceFile;
    }

    private transformMacros(): SourceFile {
        let transformedSource: SourceFile = this.sourceFile!;
        const context = this.context;

        this.rootMacros.forEach((macro, importAlias) => {
            transformedSource = macro({
                source: transformedSource,
                // config: this.getConfig() todo: config
                config: {},
                context,
                ts: _typescript,
                importAlias,
                isTypescriptMacrosCall: true,
            });
        });

        return transformedSource;
    }

    private isMacroImportedInFile(node: Node): boolean {
        if (isImportDeclaration(node) && isStringLiteral(node.moduleSpecifier)) {
            const name = node.moduleSpecifier.getFullText();

            return this.testMacrosRegex(name);
        }

        return false;
    }

    private getImportedMacro(node: Node): [CreateMacroFn, Identifier] {
        if (!isImportDeclaration(node)) {
            throw new MacroError('Node is not an import declaration');
        }

        const importClause = node.importClause;

        if (!importClause) {
            throw new MacroError('imports of macros must have a clause');
        }

        //import { RETRIABLE } from './src/domains/macros/retriable/retriable.macro';
        //elements: [
        // ImportSpecifier (RETRIABLE)
        // pos:8
        // end:18
        // flags:0
        // kind:258 (SyntaxKind.ImportSpecifier)
        // name:
        // Identifier
        // ]
        // todo: make this work with more than one import, {} imports
        // @ts-ignore
        const identifier = importClause.name ?? importClause.namedBindings.elements[0].name;

        if (!identifier) {
            throw new MacroError('Unable to get identifier of import');
        }

        const text = node.moduleSpecifier.getText();
        // strip off extra string literals
        const sourcePath = text.substr(1, text.length - 1);

        const isRelative = sourcePath.indexOf('.') === 0;

        let macro: CreateMacroFn;

        // todo: test with node module, extract get require path to function, to get rid of if else
        if (isRelative) {
            const importSymbol = this.typeChecker.getSymbolAtLocation(node.moduleSpecifier);

            if (typeof importSymbol === 'undefined') {
                throw new MacroError(`Symbol for import not found!.`);
            }

            const escapedName = importSymbol.getEscapedName().toString();

            // strip off extra string literals, todo: replace with regex
            const absoluteFilePath = escapedName.substr(1, escapedName.length - 2);

            macro = this.interopRequire(absoluteFilePath);
        } else {
            const requirePath = this.nodeResolvePath(sourcePath, this.getFullFilename(sourcePath));
            macro = this.interopRequire(requirePath);
        }

        if (!macro.isTypeScriptMacro) {
            throw new Error(
                `The macro imported from "${sourcePath}" must be wrapped in "createMacro" ` +
                `which you can get from "typescript-plugin-macros". `
            );
        }

        return [macro, identifier];
    }

    private extractMacros(node: Node): Node | undefined {
        // second conditional is for the typescript compilers sake
        if (this.isMacroImportedInFile(node)) {
            const [macro, identifier] = this.getImportedMacro(node);

            if (typeof macro === 'undefined') {
                throw new MacroError('Error importing macro library.');
            }

            this.rootMacros.set(identifier.text, macro);

            // remove import
            return undefined;
        }

        return visitEachChild(node, this.extractMacros, this.context);
    }
}

const transformer = (_program?: Program): TransformerFactory<any> => (
    context: TransformationContext
) => {
    const typeChecker = _program?.getTypeChecker();

    if (!typeChecker) {
        throw Error('unable to get dependency typeChecker');
    }

    return (sourceFile: SourceFile) => {
        return new Transformer(context, typeChecker).transform(sourceFile);
    };
};

export default transformer;
