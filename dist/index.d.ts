/**
 * Configuration types for wdk-worklet-bundler
 */
/**
 * Network configuration
 */
interface NetworkConfig {
    /** Module key from modules object */
    module: string;
    /** Chain ID */
    chainId: number;
    /** Blockchain identifier */
    blockchain: string;
    /** RPC provider URL */
    provider?: string;
    /** Additional config properties */
    [key: string]: unknown;
}
/**
 * WDK Configuration file format
 */
interface WdkConfig {
    /** Module definitions: key -> package path */
    modules: Record<string, string>;
    /** Network configurations */
    networks: Record<string, NetworkConfig>;
    /** Modules to preload (native addons like spark-frost-bare-addon) */
    preloadModules?: string[];
    /** Output paths */
    output?: {
        bundle?: string;
        types?: string;
    };
    /** Build options */
    options?: {
        minify?: boolean;
        sourceMaps?: boolean;
        targets?: string[];
    };
}
/**
 * Resolved configuration with absolute paths
 */
interface ResolvedConfig extends WdkConfig {
    /** Absolute path to config file */
    configPath: string;
    /** Absolute path to project root */
    projectRoot: string;
    /** Resolved output paths (absolute) */
    resolvedOutput: {
        bundle: string;
        types: string;
    };
}

/**
 * Configuration loader
 */

/**
 * Load and validate configuration
 */
declare function loadConfig(configPath?: string): Promise<ResolvedConfig>;

/**
 * Dependency validator
 */
interface ModuleInfo {
    name: string;
    path: string;
    version: string;
    isLocal: boolean;
}
interface ValidationResult {
    valid: boolean;
    installed: ModuleInfo[];
    missing: string[];
}
/**
 * Validate all modules are installed
 */
declare function validateDependencies(modules: Record<string, string>, projectRoot: string): ValidationResult;
/**
 * Detect package manager
 */
declare function detectPackageManager(projectRoot: string): 'npm' | 'yarn' | 'pnpm';
/**
 * Generate install command for missing dependencies
 */
declare function generateInstallCommand(missing: string[], packageManager?: 'npm' | 'yarn' | 'pnpm'): string;
interface InstallResult {
    success: boolean;
    command: string;
    installed: string[];
    failed: string[];
    error?: string;
}
interface UninstallResult {
    success: boolean;
    command: string;
    removed: string[];
    failed: string[];
    error?: string;
}
/**
 * Install missing dependencies
 */
declare function installDependencies(missing: string[], projectRoot: string, options?: {
    verbose?: boolean;
}): InstallResult;
/**
 * Generate uninstall command for packages
 */
declare function generateUninstallCommand(packages: string[], packageManager?: 'npm' | 'yarn' | 'pnpm'): string;
/**
 * Uninstall dependencies
 */
declare function uninstallDependencies(packages: string[], projectRoot: string, options?: {
    verbose?: boolean;
}): UninstallResult;

/**
 * Bundle generator
 * Orchestrates the full bundle generation process
 */

interface GenerateBundleOptions {
    dryRun?: boolean;
    verbose?: boolean;
    silent?: boolean;
    skipTypes?: boolean;
}
interface GenerateBundleResult {
    success: boolean;
    bundlePath: string;
    typesPath: string;
    bundleSize: number;
    duration: number;
    error?: string;
}
/**
 * Generate WDK bundle from configuration
 */
declare function generateBundle(config: ResolvedConfig, options?: GenerateBundleOptions): Promise<GenerateBundleResult>;
/**
 * Generate only the entry point and HRPC (no bare-pack)
 * Useful for debugging or custom bundling workflows
 */
declare function generateSourceFiles(config: ResolvedConfig, options?: {
    verbose?: boolean;
}): Promise<{
    entryPath: string;
    hrpcDir: string;
    schemaDir: string;
}>;

/**
 * Worklet entry point generator
 */

/**
 * Generate complete worklet entry point
 */
declare function generateEntryPoint(config: ResolvedConfig, outputDir: string): Promise<string>;

/**
 * Wallet modules code generator
 */

/**
 * Generate wallet modules code section
 */
declare function generateWalletModulesCode(config: ResolvedConfig): string;

/**
 * Network configurations code generator
 */

/**
 * Generate network configurations code section
 */
declare function generateNetworkConfigsCode(config: ResolvedConfig): string;

/**
 * HRPC Generator
 * Generates HRPC bindings using hyperschema and hrpc libraries
 */
interface HrpcGeneratorResult {
    schemaDir: string;
    hrpcDir: string;
    schemaJsonPath: string;
    hrpcJsonPath: string;
}
/**
 * Generate all HRPC files
 */
declare function generateHrpc(outputDir: string): Promise<HrpcGeneratorResult>;
/**
 * Copy existing HRPC files from a source directory (for migration)
 */
declare function copyExistingHrpc(sourceDir: string, outputDir: string): HrpcGeneratorResult;

/**
 * HRPC Schema definitions
 * These define the RPC messages and methods for WDK worklet communication
 */
interface SchemaField {
    name: string;
    type: string;
    required?: boolean;
    version?: number;
}
interface SchemaEnum {
    name: string;
    namespace: string;
    offset?: number;
    enum: {
        key: string;
        version: number;
    }[];
}
interface SchemaStruct {
    name: string;
    namespace: string;
    compact?: boolean;
    flagsPosition?: number;
    fields: SchemaField[];
}
interface HrpcMethod {
    id: number;
    name: string;
    request: {
        name: string;
        send?: boolean;
        stream?: boolean;
    };
    response?: {
        name: string;
        stream?: boolean;
    };
    version?: number;
}
/**
 * Core schema definitions for WDK RPC
 */
declare const CORE_SCHEMA: (SchemaEnum | SchemaStruct)[];
/**
 * HRPC method definitions
 */
declare const HRPC_METHODS: HrpcMethod[];

export { CORE_SCHEMA, type GenerateBundleOptions, type GenerateBundleResult, HRPC_METHODS, type HrpcGeneratorResult, type HrpcMethod, type InstallResult, type ModuleInfo, type NetworkConfig, type ResolvedConfig, type SchemaEnum, type SchemaField, type SchemaStruct, type UninstallResult, type ValidationResult, type WdkConfig, copyExistingHrpc, detectPackageManager, generateBundle, generateEntryPoint, generateHrpc, generateInstallCommand, generateNetworkConfigsCode, generateSourceFiles, generateUninstallCommand, generateWalletModulesCode, installDependencies, loadConfig, uninstallDependencies, validateDependencies };
