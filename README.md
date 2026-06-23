# Repro Project for Case 177927099300547

Minimal Angular 21 + Amplify Gen 2 project to reproduce esbuild "The service was stopped" failure in Amplify Hosting.

## Customer Setup Replicated

| Component | Version |
|---|---|
| Angular | 21.2.9 |
| @angular/build | 21.2.8 |
| esbuild (top-level) | 0.27.2 |
| esbuild (@angular/build) | 0.27.3 |
| Tailwind CSS | 4.1.18 |
| @tailwindcss/postcss | 4.2.4 |
| Node | 24 |
| Build compute | XLarge (72GiB, 36vCPU) |
| Platform | WEB |

## Deployment

1. Create a new Amplify app in your test account:
   - Connect to a Git repo containing this project
   - Set platform to WEB
   - Set build compute to XLarge
   - Branch: main

2. Or use the CLI:
   ```
   aws amplify create-app --name repro-177927099300547 --platform WEB --region us-east-1
   aws amplify update-app --app-id <APP_ID> --build-spec "$(cat amplify.yml)"
   ```

3. Push this project to a Git repo and connect it.

## Diagnostic Scripts

### scripts/build-wrapper.js
Wraps `ng build` to capture exit codes, signals, process counts, and memory at intervals.
Used in the amplify.yml build phase instead of direct `npx ng build`.

### scripts/esbuild-diagnostics.js  
Deep inspection of esbuild installation: binary verification, platform packages, parallel worker test.
Run after `npm install`:
```
node scripts/esbuild-diagnostics.js
```

### scripts/build-isolate-css.js
Runs two isolation tests:
1. Build with `--styles=false` — determines if crash is in CSS/PostCSS or JS bundling
2. Build with `NG_BUILD_PARALLEL=0` — determines if crash is parallelism-related

## What We're Testing

1. **Does a minimal project also fail?** If yes → environment issue. If no → specific to customer's code/dependencies.
2. **Signal capture** — `build-wrapper.js` captures the exact signal (SIGKILL/SIGSEGV/SIGTERM) that kills esbuild.
3. **CSS isolation** — `build-isolate-css.js` determines if the crash is in Tailwind/PostCSS or JS bundling.
4. **Process limits** — `amplify.yml` dumps `/proc/self/limits` and `ulimit -a` to check container restrictions.

## Expected Outcome

Since this is a minimal app, it will likely BUILD SUCCESSFULLY — confirming the issue is specific to the customer's application complexity. The diagnostics here serve as a template we can provide to the customer.
