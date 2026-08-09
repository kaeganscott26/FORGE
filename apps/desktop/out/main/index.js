import { app, shell, safeStorage, BrowserWindow, dialog, BrowserView, ipcMain, clipboard } from "electron";
import { promises, watch, existsSync } from "node:fs";
import * as path from "node:path";
import path__default, { join } from "node:path";
import { pathToFileURL } from "node:url";
import { EventEmitter } from "node:events";
import simpleGit from "simple-git";
import { randomUUID, createHash } from "node:crypto";
import initSqlJs from "sql.js";
import electronUpdater from "electron-updater";
import { fetch as fetch$1, Agent as Agent$1 } from "undici";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { spawn } from "node:child_process";
import os from "node:os";
import * as pty from "node-pty";
import { lookup as lookup$1 } from "node:dns/promises";
import { lookup } from "node:dns";
import { isIP } from "node:net";
import __cjs_mod__ from "node:module";
const __filename = import.meta.filename;
const __dirname = import.meta.dirname;
const require2 = __cjs_mod__.createRequire(import.meta.url);
const is = {
  dev: !app.isPackaged
};
({
  isWindows: process.platform === "win32",
  isMacOS: process.platform === "darwin",
  isLinux: process.platform === "linux"
});
var re$1 = { exports: {} };
var constants$1;
var hasRequiredConstants$1;
function requireConstants$1() {
  if (hasRequiredConstants$1) return constants$1;
  hasRequiredConstants$1 = 1;
  const SEMVER_SPEC_VERSION = "2.0.0";
  const MAX_LENGTH = 256;
  const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER || /* istanbul ignore next */
  9007199254740991;
  const MAX_SAFE_COMPONENT_LENGTH = 16;
  const MAX_SAFE_BUILD_LENGTH = MAX_LENGTH - 6;
  const RELEASE_TYPES = [
    "major",
    "premajor",
    "minor",
    "preminor",
    "patch",
    "prepatch",
    "prerelease"
  ];
  constants$1 = {
    MAX_LENGTH,
    MAX_SAFE_COMPONENT_LENGTH,
    MAX_SAFE_BUILD_LENGTH,
    MAX_SAFE_INTEGER,
    RELEASE_TYPES,
    SEMVER_SPEC_VERSION,
    FLAG_INCLUDE_PRERELEASE: 1,
    FLAG_LOOSE: 2
  };
  return constants$1;
}
var debug_1$1;
var hasRequiredDebug$1;
function requireDebug$1() {
  if (hasRequiredDebug$1) return debug_1$1;
  hasRequiredDebug$1 = 1;
  const debug = typeof process === "object" && process.env && process.env.NODE_DEBUG && /\bsemver\b/i.test(process.env.NODE_DEBUG) ? (...args) => console.error("SEMVER", ...args) : () => {
  };
  debug_1$1 = debug;
  return debug_1$1;
}
var hasRequiredRe$1;
function requireRe$1() {
  if (hasRequiredRe$1) return re$1.exports;
  hasRequiredRe$1 = 1;
  (function(module, exports) {
    const {
      MAX_SAFE_COMPONENT_LENGTH,
      MAX_SAFE_BUILD_LENGTH,
      MAX_LENGTH
    } = requireConstants$1();
    const debug = requireDebug$1();
    exports = module.exports = {};
    const re2 = exports.re = [];
    const safeRe = exports.safeRe = [];
    const src = exports.src = [];
    const safeSrc = exports.safeSrc = [];
    const t = exports.t = {};
    let R = 0;
    const LETTERDASHNUMBER = "[a-zA-Z0-9-]";
    const safeRegexReplacements = [
      ["\\s", 1],
      ["\\d", MAX_LENGTH],
      [LETTERDASHNUMBER, MAX_SAFE_BUILD_LENGTH]
    ];
    const makeSafeRegex = (value) => {
      for (const [token, max] of safeRegexReplacements) {
        value = value.split(`${token}*`).join(`${token}{0,${max}}`).split(`${token}+`).join(`${token}{1,${max}}`);
      }
      return value;
    };
    const createToken = (name, value, isGlobal) => {
      const safe = makeSafeRegex(value);
      const index = R++;
      debug(name, index, value);
      t[name] = index;
      src[index] = value;
      safeSrc[index] = safe;
      re2[index] = new RegExp(value, isGlobal ? "g" : void 0);
      safeRe[index] = new RegExp(safe, isGlobal ? "g" : void 0);
    };
    createToken("NUMERICIDENTIFIER", "0|[1-9]\\d*");
    createToken("NUMERICIDENTIFIERLOOSE", "\\d+");
    createToken("NONNUMERICIDENTIFIER", `\\d*[a-zA-Z-]${LETTERDASHNUMBER}*`);
    createToken("MAINVERSION", `(${src[t.NUMERICIDENTIFIER]})\\.(${src[t.NUMERICIDENTIFIER]})\\.(${src[t.NUMERICIDENTIFIER]})`);
    createToken("MAINVERSIONLOOSE", `(${src[t.NUMERICIDENTIFIERLOOSE]})\\.(${src[t.NUMERICIDENTIFIERLOOSE]})\\.(${src[t.NUMERICIDENTIFIERLOOSE]})`);
    createToken("PRERELEASEIDENTIFIER", `(?:${src[t.NONNUMERICIDENTIFIER]}|${src[t.NUMERICIDENTIFIER]})`);
    createToken("PRERELEASEIDENTIFIERLOOSE", `(?:${src[t.NONNUMERICIDENTIFIER]}|${src[t.NUMERICIDENTIFIERLOOSE]})`);
    createToken("PRERELEASE", `(?:-(${src[t.PRERELEASEIDENTIFIER]}(?:\\.${src[t.PRERELEASEIDENTIFIER]})*))`);
    createToken("PRERELEASELOOSE", `(?:-?(${src[t.PRERELEASEIDENTIFIERLOOSE]}(?:\\.${src[t.PRERELEASEIDENTIFIERLOOSE]})*))`);
    createToken("BUILDIDENTIFIER", `${LETTERDASHNUMBER}+`);
    createToken("BUILD", `(?:\\+(${src[t.BUILDIDENTIFIER]}(?:\\.${src[t.BUILDIDENTIFIER]})*))`);
    createToken("FULLPLAIN", `v?${src[t.MAINVERSION]}${src[t.PRERELEASE]}?${src[t.BUILD]}?`);
    createToken("FULL", `^${src[t.FULLPLAIN]}$`);
    createToken("LOOSEPLAIN", `[v=\\s]*${src[t.MAINVERSIONLOOSE]}${src[t.PRERELEASELOOSE]}?${src[t.BUILD]}?`);
    createToken("LOOSE", `^${src[t.LOOSEPLAIN]}$`);
    createToken("GTLT", "((?:<|>)?=?)");
    createToken("XRANGEIDENTIFIERLOOSE", `${src[t.NUMERICIDENTIFIERLOOSE]}|x|X|\\*`);
    createToken("XRANGEIDENTIFIER", `${src[t.NUMERICIDENTIFIER]}|x|X|\\*`);
    createToken("XRANGEPLAIN", `[v=\\s]*(${src[t.XRANGEIDENTIFIER]})(?:\\.(${src[t.XRANGEIDENTIFIER]})(?:\\.(${src[t.XRANGEIDENTIFIER]})(?:${src[t.PRERELEASE]})?${src[t.BUILD]}?)?)?`);
    createToken("XRANGEPLAINLOOSE", `[v=\\s]*(${src[t.XRANGEIDENTIFIERLOOSE]})(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})(?:${src[t.PRERELEASELOOSE]})?${src[t.BUILD]}?)?)?`);
    createToken("XRANGE", `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAIN]}$`);
    createToken("XRANGELOOSE", `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAINLOOSE]}$`);
    createToken("COERCEPLAIN", `${"(^|[^\\d])(\\d{1,"}${MAX_SAFE_COMPONENT_LENGTH}})(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?`);
    createToken("COERCE", `${src[t.COERCEPLAIN]}(?:$|[^\\d])`);
    createToken("COERCEFULL", src[t.COERCEPLAIN] + `(?:${src[t.PRERELEASE]})?(?:${src[t.BUILD]})?(?:$|[^\\d])`);
    createToken("COERCERTL", src[t.COERCE], true);
    createToken("COERCERTLFULL", src[t.COERCEFULL], true);
    createToken("LONETILDE", "(?:~>?)");
    createToken("TILDETRIM", `(\\s*)${src[t.LONETILDE]}\\s+`, true);
    exports.tildeTrimReplace = "$1~";
    createToken("TILDE", `^${src[t.LONETILDE]}${src[t.XRANGEPLAIN]}$`);
    createToken("TILDELOOSE", `^${src[t.LONETILDE]}${src[t.XRANGEPLAINLOOSE]}$`);
    createToken("LONECARET", "(?:\\^)");
    createToken("CARETTRIM", `(\\s*)${src[t.LONECARET]}\\s+`, true);
    exports.caretTrimReplace = "$1^";
    createToken("CARET", `^${src[t.LONECARET]}${src[t.XRANGEPLAIN]}$`);
    createToken("CARETLOOSE", `^${src[t.LONECARET]}${src[t.XRANGEPLAINLOOSE]}$`);
    createToken("COMPARATORLOOSE", `^${src[t.GTLT]}\\s*(${src[t.LOOSEPLAIN]})$|^$`);
    createToken("COMPARATOR", `^${src[t.GTLT]}\\s*(${src[t.FULLPLAIN]})$|^$`);
    createToken("COMPARATORTRIM", `(\\s*)${src[t.GTLT]}\\s*(${src[t.LOOSEPLAIN]}|${src[t.XRANGEPLAIN]})`, true);
    exports.comparatorTrimReplace = "$1$2$3";
    createToken("HYPHENRANGE", `^\\s*(${src[t.XRANGEPLAIN]})\\s+-\\s+(${src[t.XRANGEPLAIN]})\\s*$`);
    createToken("HYPHENRANGELOOSE", `^\\s*(${src[t.XRANGEPLAINLOOSE]})\\s+-\\s+(${src[t.XRANGEPLAINLOOSE]})\\s*$`);
    createToken("STAR", "(<|>)?=?\\s*\\*");
    createToken("GTE0", "^\\s*>=\\s*0\\.0\\.0\\s*$");
    createToken("GTE0PRE", "^\\s*>=\\s*0\\.0\\.0-0\\s*$");
  })(re$1, re$1.exports);
  return re$1.exports;
}
var parseOptions_1$1;
var hasRequiredParseOptions$1;
function requireParseOptions$1() {
  if (hasRequiredParseOptions$1) return parseOptions_1$1;
  hasRequiredParseOptions$1 = 1;
  const looseOption = Object.freeze({ loose: true });
  const emptyOpts = Object.freeze({});
  const parseOptions = (options) => {
    if (!options) {
      return emptyOpts;
    }
    if (typeof options !== "object") {
      return looseOption;
    }
    return options;
  };
  parseOptions_1$1 = parseOptions;
  return parseOptions_1$1;
}
var identifiers$1;
var hasRequiredIdentifiers$1;
function requireIdentifiers$1() {
  if (hasRequiredIdentifiers$1) return identifiers$1;
  hasRequiredIdentifiers$1 = 1;
  const numeric = /^[0-9]+$/;
  const compareIdentifiers = (a, b) => {
    if (typeof a === "number" && typeof b === "number") {
      return a === b ? 0 : a < b ? -1 : 1;
    }
    const anum = numeric.test(a);
    const bnum = numeric.test(b);
    if (anum && bnum) {
      a = +a;
      b = +b;
    }
    return a === b ? 0 : anum && !bnum ? -1 : bnum && !anum ? 1 : a < b ? -1 : 1;
  };
  const rcompareIdentifiers = (a, b) => compareIdentifiers(b, a);
  identifiers$1 = {
    compareIdentifiers,
    rcompareIdentifiers
  };
  return identifiers$1;
}
var semver$4;
var hasRequiredSemver$4;
function requireSemver$4() {
  if (hasRequiredSemver$4) return semver$4;
  hasRequiredSemver$4 = 1;
  const debug = requireDebug$1();
  const { MAX_LENGTH, MAX_SAFE_INTEGER } = requireConstants$1();
  const { safeRe: re2, t } = requireRe$1();
  const parseOptions = requireParseOptions$1();
  const { compareIdentifiers } = requireIdentifiers$1();
  const isPrereleaseIdentifier = (prerelease, identifier) => {
    const identifiers2 = identifier.split(".");
    if (identifiers2.length > prerelease.length) {
      return false;
    }
    for (let i = 0; i < identifiers2.length; i++) {
      if (compareIdentifiers(prerelease[i], identifiers2[i]) !== 0) {
        return false;
      }
    }
    return true;
  };
  class SemVer {
    constructor(version, options) {
      options = parseOptions(options);
      if (version instanceof SemVer) {
        if (version.loose === !!options.loose && version.includePrerelease === !!options.includePrerelease) {
          return version;
        } else {
          version = version.version;
        }
      } else if (typeof version !== "string") {
        throw new TypeError(`Invalid version. Must be a string. Got type "${typeof version}".`);
      }
      if (version.length > MAX_LENGTH) {
        throw new TypeError(
          `version is longer than ${MAX_LENGTH} characters`
        );
      }
      debug("SemVer", version, options);
      this.options = options;
      this.loose = !!options.loose;
      this.includePrerelease = !!options.includePrerelease;
      const m = version.trim().match(options.loose ? re2[t.LOOSE] : re2[t.FULL]);
      if (!m) {
        throw new TypeError(`Invalid Version: ${version}`);
      }
      this.raw = version;
      this.major = +m[1];
      this.minor = +m[2];
      this.patch = +m[3];
      if (this.major > MAX_SAFE_INTEGER || this.major < 0) {
        throw new TypeError("Invalid major version");
      }
      if (this.minor > MAX_SAFE_INTEGER || this.minor < 0) {
        throw new TypeError("Invalid minor version");
      }
      if (this.patch > MAX_SAFE_INTEGER || this.patch < 0) {
        throw new TypeError("Invalid patch version");
      }
      if (!m[4]) {
        this.prerelease = [];
      } else {
        this.prerelease = m[4].split(".").map((id2) => {
          if (/^[0-9]+$/.test(id2)) {
            const num = +id2;
            if (num >= 0 && num < MAX_SAFE_INTEGER) {
              return num;
            }
          }
          return id2;
        });
      }
      this.build = m[5] ? m[5].split(".") : [];
      this.format();
    }
    format() {
      this.version = `${this.major}.${this.minor}.${this.patch}`;
      if (this.prerelease.length) {
        this.version += `-${this.prerelease.join(".")}`;
      }
      return this.version;
    }
    toString() {
      return this.version;
    }
    compare(other) {
      debug("SemVer.compare", this.version, this.options, other);
      if (!(other instanceof SemVer)) {
        if (typeof other === "string" && other === this.version) {
          return 0;
        }
        other = new SemVer(other, this.options);
      }
      if (other.version === this.version) {
        return 0;
      }
      return this.compareMain(other) || this.comparePre(other);
    }
    compareMain(other) {
      if (!(other instanceof SemVer)) {
        other = new SemVer(other, this.options);
      }
      if (this.major < other.major) {
        return -1;
      }
      if (this.major > other.major) {
        return 1;
      }
      if (this.minor < other.minor) {
        return -1;
      }
      if (this.minor > other.minor) {
        return 1;
      }
      if (this.patch < other.patch) {
        return -1;
      }
      if (this.patch > other.patch) {
        return 1;
      }
      return 0;
    }
    comparePre(other) {
      if (!(other instanceof SemVer)) {
        other = new SemVer(other, this.options);
      }
      if (this.prerelease.length && !other.prerelease.length) {
        return -1;
      } else if (!this.prerelease.length && other.prerelease.length) {
        return 1;
      } else if (!this.prerelease.length && !other.prerelease.length) {
        return 0;
      }
      let i = 0;
      do {
        const a = this.prerelease[i];
        const b = other.prerelease[i];
        debug("prerelease compare", i, a, b);
        if (a === void 0 && b === void 0) {
          return 0;
        } else if (b === void 0) {
          return 1;
        } else if (a === void 0) {
          return -1;
        } else if (a === b) {
          continue;
        } else {
          return compareIdentifiers(a, b);
        }
      } while (++i);
    }
    compareBuild(other) {
      if (!(other instanceof SemVer)) {
        other = new SemVer(other, this.options);
      }
      let i = 0;
      do {
        const a = this.build[i];
        const b = other.build[i];
        debug("build compare", i, a, b);
        if (a === void 0 && b === void 0) {
          return 0;
        } else if (b === void 0) {
          return 1;
        } else if (a === void 0) {
          return -1;
        } else if (a === b) {
          continue;
        } else {
          return compareIdentifiers(a, b);
        }
      } while (++i);
    }
    // preminor will bump the version up to the next minor release, and immediately
    // down to pre-release. premajor and prepatch work the same way.
    inc(release, identifier, identifierBase) {
      if (release.startsWith("pre")) {
        if (!identifier && identifierBase === false) {
          throw new Error("invalid increment argument: identifier is empty");
        }
        if (identifier) {
          const match = `-${identifier}`.match(this.options.loose ? re2[t.PRERELEASELOOSE] : re2[t.PRERELEASE]);
          if (!match || match[1] !== identifier) {
            throw new Error(`invalid identifier: ${identifier}`);
          }
        }
      }
      switch (release) {
        case "premajor":
          this.prerelease.length = 0;
          this.patch = 0;
          this.minor = 0;
          this.major++;
          this.inc("pre", identifier, identifierBase);
          break;
        case "preminor":
          this.prerelease.length = 0;
          this.patch = 0;
          this.minor++;
          this.inc("pre", identifier, identifierBase);
          break;
        case "prepatch":
          this.prerelease.length = 0;
          this.inc("patch", identifier, identifierBase);
          this.inc("pre", identifier, identifierBase);
          break;
        // If the input is a non-prerelease version, this acts the same as
        // prepatch.
        case "prerelease":
          if (this.prerelease.length === 0) {
            this.inc("patch", identifier, identifierBase);
          }
          this.inc("pre", identifier, identifierBase);
          break;
        case "release":
          if (this.prerelease.length === 0) {
            throw new Error(`version ${this.raw} is not a prerelease`);
          }
          this.prerelease.length = 0;
          break;
        case "major":
          if (this.minor !== 0 || this.patch !== 0 || this.prerelease.length === 0) {
            this.major++;
          }
          this.minor = 0;
          this.patch = 0;
          this.prerelease = [];
          break;
        case "minor":
          if (this.patch !== 0 || this.prerelease.length === 0) {
            this.minor++;
          }
          this.patch = 0;
          this.prerelease = [];
          break;
        case "patch":
          if (this.prerelease.length === 0) {
            this.patch++;
          }
          this.prerelease = [];
          break;
        // This probably shouldn't be used publicly.
        // 1.0.0 'pre' would become 1.0.0-0 which is the wrong direction.
        case "pre": {
          const base = Number(identifierBase) ? 1 : 0;
          if (this.prerelease.length === 0) {
            this.prerelease = [base];
          } else {
            let i = this.prerelease.length;
            while (--i >= 0) {
              if (typeof this.prerelease[i] === "number") {
                this.prerelease[i]++;
                i = -2;
              }
            }
            if (i === -1) {
              if (identifier === this.prerelease.join(".") && identifierBase === false) {
                throw new Error("invalid increment argument: identifier already exists");
              }
              this.prerelease.push(base);
            }
          }
          if (identifier) {
            let prerelease = [identifier, base];
            if (identifierBase === false) {
              prerelease = [identifier];
            }
            if (isPrereleaseIdentifier(this.prerelease, identifier)) {
              const prereleaseBase = this.prerelease[identifier.split(".").length];
              if (isNaN(prereleaseBase)) {
                this.prerelease = prerelease;
              }
            } else {
              this.prerelease = prerelease;
            }
          }
          break;
        }
        default:
          throw new Error(`invalid increment argument: ${release}`);
      }
      this.raw = this.format();
      if (this.build.length) {
        this.raw += `+${this.build.join(".")}`;
      }
      return this;
    }
  }
  semver$4 = SemVer;
  return semver$4;
}
var parse_1$1;
var hasRequiredParse$1;
function requireParse$1() {
  if (hasRequiredParse$1) return parse_1$1;
  hasRequiredParse$1 = 1;
  const SemVer = requireSemver$4();
  const parse = (version, options, throwErrors = false) => {
    if (version instanceof SemVer) {
      return version;
    }
    try {
      return new SemVer(version, options);
    } catch (er) {
      if (!throwErrors) {
        return null;
      }
      throw er;
    }
  };
  parse_1$1 = parse;
  return parse_1$1;
}
var valid_1$1;
var hasRequiredValid$3;
function requireValid$3() {
  if (hasRequiredValid$3) return valid_1$1;
  hasRequiredValid$3 = 1;
  const parse = requireParse$1();
  const valid2 = (version, options) => {
    const v = parse(version, options);
    return v ? v.version : null;
  };
  valid_1$1 = valid2;
  return valid_1$1;
}
var clean_1$1;
var hasRequiredClean$1;
function requireClean$1() {
  if (hasRequiredClean$1) return clean_1$1;
  hasRequiredClean$1 = 1;
  const parse = requireParse$1();
  const clean = (version, options) => {
    const s = parse(version.trim().replace(/^[=v]+/, ""), options);
    return s ? s.version : null;
  };
  clean_1$1 = clean;
  return clean_1$1;
}
var inc_1$1;
var hasRequiredInc$1;
function requireInc$1() {
  if (hasRequiredInc$1) return inc_1$1;
  hasRequiredInc$1 = 1;
  const SemVer = requireSemver$4();
  const inc = (version, release, options, identifier, identifierBase) => {
    if (typeof options === "string") {
      identifierBase = identifier;
      identifier = options;
      options = void 0;
    }
    try {
      return new SemVer(
        version instanceof SemVer ? version.version : version,
        options
      ).inc(release, identifier, identifierBase).version;
    } catch (er) {
      return null;
    }
  };
  inc_1$1 = inc;
  return inc_1$1;
}
var diff_1$1;
var hasRequiredDiff$1;
function requireDiff$1() {
  if (hasRequiredDiff$1) return diff_1$1;
  hasRequiredDiff$1 = 1;
  const parse = requireParse$1();
  const diff = (version1, version2) => {
    const v1 = parse(version1, null, true);
    const v2 = parse(version2, null, true);
    const comparison = v1.compare(v2);
    if (comparison === 0) {
      return null;
    }
    const v1Higher = comparison > 0;
    const highVersion = v1Higher ? v1 : v2;
    const lowVersion = v1Higher ? v2 : v1;
    const highHasPre = !!highVersion.prerelease.length;
    const lowHasPre = !!lowVersion.prerelease.length;
    if (lowHasPre && !highHasPre) {
      if (!lowVersion.patch && !lowVersion.minor) {
        return "major";
      }
      if (lowVersion.compareMain(highVersion) === 0) {
        if (lowVersion.minor && !lowVersion.patch) {
          return "minor";
        }
        return "patch";
      }
    }
    const prefix = highHasPre ? "pre" : "";
    if (v1.major !== v2.major) {
      return prefix + "major";
    }
    if (v1.minor !== v2.minor) {
      return prefix + "minor";
    }
    if (v1.patch !== v2.patch) {
      return prefix + "patch";
    }
    return "prerelease";
  };
  diff_1$1 = diff;
  return diff_1$1;
}
var major_1$1;
var hasRequiredMajor$1;
function requireMajor$1() {
  if (hasRequiredMajor$1) return major_1$1;
  hasRequiredMajor$1 = 1;
  const SemVer = requireSemver$4();
  const major = (a, loose) => new SemVer(a, loose).major;
  major_1$1 = major;
  return major_1$1;
}
var minor_1$1;
var hasRequiredMinor$1;
function requireMinor$1() {
  if (hasRequiredMinor$1) return minor_1$1;
  hasRequiredMinor$1 = 1;
  const SemVer = requireSemver$4();
  const minor = (a, loose) => new SemVer(a, loose).minor;
  minor_1$1 = minor;
  return minor_1$1;
}
var patch_1$1;
var hasRequiredPatch$1;
function requirePatch$1() {
  if (hasRequiredPatch$1) return patch_1$1;
  hasRequiredPatch$1 = 1;
  const SemVer = requireSemver$4();
  const patch = (a, loose) => new SemVer(a, loose).patch;
  patch_1$1 = patch;
  return patch_1$1;
}
var prerelease_1$1;
var hasRequiredPrerelease$1;
function requirePrerelease$1() {
  if (hasRequiredPrerelease$1) return prerelease_1$1;
  hasRequiredPrerelease$1 = 1;
  const parse = requireParse$1();
  const prerelease = (version, options) => {
    const parsed = parse(version, options);
    return parsed && parsed.prerelease.length ? parsed.prerelease : null;
  };
  prerelease_1$1 = prerelease;
  return prerelease_1$1;
}
var compare_1$1;
var hasRequiredCompare$1;
function requireCompare$1() {
  if (hasRequiredCompare$1) return compare_1$1;
  hasRequiredCompare$1 = 1;
  const SemVer = requireSemver$4();
  const compare = (a, b, loose) => new SemVer(a, loose).compare(new SemVer(b, loose));
  compare_1$1 = compare;
  return compare_1$1;
}
var rcompare_1$1;
var hasRequiredRcompare$1;
function requireRcompare$1() {
  if (hasRequiredRcompare$1) return rcompare_1$1;
  hasRequiredRcompare$1 = 1;
  const compare = requireCompare$1();
  const rcompare = (a, b, loose) => compare(b, a, loose);
  rcompare_1$1 = rcompare;
  return rcompare_1$1;
}
var compareLoose_1$1;
var hasRequiredCompareLoose$1;
function requireCompareLoose$1() {
  if (hasRequiredCompareLoose$1) return compareLoose_1$1;
  hasRequiredCompareLoose$1 = 1;
  const compare = requireCompare$1();
  const compareLoose = (a, b) => compare(a, b, true);
  compareLoose_1$1 = compareLoose;
  return compareLoose_1$1;
}
var compareBuild_1$1;
var hasRequiredCompareBuild$1;
function requireCompareBuild$1() {
  if (hasRequiredCompareBuild$1) return compareBuild_1$1;
  hasRequiredCompareBuild$1 = 1;
  const SemVer = requireSemver$4();
  const compareBuild = (a, b, loose) => {
    const versionA = new SemVer(a, loose);
    const versionB = new SemVer(b, loose);
    return versionA.compare(versionB) || versionA.compareBuild(versionB);
  };
  compareBuild_1$1 = compareBuild;
  return compareBuild_1$1;
}
var sort_1$1;
var hasRequiredSort$1;
function requireSort$1() {
  if (hasRequiredSort$1) return sort_1$1;
  hasRequiredSort$1 = 1;
  const compareBuild = requireCompareBuild$1();
  const sort = (list, loose) => list.sort((a, b) => compareBuild(a, b, loose));
  sort_1$1 = sort;
  return sort_1$1;
}
var rsort_1$1;
var hasRequiredRsort$1;
function requireRsort$1() {
  if (hasRequiredRsort$1) return rsort_1$1;
  hasRequiredRsort$1 = 1;
  const compareBuild = requireCompareBuild$1();
  const rsort = (list, loose) => list.sort((a, b) => compareBuild(b, a, loose));
  rsort_1$1 = rsort;
  return rsort_1$1;
}
var gt_1$1;
var hasRequiredGt$1;
function requireGt$1() {
  if (hasRequiredGt$1) return gt_1$1;
  hasRequiredGt$1 = 1;
  const compare = requireCompare$1();
  const gt = (a, b, loose) => compare(a, b, loose) > 0;
  gt_1$1 = gt;
  return gt_1$1;
}
var lt_1$1;
var hasRequiredLt$1;
function requireLt$1() {
  if (hasRequiredLt$1) return lt_1$1;
  hasRequiredLt$1 = 1;
  const compare = requireCompare$1();
  const lt = (a, b, loose) => compare(a, b, loose) < 0;
  lt_1$1 = lt;
  return lt_1$1;
}
var eq_1$1;
var hasRequiredEq$1;
function requireEq$1() {
  if (hasRequiredEq$1) return eq_1$1;
  hasRequiredEq$1 = 1;
  const compare = requireCompare$1();
  const eq = (a, b, loose) => compare(a, b, loose) === 0;
  eq_1$1 = eq;
  return eq_1$1;
}
var neq_1$1;
var hasRequiredNeq$1;
function requireNeq$1() {
  if (hasRequiredNeq$1) return neq_1$1;
  hasRequiredNeq$1 = 1;
  const compare = requireCompare$1();
  const neq = (a, b, loose) => compare(a, b, loose) !== 0;
  neq_1$1 = neq;
  return neq_1$1;
}
var gte_1$1;
var hasRequiredGte$1;
function requireGte$1() {
  if (hasRequiredGte$1) return gte_1$1;
  hasRequiredGte$1 = 1;
  const compare = requireCompare$1();
  const gte = (a, b, loose) => compare(a, b, loose) >= 0;
  gte_1$1 = gte;
  return gte_1$1;
}
var lte_1$1;
var hasRequiredLte$1;
function requireLte$1() {
  if (hasRequiredLte$1) return lte_1$1;
  hasRequiredLte$1 = 1;
  const compare = requireCompare$1();
  const lte = (a, b, loose) => compare(a, b, loose) <= 0;
  lte_1$1 = lte;
  return lte_1$1;
}
var cmp_1$1;
var hasRequiredCmp$1;
function requireCmp$1() {
  if (hasRequiredCmp$1) return cmp_1$1;
  hasRequiredCmp$1 = 1;
  const eq = requireEq$1();
  const neq = requireNeq$1();
  const gt = requireGt$1();
  const gte = requireGte$1();
  const lt = requireLt$1();
  const lte = requireLte$1();
  const cmp = (a, op, b, loose) => {
    switch (op) {
      case "===":
        if (typeof a === "object") {
          a = a.version;
        }
        if (typeof b === "object") {
          b = b.version;
        }
        return a === b;
      case "!==":
        if (typeof a === "object") {
          a = a.version;
        }
        if (typeof b === "object") {
          b = b.version;
        }
        return a !== b;
      case "":
      case "=":
      case "==":
        return eq(a, b, loose);
      case "!=":
        return neq(a, b, loose);
      case ">":
        return gt(a, b, loose);
      case ">=":
        return gte(a, b, loose);
      case "<":
        return lt(a, b, loose);
      case "<=":
        return lte(a, b, loose);
      default:
        throw new TypeError(`Invalid operator: ${op}`);
    }
  };
  cmp_1$1 = cmp;
  return cmp_1$1;
}
var coerce_1$1;
var hasRequiredCoerce$1;
function requireCoerce$1() {
  if (hasRequiredCoerce$1) return coerce_1$1;
  hasRequiredCoerce$1 = 1;
  const SemVer = requireSemver$4();
  const parse = requireParse$1();
  const { safeRe: re2, t } = requireRe$1();
  const coerce = (version, options) => {
    if (version instanceof SemVer) {
      return version;
    }
    if (typeof version === "number") {
      version = String(version);
    }
    if (typeof version !== "string") {
      return null;
    }
    options = options || {};
    let match = null;
    if (!options.rtl) {
      match = version.match(options.includePrerelease ? re2[t.COERCEFULL] : re2[t.COERCE]);
    } else {
      const coerceRtlRegex = options.includePrerelease ? re2[t.COERCERTLFULL] : re2[t.COERCERTL];
      let next;
      while ((next = coerceRtlRegex.exec(version)) && (!match || match.index + match[0].length !== version.length)) {
        if (!match || next.index + next[0].length !== match.index + match[0].length) {
          match = next;
        }
        coerceRtlRegex.lastIndex = next.index + next[1].length + next[2].length;
      }
      coerceRtlRegex.lastIndex = -1;
    }
    if (match === null) {
      return null;
    }
    const major = match[2];
    const minor = match[3] || "0";
    const patch = match[4] || "0";
    const prerelease = options.includePrerelease && match[5] ? `-${match[5]}` : "";
    const build = options.includePrerelease && match[6] ? `+${match[6]}` : "";
    return parse(`${major}.${minor}.${patch}${prerelease}${build}`, options);
  };
  coerce_1$1 = coerce;
  return coerce_1$1;
}
var truncate_1$1;
var hasRequiredTruncate$1;
function requireTruncate$1() {
  if (hasRequiredTruncate$1) return truncate_1$1;
  hasRequiredTruncate$1 = 1;
  const parse = requireParse$1();
  const constants2 = requireConstants$1();
  const SemVer = requireSemver$4();
  const truncate = (version, truncation, options) => {
    if (!constants2.RELEASE_TYPES.includes(truncation)) {
      return null;
    }
    const clonedVersion = cloneInputVersion(version, options);
    return clonedVersion && doTruncation(clonedVersion, truncation);
  };
  const cloneInputVersion = (version, options) => {
    const versionStringToParse = version instanceof SemVer ? version.version : version;
    return parse(versionStringToParse, options);
  };
  const doTruncation = (version, truncation) => {
    if (isPrerelease(truncation)) {
      return version.version;
    }
    version.prerelease = [];
    switch (truncation) {
      case "major":
        version.minor = 0;
        version.patch = 0;
        break;
      case "minor":
        version.patch = 0;
        break;
    }
    return version.format();
  };
  const isPrerelease = (type) => {
    return type.startsWith("pre");
  };
  truncate_1$1 = truncate;
  return truncate_1$1;
}
var lrucache$1;
var hasRequiredLrucache$1;
function requireLrucache$1() {
  if (hasRequiredLrucache$1) return lrucache$1;
  hasRequiredLrucache$1 = 1;
  class LRUCache {
    constructor() {
      this.max = 1e3;
      this.map = /* @__PURE__ */ new Map();
    }
    get(key) {
      const value = this.map.get(key);
      if (value === void 0) {
        return void 0;
      } else {
        this.map.delete(key);
        this.map.set(key, value);
        return value;
      }
    }
    delete(key) {
      return this.map.delete(key);
    }
    set(key, value) {
      const deleted = this.delete(key);
      if (!deleted && value !== void 0) {
        if (this.map.size >= this.max) {
          const firstKey = this.map.keys().next().value;
          this.delete(firstKey);
        }
        this.map.set(key, value);
      }
      return this;
    }
  }
  lrucache$1 = LRUCache;
  return lrucache$1;
}
var range$1;
var hasRequiredRange$1;
function requireRange$1() {
  if (hasRequiredRange$1) return range$1;
  hasRequiredRange$1 = 1;
  const SPACE_CHARACTERS = /\s+/g;
  class Range {
    constructor(range2, options) {
      options = parseOptions(options);
      if (range2 instanceof Range) {
        if (range2.loose === !!options.loose && range2.includePrerelease === !!options.includePrerelease) {
          return range2;
        } else {
          return new Range(range2.raw, options);
        }
      }
      if (range2 instanceof Comparator) {
        this.raw = range2.value;
        this.set = [[range2]];
        this.formatted = void 0;
        return this;
      }
      this.options = options;
      this.loose = !!options.loose;
      this.includePrerelease = !!options.includePrerelease;
      this.raw = range2.trim().replace(SPACE_CHARACTERS, " ");
      this.set = this.raw.split("||").map((r) => this.parseRange(r.trim())).filter((c) => c.length);
      if (!this.set.length) {
        throw new TypeError(`Invalid SemVer Range: ${this.raw}`);
      }
      if (this.set.length > 1) {
        const first = this.set[0];
        this.set = this.set.filter((c) => !isNullSet(c[0]));
        if (this.set.length === 0) {
          this.set = [first];
        } else if (this.set.length > 1) {
          for (const c of this.set) {
            if (c.length === 1 && isAny(c[0])) {
              this.set = [c];
              break;
            }
          }
        }
      }
      this.formatted = void 0;
    }
    get range() {
      if (this.formatted === void 0) {
        this.formatted = "";
        for (let i = 0; i < this.set.length; i++) {
          if (i > 0) {
            this.formatted += "||";
          }
          const comps = this.set[i];
          for (let k = 0; k < comps.length; k++) {
            if (k > 0) {
              this.formatted += " ";
            }
            this.formatted += comps[k].toString().trim();
          }
        }
      }
      return this.formatted;
    }
    format() {
      return this.range;
    }
    toString() {
      return this.range;
    }
    parseRange(range2) {
      range2 = range2.replace(BUILDSTRIPRE, "");
      const memoOpts = (this.options.includePrerelease && FLAG_INCLUDE_PRERELEASE) | (this.options.loose && FLAG_LOOSE);
      const memoKey = memoOpts + ":" + range2;
      const cached = cache.get(memoKey);
      if (cached) {
        return cached;
      }
      const loose = this.options.loose;
      const hr = loose ? re2[t.HYPHENRANGELOOSE] : re2[t.HYPHENRANGE];
      range2 = range2.replace(hr, hyphenReplace(this.options.includePrerelease));
      debug("hyphen replace", range2);
      range2 = range2.replace(re2[t.COMPARATORTRIM], comparatorTrimReplace);
      debug("comparator trim", range2);
      range2 = range2.replace(re2[t.TILDETRIM], tildeTrimReplace);
      debug("tilde trim", range2);
      range2 = range2.replace(re2[t.CARETTRIM], caretTrimReplace);
      debug("caret trim", range2);
      let rangeList = range2.split(" ").map((comp) => parseComparator(comp, this.options)).join(" ").split(/\s+/).map((comp) => replaceGTE0(comp, this.options));
      if (loose) {
        rangeList = rangeList.filter((comp) => {
          debug("loose invalid filter", comp, this.options);
          return !!comp.match(re2[t.COMPARATORLOOSE]);
        });
      }
      debug("range list", rangeList);
      const rangeMap = /* @__PURE__ */ new Map();
      const comparators = rangeList.map((comp) => new Comparator(comp, this.options));
      for (const comp of comparators) {
        if (isNullSet(comp)) {
          return [comp];
        }
        rangeMap.set(comp.value, comp);
      }
      if (rangeMap.size > 1 && rangeMap.has("")) {
        rangeMap.delete("");
      }
      const result = [...rangeMap.values()];
      cache.set(memoKey, result);
      return result;
    }
    intersects(range2, options) {
      if (!(range2 instanceof Range)) {
        throw new TypeError("a Range is required");
      }
      return this.set.some((thisComparators) => {
        return isSatisfiable(thisComparators, options) && range2.set.some((rangeComparators) => {
          return isSatisfiable(rangeComparators, options) && thisComparators.every((thisComparator) => {
            return rangeComparators.every((rangeComparator) => {
              return thisComparator.intersects(rangeComparator, options);
            });
          });
        });
      });
    }
    // if ANY of the sets match ALL of its comparators, then pass
    test(version) {
      if (!version) {
        return false;
      }
      if (typeof version === "string") {
        try {
          version = new SemVer(version, this.options);
        } catch (er) {
          return false;
        }
      }
      for (let i = 0; i < this.set.length; i++) {
        if (testSet(this.set[i], version, this.options)) {
          return true;
        }
      }
      return false;
    }
  }
  range$1 = Range;
  const LRU = requireLrucache$1();
  const cache = new LRU();
  const parseOptions = requireParseOptions$1();
  const Comparator = requireComparator$1();
  const debug = requireDebug$1();
  const SemVer = requireSemver$4();
  const {
    safeRe: re2,
    src,
    t,
    comparatorTrimReplace,
    tildeTrimReplace,
    caretTrimReplace
  } = requireRe$1();
  const { FLAG_INCLUDE_PRERELEASE, FLAG_LOOSE } = requireConstants$1();
  const BUILDSTRIPRE = new RegExp(src[t.BUILD], "g");
  const isNullSet = (c) => c.value === "<0.0.0-0";
  const isAny = (c) => c.value === "";
  const isSatisfiable = (comparators, options) => {
    let result = true;
    const remainingComparators = comparators.slice();
    let testComparator = remainingComparators.pop();
    while (result && remainingComparators.length) {
      result = remainingComparators.every((otherComparator) => {
        return testComparator.intersects(otherComparator, options);
      });
      testComparator = remainingComparators.pop();
    }
    return result;
  };
  const parseComparator = (comp, options) => {
    comp = comp.replace(re2[t.BUILD], "");
    debug("comp", comp, options);
    comp = replaceCarets(comp, options);
    debug("caret", comp);
    comp = replaceTildes(comp, options);
    debug("tildes", comp);
    comp = replaceXRanges(comp, options);
    debug("xrange", comp);
    comp = replaceStars(comp, options);
    debug("stars", comp);
    return comp;
  };
  const isX = (id2) => !id2 || id2.toLowerCase() === "x" || id2 === "*";
  const invalidXRangeOrder = (M, m, p) => isX(M) && !isX(m) || isX(m) && p && !isX(p);
  const replaceTildes = (comp, options) => {
    return comp.trim().split(/\s+/).map((c) => replaceTilde(c, options)).join(" ");
  };
  const replaceTilde = (comp, options) => {
    const r = options.loose ? re2[t.TILDELOOSE] : re2[t.TILDE];
    const z2 = options.includePrerelease ? "-0" : "";
    return comp.replace(r, (_, M, m, p, pr) => {
      debug("tilde", comp, _, M, m, p, pr);
      let ret;
      if (isX(M)) {
        ret = "";
      } else if (isX(m)) {
        ret = `>=${M}.0.0${z2} <${+M + 1}.0.0-0`;
      } else if (isX(p)) {
        ret = `>=${M}.${m}.0${z2} <${M}.${+m + 1}.0-0`;
      } else if (pr) {
        debug("replaceTilde pr", pr);
        ret = `>=${M}.${m}.${p}-${pr} <${M}.${+m + 1}.0-0`;
      } else {
        ret = `>=${M}.${m}.${p} <${M}.${+m + 1}.0-0`;
      }
      debug("tilde return", ret);
      return ret;
    });
  };
  const replaceCarets = (comp, options) => {
    return comp.trim().split(/\s+/).map((c) => replaceCaret(c, options)).join(" ");
  };
  const replaceCaret = (comp, options) => {
    debug("caret", comp, options);
    const r = options.loose ? re2[t.CARETLOOSE] : re2[t.CARET];
    const z2 = options.includePrerelease ? "-0" : "";
    return comp.replace(r, (_, M, m, p, pr) => {
      debug("caret", comp, _, M, m, p, pr);
      let ret;
      if (isX(M)) {
        ret = "";
      } else if (isX(m)) {
        ret = `>=${M}.0.0${z2} <${+M + 1}.0.0-0`;
      } else if (isX(p)) {
        if (M === "0") {
          ret = `>=${M}.${m}.0${z2} <${M}.${+m + 1}.0-0`;
        } else {
          ret = `>=${M}.${m}.0${z2} <${+M + 1}.0.0-0`;
        }
      } else if (pr) {
        debug("replaceCaret pr", pr);
        if (M === "0") {
          if (m === "0") {
            ret = `>=${M}.${m}.${p}-${pr} <${M}.${m}.${+p + 1}-0`;
          } else {
            ret = `>=${M}.${m}.${p}-${pr} <${M}.${+m + 1}.0-0`;
          }
        } else {
          ret = `>=${M}.${m}.${p}-${pr} <${+M + 1}.0.0-0`;
        }
      } else {
        debug("no pr");
        if (M === "0") {
          if (m === "0") {
            ret = `>=${M}.${m}.${p} <${M}.${m}.${+p + 1}-0`;
          } else {
            ret = `>=${M}.${m}.${p} <${M}.${+m + 1}.0-0`;
          }
        } else {
          ret = `>=${M}.${m}.${p} <${+M + 1}.0.0-0`;
        }
      }
      debug("caret return", ret);
      return ret;
    });
  };
  const replaceXRanges = (comp, options) => {
    debug("replaceXRanges", comp, options);
    return comp.split(/\s+/).map((c) => replaceXRange(c, options)).join(" ");
  };
  const replaceXRange = (comp, options) => {
    comp = comp.trim();
    const r = options.loose ? re2[t.XRANGELOOSE] : re2[t.XRANGE];
    return comp.replace(r, (ret, gtlt, M, m, p, pr) => {
      debug("xRange", comp, ret, gtlt, M, m, p, pr);
      if (invalidXRangeOrder(M, m, p)) {
        return comp;
      }
      const xM = isX(M);
      const xm = xM || isX(m);
      const xp = xm || isX(p);
      const anyX = xp;
      if (gtlt === "=" && anyX) {
        gtlt = "";
      }
      pr = options.includePrerelease ? "-0" : "";
      if (xM) {
        if (gtlt === ">" || gtlt === "<") {
          ret = "<0.0.0-0";
        } else {
          ret = "*";
        }
      } else if (gtlt && anyX) {
        if (xm) {
          m = 0;
        }
        p = 0;
        if (gtlt === ">") {
          gtlt = ">=";
          if (xm) {
            M = +M + 1;
            m = 0;
            p = 0;
          } else {
            m = +m + 1;
            p = 0;
          }
        } else if (gtlt === "<=") {
          gtlt = "<";
          if (xm) {
            M = +M + 1;
          } else {
            m = +m + 1;
          }
        }
        if (gtlt === "<") {
          pr = "-0";
        }
        ret = `${gtlt + M}.${m}.${p}${pr}`;
      } else if (xm) {
        ret = `>=${M}.0.0${pr} <${+M + 1}.0.0-0`;
      } else if (xp) {
        ret = `>=${M}.${m}.0${pr} <${M}.${+m + 1}.0-0`;
      }
      debug("xRange return", ret);
      return ret;
    });
  };
  const replaceStars = (comp, options) => {
    debug("replaceStars", comp, options);
    return comp.trim().replace(re2[t.STAR], "");
  };
  const replaceGTE0 = (comp, options) => {
    debug("replaceGTE0", comp, options);
    return comp.trim().replace(re2[options.includePrerelease ? t.GTE0PRE : t.GTE0], "");
  };
  const hyphenReplace = (incPr) => ($0, from, fM, fm, fp, fpr, fb, to, tM, tm, tp, tpr) => {
    if (isX(fM)) {
      from = "";
    } else if (isX(fm)) {
      from = `>=${fM}.0.0${incPr ? "-0" : ""}`;
    } else if (isX(fp)) {
      from = `>=${fM}.${fm}.0${incPr ? "-0" : ""}`;
    } else if (fpr) {
      from = `>=${from}`;
    } else {
      from = `>=${from}${incPr ? "-0" : ""}`;
    }
    if (isX(tM)) {
      to = "";
    } else if (isX(tm)) {
      to = `<${+tM + 1}.0.0-0`;
    } else if (isX(tp)) {
      to = `<${tM}.${+tm + 1}.0-0`;
    } else if (tpr) {
      to = `<=${tM}.${tm}.${tp}-${tpr}`;
    } else if (incPr) {
      to = `<${tM}.${tm}.${+tp + 1}-0`;
    } else {
      to = `<=${to}`;
    }
    return `${from} ${to}`.trim();
  };
  const testSet = (set, version, options) => {
    for (let i = 0; i < set.length; i++) {
      if (!set[i].test(version)) {
        return false;
      }
    }
    if (version.prerelease.length && !options.includePrerelease) {
      for (let i = 0; i < set.length; i++) {
        debug(set[i].semver);
        if (set[i].semver === Comparator.ANY) {
          continue;
        }
        if (set[i].semver.prerelease.length > 0) {
          const allowed = set[i].semver;
          if (allowed.major === version.major && allowed.minor === version.minor && allowed.patch === version.patch) {
            return true;
          }
        }
      }
      return false;
    }
    return true;
  };
  return range$1;
}
var comparator$1;
var hasRequiredComparator$1;
function requireComparator$1() {
  if (hasRequiredComparator$1) return comparator$1;
  hasRequiredComparator$1 = 1;
  const ANY = Symbol("SemVer ANY");
  class Comparator {
    static get ANY() {
      return ANY;
    }
    constructor(comp, options) {
      options = parseOptions(options);
      if (comp instanceof Comparator) {
        if (comp.loose === !!options.loose) {
          return comp;
        } else {
          comp = comp.value;
        }
      }
      comp = comp.trim().split(/\s+/).join(" ");
      debug("comparator", comp, options);
      this.options = options;
      this.loose = !!options.loose;
      this.parse(comp);
      if (this.semver === ANY) {
        this.value = "";
      } else {
        this.value = this.operator + this.semver.version;
      }
      debug("comp", this);
    }
    parse(comp) {
      const r = this.options.loose ? re2[t.COMPARATORLOOSE] : re2[t.COMPARATOR];
      const m = comp.match(r);
      if (!m) {
        throw new TypeError(`Invalid comparator: ${comp}`);
      }
      this.operator = m[1] !== void 0 ? m[1] : "";
      if (this.operator === "=") {
        this.operator = "";
      }
      if (!m[2]) {
        this.semver = ANY;
      } else {
        this.semver = new SemVer(m[2], this.options.loose);
      }
    }
    toString() {
      return this.value;
    }
    test(version) {
      debug("Comparator.test", version, this.options.loose);
      if (this.semver === ANY || version === ANY) {
        return true;
      }
      if (typeof version === "string") {
        try {
          version = new SemVer(version, this.options);
        } catch (er) {
          return false;
        }
      }
      return cmp(version, this.operator, this.semver, this.options);
    }
    intersects(comp, options) {
      if (!(comp instanceof Comparator)) {
        throw new TypeError("a Comparator is required");
      }
      if (this.operator === "") {
        if (this.value === "") {
          return true;
        }
        return new Range(comp.value, options).test(this.value);
      } else if (comp.operator === "") {
        if (comp.value === "") {
          return true;
        }
        return new Range(this.value, options).test(comp.semver);
      }
      options = parseOptions(options);
      if (options.includePrerelease && (this.value === "<0.0.0-0" || comp.value === "<0.0.0-0")) {
        return false;
      }
      if (!options.includePrerelease && (this.value.startsWith("<0.0.0") || comp.value.startsWith("<0.0.0"))) {
        return false;
      }
      if (this.operator.startsWith(">") && comp.operator.startsWith(">")) {
        return true;
      }
      if (this.operator.startsWith("<") && comp.operator.startsWith("<")) {
        return true;
      }
      if (this.semver.version === comp.semver.version && this.operator.includes("=") && comp.operator.includes("=")) {
        return true;
      }
      if (cmp(this.semver, "<", comp.semver, options) && this.operator.startsWith(">") && comp.operator.startsWith("<")) {
        return true;
      }
      if (cmp(this.semver, ">", comp.semver, options) && this.operator.startsWith("<") && comp.operator.startsWith(">")) {
        return true;
      }
      return false;
    }
  }
  comparator$1 = Comparator;
  const parseOptions = requireParseOptions$1();
  const { safeRe: re2, t } = requireRe$1();
  const cmp = requireCmp$1();
  const debug = requireDebug$1();
  const SemVer = requireSemver$4();
  const Range = requireRange$1();
  return comparator$1;
}
var satisfies_1$1;
var hasRequiredSatisfies$1;
function requireSatisfies$1() {
  if (hasRequiredSatisfies$1) return satisfies_1$1;
  hasRequiredSatisfies$1 = 1;
  const Range = requireRange$1();
  const satisfies = (version, range2, options) => {
    try {
      range2 = new Range(range2, options);
    } catch (er) {
      return false;
    }
    return range2.test(version);
  };
  satisfies_1$1 = satisfies;
  return satisfies_1$1;
}
var toComparators_1$1;
var hasRequiredToComparators$1;
function requireToComparators$1() {
  if (hasRequiredToComparators$1) return toComparators_1$1;
  hasRequiredToComparators$1 = 1;
  const Range = requireRange$1();
  const toComparators = (range2, options) => new Range(range2, options).set.map((comp) => comp.map((c) => c.value).join(" ").trim().split(" "));
  toComparators_1$1 = toComparators;
  return toComparators_1$1;
}
var maxSatisfying_1$1;
var hasRequiredMaxSatisfying$1;
function requireMaxSatisfying$1() {
  if (hasRequiredMaxSatisfying$1) return maxSatisfying_1$1;
  hasRequiredMaxSatisfying$1 = 1;
  const SemVer = requireSemver$4();
  const Range = requireRange$1();
  const maxSatisfying = (versions, range2, options) => {
    let max = null;
    let maxSV = null;
    let rangeObj = null;
    try {
      rangeObj = new Range(range2, options);
    } catch (er) {
      return null;
    }
    versions.forEach((v) => {
      if (rangeObj.test(v)) {
        if (!max || maxSV.compare(v) === -1) {
          max = v;
          maxSV = new SemVer(max, options);
        }
      }
    });
    return max;
  };
  maxSatisfying_1$1 = maxSatisfying;
  return maxSatisfying_1$1;
}
var minSatisfying_1$1;
var hasRequiredMinSatisfying$1;
function requireMinSatisfying$1() {
  if (hasRequiredMinSatisfying$1) return minSatisfying_1$1;
  hasRequiredMinSatisfying$1 = 1;
  const SemVer = requireSemver$4();
  const Range = requireRange$1();
  const minSatisfying = (versions, range2, options) => {
    let min = null;
    let minSV = null;
    let rangeObj = null;
    try {
      rangeObj = new Range(range2, options);
    } catch (er) {
      return null;
    }
    versions.forEach((v) => {
      if (rangeObj.test(v)) {
        if (!min || minSV.compare(v) === 1) {
          min = v;
          minSV = new SemVer(min, options);
        }
      }
    });
    return min;
  };
  minSatisfying_1$1 = minSatisfying;
  return minSatisfying_1$1;
}
var minVersion_1$1;
var hasRequiredMinVersion$1;
function requireMinVersion$1() {
  if (hasRequiredMinVersion$1) return minVersion_1$1;
  hasRequiredMinVersion$1 = 1;
  const SemVer = requireSemver$4();
  const Range = requireRange$1();
  const gt = requireGt$1();
  const minVersion = (range2, loose) => {
    range2 = new Range(range2, loose);
    let minver = new SemVer("0.0.0");
    if (range2.test(minver)) {
      return minver;
    }
    minver = new SemVer("0.0.0-0");
    if (range2.test(minver)) {
      return minver;
    }
    minver = null;
    for (let i = 0; i < range2.set.length; ++i) {
      const comparators = range2.set[i];
      let setMin = null;
      comparators.forEach((comparator2) => {
        const compver = new SemVer(comparator2.semver.version);
        switch (comparator2.operator) {
          case ">":
            if (compver.prerelease.length === 0) {
              compver.patch++;
            } else {
              compver.prerelease.push(0);
            }
            compver.raw = compver.format();
          /* fallthrough */
          case "":
          case ">=":
            if (!setMin || gt(compver, setMin)) {
              setMin = compver;
            }
            break;
          case "<":
          case "<=":
            break;
          /* istanbul ignore next */
          default:
            throw new Error(`Unexpected operation: ${comparator2.operator}`);
        }
      });
      if (setMin && (!minver || gt(minver, setMin))) {
        minver = setMin;
      }
    }
    if (minver && range2.test(minver)) {
      return minver;
    }
    return null;
  };
  minVersion_1$1 = minVersion;
  return minVersion_1$1;
}
var valid$1;
var hasRequiredValid$2;
function requireValid$2() {
  if (hasRequiredValid$2) return valid$1;
  hasRequiredValid$2 = 1;
  const Range = requireRange$1();
  const validRange = (range2, options) => {
    try {
      return new Range(range2, options).range || "*";
    } catch (er) {
      return null;
    }
  };
  valid$1 = validRange;
  return valid$1;
}
var outside_1$1;
var hasRequiredOutside$1;
function requireOutside$1() {
  if (hasRequiredOutside$1) return outside_1$1;
  hasRequiredOutside$1 = 1;
  const SemVer = requireSemver$4();
  const Comparator = requireComparator$1();
  const { ANY } = Comparator;
  const Range = requireRange$1();
  const satisfies = requireSatisfies$1();
  const gt = requireGt$1();
  const lt = requireLt$1();
  const lte = requireLte$1();
  const gte = requireGte$1();
  const outside = (version, range2, hilo, options) => {
    version = new SemVer(version, options);
    range2 = new Range(range2, options);
    let gtfn, ltefn, ltfn, comp, ecomp;
    switch (hilo) {
      case ">":
        gtfn = gt;
        ltefn = lte;
        ltfn = lt;
        comp = ">";
        ecomp = ">=";
        break;
      case "<":
        gtfn = lt;
        ltefn = gte;
        ltfn = gt;
        comp = "<";
        ecomp = "<=";
        break;
      default:
        throw new TypeError('Must provide a hilo val of "<" or ">"');
    }
    if (satisfies(version, range2, options)) {
      return false;
    }
    for (let i = 0; i < range2.set.length; ++i) {
      const comparators = range2.set[i];
      let high = null;
      let low = null;
      comparators.forEach((comparator2) => {
        if (comparator2.semver === ANY) {
          comparator2 = new Comparator(">=0.0.0");
        }
        high = high || comparator2;
        low = low || comparator2;
        if (gtfn(comparator2.semver, high.semver, options)) {
          high = comparator2;
        } else if (ltfn(comparator2.semver, low.semver, options)) {
          low = comparator2;
        }
      });
      if (high.operator === comp || high.operator === ecomp) {
        return false;
      }
      if ((!low.operator || low.operator === comp) && ltefn(version, low.semver)) {
        return false;
      } else if (low.operator === ecomp && ltfn(version, low.semver)) {
        return false;
      }
    }
    return true;
  };
  outside_1$1 = outside;
  return outside_1$1;
}
var gtr_1$1;
var hasRequiredGtr$1;
function requireGtr$1() {
  if (hasRequiredGtr$1) return gtr_1$1;
  hasRequiredGtr$1 = 1;
  const outside = requireOutside$1();
  const gtr = (version, range2, options) => outside(version, range2, ">", options);
  gtr_1$1 = gtr;
  return gtr_1$1;
}
var ltr_1$1;
var hasRequiredLtr$1;
function requireLtr$1() {
  if (hasRequiredLtr$1) return ltr_1$1;
  hasRequiredLtr$1 = 1;
  const outside = requireOutside$1();
  const ltr = (version, range2, options) => outside(version, range2, "<", options);
  ltr_1$1 = ltr;
  return ltr_1$1;
}
var intersects_1$1;
var hasRequiredIntersects$1;
function requireIntersects$1() {
  if (hasRequiredIntersects$1) return intersects_1$1;
  hasRequiredIntersects$1 = 1;
  const Range = requireRange$1();
  const intersects = (r1, r2, options) => {
    r1 = new Range(r1, options);
    r2 = new Range(r2, options);
    return r1.intersects(r2, options);
  };
  intersects_1$1 = intersects;
  return intersects_1$1;
}
var simplify$1;
var hasRequiredSimplify$1;
function requireSimplify$1() {
  if (hasRequiredSimplify$1) return simplify$1;
  hasRequiredSimplify$1 = 1;
  const satisfies = requireSatisfies$1();
  const compare = requireCompare$1();
  simplify$1 = (versions, range2, options) => {
    const set = [];
    let first = null;
    let prev = null;
    const v = versions.sort((a, b) => compare(a, b, options));
    for (const version of v) {
      const included = satisfies(version, range2, options);
      if (included) {
        prev = version;
        if (!first) {
          first = version;
        }
      } else {
        if (prev) {
          set.push([first, prev]);
        }
        prev = null;
        first = null;
      }
    }
    if (first) {
      set.push([first, null]);
    }
    const ranges = [];
    for (const [min, max] of set) {
      if (min === max) {
        ranges.push(min);
      } else if (!max && min === v[0]) {
        ranges.push("*");
      } else if (!max) {
        ranges.push(`>=${min}`);
      } else if (min === v[0]) {
        ranges.push(`<=${max}`);
      } else {
        ranges.push(`${min} - ${max}`);
      }
    }
    const simplified = ranges.join(" || ");
    const original = typeof range2.raw === "string" ? range2.raw : String(range2);
    return simplified.length < original.length ? simplified : range2;
  };
  return simplify$1;
}
var subset_1$1;
var hasRequiredSubset$1;
function requireSubset$1() {
  if (hasRequiredSubset$1) return subset_1$1;
  hasRequiredSubset$1 = 1;
  const Range = requireRange$1();
  const Comparator = requireComparator$1();
  const { ANY } = Comparator;
  const satisfies = requireSatisfies$1();
  const compare = requireCompare$1();
  const subset = (sub, dom, options = {}) => {
    if (sub === dom) {
      return true;
    }
    sub = new Range(sub, options);
    dom = new Range(dom, options);
    let sawNonNull = false;
    OUTER: for (const simpleSub of sub.set) {
      for (const simpleDom of dom.set) {
        const isSub = simpleSubset(simpleSub, simpleDom, options);
        sawNonNull = sawNonNull || isSub !== null;
        if (isSub) {
          continue OUTER;
        }
      }
      if (sawNonNull) {
        return false;
      }
    }
    return true;
  };
  const minimumVersionWithPreRelease = [new Comparator(">=0.0.0-0")];
  const minimumVersion = [new Comparator(">=0.0.0")];
  const simpleSubset = (sub, dom, options) => {
    if (sub === dom) {
      return true;
    }
    if (sub.length === 1 && sub[0].semver === ANY) {
      if (dom.length === 1 && dom[0].semver === ANY) {
        return true;
      } else if (options.includePrerelease) {
        sub = minimumVersionWithPreRelease;
      } else {
        sub = minimumVersion;
      }
    }
    if (dom.length === 1 && dom[0].semver === ANY) {
      if (options.includePrerelease) {
        return true;
      } else {
        dom = minimumVersion;
      }
    }
    const eqSet = /* @__PURE__ */ new Set();
    let gt, lt;
    for (const c of sub) {
      if (c.operator === ">" || c.operator === ">=") {
        gt = higherGT(gt, c, options);
      } else if (c.operator === "<" || c.operator === "<=") {
        lt = lowerLT(lt, c, options);
      } else {
        eqSet.add(c.semver);
      }
    }
    if (eqSet.size > 1) {
      return null;
    }
    let gtltComp;
    if (gt && lt) {
      gtltComp = compare(gt.semver, lt.semver, options);
      if (gtltComp > 0) {
        return null;
      } else if (gtltComp === 0 && (gt.operator !== ">=" || lt.operator !== "<=")) {
        return null;
      }
    }
    for (const eq of eqSet) {
      if (gt && !satisfies(eq, String(gt), options)) {
        return null;
      }
      if (lt && !satisfies(eq, String(lt), options)) {
        return null;
      }
      for (const c of dom) {
        if (!satisfies(eq, String(c), options)) {
          return false;
        }
      }
      return true;
    }
    let higher, lower;
    let hasDomLT, hasDomGT;
    let needDomLTPre = lt && !options.includePrerelease && lt.semver.prerelease.length ? lt.semver : false;
    let needDomGTPre = gt && !options.includePrerelease && gt.semver.prerelease.length ? gt.semver : false;
    if (needDomLTPre && needDomLTPre.prerelease.length === 1 && lt.operator === "<" && needDomLTPre.prerelease[0] === 0) {
      needDomLTPre = false;
    }
    for (const c of dom) {
      hasDomGT = hasDomGT || c.operator === ">" || c.operator === ">=";
      hasDomLT = hasDomLT || c.operator === "<" || c.operator === "<=";
      if (gt) {
        if (needDomGTPre) {
          if (c.semver.prerelease && c.semver.prerelease.length && c.semver.major === needDomGTPre.major && c.semver.minor === needDomGTPre.minor && c.semver.patch === needDomGTPre.patch) {
            needDomGTPre = false;
          }
        }
        if (c.operator === ">" || c.operator === ">=") {
          higher = higherGT(gt, c, options);
          if (higher === c && higher !== gt) {
            return false;
          }
        } else if (gt.operator === ">=" && !c.test(gt.semver)) {
          return false;
        }
      }
      if (lt) {
        if (needDomLTPre) {
          if (c.semver.prerelease && c.semver.prerelease.length && c.semver.major === needDomLTPre.major && c.semver.minor === needDomLTPre.minor && c.semver.patch === needDomLTPre.patch) {
            needDomLTPre = false;
          }
        }
        if (c.operator === "<" || c.operator === "<=") {
          lower = lowerLT(lt, c, options);
          if (lower === c && lower !== lt) {
            return false;
          }
        } else if (lt.operator === "<=" && !c.test(lt.semver)) {
          return false;
        }
      }
      if (!c.operator && (lt || gt) && gtltComp !== 0) {
        return false;
      }
    }
    if (gt && hasDomLT && !lt && gtltComp !== 0) {
      return false;
    }
    if (lt && hasDomGT && !gt && gtltComp !== 0) {
      return false;
    }
    if (needDomGTPre || needDomLTPre) {
      return false;
    }
    return true;
  };
  const higherGT = (a, b, options) => {
    if (!a) {
      return b;
    }
    const comp = compare(a.semver, b.semver, options);
    return comp > 0 ? a : comp < 0 ? b : b.operator === ">" && a.operator === ">=" ? b : a;
  };
  const lowerLT = (a, b, options) => {
    if (!a) {
      return b;
    }
    const comp = compare(a.semver, b.semver, options);
    return comp < 0 ? a : comp > 0 ? b : b.operator === "<" && a.operator === "<=" ? b : a;
  };
  subset_1$1 = subset;
  return subset_1$1;
}
var semver$3;
var hasRequiredSemver$3;
function requireSemver$3() {
  if (hasRequiredSemver$3) return semver$3;
  hasRequiredSemver$3 = 1;
  const internalRe = requireRe$1();
  const constants2 = requireConstants$1();
  const SemVer = requireSemver$4();
  const identifiers2 = requireIdentifiers$1();
  const parse = requireParse$1();
  const valid2 = requireValid$3();
  const clean = requireClean$1();
  const inc = requireInc$1();
  const diff = requireDiff$1();
  const major = requireMajor$1();
  const minor = requireMinor$1();
  const patch = requirePatch$1();
  const prerelease = requirePrerelease$1();
  const compare = requireCompare$1();
  const rcompare = requireRcompare$1();
  const compareLoose = requireCompareLoose$1();
  const compareBuild = requireCompareBuild$1();
  const sort = requireSort$1();
  const rsort = requireRsort$1();
  const gt = requireGt$1();
  const lt = requireLt$1();
  const eq = requireEq$1();
  const neq = requireNeq$1();
  const gte = requireGte$1();
  const lte = requireLte$1();
  const cmp = requireCmp$1();
  const coerce = requireCoerce$1();
  const truncate = requireTruncate$1();
  const Comparator = requireComparator$1();
  const Range = requireRange$1();
  const satisfies = requireSatisfies$1();
  const toComparators = requireToComparators$1();
  const maxSatisfying = requireMaxSatisfying$1();
  const minSatisfying = requireMinSatisfying$1();
  const minVersion = requireMinVersion$1();
  const validRange = requireValid$2();
  const outside = requireOutside$1();
  const gtr = requireGtr$1();
  const ltr = requireLtr$1();
  const intersects = requireIntersects$1();
  const simplifyRange = requireSimplify$1();
  const subset = requireSubset$1();
  semver$3 = {
    parse,
    valid: valid2,
    clean,
    inc,
    diff,
    major,
    minor,
    patch,
    prerelease,
    compare,
    rcompare,
    compareLoose,
    compareBuild,
    sort,
    rsort,
    gt,
    lt,
    eq,
    neq,
    gte,
    lte,
    cmp,
    coerce,
    truncate,
    Comparator,
    Range,
    satisfies,
    toComparators,
    maxSatisfying,
    minSatisfying,
    minVersion,
    validRange,
    outside,
    gtr,
    ltr,
    intersects,
    simplifyRange,
    subset,
    SemVer,
    re: internalRe.re,
    src: internalRe.src,
    tokens: internalRe.t,
    SEMVER_SPEC_VERSION: constants2.SEMVER_SPEC_VERSION,
    RELEASE_TYPES: constants2.RELEASE_TYPES,
    compareIdentifiers: identifiers2.compareIdentifiers,
    rcompareIdentifiers: identifiers2.rcompareIdentifiers
  };
  return semver$3;
}
var semverExports$2 = requireSemver$3();
function buildReleaseIdentity(baseVersion, packaged) {
  if (!packaged) return { version: `${baseVersion}-dev`, channel: "development" };
  return { version: baseVersion, channel: baseVersion.includes("-") ? "beta" : "stable" };
}
function normalizeUpdateChannel(value) {
  return value === "beta" || value === "preview" ? "beta" : "stable";
}
function buildUpdatePolicy(channel) {
  return { allowPrerelease: channel === "beta", allowDowngrade: false };
}
function isUpdateVersionEligible(currentVersion, candidateVersion, channel) {
  if (!semverExports$2.valid(currentVersion) || !semverExports$2.valid(candidateVersion) || !semverExports$2.gt(candidateVersion, currentVersion)) return false;
  const identifiers2 = semverExports$2.prerelease(candidateVersion);
  if (identifiers2 === null) return true;
  return channel === "beta" && typeof identifiers2[0] === "string" && ["beta", "rc"].includes(identifiers2[0]);
}
function formatAppBuildInfo(info) {
  return [
    `FORGE v${info.version}`,
    `Channel: ${info.channel}`,
    `Commit: ${info.commit}`,
    `Build date: ${info.buildDate}`,
    `Runtime: ${info.runtime}`,
    `Renderer: ${info.rendererSource}`,
    `Platform: ${info.platform} ${info.architecture}`
  ].join("\n");
}
const DEFAULT_WORKSPACE_LAYOUT = {
  explorerWidth: 245,
  intelligenceWidth: 360,
  bottomHeight: 240,
  contextHeight: 300
};
const IPC_CHANNELS = {
  workspaceOpen: "workspace.open",
  workspaceInfo: "workspace.info",
  workspaceLayoutGet: "workspace.layout.get",
  workspaceLayoutSave: "workspace.layout.save",
  fileList: "file.list",
  fileRead: "file.read",
  fileWrite: "file.write",
  fileCreate: "file.create",
  fileDelete: "file.delete",
  fileRename: "file.rename",
  fileCopy: "file.copy",
  markdownParse: "markdown.parse",
  gitStatus: "git.status",
  gitBranches: "git.branches",
  gitLog: "git.log",
  gitDiff: "git.diff",
  gitStage: "git.stage",
  gitUnstage: "git.unstage",
  gitCommit: "git.commit",
  gitPull: "git.pull",
  gitPush: "git.push",
  metaDashboard: "meta.dashboard",
  metaGoalCreate: "meta.goal.create",
  metaTaskCreate: "meta.task.create",
  appUpdateStatus: "app.update.status",
  appUpdateCheck: "app.update.check",
  appUpdateInstall: "app.update.install",
  appReleaseOpen: "app.release.open",
  appBuildInfo: "app.build.info",
  appBuildInfoCopy: "app.build.info.copy",
  settingsGet: "settings.get",
  settingsSave: "settings.save",
  settingsTestApi: "settings.test.api",
  settingsTestGithub: "settings.test.github",
  settingsModelsList: "settings.models.list",
  settingsModelValidate: "settings.model.validate",
  agentAsk: "agent.ask",
  agentExplainProject: "agent.explainProject",
  agentReviewChanges: "agent.reviewChanges",
  agentConversationsState: "agent.conversations.state",
  agentConversationsList: "agent.conversations.list",
  agentConversationsAppend: "agent.conversations.append",
  agentConversationCreate: "agent.conversation.create",
  agentConversationSelect: "agent.conversation.select",
  agentConversationRename: "agent.conversation.rename",
  agentConversationClear: "agent.conversation.clear",
  agentMemoriesList: "agent.memories.list",
  agentMemoriesDelete: "agent.memories.delete",
  agentMemoriesReindex: "agent.memories.reindex",
  toolRequestsList: "tool.requests.list",
  toolRequestApprove: "tool.request.approve",
  toolRequestReject: "tool.request.reject",
  toolRequestCancel: "tool.request.cancel",
  toolActionsList: "tool.actions.list",
  editorDirtyUpdate: "editor.dirty.update",
  terminalCreate: "terminal.create",
  terminalList: "terminal.list",
  terminalInput: "terminal.input",
  terminalResize: "terminal.resize",
  terminalTerminate: "terminal.terminate",
  terminalRestart: "terminal.restart",
  terminalRemove: "terminal.remove",
  tasksList: "tasks.list",
  tasksGet: "tasks.get",
  tasksCreate: "tasks.create",
  tasksCreateRelease: "tasks.create.release",
  tasksResume: "tasks.resume",
  tasksPause: "tasks.pause",
  tasksCancel: "tasks.cancel",
  tasksRetryStep: "tasks.retry.step",
  tasksHandoff: "tasks.handoff",
  browserNavigate: "browser.navigate",
  browserLayout: "browser.layout",
  browserBack: "browser.back",
  browserForward: "browser.forward",
  browserReload: "browser.reload"
};
const IGNORED = /* @__PURE__ */ new Set([".git", "node_modules", "dist", "out", "build", ".next", ".forge", "coverage", "__pycache__"]);
function parseMarkdown(content) {
  const frontmatter = {};
  const matched = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  const body = matched ? content.slice(matched[0].length) : content;
  if (matched) for (const line of matched[1].split(/\r?\n/)) {
    const pair = line.match(/^([\w-]+):\s*(.+)$/);
    if (pair) frontmatter[pair[1]] = pair[2].startsWith("[") ? pair[2].slice(1, -1).split(",").map((item) => item.trim()).filter(Boolean) : pair[2].replace(/^['"]|['"]$/g, "");
  }
  const wikiLinks = [...body.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)].map((m) => m[1].trim());
  const tags = [];
  let fenced = false;
  for (const line of body.split(/\r?\n/)) {
    if (line.trim().startsWith("```")) {
      fenced = !fenced;
      continue;
    }
    if (!fenced) tags.push(...[...line.matchAll(/(?:^|\s)#([\w-]+)/g)].map((m) => m[1]));
  }
  const headings = [...body.matchAll(/^(#{1,6})\s+(.+)$/gm)].map((m) => ({ level: m[1].length, text: m[2].trim(), slug: m[2].trim().toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-") }));
  return { content: body, frontmatter, wikiLinks: [...new Set(wikiLinks)], tags: [...new Set(tags)], headings };
}
class WorkspaceService extends EventEmitter {
  rootPath = null;
  realRoot = null;
  workspaceInfo = null;
  watcher;
  async open(rootPath) {
    const stat = await promises.stat(rootPath);
    if (!stat.isDirectory()) throw new Error("Workspace must be a directory.");
    this.rootPath = path.resolve(rootPath);
    this.realRoot = await promises.realpath(this.rootPath);
    const gitPath = path.join(this.rootPath, ".git");
    const gitRoot = await promises.access(gitPath).then(() => gitPath).catch(() => null);
    this.workspaceInfo = { rootPath: this.rootPath, name: path.basename(this.rootPath), gitRoot, createdAt: stat.birthtimeMs };
    return { ...this.workspaceInfo };
  }
  info() {
    return this.workspaceInfo ? { ...this.workspaceInfo } : null;
  }
  async close() {
    this.watcher?.close();
    this.watcher = void 0;
    this.rootPath = null;
    this.realRoot = null;
    this.workspaceInfo = null;
  }
  async list(relativePath2 = "") {
    return this.listDirectory(await this.resolve(relativePath2), relativePath2);
  }
  async readFile(relativePath2) {
    const absolute = await this.resolve(relativePath2);
    const stat = await promises.stat(absolute);
    if (!stat.isFile()) throw new Error("Path is not a file.");
    const bytes = await promises.readFile(absolute);
    if (bytes.includes(0)) throw new Error("Forge cannot open binary files. Choose a text or source file.");
    let content;
    try {
      content = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      throw new Error("Forge could not decode this file as UTF-8 text.");
    }
    return { path: relativePath2, content, modifiedAt: stat.mtimeMs };
  }
  async writeFile(relativePath2, content) {
    const absolute = await this.resolve(relativePath2, true);
    await promises.mkdir(path.dirname(absolute), { recursive: true });
    await promises.writeFile(absolute, content, "utf8");
    const stat = await promises.stat(absolute);
    return { path: relativePath2, content, modifiedAt: stat.mtimeMs };
  }
  async create(relativePath2, type, content = "") {
    const absolute = await this.resolve(relativePath2, true);
    await promises.mkdir(path.dirname(absolute), { recursive: true });
    if (type === "directory") await promises.mkdir(absolute, { recursive: false });
    else await promises.writeFile(absolute, content, { flag: "wx" });
    return this.nodeFor(absolute);
  }
  async delete(relativePath2) {
    const absolute = await this.resolve(relativePath2);
    if (absolute === this.realRoot) throw new Error("Cannot delete the workspace root.");
    await promises.rm(absolute, { recursive: true, force: false });
  }
  async rename(oldPath, newPath) {
    const oldAbsolute = await this.resolve(oldPath);
    const newAbsolute = await this.resolve(newPath, true);
    await promises.mkdir(path.dirname(newAbsolute), { recursive: true });
    await promises.rename(oldAbsolute, newAbsolute);
    return this.nodeFor(newAbsolute);
  }
  async copy(sourcePath, destinationPath) {
    const source = await this.resolve(sourcePath);
    const destination = await this.resolve(destinationPath, true);
    if (source === destination) throw new Error("Cannot paste a file or folder onto itself.");
    await promises.access(destination).then(() => {
      throw new Error(`A file or folder already exists at ${destinationPath}.`);
    }).catch((error) => {
      if (error instanceof Error && !("code" in error && error.code === "ENOENT")) throw error;
    });
    await promises.mkdir(path.dirname(destination), { recursive: true });
    const sourceStat = await promises.stat(source);
    if (sourceStat.isDirectory() && destination.startsWith(`${source}${path.sep}`)) throw new Error("A folder cannot be copied into itself or one of its children.");
    await promises.cp(source, destination, { recursive: sourceStat.isDirectory(), force: false, errorOnExist: true });
    return this.nodeFor(destination);
  }
  async parse(relativePath2) {
    return parseMarkdown((await this.readFile(relativePath2)).content);
  }
  watch() {
    if (!this.rootPath) throw new Error("No workspace is open.");
    this.watcher?.close();
    this.watcher = watch(this.rootPath, { recursive: true }, (_event, filename) => {
      if (filename && !filename.toString().split(path.sep).some((part) => IGNORED.has(part))) this.emit("changed", filename.toString());
    });
  }
  async listDirectory(absolute, relative) {
    const entries = await promises.readdir(absolute, { withFileTypes: true });
    const nodes = [];
    for (const entry of entries) {
      if (IGNORED.has(entry.name) || entry.isSymbolicLink()) continue;
      const childRelative = relative ? path.join(relative, entry.name) : entry.name;
      const childAbsolute = path.join(absolute, entry.name);
      const node = await this.nodeFor(childAbsolute, childRelative);
      if (entry.isDirectory()) node.children = await this.listDirectory(childAbsolute, childRelative);
      nodes.push(node);
    }
    return nodes.sort((a, b) => a.type === b.type ? a.name.localeCompare(b.name) : a.type === "directory" ? -1 : 1);
  }
  async nodeFor(absolute, relative = path.relative(this.rootPath, absolute)) {
    const stat = await promises.stat(absolute);
    return { path: absolute, relativePath: relative, name: path.basename(absolute), type: stat.isDirectory() ? "directory" : "file", extension: stat.isFile() ? path.extname(absolute).slice(1) || void 0 : void 0, size: stat.isFile() ? stat.size : void 0, modifiedAt: stat.mtimeMs };
  }
  async resolve(input, allowMissing = false) {
    if (!this.rootPath || !this.realRoot) throw new Error("No workspace is open.");
    if (path.isAbsolute(input)) throw new Error("Workspace paths must be relative.");
    const candidate = path.resolve(this.rootPath, input);
    if (candidate !== this.rootPath && !candidate.startsWith(`${this.rootPath}${path.sep}`)) throw new Error("Path escapes the workspace.");
    let inspect = candidate;
    if (allowMissing) while (inspect !== this.rootPath) {
      try {
        await promises.access(inspect);
        break;
      } catch {
        inspect = path.dirname(inspect);
      }
    }
    const resolved = await promises.realpath(inspect);
    if (resolved !== this.realRoot && !resolved.startsWith(`${this.realRoot}${path.sep}`)) throw new Error("Symlink escapes the workspace.");
    return candidate;
  }
}
const bounded = (value) => JSON.parse(JSON.stringify(value).slice(0, 15e5));
class GitHubService {
  constructor(origin, credentials, requestImpl = fetch) {
    this.origin = origin;
    this.credentials = credentials;
    this.requestImpl = requestImpl;
  }
  async read(resource, options = {}) {
    const page = Math.min(Math.max(options.page ?? 1, 1), 100);
    let suffix = "";
    switch (resource) {
      case "metadata":
        break;
      case "branches":
        suffix = `/branches?per_page=100&page=${page}`;
        break;
      case "commits":
        suffix = `/commits?per_page=100&page=${page}`;
        break;
      case "issues":
        suffix = `/issues?state=all&per_page=100&page=${page}`;
        break;
      case "pulls":
        suffix = `/pulls?state=all&per_page=100&page=${page}`;
        break;
      case "issue-comments":
        suffix = `/issues/${required(options.number, "number")}/comments?per_page=100&page=${page}`;
        break;
      case "pull-comments":
        suffix = `/pulls/${required(options.number, "number")}/comments?per_page=100&page=${page}`;
        break;
      case "workflow-runs":
        suffix = `/actions/runs?per_page=100&page=${page}`;
        break;
      case "workflow-jobs":
        suffix = `/actions/runs/${required(options.runId, "runId")}/jobs?per_page=100&page=${page}`;
        break;
      case "releases":
        suffix = `/releases?per_page=100&page=${page}`;
        break;
      case "release-assets":
        suffix = `/releases/${required(options.releaseId, "releaseId")}/assets?per_page=100&page=${page}`;
        break;
    }
    return this.api(suffix, "GET");
  }
  async mutate(action, input) {
    let operation;
    switch (action) {
      case "create-issue":
        operation = { method: "POST", path: "/issues", body: pick(input, "title", "body", "labels", "assignees") };
        break;
      case "update-issue":
        operation = { method: "PATCH", path: `/issues/${requiredNumber(input.number, "number")}`, body: pick(input, "title", "body", "state", "labels", "assignees") };
        break;
      case "comment-issue":
        operation = { method: "POST", path: `/issues/${requiredNumber(input.number, "number")}/comments`, body: pick(input, "body") };
        break;
      case "create-branch":
        operation = { method: "POST", path: "/git/refs", body: { ref: `refs/heads/${requiredString(input.branch, "branch")}`, sha: requiredString(input.sha, "sha") } };
        break;
      case "create-file":
        operation = { method: "PUT", path: `/contents/${encodeURIComponent(requiredString(input.path, "path")).replace(/%2F/g, "/")}`, body: pick(input, "message", "content", "branch", "sha") };
        break;
      case "create-pull-request":
        operation = { method: "POST", path: "/pulls", body: pick(input, "title", "head", "base", "body", "draft") };
        break;
      case "comment-pull-request":
        operation = { method: "POST", path: `/issues/${requiredNumber(input.number, "number")}/comments`, body: pick(input, "body") };
        break;
      case "retry-workflow":
        operation = { method: "POST", path: `/actions/runs/${requiredNumber(input.runId, "runId")}/rerun`, body: {} };
        break;
      case "create-release":
        operation = { method: "POST", path: "/releases", body: pick(input, "tag_name", "target_commitish", "name", "body", "draft", "prerelease") };
        break;
      case "update-release":
        operation = { method: "PATCH", path: `/releases/${requiredNumber(input.releaseId, "releaseId")}`, body: pick(input, "tag_name", "target_commitish", "name", "body", "draft", "prerelease") };
        break;
    }
    return this.api(operation.path, operation.method, operation.body, true);
  }
  async api(path2, method, body, requireCredentials = false) {
    const repository = await this.repository();
    const credentials = await this.credentials?.();
    if (requireCredentials && !credentials) throw new Error("A GitHub token is required for this operation.");
    const response = await this.requestImpl(`https://api.github.com/repos/${repository.owner}/${repository.repo}${path2}`, { method, headers: { Accept: "application/vnd.github+json", "User-Agent": "FORGE-desktop", ...credentials ? { Authorization: `Bearer ${credentials.token}` } : {}, ...body === void 0 ? {} : { "Content-Type": "application/json" } }, body: body === void 0 ? void 0 : JSON.stringify(body) });
    if (!response.ok) throw new Error(`GitHub API request failed (${response.status}).`);
    if (response.status === 204) return { success: true };
    return bounded(await response.json());
  }
  async repository() {
    const origin = await this.origin();
    const match = /github\.com[/:]([^/\s]+)\/([^/\s]+?)(?:\.git)?$/i.exec(origin);
    if (!match) throw new Error("The active Git remote is not a supported GitHub repository.");
    return { owner: match[1], repo: match[2] };
  }
}
const required = (value, name) => {
  if (!Number.isSafeInteger(value) || value < 1) throw new Error(`GitHub ${name} is required.`);
  return value;
};
const requiredNumber = (value, name) => required(typeof value === "number" ? value : void 0, name);
const requiredString = (value, name) => {
  if (typeof value !== "string" || !value.trim()) throw new Error(`GitHub ${name} is required.`);
  return value.trim();
};
const pick = (value, ...keys) => Object.fromEntries(keys.filter((key) => value[key] !== void 0).map((key) => [key, value[key]]));
const safeFiles = (files) => files.map((file) => {
  if (!file || file.startsWith("/") || file.split(/[\\/]/).includes("..")) throw new Error("Git paths must be workspace-relative.");
  return file;
});
const toCommit = (entry) => ({ hash: entry.hash, shortHash: entry.hash.slice(0, 7), author: entry.author_name, email: entry.author_email, message: entry.message, timestamp: new Date(entry.date).getTime() });
class GitService {
  constructor(credentials) {
    this.credentials = credentials;
  }
  git = null;
  rootPath = null;
  async init(rootPath) {
    const git2 = simpleGit(rootPath);
    if (!await git2.checkIsRepo()) {
      this.git = null;
      this.rootPath = null;
      return false;
    }
    this.git = git2;
    this.rootPath = rootPath;
    return true;
  }
  async status() {
    const git2 = this.ready();
    const summary = await git2.status();
    let head = null;
    try {
      const log = await git2.log({ maxCount: 1 });
      if (log.latest) head = toCommit(log.latest);
    } catch {
    }
    return { branch: summary.current || "HEAD", ahead: summary.ahead, behind: summary.behind, files: summary.files.map((file) => ({ path: file.path, indexStatus: file.index, workingStatus: file.working_dir, untracked: file.index === "?" || file.working_dir === "?" })), head };
  }
  async branches() {
    const data = await this.ready().branch(["-a"]);
    return data.all.map((name) => ({ name, current: name === data.current }));
  }
  async log(limit = 30) {
    return (await this.ready().log({ maxCount: Math.min(Math.max(limit, 1), 100) })).all.map(toCommit);
  }
  async stage(files) {
    await this.ready().add(safeFiles(files));
  }
  async unstage(files) {
    await this.ready().raw(["reset", "HEAD", "--", ...safeFiles(files)]);
  }
  async commit(message, files) {
    if (!message.trim()) throw new Error("Commit message is required.");
    const git2 = this.ready();
    if (files?.length) await git2.add(safeFiles(files));
    await git2.commit(message.trim());
    const latest = (await git2.log({ maxCount: 1 })).latest;
    if (!latest) throw new Error("Git did not return the new commit.");
    return toCommit(latest);
  }
  async pull() {
    const git2 = await this.remoteGit();
    const branch = (await git2.branch()).current;
    await git2.pull("origin", branch);
  }
  async push() {
    const git2 = await this.remoteGit();
    const branch = (await git2.branch()).current;
    await git2.push("origin", branch, ["--set-upstream"]);
  }
  async originUrl() {
    const origin = await this.ready().remote(["get-url", "origin"]);
    if (typeof origin !== "string" || !origin.trim()) throw new Error("The active Git repository has no origin remote.");
    return origin.trim();
  }
  async diff(staged) {
    const text = await this.ready().diff(staged ? ["--cached", "--no-color"] : ["--no-color"]);
    return parseDiff(text);
  }
  ready() {
    if (!this.git) throw new Error("The opened workspace is not a Git repository.");
    return this.git;
  }
  async remoteGit() {
    const git2 = this.ready();
    const remote = await git2.remote(["get-url", "origin"]).catch(() => void 0);
    if (typeof remote !== "string" || !/^https:\/\/github\.com\//i.test(remote.trim()) || !this.credentials || !this.rootPath) return git2;
    const credentials = await this.credentials();
    if (!credentials) return git2;
    return simpleGit({ baseDir: this.rootPath }).env({
      ...process.env,
      GIT_ASKPASS: credentials.askPassPath,
      GIT_TERMINAL_PROMPT: "0",
      FORGE_GITHUB_USERNAME: credentials.username,
      FORGE_GITHUB_TOKEN: credentials.token
    });
  }
}
function parseDiff(text) {
  const files = [];
  let current;
  let oldLine = 0;
  let newLine = 0;
  for (const line of text.split("\n")) {
    const header = line.match(/^diff --git a\/(.+?) b\/(.+)$/);
    if (header) {
      current = { path: header[2], status: "M", additions: 0, deletions: 0, lines: [] };
      files.push(current);
      continue;
    }
    if (!current) continue;
    if (line.startsWith("new file")) {
      current.status = "A";
      continue;
    }
    if (line.startsWith("deleted file")) {
      current.status = "D";
      continue;
    }
    if (line.startsWith("rename ")) {
      current.status = "R";
      continue;
    }
    const hunk = line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunk) {
      oldLine = Number(hunk[1]);
      newLine = Number(hunk[2]);
      continue;
    }
    if (line.startsWith("+++") || line.startsWith("---") || line.startsWith("\\")) continue;
    let diffLine;
    if (line.startsWith("+")) {
      diffLine = { type: "addition", oldLineNumber: null, newLineNumber: newLine++, content: line.slice(1) };
      current.additions++;
    } else if (line.startsWith("-")) {
      diffLine = { type: "deletion", oldLineNumber: oldLine++, newLineNumber: null, content: line.slice(1) };
      current.deletions++;
    } else if (line.startsWith(" ")) diffLine = { type: "context", oldLineNumber: oldLine++, newLineNumber: newLine++, content: line.slice(1) };
    if (diffLine) current.lines.push(diffLine);
  }
  return { files };
}
const id = () => randomUUID();
const CURRENT_SCHEMA_VERSION = 6;
const TASK_STATUSES = /* @__PURE__ */ new Set(["draft", "ready", "running", "waiting", "blocked", "paused", "failed", "cancelled", "completed"]);
const STEP_STATUSES = /* @__PURE__ */ new Set(["pending", "running", "waiting", "blocked", "failed", "skipped", "completed"]);
function normalizeTitle(value) {
  const title = value?.trim() || "New conversation";
  return title.slice(0, 120);
}
function titleFromPrompt(prompt) {
  const singleLine = prompt.replace(/\s+/g, " ").trim();
  return singleLine.length > 52 ? `${singleLine.slice(0, 49)}…` : singleLine || "New conversation";
}
function clamp(value, minimum, maximum, fallback) {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(maximum, Math.max(minimum, Math.round(value))) : fallback;
}
function parseJson(value, fallback) {
  if (typeof value !== "string" || !value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}
function sanitizeTaskData(value) {
  if (Array.isArray(value)) return value.map(sanitizeTaskData);
  if (!value || typeof value !== "object") return typeof value === "string" && /(?:sk-|github_pat_|gh[oprsu]_)[A-Za-z0-9_-]{10,}/.test(value) ? "[REDACTED]" : value;
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, /token|secret|password|authorization|credential|api.?key/i.test(key) ? "[REDACTED]" : sanitizeTaskData(entry)]));
}
function normalizeWorkspaceLayout(value) {
  return {
    explorerWidth: clamp(value?.explorerWidth, 180, 520, DEFAULT_WORKSPACE_LAYOUT.explorerWidth),
    intelligenceWidth: clamp(value?.intelligenceWidth, 300, 720, DEFAULT_WORKSPACE_LAYOUT.intelligenceWidth),
    bottomHeight: clamp(value?.bottomHeight, 150, 520, DEFAULT_WORKSPACE_LAYOUT.bottomHeight),
    contextHeight: clamp(value?.contextHeight, 160, 650, DEFAULT_WORKSPACE_LAYOUT.contextHeight)
  };
}
class StorageService {
  db = null;
  filePath = null;
  rootPath = null;
  persistQueue = Promise.resolve();
  async init(rootPath) {
    const directory = path.join(rootPath, ".forge");
    await promises.mkdir(directory, { recursive: true });
    this.filePath = path.join(directory, "metadata.sqlite");
    this.rootPath = rootPath;
    const SQL = await initSqlJs();
    const bytes = await promises.readFile(this.filePath).catch(() => null);
    this.db = bytes ? new SQL.Database(bytes) : new SQL.Database();
    this.db.run("PRAGMA foreign_keys = ON");
    this.createSchema();
    await this.ensureProject();
    await this.migrateLegacyConversations();
    this.db.run(`PRAGMA user_version = ${CURRENT_SCHEMA_VERSION}`);
    await this.persist();
  }
  async close() {
    await this.persist();
    this.db?.close();
    this.db = null;
    this.filePath = null;
    this.rootPath = null;
  }
  async dashboard() {
    const project = this.one("SELECT * FROM projects WHERE root_path = ?", [this.rootPath]);
    if (!project) return null;
    return {
      id: String(project.id),
      name: String(project.name),
      rootPath: String(project.root_path),
      createdAt: Number(project.created_at),
      updatedAt: Number(project.updated_at),
      goals: this.goals(String(project.id)),
      tasks: this.tasks(String(project.id))
    };
  }
  async createGoal(title, description) {
    if (!title.trim()) throw new Error("Goal title is required.");
    const projectId = await this.projectId();
    const now = Date.now();
    const goal = { id: id(), title: title.trim(), description, status: "active", createdAt: now, updatedAt: now };
    this.ready().run("INSERT INTO goals VALUES (?, ?, ?, ?, ?, ?, ?)", [goal.id, projectId, goal.title, description ?? null, goal.status, now, now]);
    await this.persist();
    return goal;
  }
  async createTask(title, description, priority = "medium") {
    return this.createPersistentTask({ title, description, taskType: "general", priority, progressSummary: "Draft task created from workspace metadata.", resumeInstructions: "Inspect the workspace and define verified steps before starting.", steps: [] });
  }
  async createPersistentTask(draft) {
    if (!draft.title.trim()) throw new Error("Task title is required.");
    if (draft.title.length > 240) throw new Error("Task title is too long.");
    if (!draft.taskType.trim()) throw new Error("Task type is required.");
    if (draft.taskType.length > 100 || (draft.description?.length ?? 0) > 2e4) throw new Error("Task type or description is too long.");
    if (!draft.resumeInstructions.trim()) throw new Error("Safe resume instructions are required.");
    if (draft.resumeInstructions.length > 2e4 || draft.steps.length > 200 || (draft.taskDependencies?.length ?? 0) > 100) throw new Error("Task resume instructions, steps, or dependencies exceed the storage limit.");
    if (JSON.stringify(sanitizeTaskData(draft)).length > 1e6) throw new Error("Task definition exceeds the one-megabyte storage limit.");
    const projectId = await this.projectId();
    if (draft.originatingConversationId) await this.assertConversation(draft.originatingConversationId);
    for (const dependency of draft.taskDependencies ?? []) await this.assertTask(dependency);
    const taskId = id();
    const now = Date.now();
    const stepIds = draft.steps.map((step) => step.id ?? id());
    if (new Set(stepIds).size !== stepIds.length) throw new Error("Task step IDs must be unique.");
    const stepIdSet = new Set(stepIds);
    for (let index = 0; index < draft.steps.length; index += 1) {
      const step = draft.steps[index];
      if (!step.name.trim() || step.name.length > 240 || !step.purpose.trim() || step.purpose.length > 1e4) throw new Error("Task step name or purpose is invalid.");
      if (![0, 1, 2].includes(step.riskTier) || (step.requiredTool?.length ?? 0) > 200) throw new Error("Task step risk tier or required tool is invalid.");
      if (!Array.isArray(step.verificationCriteria) || step.verificationCriteria.length > 100 || step.verificationCriteria.some((criterion) => !criterion.trim() || criterion.length > 2e3)) throw new Error("Task step verification criteria are invalid.");
      for (const dependency of draft.steps[index].dependencies ?? []) if (!stepIdSet.has(dependency) || dependency === stepIds[index]) throw new Error("Task step dependency is invalid.");
    }
    this.assertAcyclicSteps(stepIds, draft.steps.map((step) => step.dependencies ?? []));
    this.ready().run(`INSERT INTO tasks (id, project_id, title, description, status, priority, created_at, updated_at, task_type, originating_conversation_id, last_active_conversation_id, assigned_provider, assigned_model, progress_summary, resumability_state, resume_instructions, associated_branch, associated_commit_sha, associated_pull_request, associated_release_tag, associated_workflow_run, process_ids, external_resource_ids)
      VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'resumable', ?, ?, ?, ?, ?, ?, '[]', '[]')`, [taskId, projectId, draft.title.trim(), draft.description ?? null, draft.priority ?? "medium", now, now, draft.taskType.trim(), draft.originatingConversationId ?? null, draft.originatingConversationId ?? null, draft.assignedProvider ?? null, draft.assignedModel ?? null, draft.progressSummary ?? "Draft task created.", draft.resumeInstructions.trim(), draft.associatedBranch ?? null, draft.associatedCommitSha ?? null, draft.associatedPullRequest ?? null, draft.associatedReleaseTag ?? null, draft.associatedWorkflowRun ?? null]);
    for (const dependency of draft.taskDependencies ?? []) this.ready().run("INSERT INTO task_dependencies (task_id, depends_on_task_id) VALUES (?, ?)", [taskId, dependency]);
    for (let index = 0; index < draft.steps.length; index += 1) {
      const step = draft.steps[index];
      const stepId = stepIds[index];
      const retryPolicy = { maxAttempts: Math.max(1, step.retryPolicy?.maxAttempts ?? 1), backoffMs: Math.max(0, step.retryPolicy?.backoffMs ?? 0), retryableErrorCodes: step.retryPolicy?.retryableErrorCodes ?? [] };
      this.ready().run(`INSERT INTO task_steps (id, task_id, position, name, purpose, status, risk_tier, required_tool, expected_input, expected_output, attempts, retry_policy, timeout_ms, approval_state, artifact_paths, verification_criteria, rollback_instructions, audit_references)
        VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, '[]')`, [stepId, taskId, index, step.name.trim(), step.purpose.trim(), step.riskTier, step.requiredTool ?? null, JSON.stringify(sanitizeTaskData(step.expectedInput ?? null)), JSON.stringify(sanitizeTaskData(step.expectedOutput ?? null)), JSON.stringify(retryPolicy), Math.max(100, step.timeoutMs ?? 12e4), step.riskTier === 0 ? "not-required" : "required", JSON.stringify(step.artifactPaths ?? []), JSON.stringify(step.verificationCriteria), step.rollbackInstructions ?? null]);
      for (const dependency of step.dependencies ?? []) this.ready().run("INSERT INTO task_step_dependencies (task_id, step_id, depends_on_step_id) VALUES (?, ?, ?)", [taskId, stepId, dependency]);
    }
    this.appendTaskEventRow(taskId, void 0, "task.created", "Workspace-owned task created in draft state.", { taskType: draft.taskType });
    await this.persist();
    return this.getPersistentTask(taskId);
  }
  async listPersistentTasks(limit = 100) {
    const projectId = await this.projectId();
    return this.all("SELECT * FROM tasks WHERE project_id = ? ORDER BY updated_at DESC, created_at DESC LIMIT ?", [projectId, Math.min(Math.max(limit, 1), 500)]).map((row) => this.taskFromRow(row));
  }
  async getPersistentTask(taskId) {
    const row = await this.assertTask(taskId);
    return this.taskFromRow(row);
  }
  async setPersistentTaskState(taskId, status, options) {
    if (!TASK_STATUSES.has(status)) throw new Error("Task status is invalid.");
    const row = await this.assertTask(taskId);
    const now = Date.now();
    if (options.lastActiveConversationId) await this.assertConversation(options.lastActiveConversationId);
    const startedAt = status === "running" && row.started_at === null ? now : row.started_at;
    const completedAt = status === "completed" ? now : null;
    this.ready().run(`UPDATE tasks SET status = ?, current_step_id = ?, updated_at = ?, started_at = ?, completed_at = ?, last_active_conversation_id = COALESCE(?, last_active_conversation_id), progress_summary = ?, interruption_reason = ?, resumability_state = COALESCE(?, resumability_state) WHERE id = ? AND project_id = ?`, [status, options.currentStepId === void 0 ? row.current_step_id : options.currentStepId, now, startedAt, completedAt, options.lastActiveConversationId ?? null, options.summary, options.interruptionReason ?? null, options.resumabilityState ?? null, taskId, await this.projectId()]);
    this.appendTaskEventRow(taskId, options.currentStepId ?? void 0, options.eventType, options.summary, options.details, options.auditReference);
    await this.persist();
    return this.getPersistentTask(taskId);
  }
  async setTaskStepState(taskId, stepId, status, options) {
    if (!STEP_STATUSES.has(status)) throw new Error("Task step status is invalid.");
    const row = await this.assertTaskStep(taskId, stepId);
    const now = Date.now();
    const startedAt = status === "pending" ? null : now;
    const completedAt = ["completed", "skipped"].includes(status) ? now : null;
    const externalProcessId = options.externalProcessId === void 0 ? row.external_process_id : options.externalProcessId;
    const outputPath = options.outputPath === void 0 ? row.output_path : options.outputPath;
    this.ready().run(`UPDATE task_steps SET status = ?, started_at = COALESCE(started_at, ?), completed_at = ?, attempts = attempts + ?, last_error = ?, external_process_id = ?, output_path = ?, approval_state = COALESCE(?, approval_state) WHERE id = ? AND task_id = ?`, [status, startedAt, completedAt, options.incrementAttempts ? 1 : 0, options.error ? JSON.stringify(sanitizeTaskData(options.error)) : null, externalProcessId, outputPath, options.approvalState ?? null, stepId, taskId]);
    this.ready().run("UPDATE tasks SET current_step_id = ?, updated_at = ?, progress_summary = ? WHERE id = ?", [stepId, now, options.summary, taskId]);
    const eventType = options.eventType ?? (status === "completed" ? "step.completed" : status === "failed" ? "step.failed" : status === "waiting" ? "step.waiting" : status === "running" ? "step.started" : "state.reconciled");
    this.appendTaskEventRow(taskId, stepId, eventType, options.summary, options.error, options.auditReference);
    await this.persist();
    return this.getPersistentTask(taskId);
  }
  async appendTaskCheckpoint(taskId, checkpoint) {
    await this.assertTask(taskId);
    if (checkpoint.stepId) await this.assertTaskStep(taskId, checkpoint.stepId);
    const projectId = await this.projectId();
    for (const reference of checkpoint.auditReferences ?? []) if (!this.one("SELECT id FROM action_log WHERE id = ? AND project_id = ?", [reference, projectId])) throw new Error("Task checkpoint audit reference does not exist in the active workspace.");
    const value = { id: id(), taskId, stepId: checkpoint.stepId, name: checkpoint.name, summary: checkpoint.summary, verified: checkpoint.verified, evidence: sanitizeTaskData(checkpoint.evidence ?? null), auditReferences: checkpoint.auditReferences ?? [], createdAt: Date.now() };
    this.ready().run("INSERT INTO task_checkpoints VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [value.id, projectId, taskId, value.stepId ?? null, value.name, value.summary, value.verified ? 1 : 0, JSON.stringify(value.evidence), JSON.stringify(value.auditReferences), value.createdAt]);
    await this.persist();
    return value;
  }
  async recordTaskApproval(taskId, stepId, approval) {
    await this.assertTaskStep(taskId, stepId);
    const projectId = await this.projectId();
    const now = Date.now();
    const value = { id: id(), taskId, stepId, toolRequestId: approval.toolRequestId, decision: approval.decision, scope: approval.scope, requestedAt: now, decidedAt: approval.decidedAt, expiresAt: approval.expiresAt, auditReference: approval.auditReference };
    this.ready().run("INSERT INTO task_approvals VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [value.id, projectId, taskId, stepId, value.toolRequestId ?? null, value.decision, value.scope, value.requestedAt, value.decidedAt ?? null, value.expiresAt ?? null, value.auditReference ?? null]);
    const approvalState = approval.decision === "run-once" || approval.decision === "session" ? "approved" : approval.decision;
    this.ready().run("UPDATE task_steps SET approval_state = ? WHERE id = ? AND task_id = ?", [approvalState, stepId, taskId]);
    await this.persist();
    return value;
  }
  async appendTaskEvent(taskId, event) {
    await this.assertTask(taskId);
    if (event.stepId) await this.assertTaskStep(taskId, event.stepId);
    const eventId = id();
    const createdAt = Date.now();
    const projectId = await this.projectId();
    this.ready().run("INSERT INTO task_events VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [eventId, projectId, taskId, event.stepId ?? null, event.type, event.summary, event.details === void 0 ? null : JSON.stringify(sanitizeTaskData(event.details)), event.auditReference ?? null, createdAt]);
    await this.persist();
    return { id: eventId, taskId, stepId: event.stepId, type: event.type, summary: event.summary, details: sanitizeTaskData(event.details), auditReference: event.auditReference, createdAt };
  }
  async updateTaskReality(taskId, reality) {
    await this.assertTask(taskId);
    const projectId = await this.projectId();
    this.ready().run(`UPDATE tasks SET associated_branch = COALESCE(?, associated_branch), associated_commit_sha = COALESCE(?, associated_commit_sha), process_ids = COALESCE(?, process_ids), external_resource_ids = COALESCE(?, external_resource_ids), updated_at = ? WHERE id = ? AND project_id = ?`, [reality.associatedBranch ?? null, reality.associatedCommitSha ?? null, reality.processIds ? JSON.stringify(reality.processIds) : null, reality.externalResourceIds ? JSON.stringify(reality.externalResourceIds) : null, Date.now(), taskId, projectId]);
    await this.persist();
  }
  async linkTaskStepAudit(taskId, stepId, auditReference) {
    const row = await this.assertTaskStep(taskId, stepId);
    const projectId = await this.projectId();
    if (!this.one("SELECT id FROM action_log WHERE id = ? AND project_id = ?", [auditReference, projectId])) throw new Error("Task step audit reference does not exist in the active workspace.");
    const references = parseJson(row.audit_references, []);
    if (!references.includes(auditReference)) references.push(auditReference);
    this.ready().run("UPDATE task_steps SET audit_references = ? WHERE id = ? AND task_id = ?", [JSON.stringify(references), stepId, taskId]);
    await this.persist();
  }
  async appendTaskArtifact(taskId, artifact) {
    await this.assertTask(taskId);
    if (artifact.stepId) await this.assertTaskStep(taskId, artifact.stepId);
    const value = { ...artifact, id: id(), taskId, metadata: sanitizeTaskData(artifact.metadata), createdAt: Date.now() };
    this.ready().run("INSERT INTO task_artifacts VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [value.id, await this.projectId(), taskId, value.stepId ?? null, value.kind, value.path ?? null, value.uri ?? null, value.sha256 ?? null, value.size ?? null, value.verifiedAt ?? null, value.metadata === void 0 ? null : JSON.stringify(value.metadata), value.createdAt]);
    await this.persist();
    return value;
  }
  async upsertTaskExternalReference(taskId, reference) {
    await this.assertTask(taskId);
    if (reference.stepId) await this.assertTaskStep(taskId, reference.stepId);
    const projectId = await this.projectId();
    const existing = this.one("SELECT id, created_at FROM task_external_references WHERE task_id = ? AND type = ? AND external_id = ?", [taskId, reference.type, reference.externalId]);
    const now = Date.now();
    const value = { ...reference, id: existing ? String(existing.id) : id(), taskId, metadata: sanitizeTaskData(reference.metadata), createdAt: existing ? Number(existing.created_at) : now, updatedAt: now };
    this.ready().run(`INSERT INTO task_external_references (id, project_id, task_id, step_id, type, provider, external_id, url, state, metadata, verified_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(task_id, type, external_id) DO UPDATE SET step_id = excluded.step_id, provider = excluded.provider, url = excluded.url, state = excluded.state, metadata = excluded.metadata, verified_at = excluded.verified_at, updated_at = excluded.updated_at`, [value.id, projectId, taskId, value.stepId ?? null, value.type, value.provider ?? null, value.externalId, value.url ?? null, value.state ?? null, value.metadata === void 0 ? null : JSON.stringify(value.metadata), value.verifiedAt ?? null, value.createdAt, value.updatedAt]);
    await this.persist();
    return value;
  }
  async deleteConversation(conversationId) {
    const validId = await this.assertConversation(conversationId);
    const projectId = await this.projectId();
    this.ready().run("DELETE FROM conversations WHERE thread_id = ? AND project_id = ?", [validId, projectId]);
    this.ready().run("DELETE FROM conversation_threads WHERE id = ? AND project_id = ?", [validId, projectId]);
    this.ready().run("UPDATE workspace_state SET active_conversation_id = NULL, updated_at = ? WHERE project_id = ? AND active_conversation_id = ?", [Date.now(), projectId, validId]);
    await this.persist();
  }
  async conversationState(conversationId) {
    const activeConversationId = conversationId ? await this.assertConversation(conversationId) : await this.ensureActiveConversation();
    return {
      activeConversationId,
      threads: await this.listConversationThreads(),
      messages: await this.listConversationMessages(activeConversationId)
    };
  }
  async createConversation(title) {
    const projectId = await this.projectId();
    const conversationId = id();
    const now = Date.now();
    this.ready().run("INSERT INTO conversation_threads VALUES (?, ?, ?, ?, ?)", [conversationId, projectId, normalizeTitle(title), now, now]);
    this.setWorkspaceState(projectId, conversationId);
    await this.persist();
    return this.conversationState(conversationId);
  }
  async selectConversation(conversationId) {
    const validId = await this.assertConversation(conversationId);
    this.setWorkspaceState(await this.projectId(), validId);
    await this.persist();
    return this.conversationState(validId);
  }
  async renameConversation(conversationId, title) {
    const validId = await this.assertConversation(conversationId);
    const normalized = normalizeTitle(title);
    if (normalized === "New conversation" && !title.trim()) throw new Error("Conversation title is required.");
    this.ready().run("UPDATE conversation_threads SET title = ?, updated_at = ? WHERE id = ?", [normalized, Date.now(), validId]);
    await this.persist();
    return this.conversationState(validId);
  }
  async clearConversation(conversationId) {
    const validId = await this.assertConversation(conversationId);
    this.ready().run("DELETE FROM conversations WHERE thread_id = ?", [validId]);
    this.ready().run("UPDATE conversation_threads SET updated_at = ? WHERE id = ?", [Date.now(), validId]);
    await this.persist();
    return this.conversationState(validId);
  }
  async appendConversation(conversationId, role, content) {
    const validId = await this.assertConversation(conversationId);
    if (role !== "user" && role !== "assistant") throw new Error("Conversation role is invalid.");
    if (!content.trim()) throw new Error("Conversation content is required.");
    const projectId = await this.projectId();
    const now = Date.now();
    const entry = { id: id(), conversationId: validId, role, content, createdAt: now };
    this.ready().run("INSERT INTO conversations (id, project_id, thread_id, role, content, created_at) VALUES (?, ?, ?, ?, ?, ?)", [entry.id, projectId, validId, role, content, now]);
    const thread = this.one("SELECT title FROM conversation_threads WHERE id = ?", [validId]);
    const messageCount = Number(this.one("SELECT COUNT(*) AS count FROM conversations WHERE thread_id = ?", [validId])?.count ?? 0);
    const nextTitle = role === "user" && messageCount === 1 && String(thread?.title ?? "") === "New conversation" ? titleFromPrompt(content) : String(thread?.title ?? "New conversation");
    this.ready().run("UPDATE conversation_threads SET title = ?, updated_at = ? WHERE id = ?", [nextTitle, now, validId]);
    await this.persist();
    return entry;
  }
  async listConversationMessages(conversationId, limit = 200) {
    const validId = await this.assertConversation(conversationId);
    return this.all(`SELECT id, thread_id, role, content, created_at FROM (
      SELECT id, thread_id, role, content, created_at FROM conversations
      WHERE thread_id = ? ORDER BY created_at DESC, id DESC LIMIT ?
    ) ORDER BY created_at ASC, id ASC`, [validId, limit]).map((row) => ({
      id: String(row.id),
      conversationId: String(row.thread_id),
      role: String(row.role),
      content: String(row.content),
      createdAt: Number(row.created_at)
    }));
  }
  async listConversationThreads() {
    const projectId = await this.projectId();
    return this.all(`SELECT t.id, t.title, t.created_at, t.updated_at, COUNT(m.id) AS message_count
      FROM conversation_threads t LEFT JOIN conversations m ON m.thread_id = t.id
      WHERE t.project_id = ? GROUP BY t.id ORDER BY t.updated_at DESC, t.created_at DESC`, [projectId]).map((row) => ({
      id: String(row.id),
      title: String(row.title),
      createdAt: Number(row.created_at),
      updatedAt: Number(row.updated_at),
      messageCount: Number(row.message_count)
    }));
  }
  async getWorkspaceLayout() {
    const projectId = await this.projectId();
    const raw = this.one("SELECT layout_json FROM workspace_state WHERE project_id = ?", [projectId])?.layout_json;
    if (!raw) return { ...DEFAULT_WORKSPACE_LAYOUT };
    try {
      return normalizeWorkspaceLayout(JSON.parse(String(raw)));
    } catch {
      return { ...DEFAULT_WORKSPACE_LAYOUT };
    }
  }
  async saveWorkspaceLayout(layout) {
    const projectId = await this.projectId();
    const normalized = normalizeWorkspaceLayout(layout);
    this.ready().run(
      `INSERT INTO workspace_state (project_id, active_conversation_id, layout_json, updated_at)
      VALUES (?, NULL, ?, ?) ON CONFLICT(project_id) DO UPDATE SET layout_json = excluded.layout_json, updated_at = excluded.updated_at`,
      [projectId, JSON.stringify(normalized), Date.now()]
    );
    await this.persist();
    return normalized;
  }
  async createMemory(type, title, content, metadata) {
    const projectId = await this.projectId();
    const now = Date.now();
    const memoryId = id();
    this.ready().run("INSERT INTO memories VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [memoryId, projectId, type, title ?? null, content, metadata ? JSON.stringify(metadata) : null, now, now]);
    await this.persist();
    return { id: memoryId, type, title, content, metadata, createdAt: now, updatedAt: now };
  }
  async listMemories(limit = 100) {
    const projectId = await this.projectId();
    return this.all("SELECT id, type, title, content, metadata, created_at, updated_at FROM memories WHERE project_id = ? ORDER BY created_at DESC LIMIT ?", [projectId, limit]).map((row) => ({
      id: String(row.id),
      type: String(row.type),
      title: row.title ? String(row.title) : null,
      content: String(row.content),
      metadata: row.metadata ? JSON.parse(String(row.metadata)) : void 0,
      createdAt: Number(row.created_at),
      updatedAt: Number(row.updated_at)
    }));
  }
  async updateMemory(memoryId, fields) {
    const projectId = await this.projectId();
    const set = [];
    const params = [];
    if (fields.type !== void 0) {
      set.push("type = ?");
      params.push(fields.type);
    }
    if (fields.title !== void 0) {
      set.push("title = ?");
      params.push(fields.title);
    }
    if (fields.content !== void 0) {
      set.push("content = ?");
      params.push(fields.content);
    }
    if (fields.metadata !== void 0) {
      set.push("metadata = ?");
      params.push(fields.metadata ? JSON.stringify(fields.metadata) : null);
    }
    if (!set.length) return;
    params.push(Date.now(), memoryId, projectId);
    this.ready().run(`UPDATE memories SET ${set.join(", ")}, updated_at = ? WHERE id = ? AND project_id = ?`, params);
    await this.persist();
  }
  async deleteMemory(memoryId) {
    this.ready().run("DELETE FROM memories WHERE id = ? AND project_id = ?", [memoryId, await this.projectId()]);
    await this.persist();
  }
  async workspaceId() {
    return this.projectId();
  }
  /** Durable, bounded project observations used to invalidate stale context. */
  async recordProjectObservation(kind, payload) {
    if (!/^[a-z]+(?:[.-][a-z]+)+$/.test(kind)) throw new Error("Project observation kind is invalid.");
    const workspaceId = await this.projectId();
    const timestamp = Date.now();
    const observation = { id: id(), workspaceId, kind, timestamp, payload: sanitizeTaskData(payload) };
    this.ready().run("BEGIN");
    try {
      this.ready().run("INSERT INTO project_observations (id, project_id, kind, timestamp, payload) VALUES (?, ?, ?, ?, ?)", [observation.id, workspaceId, kind, timestamp, JSON.stringify(observation.payload)]);
      this.ready().run(`INSERT INTO project_context_state (project_id, invalidated_at, invalidation_reasons, updated_at) VALUES (?, ?, ?, ?)
        ON CONFLICT(project_id) DO UPDATE SET invalidated_at = excluded.invalidated_at, invalidation_reasons = excluded.invalidation_reasons, updated_at = excluded.updated_at`, [workspaceId, timestamp, JSON.stringify([kind]), timestamp]);
      this.ready().run("UPDATE projects SET updated_at = ? WHERE id = ?", [timestamp, workspaceId]);
      this.ready().run("COMMIT");
    } catch (error) {
      this.ready().run("ROLLBACK");
      throw error;
    }
    await this.persist();
    return observation;
  }
  async listProjectObservations(limit = 40) {
    const workspaceId = await this.projectId();
    return this.all("SELECT * FROM project_observations WHERE project_id = ? ORDER BY timestamp DESC LIMIT ?", [workspaceId, Math.min(Math.max(limit, 1), 200)]).map((row) => ({ id: String(row.id), workspaceId: String(row.project_id), kind: String(row.kind), timestamp: Number(row.timestamp), payload: parseJson(row.payload, null) }));
  }
  async appendAction(record) {
    const projectId = await this.projectId();
    if (record.workspaceId !== projectId) throw new Error("Audit record belongs to another workspace.");
    this.ready().run(`INSERT INTO action_log (id, project_id, timestamp, conversation_id, model_id, tool_name, sanitized_inputs, approval_decision, execution_duration_ms, success, result_json, result_summary, affected_paths, exit_code, rollback)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [record.id, projectId, record.timestamp, record.conversationId, record.modelId, record.toolName, JSON.stringify(record.sanitizedInputs ?? null), record.approvalDecision, record.executionDurationMs, record.success ? 1 : 0, JSON.stringify(record.result ?? null), record.resultSummary, JSON.stringify(record.affectedPaths), record.exitCode ?? null, record.rollback ? JSON.stringify(record.rollback) : null]);
    await this.persist();
  }
  async listActions(filters = {}) {
    const clauses = ["project_id = ?"];
    const params = [await this.projectId()];
    if (filters.conversationId) {
      clauses.push("conversation_id = ?");
      params.push(filters.conversationId);
    }
    if (filters.toolName) {
      clauses.push("tool_name = ?");
      params.push(filters.toolName);
    }
    if (filters.success !== void 0) {
      clauses.push("success = ?");
      params.push(filters.success ? 1 : 0);
    }
    if (filters.from !== void 0) {
      clauses.push("timestamp >= ?");
      params.push(filters.from);
    }
    if (filters.to !== void 0) {
      clauses.push("timestamp <= ?");
      params.push(filters.to);
    }
    params.push(500);
    return this.all(`SELECT * FROM action_log WHERE ${clauses.join(" AND ")} ORDER BY timestamp DESC LIMIT ?`, params).map((row) => ({
      id: String(row.id),
      timestamp: Number(row.timestamp),
      workspaceId: String(row.project_id),
      conversationId: String(row.conversation_id),
      modelId: String(row.model_id),
      toolName: String(row.tool_name),
      sanitizedInputs: row.sanitized_inputs ? JSON.parse(String(row.sanitized_inputs)) : null,
      approvalDecision: String(row.approval_decision),
      executionDurationMs: Number(row.execution_duration_ms),
      success: Boolean(row.success),
      result: row.result_json ? JSON.parse(String(row.result_json)) : { success: Boolean(row.success) },
      resultSummary: String(row.result_summary),
      affectedPaths: row.affected_paths ? JSON.parse(String(row.affected_paths)) : [],
      exitCode: row.exit_code === null ? null : Number(row.exit_code),
      rollback: row.rollback ? JSON.parse(String(row.rollback)) : void 0
    }));
  }
  createSchema() {
    this.ready().run(`
      CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, name TEXT NOT NULL, root_path TEXT NOT NULL UNIQUE, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS goals (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, title TEXT NOT NULL, description TEXT, status TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, FOREIGN KEY(project_id) REFERENCES projects(id));
      CREATE TABLE IF NOT EXISTS tasks (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, title TEXT NOT NULL, description TEXT, status TEXT NOT NULL, priority TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, FOREIGN KEY(project_id) REFERENCES projects(id));
      CREATE TABLE IF NOT EXISTS conversation_threads (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, title TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, FOREIGN KEY(project_id) REFERENCES projects(id));
      CREATE TABLE IF NOT EXISTS conversations (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, thread_id TEXT, role TEXT NOT NULL, content TEXT NOT NULL, created_at INTEGER NOT NULL, FOREIGN KEY(project_id) REFERENCES projects(id));
      CREATE TABLE IF NOT EXISTS memories (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, type TEXT NOT NULL, title TEXT, content TEXT NOT NULL, metadata TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, FOREIGN KEY(project_id) REFERENCES projects(id));
      CREATE TABLE IF NOT EXISTS workspace_state (project_id TEXT PRIMARY KEY, active_conversation_id TEXT, layout_json TEXT, updated_at INTEGER NOT NULL, FOREIGN KEY(project_id) REFERENCES projects(id));
      CREATE TABLE IF NOT EXISTS project_observations (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, kind TEXT NOT NULL, timestamp INTEGER NOT NULL, payload TEXT NOT NULL, FOREIGN KEY(project_id) REFERENCES projects(id));
      CREATE TABLE IF NOT EXISTS project_context_state (project_id TEXT PRIMARY KEY, invalidated_at INTEGER, invalidation_reasons TEXT NOT NULL DEFAULT '[]', updated_at INTEGER NOT NULL, FOREIGN KEY(project_id) REFERENCES projects(id));
      CREATE TABLE IF NOT EXISTS action_log (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, timestamp INTEGER NOT NULL, conversation_id TEXT NOT NULL, model_id TEXT NOT NULL, tool_name TEXT NOT NULL, sanitized_inputs TEXT NOT NULL, approval_decision TEXT NOT NULL, execution_duration_ms INTEGER NOT NULL, success INTEGER NOT NULL, result_json TEXT NOT NULL DEFAULT '{}', result_summary TEXT NOT NULL, affected_paths TEXT NOT NULL, exit_code INTEGER, rollback TEXT, FOREIGN KEY(project_id) REFERENCES projects(id));
    `);
    const columns = this.all("PRAGMA table_info(conversations)").map((row) => String(row.name));
    if (!columns.includes("thread_id")) this.ready().run("ALTER TABLE conversations ADD COLUMN thread_id TEXT");
    const actionColumns = this.all("PRAGMA table_info(action_log)").map((row) => String(row.name));
    if (actionColumns.includes("risk_tier")) this.ready().run(`
      DROP INDEX IF EXISTS idx_action_log_project_timestamp;
      DROP INDEX IF EXISTS idx_action_log_conversation;
      ALTER TABLE action_log RENAME TO action_log_legacy;
      CREATE TABLE action_log (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, timestamp INTEGER NOT NULL, conversation_id TEXT NOT NULL, model_id TEXT NOT NULL, tool_name TEXT NOT NULL, sanitized_inputs TEXT NOT NULL, approval_decision TEXT NOT NULL, execution_duration_ms INTEGER NOT NULL, success INTEGER NOT NULL, result_json TEXT NOT NULL DEFAULT '{}', result_summary TEXT NOT NULL, affected_paths TEXT NOT NULL, exit_code INTEGER, rollback TEXT, FOREIGN KEY(project_id) REFERENCES projects(id));
      INSERT INTO action_log (id, project_id, timestamp, conversation_id, model_id, tool_name, sanitized_inputs, approval_decision, execution_duration_ms, success, result_json, result_summary, affected_paths, exit_code, rollback)
        SELECT id, project_id, timestamp, conversation_id, model_id, tool_name, sanitized_inputs, approval_decision, execution_duration_ms, success, COALESCE(result_json, '{}'), result_summary, affected_paths, exit_code, rollback FROM action_log_legacy;
      DROP TABLE action_log_legacy;
    `);
    if (!actionColumns.includes("result_json")) this.ready().run("ALTER TABLE action_log ADD COLUMN result_json TEXT NOT NULL DEFAULT '{}'");
    const taskColumns = new Set(this.all("PRAGMA table_info(tasks)").map((row) => String(row.name)));
    const addTaskColumn = (name, definition2) => {
      if (!taskColumns.has(name)) this.ready().run(`ALTER TABLE tasks ADD COLUMN ${name} ${definition2}`);
    };
    addTaskColumn("task_type", "TEXT NOT NULL DEFAULT 'general'");
    addTaskColumn("current_step_id", "TEXT");
    addTaskColumn("started_at", "INTEGER");
    addTaskColumn("completed_at", "INTEGER");
    addTaskColumn("originating_conversation_id", "TEXT");
    addTaskColumn("last_active_conversation_id", "TEXT");
    addTaskColumn("assigned_provider", "TEXT");
    addTaskColumn("assigned_model", "TEXT");
    addTaskColumn("progress_summary", "TEXT NOT NULL DEFAULT 'Legacy workspace task imported.'");
    addTaskColumn("retry_metadata", "TEXT");
    addTaskColumn("interruption_reason", "TEXT");
    addTaskColumn("resumability_state", "TEXT NOT NULL DEFAULT 'resumable'");
    addTaskColumn("resume_instructions", "TEXT NOT NULL DEFAULT 'Inspect current workspace state before continuing.'");
    addTaskColumn("associated_branch", "TEXT");
    addTaskColumn("associated_commit_sha", "TEXT");
    addTaskColumn("associated_pull_request", "TEXT");
    addTaskColumn("associated_release_tag", "TEXT");
    addTaskColumn("associated_workflow_run", "TEXT");
    addTaskColumn("process_ids", "TEXT NOT NULL DEFAULT '[]'");
    addTaskColumn("external_resource_ids", "TEXT NOT NULL DEFAULT '[]'");
    this.ready().run(`
      CREATE TABLE IF NOT EXISTS task_dependencies (task_id TEXT NOT NULL, depends_on_task_id TEXT NOT NULL, PRIMARY KEY(task_id, depends_on_task_id), FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE, FOREIGN KEY(depends_on_task_id) REFERENCES tasks(id));
      CREATE TABLE IF NOT EXISTS task_steps (id TEXT PRIMARY KEY, task_id TEXT NOT NULL, position INTEGER NOT NULL, name TEXT NOT NULL, purpose TEXT NOT NULL, status TEXT NOT NULL, risk_tier INTEGER NOT NULL, required_tool TEXT, expected_input TEXT, expected_output TEXT, started_at INTEGER, completed_at INTEGER, attempts INTEGER NOT NULL DEFAULT 0, last_error TEXT, retry_policy TEXT NOT NULL DEFAULT '{}', timeout_ms INTEGER NOT NULL, approval_state TEXT NOT NULL, external_process_id INTEGER, output_path TEXT, artifact_paths TEXT NOT NULL DEFAULT '[]', verification_criteria TEXT NOT NULL DEFAULT '[]', rollback_instructions TEXT, audit_references TEXT NOT NULL DEFAULT '[]', UNIQUE(task_id, position), FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE);
      CREATE TABLE IF NOT EXISTS task_step_dependencies (task_id TEXT NOT NULL, step_id TEXT NOT NULL, depends_on_step_id TEXT NOT NULL, PRIMARY KEY(task_id, step_id, depends_on_step_id), FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE, FOREIGN KEY(step_id) REFERENCES task_steps(id) ON DELETE CASCADE, FOREIGN KEY(depends_on_step_id) REFERENCES task_steps(id));
      CREATE TABLE IF NOT EXISTS task_checkpoints (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, task_id TEXT NOT NULL, step_id TEXT, name TEXT NOT NULL, summary TEXT NOT NULL, verified INTEGER NOT NULL, evidence TEXT NOT NULL, audit_references TEXT NOT NULL DEFAULT '[]', created_at INTEGER NOT NULL, FOREIGN KEY(project_id) REFERENCES projects(id), FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE, FOREIGN KEY(step_id) REFERENCES task_steps(id) ON DELETE SET NULL);
      CREATE TABLE IF NOT EXISTS task_artifacts (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, task_id TEXT NOT NULL, step_id TEXT, kind TEXT NOT NULL, path TEXT, uri TEXT, sha256 TEXT, size INTEGER, verified_at INTEGER, metadata TEXT, created_at INTEGER NOT NULL, FOREIGN KEY(project_id) REFERENCES projects(id), FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE, FOREIGN KEY(step_id) REFERENCES task_steps(id) ON DELETE SET NULL);
      CREATE TABLE IF NOT EXISTS task_external_references (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, task_id TEXT NOT NULL, step_id TEXT, type TEXT NOT NULL, provider TEXT, external_id TEXT NOT NULL, url TEXT, state TEXT, metadata TEXT, verified_at INTEGER, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, UNIQUE(task_id, type, external_id), FOREIGN KEY(project_id) REFERENCES projects(id), FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE, FOREIGN KEY(step_id) REFERENCES task_steps(id) ON DELETE SET NULL);
      CREATE TABLE IF NOT EXISTS task_approvals (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, task_id TEXT NOT NULL, step_id TEXT NOT NULL, tool_request_id TEXT, decision TEXT NOT NULL, scope TEXT NOT NULL, requested_at INTEGER NOT NULL, decided_at INTEGER, expires_at INTEGER, audit_reference TEXT, FOREIGN KEY(project_id) REFERENCES projects(id), FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE, FOREIGN KEY(step_id) REFERENCES task_steps(id) ON DELETE CASCADE);
      CREATE TABLE IF NOT EXISTS task_events (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, task_id TEXT NOT NULL, step_id TEXT, type TEXT NOT NULL, summary TEXT NOT NULL, details TEXT, audit_reference TEXT, created_at INTEGER NOT NULL, FOREIGN KEY(project_id) REFERENCES projects(id), FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE, FOREIGN KEY(step_id) REFERENCES task_steps(id) ON DELETE SET NULL);
    `);
    this.ready().run("UPDATE tasks SET status = CASE status WHEN 'todo' THEN 'draft' WHEN 'in-progress' THEN 'running' WHEN 'done' THEN 'completed' ELSE status END");
    this.ready().run("UPDATE tasks SET completed_at = COALESCE(completed_at, updated_at), resumability_state = 'complete' WHERE status = 'completed'");
    this.ready().run(`
      CREATE INDEX IF NOT EXISTS idx_conversations_thread_created ON conversations(thread_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_conversation_threads_project_updated ON conversation_threads(project_id, updated_at);
      CREATE INDEX IF NOT EXISTS idx_action_log_project_timestamp ON action_log(project_id, timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_project_observations_project_timestamp ON project_observations(project_id, timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_action_log_conversation ON action_log(project_id, conversation_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_project_updated ON tasks(project_id, updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_task_steps_task_position ON task_steps(task_id, position);
      CREATE INDEX IF NOT EXISTS idx_task_checkpoints_task_created ON task_checkpoints(task_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_task_events_task_created ON task_events(task_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_task_external_project_type ON task_external_references(project_id, type, external_id);
      CREATE INDEX IF NOT EXISTS idx_task_approvals_step ON task_approvals(task_id, step_id, requested_at DESC);
    `);
  }
  async ensureProject() {
    if (!this.rootPath) throw new Error("Storage is not initialized.");
    if (this.one("SELECT id FROM projects WHERE root_path = ?", [this.rootPath])) return;
    const now = Date.now();
    this.ready().run("INSERT INTO projects VALUES (?, ?, ?, ?, ?)", [id(), path.basename(this.rootPath), this.rootPath, now, now]);
  }
  async migrateLegacyConversations() {
    const projectId = await this.projectId();
    const legacy = this.one("SELECT COUNT(*) AS count, MIN(created_at) AS first_at, MAX(created_at) AS last_at FROM conversations WHERE project_id = ? AND thread_id IS NULL", [projectId]);
    if (Number(legacy?.count ?? 0) === 0) return;
    const conversationId = id();
    const createdAt = Number(legacy?.first_at ?? Date.now());
    const updatedAt = Number(legacy?.last_at ?? createdAt);
    this.ready().run("INSERT INTO conversation_threads VALUES (?, ?, ?, ?, ?)", [conversationId, projectId, "Imported conversation", createdAt, updatedAt]);
    this.ready().run("UPDATE conversations SET thread_id = ? WHERE project_id = ? AND thread_id IS NULL", [conversationId, projectId]);
    this.setWorkspaceState(projectId, conversationId);
  }
  async ensureActiveConversation() {
    const projectId = await this.projectId();
    const active = this.one(`SELECT s.active_conversation_id AS id FROM workspace_state s
      JOIN conversation_threads t ON t.id = s.active_conversation_id
      WHERE s.project_id = ? AND t.project_id = ?`, [projectId, projectId]);
    if (active?.id) return String(active.id);
    const latest = this.one("SELECT id FROM conversation_threads WHERE project_id = ? ORDER BY updated_at DESC LIMIT 1", [projectId]);
    if (latest?.id) {
      const conversationId = String(latest.id);
      this.setWorkspaceState(projectId, conversationId);
      await this.persist();
      return conversationId;
    }
    const state = await this.createConversation();
    return state.activeConversationId;
  }
  setWorkspaceState(projectId, conversationId) {
    this.ready().run(
      `INSERT INTO workspace_state (project_id, active_conversation_id, layout_json, updated_at)
      VALUES (?, ?, NULL, ?) ON CONFLICT(project_id) DO UPDATE SET active_conversation_id = excluded.active_conversation_id, updated_at = excluded.updated_at`,
      [projectId, conversationId, Date.now()]
    );
  }
  async assertConversation(conversationId) {
    if (!conversationId?.trim()) throw new Error("Conversation id is required.");
    const projectId = await this.projectId();
    if (!this.one("SELECT id FROM conversation_threads WHERE id = ? AND project_id = ?", [conversationId, projectId])) {
      throw new Error("The conversation does not belong to the active workspace.");
    }
    return conversationId;
  }
  async assertTask(taskId) {
    if (!taskId?.trim()) throw new Error("Task id is required.");
    const row = this.one("SELECT * FROM tasks WHERE id = ? AND project_id = ?", [taskId, await this.projectId()]);
    if (!row) throw new Error("The task does not belong to the active workspace.");
    return row;
  }
  async assertTaskStep(taskId, stepId) {
    await this.assertTask(taskId);
    const row = this.one("SELECT * FROM task_steps WHERE id = ? AND task_id = ?", [stepId, taskId]);
    if (!row) throw new Error("The task step does not belong to the task.");
    return row;
  }
  assertAcyclicSteps(stepIds, dependencies) {
    const graph = new Map(stepIds.map((stepId, index) => [stepId, dependencies[index]]));
    const visiting = /* @__PURE__ */ new Set();
    const visited = /* @__PURE__ */ new Set();
    const visit = (stepId) => {
      if (visiting.has(stepId)) throw new Error("Task step dependencies contain a cycle.");
      if (visited.has(stepId)) return;
      visiting.add(stepId);
      for (const dependency of graph.get(stepId) ?? []) visit(dependency);
      visiting.delete(stepId);
      visited.add(stepId);
    };
    for (const stepId of stepIds) visit(stepId);
  }
  async projectId() {
    const project = await this.dashboard();
    if (!project) throw new Error("No project metadata exists.");
    return project.id;
  }
  goals(projectId) {
    return this.all("SELECT * FROM goals WHERE project_id = ? ORDER BY created_at DESC", [projectId]).map((row) => ({
      id: String(row.id),
      title: String(row.title),
      description: row.description ? String(row.description) : void 0,
      status: String(row.status),
      createdAt: Number(row.created_at),
      updatedAt: Number(row.updated_at)
    }));
  }
  tasks(projectId) {
    return this.all("SELECT * FROM tasks WHERE project_id = ? ORDER BY created_at DESC", [projectId]).map((row) => this.taskFromRow(row));
  }
  taskFromRow(row) {
    const taskId = String(row.id);
    const projectId = String(row.project_id);
    const dependencies = this.all("SELECT depends_on_task_id FROM task_dependencies WHERE task_id = ? ORDER BY depends_on_task_id", [taskId]).map((entry) => String(entry.depends_on_task_id));
    const stepDependencies = this.all("SELECT step_id, depends_on_step_id FROM task_step_dependencies WHERE task_id = ?", [taskId]);
    const steps = this.all("SELECT * FROM task_steps WHERE task_id = ? ORDER BY position", [taskId]).map((step) => ({
      id: String(step.id),
      taskId,
      position: Number(step.position),
      name: String(step.name),
      purpose: String(step.purpose),
      status: String(step.status),
      riskTier: Number(step.risk_tier),
      requiredTool: step.required_tool ? String(step.required_tool) : void 0,
      expectedInput: parseJson(step.expected_input, void 0),
      expectedOutput: parseJson(step.expected_output, void 0),
      startedAt: step.started_at === null ? void 0 : Number(step.started_at),
      completedAt: step.completed_at === null ? void 0 : Number(step.completed_at),
      attempts: Number(step.attempts),
      lastError: parseJson(step.last_error, void 0),
      retryPolicy: parseJson(step.retry_policy, { maxAttempts: 1, backoffMs: 0, retryableErrorCodes: [] }),
      timeoutMs: Number(step.timeout_ms),
      approvalState: String(step.approval_state),
      externalProcessId: step.external_process_id === null ? void 0 : Number(step.external_process_id),
      outputPath: step.output_path ? String(step.output_path) : void 0,
      artifactPaths: parseJson(step.artifact_paths, []),
      verificationCriteria: parseJson(step.verification_criteria, []),
      rollbackInstructions: step.rollback_instructions ? String(step.rollback_instructions) : void 0,
      auditReferences: parseJson(step.audit_references, []),
      dependencies: stepDependencies.filter((dependency) => String(dependency.step_id) === String(step.id)).map((dependency) => String(dependency.depends_on_step_id))
    }));
    const checkpoints = this.all("SELECT * FROM task_checkpoints WHERE task_id = ? ORDER BY created_at", [taskId]).map((entry) => ({ id: String(entry.id), taskId, stepId: entry.step_id ? String(entry.step_id) : void 0, name: String(entry.name), summary: String(entry.summary), verified: Boolean(entry.verified), evidence: parseJson(entry.evidence, null), auditReferences: parseJson(entry.audit_references, []), createdAt: Number(entry.created_at) }));
    const artifacts = this.all("SELECT * FROM task_artifacts WHERE task_id = ? ORDER BY created_at", [taskId]).map((entry) => ({ id: String(entry.id), taskId, stepId: entry.step_id ? String(entry.step_id) : void 0, kind: String(entry.kind), path: entry.path ? String(entry.path) : void 0, uri: entry.uri ? String(entry.uri) : void 0, sha256: entry.sha256 ? String(entry.sha256) : void 0, size: entry.size === null ? void 0 : Number(entry.size), verifiedAt: entry.verified_at === null ? void 0 : Number(entry.verified_at), metadata: parseJson(entry.metadata, void 0), createdAt: Number(entry.created_at) }));
    const externalReferences = this.all("SELECT * FROM task_external_references WHERE task_id = ? ORDER BY created_at", [taskId]).map((entry) => ({ id: String(entry.id), taskId, stepId: entry.step_id ? String(entry.step_id) : void 0, type: String(entry.type), provider: entry.provider ? String(entry.provider) : void 0, externalId: String(entry.external_id), url: entry.url ? String(entry.url) : void 0, state: entry.state ? String(entry.state) : void 0, metadata: parseJson(entry.metadata, void 0), verifiedAt: entry.verified_at === null ? void 0 : Number(entry.verified_at), createdAt: Number(entry.created_at), updatedAt: Number(entry.updated_at) }));
    const approvals = this.all("SELECT * FROM task_approvals WHERE task_id = ? ORDER BY requested_at", [taskId]).map((entry) => {
      const expiresAt = entry.expires_at === null ? void 0 : Number(entry.expires_at);
      const storedDecision = String(entry.decision);
      const decision = expiresAt !== void 0 && expiresAt <= Date.now() && !["consumed", "rejected"].includes(storedDecision) ? "expired" : storedDecision;
      return { id: String(entry.id), taskId, stepId: String(entry.step_id), toolRequestId: entry.tool_request_id ? String(entry.tool_request_id) : void 0, decision, scope: String(entry.scope), requestedAt: Number(entry.requested_at), decidedAt: entry.decided_at === null ? void 0 : Number(entry.decided_at), expiresAt, auditReference: entry.audit_reference ? String(entry.audit_reference) : void 0 };
    });
    for (const step of steps) {
      const latest = approvals.filter((approval) => approval.stepId === step.id).at(-1);
      if (!latest) continue;
      step.approvalState = latest.decision === "run-once" || latest.decision === "session" ? "approved" : latest.decision;
    }
    const events = this.all("SELECT * FROM task_events WHERE task_id = ? ORDER BY created_at", [taskId]).map((entry) => ({ id: String(entry.id), taskId, stepId: entry.step_id ? String(entry.step_id) : void 0, type: String(entry.type), summary: String(entry.summary), details: parseJson(entry.details, void 0), auditReference: entry.audit_reference ? String(entry.audit_reference) : void 0, createdAt: Number(entry.created_at) }));
    return {
      id: taskId,
      workspaceId: projectId,
      title: String(row.title),
      description: row.description ? String(row.description) : void 0,
      taskType: String(row.task_type ?? "general"),
      status: String(row.status),
      priority: String(row.priority),
      currentStepId: row.current_step_id ? String(row.current_step_id) : void 0,
      createdAt: Number(row.created_at),
      updatedAt: Number(row.updated_at),
      startedAt: row.started_at === null ? void 0 : Number(row.started_at),
      completedAt: row.completed_at === null ? void 0 : Number(row.completed_at),
      originatingConversationId: row.originating_conversation_id ? String(row.originating_conversation_id) : void 0,
      lastActiveConversationId: row.last_active_conversation_id ? String(row.last_active_conversation_id) : void 0,
      assignedProvider: row.assigned_provider ? String(row.assigned_provider) : void 0,
      assignedModel: row.assigned_model ? String(row.assigned_model) : void 0,
      progressSummary: String(row.progress_summary ?? ""),
      retryMetadata: parseJson(row.retry_metadata, void 0),
      interruptionReason: row.interruption_reason ? String(row.interruption_reason) : void 0,
      resumabilityState: String(row.resumability_state ?? "resumable"),
      resumeInstructions: String(row.resume_instructions ?? ""),
      associatedBranch: row.associated_branch ? String(row.associated_branch) : void 0,
      associatedCommitSha: row.associated_commit_sha ? String(row.associated_commit_sha) : void 0,
      associatedPullRequest: row.associated_pull_request ? String(row.associated_pull_request) : void 0,
      associatedReleaseTag: row.associated_release_tag ? String(row.associated_release_tag) : void 0,
      associatedWorkflowRun: row.associated_workflow_run ? String(row.associated_workflow_run) : void 0,
      processIds: parseJson(row.process_ids, []),
      externalResourceIds: parseJson(row.external_resource_ids, []),
      steps,
      taskDependencies: dependencies,
      checkpoints,
      artifacts,
      externalReferences,
      approvals,
      events
    };
  }
  appendTaskEventRow(taskId, stepId, type, summary, details, auditReference) {
    const task = this.one("SELECT project_id FROM tasks WHERE id = ?", [taskId]);
    if (!task) throw new Error("Unknown task.");
    this.ready().run("INSERT INTO task_events VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [id(), String(task.project_id), taskId, stepId ?? null, type, summary, details === void 0 ? null : JSON.stringify(sanitizeTaskData(details)), auditReference ?? null, Date.now()]);
  }
  all(sql, params = []) {
    const result = this.ready().exec(sql, params);
    if (!result[0]) return [];
    return result[0].values.map((values) => Object.fromEntries(result[0].columns.map((column, index) => [column, values[index]])));
  }
  one(sql, params = []) {
    return this.all(sql, params)[0];
  }
  ready() {
    if (!this.db) throw new Error("Storage is not initialized.");
    return this.db;
  }
  async persist() {
    if (!this.db || !this.filePath) return;
    const destination = this.filePath;
    const bytes = this.db.export();
    const temporary = `${destination}.${id()}.tmp`;
    const operation = this.persistQueue.then(async () => {
      try {
        await promises.writeFile(temporary, bytes, { flag: "wx" });
        await promises.rename(temporary, destination);
      } catch (error) {
        await promises.rm(temporary, { force: true }).catch(() => void 0);
        throw error;
      }
    });
    this.persistQueue = operation.catch(() => void 0);
    await operation;
  }
}
const DEFAULT_OPENAI_MODEL = "gpt-5.6-sol";
const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const LOCAL_FILE_TOOLS = /* @__PURE__ */ new Set(["file.list", "file.read", "file.search", "file.create", "file.write", "file.patch", "file.rename", "file.move", "directory.create"]);
function responsesCompatibleSchema(value) {
  if (Array.isArray(value)) return value.map(responsesCompatibleSchema);
  if (!value || typeof value !== "object") return value;
  const schema = Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, responsesCompatibleSchema(entry)]));
  if (schema.exclusiveMinimum === true && typeof schema.minimum === "number") {
    schema.exclusiveMinimum = schema.minimum;
    delete schema.minimum;
  }
  if (schema.exclusiveMaximum === true && typeof schema.maximum === "number") {
    schema.exclusiveMaximum = schema.maximum;
    delete schema.maximum;
  }
  return schema;
}
class OpenAIProvider {
  id = "openai";
  apiKey;
  baseUrl;
  model;
  constructor(opts) {
    this.apiKey = opts?.apiKey ?? process.env.OPENAI_API_KEY;
    this.baseUrl = this.normalizeBaseUrl(opts?.baseUrl ?? process.env.OPENAI_BASE_URL ?? DEFAULT_BASE_URL);
    this.model = this.normalizeModel(opts?.model ?? process.env.OPENAI_MODEL ?? DEFAULT_OPENAI_MODEL);
  }
  configure(opts) {
    this.apiKey = opts.apiKey;
    this.baseUrl = this.normalizeBaseUrl(opts.baseUrl);
    this.model = this.normalizeModel(opts.model);
  }
  async isConfigured() {
    return Boolean(this.apiKey) || this.isLoopbackProvider();
  }
  async listModels() {
    const response = await this.authorizedFetch(`${this.baseUrl}/models`);
    if (!response.ok) throw await this.providerError(response, "Could not list models");
    const payload = await response.json();
    const rawModels = Array.isArray(payload.data) ? payload.data : Array.isArray(payload.models) ? payload.models.map((model) => ({ id: model.id ?? model.name, owned_by: model.owned_by })) : null;
    if (!rawModels) throw new Error("The AI provider returned an invalid model list. You can still enter a model ID manually.");
    return rawModels.filter((model) => typeof model.id === "string" && Boolean(model.id.trim())).map((model) => ({ id: model.id, ownedBy: typeof model.owned_by === "string" ? model.owned_by : void 0 })).sort((left, right) => left.id.localeCompare(right.id));
  }
  async validateModel(model = this.model) {
    const normalized = this.normalizeModel(model);
    const models = await this.listModels();
    return { model: normalized, exists: models.some((entry) => entry.id === normalized), availableCount: models.length };
  }
  async testConnection() {
    const validation = await this.validateModel();
    if (!validation.exists) {
      throw new Error(`The saved model "${validation.model}" is not available to this API key. Choose another model or refresh the provider model list.`);
    }
    return validation;
  }
  async chat(messages, model = this.model) {
    const selectedModel = this.normalizeModel(model);
    const request = {
      model: selectedModel,
      messages: messages.map((message) => ({ role: message.role, content: message.content })),
      max_completion_tokens: 1600
    };
    let response = await this.authorizedFetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request)
    });
    if (!response.ok) {
      const errorText = await response.clone().text();
      if (response.status === 400 && /max_completion_tokens|unknown parameter|unsupported parameter/i.test(errorText)) {
        const { max_completion_tokens: _ignored, ...compatibleRequest } = request;
        response = await this.authorizedFetch(`${this.baseUrl}/chat/completions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...compatibleRequest, max_tokens: 1600 })
        });
      }
    }
    if (!response.ok) throw await this.providerError(response, `AI request failed for model "${selectedModel}"`);
    const data = await response.json();
    const choice = data.choices?.[0];
    if (!choice) return "";
    return typeof choice.message?.content === "string" ? choice.message.content : String(choice.text ?? "");
  }
  async chatWithTools(messages, tools, model = this.model) {
    const selectedModel = this.normalizeModel(model);
    const providerNames = /* @__PURE__ */ new Map();
    const availableTools = this.isLoopbackProvider() ? tools.filter((tool) => LOCAL_FILE_TOOLS.has(tool.name)) : tools;
    const aliasedTools = availableTools.map((tool, index) => {
      const alias = `forge_${index}_${tool.name.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
      providerNames.set(alias, tool.name);
      return { alias, tool };
    });
    if (this.usesResponsesForTools(selectedModel)) {
      return this.responsesWithTools(messages, aliasedTools, providerNames, selectedModel);
    }
    const providerTools = aliasedTools.map(({ alias, tool }) => ({
      type: "function",
      function: { name: alias, description: `${tool.description} (FORGE tool: ${tool.name})`, parameters: responsesCompatibleSchema(tool.parameters) }
    }));
    const request = {
      model: selectedModel,
      messages: messages.map((message2) => ({ role: message2.role, content: message2.content })),
      tools: providerTools,
      tool_choice: "auto",
      // FORGE continues from observed results until progress stops. Request one
      // call at a time so an audit is never rejected for a burst of parallel
      // calls in a single provider response.
      parallel_tool_calls: false,
      max_completion_tokens: 1e4
    };
    let response = await this.authorizedFetch(`${this.baseUrl}/chat/completions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request) });
    if (!response.ok) {
      const errorText = await response.clone().text();
      if (response.status === 400 && /max_completion_tokens|unknown parameter|unsupported parameter/i.test(errorText)) {
        const { max_completion_tokens: _ignored, ...compatibleRequest } = request;
        response = await this.authorizedFetch(`${this.baseUrl}/chat/completions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...compatibleRequest, max_tokens: 1600 }) });
      }
    }
    if (!response.ok) throw await this.providerError(response, `AI request failed for model "${selectedModel}"`);
    const data = await response.json();
    const message = data.choices?.[0]?.message;
    const toolCalls = (message?.tool_calls ?? []).map((raw) => {
      const call = raw;
      if (typeof call.function?.name !== "string" || typeof call.function.arguments !== "string") throw new Error("The provider returned a malformed tool call.");
      let args;
      try {
        args = JSON.parse(call.function.arguments);
      } catch {
        throw new Error("The provider returned malformed tool arguments.");
      }
      return { id: typeof call.id === "string" ? call.id : crypto.randomUUID(), name: providerNames.get(call.function.name) ?? call.function.name, arguments: args, provider: this.id };
    });
    const content = typeof message?.content === "string" ? message.content : "";
    if (toolCalls.length === 0) {
      const textCall = this.textToolCall(content, availableTools, providerNames);
      if (textCall) return { content: "", toolCalls: [textCall], modelId: selectedModel };
    }
    return { content, toolCalls, modelId: selectedModel };
  }
  async responsesWithTools(messages, tools, providerNames, selectedModel) {
    const request = {
      model: selectedModel,
      input: messages.map((message) => ({ role: message.role, content: message.content })),
      tools: tools.map(({ alias, tool }) => ({
        type: "function",
        name: alias,
        description: `${tool.description} (FORGE tool: ${tool.name})`,
        parameters: responsesCompatibleSchema(tool.parameters)
      })),
      tool_choice: "auto",
      // This is deliberately not a total tool budget. The native runtime
      // observes one result, then asks for the next dependency-ready call.
      parallel_tool_calls: false,
      max_output_tokens: 1e4
    };
    const response = await this.authorizedFetch(`${this.baseUrl}/responses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request)
    });
    if (!response.ok) throw await this.providerError(response, `AI request failed for model "${selectedModel}"`);
    const data = await response.json();
    if (!Array.isArray(data.output)) throw new Error("The provider returned a malformed Responses API result.");
    const toolCalls = data.output.filter((item) => item.type === "function_call").map((call) => {
      if (typeof call.name !== "string" || typeof call.arguments !== "string") throw new Error("The provider returned a malformed tool call.");
      let args;
      try {
        args = JSON.parse(call.arguments);
      } catch {
        throw new Error("The provider returned malformed tool arguments.");
      }
      return {
        id: typeof call.call_id === "string" ? call.call_id : crypto.randomUUID(),
        name: providerNames.get(call.name) ?? call.name,
        arguments: args,
        provider: this.id
      };
    });
    const content = typeof data.output_text === "string" ? data.output_text : data.output.filter((item) => item.type === "message").flatMap((item) => item.content ?? []).filter((part) => part.type === "output_text" && typeof part.text === "string").map((part) => part.text).join("");
    return { content, toolCalls, modelId: typeof data.model === "string" ? data.model : selectedModel };
  }
  async authorizedFetch(url, init = {}) {
    if (!this.apiKey && !this.isLoopbackProvider()) throw new Error("An API key is required for remote AI providers. Loopback providers such as Ollama may run without one.");
    return fetch(url, {
      ...init,
      headers: this.apiKey ? { ...init.headers, Authorization: `Bearer ${this.apiKey}` } : init.headers
    });
  }
  isLoopbackProvider() {
    const hostname = new URL(this.baseUrl).hostname.toLowerCase();
    return ["localhost", "127.0.0.1", "::1"].includes(hostname);
  }
  textToolCall(content, tools, providerNames) {
    const trimmed = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    if (!trimmed.startsWith("{")) return null;
    try {
      const value = JSON.parse(trimmed);
      const requestedName = value.name ?? value.tool;
      const requestedArguments = value.parameters ?? value.arguments;
      if (typeof requestedName !== "string" || !requestedArguments || typeof requestedArguments !== "object" || Array.isArray(requestedArguments)) return null;
      const stableName = providerNames.get(requestedName) ?? requestedName;
      if (!tools.some((tool) => tool.name === stableName)) return null;
      return { id: crypto.randomUUID(), name: stableName, arguments: requestedArguments, provider: this.id };
    } catch {
      return null;
    }
  }
  async providerError(response, prefix) {
    const text = await response.text();
    let detail = text;
    let code;
    try {
      const parsed = JSON.parse(text);
      detail = parsed.error?.message ?? parsed.message ?? text;
      code = parsed.error?.code;
    } catch {
    }
    if (response.status === 404 || code === "model_not_found" || /model.+(?:not found|does not exist|not available)/i.test(detail)) {
      return new Error(`${prefix}: the model is unsupported or unavailable for this provider. Refresh models in Settings or enter a different model ID.`);
    }
    return new Error(`${prefix} (${response.status}): ${detail || response.statusText}`);
  }
  normalizeBaseUrl(value) {
    const normalized = value.trim().replace(/\/$/, "");
    if (!normalized) throw new Error("API base URL is required.");
    const parsed = new URL(normalized);
    if (!["https:", "http:"].includes(parsed.protocol)) throw new Error("API base URL must use HTTPS or HTTP.");
    if (parsed.username || parsed.password) throw new Error("API base URL must not contain credentials.");
    const loopback = ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname.toLowerCase());
    if (parsed.protocol === "http:" && !loopback) throw new Error("Remote API base URLs must use HTTPS. HTTP is allowed only for loopback providers.");
    return parsed.toString().replace(/\/$/, "");
  }
  normalizeModel(value) {
    const normalized = value.trim();
    if (!normalized) throw new Error("AI model ID is required.");
    return normalized;
  }
  usesResponsesForTools(model) {
    return /^gpt-5\.6(?:-|$)/i.test(model);
  }
}
class Agent {
  constructor(provider, contextBuilder2, memoryRetriever2) {
    this.provider = provider;
    this.contextBuilder = contextBuilder2;
    this.memoryRetriever = memoryRetriever2;
  }
  async askWithContext(question, history = []) {
    const prepared = await this.prepare(question, history);
    return { content: await this.provider.chat(prepared.messages), memories: prepared.memories, context: prepared.context };
  }
  async askWithTools(question, history = [], tools = []) {
    const prepared = await this.prepare(question, history);
    const response = this.provider.chatWithTools ? await this.provider.chatWithTools(prepared.messages, tools) : { content: await this.provider.chat(prepared.messages), toolCalls: [] };
    return { content: response.content, toolCalls: response.toolCalls, modelId: response.modelId, memories: prepared.memories, context: prepared.context };
  }
  async prepare(question, history) {
    let memories = [];
    if (this.memoryRetriever) {
      try {
        memories = await this.memoryRetriever.search(question, 6);
      } catch {
        memories = [];
      }
    }
    const context = this.contextBuilder.packet ? await this.contextBuilder.packet(question, memories) : await this.contextBuilder.assemble(question, memories);
    const boundedHistory = history.filter((message) => message.role === "user" || message.role === "assistant").slice(-48).reduceRight((selected, message) => {
      const used = selected.reduce((total, entry) => total + entry.content.length, 0);
      return used >= 4e4 ? selected : [{ role: message.role, content: message.content.slice(0, 6e3) }, ...selected];
    }, []);
    const messages = [
      { role: "system", content: context.systemPrompt },
      ...boundedHistory,
      { role: "user", content: question }
    ];
    return { messages, memories, context };
  }
  async ask(question, history = []) {
    return (await this.askWithContext(question, history)).content;
  }
  async explainProject(history = []) {
    return this.ask("Explain this repository as an evidence-grounded architecture summary.", history);
  }
  async reviewChanges(history = []) {
    return this.ask("Review the current repository changes against its documented architecture and project goals.", history);
  }
}
const DEFAULT_CONTEXT_BUDGET = 28e3;
const DOCUMENT_PATTERN = /(?:^|\/)(?:readme|architecture|project[_-]?status|roadmap|dev[_-]?log|release[_-]?notes|goals?|memory)\.md$/i;
class PriorityContextBudgetPolicy {
  select(artifacts, characterBudget) {
    const ordered = [...artifacts].sort((left, right) => right.priority - left.priority || left.id.localeCompare(right.id));
    const selected = [];
    const omittedArtifactIds = [];
    let remaining = characterBudget;
    for (const artifact of ordered) {
      if (remaining <= 0) {
        omittedArtifactIds.push(artifact.id);
        continue;
      }
      const allowance = Math.min(artifact.content.length, 4e3, remaining);
      if (allowance <= 0) {
        omittedArtifactIds.push(artifact.id);
        continue;
      }
      const content = artifact.content.length > allowance ? `${artifact.content.slice(0, Math.max(0, allowance - 1))}…` : artifact.content;
      selected.push({ ...artifact, content });
      remaining -= content.length;
      if (content.length < artifact.content.length) omittedArtifactIds.push(`${artifact.id}:truncated`);
    }
    return { selected, omittedArtifactIds };
  }
}
class WorkspaceContextEngine {
  constructor(workspace2, git2, storage2, budgetPolicy = new PriorityContextBudgetPolicy()) {
    this.workspace = workspace2;
    this.git = git2;
    this.storage = storage2;
    this.budgetPolicy = budgetPolicy;
  }
  flattenFiles(nodes) {
    const out = [];
    for (const node of nodes) {
      out.push({ path: node.relativePath || node.path, type: node.type, extension: node.extension });
      if (node.children?.length) out.push(...this.flattenFiles(node.children));
    }
    return out;
  }
  async buildContext(query = "", memories) {
    const context = { projectName: null, rootPath: null, files: [], documents: [], sourceFiles: [], packageJson: null, gitStatus: null, recentCommits: null, metadata: null, memories: memories ?? null };
    try {
      const info = this.workspace.info();
      if (info) {
        context.projectName = info.name ?? null;
        context.rootPath = info.rootPath ?? null;
      }
    } catch {
    }
    try {
      context.files = this.flattenFiles(await this.workspace.list(""));
    } catch {
      context.files = [];
    }
    const candidatePaths = [...new Set(context.files.filter((file) => file.type === "file" && DOCUMENT_PATTERN.test(file.path)).map((file) => file.path))].slice(0, 10);
    for (const documentPath of candidatePaths) {
      try {
        const file = await this.workspace.readFile(documentPath);
        context.documents.push({ path: documentPath, content: file.content });
      } catch {
      }
    }
    try {
      const packageJson = await this.workspace.readFile("package.json");
      context.packageJson = { path: packageJson.path, content: packageJson.content };
    } catch {
    }
    try {
      context.gitStatus = await this.git.status();
    } catch {
    }
    try {
      const commits = await this.git.log(12);
      context.recentCommits = commits.map((commit) => ({ hash: commit.hash, message: commit.message, author: commit.author, timestamp: commit.timestamp }));
    } catch {
    }
    try {
      context.metadata = await this.storage.dashboard();
    } catch {
    }
    const queryTokens = new Set(query.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 2));
    const changedPaths = new Set(context.gitStatus && typeof context.gitStatus === "object" && "files" in context.gitStatus && Array.isArray(context.gitStatus.files) ? context.gitStatus.files.map((file) => String(file.path ?? "")) : []);
    const sourceExtensions = /* @__PURE__ */ new Set(["ts", "tsx", "js", "jsx", "py", "c", "cpp", "rs", "go", "java"]);
    const sourceCandidates = context.files.filter((file) => file.type === "file" && sourceExtensions.has(file.extension?.toLowerCase() ?? "")).map((file) => ({ path: file.path, changed: changedPaths.has(file.path), score: (changedPaths.has(file.path) ? 100 : 0) + [...queryTokens].reduce((score, token) => score + (file.path.toLowerCase().includes(token) ? 10 : 0), 0) })).filter((candidate) => candidate.changed || candidate.score > 0).sort((a, b) => b.score - a.score || a.path.localeCompare(b.path)).slice(0, 6);
    for (const candidate of sourceCandidates) {
      try {
        const file = await this.workspace.readFile(candidate.path);
        context.sourceFiles.push({ path: candidate.path, content: file.content, changed: candidate.changed, relevance: candidate.changed ? 96 : 84, reason: candidate.changed ? "Changed implementation file." : "Source path matches the current question." });
      } catch {
      }
    }
    return context;
  }
  async assemble(query, memories, characterBudget = DEFAULT_CONTEXT_BUDGET) {
    const context = await this.buildContext(query, memories);
    const artifacts = [];
    const add = (artifact) => {
      if (artifact.content.trim()) artifacts.push(artifact);
    };
    add({ id: "workspace-inventory", kind: "source", title: "Workspace inventory", priority: 60, content: `${context.files.length} indexed entries
${context.files.slice(0, 180).map((file) => `${file.type === "directory" ? "dir" : "file"}: ${file.path}`).join("\n")}`, metadata: { relevance: 70, reason: "Workspace identity and file inventory." } });
    for (const document of context.documents) add({ id: `document:${document.path}`, kind: /(?:architecture|project[_-]?status|roadmap|dev[_-]?log|release[_-]?notes)/i.test(document.path) ? "architecture" : "documentation", title: document.path, path: document.path, content: document.content, priority: /architecture/i.test(document.path) ? 100 : /^readme/i.test(document.path) ? 90 : 80, metadata: { relevance: 90, reason: "Project documentation selected by workspace context policy." } });
    for (const sourceFile of context.sourceFiles) add({ id: `source:${sourceFile.path}`, kind: "source", title: sourceFile.path, path: sourceFile.path, content: sourceFile.content, priority: sourceFile.changed ? 92 : 70, metadata: { relevance: sourceFile.relevance, reason: sourceFile.reason } });
    if (context.packageJson) add({ id: "package-json", kind: "configuration", title: "package.json", path: context.packageJson.path, content: context.packageJson.content, priority: 72 });
    if (context.gitStatus) add({ id: "git-status", kind: "git", title: "Current Git state", content: JSON.stringify(context.gitStatus, null, 2), priority: 88 });
    if (context.recentCommits?.length) add({ id: "git-history", kind: "git", title: "Recent Git history", content: context.recentCommits.map((commit) => `${commit.hash.slice(0, 8)} ${commit.message}`).join("\n"), priority: 86 });
    if (context.metadata) add({ id: "project-metadata", kind: "metadata", title: "Project goals and metadata", content: JSON.stringify(context.metadata, null, 2), priority: 94 });
    for (const memory of context.memories ?? []) add({ id: `memory:${memory.id}`, kind: "memory", title: memory.title || memory.type, content: memory.content, priority: memory.type === "decision" ? 98 : Math.max(70, Math.min(92, memory.relevance ?? 84)), updatedAt: memory.updatedAt, metadata: { relevance: memory.relevance ?? 80, reason: memory.reasons?.join(" · ") ?? "Relevant durable workspace knowledge." } });
    const budgeted = this.budgetPolicy.select(artifacts, characterBudget);
    const evidence = budgeted.selected.map((artifact) => `## ${artifact.title}${artifact.path ? ` (${artifact.path})` : ""}
${artifact.content}`).join("\n\n");
    const projectName = context.projectName ?? "the active workspace";
    const systemPrompt = `You are consuming context compiled by FORGE for the repository "${projectName}".

FORGE owns workspace intelligence: project evidence, durable memory, task state, Git chronology, terminal observations, and relevance filtering. The active LLM or CLI agent owns reasoning and execution. Treat the project folder as authority, distinguish evidence from inference, and preserve durable project decisions across model changes.

Workspace evidence for this turn:
${evidence || "No workspace evidence was available."}`;
    return { systemPrompt, artifacts: budgeted.selected, omittedArtifactIds: budgeted.omittedArtifactIds, characterBudget, characterCount: systemPrompt.length };
  }
  async envelope(query, memories, characterBudget) {
    const compiled = await this.assemble(query, memories, characterBudget);
    return { ...compiled, query, generatedAt: Date.now() };
  }
}
class WorkspaceIntelligenceService {
  constructor(context, observations) {
    this.context = context;
    this.observations = observations;
  }
  invalidatedAt;
  invalidationReasons = /* @__PURE__ */ new Set();
  async invalidate(reason2, payload = {}) {
    this.invalidatedAt = Date.now();
    this.invalidationReasons.add(reason2);
    await this.observations?.recordProjectObservation(reason2, payload);
  }
  async assemble(query, memories, characterBudget) {
    return this.context.assemble(query, memories, characterBudget);
  }
  async packet(query, memories, characterBudget) {
    const compiled = await this.assemble(query, memories, characterBudget);
    const projectObservations = await this.observations?.listProjectObservations() ?? [];
    const observationContent = projectObservations.length ? JSON.stringify(projectObservations, null, 2).slice(0, 8e3) : "";
    const artifact = observationContent ? { id: "project-observations", kind: "metadata", title: "Fresh project observations", content: observationContent, priority: 99, updatedAt: projectObservations[0]?.timestamp, metadata: { relevance: 99, reason: "Durable observations invalidate stale cached context." } } : null;
    const systemPrompt = artifact ? `${compiled.systemPrompt}

## ${artifact.title}
${artifact.content}` : compiled.systemPrompt;
    return { ...compiled, systemPrompt, artifacts: artifact ? [artifact, ...compiled.artifacts] : compiled.artifacts, characterCount: systemPrompt.length, query, generatedAt: Date.now(), invalidatedAt: this.invalidatedAt, invalidationReasons: [...this.invalidationReasons], projectObservations };
  }
}
const EXCLUDED_PATH_PARTS = /* @__PURE__ */ new Set([".git", ".forge", ".obsidian", "node_modules", "dist_electron", "out", "coverage", "build", ".next", "__pycache__"]);
const SOURCE_EXTENSIONS = /* @__PURE__ */ new Set(["ts", "tsx", "js", "jsx", "py", "java", "c", "cpp", "h", "rs", "go"]);
const CONFIGURATION_NAMES = /^(?:package(?:-lock)?\.json|tsconfig(?:\.[^.]+)?\.json|vitest\.config\.[^.]+|vite\.config\.[^.]+|electron\.vite\.config\.[^.]+|eslint\.config\.[^.]+|\.env\.example)$/i;
const ARCHITECTURE_NAMES = /^(?:readme|architecture|project[_-]?status|roadmap|dev[_-]?log|release[_-]?notes|goals?|memory)(?:\.[^.]+)?\.md$/i;
function classifyWorkspaceKnowledge(path2, extension) {
  const normalized = path2.replaceAll("\\", "/");
  const parts = normalized.toLowerCase().split("/");
  if (parts.some((part) => EXCLUDED_PATH_PARTS.has(part))) return null;
  const name = parts.at(-1) ?? "";
  const ext = (extension || name.split(".").at(-1) || "").toLowerCase();
  if (ARCHITECTURE_NAMES.test(name) || parts.includes("architecture")) {
    return { type: "architecture", label: "Architecture", reason: "Defines project intent, architecture, status, or durable direction." };
  }
  if (ext === "md" || ext === "txt") {
    return { type: "documentation", label: "Documentation", reason: "Human-authored project documentation." };
  }
  if (CONFIGURATION_NAMES.test(name) || ["json", "yml", "yaml"].includes(ext)) {
    return { type: "configuration", label: "Configuration", reason: "Build, tooling, or project configuration." };
  }
  if (SOURCE_EXTENSIONS.has(ext)) {
    return { type: "source", label: "Source Code", reason: "Current implementation source." };
  }
  return null;
}
class MemoryService {
  constructor(storage2) {
    this.storage = storage2;
  }
  async create(entry) {
    return this.storage.createMemory(entry.type, entry.title ?? null, entry.content, entry.metadata);
  }
  async list(limit = 100) {
    return this.storage.listMemories(limit);
  }
  async update(id2, fields) {
    return this.storage.updateMemory(id2, fields);
  }
  async delete(id2) {
    return this.storage.deleteMemory(id2);
  }
}
class MemoryRetriever {
  constructor(memoryService2) {
    this.memoryService = memoryService2;
  }
  tokenize(text) {
    const stopWords = /* @__PURE__ */ new Set(["a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "how", "i", "in", "is", "it", "of", "on", "or", "that", "the", "this", "to", "what", "when", "where", "which", "who", "why", "with"]);
    return text.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 1 && !stopWords.has(token));
  }
  // TF-IDF based scoring with optional metadata weighting and recency bonus
  async search(query, limit = 10) {
    const asksForObsidian = /\bobsidian\b/i.test(query);
    const asksForConfiguration = /\b(?:config|configuration|build|tooling|package|typescript|test|vitest|eslint|vite)\b/i.test(query);
    const entries = (await this.memoryService.list(500)).filter((entry) => {
      const metadata = typeof entry.metadata === "object" && entry.metadata ? entry.metadata : {};
      const sourcePath = String(metadata.path ?? "");
      if (/(?:^|\/)\.obsidian(?:\/|$)/i.test(sourcePath) && !asksForObsidian) return false;
      if ((metadata.classification === "Configuration" || entry.type === "configuration" || /(?:\.json|\.ya?ml|(?:^|\/)\w+\.config\.[^/]+)$/i.test(sourcePath)) && !asksForConfiguration && !asksForObsidian) return false;
      return true;
    });
    const now = Date.now();
    const docs = entries.map((e) => ({ id: e.id, type: e.type, title: e.title ?? "", content: e.content ?? "", metadata: e.metadata, createdAt: e.createdAt || 0, updatedAt: e.updatedAt || e.createdAt || 0 }));
    const N = docs.length || 1;
    const docTokens = docs.map((d) => this.tokenize(d.title + " " + d.content));
    const df = {};
    for (const toks of docTokens) {
      const seen = /* @__PURE__ */ new Set();
      for (const t of toks) {
        if (!seen.has(t)) {
          seen.add(t);
          df[t] = (df[t] || 0) + 1;
        }
      }
    }
    const idf = {};
    for (const [t, f] of Object.entries(df)) idf[t] = Math.log(1 + N / (1 + f));
    const qTokens = this.tokenize(query);
    const qFreq = {};
    for (const t of qTokens) qFreq[t] = (qFreq[t] || 0) + 1;
    const scores = docs.map((d, i) => {
      const tf = {};
      for (const t of docTokens[i]) tf[t] = (tf[t] || 0) + 1;
      let score = 0;
      let titleMatches = 0;
      let tagMatches = 0;
      const matchedTokens = /* @__PURE__ */ new Set();
      for (const qt of Object.keys(qFreq)) {
        const wIdf = idf[qt] ?? Math.log(1 + N);
        const docTf = tf[qt] ?? 0;
        score += docTf * wIdf * qFreq[qt];
        if (docTf > 0) matchedTokens.add(qt);
        if (d.title.toLowerCase().includes(qt)) {
          score += 2 * wIdf;
          titleMatches += 1;
          matchedTokens.add(qt);
        }
      }
      if (d.metadata && d.metadata.tags) {
        const tags = d.metadata.tags.map((t) => String(t).toLowerCase());
        for (const qt of Object.keys(qFreq)) if (tags.includes(qt)) {
          score += 3;
          tagMatches += 1;
          matchedTokens.add(qt);
        }
      }
      if (matchedTokens.size === 0) return null;
      const ageDays = Math.max(0, (now - (d.createdAt || 0)) / (1e3 * 60 * 60 * 24));
      const recency = Math.max(0, 1.5 - ageDays / 45);
      score += recency;
      const coverage = matchedTokens.size / Math.max(1, Object.keys(qFreq).length);
      const relevance = Math.min(99, Math.round(45 + coverage * 35 + Math.min(12, titleMatches * 6) + Math.min(7, tagMatches * 4)));
      const reasons = [
        `${matchedTokens.size}/${Math.max(1, Object.keys(qFreq).length)} query concepts matched`,
        titleMatches ? `${titleMatches} title match${titleMatches === 1 ? "" : "es"}` : "",
        tagMatches ? `${tagMatches} tag match${tagMatches === 1 ? "" : "es"}` : ""
      ].filter(Boolean);
      return { entry: d, score, relevance, reasons };
    }).filter((entry) => Boolean(entry && entry.relevance >= 55));
    scores.sort((a, b) => b.relevance - a.relevance || b.score - a.score);
    return scores.slice(0, limit).map((result) => ({
      id: result.entry.id,
      workspaceId: "",
      type: result.entry.type,
      title: result.entry.title || null,
      content: result.entry.content,
      metadata: { ...typeof result.entry.metadata === "object" && result.entry.metadata ? result.entry.metadata : {}, relevance: result.relevance, reasons: result.reasons },
      createdAt: result.entry.createdAt,
      updatedAt: result.entry.updatedAt,
      relevance: result.relevance,
      reasons: result.reasons
    }));
  }
}
class MemoryIndexer {
  constructor(memoryService2, workspace2) {
    this.memoryService = memoryService2;
    this.workspace = workspace2;
  }
  async indexConversations(_limit = 100) {
    return;
  }
  async indexWorkspaceFiles(limitPerType = 200) {
    const files = await this.workspace.list();
    const all = [];
    const walk = (nodes) => {
      for (const n of nodes) {
        if (n.type === "file") all.push(n);
        if (n.children) walk(n.children);
      }
    };
    walk(files);
    const existing = await this.memoryService.list(2e3);
    const indexed = existing.filter((entry) => {
      const metadata = typeof entry.metadata === "object" && entry.metadata ? entry.metadata : {};
      return metadata.origin === "workspace-index" || ["document", "code"].includes(entry.type) && typeof metadata.path === "string";
    });
    const byPath = /* @__PURE__ */ new Map();
    for (const entry of indexed) {
      const sourcePath = String(entry.metadata.path);
      byPath.set(sourcePath, [...byPath.get(sourcePath) ?? [], entry]);
    }
    const classified = all.map((file) => ({ file, sourcePath: file.relativePath || file.path, classification: classifyWorkspaceKnowledge(file.relativePath || file.path, file.extension) })).filter((entry) => Boolean(entry.classification));
    const eligiblePaths = new Set(classified.map((entry) => entry.sourcePath));
    for (const entry of indexed) {
      const sourcePath = String(entry.metadata.path);
      if (!eligiblePaths.has(sourcePath)) await this.memoryService.delete(entry.id);
    }
    let count = 0;
    for (const { file: f, sourcePath, classification } of classified) {
      if (count >= limitPerType) break;
      try {
        const fc = await this.workspace.readFile(sourcePath);
        const metadata = { origin: "workspace-index", path: sourcePath, classification: classification.label, reason: classification.reason };
        const matches = byPath.get(sourcePath) ?? [];
        if (matches[0]) {
          await this.memoryService.update(matches[0].id, { type: classification.type, title: f.name, content: fc.content, metadata });
          for (const duplicate of matches.slice(1)) await this.memoryService.delete(duplicate.id);
        } else {
          await this.memoryService.create({ type: classification.type, title: f.name, content: fc.content, metadata });
        }
        count += 1;
      } catch {
      }
    }
    return { indexed: count, excluded: all.length - classified.length };
  }
}
var re = { exports: {} };
var constants;
var hasRequiredConstants;
function requireConstants() {
  if (hasRequiredConstants) return constants;
  hasRequiredConstants = 1;
  const SEMVER_SPEC_VERSION = "2.0.0";
  const MAX_LENGTH = 256;
  const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER || /* istanbul ignore next */
  9007199254740991;
  const MAX_SAFE_COMPONENT_LENGTH = 16;
  const MAX_SAFE_BUILD_LENGTH = MAX_LENGTH - 6;
  const RELEASE_TYPES = [
    "major",
    "premajor",
    "minor",
    "preminor",
    "patch",
    "prepatch",
    "prerelease"
  ];
  constants = {
    MAX_LENGTH,
    MAX_SAFE_COMPONENT_LENGTH,
    MAX_SAFE_BUILD_LENGTH,
    MAX_SAFE_INTEGER,
    RELEASE_TYPES,
    SEMVER_SPEC_VERSION,
    FLAG_INCLUDE_PRERELEASE: 1,
    FLAG_LOOSE: 2
  };
  return constants;
}
var debug_1;
var hasRequiredDebug;
function requireDebug() {
  if (hasRequiredDebug) return debug_1;
  hasRequiredDebug = 1;
  const debug = typeof process === "object" && process.env && process.env.NODE_DEBUG && /\bsemver\b/i.test(process.env.NODE_DEBUG) ? (...args) => console.error("SEMVER", ...args) : () => {
  };
  debug_1 = debug;
  return debug_1;
}
var hasRequiredRe;
function requireRe() {
  if (hasRequiredRe) return re.exports;
  hasRequiredRe = 1;
  (function(module, exports) {
    const {
      MAX_SAFE_COMPONENT_LENGTH,
      MAX_SAFE_BUILD_LENGTH,
      MAX_LENGTH
    } = requireConstants();
    const debug = requireDebug();
    exports = module.exports = {};
    const re2 = exports.re = [];
    const safeRe = exports.safeRe = [];
    const src = exports.src = [];
    const safeSrc = exports.safeSrc = [];
    const t = exports.t = {};
    let R = 0;
    const LETTERDASHNUMBER = "[a-zA-Z0-9-]";
    const safeRegexReplacements = [
      ["\\s", 1],
      ["\\d", MAX_LENGTH],
      [LETTERDASHNUMBER, MAX_SAFE_BUILD_LENGTH]
    ];
    const makeSafeRegex = (value) => {
      for (const [token, max] of safeRegexReplacements) {
        value = value.split(`${token}*`).join(`${token}{0,${max}}`).split(`${token}+`).join(`${token}{1,${max}}`);
      }
      return value;
    };
    const createToken = (name, value, isGlobal) => {
      const safe = makeSafeRegex(value);
      const index = R++;
      debug(name, index, value);
      t[name] = index;
      src[index] = value;
      safeSrc[index] = safe;
      re2[index] = new RegExp(value, isGlobal ? "g" : void 0);
      safeRe[index] = new RegExp(safe, isGlobal ? "g" : void 0);
    };
    createToken("NUMERICIDENTIFIER", "0|[1-9]\\d*");
    createToken("NUMERICIDENTIFIERLOOSE", "\\d+");
    createToken("NONNUMERICIDENTIFIER", `\\d*[a-zA-Z-]${LETTERDASHNUMBER}*`);
    createToken("MAINVERSION", `(${src[t.NUMERICIDENTIFIER]})\\.(${src[t.NUMERICIDENTIFIER]})\\.(${src[t.NUMERICIDENTIFIER]})`);
    createToken("MAINVERSIONLOOSE", `(${src[t.NUMERICIDENTIFIERLOOSE]})\\.(${src[t.NUMERICIDENTIFIERLOOSE]})\\.(${src[t.NUMERICIDENTIFIERLOOSE]})`);
    createToken("PRERELEASEIDENTIFIER", `(?:${src[t.NONNUMERICIDENTIFIER]}|${src[t.NUMERICIDENTIFIER]})`);
    createToken("PRERELEASEIDENTIFIERLOOSE", `(?:${src[t.NONNUMERICIDENTIFIER]}|${src[t.NUMERICIDENTIFIERLOOSE]})`);
    createToken("PRERELEASE", `(?:-(${src[t.PRERELEASEIDENTIFIER]}(?:\\.${src[t.PRERELEASEIDENTIFIER]})*))`);
    createToken("PRERELEASELOOSE", `(?:-?(${src[t.PRERELEASEIDENTIFIERLOOSE]}(?:\\.${src[t.PRERELEASEIDENTIFIERLOOSE]})*))`);
    createToken("BUILDIDENTIFIER", `${LETTERDASHNUMBER}+`);
    createToken("BUILD", `(?:\\+(${src[t.BUILDIDENTIFIER]}(?:\\.${src[t.BUILDIDENTIFIER]})*))`);
    createToken("FULLPLAIN", `v?${src[t.MAINVERSION]}${src[t.PRERELEASE]}?${src[t.BUILD]}?`);
    createToken("FULL", `^${src[t.FULLPLAIN]}$`);
    createToken("LOOSEPLAIN", `[v=\\s]*${src[t.MAINVERSIONLOOSE]}${src[t.PRERELEASELOOSE]}?${src[t.BUILD]}?`);
    createToken("LOOSE", `^${src[t.LOOSEPLAIN]}$`);
    createToken("GTLT", "((?:<|>)?=?)");
    createToken("XRANGEIDENTIFIERLOOSE", `${src[t.NUMERICIDENTIFIERLOOSE]}|x|X|\\*`);
    createToken("XRANGEIDENTIFIER", `${src[t.NUMERICIDENTIFIER]}|x|X|\\*`);
    createToken("XRANGEPLAIN", `[v=\\s]*(${src[t.XRANGEIDENTIFIER]})(?:\\.(${src[t.XRANGEIDENTIFIER]})(?:\\.(${src[t.XRANGEIDENTIFIER]})(?:${src[t.PRERELEASE]})?${src[t.BUILD]}?)?)?`);
    createToken("XRANGEPLAINLOOSE", `[v=\\s]*(${src[t.XRANGEIDENTIFIERLOOSE]})(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})(?:${src[t.PRERELEASELOOSE]})?${src[t.BUILD]}?)?)?`);
    createToken("XRANGE", `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAIN]}$`);
    createToken("XRANGELOOSE", `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAINLOOSE]}$`);
    createToken("COERCEPLAIN", `${"(^|[^\\d])(\\d{1,"}${MAX_SAFE_COMPONENT_LENGTH}})(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?`);
    createToken("COERCE", `${src[t.COERCEPLAIN]}(?:$|[^\\d])`);
    createToken("COERCEFULL", src[t.COERCEPLAIN] + `(?:${src[t.PRERELEASE]})?(?:${src[t.BUILD]})?(?:$|[^\\d])`);
    createToken("COERCERTL", src[t.COERCE], true);
    createToken("COERCERTLFULL", src[t.COERCEFULL], true);
    createToken("LONETILDE", "(?:~>?)");
    createToken("TILDETRIM", `(\\s*)${src[t.LONETILDE]}\\s+`, true);
    exports.tildeTrimReplace = "$1~";
    createToken("TILDE", `^${src[t.LONETILDE]}${src[t.XRANGEPLAIN]}$`);
    createToken("TILDELOOSE", `^${src[t.LONETILDE]}${src[t.XRANGEPLAINLOOSE]}$`);
    createToken("LONECARET", "(?:\\^)");
    createToken("CARETTRIM", `(\\s*)${src[t.LONECARET]}\\s+`, true);
    exports.caretTrimReplace = "$1^";
    createToken("CARET", `^${src[t.LONECARET]}${src[t.XRANGEPLAIN]}$`);
    createToken("CARETLOOSE", `^${src[t.LONECARET]}${src[t.XRANGEPLAINLOOSE]}$`);
    createToken("COMPARATORLOOSE", `^${src[t.GTLT]}\\s*(${src[t.LOOSEPLAIN]})$|^$`);
    createToken("COMPARATOR", `^${src[t.GTLT]}\\s*(${src[t.FULLPLAIN]})$|^$`);
    createToken("COMPARATORTRIM", `(\\s*)${src[t.GTLT]}\\s*(${src[t.LOOSEPLAIN]}|${src[t.XRANGEPLAIN]})`, true);
    exports.comparatorTrimReplace = "$1$2$3";
    createToken("HYPHENRANGE", `^\\s*(${src[t.XRANGEPLAIN]})\\s+-\\s+(${src[t.XRANGEPLAIN]})\\s*$`);
    createToken("HYPHENRANGELOOSE", `^\\s*(${src[t.XRANGEPLAINLOOSE]})\\s+-\\s+(${src[t.XRANGEPLAINLOOSE]})\\s*$`);
    createToken("STAR", "(<|>)?=?\\s*\\*");
    createToken("GTE0", "^\\s*>=\\s*0\\.0\\.0\\s*$");
    createToken("GTE0PRE", "^\\s*>=\\s*0\\.0\\.0-0\\s*$");
  })(re, re.exports);
  return re.exports;
}
var parseOptions_1;
var hasRequiredParseOptions;
function requireParseOptions() {
  if (hasRequiredParseOptions) return parseOptions_1;
  hasRequiredParseOptions = 1;
  const looseOption = Object.freeze({ loose: true });
  const emptyOpts = Object.freeze({});
  const parseOptions = (options) => {
    if (!options) {
      return emptyOpts;
    }
    if (typeof options !== "object") {
      return looseOption;
    }
    return options;
  };
  parseOptions_1 = parseOptions;
  return parseOptions_1;
}
var identifiers;
var hasRequiredIdentifiers;
function requireIdentifiers() {
  if (hasRequiredIdentifiers) return identifiers;
  hasRequiredIdentifiers = 1;
  const numeric = /^[0-9]+$/;
  const compareIdentifiers = (a, b) => {
    if (typeof a === "number" && typeof b === "number") {
      return a === b ? 0 : a < b ? -1 : 1;
    }
    const anum = numeric.test(a);
    const bnum = numeric.test(b);
    if (anum && bnum) {
      a = +a;
      b = +b;
    }
    return a === b ? 0 : anum && !bnum ? -1 : bnum && !anum ? 1 : a < b ? -1 : 1;
  };
  const rcompareIdentifiers = (a, b) => compareIdentifiers(b, a);
  identifiers = {
    compareIdentifiers,
    rcompareIdentifiers
  };
  return identifiers;
}
var semver$2;
var hasRequiredSemver$2;
function requireSemver$2() {
  if (hasRequiredSemver$2) return semver$2;
  hasRequiredSemver$2 = 1;
  const debug = requireDebug();
  const { MAX_LENGTH, MAX_SAFE_INTEGER } = requireConstants();
  const { safeRe: re2, t } = requireRe();
  const parseOptions = requireParseOptions();
  const { compareIdentifiers } = requireIdentifiers();
  const isPrereleaseIdentifier = (prerelease, identifier) => {
    const identifiers2 = identifier.split(".");
    if (identifiers2.length > prerelease.length) {
      return false;
    }
    for (let i = 0; i < identifiers2.length; i++) {
      if (compareIdentifiers(prerelease[i], identifiers2[i]) !== 0) {
        return false;
      }
    }
    return true;
  };
  class SemVer {
    constructor(version, options) {
      options = parseOptions(options);
      if (version instanceof SemVer) {
        if (version.loose === !!options.loose && version.includePrerelease === !!options.includePrerelease) {
          return version;
        } else {
          version = version.version;
        }
      } else if (typeof version !== "string") {
        throw new TypeError(`Invalid version. Must be a string. Got type "${typeof version}".`);
      }
      if (version.length > MAX_LENGTH) {
        throw new TypeError(
          `version is longer than ${MAX_LENGTH} characters`
        );
      }
      debug("SemVer", version, options);
      this.options = options;
      this.loose = !!options.loose;
      this.includePrerelease = !!options.includePrerelease;
      const m = version.trim().match(options.loose ? re2[t.LOOSE] : re2[t.FULL]);
      if (!m) {
        throw new TypeError(`Invalid Version: ${version}`);
      }
      this.raw = version;
      this.major = +m[1];
      this.minor = +m[2];
      this.patch = +m[3];
      if (this.major > MAX_SAFE_INTEGER || this.major < 0) {
        throw new TypeError("Invalid major version");
      }
      if (this.minor > MAX_SAFE_INTEGER || this.minor < 0) {
        throw new TypeError("Invalid minor version");
      }
      if (this.patch > MAX_SAFE_INTEGER || this.patch < 0) {
        throw new TypeError("Invalid patch version");
      }
      if (!m[4]) {
        this.prerelease = [];
      } else {
        this.prerelease = m[4].split(".").map((id2) => {
          if (/^[0-9]+$/.test(id2)) {
            const num = +id2;
            if (num >= 0 && num < MAX_SAFE_INTEGER) {
              return num;
            }
          }
          return id2;
        });
      }
      this.build = m[5] ? m[5].split(".") : [];
      this.format();
    }
    format() {
      this.version = `${this.major}.${this.minor}.${this.patch}`;
      if (this.prerelease.length) {
        this.version += `-${this.prerelease.join(".")}`;
      }
      return this.version;
    }
    toString() {
      return this.version;
    }
    compare(other) {
      debug("SemVer.compare", this.version, this.options, other);
      if (!(other instanceof SemVer)) {
        if (typeof other === "string" && other === this.version) {
          return 0;
        }
        other = new SemVer(other, this.options);
      }
      if (other.version === this.version) {
        return 0;
      }
      return this.compareMain(other) || this.comparePre(other);
    }
    compareMain(other) {
      if (!(other instanceof SemVer)) {
        other = new SemVer(other, this.options);
      }
      if (this.major < other.major) {
        return -1;
      }
      if (this.major > other.major) {
        return 1;
      }
      if (this.minor < other.minor) {
        return -1;
      }
      if (this.minor > other.minor) {
        return 1;
      }
      if (this.patch < other.patch) {
        return -1;
      }
      if (this.patch > other.patch) {
        return 1;
      }
      return 0;
    }
    comparePre(other) {
      if (!(other instanceof SemVer)) {
        other = new SemVer(other, this.options);
      }
      if (this.prerelease.length && !other.prerelease.length) {
        return -1;
      } else if (!this.prerelease.length && other.prerelease.length) {
        return 1;
      } else if (!this.prerelease.length && !other.prerelease.length) {
        return 0;
      }
      let i = 0;
      do {
        const a = this.prerelease[i];
        const b = other.prerelease[i];
        debug("prerelease compare", i, a, b);
        if (a === void 0 && b === void 0) {
          return 0;
        } else if (b === void 0) {
          return 1;
        } else if (a === void 0) {
          return -1;
        } else if (a === b) {
          continue;
        } else {
          return compareIdentifiers(a, b);
        }
      } while (++i);
    }
    compareBuild(other) {
      if (!(other instanceof SemVer)) {
        other = new SemVer(other, this.options);
      }
      let i = 0;
      do {
        const a = this.build[i];
        const b = other.build[i];
        debug("build compare", i, a, b);
        if (a === void 0 && b === void 0) {
          return 0;
        } else if (b === void 0) {
          return 1;
        } else if (a === void 0) {
          return -1;
        } else if (a === b) {
          continue;
        } else {
          return compareIdentifiers(a, b);
        }
      } while (++i);
    }
    // preminor will bump the version up to the next minor release, and immediately
    // down to pre-release. premajor and prepatch work the same way.
    inc(release, identifier, identifierBase) {
      if (release.startsWith("pre")) {
        if (!identifier && identifierBase === false) {
          throw new Error("invalid increment argument: identifier is empty");
        }
        if (identifier) {
          const match = `-${identifier}`.match(this.options.loose ? re2[t.PRERELEASELOOSE] : re2[t.PRERELEASE]);
          if (!match || match[1] !== identifier) {
            throw new Error(`invalid identifier: ${identifier}`);
          }
        }
      }
      switch (release) {
        case "premajor":
          this.prerelease.length = 0;
          this.patch = 0;
          this.minor = 0;
          this.major++;
          this.inc("pre", identifier, identifierBase);
          break;
        case "preminor":
          this.prerelease.length = 0;
          this.patch = 0;
          this.minor++;
          this.inc("pre", identifier, identifierBase);
          break;
        case "prepatch":
          this.prerelease.length = 0;
          this.inc("patch", identifier, identifierBase);
          this.inc("pre", identifier, identifierBase);
          break;
        // If the input is a non-prerelease version, this acts the same as
        // prepatch.
        case "prerelease":
          if (this.prerelease.length === 0) {
            this.inc("patch", identifier, identifierBase);
          }
          this.inc("pre", identifier, identifierBase);
          break;
        case "release":
          if (this.prerelease.length === 0) {
            throw new Error(`version ${this.raw} is not a prerelease`);
          }
          this.prerelease.length = 0;
          break;
        case "major":
          if (this.minor !== 0 || this.patch !== 0 || this.prerelease.length === 0) {
            this.major++;
          }
          this.minor = 0;
          this.patch = 0;
          this.prerelease = [];
          break;
        case "minor":
          if (this.patch !== 0 || this.prerelease.length === 0) {
            this.minor++;
          }
          this.patch = 0;
          this.prerelease = [];
          break;
        case "patch":
          if (this.prerelease.length === 0) {
            this.patch++;
          }
          this.prerelease = [];
          break;
        // This probably shouldn't be used publicly.
        // 1.0.0 'pre' would become 1.0.0-0 which is the wrong direction.
        case "pre": {
          const base = Number(identifierBase) ? 1 : 0;
          if (this.prerelease.length === 0) {
            this.prerelease = [base];
          } else {
            let i = this.prerelease.length;
            while (--i >= 0) {
              if (typeof this.prerelease[i] === "number") {
                this.prerelease[i]++;
                i = -2;
              }
            }
            if (i === -1) {
              if (identifier === this.prerelease.join(".") && identifierBase === false) {
                throw new Error("invalid increment argument: identifier already exists");
              }
              this.prerelease.push(base);
            }
          }
          if (identifier) {
            let prerelease = [identifier, base];
            if (identifierBase === false) {
              prerelease = [identifier];
            }
            if (isPrereleaseIdentifier(this.prerelease, identifier)) {
              const prereleaseBase = this.prerelease[identifier.split(".").length];
              if (isNaN(prereleaseBase)) {
                this.prerelease = prerelease;
              }
            } else {
              this.prerelease = prerelease;
            }
          }
          break;
        }
        default:
          throw new Error(`invalid increment argument: ${release}`);
      }
      this.raw = this.format();
      if (this.build.length) {
        this.raw += `+${this.build.join(".")}`;
      }
      return this;
    }
  }
  semver$2 = SemVer;
  return semver$2;
}
var parse_1;
var hasRequiredParse;
function requireParse() {
  if (hasRequiredParse) return parse_1;
  hasRequiredParse = 1;
  const SemVer = requireSemver$2();
  const parse = (version, options, throwErrors = false) => {
    if (version instanceof SemVer) {
      return version;
    }
    try {
      return new SemVer(version, options);
    } catch (er) {
      if (!throwErrors) {
        return null;
      }
      throw er;
    }
  };
  parse_1 = parse;
  return parse_1;
}
var valid_1;
var hasRequiredValid$1;
function requireValid$1() {
  if (hasRequiredValid$1) return valid_1;
  hasRequiredValid$1 = 1;
  const parse = requireParse();
  const valid2 = (version, options) => {
    const v = parse(version, options);
    return v ? v.version : null;
  };
  valid_1 = valid2;
  return valid_1;
}
var clean_1;
var hasRequiredClean;
function requireClean() {
  if (hasRequiredClean) return clean_1;
  hasRequiredClean = 1;
  const parse = requireParse();
  const clean = (version, options) => {
    const s = parse(version.trim().replace(/^[=v]+/, ""), options);
    return s ? s.version : null;
  };
  clean_1 = clean;
  return clean_1;
}
var inc_1;
var hasRequiredInc;
function requireInc() {
  if (hasRequiredInc) return inc_1;
  hasRequiredInc = 1;
  const SemVer = requireSemver$2();
  const inc = (version, release, options, identifier, identifierBase) => {
    if (typeof options === "string") {
      identifierBase = identifier;
      identifier = options;
      options = void 0;
    }
    try {
      return new SemVer(
        version instanceof SemVer ? version.version : version,
        options
      ).inc(release, identifier, identifierBase).version;
    } catch (er) {
      return null;
    }
  };
  inc_1 = inc;
  return inc_1;
}
var diff_1;
var hasRequiredDiff;
function requireDiff() {
  if (hasRequiredDiff) return diff_1;
  hasRequiredDiff = 1;
  const parse = requireParse();
  const diff = (version1, version2) => {
    const v1 = parse(version1, null, true);
    const v2 = parse(version2, null, true);
    const comparison = v1.compare(v2);
    if (comparison === 0) {
      return null;
    }
    const v1Higher = comparison > 0;
    const highVersion = v1Higher ? v1 : v2;
    const lowVersion = v1Higher ? v2 : v1;
    const highHasPre = !!highVersion.prerelease.length;
    const lowHasPre = !!lowVersion.prerelease.length;
    if (lowHasPre && !highHasPre) {
      if (!lowVersion.patch && !lowVersion.minor) {
        return "major";
      }
      if (lowVersion.compareMain(highVersion) === 0) {
        if (lowVersion.minor && !lowVersion.patch) {
          return "minor";
        }
        return "patch";
      }
    }
    const prefix = highHasPre ? "pre" : "";
    if (v1.major !== v2.major) {
      return prefix + "major";
    }
    if (v1.minor !== v2.minor) {
      return prefix + "minor";
    }
    if (v1.patch !== v2.patch) {
      return prefix + "patch";
    }
    return "prerelease";
  };
  diff_1 = diff;
  return diff_1;
}
var major_1;
var hasRequiredMajor;
function requireMajor() {
  if (hasRequiredMajor) return major_1;
  hasRequiredMajor = 1;
  const SemVer = requireSemver$2();
  const major = (a, loose) => new SemVer(a, loose).major;
  major_1 = major;
  return major_1;
}
var minor_1;
var hasRequiredMinor;
function requireMinor() {
  if (hasRequiredMinor) return minor_1;
  hasRequiredMinor = 1;
  const SemVer = requireSemver$2();
  const minor = (a, loose) => new SemVer(a, loose).minor;
  minor_1 = minor;
  return minor_1;
}
var patch_1;
var hasRequiredPatch;
function requirePatch() {
  if (hasRequiredPatch) return patch_1;
  hasRequiredPatch = 1;
  const SemVer = requireSemver$2();
  const patch = (a, loose) => new SemVer(a, loose).patch;
  patch_1 = patch;
  return patch_1;
}
var prerelease_1;
var hasRequiredPrerelease;
function requirePrerelease() {
  if (hasRequiredPrerelease) return prerelease_1;
  hasRequiredPrerelease = 1;
  const parse = requireParse();
  const prerelease = (version, options) => {
    const parsed = parse(version, options);
    return parsed && parsed.prerelease.length ? parsed.prerelease : null;
  };
  prerelease_1 = prerelease;
  return prerelease_1;
}
var compare_1;
var hasRequiredCompare;
function requireCompare() {
  if (hasRequiredCompare) return compare_1;
  hasRequiredCompare = 1;
  const SemVer = requireSemver$2();
  const compare = (a, b, loose) => new SemVer(a, loose).compare(new SemVer(b, loose));
  compare_1 = compare;
  return compare_1;
}
var rcompare_1;
var hasRequiredRcompare;
function requireRcompare() {
  if (hasRequiredRcompare) return rcompare_1;
  hasRequiredRcompare = 1;
  const compare = requireCompare();
  const rcompare = (a, b, loose) => compare(b, a, loose);
  rcompare_1 = rcompare;
  return rcompare_1;
}
var compareLoose_1;
var hasRequiredCompareLoose;
function requireCompareLoose() {
  if (hasRequiredCompareLoose) return compareLoose_1;
  hasRequiredCompareLoose = 1;
  const compare = requireCompare();
  const compareLoose = (a, b) => compare(a, b, true);
  compareLoose_1 = compareLoose;
  return compareLoose_1;
}
var compareBuild_1;
var hasRequiredCompareBuild;
function requireCompareBuild() {
  if (hasRequiredCompareBuild) return compareBuild_1;
  hasRequiredCompareBuild = 1;
  const SemVer = requireSemver$2();
  const compareBuild = (a, b, loose) => {
    const versionA = new SemVer(a, loose);
    const versionB = new SemVer(b, loose);
    return versionA.compare(versionB) || versionA.compareBuild(versionB);
  };
  compareBuild_1 = compareBuild;
  return compareBuild_1;
}
var sort_1;
var hasRequiredSort;
function requireSort() {
  if (hasRequiredSort) return sort_1;
  hasRequiredSort = 1;
  const compareBuild = requireCompareBuild();
  const sort = (list, loose) => list.sort((a, b) => compareBuild(a, b, loose));
  sort_1 = sort;
  return sort_1;
}
var rsort_1;
var hasRequiredRsort;
function requireRsort() {
  if (hasRequiredRsort) return rsort_1;
  hasRequiredRsort = 1;
  const compareBuild = requireCompareBuild();
  const rsort = (list, loose) => list.sort((a, b) => compareBuild(b, a, loose));
  rsort_1 = rsort;
  return rsort_1;
}
var gt_1;
var hasRequiredGt;
function requireGt() {
  if (hasRequiredGt) return gt_1;
  hasRequiredGt = 1;
  const compare = requireCompare();
  const gt = (a, b, loose) => compare(a, b, loose) > 0;
  gt_1 = gt;
  return gt_1;
}
var lt_1;
var hasRequiredLt;
function requireLt() {
  if (hasRequiredLt) return lt_1;
  hasRequiredLt = 1;
  const compare = requireCompare();
  const lt = (a, b, loose) => compare(a, b, loose) < 0;
  lt_1 = lt;
  return lt_1;
}
var eq_1;
var hasRequiredEq;
function requireEq() {
  if (hasRequiredEq) return eq_1;
  hasRequiredEq = 1;
  const compare = requireCompare();
  const eq = (a, b, loose) => compare(a, b, loose) === 0;
  eq_1 = eq;
  return eq_1;
}
var neq_1;
var hasRequiredNeq;
function requireNeq() {
  if (hasRequiredNeq) return neq_1;
  hasRequiredNeq = 1;
  const compare = requireCompare();
  const neq = (a, b, loose) => compare(a, b, loose) !== 0;
  neq_1 = neq;
  return neq_1;
}
var gte_1;
var hasRequiredGte;
function requireGte() {
  if (hasRequiredGte) return gte_1;
  hasRequiredGte = 1;
  const compare = requireCompare();
  const gte = (a, b, loose) => compare(a, b, loose) >= 0;
  gte_1 = gte;
  return gte_1;
}
var lte_1;
var hasRequiredLte;
function requireLte() {
  if (hasRequiredLte) return lte_1;
  hasRequiredLte = 1;
  const compare = requireCompare();
  const lte = (a, b, loose) => compare(a, b, loose) <= 0;
  lte_1 = lte;
  return lte_1;
}
var cmp_1;
var hasRequiredCmp;
function requireCmp() {
  if (hasRequiredCmp) return cmp_1;
  hasRequiredCmp = 1;
  const eq = requireEq();
  const neq = requireNeq();
  const gt = requireGt();
  const gte = requireGte();
  const lt = requireLt();
  const lte = requireLte();
  const cmp = (a, op, b, loose) => {
    switch (op) {
      case "===":
        if (typeof a === "object") {
          a = a.version;
        }
        if (typeof b === "object") {
          b = b.version;
        }
        return a === b;
      case "!==":
        if (typeof a === "object") {
          a = a.version;
        }
        if (typeof b === "object") {
          b = b.version;
        }
        return a !== b;
      case "":
      case "=":
      case "==":
        return eq(a, b, loose);
      case "!=":
        return neq(a, b, loose);
      case ">":
        return gt(a, b, loose);
      case ">=":
        return gte(a, b, loose);
      case "<":
        return lt(a, b, loose);
      case "<=":
        return lte(a, b, loose);
      default:
        throw new TypeError(`Invalid operator: ${op}`);
    }
  };
  cmp_1 = cmp;
  return cmp_1;
}
var coerce_1;
var hasRequiredCoerce;
function requireCoerce() {
  if (hasRequiredCoerce) return coerce_1;
  hasRequiredCoerce = 1;
  const SemVer = requireSemver$2();
  const parse = requireParse();
  const { safeRe: re2, t } = requireRe();
  const coerce = (version, options) => {
    if (version instanceof SemVer) {
      return version;
    }
    if (typeof version === "number") {
      version = String(version);
    }
    if (typeof version !== "string") {
      return null;
    }
    options = options || {};
    let match = null;
    if (!options.rtl) {
      match = version.match(options.includePrerelease ? re2[t.COERCEFULL] : re2[t.COERCE]);
    } else {
      const coerceRtlRegex = options.includePrerelease ? re2[t.COERCERTLFULL] : re2[t.COERCERTL];
      let next;
      while ((next = coerceRtlRegex.exec(version)) && (!match || match.index + match[0].length !== version.length)) {
        if (!match || next.index + next[0].length !== match.index + match[0].length) {
          match = next;
        }
        coerceRtlRegex.lastIndex = next.index + next[1].length + next[2].length;
      }
      coerceRtlRegex.lastIndex = -1;
    }
    if (match === null) {
      return null;
    }
    const major = match[2];
    const minor = match[3] || "0";
    const patch = match[4] || "0";
    const prerelease = options.includePrerelease && match[5] ? `-${match[5]}` : "";
    const build = options.includePrerelease && match[6] ? `+${match[6]}` : "";
    return parse(`${major}.${minor}.${patch}${prerelease}${build}`, options);
  };
  coerce_1 = coerce;
  return coerce_1;
}
var truncate_1;
var hasRequiredTruncate;
function requireTruncate() {
  if (hasRequiredTruncate) return truncate_1;
  hasRequiredTruncate = 1;
  const parse = requireParse();
  const constants2 = requireConstants();
  const SemVer = requireSemver$2();
  const truncate = (version, truncation, options) => {
    if (!constants2.RELEASE_TYPES.includes(truncation)) {
      return null;
    }
    const clonedVersion = cloneInputVersion(version, options);
    return clonedVersion && doTruncation(clonedVersion, truncation);
  };
  const cloneInputVersion = (version, options) => {
    const versionStringToParse = version instanceof SemVer ? version.version : version;
    return parse(versionStringToParse, options);
  };
  const doTruncation = (version, truncation) => {
    if (isPrerelease(truncation)) {
      return version.version;
    }
    version.prerelease = [];
    switch (truncation) {
      case "major":
        version.minor = 0;
        version.patch = 0;
        break;
      case "minor":
        version.patch = 0;
        break;
    }
    return version.format();
  };
  const isPrerelease = (type) => {
    return type.startsWith("pre");
  };
  truncate_1 = truncate;
  return truncate_1;
}
var lrucache;
var hasRequiredLrucache;
function requireLrucache() {
  if (hasRequiredLrucache) return lrucache;
  hasRequiredLrucache = 1;
  class LRUCache {
    constructor() {
      this.max = 1e3;
      this.map = /* @__PURE__ */ new Map();
    }
    get(key) {
      const value = this.map.get(key);
      if (value === void 0) {
        return void 0;
      } else {
        this.map.delete(key);
        this.map.set(key, value);
        return value;
      }
    }
    delete(key) {
      return this.map.delete(key);
    }
    set(key, value) {
      const deleted = this.delete(key);
      if (!deleted && value !== void 0) {
        if (this.map.size >= this.max) {
          const firstKey = this.map.keys().next().value;
          this.delete(firstKey);
        }
        this.map.set(key, value);
      }
      return this;
    }
  }
  lrucache = LRUCache;
  return lrucache;
}
var range;
var hasRequiredRange;
function requireRange() {
  if (hasRequiredRange) return range;
  hasRequiredRange = 1;
  const SPACE_CHARACTERS = /\s+/g;
  class Range {
    constructor(range2, options) {
      options = parseOptions(options);
      if (range2 instanceof Range) {
        if (range2.loose === !!options.loose && range2.includePrerelease === !!options.includePrerelease) {
          return range2;
        } else {
          return new Range(range2.raw, options);
        }
      }
      if (range2 instanceof Comparator) {
        this.raw = range2.value;
        this.set = [[range2]];
        this.formatted = void 0;
        return this;
      }
      this.options = options;
      this.loose = !!options.loose;
      this.includePrerelease = !!options.includePrerelease;
      this.raw = range2.trim().replace(SPACE_CHARACTERS, " ");
      this.set = this.raw.split("||").map((r) => this.parseRange(r.trim())).filter((c) => c.length);
      if (!this.set.length) {
        throw new TypeError(`Invalid SemVer Range: ${this.raw}`);
      }
      if (this.set.length > 1) {
        const first = this.set[0];
        this.set = this.set.filter((c) => !isNullSet(c[0]));
        if (this.set.length === 0) {
          this.set = [first];
        } else if (this.set.length > 1) {
          for (const c of this.set) {
            if (c.length === 1 && isAny(c[0])) {
              this.set = [c];
              break;
            }
          }
        }
      }
      this.formatted = void 0;
    }
    get range() {
      if (this.formatted === void 0) {
        this.formatted = "";
        for (let i = 0; i < this.set.length; i++) {
          if (i > 0) {
            this.formatted += "||";
          }
          const comps = this.set[i];
          for (let k = 0; k < comps.length; k++) {
            if (k > 0) {
              this.formatted += " ";
            }
            this.formatted += comps[k].toString().trim();
          }
        }
      }
      return this.formatted;
    }
    format() {
      return this.range;
    }
    toString() {
      return this.range;
    }
    parseRange(range2) {
      range2 = range2.replace(BUILDSTRIPRE, "");
      const memoOpts = (this.options.includePrerelease && FLAG_INCLUDE_PRERELEASE) | (this.options.loose && FLAG_LOOSE);
      const memoKey = memoOpts + ":" + range2;
      const cached = cache.get(memoKey);
      if (cached) {
        return cached;
      }
      const loose = this.options.loose;
      const hr = loose ? re2[t.HYPHENRANGELOOSE] : re2[t.HYPHENRANGE];
      range2 = range2.replace(hr, hyphenReplace(this.options.includePrerelease));
      debug("hyphen replace", range2);
      range2 = range2.replace(re2[t.COMPARATORTRIM], comparatorTrimReplace);
      debug("comparator trim", range2);
      range2 = range2.replace(re2[t.TILDETRIM], tildeTrimReplace);
      debug("tilde trim", range2);
      range2 = range2.replace(re2[t.CARETTRIM], caretTrimReplace);
      debug("caret trim", range2);
      let rangeList = range2.split(" ").map((comp) => parseComparator(comp, this.options)).join(" ").split(/\s+/).map((comp) => replaceGTE0(comp, this.options));
      if (loose) {
        rangeList = rangeList.filter((comp) => {
          debug("loose invalid filter", comp, this.options);
          return !!comp.match(re2[t.COMPARATORLOOSE]);
        });
      }
      debug("range list", rangeList);
      const rangeMap = /* @__PURE__ */ new Map();
      const comparators = rangeList.map((comp) => new Comparator(comp, this.options));
      for (const comp of comparators) {
        if (isNullSet(comp)) {
          return [comp];
        }
        rangeMap.set(comp.value, comp);
      }
      if (rangeMap.size > 1 && rangeMap.has("")) {
        rangeMap.delete("");
      }
      const result = [...rangeMap.values()];
      cache.set(memoKey, result);
      return result;
    }
    intersects(range2, options) {
      if (!(range2 instanceof Range)) {
        throw new TypeError("a Range is required");
      }
      return this.set.some((thisComparators) => {
        return isSatisfiable(thisComparators, options) && range2.set.some((rangeComparators) => {
          return isSatisfiable(rangeComparators, options) && thisComparators.every((thisComparator) => {
            return rangeComparators.every((rangeComparator) => {
              return thisComparator.intersects(rangeComparator, options);
            });
          });
        });
      });
    }
    // if ANY of the sets match ALL of its comparators, then pass
    test(version) {
      if (!version) {
        return false;
      }
      if (typeof version === "string") {
        try {
          version = new SemVer(version, this.options);
        } catch (er) {
          return false;
        }
      }
      for (let i = 0; i < this.set.length; i++) {
        if (testSet(this.set[i], version, this.options)) {
          return true;
        }
      }
      return false;
    }
  }
  range = Range;
  const LRU = requireLrucache();
  const cache = new LRU();
  const parseOptions = requireParseOptions();
  const Comparator = requireComparator();
  const debug = requireDebug();
  const SemVer = requireSemver$2();
  const {
    safeRe: re2,
    src,
    t,
    comparatorTrimReplace,
    tildeTrimReplace,
    caretTrimReplace
  } = requireRe();
  const { FLAG_INCLUDE_PRERELEASE, FLAG_LOOSE } = requireConstants();
  const BUILDSTRIPRE = new RegExp(src[t.BUILD], "g");
  const isNullSet = (c) => c.value === "<0.0.0-0";
  const isAny = (c) => c.value === "";
  const isSatisfiable = (comparators, options) => {
    let result = true;
    const remainingComparators = comparators.slice();
    let testComparator = remainingComparators.pop();
    while (result && remainingComparators.length) {
      result = remainingComparators.every((otherComparator) => {
        return testComparator.intersects(otherComparator, options);
      });
      testComparator = remainingComparators.pop();
    }
    return result;
  };
  const parseComparator = (comp, options) => {
    comp = comp.replace(re2[t.BUILD], "");
    debug("comp", comp, options);
    comp = replaceCarets(comp, options);
    debug("caret", comp);
    comp = replaceTildes(comp, options);
    debug("tildes", comp);
    comp = replaceXRanges(comp, options);
    debug("xrange", comp);
    comp = replaceStars(comp, options);
    debug("stars", comp);
    return comp;
  };
  const isX = (id2) => !id2 || id2.toLowerCase() === "x" || id2 === "*";
  const invalidXRangeOrder = (M, m, p) => isX(M) && !isX(m) || isX(m) && p && !isX(p);
  const replaceTildes = (comp, options) => {
    return comp.trim().split(/\s+/).map((c) => replaceTilde(c, options)).join(" ");
  };
  const replaceTilde = (comp, options) => {
    const r = options.loose ? re2[t.TILDELOOSE] : re2[t.TILDE];
    const z2 = options.includePrerelease ? "-0" : "";
    return comp.replace(r, (_, M, m, p, pr) => {
      debug("tilde", comp, _, M, m, p, pr);
      let ret;
      if (isX(M)) {
        ret = "";
      } else if (isX(m)) {
        ret = `>=${M}.0.0${z2} <${+M + 1}.0.0-0`;
      } else if (isX(p)) {
        ret = `>=${M}.${m}.0${z2} <${M}.${+m + 1}.0-0`;
      } else if (pr) {
        debug("replaceTilde pr", pr);
        ret = `>=${M}.${m}.${p}-${pr} <${M}.${+m + 1}.0-0`;
      } else {
        ret = `>=${M}.${m}.${p} <${M}.${+m + 1}.0-0`;
      }
      debug("tilde return", ret);
      return ret;
    });
  };
  const replaceCarets = (comp, options) => {
    return comp.trim().split(/\s+/).map((c) => replaceCaret(c, options)).join(" ");
  };
  const replaceCaret = (comp, options) => {
    debug("caret", comp, options);
    const r = options.loose ? re2[t.CARETLOOSE] : re2[t.CARET];
    const z2 = options.includePrerelease ? "-0" : "";
    return comp.replace(r, (_, M, m, p, pr) => {
      debug("caret", comp, _, M, m, p, pr);
      let ret;
      if (isX(M)) {
        ret = "";
      } else if (isX(m)) {
        ret = `>=${M}.0.0${z2} <${+M + 1}.0.0-0`;
      } else if (isX(p)) {
        if (M === "0") {
          ret = `>=${M}.${m}.0${z2} <${M}.${+m + 1}.0-0`;
        } else {
          ret = `>=${M}.${m}.0${z2} <${+M + 1}.0.0-0`;
        }
      } else if (pr) {
        debug("replaceCaret pr", pr);
        if (M === "0") {
          if (m === "0") {
            ret = `>=${M}.${m}.${p}-${pr} <${M}.${m}.${+p + 1}-0`;
          } else {
            ret = `>=${M}.${m}.${p}-${pr} <${M}.${+m + 1}.0-0`;
          }
        } else {
          ret = `>=${M}.${m}.${p}-${pr} <${+M + 1}.0.0-0`;
        }
      } else {
        debug("no pr");
        if (M === "0") {
          if (m === "0") {
            ret = `>=${M}.${m}.${p} <${M}.${m}.${+p + 1}-0`;
          } else {
            ret = `>=${M}.${m}.${p} <${M}.${+m + 1}.0-0`;
          }
        } else {
          ret = `>=${M}.${m}.${p} <${+M + 1}.0.0-0`;
        }
      }
      debug("caret return", ret);
      return ret;
    });
  };
  const replaceXRanges = (comp, options) => {
    debug("replaceXRanges", comp, options);
    return comp.split(/\s+/).map((c) => replaceXRange(c, options)).join(" ");
  };
  const replaceXRange = (comp, options) => {
    comp = comp.trim();
    const r = options.loose ? re2[t.XRANGELOOSE] : re2[t.XRANGE];
    return comp.replace(r, (ret, gtlt, M, m, p, pr) => {
      debug("xRange", comp, ret, gtlt, M, m, p, pr);
      if (invalidXRangeOrder(M, m, p)) {
        return comp;
      }
      const xM = isX(M);
      const xm = xM || isX(m);
      const xp = xm || isX(p);
      const anyX = xp;
      if (gtlt === "=" && anyX) {
        gtlt = "";
      }
      pr = options.includePrerelease ? "-0" : "";
      if (xM) {
        if (gtlt === ">" || gtlt === "<") {
          ret = "<0.0.0-0";
        } else {
          ret = "*";
        }
      } else if (gtlt && anyX) {
        if (xm) {
          m = 0;
        }
        p = 0;
        if (gtlt === ">") {
          gtlt = ">=";
          if (xm) {
            M = +M + 1;
            m = 0;
            p = 0;
          } else {
            m = +m + 1;
            p = 0;
          }
        } else if (gtlt === "<=") {
          gtlt = "<";
          if (xm) {
            M = +M + 1;
          } else {
            m = +m + 1;
          }
        }
        if (gtlt === "<") {
          pr = "-0";
        }
        ret = `${gtlt + M}.${m}.${p}${pr}`;
      } else if (xm) {
        ret = `>=${M}.0.0${pr} <${+M + 1}.0.0-0`;
      } else if (xp) {
        ret = `>=${M}.${m}.0${pr} <${M}.${+m + 1}.0-0`;
      }
      debug("xRange return", ret);
      return ret;
    });
  };
  const replaceStars = (comp, options) => {
    debug("replaceStars", comp, options);
    return comp.trim().replace(re2[t.STAR], "");
  };
  const replaceGTE0 = (comp, options) => {
    debug("replaceGTE0", comp, options);
    return comp.trim().replace(re2[options.includePrerelease ? t.GTE0PRE : t.GTE0], "");
  };
  const hyphenReplace = (incPr) => ($0, from, fM, fm, fp, fpr, fb, to, tM, tm, tp, tpr) => {
    if (isX(fM)) {
      from = "";
    } else if (isX(fm)) {
      from = `>=${fM}.0.0${incPr ? "-0" : ""}`;
    } else if (isX(fp)) {
      from = `>=${fM}.${fm}.0${incPr ? "-0" : ""}`;
    } else if (fpr) {
      from = `>=${from}`;
    } else {
      from = `>=${from}${incPr ? "-0" : ""}`;
    }
    if (isX(tM)) {
      to = "";
    } else if (isX(tm)) {
      to = `<${+tM + 1}.0.0-0`;
    } else if (isX(tp)) {
      to = `<${tM}.${+tm + 1}.0-0`;
    } else if (tpr) {
      to = `<=${tM}.${tm}.${tp}-${tpr}`;
    } else if (incPr) {
      to = `<${tM}.${tm}.${+tp + 1}-0`;
    } else {
      to = `<=${to}`;
    }
    return `${from} ${to}`.trim();
  };
  const testSet = (set, version, options) => {
    for (let i = 0; i < set.length; i++) {
      if (!set[i].test(version)) {
        return false;
      }
    }
    if (version.prerelease.length && !options.includePrerelease) {
      for (let i = 0; i < set.length; i++) {
        debug(set[i].semver);
        if (set[i].semver === Comparator.ANY) {
          continue;
        }
        if (set[i].semver.prerelease.length > 0) {
          const allowed = set[i].semver;
          if (allowed.major === version.major && allowed.minor === version.minor && allowed.patch === version.patch) {
            return true;
          }
        }
      }
      return false;
    }
    return true;
  };
  return range;
}
var comparator;
var hasRequiredComparator;
function requireComparator() {
  if (hasRequiredComparator) return comparator;
  hasRequiredComparator = 1;
  const ANY = Symbol("SemVer ANY");
  class Comparator {
    static get ANY() {
      return ANY;
    }
    constructor(comp, options) {
      options = parseOptions(options);
      if (comp instanceof Comparator) {
        if (comp.loose === !!options.loose) {
          return comp;
        } else {
          comp = comp.value;
        }
      }
      comp = comp.trim().split(/\s+/).join(" ");
      debug("comparator", comp, options);
      this.options = options;
      this.loose = !!options.loose;
      this.parse(comp);
      if (this.semver === ANY) {
        this.value = "";
      } else {
        this.value = this.operator + this.semver.version;
      }
      debug("comp", this);
    }
    parse(comp) {
      const r = this.options.loose ? re2[t.COMPARATORLOOSE] : re2[t.COMPARATOR];
      const m = comp.match(r);
      if (!m) {
        throw new TypeError(`Invalid comparator: ${comp}`);
      }
      this.operator = m[1] !== void 0 ? m[1] : "";
      if (this.operator === "=") {
        this.operator = "";
      }
      if (!m[2]) {
        this.semver = ANY;
      } else {
        this.semver = new SemVer(m[2], this.options.loose);
      }
    }
    toString() {
      return this.value;
    }
    test(version) {
      debug("Comparator.test", version, this.options.loose);
      if (this.semver === ANY || version === ANY) {
        return true;
      }
      if (typeof version === "string") {
        try {
          version = new SemVer(version, this.options);
        } catch (er) {
          return false;
        }
      }
      return cmp(version, this.operator, this.semver, this.options);
    }
    intersects(comp, options) {
      if (!(comp instanceof Comparator)) {
        throw new TypeError("a Comparator is required");
      }
      if (this.operator === "") {
        if (this.value === "") {
          return true;
        }
        return new Range(comp.value, options).test(this.value);
      } else if (comp.operator === "") {
        if (comp.value === "") {
          return true;
        }
        return new Range(this.value, options).test(comp.semver);
      }
      options = parseOptions(options);
      if (options.includePrerelease && (this.value === "<0.0.0-0" || comp.value === "<0.0.0-0")) {
        return false;
      }
      if (!options.includePrerelease && (this.value.startsWith("<0.0.0") || comp.value.startsWith("<0.0.0"))) {
        return false;
      }
      if (this.operator.startsWith(">") && comp.operator.startsWith(">")) {
        return true;
      }
      if (this.operator.startsWith("<") && comp.operator.startsWith("<")) {
        return true;
      }
      if (this.semver.version === comp.semver.version && this.operator.includes("=") && comp.operator.includes("=")) {
        return true;
      }
      if (cmp(this.semver, "<", comp.semver, options) && this.operator.startsWith(">") && comp.operator.startsWith("<")) {
        return true;
      }
      if (cmp(this.semver, ">", comp.semver, options) && this.operator.startsWith("<") && comp.operator.startsWith(">")) {
        return true;
      }
      return false;
    }
  }
  comparator = Comparator;
  const parseOptions = requireParseOptions();
  const { safeRe: re2, t } = requireRe();
  const cmp = requireCmp();
  const debug = requireDebug();
  const SemVer = requireSemver$2();
  const Range = requireRange();
  return comparator;
}
var satisfies_1;
var hasRequiredSatisfies;
function requireSatisfies() {
  if (hasRequiredSatisfies) return satisfies_1;
  hasRequiredSatisfies = 1;
  const Range = requireRange();
  const satisfies = (version, range2, options) => {
    try {
      range2 = new Range(range2, options);
    } catch (er) {
      return false;
    }
    return range2.test(version);
  };
  satisfies_1 = satisfies;
  return satisfies_1;
}
var toComparators_1;
var hasRequiredToComparators;
function requireToComparators() {
  if (hasRequiredToComparators) return toComparators_1;
  hasRequiredToComparators = 1;
  const Range = requireRange();
  const toComparators = (range2, options) => new Range(range2, options).set.map((comp) => comp.map((c) => c.value).join(" ").trim().split(" "));
  toComparators_1 = toComparators;
  return toComparators_1;
}
var maxSatisfying_1;
var hasRequiredMaxSatisfying;
function requireMaxSatisfying() {
  if (hasRequiredMaxSatisfying) return maxSatisfying_1;
  hasRequiredMaxSatisfying = 1;
  const SemVer = requireSemver$2();
  const Range = requireRange();
  const maxSatisfying = (versions, range2, options) => {
    let max = null;
    let maxSV = null;
    let rangeObj = null;
    try {
      rangeObj = new Range(range2, options);
    } catch (er) {
      return null;
    }
    versions.forEach((v) => {
      if (rangeObj.test(v)) {
        if (!max || maxSV.compare(v) === -1) {
          max = v;
          maxSV = new SemVer(max, options);
        }
      }
    });
    return max;
  };
  maxSatisfying_1 = maxSatisfying;
  return maxSatisfying_1;
}
var minSatisfying_1;
var hasRequiredMinSatisfying;
function requireMinSatisfying() {
  if (hasRequiredMinSatisfying) return minSatisfying_1;
  hasRequiredMinSatisfying = 1;
  const SemVer = requireSemver$2();
  const Range = requireRange();
  const minSatisfying = (versions, range2, options) => {
    let min = null;
    let minSV = null;
    let rangeObj = null;
    try {
      rangeObj = new Range(range2, options);
    } catch (er) {
      return null;
    }
    versions.forEach((v) => {
      if (rangeObj.test(v)) {
        if (!min || minSV.compare(v) === 1) {
          min = v;
          minSV = new SemVer(min, options);
        }
      }
    });
    return min;
  };
  minSatisfying_1 = minSatisfying;
  return minSatisfying_1;
}
var minVersion_1;
var hasRequiredMinVersion;
function requireMinVersion() {
  if (hasRequiredMinVersion) return minVersion_1;
  hasRequiredMinVersion = 1;
  const SemVer = requireSemver$2();
  const Range = requireRange();
  const gt = requireGt();
  const minVersion = (range2, loose) => {
    range2 = new Range(range2, loose);
    let minver = new SemVer("0.0.0");
    if (range2.test(minver)) {
      return minver;
    }
    minver = new SemVer("0.0.0-0");
    if (range2.test(minver)) {
      return minver;
    }
    minver = null;
    for (let i = 0; i < range2.set.length; ++i) {
      const comparators = range2.set[i];
      let setMin = null;
      comparators.forEach((comparator2) => {
        const compver = new SemVer(comparator2.semver.version);
        switch (comparator2.operator) {
          case ">":
            if (compver.prerelease.length === 0) {
              compver.patch++;
            } else {
              compver.prerelease.push(0);
            }
            compver.raw = compver.format();
          /* fallthrough */
          case "":
          case ">=":
            if (!setMin || gt(compver, setMin)) {
              setMin = compver;
            }
            break;
          case "<":
          case "<=":
            break;
          /* istanbul ignore next */
          default:
            throw new Error(`Unexpected operation: ${comparator2.operator}`);
        }
      });
      if (setMin && (!minver || gt(minver, setMin))) {
        minver = setMin;
      }
    }
    if (minver && range2.test(minver)) {
      return minver;
    }
    return null;
  };
  minVersion_1 = minVersion;
  return minVersion_1;
}
var valid;
var hasRequiredValid;
function requireValid() {
  if (hasRequiredValid) return valid;
  hasRequiredValid = 1;
  const Range = requireRange();
  const validRange = (range2, options) => {
    try {
      return new Range(range2, options).range || "*";
    } catch (er) {
      return null;
    }
  };
  valid = validRange;
  return valid;
}
var outside_1;
var hasRequiredOutside;
function requireOutside() {
  if (hasRequiredOutside) return outside_1;
  hasRequiredOutside = 1;
  const SemVer = requireSemver$2();
  const Comparator = requireComparator();
  const { ANY } = Comparator;
  const Range = requireRange();
  const satisfies = requireSatisfies();
  const gt = requireGt();
  const lt = requireLt();
  const lte = requireLte();
  const gte = requireGte();
  const outside = (version, range2, hilo, options) => {
    version = new SemVer(version, options);
    range2 = new Range(range2, options);
    let gtfn, ltefn, ltfn, comp, ecomp;
    switch (hilo) {
      case ">":
        gtfn = gt;
        ltefn = lte;
        ltfn = lt;
        comp = ">";
        ecomp = ">=";
        break;
      case "<":
        gtfn = lt;
        ltefn = gte;
        ltfn = gt;
        comp = "<";
        ecomp = "<=";
        break;
      default:
        throw new TypeError('Must provide a hilo val of "<" or ">"');
    }
    if (satisfies(version, range2, options)) {
      return false;
    }
    for (let i = 0; i < range2.set.length; ++i) {
      const comparators = range2.set[i];
      let high = null;
      let low = null;
      comparators.forEach((comparator2) => {
        if (comparator2.semver === ANY) {
          comparator2 = new Comparator(">=0.0.0");
        }
        high = high || comparator2;
        low = low || comparator2;
        if (gtfn(comparator2.semver, high.semver, options)) {
          high = comparator2;
        } else if (ltfn(comparator2.semver, low.semver, options)) {
          low = comparator2;
        }
      });
      if (high.operator === comp || high.operator === ecomp) {
        return false;
      }
      if ((!low.operator || low.operator === comp) && ltefn(version, low.semver)) {
        return false;
      } else if (low.operator === ecomp && ltfn(version, low.semver)) {
        return false;
      }
    }
    return true;
  };
  outside_1 = outside;
  return outside_1;
}
var gtr_1;
var hasRequiredGtr;
function requireGtr() {
  if (hasRequiredGtr) return gtr_1;
  hasRequiredGtr = 1;
  const outside = requireOutside();
  const gtr = (version, range2, options) => outside(version, range2, ">", options);
  gtr_1 = gtr;
  return gtr_1;
}
var ltr_1;
var hasRequiredLtr;
function requireLtr() {
  if (hasRequiredLtr) return ltr_1;
  hasRequiredLtr = 1;
  const outside = requireOutside();
  const ltr = (version, range2, options) => outside(version, range2, "<", options);
  ltr_1 = ltr;
  return ltr_1;
}
var intersects_1;
var hasRequiredIntersects;
function requireIntersects() {
  if (hasRequiredIntersects) return intersects_1;
  hasRequiredIntersects = 1;
  const Range = requireRange();
  const intersects = (r1, r2, options) => {
    r1 = new Range(r1, options);
    r2 = new Range(r2, options);
    return r1.intersects(r2, options);
  };
  intersects_1 = intersects;
  return intersects_1;
}
var simplify;
var hasRequiredSimplify;
function requireSimplify() {
  if (hasRequiredSimplify) return simplify;
  hasRequiredSimplify = 1;
  const satisfies = requireSatisfies();
  const compare = requireCompare();
  simplify = (versions, range2, options) => {
    const set = [];
    let first = null;
    let prev = null;
    const v = versions.sort((a, b) => compare(a, b, options));
    for (const version of v) {
      const included = satisfies(version, range2, options);
      if (included) {
        prev = version;
        if (!first) {
          first = version;
        }
      } else {
        if (prev) {
          set.push([first, prev]);
        }
        prev = null;
        first = null;
      }
    }
    if (first) {
      set.push([first, null]);
    }
    const ranges = [];
    for (const [min, max] of set) {
      if (min === max) {
        ranges.push(min);
      } else if (!max && min === v[0]) {
        ranges.push("*");
      } else if (!max) {
        ranges.push(`>=${min}`);
      } else if (min === v[0]) {
        ranges.push(`<=${max}`);
      } else {
        ranges.push(`${min} - ${max}`);
      }
    }
    const simplified = ranges.join(" || ");
    const original = typeof range2.raw === "string" ? range2.raw : String(range2);
    return simplified.length < original.length ? simplified : range2;
  };
  return simplify;
}
var subset_1;
var hasRequiredSubset;
function requireSubset() {
  if (hasRequiredSubset) return subset_1;
  hasRequiredSubset = 1;
  const Range = requireRange();
  const Comparator = requireComparator();
  const { ANY } = Comparator;
  const satisfies = requireSatisfies();
  const compare = requireCompare();
  const subset = (sub, dom, options = {}) => {
    if (sub === dom) {
      return true;
    }
    sub = new Range(sub, options);
    dom = new Range(dom, options);
    let sawNonNull = false;
    OUTER: for (const simpleSub of sub.set) {
      for (const simpleDom of dom.set) {
        const isSub = simpleSubset(simpleSub, simpleDom, options);
        sawNonNull = sawNonNull || isSub !== null;
        if (isSub) {
          continue OUTER;
        }
      }
      if (sawNonNull) {
        return false;
      }
    }
    return true;
  };
  const minimumVersionWithPreRelease = [new Comparator(">=0.0.0-0")];
  const minimumVersion = [new Comparator(">=0.0.0")];
  const simpleSubset = (sub, dom, options) => {
    if (sub === dom) {
      return true;
    }
    if (sub.length === 1 && sub[0].semver === ANY) {
      if (dom.length === 1 && dom[0].semver === ANY) {
        return true;
      } else if (options.includePrerelease) {
        sub = minimumVersionWithPreRelease;
      } else {
        sub = minimumVersion;
      }
    }
    if (dom.length === 1 && dom[0].semver === ANY) {
      if (options.includePrerelease) {
        return true;
      } else {
        dom = minimumVersion;
      }
    }
    const eqSet = /* @__PURE__ */ new Set();
    let gt, lt;
    for (const c of sub) {
      if (c.operator === ">" || c.operator === ">=") {
        gt = higherGT(gt, c, options);
      } else if (c.operator === "<" || c.operator === "<=") {
        lt = lowerLT(lt, c, options);
      } else {
        eqSet.add(c.semver);
      }
    }
    if (eqSet.size > 1) {
      return null;
    }
    let gtltComp;
    if (gt && lt) {
      gtltComp = compare(gt.semver, lt.semver, options);
      if (gtltComp > 0) {
        return null;
      } else if (gtltComp === 0 && (gt.operator !== ">=" || lt.operator !== "<=")) {
        return null;
      }
    }
    for (const eq of eqSet) {
      if (gt && !satisfies(eq, String(gt), options)) {
        return null;
      }
      if (lt && !satisfies(eq, String(lt), options)) {
        return null;
      }
      for (const c of dom) {
        if (!satisfies(eq, String(c), options)) {
          return false;
        }
      }
      return true;
    }
    let higher, lower;
    let hasDomLT, hasDomGT;
    let needDomLTPre = lt && !options.includePrerelease && lt.semver.prerelease.length ? lt.semver : false;
    let needDomGTPre = gt && !options.includePrerelease && gt.semver.prerelease.length ? gt.semver : false;
    if (needDomLTPre && needDomLTPre.prerelease.length === 1 && lt.operator === "<" && needDomLTPre.prerelease[0] === 0) {
      needDomLTPre = false;
    }
    for (const c of dom) {
      hasDomGT = hasDomGT || c.operator === ">" || c.operator === ">=";
      hasDomLT = hasDomLT || c.operator === "<" || c.operator === "<=";
      if (gt) {
        if (needDomGTPre) {
          if (c.semver.prerelease && c.semver.prerelease.length && c.semver.major === needDomGTPre.major && c.semver.minor === needDomGTPre.minor && c.semver.patch === needDomGTPre.patch) {
            needDomGTPre = false;
          }
        }
        if (c.operator === ">" || c.operator === ">=") {
          higher = higherGT(gt, c, options);
          if (higher === c && higher !== gt) {
            return false;
          }
        } else if (gt.operator === ">=" && !c.test(gt.semver)) {
          return false;
        }
      }
      if (lt) {
        if (needDomLTPre) {
          if (c.semver.prerelease && c.semver.prerelease.length && c.semver.major === needDomLTPre.major && c.semver.minor === needDomLTPre.minor && c.semver.patch === needDomLTPre.patch) {
            needDomLTPre = false;
          }
        }
        if (c.operator === "<" || c.operator === "<=") {
          lower = lowerLT(lt, c, options);
          if (lower === c && lower !== lt) {
            return false;
          }
        } else if (lt.operator === "<=" && !c.test(lt.semver)) {
          return false;
        }
      }
      if (!c.operator && (lt || gt) && gtltComp !== 0) {
        return false;
      }
    }
    if (gt && hasDomLT && !lt && gtltComp !== 0) {
      return false;
    }
    if (lt && hasDomGT && !gt && gtltComp !== 0) {
      return false;
    }
    if (needDomGTPre || needDomLTPre) {
      return false;
    }
    return true;
  };
  const higherGT = (a, b, options) => {
    if (!a) {
      return b;
    }
    const comp = compare(a.semver, b.semver, options);
    return comp > 0 ? a : comp < 0 ? b : b.operator === ">" && a.operator === ">=" ? b : a;
  };
  const lowerLT = (a, b, options) => {
    if (!a) {
      return b;
    }
    const comp = compare(a.semver, b.semver, options);
    return comp < 0 ? a : comp > 0 ? b : b.operator === "<" && a.operator === "<=" ? b : a;
  };
  subset_1 = subset;
  return subset_1;
}
var semver$1;
var hasRequiredSemver$1;
function requireSemver$1() {
  if (hasRequiredSemver$1) return semver$1;
  hasRequiredSemver$1 = 1;
  const internalRe = requireRe();
  const constants2 = requireConstants();
  const SemVer = requireSemver$2();
  const identifiers2 = requireIdentifiers();
  const parse = requireParse();
  const valid2 = requireValid$1();
  const clean = requireClean();
  const inc = requireInc();
  const diff = requireDiff();
  const major = requireMajor();
  const minor = requireMinor();
  const patch = requirePatch();
  const prerelease = requirePrerelease();
  const compare = requireCompare();
  const rcompare = requireRcompare();
  const compareLoose = requireCompareLoose();
  const compareBuild = requireCompareBuild();
  const sort = requireSort();
  const rsort = requireRsort();
  const gt = requireGt();
  const lt = requireLt();
  const eq = requireEq();
  const neq = requireNeq();
  const gte = requireGte();
  const lte = requireLte();
  const cmp = requireCmp();
  const coerce = requireCoerce();
  const truncate = requireTruncate();
  const Comparator = requireComparator();
  const Range = requireRange();
  const satisfies = requireSatisfies();
  const toComparators = requireToComparators();
  const maxSatisfying = requireMaxSatisfying();
  const minSatisfying = requireMinSatisfying();
  const minVersion = requireMinVersion();
  const validRange = requireValid();
  const outside = requireOutside();
  const gtr = requireGtr();
  const ltr = requireLtr();
  const intersects = requireIntersects();
  const simplifyRange = requireSimplify();
  const subset = requireSubset();
  semver$1 = {
    parse,
    valid: valid2,
    clean,
    inc,
    diff,
    major,
    minor,
    patch,
    prerelease,
    compare,
    rcompare,
    compareLoose,
    compareBuild,
    sort,
    rsort,
    gt,
    lt,
    eq,
    neq,
    gte,
    lte,
    cmp,
    coerce,
    truncate,
    Comparator,
    Range,
    satisfies,
    toComparators,
    maxSatisfying,
    minSatisfying,
    minVersion,
    validRange,
    outside,
    gtr,
    ltr,
    intersects,
    simplifyRange,
    subset,
    SemVer,
    re: internalRe.re,
    src: internalRe.src,
    tokens: internalRe.t,
    SEMVER_SPEC_VERSION: constants2.SEMVER_SPEC_VERSION,
    RELEASE_TYPES: constants2.RELEASE_TYPES,
    compareIdentifiers: identifiers2.compareIdentifiers,
    rcompareIdentifiers: identifiers2.rcompareIdentifiers
  };
  return semver$1;
}
var semverExports$1 = requireSemver$1();
const supportedBetaIdentifiers = /* @__PURE__ */ new Set(["beta", "rc"]);
const githubAssetSchema = z.object({
  name: z.string().min(1).max(200),
  browser_download_url: z.string().url().max(2048)
});
const githubReleaseSchema = z.object({
  draft: z.boolean(),
  prerelease: z.boolean(),
  tag_name: z.string().min(1).max(100),
  published_at: z.string().datetime().nullable(),
  assets: z.array(githubAssetSchema).max(50)
});
const githubReleasesSchema = z.array(githubReleaseSchema).max(100);
function isCompatibleVersion(version, releaseIsPrerelease, channel) {
  const identifiers2 = semverExports$1.prerelease(version);
  if (identifiers2 === null) return !releaseIsPrerelease;
  if (channel === "stable" || !releaseIsPrerelease) return false;
  return typeof identifiers2[0] === "string" && supportedBetaIdentifiers.has(identifiers2[0]);
}
function safeMetadataAssetUrl(rawUrl, owner, repo, tagName, assetName) {
  try {
    const url = new URL(rawUrl);
    const expectedPath = `/${owner}/${repo}/releases/download/${tagName}/${assetName}`;
    if (url.protocol !== "https:" || url.hostname !== "github.com" || url.port || url.username || url.password || url.search || url.hash || url.pathname !== expectedPath) return null;
    return url;
  } catch {
    return null;
  }
}
function selectCompatibleRelease(releases, currentVersion, channel, repository) {
  if (!semverExports$1.valid(currentVersion)) return null;
  const candidates = [];
  for (const release of releases) {
    if (release.draft || release.published_at === null) continue;
    const version = semverExports$1.valid(release.tag_name);
    if (!version || !semverExports$1.gt(version, currentVersion) || !isCompatibleVersion(version, release.prerelease, channel)) continue;
    const isPrerelease = semverExports$1.prerelease(version) !== null;
    const feedChannel = isPrerelease ? "beta" : "latest";
    const assetName = `${feedChannel}-mac.yml`;
    const asset = release.assets.find((entry) => entry.name === assetName);
    const assetUrl = asset ? safeMetadataAssetUrl(asset.browser_download_url, repository.owner, repository.repo, release.tag_name, assetName) : null;
    if (!assetUrl) continue;
    candidates.push({
      version,
      tagName: release.tag_name,
      prerelease: isPrerelease,
      feedBaseUrl: new URL(".", assetUrl).href,
      feedChannel,
      metadataAssetUrl: assetUrl.href
    });
  }
  return candidates.sort((left, right) => semverExports$1.compare(right.version, left.version))[0] ?? null;
}
class GitHubReleaseDiscovery {
  owner;
  repo;
  timeoutMs;
  maxResponseBytes;
  request;
  constructor(options) {
    if (!/^[A-Za-z0-9_.-]+$/.test(options.owner) || !/^[A-Za-z0-9_.-]+$/.test(options.repo)) throw new Error("Invalid GitHub repository coordinates.");
    this.owner = options.owner;
    this.repo = options.repo;
    this.timeoutMs = options.timeoutMs ?? 1e4;
    this.maxResponseBytes = options.maxResponseBytes ?? 1e6;
    this.request = options.fetch ?? ((url, init) => fetch$1(url, init));
  }
  async discover(currentVersion, channel, signal) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(new Error("GitHub release discovery timed out.")), this.timeoutMs);
    const abort = () => controller.abort(signal?.reason);
    signal?.addEventListener("abort", abort, { once: true });
    try {
      const url = `https://api.github.com/repos/${this.owner}/${this.repo}/releases?per_page=50`;
      const response = await this.request(url, {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "FORGE-Updater",
          "X-GitHub-Api-Version": "2022-11-28"
        },
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`GitHub release discovery failed with HTTP ${response.status}.`);
      const contentType = response.headers.get("content-type");
      if (contentType && !contentType.toLowerCase().includes("application/json")) throw new Error("GitHub release discovery returned an unsupported content type.");
      const declaredLength = Number(response.headers.get("content-length"));
      if (Number.isFinite(declaredLength) && declaredLength > this.maxResponseBytes) throw new Error("GitHub release discovery response exceeded its size limit.");
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.byteLength > this.maxResponseBytes) throw new Error("GitHub release discovery response exceeded its size limit.");
      let payload;
      try {
        payload = JSON.parse(new TextDecoder().decode(bytes));
      } catch {
        throw new Error("GitHub release discovery returned malformed JSON.");
      }
      const releases = githubReleasesSchema.parse(payload);
      return selectCompatibleRelease(releases, currentVersion, channel, { owner: this.owner, repo: this.repo });
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", abort);
    }
  }
}
const { autoUpdater } = electronUpdater;
const releasesUrl = "https://github.com/kaeganscott26/FORGE/releases";
const releaseDiscovery = new GitHubReleaseDiscovery({ owner: "kaeganscott26", repo: "FORGE" });
class UpdaterService {
  constructor(discovery = releaseDiscovery) {
    this.discovery = discovery;
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.allowPrerelease = false;
    autoUpdater.on("checking-for-update", () => this.setStatus("checking", "Checking GitHub Releases for an update…"));
    autoUpdater.on("update-not-available", () => this.setStatus("not-available", "FORGE is up to date."));
    autoUpdater.on("download-progress", (progress) => this.setStatus("downloading", `Downloading update: ${Math.round(progress.percent)}%.`, this.updateStatus.availableVersion));
    autoUpdater.on("update-downloaded", (info) => this.setStatus("downloaded", `FORGE ${info.version} is ready. Restart to apply it.`, info.version));
    autoUpdater.on("error", (error) => this.setStatus("error", `Automatic update failed: ${error.message} Download the latest release manually.`));
  }
  channel = "stable";
  updateStatus = {
    currentVersion: app.getVersion(),
    state: "idle",
    message: "Ready to check for updates."
  };
  setChannel(channel) {
    this.channel = channel;
    const policy = buildUpdatePolicy(channel);
    autoUpdater.allowPrerelease = policy.allowPrerelease;
    autoUpdater.allowDowngrade = policy.allowDowngrade;
  }
  status() {
    return { ...this.updateStatus, currentVersion: app.getVersion() };
  }
  async check() {
    if (!app.isPackaged) {
      this.setStatus("development", "Update checks run only in the packaged app. Use npm run install:mac for local builds.");
      return this.status();
    }
    try {
      this.setStatus("checking", "Checking GitHub Releases for an update…");
      const policy = buildUpdatePolicy(this.channel);
      const selected = await this.discovery.discover(app.getVersion(), this.channel);
      if (!selected) {
        this.setStatus("not-available", "FORGE is up to date. Older versions and releases outside the selected channel are never installed.");
        return this.status();
      }
      autoUpdater.setFeedURL({ provider: "generic", url: selected.feedBaseUrl, channel: selected.feedChannel });
      autoUpdater.allowPrerelease = policy.allowPrerelease;
      autoUpdater.channel = selected.feedChannel;
      autoUpdater.allowDowngrade = false;
      const result = await autoUpdater.checkForUpdates();
      const candidateVersion = result?.updateInfo.version;
      if (!candidateVersion || candidateVersion !== selected.version || !isUpdateVersionEligible(app.getVersion(), candidateVersion, this.channel)) {
        this.setStatus("not-available", "FORGE is up to date. Older versions and releases outside the selected channel are never installed.");
        return this.status();
      }
      this.setStatus("available", `FORGE ${candidateVersion} is newer and will download now.`, candidateVersion);
      await autoUpdater.downloadUpdate();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown update error.";
      this.setStatus("error", `Automatic update failed: ${message} Download the latest release manually.`);
    }
    return this.status();
  }
  install() {
    if (this.updateStatus.state !== "downloaded") throw new Error("No downloaded update is ready to install.");
    autoUpdater.quitAndInstall(false, true);
  }
  async openLatestRelease() {
    await shell.openExternal(releasesUrl);
  }
  setStatus(state, message, availableVersion) {
    this.updateStatus = { currentVersion: app.getVersion(), state, message, availableVersion };
  }
}
const defaultBaseUrl = "https://api.openai.com/v1";
class SettingsService {
  data = {};
  settingsPath = "";
  askPassPath = "";
  encryptionAvailable = false;
  async init() {
    const userDataPath = app.getPath("userData");
    this.settingsPath = join(userDataPath, "settings.json");
    this.askPassPath = join(userDataPath, "forge-git-askpass.sh");
    await promises.mkdir(userDataPath, { recursive: true });
    this.data = await promises.readFile(this.settingsPath, "utf8").then((text) => JSON.parse(text)).catch(() => ({}));
    this.encryptionAvailable = await safeStorage.isAsyncEncryptionAvailable();
    await promises.writeFile(this.askPassPath, '#!/bin/sh\ncase "$1" in\n  *Username*) printf "%s" "$FORGE_GITHUB_USERNAME" ;;\n  *Password*) printf "%s" "$FORGE_GITHUB_TOKEN" ;;\n  *) printf "%s" "" ;;\nesac\n', { mode: 448 });
    await promises.chmod(this.askPassPath, 448);
  }
  publicSettings() {
    return {
      apiBaseUrl: this.data.apiBaseUrl ?? process.env.OPENAI_BASE_URL ?? defaultBaseUrl,
      apiModel: this.data.apiModel ?? process.env.OPENAI_MODEL ?? DEFAULT_OPENAI_MODEL,
      apiKeyConfigured: Boolean(this.data.apiKey || process.env.OPENAI_API_KEY),
      githubUsername: this.data.githubUsername ?? "",
      githubTokenConfigured: Boolean(this.data.githubToken),
      secureStorageAvailable: this.encryptionAvailable,
      webResearchEnabled: this.data.webResearchEnabled !== false,
      updateChannel: normalizeUpdateChannel(this.data.updateChannel)
    };
  }
  async save(request) {
    this.data.apiBaseUrl = this.validateUrl(request.apiBaseUrl || defaultBaseUrl);
    this.data.apiModel = request.apiModel.trim() || DEFAULT_OPENAI_MODEL;
    this.data.githubUsername = request.githubUsername.trim();
    this.data.webResearchEnabled = request.webResearchEnabled === true;
    this.data.updateChannel = normalizeUpdateChannel(request.updateChannel);
    if (request.clearApiKey) delete this.data.apiKey;
    else if (request.apiKey?.trim()) this.data.apiKey = await this.encrypt(request.apiKey.trim());
    if (request.clearGithubToken) delete this.data.githubToken;
    else if (request.githubToken?.trim()) this.data.githubToken = await this.encrypt(request.githubToken.trim());
    const temporaryPath = `${this.settingsPath}.tmp`;
    await promises.writeFile(temporaryPath, `${JSON.stringify(this.data, null, 2)}
`, { mode: 384 });
    await promises.rename(temporaryPath, this.settingsPath);
    await promises.chmod(this.settingsPath, 384);
    return this.publicSettings();
  }
  async apiConfiguration(overrides = {}) {
    return {
      apiKey: overrides.apiKey?.trim() || (this.data.apiKey ? await this.decrypt(this.data.apiKey) : process.env.OPENAI_API_KEY),
      baseUrl: this.validateUrl(overrides.baseUrl || this.data.apiBaseUrl || process.env.OPENAI_BASE_URL || defaultBaseUrl),
      model: overrides.model?.trim() || this.data.apiModel || process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL
    };
  }
  async githubCredentials() {
    if (!this.data.githubToken) return null;
    return {
      username: this.data.githubUsername?.trim() || "x-access-token",
      token: await this.decrypt(this.data.githubToken),
      askPassPath: this.askPassPath
    };
  }
  async testGitHub() {
    const credentials = await this.githubCredentials();
    if (!credentials) throw new Error("Save a GitHub token before testing the connection.");
    const response = await fetch("https://api.github.com/user", {
      headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${credentials.token}`, "User-Agent": "FORGE-desktop" }
    });
    if (!response.ok) throw new Error(`GitHub authentication failed (${response.status}).`);
    const profile = await response.json();
    if (!profile.login) throw new Error("GitHub did not return an account login.");
    return { login: profile.login };
  }
  webResearchEnabled() {
    return this.data.webResearchEnabled !== false;
  }
  updateChannel() {
    return normalizeUpdateChannel(this.data.updateChannel);
  }
  validateUrl(value) {
    const parsed = new URL(value.trim());
    if (!["https:", "http:"].includes(parsed.protocol)) throw new Error("API base URL must use HTTPS or HTTP.");
    if (parsed.username || parsed.password) throw new Error("API base URL must not contain credentials.");
    const loopback = ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname.toLowerCase());
    if (parsed.protocol === "http:" && !loopback) throw new Error("Remote API base URLs must use HTTPS. HTTP is allowed only for loopback providers.");
    return parsed.toString().replace(/\/$/, "");
  }
  async encrypt(value) {
    if (!this.encryptionAvailable) throw new Error("Secure OS credential storage is not available. Secrets were not saved.");
    return (await safeStorage.encryptStringAsync(value)).toString("base64");
  }
  async decrypt(value) {
    if (!this.encryptionAvailable) throw new Error("Secure OS credential storage is not available.");
    return (await safeStorage.decryptStringAsync(Buffer.from(value, "base64"))).result;
  }
}
class ToolRegistry {
  definitions = /* @__PURE__ */ new Map();
  register(definition2) {
    if (!/^[a-z]+(?:\.[a-z]+)+$/.test(definition2.name)) throw new Error(`Invalid tool name: ${definition2.name}`);
    if (this.definitions.has(definition2.name)) throw new Error(`Duplicate tool name: ${definition2.name}`);
    this.definitions.set(definition2.name, definition2);
  }
  get(name) {
    return this.definitions.get(name);
  }
  list() {
    return [...this.definitions.values()];
  }
  parse(call) {
    const definition2 = this.definitions.get(call.name);
    if (!definition2) throw new ToolValidationError("UNKNOWN_TOOL", `Unknown tool name: ${call.name}`);
    const parsed = definition2.inputSchema.safeParse(call.arguments);
    if (!parsed.success) throw new ToolValidationError("MALFORMED_ARGUMENTS", `Invalid arguments for ${call.name}: ${parsed.error.issues.map((issue) => issue.message).join("; ")}`);
    return { definition: definition2, input: parsed.data };
  }
}
class ToolValidationError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}
const scopeHash = (workspaceId, toolName, scope) => createHash("sha256").update(`${workspaceId}\0${toolName}\0${scope}`).digest("hex");
class SessionPermissionStore {
  constructor(now = Date.now) {
    this.now = now;
  }
  permissions = /* @__PURE__ */ new Map();
  grant(workspaceId, definition2, input, ttlMs = 30 * 6e4) {
    if (definition2.approval !== "session" || !definition2.sessionScope) throw new Error("This tool does not allow a session-scoped approval.");
    const permission = { id: randomUUID(), workspaceId, toolName: definition2.name, scopeHash: scopeHash(workspaceId, definition2.name, definition2.sessionScope(input)), expiresAt: this.now() + Math.min(Math.max(ttlMs, 1e3), 60 * 6e4) };
    this.permissions.set(permission.id, permission);
    return permission;
  }
  allows(workspaceId, definition2, input) {
    this.expire();
    if (definition2.approval !== "session" || !definition2.sessionScope) return false;
    const expected = scopeHash(workspaceId, definition2.name, definition2.sessionScope(input));
    return [...this.permissions.values()].some((permission) => permission.workspaceId === workspaceId && permission.toolName === definition2.name && permission.scopeHash === expected);
  }
  expire() {
    for (const [id2, permission] of this.permissions) if (permission.expiresAt <= this.now()) this.permissions.delete(id2);
  }
  clear() {
    this.permissions.clear();
  }
}
class PolicyEngine {
  constructor(sessions) {
    this.sessions = sessions;
  }
  requiresApproval(workspaceId, definition2, input) {
    if (definition2.approval === "automatic") return false;
    return !(definition2.approval === "session" && this.sessions.allows(workspaceId, definition2, input));
  }
}
const MAX_TEXT_BYTES = 2e6;
const MAX_SEARCH_RESULTS = 200;
const textOutput = z.object({ success: z.boolean() }).passthrough();
const relativePath = z.string().min(1).max(4096).refine((value) => !path__default.isAbsolute(value) && !value.split(/[\\/]/).includes(".."), "Path must be workspace-relative and may not traverse upward.");
const reason = z.string().min(3).max(2e3);
const inside = (root, candidate) => candidate === root || candidate.startsWith(`${root}${path__default.sep}`);
async function resolveContainedPath(rootValue, relative, allowMissing = false) {
  if (!relative || path__default.isAbsolute(relative) || relative.split(/[\\/]/).includes("..")) throw new Error("Path must be workspace-relative and may not traverse upward.");
  const root = await promises.realpath(rootValue);
  const candidate = path__default.resolve(root, relative);
  if (!inside(root, candidate)) throw new Error("Path escapes the active workspace.");
  let inspected = candidate;
  if (allowMissing) {
    while (inspected !== root) {
      try {
        await promises.lstat(inspected);
        break;
      } catch (error) {
        if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") throw error;
        inspected = path__default.dirname(inspected);
      }
    }
  }
  const resolved = await promises.realpath(inspected);
  if (!inside(root, resolved)) throw new Error("Symlink resolves outside the active workspace.");
  if (!allowMissing && !inside(root, await promises.realpath(candidate))) throw new Error("Symlink resolves outside the active workspace.");
  return candidate;
}
function unifiedDiff(filePath, before, after) {
  if (before === after) return "";
  const oldLines = before.split("\n");
  const newLines = after.split("\n");
  const lines = [`--- a/${filePath}`, `+++ b/${filePath}`, `@@ -1,${oldLines.length} +1,${newLines.length} @@`];
  let prefix = 0;
  while (prefix < oldLines.length && prefix < newLines.length && oldLines[prefix] === newLines[prefix]) {
    lines.push(` ${oldLines[prefix]}`);
    prefix += 1;
  }
  for (let index = prefix; index < oldLines.length; index += 1) lines.push(`-${oldLines[index]}`);
  for (let index = prefix; index < newLines.length; index += 1) lines.push(`+${newLines[index]}`);
  return lines.join("\n").slice(0, 25e4);
}
async function readText(absolute) {
  const [buffer, stat] = await Promise.all([promises.readFile(absolute), promises.stat(absolute)]);
  if (buffer.byteLength > MAX_TEXT_BYTES) throw new Error("File exceeds the supported text size limit.");
  if (buffer.includes(0)) throw new Error("Binary files are not supported by this tool.");
  const bom = buffer.length >= 3 && buffer[0] === 239 && buffer[1] === 187 && buffer[2] === 191;
  return { content: buffer.subarray(bom ? 3 : 0).toString("utf8"), encoding: bom ? "utf8-bom" : "utf8", mode: stat.mode };
}
async function atomicWrite(absolute, content, encoding = "utf8", mode) {
  await promises.mkdir(path__default.dirname(absolute), { recursive: true });
  const temporary = path__default.join(path__default.dirname(absolute), `.${path__default.basename(absolute)}.${randomUUID()}.tmp`);
  const data = Buffer.from(`${encoding === "utf8-bom" ? "\uFEFF" : ""}${content}`, "utf8");
  try {
    await promises.writeFile(temporary, data, { flag: "wx", mode });
    await promises.rename(temporary, absolute);
  } catch (error) {
    await promises.rm(temporary, { force: true }).catch(() => void 0);
    throw error;
  }
}
async function backupPath(root, relative) {
  const hash = createHash("sha256").update(`${Date.now()}\0${relative}`).digest("hex").slice(0, 12);
  const destination = path__default.join(root, ".forge", "backups", `${Date.now()}-${hash}`, relative);
  await promises.mkdir(path__default.dirname(destination), { recursive: true });
  return destination;
}
const definition = (value) => {
  const sideEffect = value.sideEffect ?? inferSideEffect(value.name, value.networkAccess, value.audit.recordsAffectedPaths);
  const approval = value.approval ?? (sideEffect === "read" ? "automatic" : sideEffect === "workspace-write" ? "session" : "explicit");
  const sessionScope = value.sessionScope ?? (approval === "session" ? (input) => JSON.stringify({ paths: input.files ?? [input.path ?? input.from ?? input.to].filter(Boolean), workingDirectory: input.workingDirectory ?? ".", tool: value.name }) : void 0);
  return { ...value, sideEffect, approval, sessionScope };
};
function inferSideEffect(name, networkAccess, recordsAffectedPaths) {
  if (networkAccess) return "remote";
  if (name === "file.delete") return "destructive";
  if (name === "shell.run" || name === "task.process.start") return "process";
  if (recordsAffectedPaths || ["git.stage", "git.unstage", "git.commit", "task.create", "task.resume", "task.pause", "task.cancel", "task.checkpoint"].includes(name)) return "workspace-write";
  return "read";
}
function createToolRegistry() {
  const registry = new ToolRegistry();
  const base = { outputSchema: textOutput, cancellable: true };
  const taskContext = { taskContext: z.object({ taskId: z.string().uuid(), stepId: z.string().min(1).max(200) }).optional() };
  registry.register(definition({ ...base, name: "file.list", purpose: "Discover workspace files from the root first; use a nested path only after it has been observed.", inputSchema: z.object({ path: z.string().max(4096).default("."), recursive: z.boolean().default(false), maxDepth: z.number().int().min(0).max(20).default(2), ...taskContext }), workspaceBoundary: "required", timeoutMs: 1e4, audit: { category: "filesystem", recordsAffectedPaths: false, recordsExitCode: false, externalDataTransfer: false }, networkAccess: false, describeTarget: (input) => input.path ?? ".", describeEffect: () => "Read a bounded workspace directory listing, beginning at the workspace root by default." }));
  registry.register(definition({ ...base, name: "file.read", purpose: "Read a supported workspace text file.", inputSchema: z.object({ path: relativePath, ...taskContext }), workspaceBoundary: "required", timeoutMs: 1e4, audit: { category: "filesystem", recordsAffectedPaths: false, recordsExitCode: false, externalDataTransfer: false }, networkAccess: false, describeTarget: (input) => input.path, describeEffect: () => "Read text without changing the workspace." }));
  registry.register(definition({ ...base, name: "file.search", purpose: "Search supported workspace text files. When truncated, continue using the returned offset.", inputSchema: z.object({ query: z.string().min(1).max(500), path: z.string().max(4096).default("."), caseSensitive: z.boolean().default(false), maxResults: z.number().int().min(1).max(MAX_SEARCH_RESULTS).default(50), offset: z.number().int().min(0).max(1e5).default(0), ...taskContext }), workspaceBoundary: "required", timeoutMs: 2e4, audit: { category: "filesystem", recordsAffectedPaths: false, recordsExitCode: false, externalDataTransfer: false }, networkAccess: false, describeTarget: (input) => input.path ?? ".", describeEffect: (input) => `Search workspace text for ${JSON.stringify(input.query)}.` }));
  registry.register(definition({ ...base, name: "file.create", purpose: "Create a workspace file.", inputSchema: z.object({ path: relativePath, content: z.string().max(MAX_TEXT_BYTES), reason, ...taskContext }), workspaceBoundary: "required", timeoutMs: 1e4, audit: { category: "filesystem", recordsAffectedPaths: true, recordsExitCode: false, externalDataTransfer: false }, networkAccess: false, describeTarget: (input) => input.path, describeEffect: () => "Create a new file atomically." }));
  registry.register(definition({ ...base, name: "file.write", purpose: "Replace a workspace text file after showing a diff.", inputSchema: z.object({ path: relativePath, content: z.string().max(MAX_TEXT_BYTES), reason, ...taskContext }), workspaceBoundary: "required", timeoutMs: 1e4, audit: { category: "filesystem", recordsAffectedPaths: true, recordsExitCode: false, externalDataTransfer: false }, networkAccess: false, describeTarget: (input) => input.path, describeEffect: () => "Atomically write the approved diff with a rollback backup." }));
  registry.register(definition({ ...base, name: "file.patch", purpose: "Apply a targeted workspace text replacement.", inputSchema: z.object({ path: relativePath, expected: z.string().min(1).max(MAX_TEXT_BYTES), replacement: z.string().max(MAX_TEXT_BYTES), replaceAll: z.boolean().default(false), reason, ...taskContext }), workspaceBoundary: "required", timeoutMs: 1e4, audit: { category: "filesystem", recordsAffectedPaths: true, recordsExitCode: false, externalDataTransfer: false }, networkAccess: false, describeTarget: (input) => input.path, describeEffect: () => "Apply the displayed targeted patch atomically." }));
  for (const name of ["file.rename", "file.move"]) registry.register(definition({ ...base, name, purpose: "Move a workspace path without overwriting.", inputSchema: z.object({ from: relativePath, to: relativePath, reason, ...taskContext }), workspaceBoundary: "required", timeoutMs: 1e4, audit: { category: "filesystem", recordsAffectedPaths: true, recordsExitCode: false, externalDataTransfer: false }, networkAccess: false, describeTarget: (input) => `${input.from} → ${input.to}`, describeEffect: () => "Move the path without overwriting the destination." }));
  registry.register(definition({ ...base, name: "directory.create", purpose: "Create a workspace directory.", inputSchema: z.object({ path: relativePath, reason, ...taskContext }), workspaceBoundary: "required", timeoutMs: 1e4, audit: { category: "filesystem", recordsAffectedPaths: true, recordsExitCode: false, externalDataTransfer: false }, networkAccess: false, describeTarget: (input) => input.path, describeEffect: () => "Create a directory inside the workspace." }));
  registry.register(definition({ ...base, name: "file.delete", purpose: "Delete a workspace path after creating a rollback backup.", inputSchema: z.object({ path: relativePath, reason, ...taskContext }), workspaceBoundary: "required", timeoutMs: 2e4, audit: { category: "filesystem", recordsAffectedPaths: true, recordsExitCode: false, externalDataTransfer: false }, networkAccess: false, describeTarget: (input) => input.path, describeEffect: () => "Back up then delete the selected source path." }));
  registry.register(definition({ ...base, name: "terminal.read", purpose: "Read bounded recent output from an existing user terminal session.", inputSchema: z.object({ sessionId: z.string().uuid().optional(), maxCharacters: z.number().int().min(100).max(2e4).default(4e3), ...taskContext }), workspaceBoundary: "required", timeoutMs: 5e3, audit: { category: "shell", recordsAffectedPaths: false, recordsExitCode: true, externalDataTransfer: false }, networkAccess: false, describeTarget: (input) => input.sessionId ?? "all terminal sessions", describeEffect: () => "Read bounded, redacted recent terminal evidence without changing the session." }));
  const gitRead = (name, schema, effect) => registry.register(definition({ ...base, name, purpose: effect, inputSchema: schema, workspaceBoundary: "required", timeoutMs: 2e4, audit: { category: "git", recordsAffectedPaths: false, recordsExitCode: false, externalDataTransfer: false }, networkAccess: false, describeTarget: () => "active Git workspace", describeEffect: () => effect }));
  gitRead("git.status", z.object({ ...taskContext }), "Inspect current branch and working tree status.");
  gitRead("git.diff", z.object({ staged: z.boolean().default(false), ...taskContext }), "Inspect the Git diff.");
  gitRead("git.log", z.object({ limit: z.number().int().min(1).max(100).default(30), ...taskContext }), "Inspect recent Git history.");
  gitRead("git.branches", z.object({ ...taskContext }), "Inspect Git branches.");
  for (const name of ["git.stage", "git.unstage"]) registry.register(definition({ ...base, name, purpose: `${name === "git.stage" ? "Stage" : "Unstage"} selected Git paths.`, inputSchema: z.object({ files: z.array(relativePath).min(1).max(200), reason, ...taskContext }), workspaceBoundary: "required", timeoutMs: 2e4, audit: { category: "git", recordsAffectedPaths: true, recordsExitCode: false, externalDataTransfer: false }, networkAccess: false, describeTarget: (input) => input.files.join(", "), describeEffect: () => `${name === "git.stage" ? "Stage" : "Unstage"} only the listed paths.` }));
  registry.register(definition({ ...base, name: "git.commit", purpose: "Commit the exact staged Git paths.", inputSchema: z.object({ message: z.string().min(1).max(5e3), reason, ...taskContext }), workspaceBoundary: "required", timeoutMs: 6e4, audit: { category: "git", recordsAffectedPaths: true, recordsExitCode: false, externalDataTransfer: false }, networkAccess: false, describeTarget: () => "current branch and staged files", describeEffect: (input) => `Create a commit with message ${JSON.stringify(input.message)}.` }));
  for (const name of ["git.pull", "git.push"]) registry.register(definition({ ...base, name, purpose: `${name === "git.pull" ? "Pull from" : "Push to"} the configured remote.`, inputSchema: z.object({ reason, ...taskContext }), workspaceBoundary: "required", timeoutMs: 12e4, audit: { category: "git", recordsAffectedPaths: true, recordsExitCode: false, externalDataTransfer: true }, networkAccess: true, describeTarget: () => "origin and current branch", describeEffect: () => `${name === "git.pull" ? "Receive remote changes" : "Send local commits"} using protected Git credentials.` }));
  registry.register(definition({ ...base, name: "shell.run", purpose: "Run an approved executable with an argument array.", inputSchema: z.object({ command: z.string().min(1).max(4096), args: z.array(z.string().max(32e3)).max(500).default([]), workingDirectory: z.string().max(4096).default("."), timeoutMs: z.number().int().min(100).max(6e5).default(12e4), environment: z.record(z.string()).optional(), environmentAllowlist: z.array(z.string()).max(100).default([]), reason, expectedOutcome: z.string().min(1).max(2e3), ...taskContext }), workspaceBoundary: "required", timeoutMs: 6e5, audit: { category: "shell", recordsAffectedPaths: true, recordsExitCode: true, externalDataTransfer: false }, networkAccess: false, describeTarget: (input) => [input.command, ...input.args ?? []].map(quoteArgument).join(" "), describeEffect: (input) => input.expectedOutcome }));
  registry.register(definition({ ...base, name: "web.search", purpose: "Search the public web as explicitly approved external research.", inputSchema: z.object({ query: z.string().min(1).max(1e3), reason, projectDataSent: z.string().max(2e3).default("None"), ...taskContext }), workspaceBoundary: "not-applicable", timeoutMs: 3e4, audit: { category: "web", recordsAffectedPaths: false, recordsExitCode: false, externalDataTransfer: true }, networkAccess: true, describeTarget: (input) => input.query, describeEffect: () => "Send the exact query to an external search service and return cited results." }));
  for (const name of ["web.fetch", "web.open"]) registry.register(definition({ ...base, name, purpose: "Retrieve an approved public HTTP(S) resource.", inputSchema: z.object({ url: z.string().url().max(8e3), reason, projectDataSent: z.string().max(2e3).default("None"), ...taskContext }), workspaceBoundary: "not-applicable", timeoutMs: 3e4, audit: { category: "web", recordsAffectedPaths: false, recordsExitCode: false, externalDataTransfer: true }, networkAccess: true, describeTarget: (input) => input.url, describeEffect: () => "Retrieve bounded external web evidence without browser automation." }));
  registry.register(definition({ ...base, name: "browser.open", purpose: "Open a validated public HTTP(S) URL in the user-visible FORGE Browser.", inputSchema: z.object({ url: z.string().url().max(8e3), reason, projectDataSent: z.string().max(2e3).default("None"), ...taskContext }), workspaceBoundary: "not-applicable", timeoutMs: 45e3, audit: { category: "web", recordsAffectedPaths: false, recordsExitCode: false, externalDataTransfer: true }, networkAccess: true, sideEffect: "remote", approval: "explicit", describeTarget: (input) => input.url, describeEffect: () => "Navigate the visible FORGE Browser to this public URL. The destination and any rendered content remain external data." }));
  registry.register(definition({ ...base, name: "browser.read", purpose: "Read bounded rendered text from the current visible FORGE Browser page.", inputSchema: z.object({ reason, ...taskContext }), workspaceBoundary: "not-applicable", timeoutMs: 2e4, audit: { category: "web", recordsAffectedPaths: false, recordsExitCode: false, externalDataTransfer: true }, networkAccess: false, sideEffect: "remote", approval: "explicit", describeTarget: () => "the current FORGE Browser page", describeEffect: () => "Send bounded rendered page text from the current public page to the configured model for analysis." }));
  registry.register(definition({ ...base, name: "browser.find", purpose: "Find bounded text excerpts on the current visible FORGE Browser page.", inputSchema: z.object({ query: z.string().min(1).max(1e3), maxResults: z.number().int().min(1).max(50).default(10), reason, ...taskContext }), workspaceBoundary: "not-applicable", timeoutMs: 2e4, audit: { category: "web", recordsAffectedPaths: false, recordsExitCode: false, externalDataTransfer: true }, networkAccess: false, sideEffect: "remote", approval: "explicit", describeTarget: () => "the current FORGE Browser page", describeEffect: (input) => `Send excerpts matching ${JSON.stringify(input.query)} from the current public page to the configured model.` }));
  registry.register(definition({ ...base, name: "browser.savecontext", purpose: "Save an agent-authored summary of the current browser page as durable workspace context.", inputSchema: z.object({ title: z.string().min(1).max(500), content: z.string().min(1).max(2e5), reason, ...taskContext }), workspaceBoundary: "required", timeoutMs: 15e3, audit: { category: "memory", recordsAffectedPaths: false, recordsExitCode: false, externalDataTransfer: false }, networkAccess: false, sideEffect: "workspace-write", approval: "session", sessionScope: (input) => JSON.stringify({ tool: "browser.savecontext", title: input.title }), describeTarget: (input) => `durable workspace context: ${input.title}`, describeEffect: () => "Persist the supplied browser-page summary in workspace-owned durable memory. It can be removed from Durable Memory later." }));
  registry.register(definition({ ...base, name: "github.read", purpose: "Inspect metadata, branches, commits, issues, pull requests, comments, workflow state, releases, or assets for the active GitHub repository.", inputSchema: z.object({ resource: z.enum(["metadata", "branches", "commits", "issues", "pulls", "issue-comments", "pull-comments", "workflow-runs", "workflow-jobs", "releases", "release-assets"]), number: z.number().int().positive().optional(), runId: z.number().int().positive().optional(), releaseId: z.number().int().positive().optional(), page: z.number().int().min(1).max(100).default(1), reason, ...taskContext }), workspaceBoundary: "required", timeoutMs: 3e4, audit: { category: "git", recordsAffectedPaths: false, recordsExitCode: false, externalDataTransfer: true }, networkAccess: true, sideEffect: "read", approval: "automatic", describeTarget: (input) => `GitHub ${input.resource}`, describeEffect: () => "Read bounded GitHub repository evidence using the active origin." }));
  registry.register(definition({ ...base, name: "github.mutate", purpose: "Perform one explicitly approved GitHub repository mutation through the official REST API.", inputSchema: z.object({ action: z.enum(["create-issue", "update-issue", "comment-issue", "create-branch", "create-file", "create-pull-request", "comment-pull-request", "retry-workflow", "create-release", "update-release"]), input: z.record(z.unknown()), reason, ...taskContext }), workspaceBoundary: "required", timeoutMs: 6e4, audit: { category: "git", recordsAffectedPaths: false, recordsExitCode: false, externalDataTransfer: true }, networkAccess: true, sideEffect: "remote", approval: "explicit", describeTarget: (input) => `GitHub ${input.action}`, describeEffect: () => "Send one authenticated, audited GitHub API mutation for the active repository." }));
  const taskStepDraft = z.object({ id: z.string().min(1).max(200).optional(), name: z.string().min(1).max(300), purpose: z.string().min(1).max(2e3), riskTier: z.union([z.literal(0), z.literal(1), z.literal(2)]), requiredTool: z.string().max(200).optional(), expectedInput: z.unknown().optional(), expectedOutput: z.unknown().optional(), retryPolicy: z.object({ maxAttempts: z.number().int().min(1).max(20).optional(), backoffMs: z.number().int().min(0).max(864e5).optional(), retryableErrorCodes: z.array(z.string().max(100)).max(50).optional() }).optional(), timeoutMs: z.number().int().min(100).max(864e5).optional(), artifactPaths: z.array(relativePath).max(200).optional(), verificationCriteria: z.array(z.string().min(1).max(1e3)).min(1).max(100), rollbackInstructions: z.string().max(4e3).optional(), dependencies: z.array(z.string().min(1).max(200)).max(100).optional() });
  const taskDraft = z.object({ title: z.string().min(1).max(300), description: z.string().max(1e4).optional(), taskType: z.string().min(1).max(100), priority: z.enum(["low", "medium", "high"]).optional(), originatingConversationId: z.string().uuid().optional(), assignedProvider: z.string().max(200).optional(), assignedModel: z.string().max(200).optional(), progressSummary: z.string().max(4e3).optional(), resumeInstructions: z.string().min(1).max(1e4), associatedBranch: z.string().max(500).optional(), associatedCommitSha: z.string().max(100).optional(), associatedPullRequest: z.string().max(2e3).optional(), associatedReleaseTag: z.string().max(500).optional(), associatedWorkflowRun: z.string().max(500).optional(), taskDependencies: z.array(z.string().uuid()).max(100).optional(), steps: z.array(taskStepDraft).max(500) });
  registry.register(definition({ ...base, name: "task.inspect", purpose: "Inspect one workspace-owned persistent task and its verified checkpoints.", inputSchema: z.object({ taskId: z.string().uuid() }), workspaceBoundary: "required", timeoutMs: 5e3, audit: { category: "memory", recordsAffectedPaths: false, recordsExitCode: false, externalDataTransfer: false }, networkAccess: false, describeTarget: (input) => input.taskId, describeEffect: () => "Read persistent task state without changing it." }));
  registry.register(definition({ ...base, name: "task.create", purpose: "Create a draft workspace-owned task without executing any step.", inputSchema: taskDraft.extend({ reason }), workspaceBoundary: "required", timeoutMs: 1e4, audit: { category: "memory", recordsAffectedPaths: false, recordsExitCode: false, externalDataTransfer: false }, networkAccess: false, describeTarget: (input) => input.title, describeEffect: () => "Persist a draft task and its structured steps; no executable work will start." }));
  for (const name of ["task.resume", "task.pause", "task.cancel"]) registry.register(definition({ ...base, name, purpose: `${name.slice(5)} a workspace-owned task after explicit approval.`, inputSchema: z.object({ taskId: z.string().uuid(), reason, trackingOnly: z.boolean().default(true) }), workspaceBoundary: "required", timeoutMs: 2e4, audit: { category: "memory", recordsAffectedPaths: false, recordsExitCode: false, externalDataTransfer: false }, networkAccess: false, describeTarget: (input) => input.taskId, describeEffect: () => `${name.slice(5)} task tracking without granting execution approval.` }));
  registry.register(definition({ ...base, name: "task.checkpoint", purpose: "Record a task checkpoint; verified checkpoints require an audit reference.", inputSchema: z.object({ taskId: z.string().uuid(), stepId: z.string().max(200).optional(), name: z.string().min(1).max(300), summary: z.string().min(1).max(4e3), verified: z.boolean().default(false), evidence: z.unknown().optional(), auditReference: z.string().max(200).optional(), reason }), workspaceBoundary: "required", timeoutMs: 1e4, audit: { category: "memory", recordsAffectedPaths: false, recordsExitCode: false, externalDataTransfer: false }, networkAccess: false, describeTarget: (input) => input.taskId, describeEffect: () => "Persist a structured checkpoint without executing another tool." }));
  registry.register(definition({ ...base, name: "task.handoff", purpose: "Generate a Markdown projection of authoritative SQLite task state.", inputSchema: z.object({ taskId: z.string().uuid(), reason }), workspaceBoundary: "required", timeoutMs: 1e4, audit: { category: "memory", recordsAffectedPaths: true, recordsExitCode: false, externalDataTransfer: false }, networkAccess: false, describeTarget: (input) => `.forge/handoffs for ${input.taskId}`, describeEffect: () => "Atomically write or update a human-readable task handoff." }));
  registry.register(definition({ ...base, name: "task.process.start", purpose: "Start one approved task step as a detached workspace-owned process with file-backed output.", inputSchema: z.object({ taskId: z.string().uuid(), stepId: z.string().min(1).max(200), command: z.string().min(1).max(4096), args: z.array(z.string().max(32e3)).max(500).default([]), workingDirectory: z.string().max(4096).default("."), timeoutMs: z.number().int().min(100).max(864e5).default(6e5), environment: z.record(z.string()).optional(), environmentAllowlist: z.array(z.string()).max(100).default([]), reason, expectedOutcome: z.string().min(1).max(2e3) }), workspaceBoundary: "required", timeoutMs: 3e4, audit: { category: "shell", recordsAffectedPaths: true, recordsExitCode: true, externalDataTransfer: false }, networkAccess: false, describeTarget: (input) => `${input.taskId}/${input.stepId}: ${[input.command, ...input.args ?? []].map(quoteArgument).join(" ")}`, describeEffect: (input) => `${input.expectedOutcome} Output will be stored under .forge/task-output and execution may outlive the current conversation.` }));
  return registry;
}
function quoteArgument(value) {
  return /^[A-Za-z0-9_./:=+-]+$/.test(value) ? value : `'${value.replaceAll("'", "'\\''")}'`;
}
function sanitizeToolData(value) {
  if (Array.isArray(value)) return value.map(sanitizeToolData);
  if (!value || typeof value !== "object") return typeof value === "string" && /(?:sk-|github_pat_|gh[oprsu]_)[A-Za-z0-9_-]{10,}/.test(value) ? "[REDACTED]" : value;
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, /token|secret|password|authorization|credential|api.?key/i.test(key) ? "[REDACTED]" : sanitizeToolData(entry)]));
}
function boundedToolEvidence(result, limit = 12e3) {
  const text = JSON.stringify(sanitizeToolData({ toolName: result.toolName, success: result.success, output: result.output, error: result.error, affectedPaths: result.affectedPaths, exitCode: result.exitCode, warnings: result.warnings, truncated: result.truncated }), null, 2);
  return text.length > limit ? `${text.slice(0, limit)}
[FORGE bounded the remaining tool output]` : text;
}
class ToolRouter {
  constructor(dependencies) {
    this.dependencies = dependencies;
    this.registry = createToolRegistry();
    this.installExecutors();
  }
  registry;
  requests = /* @__PURE__ */ new Map();
  controllers = /* @__PURE__ */ new Map();
  executors = /* @__PURE__ */ new Map();
  workspaceRoots = /* @__PURE__ */ new Map();
  sessions = new SessionPermissionStore();
  policy = new PolicyEngine(this.sessions);
  definitions() {
    return this.registry.list();
  }
  providerDefinitions() {
    return this.registry.list().map((entry) => ({ name: entry.name, description: entry.purpose, parameters: zodToJsonSchema(entry.inputSchema, { target: "openApi3" }), sideEffects: entry.sideEffect, approval: entry.approval, networkAccess: entry.networkAccess, cancellation: entry.cancellable, resultSemantics: "Returns a structured, bounded result with success, affected paths, warnings, and recovery metadata when applicable." }));
  }
  listRequests(workspaceId) {
    return [...this.requests.values()].filter((request) => !workspaceId || request.workspaceId === workspaceId).sort((a, b) => b.requestedAt - a.requestedAt).map((request) => ({ ...request, input: sanitizeToolData(request.input) }));
  }
  requestById(id2) {
    const request = this.requests.get(id2);
    return request ? { ...request } : void 0;
  }
  async request(call, context) {
    let parsed;
    try {
      parsed = this.registry.parse(call);
    } catch (error) {
      await this.auditValidationFailure(call, context, error);
      throw error;
    }
    const { definition: definition2, input } = parsed;
    this.workspaceRoots.set(context.workspaceId, context.workspaceRoot);
    const now = Date.now();
    const prediction = await this.predict(definition2.name, input, context.workspaceRoot);
    const request = {
      id: call.id || randomUUID(),
      workspaceId: context.workspaceId,
      conversationId: context.conversationId,
      modelId: context.modelId,
      toolName: definition2.name,
      input,
      reason: typeof input.reason === "string" ? input.reason : definition2.purpose,
      target: prediction.target ?? definition2.describeTarget(input),
      workingDirectory: typeof input.workingDirectory === "string" ? input.workingDirectory : void 0,
      expectedEffect: definition2.describeEffect(input),
      predictedAffectedPaths: prediction.paths,
      networkAccess: definition2.networkAccess,
      externalDataDescription: typeof input.projectDataSent === "string" ? input.projectDataSent : void 0,
      diff: prediction.diff,
      approvalRequired: this.policy.requiresApproval(context.workspaceId, definition2, input),
      sessionApprovalAvailable: definition2.approval === "session",
      state: "pending",
      requestedAt: now,
      updatedAt: now
    };
    this.requests.set(request.id, request);
    if (request.approvalRequired) return { request: { ...request } };
    const result = await this.execute(request.id, context, definition2.approval === "session" ? "session" : "automatic");
    return { request: { ...request }, result };
  }
  async approve(requestId, context, choice) {
    const request = this.required(requestId);
    if (request.workspaceId !== context.workspaceId) throw new Error("Tool request belongs to another workspace.");
    if (request.state !== "pending") throw new Error("Tool request is no longer pending.");
    const definition2 = this.registry.get(request.toolName);
    if (choice === "session") this.sessions.grant(context.workspaceId, definition2, request.input);
    request.state = "approved";
    request.updatedAt = Date.now();
    return this.execute(requestId, context, choice);
  }
  async reject(requestId, context) {
    const request = this.required(requestId);
    if (request.workspaceId !== context.workspaceId || request.state !== "pending") throw new Error("Tool request cannot be rejected.");
    request.state = "rejected";
    request.updatedAt = Date.now();
    await this.dependencies.audit.appendAction(this.record(request, "rejected", false, 0, "User rejected the tool request.", []));
  }
  async cancel(requestId, context) {
    const request = this.required(requestId);
    if (request.workspaceId !== context.workspaceId) throw new Error("Tool request belongs to another workspace.");
    if (request.state === "pending") {
      request.state = "cancelled";
      request.updatedAt = Date.now();
      await this.dependencies.audit.appendAction(this.record(request, "cancelled", false, 0, "Pending tool request cancelled.", []));
      return true;
    }
    if (request.state !== "running") return false;
    this.controllers.get(requestId)?.abort();
    if (request.toolName === "shell.run") this.dependencies.shell.cancel(requestId);
    return true;
  }
  async execute(requestId, context, decision) {
    const request = this.required(requestId);
    const definition2 = this.registry.get(request.toolName);
    const executor = this.executors.get(request.toolName);
    if (!executor) throw new Error(`No executor is registered for ${request.toolName}.`);
    request.state = "running";
    request.updatedAt = Date.now();
    const started = Date.now();
    const controller = new AbortController();
    this.controllers.set(request.id, controller);
    try {
      const partial = await executor(request.input, request, controller.signal);
      const output = partial.output === void 0 ? void 0 : definition2.outputSchema.parse(partial.output);
      const result = { ...partial, output, requestId: request.id, toolName: request.toolName, durationMs: Date.now() - started };
      request.state = result.success ? "succeeded" : result.cancelled ? "cancelled" : "failed";
      request.updatedAt = Date.now();
      await this.dependencies.audit.appendAction(this.record(request, decision, result.success, result.durationMs, result.success ? "Tool completed successfully." : result.error?.message ?? "Tool failed.", result.affectedPaths, result.exitCode, result.rollback));
      return result;
    } catch (error) {
      const durationMs = Date.now() - started;
      const cancelled = controller.signal.aborted;
      const result = { requestId: request.id, toolName: request.toolName, success: false, affectedPaths: [], warnings: [], error: { code: cancelled ? "CANCELLED" : "EXECUTION_FAILED", message: error instanceof Error ? error.message : String(error) }, durationMs, cancelled };
      request.state = cancelled ? "cancelled" : "failed";
      request.updatedAt = Date.now();
      await this.dependencies.audit.appendAction(this.record(request, cancelled ? "cancelled" : decision, false, durationMs, result.error.message, []));
      return result;
    } finally {
      this.controllers.delete(request.id);
    }
  }
  record(request, approvalDecision, success, executionDurationMs, resultSummary, affectedPaths, exitCode, rollback) {
    return { id: request.id, timestamp: Date.now(), workspaceId: request.workspaceId, conversationId: request.conversationId, modelId: request.modelId, toolName: request.toolName, sanitizedInputs: sanitizeToolData(request.input), approvalDecision, executionDurationMs, success, result: { success, summary: resultSummary, exitCode: exitCode ?? null, affectedPathCount: affectedPaths.length, rollbackAvailable: rollback?.available ?? false }, resultSummary, affectedPaths, exitCode, rollback };
  }
  async auditValidationFailure(call, context, error) {
    const summary = error instanceof Error ? error.message : String(error);
    await this.dependencies.audit.appendAction({ id: randomUUID(), timestamp: Date.now(), workspaceId: context.workspaceId, conversationId: context.conversationId, modelId: context.modelId, toolName: call.name, sanitizedInputs: sanitizeToolData(call.arguments), approvalDecision: "validation-failed", executionDurationMs: 0, success: false, result: { success: false, summary }, resultSummary: summary, affectedPaths: [] });
  }
  required(id2) {
    const request = this.requests.get(id2);
    if (!request) throw new Error("Unknown tool request.");
    return request;
  }
  async predict(name, input, root) {
    if (name === "file.create") return { paths: [input.path], diff: unifiedDiff(input.path, "", input.content) };
    if (name === "file.write") {
      const absolute = await resolveContainedPath(root, input.path);
      const existing = await readText(absolute);
      return { paths: [input.path], diff: unifiedDiff(input.path, existing.content, input.content) };
    }
    if (name === "file.patch") {
      const absolute = await resolveContainedPath(root, input.path);
      const existing = await readText(absolute);
      const after = applyReplacement(existing.content, input.expected, input.replacement, input.replaceAll);
      return { paths: [input.path], diff: unifiedDiff(input.path, existing.content, after) };
    }
    if (["file.rename", "file.move"].includes(name)) return { paths: [input.from, input.to] };
    if (name === "directory.create" || name === "file.delete") return { paths: [input.path] };
    if (name === "git.stage" || name === "git.unstage") {
      const status = await this.dependencies.git.status();
      return { paths: input.files, target: `branch ${status.branch}: ${input.files.join(", ")}` };
    }
    if (name === "git.commit") {
      const status = await this.dependencies.git.status();
      const paths = status.files.filter((file) => file.indexStatus !== " " && file.indexStatus !== "?").map((file) => file.path);
      return { paths, target: `branch ${status.branch}: ${paths.join(", ") || "no staged files"}` };
    }
    if (name === "git.pull" || name === "git.push") {
      const status = await this.dependencies.git.status();
      return { paths: status.files.map((file) => file.path), target: `origin / branch ${status.branch}` };
    }
    return { paths: [] };
  }
  installExecutors() {
    const ok = (output, affectedPaths = [], extra = {}) => ({ success: true, output: { success: true, ...output }, affectedPaths, warnings: [], ...extra });
    const missing = (requestedPath) => ({ missing: true, requestedPath, recovery: { action: "restart-at-workspace-root", path: ".", nearestRequestedParent: path__default.dirname(requestedPath) || ".", instruction: "List the workspace root, discover the real layout, and retry only with an observed path." } });
    this.executors.set("file.list", async (input, request) => {
      const requestedPath = input.path === "." ? "." : input.path;
      const absolute = await resolveContainedPath(this.root(request), requestedPath, true);
      if (!await pathExists(absolute)) return ok({ ...missing(requestedPath), entries: [], truncated: false });
      const entries = [];
      const visit = async (current, depth) => {
        for (const entry of await promises.readdir(current, { withFileTypes: true })) {
          if ([".git", ".forge", "node_modules", "dist_electron", "out"].includes(entry.name)) continue;
          const child = path__default.join(current, entry.name);
          const stat = await promises.lstat(child);
          entries.push({ path: path__default.relative(this.root(request), child), type: entry.isDirectory() ? "directory" : entry.isSymbolicLink() ? "symlink" : "file", size: stat.size });
          if (input.recursive && entry.isDirectory() && depth < input.maxDepth) await visit(child, depth + 1);
        }
      };
      await visit(absolute, 0);
      return ok({ entries: entries.slice(0, 5e3), truncated: entries.length > 5e3 });
    });
    this.executors.set("file.read", async (input, request) => {
      const absolute = await resolveContainedPath(this.root(request), input.path, true);
      if (!await pathExists(absolute)) return ok(missing(input.path));
      const data = await readText(absolute);
      return ok({ path: input.path, content: data.content, encoding: data.encoding });
    });
    this.executors.set("file.search", async (input, request, signal) => {
      const requestedPath = input.path === "." ? "." : input.path;
      const absolute = await resolveContainedPath(this.root(request), requestedPath, true);
      if (!await pathExists(absolute)) return ok({ ...missing(requestedPath), matches: [], truncated: false });
      const matches = [];
      let matchOffset = 0;
      const query = input.caseSensitive ? input.query : input.query.toLowerCase();
      const visit = async (current) => {
        if (signal.aborted || matches.length >= input.maxResults) return;
        for (const entry of await promises.readdir(current, { withFileTypes: true })) {
          if (signal.aborted || matches.length >= input.maxResults) return;
          if ([".git", ".forge", ".obsidian", "node_modules", "dist_electron", "out"].includes(entry.name)) continue;
          const child = path__default.join(current, entry.name);
          if (entry.isDirectory()) await visit(child);
          else if (entry.isFile()) {
            try {
              const data = await readText(child);
              for (const [index, line] of data.content.split(/\r?\n/).entries()) {
                const haystack = input.caseSensitive ? line : line.toLowerCase();
                if (haystack.includes(query)) {
                  if (matchOffset >= input.offset) matches.push({ path: path__default.relative(this.root(request), child), line: index + 1, text: line.slice(0, 2e3) });
                  matchOffset += 1;
                }
                if (matches.length >= input.maxResults) break;
              }
            } catch {
            }
          }
        }
      };
      await visit(absolute);
      const truncated = matches.length >= input.maxResults;
      return ok({ matches, truncated, totalOrMore: input.offset + matches.length + (truncated ? 1 : 0), continuation: truncated ? { offset: input.offset + matches.length, instruction: "Call file.search again with the same query/path and this offset." } : void 0 });
    });
    this.executors.set("file.create", async (input, request) => {
      this.assertNotDirty(input.path);
      const absolute = await resolveContainedPath(this.root(request), input.path, true);
      await promises.mkdir(path__default.dirname(absolute), { recursive: true });
      await promises.writeFile(absolute, input.content, { flag: "wx" });
      return ok({ path: input.path }, [input.path], { diff: request.diff, rollback: { available: true, instructions: `Delete ${input.path} to undo this creation.` } });
    });
    for (const name of ["file.write", "file.patch"]) this.executors.set(name, async (input, request) => {
      this.assertNotDirty(input.path);
      const absolute = await resolveContainedPath(this.root(request), input.path);
      const original = await readText(absolute);
      const after = name === "file.write" ? input.content : applyReplacement(original.content, input.expected, input.replacement, input.replaceAll);
      const backup = await backupPath(this.root(request), input.path);
      await promises.copyFile(absolute, backup);
      await atomicWrite(absolute, after, original.encoding, original.mode);
      return ok({ path: input.path }, [input.path], { diff: unifiedDiff(input.path, original.content, after), rollback: { available: true, backupPath: path__default.relative(this.root(request), backup), instructions: `Restore the backup over ${input.path}.` } });
    });
    for (const name of ["file.rename", "file.move"]) this.executors.set(name, async (input, request) => {
      this.assertNotDirty(input.from);
      this.assertNotDirty(input.to);
      const source = await resolveContainedPath(this.root(request), input.from);
      const destination = await resolveContainedPath(this.root(request), input.to, true);
      await promises.access(destination).then(() => {
        throw new Error("Destination already exists.");
      }).catch((error) => {
        if (error instanceof Error && "code" in error && error.code === "ENOENT") return;
        throw error;
      });
      await promises.mkdir(path__default.dirname(destination), { recursive: true });
      await promises.rename(source, destination);
      return ok({}, [input.from, input.to], { rollback: { available: true, instructions: `Move ${input.to} back to ${input.from}.` } });
    });
    this.executors.set("directory.create", async (input, request) => {
      const absolute = await resolveContainedPath(this.root(request), input.path, true);
      await promises.mkdir(absolute, { recursive: false });
      return ok({}, [input.path], { rollback: { available: true, instructions: `Remove the empty directory ${input.path}.` } });
    });
    this.executors.set("file.delete", async (input, request) => {
      this.assertNotDirty(input.path);
      const absolute = await resolveContainedPath(this.root(request), input.path);
      const backup = await backupPath(this.root(request), input.path);
      await promises.cp(absolute, backup, { recursive: true, errorOnExist: true });
      await promises.rm(absolute, { recursive: true, force: false });
      return ok({}, [input.path], { rollback: { available: true, backupPath: path__default.relative(this.root(request), backup), instructions: `Restore the backup to ${input.path}.` } });
    });
    this.executors.set("terminal.read", async (input) => {
      if (!this.dependencies.terminal) throw new Error("Terminal evidence is unavailable.");
      const sessions = this.dependencies.terminal.list().filter((session) => !input.sessionId || session.id === input.sessionId).map((session) => ({ id: session.id, cwd: session.cwd, state: session.state, exitCode: session.exitCode, recentOutput: session.recentOutput.slice(-(input.maxCharacters ?? 4e3)) }));
      return ok({ sessions });
    });
    this.executors.set("git.status", async () => ok({ status: await this.dependencies.git.status() }));
    this.executors.set("git.diff", async (input) => ok({ diff: await this.dependencies.git.diff(input.staged) }));
    this.executors.set("git.log", async (input) => ok({ commits: await this.dependencies.git.log(input.limit) }));
    this.executors.set("git.branches", async () => ok({ branches: await this.dependencies.git.branches() }));
    this.executors.set("git.stage", async (input) => {
      await this.dependencies.git.stage(input.files);
      return ok({}, input.files);
    });
    this.executors.set("git.unstage", async (input) => {
      await this.dependencies.git.unstage(input.files);
      return ok({}, input.files);
    });
    this.executors.set("git.commit", async (input) => {
      const status = await this.dependencies.git.status();
      const staged = status.files.filter((file) => file.indexStatus !== " " && file.indexStatus !== "?").map((file) => file.path);
      if (!staged.length) throw new Error("No staged files are available to commit.");
      const commit = await this.dependencies.git.commit(input.message);
      return ok({ commit, branch: status.branch, stagedFiles: staged }, staged);
    });
    this.executors.set("git.pull", async () => {
      const status = await this.dependencies.git.status();
      if (status.files.length) throw new Error("Pull is blocked while the working tree is dirty.");
      await this.dependencies.git.pull();
      return ok({ branch: status.branch });
    });
    this.executors.set("git.push", async () => {
      const status = await this.dependencies.git.status();
      await this.dependencies.git.push();
      return ok({ branch: status.branch });
    });
    this.executors.set("shell.run", async (input, request) => {
      const output = await this.dependencies.shell.run(input, request.id);
      return ok(output, [], { exitCode: output.exitCode, truncated: output.truncated, cancelled: output.cancelled });
    });
    this.executors.set("web.search", async (input) => ok(await this.dependencies.web.search(input.query)));
    for (const name of ["web.fetch", "web.open"]) this.executors.set(name, async (input) => ok(await this.dependencies.web.fetch(input.url)));
    this.executors.set("browser.open", async (input) => {
      if (!this.dependencies.browser) throw new Error("The FORGE Browser is unavailable.");
      if (!this.dependencies.browser.enabled()) throw new Error("Agent web research is disabled in Settings. Enable it before asking the agent to use the FORGE Browser.");
      return ok(await this.dependencies.browser.open(input.url));
    });
    this.executors.set("browser.read", async () => {
      if (!this.dependencies.browser) throw new Error("The FORGE Browser is unavailable.");
      if (!this.dependencies.browser.enabled()) throw new Error("Agent web research is disabled in Settings. Enable it before sending browser content to the model.");
      return ok(await this.dependencies.browser.read());
    });
    this.executors.set("browser.find", async (input) => {
      if (!this.dependencies.browser) throw new Error("The FORGE Browser is unavailable.");
      if (!this.dependencies.browser.enabled()) throw new Error("Agent web research is disabled in Settings. Enable it before sending browser content to the model.");
      const page = await this.dependencies.browser.read();
      const needle = input.query.toLocaleLowerCase();
      const matches = [];
      let offset = 0;
      while (matches.length < input.maxResults) {
        const index = page.text.toLocaleLowerCase().indexOf(needle, offset);
        if (index < 0) break;
        matches.push({ index, excerpt: page.text.slice(Math.max(0, index - 180), Math.min(page.text.length, index + needle.length + 420)).replace(/\s+/g, " ").trim() });
        offset = index + Math.max(1, needle.length);
      }
      return ok({ url: page.url, title: page.title, query: input.query, matches, truncated: page.truncated || matches.length >= input.maxResults });
    });
    this.executors.set("browser.savecontext", async (input) => {
      if (!this.dependencies.browser || !this.dependencies.memories) throw new Error("Browser context storage is unavailable.");
      const page = await this.dependencies.browser.read();
      const memory = await this.dependencies.memories.create({ type: "document", title: input.title, content: input.content, metadata: { source: "forge-browser", url: page.url, pageTitle: page.title, savedAt: Date.now() } });
      return ok({ memory: { id: memory.id, title: input.title, url: page.url, pageTitle: page.title, createdAt: memory.createdAt } }, [], { rollback: { available: true, instructions: `Delete durable memory ${memory.id} from Workspace Intelligence to remove this saved browser context.` } });
    });
    this.executors.set("github.read", async (input) => {
      if (!this.dependencies.github) throw new Error("GitHub integration is unavailable.");
      return ok(await this.dependencies.github.read(input.resource, input));
    });
    this.executors.set("github.mutate", async (input) => {
      if (!this.dependencies.github) throw new Error("GitHub integration is unavailable.");
      return ok(await this.dependencies.github.mutate(input.action, input.input));
    });
    this.executors.set("task.inspect", async (input) => {
      if (!this.dependencies.tasks) throw new Error("Persistent task runtime is unavailable.");
      return ok({ task: await this.dependencies.tasks.get(input.taskId) });
    });
    this.executors.set("task.create", async (input) => {
      if (!this.dependencies.tasks) throw new Error("Persistent task runtime is unavailable.");
      const { reason: _reason, ...draft } = input;
      return ok({ task: await this.dependencies.tasks.create(draft) });
    });
    this.executors.set("task.resume", async (input) => {
      if (!this.dependencies.tasks) throw new Error("Persistent task runtime is unavailable.");
      return ok({ task: await this.dependencies.tasks.resume(input.taskId) });
    });
    this.executors.set("task.pause", async (input) => {
      if (!this.dependencies.tasks) throw new Error("Persistent task runtime is unavailable.");
      return ok({ task: await this.dependencies.tasks.pause(input.taskId, input.reason) });
    });
    this.executors.set("task.cancel", async (input) => {
      if (!this.dependencies.tasks) throw new Error("Persistent task runtime is unavailable.");
      return ok({ task: await this.dependencies.tasks.cancel(input.taskId, input.reason, input.trackingOnly) });
    });
    this.executors.set("task.checkpoint", async (input) => {
      if (!this.dependencies.tasks) throw new Error("Persistent task runtime is unavailable.");
      return ok({ task: await this.dependencies.tasks.checkpoint(input.taskId, input) });
    });
    this.executors.set("task.handoff", async (input) => {
      if (!this.dependencies.tasks) throw new Error("Persistent task runtime is unavailable.");
      const handoff = await this.dependencies.tasks.generateHandoff(input.taskId);
      return ok({ handoff }, handoff.relativePath ? [handoff.relativePath] : []);
    });
    this.executors.set("task.process.start", async (input, request) => {
      if (!this.dependencies.tasks) throw new Error("Persistent task runtime is unavailable.");
      const processInput = { command: input.command, args: input.args, workingDirectory: input.workingDirectory, timeoutMs: input.timeoutMs, environment: input.environment, environmentAllowlist: input.environmentAllowlist, reason: input.reason, expectedOutcome: input.expectedOutcome };
      const started = await this.dependencies.tasks.startBackground(input.taskId, input.stepId, processInput, request.id);
      return ok({ started }, started.process?.outputPath ? [started.process.outputPath] : []);
    });
  }
  root(request) {
    const root = this.workspaceRoots.get(request.workspaceId);
    if (!root) throw new Error("Workspace root is unavailable for this request.");
    return root;
  }
  assertNotDirty(relative) {
    if (this.dependencies.dirtyPaths().has(relative)) throw new Error(`The editor has unsaved content for ${relative}; save or discard it before tool execution.`);
  }
}
async function pathExists(absolute) {
  try {
    await promises.access(absolute);
    return true;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return false;
    throw error;
  }
}
function applyReplacement(content, expected, replacement, replaceAll) {
  if (!content.includes(expected)) throw new Error("Patch precondition failed: expected text was not found.");
  if (!replaceAll && content.indexOf(expected) !== content.lastIndexOf(expected)) throw new Error("Patch is ambiguous; expected text occurs more than once.");
  return replaceAll ? content.split(expected).join(replacement) : content.replace(expected, replacement);
}
function parseStructuredToolFallback(provider, text) {
  const trimmed = text.trim();
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) return null;
  let value;
  try {
    value = JSON.parse(trimmed);
  } catch {
    return null;
  }
  const parsed = z.object({ type: z.literal("forge_tool_request"), id: z.string().optional(), tool: z.string(), arguments: z.unknown() }).strict().safeParse(value);
  if (!parsed.success) return null;
  return { id: parsed.data.id ?? randomUUID(), name: parsed.data.tool, arguments: parsed.data.arguments, provider };
}
const SECRET_NAME = /(?:^|_)(?:TOKEN|SECRET|PASSWORD|PASS|KEY|CREDENTIAL|AUTH)(?:_|$)/i;
const SAFE_PARENT_ENV = ["PATH", "LANG", "LC_ALL", "TERM", "TMPDIR"];
async function resolveWorkspacePath(workspaceRoot, requested = ".") {
  if (path__default.isAbsolute(requested)) throw new Error("Absolute paths require a separate, explicitly approved policy.");
  const root = await promises.realpath(workspaceRoot);
  const candidate = path__default.resolve(root, requested);
  const resolved = await promises.realpath(candidate);
  if (resolved !== root && !resolved.startsWith(`${root}${path__default.sep}`)) throw new Error("Working directory escapes the active workspace.");
  const stat = await promises.stat(resolved);
  if (!stat.isDirectory()) throw new Error("Working directory must be a directory.");
  return resolved;
}
function filteredEnvironment(requested = {}, allowlist = []) {
  const allowed = new Set(allowlist);
  const environment = {};
  for (const name of SAFE_PARENT_ENV) if (process.env[name]) environment[name] = process.env[name];
  for (const [name, value] of Object.entries(requested)) {
    if (!allowed.has(name)) continue;
    if (SECRET_NAME.test(name)) throw new Error(`Secret-like environment variable is blocked: ${name}`);
    environment[name] = value;
  }
  return environment;
}
function terminalEnvironment(shell2) {
  const home = os.homedir();
  const username = os.userInfo().username;
  const inherited = filteredEnvironment();
  const pathEntries = [
    `${home}/.local/bin`,
    `${home}/.opencode/bin`,
    "/opt/homebrew/bin",
    "/opt/homebrew/sbin",
    "/usr/local/bin",
    ...(inherited.PATH ?? "").split(path__default.delimiter)
  ].filter(Boolean);
  return {
    ...inherited,
    HOME: home,
    USER: username,
    LOGNAME: username,
    SHELL: shell2,
    TERM: inherited.TERM ?? "xterm-256color",
    COLORTERM: "truecolor",
    TERM_PROGRAM: "FORGE",
    PATH: [...new Set(pathEntries)].join(path__default.delimiter)
  };
}
class ShellService {
  constructor(workspaceRoot, outputLimit = 1e6) {
    this.workspaceRoot = workspaceRoot;
    this.outputLimit = outputLimit;
  }
  running = /* @__PURE__ */ new Map();
  async run(input, requestId = randomUUID()) {
    const root = this.workspaceRoot();
    if (!root) throw new Error("Open a workspace before running a shell tool.");
    if (!input.command.trim() || input.command.includes("\0")) throw new Error("A valid executable is required.");
    if (input.args.some((argument) => argument.includes("\0"))) throw new Error("Shell arguments may not contain null bytes.");
    const cwd = await resolveWorkspacePath(root, input.workingDirectory || ".");
    const timeoutMs = Math.min(Math.max(input.timeoutMs, 100), 10 * 6e4);
    const environment = filteredEnvironment(input.environment, input.environmentAllowlist);
    return new Promise((resolve, reject) => {
      let stdout = "";
      let stderr = "";
      let truncated = false;
      let timedOut = false;
      let cancelled = false;
      let settled = false;
      const child = spawn(input.command, input.args, { cwd, env: environment, shell: false, detached: process.platform !== "win32", stdio: ["ignore", "pipe", "pipe"] });
      this.running.set(requestId, child);
      const append = (current, chunk) => {
        if (current.length >= this.outputLimit) {
          truncated = true;
          return current;
        }
        const next = current + chunk.toString("utf8");
        if (next.length > this.outputLimit) {
          truncated = true;
          return next.slice(0, this.outputLimit);
        }
        return next;
      };
      child.stdout?.on("data", (chunk) => {
        stdout = append(stdout, chunk);
      });
      child.stderr?.on("data", (chunk) => {
        stderr = append(stderr, chunk);
      });
      const stopTree = () => {
        if (!child.pid) return;
        try {
          if (process.platform === "win32") child.kill("SIGTERM");
          else process.kill(-child.pid, "SIGTERM");
        } catch {
          child.kill("SIGTERM");
        }
      };
      const timer = setTimeout(() => {
        timedOut = true;
        stopTree();
      }, timeoutMs);
      child.once("error", (error) => {
        clearTimeout(timer);
        this.running.delete(requestId);
        if (!settled) {
          settled = true;
          reject(error);
        }
      });
      child.once("close", (code, signal) => {
        clearTimeout(timer);
        this.running.delete(requestId);
        cancelled = cancelled || this.cancelled.has(requestId);
        this.cancelled.delete(requestId);
        if (!settled) {
          settled = true;
          resolve({ stdout, stderr, exitCode: code, signal, timedOut, cancelled, truncated });
        }
      });
    });
  }
  async startBackground(input, outputPath, requestId = randomUUID()) {
    const root = this.workspaceRoot();
    if (!root) throw new Error("Open a workspace before running a background shell task.");
    if (!input.command.trim() || input.command.includes("\0") || input.args.some((argument) => argument.includes("\0"))) throw new Error("A valid executable and null-free arguments are required.");
    if (!outputPath || path__default.isAbsolute(outputPath) || outputPath.split(/[\\/]/).includes("..")) throw new Error("Background output path must be workspace-relative.");
    const cwd = await resolveWorkspacePath(root, input.workingDirectory || ".");
    const realRoot = await promises.realpath(root);
    const requestedOutput = path__default.resolve(root, outputPath);
    if (requestedOutput === path__default.resolve(root) || !requestedOutput.startsWith(`${path__default.resolve(root)}${path__default.sep}`)) throw new Error("Background output path escapes the active workspace.");
    await promises.mkdir(path__default.dirname(requestedOutput), { recursive: true });
    const realParent = await promises.realpath(path__default.dirname(requestedOutput));
    if (realParent !== realRoot && !realParent.startsWith(`${realRoot}${path__default.sep}`)) throw new Error("Background output path resolves outside the active workspace.");
    const absoluteOutput = path__default.join(realParent, path__default.basename(requestedOutput));
    const output = await promises.open(absoluteOutput, "a");
    const environment = filteredEnvironment(input.environment, input.environmentAllowlist);
    const startedAt = Date.now();
    return new Promise((resolve, reject) => {
      const child = spawn(input.command, input.args, { cwd, env: environment, shell: false, detached: true, stdio: ["ignore", output.fd, output.fd] });
      const cleanupError = (error) => {
        this.running.delete(requestId);
        void output.close();
        reject(error);
      };
      child.once("error", cleanupError);
      child.once("spawn", () => {
        child.removeListener("error", cleanupError);
        this.running.set(requestId, child);
        child.unref();
        void output.close();
        const timeoutMs = Math.min(Math.max(input.timeoutMs, 100), 24 * 60 * 6e4);
        const timer = setTimeout(() => {
          const running = this.running.get(requestId);
          if (!running?.pid) return;
          try {
            if (process.platform === "win32") running.kill("SIGTERM");
            else process.kill(-running.pid, "SIGTERM");
          } catch {
            running.kill("SIGTERM");
          }
        }, timeoutMs);
        timer.unref();
        child.once("close", () => {
          clearTimeout(timer);
          this.running.delete(requestId);
        });
        resolve({ requestId, pid: child.pid, outputPath, startedAt });
      });
    });
  }
  cancelled = /* @__PURE__ */ new Set();
  cancel(requestId) {
    const child = this.running.get(requestId);
    if (!child?.pid) return false;
    this.cancelled.add(requestId);
    try {
      if (process.platform === "win32") child.kill("SIGTERM");
      else process.kill(-child.pid, "SIGTERM");
    } catch {
      child.kill("SIGTERM");
    }
    return true;
  }
}
class TerminalService {
  constructor(workspaceRoot, publish, outputLimit = 12e4) {
    this.workspaceRoot = workspaceRoot;
    this.publish = publish;
    this.outputLimit = outputLimit;
  }
  sessions = /* @__PURE__ */ new Map();
  async create(requestedCwd = ".", columns = 100, rows = 30, requestedId) {
    const root = this.workspaceRoot();
    if (!root) throw new Error("Open a workspace before creating a terminal.");
    const cwd = await resolveWorkspacePath(root, requestedCwd);
    const canonicalWorkspaceRoot = await promises.realpath(root);
    const id2 = requestedId ?? randomUUID();
    if (this.sessions.has(id2)) throw new Error("Terminal session already exists.");
    const shell2 = process.env.SHELL && path__default.isAbsolute(process.env.SHELL) ? process.env.SHELL : "/bin/zsh";
    const terminal = pty.spawn(shell2, ["-l"], { name: "xterm-256color", cols: Math.max(20, columns), rows: Math.max(5, rows), cwd, env: terminalEnvironment(shell2) });
    const info = { id: id2, cwd, pid: terminal.pid, state: "running", exitCode: null, createdAt: Date.now(), title: path__default.basename(cwd), recentOutput: "" };
    const session = { info, process: terminal, workspaceRoot: root, canonicalWorkspaceRoot };
    this.sessions.set(id2, session);
    terminal.onData((data) => {
      info.recentOutput = `${info.recentOutput}${data}`.slice(-this.outputLimit);
      this.publish({ sessionId: id2, type: "output", data });
    });
    terminal.onExit(({ exitCode }) => {
      info.state = "exited";
      info.exitCode = exitCode;
      this.publish({ sessionId: id2, type: "exit", exitCode });
    });
    return { ...info };
  }
  list() {
    return [...this.sessions.values()].map(({ info }) => ({ ...info }));
  }
  input(id2, data) {
    const session = this.required(id2);
    if (session.info.state !== "running") throw new Error("Terminal session is not running.");
    if (!data || data.length > 65536 || data.includes("\0")) throw new Error("Terminal input must contain between 1 and 65,536 non-null characters.");
    session.process.write(data);
  }
  resize(id2, columns, rows) {
    this.required(id2).process.resize(Math.max(20, columns), Math.max(5, rows));
  }
  terminate(id2) {
    const session = this.required(id2);
    if (session.info.state === "running") session.process.kill();
  }
  async restart(id2) {
    const current = this.required(id2);
    const relative = path__default.relative(current.canonicalWorkspaceRoot, current.info.cwd) || ".";
    this.terminate(id2);
    this.sessions.delete(id2);
    return this.create(relative, 100, 30, id2);
  }
  remove(id2) {
    this.terminate(id2);
    this.sessions.delete(id2);
  }
  dispose() {
    for (const id2 of [...this.sessions.keys()]) this.remove(id2);
  }
  required(id2) {
    const session = this.sessions.get(id2);
    if (!session) throw new Error("Unknown terminal session.");
    if (this.workspaceRoot() !== session.workspaceRoot) throw new Error("Terminal session does not belong to the active workspace.");
    return session;
  }
}
function privateAddress(address) {
  if (address === "::1" || address === "::" || /^fe[89ab][0-9a-f]:/i.test(address) || /^f[cd][0-9a-f]{2}:/i.test(address)) return true;
  const match = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(address);
  if (!match) return false;
  const [a, b] = [Number(match[1]), Number(match[2])];
  return a === 0 || a === 10 || a === 127 || a === 169 && b === 254 || a === 172 && b >= 16 && b <= 31 || a === 192 && b === 168 || a >= 224;
}
async function validateExternalUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("A valid external URL is required.");
  }
  if (!["https:", "http:"].includes(url.protocol)) throw new Error("Only HTTP and HTTPS URLs are allowed.");
  if (url.username || url.password) throw new Error("Credentials in URLs are forbidden.");
  const hostname = url.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local")) throw new Error("Local-network URLs are blocked.");
  if (isIP(hostname) && privateAddress(hostname)) throw new Error("Private and local network addresses are blocked.");
  const addresses = await lookup$1(hostname, { all: true });
  if (!addresses.length || addresses.some(({ address }) => privateAddress(address))) throw new Error("The URL resolves to a private or unsafe network address.");
  return url;
}
class WebService {
  constructor(enabled, maxBytes = 2e6) {
    this.enabled = enabled;
    this.maxBytes = maxBytes;
  }
  dispatcher = new Agent$1({ connect: { lookup: (hostname, options, callback) => {
    const complete = callback;
    lookup(hostname, { family: options.family, hints: options.hints, all: true, verbatim: true }, (error, addresses) => {
      if (error) {
        complete(error, []);
        return;
      }
      const publicAddresses = addresses.filter((candidate) => !privateAddress(candidate.address));
      const address = publicAddresses.find((candidate) => candidate.family === 4) ?? publicAddresses[0];
      if (!address) {
        complete(Object.assign(new Error("Connection to a private or local network address was blocked."), { code: "FORGE_PRIVATE_ADDRESS" }), []);
        return;
      }
      complete(null, [address]);
    });
  } } });
  async fetch(urlValue, timeoutMs = 2e4) {
    if (!this.enabled()) throw new Error("External web research is disabled in Settings.");
    let url = await validateExternalUrl(urlValue);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.min(Math.max(timeoutMs, 500), 6e4));
    try {
      for (let redirects = 0; redirects <= 4; redirects += 1) {
        const response = await fetch$1(url, { dispatcher: this.dispatcher, signal: controller.signal, redirect: "manual", headers: { Accept: "text/html,text/plain,application/json;q=0.9", "User-Agent": "FORGE/1.1 external-research" } });
        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get("location");
          if (!location) throw new Error("External server returned an invalid redirect.");
          url = await validateExternalUrl(new URL(location, url).toString());
          continue;
        }
        const contentType = response.headers.get("content-type") ?? "application/octet-stream";
        if (!/(?:text\/|application\/(?:json|xml|xhtml\+xml))/i.test(contentType)) throw new Error(`Unsupported external content type: ${contentType}`);
        const buffer = new Uint8Array(await response.arrayBuffer());
        const truncated = buffer.byteLength > this.maxBytes;
        const body = new TextDecoder().decode(buffer.slice(0, this.maxBytes));
        const citations = [...body.matchAll(/<a\s+[^>]*href=["'](https?:\/\/[^"']+)["'][^>]*>(.*?)<\/a>/gi)].slice(0, 30).map((match) => ({ url: match[1], title: match[2].replace(/<[^>]+>/g, "").trim() || match[1] }));
        return { url: url.toString(), status: response.status, contentType, body, truncated, citations };
      }
      throw new Error("Too many external redirects.");
    } finally {
      clearTimeout(timer);
    }
  }
  async search(query, timeoutMs = 2e4) {
    const normalized = query.trim();
    if (!normalized) throw new Error("A search query is required.");
    if (normalized.length > 1e3) throw new Error("Search query is too long.");
    const response = await this.fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(normalized)}`, timeoutMs);
    const results = [...response.body.matchAll(/<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>(.*?)<\/a>[\s\S]*?<a[^>]+class="result__snippet"[^>]*>(.*?)<\/a>/gi)].slice(0, 10).map((match) => ({
      title: match[2].replace(/<[^>]+>/g, "").trim(),
      url: match[1],
      excerpt: match[3].replace(/<[^>]+>/g, "").trim(),
      sourceType: "external-web",
      fetchedAt: Date.now()
    }));
    return { query: normalized, results };
  }
}
var semver = { exports: {} };
var hasRequiredSemver;
function requireSemver() {
  if (hasRequiredSemver) return semver.exports;
  hasRequiredSemver = 1;
  (function(module, exports) {
    exports = module.exports = SemVer;
    var debug;
    if (typeof process === "object" && process.env && process.env.NODE_DEBUG && /\bsemver\b/i.test(process.env.NODE_DEBUG)) {
      debug = function() {
        var args = Array.prototype.slice.call(arguments, 0);
        args.unshift("SEMVER");
        console.log.apply(console, args);
      };
    } else {
      debug = function() {
      };
    }
    exports.SEMVER_SPEC_VERSION = "2.0.0";
    var MAX_LENGTH = 256;
    var MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER || /* istanbul ignore next */
    9007199254740991;
    var MAX_SAFE_COMPONENT_LENGTH = 16;
    var MAX_SAFE_BUILD_LENGTH = MAX_LENGTH - 6;
    var re2 = exports.re = [];
    var safeRe = exports.safeRe = [];
    var src = exports.src = [];
    var t = exports.tokens = {};
    var R = 0;
    function tok(n) {
      t[n] = R++;
    }
    var LETTERDASHNUMBER = "[a-zA-Z0-9-]";
    var safeRegexReplacements = [
      ["\\s", 1],
      ["\\d", MAX_LENGTH],
      [LETTERDASHNUMBER, MAX_SAFE_BUILD_LENGTH]
    ];
    function makeSafeRe(value) {
      for (var i2 = 0; i2 < safeRegexReplacements.length; i2++) {
        var token = safeRegexReplacements[i2][0];
        var max = safeRegexReplacements[i2][1];
        value = value.split(token + "*").join(token + "{0," + max + "}").split(token + "+").join(token + "{1," + max + "}");
      }
      return value;
    }
    tok("NUMERICIDENTIFIER");
    src[t.NUMERICIDENTIFIER] = "0|[1-9]\\d*";
    tok("NUMERICIDENTIFIERLOOSE");
    src[t.NUMERICIDENTIFIERLOOSE] = "\\d+";
    tok("NONNUMERICIDENTIFIER");
    src[t.NONNUMERICIDENTIFIER] = "\\d*[a-zA-Z-]" + LETTERDASHNUMBER + "*";
    tok("MAINVERSION");
    src[t.MAINVERSION] = "(" + src[t.NUMERICIDENTIFIER] + ")\\.(" + src[t.NUMERICIDENTIFIER] + ")\\.(" + src[t.NUMERICIDENTIFIER] + ")";
    tok("MAINVERSIONLOOSE");
    src[t.MAINVERSIONLOOSE] = "(" + src[t.NUMERICIDENTIFIERLOOSE] + ")\\.(" + src[t.NUMERICIDENTIFIERLOOSE] + ")\\.(" + src[t.NUMERICIDENTIFIERLOOSE] + ")";
    tok("PRERELEASEIDENTIFIER");
    src[t.PRERELEASEIDENTIFIER] = "(?:" + src[t.NUMERICIDENTIFIER] + "|" + src[t.NONNUMERICIDENTIFIER] + ")";
    tok("PRERELEASEIDENTIFIERLOOSE");
    src[t.PRERELEASEIDENTIFIERLOOSE] = "(?:" + src[t.NUMERICIDENTIFIERLOOSE] + "|" + src[t.NONNUMERICIDENTIFIER] + ")";
    tok("PRERELEASE");
    src[t.PRERELEASE] = "(?:-(" + src[t.PRERELEASEIDENTIFIER] + "(?:\\." + src[t.PRERELEASEIDENTIFIER] + ")*))";
    tok("PRERELEASELOOSE");
    src[t.PRERELEASELOOSE] = "(?:-?(" + src[t.PRERELEASEIDENTIFIERLOOSE] + "(?:\\." + src[t.PRERELEASEIDENTIFIERLOOSE] + ")*))";
    tok("BUILDIDENTIFIER");
    src[t.BUILDIDENTIFIER] = LETTERDASHNUMBER + "+";
    tok("BUILD");
    src[t.BUILD] = "(?:\\+(" + src[t.BUILDIDENTIFIER] + "(?:\\." + src[t.BUILDIDENTIFIER] + ")*))";
    tok("FULL");
    tok("FULLPLAIN");
    src[t.FULLPLAIN] = "v?" + src[t.MAINVERSION] + src[t.PRERELEASE] + "?" + src[t.BUILD] + "?";
    src[t.FULL] = "^" + src[t.FULLPLAIN] + "$";
    tok("LOOSEPLAIN");
    src[t.LOOSEPLAIN] = "[v=\\s]*" + src[t.MAINVERSIONLOOSE] + src[t.PRERELEASELOOSE] + "?" + src[t.BUILD] + "?";
    tok("LOOSE");
    src[t.LOOSE] = "^" + src[t.LOOSEPLAIN] + "$";
    tok("GTLT");
    src[t.GTLT] = "((?:<|>)?=?)";
    tok("XRANGEIDENTIFIERLOOSE");
    src[t.XRANGEIDENTIFIERLOOSE] = src[t.NUMERICIDENTIFIERLOOSE] + "|x|X|\\*";
    tok("XRANGEIDENTIFIER");
    src[t.XRANGEIDENTIFIER] = src[t.NUMERICIDENTIFIER] + "|x|X|\\*";
    tok("XRANGEPLAIN");
    src[t.XRANGEPLAIN] = "[v=\\s]*(" + src[t.XRANGEIDENTIFIER] + ")(?:\\.(" + src[t.XRANGEIDENTIFIER] + ")(?:\\.(" + src[t.XRANGEIDENTIFIER] + ")(?:" + src[t.PRERELEASE] + ")?" + src[t.BUILD] + "?)?)?";
    tok("XRANGEPLAINLOOSE");
    src[t.XRANGEPLAINLOOSE] = "[v=\\s]*(" + src[t.XRANGEIDENTIFIERLOOSE] + ")(?:\\.(" + src[t.XRANGEIDENTIFIERLOOSE] + ")(?:\\.(" + src[t.XRANGEIDENTIFIERLOOSE] + ")(?:" + src[t.PRERELEASELOOSE] + ")?" + src[t.BUILD] + "?)?)?";
    tok("XRANGE");
    src[t.XRANGE] = "^" + src[t.GTLT] + "\\s*" + src[t.XRANGEPLAIN] + "$";
    tok("XRANGELOOSE");
    src[t.XRANGELOOSE] = "^" + src[t.GTLT] + "\\s*" + src[t.XRANGEPLAINLOOSE] + "$";
    tok("COERCE");
    src[t.COERCE] = "(^|[^\\d])(\\d{1," + MAX_SAFE_COMPONENT_LENGTH + "})(?:\\.(\\d{1," + MAX_SAFE_COMPONENT_LENGTH + "}))?(?:\\.(\\d{1," + MAX_SAFE_COMPONENT_LENGTH + "}))?(?:$|[^\\d])";
    tok("COERCERTL");
    re2[t.COERCERTL] = new RegExp(src[t.COERCE], "g");
    safeRe[t.COERCERTL] = new RegExp(makeSafeRe(src[t.COERCE]), "g");
    tok("LONETILDE");
    src[t.LONETILDE] = "(?:~>?)";
    tok("TILDETRIM");
    src[t.TILDETRIM] = "(\\s*)" + src[t.LONETILDE] + "\\s+";
    re2[t.TILDETRIM] = new RegExp(src[t.TILDETRIM], "g");
    safeRe[t.TILDETRIM] = new RegExp(makeSafeRe(src[t.TILDETRIM]), "g");
    var tildeTrimReplace = "$1~";
    tok("TILDE");
    src[t.TILDE] = "^" + src[t.LONETILDE] + src[t.XRANGEPLAIN] + "$";
    tok("TILDELOOSE");
    src[t.TILDELOOSE] = "^" + src[t.LONETILDE] + src[t.XRANGEPLAINLOOSE] + "$";
    tok("LONECARET");
    src[t.LONECARET] = "(?:\\^)";
    tok("CARETTRIM");
    src[t.CARETTRIM] = "(\\s*)" + src[t.LONECARET] + "\\s+";
    re2[t.CARETTRIM] = new RegExp(src[t.CARETTRIM], "g");
    safeRe[t.CARETTRIM] = new RegExp(makeSafeRe(src[t.CARETTRIM]), "g");
    var caretTrimReplace = "$1^";
    tok("CARET");
    src[t.CARET] = "^" + src[t.LONECARET] + src[t.XRANGEPLAIN] + "$";
    tok("CARETLOOSE");
    src[t.CARETLOOSE] = "^" + src[t.LONECARET] + src[t.XRANGEPLAINLOOSE] + "$";
    tok("COMPARATORLOOSE");
    src[t.COMPARATORLOOSE] = "^" + src[t.GTLT] + "\\s*(" + src[t.LOOSEPLAIN] + ")$|^$";
    tok("COMPARATOR");
    src[t.COMPARATOR] = "^" + src[t.GTLT] + "\\s*(" + src[t.FULLPLAIN] + ")$|^$";
    tok("COMPARATORTRIM");
    src[t.COMPARATORTRIM] = "(\\s*)" + src[t.GTLT] + "\\s*(" + src[t.LOOSEPLAIN] + "|" + src[t.XRANGEPLAIN] + ")";
    re2[t.COMPARATORTRIM] = new RegExp(src[t.COMPARATORTRIM], "g");
    safeRe[t.COMPARATORTRIM] = new RegExp(makeSafeRe(src[t.COMPARATORTRIM]), "g");
    var comparatorTrimReplace = "$1$2$3";
    tok("HYPHENRANGE");
    src[t.HYPHENRANGE] = "^\\s*(" + src[t.XRANGEPLAIN] + ")\\s+-\\s+(" + src[t.XRANGEPLAIN] + ")\\s*$";
    tok("HYPHENRANGELOOSE");
    src[t.HYPHENRANGELOOSE] = "^\\s*(" + src[t.XRANGEPLAINLOOSE] + ")\\s+-\\s+(" + src[t.XRANGEPLAINLOOSE] + ")\\s*$";
    tok("STAR");
    src[t.STAR] = "(<|>)?=?\\s*\\*";
    for (var i = 0; i < R; i++) {
      debug(i, src[i]);
      if (!re2[i]) {
        re2[i] = new RegExp(src[i]);
        safeRe[i] = new RegExp(makeSafeRe(src[i]));
      }
    }
    exports.parse = parse;
    function parse(version, options) {
      if (!options || typeof options !== "object") {
        options = {
          loose: !!options,
          includePrerelease: false
        };
      }
      if (version instanceof SemVer) {
        return version;
      }
      if (typeof version !== "string") {
        return null;
      }
      if (version.length > MAX_LENGTH) {
        return null;
      }
      var r = options.loose ? safeRe[t.LOOSE] : safeRe[t.FULL];
      if (!r.test(version)) {
        return null;
      }
      try {
        return new SemVer(version, options);
      } catch (er) {
        return null;
      }
    }
    exports.valid = valid2;
    function valid2(version, options) {
      var v = parse(version, options);
      return v ? v.version : null;
    }
    exports.clean = clean;
    function clean(version, options) {
      var s = parse(version.trim().replace(/^[=v]+/, ""), options);
      return s ? s.version : null;
    }
    exports.SemVer = SemVer;
    function SemVer(version, options) {
      if (!options || typeof options !== "object") {
        options = {
          loose: !!options,
          includePrerelease: false
        };
      }
      if (version instanceof SemVer) {
        if (version.loose === options.loose) {
          return version;
        } else {
          version = version.version;
        }
      } else if (typeof version !== "string") {
        throw new TypeError("Invalid Version: " + version);
      }
      if (version.length > MAX_LENGTH) {
        throw new TypeError("version is longer than " + MAX_LENGTH + " characters");
      }
      if (!(this instanceof SemVer)) {
        return new SemVer(version, options);
      }
      debug("SemVer", version, options);
      this.options = options;
      this.loose = !!options.loose;
      var m = version.trim().match(options.loose ? safeRe[t.LOOSE] : safeRe[t.FULL]);
      if (!m) {
        throw new TypeError("Invalid Version: " + version);
      }
      this.raw = version;
      this.major = +m[1];
      this.minor = +m[2];
      this.patch = +m[3];
      if (this.major > MAX_SAFE_INTEGER || this.major < 0) {
        throw new TypeError("Invalid major version");
      }
      if (this.minor > MAX_SAFE_INTEGER || this.minor < 0) {
        throw new TypeError("Invalid minor version");
      }
      if (this.patch > MAX_SAFE_INTEGER || this.patch < 0) {
        throw new TypeError("Invalid patch version");
      }
      if (!m[4]) {
        this.prerelease = [];
      } else {
        this.prerelease = m[4].split(".").map(function(id2) {
          if (/^[0-9]+$/.test(id2)) {
            var num = +id2;
            if (num >= 0 && num < MAX_SAFE_INTEGER) {
              return num;
            }
          }
          return id2;
        });
      }
      this.build = m[5] ? m[5].split(".") : [];
      this.format();
    }
    SemVer.prototype.format = function() {
      this.version = this.major + "." + this.minor + "." + this.patch;
      if (this.prerelease.length) {
        this.version += "-" + this.prerelease.join(".");
      }
      return this.version;
    };
    SemVer.prototype.toString = function() {
      return this.version;
    };
    SemVer.prototype.compare = function(other) {
      debug("SemVer.compare", this.version, this.options, other);
      if (!(other instanceof SemVer)) {
        other = new SemVer(other, this.options);
      }
      return this.compareMain(other) || this.comparePre(other);
    };
    SemVer.prototype.compareMain = function(other) {
      if (!(other instanceof SemVer)) {
        other = new SemVer(other, this.options);
      }
      return compareIdentifiers(this.major, other.major) || compareIdentifiers(this.minor, other.minor) || compareIdentifiers(this.patch, other.patch);
    };
    SemVer.prototype.comparePre = function(other) {
      if (!(other instanceof SemVer)) {
        other = new SemVer(other, this.options);
      }
      if (this.prerelease.length && !other.prerelease.length) {
        return -1;
      } else if (!this.prerelease.length && other.prerelease.length) {
        return 1;
      } else if (!this.prerelease.length && !other.prerelease.length) {
        return 0;
      }
      var i2 = 0;
      do {
        var a = this.prerelease[i2];
        var b = other.prerelease[i2];
        debug("prerelease compare", i2, a, b);
        if (a === void 0 && b === void 0) {
          return 0;
        } else if (b === void 0) {
          return 1;
        } else if (a === void 0) {
          return -1;
        } else if (a === b) {
          continue;
        } else {
          return compareIdentifiers(a, b);
        }
      } while (++i2);
    };
    SemVer.prototype.compareBuild = function(other) {
      if (!(other instanceof SemVer)) {
        other = new SemVer(other, this.options);
      }
      var i2 = 0;
      do {
        var a = this.build[i2];
        var b = other.build[i2];
        debug("prerelease compare", i2, a, b);
        if (a === void 0 && b === void 0) {
          return 0;
        } else if (b === void 0) {
          return 1;
        } else if (a === void 0) {
          return -1;
        } else if (a === b) {
          continue;
        } else {
          return compareIdentifiers(a, b);
        }
      } while (++i2);
    };
    SemVer.prototype.inc = function(release, identifier) {
      switch (release) {
        case "premajor":
          this.prerelease.length = 0;
          this.patch = 0;
          this.minor = 0;
          this.major++;
          this.inc("pre", identifier);
          break;
        case "preminor":
          this.prerelease.length = 0;
          this.patch = 0;
          this.minor++;
          this.inc("pre", identifier);
          break;
        case "prepatch":
          this.prerelease.length = 0;
          this.inc("patch", identifier);
          this.inc("pre", identifier);
          break;
        // If the input is a non-prerelease version, this acts the same as
        // prepatch.
        case "prerelease":
          if (this.prerelease.length === 0) {
            this.inc("patch", identifier);
          }
          this.inc("pre", identifier);
          break;
        case "major":
          if (this.minor !== 0 || this.patch !== 0 || this.prerelease.length === 0) {
            this.major++;
          }
          this.minor = 0;
          this.patch = 0;
          this.prerelease = [];
          break;
        case "minor":
          if (this.patch !== 0 || this.prerelease.length === 0) {
            this.minor++;
          }
          this.patch = 0;
          this.prerelease = [];
          break;
        case "patch":
          if (this.prerelease.length === 0) {
            this.patch++;
          }
          this.prerelease = [];
          break;
        // This probably shouldn't be used publicly.
        // 1.0.0 "pre" would become 1.0.0-0 which is the wrong direction.
        case "pre":
          if (this.prerelease.length === 0) {
            this.prerelease = [0];
          } else {
            var i2 = this.prerelease.length;
            while (--i2 >= 0) {
              if (typeof this.prerelease[i2] === "number") {
                this.prerelease[i2]++;
                i2 = -2;
              }
            }
            if (i2 === -1) {
              this.prerelease.push(0);
            }
          }
          if (identifier) {
            if (this.prerelease[0] === identifier) {
              if (isNaN(this.prerelease[1])) {
                this.prerelease = [identifier, 0];
              }
            } else {
              this.prerelease = [identifier, 0];
            }
          }
          break;
        default:
          throw new Error("invalid increment argument: " + release);
      }
      this.format();
      this.raw = this.version;
      return this;
    };
    exports.inc = inc;
    function inc(version, release, loose, identifier) {
      if (typeof loose === "string") {
        identifier = loose;
        loose = void 0;
      }
      try {
        return new SemVer(version, loose).inc(release, identifier).version;
      } catch (er) {
        return null;
      }
    }
    exports.diff = diff;
    function diff(version1, version2) {
      if (eq(version1, version2)) {
        return null;
      } else {
        var v1 = parse(version1);
        var v2 = parse(version2);
        var prefix = "";
        if (v1.prerelease.length || v2.prerelease.length) {
          prefix = "pre";
          var defaultResult = "prerelease";
        }
        for (var key in v1) {
          if (key === "major" || key === "minor" || key === "patch") {
            if (v1[key] !== v2[key]) {
              return prefix + key;
            }
          }
        }
        return defaultResult;
      }
    }
    exports.compareIdentifiers = compareIdentifiers;
    var numeric = /^[0-9]+$/;
    function compareIdentifiers(a, b) {
      var anum = numeric.test(a);
      var bnum = numeric.test(b);
      if (anum && bnum) {
        a = +a;
        b = +b;
      }
      return a === b ? 0 : anum && !bnum ? -1 : bnum && !anum ? 1 : a < b ? -1 : 1;
    }
    exports.rcompareIdentifiers = rcompareIdentifiers;
    function rcompareIdentifiers(a, b) {
      return compareIdentifiers(b, a);
    }
    exports.major = major;
    function major(a, loose) {
      return new SemVer(a, loose).major;
    }
    exports.minor = minor;
    function minor(a, loose) {
      return new SemVer(a, loose).minor;
    }
    exports.patch = patch;
    function patch(a, loose) {
      return new SemVer(a, loose).patch;
    }
    exports.compare = compare;
    function compare(a, b, loose) {
      return new SemVer(a, loose).compare(new SemVer(b, loose));
    }
    exports.compareLoose = compareLoose;
    function compareLoose(a, b) {
      return compare(a, b, true);
    }
    exports.compareBuild = compareBuild;
    function compareBuild(a, b, loose) {
      var versionA = new SemVer(a, loose);
      var versionB = new SemVer(b, loose);
      return versionA.compare(versionB) || versionA.compareBuild(versionB);
    }
    exports.rcompare = rcompare;
    function rcompare(a, b, loose) {
      return compare(b, a, loose);
    }
    exports.sort = sort;
    function sort(list, loose) {
      return list.sort(function(a, b) {
        return exports.compareBuild(a, b, loose);
      });
    }
    exports.rsort = rsort;
    function rsort(list, loose) {
      return list.sort(function(a, b) {
        return exports.compareBuild(b, a, loose);
      });
    }
    exports.gt = gt;
    function gt(a, b, loose) {
      return compare(a, b, loose) > 0;
    }
    exports.lt = lt;
    function lt(a, b, loose) {
      return compare(a, b, loose) < 0;
    }
    exports.eq = eq;
    function eq(a, b, loose) {
      return compare(a, b, loose) === 0;
    }
    exports.neq = neq;
    function neq(a, b, loose) {
      return compare(a, b, loose) !== 0;
    }
    exports.gte = gte;
    function gte(a, b, loose) {
      return compare(a, b, loose) >= 0;
    }
    exports.lte = lte;
    function lte(a, b, loose) {
      return compare(a, b, loose) <= 0;
    }
    exports.cmp = cmp;
    function cmp(a, op, b, loose) {
      switch (op) {
        case "===":
          if (typeof a === "object")
            a = a.version;
          if (typeof b === "object")
            b = b.version;
          return a === b;
        case "!==":
          if (typeof a === "object")
            a = a.version;
          if (typeof b === "object")
            b = b.version;
          return a !== b;
        case "":
        case "=":
        case "==":
          return eq(a, b, loose);
        case "!=":
          return neq(a, b, loose);
        case ">":
          return gt(a, b, loose);
        case ">=":
          return gte(a, b, loose);
        case "<":
          return lt(a, b, loose);
        case "<=":
          return lte(a, b, loose);
        default:
          throw new TypeError("Invalid operator: " + op);
      }
    }
    exports.Comparator = Comparator;
    function Comparator(comp, options) {
      if (!options || typeof options !== "object") {
        options = {
          loose: !!options,
          includePrerelease: false
        };
      }
      if (comp instanceof Comparator) {
        if (comp.loose === !!options.loose) {
          return comp;
        } else {
          comp = comp.value;
        }
      }
      if (!(this instanceof Comparator)) {
        return new Comparator(comp, options);
      }
      comp = comp.trim().split(/\s+/).join(" ");
      debug("comparator", comp, options);
      this.options = options;
      this.loose = !!options.loose;
      this.parse(comp);
      if (this.semver === ANY) {
        this.value = "";
      } else {
        this.value = this.operator + this.semver.version;
      }
      debug("comp", this);
    }
    var ANY = {};
    Comparator.prototype.parse = function(comp) {
      var r = this.options.loose ? safeRe[t.COMPARATORLOOSE] : safeRe[t.COMPARATOR];
      var m = comp.match(r);
      if (!m) {
        throw new TypeError("Invalid comparator: " + comp);
      }
      this.operator = m[1] !== void 0 ? m[1] : "";
      if (this.operator === "=") {
        this.operator = "";
      }
      if (!m[2]) {
        this.semver = ANY;
      } else {
        this.semver = new SemVer(m[2], this.options.loose);
      }
    };
    Comparator.prototype.toString = function() {
      return this.value;
    };
    Comparator.prototype.test = function(version) {
      debug("Comparator.test", version, this.options.loose);
      if (this.semver === ANY || version === ANY) {
        return true;
      }
      if (typeof version === "string") {
        try {
          version = new SemVer(version, this.options);
        } catch (er) {
          return false;
        }
      }
      return cmp(version, this.operator, this.semver, this.options);
    };
    Comparator.prototype.intersects = function(comp, options) {
      if (!(comp instanceof Comparator)) {
        throw new TypeError("a Comparator is required");
      }
      if (!options || typeof options !== "object") {
        options = {
          loose: !!options,
          includePrerelease: false
        };
      }
      var rangeTmp;
      if (this.operator === "") {
        if (this.value === "") {
          return true;
        }
        rangeTmp = new Range(comp.value, options);
        return satisfies(this.value, rangeTmp, options);
      } else if (comp.operator === "") {
        if (comp.value === "") {
          return true;
        }
        rangeTmp = new Range(this.value, options);
        return satisfies(comp.semver, rangeTmp, options);
      }
      var sameDirectionIncreasing = (this.operator === ">=" || this.operator === ">") && (comp.operator === ">=" || comp.operator === ">");
      var sameDirectionDecreasing = (this.operator === "<=" || this.operator === "<") && (comp.operator === "<=" || comp.operator === "<");
      var sameSemVer = this.semver.version === comp.semver.version;
      var differentDirectionsInclusive = (this.operator === ">=" || this.operator === "<=") && (comp.operator === ">=" || comp.operator === "<=");
      var oppositeDirectionsLessThan = cmp(this.semver, "<", comp.semver, options) && ((this.operator === ">=" || this.operator === ">") && (comp.operator === "<=" || comp.operator === "<"));
      var oppositeDirectionsGreaterThan = cmp(this.semver, ">", comp.semver, options) && ((this.operator === "<=" || this.operator === "<") && (comp.operator === ">=" || comp.operator === ">"));
      return sameDirectionIncreasing || sameDirectionDecreasing || sameSemVer && differentDirectionsInclusive || oppositeDirectionsLessThan || oppositeDirectionsGreaterThan;
    };
    exports.Range = Range;
    function Range(range2, options) {
      if (!options || typeof options !== "object") {
        options = {
          loose: !!options,
          includePrerelease: false
        };
      }
      if (range2 instanceof Range) {
        if (range2.loose === !!options.loose && range2.includePrerelease === !!options.includePrerelease) {
          return range2;
        } else {
          return new Range(range2.raw, options);
        }
      }
      if (range2 instanceof Comparator) {
        return new Range(range2.value, options);
      }
      if (!(this instanceof Range)) {
        return new Range(range2, options);
      }
      this.options = options;
      this.loose = !!options.loose;
      this.includePrerelease = !!options.includePrerelease;
      this.raw = range2.trim().split(/\s+/).join(" ");
      this.set = this.raw.split("||").map(function(range22) {
        return this.parseRange(range22.trim());
      }, this).filter(function(c) {
        return c.length;
      });
      if (!this.set.length) {
        throw new TypeError("Invalid SemVer Range: " + this.raw);
      }
      this.format();
    }
    Range.prototype.format = function() {
      this.range = this.set.map(function(comps) {
        return comps.join(" ").trim();
      }).join("||").trim();
      return this.range;
    };
    Range.prototype.toString = function() {
      return this.range;
    };
    Range.prototype.parseRange = function(range2) {
      var loose = this.options.loose;
      var hr = loose ? safeRe[t.HYPHENRANGELOOSE] : safeRe[t.HYPHENRANGE];
      range2 = range2.replace(hr, hyphenReplace);
      debug("hyphen replace", range2);
      range2 = range2.replace(safeRe[t.COMPARATORTRIM], comparatorTrimReplace);
      debug("comparator trim", range2, safeRe[t.COMPARATORTRIM]);
      range2 = range2.replace(safeRe[t.TILDETRIM], tildeTrimReplace);
      range2 = range2.replace(safeRe[t.CARETTRIM], caretTrimReplace);
      range2 = range2.split(/\s+/).join(" ");
      var compRe = loose ? safeRe[t.COMPARATORLOOSE] : safeRe[t.COMPARATOR];
      var set = range2.split(" ").map(function(comp) {
        return parseComparator(comp, this.options);
      }, this).join(" ").split(/\s+/);
      if (this.options.loose) {
        set = set.filter(function(comp) {
          return !!comp.match(compRe);
        });
      }
      set = set.map(function(comp) {
        return new Comparator(comp, this.options);
      }, this);
      return set;
    };
    Range.prototype.intersects = function(range2, options) {
      if (!(range2 instanceof Range)) {
        throw new TypeError("a Range is required");
      }
      return this.set.some(function(thisComparators) {
        return isSatisfiable(thisComparators, options) && range2.set.some(function(rangeComparators) {
          return isSatisfiable(rangeComparators, options) && thisComparators.every(function(thisComparator) {
            return rangeComparators.every(function(rangeComparator) {
              return thisComparator.intersects(rangeComparator, options);
            });
          });
        });
      });
    };
    function isSatisfiable(comparators, options) {
      var result = true;
      var remainingComparators = comparators.slice();
      var testComparator = remainingComparators.pop();
      while (result && remainingComparators.length) {
        result = remainingComparators.every(function(otherComparator) {
          return testComparator.intersects(otherComparator, options);
        });
        testComparator = remainingComparators.pop();
      }
      return result;
    }
    exports.toComparators = toComparators;
    function toComparators(range2, options) {
      return new Range(range2, options).set.map(function(comp) {
        return comp.map(function(c) {
          return c.value;
        }).join(" ").trim().split(" ");
      });
    }
    function parseComparator(comp, options) {
      debug("comp", comp, options);
      comp = replaceCarets(comp, options);
      debug("caret", comp);
      comp = replaceTildes(comp, options);
      debug("tildes", comp);
      comp = replaceXRanges(comp, options);
      debug("xrange", comp);
      comp = replaceStars(comp, options);
      debug("stars", comp);
      return comp;
    }
    function isX(id2) {
      return !id2 || id2.toLowerCase() === "x" || id2 === "*";
    }
    function replaceTildes(comp, options) {
      return comp.trim().split(/\s+/).map(function(comp2) {
        return replaceTilde(comp2, options);
      }).join(" ");
    }
    function replaceTilde(comp, options) {
      var r = options.loose ? safeRe[t.TILDELOOSE] : safeRe[t.TILDE];
      return comp.replace(r, function(_, M, m, p, pr) {
        debug("tilde", comp, _, M, m, p, pr);
        var ret;
        if (isX(M)) {
          ret = "";
        } else if (isX(m)) {
          ret = ">=" + M + ".0.0 <" + (+M + 1) + ".0.0";
        } else if (isX(p)) {
          ret = ">=" + M + "." + m + ".0 <" + M + "." + (+m + 1) + ".0";
        } else if (pr) {
          debug("replaceTilde pr", pr);
          ret = ">=" + M + "." + m + "." + p + "-" + pr + " <" + M + "." + (+m + 1) + ".0";
        } else {
          ret = ">=" + M + "." + m + "." + p + " <" + M + "." + (+m + 1) + ".0";
        }
        debug("tilde return", ret);
        return ret;
      });
    }
    function replaceCarets(comp, options) {
      return comp.trim().split(/\s+/).map(function(comp2) {
        return replaceCaret(comp2, options);
      }).join(" ");
    }
    function replaceCaret(comp, options) {
      debug("caret", comp, options);
      var r = options.loose ? safeRe[t.CARETLOOSE] : safeRe[t.CARET];
      return comp.replace(r, function(_, M, m, p, pr) {
        debug("caret", comp, _, M, m, p, pr);
        var ret;
        if (isX(M)) {
          ret = "";
        } else if (isX(m)) {
          ret = ">=" + M + ".0.0 <" + (+M + 1) + ".0.0";
        } else if (isX(p)) {
          if (M === "0") {
            ret = ">=" + M + "." + m + ".0 <" + M + "." + (+m + 1) + ".0";
          } else {
            ret = ">=" + M + "." + m + ".0 <" + (+M + 1) + ".0.0";
          }
        } else if (pr) {
          debug("replaceCaret pr", pr);
          if (M === "0") {
            if (m === "0") {
              ret = ">=" + M + "." + m + "." + p + "-" + pr + " <" + M + "." + m + "." + (+p + 1);
            } else {
              ret = ">=" + M + "." + m + "." + p + "-" + pr + " <" + M + "." + (+m + 1) + ".0";
            }
          } else {
            ret = ">=" + M + "." + m + "." + p + "-" + pr + " <" + (+M + 1) + ".0.0";
          }
        } else {
          debug("no pr");
          if (M === "0") {
            if (m === "0") {
              ret = ">=" + M + "." + m + "." + p + " <" + M + "." + m + "." + (+p + 1);
            } else {
              ret = ">=" + M + "." + m + "." + p + " <" + M + "." + (+m + 1) + ".0";
            }
          } else {
            ret = ">=" + M + "." + m + "." + p + " <" + (+M + 1) + ".0.0";
          }
        }
        debug("caret return", ret);
        return ret;
      });
    }
    function replaceXRanges(comp, options) {
      debug("replaceXRanges", comp, options);
      return comp.split(/\s+/).map(function(comp2) {
        return replaceXRange(comp2, options);
      }).join(" ");
    }
    function replaceXRange(comp, options) {
      comp = comp.trim();
      var r = options.loose ? safeRe[t.XRANGELOOSE] : safeRe[t.XRANGE];
      return comp.replace(r, function(ret, gtlt, M, m, p, pr) {
        debug("xRange", comp, ret, gtlt, M, m, p, pr);
        var xM = isX(M);
        var xm = xM || isX(m);
        var xp = xm || isX(p);
        var anyX = xp;
        if (gtlt === "=" && anyX) {
          gtlt = "";
        }
        pr = options.includePrerelease ? "-0" : "";
        if (xM) {
          if (gtlt === ">" || gtlt === "<") {
            ret = "<0.0.0-0";
          } else {
            ret = "*";
          }
        } else if (gtlt && anyX) {
          if (xm) {
            m = 0;
          }
          p = 0;
          if (gtlt === ">") {
            gtlt = ">=";
            if (xm) {
              M = +M + 1;
              m = 0;
              p = 0;
            } else {
              m = +m + 1;
              p = 0;
            }
          } else if (gtlt === "<=") {
            gtlt = "<";
            if (xm) {
              M = +M + 1;
            } else {
              m = +m + 1;
            }
          }
          ret = gtlt + M + "." + m + "." + p + pr;
        } else if (xm) {
          ret = ">=" + M + ".0.0" + pr + " <" + (+M + 1) + ".0.0" + pr;
        } else if (xp) {
          ret = ">=" + M + "." + m + ".0" + pr + " <" + M + "." + (+m + 1) + ".0" + pr;
        }
        debug("xRange return", ret);
        return ret;
      });
    }
    function replaceStars(comp, options) {
      debug("replaceStars", comp, options);
      return comp.trim().replace(safeRe[t.STAR], "");
    }
    function hyphenReplace($0, from, fM, fm, fp, fpr, fb, to, tM, tm, tp, tpr, tb) {
      if (isX(fM)) {
        from = "";
      } else if (isX(fm)) {
        from = ">=" + fM + ".0.0";
      } else if (isX(fp)) {
        from = ">=" + fM + "." + fm + ".0";
      } else {
        from = ">=" + from;
      }
      if (isX(tM)) {
        to = "";
      } else if (isX(tm)) {
        to = "<" + (+tM + 1) + ".0.0";
      } else if (isX(tp)) {
        to = "<" + tM + "." + (+tm + 1) + ".0";
      } else if (tpr) {
        to = "<=" + tM + "." + tm + "." + tp + "-" + tpr;
      } else {
        to = "<=" + to;
      }
      return (from + " " + to).trim();
    }
    Range.prototype.test = function(version) {
      if (!version) {
        return false;
      }
      if (typeof version === "string") {
        try {
          version = new SemVer(version, this.options);
        } catch (er) {
          return false;
        }
      }
      for (var i2 = 0; i2 < this.set.length; i2++) {
        if (testSet(this.set[i2], version, this.options)) {
          return true;
        }
      }
      return false;
    };
    function testSet(set, version, options) {
      for (var i2 = 0; i2 < set.length; i2++) {
        if (!set[i2].test(version)) {
          return false;
        }
      }
      if (version.prerelease.length && !options.includePrerelease) {
        for (i2 = 0; i2 < set.length; i2++) {
          debug(set[i2].semver);
          if (set[i2].semver === ANY) {
            continue;
          }
          if (set[i2].semver.prerelease.length > 0) {
            var allowed = set[i2].semver;
            if (allowed.major === version.major && allowed.minor === version.minor && allowed.patch === version.patch) {
              return true;
            }
          }
        }
        return false;
      }
      return true;
    }
    exports.satisfies = satisfies;
    function satisfies(version, range2, options) {
      try {
        range2 = new Range(range2, options);
      } catch (er) {
        return false;
      }
      return range2.test(version);
    }
    exports.maxSatisfying = maxSatisfying;
    function maxSatisfying(versions, range2, options) {
      var max = null;
      var maxSV = null;
      try {
        var rangeObj = new Range(range2, options);
      } catch (er) {
        return null;
      }
      versions.forEach(function(v) {
        if (rangeObj.test(v)) {
          if (!max || maxSV.compare(v) === -1) {
            max = v;
            maxSV = new SemVer(max, options);
          }
        }
      });
      return max;
    }
    exports.minSatisfying = minSatisfying;
    function minSatisfying(versions, range2, options) {
      var min = null;
      var minSV = null;
      try {
        var rangeObj = new Range(range2, options);
      } catch (er) {
        return null;
      }
      versions.forEach(function(v) {
        if (rangeObj.test(v)) {
          if (!min || minSV.compare(v) === 1) {
            min = v;
            minSV = new SemVer(min, options);
          }
        }
      });
      return min;
    }
    exports.minVersion = minVersion;
    function minVersion(range2, loose) {
      range2 = new Range(range2, loose);
      var minver = new SemVer("0.0.0");
      if (range2.test(minver)) {
        return minver;
      }
      minver = new SemVer("0.0.0-0");
      if (range2.test(minver)) {
        return minver;
      }
      minver = null;
      for (var i2 = 0; i2 < range2.set.length; ++i2) {
        var comparators = range2.set[i2];
        comparators.forEach(function(comparator2) {
          var compver = new SemVer(comparator2.semver.version);
          switch (comparator2.operator) {
            case ">":
              if (compver.prerelease.length === 0) {
                compver.patch++;
              } else {
                compver.prerelease.push(0);
              }
              compver.raw = compver.format();
            /* fallthrough */
            case "":
            case ">=":
              if (!minver || gt(minver, compver)) {
                minver = compver;
              }
              break;
            case "<":
            case "<=":
              break;
            /* istanbul ignore next */
            default:
              throw new Error("Unexpected operation: " + comparator2.operator);
          }
        });
      }
      if (minver && range2.test(minver)) {
        return minver;
      }
      return null;
    }
    exports.validRange = validRange;
    function validRange(range2, options) {
      try {
        return new Range(range2, options).range || "*";
      } catch (er) {
        return null;
      }
    }
    exports.ltr = ltr;
    function ltr(version, range2, options) {
      return outside(version, range2, "<", options);
    }
    exports.gtr = gtr;
    function gtr(version, range2, options) {
      return outside(version, range2, ">", options);
    }
    exports.outside = outside;
    function outside(version, range2, hilo, options) {
      version = new SemVer(version, options);
      range2 = new Range(range2, options);
      var gtfn, ltefn, ltfn, comp, ecomp;
      switch (hilo) {
        case ">":
          gtfn = gt;
          ltefn = lte;
          ltfn = lt;
          comp = ">";
          ecomp = ">=";
          break;
        case "<":
          gtfn = lt;
          ltefn = gte;
          ltfn = gt;
          comp = "<";
          ecomp = "<=";
          break;
        default:
          throw new TypeError('Must provide a hilo val of "<" or ">"');
      }
      if (satisfies(version, range2, options)) {
        return false;
      }
      for (var i2 = 0; i2 < range2.set.length; ++i2) {
        var comparators = range2.set[i2];
        var high = null;
        var low = null;
        comparators.forEach(function(comparator2) {
          if (comparator2.semver === ANY) {
            comparator2 = new Comparator(">=0.0.0");
          }
          high = high || comparator2;
          low = low || comparator2;
          if (gtfn(comparator2.semver, high.semver, options)) {
            high = comparator2;
          } else if (ltfn(comparator2.semver, low.semver, options)) {
            low = comparator2;
          }
        });
        if (high.operator === comp || high.operator === ecomp) {
          return false;
        }
        if ((!low.operator || low.operator === comp) && ltefn(version, low.semver)) {
          return false;
        } else if (low.operator === ecomp && ltfn(version, low.semver)) {
          return false;
        }
      }
      return true;
    }
    exports.prerelease = prerelease;
    function prerelease(version, options) {
      var parsed = parse(version, options);
      return parsed && parsed.prerelease.length ? parsed.prerelease : null;
    }
    exports.intersects = intersects;
    function intersects(r1, r2, options) {
      r1 = new Range(r1, options);
      r2 = new Range(r2, options);
      return r1.intersects(r2);
    }
    exports.coerce = coerce;
    function coerce(version, options) {
      if (version instanceof SemVer) {
        return version;
      }
      if (typeof version === "number") {
        version = String(version);
      }
      if (typeof version !== "string") {
        return null;
      }
      options = options || {};
      var match = null;
      if (!options.rtl) {
        match = version.match(safeRe[t.COERCE]);
      } else {
        var next;
        while ((next = safeRe[t.COERCERTL].exec(version)) && (!match || match.index + match[0].length !== version.length)) {
          if (!match || next.index + next[0].length !== match.index + match[0].length) {
            match = next;
          }
          safeRe[t.COERCERTL].lastIndex = next.index + next[1].length + next[2].length;
        }
        safeRe[t.COERCERTL].lastIndex = -1;
      }
      if (match === null) {
        return null;
      }
      return parse(match[2] + "." + (match[3] || "0") + "." + (match[4] || "0"), options);
    }
  })(semver, semver.exports);
  return semver.exports;
}
var semverExports = requireSemver();
const processState = async (pid) => {
  if (!Number.isSafeInteger(pid) || pid <= 0) return "missing";
  try {
    process.kill(pid, 0);
    return "running";
  } catch (error) {
    return error instanceof Error && "code" in error && error.code === "EPERM" ? "running" : "missing";
  }
};
const completed = (step) => step.status === "completed" || step.status === "skipped";
const slug = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 64) || "task";
class TaskRuntime {
  constructor(dependencies) {
    this.dependencies = dependencies;
    this.now = dependencies.now ?? Date.now;
    this.inspectProcess = dependencies.processState ?? processState;
  }
  now;
  inspectProcess;
  create(draft) {
    return this.dependencies.storage.createPersistentTask(draft);
  }
  list() {
    return this.dependencies.storage.listPersistentTasks();
  }
  get(taskId) {
    return this.dependencies.storage.getPersistentTask(taskId);
  }
  async createRelease(version, originatingConversationId) {
    if (!semverExports.valid(version)) throw new Error("Release version must be a valid semantic version without a leading v.");
    return this.create(releaseTaskTemplate(version, originatingConversationId));
  }
  async realitySnapshot(taskId) {
    const task = await this.get(taskId);
    const workspaceId = await this.dependencies.storage.workspaceId();
    const pids = [.../* @__PURE__ */ new Set([...task.processIds, ...task.steps.flatMap((step) => step.externalProcessId ? [step.externalProcessId] : [])])];
    const processes = await Promise.all(pids.map(async (pid) => ({ pid, state: await this.inspectProcess(pid) })));
    let git2;
    if (this.dependencies.git) {
      try {
        const status = await this.dependencies.git.status();
        git2 = { branch: status.branch, commitSha: status.head?.hash, workingTreeClean: status.files.length === 0 };
      } catch {
        git2 = void 0;
      }
    }
    return { observedAt: this.now(), workspaceId, git: git2, processes, stepObservations: [] };
  }
  async resume(taskId, suppliedSnapshot) {
    const before = await this.get(taskId);
    if (before.status === "completed" || before.status === "cancelled") return before;
    if (before.startedAt === void 0) {
      await this.dependencies.storage.setPersistentTaskState(taskId, "running", { summary: "Task started; persisted state will be reconciled before any work continues.", eventType: "task.started", currentStepId: before.currentStepId ?? null, resumabilityState: "reconcile-required" });
    } else {
      await this.dependencies.storage.appendTaskEvent(taskId, { type: "task.resumed", summary: "Resume requested; persisted state will be reconciled before any work continues." });
    }
    return this.reconcile(taskId, suppliedSnapshot ?? await this.realitySnapshot(taskId));
  }
  async reconcile(taskId, snapshot) {
    let task = await this.get(taskId);
    if (snapshot.workspaceId !== task.workspaceId) throw new Error("Reality snapshot belongs to another workspace.");
    await this.dependencies.storage.updateTaskReality(taskId, { associatedBranch: snapshot.git?.branch, associatedCommitSha: snapshot.git?.commitSha, processIds: snapshot.processes.filter((entry) => entry.state === "running").map((entry) => entry.pid) });
    const observations = new Map(snapshot.stepObservations.map((observation) => [observation.stepId, observation]));
    for (const observation of snapshot.stepObservations) {
      const step = task.steps.find((candidate) => candidate.id === observation.stepId);
      if (!step || completed(step)) continue;
      if (observation.state === "completed" && observation.verified) {
        await this.dependencies.storage.setTaskStepState(taskId, step.id, "completed", { summary: observation.summary, auditReference: observation.auditReference, eventType: "step.completed" });
        await this.dependencies.storage.appendTaskCheckpoint(taskId, { stepId: step.id, name: `${step.name} completed`, summary: observation.summary, verified: true, evidence: observation.evidence, auditReferences: observation.auditReference ? [observation.auditReference] : [] });
        if (observation.auditReference) await this.dependencies.storage.linkTaskStepAudit(taskId, step.id, observation.auditReference);
        const evidence = observation.evidence;
        if (evidence?.externalReference) {
          const reference = await this.dependencies.storage.upsertTaskExternalReference(taskId, { ...evidence.externalReference, stepId: step.id });
          await this.dependencies.storage.updateTaskReality(taskId, { externalResourceIds: [.../* @__PURE__ */ new Set([...task.externalResourceIds, reference.id])] });
          await this.dependencies.storage.appendTaskEvent(taskId, { stepId: step.id, type: "external.asset.verified", summary: observation.summary, details: { externalReferenceId: reference.id }, auditReference: observation.auditReference });
        }
        if (evidence?.artifact) await this.dependencies.storage.appendTaskArtifact(taskId, { ...evidence.artifact, stepId: step.id });
      } else if (observation.state === "failed") {
        await this.dependencies.storage.setTaskStepState(taskId, step.id, "failed", { summary: observation.summary, error: observation.error ?? { message: observation.summary, retryable: false }, auditReference: observation.auditReference, eventType: "step.failed" });
      } else if (observation.state === "running") {
        await this.dependencies.storage.setTaskStepState(taskId, step.id, "running", { summary: observation.summary, externalProcessId: step.externalProcessId, auditReference: observation.auditReference, eventType: "external.process.detected" });
      } else {
        await this.dependencies.storage.setTaskStepState(taskId, step.id, "waiting", { summary: observation.summary, auditReference: observation.auditReference, eventType: "step.waiting" });
      }
    }
    task = await this.get(taskId);
    for (const step of task.steps) {
      if (step.status !== "running" || !step.externalProcessId || observations.has(step.id)) continue;
      const observed = snapshot.processes.find((entry) => entry.pid === step.externalProcessId);
      if (!observed || observed.state === "missing" || observed.state === "exited") {
        await this.dependencies.storage.setTaskStepState(taskId, step.id, "blocked", { summary: `Tracked process ${step.externalProcessId} is no longer running and no verified completion evidence was found.`, error: { message: "Tracked process disappeared before its result was verified.", exitCode: observed?.exitCode, retryable: true, suggestedNextAction: "Inspect the bounded output and remote state before retrying." }, eventType: "task.blocked" });
      }
    }
    task = await this.get(taskId);
    const incompleteDependencies = [];
    for (const dependencyId of task.taskDependencies) {
      const dependency = await this.get(dependencyId);
      if (dependency.status !== "completed") incompleteDependencies.push(dependencyId);
    }
    const allComplete = task.steps.length > 0 && task.steps.every(completed);
    if (allComplete) return this.dependencies.storage.setPersistentTaskState(taskId, "completed", { summary: "Every task step has verified completion or an explicit skip.", eventType: "task.completed", currentStepId: null, resumabilityState: "complete", details: { observedAt: snapshot.observedAt } });
    const failed = task.steps.find((step) => step.status === "failed");
    if (failed) return this.dependencies.storage.setPersistentTaskState(taskId, "failed", { summary: `Step failed: ${failed.name}`, eventType: "state.reconciled", currentStepId: failed.id, interruptionReason: failed.lastError?.message, resumabilityState: failed.attempts < failed.retryPolicy.maxAttempts ? "resumable" : "not-resumable" });
    const blocked = task.steps.find((step) => step.status === "blocked");
    if (blocked || incompleteDependencies.length) return this.dependencies.storage.setPersistentTaskState(taskId, "blocked", { summary: blocked ? `Blocked at ${blocked.name}.` : "Waiting for dependent tasks to complete.", eventType: "state.reconciled", currentStepId: blocked?.id ?? null, interruptionReason: blocked?.lastError?.message ?? `Incomplete task dependencies: ${incompleteDependencies.join(", ")}`, resumabilityState: "reconcile-required" });
    const running = task.steps.find((step) => step.status === "running");
    if (running) return this.dependencies.storage.setPersistentTaskState(taskId, "running", { summary: `${running.name} is still running.`, eventType: "state.reconciled", currentStepId: running.id, resumabilityState: "reconcile-required", details: { observedAt: snapshot.observedAt, processId: running.externalProcessId } });
    const next = task.steps.find((step) => !completed(step) && step.dependencies.every((dependencyId) => completed(task.steps.find((candidate) => candidate.id === dependencyId))));
    if (!next) return this.dependencies.storage.setPersistentTaskState(taskId, "blocked", { summary: "No dependency-ready step is available.", eventType: "state.reconciled", currentStepId: null, interruptionReason: "Step dependency graph cannot advance.", resumabilityState: "reconcile-required" });
    if (next.status === "waiting") return this.dependencies.storage.setPersistentTaskState(taskId, "waiting", { summary: `Verification or an external condition is still required for ${next.name}.`, eventType: "state.reconciled", currentStepId: next.id, resumabilityState: "reconcile-required", details: { observedAt: snapshot.observedAt } });
    return this.dependencies.storage.setPersistentTaskState(taskId, "ready", { summary: `Ready for ${next.name}.`, eventType: "state.reconciled", currentStepId: next.id, resumabilityState: "resumable", details: { observedAt: snapshot.observedAt, git: snapshot.git } });
  }
  async pause(taskId, reason2) {
    if (!reason2.trim() || reason2.length > 4e3) throw new Error("A bounded pause reason is required.");
    const task = await this.get(taskId);
    if (task.status === "completed" || task.status === "cancelled") return task;
    return this.dependencies.storage.setPersistentTaskState(taskId, "paused", { summary: `Paused: ${reason2}`, eventType: "task.paused", interruptionReason: reason2, currentStepId: task.currentStepId, resumabilityState: "reconcile-required" });
  }
  async cancel(taskId, reason2, trackingOnly) {
    if (!reason2.trim() || reason2.length > 4e3) throw new Error("A bounded cancellation reason is required.");
    const task = await this.get(taskId);
    const activePids = [.../* @__PURE__ */ new Set([...task.processIds, ...task.steps.filter((step) => step.status === "running" && step.externalProcessId).map((step) => step.externalProcessId)])];
    if (activePids.length && !trackingOnly) throw new Error(`Task cancellation will not silently kill active process IDs: ${activePids.join(", ")}. Cancel tracking only or terminate the exact process through an approved tool.`);
    const summary = activePids.length ? `FORGE tracking cancelled; external process IDs may still be active: ${activePids.join(", ")}.` : `Task cancelled: ${reason2}`;
    return this.dependencies.storage.setPersistentTaskState(taskId, "cancelled", { summary, eventType: "task.cancelled", interruptionReason: reason2, currentStepId: task.currentStepId, resumabilityState: "not-resumable", details: { trackingOnly, activePids } });
  }
  async retryStep(taskId, stepId) {
    const task = await this.get(taskId);
    const step = task.steps.find((candidate) => candidate.id === stepId);
    if (!step) throw new Error("Unknown task step.");
    if (!["failed", "blocked"].includes(step.status)) throw new Error("Only failed or blocked steps can be retried.");
    if (step.attempts >= step.retryPolicy.maxAttempts) throw new Error("The task step retry limit has been reached.");
    if (!step.dependencies.every((dependencyId) => completed(task.steps.find((candidate) => candidate.id === dependencyId)))) throw new Error("Task step dependencies are not complete.");
    await this.dependencies.storage.setTaskStepState(taskId, stepId, "pending", { summary: `Retry queued for ${step.name}.`, approvalState: "not-required", eventType: "step.retried" });
    return this.dependencies.storage.setPersistentTaskState(taskId, "ready", { summary: `Ready to retry ${step.name}.`, eventType: "state.reconciled", currentStepId: step.id, resumabilityState: "resumable" });
  }
  async checkpoint(taskId, input) {
    if (!input.name.trim() || input.name.length > 240 || !input.summary.trim() || input.summary.length > 1e4 || JSON.stringify(input.evidence ?? null).length > 25e4) throw new Error("Checkpoint name, summary, or evidence exceeds the storage limit.");
    if (input.verified && !input.auditReference) throw new Error("A verified checkpoint requires an observed audit reference.");
    await this.dependencies.storage.appendTaskCheckpoint(taskId, { stepId: input.stepId, name: input.name, summary: input.summary, verified: input.verified, evidence: input.evidence, auditReferences: input.auditReference ? [input.auditReference] : [] });
    await this.dependencies.storage.appendTaskEvent(taskId, { stepId: input.stepId, type: "state.reconciled", summary: `Checkpoint recorded: ${input.name}.`, details: { verified: input.verified }, auditReference: input.auditReference });
    if (input.verified && input.stepId) {
      const task = await this.get(taskId);
      const step = task.steps.find((candidate) => candidate.id === input.stepId);
      if (!step) throw new Error("Unknown task step.");
      if (!completed(step)) await this.dependencies.storage.setTaskStepState(taskId, step.id, "completed", { summary: input.summary, auditReference: input.auditReference, eventType: "step.completed" });
      return this.reconcile(taskId, await this.realitySnapshot(taskId));
    }
    return this.get(taskId);
  }
  async recordToolOutcome(taskId, stepId, toolRequestId, result) {
    const task = await this.get(taskId);
    const step = task.steps.find((candidate) => candidate.id === stepId);
    if (!step) throw new Error("Unknown task step.");
    if (step.requiredTool && step.requiredTool !== result.toolName) throw new Error("Tool result does not match the task step contract.");
    await this.dependencies.storage.linkTaskStepAudit(taskId, stepId, toolRequestId);
    await this.dependencies.storage.recordTaskApproval(taskId, stepId, { toolRequestId, decision: "consumed", scope: `${taskId}:${stepId}:${result.toolName}`, decidedAt: this.now(), auditReference: toolRequestId });
    const succeeded = result.success && (result.exitCode === void 0 || result.exitCode === null || result.exitCode === 0);
    if (succeeded) {
      const processStarted = result.toolName === "task.process.start";
      await this.dependencies.storage.setTaskStepState(taskId, stepId, processStarted ? "running" : "waiting", { summary: processStarted ? `${step.name} started; completion still requires observed exit and verification evidence.` : `${step.name} returned a successful tool result; its verification criteria still require an explicit checkpoint.`, auditReference: toolRequestId, incrementAttempts: !processStarted, eventType: processStarted ? "external.process.detected" : "step.waiting" });
      await this.dependencies.storage.appendTaskCheckpoint(taskId, { stepId, name: `${step.name} tool result observed`, summary: processStarted ? "FORGE observed a successful background-process start, not completion." : "FORGE recorded a successful structured tool result. Step completion remains separately verified.", verified: true, evidence: { toolName: result.toolName, exitCode: result.exitCode, affectedPaths: result.affectedPaths, warnings: result.warnings }, auditReferences: [toolRequestId] });
    } else {
      const output = result.output;
      await this.dependencies.storage.setTaskStepState(taskId, stepId, "failed", { summary: `${step.name} failed.`, error: { message: result.error?.message ?? `Tool exited with code ${result.exitCode ?? "unknown"}.`, code: result.error?.code, exitCode: result.exitCode, stdout: typeof output?.stdout === "string" ? output.stdout.slice(0, 8e3) : void 0, stderr: typeof output?.stderr === "string" ? output.stderr.slice(0, 8e3) : void 0, retryable: !result.cancelled, suggestedNextAction: result.rollback?.instructions }, auditReference: toolRequestId, incrementAttempts: step.status !== "running", eventType: "step.failed" });
    }
    return this.reconcile(taskId, await this.realitySnapshot(taskId));
  }
  async startBackground(taskId, stepId, input, toolRequestId) {
    if (!this.dependencies.shell) throw new Error("Background shell runtime is unavailable.");
    const task = await this.get(taskId);
    const step = task.steps.find((candidate) => candidate.id === stepId);
    if (!step) throw new Error("Unknown task step.");
    if (!["shell.run", "task.process.start"].includes(step.requiredTool ?? "")) throw new Error("Task step is not configured for a background shell process.");
    if (!step.dependencies.every((dependencyId) => completed(task.steps.find((candidate) => candidate.id === dependencyId)))) throw new Error("Task step dependencies are not complete.");
    const outputPath = path__default.join(".forge", "task-output", taskId, `${slug(step.name)}.log`);
    await this.dependencies.storage.setTaskStepState(taskId, stepId, "running", { summary: `${step.name} is starting as a workspace-owned background process.`, incrementAttempts: true, approvalState: "consumed", auditReference: toolRequestId, eventType: "step.started" });
    try {
      const process2 = await this.dependencies.shell.startBackground(input, outputPath, toolRequestId);
      await this.dependencies.storage.setTaskStepState(taskId, stepId, "running", { summary: `${step.name} is running as process ${process2.pid}.`, externalProcessId: process2.pid, outputPath, approvalState: "consumed", auditReference: toolRequestId, eventType: "external.process.detected" });
      await this.dependencies.storage.updateTaskReality(taskId, { processIds: [.../* @__PURE__ */ new Set([...task.processIds, process2.pid])] });
      return { task: await this.get(taskId), process: process2 };
    } catch (error) {
      await this.dependencies.storage.setTaskStepState(taskId, stepId, "failed", { summary: `${step.name} could not start.`, error: { message: error instanceof Error ? error.message : String(error), retryable: true, suggestedNextAction: "Inspect the exact command, working directory, and output path before retrying." }, approvalState: "consumed", auditReference: toolRequestId, eventType: "step.failed" });
      throw error;
    }
  }
  async generateHandoff(taskId) {
    const task = await this.get(taskId);
    const root = this.dependencies.workspaceRoot();
    if (!root) throw new Error("Open a workspace before generating a task handoff.");
    const markdown = taskHandoffMarkdown(task);
    const directory = path__default.join(root, ".forge", "handoffs");
    const relativePath2 = path__default.join(".forge", "handoffs", `${slug(task.title)}-${task.id.slice(0, 8)}.md`);
    const destination = path__default.join(root, relativePath2);
    const temporary = `${destination}.${randomUUID()}.tmp`;
    await promises.mkdir(directory, { recursive: true });
    try {
      await promises.writeFile(temporary, markdown, { flag: "wx" });
      await promises.rename(temporary, destination);
    } catch (error) {
      await promises.rm(temporary, { force: true });
      throw error;
    }
    const generatedAt = this.now();
    await this.dependencies.storage.appendTaskEvent(taskId, { type: "handoff.generated", summary: `Human-readable handoff generated at ${relativePath2}.`, details: { relativePath: relativePath2 } });
    return { taskId, relativePath: relativePath2, markdown, generatedAt };
  }
}
function releaseTaskTemplate(version, originatingConversationId) {
  if (!semverExports.valid(version)) throw new Error("Release version must be valid semantic versioning.");
  const specifications = [
    ["Version validation", "Confirm package and requested semantic versions agree.", 0, "file.read", ["package.json contains the requested version"]],
    ["Branch validation", "Confirm the release starts from the intended branch.", 0, "git.status", ["Observed branch is recorded"]],
    ["Working-tree validation", "Prove the exact source tree is deliberate.", 0, "git.status", ["Working tree state is recorded"]],
    ["Tests", "Run the complete automated test suite.", 2, "task.process.start", ["Exit code is zero", "Test totals are recorded"]],
    ["Lint", "Run static lint validation.", 2, "task.process.start", ["Exit code is zero"]],
    ["Typecheck", "Run the TypeScript compiler without emitting.", 2, "task.process.start", ["Exit code is zero"]],
    ["Production build", "Build production Electron bundles.", 2, "task.process.start", ["Exit code is zero", "Bundles exist"]],
    ["ARM64 package", "Create the ARM64 macOS package.", 2, "task.process.start", ["DMG and ZIP artifacts exist"]],
    ["Universal package", "Create the universal macOS package.", 2, "task.process.start", ["Universal DMG and ZIP artifacts exist"]],
    ["Commit", "Commit the exact validated staged source set.", 2, "git.commit", ["Commit SHA is recorded"]],
    ["Push", "Push the validated feature branch.", 2, "git.push", ["Remote branch contains commit"]],
    ["Pull request", "Create or identify the release pull request.", 2, "web.open", ["Pull request ID and URL are recorded"]],
    ["Merge", "Merge only after required checks pass.", 2, "web.open", ["Merge commit is recorded"]],
    ["Main synchronization", "Verify local main equals origin/main.", 2, "git.pull", ["Local and remote main SHAs match"]],
    ["Tag creation", "Create the annotated release tag at the authoritative commit.", 2, "shell.run", ["Annotated tag resolves to source commit"]],
    ["GitHub Actions", "Observe the release workflow without wasteful polling.", 0, "web.fetch", ["Workflow run ID and conclusion are recorded"]],
    ["DMG upload", "Upload the validated DMG serially.", 2, "web.open", ["Remote DMG exists"]],
    ["ZIP upload", "Upload the validated ZIP after the DMG.", 2, "web.open", ["Remote ZIP exists"]],
    ["Blockmap verification", "Verify expected blockmap assets.", 0, "web.fetch", ["Required blockmaps exist"]],
    ["Updater metadata verification", "Validate beta or latest updater YAML.", 0, "web.fetch", ["Updater metadata references correct assets"]],
    ["Remote SHA verification", "Compare remote assets with validated local hashes.", 0, "web.fetch", ["Every remote SHA matches"]],
    ["Release publication", "Publish the release only after provenance checks.", 2, "web.open", ["Release is published and not draft"]],
    ["Local installation", "Install the exact validated application package.", 2, "shell.run", ["Installed bundle identity is recorded"]],
    ["Runtime diagnostics", "Verify packaged runtime identity and security diagnostics.", 0, "terminal.read", ["Runtime diagnostics match the release"]],
    ["Updater verification", "Verify the selected logical update channel behavior.", 2, "shell.run", ["Updater result is recorded"]],
    ["Final handoff", "Generate the authoritative incomplete-or-complete release handoff.", 1, "task.handoff", ["Handoff Markdown exists"]]
  ];
  const steps = specifications.map(([name, purpose, riskTier, requiredTool, verificationCriteria], index) => ({ id: `release-${String(index + 1).padStart(2, "0")}-${slug(name)}`, name, purpose, riskTier, requiredTool, expectedInput: requiredTool === "task.process.start" ? { command: "defined at approval time", args: [] } : void 0, expectedOutput: { verified: true }, retryPolicy: { maxAttempts: riskTier === 0 ? 2 : 1, backoffMs: 1e3, retryableErrorCodes: ["ETIMEDOUT", "ECONNRESET", "HTTP_502"] }, timeoutMs: requiredTool === "task.process.start" ? 6e5 : 12e4, artifactPaths: [], verificationCriteria, dependencies: index ? [`release-${String(index).padStart(2, "0")}-${slug(specifications[index - 1][0])}`] : [], rollbackInstructions: riskTier === 2 ? "Inspect the exact tool result and remote/local state before attempting any rollback." : void 0 }));
  return { title: `Release FORGE ${version}`, description: "Workspace-owned release workflow. The template defines structure and verification; it grants no execution authority.", taskType: "release", priority: "high", originatingConversationId, progressSummary: "Release workflow drafted; no executable step has started.", resumeInstructions: "Reconcile Git, local processes, workflow/release metadata, asset presence, and hashes. Continue only from the first genuinely unfinished step. Do not rebuild, retag, reupload, recreate a pull request, or republish verified work.", associatedReleaseTag: `v${version}`, steps };
}
function taskHandoffMarkdown(task) {
  const complete = task.steps.filter(completed);
  const current = task.steps.find((step) => step.id === task.currentStepId);
  const waiting = task.steps.filter((step) => step.status === "waiting");
  const blocked = task.steps.filter((step) => ["blocked", "failed"].includes(step.status));
  const lines = [`# ${task.title}`, "", `Task ID: \`${task.id}\``, `Status: **${task.status}**`, `Updated: ${new Date(task.updatedAt).toISOString()}`, "", "## Objective", "", task.description ?? task.title, "", "## Completed steps", "", ...complete.length ? complete.map((step) => `- [x] ${step.name}`) : ["- None verified yet."], "", "## Current state", "", `- Current step: ${current?.name ?? "None"}`, `- Progress: ${task.progressSummary}`, `- Waiting: ${waiting.map((step) => step.name).join(", ") || "None"}`, `- Blockers: ${blocked.map((step) => `${step.name}: ${step.lastError?.message ?? step.status}`).join("; ") || "None"}`, `- Active process IDs: ${task.processIds.join(", ") || "None"}`, "", "## Provenance and external state", "", `- Branch: ${task.associatedBranch ?? "Unrecorded"}`, `- Commit: ${task.associatedCommitSha ?? "Unrecorded"}`, `- Pull request: ${task.associatedPullRequest ?? "Unrecorded"}`, `- Tag: ${task.associatedReleaseTag ?? "Unrecorded"}`, `- Workflow run: ${task.associatedWorkflowRun ?? "Unrecorded"}`, ...task.externalReferences.map((reference) => `- ${reference.type}: ${reference.url ?? reference.externalId} (${reference.state ?? "state unrecorded"})`), "", "## Artifacts and verification", "", ...task.artifacts.length ? task.artifacts.map((artifact) => `- ${artifact.kind}: ${artifact.path ?? artifact.uri ?? artifact.id}${artifact.sha256 ? ` — SHA-256 ${artifact.sha256}` : ""}${artifact.verifiedAt ? " (verified)" : ""}`) : ["- No artifacts recorded."], ...task.checkpoints.map((checkpoint) => `- ${checkpoint.verified ? "Verified" : "Unverified"} checkpoint: ${checkpoint.name} — ${checkpoint.summary}`), "", "## Resume instructions", "", task.resumeInstructions, "", "## Next action", "", current ? `Reconcile and advance **${current.name}** only after its dependencies and verification criteria are satisfied.` : "Reconcile the task and identify the first genuinely unfinished step.", "", "## Actions that must not be repeated", "", ...complete.length ? complete.map((step) => `- Do not repeat ${step.name} unless current evidence invalidates its verified checkpoint.`) : ["- No completed action is yet protected from repetition."], "", "> SQLite task state in `.forge/metadata.sqlite` is authoritative. This Markdown file is a human-readable projection.", ""];
  return lines.join("\n");
}
function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).filter(([key]) => key !== "taskContext").sort(([left], [right]) => left.localeCompare(right)).map(([key, entry]) => [key, stableValue(entry)]));
}
function toolCallKey(call) {
  return `${call.name}:${JSON.stringify(stableValue(call.arguments))}`;
}
class ProgressAwareLoopGuard {
  observations = /* @__PURE__ */ new Map();
  shouldRun(call, revision) {
    return this.observations.get(toolCallKey(call))?.revision !== revision;
  }
  record(call, revision, result) {
    this.observations.set(toolCallKey(call), { revision, result: JSON.stringify(result).slice(0, 16e3) });
  }
  observedResults() {
    return [...this.observations.values()].map((entry) => entry.result);
  }
}
function nestedTaskLink(input) {
  const link = input?.taskContext;
  return typeof link?.taskId === "string" && typeof link.stepId === "string" ? { taskId: link.taskId, stepId: link.stepId } : null;
}
function directTaskLink(input) {
  const link = input;
  return typeof link?.taskId === "string" && typeof link.stepId === "string" ? { taskId: link.taskId, stepId: link.stepId } : null;
}
function taskEvidenceLink(request) {
  return nestedTaskLink(request.input) ?? (request.toolName === "task.process.start" ? directTaskLink(request.input) : null);
}
function createNativeAgentRuntime(dependencies) {
  const { storage: storage2, workspace: workspace2, agent: agent2, toolRouter: toolRouter2, taskRuntime: taskRuntime2, settings: settings2, aiProvider: aiProvider2, git: git2, emitRuntimeEvent: emitRuntimeEvent2 } = dependencies;
  const maxRuntimeMs = Math.min(Math.max(Number(process.env.FORGE_AGENT_MAX_RUNTIME_MS) || 15 * 6e4, 6e4), 60 * 6e4);
  const historyFor = async (conversationId) => (await storage2.listConversationMessages(conversationId)).map((entry) => ({ role: entry.role, content: entry.content }));
  const recordTaskOutcome = async (request, result) => {
    const link = taskEvidenceLink(request);
    if (!link) return null;
    try {
      await taskRuntime2.recordToolOutcome(link.taskId, link.stepId, request.id, result);
      return null;
    } catch (error) {
      return `Task checkpoint link failed: ${error instanceof Error ? error.message : String(error)}`;
    }
  };
  const runAgentTurn = async (conversationId, prompt) => {
    await emitRuntimeEvent2?.("agent.started", { conversationId });
    try {
      const state = await storage2.conversationState(conversationId);
      const history = await historyFor(state.activeConversationId);
      await storage2.appendConversation(state.activeConversationId, "user", prompt);
      const project = await storage2.dashboard();
      const info = workspace2.info();
      if (!project || !info) throw new Error("Open a workspace before requesting agent tools.");
      const definitions = toolRouter2.providerDefinitions();
      let turn = await agent2.askWithTools(prompt, history, definitions);
      const outcomes = [];
      const continuationHistory = [...history, { role: "user", content: prompt }];
      const loopGuard = new ProgressAwareLoopGuard();
      const workspaceRevision = async () => {
        try {
          const status = await git2.status();
          return JSON.stringify({ head: status.head?.hash ?? null, branch: status.branch, files: status.files.map((file) => [file.path, file.indexStatus, file.workingStatus]) });
        } catch {
          return "workspace-state-unavailable";
        }
      };
      const startedAt = Date.now();
      let modelContent = "";
      while (true) {
        if (Date.now() - startedAt > maxRuntimeMs) throw new Error(`Agent execution exceeded the configured ${Math.round(maxRuntimeMs / 6e4)} minute runtime budget. Progress and tool evidence were preserved for task resumption.`);
        const calls = [...turn.toolCalls];
        const fallback = calls.length ? null : parseStructuredToolFallback(aiProvider2.id, turn.content);
        if (fallback) calls.push(fallback);
        if (!calls.length) {
          modelContent = turn.content;
          break;
        }
        const revision = await workspaceRevision();
        const fresh = calls.filter((call) => loopGuard.shouldRun(call, revision));
        if (!fresh.length) {
          const evidence2 = loopGuard.observedResults().join("\n\n");
          modelContent = (await agent2.askWithContext(`Every requested tool call would repeat the same normalized arguments against the same workspace state. Do not request another tool. Complete the response from these observed results:

${evidence2}`, continuationHistory)).content;
          break;
        }
        const round = [];
        for (const call of fresh) {
          await emitRuntimeEvent2?.("tool.requested", { toolName: call.name, conversationId: state.activeConversationId });
          const outcome = await toolRouter2.request(call, { workspaceId: project.id, workspaceRoot: info.rootPath, conversationId: state.activeConversationId, modelId: turn.modelId ?? settings2.publicSettings().apiModel });
          round.push(outcome);
          outcomes.push(outcome);
          loopGuard.record(call, await workspaceRevision(), { success: outcome.result?.success, affectedPaths: outcome.result?.affectedPaths, exitCode: outcome.result?.exitCode, error: outcome.result?.error, output: outcome.result?.output });
          await emitRuntimeEvent2?.("tool.completed", { toolName: call.name, success: outcome.result?.success ?? false, conversationId: state.activeConversationId });
          if (outcome.result) await recordTaskOutcome(outcome.request, outcome.result);
        }
        const pending = round.find((outcome) => !outcome.result);
        if (pending) {
          modelContent = `FORGE is waiting for approval to ${pending.request.expectedEffect} (${pending.request.toolName}). The project state and this request remain persisted; approving the exact request will resume the agent from its observed result.`;
          await emitRuntimeEvent2?.("agent.progress", { conversationId: state.activeConversationId, state: "waiting-for-approval", requestId: pending.request.id });
          break;
        }
        const evidence = round.filter((outcome) => outcome.result).map((outcome) => boundedToolEvidence(outcome.result)).join("\n\n");
        continuationHistory.push({ role: "assistant", content: turn.content || "I requested FORGE tools." });
        turn = await agent2.askWithTools(`Continue the original request using these bounded Tool Result records. Do not repeat completed tool calls. If a task was just created or resumed, execute its next dependency-ready step with its exact taskContext.

${evidence}`, continuationHistory, definitions);
      }
      const summary = outcomes.map(({ request, result }) => `Tool ${request.toolName} ${result?.success ? "succeeded" : "failed"}${result?.error ? `: ${result.error.message}` : ""}.`).join("\n");
      const content = [modelContent, summary].filter(Boolean).join("\n\n") || "FORGE received no response from the model.";
      await storage2.appendConversation(state.activeConversationId, "assistant", content);
      await emitRuntimeEvent2?.("agent.completed", { conversationId: state.activeConversationId, toolCount: outcomes.length });
      return { content, contextUsed: turn.context.artifacts.length > 0, conversationId: state.activeConversationId, memories: turn.memories.map((memory) => ({ id: memory.id, title: memory.title })), contextSources: turn.context.artifacts.map((artifact) => ({ id: artifact.id, kind: artifact.kind, title: artifact.title, path: artifact.path })) };
    } catch (error) {
      await emitRuntimeEvent2?.("agent.blocked", { conversationId, message: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  };
  const runTaskStep = async (taskId) => {
    const task = await taskRuntime2.resume(taskId);
    const step = task.steps.find((candidate) => candidate.id === task.currentStepId);
    if (!step || task.status !== "ready") return task;
    const conversationId = task.lastActiveConversationId ?? task.originatingConversationId;
    await runAgentTurn(conversationId, `Start the dependency-ready task step now. Use the required tool with taskContext { taskId: "${task.id}", stepId: "${step.id}" }. Do not only describe the plan. Task: ${task.title}. Step: ${step.name}. Purpose: ${step.purpose}. Expected input: ${JSON.stringify(step.expectedInput ?? {})}. Verification: ${step.verificationCriteria.join("; ")}.`);
    return taskRuntime2.get(taskId);
  };
  const continueAfterApproval = async (request, result) => {
    const checkpointWarning = await recordTaskOutcome(request, result);
    const evidence = boundedToolEvidence(result);
    await runAgentTurn(request.conversationId, `An explicitly approved FORGE tool request has completed. Continue the original work from the persisted workspace and task state. Do not repeat this call unless the workspace has changed.

${evidence}${checkpointWarning ? `

${checkpointWarning}` : ""}`);
  };
  return { runAgentTurn, runTaskStep, continueAfterApproval };
}
const workspace = new WorkspaceService();
const settings = new SettingsService();
const git = new GitService(() => settings.githubCredentials());
const github = new GitHubService(() => git.originUrl(), async () => {
  const credentials = await settings.githubCredentials();
  return credentials ? { token: credentials.token } : null;
});
const storage = new StorageService();
const updater = new UpdaterService();
const dirtyEditorPaths = /* @__PURE__ */ new Set();
const shellService = new ShellService(() => workspace.info()?.rootPath ?? null);
const webService = new WebService(() => settings.webResearchEnabled());
const terminalService = new TerminalService(() => workspace.info()?.rootPath ?? null, (event) => {
  for (const window of BrowserWindow.getAllWindows()) window.webContents.send("terminal.event", event);
});
const taskRuntime = new TaskRuntime({ storage, workspaceRoot: () => workspace.info()?.rootPath ?? null, git, shell: shellService });
let mainWindow = null;
let browserView = null;
let browserLayout = { visible: false };
let browserLoading = false;
let browserError = "";
let rendererSource = "file:// development build";
function appBuildInfo() {
  return {
    ...buildReleaseIdentity(app.getVersion(), app.isPackaged),
    commit: "6f8ab5c46a28464c12bdc04984155503f71c2b6b",
    buildDate: "2026-08-09T11:59:56.428Z",
    runtime: app.isPackaged ? "packaged" : "development",
    rendererSource,
    platform: process.platform,
    architecture: process.arch
  };
}
const aiProvider = new OpenAIProvider();
const contextBuilder = new WorkspaceContextEngine(workspace, git, storage);
const intelligence = new WorkspaceIntelligenceService(contextBuilder, storage);
const memoryService = new MemoryService(storage);
const memoryRetriever = new MemoryRetriever(memoryService);
const memoryIndexer = new MemoryIndexer(memoryService, workspace);
const agent = new Agent(aiProvider, intelligence, memoryRetriever);
async function applyAISettings() {
  aiProvider.configure(await settings.apiConfiguration());
}
async function emitRuntimeEvent(type, payload) {
  if (type === "context.invalidated") await intelligence.invalidate(String(payload?.channel ?? "runtime-event"), payload);
  const workspaceId = (await storage.dashboard().catch(() => null))?.id;
  if (!workspaceId) return;
  const event = { type, workspaceId, occurredAt: Date.now(), payload };
  for (const window of BrowserWindow.getAllWindows()) window.webContents.send("runtime.event", event);
}
function eventForChannel(channel) {
  if (["file.write", "file.create", "file.delete", "file.rename", "file.copy"].includes(channel)) return "file.changed";
  if (["git.stage", "git.unstage", "git.commit", "git.pull", "git.push"].includes(channel)) return "git.changed";
  if (channel.startsWith("tasks.")) return "task.changed";
  if (channel.startsWith("agent.memories")) return "memory.changed";
  if (channel.startsWith("terminal.")) return "terminal.changed";
  if (channel === IPC_CHANNELS.workspaceOpen) return "workspace.changed";
  return null;
}
function register(channel, action) {
  ipcMain.handle(channel, async (_event, request) => {
    try {
      const data = await action(request);
      const event = eventForChannel(channel);
      if (event) {
        await emitRuntimeEvent(event, { channel });
        await emitRuntimeEvent("context.invalidated", { channel });
      }
      return { success: true, data };
    } catch (error) {
      return { success: false, error: { message: error instanceof Error ? error.message : "An unexpected error occurred." } };
    }
  });
}
async function openWorkspaceAt(rootPath) {
  terminalService.dispose();
  dirtyEditorPaths.clear();
  await storage.close();
  const info = await workspace.open(rootPath);
  await git.init(info.rootPath);
  await storage.init(info.rootPath);
  return info;
}
function browserState() {
  const contents = browserView?.webContents;
  return { url: contents?.getURL() ?? "", title: contents?.getTitle() ?? "", canGoBack: contents?.canGoBack() ?? false, canGoForward: contents?.canGoForward() ?? false, loading: browserLoading, error: browserError || void 0 };
}
function sendBrowserState() {
  mainWindow?.webContents.send("browser.state", browserState());
}
function blockedBrowserNavigation(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return "The browser rejected an invalid navigation URL.";
  }
  if (!["https:", "http:"].includes(url.protocol)) return "Only HTTP and HTTPS browser navigation is allowed.";
  if (url.username || url.password) return "Credential-bearing URLs are blocked.";
  const hostname = url.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local")) return "Local-network URLs are blocked.";
  const ipv4 = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(hostname);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    if (a === 0 || a === 10 || a === 127 || a === 169 && b === 254 || a === 172 && b >= 16 && b <= 31 || a === 192 && b === 168 || a >= 224) return "Private and local network addresses are blocked.";
  }
  return null;
}
function ensureBrowserView() {
  if (browserView && !browserView.webContents.isDestroyed()) return browserView;
  browserView = new BrowserView({ webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true } });
  browserView.webContents.setWindowOpenHandler(({ url }) => {
    void navigateBrowser(url).catch(reportBrowserError);
    return { action: "deny" };
  });
  browserView.webContents.on("will-navigate", (event, url) => {
    const reason2 = blockedBrowserNavigation(url);
    if (!reason2) return;
    event.preventDefault();
    reportBrowserError(reason2);
  });
  browserView.webContents.on("did-start-loading", () => {
    browserLoading = true;
    browserError = "";
    sendBrowserState();
  });
  browserView.webContents.on("did-finish-load", () => {
    browserLoading = false;
    sendBrowserState();
  });
  browserView.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedUrl, isMainFrame) => {
    if (isMainFrame && errorCode !== -3) {
      browserLoading = false;
      browserError = `${errorDescription} (${validatedUrl})`;
      sendBrowserState();
    }
  });
  browserView.webContents.on("did-navigate", sendBrowserState);
  browserView.webContents.on("did-navigate-in-page", sendBrowserState);
  setBrowserLayout(browserLayout);
  return browserView;
}
async function navigateBrowser(value) {
  const url = (await validateExternalUrl(value)).toString();
  const view = ensureBrowserView();
  browserLoading = true;
  browserError = "";
  sendBrowserState();
  try {
    await view.webContents.loadURL(url);
  } catch (error) {
    if (!/ERR_ABORTED|\(-3\)/i.test(error instanceof Error ? error.message : String(error))) {
      reportBrowserError(error);
      throw error;
    }
  }
  return browserState();
}
function reportBrowserError(error) {
  browserLoading = false;
  browserError = error instanceof Error ? error.message : String(error);
  sendBrowserState();
}
async function readBrowserPage() {
  const view = browserView;
  if (!view || view.webContents.isDestroyed()) throw new Error("Open a public page in the FORGE Browser before asking the agent to read it.");
  const url = (await validateExternalUrl(view.webContents.getURL())).toString();
  const document = await view.webContents.executeJavaScript(`(() => ({ title: document.title || '', text: (document.body?.innerText || '').replace(/\\s+/g, ' ').trim() }))()`, true);
  const text = typeof document.text === "string" ? document.text : "";
  const limit = 16e4;
  return { url, title: typeof document.title === "string" ? document.title : view.webContents.getTitle(), text: text.slice(0, limit), truncated: text.length > limit };
}
function setBrowserLayout(request) {
  browserLayout = request;
  if (!browserView || browserView.webContents.isDestroyed()) return;
  if (!request.visible) {
    mainWindow?.setBrowserView(null);
    return;
  }
  if (request.bounds) {
    const { x, y, width, height } = request.bounds;
    browserView.setBounds({ x: Math.max(0, Math.round(x)), y: Math.max(0, Math.round(y)), width: Math.max(1, Math.round(width)), height: Math.max(1, Math.round(height)) });
  }
  mainWindow?.setBrowserView(browserView);
}
const browserToolService = {
  enabled: () => settings.webResearchEnabled(),
  open: navigateBrowser,
  read: readBrowserPage
};
const toolRouter = new ToolRouter({ git, github, shell: shellService, terminal: terminalService, tasks: taskRuntime, browser: browserToolService, memories: memoryService, web: webService, audit: storage, dirtyPaths: () => dirtyEditorPaths });
function registerHandlers() {
  register(IPC_CHANNELS.workspaceOpen, async () => {
    const selection = await dialog.showOpenDialog({ title: "Open Forge workspace", properties: ["openDirectory", "createDirectory"] });
    if (selection.canceled || !selection.filePaths[0]) throw new Error("Workspace selection was cancelled.");
    return openWorkspaceAt(selection.filePaths[0]);
  });
  register(IPC_CHANNELS.workspaceInfo, async () => workspace.info());
  register(IPC_CHANNELS.workspaceLayoutGet, async () => storage.getWorkspaceLayout());
  register(IPC_CHANNELS.workspaceLayoutSave, async (request) => storage.saveWorkspaceLayout(request));
  register(IPC_CHANNELS.fileList, async (request) => workspace.list(request?.path));
  register(IPC_CHANNELS.fileRead, async (request) => workspace.readFile(request.path));
  register(IPC_CHANNELS.fileWrite, async (request) => workspace.writeFile(request.path, request.content));
  register(IPC_CHANNELS.fileCreate, async (request) => workspace.create(request.path, request.type, request.content));
  register(IPC_CHANNELS.fileDelete, async (request) => workspace.delete(request.path));
  register(IPC_CHANNELS.fileRename, async (request) => workspace.rename(request.oldPath, request.newPath));
  register(IPC_CHANNELS.fileCopy, async (request) => workspace.copy(request.sourcePath, request.destinationPath));
  register(IPC_CHANNELS.markdownParse, async (request) => workspace.parse(request.path));
  register(IPC_CHANNELS.gitStatus, async () => git.status());
  register(IPC_CHANNELS.gitBranches, async () => git.branches());
  register(IPC_CHANNELS.gitLog, async (request) => git.log(request?.limit));
  register(IPC_CHANNELS.gitDiff, async (request) => git.diff(request.staged));
  register(IPC_CHANNELS.gitStage, async (request) => git.stage(request.files));
  register(IPC_CHANNELS.gitUnstage, async (request) => git.unstage(request.files));
  register(IPC_CHANNELS.gitCommit, async (request) => git.commit(request.message, request.files));
  register(IPC_CHANNELS.gitPull, async () => git.pull());
  register(IPC_CHANNELS.gitPush, async () => git.push());
  register(IPC_CHANNELS.metaDashboard, async () => {
    const project = await storage.dashboard();
    const all = (nodes) => nodes.flatMap((node) => [node, ...node.children ? all(node.children) : []]);
    const files = all(await workspace.list());
    return { project, recentCommits: await git.log(8).catch(() => []), contextHealth: { score: project ? files.some((file) => /^readme\.md$/i.test(file.name)) ? 65 : 35 : 0, hasReadme: files.some((file) => /^readme\.md$/i.test(file.name)), noteCount: files.filter((file) => file.extension === "md").length, codeFileCount: files.filter((file) => ["ts", "tsx", "js", "jsx", "py", "cpp", "c"].includes(file.extension ?? "")).length } };
  });
  register(IPC_CHANNELS.metaGoalCreate, async (request) => storage.createGoal(request.title, request.description));
  register(IPC_CHANNELS.metaTaskCreate, async (request) => storage.createTask(request.title, request.description, request.priority));
  register(IPC_CHANNELS.appUpdateStatus, async () => updater.status());
  register(IPC_CHANNELS.appUpdateCheck, async () => updater.check());
  register(IPC_CHANNELS.appUpdateInstall, async () => updater.install());
  register(IPC_CHANNELS.appReleaseOpen, async () => updater.openLatestRelease());
  register(IPC_CHANNELS.appBuildInfo, async () => appBuildInfo());
  register(IPC_CHANNELS.appBuildInfoCopy, async () => {
    const info = appBuildInfo();
    clipboard.writeText(formatAppBuildInfo(info));
    return info;
  });
  register(IPC_CHANNELS.settingsGet, async () => settings.publicSettings());
  register(IPC_CHANNELS.settingsSave, async (request) => {
    const result = await settings.save(request);
    await applyAISettings();
    updater.setChannel(result.updateChannel);
    return result;
  });
  register(IPC_CHANNELS.settingsTestApi, async () => aiProvider.testConnection());
  register(IPC_CHANNELS.settingsModelsList, async (request) => new OpenAIProvider(await settings.apiConfiguration({ apiKey: request.apiKey, baseUrl: request.apiBaseUrl })).listModels());
  register(IPC_CHANNELS.settingsModelValidate, async (request) => new OpenAIProvider(await settings.apiConfiguration({ apiKey: request.apiKey, baseUrl: request.apiBaseUrl, model: request.apiModel })).validateModel(request.apiModel));
  register(IPC_CHANNELS.settingsTestGithub, async () => settings.testGitHub());
  const nativeAgent = createNativeAgentRuntime({ storage, workspace, agent, toolRouter, taskRuntime, settings, aiProvider, git, emitRuntimeEvent });
  register(IPC_CHANNELS.agentAsk, async (request) => {
    if (!request.prompt.trim()) throw new Error("A prompt is required.");
    return nativeAgent.runAgentTurn(request.conversationId, request.prompt.trim());
  });
  register(IPC_CHANNELS.agentExplainProject, async (request) => nativeAgent.runAgentTurn(request?.conversationId, "Explain this repository as an evidence-grounded architecture summary."));
  register(IPC_CHANNELS.agentReviewChanges, async (request) => nativeAgent.runAgentTurn(request?.conversationId, "Review the current repository changes against its documented architecture and project goals."));
  register(IPC_CHANNELS.agentConversationsState, async (request) => storage.conversationState(request?.conversationId));
  register(IPC_CHANNELS.agentConversationsList, async (request) => (await storage.conversationState(request?.conversationId)).messages);
  register(IPC_CHANNELS.agentConversationsAppend, async (request) => {
    const state = await storage.conversationState(request.conversationId);
    for (const entry of request.entries) await storage.appendConversation(state.activeConversationId, entry.role, entry.content);
    return void 0;
  });
  register(IPC_CHANNELS.agentConversationCreate, async (request) => storage.createConversation(request.title));
  register(IPC_CHANNELS.agentConversationSelect, async (request) => storage.selectConversation(request.conversationId));
  register(IPC_CHANNELS.agentConversationRename, async (request) => storage.renameConversation(request.conversationId, request.title));
  register(IPC_CHANNELS.agentConversationClear, async (request) => storage.clearConversation(request.conversationId));
  register(IPC_CHANNELS.agentMemoriesList, async () => storage.listMemories());
  register(IPC_CHANNELS.agentMemoriesDelete, async (request) => {
    await storage.deleteMemory(request.id);
    return void 0;
  });
  register(IPC_CHANNELS.agentMemoriesReindex, async () => {
    await memoryIndexer.indexWorkspaceFiles();
    return void 0;
  });
  const toolContext = async () => {
    const project = await storage.dashboard();
    const info = workspace.info();
    const conversation = await storage.conversationState();
    if (!project || !info) throw new Error("Open a workspace first.");
    return { workspaceId: project.id, workspaceRoot: info.rootPath, conversationId: conversation.activeConversationId, modelId: settings.publicSettings().apiModel };
  };
  register(IPC_CHANNELS.toolRequestsList, async () => {
    const project = await storage.dashboard();
    return project ? toolRouter.listRequests(project.id) : [];
  });
  register(IPC_CHANNELS.toolRequestApprove, async (request) => {
    const result = await toolRouter.approve(request.requestId, await toolContext(), request.choice);
    const approved = toolRouter.requestById(request.requestId);
    if (approved) void nativeAgent.continueAfterApproval(approved, result).catch(async (error) => emitRuntimeEvent("agent.blocked", { requestId: approved.id, message: error instanceof Error ? error.message : String(error) }));
    return result;
  });
  register(IPC_CHANNELS.toolRequestReject, async (request) => {
    await toolRouter.reject(request.requestId, await toolContext());
    return void 0;
  });
  register(IPC_CHANNELS.toolRequestCancel, async (request) => toolRouter.cancel(request.requestId, await toolContext()));
  register(IPC_CHANNELS.toolActionsList, async (request) => storage.listActions(request));
  register(IPC_CHANNELS.editorDirtyUpdate, async (request) => {
    dirtyEditorPaths.clear();
    for (const value of request.paths) if (value && !value.split(/[\\/]/).includes("..")) dirtyEditorPaths.add(value);
    return void 0;
  });
  register(IPC_CHANNELS.terminalCreate, async (request) => terminalService.create(request?.workingDirectory, request?.columns, request?.rows));
  register(IPC_CHANNELS.terminalList, async () => terminalService.list());
  register(IPC_CHANNELS.terminalInput, async (request) => {
    terminalService.input(request.sessionId, request.data);
    return void 0;
  });
  register(IPC_CHANNELS.terminalResize, async (request) => {
    terminalService.resize(request.sessionId, request.columns, request.rows);
    return void 0;
  });
  register(IPC_CHANNELS.terminalTerminate, async (request) => {
    terminalService.terminate(request.sessionId);
    return void 0;
  });
  register(IPC_CHANNELS.terminalRestart, async (request) => terminalService.restart(request.sessionId));
  register(IPC_CHANNELS.terminalRemove, async (request) => {
    terminalService.remove(request.sessionId);
    return void 0;
  });
  register(IPC_CHANNELS.tasksList, async () => taskRuntime.list());
  register(IPC_CHANNELS.tasksGet, async (request) => taskRuntime.get(request.taskId));
  register(IPC_CHANNELS.tasksCreate, async (request) => taskRuntime.create(request));
  register(IPC_CHANNELS.tasksCreateRelease, async (request) => taskRuntime.createRelease(request.version, request.originatingConversationId));
  register(IPC_CHANNELS.tasksResume, async (request) => nativeAgent.runTaskStep(request.taskId));
  register(IPC_CHANNELS.tasksPause, async (request) => taskRuntime.pause(request.taskId, request.reason));
  register(IPC_CHANNELS.tasksCancel, async (request) => taskRuntime.cancel(request.taskId, request.reason, request.trackingOnly));
  register(IPC_CHANNELS.tasksRetryStep, async (request) => {
    await taskRuntime.retryStep(request.taskId, request.stepId);
    return nativeAgent.runTaskStep(request.taskId);
  });
  register(IPC_CHANNELS.tasksHandoff, async (request) => taskRuntime.generateHandoff(request.taskId));
  register(IPC_CHANNELS.browserNavigate, async (request) => navigateBrowser(request.url));
  register(IPC_CHANNELS.browserLayout, async (request) => {
    setBrowserLayout(request);
    return browserState();
  });
  register(IPC_CHANNELS.browserBack, async () => {
    if (browserView?.webContents.canGoBack()) browserView.webContents.goBack();
    return browserState();
  });
  register(IPC_CHANNELS.browserForward, async () => {
    if (browserView?.webContents.canGoForward()) browserView.webContents.goForward();
    return browserState();
  });
  register(IPC_CHANNELS.browserReload, async () => {
    browserView?.webContents.reload();
    return browserState();
  });
}
function createWindow() {
  const rendererFile = join(__dirname, "../renderer/index.html");
  const packagedRendererUrl = pathToFileURL(rendererFile).toString();
  mainWindow = new BrowserWindow({ width: 1500, height: 950, minWidth: 1100, minHeight: 700, show: false, title: "FORGE", webPreferences: { preload: join(__dirname, "../preload/index.cjs"), contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true } });
  mainWindow.on("ready-to-show", () => mainWindow?.show());
  mainWindow.on("closed", () => {
    browserView = null;
    mainWindow = null;
  });
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  mainWindow.webContents.on("will-navigate", (event, url) => {
    const developmentUrl = process.env.ELECTRON_RENDERER_URL;
    const allowed = is.dev && developmentUrl ? new URL(url).origin === new URL(developmentUrl).origin : url === packagedRendererUrl;
    if (!allowed) event.preventDefault();
  });
  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    rendererSource = "development URL";
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    rendererSource = app.isPackaged ? "file:// packaged app.asar" : "file:// development build";
    void mainWindow.loadFile(rendererFile);
  }
}
app.setName("FORGE");
const ownsSingleInstanceLock = app.requestSingleInstanceLock();
if (!ownsSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", (_event, commandLine) => {
    const startupWorkspace = commandLine.find((argument) => argument.startsWith("--workspace="))?.slice("--workspace=".length);
    if (startupWorkspace) void openWorkspaceAt(startupWorkspace).catch(() => void 0);
    if (mainWindow?.isMinimized()) mainWindow.restore();
    mainWindow?.show();
    mainWindow?.focus();
  });
  app.whenReady().then(async () => {
    const developmentIcon = join(process.cwd(), "apps/desktop/resources/ForgeIcon-1024.png");
    if (process.platform === "darwin" && is.dev && app.dock && existsSync(developmentIcon)) app.dock.setIcon(developmentIcon);
    try {
      await settings.init();
      await applyAISettings();
      updater.setChannel(settings.updateChannel());
      registerHandlers();
      const startupWorkspace = process.argv.find((argument) => argument.startsWith("--workspace="))?.slice("--workspace=".length);
      if (startupWorkspace) await openWorkspaceAt(startupWorkspace);
      createWindow();
      app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
      });
    } catch (error) {
      dialog.showErrorBox("FORGE could not start", error instanceof Error ? error.message : String(error));
      app.quit();
    }
  });
  app.on("window-all-closed", async () => {
    terminalService.dispose();
    await storage.close();
    if (process.platform !== "darwin") app.quit();
  });
}
