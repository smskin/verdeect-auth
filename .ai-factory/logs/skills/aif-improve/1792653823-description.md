# Deviation notes for package tests, precise contract-safe grep, dist precondition

**Date:** 2026-10-22 07:23
**Plan:** .ai-factory/plans/feature-e1-standalone-package.md
**Severity:** medium

## Problem

Package/consumer tests used nestjs-code unit layer without deviation note; Task 10 grep would match contract strings (error prefixes, metadata keys); test:package could run without built dist

## Root Cause

Plan placed tests outside the skill layer table and phrased the verification search too broadly

## Solution

Added Architectural deviation notes to Tasks 20, 22, 23; narrowed Task 10 search to bare import specifiers and listed contract strings that stay; beforeAll dist precondition in Tasks 22, 23

## Prevention

When a verification step greps for a name, list legitimate contract occurrences; any test outside the skill layer table needs a deviation note

## Tags

#description #skill-attribution #contract
