import { formatProfileDateRange } from "@/lib/date-format";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

async function runDateFormatUnitTests() {
  console.log("Running unit tests for formatProfileDateRange...");

  // 1. Malformed composite range with ENDDATE: duplicated in start and end
  const res1 = formatProfileDateRange(
    "March 2023 ENDDATE: Present",
    "March 2023 ENDDATE: Present"
  );
  assert(
    res1 === "Mar 2023 – Present",
    `Expected "Mar 2023 – Present", got "${res1}"`
  );

  // 2. Clean separate start and end with full month
  const res2 = formatProfileDateRange("March 2023", "Present");
  assert(
    res2 === "Mar 2023 – Present",
    `Expected "Mar 2023 – Present", got "${res2}"`
  );

  // 3. Identical start and end dates (single period, e.g. Sep 2020)
  const res3 = formatProfileDateRange("September 2020", "September 2020");
  assert(
    res3 === "Sep 2020 – Sep 2020",
    `Expected "Sep 2020 – Sep 2020", got "${res3}"`
  );

  const res3b = formatProfileDateRange("Sep 2020", "Sep 2020");
  assert(
    res3b === "Sep 2020 – Sep 2020",
    `Expected "Sep 2020 – Sep 2020", got "${res3b}"`
  );

  // 4. Start date only with embedded separator
  const res4 = formatProfileDateRange("Jan 2021 — Dec 2022", undefined);
  assert(
    res4 === "Jan 2021 – Dec 2022",
    `Expected "Jan 2021 – Dec 2022", got "${res4}"`
  );

  // 5. Start date with STARTDATE: prefix and end date with ENDDATE: prefix
  const res5 = formatProfileDateRange("STARTDATE: March 2023", "ENDDATE: Present");
  assert(
    res5 === "Mar 2023 – Present",
    `Expected "Mar 2023 – Present", got "${res5}"`
  );

  // 6. Year only
  const res6 = formatProfileDateRange("2020", "2024");
  assert(res6 === "2020 – 2024", `Expected "2020 – 2024", got "${res6}"`);

  // 7. Single year only
  const res7 = formatProfileDateRange("2022", undefined);
  assert(res7 === "2022", `Expected "2022", got "${res7}"`);

  // 8. Empty / undefined inputs
  const res8 = formatProfileDateRange(undefined, undefined);
  assert(res8 === "", `Expected "", got "${res8}"`);

  console.log("All date-format unit tests passed successfully!");
}

runDateFormatUnitTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
