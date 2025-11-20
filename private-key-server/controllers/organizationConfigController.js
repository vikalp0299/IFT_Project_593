import OrganizationConfig from '../models/OrganizationConfig.js';

const normalizeOrganizationName = (value) =>
  (value && typeof value === 'string' && value.trim().length > 0
    ? value.trim().toLowerCase()
    : null);

/**
 * Configure organization on private-key-server
 * Stores the JWT_SECRET from the main server for this organization
 * POST /organization-config
 */
export const configureOrganization = async (req, res) => {
  try {
    const {
      organizationName,
      organizationDisplayName,
      organizationId,
      jwtSecret,
      mainServerUrl,
    } = req.body || {};

    if (!organizationName || !jwtSecret) {
      return res.status(400).json({
        success: false,
        message: 'organizationName and jwtSecret are required',
        code: 'MISSING_FIELDS',
      });
    }

    const normalizedOrg = normalizeOrganizationName(organizationName);
    if (!normalizedOrg) {
      return res.status(400).json({
        success: false,
        message: 'Invalid organization name',
        code: 'INVALID_ORG_NAME',
      });
    }

    // Check if organization is already configured
    let orgConfig = await OrganizationConfig.findOne({
      organizationName: normalizedOrg,
    });

    if (orgConfig) {
      // Update existing configuration
      orgConfig.jwtSecret = jwtSecret.trim();
      if (organizationDisplayName) {
        orgConfig.organizationDisplayName = organizationDisplayName.trim();
      }
      if (organizationId) {
        orgConfig.organizationId = organizationId.toString();
      }
      if (mainServerUrl) {
        orgConfig.mainServerUrl = mainServerUrl.trim();
      }
      orgConfig.isActive = true;
      orgConfig.configuredBy = req.admin?.username || 'system';
      await orgConfig.save();

      return res.json({
        success: true,
        message: 'Organization configuration updated',
        data: {
          organizationName: orgConfig.organizationName,
          organizationDisplayName: orgConfig.organizationDisplayName,
          isActive: orgConfig.isActive,
        },
      });
    } else {
      // Create new configuration
      orgConfig = await OrganizationConfig.create({
        organizationName: normalizedOrg,
        organizationDisplayName: organizationDisplayName?.trim() || normalizedOrg,
        organizationId: organizationId?.toString() || null,
        jwtSecret: jwtSecret.trim(),
        mainServerUrl: mainServerUrl?.trim() || null,
        isActive: true,
        configuredBy: req.admin?.username || 'system',
      });

      return res.status(201).json({
        success: true,
        message: 'Organization configured successfully',
        data: {
          organizationName: orgConfig.organizationName,
          organizationDisplayName: orgConfig.organizationDisplayName,
          isActive: orgConfig.isActive,
        },
      });
    }
  } catch (error) {
    console.error('Configure organization error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to configure organization',
      code: 'CONFIG_ERROR',
    });
  }
};

/**
 * Get organization configuration
 * GET /organization-config/:organizationName
 */
export const getOrganizationConfig = async (req, res) => {
  try {
    const { organizationName } = req.params;
    const normalizedOrg = normalizeOrganizationName(organizationName);

    if (!normalizedOrg) {
      return res.status(400).json({
        success: false,
        message: 'Invalid organization name',
        code: 'INVALID_ORG_NAME',
      });
    }

    const orgConfig = await OrganizationConfig.findOne({
      organizationName: normalizedOrg,
      isActive: true,
    });

    if (!orgConfig) {
      return res.status(404).json({
        success: false,
        message: 'Organization not configured',
        code: 'ORG_NOT_FOUND',
      });
    }

    // Don't return jwtSecret in response for security
    res.json({
      success: true,
      data: {
        organizationName: orgConfig.organizationName,
        organizationDisplayName: orgConfig.organizationDisplayName,
        organizationId: orgConfig.organizationId,
        mainServerUrl: orgConfig.mainServerUrl,
        isActive: orgConfig.isActive,
        configuredAt: orgConfig.configuredAt,
      },
    });
  } catch (error) {
    console.error('Get organization config error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get organization configuration',
      code: 'GET_CONFIG_ERROR',
    });
  }
};

