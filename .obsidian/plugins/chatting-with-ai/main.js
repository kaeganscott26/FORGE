"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key2 of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key2) && key2 !== except)
        __defProp(to, key2, { get: () => from[key2], enumerable: !(desc = __getOwnPropDesc(from, key2)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/types.ts
var DEFAULT_SETTINGS, CHATGPT_OAUTH_DEFAULT_MODEL;
var init_types = __esm({
  "src/types.ts"() {
    "use strict";
    DEFAULT_SETTINGS = {
      provider: "anthropic",
      apiKey: "",
      model: "claude-sonnet-4-6",
      maxIterations: 20,
      enableWebSearch: true
    };
    CHATGPT_OAUTH_DEFAULT_MODEL = "gpt-5.5";
  }
});

// src/api/anthropic.ts
async function sendAnthropicMessage(settings, messages, tools, systemPrompt) {
  const model = settings.model || "claude-sonnet-4-6";
  const body = {
    model,
    max_tokens: 16384,
    // System prompt as a content block with cache_control breakpoint.
    // Anthropic caches everything up to the breakpoint across requests.
    system: [
      {
        type: "text",
        text: systemPrompt,
        cache_control: { type: "ephemeral" }
      }
    ],
    messages: messages.map(toAnthropicMessage)
  };
  const is46Model = model.includes("4-6") || model.includes("4.6");
  const supportsThinking = model.includes("claude-sonnet-4") || model.includes("claude-opus") || model.includes("claude-sonnet-3-7");
  if (is46Model) {
    body.thinking = { type: "adaptive" };
  } else if (supportsThinking) {
    body.thinking = { type: "enabled", budget_tokens: 8192 };
  }
  if (tools.length > 0 || settings.enableWebSearch) {
    const apiTools = tools.map((t, i, arr) => {
      const tool = {
        name: t.name,
        description: t.description,
        input_schema: t.inputSchema
      };
      if (i === arr.length - 1 && !settings.enableWebSearch) {
        tool.cache_control = { type: "ephemeral" };
      }
      return tool;
    });
    if (settings.enableWebSearch) {
      apiTools.push({
        type: "web_search_20250305",
        name: "web_search",
        max_uses: 3,
        cache_control: { type: "ephemeral" }
      });
    }
    body.tools = apiTools;
  }
  let response;
  try {
    response = await (0, import_obsidian.requestUrl)({
      url: ANTHROPIC_API_URL,
      method: "POST",
      headers: {
        "x-api-key": settings.apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
      body: JSON.stringify(body),
      throw: false
    });
  } catch (e) {
    const err = asRecord(e);
    const status = typeof err.status === "number" ? err.status : "unknown";
    const apiMsg = getNestedString(err, ["json", "error", "message"]);
    if (apiMsg) {
      throw new Error(`Anthropic API error (${status}): ${apiMsg}`);
    }
    throw e;
  }
  if (response.status !== 200) {
    const responseJson = response.json;
    const errorText = getNestedString(responseJson, ["error", "message"]) ?? `HTTP ${response.status}`;
    throw new Error(`Anthropic API error (${response.status}): ${errorText}`);
  }
  const data = parseAnthropicResponse(response.json);
  return {
    content: data.content.map(fromAnthropicBlock).filter((b) => b !== null),
    stopReason: normalizeStopReason(data.stop_reason),
    usage: data.usage ? { inputTokens: data.usage.input_tokens ?? 0, outputTokens: data.usage.output_tokens ?? 0 } : void 0
  };
}
function parseAnthropicResponse(value) {
  if (!isRecord(value)) return { content: [] };
  const content = Array.isArray(value.content) ? value.content.filter(isRecord).map(toAnthropicContentBlock) : [];
  const usage = isRecord(value.usage) ? {
    input_tokens: typeof value.usage.input_tokens === "number" ? value.usage.input_tokens : 0,
    output_tokens: typeof value.usage.output_tokens === "number" ? value.usage.output_tokens : 0
  } : void 0;
  return {
    content,
    stop_reason: typeof value.stop_reason === "string" ? value.stop_reason : void 0,
    usage
  };
}
function toAnthropicContentBlock(value) {
  return {
    type: isAnthropicBlockType(value.type) ? value.type : "text",
    text: typeof value.text === "string" ? value.text : void 0,
    thinking: typeof value.thinking === "string" ? value.thinking : void 0,
    id: typeof value.id === "string" ? value.id : void 0,
    name: typeof value.name === "string" ? value.name : void 0,
    input: isRecord(value.input) ? value.input : void 0,
    search_results: Array.isArray(value.search_results) ? value.search_results.filter(isSearchResult) : void 0
  };
}
function isAnthropicBlockType(value) {
  return value === "text" || value === "tool_use" || value === "web_search_tool_result" || value === "server_tool_use" || value === "thinking";
}
function isSearchResult(value) {
  return isRecord(value) && typeof value.title === "string" && typeof value.url === "string" && typeof value.snippet === "string";
}
function normalizeStopReason(value) {
  if (value === "tool_use" || value === "max_tokens" || value === "stop") return value;
  return "end_turn";
}
function getNestedString(value, path) {
  let current = value;
  for (const key2 of path) {
    if (!isRecord(current)) return void 0;
    current = current[key2];
  }
  return typeof current === "string" ? current : void 0;
}
function asRecord(value) {
  return isRecord(value) ? value : {};
}
function isRecord(value) {
  return typeof value === "object" && value !== null;
}
function toAnthropicMessage(msg) {
  if (typeof msg.content === "string") {
    return { role: msg.role, content: msg.content };
  }
  const blocks = msg.content.map((block2) => {
    if (block2.type === "tool_result") {
      return {
        type: "tool_result",
        tool_use_id: block2.tool_use_id,
        content: block2.content,
        is_error: block2.is_error || false
      };
    }
    if (block2.type === "tool_use") {
      return {
        type: "tool_use",
        id: block2.id,
        name: block2.name,
        input: block2.input
      };
    }
    return { type: "text", text: block2.text };
  }).filter((b) => !(b.type === "text" && !b.text));
  return { role: msg.role, content: blocks };
}
function fromAnthropicBlock(block2) {
  if (block2.type === "tool_use") {
    return {
      type: "tool_use",
      id: block2.id,
      name: block2.name,
      input: block2.input
    };
  }
  if (block2.type === "web_search_tool_result" && block2.search_results) {
    const formatted = block2.search_results.map((r2) => `**${r2.title}**
${r2.url}
${r2.snippet}`).join("\n\n");
    return { type: "text", text: formatted };
  }
  if (block2.type === "thinking" || block2.type === "server_tool_use") {
    return null;
  }
  if (!block2.text) {
    return null;
  }
  return { type: "text", text: block2.text };
}
var import_obsidian, ANTHROPIC_API_URL;
var init_anthropic = __esm({
  "src/api/anthropic.ts"() {
    "use strict";
    import_obsidian = require("obsidian");
    ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
  }
});

// src/api/openai.ts
function clearOpenAIState() {
  previousResponseId = null;
}
async function sendOpenAIMessage(settings, messages, tools, systemPrompt) {
  const baseUrl = DEFAULT_OPENAI_URL;
  const model = settings.model || "gpt-5.3-codex";
  const input = buildCurrentTurnInput(messages, systemPrompt);
  const body = {
    model,
    input
  };
  if (previousResponseId) {
    body.previous_response_id = previousResponseId;
  }
  if (/^o\d/.test(model) || /^gpt-5/.test(model)) {
    body.reasoning = { effort: "medium" };
  }
  const apiTools = tools.map((t) => ({
    type: "function",
    name: t.name,
    description: t.description,
    parameters: t.inputSchema
  }));
  if (settings.enableWebSearch) {
    apiTools.push({ type: "web_search_preview" });
  }
  if (apiTools.length > 0) {
    body.tools = apiTools;
  }
  body.instructions = systemPrompt;
  let response;
  try {
    response = await (0, import_obsidian2.requestUrl)({
      url: `${baseUrl}/v1/responses`,
      method: "POST",
      headers: {
        Authorization: `Bearer ${settings.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body),
      throw: false
    });
  } catch (e) {
    const err = asRecord2(e);
    const status = typeof err.status === "number" || typeof err.status === "string" ? String(err.status) : "";
    const message = typeof err.message === "string" ? err.message : String(e);
    const apiMsg = getNestedString2(err, ["json", "error", "message"]);
    if (apiMsg) {
      throw new Error(`OpenAI API error (${status || "unknown"}): ${apiMsg}`);
    }
    throw new Error(`OpenAI request failed (${status}): ${message}`);
  }
  if (response.status !== 200) {
    const errorBody = getNestedString2(response.json, ["error", "message"]) ?? `HTTP ${response.status}`;
    throw new Error(`OpenAI API error (${response.status}): ${errorBody}`);
  }
  const data = asRecord2(response.json);
  previousResponseId = typeof data.id === "string" ? data.id : null;
  return fromResponsesOutput(data);
}
function buildCurrentTurnInput(messages, systemPrompt) {
  const items = [];
  if (!previousResponseId) {
    items.push({
      type: "message",
      role: "developer",
      content: systemPrompt
    });
    for (const msg of messages) {
      if (typeof msg.content === "string") {
        items.push({
          type: "message",
          role: msg.role === "assistant" ? "assistant" : "user",
          content: msg.content
        });
      }
    }
    return items;
  }
  const lastMsg = messages[messages.length - 1];
  if (!lastMsg) return items;
  if (typeof lastMsg.content === "string") {
    items.push({
      type: "message",
      role: "user",
      content: lastMsg.content
    });
    return items;
  }
  const toolResults = lastMsg.content.filter((b) => b.type === "tool_result");
  if (toolResults.length > 0) {
    for (const tr of toolResults) {
      items.push({
        type: "function_call_output",
        call_id: tr.tool_use_id,
        output: tr.content || ""
      });
    }
    return items;
  }
  const text2 = lastMsg.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  if (text2) {
    items.push({
      type: "message",
      role: lastMsg.role === "assistant" ? "assistant" : "user",
      content: text2
    });
  }
  return items;
}
function fromResponsesOutput(data) {
  const output = Array.isArray(data.output) ? data.output.filter(isRecord2) : [];
  const content = [];
  let hasToolCalls = false;
  for (const item of output) {
    if (item.type === "message" && Array.isArray(item.content)) {
      for (const part of item.content.filter(isRecord2)) {
        if (part.type === "output_text" && typeof part.text === "string") {
          content.push({ type: "text", text: part.text });
        }
      }
    } else if (item.type === "function_call") {
      hasToolCalls = true;
      let input = {};
      try {
        const parsed = JSON.parse(typeof item.arguments === "string" ? item.arguments : "{}");
        input = isRecord2(parsed) ? parsed : { _raw: parsed };
      } catch {
        input = { _raw: item.arguments };
      }
      content.push({
        type: "tool_use",
        id: stringValue(item.call_id) || stringValue(item.id),
        name: stringValue(item.name),
        input
      });
    }
  }
  const stopReason = hasToolCalls ? "tool_use" : "end_turn";
  const usage = isRecord2(data.usage) ? data.usage : void 0;
  return {
    content,
    stopReason,
    usage: usage ? { inputTokens: numberValue(usage.input_tokens), outputTokens: numberValue(usage.output_tokens) } : void 0
  };
}
function numberValue(value) {
  return typeof value === "number" ? value : 0;
}
function stringValue(value) {
  return typeof value === "string" ? value : "";
}
function getNestedString2(value, path) {
  let current = value;
  for (const key2 of path) {
    if (!isRecord2(current)) return void 0;
    current = current[key2];
  }
  return typeof current === "string" ? current : void 0;
}
function asRecord2(value) {
  return isRecord2(value) ? value : {};
}
function isRecord2(value) {
  return typeof value === "object" && value !== null;
}
var import_obsidian2, DEFAULT_OPENAI_URL, previousResponseId;
var init_openai = __esm({
  "src/api/openai.ts"() {
    "use strict";
    import_obsidian2 = require("obsidian");
    DEFAULT_OPENAI_URL = "https://api.openai.com";
    previousResponseId = null;
  }
});

// src/auth/chatgptOAuth.ts
var import_obsidian3, ISSUER, CLIENT_ID, DEVICE_VERIFICATION_URI, DEVICE_REDIRECT_URI, POLL_MARGIN_MS, USER_AGENT, ChatGPTOAuthError, sleep, base64UrlDecode, parseJwtClaims, extractAccountIdFromClaims, extractAccountId, describeError, ChatGPTOAuthService;
var init_chatgptOAuth = __esm({
  "src/auth/chatgptOAuth.ts"() {
    "use strict";
    import_obsidian3 = require("obsidian");
    ISSUER = "https://auth.openai.com";
    CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann";
    DEVICE_VERIFICATION_URI = `${ISSUER}/codex/device`;
    DEVICE_REDIRECT_URI = `${ISSUER}/deviceauth/callback`;
    POLL_MARGIN_MS = 3e3;
    USER_AGENT = "chatting-with-ai/chatgpt-oauth";
    ChatGPTOAuthError = class extends Error {
      constructor(message) {
        super(message);
        this.name = "ChatGPTOAuthError";
      }
    };
    sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));
    base64UrlDecode = (input) => {
      const padded = input.replace(/-/g, "+").replace(/_/g, "/");
      const padding = padded.length % 4 === 0 ? "" : "=".repeat(4 - padded.length % 4);
      return atob(padded + padding);
    };
    parseJwtClaims = (token) => {
      const parts = token.split(".");
      if (parts.length !== 3) return void 0;
      try {
        return JSON.parse(base64UrlDecode(parts[1]));
      } catch {
        return void 0;
      }
    };
    extractAccountIdFromClaims = (claims) => {
      return claims.chatgpt_account_id || claims["https://api.openai.com/auth"]?.chatgpt_account_id || claims.organizations?.[0]?.id;
    };
    extractAccountId = (tokens) => {
      if (tokens.id_token) {
        const claims = parseJwtClaims(tokens.id_token);
        if (claims) {
          const accountId = extractAccountIdFromClaims(claims);
          if (accountId) return accountId;
        }
      }
      const accessClaims = parseJwtClaims(tokens.access_token);
      return accessClaims ? extractAccountIdFromClaims(accessClaims) : void 0;
    };
    describeError = (response) => {
      if (typeof response.text === "string" && response.text.trim()) {
        return ` \u2014 ${response.text.trim().slice(0, 300)}`;
      }
      if (response.json && typeof response.json === "object") {
        try {
          return ` \u2014 ${JSON.stringify(response.json)}`;
        } catch {
          return "";
        }
      }
      return "";
    };
    ChatGPTOAuthService = class {
      constructor(store) {
        this.store = store;
      }
      /** Synchronous read of the stored credential (whether or not it's expired). */
      getCredential() {
        return this.store.get();
      }
      /** Wipe the stored credential. */
      clearCredential() {
        this.store.clear();
      }
      /**
       * Start the device authorization flow.
       * Returns the user-facing code + verification URL the user must visit.
       */
      async beginDeviceAuthorization() {
        const response = await (0, import_obsidian3.requestUrl)({
          url: `${ISSUER}/api/accounts/deviceauth/usercode`,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": USER_AGENT
          },
          body: JSON.stringify({ client_id: CLIENT_ID }),
          throw: false
        });
        if (response.status < 200 || response.status >= 300) {
          throw new ChatGPTOAuthError(
            `Failed to start ChatGPT device authorization: HTTP ${response.status}${describeError(response)}`
          );
        }
        const data = response.json;
        if (!data?.device_auth_id || !data?.user_code) {
          throw new ChatGPTOAuthError("Device authorization response was missing required fields.");
        }
        const intervalSec = Math.max(parseInt(String(data.interval ?? "5"), 10) || 5, 1);
        return {
          deviceAuthId: data.device_auth_id,
          userCode: data.user_code,
          verificationUri: DEVICE_VERIFICATION_URI,
          intervalMs: intervalSec * 1e3
        };
      }
      /**
       * Poll for completion of a device authorization. Resolves with the stored
       * credential when the user finishes authorizing, or rejects on cancel /
       * unrecoverable error. Use `cancel()` from the returned handle to stop.
       */
      pollDeviceAuthorization(authorization) {
        let cancelled = false;
        const cancel = () => {
          cancelled = true;
        };
        const promise = (async () => {
          while (true) {
            if (cancelled) {
              throw new ChatGPTOAuthError("ChatGPT login was cancelled.");
            }
            const response = await (0, import_obsidian3.requestUrl)({
              url: `${ISSUER}/api/accounts/deviceauth/token`,
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "User-Agent": USER_AGENT
              },
              body: JSON.stringify({
                device_auth_id: authorization.deviceAuthId,
                user_code: authorization.userCode
              }),
              throw: false
            });
            if (response.status >= 200 && response.status < 300) {
              const data = response.json;
              if (typeof data.authorization_code !== "string" || typeof data.code_verifier !== "string") {
                throw new ChatGPTOAuthError("Device authorization returned an invalid token payload.");
              }
              const credential = await this.exchangeAuthorizationCode({
                code: data.authorization_code,
                codeVerifier: data.code_verifier,
                redirectUri: DEVICE_REDIRECT_URI
              });
              this.store.set(credential);
              return credential;
            }
            if (response.status !== 403 && response.status !== 404) {
              throw new ChatGPTOAuthError(
                `Device authorization polling failed: HTTP ${response.status}${describeError(response)}`
              );
            }
            await sleep(authorization.intervalMs + POLL_MARGIN_MS);
          }
        })();
        return { promise, cancel };
      }
      /**
       * Refresh an expiring credential. Stores the new credential on success.
       */
      async refreshCredential(credential) {
        const response = await (0, import_obsidian3.requestUrl)({
          url: `${ISSUER}/oauth/token`,
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": USER_AGENT
          },
          body: new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: credential.refreshToken,
            client_id: CLIENT_ID
          }).toString(),
          throw: false
        });
        if (response.status < 200 || response.status >= 300) {
          throw new ChatGPTOAuthError(
            `ChatGPT token refresh failed: HTTP ${response.status}${describeError(response)}`
          );
        }
        const data = response.json;
        const next2 = this.toCredential(data, credential.accountId);
        this.store.set(next2);
        return next2;
      }
      /**
       * Return a credential that is guaranteed to be currently valid, refreshing
       * if necessary. Returns null if there's no stored credential at all.
       * Throws if a refresh is needed but fails.
       */
      async getUsableCredential() {
        const current = this.store.get();
        if (!current) return null;
        if (!this.store.isExpired(current)) return current;
        return this.refreshCredential(current);
      }
      /** Exchange an authorization code (from device flow) for tokens. */
      async exchangeAuthorizationCode(input) {
        const response = await (0, import_obsidian3.requestUrl)({
          url: `${ISSUER}/oauth/token`,
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": USER_AGENT
          },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            code: input.code,
            redirect_uri: input.redirectUri,
            client_id: CLIENT_ID,
            code_verifier: input.codeVerifier
          }).toString(),
          throw: false
        });
        if (response.status < 200 || response.status >= 300) {
          throw new ChatGPTOAuthError(
            `ChatGPT token exchange failed: HTTP ${response.status}${describeError(response)}`
          );
        }
        return this.toCredential(response.json);
      }
      toCredential(tokens, fallbackAccountId) {
        const now = Date.now();
        const accountId = extractAccountId(tokens) ?? fallbackAccountId;
        return {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt: now + (tokens.expires_in ?? 3600) * 1e3,
          updatedAt: now,
          ...tokens.id_token ? { idToken: tokens.id_token } : {},
          ...accountId ? { accountId } : {}
        };
      }
    };
  }
});

// src/api/chatgpt-oauth.ts
function setChatGPTOAuthService(service) {
  oauthService = service;
}
function clearChatGPTOAuthState() {
}
async function sendChatGPTOAuthMessage(settings, messages, tools, systemPrompt) {
  if (!oauthService) {
    throw new ChatGPTOAuthError(
      "ChatGPT OAuth service is not initialized. Reload the plugin."
    );
  }
  let credential;
  try {
    credential = await oauthService.getUsableCredential();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new ChatGPTOAuthError(
      `ChatGPT OAuth session expired and refresh failed. Please reconnect your ChatGPT account in settings. (${msg})`
    );
  }
  if (!credential) {
    throw new ChatGPTOAuthError(
      "ChatGPT OAuth is not connected. Open Settings -> Chatting with AI -> Connect ChatGPT."
    );
  }
  const model = settings.model || CHATGPT_OAUTH_DEFAULT_MODEL;
  const baseBody = {
    model,
    // Replay the full conversation each turn — Codex's `store:false` mode
    // makes server-side `previous_response_id` chaining unavailable.
    input: buildFullHistoryInput(messages),
    instructions: systemPrompt,
    // Required by the Codex backend; omitting it returns
    // 400 {"detail":"Store must be set to false"}.
    store: false,
    // Match the request shape used by other working Codex-via-OAuth clients
    // (verified against the OpenAI Codex CLI and external references). These
    // fields aren't strictly documented as required, but Codex's response
    // pipeline expects them and at least one is required for reasoning models.
    parallel_tool_calls: true
  };
  if (/^o\d/.test(model) || /^gpt-5/.test(model) || /codex/i.test(model)) {
    baseBody.reasoning = { effort: "medium", summary: "auto" };
    baseBody.include = ["reasoning.encrypted_content"];
  }
  const apiTools = tools.map((t) => ({
    type: "function",
    name: t.name,
    description: t.description,
    parameters: t.inputSchema,
    // Codex backend (and the OpenAI Responses API generally) accepts
    // `strict` on function tools. Setting `false` matches what the
    // official Codex CLI / other working OAuth-Codex clients send and
    // avoids unintended structured-output validation on free-form tools.
    strict: false
  }));
  if (settings.enableWebSearch) {
    apiTools.push({ type: "web_search" });
  }
  if (apiTools.length > 0) {
    baseBody.tools = apiTools;
  }
  return sendOnce(
    { ...baseBody, stream: true },
    credential.accessToken,
    credential.accountId
  );
}
async function sendOnce(body, accessToken, accountId) {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    Accept: "text/event-stream, application/json",
    "User-Agent": USER_AGENT2,
    originator: ORIGINATOR
  };
  if (accountId) {
    headers["ChatGPT-Account-Id"] = accountId;
  }
  let response;
  try {
    response = await (0, import_obsidian4.requestUrl)({
      url: CODEX_RESPONSES_URL,
      method: "POST",
      headers,
      body: JSON.stringify(body),
      throw: false
    });
  } catch (e) {
    const err = asRecord3(e);
    const status = typeof err.status === "number" || typeof err.status === "string" ? String(err.status) : "";
    const message = typeof err.message === "string" ? err.message : String(e);
    throw new ChatGPTOAuthError(
      `ChatGPT OAuth request failed (${status}): ${message}`
    );
  }
  if (response.status === 401 || response.status === 403) {
    throw new ChatGPTOAuthError(
      `ChatGPT OAuth session rejected by the server (HTTP ${response.status}). Please reconnect your ChatGPT account in settings.`
    );
  }
  if (response.status < 200 || response.status >= 300) {
    let json;
    try {
      json = asOptionalRecord(response.json);
    } catch {
      json = void 0;
    }
    const detail = json?.detail;
    const detailText = typeof detail === "string" ? detail : getNestedString3(detail, ["message"]);
    const apiMsg = detailText ?? getNestedString3(json, ["error", "message"]) ?? response.text?.slice(0, 300) ?? `HTTP ${response.status}`;
    const err = new ChatGPTOAuthError(
      `ChatGPT OAuth request failed (${response.status}): ${apiMsg}. The Codex backend may not accept the selected model or request format. Try reconnecting, picking a different model, or switching to OpenAI API Key.`
    );
    err.status = response.status;
    throw err;
  }
  const data = parseResponseBody(response);
  return fromResponsesOutput2(data);
}
function parseResponseBody(response) {
  let jsonObj;
  try {
    jsonObj = asOptionalRecord(response.json);
  } catch {
    jsonObj = void 0;
  }
  if (jsonObj && (jsonObj.output || jsonObj.id)) {
    return jsonObj;
  }
  const text2 = response.text ?? "";
  if (!text2) {
    throw new ChatGPTOAuthError("ChatGPT OAuth response was empty.");
  }
  const events = parseSSE(text2);
  const itemByIndex = /* @__PURE__ */ new Map();
  let completedResponse = null;
  let failureMessage = null;
  for (const evt of events) {
    const type = stringValue2(evt.type);
    if (type === "response.output_item.done") {
      const item = asOptionalRecord(evt.item);
      if (item) {
        const key2 = outputKey(evt.output_index) ?? (stringValue2(item.id) || itemByIndex.size);
        itemByIndex.set(key2, item);
      }
    } else if (type === "response.completed") {
      completedResponse = asOptionalRecord(evt.response) ?? {};
    } else if (type === "response.incomplete") {
      completedResponse = asOptionalRecord(evt.response) ?? {};
    } else if (type === "response.failed") {
      failureMessage = getNestedString3(evt.response, ["error", "message"]) ?? "ChatGPT OAuth response failed";
    } else if (type === "error" && typeof evt.message === "string") {
      failureMessage = evt.message;
    }
  }
  if (failureMessage) throw new ChatGPTOAuthError(failureMessage);
  if (completedResponse || itemByIndex.size > 0) {
    const synthesized = {
      ...completedResponse ?? {},
      output: Array.from(itemByIndex.values())
    };
    return synthesized;
  }
  throw new ChatGPTOAuthError(
    "ChatGPT OAuth stream ended without a completed response."
  );
}
function parseSSE(text2) {
  const events = [];
  const blocks = text2.split(/\r?\n\r?\n/);
  for (const block2 of blocks) {
    if (!block2.trim()) continue;
    const lines = block2.split(/\r?\n/);
    const dataLines = [];
    for (const line of lines) {
      if (line.startsWith("data:")) {
        dataLines.push(line.slice(5).replace(/^ /, ""));
      }
    }
    if (dataLines.length === 0) continue;
    const payload = dataLines.join("\n");
    if (payload === "[DONE]") continue;
    try {
      const event2 = JSON.parse(payload);
      if (isRecord3(event2)) events.push(event2);
    } catch {
    }
  }
  return events;
}
function buildFullHistoryInput(messages) {
  const items = [];
  for (const msg of messages) {
    const role = msg.role === "assistant" ? "assistant" : "user";
    if (typeof msg.content === "string") {
      items.push({ type: "message", role, content: msg.content });
      continue;
    }
    for (const block2 of msg.content) {
      if (block2.type === "text" && block2.text) {
        items.push({ type: "message", role, content: block2.text });
      } else if (block2.type === "tool_use" && block2.name && block2.id) {
        items.push({
          type: "function_call",
          call_id: block2.id,
          name: block2.name,
          arguments: JSON.stringify(block2.input ?? {})
        });
      } else if (block2.type === "tool_result" && block2.tool_use_id) {
        items.push({
          type: "function_call_output",
          call_id: block2.tool_use_id,
          output: block2.content ?? ""
        });
      }
    }
  }
  return items;
}
function fromResponsesOutput2(data) {
  const output = Array.isArray(data.output) ? data.output.filter(isRecord3) : [];
  const content = [];
  let hasToolCalls = false;
  for (const item of output) {
    if (item.type === "message" && Array.isArray(item.content)) {
      for (const part of item.content.filter(isRecord3)) {
        if (part.type === "output_text" && typeof part.text === "string") {
          content.push({ type: "text", text: part.text });
        }
      }
    } else if (item.type === "function_call") {
      hasToolCalls = true;
      let input = {};
      try {
        const parsed = JSON.parse(typeof item.arguments === "string" ? item.arguments : "{}");
        input = isRecord3(parsed) ? parsed : { _raw: parsed };
      } catch {
        input = { _raw: item.arguments };
      }
      content.push({
        type: "tool_use",
        id: stringValue2(item.call_id) || stringValue2(item.id),
        name: stringValue2(item.name),
        input
      });
    }
  }
  const stopReason = hasToolCalls ? "tool_use" : "end_turn";
  const usage = isRecord3(data.usage) ? data.usage : void 0;
  return {
    content,
    stopReason,
    usage: usage ? { inputTokens: numberValue2(usage.input_tokens), outputTokens: numberValue2(usage.output_tokens) } : void 0
  };
}
function numberValue2(value) {
  return typeof value === "number" ? value : 0;
}
function stringValue2(value) {
  return typeof value === "string" ? value : "";
}
function outputKey(value) {
  return typeof value === "string" || typeof value === "number" ? value : void 0;
}
function getNestedString3(value, path) {
  let current = value;
  for (const key2 of path) {
    if (!isRecord3(current)) return void 0;
    current = current[key2];
  }
  return typeof current === "string" ? current : void 0;
}
function asRecord3(value) {
  return isRecord3(value) ? value : {};
}
function asOptionalRecord(value) {
  return isRecord3(value) ? value : void 0;
}
function isRecord3(value) {
  return typeof value === "object" && value !== null;
}
var import_obsidian4, CODEX_RESPONSES_URL, ORIGINATOR, USER_AGENT2, oauthService;
var init_chatgpt_oauth = __esm({
  "src/api/chatgpt-oauth.ts"() {
    "use strict";
    import_obsidian4 = require("obsidian");
    init_types();
    init_chatgptOAuth();
    CODEX_RESPONSES_URL = "https://chatgpt.com/backend-api/codex/responses";
    ORIGINATOR = "opencode";
    USER_AGENT2 = "OpenAI/JS 4.x chatting-with-ai/0.1";
    oauthService = null;
  }
});

// src/api/client.ts
var client_exports = {};
__export(client_exports, {
  sendMessage: () => sendMessage
});
async function sendMessage(settings, messages, tools, systemPrompt) {
  const doSend = () => {
    if (settings.provider === "anthropic") {
      return sendAnthropicMessage(settings, messages, tools, systemPrompt);
    }
    if (settings.provider === "chatgpt-oauth") {
      return sendChatGPTOAuthMessage(settings, messages, tools, systemPrompt);
    }
    return sendOpenAIMessage(settings, messages, tools, systemPrompt);
  };
  try {
    return await doSend();
  } catch (e) {
    if (isRateLimitError(e)) {
      const retryAfter = extractRetryAfter(e);
      const delay = retryAfter ? retryAfter * 1e3 : 5e3;
      await sleep2(Math.min(delay, 3e4));
      return await doSend();
    }
    throw e;
  }
}
function isRateLimitError(e) {
  if (e instanceof Error) {
    return e.message.includes("429") || e.message.toLowerCase().includes("rate limit");
  }
  return false;
}
function extractRetryAfter(e) {
  if (e instanceof Error) {
    const match = e.message.match(/retry.after[:\s]*(\d+)/i);
    if (match) return parseInt(match[1], 10);
  }
  return null;
}
function sleep2(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
var init_client = __esm({
  "src/api/client.ts"() {
    "use strict";
    init_anthropic();
    init_openai();
    init_chatgpt_oauth();
  }
});

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => ChatPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian11 = require("obsidian");
init_types();

// src/settings.ts
var import_obsidian5 = require("obsidian");
init_types();
var FALLBACK_MODELS = {
  anthropic: [
    { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
    { value: "claude-opus-4-7", label: "Claude Opus 4.7" },
    { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" }
  ],
  openai: [
    { value: "gpt-5.3-codex", label: "Codex 5.3" },
    { value: "gpt-5.4", label: "GPT-5.4" },
    { value: "gpt-4o", label: "GPT-4o" }
  ],
  // Mirrors the bundled `models.json` shipped with the official OpenAI Codex
  // CLI. These are the slugs the Codex backend currently accepts when the
  // request is authenticated with a ChatGPT account. Sorted by Codex CLI
  // priority (lowest first = recommended). Update when upstream changes.
  "chatgpt-oauth": [
    { value: "gpt-5.5", label: "GPT-5.5 (recommended)" },
    { value: "gpt-5.4", label: "GPT-5.4" },
    { value: "gpt-5.4-mini", label: "GPT-5.4-Mini" },
    { value: "gpt-5.3-codex", label: "GPT-5.3-Codex" },
    { value: "gpt-5.2", label: "GPT-5.2" }
  ]
};
var modelCache = /* @__PURE__ */ new Map();
function getModelDisplayName(provider, modelId) {
  const cached = modelCache.get(provider);
  const models = cached || FALLBACK_MODELS[provider] || [];
  const match = models.find((m) => m.value === modelId);
  return match?.label || modelId;
}
var ChatSettingTab = class extends import_obsidian5.PluginSettingTab {
  plugin;
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    const s = this.plugin.settings;
    new import_obsidian5.Setting(containerEl).setName("Provider").setDesc("Which AI provider to use").addDropdown(
      (dropdown) => dropdown.addOption("anthropic", "Anthropic").addOption("openai", "OpenAI").addOption("chatgpt-oauth", "ChatGPT OAuth").setValue(s.provider).onChange(async (value) => {
        s.provider = value;
        s.model = "";
        this.plugin.reloadApiKeyForProvider();
        if (s.provider === "chatgpt-oauth" && !s.model) {
          s.model = CHATGPT_OAUTH_DEFAULT_MODEL;
        }
        await this.plugin.saveSettings();
        window.setTimeout(() => this.display(), 10);
      })
    );
    if (s.provider === "chatgpt-oauth") {
      this.renderChatGPTOAuthSection(containerEl);
    } else {
      this.renderApiKeySection(containerEl);
    }
    this.renderModelSection(containerEl);
    new import_obsidian5.Setting(containerEl).setName("Web search").setDesc("Allow the model to search the web when it needs current information").addToggle(
      (toggle) => toggle.setValue(s.enableWebSearch).onChange(async (value) => {
        s.enableWebSearch = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian5.Setting(containerEl).setName("Max tool iterations").setDesc("Safety limit for the agent loop (default: 20)").addText(
      (text2) => text2.setPlaceholder("20").setValue(String(s.maxIterations)).onChange(async (value) => {
        const n = parseInt(value, 10);
        if (!isNaN(n) && n > 0 && n <= 100) {
          s.maxIterations = n;
          await this.plugin.saveSettings();
        }
      })
    );
  }
  // ─── API key + test (anthropic / openai) ──────────────────────────────────
  renderApiKeySection(containerEl) {
    const s = this.plugin.settings;
    const apiKeySetting = new import_obsidian5.Setting(containerEl).setName("API key").setDesc(s.apiKey ? "Key saved" : "Enter your API key to get started").addText((text2) => {
      text2.inputEl.type = "password";
      text2.setPlaceholder("Enter your API key").setValue(s.apiKey).onChange(async (value) => {
        const hadKey = !!s.apiKey;
        s.apiKey = value.trim();
        await this.plugin.saveSettings();
        if (!hadKey && s.apiKey) {
          window.setTimeout(() => this.display(), 10);
        }
      });
    });
    if (s.apiKey) {
      apiKeySetting.addButton(
        (button) => button.setButtonText("Test").onClick(async () => {
          button.setButtonText("Testing...");
          button.setDisabled(true);
          try {
            const { sendMessage: sendMessage2 } = await Promise.resolve().then(() => (init_client(), client_exports));
            const response = await sendMessage2(
              s,
              [{ role: "user", content: "Say hello in one word." }],
              [],
              "You are a test. Respond with one word."
            );
            const text2 = response.content.filter((b) => b.type === "text").map((b) => b.text).join("");
            new import_obsidian5.Notice(`Connected! Response: "${text2}"`);
            apiKeySetting.setDesc("Connection successful");
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            new import_obsidian5.Notice(`Connection failed: ${msg}`);
            apiKeySetting.setDesc(`Failed: ${msg}`);
          } finally {
            button.setButtonText("Test");
            button.setDisabled(false);
          }
        })
      );
    }
  }
  // ─── ChatGPT OAuth ────────────────────────────────────────────────────────
  renderChatGPTOAuthSection(containerEl) {
    const credential = this.plugin.chatgptOAuth.getCredential();
    const explainer = containerEl.createEl("div", {
      cls: "setting-item-description ochatting-oauth-explainer"
    });
    explainer.createSpan({
      text: "Sign in with your ChatGPT account instead of using an OpenAI API key. Requests are routed through the ChatGPT/Codex backend (not "
    });
    explainer.createEl("code", { text: "api.openai.com" });
    explainer.createSpan({
      text: ") and require an active ChatGPT plan with Codex access. The available models mirror the Codex CLI catalog."
    });
    if (credential) {
      const account = credential.accountId ? maskAccountId(credential.accountId) : "(no account id)";
      const expires = new Date(credential.expiresAt).toLocaleString();
      new import_obsidian5.Setting(containerEl).setName("ChatGPT account").setDesc(`Connected \u2014 account ${account}. Token expires ${expires}.`).addButton(
        (button) => button.setButtonText("Disconnect").setWarning().onClick(async () => {
          this.plugin.chatgptOAuth.clearCredential();
          new import_obsidian5.Notice("ChatGPT OAuth disconnected.");
          this.display();
        })
      ).addButton(
        (button) => button.setButtonText("Test").onClick(async () => {
          button.setButtonText("Testing...");
          button.setDisabled(true);
          try {
            const { sendMessage: sendMessage2 } = await Promise.resolve().then(() => (init_client(), client_exports));
            const response = await sendMessage2(
              this.plugin.settings,
              [{ role: "user", content: "Say hello in one word." }],
              [],
              "You are a test. Respond with one word."
            );
            const text2 = response.content.filter((b) => b.type === "text").map((b) => b.text).join("");
            new import_obsidian5.Notice(`Connected! Response: "${text2 || "(no text)"}"`);
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            new import_obsidian5.Notice(`Connection test failed: ${msg}`);
          } finally {
            button.setButtonText("Test");
            button.setDisabled(false);
          }
        })
      );
    } else {
      new import_obsidian5.Setting(containerEl).setName("ChatGPT account").setDesc("Not connected. Sign in with ChatGPT to use this provider.").addButton(
        (button) => button.setButtonText("Connect ChatGPT").setCta().onClick(async () => {
          try {
            const auth = await this.plugin.chatgptOAuth.beginDeviceAuthorization();
            const handle = this.plugin.chatgptOAuth.pollDeviceAuthorization(auth);
            const modal = new ChatGPTDeviceLoginModal(this.app, auth, handle, () => {
              this.display();
            });
            modal.open();
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            new import_obsidian5.Notice(`Failed to start ChatGPT login: ${msg}`);
          }
        })
      );
    }
  }
  // ─── Model picker ─────────────────────────────────────────────────────────
  renderModelSection(containerEl) {
    const s = this.plugin.settings;
    const cached = modelCache.get(s.provider);
    const models = cached || FALLBACK_MODELS[s.provider] || FALLBACK_MODELS.anthropic;
    const modelSetting = new import_obsidian5.Setting(containerEl).setName("Model").setDesc(cached ? `${cached.length} models from API` : "Using defaults. Click refresh to load from API.").addDropdown((dropdown) => {
      for (const m of models) {
        dropdown.addOption(m.value, m.label);
      }
      dropdown.addOption("__custom__", "Custom...");
      if (s.model && !models.some((m) => m.value === s.model)) {
        dropdown.addOption(s.model, `${s.model} (current)`);
      }
      dropdown.setValue(s.model || models[0]?.value || "");
      dropdown.onChange(async (value) => {
        if (value === "__custom__") {
          s.model = "";
          await this.plugin.saveSettings();
          window.setTimeout(() => this.display(), 10);
        } else {
          s.model = value;
          await this.plugin.saveSettings();
        }
      });
    });
    const canFetchModels = s.provider === "anthropic" && !!s.apiKey || s.provider === "openai" && !!s.apiKey;
    if (canFetchModels) {
      modelSetting.addButton(
        (btn) => btn.setIcon("refresh-cw").setTooltip("Fetch models from API").onClick(async () => {
          btn.setDisabled(true);
          try {
            const fetched = await fetchModelsFromAPI(s.provider, s.apiKey);
            modelCache.set(s.provider, fetched);
            new import_obsidian5.Notice(`Loaded ${fetched.length} models`);
            if (!s.model && fetched.length > 0) {
              s.model = fetched[0].value;
              await this.plugin.saveSettings();
            }
            this.display();
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            new import_obsidian5.Notice(`Failed to fetch models: ${msg}`);
          }
        })
      );
    }
    if (!s.model) {
      new import_obsidian5.Setting(containerEl).setName("Custom model ID").setDesc("Enter the full model identifier").addText(
        (text2) => text2.setPlaceholder(
          s.provider === "anthropic" ? "claude-sonnet-4-20250514" : s.provider === "chatgpt-oauth" ? CHATGPT_OAUTH_DEFAULT_MODEL : "gpt-4o"
        ).setValue(s.model).onChange(async (value) => {
          s.model = value.trim();
          await this.plugin.saveSettings();
        })
      );
    }
  }
};
var ChatGPTDeviceLoginModal = class extends import_obsidian5.Modal {
  constructor(app, authorization, handle, onComplete) {
    super(app);
    this.authorization = authorization;
    this.handle = handle;
    this.onComplete = onComplete;
  }
  cancelled = false;
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    new import_obsidian5.Setting(contentEl).setName("Connect ChatGPT").setHeading();
    contentEl.createEl("p", {
      text: "1. Open this page in any browser:"
    });
    const linkRow = contentEl.createEl("div", { cls: "ochatting-device-link-row" });
    const link2 = linkRow.createEl("a", {
      text: this.authorization.verificationUri,
      href: this.authorization.verificationUri
    });
    link2.setAttr("target", "_blank");
    link2.setAttr("rel", "noopener");
    contentEl.createEl("p", { text: "2. Enter this code on the page:" });
    const codeRow = contentEl.createEl("div", { cls: "ochatting-device-code-row" });
    codeRow.createEl("code", {
      text: this.authorization.userCode,
      cls: "ochatting-device-code"
    });
    const copyBtn = codeRow.createEl("button", { text: "Copy code" });
    copyBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(this.authorization.userCode).then(() => new import_obsidian5.Notice("Code copied.")).catch(() => new import_obsidian5.Notice("Failed to copy code."));
    });
    const status = contentEl.createEl("p", {
      text: "Waiting for authorization. You can return here after signing in.",
      cls: "ochatting-device-status"
    });
    const buttons = contentEl.createEl("div", { cls: "ochatting-device-buttons" });
    const openBtn = buttons.createEl("button", { text: "Open login page" });
    openBtn.classList.add("mod-cta");
    openBtn.addEventListener("click", () => {
      window.open(this.authorization.verificationUri, "_blank");
    });
    const cancelBtn = buttons.createEl("button", { text: "Cancel" });
    cancelBtn.addEventListener("click", () => {
      this.cancelled = true;
      this.handle.cancel();
      this.close();
    });
    this.handle.promise.then(() => {
      if (this.cancelled) return;
      new import_obsidian5.Notice("ChatGPT connected.");
      this.onComplete();
      this.close();
    }).catch((e) => {
      if (this.cancelled) return;
      const msg = e instanceof Error ? e.message : String(e);
      status.setText(`Login failed: ${msg}`);
      status.removeClass("ochatting-device-status");
      status.addClass("ochatting-device-status-error");
    });
  }
  onClose() {
    if (!this.cancelled) {
      this.handle.cancel();
    }
    this.contentEl.empty();
  }
};
function maskAccountId(accountId) {
  if (accountId.length <= 8) return accountId;
  return `${accountId.slice(0, 4)}\u2026${accountId.slice(-4)}`;
}
async function fetchModelsFromAPI(provider, apiKey) {
  if (provider === "anthropic") {
    return fetchAnthropicModels(apiKey);
  }
  if (provider === "openai") {
    return fetchOpenAIModels(apiKey);
  }
  return FALLBACK_MODELS["chatgpt-oauth"];
}
async function fetchAnthropicModels(apiKey) {
  let response;
  try {
    response = await (0, import_obsidian5.requestUrl)({
      url: "https://api.anthropic.com/v1/models?limit=100",
      method: "GET",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      }
    });
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : String(e));
  }
  const models = getModelRecords(response.json).filter((m) => m.type === "model").filter((m) => typeof m.id === "string").map((m) => ({
    value: m.id,
    label: typeof m.display_name === "string" ? m.display_name : m.id
  })).sort((a, b) => {
    const da = a.value.match(/(\d{8})/)?.[1] || "";
    const db = b.value.match(/(\d{8})/)?.[1] || "";
    return db.localeCompare(da) || a.label.localeCompare(b.label);
  });
  return models.length > 0 ? models : FALLBACK_MODELS.anthropic;
}
async function fetchOpenAIModels(apiKey) {
  let response;
  try {
    response = await (0, import_obsidian5.requestUrl)({
      url: "https://api.openai.com/v1/models",
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}` }
    });
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : String(e));
  }
  const chatPrefixes = ["gpt-", "o1", "o3", "o4", "chatgpt-", "codex-", "gpt5"];
  const excludePatterns = ["realtime", "audio", "transcri", "search"];
  const models = getModelRecords(response.json).filter((m) => typeof m.id === "string").filter((m) => {
    const id = m.id.toLowerCase();
    return chatPrefixes.some((p) => id.startsWith(p)) && !excludePatterns.some((p) => id.includes(p));
  }).sort(
    (a, b) => numberValue3(b.created) - numberValue3(a.created)
  ).map((m) => ({ value: m.id, label: m.id }));
  return models.length > 0 ? models : FALLBACK_MODELS.openai;
}
function getModelRecords(value) {
  if (!isRecord4(value) || !Array.isArray(value.data)) return [];
  return value.data.filter(isRecord4);
}
function numberValue3(value) {
  return typeof value === "number" ? value : 0;
}
function isRecord4(value) {
  return typeof value === "object" && value !== null;
}

// src/ui/chat-view.ts
var import_obsidian7 = require("obsidian");

// node_modules/esm-env/dev-fallback.js
var node_env = globalThis.process?.env?.NODE_ENV;
var dev_fallback_default = node_env && !node_env.toLowerCase().startsWith("prod");

// node_modules/svelte/src/internal/shared/utils.js
var is_array = Array.isArray;
var index_of = Array.prototype.indexOf;
var includes = Array.prototype.includes;
var array_from = Array.from;
var object_keys = Object.keys;
var define_property = Object.defineProperty;
var get_descriptor = Object.getOwnPropertyDescriptor;
var get_descriptors = Object.getOwnPropertyDescriptors;
var object_prototype = Object.prototype;
var array_prototype = Array.prototype;
var get_prototype_of = Object.getPrototypeOf;
var is_extensible = Object.isExtensible;
var noop = () => {
};
function run_all(arr) {
  for (var i = 0; i < arr.length; i++) {
    arr[i]();
  }
}
function deferred() {
  var resolve;
  var reject;
  var promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

// node_modules/svelte/src/internal/client/constants.js
var DERIVED = 1 << 1;
var EFFECT = 1 << 2;
var RENDER_EFFECT = 1 << 3;
var MANAGED_EFFECT = 1 << 24;
var BLOCK_EFFECT = 1 << 4;
var BRANCH_EFFECT = 1 << 5;
var ROOT_EFFECT = 1 << 6;
var BOUNDARY_EFFECT = 1 << 7;
var CONNECTED = 1 << 9;
var CLEAN = 1 << 10;
var DIRTY = 1 << 11;
var MAYBE_DIRTY = 1 << 12;
var INERT = 1 << 13;
var DESTROYED = 1 << 14;
var REACTION_RAN = 1 << 15;
var DESTROYING = 1 << 25;
var EFFECT_TRANSPARENT = 1 << 16;
var EAGER_EFFECT = 1 << 17;
var HEAD_EFFECT = 1 << 18;
var EFFECT_PRESERVED = 1 << 19;
var USER_EFFECT = 1 << 20;
var EFFECT_OFFSCREEN = 1 << 25;
var WAS_MARKED = 1 << 16;
var REACTION_IS_UPDATING = 1 << 21;
var ASYNC = 1 << 22;
var ERROR_VALUE = 1 << 23;
var STATE_SYMBOL = Symbol("$state");
var LEGACY_PROPS = Symbol("legacy props");
var LOADING_ATTR_SYMBOL = Symbol("");
var PROXY_PATH_SYMBOL = Symbol("proxy path");
var STALE_REACTION = new class StaleReactionError extends Error {
  name = "StaleReactionError";
  message = "The reaction that called `getAbortSignal()` was re-run or destroyed";
}();
var IS_XHTML = (
  // We gotta write it like this because after downleveling the pure comment may end up in the wrong location
  !!globalThis.document?.contentType && /* @__PURE__ */ globalThis.document.contentType.includes("xml")
);
var TEXT_NODE = 3;
var COMMENT_NODE = 8;

// node_modules/svelte/src/internal/shared/errors.js
function invariant_violation(message) {
  if (dev_fallback_default) {
    const error = new Error(`invariant_violation
An invariant violation occurred, meaning Svelte's internal assumptions were flawed. This is a bug in Svelte, not your app \u2014 please open an issue at https://github.com/sveltejs/svelte, citing the following message: "${message}"
https://svelte.dev/e/invariant_violation`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/invariant_violation`);
  }
}

// node_modules/svelte/src/internal/client/errors.js
function async_derived_orphan() {
  if (dev_fallback_default) {
    const error = new Error(`async_derived_orphan
Cannot create a \`$derived(...)\` with an \`await\` expression outside of an effect tree
https://svelte.dev/e/async_derived_orphan`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/async_derived_orphan`);
  }
}
function bind_invalid_checkbox_value() {
  if (dev_fallback_default) {
    const error = new Error(`bind_invalid_checkbox_value
Using \`bind:value\` together with a checkbox input is not allowed. Use \`bind:checked\` instead
https://svelte.dev/e/bind_invalid_checkbox_value`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/bind_invalid_checkbox_value`);
  }
}
function derived_references_self() {
  if (dev_fallback_default) {
    const error = new Error(`derived_references_self
A derived value cannot reference itself recursively
https://svelte.dev/e/derived_references_self`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/derived_references_self`);
  }
}
function each_key_duplicate(a, b, value) {
  if (dev_fallback_default) {
    const error = new Error(`each_key_duplicate
${value ? `Keyed each block has duplicate key \`${value}\` at indexes ${a} and ${b}` : `Keyed each block has duplicate key at indexes ${a} and ${b}`}
https://svelte.dev/e/each_key_duplicate`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/each_key_duplicate`);
  }
}
function each_key_volatile(index2, a, b) {
  if (dev_fallback_default) {
    const error = new Error(`each_key_volatile
Keyed each block has key that is not idempotent \u2014 the key for item at index ${index2} was \`${a}\` but is now \`${b}\`. Keys must be the same each time for a given item
https://svelte.dev/e/each_key_volatile`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/each_key_volatile`);
  }
}
function effect_in_teardown(rune) {
  if (dev_fallback_default) {
    const error = new Error(`effect_in_teardown
\`${rune}\` cannot be used inside an effect cleanup function
https://svelte.dev/e/effect_in_teardown`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/effect_in_teardown`);
  }
}
function effect_in_unowned_derived() {
  if (dev_fallback_default) {
    const error = new Error(`effect_in_unowned_derived
Effect cannot be created inside a \`$derived\` value that was not itself created inside an effect
https://svelte.dev/e/effect_in_unowned_derived`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/effect_in_unowned_derived`);
  }
}
function effect_orphan(rune) {
  if (dev_fallback_default) {
    const error = new Error(`effect_orphan
\`${rune}\` can only be used inside an effect (e.g. during component initialisation)
https://svelte.dev/e/effect_orphan`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/effect_orphan`);
  }
}
function effect_update_depth_exceeded() {
  if (dev_fallback_default) {
    const error = new Error(`effect_update_depth_exceeded
Maximum update depth exceeded. This typically indicates that an effect reads and writes the same piece of state
https://svelte.dev/e/effect_update_depth_exceeded`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/effect_update_depth_exceeded`);
  }
}
function hydration_failed() {
  if (dev_fallback_default) {
    const error = new Error(`hydration_failed
Failed to hydrate the application
https://svelte.dev/e/hydration_failed`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/hydration_failed`);
  }
}
function rune_outside_svelte(rune) {
  if (dev_fallback_default) {
    const error = new Error(`rune_outside_svelte
The \`${rune}\` rune is only available inside \`.svelte\` and \`.svelte.js/ts\` files
https://svelte.dev/e/rune_outside_svelte`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/rune_outside_svelte`);
  }
}
function state_descriptors_fixed() {
  if (dev_fallback_default) {
    const error = new Error(`state_descriptors_fixed
Property descriptors defined on \`$state\` objects must contain \`value\` and always be \`enumerable\`, \`configurable\` and \`writable\`.
https://svelte.dev/e/state_descriptors_fixed`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/state_descriptors_fixed`);
  }
}
function state_prototype_fixed() {
  if (dev_fallback_default) {
    const error = new Error(`state_prototype_fixed
Cannot set prototype of \`$state\` object
https://svelte.dev/e/state_prototype_fixed`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/state_prototype_fixed`);
  }
}
function state_unsafe_mutation() {
  if (dev_fallback_default) {
    const error = new Error(`state_unsafe_mutation
Updating state inside \`$derived(...)\`, \`$inspect(...)\` or a template expression is forbidden. If the value should not be reactive, declare it without \`$state\`
https://svelte.dev/e/state_unsafe_mutation`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/state_unsafe_mutation`);
  }
}
function svelte_boundary_reset_onerror() {
  if (dev_fallback_default) {
    const error = new Error(`svelte_boundary_reset_onerror
A \`<svelte:boundary>\` \`reset\` function cannot be called while an error is still being handled
https://svelte.dev/e/svelte_boundary_reset_onerror`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/svelte_boundary_reset_onerror`);
  }
}

// node_modules/svelte/src/constants.js
var EACH_ITEM_REACTIVE = 1;
var EACH_INDEX_REACTIVE = 1 << 1;
var EACH_IS_CONTROLLED = 1 << 2;
var EACH_IS_ANIMATED = 1 << 3;
var EACH_ITEM_IMMUTABLE = 1 << 4;
var PROPS_IS_RUNES = 1 << 1;
var PROPS_IS_UPDATED = 1 << 2;
var PROPS_IS_BINDABLE = 1 << 3;
var PROPS_IS_LAZY_INITIAL = 1 << 4;
var TRANSITION_OUT = 1 << 1;
var TRANSITION_GLOBAL = 1 << 2;
var TEMPLATE_FRAGMENT = 1;
var TEMPLATE_USE_IMPORT_NODE = 1 << 1;
var TEMPLATE_USE_SVG = 1 << 2;
var TEMPLATE_USE_MATHML = 1 << 3;
var HYDRATION_START = "[";
var HYDRATION_START_ELSE = "[!";
var HYDRATION_START_FAILED = "[?";
var HYDRATION_END = "]";
var HYDRATION_ERROR = {};
var ELEMENT_PRESERVE_ATTRIBUTE_CASE = 1 << 1;
var ELEMENT_IS_INPUT = 1 << 2;
var UNINITIALIZED = Symbol();
var FILENAME = Symbol("filename");
var HMR = Symbol("hmr");
var NAMESPACE_HTML = "http://www.w3.org/1999/xhtml";

// node_modules/svelte/src/internal/client/warnings.js
var bold = "font-weight: bold";
var normal = "font-weight: normal";
function await_waterfall(name, location) {
  if (dev_fallback_default) {
    console.warn(`%c[svelte] await_waterfall
%cAn async derived, \`${name}\` (${location}) was not read immediately after it resolved. This often indicates an unnecessary waterfall, which can slow down your app
https://svelte.dev/e/await_waterfall`, bold, normal);
  } else {
    console.warn(`https://svelte.dev/e/await_waterfall`);
  }
}
function hydration_attribute_changed(attribute, html2, value) {
  if (dev_fallback_default) {
    console.warn(`%c[svelte] hydration_attribute_changed
%cThe \`${attribute}\` attribute on \`${html2}\` changed its value between server and client renders. The client value, \`${value}\`, will be ignored in favour of the server value
https://svelte.dev/e/hydration_attribute_changed`, bold, normal);
  } else {
    console.warn(`https://svelte.dev/e/hydration_attribute_changed`);
  }
}
function hydration_mismatch(location) {
  if (dev_fallback_default) {
    console.warn(
      `%c[svelte] hydration_mismatch
%c${location ? `Hydration failed because the initial UI does not match what was rendered on the server. The error occurred near ${location}` : "Hydration failed because the initial UI does not match what was rendered on the server"}
https://svelte.dev/e/hydration_mismatch`,
      bold,
      normal
    );
  } else {
    console.warn(`https://svelte.dev/e/hydration_mismatch`);
  }
}
function lifecycle_double_unmount() {
  if (dev_fallback_default) {
    console.warn(`%c[svelte] lifecycle_double_unmount
%cTried to unmount a component that was not mounted
https://svelte.dev/e/lifecycle_double_unmount`, bold, normal);
  } else {
    console.warn(`https://svelte.dev/e/lifecycle_double_unmount`);
  }
}
function state_proxy_equality_mismatch(operator) {
  if (dev_fallback_default) {
    console.warn(`%c[svelte] state_proxy_equality_mismatch
%cReactive \`$state(...)\` proxies and the values they proxy have different identities. Because of this, comparisons with \`${operator}\` will produce unexpected results
https://svelte.dev/e/state_proxy_equality_mismatch`, bold, normal);
  } else {
    console.warn(`https://svelte.dev/e/state_proxy_equality_mismatch`);
  }
}
function state_proxy_unmount() {
  if (dev_fallback_default) {
    console.warn(`%c[svelte] state_proxy_unmount
%cTried to unmount a state proxy, rather than a component
https://svelte.dev/e/state_proxy_unmount`, bold, normal);
  } else {
    console.warn(`https://svelte.dev/e/state_proxy_unmount`);
  }
}
function svelte_boundary_reset_noop() {
  if (dev_fallback_default) {
    console.warn(`%c[svelte] svelte_boundary_reset_noop
%cA \`<svelte:boundary>\` \`reset\` function only resets the boundary the first time it is called
https://svelte.dev/e/svelte_boundary_reset_noop`, bold, normal);
  } else {
    console.warn(`https://svelte.dev/e/svelte_boundary_reset_noop`);
  }
}

// node_modules/svelte/src/internal/client/dom/hydration.js
var hydrating = false;
function set_hydrating(value) {
  hydrating = value;
}
var hydrate_node;
function set_hydrate_node(node) {
  if (node === null) {
    hydration_mismatch();
    throw HYDRATION_ERROR;
  }
  return hydrate_node = node;
}
function hydrate_next() {
  return set_hydrate_node(get_next_sibling(hydrate_node));
}
function reset(node) {
  if (!hydrating) return;
  if (get_next_sibling(hydrate_node) !== null) {
    hydration_mismatch();
    throw HYDRATION_ERROR;
  }
  hydrate_node = node;
}
function next(count = 1) {
  if (hydrating) {
    var i = count;
    var node = hydrate_node;
    while (i--) {
      node = /** @type {TemplateNode} */
      get_next_sibling(node);
    }
    hydrate_node = node;
  }
}
function skip_nodes(remove = true) {
  var depth = 0;
  var node = hydrate_node;
  while (true) {
    if (node.nodeType === COMMENT_NODE) {
      var data = (
        /** @type {Comment} */
        node.data
      );
      if (data === HYDRATION_END) {
        if (depth === 0) return node;
        depth -= 1;
      } else if (data === HYDRATION_START || data === HYDRATION_START_ELSE || // "[1", "[2", etc. for if blocks
      data[0] === "[" && !isNaN(Number(data.slice(1)))) {
        depth += 1;
      }
    }
    var next2 = (
      /** @type {TemplateNode} */
      get_next_sibling(node)
    );
    if (remove) node.remove();
    node = next2;
  }
}
function read_hydration_instruction(node) {
  if (!node || node.nodeType !== COMMENT_NODE) {
    hydration_mismatch();
    throw HYDRATION_ERROR;
  }
  return (
    /** @type {Comment} */
    node.data
  );
}

// node_modules/svelte/src/internal/client/reactivity/equality.js
function equals(value) {
  return value === this.v;
}
function safe_not_equal(a, b) {
  return a != a ? b == b : a !== b || a !== null && typeof a === "object" || typeof a === "function";
}
function safe_equals(value) {
  return !safe_not_equal(value, this.v);
}

// node_modules/svelte/src/internal/flags/index.js
var async_mode_flag = false;
var legacy_mode_flag = false;
var tracing_mode_flag = false;

// node_modules/svelte/src/internal/client/dev/tracing.js
var tracing_expressions = null;
function tag(source2, label) {
  source2.label = label;
  tag_proxy(source2.v, label);
  return source2;
}
function tag_proxy(value, label) {
  value?.[PROXY_PATH_SYMBOL]?.(label);
  return value;
}

// node_modules/svelte/src/internal/shared/dev.js
function get_error(label) {
  const error = new Error();
  const stack2 = get_stack();
  if (stack2.length === 0) {
    return null;
  }
  stack2.unshift("\n");
  define_property(error, "stack", {
    value: stack2.join("\n")
  });
  define_property(error, "name", {
    value: label
  });
  return (
    /** @type {Error & { stack: string }} */
    error
  );
}
function get_stack() {
  const limit = Error.stackTraceLimit;
  Error.stackTraceLimit = Infinity;
  const stack2 = new Error().stack;
  Error.stackTraceLimit = limit;
  if (!stack2) return [];
  const lines = stack2.split("\n");
  const new_lines = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const posixified = line.replaceAll("\\", "/");
    if (line.trim() === "Error") {
      continue;
    }
    if (line.includes("validate_each_keys")) {
      return [];
    }
    if (posixified.includes("svelte/src/internal") || posixified.includes("node_modules/.vite")) {
      continue;
    }
    new_lines.push(line);
  }
  return new_lines;
}
function invariant(condition, message) {
  if (!dev_fallback_default) {
    throw new Error("invariant(...) was not guarded by if (DEV)");
  }
  if (!condition) invariant_violation(message);
}

// node_modules/svelte/src/internal/client/context.js
var component_context = null;
function set_component_context(context) {
  component_context = context;
}
var dev_stack = null;
function set_dev_stack(stack2) {
  dev_stack = stack2;
}
var dev_current_component_function = null;
function set_dev_current_component_function(fn) {
  dev_current_component_function = fn;
}
function push(props, runes = false, fn) {
  component_context = {
    p: component_context,
    i: false,
    c: null,
    e: null,
    s: props,
    x: null,
    r: (
      /** @type {Effect} */
      active_effect
    ),
    l: legacy_mode_flag && !runes ? { s: null, u: null, $: [] } : null
  };
  if (dev_fallback_default) {
    component_context.function = fn;
    dev_current_component_function = fn;
  }
}
function pop(component2) {
  var context = (
    /** @type {ComponentContext} */
    component_context
  );
  var effects = context.e;
  if (effects !== null) {
    context.e = null;
    for (var fn of effects) {
      create_user_effect(fn);
    }
  }
  if (component2 !== void 0) {
    context.x = component2;
  }
  context.i = true;
  component_context = context.p;
  if (dev_fallback_default) {
    dev_current_component_function = component_context?.function ?? null;
  }
  return component2 ?? /** @type {T} */
  {};
}
function is_runes() {
  return !legacy_mode_flag || component_context !== null && component_context.l === null;
}

// node_modules/svelte/src/internal/client/dom/task.js
var micro_tasks = [];
function run_micro_tasks() {
  var tasks = micro_tasks;
  micro_tasks = [];
  run_all(tasks);
}
function queue_micro_task(fn) {
  if (micro_tasks.length === 0 && !is_flushing_sync) {
    var tasks = micro_tasks;
    queueMicrotask(() => {
      if (tasks === micro_tasks) run_micro_tasks();
    });
  }
  micro_tasks.push(fn);
}
function flush_tasks() {
  while (micro_tasks.length > 0) {
    run_micro_tasks();
  }
}

// node_modules/svelte/src/internal/client/error-handling.js
var adjustments = /* @__PURE__ */ new WeakMap();
function handle_error(error) {
  var effect2 = active_effect;
  if (effect2 === null) {
    active_reaction.f |= ERROR_VALUE;
    return error;
  }
  if (dev_fallback_default && error instanceof Error && !adjustments.has(error)) {
    adjustments.set(error, get_adjustments(error, effect2));
  }
  if ((effect2.f & REACTION_RAN) === 0 && (effect2.f & EFFECT) === 0) {
    if (dev_fallback_default && !effect2.parent && error instanceof Error) {
      apply_adjustments(error);
    }
    throw error;
  }
  invoke_error_boundary(error, effect2);
}
function invoke_error_boundary(error, effect2) {
  while (effect2 !== null) {
    if ((effect2.f & BOUNDARY_EFFECT) !== 0) {
      if ((effect2.f & REACTION_RAN) === 0) {
        throw error;
      }
      try {
        effect2.b.error(error);
        return;
      } catch (e) {
        error = e;
      }
    }
    effect2 = effect2.parent;
  }
  if (dev_fallback_default && error instanceof Error) {
    apply_adjustments(error);
  }
  throw error;
}
function get_adjustments(error, effect2) {
  const message_descriptor = get_descriptor(error, "message");
  if (message_descriptor && !message_descriptor.configurable) return;
  var indent = is_firefox ? "  " : "	";
  var component_stack = `
${indent}in ${effect2.fn?.name || "<unknown>"}`;
  var context = effect2.ctx;
  while (context !== null) {
    component_stack += `
${indent}in ${context.function?.[FILENAME].split("/").pop()}`;
    context = context.p;
  }
  return {
    message: error.message + `
${component_stack}
`,
    stack: error.stack?.split("\n").filter((line) => !line.includes("svelte/src/internal")).join("\n")
  };
}
function apply_adjustments(error) {
  const adjusted = adjustments.get(error);
  if (adjusted) {
    define_property(error, "message", {
      value: adjusted.message
    });
    define_property(error, "stack", {
      value: adjusted.stack
    });
  }
}

// node_modules/svelte/src/internal/client/reactivity/status.js
var STATUS_MASK = ~(DIRTY | MAYBE_DIRTY | CLEAN);
function set_signal_status(signal, status) {
  signal.f = signal.f & STATUS_MASK | status;
}
function update_derived_status(derived2) {
  if ((derived2.f & CONNECTED) !== 0 || derived2.deps === null) {
    set_signal_status(derived2, CLEAN);
  } else {
    set_signal_status(derived2, MAYBE_DIRTY);
  }
}

// node_modules/svelte/src/internal/client/reactivity/utils.js
function clear_marked(deps) {
  if (deps === null) return;
  for (const dep of deps) {
    if ((dep.f & DERIVED) === 0 || (dep.f & WAS_MARKED) === 0) {
      continue;
    }
    dep.f ^= WAS_MARKED;
    clear_marked(
      /** @type {Derived} */
      dep.deps
    );
  }
}
function defer_effect(effect2, dirty_effects, maybe_dirty_effects) {
  if ((effect2.f & DIRTY) !== 0) {
    dirty_effects.add(effect2);
  } else if ((effect2.f & MAYBE_DIRTY) !== 0) {
    maybe_dirty_effects.add(effect2);
  }
  clear_marked(effect2.deps);
  set_signal_status(effect2, CLEAN);
}

// node_modules/svelte/src/internal/client/reactivity/store.js
var legacy_is_updating_store = false;
var IS_UNMOUNTED = Symbol();

// node_modules/svelte/src/internal/client/reactivity/batch.js
var batches = /* @__PURE__ */ new Set();
var current_batch = null;
var previous_batch = null;
var batch_values = null;
var last_scheduled_effect = null;
var is_flushing_sync = false;
var is_processing = false;
var collected_effects = null;
var legacy_updates = null;
var flush_count = 0;
var source_stacks = dev_fallback_default ? /* @__PURE__ */ new Set() : null;
var uid = 1;
var Batch = class _Batch {
  // for debugging. TODO remove once async is stable
  id = uid++;
  /**
   * The current values of any sources that are updated in this batch
   * They keys of this map are identical to `this.#previous`
   * @type {Map<Source, any>}
   */
  current = /* @__PURE__ */ new Map();
  /**
   * The values of any sources that are updated in this batch _before_ those updates took place.
   * They keys of this map are identical to `this.#current`
   * @type {Map<Source, any>}
   */
  previous = /* @__PURE__ */ new Map();
  /**
   * When the batch is committed (and the DOM is updated), we need to remove old branches
   * and append new ones by calling the functions added inside (if/each/key/etc) blocks
   * @type {Set<(batch: Batch) => void>}
   */
  #commit_callbacks = /* @__PURE__ */ new Set();
  /**
   * If a fork is discarded, we need to destroy any effects that are no longer needed
   * @type {Set<(batch: Batch) => void>}
   */
  #discard_callbacks = /* @__PURE__ */ new Set();
  /**
   * The number of async effects that are currently in flight
   */
  #pending = 0;
  /**
   * The number of async effects that are currently in flight, _not_ inside a pending boundary
   */
  #blocking_pending = 0;
  /**
   * A deferred that resolves when the batch is committed, used with `settled()`
   * TODO replace with Promise.withResolvers once supported widely enough
   * @type {{ promise: Promise<void>, resolve: (value?: any) => void, reject: (reason: unknown) => void } | null}
   */
  #deferred = null;
  /**
   * The root effects that need to be flushed
   * @type {Effect[]}
   */
  #roots = [];
  /**
   * Deferred effects (which run after async work has completed) that are DIRTY
   * @type {Set<Effect>}
   */
  #dirty_effects = /* @__PURE__ */ new Set();
  /**
   * Deferred effects that are MAYBE_DIRTY
   * @type {Set<Effect>}
   */
  #maybe_dirty_effects = /* @__PURE__ */ new Set();
  /**
   * A map of branches that still exist, but will be destroyed when this batch
   * is committed — we skip over these during `process`.
   * The value contains child effects that were dirty/maybe_dirty before being reset,
   * so they can be rescheduled if the branch survives.
   * @type {Map<Effect, { d: Effect[], m: Effect[] }>}
   */
  #skipped_branches = /* @__PURE__ */ new Map();
  is_fork = false;
  #decrement_queued = false;
  #is_deferred() {
    return this.is_fork || this.#blocking_pending > 0;
  }
  /**
   * Add an effect to the #skipped_branches map and reset its children
   * @param {Effect} effect
   */
  skip_effect(effect2) {
    if (!this.#skipped_branches.has(effect2)) {
      this.#skipped_branches.set(effect2, { d: [], m: [] });
    }
  }
  /**
   * Remove an effect from the #skipped_branches map and reschedule
   * any tracked dirty/maybe_dirty child effects
   * @param {Effect} effect
   */
  unskip_effect(effect2) {
    var tracked = this.#skipped_branches.get(effect2);
    if (tracked) {
      this.#skipped_branches.delete(effect2);
      for (var e of tracked.d) {
        set_signal_status(e, DIRTY);
        this.schedule(e);
      }
      for (e of tracked.m) {
        set_signal_status(e, MAYBE_DIRTY);
        this.schedule(e);
      }
    }
  }
  #process() {
    if (flush_count++ > 1e3) {
      batches.delete(this);
      infinite_loop_guard();
    }
    if (!this.#is_deferred()) {
      for (const e of this.#dirty_effects) {
        this.#maybe_dirty_effects.delete(e);
        set_signal_status(e, DIRTY);
        this.schedule(e);
      }
      for (const e of this.#maybe_dirty_effects) {
        set_signal_status(e, MAYBE_DIRTY);
        this.schedule(e);
      }
    }
    const roots = this.#roots;
    this.#roots = [];
    this.apply();
    var effects = collected_effects = [];
    var render_effects = [];
    var updates = legacy_updates = [];
    for (const root2 of roots) {
      try {
        this.#traverse(root2, effects, render_effects);
      } catch (e) {
        reset_all(root2);
        throw e;
      }
    }
    current_batch = null;
    if (updates.length > 0) {
      var batch = _Batch.ensure();
      for (const e of updates) {
        batch.schedule(e);
      }
    }
    collected_effects = null;
    legacy_updates = null;
    if (this.#is_deferred()) {
      this.#defer_effects(render_effects);
      this.#defer_effects(effects);
      for (const [e, t] of this.#skipped_branches) {
        reset_branch(e, t);
      }
    } else {
      if (this.#pending === 0) {
        batches.delete(this);
      }
      this.#dirty_effects.clear();
      this.#maybe_dirty_effects.clear();
      for (const fn of this.#commit_callbacks) fn(this);
      this.#commit_callbacks.clear();
      previous_batch = this;
      flush_queued_effects(render_effects);
      flush_queued_effects(effects);
      previous_batch = null;
      this.#deferred?.resolve();
    }
    var next_batch = (
      /** @type {Batch | null} */
      /** @type {unknown} */
      current_batch
    );
    if (this.#roots.length > 0) {
      const batch2 = next_batch ??= this;
      batch2.#roots.push(...this.#roots.filter((r2) => !batch2.#roots.includes(r2)));
    }
    if (next_batch !== null) {
      batches.add(next_batch);
      if (dev_fallback_default) {
        for (const source2 of this.current.keys()) {
          source_stacks.add(source2);
        }
      }
      next_batch.#process();
    }
    if (!batches.has(this)) {
      this.#commit();
    }
  }
  /**
   * Traverse the effect tree, executing effects or stashing
   * them for later execution as appropriate
   * @param {Effect} root
   * @param {Effect[]} effects
   * @param {Effect[]} render_effects
   */
  #traverse(root2, effects, render_effects) {
    root2.f ^= CLEAN;
    var effect2 = root2.first;
    while (effect2 !== null) {
      var flags2 = effect2.f;
      var is_branch = (flags2 & (BRANCH_EFFECT | ROOT_EFFECT)) !== 0;
      var is_skippable_branch = is_branch && (flags2 & CLEAN) !== 0;
      var skip = is_skippable_branch || (flags2 & INERT) !== 0 || this.#skipped_branches.has(effect2);
      if (!skip && effect2.fn !== null) {
        if (is_branch) {
          effect2.f ^= CLEAN;
        } else if ((flags2 & EFFECT) !== 0) {
          effects.push(effect2);
        } else if (async_mode_flag && (flags2 & (RENDER_EFFECT | MANAGED_EFFECT)) !== 0) {
          render_effects.push(effect2);
        } else if (is_dirty(effect2)) {
          if ((flags2 & BLOCK_EFFECT) !== 0) this.#maybe_dirty_effects.add(effect2);
          update_effect(effect2);
        }
        var child2 = effect2.first;
        if (child2 !== null) {
          effect2 = child2;
          continue;
        }
      }
      while (effect2 !== null) {
        var next2 = effect2.next;
        if (next2 !== null) {
          effect2 = next2;
          break;
        }
        effect2 = effect2.parent;
      }
    }
  }
  /**
   * @param {Effect[]} effects
   */
  #defer_effects(effects) {
    for (var i = 0; i < effects.length; i += 1) {
      defer_effect(effects[i], this.#dirty_effects, this.#maybe_dirty_effects);
    }
  }
  /**
   * Associate a change to a given source with the current
   * batch, noting its previous and current values
   * @param {Source} source
   * @param {any} old_value
   */
  capture(source2, old_value) {
    if (old_value !== UNINITIALIZED && !this.previous.has(source2)) {
      this.previous.set(source2, old_value);
    }
    if ((source2.f & ERROR_VALUE) === 0) {
      this.current.set(source2, source2.v);
      batch_values?.set(source2, source2.v);
    }
  }
  activate() {
    current_batch = this;
  }
  deactivate() {
    current_batch = null;
    batch_values = null;
  }
  flush() {
    var source_stacks2 = dev_fallback_default ? /* @__PURE__ */ new Set() : null;
    try {
      is_processing = true;
      current_batch = this;
      this.#process();
    } finally {
      flush_count = 0;
      last_scheduled_effect = null;
      collected_effects = null;
      legacy_updates = null;
      is_processing = false;
      current_batch = null;
      batch_values = null;
      old_values.clear();
      if (dev_fallback_default) {
        for (
          const source2 of
          /** @type {Set<Source>} */
          source_stacks2
        ) {
          source2.updated = null;
        }
      }
    }
  }
  discard() {
    for (const fn of this.#discard_callbacks) fn(this);
    this.#discard_callbacks.clear();
  }
  #commit() {
    for (const batch of batches) {
      var is_earlier = batch.id < this.id;
      var sources = [];
      for (const [source3, value] of this.current) {
        if (batch.current.has(source3)) {
          if (is_earlier && value !== batch.current.get(source3)) {
            batch.current.set(source3, value);
          } else {
            continue;
          }
        }
        sources.push(source3);
      }
      if (sources.length === 0) {
        continue;
      }
      var others = [...batch.current.keys()].filter((s) => !this.current.has(s));
      if (others.length > 0) {
        if (dev_fallback_default) {
          invariant(batch.#roots.length === 0, "Batch has scheduled roots");
        }
        batch.activate();
        var marked = /* @__PURE__ */ new Set();
        var checked = /* @__PURE__ */ new Map();
        for (var source2 of sources) {
          mark_effects(source2, others, marked, checked);
        }
        if (batch.#roots.length > 0) {
          batch.apply();
          for (var root2 of batch.#roots) {
            batch.#traverse(root2, [], []);
          }
          batch.#roots = [];
        }
        batch.deactivate();
      }
    }
  }
  /**
   *
   * @param {boolean} blocking
   */
  increment(blocking) {
    this.#pending += 1;
    if (blocking) this.#blocking_pending += 1;
  }
  /**
   * @param {boolean} blocking
   * @param {boolean} skip - whether to skip updates (because this is triggered by a stale reaction)
   */
  decrement(blocking, skip) {
    this.#pending -= 1;
    if (blocking) this.#blocking_pending -= 1;
    if (this.#decrement_queued || skip) return;
    this.#decrement_queued = true;
    queue_micro_task(() => {
      this.#decrement_queued = false;
      this.flush();
    });
  }
  /**
   * @param {Set<Effect>} dirty_effects
   * @param {Set<Effect>} maybe_dirty_effects
   */
  transfer_effects(dirty_effects, maybe_dirty_effects) {
    for (const e of dirty_effects) {
      this.#dirty_effects.add(e);
    }
    for (const e of maybe_dirty_effects) {
      this.#maybe_dirty_effects.add(e);
    }
    dirty_effects.clear();
    maybe_dirty_effects.clear();
  }
  /** @param {(batch: Batch) => void} fn */
  oncommit(fn) {
    this.#commit_callbacks.add(fn);
  }
  /** @param {(batch: Batch) => void} fn */
  ondiscard(fn) {
    this.#discard_callbacks.add(fn);
  }
  settled() {
    return (this.#deferred ??= deferred()).promise;
  }
  static ensure() {
    if (current_batch === null) {
      const batch = current_batch = new _Batch();
      if (!is_processing) {
        batches.add(current_batch);
        if (!is_flushing_sync) {
          queue_micro_task(() => {
            if (current_batch !== batch) {
              return;
            }
            batch.flush();
          });
        }
      }
    }
    return current_batch;
  }
  apply() {
    if (!async_mode_flag || !this.is_fork && batches.size === 1) {
      batch_values = null;
      return;
    }
    batch_values = new Map(this.current);
    for (const batch of batches) {
      if (batch === this || batch.is_fork) continue;
      for (const [source2, previous] of batch.previous) {
        if (!batch_values.has(source2)) {
          batch_values.set(source2, previous);
        }
      }
    }
  }
  /**
   *
   * @param {Effect} effect
   */
  schedule(effect2) {
    last_scheduled_effect = effect2;
    if (effect2.b?.is_pending && (effect2.f & (EFFECT | RENDER_EFFECT | MANAGED_EFFECT)) !== 0 && (effect2.f & REACTION_RAN) === 0) {
      effect2.b.defer_effect(effect2);
      return;
    }
    var e = effect2;
    while (e.parent !== null) {
      e = e.parent;
      var flags2 = e.f;
      if (collected_effects !== null && e === active_effect) {
        if (async_mode_flag) return;
        if ((active_reaction === null || (active_reaction.f & DERIVED) === 0) && !legacy_is_updating_store) {
          return;
        }
      }
      if ((flags2 & (ROOT_EFFECT | BRANCH_EFFECT)) !== 0) {
        if ((flags2 & CLEAN) === 0) {
          return;
        }
        e.f ^= CLEAN;
      }
    }
    this.#roots.push(e);
  }
};
function flushSync(fn) {
  var was_flushing_sync = is_flushing_sync;
  is_flushing_sync = true;
  try {
    var result;
    if (fn) {
      if (current_batch !== null && !current_batch.is_fork) {
        current_batch.flush();
      }
      result = fn();
    }
    while (true) {
      flush_tasks();
      if (current_batch === null) {
        return (
          /** @type {T} */
          result
        );
      }
      current_batch.flush();
    }
  } finally {
    is_flushing_sync = was_flushing_sync;
  }
}
function infinite_loop_guard() {
  if (dev_fallback_default) {
    var updates = /* @__PURE__ */ new Map();
    for (
      const source2 of
      /** @type {Batch} */
      current_batch.current.keys()
    ) {
      for (const [stack2, update2] of source2.updated ?? []) {
        var entry = updates.get(stack2);
        if (!entry) {
          entry = { error: update2.error, count: 0 };
          updates.set(stack2, entry);
        }
        entry.count += update2.count;
      }
    }
    for (const update2 of updates.values()) {
      if (update2.error) {
        console.error(update2.error);
      }
    }
  }
  try {
    effect_update_depth_exceeded();
  } catch (error) {
    if (dev_fallback_default) {
      define_property(error, "stack", { value: "" });
    }
    invoke_error_boundary(error, last_scheduled_effect);
  }
}
var eager_block_effects = null;
function flush_queued_effects(effects) {
  var length = effects.length;
  if (length === 0) return;
  var i = 0;
  while (i < length) {
    var effect2 = effects[i++];
    if ((effect2.f & (DESTROYED | INERT)) === 0 && is_dirty(effect2)) {
      eager_block_effects = /* @__PURE__ */ new Set();
      update_effect(effect2);
      if (effect2.deps === null && effect2.first === null && effect2.nodes === null && effect2.teardown === null && effect2.ac === null) {
        unlink_effect(effect2);
      }
      if (eager_block_effects?.size > 0) {
        old_values.clear();
        for (const e of eager_block_effects) {
          if ((e.f & (DESTROYED | INERT)) !== 0) continue;
          const ordered_effects = [e];
          let ancestor = e.parent;
          while (ancestor !== null) {
            if (eager_block_effects.has(ancestor)) {
              eager_block_effects.delete(ancestor);
              ordered_effects.push(ancestor);
            }
            ancestor = ancestor.parent;
          }
          for (let j = ordered_effects.length - 1; j >= 0; j--) {
            const e2 = ordered_effects[j];
            if ((e2.f & (DESTROYED | INERT)) !== 0) continue;
            update_effect(e2);
          }
        }
        eager_block_effects.clear();
      }
    }
  }
  eager_block_effects = null;
}
function mark_effects(value, sources, marked, checked) {
  if (marked.has(value)) return;
  marked.add(value);
  if (value.reactions !== null) {
    for (const reaction of value.reactions) {
      const flags2 = reaction.f;
      if ((flags2 & DERIVED) !== 0) {
        mark_effects(
          /** @type {Derived} */
          reaction,
          sources,
          marked,
          checked
        );
      } else if ((flags2 & (ASYNC | BLOCK_EFFECT)) !== 0 && (flags2 & DIRTY) === 0 && depends_on(reaction, sources, checked)) {
        set_signal_status(reaction, DIRTY);
        schedule_effect(
          /** @type {Effect} */
          reaction
        );
      }
    }
  }
}
function depends_on(reaction, sources, checked) {
  const depends = checked.get(reaction);
  if (depends !== void 0) return depends;
  if (reaction.deps !== null) {
    for (const dep of reaction.deps) {
      if (includes.call(sources, dep)) {
        return true;
      }
      if ((dep.f & DERIVED) !== 0 && depends_on(
        /** @type {Derived} */
        dep,
        sources,
        checked
      )) {
        checked.set(
          /** @type {Derived} */
          dep,
          true
        );
        return true;
      }
    }
  }
  checked.set(reaction, false);
  return false;
}
function schedule_effect(effect2) {
  current_batch.schedule(effect2);
}
function reset_branch(effect2, tracked) {
  if ((effect2.f & BRANCH_EFFECT) !== 0 && (effect2.f & CLEAN) !== 0) {
    return;
  }
  if ((effect2.f & DIRTY) !== 0) {
    tracked.d.push(effect2);
  } else if ((effect2.f & MAYBE_DIRTY) !== 0) {
    tracked.m.push(effect2);
  }
  set_signal_status(effect2, CLEAN);
  var e = effect2.first;
  while (e !== null) {
    reset_branch(e, tracked);
    e = e.next;
  }
}
function reset_all(effect2) {
  set_signal_status(effect2, CLEAN);
  var e = effect2.first;
  while (e !== null) {
    reset_all(e);
    e = e.next;
  }
}

// node_modules/svelte/src/reactivity/create-subscriber.js
function createSubscriber(start) {
  let subscribers = 0;
  let version = source(0);
  let stop;
  if (dev_fallback_default) {
    tag(version, "createSubscriber version");
  }
  return () => {
    if (effect_tracking()) {
      get2(version);
      render_effect(() => {
        if (subscribers === 0) {
          stop = untrack(() => start(() => increment(version)));
        }
        subscribers += 1;
        return () => {
          queue_micro_task(() => {
            subscribers -= 1;
            if (subscribers === 0) {
              stop?.();
              stop = void 0;
              increment(version);
            }
          });
        };
      });
    }
  };
}

// node_modules/svelte/src/internal/client/dom/blocks/boundary.js
var flags = EFFECT_TRANSPARENT | EFFECT_PRESERVED;
function boundary(node, props, children, transform_error) {
  new Boundary(node, props, children, transform_error);
}
var Boundary = class {
  /** @type {Boundary | null} */
  parent;
  is_pending = false;
  /**
   * API-level transformError transform function. Transforms errors before they reach the `failed` snippet.
   * Inherited from parent boundary, or defaults to identity.
   * @type {(error: unknown) => unknown}
   */
  transform_error;
  /** @type {TemplateNode} */
  #anchor;
  /** @type {TemplateNode | null} */
  #hydrate_open = hydrating ? hydrate_node : null;
  /** @type {BoundaryProps} */
  #props;
  /** @type {((anchor: Node) => void)} */
  #children;
  /** @type {Effect} */
  #effect;
  /** @type {Effect | null} */
  #main_effect = null;
  /** @type {Effect | null} */
  #pending_effect = null;
  /** @type {Effect | null} */
  #failed_effect = null;
  /** @type {DocumentFragment | null} */
  #offscreen_fragment = null;
  #local_pending_count = 0;
  #pending_count = 0;
  #pending_count_update_queued = false;
  /** @type {Set<Effect>} */
  #dirty_effects = /* @__PURE__ */ new Set();
  /** @type {Set<Effect>} */
  #maybe_dirty_effects = /* @__PURE__ */ new Set();
  /**
   * A source containing the number of pending async deriveds/expressions.
   * Only created if `$effect.pending()` is used inside the boundary,
   * otherwise updating the source results in needless `Batch.ensure()`
   * calls followed by no-op flushes
   * @type {Source<number> | null}
   */
  #effect_pending = null;
  #effect_pending_subscriber = createSubscriber(() => {
    this.#effect_pending = source(this.#local_pending_count);
    if (dev_fallback_default) {
      tag(this.#effect_pending, "$effect.pending()");
    }
    return () => {
      this.#effect_pending = null;
    };
  });
  /**
   * @param {TemplateNode} node
   * @param {BoundaryProps} props
   * @param {((anchor: Node) => void)} children
   * @param {((error: unknown) => unknown) | undefined} [transform_error]
   */
  constructor(node, props, children, transform_error) {
    this.#anchor = node;
    this.#props = props;
    this.#children = (anchor) => {
      var effect2 = (
        /** @type {Effect} */
        active_effect
      );
      effect2.b = this;
      effect2.f |= BOUNDARY_EFFECT;
      children(anchor);
    };
    this.parent = /** @type {Effect} */
    active_effect.b;
    this.transform_error = transform_error ?? this.parent?.transform_error ?? ((e) => e);
    this.#effect = block(() => {
      if (hydrating) {
        const comment2 = (
          /** @type {Comment} */
          this.#hydrate_open
        );
        hydrate_next();
        const server_rendered_pending = comment2.data === HYDRATION_START_ELSE;
        const server_rendered_failed = comment2.data.startsWith(HYDRATION_START_FAILED);
        if (server_rendered_failed) {
          const serialized_error = JSON.parse(comment2.data.slice(HYDRATION_START_FAILED.length));
          this.#hydrate_failed_content(serialized_error);
        } else if (server_rendered_pending) {
          this.#hydrate_pending_content();
        } else {
          this.#hydrate_resolved_content();
        }
      } else {
        this.#render();
      }
    }, flags);
    if (hydrating) {
      this.#anchor = hydrate_node;
    }
  }
  #hydrate_resolved_content() {
    try {
      this.#main_effect = branch(() => this.#children(this.#anchor));
    } catch (error) {
      this.error(error);
    }
  }
  /**
   * @param {unknown} error The deserialized error from the server's hydration comment
   */
  #hydrate_failed_content(error) {
    const failed = this.#props.failed;
    if (!failed) return;
    this.#failed_effect = branch(() => {
      failed(
        this.#anchor,
        () => error,
        () => () => {
        }
      );
    });
  }
  #hydrate_pending_content() {
    const pending2 = this.#props.pending;
    if (!pending2) return;
    this.is_pending = true;
    this.#pending_effect = branch(() => pending2(this.#anchor));
    queue_micro_task(() => {
      var fragment = this.#offscreen_fragment = document.createDocumentFragment();
      var anchor = create_text();
      fragment.append(anchor);
      this.#main_effect = this.#run(() => {
        return branch(() => this.#children(anchor));
      });
      if (this.#pending_count === 0) {
        this.#anchor.before(fragment);
        this.#offscreen_fragment = null;
        pause_effect(
          /** @type {Effect} */
          this.#pending_effect,
          () => {
            this.#pending_effect = null;
          }
        );
        this.#resolve(
          /** @type {Batch} */
          current_batch
        );
      }
    });
  }
  #render() {
    try {
      this.is_pending = this.has_pending_snippet();
      this.#pending_count = 0;
      this.#local_pending_count = 0;
      this.#main_effect = branch(() => {
        this.#children(this.#anchor);
      });
      if (this.#pending_count > 0) {
        var fragment = this.#offscreen_fragment = document.createDocumentFragment();
        move_effect(this.#main_effect, fragment);
        const pending2 = (
          /** @type {(anchor: Node) => void} */
          this.#props.pending
        );
        this.#pending_effect = branch(() => pending2(this.#anchor));
      } else {
        this.#resolve(
          /** @type {Batch} */
          current_batch
        );
      }
    } catch (error) {
      this.error(error);
    }
  }
  /**
   * @param {Batch} batch
   */
  #resolve(batch) {
    this.is_pending = false;
    batch.transfer_effects(this.#dirty_effects, this.#maybe_dirty_effects);
  }
  /**
   * Defer an effect inside a pending boundary until the boundary resolves
   * @param {Effect} effect
   */
  defer_effect(effect2) {
    defer_effect(effect2, this.#dirty_effects, this.#maybe_dirty_effects);
  }
  /**
   * Returns `false` if the effect exists inside a boundary whose pending snippet is shown
   * @returns {boolean}
   */
  is_rendered() {
    return !this.is_pending && (!this.parent || this.parent.is_rendered());
  }
  has_pending_snippet() {
    return !!this.#props.pending;
  }
  /**
   * @template T
   * @param {() => T} fn
   */
  #run(fn) {
    var previous_effect = active_effect;
    var previous_reaction = active_reaction;
    var previous_ctx = component_context;
    set_active_effect(this.#effect);
    set_active_reaction(this.#effect);
    set_component_context(this.#effect.ctx);
    try {
      Batch.ensure();
      return fn();
    } catch (e) {
      handle_error(e);
      return null;
    } finally {
      set_active_effect(previous_effect);
      set_active_reaction(previous_reaction);
      set_component_context(previous_ctx);
    }
  }
  /**
   * Updates the pending count associated with the currently visible pending snippet,
   * if any, such that we can replace the snippet with content once work is done
   * @param {1 | -1} d
   * @param {Batch} batch
   */
  #update_pending_count(d, batch) {
    if (!this.has_pending_snippet()) {
      if (this.parent) {
        this.parent.#update_pending_count(d, batch);
      }
      return;
    }
    this.#pending_count += d;
    if (this.#pending_count === 0) {
      this.#resolve(batch);
      if (this.#pending_effect) {
        pause_effect(this.#pending_effect, () => {
          this.#pending_effect = null;
        });
      }
      if (this.#offscreen_fragment) {
        this.#anchor.before(this.#offscreen_fragment);
        this.#offscreen_fragment = null;
      }
    }
  }
  /**
   * Update the source that powers `$effect.pending()` inside this boundary,
   * and controls when the current `pending` snippet (if any) is removed.
   * Do not call from inside the class
   * @param {1 | -1} d
   * @param {Batch} batch
   */
  update_pending_count(d, batch) {
    this.#update_pending_count(d, batch);
    this.#local_pending_count += d;
    if (!this.#effect_pending || this.#pending_count_update_queued) return;
    this.#pending_count_update_queued = true;
    queue_micro_task(() => {
      this.#pending_count_update_queued = false;
      if (this.#effect_pending) {
        internal_set(this.#effect_pending, this.#local_pending_count);
      }
    });
  }
  get_effect_pending() {
    this.#effect_pending_subscriber();
    return get2(
      /** @type {Source<number>} */
      this.#effect_pending
    );
  }
  /** @param {unknown} error */
  error(error) {
    var onerror = this.#props.onerror;
    let failed = this.#props.failed;
    if (!onerror && !failed) {
      throw error;
    }
    if (this.#main_effect) {
      destroy_effect(this.#main_effect);
      this.#main_effect = null;
    }
    if (this.#pending_effect) {
      destroy_effect(this.#pending_effect);
      this.#pending_effect = null;
    }
    if (this.#failed_effect) {
      destroy_effect(this.#failed_effect);
      this.#failed_effect = null;
    }
    if (hydrating) {
      set_hydrate_node(
        /** @type {TemplateNode} */
        this.#hydrate_open
      );
      next();
      set_hydrate_node(skip_nodes());
    }
    var did_reset = false;
    var calling_on_error = false;
    const reset2 = () => {
      if (did_reset) {
        svelte_boundary_reset_noop();
        return;
      }
      did_reset = true;
      if (calling_on_error) {
        svelte_boundary_reset_onerror();
      }
      if (this.#failed_effect !== null) {
        pause_effect(this.#failed_effect, () => {
          this.#failed_effect = null;
        });
      }
      this.#run(() => {
        this.#render();
      });
    };
    const handle_error_result = (transformed_error) => {
      try {
        calling_on_error = true;
        onerror?.(transformed_error, reset2);
        calling_on_error = false;
      } catch (error2) {
        invoke_error_boundary(error2, this.#effect && this.#effect.parent);
      }
      if (failed) {
        this.#failed_effect = this.#run(() => {
          try {
            return branch(() => {
              var effect2 = (
                /** @type {Effect} */
                active_effect
              );
              effect2.b = this;
              effect2.f |= BOUNDARY_EFFECT;
              failed(
                this.#anchor,
                () => transformed_error,
                () => reset2
              );
            });
          } catch (error2) {
            invoke_error_boundary(
              error2,
              /** @type {Effect} */
              this.#effect.parent
            );
            return null;
          }
        });
      }
    };
    queue_micro_task(() => {
      var result;
      try {
        result = this.transform_error(error);
      } catch (e) {
        invoke_error_boundary(e, this.#effect && this.#effect.parent);
        return;
      }
      if (result !== null && typeof result === "object" && typeof /** @type {any} */
      result.then === "function") {
        result.then(
          handle_error_result,
          /** @param {unknown} e */
          (e) => invoke_error_boundary(e, this.#effect && this.#effect.parent)
        );
      } else {
        handle_error_result(result);
      }
    });
  }
};

// node_modules/svelte/src/internal/client/reactivity/async.js
function flatten(blockers, sync, async2, fn) {
  const d = is_runes() ? derived : derived_safe_equal;
  var pending2 = blockers.filter((b) => !b.settled);
  if (async2.length === 0 && pending2.length === 0) {
    fn(sync.map(d));
    return;
  }
  var parent = (
    /** @type {Effect} */
    active_effect
  );
  var restore = capture();
  var blocker_promise = pending2.length === 1 ? pending2[0].promise : pending2.length > 1 ? Promise.all(pending2.map((b) => b.promise)) : null;
  function finish(values) {
    restore();
    try {
      fn(values);
    } catch (error) {
      if ((parent.f & DESTROYED) === 0) {
        invoke_error_boundary(error, parent);
      }
    }
    unset_context();
  }
  if (async2.length === 0) {
    blocker_promise.then(() => finish(sync.map(d)));
    return;
  }
  var decrement_pending = increment_pending();
  function run3() {
    Promise.all(async2.map((expression) => async_derived(expression))).then((result) => finish([...sync.map(d), ...result])).catch((error) => invoke_error_boundary(error, parent)).finally(() => decrement_pending());
  }
  if (blocker_promise) {
    blocker_promise.then(() => {
      restore();
      run3();
      unset_context();
    });
  } else {
    run3();
  }
}
function capture() {
  var previous_effect = (
    /** @type {Effect} */
    active_effect
  );
  var previous_reaction = active_reaction;
  var previous_component_context = component_context;
  var previous_batch2 = (
    /** @type {Batch} */
    current_batch
  );
  if (dev_fallback_default) {
    var previous_dev_stack = dev_stack;
  }
  return function restore(activate_batch = true) {
    set_active_effect(previous_effect);
    set_active_reaction(previous_reaction);
    set_component_context(previous_component_context);
    if (activate_batch && (previous_effect.f & DESTROYED) === 0) {
      previous_batch2?.activate();
      previous_batch2?.apply();
    }
    if (dev_fallback_default) {
      set_from_async_derived(null);
      set_dev_stack(previous_dev_stack);
    }
  };
}
function unset_context(deactivate_batch = true) {
  set_active_effect(null);
  set_active_reaction(null);
  set_component_context(null);
  if (deactivate_batch) current_batch?.deactivate();
  if (dev_fallback_default) {
    set_from_async_derived(null);
    set_dev_stack(null);
  }
}
function increment_pending() {
  var boundary2 = (
    /** @type {Boundary} */
    /** @type {Effect} */
    active_effect.b
  );
  var batch = (
    /** @type {Batch} */
    current_batch
  );
  var blocking = boundary2.is_rendered();
  boundary2.update_pending_count(1, batch);
  batch.increment(blocking);
  return (skip = false) => {
    boundary2.update_pending_count(-1, batch);
    batch.decrement(blocking, skip);
  };
}

// node_modules/svelte/src/internal/client/reactivity/deriveds.js
var current_async_effect = null;
function set_from_async_derived(v) {
  current_async_effect = v;
}
var recent_async_deriveds = /* @__PURE__ */ new Set();
// @__NO_SIDE_EFFECTS__
function derived(fn) {
  var flags2 = DERIVED | DIRTY;
  var parent_derived = active_reaction !== null && (active_reaction.f & DERIVED) !== 0 ? (
    /** @type {Derived} */
    active_reaction
  ) : null;
  if (active_effect !== null) {
    active_effect.f |= EFFECT_PRESERVED;
  }
  const signal = {
    ctx: component_context,
    deps: null,
    effects: null,
    equals,
    f: flags2,
    fn,
    reactions: null,
    rv: 0,
    v: (
      /** @type {V} */
      UNINITIALIZED
    ),
    wv: 0,
    parent: parent_derived ?? active_effect,
    ac: null
  };
  if (dev_fallback_default && tracing_mode_flag) {
    signal.created = get_error("created at");
  }
  return signal;
}
// @__NO_SIDE_EFFECTS__
function async_derived(fn, label, location) {
  let parent = (
    /** @type {Effect | null} */
    active_effect
  );
  if (parent === null) {
    async_derived_orphan();
  }
  var promise = (
    /** @type {Promise<V>} */
    /** @type {unknown} */
    void 0
  );
  var signal = source(
    /** @type {V} */
    UNINITIALIZED
  );
  if (dev_fallback_default) signal.label = label;
  var should_suspend = !active_reaction;
  var deferreds = /* @__PURE__ */ new Map();
  async_effect(() => {
    if (dev_fallback_default) current_async_effect = active_effect;
    var effect2 = (
      /** @type {Effect} */
      active_effect
    );
    var d = deferred();
    promise = d.promise;
    try {
      Promise.resolve(fn()).then(d.resolve, d.reject).finally(unset_context);
    } catch (error) {
      d.reject(error);
      unset_context();
    }
    if (dev_fallback_default) current_async_effect = null;
    var batch = (
      /** @type {Batch} */
      current_batch
    );
    if (should_suspend) {
      if ((effect2.f & REACTION_RAN) !== 0) {
        var decrement_pending = increment_pending();
      }
      if (
        /** @type {Boundary} */
        parent.b.is_rendered()
      ) {
        deferreds.get(batch)?.reject(STALE_REACTION);
        deferreds.delete(batch);
      } else {
        for (const d2 of deferreds.values()) {
          d2.reject(STALE_REACTION);
        }
        deferreds.clear();
      }
      deferreds.set(batch, d);
    }
    const handler = (value, error = void 0) => {
      if (dev_fallback_default) current_async_effect = null;
      if (decrement_pending) {
        var skip = error === STALE_REACTION;
        decrement_pending(skip);
      }
      if (error === STALE_REACTION || (effect2.f & DESTROYED) !== 0) {
        return;
      }
      batch.activate();
      if (error) {
        signal.f |= ERROR_VALUE;
        internal_set(signal, error);
      } else {
        if ((signal.f & ERROR_VALUE) !== 0) {
          signal.f ^= ERROR_VALUE;
        }
        internal_set(signal, value);
        for (const [b, d2] of deferreds) {
          deferreds.delete(b);
          if (b === batch) break;
          d2.reject(STALE_REACTION);
        }
        if (dev_fallback_default && location !== void 0) {
          recent_async_deriveds.add(signal);
          setTimeout(() => {
            if (recent_async_deriveds.has(signal)) {
              await_waterfall(
                /** @type {string} */
                signal.label,
                location
              );
              recent_async_deriveds.delete(signal);
            }
          });
        }
      }
      batch.deactivate();
    };
    d.promise.then(handler, (e) => handler(null, e || "unknown"));
  });
  teardown(() => {
    for (const d of deferreds.values()) {
      d.reject(STALE_REACTION);
    }
  });
  if (dev_fallback_default) {
    signal.f |= ASYNC;
  }
  return new Promise((fulfil) => {
    function next2(p) {
      function go() {
        if (p === promise) {
          fulfil(signal);
        } else {
          next2(promise);
        }
      }
      p.then(go, go);
    }
    next2(promise);
  });
}
// @__NO_SIDE_EFFECTS__
function derived_safe_equal(fn) {
  const signal = /* @__PURE__ */ derived(fn);
  signal.equals = safe_equals;
  return signal;
}
function destroy_derived_effects(derived2) {
  var effects = derived2.effects;
  if (effects !== null) {
    derived2.effects = null;
    for (var i = 0; i < effects.length; i += 1) {
      destroy_effect(
        /** @type {Effect} */
        effects[i]
      );
    }
  }
}
var stack = [];
function get_derived_parent_effect(derived2) {
  var parent = derived2.parent;
  while (parent !== null) {
    if ((parent.f & DERIVED) === 0) {
      return (parent.f & DESTROYED) === 0 ? (
        /** @type {Effect} */
        parent
      ) : null;
    }
    parent = parent.parent;
  }
  return null;
}
function execute_derived(derived2) {
  var value;
  var prev_active_effect = active_effect;
  set_active_effect(get_derived_parent_effect(derived2));
  if (dev_fallback_default) {
    let prev_eager_effects = eager_effects;
    set_eager_effects(/* @__PURE__ */ new Set());
    try {
      if (includes.call(stack, derived2)) {
        derived_references_self();
      }
      stack.push(derived2);
      derived2.f &= ~WAS_MARKED;
      destroy_derived_effects(derived2);
      value = update_reaction(derived2);
    } finally {
      set_active_effect(prev_active_effect);
      set_eager_effects(prev_eager_effects);
      stack.pop();
    }
  } else {
    try {
      derived2.f &= ~WAS_MARKED;
      destroy_derived_effects(derived2);
      value = update_reaction(derived2);
    } finally {
      set_active_effect(prev_active_effect);
    }
  }
  return value;
}
function update_derived(derived2) {
  var old_value = derived2.v;
  var value = execute_derived(derived2);
  if (!derived2.equals(value)) {
    derived2.wv = increment_write_version();
    if (!current_batch?.is_fork || derived2.deps === null) {
      derived2.v = value;
      current_batch?.capture(derived2, old_value);
      if (derived2.deps === null) {
        set_signal_status(derived2, CLEAN);
        return;
      }
    }
  }
  if (is_destroying_effect) {
    return;
  }
  if (batch_values !== null) {
    if (effect_tracking() || current_batch?.is_fork) {
      batch_values.set(derived2, value);
    }
  } else {
    update_derived_status(derived2);
  }
}
function freeze_derived_effects(derived2) {
  if (derived2.effects === null) return;
  for (const e of derived2.effects) {
    if (e.teardown || e.ac) {
      e.teardown?.();
      e.ac?.abort(STALE_REACTION);
      e.teardown = noop;
      e.ac = null;
      remove_reactions(e, 0);
      destroy_effect_children(e);
    }
  }
}
function unfreeze_derived_effects(derived2) {
  if (derived2.effects === null) return;
  for (const e of derived2.effects) {
    if (e.teardown) {
      update_effect(e);
    }
  }
}

// node_modules/svelte/src/internal/client/reactivity/sources.js
var eager_effects = /* @__PURE__ */ new Set();
var old_values = /* @__PURE__ */ new Map();
function set_eager_effects(v) {
  eager_effects = v;
}
var eager_effects_deferred = false;
function set_eager_effects_deferred() {
  eager_effects_deferred = true;
}
function source(v, stack2) {
  var signal = {
    f: 0,
    // TODO ideally we could skip this altogether, but it causes type errors
    v,
    reactions: null,
    equals,
    rv: 0,
    wv: 0
  };
  if (dev_fallback_default && tracing_mode_flag) {
    signal.created = stack2 ?? get_error("created at");
    signal.updated = null;
    signal.set_during_effect = false;
    signal.trace = null;
  }
  return signal;
}
// @__NO_SIDE_EFFECTS__
function state(v, stack2) {
  const s = source(v, stack2);
  push_reaction_value(s);
  return s;
}
// @__NO_SIDE_EFFECTS__
function mutable_source(initial_value, immutable = false, trackable = true) {
  const s = source(initial_value);
  if (!immutable) {
    s.equals = safe_equals;
  }
  if (legacy_mode_flag && trackable && component_context !== null && component_context.l !== null) {
    (component_context.l.s ??= []).push(s);
  }
  return s;
}
function set(source2, value, should_proxy = false) {
  if (active_reaction !== null && // since we are untracking the function inside `$inspect.with` we need to add this check
  // to ensure we error if state is set inside an inspect effect
  (!untracking || (active_reaction.f & EAGER_EFFECT) !== 0) && is_runes() && (active_reaction.f & (DERIVED | BLOCK_EFFECT | ASYNC | EAGER_EFFECT)) !== 0 && (current_sources === null || !includes.call(current_sources, source2))) {
    state_unsafe_mutation();
  }
  let new_value = should_proxy ? proxy(value) : value;
  if (dev_fallback_default) {
    tag_proxy(
      new_value,
      /** @type {string} */
      source2.label
    );
  }
  return internal_set(source2, new_value, legacy_updates);
}
function internal_set(source2, value, updated_during_traversal = null) {
  if (!source2.equals(value)) {
    var old_value = source2.v;
    if (is_destroying_effect) {
      old_values.set(source2, value);
    } else {
      old_values.set(source2, old_value);
    }
    source2.v = value;
    var batch = Batch.ensure();
    batch.capture(source2, old_value);
    if (dev_fallback_default) {
      if (tracing_mode_flag || active_effect !== null) {
        source2.updated ??= /* @__PURE__ */ new Map();
        const count = (source2.updated.get("")?.count ?? 0) + 1;
        source2.updated.set("", { error: (
          /** @type {any} */
          null
        ), count });
        if (tracing_mode_flag || count > 5) {
          const error = get_error("updated at");
          if (error !== null) {
            let entry = source2.updated.get(error.stack);
            if (!entry) {
              entry = { error, count: 0 };
              source2.updated.set(error.stack, entry);
            }
            entry.count++;
          }
        }
      }
      if (active_effect !== null) {
        source2.set_during_effect = true;
      }
    }
    if ((source2.f & DERIVED) !== 0) {
      const derived2 = (
        /** @type {Derived} */
        source2
      );
      if ((source2.f & DIRTY) !== 0) {
        execute_derived(derived2);
      }
      if (batch_values === null) {
        update_derived_status(derived2);
      }
    }
    source2.wv = increment_write_version();
    mark_reactions(source2, DIRTY, updated_during_traversal);
    if (is_runes() && active_effect !== null && (active_effect.f & CLEAN) !== 0 && (active_effect.f & (BRANCH_EFFECT | ROOT_EFFECT)) === 0) {
      if (untracked_writes === null) {
        set_untracked_writes([source2]);
      } else {
        untracked_writes.push(source2);
      }
    }
    if (!batch.is_fork && eager_effects.size > 0 && !eager_effects_deferred) {
      flush_eager_effects();
    }
  }
  return value;
}
function flush_eager_effects() {
  eager_effects_deferred = false;
  for (const effect2 of eager_effects) {
    if ((effect2.f & CLEAN) !== 0) {
      set_signal_status(effect2, MAYBE_DIRTY);
    }
    if (is_dirty(effect2)) {
      update_effect(effect2);
    }
  }
  eager_effects.clear();
}
function increment(source2) {
  set(source2, source2.v + 1);
}
function mark_reactions(signal, status, updated_during_traversal) {
  var reactions = signal.reactions;
  if (reactions === null) return;
  var runes = is_runes();
  var length = reactions.length;
  for (var i = 0; i < length; i++) {
    var reaction = reactions[i];
    var flags2 = reaction.f;
    if (!runes && reaction === active_effect) continue;
    if (dev_fallback_default && (flags2 & EAGER_EFFECT) !== 0) {
      eager_effects.add(reaction);
      continue;
    }
    var not_dirty = (flags2 & DIRTY) === 0;
    if (not_dirty) {
      set_signal_status(reaction, status);
    }
    if ((flags2 & DERIVED) !== 0) {
      var derived2 = (
        /** @type {Derived} */
        reaction
      );
      batch_values?.delete(derived2);
      if ((flags2 & WAS_MARKED) === 0) {
        if (flags2 & CONNECTED) {
          reaction.f |= WAS_MARKED;
        }
        mark_reactions(derived2, MAYBE_DIRTY, updated_during_traversal);
      }
    } else if (not_dirty) {
      var effect2 = (
        /** @type {Effect} */
        reaction
      );
      if ((flags2 & BLOCK_EFFECT) !== 0 && eager_block_effects !== null) {
        eager_block_effects.add(effect2);
      }
      if (updated_during_traversal !== null) {
        updated_during_traversal.push(effect2);
      } else {
        schedule_effect(effect2);
      }
    }
  }
}

// node_modules/svelte/src/internal/client/proxy.js
var regex_is_valid_identifier = /^[a-zA-Z_$][a-zA-Z_$0-9]*$/;
function proxy(value) {
  if (typeof value !== "object" || value === null || STATE_SYMBOL in value) {
    return value;
  }
  const prototype = get_prototype_of(value);
  if (prototype !== object_prototype && prototype !== array_prototype) {
    return value;
  }
  var sources = /* @__PURE__ */ new Map();
  var is_proxied_array = is_array(value);
  var version = state(0);
  var stack2 = dev_fallback_default && tracing_mode_flag ? get_error("created at") : null;
  var parent_version = update_version;
  var with_parent = (fn) => {
    if (update_version === parent_version) {
      return fn();
    }
    var reaction = active_reaction;
    var version2 = update_version;
    set_active_reaction(null);
    set_update_version(parent_version);
    var result = fn();
    set_active_reaction(reaction);
    set_update_version(version2);
    return result;
  };
  if (is_proxied_array) {
    sources.set("length", state(
      /** @type {any[]} */
      value.length,
      stack2
    ));
    if (dev_fallback_default) {
      value = /** @type {any} */
      inspectable_array(
        /** @type {any[]} */
        value
      );
    }
  }
  var path = "";
  let updating = false;
  function update_path(new_path) {
    if (updating) return;
    updating = true;
    path = new_path;
    tag(version, `${path} version`);
    for (const [prop2, source2] of sources) {
      tag(source2, get_label(path, prop2));
    }
    updating = false;
  }
  return new Proxy(
    /** @type {any} */
    value,
    {
      defineProperty(_, prop2, descriptor) {
        if (!("value" in descriptor) || descriptor.configurable === false || descriptor.enumerable === false || descriptor.writable === false) {
          state_descriptors_fixed();
        }
        var s = sources.get(prop2);
        if (s === void 0) {
          with_parent(() => {
            var s2 = state(descriptor.value, stack2);
            sources.set(prop2, s2);
            if (dev_fallback_default && typeof prop2 === "string") {
              tag(s2, get_label(path, prop2));
            }
            return s2;
          });
        } else {
          set(s, descriptor.value, true);
        }
        return true;
      },
      deleteProperty(target, prop2) {
        var s = sources.get(prop2);
        if (s === void 0) {
          if (prop2 in target) {
            const s2 = with_parent(() => state(UNINITIALIZED, stack2));
            sources.set(prop2, s2);
            increment(version);
            if (dev_fallback_default) {
              tag(s2, get_label(path, prop2));
            }
          }
        } else {
          set(s, UNINITIALIZED);
          increment(version);
        }
        return true;
      },
      get(target, prop2, receiver) {
        if (prop2 === STATE_SYMBOL) {
          return value;
        }
        if (dev_fallback_default && prop2 === PROXY_PATH_SYMBOL) {
          return update_path;
        }
        var s = sources.get(prop2);
        var exists = prop2 in target;
        if (s === void 0 && (!exists || get_descriptor(target, prop2)?.writable)) {
          s = with_parent(() => {
            var p = proxy(exists ? target[prop2] : UNINITIALIZED);
            var s2 = state(p, stack2);
            if (dev_fallback_default) {
              tag(s2, get_label(path, prop2));
            }
            return s2;
          });
          sources.set(prop2, s);
        }
        if (s !== void 0) {
          var v = get2(s);
          return v === UNINITIALIZED ? void 0 : v;
        }
        return Reflect.get(target, prop2, receiver);
      },
      getOwnPropertyDescriptor(target, prop2) {
        var descriptor = Reflect.getOwnPropertyDescriptor(target, prop2);
        if (descriptor && "value" in descriptor) {
          var s = sources.get(prop2);
          if (s) descriptor.value = get2(s);
        } else if (descriptor === void 0) {
          var source2 = sources.get(prop2);
          var value2 = source2?.v;
          if (source2 !== void 0 && value2 !== UNINITIALIZED) {
            return {
              enumerable: true,
              configurable: true,
              value: value2,
              writable: true
            };
          }
        }
        return descriptor;
      },
      has(target, prop2) {
        if (prop2 === STATE_SYMBOL) {
          return true;
        }
        var s = sources.get(prop2);
        var has = s !== void 0 && s.v !== UNINITIALIZED || Reflect.has(target, prop2);
        if (s !== void 0 || active_effect !== null && (!has || get_descriptor(target, prop2)?.writable)) {
          if (s === void 0) {
            s = with_parent(() => {
              var p = has ? proxy(target[prop2]) : UNINITIALIZED;
              var s2 = state(p, stack2);
              if (dev_fallback_default) {
                tag(s2, get_label(path, prop2));
              }
              return s2;
            });
            sources.set(prop2, s);
          }
          var value2 = get2(s);
          if (value2 === UNINITIALIZED) {
            return false;
          }
        }
        return has;
      },
      set(target, prop2, value2, receiver) {
        var s = sources.get(prop2);
        var has = prop2 in target;
        if (is_proxied_array && prop2 === "length") {
          for (var i = value2; i < /** @type {Source<number>} */
          s.v; i += 1) {
            var other_s = sources.get(i + "");
            if (other_s !== void 0) {
              set(other_s, UNINITIALIZED);
            } else if (i in target) {
              other_s = with_parent(() => state(UNINITIALIZED, stack2));
              sources.set(i + "", other_s);
              if (dev_fallback_default) {
                tag(other_s, get_label(path, i));
              }
            }
          }
        }
        if (s === void 0) {
          if (!has || get_descriptor(target, prop2)?.writable) {
            s = with_parent(() => state(void 0, stack2));
            if (dev_fallback_default) {
              tag(s, get_label(path, prop2));
            }
            set(s, proxy(value2));
            sources.set(prop2, s);
          }
        } else {
          has = s.v !== UNINITIALIZED;
          var p = with_parent(() => proxy(value2));
          set(s, p);
        }
        var descriptor = Reflect.getOwnPropertyDescriptor(target, prop2);
        if (descriptor?.set) {
          descriptor.set.call(receiver, value2);
        }
        if (!has) {
          if (is_proxied_array && typeof prop2 === "string") {
            var ls = (
              /** @type {Source<number>} */
              sources.get("length")
            );
            var n = Number(prop2);
            if (Number.isInteger(n) && n >= ls.v) {
              set(ls, n + 1);
            }
          }
          increment(version);
        }
        return true;
      },
      ownKeys(target) {
        get2(version);
        var own_keys = Reflect.ownKeys(target).filter((key3) => {
          var source3 = sources.get(key3);
          return source3 === void 0 || source3.v !== UNINITIALIZED;
        });
        for (var [key2, source2] of sources) {
          if (source2.v !== UNINITIALIZED && !(key2 in target)) {
            own_keys.push(key2);
          }
        }
        return own_keys;
      },
      setPrototypeOf() {
        state_prototype_fixed();
      }
    }
  );
}
function get_label(path, prop2) {
  if (typeof prop2 === "symbol") return `${path}[Symbol(${prop2.description ?? ""})]`;
  if (regex_is_valid_identifier.test(prop2)) return `${path}.${prop2}`;
  return /^\d+$/.test(prop2) ? `${path}[${prop2}]` : `${path}['${prop2}']`;
}
function get_proxied_value(value) {
  try {
    if (value !== null && typeof value === "object" && STATE_SYMBOL in value) {
      return value[STATE_SYMBOL];
    }
  } catch {
  }
  return value;
}
var ARRAY_MUTATING_METHODS = /* @__PURE__ */ new Set([
  "copyWithin",
  "fill",
  "pop",
  "push",
  "reverse",
  "shift",
  "sort",
  "splice",
  "unshift"
]);
function inspectable_array(array) {
  return new Proxy(array, {
    get(target, prop2, receiver) {
      var value = Reflect.get(target, prop2, receiver);
      if (!ARRAY_MUTATING_METHODS.has(
        /** @type {string} */
        prop2
      )) {
        return value;
      }
      return function(...args) {
        set_eager_effects_deferred();
        var result = value.apply(this, args);
        flush_eager_effects();
        return result;
      };
    }
  });
}

// node_modules/svelte/src/internal/client/dev/equality.js
function init_array_prototype_warnings() {
  const array_prototype2 = Array.prototype;
  const cleanup = Array.__svelte_cleanup;
  if (cleanup) {
    cleanup();
  }
  const { indexOf, lastIndexOf, includes: includes2 } = array_prototype2;
  array_prototype2.indexOf = function(item, from_index) {
    const index2 = indexOf.call(this, item, from_index);
    if (index2 === -1) {
      for (let i = from_index ?? 0; i < this.length; i += 1) {
        if (get_proxied_value(this[i]) === item) {
          state_proxy_equality_mismatch("array.indexOf(...)");
          break;
        }
      }
    }
    return index2;
  };
  array_prototype2.lastIndexOf = function(item, from_index) {
    const index2 = lastIndexOf.call(this, item, from_index ?? this.length - 1);
    if (index2 === -1) {
      for (let i = 0; i <= (from_index ?? this.length - 1); i += 1) {
        if (get_proxied_value(this[i]) === item) {
          state_proxy_equality_mismatch("array.lastIndexOf(...)");
          break;
        }
      }
    }
    return index2;
  };
  array_prototype2.includes = function(item, from_index) {
    const has = includes2.call(this, item, from_index);
    if (!has) {
      for (let i = 0; i < this.length; i += 1) {
        if (get_proxied_value(this[i]) === item) {
          state_proxy_equality_mismatch("array.includes(...)");
          break;
        }
      }
    }
    return has;
  };
  Array.__svelte_cleanup = () => {
    array_prototype2.indexOf = indexOf;
    array_prototype2.lastIndexOf = lastIndexOf;
    array_prototype2.includes = includes2;
  };
}

// node_modules/svelte/src/internal/client/dom/operations.js
var $window;
var $document;
var is_firefox;
var first_child_getter;
var next_sibling_getter;
function init_operations() {
  if ($window !== void 0) {
    return;
  }
  $window = window;
  $document = document;
  is_firefox = /Firefox/.test(navigator.userAgent);
  var element_prototype = Element.prototype;
  var node_prototype = Node.prototype;
  var text_prototype = Text.prototype;
  first_child_getter = get_descriptor(node_prototype, "firstChild").get;
  next_sibling_getter = get_descriptor(node_prototype, "nextSibling").get;
  if (is_extensible(element_prototype)) {
    element_prototype.__click = void 0;
    element_prototype.__className = void 0;
    element_prototype.__attributes = null;
    element_prototype.__style = void 0;
    element_prototype.__e = void 0;
  }
  if (is_extensible(text_prototype)) {
    text_prototype.__t = void 0;
  }
  if (dev_fallback_default) {
    element_prototype.__svelte_meta = null;
    init_array_prototype_warnings();
  }
}
function create_text(value = "") {
  return document.createTextNode(value);
}
// @__NO_SIDE_EFFECTS__
function get_first_child(node) {
  return (
    /** @type {TemplateNode | null} */
    first_child_getter.call(node)
  );
}
// @__NO_SIDE_EFFECTS__
function get_next_sibling(node) {
  return (
    /** @type {TemplateNode | null} */
    next_sibling_getter.call(node)
  );
}
function child(node, is_text) {
  if (!hydrating) {
    return /* @__PURE__ */ get_first_child(node);
  }
  var child2 = /* @__PURE__ */ get_first_child(hydrate_node);
  if (child2 === null) {
    child2 = hydrate_node.appendChild(create_text());
  } else if (is_text && child2.nodeType !== TEXT_NODE) {
    var text2 = create_text();
    child2?.before(text2);
    set_hydrate_node(text2);
    return text2;
  }
  if (is_text) {
    merge_text_nodes(
      /** @type {Text} */
      child2
    );
  }
  set_hydrate_node(child2);
  return child2;
}
function first_child(node, is_text = false) {
  if (!hydrating) {
    var first = /* @__PURE__ */ get_first_child(node);
    if (first instanceof Comment && first.data === "") return /* @__PURE__ */ get_next_sibling(first);
    return first;
  }
  if (is_text) {
    if (hydrate_node?.nodeType !== TEXT_NODE) {
      var text2 = create_text();
      hydrate_node?.before(text2);
      set_hydrate_node(text2);
      return text2;
    }
    merge_text_nodes(
      /** @type {Text} */
      hydrate_node
    );
  }
  return hydrate_node;
}
function sibling(node, count = 1, is_text = false) {
  let next_sibling = hydrating ? hydrate_node : node;
  var last_sibling;
  while (count--) {
    last_sibling = next_sibling;
    next_sibling = /** @type {TemplateNode} */
    /* @__PURE__ */ get_next_sibling(next_sibling);
  }
  if (!hydrating) {
    return next_sibling;
  }
  if (is_text) {
    if (next_sibling?.nodeType !== TEXT_NODE) {
      var text2 = create_text();
      if (next_sibling === null) {
        last_sibling?.after(text2);
      } else {
        next_sibling.before(text2);
      }
      set_hydrate_node(text2);
      return text2;
    }
    merge_text_nodes(
      /** @type {Text} */
      next_sibling
    );
  }
  set_hydrate_node(next_sibling);
  return next_sibling;
}
function clear_text_content(node) {
  node.textContent = "";
}
function should_defer_append() {
  if (!async_mode_flag) return false;
  if (eager_block_effects !== null) return false;
  var flags2 = (
    /** @type {Effect} */
    active_effect.f
  );
  return (flags2 & REACTION_RAN) !== 0;
}
function create_element(tag2, namespace, is2) {
  let options = is2 ? { is: is2 } : void 0;
  return (
    /** @type {T extends keyof HTMLElementTagNameMap ? HTMLElementTagNameMap[T] : Element} */
    document.createElementNS(namespace ?? NAMESPACE_HTML, tag2, options)
  );
}
function merge_text_nodes(text2) {
  if (
    /** @type {string} */
    text2.nodeValue.length < 65536
  ) {
    return;
  }
  let next2 = text2.nextSibling;
  while (next2 !== null && next2.nodeType === TEXT_NODE) {
    next2.remove();
    text2.nodeValue += /** @type {string} */
    next2.nodeValue;
    next2 = text2.nextSibling;
  }
}

// node_modules/svelte/src/internal/client/dom/elements/misc.js
function remove_textarea_child(dom) {
  if (hydrating && get_first_child(dom) !== null) {
    clear_text_content(dom);
  }
}
var listening_to_form_reset = false;
function add_form_reset_listener() {
  if (!listening_to_form_reset) {
    listening_to_form_reset = true;
    document.addEventListener(
      "reset",
      (evt) => {
        Promise.resolve().then(() => {
          if (!evt.defaultPrevented) {
            for (
              const e of
              /**@type {HTMLFormElement} */
              evt.target.elements
            ) {
              e.__on_r?.();
            }
          }
        });
      },
      // In the capture phase to guarantee we get noticed of it (no possibility of stopPropagation)
      { capture: true }
    );
  }
}

// node_modules/svelte/src/internal/client/dom/elements/bindings/shared.js
function without_reactive_context(fn) {
  var previous_reaction = active_reaction;
  var previous_effect = active_effect;
  set_active_reaction(null);
  set_active_effect(null);
  try {
    return fn();
  } finally {
    set_active_reaction(previous_reaction);
    set_active_effect(previous_effect);
  }
}
function listen_to_event_and_reset_event(element2, event2, handler, on_reset = handler) {
  element2.addEventListener(event2, () => without_reactive_context(handler));
  const prev = element2.__on_r;
  if (prev) {
    element2.__on_r = () => {
      prev();
      on_reset(true);
    };
  } else {
    element2.__on_r = () => on_reset(true);
  }
  add_form_reset_listener();
}

// node_modules/svelte/src/internal/client/reactivity/effects.js
function validate_effect(rune) {
  if (active_effect === null) {
    if (active_reaction === null) {
      effect_orphan(rune);
    }
    effect_in_unowned_derived();
  }
  if (is_destroying_effect) {
    effect_in_teardown(rune);
  }
}
function push_effect(effect2, parent_effect) {
  var parent_last = parent_effect.last;
  if (parent_last === null) {
    parent_effect.last = parent_effect.first = effect2;
  } else {
    parent_last.next = effect2;
    effect2.prev = parent_last;
    parent_effect.last = effect2;
  }
}
function create_effect(type, fn) {
  var parent = active_effect;
  if (dev_fallback_default) {
    while (parent !== null && (parent.f & EAGER_EFFECT) !== 0) {
      parent = parent.parent;
    }
  }
  if (parent !== null && (parent.f & INERT) !== 0) {
    type |= INERT;
  }
  var effect2 = {
    ctx: component_context,
    deps: null,
    nodes: null,
    f: type | DIRTY | CONNECTED,
    first: null,
    fn,
    last: null,
    next: null,
    parent,
    b: parent && parent.b,
    prev: null,
    teardown: null,
    wv: 0,
    ac: null
  };
  if (dev_fallback_default) {
    effect2.component_function = dev_current_component_function;
  }
  var e = effect2;
  if ((type & EFFECT) !== 0) {
    if (collected_effects !== null) {
      collected_effects.push(effect2);
    } else {
      Batch.ensure().schedule(effect2);
    }
  } else if (fn !== null) {
    try {
      update_effect(effect2);
    } catch (e2) {
      destroy_effect(effect2);
      throw e2;
    }
    if (e.deps === null && e.teardown === null && e.nodes === null && e.first === e.last && // either `null`, or a singular child
    (e.f & EFFECT_PRESERVED) === 0) {
      e = e.first;
      if ((type & BLOCK_EFFECT) !== 0 && (type & EFFECT_TRANSPARENT) !== 0 && e !== null) {
        e.f |= EFFECT_TRANSPARENT;
      }
    }
  }
  if (e !== null) {
    e.parent = parent;
    if (parent !== null) {
      push_effect(e, parent);
    }
    if (active_reaction !== null && (active_reaction.f & DERIVED) !== 0 && (type & ROOT_EFFECT) === 0) {
      var derived2 = (
        /** @type {Derived} */
        active_reaction
      );
      (derived2.effects ??= []).push(e);
    }
  }
  return effect2;
}
function effect_tracking() {
  return active_reaction !== null && !untracking;
}
function teardown(fn) {
  const effect2 = create_effect(RENDER_EFFECT, null);
  set_signal_status(effect2, CLEAN);
  effect2.teardown = fn;
  return effect2;
}
function user_effect(fn) {
  validate_effect("$effect");
  if (dev_fallback_default) {
    define_property(fn, "name", {
      value: "$effect"
    });
  }
  var flags2 = (
    /** @type {Effect} */
    active_effect.f
  );
  var defer = !active_reaction && (flags2 & BRANCH_EFFECT) !== 0 && (flags2 & REACTION_RAN) === 0;
  if (defer) {
    var context = (
      /** @type {ComponentContext} */
      component_context
    );
    (context.e ??= []).push(fn);
  } else {
    return create_user_effect(fn);
  }
}
function create_user_effect(fn) {
  return create_effect(EFFECT | USER_EFFECT, fn);
}
function effect_root(fn) {
  Batch.ensure();
  const effect2 = create_effect(ROOT_EFFECT | EFFECT_PRESERVED, fn);
  return () => {
    destroy_effect(effect2);
  };
}
function component_root(fn) {
  Batch.ensure();
  const effect2 = create_effect(ROOT_EFFECT | EFFECT_PRESERVED, fn);
  return (options = {}) => {
    return new Promise((fulfil) => {
      if (options.outro) {
        pause_effect(effect2, () => {
          destroy_effect(effect2);
          fulfil(void 0);
        });
      } else {
        destroy_effect(effect2);
        fulfil(void 0);
      }
    });
  };
}
function effect(fn) {
  return create_effect(EFFECT, fn);
}
function async_effect(fn) {
  return create_effect(ASYNC | EFFECT_PRESERVED, fn);
}
function render_effect(fn, flags2 = 0) {
  return create_effect(RENDER_EFFECT | flags2, fn);
}
function template_effect(fn, sync = [], async2 = [], blockers = []) {
  flatten(blockers, sync, async2, (values) => {
    create_effect(RENDER_EFFECT, () => fn(...values.map(get2)));
  });
}
function block(fn, flags2 = 0) {
  var effect2 = create_effect(BLOCK_EFFECT | flags2, fn);
  if (dev_fallback_default) {
    effect2.dev_stack = dev_stack;
  }
  return effect2;
}
function branch(fn) {
  return create_effect(BRANCH_EFFECT | EFFECT_PRESERVED, fn);
}
function execute_effect_teardown(effect2) {
  var teardown2 = effect2.teardown;
  if (teardown2 !== null) {
    const previously_destroying_effect = is_destroying_effect;
    const previous_reaction = active_reaction;
    set_is_destroying_effect(true);
    set_active_reaction(null);
    try {
      teardown2.call(null);
    } finally {
      set_is_destroying_effect(previously_destroying_effect);
      set_active_reaction(previous_reaction);
    }
  }
}
function destroy_effect_children(signal, remove_dom = false) {
  var effect2 = signal.first;
  signal.first = signal.last = null;
  while (effect2 !== null) {
    const controller = effect2.ac;
    if (controller !== null) {
      without_reactive_context(() => {
        controller.abort(STALE_REACTION);
      });
    }
    var next2 = effect2.next;
    if ((effect2.f & ROOT_EFFECT) !== 0) {
      effect2.parent = null;
    } else {
      destroy_effect(effect2, remove_dom);
    }
    effect2 = next2;
  }
}
function destroy_block_effect_children(signal) {
  var effect2 = signal.first;
  while (effect2 !== null) {
    var next2 = effect2.next;
    if ((effect2.f & BRANCH_EFFECT) === 0) {
      destroy_effect(effect2);
    }
    effect2 = next2;
  }
}
function destroy_effect(effect2, remove_dom = true) {
  var removed = false;
  if ((remove_dom || (effect2.f & HEAD_EFFECT) !== 0) && effect2.nodes !== null && effect2.nodes.end !== null) {
    remove_effect_dom(
      effect2.nodes.start,
      /** @type {TemplateNode} */
      effect2.nodes.end
    );
    removed = true;
  }
  set_signal_status(effect2, DESTROYING);
  destroy_effect_children(effect2, remove_dom && !removed);
  remove_reactions(effect2, 0);
  var transitions = effect2.nodes && effect2.nodes.t;
  if (transitions !== null) {
    for (const transition2 of transitions) {
      transition2.stop();
    }
  }
  execute_effect_teardown(effect2);
  effect2.f ^= DESTROYING;
  effect2.f |= DESTROYED;
  var parent = effect2.parent;
  if (parent !== null && parent.first !== null) {
    unlink_effect(effect2);
  }
  if (dev_fallback_default) {
    effect2.component_function = null;
  }
  effect2.next = effect2.prev = effect2.teardown = effect2.ctx = effect2.deps = effect2.fn = effect2.nodes = effect2.ac = null;
}
function remove_effect_dom(node, end) {
  while (node !== null) {
    var next2 = node === end ? null : get_next_sibling(node);
    node.remove();
    node = next2;
  }
}
function unlink_effect(effect2) {
  var parent = effect2.parent;
  var prev = effect2.prev;
  var next2 = effect2.next;
  if (prev !== null) prev.next = next2;
  if (next2 !== null) next2.prev = prev;
  if (parent !== null) {
    if (parent.first === effect2) parent.first = next2;
    if (parent.last === effect2) parent.last = prev;
  }
}
function pause_effect(effect2, callback, destroy = true) {
  var transitions = [];
  pause_children(effect2, transitions, true);
  var fn = () => {
    if (destroy) destroy_effect(effect2);
    if (callback) callback();
  };
  var remaining = transitions.length;
  if (remaining > 0) {
    var check = () => --remaining || fn();
    for (var transition2 of transitions) {
      transition2.out(check);
    }
  } else {
    fn();
  }
}
function pause_children(effect2, transitions, local) {
  if ((effect2.f & INERT) !== 0) return;
  effect2.f ^= INERT;
  var t = effect2.nodes && effect2.nodes.t;
  if (t !== null) {
    for (const transition2 of t) {
      if (transition2.is_global || local) {
        transitions.push(transition2);
      }
    }
  }
  var child2 = effect2.first;
  while (child2 !== null) {
    var sibling2 = child2.next;
    var transparent = (child2.f & EFFECT_TRANSPARENT) !== 0 || // If this is a branch effect without a block effect parent,
    // it means the parent block effect was pruned. In that case,
    // transparency information was transferred to the branch effect.
    (child2.f & BRANCH_EFFECT) !== 0 && (effect2.f & BLOCK_EFFECT) !== 0;
    pause_children(child2, transitions, transparent ? local : false);
    child2 = sibling2;
  }
}
function resume_effect(effect2) {
  resume_children(effect2, true);
}
function resume_children(effect2, local) {
  if ((effect2.f & INERT) === 0) return;
  effect2.f ^= INERT;
  if ((effect2.f & CLEAN) === 0) {
    set_signal_status(effect2, DIRTY);
    Batch.ensure().schedule(effect2);
  }
  var child2 = effect2.first;
  while (child2 !== null) {
    var sibling2 = child2.next;
    var transparent = (child2.f & EFFECT_TRANSPARENT) !== 0 || (child2.f & BRANCH_EFFECT) !== 0;
    resume_children(child2, transparent ? local : false);
    child2 = sibling2;
  }
  var t = effect2.nodes && effect2.nodes.t;
  if (t !== null) {
    for (const transition2 of t) {
      if (transition2.is_global || local) {
        transition2.in();
      }
    }
  }
}
function move_effect(effect2, fragment) {
  if (!effect2.nodes) return;
  var node = effect2.nodes.start;
  var end = effect2.nodes.end;
  while (node !== null) {
    var next2 = node === end ? null : get_next_sibling(node);
    fragment.append(node);
    node = next2;
  }
}

// node_modules/svelte/src/internal/client/legacy.js
var captured_signals = null;

// node_modules/svelte/src/internal/client/runtime.js
var is_updating_effect = false;
var is_destroying_effect = false;
function set_is_destroying_effect(value) {
  is_destroying_effect = value;
}
var active_reaction = null;
var untracking = false;
function set_active_reaction(reaction) {
  active_reaction = reaction;
}
var active_effect = null;
function set_active_effect(effect2) {
  active_effect = effect2;
}
var current_sources = null;
function push_reaction_value(value) {
  if (active_reaction !== null && (!async_mode_flag || (active_reaction.f & DERIVED) !== 0)) {
    if (current_sources === null) {
      current_sources = [value];
    } else {
      current_sources.push(value);
    }
  }
}
var new_deps = null;
var skipped_deps = 0;
var untracked_writes = null;
function set_untracked_writes(value) {
  untracked_writes = value;
}
var write_version = 1;
var read_version = 0;
var update_version = read_version;
function set_update_version(value) {
  update_version = value;
}
function increment_write_version() {
  return ++write_version;
}
function is_dirty(reaction) {
  var flags2 = reaction.f;
  if ((flags2 & DIRTY) !== 0) {
    return true;
  }
  if (flags2 & DERIVED) {
    reaction.f &= ~WAS_MARKED;
  }
  if ((flags2 & MAYBE_DIRTY) !== 0) {
    var dependencies = (
      /** @type {Value[]} */
      reaction.deps
    );
    var length = dependencies.length;
    for (var i = 0; i < length; i++) {
      var dependency = dependencies[i];
      if (is_dirty(
        /** @type {Derived} */
        dependency
      )) {
        update_derived(
          /** @type {Derived} */
          dependency
        );
      }
      if (dependency.wv > reaction.wv) {
        return true;
      }
    }
    if ((flags2 & CONNECTED) !== 0 && // During time traveling we don't want to reset the status so that
    // traversal of the graph in the other batches still happens
    batch_values === null) {
      set_signal_status(reaction, CLEAN);
    }
  }
  return false;
}
function schedule_possible_effect_self_invalidation(signal, effect2, root2 = true) {
  var reactions = signal.reactions;
  if (reactions === null) return;
  if (!async_mode_flag && current_sources !== null && includes.call(current_sources, signal)) {
    return;
  }
  for (var i = 0; i < reactions.length; i++) {
    var reaction = reactions[i];
    if ((reaction.f & DERIVED) !== 0) {
      schedule_possible_effect_self_invalidation(
        /** @type {Derived} */
        reaction,
        effect2,
        false
      );
    } else if (effect2 === reaction) {
      if (root2) {
        set_signal_status(reaction, DIRTY);
      } else if ((reaction.f & CLEAN) !== 0) {
        set_signal_status(reaction, MAYBE_DIRTY);
      }
      schedule_effect(
        /** @type {Effect} */
        reaction
      );
    }
  }
}
function update_reaction(reaction) {
  var previous_deps = new_deps;
  var previous_skipped_deps = skipped_deps;
  var previous_untracked_writes = untracked_writes;
  var previous_reaction = active_reaction;
  var previous_sources = current_sources;
  var previous_component_context = component_context;
  var previous_untracking = untracking;
  var previous_update_version = update_version;
  var flags2 = reaction.f;
  new_deps = /** @type {null | Value[]} */
  null;
  skipped_deps = 0;
  untracked_writes = null;
  active_reaction = (flags2 & (BRANCH_EFFECT | ROOT_EFFECT)) === 0 ? reaction : null;
  current_sources = null;
  set_component_context(reaction.ctx);
  untracking = false;
  update_version = ++read_version;
  if (reaction.ac !== null) {
    without_reactive_context(() => {
      reaction.ac.abort(STALE_REACTION);
    });
    reaction.ac = null;
  }
  try {
    reaction.f |= REACTION_IS_UPDATING;
    var fn = (
      /** @type {Function} */
      reaction.fn
    );
    var result = fn();
    reaction.f |= REACTION_RAN;
    var deps = reaction.deps;
    var is_fork = current_batch?.is_fork;
    if (new_deps !== null) {
      var i;
      if (!is_fork) {
        remove_reactions(reaction, skipped_deps);
      }
      if (deps !== null && skipped_deps > 0) {
        deps.length = skipped_deps + new_deps.length;
        for (i = 0; i < new_deps.length; i++) {
          deps[skipped_deps + i] = new_deps[i];
        }
      } else {
        reaction.deps = deps = new_deps;
      }
      if (effect_tracking() && (reaction.f & CONNECTED) !== 0) {
        for (i = skipped_deps; i < deps.length; i++) {
          (deps[i].reactions ??= []).push(reaction);
        }
      }
    } else if (!is_fork && deps !== null && skipped_deps < deps.length) {
      remove_reactions(reaction, skipped_deps);
      deps.length = skipped_deps;
    }
    if (is_runes() && untracked_writes !== null && !untracking && deps !== null && (reaction.f & (DERIVED | MAYBE_DIRTY | DIRTY)) === 0) {
      for (i = 0; i < /** @type {Source[]} */
      untracked_writes.length; i++) {
        schedule_possible_effect_self_invalidation(
          untracked_writes[i],
          /** @type {Effect} */
          reaction
        );
      }
    }
    if (previous_reaction !== null && previous_reaction !== reaction) {
      read_version++;
      if (previous_reaction.deps !== null) {
        for (let i2 = 0; i2 < previous_skipped_deps; i2 += 1) {
          previous_reaction.deps[i2].rv = read_version;
        }
      }
      if (previous_deps !== null) {
        for (const dep of previous_deps) {
          dep.rv = read_version;
        }
      }
      if (untracked_writes !== null) {
        if (previous_untracked_writes === null) {
          previous_untracked_writes = untracked_writes;
        } else {
          previous_untracked_writes.push(.../** @type {Source[]} */
          untracked_writes);
        }
      }
    }
    if ((reaction.f & ERROR_VALUE) !== 0) {
      reaction.f ^= ERROR_VALUE;
    }
    return result;
  } catch (error) {
    return handle_error(error);
  } finally {
    reaction.f ^= REACTION_IS_UPDATING;
    new_deps = previous_deps;
    skipped_deps = previous_skipped_deps;
    untracked_writes = previous_untracked_writes;
    active_reaction = previous_reaction;
    current_sources = previous_sources;
    set_component_context(previous_component_context);
    untracking = previous_untracking;
    update_version = previous_update_version;
  }
}
function remove_reaction(signal, dependency) {
  let reactions = dependency.reactions;
  if (reactions !== null) {
    var index2 = index_of.call(reactions, signal);
    if (index2 !== -1) {
      var new_length = reactions.length - 1;
      if (new_length === 0) {
        reactions = dependency.reactions = null;
      } else {
        reactions[index2] = reactions[new_length];
        reactions.pop();
      }
    }
  }
  if (reactions === null && (dependency.f & DERIVED) !== 0 && // Destroying a child effect while updating a parent effect can cause a dependency to appear
  // to be unused, when in fact it is used by the currently-updating parent. Checking `new_deps`
  // allows us to skip the expensive work of disconnecting and immediately reconnecting it
  (new_deps === null || !includes.call(new_deps, dependency))) {
    var derived2 = (
      /** @type {Derived} */
      dependency
    );
    if ((derived2.f & CONNECTED) !== 0) {
      derived2.f ^= CONNECTED;
      derived2.f &= ~WAS_MARKED;
    }
    update_derived_status(derived2);
    freeze_derived_effects(derived2);
    remove_reactions(derived2, 0);
  }
}
function remove_reactions(signal, start_index) {
  var dependencies = signal.deps;
  if (dependencies === null) return;
  for (var i = start_index; i < dependencies.length; i++) {
    remove_reaction(signal, dependencies[i]);
  }
}
function update_effect(effect2) {
  var flags2 = effect2.f;
  if ((flags2 & DESTROYED) !== 0) {
    return;
  }
  set_signal_status(effect2, CLEAN);
  var previous_effect = active_effect;
  var was_updating_effect = is_updating_effect;
  active_effect = effect2;
  is_updating_effect = true;
  if (dev_fallback_default) {
    var previous_component_fn = dev_current_component_function;
    set_dev_current_component_function(effect2.component_function);
    var previous_stack = (
      /** @type {any} */
      dev_stack
    );
    set_dev_stack(effect2.dev_stack ?? dev_stack);
  }
  try {
    if ((flags2 & (BLOCK_EFFECT | MANAGED_EFFECT)) !== 0) {
      destroy_block_effect_children(effect2);
    } else {
      destroy_effect_children(effect2);
    }
    execute_effect_teardown(effect2);
    var teardown2 = update_reaction(effect2);
    effect2.teardown = typeof teardown2 === "function" ? teardown2 : null;
    effect2.wv = write_version;
    if (dev_fallback_default && tracing_mode_flag && (effect2.f & DIRTY) !== 0 && effect2.deps !== null) {
      for (var dep of effect2.deps) {
        if (dep.set_during_effect) {
          dep.wv = increment_write_version();
          dep.set_during_effect = false;
        }
      }
    }
  } finally {
    is_updating_effect = was_updating_effect;
    active_effect = previous_effect;
    if (dev_fallback_default) {
      set_dev_current_component_function(previous_component_fn);
      set_dev_stack(previous_stack);
    }
  }
}
async function tick() {
  if (async_mode_flag) {
    return new Promise((f) => {
      requestAnimationFrame(() => f());
      setTimeout(() => f());
    });
  }
  await Promise.resolve();
  flushSync();
}
function get2(signal) {
  var flags2 = signal.f;
  var is_derived = (flags2 & DERIVED) !== 0;
  captured_signals?.add(signal);
  if (active_reaction !== null && !untracking) {
    var destroyed = active_effect !== null && (active_effect.f & DESTROYED) !== 0;
    if (!destroyed && (current_sources === null || !includes.call(current_sources, signal))) {
      var deps = active_reaction.deps;
      if ((active_reaction.f & REACTION_IS_UPDATING) !== 0) {
        if (signal.rv < read_version) {
          signal.rv = read_version;
          if (new_deps === null && deps !== null && deps[skipped_deps] === signal) {
            skipped_deps++;
          } else if (new_deps === null) {
            new_deps = [signal];
          } else {
            new_deps.push(signal);
          }
        }
      } else {
        (active_reaction.deps ??= []).push(signal);
        var reactions = signal.reactions;
        if (reactions === null) {
          signal.reactions = [active_reaction];
        } else if (!includes.call(reactions, active_reaction)) {
          reactions.push(active_reaction);
        }
      }
    }
  }
  if (dev_fallback_default) {
    recent_async_deriveds.delete(signal);
    if (tracing_mode_flag && !untracking && tracing_expressions !== null && active_reaction !== null && tracing_expressions.reaction === active_reaction) {
      if (signal.trace) {
        signal.trace();
      } else {
        var trace2 = get_error("traced at");
        if (trace2) {
          var entry = tracing_expressions.entries.get(signal);
          if (entry === void 0) {
            entry = { traces: [] };
            tracing_expressions.entries.set(signal, entry);
          }
          var last = entry.traces[entry.traces.length - 1];
          if (trace2.stack !== last?.stack) {
            entry.traces.push(trace2);
          }
        }
      }
    }
  }
  if (is_destroying_effect && old_values.has(signal)) {
    return old_values.get(signal);
  }
  if (is_derived) {
    var derived2 = (
      /** @type {Derived} */
      signal
    );
    if (is_destroying_effect) {
      var value = derived2.v;
      if ((derived2.f & CLEAN) === 0 && derived2.reactions !== null || depends_on_old_values(derived2)) {
        value = execute_derived(derived2);
      }
      old_values.set(derived2, value);
      return value;
    }
    var should_connect = (derived2.f & CONNECTED) === 0 && !untracking && active_reaction !== null && (is_updating_effect || (active_reaction.f & CONNECTED) !== 0);
    var is_new = (derived2.f & REACTION_RAN) === 0;
    if (is_dirty(derived2)) {
      if (should_connect) {
        derived2.f |= CONNECTED;
      }
      update_derived(derived2);
    }
    if (should_connect && !is_new) {
      unfreeze_derived_effects(derived2);
      reconnect(derived2);
    }
  }
  if (batch_values?.has(signal)) {
    return batch_values.get(signal);
  }
  if ((signal.f & ERROR_VALUE) !== 0) {
    throw signal.v;
  }
  return signal.v;
}
function reconnect(derived2) {
  derived2.f |= CONNECTED;
  if (derived2.deps === null) return;
  for (const dep of derived2.deps) {
    (dep.reactions ??= []).push(derived2);
    if ((dep.f & DERIVED) !== 0 && (dep.f & CONNECTED) === 0) {
      unfreeze_derived_effects(
        /** @type {Derived} */
        dep
      );
      reconnect(
        /** @type {Derived} */
        dep
      );
    }
  }
}
function depends_on_old_values(derived2) {
  if (derived2.v === UNINITIALIZED) return true;
  if (derived2.deps === null) return false;
  for (const dep of derived2.deps) {
    if (old_values.has(dep)) {
      return true;
    }
    if ((dep.f & DERIVED) !== 0 && depends_on_old_values(
      /** @type {Derived} */
      dep
    )) {
      return true;
    }
  }
  return false;
}
function untrack(fn) {
  var previous_untracking = untracking;
  try {
    untracking = true;
    return fn();
  } finally {
    untracking = previous_untracking;
  }
}
function deep_read_state(value) {
  if (typeof value !== "object" || !value || value instanceof EventTarget) {
    return;
  }
  if (STATE_SYMBOL in value) {
    deep_read(value);
  } else if (!Array.isArray(value)) {
    for (let key2 in value) {
      const prop2 = value[key2];
      if (typeof prop2 === "object" && prop2 && STATE_SYMBOL in prop2) {
        deep_read(prop2);
      }
    }
  }
}
function deep_read(value, visited = /* @__PURE__ */ new Set()) {
  if (typeof value === "object" && value !== null && // We don't want to traverse DOM elements
  !(value instanceof EventTarget) && !visited.has(value)) {
    visited.add(value);
    if (value instanceof Date) {
      value.getTime();
    }
    for (let key2 in value) {
      try {
        deep_read(value[key2], visited);
      } catch (e) {
      }
    }
    const proto = get_prototype_of(value);
    if (proto !== Object.prototype && proto !== Array.prototype && proto !== Map.prototype && proto !== Set.prototype && proto !== Date.prototype) {
      const descriptors = get_descriptors(proto);
      for (let key2 in descriptors) {
        const get3 = descriptors[key2].get;
        if (get3) {
          try {
            get3.call(value);
          } catch (e) {
          }
        }
      }
    }
  }
}

// node_modules/svelte/src/utils.js
var DOM_BOOLEAN_ATTRIBUTES = [
  "allowfullscreen",
  "async",
  "autofocus",
  "autoplay",
  "checked",
  "controls",
  "default",
  "disabled",
  "formnovalidate",
  "indeterminate",
  "inert",
  "ismap",
  "loop",
  "multiple",
  "muted",
  "nomodule",
  "novalidate",
  "open",
  "playsinline",
  "readonly",
  "required",
  "reversed",
  "seamless",
  "selected",
  "webkitdirectory",
  "defer",
  "disablepictureinpicture",
  "disableremoteplayback"
];
var DOM_PROPERTIES = [
  ...DOM_BOOLEAN_ATTRIBUTES,
  "formNoValidate",
  "isMap",
  "noModule",
  "playsInline",
  "readOnly",
  "value",
  "volume",
  "defaultValue",
  "defaultChecked",
  "srcObject",
  "noValidate",
  "allowFullscreen",
  "disablePictureInPicture",
  "disableRemotePlayback"
];
var PASSIVE_EVENTS = ["touchstart", "touchmove"];
function is_passive_event(name) {
  return PASSIVE_EVENTS.includes(name);
}
var STATE_CREATION_RUNES = (
  /** @type {const} */
  [
    "$state",
    "$state.raw",
    "$derived",
    "$derived.by"
  ]
);
var RUNES = (
  /** @type {const} */
  [
    ...STATE_CREATION_RUNES,
    "$state.eager",
    "$state.snapshot",
    "$props",
    "$props.id",
    "$bindable",
    "$effect",
    "$effect.pre",
    "$effect.tracking",
    "$effect.root",
    "$effect.pending",
    "$inspect",
    "$inspect().with",
    "$inspect.trace",
    "$host"
  ]
);

// node_modules/svelte/src/internal/client/dev/css.js
var all_styles = /* @__PURE__ */ new Map();
function register_style(hash2, style) {
  var styles = all_styles.get(hash2);
  if (!styles) {
    styles = /* @__PURE__ */ new Set();
    all_styles.set(hash2, styles);
  }
  styles.add(style);
}

// node_modules/svelte/src/internal/client/dom/elements/events.js
var event_symbol = Symbol("events");
var all_registered_events = /* @__PURE__ */ new Set();
var root_event_handles = /* @__PURE__ */ new Set();
function delegated(event_name, element2, handler) {
  (element2[event_symbol] ??= {})[event_name] = handler;
}
function delegate(events) {
  for (var i = 0; i < events.length; i++) {
    all_registered_events.add(events[i]);
  }
  for (var fn of root_event_handles) {
    fn(events);
  }
}
var last_propagated_event = null;
function handle_event_propagation(event2) {
  var handler_element = this;
  var owner_document = (
    /** @type {Node} */
    handler_element.ownerDocument
  );
  var event_name = event2.type;
  var path = event2.composedPath?.() || [];
  var current_target = (
    /** @type {null | Element} */
    path[0] || event2.target
  );
  last_propagated_event = event2;
  var path_idx = 0;
  var handled_at = last_propagated_event === event2 && event2[event_symbol];
  if (handled_at) {
    var at_idx = path.indexOf(handled_at);
    if (at_idx !== -1 && (handler_element === document || handler_element === /** @type {any} */
    window)) {
      event2[event_symbol] = handler_element;
      return;
    }
    var handler_idx = path.indexOf(handler_element);
    if (handler_idx === -1) {
      return;
    }
    if (at_idx <= handler_idx) {
      path_idx = at_idx;
    }
  }
  current_target = /** @type {Element} */
  path[path_idx] || event2.target;
  if (current_target === handler_element) return;
  define_property(event2, "currentTarget", {
    configurable: true,
    get() {
      return current_target || owner_document;
    }
  });
  var previous_reaction = active_reaction;
  var previous_effect = active_effect;
  set_active_reaction(null);
  set_active_effect(null);
  try {
    var throw_error;
    var other_errors = [];
    while (current_target !== null) {
      var parent_element = current_target.assignedSlot || current_target.parentNode || /** @type {any} */
      current_target.host || null;
      try {
        var delegated2 = current_target[event_symbol]?.[event_name];
        if (delegated2 != null && (!/** @type {any} */
        current_target.disabled || // DOM could've been updated already by the time this is reached, so we check this as well
        // -> the target could not have been disabled because it emits the event in the first place
        event2.target === current_target)) {
          delegated2.call(current_target, event2);
        }
      } catch (error) {
        if (throw_error) {
          other_errors.push(error);
        } else {
          throw_error = error;
        }
      }
      if (event2.cancelBubble || parent_element === handler_element || parent_element === null) {
        break;
      }
      current_target = parent_element;
    }
    if (throw_error) {
      for (let error of other_errors) {
        queueMicrotask(() => {
          throw error;
        });
      }
      throw throw_error;
    }
  } finally {
    event2[event_symbol] = handler_element;
    delete event2.currentTarget;
    set_active_reaction(previous_reaction);
    set_active_effect(previous_effect);
  }
}

// node_modules/svelte/src/internal/client/dom/reconciler.js
var policy = (
  // We gotta write it like this because after downleveling the pure comment may end up in the wrong location
  globalThis?.window?.trustedTypes && /* @__PURE__ */ globalThis.window.trustedTypes.createPolicy("svelte-trusted-html", {
    /** @param {string} html */
    createHTML: (html2) => {
      return html2;
    }
  })
);
function create_trusted_html(html2) {
  return (
    /** @type {string} */
    policy?.createHTML(html2) ?? html2
  );
}
function create_fragment_from_html(html2) {
  var elem = create_element("template");
  elem.innerHTML = create_trusted_html(html2.replaceAll("<!>", "<!---->"));
  return elem.content;
}

// node_modules/svelte/src/internal/client/dom/template.js
function assign_nodes(start, end) {
  var effect2 = (
    /** @type {Effect} */
    active_effect
  );
  if (effect2.nodes === null) {
    effect2.nodes = { start, end, a: null, t: null };
  }
}
// @__NO_SIDE_EFFECTS__
function from_html(content, flags2) {
  var is_fragment = (flags2 & TEMPLATE_FRAGMENT) !== 0;
  var use_import_node = (flags2 & TEMPLATE_USE_IMPORT_NODE) !== 0;
  var node;
  var has_start = !content.startsWith("<!>");
  return () => {
    if (hydrating) {
      assign_nodes(hydrate_node, null);
      return hydrate_node;
    }
    if (node === void 0) {
      node = create_fragment_from_html(has_start ? content : "<!>" + content);
      if (!is_fragment) node = /** @type {TemplateNode} */
      get_first_child(node);
    }
    var clone = (
      /** @type {TemplateNode} */
      use_import_node || is_firefox ? document.importNode(node, true) : node.cloneNode(true)
    );
    if (is_fragment) {
      var start = (
        /** @type {TemplateNode} */
        get_first_child(clone)
      );
      var end = (
        /** @type {TemplateNode} */
        clone.lastChild
      );
      assign_nodes(start, end);
    } else {
      assign_nodes(clone, clone);
    }
    return clone;
  };
}
function comment() {
  if (hydrating) {
    assign_nodes(hydrate_node, null);
    return hydrate_node;
  }
  var frag = document.createDocumentFragment();
  var start = document.createComment("");
  var anchor = create_text();
  frag.append(start, anchor);
  assign_nodes(start, anchor);
  return frag;
}
function append(anchor, dom) {
  if (hydrating) {
    var effect2 = (
      /** @type {Effect & { nodes: EffectNodes }} */
      active_effect
    );
    if ((effect2.f & REACTION_RAN) === 0 || effect2.nodes.end === null) {
      effect2.nodes.end = hydrate_node;
    }
    hydrate_next();
    return;
  }
  if (anchor === null) {
    return;
  }
  anchor.before(
    /** @type {Node} */
    dom
  );
}

// node_modules/svelte/src/internal/client/render.js
var should_intro = true;
function set_text(text2, value) {
  var str = value == null ? "" : typeof value === "object" ? `${value}` : value;
  if (str !== (text2.__t ??= text2.nodeValue)) {
    text2.__t = str;
    text2.nodeValue = `${str}`;
  }
}
function mount(component2, options) {
  return _mount(component2, options);
}
function hydrate(component2, options) {
  init_operations();
  options.intro = options.intro ?? false;
  const target = options.target;
  const was_hydrating = hydrating;
  const previous_hydrate_node = hydrate_node;
  try {
    var anchor = get_first_child(target);
    while (anchor && (anchor.nodeType !== COMMENT_NODE || /** @type {Comment} */
    anchor.data !== HYDRATION_START)) {
      anchor = get_next_sibling(anchor);
    }
    if (!anchor) {
      throw HYDRATION_ERROR;
    }
    set_hydrating(true);
    set_hydrate_node(
      /** @type {Comment} */
      anchor
    );
    const instance = _mount(component2, { ...options, anchor });
    set_hydrating(false);
    return (
      /**  @type {Exports} */
      instance
    );
  } catch (error) {
    if (error instanceof Error && error.message.split("\n").some((line) => line.startsWith("https://svelte.dev/e/"))) {
      throw error;
    }
    if (error !== HYDRATION_ERROR) {
      console.warn("Failed to hydrate: ", error);
    }
    if (options.recover === false) {
      hydration_failed();
    }
    init_operations();
    clear_text_content(target);
    set_hydrating(false);
    return mount(component2, options);
  } finally {
    set_hydrating(was_hydrating);
    set_hydrate_node(previous_hydrate_node);
  }
}
var listeners = /* @__PURE__ */ new Map();
function _mount(Component, { target, anchor, props = {}, events, context, intro = true, transformError }) {
  init_operations();
  var component2 = void 0;
  var unmount2 = component_root(() => {
    var anchor_node = anchor ?? target.appendChild(create_text());
    boundary(
      /** @type {TemplateNode} */
      anchor_node,
      {
        pending: () => {
        }
      },
      (anchor_node2) => {
        push({});
        var ctx = (
          /** @type {ComponentContext} */
          component_context
        );
        if (context) ctx.c = context;
        if (events) {
          props.$$events = events;
        }
        if (hydrating) {
          assign_nodes(
            /** @type {TemplateNode} */
            anchor_node2,
            null
          );
        }
        should_intro = intro;
        component2 = Component(anchor_node2, props) || {};
        should_intro = true;
        if (hydrating) {
          active_effect.nodes.end = hydrate_node;
          if (hydrate_node === null || hydrate_node.nodeType !== COMMENT_NODE || /** @type {Comment} */
          hydrate_node.data !== HYDRATION_END) {
            hydration_mismatch();
            throw HYDRATION_ERROR;
          }
        }
        pop();
      },
      transformError
    );
    var registered_events = /* @__PURE__ */ new Set();
    var event_handle = (events2) => {
      for (var i = 0; i < events2.length; i++) {
        var event_name = events2[i];
        if (registered_events.has(event_name)) continue;
        registered_events.add(event_name);
        var passive2 = is_passive_event(event_name);
        for (const node of [target, document]) {
          var counts = listeners.get(node);
          if (counts === void 0) {
            counts = /* @__PURE__ */ new Map();
            listeners.set(node, counts);
          }
          var count = counts.get(event_name);
          if (count === void 0) {
            node.addEventListener(event_name, handle_event_propagation, { passive: passive2 });
            counts.set(event_name, 1);
          } else {
            counts.set(event_name, count + 1);
          }
        }
      }
    };
    event_handle(array_from(all_registered_events));
    root_event_handles.add(event_handle);
    return () => {
      for (var event_name of registered_events) {
        for (const node of [target, document]) {
          var counts = (
            /** @type {Map<string, number>} */
            listeners.get(node)
          );
          var count = (
            /** @type {number} */
            counts.get(event_name)
          );
          if (--count == 0) {
            node.removeEventListener(event_name, handle_event_propagation);
            counts.delete(event_name);
            if (counts.size === 0) {
              listeners.delete(node);
            }
          } else {
            counts.set(event_name, count);
          }
        }
      }
      root_event_handles.delete(event_handle);
      if (anchor_node !== anchor) {
        anchor_node.parentNode?.removeChild(anchor_node);
      }
    };
  });
  mounted_components.set(component2, unmount2);
  return component2;
}
var mounted_components = /* @__PURE__ */ new WeakMap();
function unmount(component2, options) {
  const fn = mounted_components.get(component2);
  if (fn) {
    mounted_components.delete(component2);
    return fn(options);
  }
  if (dev_fallback_default) {
    if (STATE_SYMBOL in component2) {
      state_proxy_unmount();
    } else {
      lifecycle_double_unmount();
    }
  }
  return Promise.resolve();
}

// node_modules/svelte/src/internal/client/dom/blocks/branches.js
var BranchManager = class {
  /** @type {TemplateNode} */
  anchor;
  /** @type {Map<Batch, Key>} */
  #batches = /* @__PURE__ */ new Map();
  /**
   * Map of keys to effects that are currently rendered in the DOM.
   * These effects are visible and actively part of the document tree.
   * Example:
   * ```
   * {#if condition}
   * 	foo
   * {:else}
   * 	bar
   * {/if}
   * ```
   * Can result in the entries `true->Effect` and `false->Effect`
   * @type {Map<Key, Effect>}
   */
  #onscreen = /* @__PURE__ */ new Map();
  /**
   * Similar to #onscreen with respect to the keys, but contains branches that are not yet
   * in the DOM, because their insertion is deferred.
   * @type {Map<Key, Branch>}
   */
  #offscreen = /* @__PURE__ */ new Map();
  /**
   * Keys of effects that are currently outroing
   * @type {Set<Key>}
   */
  #outroing = /* @__PURE__ */ new Set();
  /**
   * Whether to pause (i.e. outro) on change, or destroy immediately.
   * This is necessary for `<svelte:element>`
   */
  #transition = true;
  /**
   * @param {TemplateNode} anchor
   * @param {boolean} transition
   */
  constructor(anchor, transition2 = true) {
    this.anchor = anchor;
    this.#transition = transition2;
  }
  /**
   * @param {Batch} batch
   */
  #commit = (batch) => {
    if (!this.#batches.has(batch)) return;
    var key2 = (
      /** @type {Key} */
      this.#batches.get(batch)
    );
    var onscreen = this.#onscreen.get(key2);
    if (onscreen) {
      resume_effect(onscreen);
      this.#outroing.delete(key2);
    } else {
      var offscreen = this.#offscreen.get(key2);
      if (offscreen) {
        this.#onscreen.set(key2, offscreen.effect);
        this.#offscreen.delete(key2);
        offscreen.fragment.lastChild.remove();
        this.anchor.before(offscreen.fragment);
        onscreen = offscreen.effect;
      }
    }
    for (const [b, k] of this.#batches) {
      this.#batches.delete(b);
      if (b === batch) {
        break;
      }
      const offscreen2 = this.#offscreen.get(k);
      if (offscreen2) {
        destroy_effect(offscreen2.effect);
        this.#offscreen.delete(k);
      }
    }
    for (const [k, effect2] of this.#onscreen) {
      if (k === key2 || this.#outroing.has(k)) continue;
      const on_destroy = () => {
        const keys = Array.from(this.#batches.values());
        if (keys.includes(k)) {
          var fragment = document.createDocumentFragment();
          move_effect(effect2, fragment);
          fragment.append(create_text());
          this.#offscreen.set(k, { effect: effect2, fragment });
        } else {
          destroy_effect(effect2);
        }
        this.#outroing.delete(k);
        this.#onscreen.delete(k);
      };
      if (this.#transition || !onscreen) {
        this.#outroing.add(k);
        pause_effect(effect2, on_destroy, false);
      } else {
        on_destroy();
      }
    }
  };
  /**
   * @param {Batch} batch
   */
  #discard = (batch) => {
    this.#batches.delete(batch);
    const keys = Array.from(this.#batches.values());
    for (const [k, branch2] of this.#offscreen) {
      if (!keys.includes(k)) {
        destroy_effect(branch2.effect);
        this.#offscreen.delete(k);
      }
    }
  };
  /**
   *
   * @param {any} key
   * @param {null | ((target: TemplateNode) => void)} fn
   */
  ensure(key2, fn) {
    var batch = (
      /** @type {Batch} */
      current_batch
    );
    var defer = should_defer_append();
    if (fn && !this.#onscreen.has(key2) && !this.#offscreen.has(key2)) {
      if (defer) {
        var fragment = document.createDocumentFragment();
        var target = create_text();
        fragment.append(target);
        this.#offscreen.set(key2, {
          effect: branch(() => fn(target)),
          fragment
        });
      } else {
        this.#onscreen.set(
          key2,
          branch(() => fn(this.anchor))
        );
      }
    }
    this.#batches.set(batch, key2);
    if (defer) {
      for (const [k, effect2] of this.#onscreen) {
        if (k === key2) {
          batch.unskip_effect(effect2);
        } else {
          batch.skip_effect(effect2);
        }
      }
      for (const [k, branch2] of this.#offscreen) {
        if (k === key2) {
          batch.unskip_effect(branch2.effect);
        } else {
          batch.skip_effect(branch2.effect);
        }
      }
      batch.oncommit(this.#commit);
      batch.ondiscard(this.#discard);
    } else {
      if (hydrating) {
        this.anchor = hydrate_node;
      }
      this.#commit(batch);
    }
  }
};

// node_modules/svelte/src/internal/client/dom/blocks/if.js
function if_block(node, fn, elseif = false) {
  var marker;
  if (hydrating) {
    marker = hydrate_node;
    hydrate_next();
  }
  var branches = new BranchManager(node);
  var flags2 = elseif ? EFFECT_TRANSPARENT : 0;
  function update_branch(key2, fn2) {
    if (hydrating) {
      var data = read_hydration_instruction(
        /** @type {TemplateNode} */
        marker
      );
      if (key2 !== parseInt(data.substring(1))) {
        var anchor = skip_nodes();
        set_hydrate_node(anchor);
        branches.anchor = anchor;
        set_hydrating(false);
        branches.ensure(key2, fn2);
        set_hydrating(true);
        return;
      }
    }
    branches.ensure(key2, fn2);
  }
  block(() => {
    var has_branch = false;
    fn((fn2, key2 = 0) => {
      has_branch = true;
      update_branch(key2, fn2);
    });
    if (!has_branch) {
      update_branch(-1, null);
    }
  }, flags2);
}

// node_modules/svelte/src/internal/client/dom/blocks/key.js
var NAN = Symbol("NaN");

// node_modules/svelte/src/internal/client/dom/blocks/each.js
function pause_effects(state2, to_destroy, controlled_anchor) {
  var transitions = [];
  var length = to_destroy.length;
  var group;
  var remaining = to_destroy.length;
  for (var i = 0; i < length; i++) {
    let effect2 = to_destroy[i];
    pause_effect(
      effect2,
      () => {
        if (group) {
          group.pending.delete(effect2);
          group.done.add(effect2);
          if (group.pending.size === 0) {
            var groups = (
              /** @type {Set<EachOutroGroup>} */
              state2.outrogroups
            );
            destroy_effects(state2, array_from(group.done));
            groups.delete(group);
            if (groups.size === 0) {
              state2.outrogroups = null;
            }
          }
        } else {
          remaining -= 1;
        }
      },
      false
    );
  }
  if (remaining === 0) {
    var fast_path = transitions.length === 0 && controlled_anchor !== null;
    if (fast_path) {
      var anchor = (
        /** @type {Element} */
        controlled_anchor
      );
      var parent_node = (
        /** @type {Element} */
        anchor.parentNode
      );
      clear_text_content(parent_node);
      parent_node.append(anchor);
      state2.items.clear();
    }
    destroy_effects(state2, to_destroy, !fast_path);
  } else {
    group = {
      pending: new Set(to_destroy),
      done: /* @__PURE__ */ new Set()
    };
    (state2.outrogroups ??= /* @__PURE__ */ new Set()).add(group);
  }
}
function destroy_effects(state2, to_destroy, remove_dom = true) {
  var preserved_effects;
  if (state2.pending.size > 0) {
    preserved_effects = /* @__PURE__ */ new Set();
    for (const keys of state2.pending.values()) {
      for (const key2 of keys) {
        preserved_effects.add(
          /** @type {EachItem} */
          state2.items.get(key2).e
        );
      }
    }
  }
  for (var i = 0; i < to_destroy.length; i++) {
    var e = to_destroy[i];
    if (preserved_effects?.has(e)) {
      e.f |= EFFECT_OFFSCREEN;
      const fragment = document.createDocumentFragment();
      move_effect(e, fragment);
    } else {
      destroy_effect(to_destroy[i], remove_dom);
    }
  }
}
var offscreen_anchor;
function each(node, flags2, get_collection, get_key, render_fn, fallback_fn = null) {
  var anchor = node;
  var items = /* @__PURE__ */ new Map();
  var is_controlled = (flags2 & EACH_IS_CONTROLLED) !== 0;
  if (is_controlled) {
    var parent_node = (
      /** @type {Element} */
      node
    );
    anchor = hydrating ? set_hydrate_node(get_first_child(parent_node)) : parent_node.appendChild(create_text());
  }
  if (hydrating) {
    hydrate_next();
  }
  var fallback2 = null;
  var each_array = derived_safe_equal(() => {
    var collection = get_collection();
    return is_array(collection) ? collection : collection == null ? [] : array_from(collection);
  });
  var array;
  var pending2 = /* @__PURE__ */ new Map();
  var first_run = true;
  function commit(batch) {
    if ((state2.effect.f & DESTROYED) !== 0) {
      return;
    }
    state2.pending.delete(batch);
    state2.fallback = fallback2;
    reconcile(state2, array, anchor, flags2, get_key);
    if (fallback2 !== null) {
      if (array.length === 0) {
        if ((fallback2.f & EFFECT_OFFSCREEN) === 0) {
          resume_effect(fallback2);
        } else {
          fallback2.f ^= EFFECT_OFFSCREEN;
          move(fallback2, null, anchor);
        }
      } else {
        pause_effect(fallback2, () => {
          fallback2 = null;
        });
      }
    }
  }
  function discard(batch) {
    state2.pending.delete(batch);
  }
  var effect2 = block(() => {
    array = /** @type {V[]} */
    get2(each_array);
    var length = array.length;
    let mismatch = false;
    if (hydrating) {
      var is_else = read_hydration_instruction(anchor) === HYDRATION_START_ELSE;
      if (is_else !== (length === 0)) {
        anchor = skip_nodes();
        set_hydrate_node(anchor);
        set_hydrating(false);
        mismatch = true;
      }
    }
    var keys = /* @__PURE__ */ new Set();
    var batch = (
      /** @type {Batch} */
      current_batch
    );
    var defer = should_defer_append();
    for (var index2 = 0; index2 < length; index2 += 1) {
      if (hydrating && hydrate_node.nodeType === COMMENT_NODE && /** @type {Comment} */
      hydrate_node.data === HYDRATION_END) {
        anchor = /** @type {Comment} */
        hydrate_node;
        mismatch = true;
        set_hydrating(false);
      }
      var value = array[index2];
      var key2 = get_key(value, index2);
      if (dev_fallback_default) {
        var key_again = get_key(value, index2);
        if (key2 !== key_again) {
          each_key_volatile(String(index2), String(key2), String(key_again));
        }
      }
      var item = first_run ? null : items.get(key2);
      if (item) {
        if (item.v) internal_set(item.v, value);
        if (item.i) internal_set(item.i, index2);
        if (defer) {
          batch.unskip_effect(item.e);
        }
      } else {
        item = create_item(
          items,
          first_run ? anchor : offscreen_anchor ??= create_text(),
          value,
          key2,
          index2,
          render_fn,
          flags2,
          get_collection
        );
        if (!first_run) {
          item.e.f |= EFFECT_OFFSCREEN;
        }
        items.set(key2, item);
      }
      keys.add(key2);
    }
    if (length === 0 && fallback_fn && !fallback2) {
      if (first_run) {
        fallback2 = branch(() => fallback_fn(anchor));
      } else {
        fallback2 = branch(() => fallback_fn(offscreen_anchor ??= create_text()));
        fallback2.f |= EFFECT_OFFSCREEN;
      }
    }
    if (length > keys.size) {
      if (dev_fallback_default) {
        validate_each_keys(array, get_key);
      } else {
        each_key_duplicate("", "", "");
      }
    }
    if (hydrating && length > 0) {
      set_hydrate_node(skip_nodes());
    }
    if (!first_run) {
      pending2.set(batch, keys);
      if (defer) {
        for (const [key3, item2] of items) {
          if (!keys.has(key3)) {
            batch.skip_effect(item2.e);
          }
        }
        batch.oncommit(commit);
        batch.ondiscard(discard);
      } else {
        commit(batch);
      }
    }
    if (mismatch) {
      set_hydrating(true);
    }
    get2(each_array);
  });
  var state2 = { effect: effect2, flags: flags2, items, pending: pending2, outrogroups: null, fallback: fallback2 };
  first_run = false;
  if (hydrating) {
    anchor = hydrate_node;
  }
}
function skip_to_branch(effect2) {
  while (effect2 !== null && (effect2.f & BRANCH_EFFECT) === 0) {
    effect2 = effect2.next;
  }
  return effect2;
}
function reconcile(state2, array, anchor, flags2, get_key) {
  var is_animated = (flags2 & EACH_IS_ANIMATED) !== 0;
  var length = array.length;
  var items = state2.items;
  var current = skip_to_branch(state2.effect.first);
  var seen;
  var prev = null;
  var to_animate;
  var matched = [];
  var stashed = [];
  var value;
  var key2;
  var effect2;
  var i;
  if (is_animated) {
    for (i = 0; i < length; i += 1) {
      value = array[i];
      key2 = get_key(value, i);
      effect2 = /** @type {EachItem} */
      items.get(key2).e;
      if ((effect2.f & EFFECT_OFFSCREEN) === 0) {
        effect2.nodes?.a?.measure();
        (to_animate ??= /* @__PURE__ */ new Set()).add(effect2);
      }
    }
  }
  for (i = 0; i < length; i += 1) {
    value = array[i];
    key2 = get_key(value, i);
    effect2 = /** @type {EachItem} */
    items.get(key2).e;
    if (state2.outrogroups !== null) {
      for (const group of state2.outrogroups) {
        group.pending.delete(effect2);
        group.done.delete(effect2);
      }
    }
    if ((effect2.f & EFFECT_OFFSCREEN) !== 0) {
      effect2.f ^= EFFECT_OFFSCREEN;
      if (effect2 === current) {
        move(effect2, null, anchor);
      } else {
        var next2 = prev ? prev.next : current;
        if (effect2 === state2.effect.last) {
          state2.effect.last = effect2.prev;
        }
        if (effect2.prev) effect2.prev.next = effect2.next;
        if (effect2.next) effect2.next.prev = effect2.prev;
        link(state2, prev, effect2);
        link(state2, effect2, next2);
        move(effect2, next2, anchor);
        prev = effect2;
        matched = [];
        stashed = [];
        current = skip_to_branch(prev.next);
        continue;
      }
    }
    if ((effect2.f & INERT) !== 0) {
      resume_effect(effect2);
      if (is_animated) {
        effect2.nodes?.a?.unfix();
        (to_animate ??= /* @__PURE__ */ new Set()).delete(effect2);
      }
    }
    if (effect2 !== current) {
      if (seen !== void 0 && seen.has(effect2)) {
        if (matched.length < stashed.length) {
          var start = stashed[0];
          var j;
          prev = start.prev;
          var a = matched[0];
          var b = matched[matched.length - 1];
          for (j = 0; j < matched.length; j += 1) {
            move(matched[j], start, anchor);
          }
          for (j = 0; j < stashed.length; j += 1) {
            seen.delete(stashed[j]);
          }
          link(state2, a.prev, b.next);
          link(state2, prev, a);
          link(state2, b, start);
          current = start;
          prev = b;
          i -= 1;
          matched = [];
          stashed = [];
        } else {
          seen.delete(effect2);
          move(effect2, current, anchor);
          link(state2, effect2.prev, effect2.next);
          link(state2, effect2, prev === null ? state2.effect.first : prev.next);
          link(state2, prev, effect2);
          prev = effect2;
        }
        continue;
      }
      matched = [];
      stashed = [];
      while (current !== null && current !== effect2) {
        (seen ??= /* @__PURE__ */ new Set()).add(current);
        stashed.push(current);
        current = skip_to_branch(current.next);
      }
      if (current === null) {
        continue;
      }
    }
    if ((effect2.f & EFFECT_OFFSCREEN) === 0) {
      matched.push(effect2);
    }
    prev = effect2;
    current = skip_to_branch(effect2.next);
  }
  if (state2.outrogroups !== null) {
    for (const group of state2.outrogroups) {
      if (group.pending.size === 0) {
        destroy_effects(state2, array_from(group.done));
        state2.outrogroups?.delete(group);
      }
    }
    if (state2.outrogroups.size === 0) {
      state2.outrogroups = null;
    }
  }
  if (current !== null || seen !== void 0) {
    var to_destroy = [];
    if (seen !== void 0) {
      for (effect2 of seen) {
        if ((effect2.f & INERT) === 0) {
          to_destroy.push(effect2);
        }
      }
    }
    while (current !== null) {
      if ((current.f & INERT) === 0 && current !== state2.fallback) {
        to_destroy.push(current);
      }
      current = skip_to_branch(current.next);
    }
    var destroy_length = to_destroy.length;
    if (destroy_length > 0) {
      var controlled_anchor = (flags2 & EACH_IS_CONTROLLED) !== 0 && length === 0 ? anchor : null;
      if (is_animated) {
        for (i = 0; i < destroy_length; i += 1) {
          to_destroy[i].nodes?.a?.measure();
        }
        for (i = 0; i < destroy_length; i += 1) {
          to_destroy[i].nodes?.a?.fix();
        }
      }
      pause_effects(state2, to_destroy, controlled_anchor);
    }
  }
  if (is_animated) {
    queue_micro_task(() => {
      if (to_animate === void 0) return;
      for (effect2 of to_animate) {
        effect2.nodes?.a?.apply();
      }
    });
  }
}
function create_item(items, anchor, value, key2, index2, render_fn, flags2, get_collection) {
  var v = (flags2 & EACH_ITEM_REACTIVE) !== 0 ? (flags2 & EACH_ITEM_IMMUTABLE) === 0 ? mutable_source(value, false, false) : source(value) : null;
  var i = (flags2 & EACH_INDEX_REACTIVE) !== 0 ? source(index2) : null;
  if (dev_fallback_default && v) {
    v.trace = () => {
      get_collection()[i?.v ?? index2];
    };
  }
  return {
    v,
    i,
    e: branch(() => {
      render_fn(anchor, v ?? value, i ?? index2, get_collection);
      return () => {
        items.delete(key2);
      };
    })
  };
}
function move(effect2, next2, anchor) {
  if (!effect2.nodes) return;
  var node = effect2.nodes.start;
  var end = effect2.nodes.end;
  var dest = next2 && (next2.f & EFFECT_OFFSCREEN) === 0 ? (
    /** @type {EffectNodes} */
    next2.nodes.start
  ) : anchor;
  while (node !== null) {
    var next_node = (
      /** @type {TemplateNode} */
      get_next_sibling(node)
    );
    dest.before(node);
    if (node === end) {
      return;
    }
    node = next_node;
  }
}
function link(state2, prev, next2) {
  if (prev === null) {
    state2.effect.first = next2;
  } else {
    prev.next = next2;
  }
  if (next2 === null) {
    state2.effect.last = prev;
  } else {
    next2.prev = prev;
  }
}
function validate_each_keys(array, key_fn) {
  const keys = /* @__PURE__ */ new Map();
  const length = array.length;
  for (let i = 0; i < length; i++) {
    const key2 = key_fn(array[i], i);
    if (keys.has(key2)) {
      const a = String(keys.get(key2));
      const b = String(i);
      let k = String(key2);
      if (k.startsWith("[object ")) k = null;
      each_key_duplicate(a, b, k);
    }
    keys.set(key2, i);
  }
}

// node_modules/svelte/src/internal/client/dom/css.js
function append_styles(anchor, css) {
  effect(() => {
    var root2 = anchor.getRootNode();
    var target = (
      /** @type {ShadowRoot} */
      root2.host ? (
        /** @type {ShadowRoot} */
        root2
      ) : (
        /** @type {Document} */
        root2.head ?? /** @type {Document} */
        root2.ownerDocument.head
      )
    );
    if (!target.querySelector("#" + css.hash)) {
      const style = create_element("style");
      style.id = css.hash;
      style.textContent = css.code;
      target.appendChild(style);
      if (dev_fallback_default) {
        register_style(css.hash, style);
      }
    }
  });
}

// node_modules/svelte/src/internal/client/dom/elements/actions.js
function action(dom, action2, get_value) {
  effect(() => {
    var payload = untrack(() => action2(dom, get_value?.()) || {});
    if (get_value && payload?.update) {
      var inited = false;
      var prev = (
        /** @type {any} */
        {}
      );
      render_effect(() => {
        var value = get_value();
        deep_read_state(value);
        if (inited && safe_not_equal(prev, value)) {
          prev = value;
          payload.update(value);
        }
      });
      inited = true;
    }
    if (payload?.destroy) {
      return () => (
        /** @type {Function} */
        payload.destroy()
      );
    }
  });
}

// node_modules/clsx/dist/clsx.mjs
function r(e) {
  var t, f, n = "";
  if ("string" == typeof e || "number" == typeof e) n += e;
  else if ("object" == typeof e) if (Array.isArray(e)) {
    var o = e.length;
    for (t = 0; t < o; t++) e[t] && (f = r(e[t])) && (n && (n += " "), n += f);
  } else for (f in e) e[f] && (n && (n += " "), n += f);
  return n;
}
function clsx() {
  for (var e, t, f = 0, n = "", o = arguments.length; f < o; f++) (e = arguments[f]) && (t = r(e)) && (n && (n += " "), n += t);
  return n;
}

// node_modules/svelte/src/internal/shared/attributes.js
function clsx2(value) {
  if (typeof value === "object") {
    return clsx(value);
  } else {
    return value ?? "";
  }
}
var whitespace = [..." 	\n\r\f\xA0\v\uFEFF"];
function to_class(value, hash2, directives) {
  var classname = value == null ? "" : "" + value;
  if (hash2) {
    classname = classname ? classname + " " + hash2 : hash2;
  }
  if (directives) {
    for (var key2 of Object.keys(directives)) {
      if (directives[key2]) {
        classname = classname ? classname + " " + key2 : key2;
      } else if (classname.length) {
        var len = key2.length;
        var a = 0;
        while ((a = classname.indexOf(key2, a)) >= 0) {
          var b = a + len;
          if ((a === 0 || whitespace.includes(classname[a - 1])) && (b === classname.length || whitespace.includes(classname[b]))) {
            classname = (a === 0 ? "" : classname.substring(0, a)) + classname.substring(b + 1);
          } else {
            a = b;
          }
        }
      }
    }
  }
  return classname === "" ? null : classname;
}

// node_modules/svelte/src/internal/client/dom/elements/class.js
function set_class(dom, is_html, value, hash2, prev_classes, next_classes) {
  var prev = dom.__className;
  if (hydrating || prev !== value || prev === void 0) {
    var next_class_name = to_class(value, hash2, next_classes);
    if (!hydrating || next_class_name !== dom.getAttribute("class")) {
      if (next_class_name == null) {
        dom.removeAttribute("class");
      } else if (is_html) {
        dom.className = next_class_name;
      } else {
        dom.setAttribute("class", next_class_name);
      }
    }
    dom.__className = value;
  } else if (next_classes && prev_classes !== next_classes) {
    for (var key2 in next_classes) {
      var is_present = !!next_classes[key2];
      if (prev_classes == null || is_present !== !!prev_classes[key2]) {
        dom.classList.toggle(key2, is_present);
      }
    }
  }
  return next_classes;
}

// node_modules/svelte/src/internal/client/dom/elements/attributes.js
var CLASS = Symbol("class");
var STYLE = Symbol("style");
var IS_CUSTOM_ELEMENT = Symbol("is custom element");
var IS_HTML = Symbol("is html");
var LINK_TAG = IS_XHTML ? "link" : "LINK";
function set_attribute2(element2, attribute, value, skip_warning) {
  var attributes = get_attributes(element2);
  if (hydrating) {
    attributes[attribute] = element2.getAttribute(attribute);
    if (attribute === "src" || attribute === "srcset" || attribute === "href" && element2.nodeName === LINK_TAG) {
      if (!skip_warning) {
        check_src_in_dev_hydration(element2, attribute, value ?? "");
      }
      return;
    }
  }
  if (attributes[attribute] === (attributes[attribute] = value)) return;
  if (attribute === "loading") {
    element2[LOADING_ATTR_SYMBOL] = value;
  }
  if (value == null) {
    element2.removeAttribute(attribute);
  } else if (typeof value !== "string" && get_setters(element2).includes(attribute)) {
    element2[attribute] = value;
  } else {
    element2.setAttribute(attribute, value);
  }
}
function get_attributes(element2) {
  return (
    /** @type {Record<string | symbol, unknown>} **/
    // @ts-expect-error
    element2.__attributes ??= {
      [IS_CUSTOM_ELEMENT]: element2.nodeName.includes("-"),
      [IS_HTML]: element2.namespaceURI === NAMESPACE_HTML
    }
  );
}
var setters_cache = /* @__PURE__ */ new Map();
function get_setters(element2) {
  var cache_key = element2.getAttribute("is") || element2.nodeName;
  var setters = setters_cache.get(cache_key);
  if (setters) return setters;
  setters_cache.set(cache_key, setters = []);
  var descriptors;
  var proto = element2;
  var element_proto = Element.prototype;
  while (element_proto !== proto) {
    descriptors = get_descriptors(proto);
    for (var key2 in descriptors) {
      if (descriptors[key2].set) {
        setters.push(key2);
      }
    }
    proto = get_prototype_of(proto);
  }
  return setters;
}
function check_src_in_dev_hydration(element2, attribute, value) {
  if (!dev_fallback_default) return;
  if (attribute === "srcset" && srcset_url_equal(element2, value)) return;
  if (src_url_equal(element2.getAttribute(attribute) ?? "", value)) return;
  hydration_attribute_changed(
    attribute,
    element2.outerHTML.replace(element2.innerHTML, element2.innerHTML && "..."),
    String(value)
  );
}
function src_url_equal(element_src, url) {
  if (element_src === url) return true;
  return new URL(element_src, document.baseURI).href === new URL(url, document.baseURI).href;
}
function split_srcset(srcset) {
  return srcset.split(",").map((src) => src.trim().split(" ").filter(Boolean));
}
function srcset_url_equal(element2, srcset) {
  var element_urls = split_srcset(element2.srcset);
  var urls = split_srcset(srcset);
  return urls.length === element_urls.length && urls.every(
    ([url, width], i) => width === element_urls[i][1] && // We need to test both ways because Vite will create an a full URL with
    // `new URL(asset, import.meta.url).href` for the client when `base: './'`, and the
    // relative URLs inside srcset are not automatically resolved to absolute URLs by
    // browsers (in contrast to img.src). This means both SSR and DOM code could
    // contain relative or absolute URLs.
    (src_url_equal(element_urls[i][0], url) || src_url_equal(url, element_urls[i][0]))
  );
}

// node_modules/svelte/src/internal/client/dom/elements/bindings/input.js
function bind_value(input, get3, set2 = get3) {
  var batches2 = /* @__PURE__ */ new WeakSet();
  listen_to_event_and_reset_event(input, "input", async (is_reset) => {
    if (dev_fallback_default && input.type === "checkbox") {
      bind_invalid_checkbox_value();
    }
    var value = is_reset ? input.defaultValue : input.value;
    value = is_numberlike_input(input) ? to_number(value) : value;
    set2(value);
    if (current_batch !== null) {
      batches2.add(current_batch);
    }
    await tick();
    if (value !== (value = get3())) {
      var start = input.selectionStart;
      var end = input.selectionEnd;
      var length = input.value.length;
      input.value = value ?? "";
      if (end !== null) {
        var new_length = input.value.length;
        if (start === end && end === length && new_length > length) {
          input.selectionStart = new_length;
          input.selectionEnd = new_length;
        } else {
          input.selectionStart = start;
          input.selectionEnd = Math.min(end, new_length);
        }
      }
    }
  });
  if (
    // If we are hydrating and the value has since changed,
    // then use the updated value from the input instead.
    hydrating && input.defaultValue !== input.value || // If defaultValue is set, then value == defaultValue
    // TODO Svelte 6: remove input.value check and set to empty string?
    untrack(get3) == null && input.value
  ) {
    set2(is_numberlike_input(input) ? to_number(input.value) : input.value);
    if (current_batch !== null) {
      batches2.add(current_batch);
    }
  }
  render_effect(() => {
    if (dev_fallback_default && input.type === "checkbox") {
      bind_invalid_checkbox_value();
    }
    var value = get3();
    if (input === document.activeElement) {
      var batch = (
        /** @type {Batch} */
        async_mode_flag ? previous_batch : current_batch
      );
      if (batches2.has(batch)) {
        return;
      }
    }
    if (is_numberlike_input(input) && value === to_number(input.value)) {
      return;
    }
    if (input.type === "date" && !value && !input.value) {
      return;
    }
    if (value !== input.value) {
      input.value = value ?? "";
    }
  });
}
function is_numberlike_input(input) {
  var type = input.type;
  return type === "number" || type === "range";
}
function to_number(value) {
  return value === "" ? null : +value;
}

// node_modules/svelte/src/internal/client/dom/elements/bindings/this.js
function is_bound_this(bound_value, element_or_component) {
  return bound_value === element_or_component || bound_value?.[STATE_SYMBOL] === element_or_component;
}
function bind_this(element_or_component = {}, update2, get_value, get_parts) {
  var component_effect = (
    /** @type {ComponentContext} */
    component_context.r
  );
  var parent = (
    /** @type {Effect} */
    active_effect
  );
  effect(() => {
    var old_parts;
    var parts;
    render_effect(() => {
      old_parts = parts;
      parts = get_parts?.() || [];
      untrack(() => {
        if (element_or_component !== get_value(...parts)) {
          update2(element_or_component, ...parts);
          if (old_parts && is_bound_this(get_value(...old_parts), element_or_component)) {
            update2(null, ...old_parts);
          }
        }
      });
    });
    return () => {
      let p = parent;
      while (p !== component_effect && p.parent !== null && p.parent.f & DESTROYING) {
        p = p.parent;
      }
      const teardown2 = () => {
        if (parts && is_bound_this(get_value(...parts), element_or_component)) {
          update2(null, ...parts);
        }
      };
      const original_teardown = p.teardown;
      p.teardown = () => {
        teardown2();
        original_teardown?.();
      };
    };
  });
  return element_or_component;
}

// node_modules/svelte/src/legacy/legacy-client.js
function createClassComponent(options) {
  return new Svelte4Component(options);
}
var Svelte4Component = class {
  /** @type {any} */
  #events;
  /** @type {Record<string, any>} */
  #instance;
  /**
   * @param {ComponentConstructorOptions & {
   *  component: any;
   * }} options
   */
  constructor(options) {
    var sources = /* @__PURE__ */ new Map();
    var add_source = (key2, value) => {
      var s = mutable_source(value, false, false);
      sources.set(key2, s);
      return s;
    };
    const props = new Proxy(
      { ...options.props || {}, $$events: {} },
      {
        get(target, prop2) {
          return get2(sources.get(prop2) ?? add_source(prop2, Reflect.get(target, prop2)));
        },
        has(target, prop2) {
          if (prop2 === LEGACY_PROPS) return true;
          get2(sources.get(prop2) ?? add_source(prop2, Reflect.get(target, prop2)));
          return Reflect.has(target, prop2);
        },
        set(target, prop2, value) {
          set(sources.get(prop2) ?? add_source(prop2, value), value);
          return Reflect.set(target, prop2, value);
        }
      }
    );
    this.#instance = (options.hydrate ? hydrate : mount)(options.component, {
      target: options.target,
      anchor: options.anchor,
      props,
      context: options.context,
      intro: options.intro ?? false,
      recover: options.recover,
      transformError: options.transformError
    });
    if (!async_mode_flag && (!options?.props?.$$host || options.sync === false)) {
      flushSync();
    }
    this.#events = props.$$events;
    for (const key2 of Object.keys(this.#instance)) {
      if (key2 === "$set" || key2 === "$destroy" || key2 === "$on") continue;
      define_property(this, key2, {
        get() {
          return this.#instance[key2];
        },
        /** @param {any} value */
        set(value) {
          this.#instance[key2] = value;
        },
        enumerable: true
      });
    }
    this.#instance.$set = /** @param {Record<string, any>} next */
    (next2) => {
      Object.assign(props, next2);
    };
    this.#instance.$destroy = () => {
      unmount(this.#instance);
    };
  }
  /** @param {Record<string, any>} props */
  $set(props) {
    this.#instance.$set(props);
  }
  /**
   * @param {string} event
   * @param {(...args: any[]) => any} callback
   * @returns {any}
   */
  $on(event2, callback) {
    this.#events[event2] = this.#events[event2] || [];
    const cb = (...args) => callback.call(this, ...args);
    this.#events[event2].push(cb);
    return () => {
      this.#events[event2] = this.#events[event2].filter(
        /** @param {any} fn */
        (fn) => fn !== cb
      );
    };
  }
  $destroy() {
    this.#instance.$destroy();
  }
};

// node_modules/svelte/src/internal/client/dom/elements/custom-element.js
var SvelteElement;
if (typeof HTMLElement === "function") {
  SvelteElement = class extends HTMLElement {
    /** The Svelte component constructor */
    $$ctor;
    /** Slots */
    $$s;
    /** @type {any} The Svelte component instance */
    $$c;
    /** Whether or not the custom element is connected */
    $$cn = false;
    /** @type {Record<string, any>} Component props data */
    $$d = {};
    /** `true` if currently in the process of reflecting component props back to attributes */
    $$r = false;
    /** @type {Record<string, CustomElementPropDefinition>} Props definition (name, reflected, type etc) */
    $$p_d = {};
    /** @type {Record<string, EventListenerOrEventListenerObject[]>} Event listeners */
    $$l = {};
    /** @type {Map<EventListenerOrEventListenerObject, Function>} Event listener unsubscribe functions */
    $$l_u = /* @__PURE__ */ new Map();
    /** @type {any} The managed render effect for reflecting attributes */
    $$me;
    /** @type {ShadowRoot | null} The ShadowRoot of the custom element */
    $$shadowRoot = null;
    /**
     * @param {*} $$componentCtor
     * @param {*} $$slots
     * @param {ShadowRootInit | undefined} shadow_root_init
     */
    constructor($$componentCtor, $$slots, shadow_root_init) {
      super();
      this.$$ctor = $$componentCtor;
      this.$$s = $$slots;
      if (shadow_root_init) {
        this.$$shadowRoot = this.attachShadow(shadow_root_init);
      }
    }
    /**
     * @param {string} type
     * @param {EventListenerOrEventListenerObject} listener
     * @param {boolean | AddEventListenerOptions} [options]
     */
    addEventListener(type, listener, options) {
      this.$$l[type] = this.$$l[type] || [];
      this.$$l[type].push(listener);
      if (this.$$c) {
        const unsub = this.$$c.$on(type, listener);
        this.$$l_u.set(listener, unsub);
      }
      super.addEventListener(type, listener, options);
    }
    /**
     * @param {string} type
     * @param {EventListenerOrEventListenerObject} listener
     * @param {boolean | AddEventListenerOptions} [options]
     */
    removeEventListener(type, listener, options) {
      super.removeEventListener(type, listener, options);
      if (this.$$c) {
        const unsub = this.$$l_u.get(listener);
        if (unsub) {
          unsub();
          this.$$l_u.delete(listener);
        }
      }
    }
    async connectedCallback() {
      this.$$cn = true;
      if (!this.$$c) {
        let create_slot = function(name) {
          return (anchor) => {
            const slot2 = create_element("slot");
            if (name !== "default") slot2.name = name;
            append(anchor, slot2);
          };
        };
        await Promise.resolve();
        if (!this.$$cn || this.$$c) {
          return;
        }
        const $$slots = {};
        const existing_slots = get_custom_elements_slots(this);
        for (const name of this.$$s) {
          if (name in existing_slots) {
            if (name === "default" && !this.$$d.children) {
              this.$$d.children = create_slot(name);
              $$slots.default = true;
            } else {
              $$slots[name] = create_slot(name);
            }
          }
        }
        for (const attribute of this.attributes) {
          const name = this.$$g_p(attribute.name);
          if (!(name in this.$$d)) {
            this.$$d[name] = get_custom_element_value(name, attribute.value, this.$$p_d, "toProp");
          }
        }
        for (const key2 in this.$$p_d) {
          if (!(key2 in this.$$d) && this[key2] !== void 0) {
            this.$$d[key2] = this[key2];
            delete this[key2];
          }
        }
        this.$$c = createClassComponent({
          component: this.$$ctor,
          target: this.$$shadowRoot || this,
          props: {
            ...this.$$d,
            $$slots,
            $$host: this
          }
        });
        this.$$me = effect_root(() => {
          render_effect(() => {
            this.$$r = true;
            for (const key2 of object_keys(this.$$c)) {
              if (!this.$$p_d[key2]?.reflect) continue;
              this.$$d[key2] = this.$$c[key2];
              const attribute_value = get_custom_element_value(
                key2,
                this.$$d[key2],
                this.$$p_d,
                "toAttribute"
              );
              if (attribute_value == null) {
                this.removeAttribute(this.$$p_d[key2].attribute || key2);
              } else {
                this.setAttribute(this.$$p_d[key2].attribute || key2, attribute_value);
              }
            }
            this.$$r = false;
          });
        });
        for (const type in this.$$l) {
          for (const listener of this.$$l[type]) {
            const unsub = this.$$c.$on(type, listener);
            this.$$l_u.set(listener, unsub);
          }
        }
        this.$$l = {};
      }
    }
    // We don't need this when working within Svelte code, but for compatibility of people using this outside of Svelte
    // and setting attributes through setAttribute etc, this is helpful
    /**
     * @param {string} attr
     * @param {string} _oldValue
     * @param {string} newValue
     */
    attributeChangedCallback(attr2, _oldValue, newValue) {
      if (this.$$r) return;
      attr2 = this.$$g_p(attr2);
      this.$$d[attr2] = get_custom_element_value(attr2, newValue, this.$$p_d, "toProp");
      this.$$c?.$set({ [attr2]: this.$$d[attr2] });
    }
    disconnectedCallback() {
      this.$$cn = false;
      Promise.resolve().then(() => {
        if (!this.$$cn && this.$$c) {
          this.$$c.$destroy();
          this.$$me();
          this.$$c = void 0;
        }
      });
    }
    /**
     * @param {string} attribute_name
     */
    $$g_p(attribute_name) {
      return object_keys(this.$$p_d).find(
        (key2) => this.$$p_d[key2].attribute === attribute_name || !this.$$p_d[key2].attribute && key2.toLowerCase() === attribute_name
      ) || attribute_name;
    }
  };
}
function get_custom_element_value(prop2, value, props_definition, transform) {
  const type = props_definition[prop2]?.type;
  value = type === "Boolean" && typeof value !== "boolean" ? value != null : value;
  if (!transform || !props_definition[prop2]) {
    return value;
  } else if (transform === "toAttribute") {
    switch (type) {
      case "Object":
      case "Array":
        return value == null ? null : JSON.stringify(value);
      case "Boolean":
        return value ? "" : null;
      case "Number":
        return value == null ? null : value;
      default:
        return value;
    }
  } else {
    switch (type) {
      case "Object":
      case "Array":
        return value && JSON.parse(value);
      case "Boolean":
        return value;
      // conversion already handled above
      case "Number":
        return value != null ? +value : value;
      default:
        return value;
    }
  }
}
function get_custom_elements_slots(element2) {
  const result = {};
  element2.childNodes.forEach((node) => {
    result[
      /** @type {Element} node */
      node.slot || "default"
    ] = true;
  });
  return result;
}

// node_modules/svelte/src/index-client.js
if (dev_fallback_default) {
  let throw_rune_error = function(rune) {
    if (!(rune in globalThis)) {
      let value;
      Object.defineProperty(globalThis, rune, {
        configurable: true,
        // eslint-disable-next-line getter-return
        get: () => {
          if (value !== void 0) {
            return value;
          }
          rune_outside_svelte(rune);
        },
        set: (v) => {
          value = v;
        }
      });
    }
  };
  throw_rune_error("$state");
  throw_rune_error("$effect");
  throw_rune_error("$derived");
  throw_rune_error("$inspect");
  throw_rune_error("$props");
  throw_rune_error("$bindable");
}

// node_modules/svelte/src/version.js
var PUBLIC_VERSION = "5";

// node_modules/svelte/src/internal/disclose-version.js
if (typeof window !== "undefined") {
  ((window.__svelte ??= {}).v ??= /* @__PURE__ */ new Set()).add(PUBLIC_VERSION);
}

// src/ui/ChatContainer.svelte
var import_obsidian6 = require("obsidian");
var root_2 = from_html(`<div class="ochatting-msg ochatting-user-msg svelte-hkdyy7"><div class="ochatting-msg-content svelte-hkdyy7"> </div></div>`);
var root_3 = from_html(`<div class="ochatting-msg ochatting-assistant-msg svelte-hkdyy7"><div class="ochatting-msg-content svelte-hkdyy7"></div></div>`);
var root_4 = from_html(`<div class="ochatting-tool-call svelte-hkdyy7"><div class="ochatting-tool-status svelte-hkdyy7"><span class="ochatting-spinner svelte-hkdyy7"></span> <span class="ochatting-tool-name svelte-hkdyy7"> </span></div> <details class="ochatting-tool-details svelte-hkdyy7"><summary class="svelte-hkdyy7">Parameters</summary> <pre class="ochatting-tool-json svelte-hkdyy7"> </pre></details></div>`);
var root_5 = from_html(`<div class="ochatting-tool-call svelte-hkdyy7"><div class="ochatting-tool-status svelte-hkdyy7"><span> </span> <span class="ochatting-tool-name svelte-hkdyy7"> </span></div> <details class="ochatting-tool-details svelte-hkdyy7"><summary class="svelte-hkdyy7"> </summary> <pre class="ochatting-tool-json svelte-hkdyy7"> </pre></details></div>`);
var root_6 = from_html(`<div class="ochatting-msg ochatting-error-msg svelte-hkdyy7"><div class="ochatting-msg-content svelte-hkdyy7"> </div></div>`);
var root_7 = from_html(`<div class="ochatting-thinking svelte-hkdyy7"><span class="ochatting-dot svelte-hkdyy7"></span> <span class="ochatting-dot svelte-hkdyy7"></span> <span class="ochatting-dot svelte-hkdyy7"></span></div>`);
var root_8 = from_html(`<div class="ochatting-selection-pill svelte-hkdyy7"><div class="ochatting-selection-content svelte-hkdyy7"><span class="ochatting-selection-label svelte-hkdyy7"> </span> <span class="ochatting-selection-preview svelte-hkdyy7"> </span></div> <button class="ochatting-selection-dismiss svelte-hkdyy7" aria-label="Remove selection"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svelte-hkdyy7"><line x1="18" y1="6" x2="6" y2="18" class="svelte-hkdyy7"></line><line x1="6" y1="6" x2="18" y2="18" class="svelte-hkdyy7"></line></svg></button></div>`);
var root_9 = from_html(`<button class="ochatting-send-btn svelte-hkdyy7" aria-label="Send message"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="svelte-hkdyy7"><line x1="12" y1="19" x2="12" y2="5" class="svelte-hkdyy7"></line><polyline points="5 12 12 5 19 12" class="svelte-hkdyy7"></polyline></svg></button>`);
var root_10 = from_html(`<button class="ochatting-send-btn ochatting-stop-btn svelte-hkdyy7" aria-label="Stop generation"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none" class="svelte-hkdyy7"><rect x="4" y="4" width="16" height="16" rx="2" class="svelte-hkdyy7"></rect></svg></button>`);
var root = from_html(`<div class="ochatting-container svelte-hkdyy7"><div class="ochatting-header svelte-hkdyy7"><div class="ochatting-header-left svelte-hkdyy7"><span class="ochatting-header-title svelte-hkdyy7">Chat</span> <span class="ochatting-header-model svelte-hkdyy7"> </span></div> <button class="ochatting-clear-btn svelte-hkdyy7">Clear</button></div> <div class="ochatting-messages svelte-hkdyy7"></div> <!> <div class="ochatting-input-bar svelte-hkdyy7"><textarea class="ochatting-input svelte-hkdyy7" rows="1"></textarea> <!></div></div>`);
var $$css = {
  hash: "svelte-hkdyy7",
  code: "\n  /* \u2500\u2500\u2500 Container \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */.ochatting-container.svelte-hkdyy7 {display:flex;flex-direction:column;height:100%;overflow:hidden;}\n\n  /* \u2500\u2500\u2500 Header \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */.ochatting-header.svelte-hkdyy7 {display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-bottom:1px solid var(--background-modifier-border);flex-shrink:0;}.ochatting-header-left.svelte-hkdyy7 {display:flex;align-items:baseline;gap:8px;}.ochatting-header-title.svelte-hkdyy7 {font-weight:var(--font-weight-bold, 600);font-size:var(--font-ui-medium);color:var(--text-normal);}.ochatting-header-model.svelte-hkdyy7 {font-size:var(--font-ui-smaller);color:var(--text-muted);}.ochatting-clear-btn.svelte-hkdyy7 {font-size:var(--font-ui-smaller);color:var(--text-muted);background:none;border:none;cursor:pointer;padding:4px 8px;border-radius:var(--radius-s);}.ochatting-clear-btn.svelte-hkdyy7:hover {background:var(--background-modifier-hover);color:var(--text-normal);}\n\n  /* \u2500\u2500\u2500 Messages \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */.ochatting-messages.svelte-hkdyy7 {flex:1 1 0;overflow-y:auto;overscroll-behavior:contain;padding:12px;display:flex;flex-direction:column;gap:8px;-webkit-user-select:text;user-select:text;}.ochatting-msg.svelte-hkdyy7 {max-width:90%;padding:8px 12px;border-radius:var(--radius-m);line-height:1.5;word-wrap:break-word;-webkit-user-select:text;user-select:text;}.ochatting-user-msg.svelte-hkdyy7 {align-self:flex-end;background:var(--interactive-accent);color:var(--text-on-accent);border-bottom-right-radius:var(--radius-s);}.ochatting-assistant-msg.svelte-hkdyy7 {align-self:flex-start;background:var(--background-secondary);color:var(--text-normal);border-bottom-left-radius:var(--radius-s);}.ochatting-assistant-msg.svelte-hkdyy7 p:first-child {margin-top:0;}.ochatting-assistant-msg.svelte-hkdyy7 p:last-child {margin-bottom:0;}.ochatting-error-msg.svelte-hkdyy7 {align-self:flex-start;background:var(--background-secondary);color:var(--text-error);border-left:3px solid var(--text-error);font-size:var(--font-ui-smaller);max-width:90%;}\n\n  /* \u2500\u2500\u2500 Tool Calls \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */.ochatting-tool-call.svelte-hkdyy7 {align-self:flex-start;padding:6px 10px;background:var(--background-secondary-alt);border-radius:var(--radius-s);font-size:var(--font-ui-smaller);color:var(--text-muted);max-width:90%;}.ochatting-tool-status.svelte-hkdyy7 {display:flex;align-items:center;gap:6px;}.ochatting-tool-name.svelte-hkdyy7 {font-weight:500;}.ochatting-tool-success.svelte-hkdyy7 {color:var(--text-success);}.ochatting-tool-error.svelte-hkdyy7 {color:var(--text-error);}.ochatting-tool-details.svelte-hkdyy7 {margin-top:4px;}.ochatting-tool-details.svelte-hkdyy7 summary:where(.svelte-hkdyy7) {cursor:pointer;color:var(--text-faint);font-size:var(--font-ui-smaller);}.ochatting-tool-json.svelte-hkdyy7 {margin:4px 0 0;padding:6px 8px;background:var(--background-primary);border-radius:var(--radius-s);font-size:11px;max-height:150px;overflow:auto;white-space:pre-wrap;word-break:break-all;}\n\n  /* \u2500\u2500\u2500 Spinner \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */.ochatting-spinner.svelte-hkdyy7 {display:inline-block;width:12px;height:12px;border:2px solid var(--text-faint);border-top-color:var(--interactive-accent);border-radius:50%;\n    animation: svelte-hkdyy7-ochatting-spin 0.6s linear infinite;}\n\n  @keyframes svelte-hkdyy7-ochatting-spin {\n    to { transform: rotate(360deg); }\n  }\n\n  /* \u2500\u2500\u2500 Thinking Dots \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */.ochatting-thinking.svelte-hkdyy7 {align-self:flex-start;display:flex;gap:4px;padding:8px 12px;}.ochatting-dot.svelte-hkdyy7 {width:8px;height:8px;background:var(--text-faint);border-radius:50%;\n    animation: svelte-hkdyy7-ochatting-pulse 1.4s ease-in-out infinite;}.ochatting-dot.svelte-hkdyy7:nth-child(2) {animation-delay:0.2s;}.ochatting-dot.svelte-hkdyy7:nth-child(3) {animation-delay:0.4s;}\n\n  @keyframes svelte-hkdyy7-ochatting-pulse {\n    0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }\n    40% { opacity: 1; transform: scale(1); }\n  }\n\n  /* \u2500\u2500\u2500 Input Bar \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */.ochatting-input-bar.svelte-hkdyy7 {display:flex;align-items:flex-end;gap:8px;padding:8px 12px;padding-bottom:calc(8px + env(safe-area-inset-bottom, 0px));border-top:1px solid var(--background-modifier-border);background:transparent;flex-shrink:0;}.ochatting-input.svelte-hkdyy7 {flex:1;resize:none;border:1.5px solid var(--background-modifier-border-hover, var(--background-modifier-border));border-radius:20px;padding:8px 16px;font-size:var(--font-ui-medium);font-family:var(--font-interface);background-color:var(--background-secondary);color:var(--text-normal);line-height:1.4;max-height:300px;overflow-y:auto;box-shadow:none;}.ochatting-input.svelte-hkdyy7:focus {outline:none;border-color:var(--interactive-accent);box-shadow:none;}.ochatting-input.svelte-hkdyy7:disabled {opacity:0.5;}.ochatting-send-btn.svelte-hkdyy7 {width:34px;height:34px;min-width:34px;min-height:34px;padding:0;border:none;border-radius:50%;background-color:var(--interactive-accent);color:var(--text-on-accent);cursor:pointer;flex-shrink:0;box-shadow:none;display:flex;align-items:center;justify-content:center;margin-bottom:1px;}.ochatting-send-btn.svelte-hkdyy7:hover {background-color:var(--interactive-accent-hover);}.ochatting-send-btn.svelte-hkdyy7:disabled {opacity:0.4;cursor:not-allowed;}.ochatting-stop-btn.svelte-hkdyy7 {background-color:var(--text-error);}.ochatting-stop-btn.svelte-hkdyy7:hover {background-color:var(--text-error);opacity:0.85;}\n\n  /* \u2500\u2500\u2500 Selection Pill \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */.ochatting-selection-pill.svelte-hkdyy7 {display:flex;align-items:center;gap:8px;margin:8px 8px 0;padding:6px 10px;background:var(--background-secondary);border:1px solid var(--background-modifier-border);border-radius:var(--radius-m);flex-shrink:0;}.ochatting-selection-content.svelte-hkdyy7 {flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;}.ochatting-selection-label.svelte-hkdyy7 {font-size:var(--font-ui-smaller);color:var(--text-muted);font-weight:500;}.ochatting-selection-preview.svelte-hkdyy7 {font-size:var(--font-ui-smaller);color:var(--text-faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}.ochatting-selection-dismiss.svelte-hkdyy7 {flex-shrink:0;width:20px;height:20px;padding:0;border:none;border-radius:50%;background:var(--background-modifier-hover);color:var(--text-muted);cursor:pointer;display:flex;align-items:center;justify-content:center;}.ochatting-selection-dismiss.svelte-hkdyy7:hover {background:var(--background-modifier-border);color:var(--text-normal);}\n\n  /* \u2500\u2500\u2500 Responsive \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n  @media (max-width: 768px) {.ochatting-msg.svelte-hkdyy7 {max-width:95%;}.ochatting-input-bar.svelte-hkdyy7 {gap:10px;padding:10px 12px;padding-bottom:calc(10px + env(safe-area-inset-bottom, 0px));}.ochatting-input.svelte-hkdyy7 {font-size:16px; /* Prevents iOS zoom on focus */padding:10px 16px;border-radius:22px;}.ochatting-send-btn.svelte-hkdyy7 {width:36px;height:36px;min-width:36px;min-height:36px;}\n  }"
};
function ChatContainer($$anchor, $$props) {
  push($$props, true);
  append_styles($$anchor, $$css);
  let displayModel = state("");
  let messages = state(proxy([]));
  let inputText = state("");
  let inputEnabled = state(true);
  let placeholder = state("Ask anything...");
  let messagesEl = state(void 0);
  let textareaEl = state(void 0);
  let nextId = 0;
  let selection = state(null);
  let askUserResolve = state(null);
  user_effect(() => {
    set(displayModel, $$props.model, true);
  });
  user_effect(() => {
    get2(messages).length;
    if (get2(messagesEl)) {
      requestAnimationFrame(() => {
        get2(messagesEl).scrollTop = get2(messagesEl).scrollHeight;
      });
    }
  });
  function addUserMessage(text2) {
    get2(messages).push({ id: nextId++, type: "user", text: text2 });
  }
  function addAssistantMessage(text2) {
    get2(messages).push({ id: nextId++, type: "assistant", text: text2 });
  }
  function addToolCall(name, input) {
    const id = nextId++;
    get2(messages).push({ id, type: "tool-call", toolName: name, toolInput: input });
    return id;
  }
  function updateToolResult(msgId, name, result) {
    const msg = get2(messages).find((m) => m.id === msgId);
    if (msg) {
      msg.type = "tool-result";
      msg.toolName = name;
      msg.toolResult = result;
    }
  }
  function showThinking() {
    if (!get2(messages).some((m) => m.type === "thinking")) {
      get2(messages).push({ id: nextId++, type: "thinking" });
    }
  }
  function hideThinking() {
    const idx = get2(messages).findIndex((m) => m.type === "thinking");
    if (idx !== -1) get2(messages).splice(idx, 1);
  }
  function addError(text2) {
    get2(messages).push({ id: nextId++, type: "error", text: text2 });
  }
  function showAskUser(question) {
    addAssistantMessage(question);
    set(placeholder, "Type your answer...");
    set(inputEnabled, true);
    get2(textareaEl)?.focus();
    return new Promise((resolve) => {
      set(askUserResolve, resolve, true);
    });
  }
  function setInputEnabled(enabled) {
    set(inputEnabled, enabled, true);
    set(placeholder, enabled ? "Ask anything..." : "Waiting for response...", true);
  }
  function clearMessages() {
    set(messages, [], true);
    set(selection, null);
    hideThinking();
  }
  function focus() {
    get2(textareaEl)?.focus();
  }
  function setModel(name) {
    set(displayModel, name, true);
  }
  function setSelection(sel) {
    set(selection, sel, true);
  }
  function getSelection() {
    return get2(selection);
  }
  function clearSelection() {
    set(selection, null);
  }
  function handleSend() {
    const text2 = get2(inputText).trim();
    if (!text2) return;
    set(inputText, "");
    resetHeight();
    if (get2(askUserResolve)) {
      addUserMessage(text2);
      const resolve = get2(askUserResolve);
      set(askUserResolve, null);
      resolve(text2);
      return;
    }
    const currentSelection = get2(selection);
    set(selection, null);
    $$props.onSend(text2, currentSelection);
  }
  function handleKeydown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }
  function autoGrow() {
    if (!get2(textareaEl)) return;
    get2(textareaEl).style.height = "auto";
    get2(textareaEl).style.height = Math.min(get2(textareaEl).scrollHeight, 300) + "px";
  }
  function resetHeight() {
    if (!get2(textareaEl)) return;
    get2(textareaEl).style.height = "auto";
  }
  function renderMarkdown(node, text2) {
    node.empty();
    import_obsidian6.MarkdownRenderer.render($$props.app, text2, node, "", $$props.component);
  }
  function markdown(node, text2) {
    renderMarkdown(node, text2);
    return {
      update(newText) {
        renderMarkdown(node, newText);
      }
    };
  }
  function formatToolName(name) {
    return name.replace(/_/g, " ");
  }
  function truncate(str, max) {
    if (str.length <= max) return str;
    return str.substring(0, max) + "\n... (truncated)";
  }
  var $$exports = {
    addUserMessage,
    addAssistantMessage,
    addToolCall,
    updateToolResult,
    showThinking,
    hideThinking,
    addError,
    showAskUser,
    setInputEnabled,
    clearMessages,
    focus,
    setModel,
    setSelection,
    getSelection,
    clearSelection
  };
  var div = root();
  var div_1 = child(div);
  var div_2 = child(div_1);
  var span = sibling(child(div_2), 2);
  var text_1 = child(span, true);
  reset(span);
  reset(div_2);
  var button = sibling(div_2, 2);
  reset(div_1);
  var div_3 = sibling(div_1, 2);
  each(div_3, 21, () => get2(messages), (msg) => msg.id, ($$anchor2, msg) => {
    var fragment = comment();
    var node_1 = first_child(fragment);
    {
      var consequent = ($$anchor3) => {
        var div_4 = root_2();
        var div_5 = child(div_4);
        var text_2 = child(div_5, true);
        reset(div_5);
        reset(div_4);
        template_effect(() => set_text(text_2, get2(msg).text));
        append($$anchor3, div_4);
      };
      var consequent_1 = ($$anchor3) => {
        var div_6 = root_3();
        var div_7 = child(div_6);
        action(div_7, ($$node, $$action_arg) => markdown?.($$node, $$action_arg), () => get2(msg).text ?? "");
        reset(div_6);
        append($$anchor3, div_6);
      };
      var consequent_2 = ($$anchor3) => {
        var div_8 = root_4();
        var div_9 = child(div_8);
        var span_1 = sibling(child(div_9), 2);
        var text_3 = child(span_1, true);
        reset(span_1);
        reset(div_9);
        var details = sibling(div_9, 2);
        var pre = sibling(child(details), 2);
        var text_4 = child(pre, true);
        reset(pre);
        reset(details);
        reset(div_8);
        template_effect(
          ($0, $1) => {
            set_text(text_3, $0);
            set_text(text_4, $1);
          },
          [
            () => formatToolName(get2(msg).toolName ?? ""),
            () => JSON.stringify(get2(msg).toolInput, null, 2)
          ]
        );
        append($$anchor3, div_8);
      };
      var consequent_3 = ($$anchor3) => {
        var div_10 = root_5();
        var div_11 = child(div_10);
        var span_2 = child(div_11);
        var text_5 = child(span_2, true);
        reset(span_2);
        var span_3 = sibling(span_2, 2);
        var text_6 = child(span_3, true);
        reset(span_3);
        reset(div_11);
        var details_1 = sibling(div_11, 2);
        var summary = child(details_1);
        var text_7 = child(summary, true);
        reset(summary);
        var pre_1 = sibling(summary, 2);
        var text_8 = child(pre_1, true);
        reset(pre_1);
        reset(details_1);
        reset(div_10);
        template_effect(
          ($0, $1) => {
            set_class(span_2, 1, clsx2(get2(msg).toolResult?.isError ? "ochatting-tool-error" : "ochatting-tool-success"), "svelte-hkdyy7");
            set_text(text_5, get2(msg).toolResult?.isError ? "\u2718" : "\u2714");
            set_text(text_6, $0);
            set_text(text_7, get2(msg).toolResult?.isError ? "Error" : "Result");
            set_text(text_8, $1);
          },
          [
            () => formatToolName(get2(msg).toolName ?? ""),
            () => truncate(get2(msg).toolResult?.result ?? "", 2e3)
          ]
        );
        append($$anchor3, div_10);
      };
      var consequent_4 = ($$anchor3) => {
        var div_12 = root_6();
        var div_13 = child(div_12);
        var text_9 = child(div_13, true);
        reset(div_13);
        reset(div_12);
        template_effect(() => set_text(text_9, get2(msg).text));
        append($$anchor3, div_12);
      };
      var consequent_5 = ($$anchor3) => {
        var div_14 = root_7();
        append($$anchor3, div_14);
      };
      if_block(node_1, ($$render) => {
        if (get2(msg).type === "user") $$render(consequent);
        else if (get2(msg).type === "assistant") $$render(consequent_1, 1);
        else if (get2(msg).type === "tool-call") $$render(consequent_2, 2);
        else if (get2(msg).type === "tool-result") $$render(consequent_3, 3);
        else if (get2(msg).type === "error") $$render(consequent_4, 4);
        else if (get2(msg).type === "thinking") $$render(consequent_5, 5);
      });
    }
    append($$anchor2, fragment);
  });
  reset(div_3);
  bind_this(div_3, ($$value) => set(messagesEl, $$value), () => get2(messagesEl));
  var node_2 = sibling(div_3, 2);
  {
    var consequent_6 = ($$anchor2) => {
      var div_15 = root_8();
      var div_16 = child(div_15);
      var span_4 = child(div_16);
      var text_10 = child(span_4);
      reset(span_4);
      var span_5 = sibling(span_4, 2);
      var text_11 = child(span_5);
      reset(span_5);
      reset(div_16);
      var button_1 = sibling(div_16, 2);
      reset(div_15);
      template_effect(
        ($0, $1) => {
          set_text(text_10, `Selection from ${$0 ?? ""}`);
          set_text(text_11, `${$1 ?? ""}${get2(selection).text.length > 80 ? "..." : ""}`);
        },
        [
          () => get2(selection).filePath.split("/").pop(),
          () => get2(selection).text.substring(0, 80)
        ]
      );
      delegated("click", button_1, () => set(selection, null));
      append($$anchor2, div_15);
    };
    if_block(node_2, ($$render) => {
      if (get2(selection)) $$render(consequent_6);
    });
  }
  var div_17 = sibling(node_2, 2);
  var textarea = child(div_17);
  remove_textarea_child(textarea);
  bind_this(textarea, ($$value) => set(textareaEl, $$value), () => get2(textareaEl));
  var node_3 = sibling(textarea, 2);
  {
    var consequent_7 = ($$anchor2) => {
      var button_2 = root_9();
      delegated("click", button_2, handleSend);
      append($$anchor2, button_2);
    };
    var alternate = ($$anchor2) => {
      var button_3 = root_10();
      delegated("click", button_3, function(...$$args) {
        $$props.onStop?.apply(this, $$args);
      });
      append($$anchor2, button_3);
    };
    if_block(node_3, ($$render) => {
      if (get2(inputEnabled)) $$render(consequent_7);
      else $$render(alternate, -1);
    });
  }
  reset(div_17);
  reset(div);
  template_effect(() => {
    set_text(text_1, get2(displayModel) || "No model");
    set_attribute2(textarea, "placeholder", get2(placeholder));
    textarea.disabled = !get2(inputEnabled);
  });
  delegated("click", button, function(...$$args) {
    $$props.onClear?.apply(this, $$args);
  });
  delegated("keydown", textarea, handleKeydown);
  delegated("input", textarea, autoGrow);
  bind_value(textarea, () => get2(inputText), ($$value) => set(inputText, $$value));
  append($$anchor, div);
  return pop($$exports);
}
delegate(["click", "keydown", "input"]);

// src/ui/chat-view.ts
var VIEW_TYPE_CHAT = "ochatting-view";
var ObsidianChatView = class extends import_obsidian7.ItemView {
  plugin;
  chatContainer;
  running = false;
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
  }
  getViewType() {
    return VIEW_TYPE_CHAT;
  }
  getDisplayText() {
    return "Chatting with AI";
  }
  getIcon() {
    return "message-circle";
  }
  async onOpen() {
    const container = this.contentEl;
    container.empty();
    container.addClass("ochatting-view-container");
    this.chatContainer = mount(
      ChatContainer,
      {
        target: container,
        props: {
          app: this.app,
          component: this,
          provider: this.plugin.settings.provider,
          model: getModelDisplayName(this.plugin.settings.provider, this.plugin.settings.model),
          onSend: (text2, selection) => {
            void this.handleUserMessage(text2, selection);
          },
          onClear: () => this.handleClear(),
          onStop: () => this.handleStop()
        }
      }
    );
    for (const msg of this.plugin.chatHistory) {
      switch (msg.type) {
        case "user":
          this.chatContainer.addUserMessage(msg.text);
          break;
        case "assistant":
          this.chatContainer.addAssistantMessage(msg.text);
          break;
        case "tool-result":
          if (msg.toolName && msg.toolResult) {
            const id = this.chatContainer.addToolCall(msg.toolName, msg.toolInput || {});
            this.chatContainer.updateToolResult(id, msg.toolName, msg.toolResult);
          }
          break;
        case "error":
          this.chatContainer.addError(msg.text);
          break;
      }
    }
    this.chatContainer.focus();
  }
  async onClose() {
    this.plugin.agent.abort();
    if (this.chatContainer) {
      await unmount(this.chatContainer);
      this.chatContainer = void 0;
    }
  }
  /** Export the full transcript for debugging */
  getTranscript() {
    return this.plugin.agent.exportTranscript();
  }
  /** Programmatically send a message */
  sendMessage(text2) {
    void this.handleUserMessage(text2, this.chatContainer?.getSelection() ?? null);
  }
  /** Set the selection scope and show the pill */
  setSelection(selection) {
    this.chatContainer?.setSelection(selection);
  }
  /** Focus the input */
  focus() {
    this.chatContainer?.focus();
  }
  /** Update the model display name in the header */
  updateModel(name) {
    this.chatContainer?.setModel(name);
  }
  /** Clear conversation */
  clearConversation() {
    this.handleClear();
  }
  async handleUserMessage(text2, selection) {
    if (this.running) {
      new import_obsidian7.Notice("Please wait for the current response to complete.");
      return;
    }
    const chat = this.chatContainer;
    const history = this.plugin.chatHistory;
    this.running = true;
    chat.addUserMessage(text2);
    history.push({ type: "user", text: text2 });
    chat.setInputEnabled(false);
    const toolCallIds = /* @__PURE__ */ new Map();
    try {
      await this.plugin.agent.run(text2, {
        onThinking: () => {
          chat.showThinking();
        },
        onToolCall: (name, input) => {
          chat.hideThinking();
          if (name === "ask_user") return;
          const msgId = chat.addToolCall(name, input);
          toolCallIds.set(`latest-${name}`, msgId);
        },
        onToolResult: (name, result) => {
          if (name === "ask_user") return;
          const msgId = toolCallIds.get(`latest-${name}`);
          if (msgId !== void 0) {
            chat.updateToolResult(msgId, name, result);
          }
          history.push({ type: "tool-result", toolName: name, toolInput: {}, toolResult: result });
        },
        onResponse: (text3) => {
          chat.hideThinking();
          chat.addAssistantMessage(text3);
          history.push({ type: "assistant", text: text3 });
        },
        onAskUser: async (question) => {
          chat.hideThinking();
          chat.setInputEnabled(true);
          const answer = await chat.showAskUser(question);
          chat.setInputEnabled(false);
          return answer;
        },
        onError: (error) => {
          chat.hideThinking();
          chat.addError(error);
          history.push({ type: "error", text: error });
        }
      }, selection);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      chat.addError(`Unexpected error: ${msg}`);
      history.push({ type: "error", text: `Unexpected error: ${msg}` });
    } finally {
      this.running = false;
      chat.setInputEnabled(true);
      chat.focus();
      void this.plugin.saveChatHistory();
    }
  }
  handleStop() {
    this.plugin.agent.abort();
    this.running = false;
    const chat = this.chatContainer;
    if (chat) {
      chat.hideThinking();
      chat.setInputEnabled(true);
      chat.focus();
    }
    void this.plugin.saveChatHistory();
  }
  handleClear() {
    this.plugin.agent.abort();
    this.plugin.agent.clear();
    this.plugin.chatHistory = [];
    this.chatContainer?.clearMessages();
    this.running = false;
    this.chatContainer?.setInputEnabled(true);
    void this.plugin.saveChatHistory();
  }
};

// src/agent/loop.ts
var import_obsidian10 = require("obsidian");
init_client();
init_openai();
init_chatgpt_oauth();

// src/tools/registry.ts
var TOOL_DEFINITIONS = [
  {
    name: "read_document",
    description: "Read the content of a markdown document. If no path is given, reads the currently active document.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path to the document relative to vault root. Omit to read the active document."
        }
      },
      required: []
    }
  },
  {
    name: "edit_document",
    description: "Edit a markdown document. Supports three operations: 'replace_all' replaces the entire content, 'find_replace' finds a specific string and replaces it, 'insert' adds content at a position.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path to the document. Omit to edit the active document."
        },
        operation: {
          type: "string",
          enum: ["replace_all", "find_replace", "insert"],
          description: "The type of edit to perform."
        },
        content: {
          type: "string",
          description: "The new content (for replace_all), replacement text (for find_replace), or text to insert."
        },
        find: {
          type: "string",
          description: "The exact text to find (required for find_replace)."
        },
        position: {
          type: "string",
          enum: ["beginning", "end", "after_frontmatter"],
          description: "Where to insert content (required for insert). 'after_frontmatter' inserts after the --- block."
        }
      },
      required: ["operation", "content"]
    }
  },
  {
    name: "search_vault",
    description: "Search for files in the vault by filename or content. Returns matching file paths and snippets.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query (matched against filenames and optionally content)."
        },
        searchContent: {
          type: "boolean",
          description: "Whether to also search inside file contents (slower). Default: false."
        },
        limit: {
          type: "number",
          description: "Maximum results to return. Default: 10."
        }
      },
      required: ["query"]
    }
  },
  {
    name: "read_file",
    description: "Read the full content of any file in the vault by its path.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path to the file relative to vault root."
        }
      },
      required: ["path"]
    }
  },
  {
    name: "create_file",
    description: "Create a new file in the vault. Fails if the file already exists. IMPORTANT: The filename is the title in Obsidian, so never start content with an H1 heading that repeats the filename.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path for the new file relative to vault root (e.g. 'Notes/meeting.md')."
        },
        content: {
          type: "string",
          description: "Content of the new file."
        }
      },
      required: ["path", "content"]
    }
  },
  {
    name: "list_files",
    description: "List files in the vault, optionally filtered by folder and/or extension.",
    inputSchema: {
      type: "object",
      properties: {
        folder: {
          type: "string",
          description: "Folder path to list (e.g. 'Projects'). Omit to list all files."
        },
        extension: {
          type: "string",
          description: "Filter by file extension (e.g. 'md'). Omit to include all types."
        }
      },
      required: []
    }
  },
  {
    name: "rename_file",
    description: "Rename or move a file in the vault. Can be used to rename a note or move it to a different folder.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Current path of the file relative to vault root."
        },
        new_path: {
          type: "string",
          description: "New path for the file relative to vault root."
        }
      },
      required: ["path", "new_path"]
    }
  },
  {
    name: "delete_file",
    description: "Move a file to the Obsidian trash. Use with caution.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path of the file to delete relative to vault root."
        }
      },
      required: ["path"]
    }
  },
  {
    name: "get_properties",
    description: "Read the YAML frontmatter properties of a markdown document as structured data. Returns tags, aliases, and all custom properties.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path to the document. Omit to use the active document."
        }
      },
      required: []
    }
  },
  {
    name: "set_properties",
    description: "Set or update YAML frontmatter properties on a markdown document. Merges with existing properties. Set a value to null to remove a property.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path to the document. Omit to use the active document."
        },
        properties: {
          type: "object",
          description: "Key-value pairs to set in the frontmatter. Arrays (like tags) are supported. Set a value to null to remove that property."
        }
      },
      required: ["properties"]
    }
  },
  {
    name: "get_backlinks",
    description: "Find all notes in the vault that link to a given document. Uses Obsidian's metadata cache for fast lookups.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path to the document. Omit to use the active document."
        }
      },
      required: []
    }
  },
  {
    name: "get_current_datetime",
    description: "Get the current date and time in the user's local timezone. Useful for daily notes, journaling, scheduling, or any time-aware task.",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "open_document",
    description: "Open a document in the Obsidian editor. Use this when the user wants to navigate to, view, or open a specific file.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path to the file relative to vault root."
        }
      },
      required: ["path"]
    }
  },
  {
    name: "ask_user",
    description: "Ask the user a clarifying question. Use this when you need more information before proceeding. The conversation will pause until the user responds.",
    inputSchema: {
      type: "object",
      properties: {
        question: {
          type: "string",
          description: "The question to ask the user."
        }
      },
      required: ["question"]
    }
  }
];

// src/tools/executor.ts
var import_obsidian8 = require("obsidian");
async function executeTool(app, toolName, input, onAskUser) {
  try {
    switch (toolName) {
      case "read_document":
        return await readDocument(app, input);
      case "edit_document":
        return await editDocument(app, input);
      case "search_vault":
        return await searchVault(app, input);
      case "read_file":
        return await readFile(app, input);
      case "create_file":
        return await createFile(app, input);
      case "list_files":
        return await listFiles(app, input);
      case "rename_file":
        return await renameFile(app, input);
      case "delete_file":
        return await deleteFile(app, input);
      case "get_properties":
        return await getProperties(app, input);
      case "set_properties":
        return await setProperties(app, input);
      case "get_backlinks":
        return await getBacklinks(app, input);
      case "get_current_datetime":
        return getCurrentDatetime();
      case "open_document":
        return await openDocument(app, input);
      case "ask_user":
        return await askUser(input, onAskUser);
      default:
        return { result: `Unknown tool: ${toolName}`, isError: true };
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { result: `Tool error: ${msg}`, isError: true };
  }
}
function resolveFile(app, path) {
  if (path) {
    return app.vault.getFileByPath((0, import_obsidian8.normalizePath)(path));
  }
  return app.workspace.getActiveFile();
}
async function ensureParentFolder(app, filePath) {
  const parentPath = filePath.substring(0, filePath.lastIndexOf("/"));
  if (parentPath && !app.vault.getFolderByPath(parentPath)) {
    await app.vault.createFolder(parentPath);
  }
}
function findFrontmatterEnd(content) {
  if (!content.startsWith("---")) return -1;
  const secondDash = content.indexOf("---", 3);
  if (secondDash === -1) return -1;
  return secondDash + 3;
}
function optionalString(value) {
  return typeof value === "string" && value.length > 0 ? value : void 0;
}
function requiredString(value) {
  return typeof value === "string" ? value : "";
}
function requiredRecord(value) {
  return isRecord5(value) ? value : null;
}
function isRecord5(value) {
  return typeof value === "object" && value !== null;
}
async function readDocument(app, input) {
  const path = optionalString(input.path);
  const file = resolveFile(app, path);
  if (!file) {
    return { result: path ? `File not found: ${path}` : "No active document open.", isError: true };
  }
  const content = await app.vault.cachedRead(file);
  return { result: `# ${file.path}

${content}`, isError: false };
}
async function editDocument(app, input) {
  const operation = requiredString(input.operation);
  const content = requiredString(input.content);
  const find = optionalString(input.find);
  const position = optionalString(input.position);
  const path = optionalString(input.path);
  const file = resolveFile(app, path);
  if (!file) {
    return { result: path ? `File not found: ${path}` : "No active document open.", isError: true };
  }
  switch (operation) {
    case "replace_all":
      await app.vault.modify(file, content);
      return { result: `Replaced all content in ${file.path}.`, isError: false };
    case "find_replace": {
      if (!find) {
        return { result: "'find' parameter is required for find_replace.", isError: true };
      }
      let resultMsg = "";
      let found = false;
      await app.vault.process(file, (data) => {
        const idx = data.indexOf(find);
        if (idx === -1) {
          found = false;
          return data;
        }
        found = true;
        const secondIdx = data.indexOf(find, idx + 1);
        if (secondIdx !== -1) {
          resultMsg = "[Note: Multiple matches found, replacing first occurrence.]\n";
        }
        return data.substring(0, idx) + content + data.substring(idx + find.length);
      });
      if (!found) {
        return {
          result: "Could not find the specified text. Make sure it matches exactly (including whitespace and line breaks).",
          isError: true
        };
      }
      return { result: `${resultMsg}Successfully replaced text in ${file.path}.`, isError: false };
    }
    case "insert": {
      if (!position) {
        return { result: "'position' parameter is required for insert.", isError: true };
      }
      await app.vault.process(file, (data) => {
        switch (position) {
          case "beginning":
            return content + "\n" + data;
          case "end":
            return data + "\n" + content;
          case "after_frontmatter": {
            const fmEnd = findFrontmatterEnd(data);
            if (fmEnd === -1) return content + "\n" + data;
            return data.substring(0, fmEnd) + "\n" + content + data.substring(fmEnd);
          }
          default:
            return data;
        }
      });
      if (position !== "beginning" && position !== "end" && position !== "after_frontmatter") {
        return { result: `Unknown position: ${position}`, isError: true };
      }
      return { result: `Inserted content at ${position} of ${file.path}.`, isError: false };
    }
    default:
      return { result: `Unknown operation: ${operation}`, isError: true };
  }
}
async function searchVault(app, input) {
  const query = requiredString(input.query).toLowerCase();
  const searchContent = input.searchContent;
  const limit = Math.min(input.limit || 10, 50);
  const files = app.vault.getMarkdownFiles();
  const results = [];
  for (const file of files) {
    if (results.length >= limit) break;
    if (file.path.toLowerCase().includes(query)) {
      results.push(`- ${file.path}`);
      continue;
    }
    if (searchContent) {
      const content = await app.vault.cachedRead(file);
      const lowerContent = content.toLowerCase();
      const idx = lowerContent.indexOf(query);
      if (idx !== -1) {
        const start = Math.max(0, idx - 50);
        const end = Math.min(content.length, idx + query.length + 50);
        const snippet2 = content.substring(start, end).replace(/\n/g, " ");
        results.push(`- ${file.path}: ...${snippet2}...`);
      }
    }
  }
  if (results.length === 0) {
    return { result: `No results found for "${query}".`, isError: false };
  }
  return {
    result: `Found ${results.length} result(s):
${results.join("\n")}`,
    isError: false
  };
}
async function readFile(app, input) {
  const path = requiredString(input.path);
  if (!path) {
    return { result: "'path' parameter is required.", isError: true };
  }
  const file = app.vault.getFileByPath((0, import_obsidian8.normalizePath)(path));
  if (!file) {
    return { result: `File not found: ${path}`, isError: true };
  }
  const content = await app.vault.cachedRead(file);
  return { result: content, isError: false };
}
async function createFile(app, input) {
  const path = (0, import_obsidian8.normalizePath)(requiredString(input.path));
  const content = requiredString(input.content);
  if (!path) {
    return { result: "'path' parameter is required.", isError: true };
  }
  if (app.vault.getFileByPath(path)) {
    return { result: `File already exists: ${path}. Use edit_document to modify it.`, isError: true };
  }
  await ensureParentFolder(app, path);
  await app.vault.create(path, content || "");
  return { result: `Created ${path}.`, isError: false };
}
async function listFiles(app, input) {
  const folder = optionalString(input.folder);
  const extension = optionalString(input.extension);
  let files = app.vault.getFiles();
  if (folder) {
    const normalizedFolder = (0, import_obsidian8.normalizePath)(folder);
    files = files.filter(
      (f) => f.path.startsWith(normalizedFolder + "/") || f.path === normalizedFolder
    );
  }
  if (extension) {
    const ext = extension.startsWith(".") ? extension : `.${extension}`;
    files = files.filter((f) => f.path.endsWith(ext));
  }
  const paths = files.map((f) => f.path).sort();
  const capped = paths.slice(0, 100);
  const suffix = paths.length > 100 ? `

(Showing 100 of ${paths.length} files)` : "";
  if (capped.length === 0) {
    return { result: "No files found matching the criteria.", isError: false };
  }
  return {
    result: capped.map((p) => `- ${p}`).join("\n") + suffix,
    isError: false
  };
}
async function renameFile(app, input) {
  const path = requiredString(input.path);
  const newPath = requiredString(input.new_path);
  if (!path || !newPath) {
    return { result: "Both 'path' and 'new_path' parameters are required.", isError: true };
  }
  const file = app.vault.getAbstractFileByPath((0, import_obsidian8.normalizePath)(path));
  if (!file) {
    return { result: `File not found: ${path}`, isError: true };
  }
  const normalizedNew = (0, import_obsidian8.normalizePath)(newPath);
  if (app.vault.getAbstractFileByPath(normalizedNew)) {
    return { result: `A file already exists at: ${normalizedNew}`, isError: true };
  }
  await ensureParentFolder(app, normalizedNew);
  await app.fileManager.renameFile(file, normalizedNew);
  return { result: `Renamed ${path} to ${normalizedNew}.`, isError: false };
}
async function deleteFile(app, input) {
  const path = requiredString(input.path);
  if (!path) {
    return { result: "'path' parameter is required.", isError: true };
  }
  const file = app.vault.getAbstractFileByPath((0, import_obsidian8.normalizePath)(path));
  if (!file) {
    return { result: `File not found: ${path}`, isError: true };
  }
  await app.fileManager.trashFile(file);
  return { result: `Moved ${path} to trash.`, isError: false };
}
async function getProperties(app, input) {
  const path = optionalString(input.path);
  const file = resolveFile(app, path);
  if (!file) {
    return { result: path ? `File not found: ${path}` : "No active document open.", isError: true };
  }
  const cache = app.metadataCache.getFileCache(file);
  const frontmatter = cache?.frontmatter;
  if (!frontmatter) {
    return { result: `No frontmatter properties found in ${file.path}.`, isError: false };
  }
  const clean = { ...frontmatter };
  delete clean.position;
  return { result: JSON.stringify(clean, null, 2), isError: false };
}
async function setProperties(app, input) {
  const props = requiredRecord(input.properties);
  if (!props) {
    return { result: "'properties' parameter must be an object.", isError: true };
  }
  const path = optionalString(input.path);
  const file = resolveFile(app, path);
  if (!file) {
    return { result: path ? `File not found: ${path}` : "No active document open.", isError: true };
  }
  await app.fileManager.processFrontMatter(file, (frontmatter) => {
    for (const [key2, value] of Object.entries(props)) {
      if (value === null) {
        delete frontmatter[key2];
      } else {
        frontmatter[key2] = value;
      }
    }
  });
  const setKeys = Object.entries(props).filter(([, v]) => v !== null).map(([k]) => k);
  const removedKeys = Object.entries(props).filter(([, v]) => v === null).map(([k]) => k);
  const parts = [];
  if (setKeys.length > 0) parts.push(`Set: ${setKeys.join(", ")}`);
  if (removedKeys.length > 0) parts.push(`Removed: ${removedKeys.join(", ")}`);
  return { result: `Updated properties in ${file.path}. ${parts.join(". ")}.`, isError: false };
}
async function getBacklinks(app, input) {
  const path = optionalString(input.path);
  const file = resolveFile(app, path);
  if (!file) {
    return { result: path ? `File not found: ${path}` : "No active document open.", isError: true };
  }
  const allLinks = app.metadataCache.resolvedLinks;
  const backlinks = [];
  for (const [sourcePath, targets] of Object.entries(allLinks)) {
    if (targets[file.path]) {
      backlinks.push(sourcePath);
    }
  }
  if (backlinks.length === 0) {
    return { result: `No backlinks found for ${file.path}.`, isError: false };
  }
  backlinks.sort();
  return {
    result: `${backlinks.length} note(s) link to ${file.path}:
${backlinks.map((p) => `- ${p}`).join("\n")}`,
    isError: false
  };
}
function getCurrentDatetime() {
  const now = /* @__PURE__ */ new Date();
  const iso = now.toISOString();
  const local = now.toLocaleString(void 0, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short"
  });
  const dateOnly = now.toISOString().split("T")[0];
  return {
    result: `Local: ${local}
ISO: ${iso}
Date: ${dateOnly}`,
    isError: false
  };
}
async function openDocument(app, input) {
  const path = requiredString(input.path);
  if (!path) {
    return { result: "'path' parameter is required.", isError: true };
  }
  const file = app.vault.getFileByPath((0, import_obsidian8.normalizePath)(path));
  if (!file) {
    return { result: `File not found: ${path}`, isError: true };
  }
  const leaf = app.workspace.getLeaf(false);
  await leaf.openFile(file);
  return { result: `Opened ${file.path}.`, isError: false };
}
async function askUser(input, onAskUser) {
  const question = requiredString(input.question);
  if (!question) {
    return { result: "'question' parameter is required.", isError: true };
  }
  const answer = await onAskUser(question);
  return { result: answer, isError: false };
}

// src/agent/context.ts
var import_obsidian9 = require("obsidian");
function buildContext(app) {
  const activeFile = app.workspace.getActiveFile();
  let activeFileContent = null;
  let selection = null;
  const editor = app.workspace.activeEditor?.editor;
  if (editor) {
    const sel = editor.getSelection();
    if (sel && sel.length > 0) {
      selection = sel;
    }
  }
  return {
    activeFile: activeFile?.path ?? null,
    activeFileContent,
    // Populated lazily by the loop if needed
    selection,
    vaultName: app.vault.getName(),
    fileCount: app.vault.getMarkdownFiles().length
  };
}

// src/agent/system-prompt.ts
var STATIC_PROMPT = `You are Chatting with AI, an AI assistant embedded in Obsidian. You help users read, edit, create, and organize their notes.

## Guidelines
- Always read a document before editing it. Never guess at content.
- Prefer find_replace over replace_all to make surgical edits.
- When find_replace fails, read the document again to get the exact text.
- CRITICAL: In Obsidian, the filename IS the title (displayed as an inline H1). NEVER write an H1 heading (# Title) in document content. Start body content at H2 (##) or plain text. This applies to create_file, edit_document, and any content you write.
- When writing into an Untitled document, ALWAYS rename it first using rename_file to give it a descriptive title that reflects the content. Then write the body starting at H2 or plain text.
- When creating new files, choose a descriptive filename (the title) and a sensible path based on vault structure. The filename alone serves as the title.
- Keep responses concise. The user is often on mobile.
- For multi-step edits, explain your plan briefly before starting.
- If a search returns no results, try alternative queries or ask the user.

## Being Decisive
- Be action-oriented. When you can do something, just do it.
- When the user confirms a suggestion (e.g. "yes", "do it", "yes please"), execute immediately. Do NOT re-ask via ask_user.
- Only use ask_user when the request is genuinely ambiguous and you cannot infer the answer from context.
- Never ask for confirmation before using a tool. Just use it. The user can see what you did.
- If you suggest something and the user agrees, proceed with exactly what you suggested. Don't second-guess.

## Formatting
- This is a casual chat, not a document. Write conversationally.
- Never use backtick code formatting for filenames, paths, or note titles. Write them as plain text.
- Only use backticks for actual code snippets or technical commands.
- Use bold sparingly for emphasis, not for every noun.
- Keep summaries to 2-3 sentences unless more detail is requested.`;
function buildSystemPrompt() {
  return STATIC_PROMPT;
}
function buildContextMessage(context) {
  const parts = [
    `[Context: Vault "${context.vaultName}" with ${context.fileCount} markdown files.`
  ];
  if (context.activeFile) {
    parts.push(`Active document: ${context.activeFile}.`);
  }
  if (context.selection) {
    const truncated = context.selection.substring(0, 200);
    parts.push(`Selected text: "${truncated}${context.selection.length > 200 ? "..." : ""}".`);
  }
  parts.push("]");
  return parts.join(" ");
}

// src/agent/loop.ts
var MAX_CONVERSATION_LENGTH = 50;
var KEEP_RECENT = 40;
var DEBUG = true;
function debugLog(app, label, data) {
  if (!DEBUG) return;
  try {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    const entry = `
--- ${label} [${timestamp}] ---
${JSON.stringify(data, null, 2)}
`;
    void app.vault.adapter.append(
      `${app.vault.configDir}/plugins/chatting-with-ai/debug.log`,
      entry
    );
  } catch {
  }
}
var AgentLoop = class {
  messages = [];
  app;
  settings;
  aborted = false;
  constructor(app, settings) {
    this.app = app;
    this.settings = settings;
  }
  /** Abort a running loop (e.g. user navigates away) */
  abort() {
    this.aborted = true;
  }
  /** Clear conversation history */
  clear() {
    this.messages = [];
    this.aborted = false;
    clearOpenAIState();
    clearChatGPTOAuthState();
  }
  /** Export API messages for persistence */
  exportMessages() {
    return this.messages;
  }
  /** Restore API messages from persistence */
  importMessages(messages) {
    this.messages = messages;
  }
  /** Export the full conversation as a readable markdown transcript */
  exportTranscript() {
    const systemPrompt = buildSystemPrompt();
    const parts = [
      `# Chatting with AI Transcript`,
      ``,
      `**Date:** ${(/* @__PURE__ */ new Date()).toISOString()}`,
      `**Provider:** ${this.settings.provider}`,
      `**Model:** ${this.settings.model}`,
      ``,
      `## System Prompt`,
      ``,
      "```",
      systemPrompt,
      "```",
      ``,
      `## Conversation`,
      ``
    ];
    for (const msg of this.messages) {
      if (typeof msg.content === "string") {
        parts.push(`### ${msg.role === "user" ? "User" : "Assistant"}`);
        parts.push(``);
        parts.push(msg.content);
        parts.push(``);
      } else {
        for (const block2 of msg.content) {
          if (block2.type === "text" && block2.text) {
            parts.push(`### Assistant`);
            parts.push(``);
            parts.push(block2.text);
            parts.push(``);
          } else if (block2.type === "tool_use") {
            parts.push(`### Tool Call: \`${block2.name}\``);
            parts.push(``);
            parts.push("```json");
            parts.push(JSON.stringify(block2.input, null, 2));
            parts.push("```");
            parts.push(``);
          } else if (block2.type === "tool_result") {
            parts.push(`### Tool Result ${block2.is_error ? "(ERROR)" : ""}`);
            parts.push(``);
            parts.push("```");
            parts.push(block2.content || "(empty)");
            parts.push("```");
            parts.push(``);
          }
        }
      }
    }
    return parts.join("\n");
  }
  /** Run one user turn through the agentic loop */
  async run(userMessage, callbacks, selection) {
    this.aborted = false;
    const context = buildContext(this.app);
    const contextPrefix = buildContextMessage(context);
    let fullMessage;
    if (selection) {
      fullMessage = [
        contextPrefix,
        "",
        `[Selection scope: The user has selected text in ${selection.filePath}. Work only within this selection. When using edit_document, use find_replace with text from within this selection. Do not modify text outside the selection.]`,
        "",
        `Selected text:`,
        `> ${selection.text}`,
        "",
        userMessage
      ].join("\n");
    } else {
      fullMessage = `${contextPrefix}

${userMessage}`;
    }
    this.messages.push({ role: "user", content: fullMessage });
    this.pruneHistory();
    const systemPrompt = buildSystemPrompt();
    debugLog(this.app, "USER_MESSAGE", { userMessage, hasSelection: !!selection });
    const maxIterations = this.settings.maxIterations || 20;
    for (let i = 0; i < maxIterations; i++) {
      if (this.aborted) return;
      callbacks.onThinking();
      let response;
      try {
        response = await sendMessage(
          this.settings,
          this.messages,
          TOOL_DEFINITIONS,
          systemPrompt
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        debugLog(this.app, "API_ERROR", { error: msg, model: this.settings.model, provider: this.settings.provider });
        callbacks.onError(msg);
        return;
      }
      debugLog(this.app, "API_RESPONSE", { stopReason: response.stopReason, contentTypes: response.content.map((b) => b.type), usage: response.usage });
      if (this.aborted) return;
      const toolCalls = [];
      const textParts = [];
      for (const block2 of response.content) {
        if (block2.type === "text" && block2.text) {
          textParts.push(block2.text);
        } else if (block2.type === "tool_use") {
          toolCalls.push(block2);
        }
      }
      const hasAskUser = toolCalls.some((tc) => tc.name === "ask_user");
      if (textParts.length > 0 && toolCalls.length > 0 && !hasAskUser) {
        callbacks.onResponse(textParts.join(""));
      }
      this.messages.push({ role: "assistant", content: response.content });
      if (toolCalls.length === 0) {
        if (textParts.length > 0) {
          callbacks.onResponse(textParts.join(""));
        }
        return;
      }
      const resultBlocks = [];
      for (const tc of toolCalls) {
        if (this.aborted) return;
        callbacks.onToolCall(tc.name, tc.input);
        const result = await executeTool(
          this.app,
          tc.name,
          tc.input,
          callbacks.onAskUser
        );
        callbacks.onToolResult(tc.name, result);
        resultBlocks.push({
          type: "tool_result",
          tool_use_id: tc.id,
          content: result.result,
          is_error: result.isError
        });
      }
      this.messages.push({ role: "user", content: resultBlocks });
    }
    callbacks.onError(
      `Reached maximum iterations (${maxIterations}). The task may be too complex for a single conversation turn.`
    );
  }
  /** Drop oldest messages when conversation gets too long, keeping recent context */
  pruneHistory() {
    if (this.messages.length > MAX_CONVERSATION_LENGTH) {
      this.messages = this.messages.slice(-KEEP_RECENT);
    }
  }
};

// src/auth/chatgptOAuthStore.ts
var OAUTH_SECRET_KEY = "chatting-with-ai-chatgpt-oauth";
var LEGACY_OAUTH_SECRET_KEY = "obsidian-chatting-chatgpt-oauth";
var EXPIRY_BUFFER_MS = 3e4;
var ChatGPTOAuthStore = class {
  constructor(app) {
    this.app = app;
  }
  /** Read the stored credential. Returns null if absent or malformed. */
  get() {
    let raw = null;
    try {
      raw = this.app.secretStorage.getSecret(OAUTH_SECRET_KEY) ?? this.app.secretStorage.getSecret(LEGACY_OAUTH_SECRET_KEY) ?? null;
    } catch {
      return null;
    }
    if (!raw) return null;
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
    if (typeof parsed.accessToken !== "string" || typeof parsed.refreshToken !== "string" || typeof parsed.expiresAt !== "number" || typeof parsed.updatedAt !== "number") {
      return null;
    }
    return {
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
      expiresAt: parsed.expiresAt,
      updatedAt: parsed.updatedAt,
      ...typeof parsed.accountId === "string" ? { accountId: parsed.accountId } : {},
      ...typeof parsed.idToken === "string" ? { idToken: parsed.idToken } : {}
    };
  }
  /** Write the credential. */
  set(credential) {
    try {
      this.app.secretStorage.setSecret(OAUTH_SECRET_KEY, JSON.stringify(credential));
    } catch {
    }
  }
  /** Erase the credential. SecretStorage has no delete API, so we overwrite with empty. */
  clear() {
    try {
      this.app.secretStorage.setSecret(OAUTH_SECRET_KEY, "");
    } catch {
    }
  }
  /** True if the access token has already expired (or expires within ~30s). */
  isExpired(credential) {
    return credential.expiresAt <= Date.now() + EXPIRY_BUFFER_MS;
  }
};

// src/main.ts
init_chatgptOAuth();
init_chatgpt_oauth();
var PLUGIN_ID = "chatting-with-ai";
var LEGACY_PLUGIN_ID = "obsidian-chatting";
var LEGACY_RELEASE_ASSETS = /* @__PURE__ */ new Set(["main.js", "manifest.json", "styles.css"]);
var SECRET_PROVIDERS = ["anthropic", "openai", "chatgpt-oauth"];
var CHATGPT_OAUTH_SECRET_KEY = `${PLUGIN_ID}-chatgpt-oauth`;
var LEGACY_CHATGPT_OAUTH_SECRET_KEY = `${LEGACY_PLUGIN_ID}-chatgpt-oauth`;
var ChatPlugin = class extends import_obsidian11.Plugin {
  settings = DEFAULT_SETTINGS;
  /** Shared agent loop that persists across view open/close cycles */
  agent;
  /** ChatGPT OAuth service (used by the chatgpt-oauth provider). */
  chatgptOAuth;
  /** Chat messages for replaying into the UI when the view reopens */
  chatHistory = [];
  async onload() {
    await this.migrateLegacyPluginData();
    await this.loadSettings();
    const oauthStore = new ChatGPTOAuthStore(this.app);
    this.chatgptOAuth = new ChatGPTOAuthService(oauthStore);
    setChatGPTOAuthService(this.chatgptOAuth);
    this.agent = new AgentLoop(this.app, this.settings);
    await this.loadChatHistory();
    this.addSettingTab(new ChatSettingTab(this.app, this));
    this.registerView(VIEW_TYPE_CHAT, (leaf) => new ObsidianChatView(leaf, this));
    this.addRibbonIcon("message-circle", "Open Chatting with AI", (evt) => {
      if (evt.type === "contextmenu" || evt.button === 2) {
        const menu = new import_obsidian11.Menu();
        menu.addItem(
          (item) => item.setTitle("Open chat").setIcon("message-circle").onClick(() => void this.openChat())
        );
        menu.addItem(
          (item) => item.setTitle("Chat about active note").setIcon("file-text").onClick(() => void this.chatAboutActiveNote())
        );
        menu.addItem(
          (item) => item.setTitle("Copy transcript").setIcon("clipboard").onClick(() => this.shareTranscript())
        );
        menu.showAtMouseEvent(evt);
      } else {
        void this.openChat();
      }
    });
    this.addCommand({
      id: "open-chat",
      name: "Open chat",
      callback: () => void this.openChat()
    });
    this.addCommand({
      id: "copy-transcript",
      name: "Copy conversation transcript to clipboard",
      callback: () => this.shareTranscript()
    });
    this.addCommand({
      id: "clear-chat",
      name: "Clear conversation",
      callback: () => this.clearChat()
    });
    this.addCommand({
      id: "chat-about-note",
      name: "Chat about this note",
      editorCallback: (editor, ctx) => {
        void this.openChatWithMessage(`Summarize this note: ${ctx.file?.path ?? "the active document"}`);
      }
    });
    this.addCommand({
      id: "send-selection",
      name: "Send selection to Chat",
      editorCheckCallback: (checking, editor, ctx) => {
        const sel = editor.getSelection();
        if (!sel || sel.length === 0) return false;
        if (checking) return true;
        const scope = { text: sel, filePath: ctx.file?.path ?? "" };
        void this.openChatWithSelection(scope);
        return true;
      }
    });
    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file) => {
        if (!(file instanceof import_obsidian11.TFile) || file.extension !== "md") return;
        menu.addItem(
          (item) => item.setTitle("Chat about this note").setIcon("message-circle").onClick(() => void this.openChatWithMessage(`Tell me about ${file.path}`))
        );
      })
    );
    this.registerEvent(
      this.app.workspace.on("editor-menu", (menu, editor, info) => {
        const sel = editor.getSelection();
        if (sel && sel.length > 0) {
          menu.addItem(
            (item) => item.setTitle("Send selection to Chat").setIcon("message-circle").onClick(() => {
              const scope = { text: sel, filePath: info.file?.path ?? "" };
              void this.openChatWithSelection(scope);
            })
          );
        }
      })
    );
  }
  onunload() {
    void this.saveChatHistory();
  }
  // ─── Chat operations ────────────────────────────────────────────────
  /**
   * True if the active provider is configured enough to send a message.
   * - anthropic / openai: an API key is set.
   * - chatgpt-oauth: a credential is present in SecretStorage.
   */
  isProviderConfigured() {
    if (this.settings.provider === "chatgpt-oauth") {
      return !!this.chatgptOAuth?.getCredential();
    }
    return !!this.settings.apiKey;
  }
  notConfiguredMessage() {
    if (this.settings.provider === "chatgpt-oauth") {
      return "Connect your ChatGPT account in Chatting with AI settings.";
    }
    return "Please configure your API key in Chatting with AI settings.";
  }
  async openChat() {
    if (!this.isProviderConfigured()) {
      new import_obsidian11.Notice(this.notConfiguredMessage());
      return;
    }
    await this.activateView();
  }
  /** Open chat and immediately send a message */
  async openChatWithMessage(message) {
    if (!this.isProviderConfigured()) {
      new import_obsidian11.Notice(this.notConfiguredMessage());
      return;
    }
    await this.activateView();
    const view = this.getChatView();
    if (view) {
      window.setTimeout(() => view.sendMessage(message), 100);
    }
  }
  /** Open chat with a selection scope (shows pill, user types their own question) */
  async openChatWithSelection(selection) {
    if (!this.isProviderConfigured()) {
      new import_obsidian11.Notice(this.notConfiguredMessage());
      return;
    }
    await this.activateView();
    const view = this.getChatView();
    if (view) {
      window.setTimeout(() => {
        view.setSelection(selection);
        view.focus();
      }, 100);
    }
  }
  async chatAboutActiveNote() {
    const file = this.app.workspace.getActiveFile();
    if (!file) {
      new import_obsidian11.Notice("No active note.");
      return;
    }
    await this.openChatWithMessage(`Tell me about ${file.path}`);
  }
  /** Open or reveal the chat view in the right sidebar (both desktop and mobile). */
  async activateView() {
    const { workspace } = this.app;
    const existing = workspace.getLeavesOfType(VIEW_TYPE_CHAT);
    if (existing.length > 0) {
      await workspace.revealLeaf(existing[0]);
      return;
    }
    const leaf = workspace.getRightLeaf(false);
    if (leaf) {
      await leaf.setViewState({ type: VIEW_TYPE_CHAT, active: true });
      await workspace.revealLeaf(leaf);
    }
  }
  /** Get the active ObsidianChatView using proper instanceof check (deferred view safe) */
  getChatView() {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_CHAT);
    for (const leaf of leaves) {
      if (leaf.view instanceof ObsidianChatView) {
        return leaf.view;
      }
    }
    return null;
  }
  shareTranscript() {
    const view = this.getChatView();
    if (!view) {
      new import_obsidian11.Notice("No active conversation.");
      return;
    }
    const transcript = view.getTranscript();
    if (!transcript || transcript.endsWith("## Conversation\n\n")) {
      new import_obsidian11.Notice("Conversation is empty.");
      return;
    }
    navigator.clipboard.writeText(transcript).then(() => {
      new import_obsidian11.Notice("Transcript copied to clipboard.");
    }).catch(() => {
      new import_obsidian11.Notice("Failed to copy transcript.");
    });
  }
  clearChat() {
    const view = this.getChatView();
    if (view) {
      view.clearConversation();
      new import_obsidian11.Notice("Conversation cleared.");
    } else {
      new import_obsidian11.Notice("No active conversation.");
    }
  }
  // ─── Chat history persistence ─────────────────────────────────────────
  async saveChatHistory() {
    try {
      const state2 = {
        chatHistory: this.chatHistory.slice(-100),
        // Cap at 100 UI messages
        agentMessages: this.agent.exportMessages().slice(-80)
        // Cap at 80 API messages
      };
      await this.app.vault.adapter.write(
        this.chatStatePath,
        JSON.stringify(state2)
      );
    } catch {
    }
  }
  async loadChatHistory() {
    try {
      const raw = await this.readFirstExisting([this.chatStatePath, this.legacyChatStatePath]);
      const state2 = JSON.parse(raw);
      if (!isPersistedChatState(state2)) return;
      if (Array.isArray(state2.chatHistory)) {
        this.chatHistory = state2.chatHistory;
      }
      if (Array.isArray(state2.agentMessages)) {
        this.agent.importMessages(state2.agentMessages);
      }
    } catch {
    }
  }
  // ─── Settings persistence ────────────────────────────────────────────
  async loadSettings() {
    const saved = normalizeSettings(await this.loadData());
    this.settings = { ...DEFAULT_SETTINGS, ...saved };
    if (!this.settings.model) {
      this.settings.model = DEFAULT_SETTINGS.model;
    }
    if (this.settings.provider === "chatgpt-oauth") {
      const migrated = migrateChatGPTOAuthModelSlug(this.settings.model);
      if (migrated !== this.settings.model) {
        this.settings.model = migrated;
        this.saveData({ ...this.settings, apiKey: "" }).catch(() => {
        });
      }
    }
    this.settings.apiKey = this.loadApiKey(this.settings.provider);
  }
  async saveSettings() {
    this.saveApiKey(this.settings.provider, this.settings.apiKey || "");
    const toSave = { ...this.settings, apiKey: "" };
    await this.saveData(toSave);
    this.getChatView()?.updateModel(
      getModelDisplayName(this.settings.provider, this.settings.model)
    );
  }
  /** Load the correct API key when provider changes */
  reloadApiKeyForProvider() {
    this.settings.apiKey = this.loadApiKey(this.settings.provider);
  }
  loadApiKey(provider) {
    try {
      return this.app.secretStorage.getSecret(`${PLUGIN_ID}-api-key-${provider}`) || this.app.secretStorage.getSecret(`${LEGACY_PLUGIN_ID}-api-key-${provider}`) || "";
    } catch {
      return "";
    }
  }
  saveApiKey(provider, key2) {
    try {
      this.app.secretStorage.setSecret(`${PLUGIN_ID}-api-key-${provider}`, key2);
    } catch {
    }
  }
  async readFirstExisting(paths) {
    let lastError;
    for (const path of paths) {
      try {
        return await this.app.vault.adapter.read(path);
      } catch (e) {
        lastError = e;
      }
    }
    throw lastError;
  }
  async migrateLegacyPluginData() {
    await this.migrateLegacyDataFiles();
    this.migrateLegacySecrets();
  }
  async migrateLegacyDataFiles() {
    const adapter = this.app.vault.adapter;
    try {
      if (!await adapter.exists(this.legacyPluginDataDir)) return;
      await this.ensureFolder(this.pluginDataDir);
      await this.copyLegacyPluginDataDir(this.legacyPluginDataDir, this.pluginDataDir, true);
      await adapter.rmdir(this.legacyPluginDataDir, true);
    } catch {
    }
  }
  async copyLegacyPluginDataDir(fromDir, toDir, isRoot) {
    const adapter = this.app.vault.adapter;
    const listed = await adapter.list(fromDir);
    for (const folder of listed.folders) {
      const name = folder.split("/").pop();
      if (!name) continue;
      const target = `${toDir}/${name}`;
      await this.ensureFolder(target);
      await this.copyLegacyPluginDataDir(folder, target, false);
    }
    for (const file of listed.files) {
      const name = file.split("/").pop();
      if (!name) continue;
      if (isRoot && LEGACY_RELEASE_ASSETS.has(name)) continue;
      const target = `${toDir}/${name}`;
      if (!await adapter.exists(target)) {
        await adapter.writeBinary(target, await adapter.readBinary(file));
      }
    }
  }
  async ensureFolder(path) {
    const adapter = this.app.vault.adapter;
    if (await adapter.exists(path)) return;
    const parent = path.split("/").slice(0, -1).join("/");
    if (parent) await this.ensureFolder(parent);
    try {
      await adapter.mkdir(path);
    } catch {
    }
  }
  migrateLegacySecrets() {
    for (const provider of SECRET_PROVIDERS) {
      this.migrateSecret(
        `${PLUGIN_ID}-api-key-${provider}`,
        `${LEGACY_PLUGIN_ID}-api-key-${provider}`
      );
    }
    this.migrateSecret(CHATGPT_OAUTH_SECRET_KEY, LEGACY_CHATGPT_OAUTH_SECRET_KEY);
  }
  migrateSecret(currentKey, legacyKey) {
    try {
      const currentValue = this.app.secretStorage.getSecret(currentKey);
      const legacyValue = this.app.secretStorage.getSecret(legacyKey);
      if (legacyValue && !currentValue) {
        this.app.secretStorage.setSecret(currentKey, legacyValue);
      }
      if (legacyValue) {
        this.app.secretStorage.setSecret(legacyKey, "");
      }
    } catch {
    }
  }
  get pluginDataDir() {
    return `${this.app.vault.configDir}/plugins/${PLUGIN_ID}`;
  }
  get legacyPluginDataDir() {
    return `${this.app.vault.configDir}/plugins/${LEGACY_PLUGIN_ID}`;
  }
  get chatStatePath() {
    return `${this.pluginDataDir}/chat-state.json`;
  }
  get legacyChatStatePath() {
    return `${this.legacyPluginDataDir}/chat-state.json`;
  }
};
function isPersistedChatState(value) {
  return typeof value === "object" && value !== null;
}
function normalizeSettings(value) {
  if (!isRecord6(value)) return {};
  const settings = {};
  if (isProvider(value.provider)) settings.provider = value.provider;
  if (typeof value.apiKey === "string") settings.apiKey = value.apiKey;
  if (typeof value.model === "string") settings.model = value.model;
  if (typeof value.maxIterations === "number") settings.maxIterations = value.maxIterations;
  if (typeof value.enableWebSearch === "boolean") settings.enableWebSearch = value.enableWebSearch;
  return settings;
}
function isProvider(value) {
  return value === "anthropic" || value === "openai" || value === "chatgpt-oauth";
}
function isRecord6(value) {
  return typeof value === "object" && value !== null;
}
var KNOWN_GOOD_OAUTH_SLUGS = /* @__PURE__ */ new Set([
  "gpt-5.5",
  "gpt-5.4",
  "gpt-5.4-mini",
  "gpt-5.3-codex",
  "gpt-5.2"
]);
function migrateChatGPTOAuthModelSlug(slug) {
  if (!slug) return CHATGPT_OAUTH_DEFAULT_MODEL;
  if (KNOWN_GOOD_OAUTH_SLUGS.has(slug)) return slug;
  const dashVersion = slug.match(/^gpt-(5)-(\d+)(.*)$/);
  if (dashVersion) {
    const candidate = `gpt-${dashVersion[1]}.${dashVersion[2]}${dashVersion[3]}`;
    if (KNOWN_GOOD_OAUTH_SLUGS.has(candidate)) return candidate;
  }
  return CHATGPT_OAUTH_DEFAULT_MODEL;
}

/* nosourcemap */