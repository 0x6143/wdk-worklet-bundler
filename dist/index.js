"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  CORE_SCHEMA: () => CORE_SCHEMA,
  HRPC_METHODS: () => HRPC_METHODS,
  copyExistingHrpc: () => copyExistingHrpc,
  detectPackageManager: () => detectPackageManager,
  generateBundle: () => generateBundle,
  generateEntryPoint: () => generateEntryPoint,
  generateHrpc: () => generateHrpc,
  generateInstallCommand: () => generateInstallCommand,
  generateNetworkConfigsCode: () => generateNetworkConfigsCode,
  generateSourceFiles: () => generateSourceFiles,
  generateUninstallCommand: () => generateUninstallCommand,
  generateWalletModulesCode: () => generateWalletModulesCode,
  installDependencies: () => installDependencies,
  loadConfig: () => loadConfig,
  uninstallDependencies: () => uninstallDependencies,
  validateDependencies: () => validateDependencies
});
module.exports = __toCommonJS(index_exports);

// src/config/loader.ts
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));

// src/config/schema.ts
var import_ajv = __toESM(require("ajv"));
var configSchema = {
  $schema: "http://json-schema.org/draft-07/schema#",
  type: "object",
  required: ["modules", "networks"],
  properties: {
    modules: {
      type: "object",
      additionalProperties: { type: "string" },
      minProperties: 1,
      description: "Map of module keys to package paths"
    },
    networks: {
      type: "object",
      additionalProperties: {
        type: "object",
        required: ["module", "chainId", "blockchain"],
        properties: {
          module: { type: "string", description: "Key from modules object" },
          chainId: { type: "number", description: "Chain ID" },
          blockchain: { type: "string", description: "Blockchain identifier" },
          provider: { type: "string", description: "RPC provider URL" }
        }
      },
      minProperties: 1
    },
    preloadModules: {
      type: "array",
      items: { type: "string" },
      description: "Modules to preload (native addons)"
    },
    output: {
      type: "object",
      properties: {
        bundle: { type: "string", description: "Output bundle path" },
        types: { type: "string", description: "Output types path" }
      }
    },
    options: {
      type: "object",
      properties: {
        minify: { type: "boolean", description: "Minify output" },
        sourceMaps: { type: "boolean", description: "Generate source maps" },
        targets: {
          type: "array",
          items: { type: "string" },
          description: "Target platforms for bare-pack"
        }
      }
    }
  }
};
var ajv = new import_ajv.default({ allErrors: true, verbose: true });
var validate = ajv.compile(configSchema);
function validateConfigSchema(config) {
  const valid = validate(config);
  if (!valid && validate.errors) {
    const errors = validate.errors.map((e) => {
      const path6 = e.instancePath || "root";
      return `  - ${path6}: ${e.message}`;
    });
    throw new Error(`Invalid configuration:
${errors.join("\n")}`);
  }
}
function validateModuleNetworkMapping(config) {
  const moduleKeys = Object.keys(config.modules);
  for (const [networkName, networkConfig] of Object.entries(config.networks)) {
    if (!moduleKeys.includes(networkConfig.module)) {
      throw new Error(
        `Network "${networkName}" references module "${networkConfig.module}" which is not defined in modules. Available: ${moduleKeys.join(", ")}`
      );
    }
  }
}
function validateNoDuplicateChainIds(config) {
  const chainIds = /* @__PURE__ */ new Map();
  for (const [networkName, networkConfig] of Object.entries(config.networks)) {
    if (networkConfig.chainId === 0) continue;
    const existing = chainIds.get(networkConfig.chainId);
    if (existing) {
      throw new Error(
        `Duplicate chainId ${networkConfig.chainId}: used by both "${existing}" and "${networkName}"`
      );
    }
    chainIds.set(networkConfig.chainId, networkName);
  }
}
function validateConfig(config) {
  validateConfigSchema(config);
  validateModuleNetworkMapping(config);
  validateNoDuplicateChainIds(config);
}

// src/config/loader.ts
var CONFIG_FILES = [
  "wdk.config.js",
  "wdk.config.cjs",
  "wdk.config.mjs",
  "wdk.config.json",
  ".wdkrc",
  ".wdkrc.json",
  ".wdkrc.js"
];
function findConfigFile(dir) {
  for (const filename of CONFIG_FILES) {
    const filepath = import_path.default.join(dir, filename);
    if (import_fs.default.existsSync(filepath)) {
      return filepath;
    }
  }
  return null;
}
async function loadConfigFile(filepath) {
  const ext = import_path.default.extname(filepath);
  if (ext === ".json" || filepath.endsWith(".wdkrc")) {
    const content = import_fs.default.readFileSync(filepath, "utf-8");
    try {
      return JSON.parse(content);
    } catch (error) {
      throw new Error(
        `Invalid JSON in config file ${filepath}: ${error instanceof Error ? error.message : error}`
      );
    }
  }
  const resolved = require.resolve(filepath);
  delete require.cache[resolved];
  const config = require(filepath);
  return config.default || config;
}
async function loadConfig(configPath) {
  const cwd = process.cwd();
  let filepath;
  if (configPath) {
    filepath = import_path.default.resolve(cwd, configPath);
    if (!import_fs.default.existsSync(filepath)) {
      throw new Error(`Config file not found: ${filepath}`);
    }
  } else {
    const found = findConfigFile(cwd);
    if (!found) {
      throw new Error(
        `No wdk.config.js found. Run \`npx wdk-worklet-bundler init\` to create one.
Searched for: ${CONFIG_FILES.join(", ")}`
      );
    }
    filepath = found;
  }
  const config = await loadConfigFile(filepath);
  validateConfig(config);
  const projectRoot = import_path.default.dirname(filepath);
  const resolvedOutput = {
    bundle: import_path.default.resolve(
      projectRoot,
      config.output?.bundle || "./.wdk/wdk.bundle.js"
    ),
    types: import_path.default.resolve(
      projectRoot,
      config.output?.types || "./.wdk/wdk.d.ts"
    )
  };
  return {
    ...config,
    configPath: filepath,
    projectRoot,
    resolvedOutput
  };
}

// src/validators/dependencies.ts
var import_fs2 = __toESM(require("fs"));
var import_path2 = __toESM(require("path"));
function resolveModule(modulePath, projectRoot) {
  if (modulePath.startsWith(".") || modulePath.startsWith("/")) {
    const absolutePath = import_path2.default.resolve(projectRoot, modulePath);
    if (import_fs2.default.existsSync(absolutePath)) {
      const pkgPath2 = import_path2.default.join(absolutePath, "package.json");
      let pkg2 = { name: import_path2.default.basename(absolutePath), version: "local" };
      if (import_fs2.default.existsSync(pkgPath2)) {
        try {
          pkg2 = JSON.parse(import_fs2.default.readFileSync(pkgPath2, "utf-8"));
        } catch {
        }
      }
      return {
        name: pkg2.name,
        path: absolutePath,
        version: pkg2.version,
        isLocal: true
      };
    }
    return null;
  }
  const nodeModulesPath = import_path2.default.join(projectRoot, "node_modules", modulePath);
  if (!import_fs2.default.existsSync(nodeModulesPath)) {
    return null;
  }
  const pkgPath = import_path2.default.join(nodeModulesPath, "package.json");
  if (!import_fs2.default.existsSync(pkgPath)) {
    return null;
  }
  let pkg;
  try {
    pkg = JSON.parse(import_fs2.default.readFileSync(pkgPath, "utf-8"));
  } catch {
    return null;
  }
  return {
    name: pkg.name,
    path: nodeModulesPath,
    version: pkg.version,
    isLocal: false
  };
}
function validateDependencies(modules, projectRoot) {
  const installed = [];
  const missing = [];
  for (const [_key, modulePath] of Object.entries(modules)) {
    const info = resolveModule(modulePath, projectRoot);
    if (info) {
      installed.push(info);
    } else {
      missing.push(modulePath);
    }
  }
  return {
    valid: missing.length === 0,
    installed,
    missing
  };
}
function detectPackageManager(projectRoot) {
  if (import_fs2.default.existsSync(import_path2.default.join(projectRoot, "pnpm-lock.yaml"))) {
    return "pnpm";
  }
  if (import_fs2.default.existsSync(import_path2.default.join(projectRoot, "yarn.lock"))) {
    return "yarn";
  }
  return "npm";
}
function generateInstallCommand(missing, packageManager = "npm") {
  const packages = missing.filter(
    (m) => !m.startsWith(".") && !m.startsWith("/")
  );
  if (packages.length === 0) {
    return "";
  }
  switch (packageManager) {
    case "yarn":
      return `yarn add ${packages.join(" ")}`;
    case "pnpm":
      return `pnpm add ${packages.join(" ")}`;
    default:
      return `npm install ${packages.join(" ")}`;
  }
}
function installDependencies(missing, projectRoot, options = {}) {
  const { execSync: execSync2 } = require("child_process");
  const packages = missing.filter(
    (m) => !m.startsWith(".") && !m.startsWith("/")
  );
  const localPaths = missing.filter(
    (m) => m.startsWith(".") || m.startsWith("/")
  );
  if (packages.length === 0) {
    return {
      success: localPaths.length === 0,
      command: "",
      installed: [],
      failed: localPaths,
      error: localPaths.length > 0 ? `Cannot auto-install local paths: ${localPaths.join(", ")}` : void 0
    };
  }
  const packageManager = detectPackageManager(projectRoot);
  const command = generateInstallCommand(packages, packageManager);
  try {
    execSync2(command, {
      cwd: projectRoot,
      stdio: options.verbose ? "inherit" : "pipe"
    });
    return {
      success: localPaths.length === 0,
      command,
      installed: packages,
      failed: localPaths,
      error: localPaths.length > 0 ? `Cannot auto-install local paths: ${localPaths.join(", ")}` : void 0
    };
  } catch (error) {
    return {
      success: false,
      command,
      installed: [],
      failed: [...packages, ...localPaths],
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
function generateUninstallCommand(packages, packageManager = "npm") {
  const npmPackages = packages.filter(
    (m) => !m.startsWith(".") && !m.startsWith("/")
  );
  if (npmPackages.length === 0) {
    return "";
  }
  switch (packageManager) {
    case "yarn":
      return `yarn remove ${npmPackages.join(" ")}`;
    case "pnpm":
      return `pnpm remove ${npmPackages.join(" ")}`;
    default:
      return `npm uninstall ${npmPackages.join(" ")}`;
  }
}
function uninstallDependencies(packages, projectRoot, options = {}) {
  const { execSync: execSync2 } = require("child_process");
  const npmPackages = packages.filter(
    (m) => !m.startsWith(".") && !m.startsWith("/")
  );
  if (npmPackages.length === 0) {
    return {
      success: true,
      command: "",
      removed: [],
      failed: []
    };
  }
  const packageManager = detectPackageManager(projectRoot);
  const command = generateUninstallCommand(npmPackages, packageManager);
  try {
    execSync2(command, {
      cwd: projectRoot,
      stdio: options.verbose ? "inherit" : "pipe"
    });
    return {
      success: true,
      command,
      removed: npmPackages,
      failed: []
    };
  } catch (error) {
    return {
      success: false,
      command,
      removed: [],
      failed: npmPackages,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// src/bundler/index.ts
var import_fs5 = __toESM(require("fs"));
var import_path5 = __toESM(require("path"));
var import_child_process = require("child_process");

// src/generators/entry.ts
var import_fs3 = __toESM(require("fs"));
var import_path3 = __toESM(require("path"));

// src/generators/wallet-modules.ts
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
function toVarName(key) {
  return `WalletManager${key.split(/[-_]/).map(capitalize).join("")}`;
}
function getNetworksForModule(moduleKey, config) {
  return Object.entries(config.networks).filter(([_, cfg]) => cfg.module === moduleKey).map(([name]) => name);
}
function generateWalletModulesCode(config) {
  const lines = [];
  if (config.preloadModules?.length) {
    lines.push("// Preload modules (native addons)");
    for (const mod of config.preloadModules) {
      lines.push(`require('${mod}');`);
    }
    lines.push("");
  }
  const coreModule = config.modules.core || "@tetherto/wdk";
  lines.push("// Load WDK core");
  lines.push(`const wdkModule = require('${coreModule}');`);
  lines.push("const WDK = wdkModule.default || wdkModule.WDK || wdkModule;");
  lines.push("");
  const moduleVars = [];
  lines.push("// Load wallet modules");
  for (const [key, modulePath] of Object.entries(config.modules)) {
    if (key === "core") continue;
    const varName = toVarName(key);
    const networks = getNetworksForModule(key, config);
    lines.push(`const ${key}Module = require('${modulePath}');`);
    lines.push(`const ${varName} = ${key}Module.default || ${key}Module;`);
    moduleVars.push({ varName, networks });
  }
  lines.push("");
  lines.push("// Map networks to wallet managers");
  lines.push("const walletManagers = {};");
  for (const { varName, networks } of moduleVars) {
    for (const network of networks) {
      lines.push(`walletManagers['${network}'] = ${varName};`);
    }
  }
  lines.push("");
  const requiredNetworks = Object.keys(config.networks);
  lines.push(`const requiredNetworks = ${JSON.stringify(requiredNetworks)};`);
  return lines.join("\n");
}

// src/generators/network-configs.ts
function generateNetworkConfigsCode(config) {
  const lines = [];
  lines.push("// Network configurations (embedded from wdk.config.js)");
  lines.push("const embeddedNetworkConfigs = {");
  for (const [name, networkConfig] of Object.entries(config.networks)) {
    const { module: _module, ...configWithoutModule } = networkConfig;
    const configJson = JSON.stringify(configWithoutModule, null, 2).split("\n").map((line, i) => i === 0 ? line : "  " + line).join("\n");
    lines.push(`  '${name}': ${configJson},`);
  }
  lines.push("};");
  return lines.join("\n");
}

// src/generators/entry.ts
var CRYPTO_HELPERS = `
// ============================================================
// CRYPTO HELPERS
// ============================================================
const memzero = (buffer) => {
  if (!buffer) return
  if (Buffer.isBuffer(buffer)) buffer.fill(0)
  else if (buffer instanceof Uint8Array) buffer.fill(0)
  else if (buffer instanceof ArrayBuffer) new Uint8Array(buffer).fill(0)
  else if (buffer.buffer instanceof ArrayBuffer) {
    new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength).fill(0)
  }
}

const generateEncryptionKey = () => {
  const key = crypto.randomBytes(32)
  const keyBase64 = key.toString('base64')
  memzero(key)
  return keyBase64
}

const encrypt = (data, keyBase64) => {
  const key = Buffer.from(keyBase64, 'base64')
  const iv = crypto.randomBytes(12)
  const dataBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(dataBuffer), cipher.final()])
  const authTag = cipher.getAuthTag()
  const result = Buffer.concat([iv, encrypted, authTag])
  const resultBase64 = result.toString('base64')
  memzero(key); memzero(iv); memzero(encrypted); memzero(authTag)
  return resultBase64
}

const decrypt = (encryptedBase64, keyBase64) => {
  const key = Buffer.from(keyBase64, 'base64')
  const encryptedBuffer = Buffer.from(encryptedBase64, 'base64')
  const iv = encryptedBuffer.subarray(0, 12)
  const authTag = encryptedBuffer.subarray(encryptedBuffer.length - 16)
  const encrypted = encryptedBuffer.subarray(12, encryptedBuffer.length - 16)
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
  memzero(key); memzero(encryptedBuffer); memzero(iv); memzero(authTag); memzero(encrypted)
  return decrypted
}

const generateEntropy = (wordCount) => {
  if (wordCount !== 12 && wordCount !== 24) throw new Error('Word count must be 12 or 24')
  const entropyLength = wordCount === 12 ? 16 : 32
  const entropyBuffer = crypto.randomBytes(entropyLength)
  const entropy = new Uint8Array(entropyLength)
  entropy.set(entropyBuffer)
  memzero(entropyBuffer)
  return entropy
}

const encryptSecrets = (seed, entropy) => {
  const encryptionKey = generateEncryptionKey()
  const seedBuffer = Buffer.isBuffer(seed) ? seed : Buffer.from(seed)
  const entropyBuffer = Buffer.isBuffer(entropy) ? entropy : Buffer.from(entropy)
  const encryptedSeedBuffer = encrypt(seedBuffer, encryptionKey)
  const encryptedEntropyBuffer = encrypt(entropyBuffer, encryptionKey)
  memzero(seedBuffer); memzero(entropyBuffer)
  return { encryptionKey, encryptedSeedBuffer, encryptedEntropyBuffer }
}

const safeStringify = (obj) => JSON.stringify(obj, (key, value) =>
  typeof value === 'bigint' ? value.toString() : value
)

const withErrorHandling = (handler) => async (...args) => {
  try { return await handler(...args) }
  catch (error) { throw new Error(rpcException.stringifyError(error)) }
}

const callWdkMethod = async (methodName, network, accountIndex, args = null, options = {}) => {
  if (!wdk) throw new Error('WDK not initialized. Call initializeWDK first.')
  const account = await wdk.getAccount(network, accountIndex)
  if (typeof account[methodName] !== 'function') {
    if (options.defaultValue !== undefined) {
      console.warn(\`\${methodName} not available for network: \${network}, returning default value\`)
      return options.defaultValue
    }
    const availableMethods = Object.keys(account).filter(key => typeof account[key] === 'function').join(', ')
    throw new Error(\`Method "\${methodName}" not found on account for network "\${network}". Available methods: \${availableMethods}\`)
  }
  const result = await account[methodName](args)
  return options.transformResult ? options.transformResult(result) : result
}
`.trim();
var RPC_HANDLERS = `
// ============================================================
// RPC HANDLERS
// ============================================================
rpc.onWorkletStart(withErrorHandling(async (init) => {
  return { status: 'started' }
}))

rpc.onGenerateEntropyAndEncrypt(withErrorHandling(async (request) => {
  const { wordCount } = request
  if (wordCount !== 12 && wordCount !== 24) throw new Error('Word count must be 12 or 24')
  const entropy = generateEntropy(wordCount)
  const mnemonic = entropyToMnemonic(entropy, wordlist)
  const seedBuffer = mnemonicToSeedSync(mnemonic)
  const encryptionKey = generateEncryptionKey()
  const encryptedSeedBuffer = encrypt(seedBuffer, encryptionKey)
  const entropyBuffer = Buffer.from(entropy)
  const encryptedEntropyBuffer = encrypt(entropyBuffer, encryptionKey)
  memzero(entropy); memzero(seedBuffer); memzero(entropyBuffer)
  return { encryptionKey, encryptedSeedBuffer, encryptedEntropyBuffer }
}))

rpc.onGetMnemonicFromEntropy(withErrorHandling(async (request) => {
  const { encryptedEntropy, encryptionKey } = request
  const entropyBuffer = decrypt(encryptedEntropy, encryptionKey)
  const entropy = new Uint8Array(entropyBuffer.length)
  entropy.set(entropyBuffer)
  const mnemonic = entropyToMnemonic(entropy, wordlist)
  memzero(entropyBuffer); memzero(entropy)
  return { mnemonic }
}))

rpc.onGetSeedAndEntropyFromMnemonic(withErrorHandling(async (request) => {
  const { mnemonic } = request
  if (!mnemonic || typeof mnemonic !== 'string') throw new Error('Mnemonic phrase must be a non-empty string')
  const seed = mnemonicToSeedSync(mnemonic)
  const entropy = mnemonicToEntropy(mnemonic, wordlist)
  return encryptSecrets(seed, entropy)
}))

rpc.onInitializeWDK(withErrorHandling(async (init) => {
  if (!WDK) {
    throw new Error('WDK not loaded')
  }
  if (wdk) {
    console.log('Disposing existing WDK instance...')
    wdk.dispose()
  }

  // Merge embedded configs with runtime configs (runtime takes precedence)
  const runtimeConfigs = init.config ? JSON.parse(init.config) : {}
  const mergedConfigs = { ...embeddedNetworkConfigs, ...runtimeConfigs }

  const missingNetworks = requiredNetworks.filter(network => !mergedConfigs[network])
  if (missingNetworks.length > 0) {
    throw new Error(\`Missing network configurations: \${missingNetworks.join(', ')}\`)
  }

  let decryptedSeedBuffer
  if (init.encryptionKey && init.encryptedSeed) {
    console.log('Initializing WDK with encrypted seed')
    decryptedSeedBuffer = decrypt(init.encryptedSeed, init.encryptionKey)
  } else {
    throw new Error('(encryptionKey + encryptedSeed) must be provided')
  }

  wdk = new WDK(decryptedSeedBuffer)

  for (const [networkName, config] of Object.entries(mergedConfigs)) {
    if (config && typeof config === 'object') {
      const walletManager = walletManagers[networkName]
      if (!walletManager) throw new Error(\`No wallet manager found for network: \${networkName}\`)
      console.log(\`Registering \${networkName} wallet\`)
      wdk.registerWallet(networkName, walletManager, config)
    }
  }

  console.log('WDK initialization complete')
  return { status: 'initialized' }
}))

rpc.onCallMethod(withErrorHandling(async (payload) => {
  const { methodName, network, accountIndex, args: argsJson } = payload
  const args = argsJson ? JSON.parse(argsJson) : null
  const result = await callWdkMethod(methodName, network, accountIndex, args)
  return { result: safeStringify(result) }
}))

rpc.onDispose(withErrorHandling(() => {
  if (wdk) { wdk.dispose(); wdk = null }
}))

console.log('[WDK Worklet] Entry point loaded (generated by @tetherto/wdk-worklet-bundler)')
`.trim();
async function generateEntryPoint(config, outputDir) {
  const walletModulesCode = generateWalletModulesCode(config);
  const networkConfigsCode = generateNetworkConfigsCode(config);
  const entryCode = `
// Auto-generated by @tetherto/wdk-worklet-bundler
// Generated at: ${(/* @__PURE__ */ new Date()).toISOString()}
// DO NOT EDIT MANUALLY

// Handle unhandled promise rejections and exceptions
if (typeof process !== 'undefined' && process.on) {
  process.on('unhandledRejection', (error) => {
    console.error('Unhandled promise rejection in worklet:', error)
  })
  process.on('uncaughtException', (error) => {
    console.error('Uncaught exception in worklet:', error)
  })
}

// Initialize core dependencies
const { IPC: BareIPC } = BareKit
const HRPC = require('./hrpc')
const { entropyToMnemonic, mnemonicToSeedSync, mnemonicToEntropy } = require('@scure/bip39')
const { wordlist } = require('@scure/bip39/wordlists/english')
const crypto = require('bare-crypto')

// Error handling helper
const rpcException = {
  stringifyError: (error) => {
    if (error instanceof Error) {
      return JSON.stringify({
        name: error.name,
        message: error.message,
        stack: error.stack,
      })
    }
    return String(error)
  }
}

// ============================================================
// WALLET MODULES (Generated from config)
// ============================================================
${walletModulesCode}

// ============================================================
// NETWORK CONFIGURATIONS (Generated from config)
// ============================================================
${networkConfigsCode}

// Initialize RPC
const IPC = BareIPC
const rpc = new HRPC(IPC)

// WDK state
let wdk = null

${CRYPTO_HELPERS}

${RPC_HANDLERS}
`.trim();
  await import_fs3.default.promises.mkdir(outputDir, { recursive: true });
  const entryPath = import_path3.default.join(outputDir, "wdk-worklet.generated.js");
  await import_fs3.default.promises.writeFile(entryPath, entryCode, "utf-8");
  return entryPath;
}

// src/generators/hrpc/index.ts
var import_fs4 = __toESM(require("fs"));
var import_path4 = __toESM(require("path"));

// src/generators/hrpc/schema-definitions.ts
var CORE_SCHEMA = [
  {
    name: "log-type-enum",
    namespace: "wdk-core",
    offset: 1,
    enum: [
      { key: "info", version: 1 },
      { key: "error", version: 1 },
      { key: "debug", version: 1 }
    ]
  },
  {
    name: "log-request",
    namespace: "wdk-core",
    compact: false,
    flagsPosition: 0,
    fields: [
      { name: "type", type: "@wdk-core/log-type-enum", version: 1 },
      { name: "data", type: "string", version: 1 }
    ]
  },
  {
    name: "workletStart-request",
    namespace: "wdk-core",
    compact: false,
    flagsPosition: 0,
    fields: [
      { name: "enableDebugLogs", type: "uint", required: false, version: 1 },
      { name: "config", type: "string", required: true, version: 1 }
    ]
  },
  {
    name: "workletStart-response",
    namespace: "wdk-core",
    compact: false,
    flagsPosition: 0,
    fields: [{ name: "status", type: "string", version: 1 }]
  },
  {
    name: "dispose-request",
    namespace: "wdk-core",
    compact: false,
    flagsPosition: -1,
    fields: []
  },
  {
    name: "callMethod-request",
    namespace: "wdk-core",
    compact: false,
    flagsPosition: -1,
    fields: [
      { name: "methodName", type: "string", required: true, version: 1 },
      { name: "network", type: "string", required: true, version: 1 },
      { name: "accountIndex", type: "uint", required: true, version: 1 },
      { name: "args", type: "string", required: false, version: 1 }
    ]
  },
  {
    name: "callMethod-response",
    namespace: "wdk-core",
    compact: false,
    flagsPosition: 0,
    fields: [{ name: "result", type: "string", version: 1 }]
  },
  {
    name: "generateEntropyAndEncrypt-request",
    namespace: "wdk-core",
    compact: false,
    flagsPosition: -1,
    fields: [{ name: "wordCount", type: "uint", required: true, version: 1 }]
  },
  {
    name: "generateEntropyAndEncrypt-response",
    namespace: "wdk-core",
    compact: false,
    flagsPosition: 0,
    fields: [
      { name: "encryptionKey", type: "string", version: 1 },
      { name: "encryptedSeedBuffer", type: "string", version: 1 },
      { name: "encryptedEntropyBuffer", type: "string", version: 1 }
    ]
  },
  {
    name: "getMnemonicFromEntropy-request",
    namespace: "wdk-core",
    compact: false,
    flagsPosition: 0,
    fields: [
      { name: "encryptedEntropy", type: "string", required: true, version: 1 },
      { name: "encryptionKey", type: "string", required: true, version: 1 }
    ]
  },
  {
    name: "getMnemonicFromEntropy-response",
    namespace: "wdk-core",
    compact: false,
    flagsPosition: 0,
    fields: [{ name: "mnemonic", type: "string", version: 1 }]
  },
  {
    name: "getSeedAndEntropyFromMnemonic-request",
    namespace: "wdk-core",
    compact: false,
    flagsPosition: -1,
    fields: [{ name: "mnemonic", type: "string", required: true, version: 1 }]
  },
  {
    name: "getSeedAndEntropyFromMnemonic-response",
    namespace: "wdk-core",
    compact: false,
    flagsPosition: 0,
    fields: [
      { name: "encryptionKey", type: "string", version: 1 },
      { name: "encryptedSeedBuffer", type: "string", version: 1 },
      { name: "encryptedEntropyBuffer", type: "string", version: 1 }
    ]
  },
  {
    name: "initializeWDK-request",
    namespace: "wdk-core",
    compact: false,
    flagsPosition: 0,
    fields: [
      { name: "encryptionKey", type: "string", required: false, version: 1 },
      { name: "encryptedSeed", type: "string", required: false, version: 1 },
      { name: "config", type: "string", required: true, version: 1 }
    ]
  },
  {
    name: "initializeWDK-response",
    namespace: "wdk-core",
    compact: false,
    flagsPosition: 0,
    fields: [{ name: "status", type: "string", version: 1 }]
  }
];
var HRPC_METHODS = [
  {
    id: 0,
    name: "@wdk-core/log",
    request: { name: "@wdk-core/log-request", send: true },
    version: 1
  },
  {
    id: 1,
    name: "@wdk-core/workletStart",
    request: { name: "@wdk-core/workletStart-request", stream: false },
    response: { name: "@wdk-core/workletStart-response", stream: false },
    version: 1
  },
  {
    id: 2,
    name: "@wdk-core/dispose",
    request: { name: "@wdk-core/dispose-request", send: true },
    version: 1
  },
  {
    id: 3,
    name: "@wdk-core/callMethod",
    request: { name: "@wdk-core/callMethod-request", stream: false },
    response: { name: "@wdk-core/callMethod-response", stream: false },
    version: 1
  },
  {
    id: 4,
    name: "@wdk-core/generateEntropyAndEncrypt",
    request: { name: "@wdk-core/generateEntropyAndEncrypt-request", stream: false },
    response: { name: "@wdk-core/generateEntropyAndEncrypt-response", stream: false },
    version: 1
  },
  {
    id: 5,
    name: "@wdk-core/getMnemonicFromEntropy",
    request: { name: "@wdk-core/getMnemonicFromEntropy-request", stream: false },
    response: { name: "@wdk-core/getMnemonicFromEntropy-response", stream: false },
    version: 1
  },
  {
    id: 6,
    name: "@wdk-core/initializeWDK",
    request: { name: "@wdk-core/initializeWDK-request", stream: false },
    response: { name: "@wdk-core/initializeWDK-response", stream: false },
    version: 1
  },
  {
    id: 7,
    name: "@wdk-core/getSeedAndEntropyFromMnemonic",
    request: { name: "@wdk-core/getSeedAndEntropyFromMnemonic-request", stream: false },
    response: { name: "@wdk-core/getSeedAndEntropyFromMnemonic-response", stream: false },
    version: 1
  }
];

// src/generators/hrpc/index.ts
var Hyperschema = require("hyperschema");
var HRPCBuilder = require("hrpc");
function isSchemaEnum(def) {
  return "enum" in def;
}
function generateHyperschema(outputDir) {
  const schemaDir = import_path4.default.join(outputDir, "schema");
  import_fs4.default.mkdirSync(schemaDir, { recursive: true });
  const schema = new Hyperschema();
  const ns = schema.namespace("wdk-core");
  for (const def of CORE_SCHEMA) {
    if (isSchemaEnum(def)) {
      ns.register({
        name: def.name,
        enum: def.enum.map((e) => e.key),
        offset: def.offset !== void 0 ? def.offset : 1
      });
    } else {
      ns.register({
        name: def.name,
        compact: def.compact !== void 0 ? def.compact : false,
        flagsPosition: def.flagsPosition !== void 0 ? def.flagsPosition : 0,
        fields: def.fields.map((field) => ({
          name: field.name,
          type: field.type,
          required: field.required !== void 0 ? field.required : false
        }))
      });
    }
  }
  Hyperschema.toDisk(schema, schemaDir);
  return schemaDir;
}
function generateHrpcJson(outputDir) {
  const hrpcJsonDir = import_path4.default.join(outputDir, "hrpc-src");
  import_fs4.default.mkdirSync(hrpcJsonDir, { recursive: true });
  const hrpcJson = {
    version: 1,
    schema: HRPC_METHODS
  };
  const hrpcJsonPath = import_path4.default.join(hrpcJsonDir, "hrpc.json");
  import_fs4.default.writeFileSync(hrpcJsonPath, JSON.stringify(hrpcJson, null, 2));
  return hrpcJsonDir;
}
function generateSchemaJson(outputDir) {
  const schemaJsonPath = import_path4.default.join(outputDir, "schema.json");
  const schemaJson = {
    version: 1,
    schema: CORE_SCHEMA
  };
  import_fs4.default.writeFileSync(schemaJsonPath, JSON.stringify(schemaJson, null, 2));
  return schemaJsonPath;
}
function generateHrpcBindings(schemaDir, hrpcJsonDir, outputDir) {
  const hrpcOutputDir = import_path4.default.join(outputDir, "hrpc");
  import_fs4.default.mkdirSync(hrpcOutputDir, { recursive: true });
  const builder = HRPCBuilder.from(schemaDir, hrpcJsonDir);
  HRPCBuilder.toDisk(builder, hrpcOutputDir);
  const schemaIndexPath = import_path4.default.join(schemaDir, "index.js");
  const messagesPath = import_path4.default.join(hrpcOutputDir, "messages.js");
  if (import_fs4.default.existsSync(schemaIndexPath)) {
    const content = import_fs4.default.readFileSync(schemaIndexPath, "utf-8");
    const updatedContent = content.replace(
      /\/\/ This file is autogenerated by the hyperschema compiler/,
      "// This file is autogenerated by the hyperschema compiler\n// Used by generated/hrpc/index.js"
    );
    import_fs4.default.writeFileSync(messagesPath, updatedContent);
  }
  return hrpcOutputDir;
}
async function generateHrpc(outputDir) {
  import_fs4.default.mkdirSync(outputDir, { recursive: true });
  const schemaJsonPath = generateSchemaJson(outputDir);
  const hrpcJsonDir = generateHrpcJson(outputDir);
  const hrpcJsonPath = import_path4.default.join(hrpcJsonDir, "hrpc.json");
  const schemaDir = generateHyperschema(outputDir);
  const hrpcDir = generateHrpcBindings(schemaDir, hrpcJsonDir, outputDir);
  return {
    schemaDir,
    hrpcDir,
    schemaJsonPath,
    hrpcJsonPath
  };
}
function copyExistingHrpc(sourceDir, outputDir) {
  const hrpcDir = import_path4.default.join(outputDir, "hrpc");
  const schemaDir = import_path4.default.join(outputDir, "schema");
  import_fs4.default.mkdirSync(hrpcDir, { recursive: true });
  import_fs4.default.mkdirSync(schemaDir, { recursive: true });
  const sourceHrpcDir = import_path4.default.join(sourceDir, "generated/hrpc");
  const sourceSchemaDir = import_path4.default.join(sourceDir, "generated/schema");
  if (import_fs4.default.existsSync(sourceHrpcDir)) {
    for (const file of import_fs4.default.readdirSync(sourceHrpcDir)) {
      import_fs4.default.copyFileSync(import_path4.default.join(sourceHrpcDir, file), import_path4.default.join(hrpcDir, file));
    }
  }
  if (import_fs4.default.existsSync(sourceSchemaDir)) {
    for (const file of import_fs4.default.readdirSync(sourceSchemaDir)) {
      import_fs4.default.copyFileSync(import_path4.default.join(sourceSchemaDir, file), import_path4.default.join(schemaDir, file));
    }
  }
  return {
    schemaDir,
    hrpcDir,
    schemaJsonPath: import_path4.default.join(sourceDir, "schema.json"),
    hrpcJsonPath: import_path4.default.join(sourceDir, "src/hrpc/hrpc.json")
  };
}

// src/bundler/index.ts
function runBarePack(options) {
  const { entryPath, outputPath, importsPath, targets, cwd, verbose } = options;
  const args = ["bare-pack@1.5.1"];
  for (const target of targets) {
    if (!/^[a-z0-9-]+$/i.test(target)) {
      throw new Error(`Invalid target format: ${target}`);
    }
    args.push("--target", target);
  }
  args.push(
    "--linked",
    "--imports",
    importsPath,
    "--out",
    outputPath,
    entryPath
  );
  if (verbose) {
    console.log(`  Running: npx ${args.join(" ")}`);
    console.log(`  CWD: ${cwd}`);
  }
  (0, import_child_process.execSync)(`npx ${args.join(" ")}`, {
    cwd,
    stdio: verbose ? "inherit" : "pipe"
  });
}
function generateImportsFile(outputDir) {
  const imports = {
    BareKit: "bare:kit",
    // Map node:crypto to bare-crypto for Bare runtime compatibility
    "node:crypto": "bare-crypto"
  };
  const importsPath = import_path5.default.join(outputDir, "pack.imports.json");
  import_fs5.default.writeFileSync(importsPath, JSON.stringify(imports, null, 2));
  return importsPath;
}
function generateIndexFile(outputDir) {
  const indexContent = `/**
 * WDK Bundle Exports
 * Generated by @tetherto/wdk-worklet-bundler
 */

const bundle = require('./wdk.bundle.js');
const HRPC = require('./hrpc/index.js');

module.exports = {
  bundle,
  HRPC
};
`;
  const indexPath = import_path5.default.join(outputDir, "index.js");
  import_fs5.default.writeFileSync(indexPath, indexContent);
}
function getDefaultTargets() {
  return ["ios-arm64", "ios-arm64-simulator", "android-arm64", "android-arm"];
}
async function generateBundle(config, options = {}) {
  const startTime = Date.now();
  const { dryRun, verbose, silent } = options;
  const log = (msg) => {
    if (!silent) console.log(msg);
  };
  const generatedDir = import_path5.default.join(config.projectRoot, ".wdk");
  if (dryRun) {
    log("Dry run - would generate:");
    log(`  Output dir: ${generatedDir}`);
    log(`  Entry: ${generatedDir}/wdk-worklet.generated.js`);
    log(`  HRPC: ${generatedDir}/hrpc/`);
    log(`  Schema: ${generatedDir}/schema/`);
    log(`  Bundle: ${config.resolvedOutput.bundle}`);
    if (!options.skipTypes) {
      log(`  Types: ${config.resolvedOutput.types}`);
    }
    return {
      success: true,
      bundlePath: config.resolvedOutput.bundle,
      typesPath: config.resolvedOutput.types,
      bundleSize: 0,
      duration: Date.now() - startTime
    };
  }
  try {
    import_fs5.default.mkdirSync(generatedDir, { recursive: true });
    import_fs5.default.mkdirSync(import_path5.default.dirname(config.resolvedOutput.bundle), {
      recursive: true
    });
    if (verbose) log("  Generating HRPC bindings...");
    const hrpcResult = await generateHrpc(generatedDir);
    if (verbose) {
      log(`    Schema: ${hrpcResult.schemaDir}`);
      log(`    HRPC: ${hrpcResult.hrpcDir}`);
    }
    if (verbose) log("  Generating worklet entry point...");
    const entryPath = await generateEntryPoint(config, generatedDir);
    if (verbose) log(`    Entry: ${entryPath}`);
    if (verbose) log("  Generating imports file...");
    const importsPath = generateImportsFile(generatedDir);
    if (verbose) log("  Running bare-pack...");
    const targets = config.options?.targets || getDefaultTargets();
    try {
      runBarePack({
        entryPath,
        outputPath: config.resolvedOutput.bundle,
        importsPath,
        targets,
        cwd: config.projectRoot,
        verbose
      });
    } catch (barePackError) {
      const errorMsg = barePackError instanceof Error ? barePackError.message : String(barePackError);
      return {
        success: false,
        bundlePath: config.resolvedOutput.bundle,
        typesPath: config.resolvedOutput.types,
        bundleSize: 0,
        duration: Date.now() - startTime,
        error: `bare-pack failed: ${errorMsg}

This usually means:
  1. WDK modules are not installed in the project
  2. A dependency uses Node.js APIs not available in Bare runtime

Generated files are available at:
  Entry: ${entryPath}
  HRPC: ${hrpcResult.hrpcDir}

You can run bare-pack manually once dependencies are resolved.`
      };
    }
    let bundleSize = 0;
    if (import_fs5.default.existsSync(config.resolvedOutput.bundle)) {
      bundleSize = import_fs5.default.statSync(config.resolvedOutput.bundle).size;
    }
    if (!options.skipTypes) {
      if (verbose) log("  Generating TypeScript declarations...");
      await generateTypeDeclarations(config);
    }
    if (verbose) log("  Generating index.js...");
    generateIndexFile(generatedDir);
    return {
      success: true,
      bundlePath: config.resolvedOutput.bundle,
      typesPath: config.resolvedOutput.types,
      bundleSize,
      duration: Date.now() - startTime
    };
  } catch (error) {
    return {
      success: false,
      bundlePath: config.resolvedOutput.bundle,
      typesPath: config.resolvedOutput.types,
      bundleSize: 0,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
async function generateTypeDeclarations(config) {
  const generatedDir = import_path5.default.join(config.projectRoot, ".wdk");
  const indexDtsPath = import_path5.default.join(generatedDir, "index.d.ts");
  import_fs5.default.mkdirSync(generatedDir, { recursive: true });
  const networks = Object.keys(config.networks);
  const declarations = `/**
 * WDK Bundle TypeScript Declarations
 * Generated by @tetherto/wdk-worklet-bundler
 * Generated at: ${(/* @__PURE__ */ new Date()).toISOString()}
 */

export type NetworkName = ${networks.map((n) => `'${n}'`).join(" | ")};

export interface WdkInitializeParams {
  encryptionKey: string;
  encryptedSeed: string;
  config?: string;
}

export interface WdkGenerateEntropyParams {
  wordCount: 12 | 24;
}

export interface WdkEntropyResult {
  encryptionKey: string;
  encryptedSeedBuffer: string;
  encryptedEntropyBuffer: string;
}

export interface WdkGetMnemonicParams {
  encryptedEntropy: string;
  encryptionKey: string;
}

export interface WdkCallMethodParams {
  methodName: string;
  network: NetworkName;
  accountIndex: number;
  args?: string;
}

export interface WdkWorklet {
  workletStart(params: { config: string }): Promise<{ status: string }>;
  initializeWDK(params: WdkInitializeParams): Promise<{ status: string }>;
  generateEntropyAndEncrypt(params: WdkGenerateEntropyParams): Promise<WdkEntropyResult>;
  getMnemonicFromEntropy(params: WdkGetMnemonicParams): Promise<{ mnemonic: string }>;
  getSeedAndEntropyFromMnemonic(params: { mnemonic: string }): Promise<WdkEntropyResult>;
  callMethod(params: WdkCallMethodParams): Promise<{ result: string }>;
  dispose(): void;
}

export interface NetworkConfig {
  chainId: number;
  blockchain: string;
  provider?: string;
  [key: string]: unknown;
}

export type NetworkConfigs = {
  [K in NetworkName]: NetworkConfig;
};

/**
 * Embedded network configurations
 */
export const embeddedNetworks: NetworkName[] = ${JSON.stringify(networks)};

/**
 * The worklet bundle (for react-native-bare-kit)
 */
export const bundle: unknown;

/**
 * HRPC class for RPC communication with the worklet
 */
export const HRPC: new (ipc: unknown) => WdkWorklet;
`;
  import_fs5.default.writeFileSync(indexDtsPath, declarations);
}
async function generateSourceFiles(config, options = {}) {
  const generatedDir = import_path5.default.join(config.projectRoot, ".wdk");
  if (options.verbose) console.log("  Generating HRPC bindings...");
  const hrpcResult = await generateHrpc(generatedDir);
  if (options.verbose) console.log("  Generating worklet entry point...");
  const entryPath = await generateEntryPoint(config, generatedDir);
  generateImportsFile(generatedDir);
  generateIndexFile(generatedDir);
  return {
    entryPath,
    hrpcDir: hrpcResult.hrpcDir,
    schemaDir: hrpcResult.schemaDir
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  CORE_SCHEMA,
  HRPC_METHODS,
  copyExistingHrpc,
  detectPackageManager,
  generateBundle,
  generateEntryPoint,
  generateHrpc,
  generateInstallCommand,
  generateNetworkConfigsCode,
  generateSourceFiles,
  generateUninstallCommand,
  generateWalletModulesCode,
  installDependencies,
  loadConfig,
  uninstallDependencies,
  validateDependencies
});
