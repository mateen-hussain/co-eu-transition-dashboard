const { STRING, ENUM, Model} = require('sequelize');
const sequelize = require('services/sequelize');
const Milestone = require('./milestones');

const modelDefinition = {
  project_name: {
    type: STRING,
    displayName: 'Project Name',
    allowNull: false
  },
  department: {
    type: STRING,
    displayName: 'Department',
    allowNull: false,
    showCount: true
  },
  impact: {
    type: ENUM(0,1,2,3),
    allowNull: true,
    displayName: 'Impact'
  },
  hmg_confidence: {
    type: ENUM(0,1,2,3),
    allowNull: true,
    displayName: 'HMG Confidence'
  },
  citizen_readiness: {
    type: ENUM(0,1,2,3),
    allowNull: true,
    displayName: 'Citizen Readiness'
  },
  business_readiness: {
    type: ENUM(0,1,2,3),
    allowNull: true,
    displayName: 'Business Readiness'
  },
  eu_state_confidence: {
    type: ENUM(0,1,2,3),
    allowNull: true,
    displayName: 'EU State Readiness'
  },
  status: {
    type: STRING,
    allowNull: true,
    displayName: 'Status'
  }
};

class Projects extends Model {}
Projects.init(modelDefinition, { sequelize, modelName: 'projects' });
Projects.hasMany(Milestone, { onDelete: 'cascade', hooks: true });
Projects.hasMany(Projects, { as: 'projects_count', foreignKey: 'id' });

module.exports = Projects;