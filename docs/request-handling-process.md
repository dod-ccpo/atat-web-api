# Handling requests

The process for handling requests is somewhat complex and built to require
maintaining as little state as possible, preferring to store messages in an
SQS Queue over a long-term storage mechanism like a DynamoDB table.

## Data Transformations

The ATAT CSP API and the HOTH API do not use the same representations of data.
This requires transformations between the data types during the requests.

## Cost Request process

This diagram covers the process for how the API is invoked for a Cost Request.

```mermaid
sequenceDiagram
    SNOW->>+HOTH: Start cost requests
    HOTH->>SNOW: HTTP 202 Response
    HOTH->>StartCostJob: Invoke Lambda
    StartCostJob->>CostRequestQueue: Write request
    CostRequestQueue->>CostRequestFn: SQS Lambda Invoke
    CostRequestFn->>CSP: HTTP GET /costs
    CSP->>CostRequestFn: 200 Response
    CostRequestFn->>CostResponseQueue: Write message
    deactivate HOTH
    SNOW->>+HOTH: GET cost data
    HOTH->>ConsumeCostResponse: Invoke Lambda
    ConsumeCostResponse->>CostResponseQueue: sqs.ReceiveMessages
    CostResponseQueue->>ConsumeCostResponse: Messages
    note over ConsumeCostResponse,CostResponseQueue: Up to 10 messages may be returned
    ConsumeCostResponse->>HOTH: Cost data
    HOTH->>-SNOW: Cost data
```

## Provisioning Request process

This diagram covers the process for how the HOTH API is invoked for a Provisioning Request
including sync and async operations for

- AddPortfolio
- AddTaskorder
- AddOperators

**Note:** [Mermaid Live](https://mermaid.live/) to view interactive diagram or [VS code extension Markdown](https://marketplace.visualstudio.com/items?itemName=bierner.markdown-mermaid&ssr=false#review-details).

```mermaid
sequenceDiagram
    SNOW->>+HOTH: Start provisioning request
    HOTH->>SNOW: HTTP 201 Response
    HOTH->>StartProvisioningJobs: Invoke Lambda (start SFN)
    StartProvisioningJobs->>SFNWorkflow: Start SFN steps

    rect rgb(16,109,163)
    SFNWorkflow->>InvokeCspApi: Invoke cspWritePortfolioFn lambda
    Note right of SFNWorkflow: SFN Workflow
    loop Retry
      InvokeCspApi->>InvokeCspApi: Retry lambda twice before erroring out
    end
    InvokeCspApi->>HttpResponse: Choice steps based on response status code
    HttpResponse->>EnqueueResults: Invoke resultFn lambda
    InvokeCspApi-->>EnqueueResults: Retry failure
    EnqueueResults->>ProvisioningJobsQueue: HTTP 200 - Write Sync messages
    ProvisioningJobsQueue->>ProvisioningJobConsumer: Poll messages (event source)
    end

    rect rgb(53,138,89)
    Note right of EnqueueResults: Async processing of CSP provisioning requests
    EnqueueResults->>AsyncProvisioningJobsQueue: HTTP 202 - Write Async messages
    AsyncProvisioningJobsQueue->>AsyncProvisionWatcher: Poll messages (event source)
    AsyncProvisionWatcher->>CSP: Provisioning request to CSP
    CSP->>AsyncProvisionWatcher: CSP response
    AsyncProvisionWatcher->>AsyncProvisioningJobsQueue: Provisioning job still processing
    AsyncProvisionWatcher->>ProvisioningJobsQueue: Provisioning job completed/failed
    end

    deactivate HOTH
    SNOW->>+HOTH: GET Provisioning Jobs
    HOTH->>ProvisioningJobConsumer: Provisioning jobs request
    ProvisioningJobConsumer->>HOTH: Completed/failed Provisioning jobs
    HOTH->>-SNOW: Provisioning jobs
```
