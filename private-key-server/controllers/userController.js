import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import User from '../models/User.js';
import PrivateKey from '../models/PrivateKey.js';

const normalize = (value = '') => value.toLowerCase().trim();

export const registerLocalUser = async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      firstName,
      lastName,
      jobTitle,
      departmentName,
      organizationName,
      phone,
      role = 'Employee',
    } = req.body || {};

    if (!username || !email || !password || !firstName || !lastName || !departmentName || !organizationName) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        code: 'MISSING_FIELDS',
      });
    }

    const normalizedOrg = normalize(organizationName);
    const normalizedDepartment = normalize(departmentName);

    let departmentRecord = await PrivateKey.findOne({
      organizationName: normalizedOrg,
      departmentName: normalizedDepartment,
    });

    if (!departmentRecord) {
      // Backward compatibility for departments created before organizationName was required
      departmentRecord = await PrivateKey.findOne({
        departmentName: normalizedDepartment,
      });
    }

    if (!departmentRecord) {
      return res.status(404).json({
        success: false,
        message: 'Department not found on private-key-server',
        code: 'DEPARTMENT_NOT_FOUND',
      });
    }

    const existingUser = await User.findOne({
      $or: [{ username: normalize(username) }, { email: email.toLowerCase().trim() }],
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User already exists on private-key-server',
        code: 'USER_EXISTS',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      username: normalize(username),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      jobTitle: jobTitle?.trim() || 'Member',
      phone: phone?.trim() || '',
      department: normalizedDepartment,
      departmentDisplayName: departmentRecord.displayName || departmentName.trim(),
      organizationName: normalizedOrg,
      organizationDisplayName: organizationName.trim(),
      role,
      status: 'active',
      organization: new mongoose.Types.ObjectId(),
    });

    return res.status(201).json({
      success: true,
      message: 'User created on private-key-server',
      data: {
        userId: newUser._id,
        departmentName: newUser.department,
        organizationName: newUser.organizationName,
      },
    });
  } catch (error) {
    console.error('registerLocalUser error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to register user on private-key-server',
      code: 'USER_CREATE_ERROR',
      error: error.message,
    });
  }
};

