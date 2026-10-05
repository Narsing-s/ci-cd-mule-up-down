# MuleSoft API Start / Stop Control

Central GitHub Actions control plane for **CloudHub 2.0 Mule applications**.

The workflow supports:

- Start one particular API/application
- Stop one particular API/application
- Start all APIs in one selected environment
- Stop all APIs in one selected environment
- Environment-wise control
- Current-status check before changing anything
- Final-state verification
- GitHub Environment protection for PROD

MuleSoft's CloudHub 2 CLI provides `runtime-mgr:application:list`, `describe`, `start`, and `stop`; CloudHub 2 management uses the application ID obtained from the application list. See the official MuleSoft documentation:
https://docs.mulesoft.com/anypoint-cli/latest/cloudhub2-apps

## GitHub Actions

Run:

**Actions → MuleSoft API Start / Stop Control → Run workflow**

Choose:

1. **action** — `start` or `stop`
2. **scope** — `application` or `bulk`
3. **environment** — `dev`, `qa`, `uat`, `sandbox`, or `prod`
4. **application** — required for application scope
5. **confirm** — type `CONFIRM`

### Examples

#### Stop one API

```text
action      = stop
scope       = application
environment = qa
application = customer-api
confirm     = CONFIRM
```

#### Start one API

```text
action      = start
scope       = application
environment = prod
application = payment-api
confirm     = CONFIRM
```

#### Stop every API in QA

```text
action      = stop
scope       = bulk
environment = qa
application = [blank]
confirm     = CONFIRM
```

#### Start every API in QA

```text
action      = start
scope       = bulk
environment = qa
application = [blank]
confirm     = CONFIRM
```

## Required GitHub Environment configuration

Create these GitHub Environments:

```text
dev
qa
uat
sandbox
prod
```

Add these secrets to each environment:

```text
ANYPOINT_CLIENT_ID
ANYPOINT_CLIENT_SECRET
ANYPOINT_ORG_ID
CLOUDHUB_ENVIRONMENT
```

For production, configure **Required reviewers** on the `prod` GitHub Environment. That makes a production start/stop operation require approval before the job can execute.

## Design

```text
GitHub Actions
      |
      +-- Environment selector
      |      dev / qa / uat / sandbox / prod
      |
      +-- Action selector
      |      START / STOP
      |
      +-- Scope selector
             |
             +-- Particular application
             |
             +-- Bulk applications
                       |
                       v
             Anypoint Platform
                       |
                       v
             CloudHub 2 Application IDs
                       |
                       v
                START / STOP
                       |
                       v
                Verify state
```

The workflow does **not deploy a new artifact**. It only starts or stops the existing CloudHub 2 deployment, which is the correct separation for an operational control pipeline.
