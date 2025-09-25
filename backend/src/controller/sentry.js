// File: routes/sentry.js
const express = require("express");
const axios = require("axios");
const si = require('systeminformation');
const { MongoClient } = require('mongodb');
const twilio = require("twilio");
const router = express.Router();

// Environment Configuration
const SENTRY_ORG = process.env.SENTRY_ORG || 'wecinema-5x';
const SENTRY_PROJECT = process.env.SENTRY_PROJECT || 'wecinema';
const SENTRY_TOKEN = process.env.SENTRY_TOKEN || '85d6993b45b7a351360422491c6d2e3cbfb23872baf16d59f2763c1c2f125210';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://hamzamanzoor046:9Jf9tuRZv2bEvKES@wecinema.15sml.mongodb.net/admin?retryWrites=true&w=majority&authSource=admin';

// Twilio Configuration
const accountSid = process.env.TWILIO_ACCOUNT_SID || 'AC38eb9207822aa3a28c803f96d49f68ae';
const authToken = process.env.TWILIO_AUTH_TOKEN || '45fc31f42e4719ad907311ca6a61aa58';
const twilioPhoneNumber = process.env.TWILIO_PHONE || 'whatsapp:+14155238886';
const recipientNumber = process.env.RECIPIENT_PHONE || 'whatsapp:+923117836704';
const twilioClient = twilio(accountSid, authToken);

// MongoDB Connection Management
let mongoDb = null;
let mongoClientInstance = null;
const connectToMongo = async () => {
  if (mongoDb) return mongoDb;
  
  try {
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 1,
      connectTimeoutMS: 10000,
      ssl: true, // Required for Atlas
      authSource: 'admin'
    };

    console.log('Connecting to MongoDB Atlas...');
    
    mongoClientInstance = new MongoClient(MONGODB_URI, options);
    await mongoClientInstance.connect();
    
    mongoDb = mongoClientInstance.db('admin');
    console.log('✅ MongoDB Atlas connection successful!');
    return mongoDb;
  } catch (error) {
    console.error('❌ MongoDB Atlas connection failed:');
    console.error('Error message:', error.message);
    
    if (error.name === 'MongoServerSelectionError') {
      console.error('Network issue detected. Please check:');
      console.error('1. Server has internet access');
      console.error('2. Firewall allows outbound traffic on port 27017');
      console.error('3. DNS resolution works for "*.mongodb.net"');
    }
    
    throw error;
  }
};
// MongoDB Cluster Metrics Endpoint
router.get('/mongodb', async (req, res) => {
  try {
    const db = await connectToMongo();
    
    // Get cluster-wide storage metrics
    const listDatabases = await db.admin().listDatabases();
    const totalSize = listDatabases.databases.reduce(
      (sum, db) => sum + db.sizeOnDisk, 0
    );

    // Get server status and operations data
    const serverStatus = await db.admin().serverStatus();

    // Collect shard information if available
    let shards = [];
    try {
      const shardCollection = db.collection('shards');
      if (shardCollection) {
        const shardDocs = await shardCollection.find().toArray();
        shards = await Promise.all(shardDocs.map(async (shard) => {
          try {
            const shardConn = await new MongoClient(shard.host).connect();
            const shardDb = shardConn.db('admin');
            const shardStats = await shardDb.admin().serverStatus();
            await shardConn.close();
            
            return {
              name: shard._id,
              status: 'active',
              size: shardStats.storageSize,
              documents: shardStats.indexCounters?.numDocs || 0,
              chunks: shardStats.chunkCount || 0
            };
          } catch (shardError) {
            console.error(`⚠️ Shard ${shard._id} connection failed:`, shardError.message);
            return {
              name: shard._id,
              status: 'offline',
              size: 0,
              documents: 0,
              chunks: 0
            };
          }
        }));
      }
    } catch (error) {
      console.log('ℹ️ Non-sharded cluster or shard info unavailable');
    }

    // Prepare final response
    res.json({
      storage: {
        usedBytes: serverStatus.storageSize,
        totalBytes: totalSize,
        dataSize: serverStatus.dataSize,
        indexSize: serverStatus.indexSize
      },
      operations: {
        reads: serverStatus.opcounters?.query || 0,
        writes: (serverStatus.opcounters?.insert || 0) + 
                (serverStatus.opcounters?.update || 0) +
                (serverStatus.opcounters?.delete || 0),
        queries: serverStatus.metrics?.query?.executor || 0,
        commands: serverStatus.opcounters?.command || 0
      },
      connections: {
        current: serverStatus.connections?.current || 0,
        available: serverStatus.connections?.available || 0
      },
      status: serverStatus.ok === 1 ? 'online' : 'offline',
      shards
    });

  } catch (error) {
    console.error('❌ MongoDB metrics error:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch MongoDB cluster metrics',
      details: error.message
    });
  }
});

// Sentry Error Monitoring with WhatsApp Alerts
router.get('/errors', async (req, res) => {
  try {
    const response = await axios.get(
      `https://sentry.io/api/0/projects/${SENTRY_ORG}/${SENTRY_PROJECT}/issues/`,
      {
        headers: { Authorization: `Bearer ${SENTRY_TOKEN}` }
      }
    );

    const simplifiedErrors = response.data.map(error => ({
      id: error.id,
      title: error.title,
      count: error.count,
      lastSeen: error.lastSeen,
      status: error.status,
      level: error.level,
      url: `https://sentry.io/organizations/${SENTRY_ORG}/issues/${error.id}/`
    }));

    // Send alerts for top 3 errors
    for (const error of simplifiedErrors.slice(0, 3)) {
      const message = 
      `🚨 *${SENTRY_PROJECT} Error Alert* 🚨
      
🗂 *Project:* ${SENTRY_PROJECT}
⚠️ *Title:* ${error.title}
🔥 *Level:* ${error.level}
⏰ *Last Seen:* ${new Date(error.lastSeen).toLocaleString()}
📊 *Occurrences:* ${error.count}

🔗 [View Details](${error.url})`;

      await twilioClient.messages.create({
        body: message,
        from: twilioPhoneNumber,
        to: recipientNumber
      });
    }

    res.json(simplifiedErrors);
  } catch (error) {
    console.error('❌ Sentry errors:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to fetch Sentry errors',
      details: error.response?.data || error.message
    });
  }
});

// Performance Metrics Endpoint
router.get('/performance', async (req, res) => {
  try {
    const { period = '24h' } = req.query;
    
    const [perfResponse, webVitalsResponse, resourcesResponse] = await Promise.all([
      axios.get(`https://sentry.io/api/0/organizations/${SENTRY_ORG}/events-stats/`, {
        headers: { Authorization: `Bearer ${SENTRY_TOKEN}` },
        params: {
          query: 'event.type:transaction',
          statsPeriod: period,
          interval: '1h',
          field: [
            'p75(transaction.duration)',
            'count()',
            'p75(measurements.lcp)',
            'p75(measurements.fid)',
            'p75(measurements.cls)'
          ]
        }
      }),
      axios.get(`https://sentry.io/api/0/organizations/${SENTRY_ORG}/events-stats/`, {
        headers: { Authorization: `Bearer ${SENTRY_TOKEN}` },
        params: {
          query: 'transaction.op:pageload',
          statsPeriod: period,
          field: ['p75(transaction.duration)'],
          groupBy: ['transaction']
        }
      }),
      axios.get(`https://sentry.io/api/0/organizations/${SENTRY_ORG}/events-stats/`, {
        headers: { Authorization: `Bearer ${SENTRY_TOKEN}` },
        params: {
          query: 'event.type:transaction',
          statsPeriod: period,
          field: [
            'sum(http.request_content_length)',
            'sum(http.response_content_length)'
          ]
        }
      })
    ]);
    
    // Process performance data
    const performanceData = perfResponse.data.data.map(([timestamp, values]) => ({
      timestamp: new Date(timestamp * 1000).toISOString(),
      duration_p75: values[0]?.count || 0,
      request_count: values[1]?.count || 0,
      lcp_p75: values[2]?.count || 0,
      fid_p75: values[3]?.count || 0,
      cls_p75: values[4]?.count || 0
    }));

    const pageLoadTimes = webVitalsResponse.data.data.map(entry => ({
      page: entry.transaction,
      load_time: entry['p75(transaction.duration)']
    }));

    const storageMetrics = {
      request_size: resourcesResponse.data.data[0]?.['sum(http.request_content_length)'] || 0,
      response_size: resourcesResponse.data.data[0]?.['sum(http.response_content_length)'] || 0
    };

    res.json({
      performance: performanceData,
      page_load_times: pageLoadTimes,
      storage: {
        total: storageMetrics.request_size + storageMetrics.response_size,
        ...storageMetrics
      },
      web_vitals: {
        lcp: Math.round(
          performanceData.reduce((acc, curr) => acc + curr.lcp_p75, 0) / performanceData.length
        ),
        fid: Math.round(
          performanceData.reduce((acc, curr) => acc + curr.fid_p75, 0) / performanceData.length
        ),
        cls: Math.round(
          performanceData.reduce((acc, curr) => acc + curr.cls_p75, 0) / performanceData.length
        )
      }
    });

  } catch (error) {
    console.error('❌ Performance metrics:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to fetch performance metrics',
      details: error.response?.data || error.message
    });
  }
});

// Web Vitals Endpoint
router.get('/web-vitals', async (req, res) => {
  try {
    const response = await axios.get(
      `https://sentry.io/api/0/organizations/${SENTRY_ORG}/events-stats/`,
      {
        headers: { Authorization: `Bearer ${SENTRY_TOKEN}` },
        params: {
          query: 'has:measurements.lcp has:measurements.fid has:measurements.cls',
          statsPeriod: '24h',
          interval: '1h',
          field: [
            'p75(measurements.lcp)',
            'p75(measurements.fid)',
            'p75(measurements.cls)'
          ]
        }
      }
    );

    // Find latest valid data point
    const lastDataPoint = [...response.data.data].reverse().find(([_, values]) =>
      values.every(val => val.value !== null)
    );

    const [_, values] = lastDataPoint || [0, [0, 0, 0]];

    res.json({
      lcp: values?.[0]?.value || 0,
      fid: values?.[1]?.value || 0,
      cls: values?.[2]?.value || 0
    });
  } catch (error) {
    console.error('❌ Web vitals:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to fetch Web Vitals',
      details: error.response?.data || error.message
    });
  }
});

// Alert Webhook Endpoint
router.post("/sentry-alert", async (req, res) => {
  const alert = req.body;
  
  const message = 
  `🚨 *Sentry Alert* 🚨

🗂 *Project:* ${alert.project || 'N/A'}
⚠️ *Title:* ${alert.title || 'Untitled'}
🔥 *Level:* ${alert.level || 'info'}
🔗 [View Details](${alert.web_url || 'https://sentry.io'})`;

  try {
    await twilioClient.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: recipientNumber
    });

    console.log("✅ WhatsApp alert sent");
    res.sendStatus(200);
  } catch (error) {
    console.error("❌ WhatsApp send failed:", error.message);
    res.status(500).json({ error: 'Failed to send alert' });
  }
});

// System Metrics Endpoint
router.get('/system', async (req, res) => {
  try {
    const [cpu, memory, disk, networkStats] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.fsSize(),
      si.networkStats()
    ]);

    const memoryUsagePercent = (memory.used / memory.total) * 100;
    const totalNetworkInMB = networkStats.reduce((sum, iface) => sum + iface.rx_bytes, 0) / 1048576;
    const totalNetworkOutMB = networkStats.reduce((sum, iface) => sum + iface.tx_bytes, 0) / 1048576;

    res.json({
      cpuLoad: cpu.currentLoad,
      memory: {
        total: memory.total,
        used: memory.used,
        free: memory.free,
        usagePercent: memoryUsagePercent,
      },
      disk: disk.map(d => ({
        mount: d.mount,
        totalGB: (d.size / 1073741824).toFixed(2),
        usedGB: (d.used / 1073741824).toFixed(2),
        usage: d.use,
      })),
      network: {
        incomingMB: totalNetworkInMB.toFixed(2),
        outgoingMB: totalNetworkOutMB.toFixed(2),
      }
    });
  } catch (error) {
    console.error('❌ System metrics:', error.message);
    res.status(500).json({ error: 'Failed to fetch system information' });
  }
});

// Cleanup MongoDB connection
process.on('SIGINT', async () => {
  if (mongoClientInstance) {
    await mongoClientInstance.close();
    console.log('🛑 MongoDB connection closed');
  }
  process.exit();
});

module.exports = router;