# ATAT Web API
The ATAT Web API is the internal application programming interface that supports the [ATAT Web UI](https://github.com/dod-ccpo/atat-web-ui). This API will invoke the [ATAT CSP Orchestration](https://github.com/dod-ccpo/atat-csp-orchestration) layer.

## ATAT Serverless PoC
The team is building a temporary proof of concept to demonstrate the breadth of serverless technologies that we expect
to use when we roll out the first sets of internal APIs. It can be found in `./poc`. 

### Prerequisites:
* Node Version Manager
  ```
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.38.0/install.sh | bash
  ```
  Then restart your shell.\
  Details available at [Installing and Updating](https://github.com/nvm-sh/nvm#installing-and-updating) in the nvm README.
  
* Node.js 12
  ```
  nvm install 12
  ```
* Serverless Framework
  ```
  npm install -g serverless
  ```
* Typescript
  ```
  npm install -g typescript
  ```
* Azure CLI\
  Follow steps at [Install the Azure CLI](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli) at microsoft.com
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

Follow steps at [Creating a Service Principal](https://www.serverless.com/framework/docs/providers/azure/guide/quick-start#creating-a-service-principal) at serverless.com

---

#### Set $STAGE environment var to a unique string
```
export STAGE=myEnv
```

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

### Expected Output

```
Serverless: Deployed serverless functions:
Serverless: -> Function App not ready. Retry 0 of 30...
Serverless: -> Function App not ready. Retry 1 of 30...
Serverless: -> Function App not ready. Retry 2 of 30...
Serverless: -> Function App not ready. Retry 3 of 30...
Serverless: -> Function App not ready. Retry 4 of 30...
Serverless: -> Function App not ready. Retry 5 of 30...
Serverless: -> Function App not ready. Retry 6 of 30...
Serverless: -> get: [GET] atat-sls-poc-js-eus-dev-atat-js-fallback-jts.azurewebsites.net/api/get
Serverless: -> post: [POST] atat-sls-poc-js-eus-dev-atat-js-fallback-jts.azurewebsites.net/api/post
```
