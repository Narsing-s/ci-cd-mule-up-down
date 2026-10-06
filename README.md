# MuleSoft API Start / Stop Control

Free and open-source GitHub Actions control plane for **CloudHub 2.0 Mule applications**.

> **Bring Your Own Credentials (BYOC):** every user runs this tool from their own GitHub repository and stores their own Anypoint Platform credentials in their own GitHub Environments. The upstream repository never needs, receives, or stores your MuleSoft credentials.

## What it does

The existing control workflow supports:

- Start one particular API/application
- Stop one particular API/application
- Start all APIs in one selected environment
- Stop all APIs in one selected environment
- Environment-wise control
- Current-status check before changing anything
- Final-state verification
- GitHub Environment protection for production
- GitHub Actions UI for selecting the operation

It controls existing CloudHub 2.0 deployments; it does **not** deploy new artifacts.

## Use it for free

You do **not** need access to the maintainer's GitHub secrets.

### Option 1 — Fork

1. Fork this repository into your own GitHub account or organization.
2. In your copy, open **Settings → Environments**.
3. Create the environments you actually use:
   `dev`, `qa`, `sandbox`, `design`, `prod`.
4. Add your own secrets to each environment:
   `ANYPOINT_CLIENT_ID`
   `ANYPOINT_CLIENT_SECRET`
   `ANYPOINT_ORG_ID`
5. Enable **Actions** in your repository if required.
6. Open **Actions → MuleSoft API Start / Stop Control → Run workflow**.
7. Select the environment, action, scope, application, and matching confirmation.
8. The workflow authenticates against **your** Anypoint Platform organization and controls **your** CloudHub 2.0 applications.

### Option 2 — Use as a GitHub template

If this repository is configured as a GitHub Template Repository, choose **Use this template** and create your own repository. Then complete the same Environment and secret setup above.

The workflow itself remains in your repository, so the Actions UI and credentials belong to you.

## Required credentials

Create a MuleSoft Anypoint Platform Connected App appropriate for your organization and give it only the permissions required for the operations you intend to perform.

Store the values as **GitHub Environment secrets**:

```text
ANYPOINT_CLIENT_ID
ANYPOINT_CLIENT_SECRET
ANYPOINT_ORG_ID
```

Do not put client IDs, client secrets, access tokens, passwords, or other credentials in:

- source files
- `.yml` / `.yaml` files
- README files
- screenshots
- issue comments
- pull requests
- frontend code

### Environment isolation

Use separate GitHub Environments when you want separate credentials or approvals:

```text
dev
qa
sandbox
design
prod
```

The workflow selects the GitHub Environment from the Actions UI. The job then receives the secrets belonging to that selected environment.

For production, configure **Required reviewers** on the `prod` GitHub Environment if you want human approval before a production start/stop operation.

## Run from the GitHub UI

Go to:

**Actions → MuleSoft API Start / Stop Control → Run workflow**

Available selections:

| Input | Values |
|---|---|
| Action | `start` / `stop` |
| Scope | `application` / `bulk` |
| Environment | `dev` / `qa` / `sandbox` / `design` / `prod` |
| Application | Required for application scope |
| Confirmation | `CONFIRM_START` / `CONFIRM_STOP` |

### Example — stop one API

```text
action      = stop
scope       = application
environment = qa
application = customer-api
confirm     = CONFIRM_STOP
```

### Example — start one API

```text
action      = start
scope       = application
environment = prod
application = payment-api
confirm     = CONFIRM_START
```

### Example — stop every API in QA

```text
action      = stop
scope       = bulk
environment = qa
application = [blank]
confirm     = CONFIRM_STOP
```

## Architecture

```text
Your GitHub Repository
        |
        v
GitHub Actions UI
        |
        +--> Environment: DEV / QA / SANDBOX / DESIGN / PROD
        |
        +--> Action: START / STOP
        |
        +--> Scope: APPLICATION / BULK
        |
        v
Your GitHub Environment Secrets
        |
        v
Your MuleSoft Anypoint Platform
        |
        v
Your CloudHub 2.0 Applications
        |
        v
START / STOP + state verification
```

The upstream open-source project is only the workflow source. Each user operates an independent copy against their own MuleSoft organization.

## Security model

This project intentionally follows a **bring-your-own-credentials** model.

- The upstream repository does not require your credentials.
- Your secrets stay in your GitHub repository's Environment settings.
- The client secret is passed to the OAuth token request through a GitHub Actions secret.
- Credentials are not written into workflow files.
- Production can be protected with GitHub Environment reviewers.
- Users should create Connected Apps with least-privilege permissions.
- Never share a GitHub Actions log containing a secret or token.

**Important:** anyone with sufficient permission to run or modify workflows in your own repository may potentially control the applications that your credentials can access. Protect repository write access and production Environment approvals accordingly.

## CloudHub 2.0

MuleSoft's Anypoint CLI provides the CloudHub 2.0 application list, describe, start, and stop operations used by this workflow.

Official documentation:

https://docs.mulesoft.com/anypoint-cli/latest/cloudhub2-apps

## Open source

This project is released under the **MIT License**.

You are free to:

- use it
- fork it
- modify it
- adapt it for your organization
- use it in commercial environments
- contribute improvements

See [LICENSE](LICENSE).

## Scope of the project

This project is an operational control workflow, not a deployment pipeline.

It is designed for teams that need a simple, transparent and free way to start or stop existing CloudHub 2.0 applications from a controlled GitHub Actions UI.

No central database or hosted credential service is required.
