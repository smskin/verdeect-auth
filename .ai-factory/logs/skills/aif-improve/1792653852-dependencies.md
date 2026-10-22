# Task 24 depends directly on scripts and package vitest config

**Date:** 2026-10-22 07:24
**Plan:** .ai-factory/plans/feature-e1-standalone-package.md
**Severity:** low

## Problem

Final verification task ran pack:check/test:package without depending on the tasks that define them

## Root Cause

Dependencies listed only the immediately preceding tests

## Solution

Task 24 now depends on 6 and 11

## Prevention

Verification tasks list the tasks that define every script and config they run

## Tags

#dependencies
