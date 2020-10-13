const Page = require('core/pages/page');
const { paths } = require('config');
const sequelize = require('services/sequelize');
const fileUpload = require('express-fileupload');
const flash = require('middleware/flash');
const authentication = require('services/authentication');
const logger = require('services/logger');
const validation = require('helpers/validation');
const parse = require('helpers/parse');
const { removeNulls } = require('helpers/utils');
const config = require('config');
const BulkImport = require('models/bulkImport');
const Entity = require('models/entity');
const Category = require('models/category');
const { Op } = require('sequelize');
const moment = require('moment');
const entityUserPermissions = require('middleware/entityUserPermissions');

class EntityImport extends Page {
  static get isEnabled() {
    return config.features.entityData;
  }

  get url() {
    return paths.dataEntryEntity.import;
  }

  get middleware() {
    return [
      ...authentication.protect(['uploader']),
      fileUpload({ safeFileNames: true }),
      flash,
      entityUserPermissions.assignEntityIdsUserCanAccessToLocals
    ];
  }

  async import(categoryName, entities) {
    const category = await Category.findOne({
      where: { name: categoryName }
    });
    const categoryFields = await Category.fieldDefinitions(categoryName);

    for(const entity of entities) {
      const transaction = await sequelize.transaction();
      try {
        await Entity.import(entity, category, categoryFields, { transaction });
        await transaction.commit();
      } catch (error) {
        logger.error(`Error importing entity ${JSON.stringify(entity)}`);
        await transaction.rollback();
        throw error;
      }
    }
  }

  validateItems(items, parsedItems, fields) {
    const requiredColumns = fields.filter(field => field.isRequired).map(field => field.displayName);
    const allowedColumns = fields.map(field => field.displayName);

    const columnErrors = validation.validateColumns(Object.keys(items[0]), requiredColumns, allowedColumns);

    const itemErrors = validation.validateItems(parsedItems, fields);

    return [columnErrors, itemErrors];
  }

  validateUserCanAccessEntities(parsedEntities, categoryFields) {
    const entityAccessErrors = [];
    const entityPublicIdsUserCanAccess = this.res.locals.entitiesUserCanAccess.map(entity => entity.publicId);

    parsedEntities.forEach((entity, itemIndex) => {
      let userCanEditEntity = true;
      if (entity.publicId) {
        userCanEditEntity = entityPublicIdsUserCanAccess.includes(entity.publicId);
      } else {
        const categoryParentFields = categoryFields.filter(field => field.isParentField);
        const parentPublicIds = categoryParentFields.map(field => entity[field.name]);
        userCanEditEntity = entityPublicIdsUserCanAccess.find(entityIdUserCanAccess => parentPublicIds.includes(entityIdUserCanAccess))
      }

      if(!userCanEditEntity) {
        entityAccessErrors.push({
          item: entity,
          itemIndex: itemIndex + 1,
          error: 'You do not have permissions to edit this entity'
        });
      }
    });

    return entityAccessErrors;
  }

  async validateEntities(category, entities) {
    const categoryFields = await Category.fieldDefinitions(category);
    const parsedEntities = parse.parseItems(entities, categoryFields);

    categoryFields.forEach(categoryField => {
      if(categoryField.type === 'date') {
        parsedEntities.forEach(entity => {
          if(moment(entity[categoryField.name], 'DD/MM/YYYY').isValid()) {
            entity[categoryField.name] = moment(entity[categoryField.name], 'DD/MM/YYYY').format('YYYY-MM-DD');
          }
        });
      }
    })

    if (!parsedEntities || !parsedEntities.length) {
      const entityColumnErrors = [{ error: 'No entities found' }];
      return { entityColumnErrors };
    }

    let [
      entityColumnErrors,
      entityErrors
    ] = this.validateItems(entities, parsedEntities, categoryFields);

    const userIsAdmin = this.req.user.roles.map(role => role.name).includes('admin');

    if (!userIsAdmin) {
      const entityAccessErrors = this.validateUserCanAccessEntities(parsedEntities, categoryFields);
      entityErrors.push(...entityAccessErrors);
    }

    return { entityErrors, entityColumnErrors, parsedEntities };
  }

  async validateImport(importData) {
    const {
      entityErrors,
      entityColumnErrors,
      parsedEntities
    } = await this.validateEntities(importData.category, importData.data[0].data);

    const errors = { entityErrors, entityColumnErrors };

    return {
      errors: removeNulls(errors, 1),
      entities: parsedEntities,
      importId: importData.id
    };
  }

  async finaliseImport(importId) {
    const activeImport = await BulkImport.findOne({
      where: {
        userId: this.req.user.id,
        id: importId,
        category: {
          [Op.not]: 'data-entry-old'
        }
      },
      raw: true
    });

    if (!activeImport) {
      return this.res.redirect(config.paths.dataEntryEntity.bulkUploadFile);
    }

    const { errors, entities } = await this.validateImport(activeImport);
    if (Object.keys(errors).length) {
      return this.res.redirect(this.url);
    }

    try {
      await this.import(activeImport.category, entities);
      await this.removeTemporaryBulkImport(importId);
    } catch (error) {
      logger.error(error);
      this.req.flash('Failed to import data');
      return this.res.redirect(this.url);
    }
    return this.res.redirect(config.paths.dataEntryEntity.submissionSuccess);
  }

  async removeTemporaryBulkImport(importId) {
    await BulkImport.destroy({
      where: {
        userId: this.req.user.id,
        id: importId,
        category: {
          [Op.not]: 'data-entry-old'
        }
      }
    });
  }

  async cancelImport(importId) {
    await this.removeTemporaryBulkImport(importId);
    return this.res.redirect(config.paths.dataEntryEntity.bulkUploadFile);
  }

  async postRequest(req, res) {
    if (req.body.cancel && req.body.importId) {
      return await this.cancelImport(req.body.importId);
    }

    if (req.body.import && req.body.importId) {
      return await this.finaliseImport(req.body.importId);
    }

    res.redirect(this.url);
  }

  async getRequest(req, res) {
    const activeImport = await BulkImport.findOne({
      where: {
        userId: req.user.id,
        category: {
          [Op.not]: 'data-entry-old'
        }
      },
      raw: true
    });

    if (!activeImport || !activeImport.data || !activeImport.data.length) {
      return res.redirect(config.paths.dataEntryEntity.bulkUploadFile);
    }

    const { errors, entities, importId } = await this.validateImport(activeImport);
    const categoryFields = await Category.fieldDefinitions(activeImport.category);

    return res.render(this.template,
      Object.assign(this.locals, {
        errors,
        entities,
        importId,
        categoryFields
      })
    );
  }
}

module.exports = EntityImport;
