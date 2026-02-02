const { getConnection, sql } = require('../config/database');
const { logger } = require('../config/logger');

class DatabaseMonitor {
  constructor() {
    this.stats = {
      connections: 0,
      queries: 0,
      errors: 0,
      slowQueries: 0
    };
    
    this.slowQueryThreshold = 1000; // 1 second
    this.queryLog = [];
    this.maxLogSize = 1000;
  }

  async getDatabaseStats() {
    const pool = getConnection();
    
    try {
      // Get connection pool stats
      const statsQuery = `
        SELECT 
          DB_NAME() as database_name,
          COUNT(*) as total_connections,
          SUM(CASE WHEN status = 'sleeping' THEN 1 ELSE 0 END) as sleeping_connections,
          SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as running_connections
        FROM sys.dm_exec_sessions
        WHERE database_id = DB_ID()
          AND is_user_process = 1
      `;
      
      const result = await pool.request().query(statsQuery);
      
      // Get table sizes
      const sizeQuery = `
        SELECT 
          t.name as table_name,
          SUM(p.rows) as row_count,
          SUM(a.total_pages) * 8 / 1024 as size_mb
        FROM sys.tables t
        INNER JOIN sys.partitions p ON t.object_id = p.object_id
        INNER JOIN sys.allocation_units a ON p.partition_id = a.container_id
        WHERE p.index_id IN (0, 1)
        GROUP BY t.name
        ORDER BY size_mb DESC
      `;
      
      const sizeResult = await pool.request().query(sizeQuery);
      
      // Get index fragmentation
      const fragmentationQuery = `
        SELECT 
          OBJECT_NAME(ips.object_id) as table_name,
          i.name as index_name,
          ips.avg_fragmentation_in_percent,
          ips.page_count
        FROM sys.dm_db_index_physical_stats(DB_ID(), NULL, NULL, NULL, 'LIMITED') ips
        INNER JOIN sys.indexes i ON ips.object_id = i.object_id AND ips.index_id = i.index_id
        WHERE ips.avg_fragmentation_in_percent > 30
          AND ips.page_count > 1000
        ORDER BY ips.avg_fragmentation_in_percent DESC
      `;
      
      const fragmentationResult = await pool.request().query(fragmentationQuery);
      
      return {
        connections: result.recordset[0],
        tableSizes: sizeResult.recordset,
        indexFragmentation: fragmentationResult.recordset,
        monitorStats: this.stats,
        recentQueries: this.queryLog.slice(-10)
      };
      
    } catch (error) {
      logger.error('Failed to get database stats:', error);
      return null;
    }
  }

  logQuery(query, params, duration) {
    const logEntry = {
      timestamp: new Date(),
      query: query.substring(0, 200) + (query.length > 200 ? '...' : ''),
      params: params ? JSON.stringify(params).substring(0, 100) : null,
      duration,
      isSlow: duration > this.slowQueryThreshold
    };
    
    this.queryLog.push(logEntry);
    this.stats.queries++;
    
    if (logEntry.isSlow) {
      this.stats.slowQueries++;
      logger.warn('Slow query detected:', logEntry);
    }
    
    // Keep log size manageable
    if (this.queryLog.length > this.maxLogSize) {
      this.queryLog = this.queryLog.slice(-this.maxLogSize);
    }
  }

  logError(error, context) {
    this.stats.errors++;
    logger.error('Database error:', {
      context,
      error: error.message,
      stack: error.stack
    });
  }

  async healthCheck() {
    const pool = getConnection();
    
    try {
      // Simple query to check database connectivity
      const startTime = Date.now();
      await pool.request().query('SELECT 1 as health_check');
      const duration = Date.now() - startTime;
      
      this.logQuery('SELECT 1 as health_check', null, duration);
      
      return {
        status: 'healthy',
        responseTime: duration,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      this.logError(error, 'healthCheck');
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async optimizeIfNeeded() {
    const stats = await this.getDatabaseStats();
    
    if (!stats || !stats.indexFragmentation) {
      return;
    }
    
    // Rebuild indexes with high fragmentation
    for (const index of stats.indexFragmentation) {
      if (index.avg_fragmentation_in_percent > 30) {
        try {
          logger.info(`Rebuilding index ${index.index_name} on ${index.table_name} (fragmentation: ${index.avg_fragmentation_in_percent}%)`);
          
          const pool = getConnection();
          await pool.request().query(`
            ALTER INDEX ${sql.escapeName(index.index_name)} 
            ON ${sql.escapeName(index.table_name)} 
            REBUILD
          `);
          
          logger.info(`Successfully rebuilt index ${index.index_name}`);
          
        } catch (error) {
          logger.error(`Failed to rebuild index ${index.index_name}:`, error);
        }
      }
    }
  }
}

// Singleton instance
const dbMonitor = new DatabaseMonitor();

// Schedule periodic optimization (every 24 hours)
if (process.env.NODE_ENV === 'production') {
  setInterval(() => {
    dbMonitor.optimizeIfNeeded();
  }, 24 * 60 * 60 * 1000);
}

module.exports = dbMonitor;