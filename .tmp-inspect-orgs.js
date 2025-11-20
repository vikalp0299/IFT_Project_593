const mongoose = require('mongoose');
const Organization = require('./models/Organization.js').default || require('./models/Organization.js');
const Department = require('./models/Department.js').default || require('./models/Department.js');
(async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/safe-app');
    const orgs = await Organization.find({}, { name: 1, displayName: 1 }).lean();
    console.log('Organizations:', orgs.map(o => ({ id: o._id.toString(), name: o.name, displayName: o.displayName })));
    const deptCounts = await Department.aggregate([
      { $group: { _id: '', count: { $sum: 1 } } }
    ]);
    console.log('Department counts per orgId:', deptCounts.map(d => ({ orgId: d._id?.toString(), count: d.count })));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
