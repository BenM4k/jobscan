import { AppError } from "./errors";

export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface CircuitBreakerOptions {
  /**
   * Number of consecutive failures before tripping the circuit open.
   * Default: 3
   */
  failureThreshold?: number;

  /**
   * Initial backoff window in milliseconds when circuit opens.
   * Default: 60_000 (1 minute)
   */
  baseBackoffMs?: number;

  /**
   * Maximum backoff window cap in milliseconds.
   * Default: 900_000 (15 minutes)
   */
  maxBackoffMs?: number;

  /**
   * Multiplier for exponential backoff on repeated failures.
   * Default: 2 (1m -> 2m -> 4m -> 8m -> 15m)
   */
  backoffMultiplier?: number;

  /**
   * Custom clock function for deterministic testing.
   * Default: Date.now
   */
  now?: () => number;
}

export interface CircuitBreakerMetrics {
  id: string;
  state: CircuitState;
  consecutiveFailures: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  nextAttemptTime: number | null;
  currentBackoffMs: number;
}

export class CircuitBreakerOpenError extends AppError {
  public readonly adapterId: string;
  public readonly nextAttemptTime: number;
  public readonly consecutiveFailures: number;
  public readonly remainingMs: number;

  constructor(
    adapterId: string,
    consecutiveFailures: number,
    nextAttemptTime: number,
    now: number = Date.now()
  ) {
    const remainingMs = Math.max(0, nextAttemptTime - now);
    const retryDate = new Date(nextAttemptTime).toISOString();
    const message = `Circuit breaker is OPEN for adapter "${adapterId}". ${consecutiveFailures} consecutive failures recorded. Retry permitted after ${retryDate} (${remainingMs}ms remaining).`;
    super("CIRCUIT_BREAKER_OPEN", message);
    this.name = "CircuitBreakerOpenError";
    this.adapterId = adapterId;
    this.nextAttemptTime = nextAttemptTime;
    this.consecutiveFailures = consecutiveFailures;
    this.remainingMs = remainingMs;
  }
}

export class CircuitBreaker {
  public readonly id: string;
  private state: CircuitState = "CLOSED";
  private consecutiveFailures = 0;
  private lastFailureTime: number | null = null;
  private lastSuccessTime: number | null = null;
  private nextAttemptTime: number | null = null;
  private probeInFlight = false;

  public readonly failureThreshold: number;
  public readonly baseBackoffMs: number;
  public readonly maxBackoffMs: number;
  public readonly backoffMultiplier: number;
  public readonly now: () => number;

  constructor(id: string, options: CircuitBreakerOptions = {}) {
    this.id = id;
    this.failureThreshold = Math.max(1, options.failureThreshold ?? 3);
    this.baseBackoffMs = Math.max(100, options.baseBackoffMs ?? 60_000);
    this.maxBackoffMs = Math.max(this.baseBackoffMs, options.maxBackoffMs ?? 900_000);
    this.backoffMultiplier = Math.max(1, options.backoffMultiplier ?? 2);
    this.now = options.now ?? Date.now;
  }

  /**
   * Execute an operation protected by this circuit breaker.
   * If the circuit is OPEN and backoff hasn't elapsed, fast-fails immediately.
   * If the backoff has elapsed, transitions to HALF_OPEN to trial a single request.
   */
  async execute<T>(action: () => Promise<T>): Promise<T> {
    const currentTime = this.now();

    // 1. Evaluate current state
    if (this.state === "OPEN") {
      if (this.nextAttemptTime !== null && currentTime >= this.nextAttemptTime) {
        // Backoff expired -> enter HALF_OPEN probe state
        this.state = "HALF_OPEN";
      } else {
        // Circuit still OPEN -> fast fail
        throw new CircuitBreakerOpenError(
          this.id,
          this.consecutiveFailures,
          this.nextAttemptTime ?? currentTime,
          currentTime
        );
      }
    }

    if (this.state === "HALF_OPEN") {
      if (this.probeInFlight) {
        // Concurrent probe in flight, reject concurrent calls
        throw new CircuitBreakerOpenError(
          this.id,
          this.consecutiveFailures,
          this.nextAttemptTime ?? currentTime,
          currentTime
        );
      }
      this.probeInFlight = true;
    }

    // 2. Perform the action
    try {
      const result = await action();
      this.onSuccess(this.now());
      return result;
    } catch (error) {
      this.onFailure(this.now());
      throw error;
    } finally {
      this.probeInFlight = false;
    }
  }

  /**
   * Get current state of the circuit breaker.
   */
  getState(): CircuitState {
    // If OPEN but time expired, dynamically view as HALF_OPEN
    if (
      this.state === "OPEN" &&
      this.nextAttemptTime !== null &&
      this.now() >= this.nextAttemptTime
    ) {
      return "HALF_OPEN";
    }
    return this.state;
  }

  /**
   * Calculate the current backoff window in ms based on failure count.
   */
  getCurrentBackoffMs(): number {
    if (this.consecutiveFailures < this.failureThreshold) {
      return 0;
    }
    const exponent = Math.max(0, this.consecutiveFailures - this.failureThreshold);
    const backoff = this.baseBackoffMs * Math.pow(this.backoffMultiplier, exponent);
    return Math.min(this.maxBackoffMs, backoff);
  }

  /**
   * Return snapshot metrics of this breaker.
   */
  getMetrics(): CircuitBreakerMetrics {
    return {
      id: this.id,
      state: this.getState(),
      consecutiveFailures: this.consecutiveFailures,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      nextAttemptTime: this.nextAttemptTime,
      currentBackoffMs: this.getCurrentBackoffMs(),
    };
  }

  /**
   * Reset breaker to initial healthy CLOSED state.
   */
  reset(): void {
    this.state = "CLOSED";
    this.consecutiveFailures = 0;
    this.lastFailureTime = null;
    this.lastSuccessTime = null;
    this.nextAttemptTime = null;
    this.probeInFlight = false;
  }

  /**
   * Manually trip circuit OPEN (e.g. for emergency circuit breaking or testing).
   */
  trip(): void {
    const currentTime = this.now();
    this.state = "OPEN";
    this.consecutiveFailures = Math.max(this.failureThreshold, this.consecutiveFailures + 1);
    this.lastFailureTime = currentTime;
    const backoff = this.getCurrentBackoffMs();
    this.nextAttemptTime = currentTime + backoff;
  }

  private onSuccess(currentTime: number): void {
    this.state = "CLOSED";
    this.consecutiveFailures = 0;
    this.lastSuccessTime = currentTime;
    this.nextAttemptTime = null;
  }

  private onFailure(currentTime: number): void {
    this.consecutiveFailures++;
    this.lastFailureTime = currentTime;

    if (this.state === "HALF_OPEN" || this.consecutiveFailures >= this.failureThreshold) {
      this.state = "OPEN";
      const backoff = this.getCurrentBackoffMs();
      this.nextAttemptTime = currentTime + backoff;
    }
  }
}

// In-memory global registry of CircuitBreakers per adapter / source
const circuitBreakers = new Map<string, CircuitBreaker>();

/**
 * Retrieve or create a singleton CircuitBreaker for the given adapter/source ID.
 */
export function getCircuitBreaker(
  id: string,
  options?: CircuitBreakerOptions
): CircuitBreaker {
  let breaker = circuitBreakers.get(id);
  if (!breaker) {
    breaker = new CircuitBreaker(id, options);
    circuitBreakers.set(id, breaker);
  }
  return breaker;
}

/**
 * Reset all registered circuit breakers to CLOSED.
 */
export function resetAllCircuitBreakers(): void {
  for (const breaker of circuitBreakers.values()) {
    breaker.reset();
  }
}

/**
 * Get metrics for all registered circuit breakers.
 */
export function getAllCircuitBreakerMetrics(): Record<string, CircuitBreakerMetrics> {
  const result: Record<string, CircuitBreakerMetrics> = {};
  for (const [id, breaker] of circuitBreakers.entries()) {
    result[id] = breaker.getMetrics();
  }
  return result;
}
