import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  public up() {
    this.schema.alterTable('organizations', (table) => {
      table.integer('organization_id').unsigned().references('organizations.id').onDelete('CASCADE')
    })
  }
}
