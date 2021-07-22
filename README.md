# ATAT Web API
The ATAT Web API is the internal application programming interface that supports the [ATAT Web UI](https://github.com/dod-ccpo/atat-web-ui). This API will invoke the [ATAT CSP Orchestration](https://github.com/dod-ccpo/atat-csp-orchestration) layer.

## ATAT Portfolio Drafts API
The following steps describe the process for installing and deploying the ATAT Portfolio Drafts API.

### Install Prerequisites
---
These software packages are required.

| Package | Command | Notes |
| ----------- | ----------- |----------- |
| Node Version Manager | `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.38.0/install.sh \| bash` | Then restart your shell. Details available in the [nvm README](https://github.com/nvm-sh/nvm#installing-and-updating). |
| Node.js | `nvm install` | Node.js version is specified in file `./.nvmrc` |
| Serverless Framework | `npm install -g serverless` | n/a |
| TypeScript | `npm install -g typescript` | n/a |
| Azure CLI | n/a | Follow steps at [Install the Azure CLI](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli) at microsoft.com |
| Terraform | n/a | Follow steps at [Install Terraform](https://learn.hashicorp.com/tutorials/terraform/install-cli?in=terraform/azure-get-started) at hashicorp.com |

### Deploy Shared Infrastructure
---
This monorepo currently contains a single Application (ATAT Portfolio Drafts API), but may eventually contain multiple Applications which all share some common infrastructure pieces. The following instructions describe their deployment:
[Terraform](https://www.terraform.io/) will be used to deploy shared infrastructure in Microsoft Azure.
Examples of such shared resources:
* Key Vault
* Storage Account
* Cosmos DB Account and Database 
* Azure Service Bus

The following is a list of `main.tf` files and their locations which can be used with Terraform to deploy Shared Infrastructure:
* `./provisioning/shared_infrastructure/main.tf`

#### Prerequisites
1. Navigate to a directory containing a `main.tf` file.
2. Prepare a file `terraform.tfvars` from file `terraform.tfvars.template` in the same directory (if available)
3. Ensure you are logged in to Azure with `az login`
4. Set your desired subscription with `az account set -s <subscription-id>`.  You can view the selected subscription with `az account show` 

#### Terraform Steps

##### Initialization
You will need the name of a storage account where Terraform [state](https://www.terraform.io/docs/language/state/index.html) will be stored as well as the [resource group](https://docs.microsoft.com/en-us/azure/azure-resource-manager/management/manage-resource-groups-portal#what-is-a-resource-group) that contains it. Those will be called `$AZURE_STORAGE_ACCOUNT` and `$AZURE_STORAGE_RESOURCE_GROUP` respectively in any subsequent steps.

```
terraform init -backend-config=resource_group_name=$AZURE_STORAGE_RESOURCE_GROUP -backend-config=storage_account_name=$AZURE_STORAGE_ACCOUNT
```

##### Select a workspace

Terraform state is stored by default in a file named _terraform.tfstate_.  In this case it is stored remotely inside the storage container on Azure.

Optionally, create a new terraform workspace.
```
terraform workspace new <your-workspace-name>
```

Select the desired workspace.
```
terraform workspace select <your-workspace-name>
```

You are now connected to the remote .tfstate file.

##### Plan and Apply

To create an execution plan, run:

```
terraform plan
```

If Terraform detects that no changes are necessary, `plan` will report that no actions need to be taken.

To apply your changes, run:

```
terraform apply
```

To destroy the deployed shared infrastructure run:

```
terraform destroy
```

### Deploy ATAT Portolio Drafts API with Serverless Framework
---
[Serverless Framework](https://www.serverless.com/) will be used to deploy Azure Function Apps.

The following is a list of `serverless.yml` files and their locations which can be used with Serverless Framework to deploy Function Apps:
* `./provisioning/serverless.yml`

#### Prerequisites
1. Navigate to a directory containing a `serverless.yml` file.
2. This directory also contains a `package.json` file. Install JavaScript dependencies with `npm ci`
3. Ensure you are logged in to Azure with `az login`
4. Set your desired subscription with `az account set -s <subscription-id>`.  You can view the selected subscription with `az account show`

#### Create a Service Principal

If you've already installed Azure CLI, logged in to Azure CLI, and set a subscription, you are ready to generate the service principal.

Generate Service Principal for Azure Subscription
```
az ad sp create-for-rbac --name <my-unique-name>
```

Set environment variables with values from above service principal
```
export AZURE_SUBSCRIPTION_ID='<subscriptionId>'
export AZURE_TENANT_ID='<tenantId>'
export AZURE_CLIENT_ID='<servicePrincipalId>'
export AZURE_CLIENT_SECRET='<password>'
```

For more details, see [Creating a Service Principal](https://www.serverless.com/framework/docs/providers/azure/guide/quick-start#creating-a-service-principal) at serverless.com

#### Deploy

The `deploy` command should create all resources described in `serverless.yml`

```
sls deploy --stage <your-stage-name> --region 'East US' --tf_environment <your-environment-from-tfvars>
```

The expected output should look similar to this:

```
Serverless: Deployed serverless functions:
Serverless: -> Function App not ready. Retry 0 of 30...
Serverless: -> Function App not ready. Retry 1 of 30...
Serverless: -> Function App not ready. Retry 2 of 30...
Serverless: -> Function App not ready. Retry 3 of 30...
Serverless: -> get: [GET] atat-sls-poc-js-eus-dev-atat-js-fallback-jts.azurewebsites.net/api/get
Serverless: -> post: [POST] atat-sls-poc-js-eus-dev-atat-js-fallback-jts.azurewebsites.net/api/post
```


#### Grant Function App access to read Key Vault secrets
The newly created Function App needs permission to access the Key Vault in the shared infrastructure such that it can read secrets in that vault. This step must be performed manually, but will be automated in the future.
1. Log in to Azure Portal
2. Navigate to the Key Vault in the shared infrastructure
3. Select _Access policies_ under the _Settings_ heading in the resource menu on the left
4. Click _Add Access Policy_
5. On the _Add access policy_ screen, select _Get_ from the _Secret permissions_ drop-down
6. On the same screen, select a principal by supplying the name of the Function App
7. Click Add.  This will close the _Add access policy_ screen.
8. **Click Save**

Now verify that the Function App can access the required secret.

1. Navigate to the newly created Function App
2. Select _Configuration_ under the _Settings_ heading in the resource menu on the left
3. Under _Application settings_ look for `COSMOS-CONNECTION-STRING` and **ensure that the _Source_ column contains a green check mark** before _Key vault Reference_
4. Click on _Refresh_ in the commands bar at the top if necessary

#### Remove

The `remove` command should remove (destroy) all resources created by the `deploy` command.

```
sls remove --stage <your-stage-name> --region 'East US'
```

### Support Information
---

#### Running unit tests

Execute all [Jest](https://jestjs.io/) tests.
```
npm test
```


#### Linting files

To run the lint scripts to format and validate the typescript files, use the command:
```shell
npm run lint:fix
```
Otherwise, use the following to only identify the files that need be fixed:
```shell
npm run lint
```

##### JetBrains WebStorm linting config

You can go to preferences and search for `eslint`. The settings will be under 
`Languages and Frameworks > Javascript > Code Quality Tools > ESLint` and you can select 
`Automatic ESLint Configuration`. 

Clicking on `Run ESLint on save` automatically formats
the code and so you won't have to before every push.

##### Microsoft VS Code linting config

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



#### Troubleshooting
##### Serverless deploy hangs
Note that we have observed that on initial deployments, Azure does not appear to actually create the Functions until
we navigate to the `Functions` blade within the Function App that was created. This means that the deployment will get 
stuck and eventually time out after 30 retries. The work-around is just to go into the `Functions` blade once the 
Function App is available.

##### Removing deployment and redeploying
In my deployment testing with the APIM config enabled, after removing the deployment via `sls deploy --stage <stage-name> --region <region>`
there is an issue redeploying with a soft deleted service of the APIM that was removed. It attempts to redeploy with the same service
name and needs to be purged. To fix this, there are some steps utilizing some Azure APIs to find the dangling services and to delete them.

Example: 
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

#### Deploying Locally
Use the `offline` capability of Serverless Framework. Note that there appears to be a bug that leaves generated
`function.json` files around at `random_quote/get` and `random_quote/post`, which would otherwise be deleted during the
package process.

```
sls offline
```
