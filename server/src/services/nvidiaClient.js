/**
 * NVIDIA NIM LLM Client for Dastaan
 * Interfaces with NVIDIA API (OpenAI-compatible wire protocol)
 * Kept strictly on the backend; never exposes API credentials to clients.
 */

/**
 * Circuit breaker state for NVIDIA NIM endpoint.
 * When consecutive timeouts occur, the circuit breaker trips for a cooldown period
 * so subsequent user requests fail fast to deterministic fallback in 0ms instead
 * of repeatedly hanging for the full timeout duration.
 */
let consecutiveFailures = 0;
let circuitBreakerTrippedUntil = 0;
const FAILURE_THRESHOLD = 3; // Trip after 3 consecutive timeouts or 5xx
const COOLDOWN_MS = 60000; // 60-second fast-fallback cooldown

export function isNvidiaCircuitOpen() {
  return Date.now() < circuitBreakerTrippedUntil;
}

export function resetNvidiaCircuit() {
  consecutiveFailures = 0;
  circuitBreakerTrippedUntil = 0;
}

export function getNvidiaConfig() {
  const baseUrl = (process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1').replace(/\/+$/, '');
  const model = process.env.NVIDIA_MODEL || 'meta/llama-3.2-11b-vision-instruct';
  const temperature = !isNaN(parseFloat(process.env.NVIDIA_TEMPERATURE))
    ? parseFloat(process.env.NVIDIA_TEMPERATURE)
    : 0.2;
  const maxTokens = parseInt(process.env.NVIDIA_MAX_TOKENS, 10) || 512;
  const timeoutMs = parseInt(process.env.NVIDIA_TIMEOUT_MS, 10) || 10000;
  const isKeyConfigured = Boolean(
    process.env.NVIDIA_API_KEY &&
    process.env.NVIDIA_API_KEY.trim() !== '' &&
    process.env.NVIDIA_API_KEY !== 'your_nvidia_api_key_here'
  );

  return {
    baseUrl,
    model,
    temperature,
    maxTokens,
    timeoutMs,
    isKeyConfigured
  };
}

/**
 * Call NVIDIA Chat Completion endpoint with bounded retry, circuit breaker, and latency diagnostics
 *
 * @param {Object} options
 * @param {Array<{role: string, content: string}>} options.messages - Conversation messages
 * @param {string} [options.model] - Model identifier (defaults to process.env.NVIDIA_MODEL)
 * @param {number} [options.temperature] - Sampling temperature (0.0 - 1.0)
 * @param {number} [options.maxTokens] - Maximum tokens to generate
 * @param {number} [options.timeoutMs] - Custom per-request timeout in ms
 * @param {Object} [options.responseFormat] - e.g. { type: 'json_object' }
 * @param {Function} [options.fetchFn] - Custom fetch for testing / mocking
 * @returns {Promise<{content: string, usage: Object, model: string, requestId: string, durationMs: number}>}
 */
export async function callNvidiaChat({
  messages,
  model,
  temperature,
  maxTokens,
  timeoutMs,
  responseFormat,
  fetchFn = fetch
}) {
  const config = getNvidiaConfig();
  const apiKey = process.env.NVIDIA_API_KEY;

  if (!apiKey || apiKey.trim() === '' || apiKey === 'your_nvidia_api_key_here') {
    const error = new Error('NVIDIA_API_KEY is not configured on the backend.');
    error.code = 'NVIDIA_KEY_MISSING';
    throw error;
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    const error = new Error('Messages array is required and must not be empty.');
    error.code = 'INVALID_MESSAGES';
    throw error;
  }

  const isMock = typeof fetchFn === 'function' && fetchFn !== fetch;

  // Fast-fail if circuit breaker is open due to consecutive upstream timeouts (production only)
  if (!isMock && isNvidiaCircuitOpen()) {
    const remainingSec = Math.ceil((circuitBreakerTrippedUntil - Date.now()) / 1000);
    const err = new Error(`NVIDIA API circuit breaker is OPEN due to repeated timeouts (${remainingSec}s remaining cooldown).`);
    err.code = 'NVIDIA_CIRCUIT_OPEN';
    err.retryable = false;
    throw err;
  }

  const endpoint = `${config.baseUrl}/chat/completions`;
  const selectedModel = model || config.model;
  const selectedTemp = temperature !== undefined ? temperature : config.temperature;
  const selectedMaxTokens = maxTokens || config.maxTokens;
  const effectiveTimeoutMs = timeoutMs || config.timeoutMs;

  const payload = {
    model: selectedModel,
    messages,
    temperature: selectedTemp,
    max_tokens: selectedMaxTokens
  };

  if (responseFormat) {
    payload.response_format = responseFormat;
  }

  const maxAttempts = 2; // Initial attempt + 1 bounded retry for transient failures
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const t0 = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), effectiveTimeoutMs);

    try {
      const response = await fetchFn(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey.trim()}`,
          'User-Agent': 'Dastaan-Travel-App/1.0'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timer);
      const durationMs = Date.now() - t0;
      const requestId = response.headers?.get ? response.headers.get('x-request-id') : 'unknown';

      // Check for transient retryable HTTP status codes
      if (!response.ok) {
        let errorBody = null;
        try {
          errorBody = await response.json();
        } catch {
          errorBody = await response.text();
        }

        const isTransient = [429, 502, 503, 504].includes(response.status);
        if (isTransient && attempt < maxAttempts) {
          const retryAfterHeader = response.headers?.get ? response.headers.get('retry-after') : null;
          let delayMs = 600 + Math.floor(Math.random() * 300);
          if (retryAfterHeader) {
            const parsed = parseInt(retryAfterHeader, 10);
            if (!isNaN(parsed) && parsed > 0) {
              delayMs = Math.min(3000, parsed * 1000);
            }
          }
          console.warn(`[NvidiaClient] Transient HTTP ${response.status} on attempt ${attempt} (${durationMs}ms). Retrying in ${delayMs}ms...`);
          await new Promise(r => setTimeout(r, delayMs));
          continue;
        }

        console.warn(`[NvidiaClient] Request failed: status=${response.status}, duration=${durationMs}ms, model=${selectedModel}, requestId=${requestId}`);
        const err = new Error(
          `NVIDIA API request failed with status ${response.status}: ${
            typeof errorBody === 'object' ? JSON.stringify(errorBody) : errorBody
          }`
        );
        err.status = response.status;
        err.code = 'NVIDIA_API_ERROR';
        err.details = errorBody;
        err.requestId = requestId;
        err.durationMs = durationMs;

        if (!isMock && response.status >= 500) {
          consecutiveFailures++;
          if (consecutiveFailures >= FAILURE_THRESHOLD) {
            circuitBreakerTrippedUntil = Date.now() + COOLDOWN_MS;
            console.warn(`[NvidiaClient] Circuit breaker tripped for ${COOLDOWN_MS / 1000}s after ${consecutiveFailures} consecutive upstream failures.`);
          }
        }
        throw err;
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content;
      const effectiveRequestId = data?.id || requestId;

      if (content === undefined || content === null || (typeof content === 'string' && content.trim() === '')) {
        // Fallback check for reasoning models that place thinking in reasoning_content
        const reasoning = data?.choices?.[0]?.message?.reasoning_content;
        if (reasoning && typeof reasoning === 'string' && reasoning.trim().length > 0) {
          console.info(`[NvidiaClient] Using reasoning_content fallback: duration=${durationMs}ms, model=${data.model || selectedModel}`);
          if (!isMock) {
            consecutiveFailures = 0;
            circuitBreakerTrippedUntil = 0;
          }
          return {
            content: reasoning.trim(),
            usage: data.usage || null,
            model: data.model || selectedModel,
            requestId: effectiveRequestId,
            durationMs
          };
        }

        const err = new Error('NVIDIA API returned response with empty content.');
        err.code = 'NVIDIA_EMPTY_CONTENT';
        err.requestId = effectiveRequestId;
        err.durationMs = durationMs;
        throw err;
      }

      // Successful call resets failure tracking
      if (!isMock) {
        consecutiveFailures = 0;
        circuitBreakerTrippedUntil = 0;
      }

      console.info(`[NvidiaClient] Chat completion succeeded: status=200, duration=${durationMs}ms, model=${data.model || selectedModel}, requestId=${effectiveRequestId}`);

      return {
        content,
        usage: data.usage || null,
        model: data.model || selectedModel,
        requestId: effectiveRequestId,
        durationMs
      };

    } catch (err) {
      clearTimeout(timer);
      const durationMs = Date.now() - t0;

      if (err.name === 'AbortError') {
        if (!isMock) {
          consecutiveFailures++;
          if (consecutiveFailures >= FAILURE_THRESHOLD) {
            circuitBreakerTrippedUntil = Date.now() + COOLDOWN_MS;
            console.info(`[NvidiaClient] Circuit breaker tripped for ${COOLDOWN_MS / 1000}s after ${consecutiveFailures} consecutive timeouts.`);
          }
        }
        const timeoutErr = new Error(`NVIDIA API call timed out after ${effectiveTimeoutMs}ms.`);
        timeoutErr.code = 'NVIDIA_TIMEOUT';
        timeoutErr.durationMs = durationMs;
        console.info(`[NvidiaClient] Inference timed out after ${durationMs}ms for model ${selectedModel}. Transitioning smoothly to deterministic fallback.`);
        throw timeoutErr;
      }

      lastError = err;
      if (attempt >= maxAttempts || err.code === 'NVIDIA_KEY_MISSING' || err.code === 'INVALID_MESSAGES' || (err.status && err.status < 500 && err.status !== 429)) {
        throw err;
      }
    }
  }

  throw lastError;
}

export default {
  getNvidiaConfig,
  callNvidiaChat,
  isNvidiaCircuitOpen,
  resetNvidiaCircuit
};
