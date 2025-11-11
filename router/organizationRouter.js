import express from "express";
import { 
  validateOrganization, 
  validate_signin_organization,
  getOrganizationChannels,
  putOrganizationChannels,
  requestAccessToChannel,
  respondToAccessRequest,
  displayAccessRequestsToAdmin
} from '../controller/organizationController.js';

const orgRouter = express.Router();
/**
 * Organization Routes
 */
/**
 * @route POST /org/validate-organization
 * @desc Validate and create new organization
 * @access Public
 */
orgRouter.post('/validate-organization', validateOrganization);

/**
 * @route POST /org/display-access-requests
 * @desc Display access requests for the organization
 * @access Private
 */
orgRouter.get('/display-access-requests', displayAccessRequestsToAdmin);

/**
 * @route POST /org/validate-signin-organization
 * @desc Validate existing organization for sign-in
 * @access Public
 */
orgRouter.post('/validate-signin-organization', validate_signin_organization);

/**
 * @route POST /org/channels
 * @desc Get organization channels
 * @access Private
 */
orgRouter.post('/channels', getOrganizationChannels);

/**
 * @route PUT /org/channels
 * @desc Add channels to organization
 * @access Private
 */
orgRouter.put('/channels', putOrganizationChannels);

/**
 * @route POST /org/request-access
 * @desc Request access to a channel
 * @access Private
 */
orgRouter.post('/request-access', requestAccessToChannel);

/**
 * @route POST /org/respond-access
 * @desc Respond to access request
 * @access Private
 */
orgRouter.post('/respond-access', respondToAccessRequest);

/**
 * Export organization router
 */
export default orgRouter;
