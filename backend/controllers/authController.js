const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { sequelize, User, Employee, Department } = require('../models');
const { JWT_SECRET } = require('../middleware/auth');
const { sendPasswordResetOtp } = require('../utils/emailService');

const register = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { email, password, first_name, last_name, phone, designation, department, department_id, role } = req.body;

    if (!email || !password || !first_name || !last_name) {
      await t.rollback();
      return res.status(400).json({ message: 'First name, last name, email, and password are required.' });
    }

    if (password.length < 6) {
      await t.rollback();
      return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // If role is requested as admin or this is the first user in an empty database, make them an admin
    const totalUsers = await User.count({ transaction: t });
    const assignedRole = role === 'admin' || totalUsers === 0 ? 'admin' : 'employee';

    // Check if an account already exists with the SAME email and SAME role
    const existing = await User.findOne({ where: { email: cleanEmail, role: assignedRole }, transaction: t });
    if (existing) {
      await t.rollback();
      return res.status(400).json({
        message: `An account with this email already exists as ${assignedRole}. Please sign in to the ${assignedRole === 'admin' ? 'Admin' : 'Employee'} Portal.`
      });
    }

    // Generate unique employee ID
    const highestEmp = await Employee.findOne({ order: [['id', 'DESC']], transaction: t });
    const nextNum = highestEmp ? highestEmp.id + 1001 : 1001;
    const generatedEmpId = `EMP-${nextNum}`;

    // Plaintext password as requested
    const user = await User.create(
      {
        email: cleanEmail,
        password: password,
        role: assignedRole,
        is_active: true,
        last_login: new Date()
      },
      { transaction: t }
    );

    // Resolve department text: from user input or fallback to department_id
    let deptText = department ? department.trim() : null;
    if (!deptText && department_id) {
      const dRec = await Department.findByPk(department_id, { transaction: t });
      if (dRec) deptText = dRec.name;
    }
    if (!deptText) deptText = 'General';

    const employee = await Employee.create(
      {
        user_id: user.id,
        employee_id: generatedEmpId,
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        phone: phone ? phone.trim() : null,
        designation: designation && designation.trim() ? designation.trim() : 'Team Member',
        department: deptText,
        department_id: department_id ? parseInt(department_id, 10) : null,
        joining_date: new Date()
      },
      { transaction: t }
    );

    await t.commit();

    const fullEmployee = await Employee.findByPk(employee.id);

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      message: 'Account created successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        last_login: user.last_login,
        employee: fullEmployee
      }
    });
  } catch (error) {
    await t.rollback();
    console.error('Registration error:', error);
    return res.status(500).json({ message: error.message || 'Failed to create account.' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password, portal } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const candidateEmails = [cleanEmail];
    if (!cleanEmail.includes('.')) {
      candidateEmails.push(`${cleanEmail}.com`);
    } else if (cleanEmail.endsWith('.com')) {
      candidateEmails.push(cleanEmail.replace(/\.com$/, ''));
    }

    let user = null;

    if (portal === 'admin' || portal === 'employee') {
      user = await User.findOne({
        where: {
          email: { [Op.in]: candidateEmails },
          role: portal
        },
        include: [
          {
            model: Employee,
            as: 'employee'
          }
        ]
      });

      if (!user) {
        // Check if an account exists under the opposite role to give helpful guidance
        const oppositeRole = portal === 'admin' ? 'employee' : 'admin';
        const otherAccount = await User.findOne({
          where: { email: { [Op.in]: candidateEmails }, role: oppositeRole }
        });

        if (otherAccount) {
          return res.status(401).json({
            message: portal === 'admin'
              ? 'No Administrator account found for this email. This email is registered as an Employee. Please use the Employee Portal.'
              : 'No Employee account found for this email. This email is registered as an Administrator. Please use the Admin Portal, or register an Employee account.'
          });
        }

        return res.status(401).json({
          message: `Invalid credentials. ${portal === 'admin' ? 'Administrator' : 'Employee'} account not found.`
        });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid credentials. Password incorrect.' });
      }
    } else {
      // Portal not specified: find matching users for this email
      const candidateUsers = await User.findAll({
        where: {
          email: { [Op.in]: candidateEmails }
        },
        include: [
          {
            model: Employee,
            as: 'employee'
          }
        ]
      });

      if (!candidateUsers || candidateUsers.length === 0) {
        return res.status(401).json({ message: 'Invalid credentials. User not found.' });
      }

      // If user has both roles or multiple accounts, find the one matching the password
      for (const u of candidateUsers) {
        if (await u.comparePassword(password)) {
          user = u;
          break;
        }
      }

      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials. Password incorrect.' });
      }
    }

    if (!user.is_active) {
      return res.status(403).json({ message: 'Your account has been deactivated. Please contact your administrator.' });
    }

    // Update last login
    user.last_login = new Date();
    await user.save();

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        last_login: user.last_login,
        employee: user.employee
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      message: error.message || 'An unexpected error occurred during login.',
      detail: error.stack
    });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password', 'reset_token', 'reset_token_expiry'] },
      include: [
        {
          model: Employee,
          as: 'employee'
        }
      ]
    });

    return res.json({ user });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ message: 'Failed to retrieve profile.' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { first_name, last_name, phone, address, bio } = req.body;
    const employee = await Employee.findOne({ where: { user_id: req.user.id } });

    if (!employee) {
      return res.status(404).json({ message: 'Employee profile not found.' });
    }

    if (first_name) employee.first_name = first_name.trim();
    if (last_name) employee.last_name = last_name.trim();
    if (phone !== undefined) employee.phone = phone ? phone.trim() : null;
    if (address !== undefined) employee.address = address ? address.trim() : null;
    if (bio !== undefined) employee.bio = bio ? bio.trim() : null;

    await employee.save();

    const updatedUser = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] },
      include: [
        {
          model: Employee,
          as: 'employee'
        }
      ]
    });

    return res.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ message: 'Failed to update profile.' });
  }
};

const changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ message: 'Current password and new password are required.' });
    }

    if (new_password.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters long.' });
    }

    const user = await User.findByPk(req.user.id);
    const isMatch = await user.comparePassword(current_password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect.' });
    }

    user.password = new_password; // Hook handles hashing
    await user.save();

    return res.json({ message: 'Password changed successfully.' });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({ message: 'Failed to update password.' });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email, portal } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ message: 'Email address is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const isAdmin = portal === 'admin';

    // 1. Verify that employee/user actually exists in the company roster
    let user = null;
    if (isAdmin) {
      user = await User.findOne({
        where: { email: cleanEmail, role: 'admin' },
        include: [{ model: Employee, as: 'employee' }]
      });

      if (!user) {
        return res.status(404).json({
          message: 'No administrator account found with this email in the company.'
        });
      }
    } else {
      // Must be registered as an employee with an active employee profile in the company
      user = await User.findOne({
        where: { email: cleanEmail, role: 'employee' },
        include: [
          {
            model: Employee,
            as: 'employee',
            required: true // Inner join: guarantees an employee record exists in the company
          }
        ]
      });

      if (!user || !user.employee) {
        return res.status(404).json({
          message: 'Employee not found in the company roster. Please enter a registered employee work email.'
        });
      }
    }

    // 2. Verify active employment status
    if (user.is_active === false) {
      return res.status(403).json({
        message: 'This employee account is deactivated. Please contact company HR or an administrator.'
      });
    }

    // 3. Generate secure 6-digit numeric OTP
    const otp = crypto.randomInt(100000, 1000000).toString();
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

    // 10-minute validity
    user.reset_token = hashedOtp;
    user.reset_token_expiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    const empName = user.employee ? `${user.employee.first_name} ${user.employee.last_name}` : user.email;
    console.log(`[AUTH] Verified company employee ${empName} (${user.email}). OTP generated: ${otp}`);

    // 4. Dispatch OTP email via emailjs concurrently
    sendPasswordResetOtp({
      to: user.email,
      otp,
      userName: empName
    }).catch((mailErr) => {
      console.warn('[Forgot Password Email Notice]:', mailErr.message);
    });

    return res.json({
      message: `A 6-digit verification code has been sent to ${user.email}. Please check your mailbox.`,
      email: user.email
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ message: 'Failed to process password reset request.' });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { email, otp, portal } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and 6-digit verification code are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = String(otp).trim();
    const hashedOtp = crypto.createHash('sha256').update(cleanOtp).digest('hex');

    const targetRole = portal === 'admin' ? 'admin' : 'employee';
    const user = await User.findOne({
      where: {
        email: cleanEmail,
        role: targetRole,
        reset_token: hashedOtp,
        reset_token_expiry: { [Op.gt]: new Date() }
      },
      include: [{ model: Employee, as: 'employee', required: targetRole === 'employee' }]
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired verification code. Please check the code or request a new one.' });
    }

    return res.json({
      message: 'Verification code confirmed successfully.',
      valid: true
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return res.status(500).json({ message: 'Failed to verify code.' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, otp, token, new_password, portal } = req.body;
    if (!new_password) {
      return res.status(400).json({ message: 'New password is required.' });
    }

    if (new_password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long.' });
    }

    let user = null;
    const targetRole = portal === 'admin' ? 'admin' : 'employee';

    if (otp && email) {
      const cleanEmail = email.trim().toLowerCase();
      const cleanOtp = String(otp).trim();
      const hashedOtp = crypto.createHash('sha256').update(cleanOtp).digest('hex');

      user = await User.findOne({
        where: {
          email: cleanEmail,
          role: targetRole,
          reset_token: hashedOtp,
          reset_token_expiry: { [Op.gt]: new Date() }
        },
        include: [{ model: Employee, as: 'employee', required: targetRole === 'employee' }]
      });
    } else if (token) {
      // Legacy token compatibility
      const hashedToken = crypto.createHash('sha256').update(token.trim()).digest('hex');
      user = await User.findOne({
        where: {
          reset_token: hashedToken,
          reset_token_expiry: { [Op.gt]: new Date() }
        }
      });
    } else {
      return res.status(400).json({ message: 'Verification code and email are required.' });
    }

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired verification code. Please request a new one.' });
    }

    user.password = new_password;
    user.reset_token = null;
    user.reset_token_expiry = null;
    await user.save();

    return res.json({ message: 'Password has been reset successfully. You can now log in.' });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ message: 'Failed to reset password.' });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  verifyOtp,
  resetPassword
};

