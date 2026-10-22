# Add direct dependencies for verification and package tests

**Date:** 2026-10-22 07:21
**Plan:** .ai-factory/plans/feature-e1-standalone-package.md
**Severity:** low

## Problem

Tasks 10, 22, 23 relied on transitive dependencies to config and package.json tasks

## Root Cause

Dependencies listed only the nearest predecessor

## Solution

Task 10 depends on 1-5; Task 22 on 2 and 6; Task 23 on 6 and 16a

## Prevention

List every task whose output a task reads or runs, not only the nearest one

## Tags

#dependencies
