import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { initializeApp as initClient } from 'firebase/app';
import {
  getAuth as getClientAuth,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Import express app, User model, and auth middleware
import app from './src/app.js';
import apiRoutes from './src/routes/api.js';
import User from './src/models/User.js';
import { verifyAuth } from './src/middleware/auth.js';

// Mount test route on apiRoutes router before 404 handler to verify downstream identity contract
apiRoutes.get('/test-identity-contract', verifyAuth, (req, res) => {
  res.json({
    success: true,
    firebaseUid: req.user?.uid,
    userId: req.userId ? req.userId.toString() : null,
    mongoUserEmail: req.mongoUser?.email
  });
});

const TEST_PORT = 5008;
const API_BASE = `http://localhost:${TEST_PORT}/api`;

console.log('====================================================');
console.log('   DASTAAN AUTHENTICATION & PROFILE FULL E2E TEST   ');
console.log('====================================================');

// Setup Firebase Client with Emulator
const clientApp = initClient({
  apiKey: 'fake-api-key',
  projectId: 'dastaan-32c4e',
  authDomain: 'dastaan-32c4e.firebaseapp.com'
});
const clientAuth = getClientAuth(clientApp);
connectAuthEmulator(clientAuth, 'http://127.0.0.1:9099', { disableWarnings: true });

async function runTests() {
  let serverInstance = null;
  const testEmail = `dastaan_traveler_${Date.now()}@example.com`;
  const testPassword = 'SecurePassword123!';
  let createdUid = null;

  try {
    // Step 0: Connect to MongoDB Atlas and start test Express server
    console.log('\n[1/12] Connecting to MongoDB Atlas & starting Express server...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('   ✓ Connected to MongoDB Atlas:', mongoose.connection.name);

    await new Promise((resolve) => {
      serverInstance = app.listen(TEST_PORT, () => {
        console.log(`   ✓ Express test server listening on port ${TEST_PORT}`);
        resolve();
      });
    });

    // Step 1: Sign up user via Firebase Client SDK
    console.log('\n[2/12] Testing Firebase Signup with email & password...');
    const signupResult = await createUserWithEmailAndPassword(clientAuth, testEmail, testPassword);
    createdUid = signupResult.user.uid;
    console.log('   ✓ Firebase user created successfully!');
    console.log('     UID:', createdUid);
    console.log('     Email:', signupResult.user.email);
    console.log('     Email Verified:', signupResult.user.emailVerified);

    const initialToken = await signupResult.user.getIdToken();
    console.log('   ✓ Received Firebase ID Token from Client SDK (length:', initialToken.length, ')');

    // Step 2: Test Duplicate Signup handling
    console.log('\n[3/12] Testing Duplicate Signup attempt with same email...');
    try {
      await createUserWithEmailAndPassword(clientAuth, testEmail, testPassword);
      throw new Error('Duplicate signup should have been rejected!');
    } catch (dupErr) {
      if (dupErr.code === 'auth/email-already-in-use') {
        console.log('   ✓ Successfully rejected duplicate signup with code: auth/email-already-in-use');
      } else {
        throw dupErr;
      }
    }

    // Step 3: MongoDB profile creation on first authentication via POST /api/auth/profile
    console.log('\n[4/12] Testing MongoDB profile initialization via POST /api/auth/profile...');
    const initProfileRes = await fetch(`${API_BASE}/auth/profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${initialToken}`
      },
      body: JSON.stringify({
        name: 'Dastaan Traveler',
        mobile: '+91 9876543210',
        travelStyle: 'BALANCED'
      })
    });

    const initProfileData = await initProfileRes.json();
    console.log('   Response status:', initProfileRes.status);

    if (!initProfileRes.ok || !initProfileData.success) {
      throw new Error('Profile initialization failed: ' + JSON.stringify(initProfileData));
    }

    // Direct MongoDB verification
    const mongoUser = await User.findOne({ firebaseUid: createdUid });
    if (!mongoUser) throw new Error('User was not found in MongoDB!');
    console.log('   ✓ Verified MongoDB profile stored in database:');
    console.log('     _id:', mongoUser._id.toString());
    console.log('     firebaseUid:', mongoUser.firebaseUid);
    console.log('     email:', mongoUser.email);
    console.log('     name:', mongoUser.name);
    console.log('     travelStyle:', mongoUser.travelStyle);
    console.log('     role:', mongoUser.role);
    console.log('     has passwordHash:', !!mongoUser.passwordHash);

    if (mongoUser.passwordHash) {
      throw new Error('SECURITY VIOLATION: passwordHash should NOT exist in MongoDB!');
    }
    if (mongoUser.role !== 'user') {
      throw new Error('SECURITY VIOLATION: Initial role must default to user!');
    }

    // Step 4: Test downstream identity contract (req.userId & req.mongoUser)
    console.log('\n[5/12] Testing downstream identity contract (req.userId & req.mongoUser)...');
    const contractRes = await fetch(`${API_BASE}/test-identity-contract`, {
      headers: { 'Authorization': `Bearer ${initialToken}` }
    });
    const contractData = await contractRes.json();
    console.log('   Identity contract response:', contractData);
    if (contractData.userId !== mongoUser._id.toString() || contractData.firebaseUid !== createdUid) {
      throw new Error('Identity contract failed: req.userId or req.user.uid not matching MongoDB profile!');
    }
    console.log('   ✓ Downstream identity contract verified: req.userId matches MongoDB ObjectId, req.user.uid matches Firebase UID!');

    // Step 5: Test Logout
    console.log('\n[6/12] Testing Firebase Logout...');
    await signOut(clientAuth);
    console.log('   ✓ Successfully signed out from Firebase.');

    // Step 6: Test Login with Invalid credentials
    console.log('\n[7/12] Testing Login with INVALID password...');
    try {
      await signInWithEmailAndPassword(clientAuth, testEmail, 'WrongPassword999!');
      throw new Error('Login with invalid password should have thrown an error!');
    } catch (invalidLoginErr) {
      console.log('   ✓ Invalid credentials rejected as expected:', invalidLoginErr.code);
    }

    // Step 7: Test Login with Valid credentials & session restoration
    console.log('\n[8/12] Testing Login with VALID credentials...');
    const loginResult = await signInWithEmailAndPassword(clientAuth, testEmail, testPassword);
    console.log('   ✓ Successfully authenticated with Firebase.');
    const freshToken = await loginResult.user.getIdToken();
    console.log('   ✓ Fresh ID token obtained.');

    // Step 8: GET /api/auth/me to retrieve profile & ensure NO duplicate profiles created
    console.log('\n[9/12] Testing Profile retrieval & duplicate check via GET /api/auth/me...');
    const meRes = await fetch(`${API_BASE}/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${freshToken}`
      }
    });

    const meData = await meRes.json();
    console.log('   Response status:', meRes.status);
    console.log('   User returned:', meData.user?.name, meData.user?.email);

    if (!meRes.ok || !meData.success) {
      throw new Error('GET /api/auth/me failed: ' + JSON.stringify(meData));
    }

    // Verify exactly ONE user in MongoDB matches this email / UID
    const countByUid = await User.countDocuments({ firebaseUid: createdUid });
    const countByEmail = await User.countDocuments({ email: testEmail });
    console.log('   Profile count by UID in MongoDB:', countByUid);
    console.log('   Profile count by Email in MongoDB:', countByEmail);

    if (countByUid !== 1 || countByEmail !== 1) {
      throw new Error(`Duplicate profile detected! Count by UID: ${countByUid}, by Email: ${countByEmail}`);
    }
    console.log('   ✓ Verified profile reuse on repeated logins with zero duplicates!');

    // Step 9: Test Profile Update via PATCH /api/auth/profile
    console.log('\n[10/12] Testing permitted profile updates via PATCH /api/auth/profile...');
    const updateRes = await fetch(`${API_BASE}/auth/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${freshToken}`
      },
      body: JSON.stringify({
        travelStyle: 'PACKED',
        name: 'Updated Traveler Name',
        phoneNumber: '+91 9999988888'
      })
    });

    const updateData = await updateRes.json();
    console.log('   Response status:', updateRes.status);
    console.log('   Updated travelStyle:', updateData.user?.travelStyle);
    console.log('   Updated name:', updateData.user?.name);
    console.log('   Updated phone:', updateData.user?.phoneNumber);

    if (updateData.user?.travelStyle !== 'PACKED' || updateData.user?.name !== 'Updated Traveler Name') {
      throw new Error('Profile update was not persisted correctly!');
    }
    console.log('   ✓ Permitted profile updates succeeded!');

    // Step 10: Security test: Unauthorized role elevation attempt
    console.log('\n[11/12] Testing Security: Malicious attempt to elevate role to admin...');
    const maliciousRoleRes = await fetch(`${API_BASE}/auth/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${freshToken}`
      },
      body: JSON.stringify({
        role: 'admin',
        travelStyle: 'RELAXED'
      })
    });

    const maliciousData = await maliciousRoleRes.json();
    const checkedUser = await User.findOne({ firebaseUid: createdUid });
    console.log('   Role after attempted elevation:', checkedUser.role);

    if (checkedUser.role === 'admin') {
      throw new Error('SECURITY BREACH: Client successfully altered role to admin!');
    }
    console.log('   ✓ Role elevation blocked! User role remained: "user".');

    // Step 11: Security test: Missing, malformed, and forged tokens
    console.log('\n[12/12] Testing Security: Protected routes reject missing or forged tokens...');
    const noTokenRes = await fetch(`${API_BASE}/auth/me`);
    console.log('   Missing token status code:', noTokenRes.status, '(expected 401)');
    if (noTokenRes.status !== 401) throw new Error('Expected 401 for missing token');

    const badTokenRes = await fetch(`${API_BASE}/auth/me`, {
      headers: { 'Authorization': 'Bearer bad_fake_jwt_token_12345' }
    });
    console.log('   Invalid token status code:', badTokenRes.status, '(expected 401)');
    if (badTokenRes.status !== 401) throw new Error('Expected 401 for invalid token');

    console.log('   ✓ Security rejection verified!');

    // Cleanup test record
    await User.deleteOne({ firebaseUid: createdUid });
    console.log('\n✓ Cleaned up test user from MongoDB Atlas.');

    console.log('\n====================================================');
    console.log('  ALL 12 END-TO-END INTEGRATION TESTS PASSED 100%!  ');
    console.log('====================================================\n');
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    if (createdUid) {
      await User.deleteOne({ firebaseUid: createdUid }).catch(() => {});
    }
    process.exit(1);
  } finally {
    if (serverInstance) {
      serverInstance.close();
    }
    await mongoose.disconnect().catch(() => {});
    process.exit(0);
  }
}

runTests();
