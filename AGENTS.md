# Working in WaveLab

Run `npm ci` before using repository tools. Read `docs/godharness/wavelab.md` and use `npm run harness:context -- --paths <changed-path>` to resolve relevant engineering context.

Run `npm run check` before completing a change. Do not disable lint rules or change failure thresholds to hide findings. Configuration and CLI output have named, narrow boundaries documented in godlint.yaml and the WaveLab standard.

Keep fictional billing data and simulated payments. Never expose unsafeRefund to a model. Changes to the CLI must preserve the five offline examples; live model execution is optional and must not be described as verified without running it.
