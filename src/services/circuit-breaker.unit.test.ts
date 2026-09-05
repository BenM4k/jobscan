import {
  CircuitBreaker,
  CircuitBreakerOpenError,
  getCircuitBreaker,
  resetAllCircuitBreakers,
} from "@/lib/circuit-breaker";
import { BaseJobSourceAdapter } from "./job-sources/base";
import type { NormalizedJob } from "./job-sources/types";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

async function runCircuitBreakerUnitTests() {
  console.log("Running unit tests for CircuitBreaker state machine & exponential backoff...");

  let simulatedTime = 1_000_000;
  const clock = () => simulatedTime;

  // 1. Initial State & Happy Path
  {
    const breaker = new CircuitBreaker("test-happy", {
      failureThreshold: 3,
      baseBackoffMs: 60_000,
      now: clock,
    });

    assert(breaker.getState() === "CLOSED", "Initial state must be CLOSED");
    assert(breaker.getMetrics().consecutiveFailures === 0, "Initial failures must be 0");

    const res = await breaker.execute(async () => "success-val");
    assert(res === "success-val", "Successful action returns value");
    assert(breaker.getState() === "CLOSED", "State remains CLOSED after success");
    assert(breaker.getMetrics().consecutiveFailures === 0, "Failures remain 0");
    assert(breaker.getMetrics().lastSuccessTime === simulatedTime, "Success time is recorded");
  }

  // 2. Failures below threshold do not open circuit
  {
    const breaker = new CircuitBreaker("test-threshold", {
      failureThreshold: 3,
      baseBackoffMs: 60_000,
      now: clock,
    });

    let calls = 0;
    for (let i = 1; i <= 2; i++) {
      try {
        await breaker.execute(async () => {
          calls++;
          throw new Error(`Fail ${i}`);
        });
        assert(false, "Should have thrown");
      } catch (e: unknown) {
        assert((e as Error).message === `Fail ${i}`, "Expected error thrown");
      }
      assert(breaker.getState() === "CLOSED", `State must be CLOSED after ${i} failures`);
      assert(breaker.getMetrics().consecutiveFailures === i, `Failures should be ${i}`);
    }
    assert(calls === 2, "Action called twice");
  }

  // 3. Reaching failureThreshold trips circuit to OPEN
  {
    const breaker = new CircuitBreaker("test-open", {
      failureThreshold: 3,
      baseBackoffMs: 60_000,
      now: clock,
    });

    for (let i = 1; i <= 3; i++) {
      try {
        await breaker.execute(async () => {
          throw new Error("API Failure");
        });
      } catch {}
    }

    assert(breaker.getState() === "OPEN", "Circuit must transition to OPEN after 3 failures");
    assert(breaker.getMetrics().consecutiveFailures === 3, "Consecutive failures is 3");
    assert(
      breaker.getMetrics().nextAttemptTime === simulatedTime + 60_000,
      "Next attempt is scheduled at simulatedTime + baseBackoffMs (1m)"
    );

    // Fast-fail check: Action is NOT called while OPEN
    let underlyingCalled = false;
    try {
      await breaker.execute(async () => {
        underlyingCalled = true;
        return "should not run";
      });
      assert(false, "Should have thrown CircuitBreakerOpenError");
    } catch (err: unknown) {
      assert(
        err instanceof CircuitBreakerOpenError,
        "Threw instance of CircuitBreakerOpenError"
      );
      assert(
        (err as CircuitBreakerOpenError).code === "CIRCUIT_BREAKER_OPEN",
        "Error code is CIRCUIT_BREAKER_OPEN"
      );
      assert(
        (err as CircuitBreakerOpenError).adapterId === "test-open",
        "Error includes adapterId"
      );
      assert(
        (err as CircuitBreakerOpenError).consecutiveFailures === 3,
        "Error includes consecutiveFailures"
      );
      assert(
        (err as CircuitBreakerOpenError).remainingMs === 60_000,
        "Remaining ms is 60_000"
      );
    }
    assert(!underlyingCalled, "Underlying action was NOT called while circuit was OPEN");
  }

  // 4. Exponential Backoff Calculation
  {
    const breaker = new CircuitBreaker("test-backoff", {
      failureThreshold: 3,
      baseBackoffMs: 60_000, // 1 min
      maxBackoffMs: 900_000, // 15 min
      backoffMultiplier: 2,
      now: clock,
    });

    // Fail 3 times -> 60_000 (1m)
    for (let i = 0; i < 3; i++) {
      try { await breaker.execute(async () => { throw new Error(); }); } catch {}
    }
    assert(breaker.getCurrentBackoffMs() === 60_000, "1st backoff window is 1 minute (60s)");

    // Fail 4th time -> 120_000 (2m)
    simulatedTime += 60_001; // expire window to HALF_OPEN
    try { await breaker.execute(async () => { throw new Error(); }); } catch {}
    assert(breaker.getCurrentBackoffMs() === 120_000, "2nd backoff window is 2 minutes (120s)");

    // Fail 5th time -> 240_000 (4m)
    simulatedTime += 120_001; // expire window to HALF_OPEN
    try { await breaker.execute(async () => { throw new Error(); }); } catch {}
    assert(breaker.getCurrentBackoffMs() === 240_000, "3rd backoff window is 4 minutes (240s)");

    // Fail 6th time -> 480_000 (8m)
    simulatedTime += 240_001; // expire window to HALF_OPEN
    try { await breaker.execute(async () => { throw new Error(); }); } catch {}
    assert(breaker.getCurrentBackoffMs() === 480_000, "4th backoff window is 8 minutes (480s)");

    // Fail 7th time -> 900_000 (max cap at 15m)
    simulatedTime += 480_001; // expire window to HALF_OPEN
    try { await breaker.execute(async () => { throw new Error(); }); } catch {}
    assert(breaker.getCurrentBackoffMs() === 900_000, "Capped at maxBackoffMs (900s)");
  }

  // 5. HALF_OPEN Probe Success -> Recovery to CLOSED
  {
    const breaker = new CircuitBreaker("test-recovery", {
      failureThreshold: 3,
      baseBackoffMs: 60_000,
      now: clock,
    });

    for (let i = 0; i < 3; i++) {
      try { await breaker.execute(async () => { throw new Error(); }); } catch {}
    }
    assert(breaker.getState() === "OPEN", "Circuit is OPEN");

    // Advance time past backoff window
    simulatedTime += 60_001;
    assert(breaker.getState() === "HALF_OPEN", "Transitions dynamically to HALF_OPEN after backoff expires");

    // Trial probe succeeds
    let probeExecuted = false;
    const probeRes = await breaker.execute(async () => {
      probeExecuted = true;
      return "probe-success";
    });

    assert(probeExecuted, "Probe executed");
    assert(probeRes === "probe-success", "Probe returned expected value");
    assert(breaker.getState() === "CLOSED", "Circuit transitions back to CLOSED on probe success");
    assert(breaker.getMetrics().consecutiveFailures === 0, "Failures reset to 0");
    assert(breaker.getMetrics().nextAttemptTime === null, "Next attempt cleared");
  }

  // 6. Manual trip and reset
  {
    const breaker = new CircuitBreaker("test-manual", {
      failureThreshold: 3,
      baseBackoffMs: 60_000,
      now: clock,
    });

    breaker.trip();
    assert(breaker.getState() === "OPEN", "Manually tripped circuit is OPEN");

    breaker.reset();
    assert(breaker.getState() === "CLOSED", "Reset circuit is CLOSED");
    assert(breaker.getMetrics().consecutiveFailures === 0, "Reset clears failures");
  }

  // 7. Registry & Isolation
  {
    resetAllCircuitBreakers();

    const ashbyBreaker = getCircuitBreaker("ashby", { failureThreshold: 2, now: clock });
    const greenhouseBreaker = getCircuitBreaker("greenhouse", { failureThreshold: 2, now: clock });

    ashbyBreaker.trip();
    assert(ashbyBreaker.getState() === "OPEN", "Ashby is OPEN");
    assert(greenhouseBreaker.getState() === "CLOSED", "Greenhouse remains unaffected (CLOSED)");

    resetAllCircuitBreakers();
    assert(ashbyBreaker.getState() === "CLOSED", "Ashby reset via resetAllCircuitBreakers");
  }

  // 8. BaseJobSourceAdapter Integration
  {
    class MockAdapter extends BaseJobSourceAdapter<{ id: string; title: string }> {
      readonly id = "ashby" as const;
      public shouldFail = false;
      public fetchCount = 0;

      extractExternalId(raw: { id: string }): string {
        return raw.id;
      }

      protected async fetchRawInternal(): Promise<Array<{ id: string; title: string }>> {
        this.fetchCount++;
        if (this.shouldFail) {
          throw new Error("Remote API error");
        }
        return [{ id: "mock-1", title: "Software Engineer" }];
      }

      normalize(raw: { id: string; title: string }): NormalizedJob {
        return {
          externalId: raw.id,
          source: "ashby",
          title: raw.title,
          company: "Mock Corp",
          url: "https://example.com",
          description: "desc",
        };
      }
    }

    const adapter = new MockAdapter();
    adapter.circuitBreaker.reset();

    // Success call
    const items = await adapter.fetchRaw();
    assert(items.length === 1 && items[0].id === "mock-1", "Adapter fetched items");
    assert(adapter.fetchCount === 1, "fetchCount is 1");

    // Trip the adapter's circuit breaker
    adapter.shouldFail = true;
    for (let i = 0; i < 3; i++) {
      try {
        await adapter.fetchRaw();
      } catch {}
    }
    assert(adapter.circuitBreaker.getState() === "OPEN", "Adapter circuit breaker is OPEN");

    // Subsequent call should fast fail without incrementing fetchCount
    const countBefore = adapter.fetchCount;
    try {
      await adapter.fetchRaw();
      assert(false, "Should have thrown");
    } catch (err: unknown) {
      assert(err instanceof CircuitBreakerOpenError, "Adapter threw CircuitBreakerOpenError");
    }
    assert(adapter.fetchCount === countBefore, "Underlying fetchRawInternal was NOT called");
    adapter.circuitBreaker.reset();
  }

  console.log("All CircuitBreaker unit tests passed successfully! ✓");
}

runCircuitBreakerUnitTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
