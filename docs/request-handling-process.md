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
