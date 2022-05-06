# Installation and Deployment

## Installation

1. Clone this repo
   - Use the `main` branch for VM deployment. If you're launching on App Engine, checkout the `app_engine_deploy` branch
1. Run `yarn install`
1. Add a `looker.ini` file for API service account credentials (see [Looker SDK docs](https://github.com/looker-open-source/sdk-codegen) for more info):
   ```
   [Looker]
   base_url=https://YOUR_LOOKER_INSTANCE.com
   client_id=abc
   client_secret=def
   ```
   **Note**: This API key requires admin level credentials in order to perform CRUD operations on users, groups, and user attributes resources. Protect this key and always configure your version control system to ignore the `looker.ini` and `.env` files
1. Add `.env` file for app secrets and path to database:
   ```
   PORT=8080
   PATH_TO_DB=./db.json # not required for App Engine deploy
   SCIM_AUTH_SECRET=see setup below
   ```
1. Run `yarn start-nodemon` to start the server locally
   - for App Engine, you will need to add your GCP credentials if you have not already done so. You can do this by running:
     - `gcloud auth application-default login`
     - select your google account
     - click allow to authenticate with the Google Cloud SDK

## Setup / Authentication

- The server authenticates requests from the IdP using a Bearer Token in the HTTP headers. You generate a token from the command line then transfer it to the IdP configuration.
- Token generation and validation is dependent on the `SCIM_AUTH_SECRET` environment variable. This should be supplied as a hex string representing 512 bytes. You can generate such a string with the openssl command:\
  `openssl rand -hex 512`\
  Or with a node one-liner:\
  `node -p 'require("crypto").randomBytes(512).toString("hex")' `\
  Then paste the output into the `.env` file.
- This secret is not the auth token for the IdP! Once the secret is set up, generate the actual token:\
  `yarn run generate-auth-token`
- You can generate multiple auth tokens if needed _and they will all be valid_. Changing the `SCIM_AUTH_SECRET` will invalidate all tokens generated using that secret.

## Option 1: Deploy with GCP App Engine

This app should be easy to deploy on App Engine, which will automatically provide a domain name and TLS. You can use firewall rules to restrict inbound traffic if desired. If the Looker instance has restricted network ingress then you can configure Serverless VPC Access to connect to your VPC or Cloud VPN.

- GCP projects can only contain a single App Engine deployment, so we recommend creating a [new project](https://console.cloud.google.com/projectcreate) dedicated to the SCIM server
  - Note: After creating a new project, you may need to wait up to 1h for your first App Engine deployment. Otherwise you may see build errors like: `Service 'containerregistry.googleapis.com' is not enabled for consumer 'project:{project_name}’` or `ERROR: failed to export: failed to write image to the following tags...`
- After you have made any modifications, you can deploy to App Engine by running the command: `gcloud app deploy --project=YOUR_PROJECT_NAME`
- App Engine will automatically run a custom build step `gcp-build` to compile TypeScript to JavaScript, outputing the files to the `build` folder
- tail the logs by running: `gcloud app logs tail -s default --project=YOUR_PROJECT_NAME` or by visiting: `https://console.cloud.google.com/logs/query?project=YOUR_PROJECT_NAME`

## Option 2: Deploy on GCP VM with SSL Cert

- create VM, Debian GNU/Linux 10 (buster), allow HTTP traffic
- ensure firewall allows ingress on tcp:8080
- create instance group
- register domain on [google domains](https://domains.google.com/registrar/)
- create load balancer
  - backend - http, select the instance group, health check (path /alive, http, port 8080)
  - frontend - https, port 443, create Google-managed certificate with new domain
- cloud DNS - Create zone. Add record set Type A and point to frontend's ip (no port)
- in google domains, update DNS to use custom name servers with the 4 listed under NS in zone
- make sure firewall for looker instance is open to scim server instance ip
- wait a few hours...

### Installing dependencies and repo

```
curl -sL https://deb.nodesource.com/setup_14.x  | sudo -E bash -
sudo apt-get update
sudo apt-get install -y nodejs
sudo apt-get install git
sudo npm install --global yarn
sudo useradd -m -d /home/nodeapp nodeapp # scim server will run as nodeapp user
sudo su - nodeapp
git clone [REPO_URL]
cd looker-scim-proxy
yarn install
yarn start
```

### Installing supervisor

```
sudo apt-get install supervisor
sudo chown -R nodeapp:nodeapp /home/nodeapp/looker-scim-proxy
sudo su
cat >/etc/supervisor/conf.d/node-app.conf << EOF
[program:nodeapp]
directory=/home/nodeapp/looker-scim-proxy
command=yarn start-nodemon
autostart=true
autorestart=true
user=nodeapp
environment=HOME="/home/nodeapp",USER="nodeapp",NODE_ENV="development"
stdout_logfile=syslog
stderr_logfile=syslog
EOF
exit
sudo supervisorctl reread
sudo supervisorctl update
```

### Tail logs

```
tail -f logs/all.log # app logs
tail -f /var/log/syslog # server logs
```

### Issues

- If nodemon gives errors, kill the process, e.g. `Error: listen EADDRINUSE: address already in use :::8080`

```
sudo apt-get install -y lsof
sudo lsof -i :8080
sudo kill -9 {PID}
sudo supervisorctl restart nodeapp # restart supervisor
```
