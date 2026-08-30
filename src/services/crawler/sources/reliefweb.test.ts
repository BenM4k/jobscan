import assert from "node:assert/strict";
import { escapeLuceneQuery } from "./reliefweb";

function testEscapeLuceneQuery() {
  console.log("Testing escapeLuceneQuery...");

  // Test cases covering required conditions
  assert.equal(escapeLuceneQuery("foo:bar"), "foo\\:bar", "Should escape colon in foo:bar");
  assert.equal(escapeLuceneQuery("a OR b"), "a \\OR b", "Should escape boolean operator OR");
  assert.equal(escapeLuceneQuery("C++"), "C\\+\\+", "Should escape plus signs in C++");

  // Additional edge cases
  assert.equal(escapeLuceneQuery("foo AND bar"), "foo \\AND bar", "Should escape AND operator");
  assert.equal(escapeLuceneQuery("NOT active"), "\\NOT active", "Should escape NOT operator");
  assert.equal(escapeLuceneQuery("frontend && backend"), "frontend \\&& backend", "Should escape && operator");
  assert.equal(escapeLuceneQuery("engineer || developer"), "engineer \\|| developer", "Should escape || operator");
  assert.equal(escapeLuceneQuery("title:(manager)"), "title\\:\\(manager\\)", "Should escape parenthesis and colon");
  assert.equal(escapeLuceneQuery("simple search"), "simple search", "Should leave plain keywords intact");
  assert.equal(escapeLuceneQuery(""), "", "Should handle empty string");

  console.log("All escapeLuceneQuery tests passed successfully!");
}

testEscapeLuceneQuery();
