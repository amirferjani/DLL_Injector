# Registratiekassa v18 — E2E-test

**Resultaat: MISLUKT**

```
locator.click: Timeout 30000ms exceeded.
Call log:
  - waiting for locator('.product-tile').filter({ hasText: 'Aperol Spritz' }).first()
    - locator resolved to <button data-product="p1" class="product-tile">…</button>
  - attempting click action
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed
    - done scrolling
    - performing click action

    at /home/runner/work/DLL_Injector/DLL_Injector/tests/e2e-v18.mjs:120:17
```
