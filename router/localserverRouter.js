import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import LocalServer from '../models/LocalServer.js';

const router = express.Router();

const normalizeBaseUrl = (value = '') => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const hasProtocol = /^https?:\/\//i.test(trimmed);
  const candidate = hasProtocol ? trimmed : `http://${trimmed}`;

  try {
    const parsed = new URL(candidate);
    // Remove trailing slash for consistency
    const normalizedPath = parsed.pathname.replace(/\/+$/, '');
    const base =
      normalizedPath && normalizedPath !== '/'
        ? `${parsed.origin}${normalizedPath}`
        : parsed.origin;
    return base;
  } catch (error) {
    return null;
  }
};

const ensureAdmin = [authenticateToken, requireRole(['Admin'])];

const fetchServersForOrg = async (organizationId) => {
  const servers = await LocalServer.find({ organization: organizationId })
    .sort({ createdAt: -1 })
    .lean();
  return servers.map((server) => ({
    id: server._id.toString(),
    baseUrl: server.baseUrl,
    isActive: server.isActive,
    addedAt: server.createdAt,
    addedByName: server.addedByName,
  }));
};

router.get('/', ensureAdmin, async (req, res) => {
  try {
    const servers = await fetchServersForOrg(req.user.organizationId);
    res.json({
      success: true,
      data: {
        servers,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch private key servers',
    });
  }
});

router.post('/', ensureAdmin, async (req, res) => {
  try {
    const normalizedUrl = normalizeBaseUrl(req.body?.baseUrl);

    if (!normalizedUrl) {
      return res.status(400).json({
        success: false,
        message: 'A valid base URL is required',
      });
    }

    // Ensure no duplicate entries for the same organization
    const existing = await LocalServer.findOne({
      organization: req.user.organizationId,
      baseUrl: normalizedUrl,
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'This server has already been added.',
      });
    }

    await LocalServer.updateMany(
      { organization: req.user.organizationId, isActive: true },
      { $set: { isActive: false } }
    );

    await LocalServer.create({
      organization: req.user.organizationId,
      organizationName: req.user.organizationName || 'Unknown',
      baseUrl: normalizedUrl,
      addedBy: req.user.id,
      addedByName: `${req.user.firstName ?? 'Admin'} ${req.user.lastName ?? ''}`.trim(),
      isActive: true,
    });

    const servers = await fetchServersForOrg(req.user.organizationId);

    res.status(201).json({
      success: true,
      message: 'Server added successfully',
      data: {
        servers,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to add server',
    });
  }
});

router.patch('/:serverId/activate', ensureAdmin, async (req, res) => {
  try {
    const { serverId } = req.params;

    const targetServer = await LocalServer.findOne({
      _id: serverId,
      organization: req.user.organizationId,
    });

    if (!targetServer) {
      return res.status(404).json({
        success: false,
        message: 'Server not found',
      });
    }

    await LocalServer.updateMany(
      { organization: req.user.organizationId, isActive: true },
      { $set: { isActive: false } }
    );

    targetServer.isActive = true;
    await targetServer.save();

    const servers = await fetchServersForOrg(req.user.organizationId);

    res.json({
      success: true,
      message: 'Active server updated successfully',
      data: {
        servers,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update active server',
    });
  }
});

export default router;

