import assert from "node:assert/strict";
import { eventExpenseSchema } from "../lib/validations/event";
import type { EventExpense } from "../types/database";

function calculateFinancials(budget: number | null, expenses: EventExpense[]) {
  const totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const paidSpent = expenses
    .filter((e) => e.status === "Paid")
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const unpaidSpent = expenses
    .filter((e) => e.status === "Unpaid")
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const remaining = budget != null ? budget - totalSpent : null;
  const isOverBudget = remaining != null && remaining < 0;
  const percentSpent = budget != null && budget > 0 ? Math.round((totalSpent / budget) * 100) : null;

  return { totalSpent, paidSpent, unpaidSpent, remaining, isOverBudget, percentSpent };
}

function runTests() {
  console.log("== Running Expense Tracker Self-Check ==");

  // 1. Test Financial Summary Widget Calculations (Surplus Case)
  const sampleExpenses: EventExpense[] = [
    {
      id: "exp-1",
      event_id: "evt-1",
      amount: 50_000_000,
      category: "Vendor",
      expense_date: "2026-10-10",
      status: "Paid",
      notes: "Stage audio",
      created_at: "2026-10-10T00:00:00Z",
    },
    {
      id: "exp-2",
      event_id: "evt-1",
      amount: 25_000_000,
      category: "Logistics",
      expense_date: "2026-10-12",
      status: "Unpaid",
      notes: "Genset power",
      created_at: "2026-10-12T00:00:00Z",
    },
    {
      id: "exp-3",
      event_id: "evt-1",
      amount: 15_000_000,
      category: "F&B",
      expense_date: "2026-10-14",
      status: "Paid",
      notes: "VIP catering",
      created_at: "2026-10-14T00:00:00Z",
    },
  ];

  const budgetSurplus = 100_000_000;
  const fin1 = calculateFinancials(budgetSurplus, sampleExpenses);

  assert.equal(fin1.totalSpent, 90_000_000, "Total spent should be 90M");
  assert.equal(fin1.paidSpent, 65_000_000, "Paid spent should be 65M");
  assert.equal(fin1.unpaidSpent, 25_000_000, "Unpaid spent should be 25M");
  assert.equal(fin1.remaining, 10_000_000, "Remaining balance should be 10M");
  assert.equal(fin1.isOverBudget, false, "Should not be over budget");
  assert.equal(fin1.percentSpent, 90, "Percent spent should be 90%");
  console.log("✓ Financial summary calculations (surplus) verified");

  // 2. Test Deficit / Over-budget Case
  const budgetDeficit = 80_000_000;
  const fin2 = calculateFinancials(budgetDeficit, sampleExpenses);

  assert.equal(fin2.remaining, -10_000_000, "Remaining balance should be -10M");
  assert.equal(fin2.isOverBudget, true, "Should be flagged as over budget");
  assert.equal(fin2.percentSpent, 113, "Percent spent should be 113%");
  console.log("✓ Deficit / over-budget detection verified");

  // 3. Test Unspecified Budget Case
  const fin3 = calculateFinancials(null, sampleExpenses);
  assert.equal(fin3.remaining, null, "Remaining should be null if budget unspecified");
  assert.equal(fin3.percentSpent, null, "Percent spent should be null if budget unspecified");
  console.log("✓ Unspecified budget handling verified");

  // 4. Test Validation Schema (Valid Input)
  const valid = eventExpenseSchema.safeParse({
    event_id: "11111111-1111-1111-1111-111111111111",
    amount: "5000000",
    category: "Vendor",
    expense_date: "2026-10-15",
    status: "Paid",
    notes: "Lighting rig",
  });
  assert.equal(valid.success, true, "Valid expense schema should pass");
  if (valid.success) {
    assert.equal(valid.data.amount, 5000000, "Amount should be coerced to number");
    assert.equal(valid.data.status, "Paid");
  }
  console.log("✓ Zod schema positive validation verified");

  // 5. Test Validation Schema (Invalid Input: amount <= 0)
  const invalidZero = eventExpenseSchema.safeParse({
    event_id: "11111111-1111-1111-1111-111111111111",
    amount: "0",
    category: "Logistics",
    expense_date: "2026-10-15",
  });
  assert.equal(invalidZero.success, false, "Zero amount should fail");

  const invalidCat = eventExpenseSchema.safeParse({
    event_id: "11111111-1111-1111-1111-111111111111",
    amount: "10000",
    category: "InvalidCategoryName",
    expense_date: "2026-10-15",
  });
  assert.equal(invalidCat.success, false, "Unknown category should fail");
  console.log("✓ Zod schema negative validation verified");

  console.log("== All Expense Tracker checks passed successfully! ==");
}

runTests();
