# Database Connection Scaling Strategy

## Connection Pool Configuration

### Development
```env
DATABASE_URL="postgresql://...?connection_limit=10&connect_timeout=5"
```

### Staging
```env
DATABASE_URL="postgresql://...?connection_limit=20&connect_timeout=10"
```

### Production
```env
DATABASE_URL="postgresql://...?connection_limit=20&connect_timeout=10"
```

## Scaling Formula

### Per Application Instance
- **Base connections:** 5
- **Per concurrent request:** 1 connection (estimated)
- **Buffer:** 5 connections
- **Total per instance:** `5 + (concurrent_requests * 1) + 5`

### Total Database Connections
- **Max connections per instance:** 20
- **Number of instances:** N
- **Total connections needed:** `N * 20`
- **PostgreSQL max_connections:** Should be `(N * 20) + 50` (buffer)

## Connection Pool Saturation Detection

### Metrics to Monitor
- Active connections
- Idle connections
- Connection wait time
- Connection errors

### Alerts
- **Warning:** Connection pool > 80% utilized
- **Critical:** Connection pool > 95% utilized
- **Critical:** Connection wait time > 100ms

## Scaling Recommendations

### Horizontal Scaling
When adding more application instances:
1. Increase PostgreSQL `max_connections`
2. Monitor connection pool utilization
3. Consider connection pooling (PgBouncer) for high scale

### Connection Pooling (PgBouncer)
For 100+ instances:
- Use PgBouncer in transaction mode
- Pool size: 100-200 connections
- Application connections: Unlimited (PgBouncer handles pooling)

## Example Scaling Scenarios

### Scenario 1: 10 Instances
- **Per instance:** 20 connections
- **Total:** 200 connections
- **PostgreSQL max_connections:** 250

### Scenario 2: 50 Instances
- **Per instance:** 20 connections
- **Total:** 1000 connections
- **Solution:** Use PgBouncer
- **PgBouncer pool:** 150 connections
- **PostgreSQL max_connections:** 200

### Scenario 3: 100+ Instances
- **Must use PgBouncer**
- **PgBouncer pool:** 200 connections
- **PostgreSQL max_connections:** 250
- **Application connections:** Unlimited (via PgBouncer)

