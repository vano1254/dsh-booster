# Security

This plugin runs inside your DSH Web GUI, with your privileges, and it can start a
second program on your machine. That deserves a plain description rather than a
"report bugs here" placeholder.

## What it can do

| Capability | Detail |
|---|---|
| Run in the GUI | Host half runs in the DSH Node process; client half runs in the page. Both are your own user account. |
| Write settings | Only its own `booster` namespace in `~/.dsh/settings.yaml`. |
| Read the conversation | The preview module reads the session snapshot to find the newest link and the running `write`/`edit` calls. It does not transmit anything anywhere. |
| Start a service | With `preview.fileOpen: vscode`, it starts `code-server` through WMI so the process sits **outside** DSH's process tree (a DSH restart will not kill it). |
| Drop a request file | Writes `<LOCALAPPDATA>\code-server\bridge\open-request.json`; a small VS Code extension installed into code-server reads it and opens the named file. |

There is no telemetry, no network client, and no own RPC channel. The only network
traffic is the framed page you or the agent asked for.

## The one setting that matters: `--auth none`

`src/service.ts` starts code-server with:

```
--auth none --bind-addr 127.0.0.1:8443
```

`--auth none` means **any local process can talk to that port without credentials**,
and what is behind it is a full editor with an integrated terminal — i.e. your
privileges. It is bound to loopback and code-server performs its own host-header
check, which blocks the usual browser-based attacks (DNS rebinding, cross-origin
reads). Do not treat that as a guarantee; treat `--auth none` as a deliberate
convenience for a single-user machine.

If you want it authenticated, run the service yourself with a password and let the
plugin connect to it instead:

```powershell
# your own launch, your own auth
code-server --bind-addr 127.0.0.1:8443 --auth password
```

The plugin only checks whether the port is listening; it does not care how the
service got there.

## What is *not* in this repository

- No personal paths, user names, host names or credentials. `npm run audit` enforces
  this before a push and exits non-zero if it finds any.
- Your code-server data (settings, extensions, `coder.json`), your DSH settings, and
  the bridge request/log live under `%LOCALAPPDATA%` and `~/.dsh`, never in the repo.

## Supply chain, stated honestly

Installing a DSH plugin means running someone else's code in your GUI process. This
plugin is no different, and a fork of it can be modified to do anything the original
could. Install it from this repository, prefer a tagged release, and read the diff if
you are updating from a source you do not control.

## Reporting

Open an issue with: the DSH version, the plugin version, what you did, and what
happened. If the report involves the loopback service or file access, say so in the
title so it is not treated as a UI bug.
