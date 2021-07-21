# ATAT Web API
The ATAT Web API is the internal application programming interface that supports the [ATAT Web UI](https://github.com/dod-ccpo/atat-web-ui). This API will invoke the [ATAT CSP Orchestration](https://github.com/dod-ccpo/atat-csp-orchestration) layer.

## ATAT Portfolio Drafts API
The following steps describe the process for installing and deploying the ATAT Portfolio Drafts API.

### Prerequisites:
* Node Version Manager
  ```
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.38.0/install.sh | bash
  ```
  Then restart your shell.\
  Details available at [Installing and Updating](https://github.com/nvm-sh/nvm#installing-and-updating) in the nvm README.
  
* Node.js
  ```
  nvm install
  ```
  Node.js version is specified in file .nvmrc
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

### Deploying
#### Install npm dependencies
```
cd ./poc/random_quote
npm ci
```



#### Login to Azure and set subscription
```
az login
az account set -s <subscription-id>
```


## Shared Infrastructure
Shared infrastructure for the PoC can be found at `./poc/shared_infrastructure`

### Install dependencies
For a detailed tutorial, follow the guidance here: [Install Terraform](https://learn.hashicorp.com/tutorials/terraform/install-cli?in=terraform/azure-get-started)

### Local Deployment

Navigate to the `./poc/shared_infrastructure` directory.

Ensure you are logged into Azure with `az login`.

#### Terraform Init

You will need the name of the storage account where state will be stored as well as the
resource group that the storage account is in. Those will be called `$AZURE_STORAGE_ACCOUNT` and
`$AZURE_STORAGE_RESOURCE_GROUP` respectively in any subsequent steps.

```
terraform init -backend-config=resource_group_name=$AZURE_STORAGE_RESOURCE_GROUP -backend-config=storage_account_name=$AZURE_STORAGE_ACCOUNT
```

#### Retrieve .tfstate from Azure

Select the correct workspace inside the container on Azure

```
terraform workspace select <name of workspace>
```

You are now connected to the remote .tfstate file on Azure.

#### Plan and Apply

To create an execution plan, run:

```
terraform plan
```

If Terraform detects that no changes are needed to resource instances or to root module output values, terraform plan will report that no actions need to be taken.

To apply your changes, run:

```
terraform apply
```

To destroy the deployed shared_infrastructure run:

```
terraform destroy
```

#### Create Azure Service Principal and set environment variables

Follow steps at [Creating a Service Principal](https://www.serverless.com/framework/docs/providers/azure/guide/quick-start#creating-a-service-principal) at serverless.com




#### Deploy app (and repeat as needed iteratively)
```
sls deploy --stage <your-stage-name> --region 'East US' --tf_environment <your_environment_from_tfvars>
```

This should create all resources described in `./poc/random_quote/serverless.yml`, which represents a single
microservice. As of this writing (July 1, 2021), this consists of the following instances:
* App Insights
* Function App
* Storage Account
* App Service Plan
* API Management Service

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

### Manual Post-deployment Step
NOTE: The Function App created by Serverless Framework needs access to the Key Vault created by Terraform. 
Unfortunately this creates the need for a third step in our process. It must be performed manually, but will be 
automated in the future.

* Log into the Azure Portal
* Navigate to the Key Vault created by your Terraform earlier
* Using the Access Policies screens, provide the Function App created by Serverless Framework with access to the 
Key Vault such that it can read secrets
* Navigate to your Function App and select Configuration
* Look under Application Settings for COSMOS-CONNECTION-STRING and ensure that the Source column has a green check mark
before `Key vault Reference`

#### Destroy app
```
sls remove --stage <your-stage-name> --region 'East US'
```

This should delete and remove all provisioned resources created by the deploy command.



### Running tests

```
npm test
```


### Lint

To run the lint scripts to format and validate the typescript files, use the command:
```shell
npm run lint:fix
```
Otherwise, use the following to only identify the files that need be fixed:
```shell
npm run lint
```

#### Webstorm / JetBrains IDE

You can go to preferences and search for `eslint`. The settings will be under 
`Languages and Frameworks > Javascript > Code Quality Tools > ESLint` and you can select 
`Automatic ESLint Configuration`. 

Clicking on `Run ESLint on save` automatically formats
the code and so you won't have to before every push.

#### VSCODE

To enable auto lint on save for VSCode, install the extension ESLint, and 
the following settings should be auto applied. If not, you can create it by adding
`.vscode/settings.json` and use the following.

```json
{
    "editor.codeActionsOnSave": {
        "source.fixAll.eslint": true
    }
}
```



### Troubleshooting
#### Deploying Hanging
Note that we have observed that on initial deployments, Azure does not appear to actually create the Functions until
we navigate to the `Functions` blade within the Function App that was created. This means that the deployment will get 
stuck and eventually time out after 30 retries. The work-around is just to go into the `Functions` blade once the 
Function App is available.

#### Removing deployment and redeploying
In my deployment testing with the APIM config enabled, after removing the deployment via `sls deploy --stage <stage-name> --region <region>`
there is an issue redeploying with a soft deleted service of the APIM that was removed. It attempts to redeploy with the same service
name and needs to be purged. To fix this, there are some steps utilizing some Azure APIs to find the dangling services and to delete them.

EX: 
```
 Conflict - {
    "code": "ServiceAlreadyExistsInSoftDeletedState",
    "message": "Api service sls-eus-axt-b43731-apim was soft-deleted. In order to create the new service with the same name, you have to either undelete the service or purge it. See https://aka.ms/apimsoftdelete.",
    "details": null,
    "innerError": null
  }

```

The first step is visit the GET api for the deleted services: https://docs.microsoft.com/en-us/rest/api/apimanagement/2020-06-01-preview/deleted-services/list-by-subscription#code-try-0
Click `Try It` and sign in. Select the correct subscription the soft deleted service and to check if it is there.

The second step is to remove them is to visit https://docs.microsoft.com/en-us/rest/api/apimanagement/2020-06-01-preview/deleted-services/purge#code-try-0 
to purge the soft deleted services. 
Click `Try It` and sign in. Enter the correct information for the required fields.
Click `Run` and it should go through. 
There may be a chance that it reports an error where it is not there anymore. I suspect it could be Azure having a delay
in removing the service. 
You can visit the first step again to make sure it is not there anymore.
Afterwards, you can attempt to deploy again.

### Deploying Locally
Use the `offline` capability of Serverless Framework. Note that there appears to be a bug that leaves generated
`function.json` files around at `random_quote/get` and `random_quote/post`, which would otherwise be deleted during the
package process.

```
sls offline
```