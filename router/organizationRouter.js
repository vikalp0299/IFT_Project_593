import express from 'express';
import { validateOrganization,validate_signin_organization } from '../controller/organizationController.js';
const orgRouter = express.Router();

orgRouter.post('/validate-organization', validateOrganization);
orgRouter.post('/validate-signin-organization', validate_signin_organization);
//Can add a different route for organization related endpoints here

export default orgRouter;