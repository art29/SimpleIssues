import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  public up() {
    this.schema.alterTable('users', (table) => {
      table.string('mandatory_labels')
      table.string('added_labels')
    })
  }
}
