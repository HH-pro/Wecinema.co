const express = require("express");
const router = express.Router();
const Domain = require("../models/domainModel");
const { sendWhatsAppMessage } = require('../../services/twilioService');

/**
 * @route GET /domains
 * @description Get all domains
 */
router.get("/domains", async (req, res) => {
  try {
    const domains = await Domain.find();
    res.status(200).json(domains);
  } catch (error) {
    console.error('Error fetching domains:', error);
    res.status(500).json({ error: 'Failed to fetch domains' });
  }
});

router.post("/save-domain", async (req, res) => {
  const { domain, hosting } = req.body;

  if (!domain || !domain.name || !domain.date || !hosting || !hosting.name || !hosting.date) {
    return res.status(400).json({ error: "Domain and Hosting details are required." });
  }

  try {
    const newDomain = new Domain({ domain, hosting });
    await newDomain.save();
    res.status(201).json(newDomain);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route PUT /domain/:id
 * @description Update a domain with hosting
 */
router.put("/domain/:id", async (req, res) => {
  const { domain, hosting } = req.body;

  if (
    !domain || !domain.name || !domain.date ||
    !hosting || !hosting.name || !hosting.date
  ) {
    return res.status(400).json({ error: "Both domain and hosting details are required." });
  }

  try {
    const updated = await Domain.findByIdAndUpdate(
      req.params.id,
      {
        domain: {
          name: domain.name,
          date: domain.date,
        },
        hosting: {
          name: hosting.name,
          date: hosting.date,
        },
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Domain not found" });
    }

    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route DELETE /domain/:id
 * @description Delete a domain by ID
 */
router.delete("/domain/:id", async (req, res) => {
  try {
    const deletedDomain = await Domain.findByIdAndDelete(req.params.id);

    if (!deletedDomain) {
      return res.status(404).json({ error: "Domain not found" });
    }

    res.status(200).json({ message: "Domain deleted successfully", deletedDomain });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
/**
 * @route GET /check-expirations
 * @description Check domain and hosting expirations and send notifications
 * @returns {Object} Results of expiration checks and notifications sent
 */
router.get("/check-expirations", async (req, res) => {
  try {
    const domains = await Domain.find();
    const today = new Date();
    const notificationResults = [];

    for (const domain of domains) {
      // Extract domain information
      const domainName = domain.name;
      const domainExpiry = new Date(domain.date);
      const domainDaysLeft = Math.ceil((domainExpiry - today) / (1000 * 60 * 60 * 24));
      
      // Extract hosting information
      const hostingName = domain.hosting.name;
      const hostingExpiry = new Date(domain.hosting.date);
      const hostingDaysLeft = Math.ceil((hostingExpiry - today) / (1000 * 60 * 60 * 24));

      // Check domain expiration (within 7 days)
      if (domainDaysLeft <= 7 && domainDaysLeft >= 0) {
        const domainMessage = `⚠️ Domain Expiry Alert: ${domainName} expires in ${domainDaysLeft} day(s) on ${domainExpiry.toDateString()}`;
        await sendWhatsAppMessage(domainMessage);
        
        notificationResults.push({
          domain: domainName,
          type: 'domain',
          daysLeft: domainDaysLeft,
          expiryDate: domainExpiry.toISOString().split('T')[0],
          notified: true
        });
      }

      // Check hosting expiration (within 7 days)
      if (hostingDaysLeft <= 7 && hostingDaysLeft >= 0) {
        const hostingMessage = `⚠️ Hosting Expiry Alert: ${hostingName}  expires in ${hostingDaysLeft} day(s) on ${hostingExpiry.toDateString()}`;
        await sendWhatsAppMessage(hostingMessage);
        
        notificationResults.push({
          domain: domainName,
          hosting: hostingName,
          type: 'hosting',
          daysLeft: hostingDaysLeft,
          expiryDate: hostingExpiry.toISOString().split('T')[0],
          notified: true
        });
      }
    }

    res.status(200).json({
      message: 'Expiration check completed',
      totalDomainsChecked: domains.length,
      notificationsSent: notificationResults.length,
      results: notificationResults
    });
  } catch (error) {
    console.error('Error checking expirations:', error);
    res.status(500).json({ 
      error: 'Failed to check expirations',
      details: error.message 
    });
  }
});

router.post('/send-test-message', async (req, res) => {
  // Validate request body
  const { number, message } = req.body;
  
  if (!number || !message) {
    return res.status(400).json({
      success: false,
      error: 'Both number and message are required'
    });
  }

  try {
    console.log('Received WhatsApp request:', { number, message }); // Log the incoming data
    
    const result = await sendWhatsAppMessage(number, message);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error,
        code: result.code
      });
    }

    return res.json({
      success: true,
      sid: result.sid,
      status: result.status,
      message: message // Include the sent message in response for debugging
    });

  } catch (error) {
    console.error('Controller Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'SERVER_ERROR',
      details: error.message
    });
  }
});
module.exports = router;