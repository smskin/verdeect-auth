# Harden AC-8/AC-9/AC-10 test specs against false results

**Date:** 2026-10-22 08:13
**Plan:** .ai-factory/plans/feature-e2-docs-and-release.md
**Severity:** medium

## Problem

AC-9 name search by word boundary hid missing entries; AC-10 link check scanned code blocks; AC-8 dry runs could lose PATH or hit a user scoped registry

## Root Cause

Test tasks described the check, not the inputs that could fool it

## Solution

Backtick-only name search; strip code before link extraction; merge env over process.env and isolate npm userconfig

## Prevention

For each test task ask what real input makes it pass falsely or fail flakily

## Tags

#tests #determinism
