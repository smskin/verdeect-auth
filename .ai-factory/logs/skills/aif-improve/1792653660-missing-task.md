# Consumer template needs pnpm allowBuilds and no --ignore-workspace

**Date:** 2026-10-22 07:21
**Plan:** .ai-factory/plans/feature-e1-standalone-package.md
**Severity:** high

## Problem

Full consumer template installs vitest (vite -> esbuild build script) but had no allowBuilds; helper used --ignore-workspace which would skip any template pnpm settings

## Root Cause

Plan assumed temp-project install works with default pnpm settings; pnpm 12 rejects unapproved build scripts

## Solution

Added Task 16a tests/consumer/full/pnpm-workspace.yaml with allowBuilds esbuild; removed --ignore-workspace from Task 13

## Prevention

For any temp/consumer project installed by tests, check transitive build scripts against pnpm allowBuilds policy

## Tags

#pnpm #consumer-test #missing-task
