import mongoose from 'mongoose';
// Organization Schema for managing organizations
const organizationSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    minlength: 2,
    maxlength: 50
  },
  displayName: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100
  },
  
  // Contact Information
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    required: true,
    trim: true,
    match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number']
  },
  
  // Address Information
  address: {
    street: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },
    city: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    state: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    zipCode: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20
    },
    country: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    }
  },
  
  // Business Information
  businessType: {
    type: String,
    required: true,
    enum: ['Corporation', 'LLC', 'Partnership', 'Sole Proprietorship', 'Non-Profit', 'Government', 'Other'],
    trim: true
  },
  industry: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  website: {
    type: String,
    trim: true,
    match: [/^https?:\/\/.+/, 'Please enter a valid website URL']
  },
  
  // Administrative Information
  adminUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Will be set after admin user is created
  },
  maxUsers: {
    type: Number,
    default: 50,
    min: 1,
    max: 10000
  },
  
  // Status and Metadata
  status: {
    type: String,
    enum: ['pending', 'active', 'suspended', 'inactive'],
    default: 'pending'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  lastActivity: {
    type: Date,
    default: Date.now
  }
});

// Create Organization model
const Organization = mongoose.model('Organization', organizationSchema);

// Helper functions for organization management
export const createOrganization = async (organizationData) => {
  try {
    const org = new Organization({
      name: organizationData.name.toLowerCase(),
      displayName: organizationData.displayName,
      email: organizationData.email,
      phone: organizationData.phone,
      address: organizationData.address,
      businessType: organizationData.businessType,
      industry: organizationData.industry,
      website: organizationData.website || '',
      maxUsers: organizationData.maxUsers || 50,
      status: 'pending'
    });
    await org.save();
    return { success: true, organization: org };
  } catch (err) {
    if (err.code === 11000) {
      const field = err.keyPattern.name ? 'name' : 'email';
      return { success: false, message: `Organization ${field} already exists` };
    }
    throw err;
  }
};

export const findOrganization = async (organizationName) => {
  try {
    const org = await Organization.findOne({ 
      name: organizationName.toLowerCase(),
      isActive: true 
    });
    return org;
  } catch (err) {
    throw err;
  }
};


export default Organization;