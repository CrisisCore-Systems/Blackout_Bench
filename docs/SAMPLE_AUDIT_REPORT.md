# Sample Audit Report

**Target:** Example task-driven web app  
**Audit ID:** bench_0420_demo  
**Survivability Score:** 40  
**Verdict:** Fragile

## Summary

This product preserves visual continuity longer than it preserves actual utility. Under interruption and degraded connectivity, the interface appears available after the core task has already become unreliable. The result is not just inconvenience. It is loss of user trust under pressure.

## Critical Failures

### 1. Essential task collapses after connectivity drops

The primary workflow cannot be completed once the network fails mid-task. The interface remains partially interactive, but the user no longer has a trustworthy path to completion.

### 2. Draft state is lost on refresh

User-authored input does not survive continuity loss. A reload or interrupted session forces reconstruction of work that should have been preserved locally.

## Silent Failures

### 1. Retry path suggests recovery without restoring utility

The interface offers retry language, but retry does not return the user to a safe or complete working state. This creates false confidence while essential utility remains broken.

## Strengths

### 1. Partial shell still renders offline

The interface does not fully blank on reload. Structural continuity survives, even though functional continuity does not.

### 2. Failure can be made legible

The system exposes enough visible state that a clearer degraded-mode message could significantly improve trust without major conceptual redesign.

## Repair First

1. Preserve primary task state locally before network confirmation
2. Surface degraded-mode messaging immediately when continuity breaks
3. Decouple export and recovery paths from full application readiness
4. Make retry semantics honest about what was and was not restored

## Why This Matters

An app that fails this way does not merely become fragile. It becomes misleading. It keeps the appearance of control while removing the user’s real ability to complete work, recover state, or understand what remains safe to do.

## Gemini Repair Synthesis

This app is optimized for continuity theater rather than continuity survival. The highest-leverage fix is to preserve authorship state locally before any network dependency is resolved. Once that is in place, recovery messaging and partial export can act as truthful degraded-mode supports instead of cosmetic reassurance.
