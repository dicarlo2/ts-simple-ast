﻿import * as ts from "typescript";
import {FileNotFoundError} from "./../errors";
import {FileSystemHost} from "./../FileSystemHost";

/**
 * Resolves compiler options.
 */
export class CompilerOptionsResolver {
    /**
     * Initializes a new instance.
     * @param fileSystem - Host for reading files.
     */
    constructor(private readonly fileSystem: FileSystemHost) {
    }

    /**
     * Get the compiler options.
     * @param options - The passed in compiler options or the tsconfig.json file path.
     */
    getCompilerOptions(options: { compilerOptions?: ts.CompilerOptions; tsConfigFilePath?: string; }) {
        let compilerOptions: ts.CompilerOptions;

        if (options.compilerOptions != null)
            compilerOptions = Object.assign({}, options.compilerOptions) as ts.CompilerOptions;
        else if (options.tsConfigFilePath != null)
            compilerOptions = this.getCompilerOptionsFromTsConfig(options.tsConfigFilePath);
        else
            compilerOptions = {};

        return this.getTsCompilerOptionsWithDefaults(compilerOptions);
    }

    private getCompilerOptionsFromTsConfig(filePath: string) {
        this.verifyFileExists(filePath);
        const absoluteFilePath = this.fileSystem.getAbsolutePath(filePath);
        const text = this.fileSystem.readFile(absoluteFilePath);
        const result = ts.parseConfigFileTextToJson(absoluteFilePath, text, true);

        if (result.error != null)
            throw new Error(result.error.messageText.toString());

        const settings = ts.convertCompilerOptionsFromJson(result.config.compilerOptions, this.fileSystem.getDirectoryName(filePath));

        if (!settings.options)
            throw new Error(this.getErrorMessage(settings.errors));

        return settings.options;
    }

    private getTsCompilerOptionsWithDefaults(compilerOptions: ts.CompilerOptions | undefined) {
        function getValue<T>(currentValue: T, newValue: T) {
            return (currentValue == null) ? newValue : currentValue;
        }

        let combinedOptions = (compilerOptions || {}) as any as ts.CompilerOptions;

        combinedOptions.allowJs = getValue(combinedOptions.allowJs, true);
        combinedOptions.noLib = getValue(combinedOptions.noLib, false);
        combinedOptions.experimentalDecorators = getValue(combinedOptions.experimentalDecorators, true);
        combinedOptions.suppressExcessPropertyErrors = getValue(combinedOptions.suppressExcessPropertyErrors, true);
        combinedOptions.suppressImplicitAnyIndexErrors = getValue(combinedOptions.suppressImplicitAnyIndexErrors, true);
        combinedOptions.noImplicitAny = getValue(combinedOptions.noImplicitAny, false);
        combinedOptions.target = getValue(combinedOptions.target, ts.ScriptTarget.Latest);
        combinedOptions.moduleResolution = getValue(combinedOptions.moduleResolution, ts.ModuleResolutionKind.NodeJs);
        combinedOptions.strictNullChecks = getValue(combinedOptions.strictNullChecks, false);
        combinedOptions.types = getValue(combinedOptions.types, []);

        return combinedOptions;
    }

    private getErrorMessage(errors: ts.Diagnostic[]) {
        let message = "";
        errors.forEach(err => message += `${err.messageText}\n`);
        return message;
    }

    private verifyFileExists(filePath: string) {
        // unfortunately the ts compiler doesn't do things asynchronously so for now we won't either
        if (!this.fileSystem.fileExists(filePath))
            throw new FileNotFoundError(this.fileSystem.getAbsolutePath(filePath));
    }
}