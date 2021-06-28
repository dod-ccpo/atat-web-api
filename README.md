# ATAT Web API
The ATAT Web API is the internal application programming interface that supports the [ATAT Web UI](https://github.com/dod-ccpo/atat-web-ui). This API will invoke the [ATAT CSP Orchestration](https://github.com/dod-ccpo/atat-csp-orchestration) layer.

## ATAT Serverless PoC
The team is building a temporary proof of concept to demonstrate the breadth of serverless technologies that we expect
to use when we roll out the first sets of internal APIs. It can be found in `./poc`. 

### Prerequisites:
* Node Version Manager (recommended)\
  Follow instructions at https://github.com/nvm-sh/nvm or:\
  ```curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.38.0/install.sh | bash```\
  Then restart your shell
* Node.js 12\
  ```nvm install 12```
* Serverless Framework\
  ```npm install -g serverless```
* Typescript\
  ```npm install -g typescript```
* Azure CLI (see https://docs.microsoft.com/en-us/cli/azure/install-azure-cli)
---
### Deploying locally
#### Install npm dependencies
```
cd ./poc
npm install
```
The functions can be tested 

---
### Deploying remotely

#### Login to Azure and set subscription
```
az login
az account set -s <subscription-id>
```

#### Create Azure Service Principal and set environment variables
Follow steps at 
https://www.serverless.com/framework/docs/providers/azure/guide/quick-start#creating-a-service-principal
---

#### Deploy app (and repeat as needed iteratively)
```
sls deploy
```
This should create all resources described in `./poc/serverless.yml`. As of this writing (June 26, 2021), this 
consists of the following instances:
* App Insights
* Function App
* Storage Account
* App Service Plan

### Troubleshooting

 App deploy appears to time out 
If you see