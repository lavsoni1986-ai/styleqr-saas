# StyleQR SaaS Capacity Planning Model

## Growth Projections (12 Months)

### Month 1-3: Launch Phase
- **Users:** 100
- **Restaurants:** 50
- **Daily Orders:** 500
- **Peak Concurrent Users:** 20
- **API Requests/Day:** 10,000

### Month 4-6: Growth Phase
- **Users:** 500
- **Restaurants:** 250
- **Daily Orders:** 2,500
- **Peak Concurrent Users:** 100
- **API Requests/Day:** 50,000

### Month 7-9: Scale Phase
- **Users:** 2,000
- **Restaurants:** 1,000
- **Daily Orders:** 10,000
- **Peak Concurrent Users:** 400
- **API Requests/Day:** 200,000

### Month 10-12: Maturity Phase
- **Users:** 5,000
- **Restaurants:** 2,500
- **Daily Orders:** 25,000
- **Peak Concurrent Users:** 1,000
- **API Requests/Day:** 500,000

## Resource Requirements

### Application Servers

#### Month 1-3
- **Instances:** 2
- **CPU per instance:** 1 vCPU
- **Memory per instance:** 1 GB
- **Total CPU:** 2 vCPU
- **Total Memory:** 2 GB

#### Month 4-6
- **Instances:** 4
- **CPU per instance:** 2 vCPU
- **Memory per instance:** 2 GB
- **Total CPU:** 8 vCPU
- **Total Memory:** 8 GB

#### Month 7-9
- **Instances:** 8
- **CPU per instance:** 2 vCPU
- **Memory per instance:** 4 GB
- **Total CPU:** 16 vCPU
- **Total Memory:** 32 GB

#### Month 10-12
- **Instances:** 16
- **CPU per instance:** 2 vCPU
- **Memory per instance:** 4 GB
- **Total CPU:** 32 vCPU
- **Total Memory:** 64 GB

### Database

#### Month 1-3
- **Instance Type:** db.t3.micro
- **Storage:** 20 GB
- **Connections:** 50
- **IOPS:** 1,000

#### Month 4-6
- **Instance Type:** db.t3.small
- **Storage:** 50 GB
- **Connections:** 100
- **IOPS:** 2,000

#### Month 7-9
- **Instance Type:** db.t3.medium
- **Storage:** 100 GB
- **Connections:** 200
- **IOPS:** 3,000

#### Month 10-12
- **Instance Type:** db.t3.large
- **Storage:** 200 GB
- **Connections:** 500
- **IOPS:** 5,000
- **Consider:** Read replicas

## Storage Growth

### Database Storage

#### Data Growth Rate
- **Orders:** ~1 KB per order
- **Menu Items:** ~500 bytes per item
- **Users:** ~200 bytes per user
- **Daily Growth:** ~25 MB (Month 10-12)

#### Storage Projection
- **Month 1:** 1 GB
- **Month 3:** 5 GB
- **Month 6:** 15 GB
- **Month 9:** 50 GB
- **Month 12:** 150 GB

### Backup Storage
- **Daily backups:** 30 days retention
- **Monthly backups:** 12 months retention
- **Estimated:** 2x database size

## Bandwidth Usage

### API Requests
- **Average request size:** 2 KB
- **Average response size:** 5 KB
- **Total per request:** 7 KB

#### Monthly Bandwidth
- **Month 1-3:** ~2 GB/month
- **Month 4-6:** ~10 GB/month
- **Month 7-9:** ~40 GB/month
- **Month 10-12:** ~100 GB/month

### Database Traffic
- **Estimated:** 10% of API traffic
- **Month 10-12:** ~10 GB/month

## Cloud Cost Estimate

### AWS Pricing (Example)

#### Application Servers (EC2)
- **Month 1-3:** 2x t3.small = $30/month
- **Month 4-6:** 4x t3.medium = $120/month
- **Month 7-9:** 8x t3.medium = $240/month
- **Month 10-12:** 16x t3.medium = $480/month

#### Database (RDS PostgreSQL)
- **Month 1-3:** db.t3.micro = $15/month
- **Month 4-6:** db.t3.small = $50/month
- **Month 7-9:** db.t3.medium = $100/month
- **Month 10-12:** db.t3.large = $200/month

#### Storage
- **Month 1-3:** 20 GB EBS = $2/month
- **Month 4-6:** 50 GB EBS = $5/month
- **Month 7-9:** 100 GB EBS = $10/month
- **Month 10-12:** 200 GB EBS = $20/month

#### Bandwidth
- **Month 1-3:** 2 GB = $0.18/month
- **Month 4-6:** 10 GB = $0.90/month
- **Month 7-9:** 40 GB = $3.60/month
- **Month 10-12:** 100 GB = $9.00/month

#### Load Balancer
- **Month 1-12:** ALB = $25/month

#### Monitoring & Logging
- **Month 1-3:** CloudWatch = $10/month
- **Month 4-6:** CloudWatch = $20/month
- **Month 7-9:** CloudWatch = $40/month
- **Month 10-12:** CloudWatch = $80/month

### Total Monthly Cost

| Month Range | Estimated Cost |
|-------------|----------------|
| Month 1-3   | $82/month      |
| Month 4-6   | $221/month     |
| Month 7-9   | $414/month     |
| Month 10-12 | $814/month     |

### Annual Cost Estimate
- **Year 1:** ~$4,500

## Scaling Triggers

### Horizontal Scaling Triggers
- **CPU > 70%** for 5 minutes
- **Memory > 80%** for 5 minutes
- **Request rate > 100 req/sec** per instance
- **Error rate > 1%** for 2 minutes

### Database Scaling Triggers
- **CPU > 80%** for 10 minutes
- **Connection pool > 90%** utilized
- **Storage > 80%** full
- **Query latency P95 > 100ms** for 5 minutes

## Optimization Opportunities

### Cost Optimization
1. **Reserved Instances:** 30-40% savings
2. **Spot Instances:** 50-70% savings (for non-critical workloads)
3. **Auto-scaling:** Scale down during off-peak hours
4. **Database optimization:** Query optimization, indexing
5. **Caching:** Redis for frequently accessed data

### Performance Optimization
1. **CDN:** For static assets
2. **Database read replicas:** For read-heavy workloads
3. **Connection pooling:** PgBouncer for high scale
4. **Query optimization:** Index optimization, query analysis
5. **Caching layer:** Redis for API responses

## Risk Factors

### High Growth Scenario
If growth exceeds projections by 2x:
- **Cost impact:** 2-3x increase
- **Scaling required:** Immediate horizontal scaling
- **Database:** May need read replicas earlier

### Peak Traffic Events
Special events (holidays, promotions):
- **Traffic spike:** 5-10x normal
- **Mitigation:** Pre-scale before events
- **Cost impact:** Temporary increase

## Monitoring & Alerts

### Key Metrics
- **Application:** CPU, Memory, Request rate, Error rate
- **Database:** CPU, Connections, Query latency, Storage
- **Cost:** Daily spend, projected monthly spend

### Alerts
- **Cost:** Daily spend > $50 (Month 10-12)
- **Performance:** P95 latency > 500ms
- **Capacity:** Storage > 80% full
- **Errors:** Error rate > 1%

