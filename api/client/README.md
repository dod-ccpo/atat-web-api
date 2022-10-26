# ATAT API Client

This module serves as a client for the ATAT CSP Orchestration API specification.
Publicly exported attributes are provided in the `index.ts` file and any deep
imports (for example, `import * as types from 'api/client/types'`) is not
recommended.

The client requires an API token in order to be instantiated as well as a base
URL for requests. For example:

```ts
import { AtatClient } from 'api/client';
new AtatClient("TOKEN", "https://csp.example.com/atat/api/");
```

In general, return data is encapsulated in the field of an object. This allows
for also providing additional fields for metadata. For example,
`getCostsByPortfolio` returns an object with a `costs` field. Each object also
has a `$metadata` field that contains the HTTP status code and the raw HTTP
request that was made.

Under the hood, the client leverages `axios`. In general, this information
should be unimportant; however, it may be useful when testing or considering
integrations with tools like the Lambda Power Tools for TypeScript.

## Future Maintenance

This directory is a potential candidate to be moved into its own package. This
is likely to be necessary in the event that multiple versions of the API need
to be supported within the client. At the moment, a Franken-spec of v0.3.0,
v0.4.0, and draft changes are supported. Pre-v1.0 that is likely tolerable but
may be problematic post-v1.0.
