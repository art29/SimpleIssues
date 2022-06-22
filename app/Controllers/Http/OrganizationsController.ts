import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Organization from 'App/Models/Organization'
import OrganizationUser from 'App/Models/OrganizationUser'
import User from 'App/Models/User'

export default class OrganizationsController {
  public async activate({ auth, request, response }: HttpContextContract) {
    response.abortUnless(request.body().installation_id, 'Missing installation ID', 422)

    const org: Organization = await Organization.create({
      installation_id: request.body().installation_id,
    })

    if (org.id) {
      const orgUser: OrganizationUser = await OrganizationUser.create({
        organization_id: org.id,
        user_id: auth.user?.id,
        role: 'admin',
      })
      response.ok(orgUser)
    } else {
      response.internalServerError('An error occurred while creating the Organization.')
    }
  }

  public async add_user({ auth, request, response }: HttpContextContract) {
    response.abortIf(!request.body().email, 'Missing email', 422)
    response.abortUnless(
      !auth.user ||
        (
          await OrganizationUser.query()
            .where('user_id', auth.user.id)
            .andWhere('organization_id', auth.user.organization_id)
            .first()
        )?.role === 'admin',
      'You are not an admin for that Organization...',
      422
    )
    response.abortUnless(
      await User.findByOrFail('email', request.body().email),
      'User not found.',
      422
    )

    const newUser: OrganizationUser = await OrganizationUser.create({
      organization_id: auth.user?.organization_id,
      user_id: auth.user?.id,
      role: 'regular',
    })

    if (newUser.$isPersisted) {
      response.ok(newUser)
    } else {
      response.internalServerError('An error occurred while adding the new user...')
    }
  }

  public async remove_user({ auth, request, response }: HttpContextContract) {
    response.abortIf(!request.body().user_id, 'Missing user_id', 422)
    response.abortUnless(
      !auth.user ||
        (
          await OrganizationUser.query()
            .where('user_id', auth.user.id)
            .andWhere('organization_id', auth.user.organization_id)
            .first()
        )?.role === 'admin',
      'You are not an admin for that Organization...',
      422
    )
    response.abortUnless(
      await OrganizationUser.findByOrFail('user_id', request.body().user_id),
      'User not found.',
      422
    )

    const user = await OrganizationUser.query()
      .where('user_id', auth.user?.id!)
      .andWhere('organization_id', auth.user?.organization_id!)
      .firstOrFail()

    await user.delete()

    response.ok({ success: true })
  }

  public async change_role({ auth, request, response }: HttpContextContract) {
    response.abortIf(!request.body().user_id, 'Missing user_id', 422)
    response.abortIf(
      !request.body().role || request.body().role !== 'admin' || request.body().role !== 'regular',
      'Missing role',
      422
    )
    response.abortUnless(
      !auth.user ||
        (
          await OrganizationUser.query()
            .where('user_id', auth.user.id)
            .andWhere('organization_id', auth.user.organization_id)
            .first()
        )?.role === 'admin',
      'You are not an admin for that Organization...',
      422
    )
    response.abortUnless(
      await OrganizationUser.findByOrFail('user_id', request.body().user_id),
      'User not found.',
      422
    )

    await OrganizationUser.query()
      .where('user_id', auth.user?.id!)
      .andWhere('organization_id', auth.user?.organization_id!)
      .update('role', request.body().role)

    response.ok({ success: true })
  }
}
