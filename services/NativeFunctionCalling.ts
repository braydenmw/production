/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * BW NEXUS AI - NATIVE FUNCTION CALLING
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Replaces the brittle [[TOOL:name]]...[[/TOOL]] text-parsing approach with
 * Together.ai's native function calling via the `tools` parameter.
 *
 * The AI model sees JSON-schema tool definitions and emits structured
 * `tool_calls` in its response. We execute them and feed results back.
 *
 * This file:
 *  1. Converts existing AgentToolRegistry tools into JSON-schema format
 *  2. Handles the tool_calls → execute → feed-back loop
 *  3. Falls back to text-parsing if the model doesn't support tools
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { callTogether, type TogetherMessage, type TogetherOptions, TOGETHER_API_URL, TOGETHER_DEFAULT_MODEL } from './togetherAIService';
import { callGroq, isGroqAvailable } from './groqService';
import { AgentToolRegistry, type AgentTool, type AgentToolResult } from './agent/AgentToolRegistry';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ToolSchema {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, { type: string; description: string }>;
      required: string[];
    };
  };
}

export interface ToolCallResponse {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface FunctionCallingResult {
  finalText: string;
  toolResults: Array<{ name: string; result: AgentToolResult }>;
  totalTokensUsed: number;
}

// ─── Schema Conversion ─────────────────────────────────────────────────────

/**
 * Convert an AgentTool to a Together.ai-compatible JSON schema tool definition.
 */
function toolToSchema(tool: AgentTool): ToolSchema {
  const properties: Record<string, { type: string; description: string }> = {};
  const required: string[] = [];

  for (const [name, param] of Object.entries(tool.parameters)) {
    properties[name] = {
      type: param.type,
      description: param.description,
    };
    if (param.required) required.push(name);
  }

  return {
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: 'object',
        properties,
        required,
      },
    },
  };
}

/**
 * Convert ALL registered tools in a registry to JSON schema definitions.
 */
export function registryToSchemas(registry: AgentToolRegistry): ToolSchema[] {
  return registry.list().map(toolToSchema);
}

// ─── Native Function Calling Engine ─────────────────────────────────────────

/**
 * Run a conversation with native function calling support.
 *
 * Flow:
 *  1. Send messages + tool schemas to Together.ai
 *  2. If model returns tool_calls → execute them via registry
 *  3. Feed tool results back and get final answer
 *  4. Return the final text + all tool results
 *
 * Max 3 rounds of tool calls to prevent infinite loops.
 */
export async function runWithFunctionCalling(
  messages: TogetherMessage[],
  registry: AgentToolRegistry,
  options: TogetherOptions = {},
  onToken?: (token: string) => void
): Promise<FunctionCallingResult> {
  const tools = registryToSchemas(registry);
  const toolResults: Array<{ name: string; result: AgentToolResult }> = [];
  const conversationMessages = [...messages];
  let totalTokens = 0;

  const apiKey = getApiKey();
  if (!apiKey) {
    // No API key - fall back to regular call with text-based tool parsing
    return fallbackTextParsing(messages, registry, options, onToken);
  }

  const MAX_ROUNDS = 3;

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const body: any = {
      model: options.model ?? TOGETHER_DEFAULT_MODEL,
      messages: conversationMessages,
      max_tokens: options.maxTokens ?? 4096,
      temperature: options.temperature ?? 0.4,
      stream: false, // Function calling requires non-streaming first pass
    };

    // Only include tools if we have them
    if (tools.length > 0) {
      body.tools = tools;
      body.tool_choice = 'auto';
    }

    const res = await fetch(TOGETHER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      // If function calling not supported, fall back
      if (res.status === 400 && errText.includes('tools')) {
        return fallbackTextParsing(messages, registry, options, onToken);
      }
      throw new Error(`Together.ai ${res.status}: ${errText}`);
    }

    const data = await res.json();
    totalTokens += data.usage?.total_tokens || 0;
    const choice = data.choices?.[0];

    if (!choice) {
      return { finalText: '', toolResults, totalTokensUsed: totalTokens };
    }

    const assistantMessage = choice.message;

    // Check if model wants to call tools
    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      // Add assistant message with tool calls to conversation
      conversationMessages.push({
        role: 'assistant',
        content: assistantMessage.content || '',
      });

      // Execute each tool call
      for (const toolCall of assistantMessage.tool_calls) {
        const fnName = toolCall.function.name;
        let fnArgs: Record<string, unknown> = {};

        try {
          fnArgs = JSON.parse(toolCall.function.arguments);
        } catch {
          fnArgs = {};
        }

        const result = await registry.execute(fnName, fnArgs);
        toolResults.push({ name: fnName, result });

        // Add tool result as a user message (Together.ai format)
        conversationMessages.push({
          role: 'user' as const,
          content: `[Tool Result: ${fnName}]\n${JSON.stringify(result.data ?? result.error, null, 2)}`,
        });
      }

      // Continue loop - model will see tool results and may call more tools or give final answer
      continue;
    }

    // No tool calls - this is the final answer
    const finalText = assistantMessage.content || '';

    // If streaming was requested, emit the final text token by token
    if (onToken && finalText) {
      // Emit in chunks to simulate streaming
      const words = finalText.split(' ');
      for (const word of words) {
        onToken(word + ' ');
      }
    }

    return { finalText, toolResults, totalTokensUsed: totalTokens };
  }

  // Max rounds exceeded - return whatever we have
  return {
    finalText: 'I gathered the information above. Let me summarize what I found.',
    toolResults,
    totalTokensUsed: totalTokens,
  };
}

// ─── Fallback: Text-Based Tool Parsing ──────────────────────────────────────

/**
 * Falls back to the legacy [[TOOL:name]] text parsing when native function
 * calling isn't available.
 */
async function fallbackTextParsing(
  messages: TogetherMessage[],
  registry: AgentToolRegistry,
  options: TogetherOptions,
  onToken?: (token: string) => void
): Promise<FunctionCallingResult> {
  // Inject tool manifest into system prompt
  const manifest = registry.toManifest();
  const augmentedMessages = [...messages];

  if (manifest && augmentedMessages.length > 0 && augmentedMessages[0].role === 'system') {
    augmentedMessages[0] = {
      ...augmentedMessages[0],
      content: augmentedMessages[0].content + '\n\n' + manifest,
    };
  }

  let fullText: string;
  try {
    fullText = await callTogether(augmentedMessages, options, onToken);
  } catch (err) {
    if (isGroqAvailable()) {
      console.warn('[NativeFunctionCalling] Together failed, falling back to Groq:', err);
      fullText = await callGroq(
        augmentedMessages,
        { maxTokens: options.maxTokens ?? 4096, temperature: options.temperature ?? 0.4 },
        onToken
      );
    } else {
      throw err;
    }
  }
  const toolResults: Array<{ name: string; result: AgentToolResult }> = [];

  // Parse any tool calls from the text
  const toolCalls = AgentToolRegistry.parseToolCalls(fullText);
  for (const call of toolCalls) {
    const result = await registry.execute(call.name, call.params);
    toolResults.push({ name: call.name, result });
  }

  const cleanText = AgentToolRegistry.stripToolCalls(fullText);
  return { finalText: cleanText, toolResults, totalTokensUsed: 0 };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getApiKey(): string {
  try {
    const key =
      ((typeof process !== 'undefined') && process.env?.TOGETHER_API_KEY) ||
      '';
    if (key.length < 20 || key.toLowerCase().includes('your-')) return '';
    return key;
  } catch {
    return '';
  }
}

/**
 * Quick check: does the current model support native function calling?
 * Llama 3.1 70B+ supports it; smaller models may not.
 */
export function supportsNativeFunctionCalling(model?: string): boolean {
  const m = (model || TOGETHER_DEFAULT_MODEL).toLowerCase();
  return m.includes('70b') || m.includes('405b') || m.includes('mixtral');
}

export default {
  runWithFunctionCalling,
  registryToSchemas,
  supportsNativeFunctionCalling,
};
