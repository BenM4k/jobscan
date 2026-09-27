import { isAdmin } from "@/services/auth/admin";
import { isNavActive } from "@/lib/nav";

function assert(condition: unknown, msg: string): asserts condition {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

function calculatePagination(page: number, limit: number, totalCount: number) {
  const totalPages = Math.ceil(totalCount / limit) || 1;
  const clampedPage = Math.max(1, Math.min(page, totalPages));
  const startEntry = totalCount === 0 ? 0 : (clampedPage - 1) * limit + 1;
  const endEntry = Math.min(clampedPage * limit, totalCount);
  const hasPrev = clampedPage > 1;
  const hasNext = clampedPage < totalPages;

  return {
    page: clampedPage,
    totalPages,
    startEntry,
    endEntry,
    hasPrev,
    hasNext,
  };
}

async function runTests() {
  console.log("Running Admin Navigation & Telemetry Pagination Unit Tests...\n");

  // 1. Admin verification
  assert(isAdmin({ id: "user-1", role: "admin" }) === true, "role=admin must be admin");
  assert(isAdmin({ id: "user-2", role: "user" }) === false, "role=user must not be admin");
  assert(isAdmin({ id: "user-3" }) === false, "no role must not be admin");
  assert(isAdmin(null) === false, "null user must not be admin");
  console.log("✓ Admin role verification checks passed");

  // 2. Navigation active state checks
  assert(isNavActive("/dashboard", "/dashboard") === true, "/dashboard matches /dashboard");
  assert(isNavActive("/dashboard", "/dashboard/resumes") === false, "/dashboard does not match /dashboard/resumes");
  assert(isNavActive("/dashboard", "/dashboard/admin") === false, "/dashboard does not match /dashboard/admin");
  assert(isNavActive("/dashboard/admin", "/dashboard/admin") === true, "/dashboard/admin matches exact");
  assert(isNavActive("/dashboard/admin", "/dashboard/admin/ai-usage") === true, "/dashboard/admin matches subroute /dashboard/admin/ai-usage");
  assert(isNavActive("/dashboard/admin", "/dashboard/admin/users") === true, "/dashboard/admin matches subroute /dashboard/admin/users");
  console.log("✓ Navigation active matching logic passed");

  // 3. Pagination calculations
  const emptyPage = calculatePagination(1, 25, 0);
  assert(emptyPage.totalPages === 1, "empty totalPages should be 1");
  assert(emptyPage.startEntry === 0 && emptyPage.endEntry === 0, "empty range should be 0-0");
  assert(!emptyPage.hasPrev && !emptyPage.hasNext, "empty should have neither prev nor next");

  const page1 = calculatePagination(1, 25, 60);
  assert(page1.totalPages === 3, "60 items with limit 25 = 3 pages");
  assert(page1.startEntry === 1 && page1.endEntry === 25, "page 1 range is 1-25");
  assert(!page1.hasPrev && page1.hasNext, "page 1 has next but not prev");

  const page2 = calculatePagination(2, 25, 60);
  assert(page2.startEntry === 26 && page2.endEntry === 50, "page 2 range is 26-50");
  assert(page2.hasPrev && page2.hasNext, "page 2 has prev and next");

  const page3 = calculatePagination(3, 25, 60);
  assert(page3.startEntry === 51 && page3.endEntry === 60, "page 3 range is 51-60");
  assert(page3.hasPrev && !page3.hasNext, "page 3 has prev but not next");

  // 4. PageSize = 15 calculations
  const p15 = calculatePagination(2, 15, 40);
  assert(p15.totalPages === 3, "40 items with limit 15 = 3 pages");
  assert(p15.startEntry === 16 && p15.endEntry === 30, "page 2 with limit 15 range is 16-30");
  assert(p15.hasPrev && p15.hasNext, "page 2 with limit 15 has prev and next");
  console.log("✓ Pagination calculation logic passed (including pageSize=15)");

  console.log("\nAll unit tests passed successfully! 🎉");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
