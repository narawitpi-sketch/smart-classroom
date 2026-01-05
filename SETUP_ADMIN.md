# How to Set Up an Admin User

The application's security has been updated to use a more secure, server-side authorization model. The hardcoded list of admin emails on the client has been removed.

To make a user an administrator, you now need to do two things:

### 1. Set a Custom Claim via a Server Environment

The application's interface now relies on a custom authentication claim `admin: true` to grant access to the admin dashboard. You need to set this claim for the desired user. This is typically done from a trusted server environment (like a Cloud Function or your local machine with the Firebase Admin SDK).

**Example using Firebase Admin SDK (Node.js):**

First, you need the UID of the user you want to make an admin. You can find this in the Firebase Authentication console.

```javascript
// admin-setup.js
const admin = require('firebase-admin');

// IMPORTANT: Initialize with your service account credentials
const serviceAccount = require('./path/to/your/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const uid = 'USER_UID_TO_MAKE_ADMIN'; // <-- Replace with the user's UID

admin.auth().setCustomUserClaims(uid, { admin: true })
  .then(() => {
    console.log(`Successfully set custom claim for user ${uid}`);
    // The new claim will be available on the user's ID token the next time they sign in.
    process.exit(0);
  })
  .catch(error => {
    console.error('Error setting custom claim:', error);
    process.exit(1);
  });
```

You would run this script once to provision an admin user.

### 2. Add User to 'admins' Collection in Firestore

The new Firestore and Storage security rules use an `admins` collection to grant server-side permissions for database and file operations.

1.  Go to your Firebase Console.
2.  Navigate to **Firestore Database**.
3.  Create a new collection named `admins`.
4.  Create a new document in the `admins` collection.
5.  Set the **Document ID** to be the **UID** of the user you want to make an admin.
6.  You can add any fields to the document (e.g., `name: 'Admin User'`), or leave it empty. The security rules only check for the document's existence.

**By completing both of these steps, the user will have full administrative access.**
