import User from "../models/user.model.js";

// ==================================================
// GET PRIMARY EMAIL
// ==================================================

const getPrimaryEmail = (user) => {
  const primaryEmail = user.email_addresses?.find(
    (email) => email.id === user.primary_email_address_id,
  );

  return primaryEmail?.email_address || "";
};

// ==================================================
// SYNC CLERK USER
// ==================================================

export const syncClerkUser = async (clerkUser) => {
  const { id, first_name, last_name } = clerkUser;

  const email = getPrimaryEmail(clerkUser);

  // ==============================================
  // FIND EXISTING MONGODB USER
  // ==============================================

  const user = await User.findOne({
    clerkId: id,
  });

  // ==============================================
  // USER NOT FOUND
  // ==============================================

  if (!user) {
    console.warn(`MongoDB user not found for Clerk user: ${id}`);

    return null;
  }

  // ==============================================
  // UPDATE USER
  // ==============================================

  user.firstName = first_name || user.firstName;

  user.lastName = last_name || user.lastName;

  if (email) {
    user.email = email.toLowerCase();
  }

  await user.save();

  return user;
};

// ==================================================
// DEACTIVATE CLERK USER
// ==================================================

export const deactivateClerkUser = async (clerkUserId) => {
  return User.findOneAndUpdate(
    {
      clerkId: clerkUserId,
    },

    {
      $set: {
        isActive: false,
      },
    },

    {
      new: true,
    },
  );
};
