# Clarify TSDoc lint scope, CI tag filter, probe test and doc targets

**Date:** 2026-10-22 08:11
**Plan:** .ai-factory/plans/feature-e2-docs-and-release.md
**Severity:** medium

## Problem

Task 1 would force TSDoc on private guard members; Task 12 had conflicting tag filters and installed deps in publish; Task 15 kept a needless temp-file fallback in src/; Tasks 3, 4, 19 left references vague

## Root Cause

Plan drafted from requirements without checking private members, eslint type-awareness and exact file lines

## Solution

Excluded private members and empty constructors from jsdoc rule; single strict tag glob, publish without install; removed temp-file fallback; named exact prd.md and ARCHITECTURE.md lines

## Prevention

Verify lint selectors against real class members and cite exact lines when a task edits existing docs

## Tags

#description #lint #ci
