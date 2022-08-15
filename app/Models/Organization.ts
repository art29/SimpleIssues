import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'
import Encryption from '@ioc:Adonis/Core/Encryption'

export default class Organization extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column()
  public name: string

  @column({
    consume: (value?: Buffer) => (!value ? null : Encryption.decrypt(value.toString())),
    prepare: (value?: unknown) => (!value ? null : Encryption.encrypt(value)),
  })
  public installation_id: string

  @column()
  public mandatory_labels: string

  @column()
  public added_labels: string

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime
}
