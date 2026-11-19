# NovaPharm Intelligence | private ECR image-layer S3 gateway

Status: **restricted private-network foundation only**. This CloudFormation template does not activate a production portal, API, medical-data service, AI integration, customer login or paid billing.

The dedicated eu-north-1 Intelligence VPC is built in `novapharm-intelligence-network-foundation`. Its private subnets have only the local VPC route. An AWS-managed S3 gateway endpoint, attached **only** to their private route table, enables read-only access to the regional S3 ECR image-layer bucket. Amazon S3 gateway endpoints have no separate hourly charge. Existing identity/role IAM policies continue to apply. This does not establish general Internet access.

## Live stack parameters

The current network foundation outputs VPC `vpc-0caa0618d5a29052a`; the independently inspected private route table is `rtb-022216a93c734b5f1`, associated with `subnet-01ab9197e8e6537ed` and `subnet-03165bd4b19d3a5af`. Independently re-verify all live IDs, tags and AZs immediately before deployment. Do **not** attach to the public or main route table.

Deploy as a separately rollbackable `novapharm-intelligence-ecr-s3-gateway` CloudFormation stack after a successful exact-template ValidateTemplate, passing VpcId and PrivateRouteTableId. Verify the endpoint is AVAILABLE, has one dedicated private route table, and the destination prefix-list route does not add `0.0.0.0/0` or an Internet gateway to the private route table. Retain stack outputs in the architecture/release issue.

## Still mandatory before private Fargate can serve

Private ECR `ecr.api` and `ecr.dkr` interface endpoints, CloudWatch Logs and Secrets Manager interface endpoints (with restricted security groups and route/access proof), and independently reviewed external Cognito JWKS, MongoDB Atlas, approved official data/API and AI-model egress. No NAT, ALB, WAF, public DNS, ECS service or active paid subscription is provisioned here. A deployed Fargate service also needs an immutable reviewed production container image and task execution role, secure tenant-bound API sessions, licensed medicine sources, monitoring, backup/rollback and a signed operational acceptance.

Sources: AWS ECR VPC endpoint guide (Amazon S3 starport layer bucket) and Amazon VPC gateway endpoint pricing/documentation.
