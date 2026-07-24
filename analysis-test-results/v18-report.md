# Registratiekassa v18 — E2E-test

**Resultaat: MISLUKT**

```
locator.fill: Timeout 30000ms exceeded.
Call log:
  - waiting for locator('#bossPin')
    - locator resolved to <input id="bossPin" maxlength="4" placeholder="PIN" inputmode="numeric"/>
    - fill("0607")
  - attempting fill action
    2 × waiting for element to be visible, enabled and editable
      - element is not visible
    - retrying fill action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and editable
      - element is not visible
    - retrying fill action
      - waiting 100ms
    60 × waiting for element to be visible, enabled and editable
       - element is not visible
     - retrying fill action
       - waiting 500ms

    at /home/runner/work/DLL_Injector/DLL_Injector/tests/e2e-v18.mjs:106:34
```
