import User from '../models/User.js';

export const getMe = async (req, res) => {
  try {
    // Ensure req.user exists
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized'
      });
    }

    // Return user data
    res.status(200).json({
      success: true,
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        isVerified: req.user.isVerified,
        authProvider: req.user.authProvider,
        createdAt: req.user.createdAt
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching profile'
    });
  }
};

export const blockUser = async (req, res) => {
  try {
    // Ensure req.user exists
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized'
      });
    }

    const { targetUserId } = req.body;

    // Cannot block self
    if (targetUserId === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot block yourself'
      });
    }

    // Validate target user exists
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get current user with blockedUsers
    const currentUser = await User.findById(req.user._id);
    
    // Check if already blocked
    if (currentUser.blockedUsers.includes(targetUserId)) {
      return res.status(400).json({
        success: false,
        message: 'User is already blocked'
      });
    }

    // Push targetId into blockedUsers
    currentUser.blockedUsers.push(targetUserId);
    await currentUser.save();

    // Return success
    res.status(200).json({
      success: true,
      message: 'User blocked successfully',
      blockedUsers: currentUser.blockedUsers
    });

  } catch (error) {
    console.error('Block user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while blocking user',
      error: error.message
    });
  }
};
