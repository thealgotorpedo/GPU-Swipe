# Production deployments

The workflow tests the API and builds the frontend on GitHub-hosted runners. The deploy job sends the tested commit's backend and frontend bundle to this server over SSH. It uses the public SSH endpoint on port 22.

## GitHub and SSH setup

A repository admin creates the `production` environment in **Settings → Environments** and allows deployments from the `main` branch only. Leave required reviewers unset for unattended deployment, or configure them if you want manual approval for each release.

Generate a dedicated key on a trusted machine. The workflow needs a key without a passphrase.

```bash
ssh-keygen -t ed25519 -N '' -f gpu-swipe-actions -C gpu-swipe-actions
```

On the server, add one line to `/home/gpu-deploy/.ssh/authorized_keys`. Replace `<contents of gpu-swipe-actions.pub>` with the public key line, including its `ssh-ed25519` prefix.

```text
restrict,command="/usr/local/sbin/gpu-marketplace-receive-release" <contents of gpu-swipe-actions.pub>
```

The `.ssh` directory must be owned by `gpu-deploy` with mode `0700`. The `authorized_keys` file must be owned by `gpu-deploy` with mode `0600`.

Add the following in the GitHub `production` environment.

| Name | Type | Value |
| --- | --- | --- |
| `DEPLOY_HOST` | Variable | `mern.cop4331-g21.xyz`, if it resolves directly to the server's SSH endpoint |
| `DEPLOY_KNOWN_HOSTS` | Variable | A verified `mern.cop4331-g21.xyz ssh-ed25519 …` entry using the server's host key |
| `DEPLOY_SSH_KEY` | Secret | The contents of `gpu-swipe-actions`, the private key |

Get the host key from a trusted shell on the server. Use the same hostname or IP as `DEPLOY_HOST` in the first column.

```bash
sudo awk '{print "mern.cop4331-g21.xyz", $1, $2}' /etc/ssh/ssh_host_ed25519_key.pub
```

Verify that the deployment key reaches the forced command. The receiver should print `Expected deploy followed by a Git commit SHA.` and return exit status 2.

```bash
ssh -T -o IdentitiesOnly=yes -i gpu-swipe-actions gpu-deploy@mern.cop4331-g21.xyz check
```

After merging the workflow, run **Actions → CI and deploy → Run workflow** on `main`. Confirm the deploy job passes. To turn on deployment after every successful push to `main`, add a **repository** variable named `DEPLOY_ENABLED` with value `true` in **Settings → Secrets and variables → Actions → Variables**.

## Server layout

- The root-owned `/usr/local/sbin/gpu-marketplace-receive-release` is installed from [receive-release](receive-release). The `gpu-deploy` user owns the release area and has passwordless sudo for `/usr/bin/systemctl restart gpu-marketplace-api.service` only.
- Apache serves `/srv/gpu-marketplace/current/frontend`. A systemd drop-in runs the backend as `gpu-marketplace` from `/srv/gpu-marketplace/current/gpu-backend`, with runtime configuration in `/etc/gpu-marketplace/api.env`. The API connects to the existing MongoDB.
- The receiver installs production dependencies before replacing the `current` symlink. It checks the frontend and API through the existing HTTPS virtual host and restores the previous symlink if startup or verification fails. Retained releases are in `/srv/gpu-marketplace/releases`.
