# Security Policy

## Supported Versions

Currently the latest version of Dory is supported. We advise you to upgrade whenever possible to receive the latest security updates.

## Reporting a Vulnerability

Please use the repo's Report A Vulnerability option to report.

The team will send a response indicating the next steps in handling your report. After the initial reply to your report, the security team will keep you informed of the progress towards a fix, and may ask for additional information or guidance.

## Documentation is executable source

Static MDX imports are trusted application code, not sanitized user content. Imported modules can run during bundling and server rendering with the build process's filesystem and network permissions, and then run in the published site's origin. Only build reviewed sources and dependencies. The temporary build workspace and dependency overlay prevent accidental package mutation; they are not an execution sandbox. Package overrides explicitly select trusted local packages.

Build untrusted pull requests on disposable runners without secrets, production credentials, persisted Git credentials, or write tokens. Disable dependency lifecycle scripts, use frozen lockfiles and pinned tools, and keep dependency security policies enabled. Never use a privileged `pull_request_target` job to execute contributor MDX. Deploy only a reviewed artifact in a separate job that executes no repository code.

The embedded runtime is a separate, restricted path. Native static component imports do not relax its component allowlist, import restrictions, opaque-origin iframe, or content security policy. Do not route untrusted runtime content through the static builder.

## Publishing and serving

Publish only the generated site directory after scanning it for secrets and private data. Never place credentials in public assets, configuration, demo state, or frontend environment variables. The preview server denies dotfiles and files resolving outside its output root. It is a site server, not authentication for private documentation; use appropriate network and access controls when hosting private content. Configure CSP and security headers at the production host; do not assume a static host adds the preview server's headers.
