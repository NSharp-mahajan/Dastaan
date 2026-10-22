import test from 'node:test';
import assert from 'node:assert/strict';
import { generateItinerary, destinationTemplates } from '../src/utils/itineraryGenerator.js';
import { signToken, verifyToken, hashPassword, comparePassword } from '../src/utils/token.js';
import Trip from '../src/models/Trip.js';
import SavedDestination from '../src/models/SavedDestination.js';
import User from '../src/models/User.js';
import {
  createTrip,
  getUserTrips,
  getTripById,
  updateTrip,
  deleteTrip
} from '../src/controllers/tripController.js';
import { authenticateUser, optionalAuth } from '../src/middleware/auth.js';
import {
  getSavedDestinations,
  saveDestination,
  removeSavedDestination
} from '../src/controllers/savedDestinationController.js';

// Mock Response Helper for unit/integration testing
function createMockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    }
  };
  return res;
}

test('--- Unit Tests: Itinerary Generator ---', async (t) => {
  await t.test('generates complete itinerary for destination with default days', () => {
    const itin = generateItinerary({
      destination: { id: 'manali', name: 'Manali', country: 'India' },
      duration: 3,
      budget: 12000,
      travelStyle: 'Balanced',
      interests: ['Nature', 'Culture']
    });

    assert.ok(itin);
    assert.equal(itin.days.length, 3);
    assert.equal(itin.days[0].dayNum, 1);
    assert.equal(itin.days[1].dayNum, 2);
    assert.equal(itin.days[2].dayNum, 3);
    assert.ok(itin.tagline.includes('Manali'));
    assert.ok(itin.tagline.includes('nature'));
    assert.equal(itin.breakdown.length, 5);
    assert.equal(itin.breakdown[0].pct, 40); // Accommodation
    assert.equal(itin.breakdown[0].amount, 4800);
  });

  await t.test('handles custom long duration by extending itinerary seamlessly', () => {
    const itin = generateItinerary({
      destination: { id: 'jaipur', name: 'Jaipur' },
      duration: 6,
      budget: 20000,
      travelStyle: 'Packed',
      interests: ['History']
    });

    assert.equal(itin.days.length, 6);
    assert.equal(itin.days[5].dayNum, 6);
    assert.ok(itin.days[0].activities.length > 0);
    assert.ok(itin.overview.includes('packed'));
  });

  await t.test('falls back to default template for unknown destination', () => {
    const itin = generateItinerary({
      destination: { id: 'unknown-city', name: 'Unknown City' },
      duration: 2,
      budget: 5000
    });

    assert.ok(itin);
    assert.equal(itin.days.length, 2);
    assert.ok(itin.days[0].activities.length > 0);
  });
});

test('--- Unit Tests: Token & Cryptography Utilities ---', async (t) => {
  await t.test('signs and verifies a valid JWT Bearer token', () => {
    const payload = { id: 'user_123', email: 'traveler@dastaan.com', name: 'Traveler' };
    const token = signToken(payload);
    assert.ok(token);

    const verified = verifyToken(token);
    assert.ok(verified);
    assert.equal(verified.id, 'user_123');
    assert.equal(verified.email, 'traveler@dastaan.com');
  });

  await t.test('rejects tampered or forged JWT tokens', () => {
    const token = signToken({ id: 'user_123' });
    const forgedToken = token.slice(0, -5) + 'abcde';
    const result = verifyToken(forgedToken);
    assert.equal(result, null);
  });

  await t.test('hashes and correctly verifies SHA-256 passwords', () => {
    const plain = 'SecretTravelPassword123';
    const hash = hashPassword(plain);
    assert.equal(hash.length, 64);
    assert.ok(comparePassword(plain, hash));
    assert.ok(!comparePassword('WrongPassword', hash));
  });
});

test('--- Integration Tests: Auth Middleware ---', async (t) => {
  await t.test('authenticateUser rejects requests without Bearer token with 401', async () => {
    const req = { headers: {} };
    const res = createMockRes();
    let nextCalled = false;

    await authenticateUser(req, res, () => { nextCalled = true; });
    assert.equal(res.statusCode, 401);
    assert.equal(nextCalled, false);
    assert.ok(res.body.message.includes('Authentication required'));
  });

  await t.test('authenticateUser accepts valid Bearer token and attaches req.user', async () => {
    const token = signToken({ id: '507f1f77bcf86cd799439011', email: 'yash@dastaan.com', name: 'Yash' });
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = createMockRes();
    let nextCalled = false;

    await authenticateUser(req, res, () => { nextCalled = true; });
    assert.equal(nextCalled, true);
    assert.ok(req.user);
    assert.equal(req.user.email, 'yash@dastaan.com');
  });

  await t.test('optionalAuth sets req.user to null when no token provided without failing', async () => {
    const req = { headers: {} };
    const res = createMockRes();
    let nextCalled = false;

    await optionalAuth(req, res, () => { nextCalled = true; });
    assert.equal(nextCalled, true);
    assert.equal(req.user, null);
  });
});

test('--- Validation & Security Tests: Trip Controller ---', async (t) => {
  // Valid user stub used by validation tests so they reach input-check logic
  const validUser = { _id: '507f1f77bcf86cd799439011', email: 'test@dastaan.com' };

  await t.test('createTrip rejects missing or invalid destination', async () => {
    const req = {
      user: validUser,
      body: {
        destination: null,
        duration: 3,
        budget: 8000
      }
    };
    const res = createMockRes();
    await createTrip(req, res, () => {});

    assert.equal(res.statusCode, 400);
    assert.ok(res.body.message.includes('destination'));
  });

  await t.test('createTrip rejects invalid duration (< 1 or > 60)', async () => {
    const req = {
      user: validUser,
      body: {
        destination: { id: 'manali', name: 'Manali' },
        duration: 0,
        budget: 8000
      }
    };
    const res = createMockRes();
    await createTrip(req, res, () => {});

    assert.equal(res.statusCode, 400);
    assert.ok(res.body.message.includes('duration'));
  });

  await t.test('createTrip rejects budget below minimum ₹1,000', async () => {
    const req = {
      user: validUser,
      body: {
        destination: { id: 'manali', name: 'Manali' },
        duration: 3,
        budget: 500
      }
    };
    const res = createMockRes();
    await createTrip(req, res, () => {});

    assert.equal(res.statusCode, 400);
    assert.ok(res.body.message.includes('budget'));
  });

  await t.test('getTripById rejects invalid MongoDB ObjectId format with 400', async () => {
    const req = { params: { id: 'invalid-id-123' } };
    const res = createMockRes();
    await getTripById(req, res, () => {});

    assert.equal(res.statusCode, 400);
    assert.ok(res.body.message.includes('Invalid trip ID format'));
  });

  await t.test('getUserTrips rejects unauthenticated requests with 401', async () => {
    const req = { user: null };
    const res = createMockRes();
    await getUserTrips(req, res, () => {});

    assert.equal(res.statusCode, 401);
    assert.ok(res.body.message.includes('Authentication required'));
  });

  await t.test('enforces cross-user isolation: User B cannot access User A private trip', async () => {
    const userA_Id = '507f1f77bcf86cd799439011';
    const userB_Id = '507f191e810c19729de860ea';
    const tripId = '654321098765432109876543';

    // Stub Trip.findById temporarily
    const originalFindById = Trip.findById;
    Trip.findById = async (id) => {
      return {
        _id: id,
        user: userA_Id,
        destination: { id: 'kyoto', name: 'Kyoto' },
        duration: 4,
        budget: 25000
      };
    };

    try {
      // User B attempts to access User A's trip
      const reqB = {
        params: { id: tripId },
        user: { _id: userB_Id, email: 'userB@test.com' }
      };
      const resB = createMockRes();
      await getTripById(reqB, resB, () => {});

      assert.equal(resB.statusCode, 403);
      assert.ok(resB.body.message.includes('Access denied'));

      // Unauthenticated user attempts to access User A's private trip
      const reqAnon = {
        params: { id: tripId },
        user: null
      };
      const resAnon = createMockRes();
      await getTripById(reqAnon, resAnon, () => {});

      assert.equal(resAnon.statusCode, 403);
      assert.ok(resAnon.body.message.includes('Access denied'));

      // User A (the owner) accesses their own trip
      const reqA = {
        params: { id: tripId },
        user: { _id: userA_Id, email: 'userA@test.com' }
      };
      const resA = createMockRes();
      await getTripById(reqA, resA, () => {});

      assert.equal(resA.statusCode, 200);
      assert.equal(resA.body.data.destination.name, 'Kyoto');
    } finally {
      Trip.findById = originalFindById;
    }
  });

  await t.test('enforces cross-user isolation: User B cannot update User A trip', async () => {
    const userA_Id = '507f1f77bcf86cd799439011';
    const userB_Id = '507f191e810c19729de860ea';
    const tripId = '654321098765432109876543';

    const originalFindById = Trip.findById;
    Trip.findById = async (id) => {
      return {
        _id: id,
        user: userA_Id,
        duration: 3,
        budget: 8000,
        save: async () => {}
      };
    };

    try {
      const reqB = {
        params: { id: tripId },
        user: { _id: userB_Id },
        body: { duration: 5 }
      };
      const resB = createMockRes();
      await updateTrip(reqB, resB, () => {});

      assert.equal(resB.statusCode, 403);
      assert.ok(resB.body.message.includes('Access denied'));
    } finally {
      Trip.findById = originalFindById;
    }
  });

  await t.test('enforces cross-user isolation: User B cannot delete User A trip', async () => {
    const userA_Id = '507f1f77bcf86cd799439011';
    const userB_Id = '507f191e810c19729de860ea';
    const tripId = '654321098765432109876543';

    const originalFindById = Trip.findById;
    Trip.findById = async (id) => {
      return {
        _id: id,
        user: userA_Id
      };
    };

    try {
      const reqB = {
        params: { id: tripId },
        user: { _id: userB_Id }
      };
      const resB = createMockRes();
      await deleteTrip(reqB, resB, () => {});

      assert.equal(resB.statusCode, 403);
      assert.ok(resB.body.message.includes('Access denied'));
    } finally {
      Trip.findById = originalFindById;
    }
  });
});

test('--- Saved Destination Controller ---', async (t) => {
  const userA = '507f1f77bcf86cd799439011';
  const userB = '507f191e810c19729de860ea';

  await t.test('lists only the authenticated user’s saved destinations', async () => {
    const expected = [{ destinationId: 'kyoto', user: userA }];
    const originalFind = SavedDestination.find;
    let query;
    SavedDestination.find = (filter) => {
      query = filter;
      return { sort: async () => expected };
    };
    try {
      const res = createMockRes();
      await getSavedDestinations({ user: { _id: userA } }, res, () => {});
      assert.deepEqual(query, { user: userA });
      assert.equal(res.statusCode, 200);
      assert.equal(res.body.count, 1);
      assert.deepEqual(res.body.data, expected);
    } finally {
      SavedDestination.find = originalFind;
    }
  });

  await t.test('saves destination metadata under the authenticated user', async () => {
    const originalCreate = SavedDestination.create;
    SavedDestination.create = async (doc) => doc;
    try {
      const res = createMockRes();
      await saveDestination({
        user: { _id: userA },
        body: { destinationId: ' kyoto ', destinationName: ' Kyoto ', country: ' Japan ', user: userB }
      }, res, () => {});
      assert.equal(res.statusCode, 201);
      assert.deepEqual(res.body.data, {
        user: userA,
        destinationId: 'kyoto',
        destinationName: 'Kyoto',
        country: 'Japan'
      });
    } finally {
      SavedDestination.create = originalCreate;
    }
  });

  await t.test('returns conflict for a duplicate save', async () => {
    const originalCreate = SavedDestination.create;
    SavedDestination.create = async () => { throw Object.assign(new Error('duplicate'), { code: 11000 }); };
    try {
      const res = createMockRes();
      await saveDestination({ user: { _id: userA }, body: { destinationId: 'kyoto' } }, res, () => {});
      assert.equal(res.statusCode, 409);
      assert.match(res.body.message, /already saved/i);
    } finally {
      SavedDestination.create = originalCreate;
    }
  });

  await t.test('rejects unauthenticated list, save, and remove operations', async () => {
    const operations = [
      (res) => getSavedDestinations({ user: null }, res, () => {}),
      (res) => saveDestination({ user: null, body: { destinationId: 'kyoto' } }, res, () => {}),
      (res) => removeSavedDestination({ user: null, params: { destinationId: 'kyoto' } }, res, () => {})
    ];
    for (const operation of operations) {
      const res = createMockRes();
      await operation(res);
      assert.equal(res.statusCode, 401);
    }
  });

  await t.test('removes a saved destination owned by the authenticated user', async () => {
    const originalFindOneAndDelete = SavedDestination.findOneAndDelete;
    let query;
    SavedDestination.findOneAndDelete = async (filter) => {
      query = filter;
      return { destinationId: 'kyoto', user: userA };
    };
    try {
      const res = createMockRes();
      await removeSavedDestination({ user: { _id: userA }, params: { destinationId: 'kyoto' } }, res, () => {});
      assert.deepEqual(query, { user: userA, destinationId: 'kyoto' });
      assert.equal(res.statusCode, 200);
      assert.equal(res.body.success, true);
    } finally {
      SavedDestination.findOneAndDelete = originalFindOneAndDelete;
    }
  });

  await t.test('cannot remove another user’s saved destination', async () => {
    const originalFindOneAndDelete = SavedDestination.findOneAndDelete;
    let query;
    SavedDestination.findOneAndDelete = async (filter) => {
      query = filter;
      return null;
    };
    try {
      const res = createMockRes();
      await removeSavedDestination({ user: { _id: userB }, params: { destinationId: 'kyoto' } }, res, () => {});
      assert.deepEqual(query, { user: userB, destinationId: 'kyoto' });
      assert.equal(res.statusCode, 404);
    } finally {
      SavedDestination.findOneAndDelete = originalFindOneAndDelete;
    }
  });
});
