import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  public up() {
    this.schema.alterTable('users', (table) => {
      table.integer('organization_id').unsigned().references('organizations.id').onDelete('CASCADE')
    })
  }
}
