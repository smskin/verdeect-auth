# Clarify formatting scope, skipLibCheck, AC-7 stop rule and BR-3 test constants

**Date:** 2026-10-22 07:21
**Plan:** .ai-factory/plans/feature-e1-standalone-package.md
**Severity:** medium

## Problem

format:check would fail on README/AGENTS and tool-generated JSON; consumer tsconfig skipLibCheck false risked third-party type noise; AC-7 failure could be 'fixed' by adding Vitest conditions; real-domain TEST_* constants could be 'fixed' against frozen contract

## Root Cause

Plan did not account for files outside src under prettier, nor for contract conflicts between BR-3 and FR-5

## Solution

Added .ai-factory.json/.mcp.json to .prettierignore and allowed format-only writes for README/AGENTS; skipLibCheck true with rationale; stop-and-ask rule in Task 23; reconciliation row for TEST_* constants

## Prevention

When a library contract is frozen, record requirement tensions (BR vs FR) in Requirements Reconciliation and add stop-and-ask rules where a test failure would tempt contract changes

## Tags

#description #requirements #formatting
