import express from "express";
import { 
  validateOrganization, 
  validate_signin_organization,
  getOrganizationChannels,
  putOrganizationChannels
} from '../controller/organizationController.js';

const orgRouter = express.Router();

/**
 * @route POST /org/validate-organization
 * @desc Validate and create new organization
 * @access Public
 */
orgRouter.post('/validate-organization', validateOrganization);

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

export default orgRouter;
