import { DateTime } from 'luxon'
import { BaseModel, BelongsTo, belongsTo, column } from '@ioc:Adonis/Lucid/Orm'
import Organization from 'App/Models/Organization'
import User from 'App/Models/User'

export default class OrganizationUser extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @belongsTo(() => User)
  public user: BelongsTo<typeof User>

  @column()
  public user_id: number

  @belongsTo(() => Organization)
  public organization: BelongsTo<typeof Organization>

  @column()
  public organization_id: number

  @column()
  public role: 'regular' | 'admin'

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime
}
